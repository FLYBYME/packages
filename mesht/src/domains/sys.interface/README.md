# `sys.interface` - The Human-Machine Interface

This service provides the primary entry points for human operators to interact with the MeshT grid.

## Core Responsibilities

1.  **Command Ingestion**: Accept high-level objectives from humans.
2.  **Directive Translation**: Translate unstructured human language into a formal, machine-readable **Directive** by calling `sys.directives.create`.
3.  **REPL (Read-Eval-Print Loop)**: If running in a terminal environment, provide an interactive shell with commands like `do`, `list`, and `status` for direct grid management.

## How It Works

For UI-based interactions (like the "Quick Directive" form), the frontend calls `sys.interface.submit`, passing the objective. This service then takes that objective and wraps it in a formal directive creation request to `sys.directives`, kicking off the execution flow.

For terminal-based interactions, it starts an interactive `readline` session and routes commands to the appropriate system services.

## Key Actions

*   `sys.interface.submit`: The main action for submitting a new task to the grid.
*   `sys.interface.start_repl`: Starts the interactive terminal session.
