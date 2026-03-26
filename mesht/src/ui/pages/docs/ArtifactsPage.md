# `ArtifactsPage`

This page provides a UI for managing the `sys.artifacts` registry.

## Core Features

1.  **List Artifacts**: Displays a `DataTable` of all registered artifacts (both `protocol` and `capability` types).
2.  **View Raw JSON**: Allows an operator to click a button to open a new browser tab containing the raw, formatted JSON of a specific artifact manifest.
3.  **Register New Artifact**: Provides a modal with a large text area where a user can paste the full JSON payload for a new artifact and register it with the system by calling `sys.artifacts.register`.

## How It Works

*   On page enter (`onEnter`), it calls `sys.artifacts.find` to fetch all artifacts and stores them in the global UI state (`state.artifacts.list`).
*   The `DataTable` is bound to this state key and automatically re-renders when the data changes.
*   The "Register Artifact" button opens a modal and calls `sys.artifacts.register` with the raw text from the textarea, after which it refreshes the list.
