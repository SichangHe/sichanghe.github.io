# Automated Verification of Idempotence for Stateful Serverless Applications
(authored by agents unless marked 🧑)
Tag: `ding2023flux`, [paper](https://www.usenix.org/conference/osdi23/presentation/ding)

## property and system
Flux verifies idempotence consistency of stateful serverless applications and chooses a small set of operations to protect with exactly-once logs. The paper defines the target precisely: “Idempotence consistency requires that each execution with retries should have the same observable behavior as another execution without retries” (§3, p. 890). This is weaker than exactly-once execution of every database operation: only a retry execution’s client-visible history and final shared state must be reproducible by some retry-free execution.

Flux models concurrent execution of the function set as an automaton whose states contain persistent key-value data and each invocation’s local variables, arguments, return value, and next statement. A transition can emit invocation, response, or third-party-service events (§3, p. 890). It constructs a retry automaton by resetting local state after a failure and jumping to the function’s first statement. Failure preserves persistent shared state and other instances’ local states; retry keeps the same instance identifier and arguments and emits no new invocation event (§3, p. 890). Developers must identify third-party services with side effects so their calls become observable events (§5, p. 893). Definition 1 requires that for every retry trace producing observable history and database state, some no-retry trace produces the same pair (§3, p. 890).

The motivating payment example atomically checks and deducts a discounted balance, generates a receipt ID, and writes a receipt. Logging only the conditional update and `generateId` suffices under sequential execution. With concurrent discount updates, however, “payment would have deducted the price with the old discount but created a new receipt with the new discount” (§2, p. 888). Logging the discount `get`, conditional update, and `generateId` prevents this inconsistency; the receipt `put` can remain unlogged because retries write the same value (§2, pp. 888–889; §5.2, pp. 894–895).

## technique 1: compositional idempotence simulation

what it is and when to use it
Replace whole-application interleaving exploration with one proof per function. Flux defines idempotence simulation as a forward simulation from a function with arbitrary retries to the same function without retries under a rely condition. The paper states: “Instead of manually crafting the specification, Flux introduces a new correctness definition — idempotence simulation” (§4.1, p. 891).

how to apply it
1. Build the retry automaton `f*` by allowing local-state reset and restart after failures (§3, p. 890).
2. For each function `f`, choose or infer a rely relation `R` describing concurrent changes to shared data (§4.1, p. 891).
3. Symbolically execute a step of the retry-enabled function. If it changes data from `D` to `D'` and emits event `e`, find zero or more no-retry steps that reach `D'` and emit `e` from the same shared state `D` (§4.1, p. 891).
4. Preserve a premise relating symbolic read values and path conditions across the two traces.
5. Apply Theorem 1: if every function has such a simulation under some rely relation, the function set satisfies idempotence consistency (§4.1, p. 891).

Verus form (inference)
Inference: model the shared key-value store and each function’s control state as a Verus state machine. Define a transition relation for retry and a second relation for retry-free execution; prove a simulation invariant relating their states and emitted events. Use `requires` and `ensures` for API effects and `invariant` declarations for stable rely facts. The paper’s symbolic trace search would remain an external analysis or generate proof obligations; Verus does not automatically synthesize all mappings.

evidence and limits
Flux’s theorem gives soundness: a proved simulation cannot overlook an idempotence issue under its model. It is incomplete because a globally idempotent application can have individual functions that fail the compositional condition (§5.2, p. 895). The model assumes shared state is NoSQL key-value data and currently supports Java applications through a Java symbolic-execution engine (§1, p. 888; §9, p. 900).

## technique 2: automatic rely conditions and Floyd-Hoare facts

what it is and when to use it
Infer concurrency assumptions from symbolic database accesses instead of requiring developers to write invariants and rely conditions. Flux classifies each key as read-only, arbitrary-update, or constant-update (§4.2, p. 892).

how to apply it
1. Model each database API as atomic reads or writes and symbolically execute every function. A write through a symbolic key conservatively permits changes to arbitrary database data; use path conditions to classify symbolic write values as constant or arbitrary (§4.2, p. 892; §5.1, p. 894).
2. Classify a read-only key as `(D[k]=v, D[k]=v)`, arbitrary update as `(∃v1.D[k]=v1, ∃v2.D[k]=v2)`, and constant update as `(∃v1.D[k]=v1, D[k]=c)` (§4.2, p. 892).
3. Generate Floyd-Hoare facts. For example, under a constant-update rely, `{P} put(k,c) {P ∧ D[k]=c}`; under read-only rely, `{P} v:=get(k) {P ∧ D[k]=v}` (§4.2, p. 892).
4. For branches dependent on a database read, retain the predicate only when the rely guarantees it remains true; otherwise preserve the precondition unchanged (§4.2, p. 892).
5. Allow a developer annotation for unique variables (for example, a receipt ID) when concurrent instances cannot access that key (§5.1, p. 894).

Verus form (inference)
Inference: encode each rely classification as a predicate over a Verus map and make it an invariant of the transition system. A `get` proof can use the invariant to establish the returned value; `put` can update the map and re-establish the invariant. Unique-key annotations become a `requires` predicate that no other transition owns that key. This is an inference because Flux’s generation algorithm is not a Verus implementation.

The method is only as complete as its generated conditions. The paper explicitly says it “does not generate all possible rely, pre- and post-conditions,” which can prevent verification (§5.2, p. 895).

## technique 3: failure reduction

what it is and when to use it
Arbitrary retries create infinitely many traces. Flux proves it is enough to check traces where failure occurs only after a shared-state-modifying statement and at most once (Theorem 3, §4.4, p. 892).

how to apply it
1. Restrict symbolic failure injection to points after writes.
2. Permit one failure and one restart in the checked trace.
3. Prove idempotence simulation for every function in the set under this restricted failure model.
4. Invoke Theorem 3 to lift the result to arbitrary failures and retries (§4.4, pp. 892–893).

Verus form (inference)
Inference: add a ghost retry counter and allow the checked failure transition only immediately after a shared-state modification. State the reduced-trace simulation invariant for counter values 0 and 1, then prove that repeated retries can be collapsed to the same simulation. This requires a project-specific theorem; Verus will not infer the reduction from code alone.

The reduced model places failures after shared-state modifications. Theorem 4 lifts simulation with one retry to simulation with any finite number of retries (§4.4, p. 893; Appendix B, pp. 907–908). This does not establish atomicity: “Although atomicity is vital for fault tolerance, Flux does not guarantee it” (§9, p. 900).

## technique 4: handling unbounded loops

what it is and when to use it
Flux avoids manually supplied loop invariants in two restricted cases (§4.3, p. 892).

how to apply it
- no shared writes: replace the entire unbounded loop with an uninterpreted function and verify the resulting function `g`; assign the uninterpreted return values to variables modified by the loop (§4.3, p. 892; §5, p. 893)
- shared writes with stable parameters: prove Theorem 2, requiring the loop iteration count to remain unchanged on retry, the code before the loop, the loop body, and the code after the loop each to satisfy idempotence simulation, each component’s inputs to remain unchanged on retry, and each component to leave shared state unchanged when retried after its successful execution (§4.3, p. 892)
- otherwise: the verifier may be unable to prove the loop; Figure 8 derives write parameters and iteration count from database reads. For unsupported loops, advisor logs operations before and within the loop except reads of read-only data, then handles the following code (§5.2, p. 895; §6, p. 896)

Verus form (inference)
Inference: for a read-only loop, use an uninterpreted `spec fn` summary and prove that the executable loop preserves the summary contract. For a write loop, prove that retries preserve the iteration count and component inputs, each component satisfies simulation, and redoing a completed component leaves shared state unchanged. A summary used without a proof remains an assumption.

## technique 5: trace simulation and advisor log minimization

what it is and when to use it
Algorithm 2 checks whether each retry trace step can map to zero or more no-retry steps. `CheckWithPremise` recursively tries candidate prefixes, checks events and writes, updates symbolic equalities, and continues with the suffix (§5.2, pp. 894–895).

how to apply it
1. Set `premise := pcr ∧ pc`, the retry and normal path conditions.
2. Take the first retry step and enumerate prefixes of the normal trace.
3. `CheckStep` uses an SMT solver to require matching write parameters under the premise, or no writes on either side, and matching observable events, including their arguments and return values.
4. `UpdatePremise` adds equalities for reads of the same key.
5. Recurse on remaining suffixes; accept when the retry trace is empty (§5.2, p. 894).
6. Use the heuristic mapping: map pre-retry steps by index, map already executed post-retry steps to `nop`, map other post-retry steps to simulating normal steps, and randomly sample alternatives if the first mapping fails (§5.2, p. 894).

Advisor then finds a logging set. It models logs by deleting retried writes from traces and constraining retried reads to return their original results. The brute-force algorithm enumerates `O(2^n)` operation subsets and chooses the passing set with the lowest estimated logging cost. The heuristic checks `O(n)` sets by starting with all logs and removing one operation’s log at a time, keeping it removed only if verification passes (§6, pp. 895–896). With `generateId` already logged, the payment example keeps logs for `get` and `update` and removes the log for `put` (Table 1, p. 896). The heuristic need not find a minimum set (§7.3, p. 897).

Verus form (inference)
Inference: a Verus proof can encode a fixed trace mapping as a ghost sequence and prove a per-step simulation invariant. Searching mappings and operation subsets is better done outside Verus; the selected mapping can then become a proof lemma or generated ghost certificate. A `nop` corresponds to a transition that preserves the abstract map and emits no event.

## evidence, trust, and product threat

Flux evaluated 27 applications containing 79 functions (§1, p. 888). It reports “21 non-idempotent functions detected by Flux in 12 applications” and “Developers have confirmed 8 issues among them” (§7.2, pp. 896–897). SPECjbb2015 times out because of unsupported loops; its unverified functions have actual issues, so the authors report no false positives in this evaluation, while warning that false positives remain possible (§7.2, p. 897; Table 2). Against Beldi, Flux reports 2.5×–6× improvement for Type-I applications and up to 5.5× for Type-II applications, with 10× higher peak throughput specifically for HttpEP (§7.4.1, p. 898). Against Boki, it reports up to 62.6% lower median latency at 1 RPS and 8.7× lower median latency for HttpEP at 800 RPS; Boki throughput was not measured precisely (§7.1, p. 896; §7.4.2, p. 898). The Beldi/Boki performance comparison uses Go ports of the applications and disables their transaction mechanisms (§7.1, p. 896). Verification time grows exponentially with branch count: 16 branches took 1,441.48 seconds; it grows linearly with database operations, functions, or lines of code in the reported microbenchmarks (§7.2, p. 897). The heuristic advisor reduced search space by up to 4× and execution time by 80.39% versus brute force, while finding the same operation sets in the evaluation (§7.3, p. 897).

Inference: the proof depends on the symbolic executor and SMT solver, the accuracy of the database, event, failure, and concurrency models, developer annotations about service side effects and unique keys, and the logging runtime implementing the modeled exactly-once behavior (§§3–6). Inference: for agent-written verified Rust, Flux’s core lesson is to make retry traces and concurrent effects explicit before proving business properties; hidden retries and guessed rely conditions are a high threat. Inference: given the prior crash-recovery verification and logging work discussed in §8 (pp. 899–900), VL should avoid treating exactly-once logging as a new verification idea. Flux does not verify atomicity and is incomplete for some loops and globally idempotent compositions (§5.2, p. 895; §9, p. 900).

## techniques for the catalog

- idempotence simulation: prove a forward simulation from retry traces to retry-free traces under a concurrency rely relation
- inferred rely conditions: classify key accesses and synthesize stable Floyd-Hoare facts automatically
- failure reduction: check one post-write failure to cover arbitrary retries under the theorem’s assumptions
- loop abstraction: summarize read-only unbounded loops or require stable write-loop parameters
- trace mapping and advisor: map retry steps to normal steps and remove unnecessary exactly-once logs by verification
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Although the heuristic algorithm does not guarantee finding the minimum operation set, the evaluation shows that it finds the same set as the brute-force algorithm in practice."): read the full paper, including references and Appendices A–D, and the whole study; checked quotations, numbers, section and printed-page references, and technique steps; corrected concurrent payment logging, loop prerequisites, failure-reduction references, trace checks, advisor details, evaluation scope, and the publisher link; marked the trust assessment as Inference; did not independently prove the paper’s theorems, validate Verus sketches, inspect implementation code, or reproduce experiments.
