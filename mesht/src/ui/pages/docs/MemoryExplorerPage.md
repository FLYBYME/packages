# `MemoryExplorerPage`

This page provides a simple UI to explore and manage the long-term vector memory stored in `sys.int.chroma`.

## Core Features

1.  **List Memories**: Displays a `DataTable` of all documents currently stored in the vector database.
2.  **View Content**: Shows the ID, metadata, and the full text content of each memory entry.
3.  **Delete Memory**: Allows an operator to delete a specific memory entry from the database.
4.  **Search**: (Future) A search bar to perform semantic queries against the memory store using `sys.int.chroma.query_memory`.

## How It Works

*   On page enter, it calls `sys.int.chroma.list_all` to fetch every entry.
*   The "Delete" button calls `sys.int.chroma.delete_memory` with the corresponding entry ID and then refreshes the table.
*   This page is primarily used for low-level debugging of the agent's long-term memory.
