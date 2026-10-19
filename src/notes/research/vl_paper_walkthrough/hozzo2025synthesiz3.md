# Synthesiz3 This: an SMT-Based Approach for Synthesis with Uncomputable Symbols
(authored by agents unless marked 🧑)
Tag: `hozzo2025synthesiz3`, [paper](http://arxiv.org/abs/2504.16536v3) (link from the fetch record)

## what the paper provides

Hozzová and Bjørner present an SMT-based synthesis method for recursion-free, single-invocation functions whose specification may mention symbols forbidden from the synthesized function. The abstract defines these as “symbols used in the specification but not allowed in the resulting function” and states that the method uses “a quantifier elimination algorithm using model-based projections for both total and partial function synthesis” (p. 1). It projects away these uncomputable symbols, extracts computable witnesses, and provides a shortcut for uniquely determined solutions. The authors implement a Python prototype using an extended Z3 API (Section VI-A, p. 8).

A total synthesis problem is a tuple ⟨Φ[y], u, y⟩ where `u` is the set of uncomputable symbols, `y` is the output variable, and a realizer `R` uses only computable symbols `c`; `Φ[R/y]` must hold (Definition 1, p. 2). Section II introduces equality and uninterpreted functions (EUF), linear integer arithmetic (LIA), and linear real arithmetic (LRA) (pp. 1–2). The 2-knapsack example uses uncomputable alternatives to express optimality while the synthesized branches use only the capacity and item weights (Example 1, p. 2).

## technique 1: specify forbidden dependencies with uncomputable symbols

what it is: distinguish symbols permitted in the output from symbols used only in the specification. The specification has the shape `∀c.∃y.∀u. φ[y,c,u]`, where `φ` is quantifier-free. The paper states: “The computable symbols include all symbols which are allowed in the solution for f: f’s inputs, as well as constants, functions, and predicates.” (Section III-A, p. 2)

when to use: the paper uses uncomputables to express optimality, existence assumptions, and properties of unavailable functions or predicates (Sections III-A–B, pp. 2–3).

how to do it:
1. identify computable symbols `c` and uncomputable symbols `u`
2. write the quantifier-free behavior formula `φ[y,c,u]`
3. use the quantifier order `∀c.∃y.∀u` so the output cannot depend on `u`
4. synthesize a term over `c` only, or a case list whose conditions and results use only `c`
5. for multiple outputs, use a tuple `y` sharing the same computable symbols and inputs

These steps follow Definition 1 and Section III-A (p. 2). The paper's 2-knapsack realizer returns both items if their combined weight fits; otherwise it chooses the feasible heavier item, defaulting to `(0,0)` (Example 1, p. 2).

Verus form: Inference: express reference behavior in specifications and prove that executable branches satisfy the required property. The paper provides no Verus encoding or integration; expressing its second-order quantification in Verus would require separate work.

evidence: Section III-B turns the integer task `2y ≃ x`, which has no total solution, into `2u ≃ x ⇒ 2y ≃ x` with uncomputable `u`. The premise guarantees that a suitable integer exists. The footnote limits this transformation: “This trick does not work if φ already uses some uncomputable symbols.” (p. 3)

limits and assumptions: Section III-A restricts the specification to single invocation: “f always occurs in φ with the same arguments c.” (p. 2) The functions are recursion-free. Inference: the paper does not establish synthesis guarantees for recursive Rust functions, heap operations, or effects. Remark 4 gives completeness only for theories admitting the quantifier elimination needed by the algorithm (p. 4).

## technique 2: partial-function synthesis by condition coverage

what it is: synthesize a program and a condition describing where it solves the specification. Definition 2 requires a pair ⟨C,R⟩ over computable symbols satisfying both `C ⇒ Φ[R]` and `(∃y.∀u.Φ) ⇒ C`. The paper explains: “The first condition ensures that Φ[R] holds under C, and the second condition ensures that ⟨C, R⟩ is a maximal solution for partial function synthesis.” (Section III-C, p. 3)

when to use: specifications need not have solutions on every input. The evaluation includes finding an integer between bounds if one exists and solving an equation if possible (Table I, sets VII and IX, p. 8).

how to do it:
1. initialize `C := ⊥` and an empty case list `R`
2. if `∀u.Φ ∧ ¬C` is unsatisfiable, return ⟨C,R⟩
3. find a satisfiable formula `π∀[y]` over `c ∪ {y}` implying `∀u.Φ ∧ ¬C`
4. seek a satisfiable computable guard `π∃` and computable witness `r` with `π∃ ⇒ π∀[r]`
5. if a witness is found, update `C := C ∨ π∃`, append `π∃ → r`, and repeat
6. otherwise, the procedure must establish that no computable realizer exists for `π∀[y]` and obtain a satisfiable computable `π∃` implying `∃y.π∀[y]`; add `¬π∃` to the working specification and repeat

These are Algorithm 1's two distinct update paths (Section III-D, p. 3). A failed search alone does not establish the no-realizer condition. Example 3 gives the partial solution `⟨a ≃ b,a⟩` for `q(y) ∨ a ≃ b ≃ y` with uncomputable `q` (p. 3). Example 5 builds the workshop function and simplifies it to `case Sun: A; default: V`, with total condition `⊤` (p. 4).

Verus form: Inference: represent the result with an explicit precondition, or return an option whose successful result satisfies the specification. Proving maximality requires showing that the condition covers every input admitting a solution; verifying only the successful branches is insufficient.

evidence: Proposition 3 states that a terminating run without `r = ⊥` returns a maximal solution. Otherwise, “⟨C, R⟩ is a program satisfying condition (4) but there is no solution to (5).” (pp. 3–4) Thus a run that excludes a region without a computable realizer does not return a maximal solution as defined in Definition 2.

limits and assumptions: Section III-C places the general first-order problem in an undecidable `∀∃∀` fragment. Example 4 shows that a finite maximal solution need not exist (p. 3). Remark 4 states: “Algorithm 1 is complete for theories that admit quantifier elimination for computing π∀, π∃ in steps 3 and 4.” (p. 4)

## technique 3: existential model-based projection with witness extraction

what it is: `∃MBP(M,x,Φ)` returns a quantifier-free `π∃` excluding `x`, satisfied by `M`, and implying `∃x.Φ`. The witness-producing form `∃MBPR(M,y,Φ)` returns a satisfiable quantifier-free condition and term `⟨π∃,r⟩` with `π∃ ⇒ Φ[r/y]`, and neither contains `y` (Definition 5, Section IV-A, p. 4).

how to do it:
1. obtain a model `M` satisfying the current literals `L[y]`
2. for EUF, build a congruence-preserving partition based on `M` satisfying `L`
3. collect computable representatives and terms obtained by applying a computable function to computable representatives
4. if a candidate `r` makes `L[y] ∧ y ≃ r` satisfiable, return `⟨L[r],r⟩`
5. otherwise, return `⟨∃MBP(M,y,L),⊥⟩`

These are Algorithm 2's steps (p. 5). Proposition 9 claims correctness and completeness of this EUF procedure. For LIA plus EUF, Definition 11 uses arithmetic projection after requiring the literals to be closed under the specified Ackermann reductions with respect to `y` (p. 5). This is not a separate Section IV-C; Section IV contains only existential and universal projection subsections.

Example 7 computes `⟨Sun,A⟩` from `L[y] = {A ≃ y,Sun}` (p. 5). The implementation also checks whether `y` occurs in `L`; if it does not, it returns an “any” realizer (Section VI-A, p. 8). Section II permits this only when there is at least one computable term of the required sort (p. 2).

Verus form: Inference: use witness extraction offline to generate a candidate expression and its condition, then verify the corresponding contract. The paper does not show that Verus performs this extraction or reconstructs the resulting proof automatically.

evidence: the authors describe Z3 extensions for E-graph justifications, a heuristic EUF witness finder, and variable solving “that is complete for LRA and extends to LIA (incompletely, not to deal with non-convexity of LIA).” (Section VI-A, p. 8)

limits and assumptions: the complete abstract EUF procedure and the implementation's heuristic witness search are distinct. Remark 10 says that a single witness projection need not be equivalent to `∃y.L[y]`; multiple projections may be needed to cover all models (pp. 5–6). Inference: a generated witness and its condition should be checked together before use.

## technique 4: universal projection with unsatisfiable cores and correction sets

what it is: compute a sufficient condition `π∀` for `∀u.Φ`, rather than necessarily computing the entire universally quantified formula at once. Section IV-B derives the search from MARCO core enumeration, with projection of cores and early return when a suitable assignment is found (pp. 5–6).

how to do it:
1. initialize `O := ⊤` and `S := ⊤`; collect uncomputable literals from `NNF(¬Φ)` into `Lu` and computable literals from `NNF(Φ)` into `Lc`
2. if `O ∧ S` is unsatisfiable, return `⊥`; otherwise find a satisfiable subset `U ⊆ Lu ∪ Lc` implying `O ∧ S`, with model `M`
3. if `U ∧ Φ` is unsatisfiable, take its core, project `u` from the core using `∃MBP(M,u,Core(U,Φ))`, and negate the projection to obtain a clause
4. add that clause to `O`, weaken each clause of `S` with the newly introduced literals, extend `Lc`, and restart
5. otherwise, find a model `M′` of `U ∧ Φ` and collect the literals of `Lc` true in that model
6. if those computable literals contradict `¬Φ`, return their core against `¬Φ` as `π∀`
7. otherwise, add to `S` the disjunction of literals from `Lc ∪ Lu` false in `M′`, and restart

These are Algorithm 3's steps (p. 6). The last path blocks a model whose implication uses uncomputables; it does not remove literals from an unsatisfiable core. Example 9 explicitly derives `¬Mon ∧ ¬Sun` for the workshop formula (p. 6); Example 5 gives the later projections `A ≃ y ∧ Sun` and `V ≃ y ∧ Mon` (p. 4).

Verus form: Inference: each sufficient condition could become a lemma precondition or branch condition. Core enumeration and projection would remain part of an external synthesis tool, with Verus checking the emitted program and contracts.

evidence: Proposition 13 states: “If Algorithm 3 returns π∀ ≠ ⊥, then π∀ ⇒ ∀u.Φ.” Remark 14 separately gives completeness for theories admitting quantifier elimination (p. 6).

limits and assumptions: Example 4 shows that finite quantifier-free uniform interpolants do not always exist for combinations of theories (p. 3). Inference: a timeout or failure to obtain a projection does not justify treating an unresolved region as covered.

## technique 5: exploit uniquely determined realizers

what it is: detect when constraints force `y` to equal a computable term. Section V says: “In that case, we can bypass invoking ∃MBPR.” (p. 6) The combined procedure interleaves congruence reasoning for EUF with arithmetic elimination for LRA (p. 7).

how to do it:
1. for EUF, inspect the congruence graph for a computable representative `repc(y)` whose equality justification contains no uncomputable terms
2. use `repc(y)` as the realizer and substitute it for `y` in the justification to obtain the condition
3. for LRA, use the arithmetic tableau: solve from equal lower and upper bounds, a value that cannot change while constraints remain feasible, or a row obtained by pivoting
4. for EUF plus LRA, combine representative lookup, fixed values, congruence, decomposition of arithmetic sums, and Gaussian elimination to search for a computable term

Sections V-A–C give these procedures (p. 7). Proposition 15 states that, for real-valued `y`, the combined proof search saturates finitely and finds a term in `Tc` if and only if one exists. The surrounding text calls this “equality saturation modulo EUF and LRA” (p. 7).

Example 10 calls `a` a unique realizer for `y` under `y ≠ b ∧ a ≠ b`, with signature `{a,b}`, while `repc(y) = ⊥` (p. 7). Inference: here the restriction is on available computable terms; the constraints do not force `y = a` in every model. This example cautions against equating a unique available realizer with a uniquely determined output value.

Verus form: Inference: prove that branch assumptions force the chosen expression, then use that equality to prove the result's contract. The paper's LRA completeness result does not establish complete handling of integer arithmetic or arbitrary Verus specifications.

evidence: the evaluation reports: “Our approach scales as well as or better than both Vampire and cvc5 for all benchmarks with a unique solution, and slightly worse than cvc5 on problems with infinitely many possible solutions (sets IV and V).” (Section VI-B, p. 9)

limits and assumptions: the implementation extends the LRA solver to LIA incompletely (Section VI-A, p. 8). The simple EUF extraction can miss a unique realizer, as Example 10 demonstrates (Section V-A, p. 7).

## techniques for the catalog

- uncomputable-symbol specification — quantify reference functions or predicates in the specification while forbidding them from generated code
- partial synthesis by coverage — accumulate guarded witnesses and check maximal coverage; a region without a computable realizer prevents a maximal solution
- model-based projection with witnesses — eliminate symbols using theory-specific projection while extracting a computable realizer
- core-based universal projection — project unsatisfiable cores and enumerate correction sets to find sufficient computable conditions
- unique-realizer shortcut — combine E-graphs and arithmetic tableaux to extract forced computable output terms
