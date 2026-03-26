# `sys.tools` - The Tool Execution Service

This service is the gatekeeper for all tool usage within the grid. It manages the registry of available tools and handles the logic for invoking them, including Human-in-the-Loop (HITL) approvals for risky operations.

## Core Responsibilities

1.  **Tool Registry**: Maintain a database of all available tools, their schemas, and their handler logic.
2.  **Tool Invocation**: Provide a central `invoke` action that resolves a tool name, validates parameters, and executes the tool's handler.
3.  **Human-in-the-Loop (HITL)**: For tools marked with `requiresApproval: true`, this service will pause the calling directive and emit a `sys.tools.approval_requested` event. It will only proceed once a human operator (via the UI) calls `sys.tools.resolve_approval`.
4.  **Specialist Delegation**: For complex, multi-step tasks that require their own agent, this service provides a `delegate_to_specialist` action, which spins up a dedicated CLI worker process (like `@google/gemini-cli`) using the `SpecialistExecutor`.

## How It Works

When `sys.dispatcher` receives a tool call request from the LLM, it calls `sys.tools.invoke`. This service looks up the tool. If approval is required, it enters the HITL flow. Otherwise, it directly executes the tool's handler. For standard tools, the handler is usually just another RPC call to a lower-level service like `sys.eng`. For specialist tools, it spawns a new `gemini` process and streams the output back.

## Key Actions

*   `sys.tools.register`: Adds a new tool to the registry.
*   `sys.tools.invoke`: Executes a tool, handling the HITL approval flow if necessary.
*   `sys.tools.resolve_approval`: Allows a human to approve or reject a pending tool execution.
*   `sys.tools.delegate_to_specialist`: Hands off a complex task to a dedicated CLI sub-agent.
*   `sys.tools.resolveToolBelt`: Gathers the full schema for all tools available to a persona.
