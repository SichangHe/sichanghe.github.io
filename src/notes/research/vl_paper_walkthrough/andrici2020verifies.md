# Who Verifies the Verifiers? A Computer-Checked Implementation of the DPLL Algorithm in Dafny
(authored by agents unless marked 🧑)
Tag: `andrici2020verifies`, [paper](http://arxiv.org/abs/2007.10842v1)

## scope and result

Andrici and Ciobâcă implement the DPLL SAT algorithm directly in Dafny, with machine-checked soundness, completeness, and termination. The abstract claims, “The resulting solver is fully verified (soundness, completeness and termination are computer checked).” (Abstract, p. 1) The implementation covers the first three items of the paper's list of solver techniques (unit propagation, fast data structures, variable-ordering heuristics), with the MOMS heuristic for variable ordering; it leaves the remaining items (back-jumping, conflict analysis, clause learning, restart strategy) for future work (§1, p. 2). The paper claims, “We present the first (to our knowledge) assertional proof of the DPLL algorithm.” (§1, p. 2)

The input is assumed to be CNF. The DIMACS parser is written in Dafny and verified against “e.g., out of bounds errors” (§1, p. 2), but the paper says, “However, there is no specification for the parser.” (§1, p. 2) Inference: the central semantic guarantee therefore concerns the solver given a valid CNF representation, not the full text-to-formula pipeline.

## technique 1: maintain executable data structures plus ghost abstractions

The formula stores immutable clause sequences. Machine integers represent variables and literals. Runtime arrays hold the assignment trace, decision-layer boundaries, current truth assignment, true/false literal counts, and reverse indexes from each variable/sign to clauses (§3.1, pp. 4–6). A ghost set `assignmentsTrace` mirrors the runtime trace and is erased before execution. The paper says, “The ghost construct assignmentsTrace recalls the same information as a set of (variable, value) pairs. This set is used for the convenience of specifying some of the methods and it only lives at verification time; it is erased before running time and therefore it entails no performance penalty.” (§3.1.2, p. 5)

How to apply it.

1. Choose a fast mutable representation for runtime and a simple mathematical representation for specifications (§3.1.2, p. 5).
2. State a class predicate `valid` conjoining representation invariants (§3.1.3, pp. 6–7).
3. Use `valid` as precondition and postcondition for the class methods; the paper says it “plays the role of a class invariant” (§3.1.3, p. 7). Some listed contracts use only a conjunct of `valid`, e.g. `increaseDecisionLevel` requires `validVariablesCount()` and `validAssignmentTrace()` (§3.2.1, p. 7).
4. Prove correspondence between arrays and ghost sets, and between cached counts/indexes and a specification function that recomputes them (§3.1.2–3.1.3, pp. 5–6).

Verus form. Inference: use executable `Vec`/array fields plus ghost `Seq`, `Set`, or maps, and define a validity predicate as a `spec fn`. Put `requires valid()` and `ensures valid()` on methods, and prove correspondence lemmas after each update. Verus ghost fields and proof code are erased analogously, but Dafny's `class` predicates and `old`/slice syntax require Rust-specific contracts.

Evidence. The authors state that lookups and updates in the trace arrays take constant time, and that the link between the ghost set and the arrays “is computer checked as the following class invariant” (§3.1.2, pp. 5–6). Inference: this is a design argument; the paper reports no isolated benchmark of the ghost-state overhead, and it claims none because ghost state is erased.

## technique 2: verify incremental clause indexes and counters

`trueLiteralsCount` and `falseLiteralsCount` cache how many literals in each clause currently have each truth value. Positive and negative variable-to-clause arrays (`positiveLiteralsToClauses`, `negativeLiteralsToClauses`) are used to update the counters efficiently when a literal is set or unset (§3.1.3, p. 6). Invariants state that array lengths match formula dimensions, counts equal a specification `countTrueLiterals`, and every reverse-index entry is both sound and complete (§3.1.3, p. 6).

The paper uses the counters to identify satisfied, unit, and false clauses; for example, clause `i` is satisfied when `trueLiteralsCount[i] > 0` (§3.1.3, p. 6). For `setVariable`, the authors “prove that the clauses that are not mentioned in these arrays are not impacted” (§3.2.2, p. 7). `countTrueLiterals` is “a function (not a method, hence it is used for specification only)” (§3.1.3, p. 6).

Inference: apply it by defining the pure counting function, initializing all caches, and proving each update changes only clauses listed in the appropriate reverse index, so the runtime can use counters rather than scanning every clause while the verifier checks equivalence to the simple specification.

Verus form. Inference: use ghost sequences/functions to define counts and executable arrays for caches. For each assignment update, prove a frame-style lemma that all unrelated clauses are unchanged and the affected counts change by one. Use `assert` and quantifier-friendly helper predicates; avoid relying on unproved aliasing facts about mutable vectors.

## technique 3: verify decision-level operations with local contracts

The implementation exposes four operations that preserve `valid`: increase the decision level, set a variable, set a literal with unit propagation, and revert the last decision layer (§3.2, p. 7). `increaseDecisionLevel` creates an empty layer and preserves older layers. `setVariable` requires an unset variable, updates trace, assignment, and counters, and proves the old layers remain unchanged (§3.2.1–3.2.2, pp. 7–8). `revertLastDecisionLevel` removes assignments in the top layer and restores counters (§3.2.4, p. 9).

The `setLiteral` method recursively performs unit propagation. Its variant is the number of unset variables, which the paper says “provably decreases at every recursive step” (§3.2.3, p. 8). Its postcondition preserves satisfiability extension: assigning the requested literal leaves the existence of a satisfying completion equivalent to the previous state (§3.2.3, pp. 8–9).

Verus form. Inference: write separate Rust methods with minimal `requires`, `ensures`, and `modifies`-equivalent framing through mutable borrows. Use `decreases` on recursive propagation and prove a ghost satisfiability predicate is preserved. Inference: the paper's method-level decomposition is directly useful for Verus proof search because each small contract limits the solver context.

## technique 4: prove DPLL functional correctness with recursive state restoration

`solve` checks for an empty clause (UNSAT), checks for no remaining clauses (SAT), chooses a literal with `chooseLiteral()`, calls `step(l, true)`, and calls `step(l, false)` only if the first result is not SAT (Figure 3, p. 11; Algorithm 2.2, p. 3). The `step` method calls `setLiteral` (which does unit propagation) and then calls `solve` recursively; it was split out to remove duplication and “makes the verification take less time” (§3.3, p. 10). The postconditions of `solve` state: a SAT result means the current `truthAssignment` can be extended to satisfy the formula; UNSAT means no extension satisfies it; and `solve` ends in the same state where it starts (§3.3, pp. 9–10). The variant is the pair (number of unset variables, constant): `solve` uses 1, `step` and `setLiteral` use 0 (§3.2.3, p. 9; §3.3, pp. 10, 12).

How to apply it.

1. Define `isSatisfiableExtend` mathematically over a partial assignment and clauses (§3.3, p. 10).
2. Prove the empty-clause branch makes the predicate false, and that the empty-formula branch yields SAT (Figure 3, p. 11).
3. Prove unit propagation preserves satisfiability extension (§3.2.3, p. 9).
4. Prove that if the true branch is satisfiable the whole formula is (`isSatisfiableExtend(tau[l := true]) ⟹ isSatisfiableExtend(tau)`), and carry `¬isSatisfiableExtend(tau[l := true])` into the false branch (Figure 3, p. 11).
5. Undo the changes before returning, even on SAT: “we chose to undo the changes even if we find a solution” (§3.3, p. 10). The authors say this keeps the contracts of `solve` and `step` shorter.

The flowchart records the facts that hold after each line: no clause has all literals false; if some clause is not yet true then an unset literal exists; the chosen literal is unset; the state after `step` equals the old state; and the true-branch implication above (Figure 3, p. 11).

Verus form. Inference: encode `is_satisfiable_extend` as a specification predicate and use recursive proof lemmas for branch completeness. Use a ghost snapshot or explicit restoration lemma for mutable state. Verus can express the variant with `decreases`. Inference: the search may still be exponential, so termination does not imply practical runtime.

## technique 5: use machine integers only after proving bounds

The revised solver replaces unbounded integers with an `Int32.t` model extracted to machine `int`. The authors report that machine integers improve performance “approximately 10 times in our tests” over the workshop version, and that “Going to machine integers from unbounded integers requires proving upper bounds on indices throughout the code.” (§1, p. 2). `Int32.t` “we define to model machine integers and which is extracted to int” (§3.1.1, p. 4). Examples of bounds in contracts: `requires decisionLevel < variablesCount - 1` (§3.2.1, p. 7) and `requires validLiteral(literal)` (§3.2.3, p. 8). The "10 times" figure compares the two paper versions, which also differ in other ways, so it is not an isolated measure of machine integers (§1, p. 2).

Verus form. Inference: use bounded integer types or explicit `requires 0 <= i < len` contracts, and prove no overflow in arithmetic before casts. A Rust `usize` index does not by itself prove a mathematical bound; retain a ghost integer model when SAT values are signed. Inference: this technique reduces runtime cost only after the verifier proves the machine arithmetic matches the specification domain.

## technique 6: engineer verification around solver scalability

The project contains 3,088 lines of Dafny, 600 lines of executable code, and 2,488 lines of specifications/proofs. It has 420 preconditions, 181 postconditions, 173 invariants, 44 variants, 42 lemmas, and 169 assertions. Whole-project verification takes approximately 13 minutes; `SATSolver.solve` is the most expensive method at approximately 175 seconds; 6 methods/lemmas take more than 60 s (Table 2, p. 15). In the workshop version one method (`setLiteral`) took about 10 minutes and the whole project about 2 hours (§1, p. 3). The first author wrote the code in “approximately one year and a half of part time work” and learned Dafny in that time (§6, p. 15). The authors state, “The ratio between lines of proof and lines of code is approximately 4/1.” (§6, p. 15)

Their practical rules are themselves reusable techniques (§6, pp. 15–16): avoid nested loops; factor nested quantifiers into named predicates; use very small methods; minimize modifies/reads clauses; verify only the current method during development; and and the Z3 axiom profiler “does not scale well to projects the size of our solver” (§6, p. 16). On `revertLastDecisionLevel`, the paper says inlining `removeLastVariable` “would lead to a significant increase in verification time” (§6, p. 16); this is stated as expectation, with no measurement given.

Verus form. Inference: split generated Rust into small proof-friendly methods, keep contracts narrow, factor quantified predicates, and run Verus on one target before the full crate. Use `assert`/lemmas to control solver context rather than broad global invariants. These are workflow recommendations inferred from the Dafny evidence, not claims made about Verus performance.

## techniques for the catalog

- ghost/runtime correspondence — pair optimized mutable arrays with erased ghost sets and prove a `valid` invariant
- cached-index verification — prove counters and reverse indexes equal simple specification functions
- contract-factored mutation — verify each state operation with narrow preconditions, postconditions, and frame facts
- DPLL branch proof — prove SAT/UNSAT semantics, recursive completeness, termination, and state restoration together
- bounded machine arithmetic — replace mathematical integers only after proving index and literal bounds
- solver-scalable proof engineering — use small methods, factored predicates, minimal frames, and focused verification runs
- benchmarked verified implementation — compare matched algorithms with explicit hardware, timeout, memory, and denominator data
