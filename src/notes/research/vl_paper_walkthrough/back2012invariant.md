# An Exercise in Invariant-based Programming with Interactive and Automatic Theorem Prover Support
(authored by agents unless marked 🧑)
Tag: `back2012invariant`, [paper](http://arxiv.org/abs/1202.4829v1)

## scope and result

Back and Eriksson present Socos, a diagram-based invariant-based programming (IBP) environment. The method writes loop invariants before code, adds transitions incrementally, generates verification conditions, and discharges them with PVS and Yices. A heapsort case study demonstrates background theories, specification/invariant design, automatic checking, interactive proofs, and bug discovery. The paper states: “Invariant-Based Programming (IBP) is a diagram-based correct-by-construction programming methodology in which the program is structured around the invariants, which are additionally formulated before the actual code.” (Abstract, p. 29).

## technique 1: design invariant diagrams and total-correctness obligations first

Use IBP when the implementation should be shaped by its proof. Draw situations as state predicates and transitions as guarded statements. Nest inner situations to inherit outer invariants. A diagram is correct when every transition is consistent, every intermediate situation is live, and every loop terminates. For a transition from situation `X` to `Y`, prove `∀σ: P_X(σ) ⇒ wp(S_X,Y)(P_Y)(σ)`. For liveness, show the postcondition is reachable and statements do not rely on miracles. For termination, assign each strongly connected component a function into a well-founded set and prove strict decrease on every cycle.

The paper gives the criterion: “A diagram is correct iff all transitions are consistent, all intermediate situations are live, and all loops are terminating.” (Section 2, p. 31). Inference: a Verus workflow can model situations as ghost predicates, transitions as functions with `requires`/`ensures`, and loop variants as decreasing natural numbers; Verus's executable Rust remains explicit rather than diagrammatic. The important carry-over is proof-first control flow and separate safety, liveness, and termination obligations.

## technique 2: incremental weakest-precondition checking

Use Socos's diagram editor to add transitions one at a time. The checker computes weakest preconditions and emits one PVS lemma per condition, with a proof script and final proof state. Check all transitions currently present; defer liveness and termination by omitting a termination function, which produces a warning. The environment pinpoints an inconsistent transition in the Problems view.

The implementation rule is: “The verification conditions are calculated by weakest preconditions, and exported into a PVS theory file containing a lemma for each condition.” (Section 4.2, p. 34). Inference: a Verus IDE can generate obligations after each function/loop edit and associate failures with source spans, while `requires` and `ensures` remain the user-facing specification. This incremental granularity catches local errors before a complete program exists.

## technique 3: build domain background theories for automation

Use a background theory to replace hard definitions with abstract lemmas that an SMT solver can apply. For sorting, define a dependent `vector[T]` with length and bounded element function, then define `access`, `update`, and range equality `eql`. Define `sorted`, permutation `perm`, and `swap`; prove reusable lemmas `perm_len`, `perm_ref`, `perm_sym`, `perm_trs`, `swap_acc`, and `swap_perm`. Disable auto-rewriting of `perm` and `swap` so Yices treats them as uninterpreted functions and use the lemmas through an `endgame` strategy.

The authors report: “For a new domain we spend about half the time developing the background theories, while the other half is spent building and verifying the diagrams.” (Section 4.3, p. 35). Inference: Verus libraries should similarly expose abstract predicates and proven lemmas for arrays, permutations, and swaps, while avoiding expansion that overwhelms Z3. Verus proof functions replace PVS lemmas, but the discipline of proving abstraction lemmas once and reusing them transfers.

## technique 4: construct heapsort around explicit loop invariants

Specify `heapsort` with postcondition `sorted(a) ∧ perm(a,a0)`. Build two situations. `BUILD_HEAP` maintains `heap(a,k,len(a))` while decreasing `k`; initialize with `k := floor(len(a)/2)` and call `siftdown(k,len(a),a)`. `TEAR_HEAP` maintains `partitioned(a,k)`, `sorted(a,k)`, and `heap(a,0,k)` while decrementing `k`, swapping the root with position `k`, then calling `siftdown(0,k,a)`. Exit at `k≤1`.

For `siftdown(m,n,a)`, require `heap(a,m+1,n)`, preserve permutation and unchanged ranges, and establish `heap(a,m,n)`. Maintain an invariant that all heap elements except current `k` dominate their children and that `k`'s parent dominates the children after a swap. Select the larger child, swap, and move `k` downward; use `n-k` as variant.

Inference: Verus can express these predicates as `spec fn`s over sequences/maps and prove loop invariants with `invariant` clauses and decreasing variants, but the exact PVS dependent-array types and value-result parameters require Rust-specific encodings.

## technique 5: use failures to expose corner cases and strengthen invariants

The first `siftdown` diagram fails at `n = r(k)`: the left child is the last in-range element and the right child is outside, so no relation between `a[k]` and `a[l(k)]` is known. Strengthening the guard to `n < r(k)` proves consistency but fails liveness because `n=r(k)` is unhandled. Restore `n ≤ r(k)` and add a separate branch that swaps `k` and `l(k)` when `a[k] < a[l(k)]`; then all VCs and TCCs discharge automatically.

The paper says: “This bug is hard to spot, and is easily missed even with extensive testing.” (Section 6.3, p. 42). Inference: this is a direct lesson for VL: failed proof obligations can reveal missing safety cases that tests miss. Keep the failing obligation, identify the missing case, and repair the invariant/guard before adding assumptions.

A second failure occurs in `TEAR_HEAP`: automation cannot show `partitioned` is preserved through `siftdown`. Add assertions after decrement and swap: the root is maximal through `k`, and `partitioned` holds after the swap. Prove `heap_max` and `perm_partitioned` as background lemmas; endgame then discharges the transition.

## technique 6: choose between interactive proofs, assertions, and assumptions

When Yices cannot close a true condition, prove it interactively in PVS, isolate it with an `assert`, or add a helper lemma to the background theory and rerun endgame. An `assume` can force consistency but sacrifices liveness, so it is suitable only when full verification is not required. The paper's options are: “Prove the condition interactively in PVS”; “Add an assume statement to achieve consistency at the cost of liveness”; “Add an assert statement to isolate a specific difficult condition”; and “Add a helper lemma to the background theory.” (Section 7, p. 47).

Inference: Verus should prefer a proved lemma or explicit assertion over `assume`/`external_body`, because assumptions enlarge the trusted base. Assertions are useful cut points, but their contracts must themselves be proved. The authors warn that too many helper lemmas can make the SMT problem hit time or memory limits; separate verification by background theory when that occurs.

## evidence, trust, and product implications

The case study reports a PVS-checked proof of consistency, liveness, and termination for heapsort, with automatic discharge of the final application of background lemmas. It reports no benchmark denominator, elapsed times, or success percentage. The evidence is one algorithm and its proof obligations, including two discovered corner-case failures and their repairs. Trusted components include PVS's kernel and type-correctness proofs, Yices, the weakest-precondition translation, background lemmas, and user invariants/specifications.

Inference: agent-written verified Rust faces the same invariant-design bottleneck; automation can discharge routine arithmetic only after the right abstraction and invariant exist. The paper's strongest product lessons are proof-first control flow, reusable domain lemmas, incremental diagnostics, and preserving counterexamples as proof obligations. It does not show that Socos scales beyond this heapsort exercise.

## techniques for the catalog

- invariant-first construction — define situations, loop invariants, and termination measures before adding executable transitions
- weakest-precondition diagnostics — generate one checked lemma per transition and report failures incrementally
- background-theory abstraction — prove reusable array, permutation, and swap lemmas and feed them to SMT endgames
- corner-case proof repair — use failed obligations to add missing branches and strengthen invariants
- explicit proof escape hatches — choose interactive proofs, assertions, helper lemmas, or consciously trusted assumptions
Checked 2026-10-14 against the paper by a Codex agent: audit record back2012invariant; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
