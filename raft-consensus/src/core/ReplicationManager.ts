import { ILogger } from '../interfaces/ILogger';
import { IRaftNode } from './IRaftNode';
import { RaftState, AppendEntriesArgs, AppendEntriesReply, InstallSnapshotArgs, InstallSnapshotReply } from './raft.types';

export class ReplicationManager {
    constructor(
        private logger: ILogger,
        private node: IRaftNode
    ) { }

    startHeartbeats(): void {
        this.logger.debug(`[Raft] Starting heartbeats (interval: ${this.node.config.heartbeatInterval}ms)`);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (this.node.heartbeatTimer) clearInterval(this.node.heartbeatTimer);
        this.node.heartbeatTimer = setInterval(() => this.sendAppendEntriesToAll(), this.node.config.heartbeatInterval);
    }

    sendAppendEntriesToAll(): void {
        if (this.node.state !== RaftState.LEADER) return;
        const peers = this.node.getPeers();
        for (const peer of peers) {
            this.sendAppendEntriesToPeer(peer);
        }
    }

    async sendAppendEntriesToPeer(peerID: string): Promise<void> {
        const nextIdx = this.node.nextIndex.get(peerID) || 1;
        const snapshot = await this.node.raftLog.getLatestSnapshot();

        // If the follower needs logs that we've already compacted, send the snapshot
        if (snapshot && nextIdx <= snapshot.last_index) {
            this.logger.info(`[Raft] Follower ${peerID} is too far behind. Sending InstallSnapshot.`);
            const args: InstallSnapshotArgs = {
                term: this.node.currentTerm,
                leaderId: this.node.network.getNodeID(),
                lastIncludedIndex: snapshot.last_index,
                lastIncludedTerm: snapshot.last_term,
                data: snapshot.data as Record<string, unknown>
            };

            this.node.network.send(peerID, {
                topic: 'snapshot-req',
                data: args,
                senderNodeID: this.node.network.getNodeID()
            }).catch(() => { });
            return;
        }

        const prevLogIndex = nextIdx - 1;
        const prevLogTerm = await this.node.raftLog.getTerm(prevLogIndex);
        
        // Task: Network Flooding Prevention - limit entries per batch
        const MAX_ENTRIES_PER_RPC = 500;
        const entries = await this.node.raftLog.getEntriesFrom(nextIdx, MAX_ENTRIES_PER_RPC);

        const args: AppendEntriesArgs = {
            term: this.node.currentTerm,
            leaderId: this.node.network.getNodeID(),
            prevLogIndex,
            prevLogTerm,
            entries,
            leaderCommit: this.node.commitIndex
        };

        if (entries.length > 0) {
            this.logger.debug(`[Raft] Sending ${entries.length} log entries to ${peerID} (prevIndex: ${prevLogIndex})`);
        }
        
        this.node.network.send(peerID, {
            topic: 'append-req',
            data: args,
            senderNodeID: this.node.network.getNodeID()
        }).catch(() => { });
    }

    async handleAppendResponse(reply: AppendEntriesReply, senderID: string): Promise<void> {
        if (this.node.state !== RaftState.LEADER) return;

        if (reply.term > this.node.currentTerm) {
            this.logger.info(`[Raft] AppendResponse term ${reply.term} > current term ${this.node.currentTerm}. Stepping down.`);
            await this.node.stepDown(reply.term);
            return;
        }

        if (reply.success) {
            this.node.matchIndex.set(senderID, reply.matchIndex);
            this.node.nextIndex.set(senderID, reply.matchIndex + 1);
            this.advanceLeaderCommitIndex();
        } else {
            const currentNext = this.node.nextIndex.get(senderID) || 1;
            // Optimization: jump nextIndex based on follower's lastLogIndex
            const newNext = Math.min(currentNext - 1, (reply.lastLogIndex || 0) + 1);
            this.logger.debug(`[Raft] Log inconsistency for ${senderID}. Jumping nextIndex from ${currentNext} to ${Math.max(1, newNext)}`);
            this.node.nextIndex.set(senderID, Math.max(1, newNext));
            this.sendAppendEntriesToPeer(senderID);
        }
    }

    /**
     * Handles response to InstallSnapshot RPC.
     */
    async handleInstallSnapshotResponse(reply: InstallSnapshotReply, senderID: string): Promise<void> {
        if (this.node.state !== RaftState.LEADER) return;

        if (reply.term > this.node.currentTerm) {
            await this.node.stepDown(reply.term);
            return;
        }

        // Now that they have the snapshot, update their nextIndex to start *after* it
        this.node.raftLog.getLatestSnapshot().then(snapshot => {
            if (snapshot) {
                this.node.matchIndex.set(senderID, snapshot.last_index);
                this.node.nextIndex.set(senderID, snapshot.last_index + 1);
                this.sendAppendEntriesToPeer(senderID); // Resume normal log replication
            }
        });
    }

    async advanceLeaderCommitIndex(): Promise<void> {
        const matchIndices = Array.from(this.node.matchIndex.values()) as number[];
        matchIndices.push(await this.node.raftLog.getLastLogIndex());
        matchIndices.sort((a: number, b: number) => b - a);

        const totalNodes = this.node.getPeers().length + 1;
        const quorumIndex = Math.floor(totalNodes / 2);
        
        const majorityMatchIndex = matchIndices[quorumIndex];

        if (majorityMatchIndex === undefined) return;

        if (majorityMatchIndex > this.node.commitIndex && await this.node.raftLog.getTerm(majorityMatchIndex) === this.node.currentTerm) {
            this.node.commitIndex = majorityMatchIndex;
            const entry = await this.node.raftLog.getEntry(this.node.commitIndex);
            await this.node.applyCommitted();
            this.node.network.broadcast({
                topic: 'commit',
                data: {
                    index: this.node.commitIndex,
                    term: this.node.currentTerm,
                    namespace: entry?.namespace
                },
                senderNodeID: this.node.network.getNodeID()
            });
        }
    }
}
