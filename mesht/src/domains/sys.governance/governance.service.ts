// FILE: src/domains/sys.governance/governance.service.ts
import { DatabaseMixin, defineTable } from '@flybyme/isomorphic-database';
import {
  GovernanceSchema,
  GovernancePlanSchema,
  Governance,
  ConstitutionalRule,
  JudgeComplianceResponseSchema,
  JudgeComplianceResponse,
  RatifyRuleParams,
  RatifyRuleParamsSchema,
} from './governance.schema';
import { IContext, ILogger, IMeshApp, MeshError } from '@flybyme/isomorphic-core';
import OpenAI from 'openai';
import { Blueprint } from '../sys.personas/personas.schema';
import { CatalogModel } from '../sys.catalog/catalog.schema';
import { JSONObject } from '../../shared/json.schema';

import './governance.contract';

// Import split actions
import { proposeRule } from './actions/proposeRule';
import { verifyCompliance } from './actions/verifyCompliance';
import { createPlan } from './actions/createPlan';
import { updateRoadmap } from './actions/updateRoadmap';
import { advanceCycle } from './actions/advanceCycle';

const GovernanceTable = defineTable('governance', GovernanceSchema);
const PlanTable = defineTable('plans', GovernancePlanSchema);

/**
 * GovernanceService — The Constitutional Ledger & Strategic Planning.
 *
 * Default Constitutional Directives (spec §7.2):
 *   Directive Alpha: "NEVER delete .git histories."
 *   Directive Beta:  "No agent may execute rm -rf outside sys.eng.sandbox."
 */
export class GovernanceService extends DatabaseMixin(GovernanceTable, PlanTable)(class { }) {
  public readonly name = 'sys.governance';
  declare logger: ILogger;

  public readonly SINGLETON_ID = 'sys.governance.global';

  public actions = {
    proposeRule: {
      ...proposeRule,
      handler: proposeRule.handler.bind(this),
    },
    verifyCompliance: {
      ...verifyCompliance,
      handler: verifyCompliance.handler.bind(this),
    },
    getActiveConstitution: {
      handler: this.getActiveConstitutionAction.bind(this),
    },
    getDispatchPolicy: {
      handler: this.getDispatchPolicyAction.bind(this),
    },
    ratifyRule: {
      params: RatifyRuleParamsSchema,
      handler: this.ratifyRule.bind(this),
    },
    createPlan: {
      ...createPlan,
      handler: createPlan.handler.bind(this),
    },
    updateRoadmap: {
      ...updateRoadmap,
      handler: updateRoadmap.handler.bind(this),
    },
    advanceCycle: {
      ...advanceCycle,
      handler: advanceCycle.handler.bind(this),
    },
  };

  constructor(_logger: ILogger) {
    super();
  }

  async started(_app?: IMeshApp): Promise<void> {
    // Initial creation/fetch — non-blocking to boot sequence if possible, 
    // but serialized via ensureSingleton.
    this.ensureSingleton().catch((err) => {
      this.logger.error(`[sys.governance] Failed to ensure singleton during startup: ${err.message}`);
    });

    this.broker.on('sys.dispatcher.cognition_finished', (payload: {
      id: string;
      personaId?: string;
      tokenUsage?: { totalTokens?: number };
      latencyMs: number;
    }) => {
      // Background consumption — non-blocking
      this.consumeBudgetFromCognition(payload).catch((err) => {
        this.logger.warn(`[sys.governance] Failed to update budget for ${payload.id}: ${err.message}`);
      });
    });
  }

  /**
   * ensureSingleton — Retrieves the singleton governance state or creates it.
   */
  public async ensureSingleton(): Promise<Governance> {
    const existing = await this.db.findOne({ governanceId: this.SINGLETON_ID });
    if (existing) return existing;

    const now = Date.now();
    try {
      await this.db.create({
        governanceId: this.SINGLETON_ID,
        constitution: [],
        dispatchPolicy: { circuitBreakerActive: false },
        lifecyclePhase: 'BIRTH',
        phaseHistory: [{ phase: 'BIRTH', enteredAt: now }],
      });
    } catch (err) {
      // Handle race condition where another call created it simultaneously
      const secondary = await this.db.findOne({ governanceId: this.SINGLETON_ID });
      if (secondary) return secondary;
      throw err;
    }

    const results = await this.db.findOne({ governanceId: this.SINGLETON_ID });
    if (!results) {
      throw new MeshError({ status: 500, code: 'DATABASE_ERROR', message: 'Failed to find governance singleton.' });
    }
    return results;
  }

  public async getActiveConstitution(): Promise<ConstitutionalRule[]> {
    const governance = await this.ensureSingleton();
    return (governance.constitution || []).filter((rule) => rule.status === 'ratified');
  }

  private async getActiveConstitutionAction(): Promise<ConstitutionalRule[]> {
    return this.getActiveConstitution();
  }

  private async getDispatchPolicyAction(): Promise<Governance['dispatchPolicy']> {
    const governance = await this.ensureSingleton();
    return governance.dispatchPolicy || { circuitBreakerActive: false };
  }

  private async ratifyRule(ctx: IContext<RatifyRuleParams>): Promise<ConstitutionalRule> {
    const { ruleId, approved, reviewedBy, reviewNotes } = RatifyRuleParamsSchema.parse(ctx.params);
    const governance = await this.ensureSingleton();
    const constitution = governance.constitution || [];
    const now = Date.now();

    const rule = constitution.find((entry) => entry.ruleId === ruleId);
    if (!rule) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Rule '${ruleId}' not found.`, status: 404 });
    }

    const status: 'ratified' | 'rejected' = approved ? 'ratified' : 'rejected';
    const updated = constitution.map((entry) => entry.ruleId === ruleId
      ? {
        ...entry,
        status,
        reviewedAt: now,
        reviewedBy,
        reviewNotes,
        ratifiedAt: approved ? now : entry.ratifiedAt,
      }
      : entry);

    await this.db.updateMany(
      { governanceId: this.SINGLETON_ID },
      {
        constitution: updated,
        lastConstitutionalConvention: approved ? now : governance.lastConstitutionalConvention,
      }
    );

    if (approved) {
      this.logger.info(`[sys.governance] Rule ratified: ${ruleId}`);
      ctx.emit('sys.governance.rule_ratified', { ruleId, severity: rule.severity, proposedBy: rule.proposedBy });
    } else {
      this.logger.info(`[sys.governance] Rule rejected: ${ruleId}`);
    }
    ctx.emit('sys.governance.rule_reviewed', { ruleId, status, reviewedBy });

    const ratifiedRule = updated.find((entry) => entry.ruleId === ruleId);
    if (!ratifiedRule) {
      throw new MeshError({ code: 'NOT_FOUND', message: `Rule '${ruleId}' not found after update.`, status: 404 });
    }

    return ratifiedRule;
  }

  public async evaluateComplianceWithJudge(
    constitution: ConstitutionalRule[],
    target: JSONObject,
  ): Promise<{
    compliant: boolean;
    rationale: string;
    evaluatedBy: string;
    violations: Array<{ ruleId: string; text: string; severity: 'HARD' | 'SOFT' }>;
  }> {
    const fallback = this.heuristicComplianceCheck(constitution, target);

    try {
      const blueprint = await this.broker.call<Blueprint>('sys.personas.getBlueprint', { alias: 'judge' }, { timeout: 15000 });
      const deployment = blueprint.llmDeployment;
      const baseURL = deployment.baseURL || process.env.MESHT_LLM_BASE_URL || 'https://api.openai.com/v1';
      const apiKey = deployment.apiKey || process.env.MESHT_LLM_API_KEY || '';
      const model = deployment.modelName || 'gpt-4o-mini';
      const openai = new OpenAI({ baseURL, apiKey });
      const rulesPayload = constitution.map((rule) => ({
        ruleId: rule.ruleId,
        text: rule.text,
        severity: rule.severity,
        domain: rule.domain,
      }));

      const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              blueprint.persona.systemPrompt,
              'Return strict JSON with keys: compliant, rationale, violations.',
              'Each violation must include ruleId only.',
              'Mark a HARD rule as violated only when the proposed action clearly conflicts with the constitution.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({ constitution: rulesPayload, target }, null, 2),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return fallback;

      const parsedCandidate = JSON.parse(content);
      const parsedResult = JudgeComplianceResponseSchema.safeParse(parsedCandidate);
      if (!parsedResult.success) return fallback;
      const parsed: JudgeComplianceResponse = parsedResult.data;

      const violations = (parsed.violations || [])
        .map((violation) => constitution.find((rule) => rule.ruleId === violation.ruleId))
        .filter((rule): rule is ConstitutionalRule => Boolean(rule))
        .map((rule) => ({ ruleId: rule.ruleId, text: rule.text, severity: rule.severity }));

      return {
        compliant: parsed.compliant ?? !violations.some((violation) => violation.severity === 'HARD'),
        rationale: parsed.rationale || 'Judge persona completed compliance review.',
        evaluatedBy: 'judge',
        violations,
      };
    } catch (err) {
      this.logger.warn(`[sys.governance] Judge evaluation failed, using heuristic fallback: ${(err as Error).message}`);
      return fallback;
    }
  }

  private heuristicComplianceCheck(
    constitution: ConstitutionalRule[],
    target: JSONObject,
  ): {
    compliant: boolean;
    rationale: string;
    evaluatedBy: string;
    violations: Array<{ ruleId: string; text: string; severity: 'HARD' | 'SOFT' }>;
  } {
    const haystack = JSON.stringify(target).toLowerCase();
    const violations = constitution.filter((rule) => {
      const ruleText = rule.text.toLowerCase();
      const mentionsDangerousDelete =
        (ruleText.includes('rm -rf') && haystack.includes('rm -rf')) ||
        (ruleText.includes('.git') && haystack.includes('.git') && (haystack.includes('delete') || haystack.includes('rm')));
      return mentionsDangerousDelete;
    }).map((rule) => ({
      ruleId: rule.ruleId,
      text: rule.text,
      severity: rule.severity,
    }));

    return {
      compliant: !violations.some((violation) => violation.severity === 'HARD'),
      rationale: violations.length > 0
        ? 'Heuristic governance fallback detected dangerous delete semantics.'
        : 'Heuristic governance fallback found no constitutional conflicts.',
      evaluatedBy: 'governance-fallback',
      violations,
    };
  }

  private async consumeBudgetFromCognition(payload: {
    id: string;
    personaId?: string;
    tokenUsage?: { totalTokens?: number };
    latencyMs: number;
  }): Promise<void> {
    const governance = await this.ensureSingleton();
    if (!governance.activePlanId) return;

    const plans = await this.dbs.plans.find({ planId: governance.activePlanId });
    if (plans.length === 0) return;

    const plan = plans[0];
    const budgets = plan.budgetAllocations || [];
    if (budgets.length === 0) return;

    const departmentCandidates = [
      payload.personaId ? `persona:${payload.personaId}` : undefined,
      payload.personaId,
      'sys.dispatcher',
      'dispatcher',
      'general',
    ].filter((value): value is string => Boolean(value));

    const budget = budgets.find((entry) => departmentCandidates.includes(entry.department));
    if (!budget) return;

    const usedTokens = budget.usedTokens + (payload.tokenUsage?.totalTokens || 0);
    const usedComputeMs = budget.usedComputeMs + payload.latencyMs;
    const updatedBudgets = budgets.map((entry) => entry.department === budget.department
      ? { ...entry, usedTokens, usedComputeMs }
      : entry);

    const governancePatch: Partial<Governance> = {};
    const exhausted = usedTokens >= budget.maxTokens || usedComputeMs >= budget.maxComputeMs;
    if (exhausted) {
      const modelOverride = await this.resolveCheaperModel();
      governancePatch.dispatchPolicy = {
        ...(governance.dispatchPolicy || { circuitBreakerActive: false }),
        modelOverride,
        updatedAt: Date.now(),
      };

      this.broker.emit('sys.governance.budget_exhausted', {
        planId: plan.planId,
        department: budget.department,
        usedTokens,
        maxTokens: budget.maxTokens,
        usedComputeMs,
        maxComputeMs: budget.maxComputeMs,
        modelOverride,
      });
    }

    await this.dbs.plans.updateMany({ planId: plan.planId }, { budgetAllocations: updatedBudgets });
    if (Object.keys(governancePatch).length > 0) {
      await this.db.updateMany({ governanceId: this.SINGLETON_ID }, governancePatch);
    }
  }

  private async resolveCheaperModel(): Promise<string | undefined> {
    try {
      const models = await this.broker.call<CatalogModel[]>('sys.catalog.find', {
        query: { status: 'active' },
      }, { timeout: 10000 });
      const cheaper = models.find((model) => model.modelName?.toLowerCase().includes('mini'));
      return cheaper?.modelName || 'gpt-4o-mini';
    } catch {
      return 'gpt-4o-mini';
    }
  }
}

export default GovernanceService;
