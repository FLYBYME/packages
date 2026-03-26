import { IInterceptor, ResiliencyError } from '@flybyme/isomorphic-core';
import { MeshPacket } from '@flybyme/isomorphic-mesh';
import { ICircuitAdapter, CircuitState } from '../interfaces/IResiliencyAdapter';

export interface CircuitBreakerOptions {
    threshold: number;
    resetTimeout: number;
    adapter: ICircuitAdapter;
}

/**
 * CircuitBreakerInterceptor — Halts requests to failing services.
 */
export class CircuitBreakerInterceptor implements IInterceptor<MeshPacket, MeshPacket> {
    public readonly name = 'circuit-breaker';
    private probePacketID: string | null = null;
    private probeNodeID: string | null = null;

    constructor(private options: CircuitBreakerOptions) {}

    async onOutbound(packet: MeshPacket): Promise<MeshPacket> {
        // We only care about REQUESTs for circuit breaking logic
        if (packet.type !== 'REQUEST') return packet;

        const targetNodeID = packet.targetNodeID || (packet.meta as Record<string, unknown> | undefined)?.targetNodeID as string | undefined;
        if (!targetNodeID) return packet;

        const state = await this.options.adapter.getState(targetNodeID);

        if (state.state === 'OPEN') {
            const now = Date.now();
            if (state.lastFailureTime && (now - state.lastFailureTime) > this.options.resetTimeout) {
                // If no one is probing yet, this request becomes the probe
                if (this.probePacketID === null) {
                    this.probePacketID = packet.id;
                    this.probeNodeID = targetNodeID;
                    await this.options.adapter.setState(targetNodeID, { ...state, state: 'HALF_OPEN' });
                    return packet;
                }
            }
            throw new ResiliencyError(`[CircuitBreaker] Circuit is OPEN for node: ${targetNodeID}`);
        }

        if (state.state === 'HALF_OPEN') {
            // Only allow the designated probe request through
            if (this.probePacketID !== packet.id) {
                throw new ResiliencyError(`[CircuitBreaker] Circuit is HALF_OPEN (probing in progress) for node: ${targetNodeID}`);
            }
        }

        return packet;
    }

    async onInbound(packet: MeshPacket): Promise<MeshPacket> {
        const senderNodeID = packet.senderNodeID;
        
        if (packet.type === 'RESPONSE_ERROR') {
            await this.handleFailure(senderNodeID, packet.id);
        } else if (packet.type === 'RESPONSE') {
            await this.handleSuccess(senderNodeID, packet.id);
        }

        return packet;
    }

    private async handleFailure(nodeID: string, packetID: string): Promise<void> {
        const state = await this.options.adapter.getState(nodeID);
        const failures = state.failures + 1;
        
        let newState: CircuitState = state.state;

        // If it's a probe failure (matching the packet ID), go back to OPEN
        if (this.probePacketID === packetID || failures >= this.options.threshold) {
            newState = 'OPEN';
            if (this.probePacketID === packetID) {
                this.probePacketID = null;
                this.probeNodeID = null;
            }
        }

        await this.options.adapter.setState(nodeID, {
            state: newState,
            failures,
            lastFailureTime: Date.now()
        });
    }

    private async handleSuccess(nodeID: string, packetID: string): Promise<void> {
        const state = await this.options.adapter.getState(nodeID);
        if (state.state !== 'CLOSED') {
            // If the probe succeeded, close the circuit
            if (this.probePacketID === packetID) {
                this.probePacketID = null;
                this.probeNodeID = null;
                await this.options.adapter.setState(nodeID, {
                    state: 'CLOSED',
                    failures: 0
                });
            }
        }
    }
}
