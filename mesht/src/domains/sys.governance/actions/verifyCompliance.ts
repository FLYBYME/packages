// FILE: src/domains/sys.governance/actions/verifyCompliance.ts
import { IContext } from '@flybyme/isomorphic-core';
import { VerifyComplianceParamsSchema, VerifyComplianceResultSchema, VerifyComplianceResult } from '../governance.schema';
import { z } from 'zod';
import type { GovernanceService } from '../governance.service';
import { Artifact } from '../../sys.artifacts/artifacts.schema';
import { JSONObject } from '../../../shared/json.schema';

type VerifyComplianceParams = z.infer<typeof VerifyComplianceParamsSchema>;



export const verifyCompliance = {
  params: VerifyComplianceParamsSchema,
  returns: VerifyComplianceResultSchema,
  async handler(this: GovernanceService, ctx: IContext<VerifyComplianceParams>): Promise<VerifyComplianceResult> {
    const {
      artifactId,
      manifest: rawManifest,
      toolName,
      arguments: toolArguments,
      domain,
      personaId,
      projectId,
      directiveId,
    } = VerifyComplianceParamsSchema.parse(ctx.params);

    const constitution = await this.getActiveConstitution();
    if (constitution.length === 0) {
      return {
        compliant: true,
        rationale: 'No active ratified constitutional rules were available.',
        evaluatedBy: 'governance-fallback',
        violations: [],
      };
    }

    let manifest = rawManifest;
    if (!manifest && artifactId) {
      try {
        const artifactRes = await ctx.call<Artifact>('sys.artifacts.get', { id: artifactId });
        manifest = artifactRes?.manifest;
      } catch (err: unknown) {
        this.logger.warn(`[sys.governance] Could not fetch artifact ${artifactId}: ${(err as Error).message}`);
      }
    }

    const evaluationTarget: JSONObject = {};
    if (artifactId) evaluationTarget.artifactId = artifactId;
    if (manifest) evaluationTarget.manifest = manifest;
    if (toolName) evaluationTarget.toolName = toolName;
    if (toolArguments) evaluationTarget.arguments = toolArguments;
    if (domain) evaluationTarget.domain = domain;
    if (personaId) evaluationTarget.personaId = personaId;
    if (projectId) evaluationTarget.projectId = projectId;
    if (directiveId) evaluationTarget.directiveId = directiveId;

    const evaluated = await this.evaluateComplianceWithJudge(constitution, evaluationTarget);
    const violations = evaluated.violations;
    const compliant = !violations.some((v) => v.severity === 'HARD');
    this.logger.info(`[sys.governance] Compliance: ${compliant ? 'PASSED' : 'FAILED'} (${violations.length} violations)`);

    return {
      compliant,
      rationale: evaluated.rationale,
      evaluatedBy: evaluated.evaluatedBy,
      violations,
    };
  },
};
