# `ProjectsPage`

This page provides a simple interface for managing the project workspaces known to the grid, which are stored in `sys.projects`.

## Core Features

1.  **List Projects**: Displays a `DataTable` of all registered projects.
2.  **Project Details**: Shows the project's ID, name, description, and its absolute root path on the local filesystem.
3.  **Set Active Project**: Provides a button to set a project as the "active" context for the grid by calling `sys.projects.set_active`.
4.  **Register New Project**: A modal form for adding a new project workspace to the grid's registry.

## How It Works

*   The page fetches all projects from `sys.projects.list` on enter.
*   The `ProjectStatus` component in the header provides a quick summary of the active project.
*   The "Set Active" button calls the `set_active` action and refreshes the status and table to reflect the change.

_This page is essential for multi-repository development, allowing agents to operate in different codebase contexts._
