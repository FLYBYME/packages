// FILE: src/bootstrap/seedCatalog.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';

/**
 * Seeds the default LLM model catalog with an OpenAI deployment.
 */
export async function seedCatalog(broker: IServiceBroker): Promise<void> {
  const modelAlias = process.env.OLLAMA_MODEL || 'gpt-4o';
  const baseURL = process.env.OLLAMA_HOST; // e.g., http://192.168.1.6:11434/v1
  
  try {
    await broker.call('sys.catalog.enable', {
      alias: modelAlias,
      providerId: baseURL ? 'ollama' : 'openai',
      modelName: modelAlias,
      baseURL: baseURL,
      maxContextTokens: 128000,
      capabilities: ['tool_use', 'code_generation', 'reasoning'],
      quotas: {
        maxTokensPerMinute: 100000,
        maxRequestsPerMinute: 60,
      },
    });
  } catch (err: unknown) {
    if ((err as Error & { code?: string }).code !== 'CONFLICT') throw err;
  }

  // Seed Specialist CLI Models
  const specialistModels = [
    // Gemini
    { alias: 'gemini-3.1-pro-preview', name: 'gemini-3.1-pro-preview', spec: 'gemini' },
    { alias: 'gemini-3-flash-preview', name: 'gemini-3-flash-preview', spec: 'gemini' },
    { alias: 'gemini-2.5-pro', name: 'gemini-2.5-pro', spec: 'gemini' },
    { alias: 'gemini-2.5-flash', name: 'gemini-2.5-flash', spec: 'gemini' },
    { alias: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite', spec: 'gemini' },
    
    // Copilot
    { alias: 'gpt-4o-mini', name: 'gpt-4o-mini', spec: 'copilot' },

    // OpenCode
    { alias: 'opencode/big-pickle', name: 'opencode/big-pickle', spec: 'opencode' },
    { alias: 'opencode/mimo-v2-omni-free', name: 'opencode/mimo-v2-omni-free', spec: 'opencode' },
    { alias: 'opencode/mimo-v2-pro-free', name: 'opencode/mimo-v2-pro-free', spec: 'opencode' },
    { alias: 'opencode/minimax-m2.5-free', name: 'opencode/minimax-m2.5-free', spec: 'opencode' },
    { alias: 'opencode/nemotron-3-super-free', name: 'opencode/nemotron-3-super-free', spec: 'opencode' },
    { alias: 'opencode/gpt-5-nano', name: 'opencode/gpt-5-nano', spec: 'opencode' },
    { alias: 'ollama/qwen3:4b-instruct', name: 'ollama/qwen3:4b-instruct', spec: 'opencode' },
  ];

  for (const m of specialistModels) {
    try {
      await broker.call('sys.catalog.enable', {
        alias: m.alias,
        providerId: 'specialist-cli',
        modelName: m.name,
        capabilities: ['specialist-cli', m.spec],
        maxContextTokens: 32000,
      });
    } catch (err: unknown) {
      if ((err as Error & { code?: string }).code === 'CONFLICT') continue;
      throw err;
    }
  }
}
