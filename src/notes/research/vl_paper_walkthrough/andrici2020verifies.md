# Who Verifies the Verifiers? A Computer-Checked Implementation of the DPLL Algorithm in Dafny
(authored by agents unless marked 🧑)
Tag: `andrici2020verifies`, [paper](http://arxiv.org/abs/2007.10842v1)

## scope and result

Andrici and Ciobâcă implement the DPLL SAT algorithm directly in Dafny, with machine-checked soundness, completeness, and termination. The abstract claims, “The resulting solver is fully verified (soundness, completeness and termination are computer checked).” (Abstract, p. 1) The implementation includes unit propagation, efficient unit-clause indexing, backtracking, and the MOMS variable-ordering heuristic; it does not implement conflict analysis, clause learning, restarts, or other CDCL optimizations (§1, p. 2).

The input is assumed to be CNF. The DIMACS parser is written in Dafny and checked for memory safety, but the paper says, “However, there is no specification for the parser.” (§1, p. 2) Thus the central semantic guarantee concerns the solver given a valid CNF representation, not the full text-to-formula pipeline.

## technique 1: maintain executable data structures plus ghost abstractions

The formula stores immutable clause sequences. Machine integers represent variables and literals. Runtime arrays hold the assignment trace, decision-layer boundaries, current truth assignment, true/false literal counts, and reverse indexes from each variable/sign to clauses (§3.1, pp. 4–6). A ghost set `assignmentsTrace` mirrors the runtime trace and is erased before execution. The paper says, “The ghost construct assignmentsTrace recalls the same information as a set of (variable, value) pairs. This set is used for the convenience of specifying some of the methods and it only lives at verification time; it is erased before running time and therefore it entails no performance penalty.” (§3.1.2, p. 5)

How to apply it.

1. Choose a fast mutable representation for runtime and a simple mathematical representation for specifications (§3.1.2, p. 5).
2. State a class predicate `valid` conjoining representation invariants (§3.1.3, p. 6).
3. Use `valid` as precondition and postcondition for every mutating method (§3.1.3, p. 6).
4. Prove correspondence between arrays and ghost sets, and between cached counts/indexes and a specification function that recomputes them (§3.1.2–3.1.3, pp. 5–6).

Verus form. Inference: use executable `Vec`/array fields plus ghost `Seq`, `Set`, or maps, and define a validity predicate as a `spec fn`. Put `requires valid()` and `ensures valid()` on methods, and prove correspondence lemmas after each update. Verus ghost fields and proof code are erased analogously, but Dafny's `class` predicates and `old`/slice syntax require Rust-specific contracts.

Evidence. The authors report constant-time array lookups/updates and a full checked invariant linking the ghost set to the arrays (§3.1.2, p. 5). This is a design argument; no isolated benchmark measures the invariant overhead because ghost state is erased.

## technique 2: verify incremental clause indexes and counters

`trueLiteralsCount` and `falseLiteralsCount` cache how many literals in each clause currently have each truth value. Positive and negative variable-to-clause arrays identify exactly which clauses change when a literal is assigned or reverted (§3.1.3, pp. 6–7). Invariants state that array lengths match formula dimensions, counts equal a specification `countTrueLiterals`, and every reverse-index entry is both sound and complete (§3.1.3, p. 6).

Apply it by defining the pure counting function, initializing all caches, and proving each update changes only clauses listed in the appropriate reverse index. Then prove predicates for “satisfied,” “unit,” and “empty” clauses from the counters. The runtime algorithm can use counters rather than scanning every clause, while the verifier checks equivalence to the simple specification.

Verus form. Inference: use ghost sequences/functions to define counts and executable arrays for caches. For each assignment update, prove a frame-style lemma that all unrelated clauses are unchanged and the affected counts change by one. Use `assert` and quantifier-friendly helper predicates; avoid relying on unproved aliasing facts about mutable vectors.

## technique 3: verify decision-level operations with local contracts

The implementation exposes four operations that preserve `valid`: increase the decision level, set a variable, set a literal with unit propagation, and revert the last decision layer (§3.2, p. 7). `increaseDecisionLevel` creates an empty layer and preserves older layers. `setVariable` requires an unset variable, updates trace, assignment, and counters, and proves the old layers remain unchanged (§3.2.1–3.2.2, pp. 7–8). `revertLastDecisionLevel` removes assignments in the top layer and restores counters (§3.2.4, p. 9).

The `setLiteral` method recursively performs unit propagation. Its variant is the number of unset variables, which strictly decreases. Its postcondition preserves satisfiability extension: assigning the requested literal leaves the existence of a satisfying completion equivalent to the previous state (§3.2.3, pp. 8–9).

Verus form. Inference: write separate Rust methods with minimal `requires`, `ensures`, and `modifies`-equivalent framing through mutable borrows. Use `decreases` on recursive propagation and prove a ghost satisfiability predicate is preserved. Inference: the paper's method-level decomposition is directly useful for Verus proof search because each small contract limits the solver context.

## technique 4: prove DPLL functional correctness with recursive state restoration

`solve` checks for an empty clause (UNSAT), checks for no remaining clauses (SAT), chooses an unset literal, recursively explores the true branch, and explores false only after true returns UNSAT (Algorithm 2.2, pp. 3–4). The method's postconditions state: SAT returns a valid satisfying assignment extension; UNSAT means no satisfying extension exists; and the mutable solver state is restored to its entry state (§3.3, pp. 9–11). The recursive variant is the number of unset variables plus a tie-breaking constant (§3.3, p. 10).

How to apply it.

1. Define `isSatisfiableExtend` mathematically over a partial assignment and clauses (§3.3, p. 10).
2. Prove the empty-clause branch makes the predicate false and the empty-formula branch produces a valid assignment (§3.3, pp. 9–10).
3. Prove unit propagation preserves satisfiability extension (§3.2.3, p. 9).
4. Prove the true recursive branch's SAT result is a global SAT result; if it is UNSAT, prove the false branch is complete (§3.3, pp. 10–11).
5. Revert decision levels so `solve` preserves the caller's state (§3.3, p. 10).

The flowchart records intermediate assertions: no false clause, a remaining unset literal when clauses remain, recursive-state restoration, and the two branch implications (Figure 3, p. 11).

Verus form. Inference: encode `is_satisfiable_extend` as a specification predicate and use recursive proof lemmas for branch completeness. Use a ghost snapshot or explicit restoration lemma for mutable state. Verus can express the variant with `decreases`; the SAT solver's search may still be exponential, so termination does not imply practical runtime.

## technique 5: use machine integers only after proving bounds

The revised solver replaces unbounded integers with an `Int32.t` model extracted to machine `int`. The authors report that machine integers improve performance “approximately 10 times in our tests,” but moving to machine integers requires proving upper bounds on indices (§1, p. 3). Every array index and literal conversion therefore carries validity predicates and bounds proofs (§3.1, pp. 4–6).

Verus form. Inference: use bounded integer types or explicit `requires 0 <= i < len` contracts, and prove no overflow in arithmetic before casts. A Rust `usize` index does not by itself prove a mathematical bound; retain a ghost integer model when SAT values are signed. Inference: this technique reduces runtime cost only after the verifier proves the machine arithmetic matches the specification domain.

## technique 6: engineer verification around solver scalability

The project contains 3,088 lines of Dafny, 600 lines of executable code, and 2,488 lines of specifications/proofs. It has 420 preconditions, 181 postconditions, 173 invariants, 44 variants, 42 lemmas, and 169 assertions. Whole-project verification takes approximately 13 minutes; `SATSolver.solve` is the most expensive method at approximately 175 seconds (Table 2, p. 15). The authors state, “The ratio between lines of proof and lines of code is approximately 4/1.” (§6, p. 15)

Their practical rules are themselves reusable techniques (§6, pp. 15–16): avoid nested loops; factor nested quantifiers into named predicates; use very small methods; minimize modifies/reads clauses; verify only the current method during development; and use the Z3 axiom profiler cautiously. They specifically report that inlining a helper into `revertLastDecisionLevel` substantially increases verification time (§6, p. 16).

Verus form. Inference: split generated Rust into small proof-friendly methods, keep contracts narrow, factor quantified predicates, and run Verus on one target before the full crate. Use `assert`/lemmas to control solver context rather than broad global invariants. These are workflow recommendations inferred from the Dafny evidence, not claims made about Verus performance.

## evidence, trust, and product threat

Benchmarks use SATLIB 3-CNF sets `uf100`, `uuf100` through `uf200`, `uuf200`, with variable counts in the set names. BenchExec uses one CPU core, a 5000-second limit, and 1024 MB. On `uf200`, the Dafny solver averages 43.22 s per instance and sums 4,322.50 s; C# averages 47.07 s and sums 4,707.89 s; C++ averages 21.92 s and sums 2,192.21 s. On `uuf200`, Dafny averages 110.64 s and sums 10,953.40 s; C# averages 120.07 s and sums 11,887.17 s; C++ averages 55.98 s and sums 5,542.17 s (Table 1, p. 13). The denominator is the instances in each SATLIB set; the paper reports set aggregates rather than listing each set's count in the table. MiniSat is much faster because it implements CDCL, so it is not an algorithm-matched comparison (§4, pp. 12–13).

Proved: data-structure invariants, operation contracts, DPLL soundness, completeness, and termination. Measured: verification time, specification/code counts, and runtime against C# and C++ implementations under the stated hardware/tool versions. Trusted or assumed: Dafny, Z3, code extraction/compiler, the CNF input assumption, and the parser's unspecified semantic correctness. The method verifies DPLL, not a modern CDCL solver with learning and restarts.

Inference: for agent-written verified Rust, this paper shows that executable performance can remain close to an unverified implementation when ghost abstractions mirror optimized data structures. The main threat is proof effort and solver sensitivity: 2,488 specification/proof lines for 600 code lines and a 175-second method indicate substantial human design. Inference: agents need invariant synthesis, contract decomposition, and controlled solver contexts; simply generating a global postcondition is unlikely to scale.

## what VL should not redo

The paper already establishes a complete auto-active workflow for an imperative search algorithm: ghost/runtime correspondence, cached-index invariants, branch-complete recursive contracts, explicit variants, state restoration, and verification-time engineering. VL should adapt these patterns to Verus and Rust rather than inventing another SAT correctness architecture. New work should target specification inference, proof repair, and trusted parser/input boundaries.

## techniques for the catalog

- ghost/runtime correspondence — pair optimized mutable arrays with erased ghost sets and prove a `valid` invariant
- cached-index verification — prove counters and reverse indexes equal simple specification functions
- contract-factored mutation — verify each state operation with narrow preconditions, postconditions, and frame facts
- DPLL branch proof — prove SAT/UNSAT semantics, recursive completeness, termination, and state restoration together
- bounded machine arithmetic — replace mathematical integers only after proving index and literal bounds
- solver-scalable proof engineering — use small methods, factored predicates, minimal frames, and focused verification runs
- benchmarked verified implementation — compare matched algorithms with explicit hardware, timeout, memory, and denominator data

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
