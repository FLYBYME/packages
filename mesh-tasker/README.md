# MeshTasker (Demo Application)

MeshTasker is a real-time, distributed task management board (Trello-style) designed to demonstrate the full capabilities of the Isomorphic Mesh ecosystem, including offline-first state, zero-trust security, and automated resiliency.

## 🚀 Key Features Demonstrated

| Feature | Framework Capability |
| :--- | :--- |
| **Offline Task Creation** | Uses `isomorphic-mesh` OfflineStorage and `SyncManager` |
| **Request Throttling** | `RateLimitInterceptor` protecting workers from spam |
| **Fault Tolerance** | `CircuitBreakerInterceptor` trips when a node fails, triggering failover |
| **Zero-Trust RPC** | Every task update requires a `Gatekeeper` validated Service Ticket |
| **Real-time Updates** | Mesh Events (`tasks.created`) propagate via `LogInterceptor` to the UI |
| **Isomorphic Schema** | Zod definitions in `task.schema.ts` drive both DB and UI validation |

---

## 🏗 Cluster Topology

The demo simulates a 4-node cluster locally using the `MockTransport`:

1.  **Node A (Gateway)**: The entry point. Handles UI state and routes mesh traffic.
2.  **Node B (Auth)**: The Identity Service. Issues tickets via `mKDC`.
3.  **Node C (Worker)**: The primary Task Worker managing an SQLite database.
4.  **Node D (Replica)**: A secondary worker used for load balancing and chaos testing.

---

## 📦 Package Integration

MeshTasker acts as the "Glue" code for the ecosystem:

*   **`isomorphic-core`**: Provides the `MeshApp` DI shell and `ServiceBroker` kernel.
*   **`isomorphic-mesh`**: Handles the underlying packet movement via `MockTransport`.
*   **`isomorphic-resiliency`**: Provides the `CircuitBreaker` and `RateLimiter` logic.
*   **`isomorphic-database`**: Manages the local persistence via `IDatabaseAdapter`.
*   **`isomorphic-registry`**: Tracks node health and performs XOR-distance routing.

---

## 🛠 Running the Demo

### 1. Prerequisites
Ensure you are in the package directory and have installed dependencies:
```bash
cd packages/mesh-tasker
npm install
```

### 2. Launch the Cluster
The demo bootstraps a Gateway and a Worker node, simulates a few seconds of uptime, and shuts down gracefully.
```bash
npx ts-node -r tsconfig-paths/register src/run.ts
```

### 3. Run Chaos & Resiliency Tests
To see the **Circuit Breaker** and **Rate Limiter** in action under simulated pressure:
```bash
npm test
```
*   **Rate Limit Test**: Bombards the gateway with 100 requests to trigger a `429 Too Many Requests`.
*   **Circuit Breaker Test**: Simulates consecutive failures from Node C to watch the gateway automatically halt traffic to that node.

---

## 📋 Data Models
All operations are strictly typed via **Zod**:
*   `TaskSchema`: `id`, `title`, `status` (pending/active/completed), `assignedTo`.
*   `UserSchema`: `id`, `name`, `role` (user/admin).
