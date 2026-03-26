# `sys.int.radar` - The Grid Scanner

This service is a specialized internal tool used for architectural mapping and codebase analysis. It leverages low-level engineering tools to scan the local filesystem and report on the grid's own structure.

## Core Responsibilities

1.  **Codebase Scanning**: Use tools like `tree` and `grep` (via `sys.eng.shell_exec`) to scan for specific patterns, such as service definitions or class names.
2.  **Entity Lookup**: Provide an action to find all occurrences of a specific string or symbol across the entire `src/` directory.
3.  **Architectural Mapping**: Help agents (or humans) understand the relationship between different domains and services within the MeshT codebase itself.

## How It Works

This service acts as a higher-level abstraction over `sys.eng`. Instead of requiring an agent to know the exact `grep` or `tree` commands, it provides semantically named actions like `scan_project` and `lookup_entity`. This makes it easier for agents to perform introspection on the system's architecture.

## Key Actions

*   `sys.int.radar.scan_project`: Executes `tree` and `grep` to provide a high-level overview of a project's structure and service definitions.
*   `sys.int.radar.lookup_entity`: Performs a recursive `grep` to find all references to a specific entity (e.g., a function or class name).
