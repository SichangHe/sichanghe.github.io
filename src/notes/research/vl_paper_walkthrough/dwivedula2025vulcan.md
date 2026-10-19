# Vulcan: Instance-Specialized, Verifiable Systems Heuristics Through LLM-Driven Search
(authored by agents unless marked 🧑)
Tag: `dwivedula2027vulcan`, [paper](https://doi.org/10.1145/3842654.3848582)

## result and boundary

Vulcan synthesizes resource-management heuristics by exposing only decision logic to an LLM and keeping state and integration in trusted runtime code. The authors identify three requirements: performance, execution safety, and system integration (Section 2.2, PDF p. 3). A second boundary is Anvil, a restricted language in which “every well-formed program satisfies the execution-safety properties in Table 3 by construction” (Section 5, PDF p. 7). The overview also states that “memory safety, leak freedom, and termination are guaranteed by construction without the need for human review” (Section 3.1, PDF p. 5).

## technique 1: isolate stateless Rank and Value decisions

Use case. Apply when a systems policy can be expressed either as one scalar control output or as an ordering of candidates. The paper defines Value as `Value(X) → Y`, with `Y` a scalar, and Rank as `Rank(X,O) → R`, where candidates are ordered and the mechanism enacts the choice (Section 4.2, PDF pp. 5–6). Examples include congestion-window or frequency control (Value), and cache eviction, CPU scheduling, or page promotion (Rank).

Steps from the paper. (1) Decompose the task into sub-policies, then identify triggers, raw-signal collection, feature storage, decision logic, and mechanisms; developers retain task decomposition, triggers, raw-signal collection, and mechanisms (Section 4.1, PDF p. 5). (2) Choose Value and define `double value_fn(vulcan::store&)`, or choose Rank and define `double score_fn(vulcan::store&, int64_t obj_id)` (Section 4.2, PDF p. 6). (3) Expose the declared signals through libVulcan, let its utilities rank candidates, and retain enactment in developer-owned mechanisms. (4) For coupled decisions, compose a Value action choice with a Rank destination choice; the paper's multi-region scheduler first chooses spot in the current region, on-demand in the current region, migrate, or wait, and ranks destination regions only if migration is chosen (Section 7.1.2, PDF p. 10).

The cache template is concrete: `store.add_obj`, update `insert_time` and `access_time`, call `Rank(store.all_objs, score_fn, OnDemandSort, n_sample=32)`, remove `R.back()`, and return the victim (Listing 1, PDF p. 7). The LLM chooses listeners and the body of `score_fn`; the developer writes lines 1–25.

Verus form. Inference: represent a generated Value as a side-effect-free executable function with a contract over an immutable feature snapshot; represent the generated Rank scorer as a function returning a score and prove that the selected candidate is in the input set. Keep mutation and API calls in developer-owned Rust with `requires`/`ensures`; use proof lemmas for ordering properties. Use specification and proof functions to describe and justify the runtime implementation.

Evidence and limits. Four templates expose 3–11 raw signals and 62–104 lines of developer code; the same 74-line cache template serves 32 instances (Section 8.1, PDF p. 13; Table 8). Interfaces are not universal: coupled decisions may need new stateless interfaces (Section 8.2, PDF pp. 13–14). Inference: decomposition can encode the wrong policy if interactions between sub-decisions are essential.

## technique 2: listener-based feature stores

Use case. Stateless decisions need external state to compute moving averages, percentiles, or population statistics. libVulcan listeners attach reusable stateful aggregates to raw signals while keeping state management out of generated code (Section 4.3, PDF p. 6).

Steps. (1) Add raw signals to the developer template and update them on system events. (2) Attach listeners such as `Average`, `RollingWindow(N)`, `EWMA({α})`, `RollingPercentile(N)`, `RollingCount(N)`, `PopPercentile`, or `PopMean`; each maintains its own data structure and query API (Table 2, PDF p. 7). (3) Query listener values from Rank/Value code. (4) Choose `IncrementalSort` for maintained rankings or `OnDemandSort` for decision-time sorting; sampling can reduce cost (Sections 4.4–4.5, PDF pp. 6–7). Listing 1 attaches `Latest()` to access time and `PopPercentile()` to insertion time, then branches on percentile > 0.9.

Verus form. Inference: implement each listener as trusted, separately verified Rust with invariants for sums, ring-buffer bounds, ordered multisets, and update/query correspondence. Expose read-only runtime queries to generated policy code, with specification views for proofs. This makes the listener analogous to a verified library abstraction; its implementation and external inputs remain assumptions unless modeled.

Evidence and limits. Listener update/query costs are stated in Table 2: `Average` is O(1)/O(1), `RollingPercentile(N)` O(log N)/O(log N), and population listeners use O(M) space for M objects. For cache eviction, the authors report that Vulcan-NL “trails the full Vulcan by 0.84% in average MRR” (Section 7.2, PDF pp. 11–12). Runtime cost can dominate: Vulcan's cache heuristic is 13.4× FIFO execution time (7.4–22.5× range), though sampling k=5 reduces one policy from 15× to 5× while largely preserving miss rates (Table 7 and Section 7.2, PDF p. 12).

## technique 3: Anvil safety by construction and trusted externs

Use case. Constrain generated code when automatic review cannot reliably establish memory safety, leak freedom, and termination. Anvil permits scalars, arithmetic, conditionals, bounded `for` loops, and built-in math, while excluding pointers, arrays, containers, heap allocation, recursion, and unbounded loops (Section 5, PDF p. 7). The paper attributes P1 memory safety, P2 leak freedom, and P3 termination to these restrictions; the guarantee assumes linked externs satisfy the same properties (Section 5, PDF pp. 7–8).

Steps. (1) Generate Anvil source against the fixed feature/API signatures. (2) Parse it with the Anvil grammar and reject disallowed constructs. (3) Lower accepted code to C; link declared `extern` listener functions to C implementations; compile with native tools (Section 5, PDF pp. 7–8). (4) Treat safety as conditional: “a well-formed Anvil program satisfies P1–P3 provided every linked extern also satisfies P1–P3” (Section 5, PDF p. 8). The trusted boundary therefore includes libVulcan and every external implementation.

Verus form. Inference: encode the same restrictions with a small Rust subset and verify generated functions with `requires`/`ensures`; bounded loops need invariants, and no pointers or heap state should cross the generated boundary. Document assumptions for external code; verify each generated policy body rather than treating it as trusted. Verus can prove stronger functional properties than Anvil's safety-by-syntax if feature semantics are specified.

Evidence. Vulcan evaluates three domains: spot VM scheduling, cache eviction, and memory tiering (Section 7, PDF p. 8). Single-region scheduling uses 21,600 cases, a fixed 5% sample during synthesis, and the full set for final results; it reports nearly 4.9× the savings of UP and 1.7× ADRS (Section 7.1.1, PDF pp. 9–10). Cache eviction evaluates 32 instances (8 traces × 2 cache sizes × 2 object-size settings), scores candidates on the first 1M requests with a 100-second timeout, and reports two instances beating all baselines and 13 in the top three (Section 7.2, PDF pp. 11–12). Memory tiering evolves for 100 iterations on one emulator workload, then tests on real CXL hardware; the GUPS-trained heuristic is 14.2% above ARMS on GUPS and matches ARMS on other workloads (Section 7.3, PDF pp. 12–13). Inference: these results support the evaluated settings, not universal superiority.

## what is trusted, measured, and already done

The paper identifies broader semantic verification as future work: “An important next step is to explore how far this boundary can be expanded, for example by using stronger end-to-end semantic verification to safely expose a larger synthesis surface” (Section 10, PDF p. 14).

## techniques for the catalog

- Rank/Value synthesis boundary — expose stateless scalar or candidate-scoring functions while trusted code owns triggers, mutation, and integration
- listener feature stores — attach reusable aggregates to raw signals, review and verify their implementations once, and query them from generated decisions
- Anvil-style safety restriction — reject pointers, arrays, containers, heap allocation, recursion, and unbounded loops, then require linked externs to satisfy P1–P3
