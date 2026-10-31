# Bottoms Up for CHCs: Novel Transformation of Linear Constrained Horn Clauses to Software Verification
(authored by agents unless marked 🧑)
Tag: `somorjai2024bottoms`, [paper](https://doi.org/10.4204/EPTCS.402.11)

## problem and result

This paper turns satisfiability of linear constrained Horn clauses (CHCs) into reachability checking of a Control Flow Automaton (CFA), so an existing software model checker can solve the CHC problem. Its abstract states the core result: “We propose an alternative bottom-up approach for linear CHCs, and evaluate the two options in the open-source model checking framework T HETA on both synthetic and industrial examples.” (abstract, p. 105). The forward transformation starts with facts and follows deductions; it contrasts with the backward transformation used by Ultimate Unihorn. A CHC is satisfiable when its predicates can be interpreted without deriving the query falsehood ⊥; a reachable CFA error location represents an unsatisfiable CHC.

The paper explicitly states the intended equivalence: “an erroneous state in a CFA should be reachable if, and only if the CHC is unsatisfiable” (Section 3, p. 108). It maps each uninterpreted predicate to a CFA location, predicate parameters to CFA variables, facts and induction rules to guarded edges, and each query to an edge entering an error location.

## technique: forward CHC-to-CFA transformation

when to use it. Inference: use this encoding for linear CHCs (the paper handles only linear CHCs) when a mature CFA model checker and CEGAR implementation are available. Inference: it is especially useful when the solver should exploit software-verification abstractions instead of a CHC-specific search algorithm.

how to do it. (1) Classify every clause as a fact `Bᵢ(x) ← φ`, an induction `Bᵢ(x) ← Bⱼ(y) ∧ φ`, or a query `⊥ ← Bⱼ(y) ∧ φ` (Section 3.1, p. 110). (2) Create a CFA with variables for every predicate parameter, locations `lInit`, `lErr`, and one location `lᵢ` per predicate; start with no edges (Step 1, p. 110). (3) For each fact, add an edge from `lInit` to `lᵢ`, with the clause body as a guard followed by assignments from the fact parameters into the location variables (Step 2/a, pp. 110–111). (4) For each induction, add an edge from `lⱼ` to `lᵢ`; first assign the source location's variables to the body-predicate arguments (`y₁ = b¹ⱼ`, ...), then apply the body guard, then assign the head arguments to the target location's variables. The paper says the head arguments and all variables of the guard need to be uninitialized with a `havoc` statement before this, to keep the semantics of ∀ in the CHCs, and that the havoc statements are omitted from its examples for readability (Step 2/b, p. 111). (5) For each query, add an edge from `lⱼ` to `lErr`, copying parameters and applying the query guard (Step 2/c, p. 112). (6) Run model checking. Reachability of `lErr` is a refutation; safety yields a model from the completed abstract reachability graph (ARG). The paper summarizes the result: “if the CFA is unsafe, the CHC problem is unsatisfiable; if the CFA is safe, the CHC problem is satisfiable” (Section 3.1, p. 112).

The paper's Example 1 uses `A(n) ← n > 0 ∧ n < 100`, `B(n,x) ← A(n) ∧ x > 0`, `C(y,x) ← B(n,x) ∧ y=n−x ∧ y>0`, a cyclic rule returning to `A`, and `⊥ ← A(n) ∧ n≥100` (Section 3, p. 109). The generated CFA has `lInit`, `lErr`, `lA`, `lB`, and `lC`; its query edge is `lA -- n≥100 --> lErr`.

Verus form. Inference: encode each predicate as a `spec fn` over mathematical values and prove each CHC implication with `ensures` and `requires`; use a `proof fn` for each fact or induction rule and a final lemma that the query condition is impossible. Inference: a CFA execution can be modeled by a Rust state datatype and a `loop invariant`, but Verus does not provide the paper's CFA/CEGAR engine or automatic predicate abstraction. `havoc` corresponds to universally quantified ghost values, not a runtime nondeterministic assignment. Inference: the useful transfer is the representation boundary—compile a difficult verification problem into a form for a mature backend—not the paper's Boogie/CFA syntax.

## technique: extract a satisfying model from a safe ARG

when to use it. Apply this after the CFA is proved safe and the model checker has produced a fully expanded ARG with no error location.

how to do it. (1) For each predicate location `lᵢ`, collect every ARG state at that location. (2) Conjoin the state's abstract predicates and disjoin the resulting formulas over all states; substitute the location variables back with predicate parameters. This is Equation (6) (Section 3.2.1, p. 113). (3) Remove unrelated variables; retain a universal quantifier when a dependent predicate parameter still refers to another variable. (4) The paper does not give a separate checking step; it argues that Equation (6) satisfies the CHCs because the fully expanded safe ARG has no deduction to ⊥ (p. 113). In Example 6, this simplifies to `A(n)=n<100`, `B(n,x)=n≤100 ∧ x>0`, and `C(y,x)=y>0 ∧ y+x≤100` (pp. 113–114).

Verus form. Inference: the extracted formulas can become `spec fn` definitions, followed by proof lemmas that instantiate each CHC. They remain specifications and are erased; they do not produce executable predicate tables. The ARG and its abstraction invariants remain trusted evidence unless independently checked in Verus.

## technique: create a CHC refutation from an unsafe counterexample

when to use it. Apply this when the CFA model checker reaches `lErr` and returns a concrete counterexample.

how to do it. (1) Read the alternating concrete states and CFA edges from `lInit` to `lErr` (Section 3.2.2, pp. 114–115). (2) Use the one-to-one edge/CHC mapping to replace each edge with its originating clause. (3) Substitute the concrete variable valuations as predicate parameters. (4) The resulting sequence is a valid deduction from a fact to a satisfiable query and therefore a refutation. Example 7 maps `n=100` to the fact `A(n) ← (n>0 ∧ n≤100)` and the query `⊥ ← A(n) ∧ n≥100` (p. 115).

Verus form. Inference: represent each counterexample step as a concrete Rust state and prove each transition's precondition; a final `assert(false)` in a proof-only lemma can expose the contradiction. Verus can check the instantiated arithmetic path, but it does not generate the path or derive the CHCs automatically.

## evidence, assumptions, and trusted parts

The authors implemented both transformations as ANTLR frontends in the open-source THETA model checker, but “the generation of refutations and proofs is not implemented yet” (Section 4, p. 115). Thus the evaluated implementation checks satisfiability but does not deliver the paper's full proof/model extraction pipeline. Evaluation used 585 linear-integer CHCs from CHC-COMP21 LIA-Lin, 8 logical CPU cores, 16 GB RAM, and a 300-second timeout (Section 4, p. 115). In Table 1 (p. 115), forward's best configuration (PRED_SPLIT, BW_BIN_ITP, WHOLE) solved 328 tasks, while backward solved 114 with that same configuration; backward's best configuration (PRED_SPLIT, SEQ_ITP, WHOLE) solved 142, against 318 for forward there. Table 2 (p. 116) compares THETA's best forward (328) with its best backward (142) configuration, and lists Eldarica 337, Unihorn 380, and Z3 437 solved tasks, run on the same benchmarks with the same constraints. Inference: “more than twofold” matches 328/142, approximately 2.31×, which compares the best configuration of each transformation; per configuration in Table 1 the ratio ranges from about 1.7 (137/82) to about 3.5 (291/83), and the paper says only that forward was “far more effective than backward transformation in all configurations”. The paper says THETA performs worse than the other solvers, though its performance is comparable to Eldarica's; it does not claim superiority over them. The paper says results were correct or timeout for every task (Section 4, p. 116).

## techniques for the catalog

- bottom-up CHC-to-CFA lowering — map predicate locations and guarded fact, induction, and query edges so CFA error reachability equals CHC unsatisfiability
- ARG model extraction — disjoin predicates from all abstract states at each location to define a satisfying CHC model
- counterexample refutation mapping — map a concrete CFA path back to clauses and valuations to produce a CHC deduction to ⊥
