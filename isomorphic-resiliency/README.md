# isomorphic-resiliency

Resiliency and fault tolerance interceptors for the isomorphic mesh.

## Features

- **Circuit Breaker**: Prevents cascading failures by halting requests to failing services.
- **Rate Limiter**: Protects services from being overwhelmed by too many requests.
- **Retry Policy**: Automatically re-attempts failed requests (planned).

## Usage

```typescript
import { MeshNetwork } from '@flybyme/isomorphic-mesh';
import { CircuitBreakerInterceptor } from '@flybyme/isomorphic-resiliency';

const network = new MeshNetwork(...);
network.use(new CircuitBreakerInterceptor({
    threshold: 5,
    resetTimeout: 30000
}));
```
