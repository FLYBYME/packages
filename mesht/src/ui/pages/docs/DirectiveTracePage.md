# `DirectiveTracePage`

This page provides a deep, granular view into the full reasoning process of a single directive, acting as the primary debugging tool for agent behavior.

## Core Features

1.  **Directive Identification**: The header clearly displays the ID of the directive being traced.
2.  **Cognition Cycle Cards**: The main view is a series of cards, where each card represents one full cognition cycle (one call to `sys.dispatcher.dispatch_cognition`).
3.  **Message Trace**: Inside each card, a chat-like view shows the raw, back-and-forth message history between the dispatcher and the LLM. This includes the initial system prompt, user objective, and all subsequent assistant thoughts and tool responses.
4.  **Tool Trace**: A separate section in each card details every tool call made during that cycle. It shows the tool name, the exact JSON arguments passed, and the raw JSON result that was returned, color-coding errors for easy identification.
5.  **Final Verdict & Response**: Each card culminates in showing the final `[VERDICT: ...]` extracted from the LLM's last response and the full text of that response.

## How It Works

*   This is a dynamic route that gets the directive ID from a URL query parameter (`/directive-trace?id=...`).
*   On page enter (`onEnter`), it calls `sys.dispatcher.cognition_history` to fetch all `CognitionLog` entries for that specific directive ID.
*   The page then iterates through the history, rendering a `TraceCard` for each log entry.
*   Because `messageTrace` and `toolTrace` are stored as stringified JSON in the database, the page component parses them back into objects before rendering them.
