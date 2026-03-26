# MeshT Operations Grid

This monorepo contains a suite of packages for building distributed, real-time, and offline-capable operations systems.

## Packages

- **[@flybyme/isomorphic-core](./isomorphic-core)**: The unified kernel and DI shell.
- **[@flybyme/isomorphic-mesh](./isomorphic-mesh)**: Isomorphic networking stack.
- **[@flybyme/isomorphic-auth](./isomorphic-auth)**: Authenticated encryption and identity.
- **[@flybyme/isomorphic-database](./isomorphic-database)**: Type-safe isomorphic database query builder.
- **[@flybyme/mesh-tasker](./mesh-tasker)**: A comprehensive demo application for operations orchestration.

## Installation from GitHub Packages

These packages are published to the GitHub Package Registry. To use them in your own application:

1. **Authenticate**: Create a Personal Access Token (classic) with `read:packages` scope.
2. **Log in**:
   ```bash
   npm login --registry=https://npm.pkg.github.com
   # Username: FLYBYME
   # Password: <Your Personal Access Token>
   ```
3. **Install**:
   ```bash
   npm install @flybyme/isomorphic-core
   ```

### Using a .npmrc file (Recommended)

To avoid manual logins, create a `.npmrc` file in your project root:

```text
@flybyme:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Troubleshooting

### "Cannot find module '@flybyme/isomorphic-core' or its corresponding type declarations"

If you encounter this error after installing:

1. **Registry Configuration**: Ensure your `.npmrc` or login is correctly scoped to `@flybyme`.
2. **Autocompletion**: Run `npm install` again to ensure the lockfile is synced with the GitHub registry.
3. **Peer Dependencies**: Some modules require `isomorphic-core` as a sibling. Ensure you have it installed or correctly resolved.

## Getting Started

Check out the [@flybyme/mesh-tasker](./mesh-tasker) package for a full example of how to compose these modules into a functional operations system.

### Basic Usage

```typescript
import { MeshApp, LoggerModule, LogLevel } from '@flybyme/isomorphic-core';

const app = new MeshApp({
    nodeID: 'my-node',
    modules: [
        new LoggerModule(LogLevel.INFO)
    ]
});

await app.start();
```

## Development

- **Build all**: `npm run build`
- **Test all**: `npm test`
- **Lint all**: `npm run lint`

## License

MIT
