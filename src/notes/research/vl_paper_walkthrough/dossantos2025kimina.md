# Kimina Lean Server: A High-Performance Lean Server for Large-Scale Verification
(authored by agents unless marked 🧑)
Tag: `dossantos2025kimina`, [paper](http://arxiv.org/abs/2504.21230v3)

## purpose and architecture

Kimina Lean Server is infrastructure for submitting many Lean 4 proof scripts to the official Lean REPL. The paper targets reinforcement-learning (RL) theorem-prover pipelines, where verification results are reward signals and startup costs dominate. Its abstract states: “Built on top of the Lean REPL (Read-Eval-Print Loop) maintained by the Lean FRO, our server combines server-side parallelism by managing multiple Lean processes in parallel with a Least Recently Used (LRU) caching mechanism that reuses Lean imports across requests.” (Abstract, p. 1.)

The server exposes a REST API and has two core mechanisms: a pool of independent Lean processes and a cache of workers that already loaded a matching import header (Section 2.1, p. 2). The client is a Python package whose single `check` call accepts a list of scripts and returns Lean messages, environment identifiers, elapsed times, and an optional infotree (Section 2.2, p. 2).

## technique 1: process-level parallel verification

what it is. A single Lean REPL is single-threaded, so the server runs one persistent REPL process per available core. Incoming scripts are routed to idle workers. This gives independent proof checking without modifying Lean's proof semantics.

how to do it. (1) Start a worker pool with one Lean REPL process per configured slot. (2) Accept a batch through the REST API or Python client. (3) Dispatch each script to an idle worker. (4) Collect the Lean response and return it with timing and environment metadata. (5) Increase worker count with available CPU cores. The paper says: “The server maintains a pool of Lean REPLs, each running in its own process to ensure optimal CPU core usage.” (Section 2.1, p. 2.)

paper evidence. On 9,419 valid, sorry-free NuminaMath-LEAN proofs, Table 1 reports Kimina times of 42:40, 21:48, 11:33, and 7:56 at 8, 16, 32, and 64 cores, respectively; the competing LeanInteract times are 87:35, 45:51, 24:11, and 12:56, and leanclient times are 109:55, 56:58, 30:16, and 18:01 (Table 1, p. 2). The paper summarizes this as a 1.5–2× speedup over the next best baseline. Table 2 gives the same Kimina runs on the full filtered dataset: average verification time falls from 0.272 s/proof at 8 CPUs to 0.051 s/proof at 64 CPUs (Table 2, p. 3). The denominator is 9,419 proofs; hardware is a GCP C4 VM with Lean v4.15.0 (Appendix B.1, p. 6).

limits. Parallel workers consume memory and require compatible Lean environments. The paper's measurements are local, with simultaneous multithreading disabled; they do not establish network-service throughput or a universally linear speedup. Inference: for Verus, process-level parallelism can run independent `verus` invocations or crate partitions, but shared mutable verifier state must be isolated and proof results must include the exact toolchain and dependency identity.

## technique 2: import-aware LRU worker caching

what it is. Lean startup spends substantial time loading Mathlib and other imports. Kimina splits each script into a header containing imports and a body. It uses the header as an LRU key; a hit selects a warmed REPL with those imports already loaded, and only the body is checked (Section 2.1, p. 2).

how to do it. (1) Parse each script into import header `H` and body `B`. (2) Look up `H` in the LRU cache. (3) On a hit, route `B` to the warmed worker. (4) On a miss, initialize a worker with `H`, verify `B`, and insert that worker under `H`, evicting the least recently used entry when full. The paper describes the key operation: “If a matching worker is found, the server only needs to verify the body of the script, reusing the ready context.” (Section 2.1, p. 2.)

paper evidence. On 9,419 proofs with 64 cores, cached verification took 7:56 total and 0.051 s/proof; non-cached verification took 15:28 total and 0.099 s/proof (Table 3, p. 3). These are per-proof averages over the same filtered dataset and show a 1.94× caching speedup. Inference: cache correctness depends on the header fully determining the imported environment; scripts that mutate environment state or depend on hidden external state need a stronger cache key.

Verus form. Inference: cache verified results by a key containing the Verus version, Rust toolchain, crate lockfile, imported modules, and source hash. Reusing a process is an engineering optimization, not a Verus proof; require the verifier to recheck a body if any trusted environment component changes.

## technique 3: one-call batch client and structured feedback

what it is. The Python package hides worker scheduling and caching. `check` accepts a list of Lean scripts and returns one structured result per script, including warnings/errors, environment ID, elapsed time, and infotree (Section 2.2, p. 2). The Appendix's high-level `run_benchmark` example loads a dataset and submits batches with `batch_size=8` and `max_workers=10` (Appendix C.1, p. 7).

when to use it. Use a batch API when an RL loop, evaluator, or CI job needs many independent proof attempts and machine-readable acceptance/rejection rather than terminal output. Inference: an equivalent VL API should return proof status, diagnostics, verifier version, elapsed time, and a reproducible source/dependency identifier for every Verus attempt.

Verus form. Inference: expose a Rust or Python wrapper around `verus`, but preserve Verus's proof boundary: a successful process exit is evidence only for the exact source and specifications submitted. Store diagnostics as artifacts and never treat an LLM's claimed proof as acceptance.

## technique 4: infotree-to-tactic data extraction

what it is. Lean's infotree records tactic positions and states. Kimina's client extracts a clean sequence of non-overlapping tactic snippets and corresponding states, useful for tree-search training. The pipeline extracts each tactic's source position, adjusts intervals to remove overlaps, extracts code, and finally repairs whitespace, comments, and special tactics (Section 2.2, p. 2).

The paper emphasizes coverage: the extractor supports `have`, `let`, `calc`, and `conv`, which are not always supported by LeanREPL's Tactic mode (Section 2.2, p. 2). The output is training data, not a new proof checker: Lean remains authoritative for acceptance.

Inference: a Verus analogue could capture proof blocks, `assert` states, and solver diagnostics to train an agent to propose the next proof step. Verus does not expose Lean's infotree format, so the capture mechanism would need to be implemented against Verus diagnostics or an instrumented front end. Any extracted state must be labeled as an observation; only a fresh verifier run proves it.

## technique 5: reproducible benchmark protocol

The evaluation uses a filtered NuminaMath-LEAN subset: duplicate UUIDs removed, only complete proofs retained, then 26 `sorry` proofs and 3 proofs failing Lean v4.15.0 compilation removed, yielding 9,419 valid, sorry-free proofs (Appendix B.2, p. 6). All benchmarks use a GCP C4 VM with 72 vCPUs, 540 GB RAM, 200 GB storage, disabled SMT, and local execution to remove network latency (Appendix B.1, p. 6). Baselines use the same Lean and Mathlib versions and documented process configurations (Appendix B.3, pp. 6–7).

The authors also validate operational use: Kimina served as the verification engine for Kimina-Prover RL training, whose models achieved state-of-the-art miniF2F results twice (Section 3, p. 4). This is evidence that the server supported a real training workflow, not a claim that it improves theorem-proving accuracy independently of the model and data.

## what is trusted and what VL should reuse

Lean's kernel/REPL, imported libraries, process isolation, cache-key logic, client serialization, and the benchmark's validity labels are trusted or assumed. The paper measures wall-clock verification throughput, not semantic soundness beyond Lean's existing checker. Its conclusion says the architecture can be adapted to other checkers with minor process-spawning changes while retaining the REST API (Section 4, p. 4).

Inference: threat to agent-written verified Rust is low at the logical level and moderate at the product level. A parallel server cannot make an incorrect Verus specification correct, and stale caches could report a result for the wrong environment unless keys are complete. The reusable lesson is infrastructure: isolate verifier processes, cache only environment-determined imports, return structured diagnostics, and record denominators and toolchain settings with every throughput number. VL should not redo generic proof-server research; it should adapt these mechanisms to Verus's supported Rust subset and its dependency/specification boundaries.

## techniques for the catalog

- process-pool verification — run one independent proof-checker process per CPU slot and dispatch scripts to idle workers
- import-keyed LRU caching — reuse a warmed verifier process only when the import/environment key matches
- batch verification API — submit script lists through one call and return structured diagnostics and timing
- infotree tactic extraction — convert proof execution traces into non-overlapping tactic/state training records
- reproducible verifier benchmarking — fix toolchain, dataset filtering, hardware, and denominator before comparing throughput
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
