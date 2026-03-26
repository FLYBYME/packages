# MeshT: Ultimate Architectural Specification v1.2.0 (Verified)

MeshT is a decentralized, autonomous engineering grid that integrates the proven Ralph Reasoning Persona natively into the Genesis Domain-Driven Chassis, powered by the Isomorphic Mesh transport layer.

## 1. System Philosophy: The Convergence

MeshT is designed to solve the "Agent Fragility" problem by separating the Mind (Agent Logic), the Body (Domain Capabilities), and the Nervous System (Distributed Infrastructure). Historically a standalone engine, Ralph has been reimagined as a specialized cognitive blueprint living entirely within the superior Genesis architecture.

- **The Mind (Ralph as a Persona):** Provides goal-directed behavior via a Finite State Machine (FSM), task queuing, and dynamic context windows, housed natively in the Genesis `sys.personas` domain.
- **The Body (Genesis):** The overarching host architecture. Provides a professional-grade suite of system domains (`sys.*`).
- **The Infrastructure (Mesh):** Provides absolute resiliency, zero-trust security, and isomorphic mobility using `@flybyme/isomorphic-mesh`.

## 2. Layer 1: The Isomorphic Kernel (@flybyme/isomorphic-core)

Every MeshT node runs a singular `MeshApp` kernel responsible for service lifecycle and inter-process communication.

### 2.1 The Service Broker
The `ServiceBroker` is the central message router.
- **Action Registry:** A type-safe map of all available RPC actions across the grid.
- **Event Bus:** An asynchronous pub/sub system for real-time telemetry (e.g., `FSM_TRANSITION` events).
- **Interceptors:** Standardized logic wrappers:
    - **CircuitBreaker:** Prevents cascading failures when a remote domain is unresponsive.
    - **RateLimiter:** Protects high-traffic nodes from depletion.
    - **LogInterceptor:** Provides unified, structured auditing of every packet.

## 3. Layer 2: Transport & Topology (@flybyme/isomorphic-mesh)

MeshT connects nodes into a resilient grid using XOR-Distance Routing, heavily utilizing `@flybyme/isomorphic-mesh` for seamless agent-to-agent and node-to-node telemetry.

- **Node Identity:** Every node is assigned a persistent UUIDv4 (`NodeID`). Agents inherit ephemeral sub-identities tied to their host node.
- **Registry:** A distributed service directory that tracks the location and health (heartbeat) of every `sys.*` domain and active Agent.
- **Transports:**
    - **WebSocketTransport:** Used for real-time bidirectional UI/Browser comms and swarm telemetry.
    - **HTTPTransport:** Used for high-throughput node-to-node RPC (e.g., transferring large repository diffs).
    - **MockTransport:** Used for localized testing and chaos simulation of agent failures.

## 4. Layer 3: System Knowledge & Intelligence (The Genesis Chassis)

MeshT adopts the Genesis "System Domain" pattern for all core capabilities. These are deployed as isolated services on the grid.

### 4.1 Core Genesis Domains (sys.*)
- **sys.audit:** Immutable logging and querying of agent actions (`actions/log.ts`, `purge.ts`, `query.ts`).
- **sys.artifacts:** Handles registration and validation of outputs (`actions/register.ts`, `validate.ts`).
- **sys.catalog:** Manages available capabilities and LLM models (`actions/enable.ts`, `updateCaps.ts`).
- **sys.personas:** Manages the instantiation and lifecycle of agent blueprints, housing the Ralph logic.
- **sys.governance:** Constitutional Ledger & Strategic Planning.
- **sys.directives:** The entry point for all agent tasks (`actions/create.ts`).
- **sys.dispatcher:** LLM cognition bridge and reasoning loop.
- **sys.tools:** Capability registry and invocation proxy.
- **sys.eng:** Engineering sandbox (FS, Shell, Git).
- **sys.scheduler:** Heartbeat engine and task orchestrator.

### 4.2 Intelligence Suite (sys.int.*)
- **sys.int.chroma:** Managed vector storage for RAG (Retrieval Augmented Generation). Acts as the long-term semantic memory for the agents.
- **sys.int.radar:** Scans the network and local filesystem for entities, repositories, and architectural patterns.

## 5. Layer 4: The Agentic Unit (Ralph as a Genesis Persona)

The core purpose of the MeshT agent network is **Autonomous Software Evolution**. Rather than running Ralph as an external engine, Ralph is Genesis coming alive via `sys.personas.ralph`.

### 5.1 The Persona Matrix
Stored in `sys.personas`, agents are instantiated with specific blueprints. While Ralph is the flagship reasoning persona, the mesh supports a division of labor:
- **The Coder (Ralph-Core):** `[analytical, proactive, state-driven, rigorous]`. Focuses on implementing algorithms and fixing logical bugs utilizing the Ralph FSM.
- **The Architect:** `[holistic, structural, abstract]`. Analyzes `sys.int.radar` outputs to suggest large-scale refactors and enforce DRY principles.
- **The Judge:** `[critical, adversarial, secure]`. An independent persona that grades outputs, running security audits and performance profiling before merging.

### 5.2 The Finite State Machine (FSM) Lifecycle
All objectives enqueued via `sys.directives` follow the rigorous Ralph FSM:
1. **INVESTIGATE:** Uses `sys.int.radar` and `sys.eng.fs` to map the repository.
2. **PLAN:** Decomposes the goal into subTasks stored in the state context.
3. **EXECUTE:** Utilizes LLM inference via `sys.dispatcher` to generate code, applied via `sys.eng.fs`.
4. **VERIFY:** Runs tests via `sys.eng` within a sandbox.
5. **SELF_REVIEW:** Handoff to **The Judge** persona across the mesh.
6. **FINALIZE:** Merges code and completes the directive.

## 6. Layer 5: Multi-Agent Swarm Dynamics (sys.swarm)

Because MeshT utilizes `@flybyme/isomorphic-mesh`, Genesis personas are not confined to a single machine. They exhibit **Isomorphic Mobility** and swarm intelligence.

- **Delegation:** If a Ralph persona operating on Node A encounters a heavy workload, it can delegate tasks to Node B via `sys.swarm.delegate`.
- **Self-Healing:** If a heartbeat fails, the Registry re-assigns the persona's FSM state to a surviving node.

## 7. Layer 6: Governance & Security (sys.auth)

### 7.1 Zero-Trust Security
All inter-node traffic is governed by **Isomorphic Auth**.
- **mKDC (Mesh Key Distribution Center):** Issues short-lived "Service Tickets" to agents.
- **Auth Enforcement:** Every tool execution is validated against the ticket.

### 7.2 The Constitution
Managed by `sys.governance`, the Constitutional Ledger contains immutable rules (e.g., Directive Alpha: "NEVER delete .git histories.").

---

## 8. Deployment Status
- **Phase 1-8:** ✅ **COMPLETED**
- **Kernel Boot:** ✅ **STABLE**
- **Genesis Seeding:** ✅ **ACTIVE**
- **Autonomous Loop:** ✅ **IGNITED**