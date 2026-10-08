# Task attachment and cancellation
(authored by agents unless marked 🧑)

🧑 Goal: “Erlang-style shell attachment and process monitoring and killing (async tasks)” and “monitor asynchronous tasks like `top` does but for agents”.

## Working experiment

Run `bash experiments/task_monitor/demo.sh` on Unix. It compiles a real Tokio program, attaches through a Unix socket, lists five named tasks, cancels a pending task and a `tokio_gen_server` actor, and confirms that an infinite poll survives cancellation. The attached client also requests cancellation of an unknown ID. No unstable compiler configuration is needed.

The original counters measured elapsed wall time inside `Future::poll`, including blocking waits. Calling that CPU utilization was wrong. Output now says `BUSY%`: fraction of the sampling interval spent inside poll. `IN_POLL` exposes a poll that has not returned. The example's `half-busy` task deliberately blocks an OS thread for 5 ms; its busy time demonstrates why this measurement cannot distinguish sleeping from CPU work.

## Design

- `Monitor::spawn` wraps the future, records poll count and elapsed time, and stores an `AbortHandle`
- a registry thread owns the task map and handles snapshot and cancellation messages
- separate socket threads remain responsive when Tokio workers stop yielding
- `taskmon SOCKET top 1000` compares two snapshots and sorts by busy time
- `taskmon SOCKET kill ID` acknowledges an abort request; disappearance from a later snapshot confirms completion
- snapshots remove completed entries; insertion also prunes when the table reaches its threshold

## Limits

Only futures passed through `Monitor::spawn` appear. Library-internal `tokio::spawn` calls are invisible; the actor example constructs the actor's future explicitly. There is no automatic arbitrary-process attachment, task ancestry, restart supervision, stack inspection, code injection, or task-local state inspection.

Counters are sampled independently with relaxed atomics. A concurrent poll boundary can distort one sample. Completed tasks disappear, so work completed between samples is excluded. Busy percentages are approximate observations, not accounting totals. Instrumentation overhead has not been measured.

Cancellation drops a future after it yields control; it cannot interrupt an infinite poll. Dropping a future does not undo external effects. A running blocking task needs its own cooperative stop mechanism or a separate process if forced termination is required.

The socket is a local development control channel. Use a private directory, as the demo does: anyone who can connect can request cancellation. The server refuses an existing socket path rather than deleting it. There is no bounded client pool, input limit, application-level authentication, shutdown handle, or socket cleanup on process exit. Do not expose it to untrusted clients.

## Existing tools and recommendation

Tokio's official console already supplies richer task diagnostics. Its README says: “the `tokio_unstable` cfg must be enabled” ([instrumenting your program](https://github.com/tokio-rs/console#instrumenting-your-program)). Use console when runtime-wide diagnostics justify that build configuration; use this experiment to evaluate a stable, plain-text cancellation control channel. This is a recommendation, not a measured comparison.

Tokio's task documentation says cancellation is “signalled to shut down next time it yields at an `.await` point” ([cancellation](https://docs.rs/tokio/latest/tokio/task/index.html#cancellation)). An `.await` that immediately returns ready need not yield. Its `AbortHandle` documentation says “tasks spawned using `spawn_blocking` cannot be aborted because they are not async” ([abort](https://docs.rs/tokio/latest/tokio/task/struct.AbortHandle.html#method.abort)); a request before the blocking task starts may prevent it from starting.

Proposed next research: connect console's observations to explicit application-owned cancellation handles, retain bounded completion history, and add cooperative stop/restart commands to actors. Arbitrary forced task killing inside one Rust process remains an unmet goal; a process boundary provides a firmer termination boundary.

Sources retrieved 2026-10-06. Local behavior was checked with the real demo; broader production integration and overhead remain untested.
