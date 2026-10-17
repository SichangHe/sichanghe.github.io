# An encoding of array verification problems into array-free Horn clauses
(authored by agents unless marked 🧑)
Tag: `monniaux2015encoding`, [paper](http://arxiv.org/abs/1509.09092v1)

## purpose and result

Monniaux and Gonnord replace array-bearing verification problems with scalar nonlinear Horn clauses. The abstract states: “we generate an abstraction as a scalar problem and feed it to a preexisting solver, with tunable precision.” (Abstract, p. 1.) The abstraction is an over-approximation: a satisfying Horn solution gives inductive invariants for the original array program (Theorem 6, p. 10), but an abstract counterexample means, in the authors' words, “either our abstraction is too coarse, either the desired safety property is wrong because there exists a concrete counterexample.” (Section 6, p. 22.) The paper demonstrates array fill (1D, even/odd, 2D matrix), a map indexed by rationals, reversal, minimum finding in a slice, selection sort sortedness, and selection sort permutation (Examples 2 to 10, pp. 5 to 22).

The important distinction from a flat control-flow encoding is that the read rule (rule 16, p. 7) has two premises on the same predicate, one for the observed cell `(k,a_k)` and one for the read cell `(i,a_i)`, so the system is nonlinear. The authors write: “our encoding cannot be expressed by an encoding into another control-flow graph problem, and truly leverages the capacity of the Horn clause format.” (Abstract, p. 1.) They contrast this with earlier work: “on contrast, our abstract semantics uses non-linear Horn rules, which leads to higher precision (Sec. 7.2).” (Section 1, p. 2.) Section 7.2 (p. 26) states that with the weaker, linear read rule (Definition 19) “the correctness of Ex. 4 cannot be proved”. A scalar solver such as Spacer can then infer formulas that quantify over arbitrary indices without directly supporting arrays.

## technique 1: one distinguished cell per array state

Use this for pointwise properties such as initialization, reversal, bounds, or a relation between an output cell and a saved input cell. At every control point replace a concrete predicate over `(x, array)` with an abstract predicate over scalar variables `(x, k, a_k)`, meaning that index `k` currently stores value `a_k`.

Steps from Section 3 and Algorithm 1 (pp. 7–10):

1. Build the program control-flow graph and a predicate for every control point.
2. Add an index `k` and value `a_k` to every predicate. The concretization is universal: a concrete array state is represented only if the predicate holds for every index and its array value. This is the Galois connection in Definitions 6 and Theorem 1.
3. Encode an array read `v := a[i]` with two Horn rules (Definition 1, rules 16–17, pp. 7–8). For `k ≠ i`, require abstract facts for both `(k,a_k)` and `(i,a_i)` at the pre-state and produce `(k,a_k)` at the post-state, with `v` set to `a_i`; for the case `k=i`, produce `(i,a_i)` with `v = a_i`. Rule 16 is nonlinear because two premises describe the same pre-state; the paper's intuition is that “both ai = a[i] and ak = a[k] had to be reachable with the same valuation.” (p. 8).
4. Encode a write `a[i] := v` with one rule preserving every non-written cell and one rule changing the distinguished cell to `v` (Definition 2, rules 18–19, p. 8).
5. Encode initialization with all possible `(k,a_k)` pairs (Definition 3, rules 20–21; for an array indexed `0..n-1`, restricted to `0 ≤ k < n`), scalar statements by carrying `(k,a_k)` across (Definition 4), and the desired universal postcondition `∀x ∀k φ(x,k,a_k)` as a Horn query at the relevant control point (Definition 7). Dead-variable removal (`kill`, Definition 5) can lose precision: “removing some variables may cause irrecoverable loss of precision on other variables” (Remark 3, p. 10).
6. Give the resulting system to a Horn solver. A solution's concretization is an inductive invariant by Theorem 6 (p. 10).

For the fill loop (Example 2, Program 2), the required invariant is `0 ≤ i ≤ n ∧ (∀k 0 ≤ k < i ⇒ a[k] = 42)` (formula 15, p. 6); the paper reports that none of Z3/PDR, Spacer or Eldarica could solve the original array system (formulas 11–14). The paper records the result for the abstracted system: “Z3/PDR, Spacer and Eldarica (-splitClauses), all unable to deal with the original array problem (Formulas 11–14) solve this problem quickly.” (Example 2 continued, p. 11.) Here “quickly” has no time in the paper, so it is not a quantitative benchmark. Other one-cell results: reversal keeps a copy `b` of the input and abstracts both arrays with one cell each, `(k,a_k,l,b_l)` (Example 4, formulas 33–47, pp. 11–12); minimum of a slice is solved by Z3/PDR and Spacer “but not Eldarica” (Example 5, p. 13); even/odd fill (Example 6) and a rational-indexed map (Example 7) show that the index type need only be supported by the solver (pp. 13–14).

Inference: In Verus, represent the distinguished cell as a quantified `forall` fact over a `Seq` or map model of the vector, and prove each Rust indexing update with `requires` bounds, `ensures`, `assert`, and proof lemmas. The paper's two-premise read rule corresponds to keeping facts for both the read index and an arbitrary observation index. Verus code still uses executable `Vec` operations; the Horn predicates and nonlinear rules become ghost lemmas and loop invariants. This is an inference because the paper targets Horn solvers, not Verus.

## technique 2: two cells and nonlinear Horn rules for relational array properties

Use two distinguished indices `(k1,a_k1)` and `(k2,a_k2)` for sortedness and other properties linking two array elements: the paper says one cell “cannot express properties such as sortedness, which link two array elements” (Section 4, p. 16). The selection-sort postcondition is `∀l0 ≤ k1 < k2 < h: a[k1] ≤ a[k2]` (formula 87); the abstract query tracks two arbitrary cells through all reads and writes.

Steps (Section 4, pp. 16–19):

1. Extend every predicate with two index/value pairs (Definition 8, with an optional ordered variant `k1 ≤ k2`, Definition 9; Theorems 7–8 give the Galois connections). One-cell and two-cell abstractions can be mixed (Definition 12, p. 17).
2. For a read, use four rules (Definition 10, rules 75–78, p. 16) for the cases where `k1` or `k2` differs from or equals the read index `i`, under the ordering `k1 ≤ k2`. Inference: the two-premise rules make each abstract transition depend on facts that coexist in the pre-state, which is what the soundness argument needs.
3. For a write, use four rules (Definition 11, rules 79–82, p. 17): preserve both cells if the write index differs from both, update `k1` or `k2` when it equals the write index, and update both when `i = k1 = k2`.
4. Translate the universally quantified sortedness postcondition to a scalar Horn query over `k1`, `k2`, `a_k1`, and `a_k2`.
5. Solve with Spacer; optionally add a partial loop invariant as an additional query (formula 90). For selection sort the paper says “Spacer solves the resulting system of Horn clauses in 8 min.” and later calls it “an analysis time of 6 minutes for a 17-line program”; the two figures are inconsistent in the paper. With the outer-loop invariant added as a query, “Spacer solves the problem in 1 second!” (Example 9, pp. 18–19). The denominator is one selection-sort program with stock solvers (Section 8, p. 28); the paper does not give the machine or solver version.

On solver dependence the paper says the relationships that can be inferred between loop indices, array indices and array contents are “limited only by the capabilities of the Horn solver” (before Example 6, p. 13); for even/odd fill it reports that Z3/PDR fails and guesses, “We suppose this is because Z3/PDR cannot infer interpolants depending on divisibility predicates.” (p. 14).

Inference: A Verus proof can use a quantified sortedness invariant such as `forall|i,j| l <= i < j < h ==> a[i] <= a[j]`, with `requires`/`ensures` and a lemma that relates `Seq` updates to unchanged indices. Verus's `forall` proof syntax and triggers will need explicit lemmas; the paper's automatic solver inference does not carry over unchanged.

## technique 3: multiset tracking for permutation correctness

Sortedness alone does not prove a sorting implementation is a permutation. The paper models an auxiliary map `#a(z)` counting occurrences of each value. Every array write is replaced by decrementing the count of the overwritten value, performing the write, then incrementing the new value. The paper gives the exact transformation: “#a(a[i]) := #a(a[i]) − 1; a[i] := v; #a(v) := #a(v) + 1” (Section 5.2, formula 93, p. 20).

Steps (Section 5.2, pp. 20–22; the Galois connection is Definition 15 and Theorem 11):

1. Add a value variable `z` and a count `a#z` to each abstract state, alongside the distinguished array cell.
2. On reads and scalar operations, carry the count unchanged (Definition 16, rules 96–97, p. 21).
3. For a write, use two intermediate control points with predicates `I_a` and `I_b` (Definition 17, pp. 21–22): the first four rules of Definition 17 pass the count through unless the value equals the overwritten value (decrement by one at `I_a`) or the written value (increment by one at `I_b`); the last two rules are the cell-preserving and cell-updating rules of the write as in Definition 2.
4. Keep a second count `a0#z` for the input array and propagate it unchanged (p. 22).
5. Query `a#z = a0#z` at exit for every `z` (formula 98). Example 10 applies this to selection sort; the paper gives no solve time for it, and the conclusion claims “fully automatically and within minutes” for both sortedness and permutation (Section 8, p. 28). Section 5.1 (pp. 19–20) also sketches rules for set and multiset union and intersection.

Inference: In Verus, model counts with a mathematical map or finite-support sequence and prove a write-preservation lemma that removes one old value and adds one new value. A Rust implementation may use `HashMap` counts, but the proof should specify the mathematical multiset; map-library behavior is an additional trusted contract.

## technique 4: counterexample reconstruction and optional refinement

When a Horn solver returns an abstract counterexample, reconstruct a concrete trace before calling it a program bug. Algorithm 2 (p. 24) says to build the Horn system with Algorithm 1; run the solver and report “proved” if it returns satisfiable; otherwise select a branch of the counterexample unfolding (the paper proposes the leftmost one), collect the concrete transition relations into a trace problem in arithmetic plus arrays, and run an SMT solver; if it returns satisfiable, report “violated”. The optional step 5 examines the array axioms used in the SMT unsatisfiability proof and increases precision by adding indices, for example from one index `k` to two indices `k1 ≤ k2`, then restarts at step 1 (Section 6, pp. 22–24; Example 11 and Figure 7, pp. 22–23). I found no report in the paper of an implementation or evaluation of Algorithm 2.

Inference: The Verus analogue is to turn a failed proof obligation into a concrete lemma goal over the executable sequence and use a ghost witness for the index/value path. This is a debugging workflow, not a replacement for proving the final contract.

## proved, measured, and trusted

The paper states soundness of each abstract transformer (Lemmas 2–5, 9–10, 12–13, 14); only Lemmas 2 and 3 have short proofs, Lemmas 9 and 10 have case-analysis sketches, and Lemmas 4, 5, 12 and 13 are stated without proof (“easily proved” for 4 and 5). It states the Galois connections (Theorems 1, 7, 8, 11) and that any Horn solution yields concrete inductive invariants (Theorem 6, whose proof is one sentence citing general fixed-point properties). It reports solver outcomes for examples: reversal takes 4 s with Z3/PDR and 5 min with Spacer (Example 4, p. 12); fill-even/odd is solved instantaneously by Spacer while Z3/PDR cannot solve it (Example 6, pp. 13–14); selection sort takes 8 min with Spacer (6 minutes in the paper's later text) and 1 s with its supplied invariant (Example 9, pp. 18–19). Each denominator is one example program and one solver configuration. The model uses mathematical integers and treats out-of-range reads as immediate termination; machine-integer overflow and concrete library semantics are outside that model (Section 2, p. 4). Existential properties are also out of scope: “Our approach can be used, a fortiori, to prove or infer quantifier-free properties, but not existentials.” (Section 8, p. 28.)

Inference: VL should not redo the scalar abstraction's soundness theorems. The gap worth engineering is a Verus library for quantified sequence updates, multiset lemmas, and solver-guidance invariants. Threat to agent-written verified Rust is medium: the method can expose missing array invariants, but the proof remains conditional on the sequence model, bounds, arithmetic domain, and any external collection contracts.

## techniques for the catalog

- distinguished-cell Horn abstraction: replace each array state by scalar facts for an arbitrary index and value, with nonlinear read rules
- two-cell relational abstraction: track two arbitrary cells to prove sortedness, reversal, and pairwise array properties
- multiset-count instrumentation: maintain a value-count map through writes to prove permutation preservation
- counterexample reconstruction: turn an abstract Horn unfolding into an arithmetic-plus-array SMT check and refine when it is spurious
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Using this weakened semantics to abstract arrays a and b by quadruplets (x, a[x], y, b[y]), the correctness of Ex. 4 cannot be proved."): I read the whole text (pp. 1-48 including the appendix listings) and checked every quotation, solver outcome, time, example, definition, formula and page reference against it. I changed: the page ranges for Sections 3, 4 and 6; the label of the fill-loop quotation (it follows Example 2, not Example 3); reversal (it is one cell per array a and b, not the two-cell abstraction of Section 4); the Definition 17 write-rule description (six rules, not four); Algorithm 2 step 5 (refinement adds indices, guided by array axioms in the SMT proof); the soundness claim (most lemmas are stated without full proofs); the selection-sort time (the paper says both 8 min and 6 minutes); the loose quotation of the solver-dependence sentence; and I added the paper's Section 6 and Section 7.2 statements, the Example 5 Eldarica failure, and the existentials limit. I did not check the appendix Horn listings (pp. 32-48) clause by clause against the formulas, did not run any solver, and did not check the references or related-work claims about other tools.
