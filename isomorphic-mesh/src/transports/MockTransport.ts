import { BaseTransport } from './BaseTransport';
import { MeshPacket } from '../types/packet.types';
import { TransportConnectOptions } from '../types/mesh.types';
import { SafeTimer, TimerHandle } from '@flybyme/isomorphic-core';

/**
 * MockTransport — A simple in-memory transport for testing.
 * Uses a static map to simulate "The Network".
 */
export class MockTransport extends BaseTransport {
    public readonly protocol = 'mock';
    public readonly version = 1;
    private static instances = new Map<string, MockTransport>();
    private pendingTimers = new Set<TimerHandle>();

    async connect(opts: TransportConnectOptions): Promise<void> {
        this.nodeID = opts.nodeID;
        MockTransport.instances.set(this.nodeID, this);
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        for (const timer of this.pendingTimers) {
            SafeTimer.clearTimeout(timer);
        }
        this.pendingTimers.clear();
        MockTransport.instances.delete(this.nodeID);
        this.connected = false;
    }

    async send(nodeID: string, packet: MeshPacket): Promise<void> {
        const target = MockTransport.instances.get(nodeID);
        if (target) {
            // Simulate async network latency - must be > 0 to allow Map set() to finish
            const timer = setTimeout(() => {
                this.pendingTimers.delete(timer);
                target.emit('packet', packet);
            }, 5);
            this.pendingTimers.add(timer);
            SafeTimer.unref(timer);
        }
    }

    async publish(topic: string, packet: MeshPacket): Promise<void> {
        for (const [nodeID, instance] of MockTransport.instances.entries()) {
            if (nodeID !== this.nodeID) {
                const timer = setTimeout(() => {
                    this.pendingTimers.delete(timer);
                    instance.emit('packet', packet);
                }, 5);
                this.pendingTimers.add(timer);
                SafeTimer.unref(timer);
            }
        }
    }
}
