# `sys.dispatcher` - The Cognition Core

This service is the "brain" of the agent. It is responsible for orchestrating the core reasoning loop by interacting with a Large Language Model (LLM).

## Core Responsibilities

1.  **Prompt Assembly**: Constructs the full prompt sent to the LLM. This includes the persona's system prompt, the current directive's objective, project context, and any constitutional rules from `sys.governance`.
2.  **LLM Interaction**: Manages the request/response cycle with the underlying LLM provider (e.g., OpenAI, Anthropic).
3.  **Tool Use Coordination**: If the LLM's response includes a request to use a tool, this service coordinates that call by invoking `sys.tools.invoke`. It then sends the tool's output back to the LLM for the next reasoning step.
4.  **Verdict Extraction**: Parses the final LLM response to extract a structured `[VERDICT: ...]`, which is used by `sys.directives` to determine the next state in the FSM.
5.  **Detailed Logging**: Captures the entire cognition cycle, including raw messages and tool traces, and persists it to the database for debugging and observability via the `DirectiveTracePage`.

## How It Works

The `dispatch_cognition` action is the main entry point. It takes a persona, an objective, and the current state context. It then enters a loop:
1.  Send messages to LLM.
2.  If the LLM asks to use a tool, call the tool and get the result.
3.  Append the tool result to the message history and go back to step 1.
4.  If the LLM provides a final answer, extract the verdict and return.

## Key Actions

*   `sys.dispatcher.dispatch_cognition`: The main entry point for executing a full reasoning loop.
*   `sys.dispatcher.cognition_history`: Retrieves the detailed log of a specific directive's past cognition cycles.
