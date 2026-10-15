# Modular Verification of Concurrent Programs via Sequential Model Checking
(authored by agents unless marked 🧑)
Tag: `rasin2021modular`, [paper](http://arxiv.org/abs/2106.00732v1)

## core reduction

The paper reduces safety verification of a fixed-number concurrent program to repeated checks of sequential programs. One thread is chosen as the main thread; the other threads form its environment. The main thread calls an `env_move` function at selected context-switch points. Initially `env_move` havocs all shared variables written by the environment, so it over-approximates every environment computation. Sequential model checking then finds either a real violation or a potentially spurious path. Environment queries test whether the observed environment interference is feasible; infeasible transitions refine `env_move`, while feasible transitions become assertions that block states known to lead to an error.

The abstract states: “We reduce the verification of a concurrent program to a series of verification tasks of sequential programs.” It also says, “Information regarding the environment is gathered during the run of the algorithm, by need.” (Abstract, p. 1.) The approach is hierarchical: if the environment has multiple threads, the same procedure recursively verifies that environment, with information passed only where a query needs it. The authors implemented CoMuS, using SeaHorn for sequential model checking.

The method assumes sequential consistency, a fixed number of threads, and safety properties expressed as assertions in the main thread. It can handle infinite data domains when the chosen sequential checker can handle them, but termination is guaranteed only for finite domains (Sections 1 and 6, pp. 2 and 13).

## technique 1: cut-points and an over-approximating environment move

what it is: replace arbitrary environment interleavings by explicit calls to a nondeterministic `env_move` at a soundly reduced set of cut-points. The function initially havocs every shared variable the environment may write; later refinements add assumptions that remove impossible transitions.

when to use: use this when the concurrent program has a manageable fixed number of threads and a sequential model checker can analyze the main thread with nondeterministic calls. A hierarchy or chain of data dependencies makes the abstraction especially effective.

how to do it:

1. Run an interleaving-reduction analysis to compute cut-points such that safety under context switches at only those locations implies safety of the original program (Section 4.1, p. 8).
2. Copy the main thread into a sequential program `P_M` and insert `env_move` calls at every cut-point (Section 4.1, p. 8).
3. Initialize `env_move` by havocing each shared variable written by the environment (Section 4.1, p. 8). In Peterson’s algorithm, the initial move havocs `claim1`, `turn`, and `cs1` (Example 3, p. 8).
4. Preserve the over-approximation invariant: every reachable finite environment computation must be representable by a complete `env_move` execution from a matching main-thread state (Definition 2, pp. 7–8).
5. Run a sequential model checker on `P_M`; if no assertion is reachable, conclude safety because `env_move` over-approximates the real environment (Section 4.2, p. 9).

The paper emphasizes the soundness role: “Initially, env move havocs all shared variables; it is gradually refined during the run of the algorithm.” (Introduction, p. 2.)

verus form (inference): represent the environment as a ghost transition relation or a Verus state machine. A main-thread proof can use `requires` for the current abstract environment state, `ensures` for the state after an allowed environment step, and `invariant` for the over-approximation relation at loop cut-points. Inference: Verus does not execute an arbitrary havoc function inside a proof; a ghost relation or `spec fn` must describe permitted states, and a `proof fn` lemma must show that each concrete environment transition is included. The abstraction remains a search aid until the final Rust implementation is proved against the same invariant.

evidence and limits: the method is sound if the over-approximation property is maintained. It may be slow or fail to terminate on infinite domains, and the paper’s CoMuS implementation supports only a C subset, no alias analysis, limited pointer support, and no dynamic thread creation (Section 7, p. 13). Inference: these restrictions matter for Rust systems code with ownership, unsafe pointers, or dynamically spawned tasks.

## technique 2: counterexample-guided environment queries

what it is: analyze a sequential counterexample containing `env_move`, split it around the last environment call, and ask whether the environment can realize the observed transition. The query returns either `FALSE` (the transition is infeasible) or a condition `ψ` describing states from which the environment can reach the required post-state.

how to do it:

1. Let `π` be the violating path in `P_M`, ending at `assert(b)`. If it has no `env_move`, return a genuine violation (Algorithm 1, lines 3–5, p. 6).
2. Select the last `env_move` at label `l_k`, split the path into prefix `π_start` and suffix `π_end` (Algorithm 1, lines 6–7, p. 6).
3. Compute `β = wp(π_end, ¬b)`, the weakest precondition needed before the last environment step to reach the assertion failure (Algorithm 1, line 8; Section 4.3, p. 10).
4. Compute `α = post(π_start, φ_init)`, a forward postcondition describing states before the environment step (Algorithm 1, line 9; Section 4.3, p. 10).
5. Query `ψ = Reach_E(α, β)`. If `ψ = FALSE`, the observed transition is infeasible; generalize `α,β` with `Gen_E` and refine `env_move` to block it (Algorithm 1, lines 10–13; Section 4.3, pp. 10–11).
6. If `ψ ≠ FALSE`, insert `assert(!ψ)` before the environment call. Any state satisfying `ψ` is now recorded as a promise of error and will be checked for a real violation (Algorithm 1, lines 14–15; Section 4.3, p. 12).

The paper defines the query so that if `ψ` is non-false, “for every state s such that s |= ψ, there exists a computation (not necessarily reachable) of tE in P from s to some s0 such that s0 |= β.” (Definition 1, p. 6.) In the Peterson example, the algorithm computes `β = (cs1 ∧ ¬claim1)` and `α = (¬cs0 ∧ claim0 ∧ (¬cs1 ∨ claim1))`, then queries `ReachE(α,β)` (Example 5, pp. 10–11).

verus form (inference): encode `α` and `β` as `spec fn` predicates over a ghost state, and prove a lemma that an environment transition satisfying `α` either reaches `β` or is impossible. A failed lemma can produce a concrete witness for debugging; a successful lemma can strengthen a main-thread `invariant`. Inference: weakest-precondition and postcondition calculations are meta-level query generation, not Verus runtime functions. Verus’s `ensures` and `invariant` clauses state the resulting obligations, while the query engine remains an external orchestration layer.

evidence and limits: the paper proves soundness of the algorithm when environment queries satisfy Definition 1 and `env_move` remains an over-approximation (Theorem 1, p. 13). Query answers can be non-exact because the environment checker may find a non-reachable computation; the main-thread assertion then handles reachability (Section 5, p. 12). Inference: this deliberate over-approximation can produce extra proof work and does not by itself prove a concrete Rust transition feasible.

## technique 3: recursive hierarchical environment verification

what it is: answer an environment query by constructing a sequential program for the environment thread and invoking the same algorithm recursively when the environment itself contains multiple threads. A `try_start` function models a reachable but non-initial point where the environment computation begins.

how to do it:

1. If `α ∧ β` is satisfiable, return `β`, representing a zero-length environment computation (Section 5, p. 12).
2. Build `P_E` from the environment thread and insert `try_start` at its cut-points (Section 5, p. 12).
3. Before activation, let `try_start` havoc variables written by the main thread. Nondeterministically activate a start point, then assume `α`; once active, prevent further main-thread interference (Section 5, pp. 12–13).
4. Add `assert(!start || ¬β)` after each `try_start`. A violating path therefore identifies a computation that starts in `α` and reaches `β` (Section 5, p. 13).
5. If no violating path exists, return `FALSE`. Otherwise project the environment-only path after activation, compute `ψ = wp(π_E, β)`, and return `ψ` (Section 5, p. 13).
6. For more than two threads, recursively apply the same main/environment decomposition to the environment, passing discovered assumptions down the hierarchy (Sections 1 and 3, pp. 2 and 6).

The paper notes that the returned computation “might not be reachable, as in the prefix we used an abstraction of tM.” It nevertheless satisfies Definition 1 and is sufficient for soundness and progress (Section 5, p. 13).

verus form (inference): model each thread as a Verus state machine with a transition relation and prove a compositional rely-style lemma for the next thread. `requires` carries the caller’s assumption; `ensures` states the environment postcondition; `invariant` preserves shared-state facts. Inference: recursive verification order and `try_start` are orchestration mechanisms outside Verus syntax. A Verus proof must still establish that every concrete scheduler/environment step satisfies the abstract relation used by the caller.

evidence and limits: the algorithm’s progress argument says each iteration either strictly shrinks the set of environment state pairs represented by `env_move` or strictly grows the set of states known to lead to a real violation (Section 6, p. 13). With finite variable domains these sets are bounded, so termination is guaranteed. For infinite domains, termination is not guaranteed even though the soundness theorem still applies to a terminating result.

## technique 4: lazy exposure of environment state

what it is: add environment program-counter and local variables to the main sequential program only when an environment query needs them. This keeps the abstraction small while preserving the information required to express a promise of error.

how to do it:

1. Start `P_M` with main variables and any shared state needed for initial `env_move` (Section 4, pp. 6–8).
2. When a query returns a `ψ` mentioning an environment variable absent from `P_M`, add that variable and its declaration/initialization to `P_M` (Section 4.3, p. 12).
3. Extend `env_move` to havoc the new variable when the environment writes it (Section 4.3, p. 12).
4. Re-run sequential checking with the new assertion and state dimensions.

The paper says, “These variables will then be added to PM , and may be used for the input of future environment queries.” (Section 3, p. 6.)

verus form (inference): expose ghost state fields only when a proof obligation needs them, but keep the state-machine invariant explicit once exposed. Inference: Verus modules do not dynamically add fields during verification; a generator can synthesize a larger ghost model and rerun Verus, while the compiled Rust representation remains fixed.

evidence and limits: lazy exposure is part of the algorithmic design, but the experiments do not isolate its cost from hierarchy, query generalization, or sequential-model-checker performance.

## measurements, trust, and product implications

CoMuS uses Python 3.5, pycparser, SeaHorn, and Z3 for selected implication checks. Experiments compare CoMuS with Threader, VVT, and UL-CSeq on three hierarchical dynamic-programming algorithms, Peterson’s algorithm, chain-versus-ring “fib bench” variants, and a supported subset of SV-COMP concurrency benchmarks (Section 7, pp. 13–16). The hierarchical programs use a 3,600-second timeout; fib benchmarks use 1,200 seconds (pp. 14–15). CoMuS verifies safe chain-structured instances increasingly well as thread count grows, while VVT is better for falsification because of bounded checking. For ring topology, all tools fail at four or more threads, whereas CoMuS verifies all tested chain instances; on general concurrent programs, CoMuS is typically outperformed by other tools (Section 7, pp. 15–16). These are timeout and runtime observations from the reported configurations, not a universal ranking.

The paper’s Theorem 1 states: “If Algorithm 1 returns ‘Safe’ then the concurrent program P has no violating computation; If it returns ‘Real violation’ then P has a violating computation.” (Section 6, p. 13.) Trusted components include the sequential model checker, C parser and transformer, interleaving-reduction analysis, query/generalization implementation, SMT implication checks, and the assumed sequentially consistent concurrency semantics. Inference: a Verus integration would replace the final sequential checker with Verus proofs of thread transitions and invariants, but the lazy abstraction and query engine would remain untrusted search infrastructure unless separately verified.

Inference: VL should not redo a generic sequentialization tool. The reusable product idea is hierarchy-aware proof decomposition: verify a main Rust component against an abstract environment, expose only the ghost state demanded by a counterexample, and refine assumptions until Verus closes the main proof or produces a concrete violating trace. Inference: the paper’s limitations—fixed threads, no dynamic creation, weak pointer support, and strong dependence on hierarchy—are direct threats for agent-written verified Rust systems with dynamic tasks, aliasing, or scheduler-dependent behavior.

## techniques for the catalog

- env-move over-approximation — replace environment interleavings with havocing calls at sound cut-points and refine them with assumptions
- counterexample-guided environment queries — split a sequential violation, compute `wp` and `post`, and query whether the environment can realize the interference
- infeasible-transition refinement — generalize a false query and add an assumption that blocks only unreachable environment transitions
- promise-of-error assertions — turn a feasible environment condition into an assertion that exposes states guaranteed to lead to a real violation
- recursive hierarchy checking — verify multi-thread environments by applying the same main/environment decomposition recursively
- lazy environment-state exposure — add environment locals and program counters only when a query’s condition requires them

Checked 2026-10-15 against the paper by a Codex agent for modular_verification_of_concurrent_progr_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
