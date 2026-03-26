// FILE: src/bootstrap/seedTools.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';

/**
 * Registers the system tool capabilities in sys.tools.
 */
export async function seedTools(broker: IServiceBroker): Promise<void> {
  const tools = [
    {
      name: "fs_read",
      description: "Reads a file from the filesystem within the project root.",
      category: "filesystem",
      handler: "sys.eng.fs_read",
      parameters: [
        { name: "path", type: "string", description: "Relative path to read.", required: true },
        { name: "encoding", type: "string", description: "File encoding (utf-8 or base64).", required: false },
      ],
      riskLevel: "safe",
    },
    {
      name: "fs_write",
      description: "Writes a file to the filesystem within the project root.",
      category: "filesystem",
      handler: "sys.eng.fs_write",
      parameters: [
        { name: "path", type: "string", description: "Relative path to write.", required: true },
        { name: "content", type: "string", description: "The content to write.", required: true },
        { name: "createDirs", type: "boolean", description: "If true, non-existent directories are created.", required: false },
      ],
      riskLevel: "moderate",
    },
    {
      name: "fs_delete",
      description: "Deletes a file or directory from the filesystem.",
      category: "filesystem",
      handler: "sys.eng.fs_delete",
      parameters: [
        { name: "path", type: "string", description: "Relative path to delete.", required: true },
        { name: "recursive", type: "boolean", description: "If true, deletes folders non-empty.", required: false },
      ],
      riskLevel: "dangerous",
    },
    {
      name: "fs_list",
      description: "Lists files and directories in a path.",
      category: "filesystem",
      handler: "sys.eng.fs_list",
      parameters: [
        { name: "path", type: "string", description: "Relative path to list.", required: true },
        { name: "recursive", type: "boolean", description: "If true, lists recursively.", required: false },
      ],
      riskLevel: "safe",
    },
    {
      name: "shell_exec",
      description: "Executes a shell command in a sandboxed environment.",
      category: "shell",
      handler: "sys.eng.shell_exec",
      parameters: [
        { name: "command", type: "string", description: "The command to execute.", required: true },
        { name: "workDir", type: "string", description: "Working directory relative to project root.", required: true },
        { name: "timeoutMs", type: "number", description: "Max execution time in ms.", required: false },
        { name: "maxOutputBytes", type: "number", description: "Max output size to return.", required: false },
      ],
      riskLevel: "dangerous",
    },
    {
      name: "create_new_tool",
      description: "Proposes a new dynamic tool to be forged. Requires name, description, input schema, and JS code.",
      category: "generation",
      handler: "sys.forge.propose",
      parameters: [
        { name: "name", type: "string", description: "Unique tool name (snake_case).", required: true },
        { name: "description", type: "string", description: "What the tool does.", required: true },
        { name: "inputSchema", type: "string", description: "JSON string of the parameter schema (OpenAI format).", required: true },
        { name: "code", type: "string", description: "JavaScript function body: (args) => { ... }", required: true },
      ],
      riskLevel: "dangerous",
    },
  ];

  for (const tool of tools) {
    try {
      await broker.call('sys.tools.register', tool);
    } catch (err: unknown) {
      if ((err as Error & { code?: string }).code === 'CONFLICT') continue;
    }
  }
}
