# `sys.catalog` - LLM Deployment Catalog

This service manages the list of available Large Language Models (LLMs) that can be used by personas. It acts as a service directory, abstracting the specific details of different model providers (OpenAI, Anthropic, Ollama, etc.) behind a consistent interface.

## Core Responsibilities

1.  **Model Registration**: Maintain a database of available LLM deployments, including their alias, provider, model name, and API credentials.
2.  **Health Checking**: Provide a `ping` action to perform a health check on a model endpoint, ensuring it is reachable and active.
3.  **Dynamic Configuration**: Allow for the dynamic enabling, disabling, and updating of models without requiring a full system restart.
4.  **Quota Management**: Track token and request usage for each model to enforce rate limits.

## How It Works

When a persona needs to perform a cognition loop, `sys.dispatcher` will first resolve the persona's preferred LLM alias against this catalog. The catalog returns the necessary information (like the base URL and API key) for the dispatcher to make the actual API call.

## Key Actions

*   `sys.catalog.enable`: Registers a new LLM deployment.
*   `sys.catalog.disable`: Deactivates a model.
*   `sys.catalog.updateModel`: Modifies the configuration of an existing model.
*   `sys.catalog.ping`: Executes a 1-token health check against a model.
*   `sys.catalog.find`: Lists all models in the catalog.
