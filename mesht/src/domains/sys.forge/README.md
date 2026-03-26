# `sys.forge` - The Dynamic Tool Forge

The `sys.forge` service is a highly experimental and powerful domain that allows agents to create and register new tools *at runtime*.

## Core Responsibilities

1.  **Dynamic Code Execution**: Safely execute agent-generated JavaScript code within a secure, isolated sandbox.
2.  **Tool Registration**: Provide an action (`register_dynamic`) that takes a name, description, and handler code string.
3.  **Sandboxing**: Use the `isolated-vm` library to create a heavily restricted V8 isolate with strict limits on CPU time and memory to prevent malicious or runaway code from affecting the host system.

## How It Works

When an agent wants to create a new tool (e.g., a `calculate_bmi` function), it calls `sys.tools.invoke('sys.forge.register_dynamic', ...)`, passing the JavaScript code for the tool's handler as a string.

The `ForgeService` then:
1.  Creates a new `isolated-vm` instance.
2.  Compiles the provided handler code within that isolate.
3.  Creates a "bridge" function that allows the main Node.js context to call the isolated function.
4.  Calls `sys.tools.register`, passing this bridged function as the tool's handler.

The new tool is now available for any persona to use in subsequent cognition cycles.

## Key Actions

*   `sys.forge.register_dynamic`: Accepts agent-written JavaScript and registers it as a new, sandboxed tool in `sys.tools`.
