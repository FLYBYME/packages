# `CatalogPage`

This page provides a UI for managing the `sys.catalog` service, which contains the list of available LLM deployments.

## Core Features

1.  **List Models**: Displays a `DataTable` of all registered LLM deployments.
2.  **Health Status**: Shows the status of each model (`active`, `error`, etc.) and the latency of its last health check.
3.  **Ping Models**: Provides a "Ping All" button to trigger a health check for every model in the catalog.
4.  **Add/Edit Models**: A modal form allows for creating new model entries (`sys.catalog.enable`) or updating existing ones (`sys.catalog.updateModel`).
5.  **Delete Models**: A button to remove a model deployment from the catalog.

## How It Works

*   The page fetches all models from `sys.catalog.find` on enter.
*   It subscribes to real-time `sys.catalog.model_updated` and `sys.catalog.ping_result` events to keep the UI state fresh without manual refreshes.
*   The "Ping All" button iterates through the list of models and calls `sys.catalog.ping` for each one.
*   The Add/Edit modal is a single component that operates in two modes: if an `editingId` is present in the state, it performs an update; otherwise, it creates a new entry.
