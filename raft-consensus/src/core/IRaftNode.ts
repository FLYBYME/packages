import { RaftState } from './raft.types';
import { RaftLog } from './RaftLog';
import { INetworkAdapter } from '../interfaces/INetworkAdapter';
import { RaftConfig } from '../interfaces/RaftConfig';
import { ILogger } from '../interfaces/ILogger';
import { TimerHandle } from '@flybyme/isomorphic-core';

export interface IRaftNode {
    state: RaftState;
    currentTerm: number;
    votedFor: string | null;
    commitIndex: number;
    lastApplied: number;
    currentLeaderID: string | null;
    
    raftLog: RaftLog;
    network: INetworkAdapter;
    config: RaftConfig;
    logger: ILogger;

    // Volatile Leader State
    nextIndex: Map<string, number>;
    matchIndex: Map<string, number>;
    votesReceived: Set<string>;
    isReadyEmitted: boolean;
    electionTimer?: TimerHandle;
    heartbeatTimer?: TimerHandle;

    start(): Promise<void>;
    stop(): Promise<void>;

    getPeers(): string[];
    persistState(): void;
    stepDown(term: number): Promise<void>;
    becomeLeader(): Promise<void>;
    applyCommitted(): Promise<void>;
    resetElectionTimer(): void;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string | symbol, ...args: unknown[]): boolean;
    on(event: string | symbol, fn: (...args: unknown[]) => void, context?: unknown): this;
    off(event: string | symbol, fn?: (...args: unknown[]) => void, context?: unknown, once?: boolean): this;
}
