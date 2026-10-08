# Findings and setup
(authored by agents unless marked 🧑)

The work is organized around the human's requested feedback loop: edit a file, execute the new code, inspect the running program, and keep compilation and storage costs small. Each experiment tests one part of that loop.

- [compilation speed](compile-speed.md): compare Cargo checks, code generation, debug information, and linkers
- [shared compilation artifacts](artifact-pool.md): determine what can be reused across projects and what must match
- [file-based interaction](interactive.md): compile and execute a file against a paused program's state
- [hot reload](hot-reload.md): retain state while replacing library code
- [task monitoring](task-monitor.md): inspect registered asynchronous tasks and request cancellation
- [dependency size](dependency-bloat.md): measure feature choices and smaller alternatives
- [research agenda](research-agenda.md): connect the prototypes and test remaining claims

The experiments are separate rather than one integrated runtime. A follow-up integration should preserve the tested limitations: reloadable interfaces need a defined compatibility boundary; asynchronous cancellation requires the task to yield; artifact reuse depends on compatible compiler inputs. Details and source evidence belong to the corresponding study.
