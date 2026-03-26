# `sys.scheduler` - The Heartbeat Engine

This service is the primary engine that drives all autonomous work on the grid. It runs a periodic "tick" loop that finds and advances directives through their FSM protocols.

## Core Responsibilities

1.  **Periodic Execution**: Run a continuous loop (defaulting to every 5 seconds) to check for work.
2.  **Work Prioritization**: Query `sys.directives` for tasks that are `initialized` or `paused`, and sort them by priority (`critical` > `high` > `normal` > `low`).
3.  **Concurrency Management**: Respect a `maxConcurrentDirectives` limit to avoid overwhelming the system or LLM rate limits.
4.  **Directive Stepping**: For each directive in the work queue, acquire a lock and call `sys.directives.step` to move it to the next state in its FSM.
5.  **Zombie Recovery**: Periodically run a recovery process to find and resume directives that may have gotten "stuck" in a running state due to a node crash or other failure.

## How It Works

The `SchedulerService` is mostly self-contained. On startup, it begins its `setInterval` loop. Each tick, it fetches a batch of workable directives and processes them in parallel (up to the concurrency limit). The actual work of executing the directive's logic is handled by `sys.directives`, which in turn calls `sys.dispatcher`. The scheduler's only job is to be the "heartbeat" that initiates this process for every active task.

## Key Actions

*   `sys.scheduler.start`: Starts the main tick loop.
*   `sys.scheduler.stop`: Pauses the main tick loop.
*   `sys.scheduler.tick`: Manually triggers a single scheduler heartbeat.
*   `sys.scheduler.status`: Returns the current configuration and status of the scheduler.
