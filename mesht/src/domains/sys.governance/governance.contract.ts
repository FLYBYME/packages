// FILE: src/domains/sys.governance/governance.contract.ts
import { CRUDActions } from '@flybyme/isomorphic-database';
import {
  GovernanceSchema,
  GovernancePlanSchema,
  ProposeRuleParamsSchema,
  ProposeRuleResultSchema,
  VerifyComplianceParamsSchema,
  VerifyComplianceResultSchema,
  RatifyRuleParamsSchema,
  UpdateRoadmapParamsSchema,
  AdvanceCycleParamsSchema,
  CreatePlanParamsSchema,
  ConstitutionalRuleSchema,
  GetActiveConstitutionParamsSchema,
  GetDispatchPolicyParamsSchema,
  DispatchPolicySchema,
} from './governance.schema';

declare module '@flybyme/isomorphic-core' {
  export interface IServiceActionRegistry extends CRUDActions<'sys.governance', typeof GovernanceSchema> {
    'sys.governance.proposeRule': {
      params: typeof ProposeRuleParamsSchema;
      returns: typeof ProposeRuleResultSchema;
    };

    'sys.governance.verifyCompliance': {
      params: typeof VerifyComplianceParamsSchema;
      returns: typeof VerifyComplianceResultSchema;
    };

    'sys.governance.getActiveConstitution': {
      params: typeof GetActiveConstitutionParamsSchema;
      returns: typeof ConstitutionalRuleSchema;
    };

    'sys.governance.getDispatchPolicy': {
      params: typeof GetDispatchPolicyParamsSchema;
      returns: typeof DispatchPolicySchema;
    };

    'sys.governance.ratifyRule': {
      params: typeof RatifyRuleParamsSchema;
      returns: typeof ConstitutionalRuleSchema;
    };

    'sys.governance.updateRoadmap': {
      params: typeof UpdateRoadmapParamsSchema;
      returns: typeof GovernancePlanSchema;
    };

    'sys.governance.advanceCycle': {
      params: typeof AdvanceCycleParamsSchema;
      returns: typeof GovernanceSchema;
    };

    'sys.governance.createPlan': {
      params: typeof CreatePlanParamsSchema;
      returns: typeof GovernancePlanSchema;
    };
  }

  export interface IServiceEventRegistry {
    'sys.governance.rule_ratified': { ruleId: string; severity: string; proposedBy: string };
    'sys.governance.rule_proposed': { ruleId: string; severity: string; proposedBy: string };
    'sys.governance.rule_reviewed': { ruleId: string; status: 'ratified' | 'rejected'; reviewedBy: string };
    'sys.governance.lifecycle_advanced': { from: string; to: string; reason: string };
    'sys.governance.budget_exhausted': {
      planId: string;
      department: string;
      usedTokens: number;
      maxTokens: number;
      usedComputeMs: number;
      maxComputeMs: number;
      modelOverride?: string;
    };
  }
}
