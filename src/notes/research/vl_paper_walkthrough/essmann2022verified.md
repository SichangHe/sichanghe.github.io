# Verified Approximation Algorithms
(authored by agents unless marked 🧑)
Tag: `essmann2022verified`, [paper](https://doi.org/10.46298/lmcs-18(1:36)2022)

## scope and result

Essmann, Nipkow, Robillard, and Sulejmani formalize six approximation algorithms in Isabelle/HOL: vertex cover, independent set, load balancing, center selection, set cover, and bin packing. The abstract states: “We present the first formal verification of approximation algorithms for NP-complete optimization problems” (abstract, p. 1). Their method is uniform: “All proofs are uniformly invariant based.” (abstract, p. 1). They found missing invariant conjuncts in prior formal proofs and improved Wei's independent-set ratio from Δ+1 to Δ (introduction, §1, p. 1). The paper proves partial correctness of simple imperative WHILE programs, conditional on mathematical preconditions; it does not verify executable Rust or solver soundness.

## technique 1: Hoare programs with inductive loop invariants

Isabelle's Hoare layer expresses `{P} c {Q}` as partial correctness: if `c` terminates from a state satisfying `P`, its final state satisfies `Q` (Isabelle/HOL, §2, p. 2). A loop is verified by showing initialization establishes the invariant, each body step preserves it, and termination plus the invariant implies the postcondition. Their example is `m := 0; p := 0; WHILE m ≠ a INV {p = m*b} DO p := p+b; m := m+1 OD`, proved to end with `p = a*b` (section 2, p. 2).

How to use it: (1) state a mathematical locale containing finiteness and input assumptions; (2) write a terminating WHILE algorithm; (3) define a predicate containing functional facts and approximation bookkeeping; (4) prove initialization; (5) prove preservation as a lemma for arbitrary loop states; (6) prove the postcondition and ratio from the invariant at loop exit. Isabelle's verification-condition generator reduces the obligations to HOL formulas (section 2, p. 2).

Inference: In Verus, write executable Rust, a `requires` precondition, an `ensures` postcondition, and a loop `invariant` clause. Use `proof fn` lemmas for arithmetic and set facts; keep proof-only state in ghost variables or quantified invariant facts. Verus's `invariant` is syntax attached to a loop, not a callable function. This is an inference because the paper uses Isabelle rather than Verus.

## technique 2: strengthen invariants until preservation is true

The vertex-cover algorithm maintains a set `C` and uncovered edges `F`: choose an arbitrary edge, add its vertices to `C`, then remove every edge intersecting the chosen edge. The invariant includes `F ⊆ E`, `vc (E − F) C`, finiteness of `C`, and an existential matching witness `M` satisfying disjointness and `|C| ≤ k*|M|` (vertex cover, §3, pp. 2–3). The authors explicitly report: “Our invariant is stronger than the one in [BM03] which lacks F ⊆ E. Indeed, without this property, the claimed invariant is not invariant” (§3, p. 3).

Apply the pattern by testing every claimed conjunct against one loop iteration. If preservation fails, add the missing relation, prove initialization, then prove the strengthened preservation lemma. The matching witness connects program state to the lower bound on every optimal cover, yielding the `k` approximation postcondition. Inference: In Verus, represent finite sets with the project's verified set abstraction and put closure facts in `invariant`; use `ensures` to expose the final cover and ratio. Do not weaken the invariant merely to satisfy the solver: the paper's counterexample shows that an apparently plausible invariant can be false.

## technique 3: existential ghost bookkeeping

For Wei's independent-set algorithm, executable state is `S` (selected vertices) and `X` (removed vertices). The invariant existentially quantifies a set `P` partitioning `X`: each `p ∈ P` is a chosen vertex and its neighbors, `|P| = |S|`, and `P` is finite (independent set, §4, pp. 3–4). The paper says: “P, which is not needed for the execution of the algorithm, but is used for bookkeeping in the proof” (§4, p. 3). At each iteration, instantiate the successor witness with `P ∪ {neighbors x ∪ {x}}`; then any independent set contains at most Δ vertices from each `p`, proving `|S'| ≤ |S|*Δ` (§4, p. 4).

Inference: Verus can encode `P` as a ghost map/set in the loop invariant and existentially quantify it when a concrete ghost variable would burden executable code. A `proof fn` can construct the next witness and prove cardinality bounds; it is erased and must not be called for runtime behavior. The same paper also shows a simpler variant that records the largest block size `r`, with invariant `|X| ≤ |S|*r`; choose this when a global graph fact is not needed (§4, p. 4).

## technique 4: derive approximation ratios from lower bounds

For sorted load balancing, the program assigns each next job to the least-loaded machine. The invariant includes a valid partial assignment, a ratio bound against every partial solution, and special facts for `j ≤ m` (load balancing, §5, pp. 6–7). The proof builds lower bounds: average load, largest job, and, when `m < j` and jobs are sorted, `2*t(j) ≤ makespan` (lemmas 5.2–5.4, pp. 7–8). These inequalities combine with the invariant to establish the 3/2 ratio; the unsorted case gives 2 (section 5, pp. 6–9).

Inference: In Verus, state each lower bound as a separate lemma with `requires` matching the invariant and `ensures` for the inequality, then call those lemmas in the loop-preservation proof. This modularizes arithmetic and makes denominator/ordering assumptions explicit.

## evidence, trust, and limits

The verified artifacts cover six algorithms and their claimed ratios, but the paper gives no runtime benchmark denominator because the result is proof completion, not empirical performance. It relies on Isabelle/HOL's semantics, libraries, verification-condition generator, and underlying prover. Termination is part of partial-correctness reasoning only when separately established. The independent-set heuristic with ratio `(Δ+2)/3` is left beyond scope because it needs a much more detailed sequence invariant and graph case analysis (§4, p. 5).

Inference: The threat to agent-written verified Rust is high for proof completeness but low for direct implementation reuse: generated code can compile while a weak invariant fails to imply the desired approximation guarantee. VL should ask agents to state preconditions, loop invariants, witness relations, and final ratio lemmas explicitly, then reject proofs that only show functional output. What is already done here is a reusable invariant-first recipe for approximation algorithms; VL should not redo an informal-only proof without checking preservation and lower-bound obligations.

## techniques for the catalog

- invariant-based Hoare verification — express imperative algorithms with preconditions, postconditions, and loop invariants, then discharge initialization, preservation, and exit obligations
- invariant strengthening — add missing state relations such as `F ⊆ E` when a claimed invariant is not preserved
- existential ghost witnesses — quantify proof-only partitions or matchings to connect executable state to approximation bounds
- lower-bound decomposition — prove average, maximum-item, and structural lower bounds separately before deriving the approximation ratio
- verus translation (inference) — map contracts and ghost invariants to Verus `requires`, `ensures`, loop `invariant`, and erased `proof fn` lemmas

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
