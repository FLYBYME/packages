// FILE: src/domains/sys.artifacts/actions/validate.ts
import { IContext } from '@flybyme/isomorphic-core';
import { ValidateProtocolParamsSchema } from '../artifacts.schema';
import { z } from 'zod';
import type { ArtifactsService } from '../artifacts.service';

type ValidateParams = z.infer<typeof ValidateProtocolParamsSchema>;

export const validate = {
  params: ValidateProtocolParamsSchema,
  returns: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    nodeCount: z.number(),
    edgeCount: z.number(),
  }),
  async handler(this: ArtifactsService, ctx: IContext<ValidateParams>) {
    const { manifest } = ValidateProtocolParamsSchema.parse(ctx.params);
    const errors: string[] = [];

    // 1. Verify initialNodeId exists in nodes
    const nodeIds = new Set(manifest.nodes.map((n) => n.nodeId));
    if (!nodeIds.has(manifest.initialNodeId)) {
      errors.push(`initialNodeId '${manifest.initialNodeId}' does not exist in nodes array.`);
    }

    // 2. Verify all edges reference valid nodes
    for (const edge of manifest.edges) {
      if (!nodeIds.has(edge.fromNode)) {
        errors.push(`Edge references unknown fromNode: '${edge.fromNode}'`);
      }
      if (!nodeIds.has(edge.toNode)) {
        errors.push(`Edge references unknown toNode: '${edge.toNode}'`);
      }
    }

    // 3. Verify at least one terminal node exists
    const terminalNodes = manifest.nodes.filter((n) => n.type === 'terminal');
    if (terminalNodes.length === 0) {
      errors.push('Protocol must contain at least one terminal node.');
    }

    // 4. Verify reachability from initial node (BFS)
    const reachable = new Set<string>();
    const queue = [manifest.initialNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const outEdges = manifest.edges.filter((e) => e.fromNode === current);
      for (const edge of outEdges) {
        if (!reachable.has(edge.toNode)) queue.push(edge.toNode);
      }
    }

    const unreachable = [...nodeIds].filter((id) => !reachable.has(id));
    if (unreachable.length > 0) {
      errors.push(`Unreachable nodes detected: ${unreachable.join(', ')}`);
    }

    // 5. Verify persona nodes have personaId
    for (const node of manifest.nodes) {
      if (node.type === 'persona' && !node.personaId) {
        errors.push(`Persona node '${node.nodeId}' is missing a personaId.`);
      }
    }

    const valid = errors.length === 0;
    this.logger.info(`[sys.artifacts] Validation: ${valid ? 'PASSED' : 'FAILED'} (${errors.length} errors)`);

    return { valid, errors, nodeCount: manifest.nodes.length, edgeCount: manifest.edges.length };
  },
};
