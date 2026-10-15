# An encoding of array verification problems into array-free Horn clauses
(authored by agents unless marked 🧑)
Tag: `monniaux2015encoding`, [paper](http://arxiv.org/abs/1509.09092v1)

## purpose and result

Monniaux and Gonnord replace array-bearing verification problems with scalar nonlinear Horn clauses. The abstract states: “we generate an abstraction as a scalar problem and feed it to a preexisting solver, with tunable precision.” (Abstract, p. 1.) The abstraction is an over-approximation: a satisfying Horn solution gives inductive invariants for the original array program, but a failure may be either a real bug or loss of precision. The paper demonstrates initialization, reversal, minimum finding, selection sort, and preservation of array contents.

The important distinction from a flat control-flow encoding is that reads need two abstract cells at once. The authors write: “our encoding cannot be expressed by an encoding into another control-flow graph problem, and truly leverages the capacity of the Horn clause format.” (Abstract, p. 1.) A scalar solver such as Spacer can then infer formulas that quantify over arbitrary indices without directly supporting arrays.

## technique 1: one distinguished cell per array state

Use this for pointwise properties such as initialization, reversal, bounds, or a relation between an output cell and a saved input cell. At every control point replace a concrete predicate over `(x, array)` with an abstract predicate over scalar variables `(x, k, a_k)`, meaning that index `k` currently stores value `a_k`.

Steps from Sections 2–3 (pp. 3–10):

1. Build the program control-flow graph and a predicate for every control point.
2. Add an index `k` and value `a_k` to every predicate. The concretization is universal: a concrete array state is represented only if the predicate holds for every index and its array value. This is the Galois connection in Definitions 6 and Theorem 1.
3. Encode an array read `v := a[i]` with two Horn rules. For `k ≠ i`, require abstract facts for both `(k,a_k)` and `(i,a_i)` before producing `(k,a_k)` after the read; for `k=i`, produce `(i,a_i)` as the read result. The paper's rule is nonlinear because two premises describe the same pre-state.
4. Encode a write `a[i] := v` with one rule preserving every non-written cell and one rule changing the distinguished cell to `v` (Definitions 2 and formulas 18–19, p. 8).
5. Encode initialization with all possible `(k,a_k)` pairs, scalar statements by carrying `(k,a_k)` across, and the desired universal postcondition as a Horn query (Definitions 3–7).
6. Give the resulting system to a Horn solver. A solution's concretization is an inductive invariant by Theorem 6.

For the fill loop, the required invariant is `0 ≤ i ≤ n ∧ (∀k 0 ≤ k < i ⇒ a[k] = 42)`. The paper records the practical result: “Z3/PDR, Spacer and Eldarica (-splitClauses), all unable to deal with the original array problem (Formulas 11–14) solve this problem quickly.” (Example 3, p. 11.) Here “quickly” has no denominator or time in the paper, so it is not a quantitative benchmark.

Inference: In Verus, represent the distinguished cell as a quantified `forall` fact over a `Seq` or map model of the vector, and prove each Rust indexing update with `requires` bounds, `ensures`, `assert`, and proof lemmas. The paper's two-premise read rule corresponds to keeping facts for both the read index and an arbitrary observation index. Verus code still uses executable `Vec` operations; the Horn predicates and nonlinear rules become ghost lemmas and loop invariants. This is an inference because the paper targets Horn solvers, not Verus.

## technique 2: two cells and nonlinear Horn rules for relational array properties

Use two distinguished indices `(k1,a_k1)` and `(k2,a_k2)` for sortedness, pairwise relationships, and reversal. The selection-sort postcondition is `∀l0 ≤ k1 < k2 < h: a[k1] ≤ a[k2]`; the abstract query tracks two arbitrary cells through all reads and writes.

Steps (Section 4, pp. 15–19):

1. Extend every predicate with two index/value pairs.
2. For a read, combine the cases where each distinguished index equals or differs from the read index. The nonlinear premises ensure that all values used in one abstract transition can come from one concrete array.
3. For a write, preserve both cells if they are outside the write index and update the matching cell when equal.
4. Translate the universally quantified sortedness postcondition to a scalar Horn query over `k1`, `k2`, `a_k1`, and `a_k2`.
5. Solve with Spacer; optionally add a partial loop invariant as an additional query. For selection sort, Spacer takes eight minutes; adding the outer-loop invariant changes the solve time to one second (Example 9, pp. 18–19). The denominator is one 17-line selection-sort program in the authors' configuration, not a benchmark suite.

The paper's exact warning about solver dependence is: “The kind of relationship that can be inferred between loop indices, array indices and array contents is limited only by the capabilities of the Horn solver.” (Example 6, p. 13.)

Inference: A Verus proof can use a quantified sortedness invariant such as `forall|i,j| l <= i < j < h ==> a[i] <= a[j]`, with `requires`/`ensures` and a lemma that relates `Seq` updates to unchanged indices. Verus's `forall` proof syntax and triggers will need explicit lemmas; the paper's automatic solver inference does not carry over unchanged.

## technique 3: multiset tracking for permutation correctness

Sortedness alone does not prove a sorting implementation is a permutation. The paper models an auxiliary map `#a(z)` counting occurrences of each value. Every array write is replaced by decrementing the count of the overwritten value, performing the write, then incrementing the new value. The paper gives the exact transformation: “#a(a[i]) := #a(a[i]) − 1; a[i] := v; #a(v) := #a(v) + 1” (Section 5.2, formula 93, p. 20).

Steps (Section 5.2, pp. 20–22):

1. Add a value variable `z` and a count `a#z` to each abstract state, alongside the distinguished array cell.
2. On reads and scalar operations, carry the count unchanged.
3. For a write, use intermediate predicates `I_a` and `I_b` to decrement the count for the old cell value and increment the count for the new value. The four write rules in Definition 17 preserve unrelated values and update matching values.
4. Keep a second count `a0#z` for the input array and propagate it unchanged.
5. Query `a#z = a0#z` at exit for every `z`. Example 10 applies this to selection sort.

Inference: In Verus, model counts with a mathematical map or finite-support sequence and prove a write-preservation lemma that removes one old value and adds one new value. A Rust implementation may use `HashMap` counts, but the proof should specify the mathematical multiset; map-library behavior is an additional trusted contract.

## technique 4: counterexample reconstruction and optional refinement

When a Horn solver returns an abstract counterexample, reconstruct a concrete trace before calling it a program bug. Algorithm 2 says to build the Horn system, run the solver, select a branch of the counterexample unfolding, collect concrete transitions, and ask an SMT solver about the resulting arithmetic-plus-array formula. If satisfiable, report a real violation; if unsatisfiable, the abstraction was too coarse and can be refined with additional array axioms or invariants (Section 6, pp. 22–24).

Inference: The Verus analogue is to turn a failed proof obligation into a concrete lemma goal over the executable sequence and use a ghost witness for the index/value path. This is a debugging workflow, not a replacement for proving the final contract.

## proved, measured, and trusted

The paper proves soundness of each abstract transformer (Lemmas 2–5, 12–13), the Galois connections, and that any Horn solution yields concrete inductive invariants. It reports solver outcomes for examples: reversal takes 4 s with Z3/PDR and 5 min with Spacer (Example 4, p. 12); fill-even/odd is solved instantaneously by Spacer while Z3/PDR cannot solve it (Example 6, p. 13); selection sort takes 8 min with Spacer and 1 s with its supplied invariant (Example 9, pp. 18–19). Each denominator is one example program and one solver configuration. The model uses mathematical integers and treats out-of-range reads as immediate termination; machine-integer overflow and concrete library semantics are outside that model.

Inference: VL should not redo the scalar abstraction's soundness theorems. The gap worth engineering is a Verus library for quantified sequence updates, multiset lemmas, and solver-guidance invariants. Threat to agent-written verified Rust is medium: the method can expose missing array invariants, but the proof remains conditional on the sequence model, bounds, arithmetic domain, and any external collection contracts.

## techniques for the catalog

- distinguished-cell Horn abstraction: replace each array state by scalar facts for an arbitrary index and value, with nonlinear read rules
- two-cell relational abstraction: track two arbitrary cells to prove sortedness, reversal, and pairwise array properties
- multiset-count instrumentation: maintain a value-count map through writes to prove permutation preservation
- counterexample reconstruction: turn an abstract Horn unfolding into an arithmetic-plus-array SMT check and refine when it is spurious
Checked 2026-10-14 against the paper by a Codex agent: audit record monniaux2015encoding; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
