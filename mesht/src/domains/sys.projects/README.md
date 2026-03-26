# `sys.projects` - The Workspace Manager

This service manages the different codebases and project directories that agents can work on. It provides a way to define and switch between different working contexts.

## Core Responsibilities

1.  **Project Registration**: Maintain a list of named projects and their corresponding root file paths.
2.  **Context Switching**: Keep track of the currently "active" project for the grid.
3.  **Path Resolution**: Provide a mechanism for other services (primarily `sys.eng`) to get the correct absolute path for a project, which is used as the `cwd` (Current Working Directory) for shell commands and file system operations.

## How It Works

Many agent tasks are project-specific. For example, running `git status` needs to be done in the correct repository. When a directive is created, it can be associated with a `projectId`. When `sys.eng` executes a tool on behalf of that directive, it first calls `sys.projects.get` to resolve the `projectId` into a concrete file path, ensuring the command runs in the right place.

## Key Actions

*   `sys.projects.register`: Adds a new project and its path to the registry.
*   `sys.projects.get`: Retrieves the details for a specific project.
*   `sys.projects.list`: Lists all registered projects.
*   `sys.projects.set_active`: Sets a project as the default for tasks that don't have one specified.
*   `sys.projects.get_active`: Returns the currently active project.
*   `sys.projects.status`: Provides a summary of the project configuration.
