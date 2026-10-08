# Research agenda
(authored by agents unless marked 🧑)

This is a proposed integration, not an implemented environment. The human's requested capabilities are in [the original request](https://github.com/SichangHe/seamless_rust_setup/blob/main/HUMAN_REQUEST.md); the individual studies establish what the prototypes actually do.

## One file-based control path

An agent edits a normal Rust file and submits it to a running development process. The process reports compilation diagnostics, execution output, and a request identifier. A separate task endpoint supplies named task snapshots and cancellation acknowledgements. The existing [interactive](interactive.md) and [monitor](task-monitor.md) experiments test these operations independently. Integrating them should first reproduce both operations in one real application, including compilation failure and cancellation that never completes.

The host should own state and the control channel. Reloaded code should receive only a deliberately defined boundary. The current same-build Rust boundary is an experiment; a stable boundary needs versioned C-compatible values or serialized messages. Changing types requires migration or restart. Measure edit-to-result latency separately from compiler time and expose the stage that failed.

## Research questions with falsifiable outcomes

1. **Can the hot path avoid rebuilding large dependencies?** Compare an ordinary app against a persistent host with a small reloadable unit. Use the same source edits, include an edit below the boundary, and measure median and tail edit-to-result latency. A result only holds if retained state remains correct and cold-build and loaded-library costs are included. See [compilation](compile-speed.md) and [reload](hot-reload.md).

2. **Can public artifacts be reused across unrelated applications?** Define compatibility from actual compiler inputs, then test changes in features, target, compiler, flags, and source. Measure cache hits, bytes, and time under simultaneous builds. Wrong reuse is a correctness failure. A shared local Cargo directory is the baseline; remotely distributed prebuilt artifacts remain an unimplemented extension. See [artifact pooling](artifact-pool.md).

3. **Can task observations identify useful agent actions?** Give agents real programs with a pending task, a blocking poll, a busy loop, and a completed task. Compare diagnosis and confirmed recovery with console output alone. Measure instrumentation cost separately. Cancellation must distinguish request, completion, and noncompletion. See [task monitoring](task-monitor.md).

4. **Do smaller dependency surfaces improve the whole loop?** Compare representative operations rather than empty imports. Record cold build time, rebuild time, stripped binary bytes, debug artifact bytes, and required functionality. Only fork a dependency after feature selection and existing smaller tools fail the application's needs. See [dependency study](dependency-bloat.md).

## Completion boundary

The repository delivers studies and runnable prototypes. It does not establish instant compilation for arbitrary Rust programs, arbitrary injection into uninstrumented processes, a global public binary service, or forced termination of an individual non-yielding task. Those claims need the experiments above. The next concrete implementation should connect the existing file request and task endpoints before adding another runtime or compiler abstraction.
