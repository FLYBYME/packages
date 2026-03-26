# isomorphic-utils

Standalone caching and feature flag utilities for the isomorphic mesh ecosystem. This package provides strictly typed, framework-agnostic modules for managing application state and feature toggles across Node.js and the Browser.

## Features

- **Strictly Typed**: Zero `any` usage, leveraging TypeScript generics for cache values.
- **Memory Cache**: High-performance in-memory cache with built-in TTL (Time-To-Live) and pruning logic.
- **Distributed Feature Flags**: Feature flag management with local caching, automatic synchronization via mesh events (`$flags.updated`), and RPC fallbacks.
- **Isomorphic**: Runs seamlessly in any JavaScript environment (Node.js, Browser, Edge).
- **DI Ready**: Full integration with the `isomorphic-core` Dependency Injection shell.

## Installation

```bash
npm install isomorphic-utils
```

## Quick Start

### Caching

```typescript
import { CacheModule, MemoryCache } from '@flybyme/isomorphic-utils';

app.use(new CacheModule({ provider: new MemoryCache() }));

// Later in a service:
const cache = app.getProvider('cache');
await cache.set('user:123', { name: 'Alice' }, 60000);
const user = await cache.get<{ name: string }>('user:123');
```

### Feature Flags

```typescript
import { FlagModule } from '@flybyme/isomorphic-utils';

app.use(new FlagModule({ 
    defaultFlags: { 'new-feature': true } 
}));

// Later in a component or service:
const flags = app.getProvider('flags');
if (flags.isEnabled('new-feature')) {
    // ...
}
```

## Core Modules

- `CacheModule`: Registers a pluggable `ICacheProvider`.
- `FlagModule`: Registers a `FeatureFlagManager` and handles mesh synchronization.
- `MemoryCache`: Default TTL-aware in-memory implementation of `ICacheProvider`.

## License

MIT
