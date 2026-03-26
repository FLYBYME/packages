// FILE: src/bootstrap/seedProtocols.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';

/**
 * Registers the Ralph Dev-Loop Protocol FSM in sys.artifacts.
 */
export async function seedProtocols(broker: IServiceBroker): Promise<void> {
  // ─── 1. Ralph Dev-Loop (Existing) ──────────────────────────
  const ralphDevLoop = {
    id: "prot_ralph_dev_loop_v1",
    name: "Ralph Dev-Loop",
    type: "protocol",
    description: "The core autonomous software evolution protocol following the Ralph FSM.",
    manifest: {
      initialNodeId: "INVESTIGATE",
      sharedMemorySchema: { objective: "string" },
      circuitBreakers: { maxTransitions: 50, globalTimeoutMs: 1800000 },
      nodes: [
        { nodeId: "INVESTIGATE", type: "persona", personaId: "ralph_core", nodeObjective: "Analyze codebase. Use fs_list, fs_read, git_status." },
        { nodeId: "PLAN", type: "persona", personaId: "ralph_core", nodeObjective: "Create execution plan." },
        { nodeId: "EXECUTE", type: "persona", personaId: "ralph_core", nodeObjective: "Implement changes. Use fs_write, git_diff." },
        { nodeId: "VERIFY", type: "persona", personaId: "ralph_core", nodeObjective: "Run tests." },
        { nodeId: "SELF_REVIEW", type: "persona", personaId: "judge", nodeObjective: "Audit changes." },
        { nodeId: "FINALIZE", type: "terminal", resolution: "SUCCESS", outputTemplate: "Task completed." },
        { nodeId: "ABORT", type: "terminal", resolution: "FAILURE", outputTemplate: "Task failed." },
      ],
      edges: [
        { fromNode: "INVESTIGATE", toNode: "PLAN", trigger: "DONE" },
        { fromNode: "PLAN", toNode: "EXECUTE", trigger: "DONE" },
        { fromNode: "EXECUTE", toNode: "VERIFY", trigger: "DONE" },
        { fromNode: "VERIFY", toNode: "SELF_REVIEW", trigger: "DONE" },
        { fromNode: "VERIFY", toNode: "EXECUTE", trigger: "RETRY" },
        { fromNode: "SELF_REVIEW", toNode: "FINALIZE", trigger: "SUCCESS" },
        { fromNode: "SELF_REVIEW", toNode: "ABORT", trigger: "FAILURE" },
      ],
    },
    metadata: { version: "1.2.0", author: "admin", tags: ["core", "autonomous", "dev-loop"], createdAt: Date.now() },
  };

  // ─── 2. Security & Compliance Audit ────────────────────────
  const securityAudit = {
    id: "prot_security_audit_v1",
    name: "Security & Compliance Audit",
    type: "protocol",
    description: "Adversarial analysis protocol for security and compliance monitoring.",
    manifest: {
      initialNodeId: "INVESTIGATE_TARGET",
      sharedMemorySchema: { targetDir: "string" },
      circuitBreakers: { maxTransitions: 20, globalTimeoutMs: 900000 },
      nodes: [
        { nodeId: "INVESTIGATE_TARGET", type: "persona", personaId: "ralph_core", nodeObjective: "Scan the target directory for suspicious patterns or violations of Directive Alpha." },
        { nodeId: "ADVERSARIAL_ANALYSIS", type: "persona", personaId: "judge", nodeObjective: "Perform deep adversarial analysis. Look for vulnerabilities or violations." },
        { nodeId: "REPORT_GENERATION", type: "persona", personaId: "ralph_core", nodeObjective: "Format a markdown report of all security findings." },
        { nodeId: "FINALIZE", type: "terminal", resolution: "SUCCESS", outputTemplate: "Security audit passed. Report: {{report}}" },
        { nodeId: "ABORT", type: "terminal", resolution: "FAILURE", outputTemplate: "Security vulnerabilities found: {{report}}" },
      ],
      edges: [
        { fromNode: "INVESTIGATE_TARGET", toNode: "ADVERSARIAL_ANALYSIS", trigger: "DONE" },
        { fromNode: "ADVERSARIAL_ANALYSIS", toNode: "REPORT_GENERATION", trigger: "DONE" },
        { fromNode: "REPORT_GENERATION", toNode: "FINALIZE", trigger: "SUCCESS" },
        { fromNode: "REPORT_GENERATION", toNode: "ABORT", trigger: "FAILURE" },
      ],
    },
    metadata: { version: "1.0.0", author: "admin", tags: ["security", "compliance", "audit"], createdAt: Date.now() },
  };

  // ─── 3. Architectural Scaffolding ──────────────────────────
  const architecturalScaffolding = {
    id: "prot_arch_scaffold_v1",
    name: "Architectural Scaffolding",
    type: "protocol",
    description: "High-level design and file scaffolding protocol.",
    manifest: {
      initialNodeId: "ANALYZE_REQUEST",
      sharedMemorySchema: { objective: "string" },
      circuitBreakers: { maxTransitions: 20, globalTimeoutMs: 900000 },
      nodes: [
        { nodeId: "ANALYZE_REQUEST", type: "persona", personaId: "ralph_core", nodeObjective: "Analyze the feature request and existing structure." },
        { nodeId: "DRAFT_ARCHITECTURE", type: "persona", personaId: "architect", nodeObjective: "Draft technical spec and interfaces." },
        { nodeId: "HUMAN_REVIEW", type: "gate", evaluatorType: "human_review", nodeObjective: "Review the proposed architecture before scaffolding files.", contextPath: "approved" },
        { nodeId: "SCAFFOLD_FILES", type: "persona", personaId: "ralph_core", nodeObjective: "Create the directory structure and empty files." },
        { nodeId: "FINALIZE", type: "terminal", resolution: "SUCCESS", outputTemplate: "Architecture scaffolded successfully." },
      ],
      edges: [
        { fromNode: "ANALYZE_REQUEST", toNode: "DRAFT_ARCHITECTURE", trigger: "DONE" },
        { fromNode: "DRAFT_ARCHITECTURE", toNode: "HUMAN_REVIEW", trigger: "DONE" },
        { fromNode: "HUMAN_REVIEW", toNode: "SCAFFOLD_FILES", trigger: "APPROVED" },
        { fromNode: "SCAFFOLD_FILES", toNode: "FINALIZE", trigger: "DONE" },
      ],
    },
    metadata: { version: "1.0.0", author: "admin", tags: ["architect", "scaffolding", "design"], createdAt: Date.now() },
  };

  // ─── 4. Technical Documentation Generator ──────────────────
  const techDocGenerator = {
    id: "prot_tech_docs_v1",
    name: "Technical Documentation Generator",
    type: "protocol",
    description: "Automated module documentation generation.",
    manifest: {
      initialNodeId: "SCAN_MODULES",
      sharedMemorySchema: { modulePath: "string" },
      circuitBreakers: { maxTransitions: 20, globalTimeoutMs: 600000 },
      nodes: [
        { nodeId: "SCAN_MODULES", type: "persona", personaId: "ralph_core", nodeObjective: "Scan the module for export patterns and JSDoc." },
        { nodeId: "DRAFT_DOCS", type: "persona", personaId: "architect", nodeObjective: "Draft comprehensive README and API docs." },
        { nodeId: "SCAFFOLD_DOCS", type: "persona", personaId: "ralph_core", nodeObjective: "Write documentation files to disk." },
        { nodeId: "FINALIZE", type: "terminal", resolution: "SUCCESS", outputTemplate: "Documentation generated." },
      ],
      edges: [
        { fromNode: "SCAN_MODULES", toNode: "DRAFT_DOCS", trigger: "DONE" },
        { fromNode: "DRAFT_DOCS", toNode: "SCAFFOLD_DOCS", trigger: "DONE" },
        { fromNode: "SCAFFOLD_DOCS", toNode: "FINALIZE", trigger: "DONE" },
      ],
    },
    metadata: { version: "1.0.0", author: "admin", tags: ["docs", "automation"], createdAt: Date.now() },
  };

  // ─── 5. Complex Capability Blueprints ──────────────────────
  const complexCapabilities = [
    {
      id: "cap_adversarial_audit_v1",
      name: "Adversarial Audit Capability",
      type: "capability",
      description: "Blueprint for deep security analysis tool.",
      schema: {
        input: { targetDir: "string", attackVectors: "string[]" },
        output: { vulnerabilities: "Record<string, any>[]" }
      },
      metadata: { version: "1.0.0", author: "admin", tags: ["tool-blueprint", "security"], createdAt: Date.now() },
    },
    {
      id: "cap_code_refactor_v2",
      name: "Code Refactor Engine",
      type: "capability",
      description: "Advanced blueprint for mass code refactoring.",
      schema: {
        input: { pattern: "string", replacement: "string", dryRun: "boolean" },
        output: { modifiedFiles: "string[]" }
      },
      metadata: { version: "2.0.0", author: "architect", tags: ["tool-blueprint", "refactor"], createdAt: Date.now() },
    },
    {
      id: "cap_db_migration_engine",
      name: "DB Migration Engine",
      type: "capability",
      description: "Automated schema migration blueprint.",
      schema: {
        input: { fromVersion: "string", toVersion: "string", provider: "string" },
        output: { sql: "string", status: "string" }
      },
      metadata: { version: "1.0.0", author: "admin", tags: ["tool-blueprint", "database"], createdAt: Date.now() },
    }
  ];

  const allArtifacts = [ralphDevLoop, securityAudit, architecturalScaffolding, techDocGenerator, ...complexCapabilities];

  for (const artifact of allArtifacts) {
    try {
      await broker.call('sys.artifacts.register', artifact);
    } catch (err: unknown) {
      if ((err as Error & { code?: string }).code === 'CONFLICT') continue;
      console.error(`[seedProtocols] Failed to register artifact: ${artifact.id}`, err);
    }
  }
}
