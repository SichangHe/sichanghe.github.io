# Disjunctive Interpolants for Horn-Clause Verification (Extended Technical Report)
(authored by agents unless marked 🧑)
Tag: `rummer2013disjunctive`, [paper](http://arxiv.org/abs/1301.4973v1)

The paper studies interpolation as a solver for Horn-clause verification. Its input is a set of first-order constraints and uninterpreted relation symbols; an error clause has `false` in its head. A relation assignment is a constraint formula for each relation. The paper distinguishes semantic solvability (some set-theoretic relations make every clause true) from syntactic solvability (constraint formulas do so). “Craig interpolation is the main technique used to construct and refine abstractions in software model checking.” (Section 3, p. 5). The underlying constraint language must have the interpolation property for the completeness results below.

## technique 1: counterexample-driven predicate abstraction for recursive Horn clauses

What it is. Start with a deliberately weak predicate abstraction, build an abstract reachability graph (ARG), and refine it when a candidate error trace is spurious. The paper's merge example abstracts list lengths with clauses such as `merge(X,Y,Z)` and `false ← merge(X,Y,Z) ∧ Z > X + Y`; the intended invariant is `X + Y − Z ≥ 0` (Section 2, pp. 3–4). “Our approach uses counterexample-driven refinement to perform verification.” (Section 2, p. 3)

When to use it. Use this for recursive procedures, loops, or concurrency represented as recursive Horn clauses when a theorem prover can decide the background constraints. The recursive problem itself may be undecidable, so each finite, recursion-free counterexample is the decidable refinement unit.

How to do it.

1. Encode safety as a Horn clause whose head is `false`, and encode procedure summaries as relation symbols (Section 2, p. 3). In the merge example, use the five clauses in Figure 1.
2. Initialize each relation's predicate set with only `false`; this is the paper's initial abstraction (Section 2, p. 3).
3. For every satisfiable concrete clause body, reject `false` as that relation's approximation and use the empty conjunction, `true`, until a useful predicate is learned (Section 2, p. 3).
4. Chain the clauses selected by the current abstraction into a recursion-free subset and ask whether it has a solution (Section 2, pp. 3–4).
5. If the theorem prover finds an interpolant, add it to the relation's predicate set and rebuild the abstraction. In the example, `Z ≤ X + Y` closes the proof; another possible interpolant is `Z = Y ∧ X ≥ 0` (Section 2, p. 4).
6. Repeat until the ARG is closed (safe) or an unsatisfiable refinement problem cannot be produced because the trace is genuine (unsafe). The paper states: “Solutions for Horn clauses are constructed in disjunctive normal form by building an abstract reachability graph over a set of given predicates.” (Section 6.1, p. 13)

Verus form. Inference: a Rust/Verus implementation can keep the executable algorithm in `fn` and state a relation's learned invariant as a `spec fn` over the summary arguments. Each transition proof can be a `proof fn` with `requires` describing a Horn body and `ensures` giving the learned predicate. A loop that performs refinement can use a normal Rust `while` with an `invariant` describing soundness of the current ARG; the SMT interpolation engine is outside the Verus proof and therefore remains trusted. Verus does not automatically synthesize the interpolant, so the learned formula must be supplied as a lemma or specification.

Evidence. The implementation is in Eldarica and uses Princess for interpolation (Section 6.1, p. 13). The benchmark suite is NTS integer-linear-arithmetic models, including recursive, list, VHDL, array, NECLA, and asynchronous-call examples (Section 6.2, p. 15). Runs were on an Intel Core i5 two-core 3.2 GHz machine with 8 GB and a 500-second timeout (Figure 4 caption, p. 16). For the `merge` benchmark, TI took 0.76 seconds and DI 1.50 seconds; HSF took 0.16 seconds (Figure 4, p. 15). The paper reports that DI used fewer refinement steps, but interpolation consumed 42% of verification time on average versus 31% for TI (Section 6.2, p. 15). These percentages have the denominator “verification” time, not the number of benchmarks.

Failure and assumptions. The method assumes a sound theorem prover and an interpolation-capable constraint theory. A genuine counterexample is reported rather than repaired. Shared relation symbols can cause exponential expansion; the paper proves recursion-free Horn solvability is co-NEXPTIME-complete over quantifier-free Presburger arithmetic (Theorem 4, p. 11). Inference: agent-written Verus code is threatened when the abstraction omits a relation predicate or when the external interpolator is trusted without replaying its result as Verus lemmas.

## technique 2: disjunctive interpolation

What it is. A disjunctive interpolant assigns a constraint to marked subformula positions under conjunction and disjunction. Each child abstraction entails the parent abstraction, the top-level abstraction makes the whole formula false, and each interpolant uses only variables shared across the position boundary (Definition 2, Section 4, pp. 7–8). This strictly generalizes binary, sequence, and tree interpolation and can analyze several paths simultaneously. “Disjunctive interpolation problems can specify both conjunctive and disjunctive relationships between interpolants, and are thus applicable for simultaneous analysis of multiple paths in a program, but also tailored to inter-procedural analysis or verification of concurrent programs.” (Section 4, p. 7)

How to do it.

1. Select positions occurring only below `∧` and `∨` in an unsatisfiable constraint (Definition 2, p. 7).
2. For each marked position, compute a formula using only variables in both the subformula and its context; require each parent entailment and require the topmost replacements to entail `false` (Definition 2, p. 7).
3. For Horn clauses, first inline the finite recursion-free definitions. The paper's merge expansion marks the `merge1` and two `merge` occurrences and obtains `X + Y ≥ Z`, `X + Y1 ≥ Z1`, and `X1 + Y ≥ Z1` (Example 4, pp. 8–9).
4. Conjoin the formulas produced for repeated relation occurrences to obtain a Horn solution (Example 4, p. 9).

Verus form. Inference: each interpolant can become a `spec fn` predicate over the variables visible at that program boundary. A `proof fn` can establish that a child predicate implies its parent with `ensures`; callers combine branch lemmas with `assert` and `if` reasoning. The variable-sharing condition corresponds to keeping a lemma's quantified parameters limited to the state fields present on both sides. There is no Verus construct that computes disjunctive interpolants, so generation remains an external preprocessing step.

Evidence and limits. Theorem 1 states existence exactly when the marked formula is unsatisfiable, assuming interpolation (Section 4, p. 9). Body-disjoint recursion-free Horn clauses translate to this problem in polynomial size (Section 4.1, pp. 9–10). General recursion-free Horn clauses require exhaustive expansion, which can be exponentially larger; the paper explicitly says the expansion “might therefore require exponential time” (Section 5.1, p. 11). Inference: this technique is strongest when many related counterexamples share a finite tree-shaped structure; it is less attractive when sharing creates a large expansion.

## technique 3: lazy and/or-dag handling

What it is. Counterexamples are represented as `And` and `Or` trees (or dags), then renamed into body-disjoint recursion-free clauses (Section 6, pp. 12–13). The paper gives two practical reductions: “counterexample-guided expansion expands and/or-dags lazily, until an unsatisfiable fragment of the fully expanded tree has been found” and “and/or dag restructuring factors out common sub-dags underneath an Or-node, making the and/or-dag more tree-like.” (Section 6, p. 12)

How to do it.

1. Build `And(h, children)` for all body literals of clause `h`; use `Or(children)` for alternative hyperedges (Section 6, p. 12).
2. Rename shared relation occurrences so the extracted tree is body-disjoint (Section 6, p. 12).
3. Expand only until an unsatisfiable fragment is found; use that fragment to compute an interpolant (Section 6, p. 12).
4. Factor common sub-dags beneath an `Or` node before further expansion (Section 6, p. 12).

Verus form. Inference: a driver can store the dag as ordinary Rust enums and prove each generated branch summary with `proof fn`; a final `ensures` lemma can combine branch summaries. The dag transformation itself is executable and should be separately tested; Verus proves only the resulting summaries.

Evidence. The paper's ARG algorithm initializes `S := ∅, E := ∅`, adds an edge for a non-error clause, and on an error head extracts a counterexample tree; an unsatisfiable tree yields a disjunctive interpolant and predicate refinement, while a satisfiable tree returns an unsolvable Horn set with a trace (Figure 3, p. 14). The evaluation compares tree interpolation (TI), one minimal-depth counterexample, with disjunctive interpolation (DI), all minimal-depth counterexamples (Section 6.1, p. 14). Inference: the algorithm can reduce proof iterations at the cost of more expensive predicate generation.

## what is proved, measured, and trusted

Theorems prove equivalence between solvability and unsatisfiability of finite recursion-free expansions under interpolation, and give PSPACE/co-NEXPTIME complexity bounds (Sections 4–5). Experiments measure wall-clock times, refinement steps, and interpolation-time shares on NTS models; they do not prove correctness of arbitrary recursive programs without the stated theory and solver assumptions. The trusted base includes the background arithmetic solver, interpolation implementation, Horn encoding, and the ARG implementation. Inference: Verus can shrink this base by replaying each generated predicate implication, but cannot by itself validate that the external search found all relevant predicates.

The paper's contribution is already a complete pattern for Horn abstraction, interpolation, and lazy counterexample expansion. Inference: VL should reuse these ideas rather than redesign another generic CEGAR loop; its new work is a sound bridge from generated summaries to Verus proof lemmas and executable Rust state.

Inference: a product that lets agents write verified Rust is moderately threatened. The techniques can automate invariant discovery for arithmetic summaries, but they do not remove the need to choose an abstraction, encode heap or ownership state, or trust the translation into Verus. The paper's own DI/TI timing trade-off also warns that fewer iterations can still increase total proof time.

## techniques for the catalog

- counterexample-driven Horn predicate abstraction: initialize a weak ARG, extract a recursion-free counterexample, interpolate it, and repeat until closed or genuine
- disjunctive interpolation: assign shared-variable formulas to conjunctive/disjunctive subformulas so multiple paths refine together
- body-disjoint Horn reduction: normalize relation arguments and inline recursion-free clauses into an interpolation problem
- lazy and/or-dag expansion: expand only enough of shared counterexample structure to expose an unsatisfiable fragment
- and/or restructuring: factor common sub-dags below disjunctions before interpolation
- ARG-based recursive verification: maintain hyperedges over predicate sets and refine error edges with interpolant-generated predicates
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
