# `sys.int.chroma` - Long-Term Memory (RAG)

This service provides a vector database integration, currently with ChromaDB. It serves as the long-term memory for the agent grid, enabling Retrieval-Augmented Generation (RAG).

## Core Responsibilities

1.  **Vector Storage**: Store text documents (memories) and their corresponding vector embeddings.
2.  **Semantic Search**: Provide a `query_memory` action that takes a natural language query, embeds it, and performs a similarity search against the stored vectors to find the most relevant memories.
3.  **Memory Management**: Offer basic CRUD (Create, Read, Update, Delete) operations for managing memory entries, which is used by the `MemoryExplorerPage` UI.

## How It Works

When an agent needs to recall past information, it can use a tool that calls `sys.int.chroma.query_memory`. The service embeds the query and retrieves the most similar documents from ChromaDB. These documents are then injected into the agent's context window for its next thought cycle, providing relevant long-term memory without overloading the prompt.

## Key Actions

*   `sys.int.chroma.store_memory`: Adds a new document to the vector store.
*   `sys.int.chroma.query_memory`: Performs a semantic search.
*   `sys.int.chroma.delete_memory`: Deletes a memory entry by its ID.
*   `sys.int.chroma.update_metadata`: Updates the metadata associated with a memory.
*   `sys.int.chroma.list_all`: Retrieves all memory entries (used by the UI).
