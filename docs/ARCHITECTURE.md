# MeshT Architecture Overview

This document provides a high-level overview of the MeshT autonomous engineering grid, its core concepts, and the interactions between its system domains.

## Core Concepts

*   **Directives**: A formal, machine-readable instruction for the grid to perform a complex task. It is the primary unit of work. Each directive is governed by a **Protocol**.
*   **Protocols (Artifacts)**: A Finite State Machine (FSM) manifest that defines the graph of possible states (nodes) and transitions (edges) an agent can take to fulfill a directive. They are stored in `sys.artifacts`.
*   **Personas**: An LLM-based agent with a specific role, toolset, and set of personality traits. Personas are the "workers" that execute the logic within a Protocol's nodes.
*   **Service Broker**: The central "OS kernel" of the mesh. All communication between services happens through the broker via RPC calls (`broker.call()`) and events (`broker.emit()`).
*   **Scheduler**: The heartbeat of the grid. It periodically finds directives that need work, acquires locks, and "steps" them forward in their respective FSM protocols.

## Standard Execution Flow

1.  **Submission**: A human operator (via the UI or REPL) or another system submits a high-level objective (e.g., "Implement a new feature").
2.  **Directive Creation**: `sys.interface` receives the objective and calls `sys.directives.create`, which creates a new directive record in the database, assigning it a protocol (e.g., the `ralph_dev-loop`). The directive starts in the `INVESTIGATE` node.
3.  **Scheduler Tick**: `sys.scheduler` wakes up, finds the new `initialized` directive, and acquires a lock on it.
4.  **Persona Invocation**: The scheduler calls `sys.directives.step`. The `step` action sees the directive is in the `INVESTIGATE` node. The protocol manifest for that node specifies that the `ralph_core` persona should be invoked with a specific objective for that node.
5.  **Cognition Loop**: `sys.directives.step` calls `sys.dispatcher.dispatch_cognition`. This service:
    a.  Fetches the persona's blueprint (system prompt, tools).
    b.  Injects rules from `sys.governance`.
    c.  Constructs a prompt and sends it to the configured LLM.
    d.  Receives the LLM's response, which may include a final thought or a request to use a tool.
    e.  If a tool is requested, it calls `sys.tools.invoke`. The tool service executes the function (e.g., `sys.eng.fs_read`) and returns the result.
    f.  The result is sent back to the LLM for the next thought cycle.
    g.  This loop continues until the LLM produces a final response containing a `[VERDICT: ...]`.
6.  **State Transition**: The `verdict` from the dispatcher is returned to the `sys.directives.step` action. It looks up the corresponding edge in the protocol manifest (e.g., `VERDICT: DONE` moves from `INVESTIGATE` to `PLAN`) and updates the directive's `currentNode`.
7.  **Lock Release**: The scheduler releases the lock on the directive.
8.  **Repeat**: The cycle continues on the next scheduler tick until the directive reaches a `TERMINAL` node.

## System Domains

*   `sys.directives`: Manages the lifecycle of tasks.
*   `sys.artifacts`: Stores the "blueprints" (FSMs) for how tasks are executed.
*   `sys.personas`: Manages the agent definitions (prompts, tools, roles).
*   `sys.dispatcher`: The "brain". Handles the core reasoning loop with the LLM.
*   `sys.tools`: Executes low-level capabilities (file system, git, shell).
*   `sys.eng`: Provides sandboxed engineering tools.
*   `sys.scheduler`: The "heartbeat" that drives all work forward.
*   `sys.governance`: The "law". Stores the rules and constraints of the system.
*   `sys.audit`: The "historian". Records every action taken for review.
*   `sys.projects`: Manages the codebases the agents work on.
*   `sys.interface`: The human-machine interface (REPL, UI).
