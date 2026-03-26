# `sys.eng` - The Engineering Sandbox

The `sys.eng` service provides a suite of sandboxed, low-level tools for interacting with the local system environment, primarily the file system and Git repository.

## Core Responsibilities

1.  **Sandboxed Execution**: Provide a safe execution environment for foundational engineering tasks. In a real production system, this service would be heavily restricted, containerized, and monitored.
2.  **File System Operations**: Expose actions for reading, writing, listing, and modifying files and directories.
3.  **Source Control**: Expose actions for common Git commands like `status`, `diff`, and `commit`.
4.  **Shell Access**: Provide a `shell_exec` action for running arbitrary bash commands. This is the most powerful and dangerous tool, and its use is typically restricted to high-trust personas.

## How It Works

This service directly uses Node.js modules like `child_process` and `fs` to perform its actions. It relies on `sys.projects` to determine the correct `rootPath` for a given directive, ensuring that file operations and shell commands are executed in the correct project directory.

## Key Actions

*   `sys.eng.shell_exec`: Executes a shell command.
*   `sys.eng.fs_list`: Lists the contents of a directory.
*   `sys.eng.fs_read`: Reads the content of a file.
*   `sys.eng.fs_write`: Writes content to a file.
*   `sys.eng.git_diff`: Performs a `git diff`.
*   `sys.eng.git_status`: Gets the current `git status`.
*   `sys.eng.git_commit`: Creates a new commit.
