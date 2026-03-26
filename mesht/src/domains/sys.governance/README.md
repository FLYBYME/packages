# `sys.governance` - The Constitutional Ledger

This service acts as the legal and ethical framework for the agent grid. It stores the "Constitution" — a set of rules and constraints that govern agent behavior.

## Core Responsibilities

1.  **Rule Storage**: Maintain a database of all constitutional rules.
2.  **Rule Enforcement Levels**: Differentiate between "HARD" constraints (which must be injected into the system prompt and are non-negotiable) and "SOFT" constraints (which act as guidelines or preferences).
3.  **Compliance**: Provide actions for other services, particularly a `judge` persona, to verify whether a proposed plan or action complies with the established rules.
4.  **Amendment Process**: Allow for the proposal and ratification of new rules.

## How It Works

The rules stored here are a critical input for the `sys.dispatcher`. Before initiating a cognition loop, the dispatcher queries this service for all active "HARD" rules and injects them into the system prompt, ensuring the LLM is always aware of its core operational boundaries. The `judge` persona can also use the `verify_compliance` action to check a plan against the constitution before execution begins.

## Key Actions

*   `sys.governance.propose_rule`: Proposes a new rule for the constitution.
*   `sys.governance.list_rules`: Lists all active rules.
*   `sys.governance.verify_compliance`: Checks a given plan or text against the constitution.
