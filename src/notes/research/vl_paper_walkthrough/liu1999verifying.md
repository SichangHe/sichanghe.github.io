# Verifying Consistency and Validity of Formal Specifications by Testing
(authored by agents unless marked 🧑)
Tag: `liu1999verifying`, [paper](https://doi.org/10.1007/3-540-48119-2_49)

## central method

Liu proposes testing a formal specification before implementation. A specification is consistent if some computational model can implement it; it is valid if it expresses user requirements. “Our target is to deal with implicit or nonprocedural specifications” (section 1, p. 896) “A specification is valid if it expresses the user requirements satisfactorily.” (section 1, p. 896)

The method derives logical proof obligations from invariants, operations, compositions, and decompositions, then evaluates those obligations on selected input/output bindings. The paper defines the process as “test case generation; (2) evaluation of proof obligations” (section 1.1, p. 897). The paper's convention is that a “successful test” is one that detects a fault and a “failed test” is one that detects none (section 2, p. 903). Inference: testing therefore checks finite samples and does not replace proof; the paper itself says that finding no satisfying test case for an invariant only “may weaken the belief that the invariant is consistent” (section 3.1, p. 904).

Inference: for VeruLaw, this is a low-cost contract-fuzzing layer: test `requires`/`ensures` relations and compositions before investing in full Verus proofs. A passing finite test is evidence about sampled states, not a universal theorem.

## technique: five logical-expression test strategies

Represent an expression in disjunctive normal form `P = P1 ∨ ... ∨ Pn`, with each disjunct a conjunction of atoms. A test case binds every free variable; quantified domains are replaced by finite samples (section 2, pp. 900–903).

1. Strategy 1 evaluates the whole `P` to true and false.
2. Strategy 2 evaluates each disjunct `Pi` to both true and false, without controlling the other disjuncts.
3. Strategy 3 strengthens this: make one `Pi` true while all others are false, and vice versa. The paper warns this can be impossible for overlapping predicates such as `x > 0 ∨ x > 3` (p. 902).
4. Strategy 4 makes every conjunct `Qji` true when testing `Pi` true, and tries each conjunct false when testing `Pi` false.
5. Strategy 5 makes every conjunct true for a true case, then makes exactly one conjunct false while all others remain true for each false case (p. 903).

When to use them. Inference: use Strategy 1 for broad smoke tests; Strategies 2–3 for disjunct coverage; Strategies 4–5 for diagnosing individual conjuncts (the paper only says the strategies have “different objectives”). From section 1.1 (p. 897): test cases derived from proof obligations need no expected results, while test cases derived from informal user requirements do, to check validity.

Verus form. Inference: extract Boolean clauses from a Verus `requires` or `ensures`, generate concrete Rust values, and evaluate the predicate in a test harness. For quantified `spec fn`s, choose finite domains explicitly and label them as assumptions. Keep proof obligations in ghost/spec code; do not execute `proof fn`s at runtime.

Evidence and limits. The paper gives definitions and truth tables but no aggregate fault-detection denominator. Strategy 3 may be infeasible for logically overlapping clauses; finite quantifier samples can miss counterexamples.

## technique: unit testing invariants

For an invariant `Inv = forall[x inset D | P(x)]` on a type `D = R`, the consistency proof obligation is `∃r∈R · P(x)`: some value of the type satisfies `P` (Definition 3.1, section 3.1, p. 904). Finding one satisfying value shows consistency; finding none does not prove inconsistency. In the Customer example, a Strategy 1 test with five cases gave three satisfying values, so it was a failed test and the invariant is consistent (table 6, p. 905). Validity testing evaluates the invariant itself against expected results, which may come from informal requirements or Strategies 1–3 (section 3.1, p. 905). In the paper's report of five customer records, `(1999,"Sue")` is expected true but evaluates false, so the test is successful; the paper says the fault “might be x.id < 1000” (table 7, p. 905).

How to apply (Inference: this list is my reading of the section, not a numbered procedure in the paper).
1. Choose valid and invalid values for each field, including boundary values as in table 7.
2. Bind a complete state to the invariant's free variables.
3. Evaluate the invariant expression.
4. Compare to expected validity from requirements; a mismatch is a successful test (fault detected), assuming the expected result is itself correct (p. 905).

Verus form. Inference: write a `#[test]` harness around a pure Rust mirror of the spec predicate, then use `assert` to compare expected outcomes. The Verus proof should separately establish the invariant preservation lemma; tests only expose likely specification errors.

## technique: condition-process consistency and validity

A condition process is `CP:[I,O,E,pre,post]`. Its consistency obligation is `∀x̃∈Σ • pre(I,x̃) ⇒ ∃x∈Σ • post(I,x,x̃,O)` (equation 1, section 3.2, p. 906): for every initial external state that together with the inputs satisfies `pre`, some final state exists that together with the initial state, inputs and outputs satisfies `post`.

How to apply.
1. Generate test pairs `<Iv,Ov>` containing inputs and candidate outputs, including before/after external variables.
2. Evaluate the precondition and postcondition with type invariants.
3. For every tested input satisfying `pre`, check that at least one candidate output satisfies `post`.
4. Classify a set as a failed test when all such inputs have a witness output; classify it as non-confident when some input lacks a tested witness. A non-confident result does not prove a fault because output sampling may be inadequate (p. 907).
5. For validity, attach expected outputs from user requirements; mismatches are successful tests, matches are failed tests (p. 908, table 9).

The `Search` example (`pre x >= 5 and elems(list) <> { }`) tests `x`, the external sequence `list`, and `index`; cases `(5,[0,8],0)` and `(6,[0,2,6],3)` witness the postcondition, while `(5,[0,8],2)` does not, but is not considered because test case `((5,[0,8]),0)` exists, and `(15,[])` is skipped because it fails the precondition (table 8, p. 907; discussion p. 908). The paper concludes it is a failed test for `Search`, so no fault is detected.

Verus form. Inference: represent the relation as a `spec fn` and prove existence with a lemma for each input class; executable tests can search candidate outputs. Use `requires` for `pre` and `ensures` for `post`; do not put `ensures` on a `spec fn`.

## technique: integration proof obligations

For sequential data-flow processes `A1...An` feeding `B`, derive `(preA1 ∧ postA1(x1)) ∧ ... ∧ (preAn ∧ postAn(xn)) ⇒ preB` (equation 2, section 4.1, pp. 909–910). Generate tuples of intermediate outputs, evaluate the antecedent and `preB`, and report a successful test if the antecedent is true while `preB` is false (Definition 4.1, p. 910). The paper says that for this obligation “we can definitely determine whether a test is a successful or failed test” (p. 909).

For IF-THEN use `pre ∧ post(x) ∧ C(x) ⇒ preB`; IF-THEN-ELSE uses separate obligations with `C` and `¬C`; CASE uses one obligation `pre ∧ post(x) ∧ Ci(x) ⇒ preBi` per branch plus a default `pre ∧ post(x) ∧ ¬(C1(x) ∨ ... ∨ Cn(x)) ⇒ preBn+1` (section 4.2, pp. 910–911). Each obligation is tested with the method of Definition 4.1.

Verus form. Inference: model each process as a Rust function with contracts and prove composition lemmas that feed one function's postcondition into the next function's precondition. Branch-specific `assert` statements should establish the corresponding branch contract.

## technique: decomposition/refinement testing

When a high-level process `OP` is decomposed into a CDFD `G`, derive `preOP ⇒ preG` and `preOP ∧ postG ⇒ postOP` (section 5, pp. 911–912). The paper's method is to use “the same inputs generated for testing condition process A” to test `G` (p. 912); first unit-test each condition process in `G`, then integration-test their consistency. In the paper's example, check `preA ⇒ preA1`, `preA ∧ postA1 ⇒ preA2 ∧ preA3`, `preA2 ∧ postA2 ⇒ preA4`, and `(preA3 ∧ postA3) ∧ (preA4 ∧ postA4) ⇒ postA` (p. 912).

Verus form. Inference: expose the decomposition as helper functions and prove refinement lemmas connecting their pre/post contracts to the parent function. Tests should use identical input bindings at both abstraction levels.

## evidence, trust, and limits

The paper supplies worked tables and formulas, not an empirical evaluation; for future work it lists concrete test-case generation techniques, a “relatively large scale case study” of a “University Information System”, automatic test case generation, and tool support (section 6, p. 913). Assumptions the method relies on: test-case adequacy, correct expected results from user requirements (p. 905), and, for pre/postconditions, that values satisfy their types' invariants (p. 907). Inference: agent-generated Verus contracts should undergo such tests because a formally provable but invalid contract can pass every proof. Inference: the paper's five strategies and composition/decomposition obligations can be reused as pre-proof checks in VL rather than building a new theorem prover.

## techniques for the catalog

- proof-obligation testing — derive consistency formulas from specifications and evaluate them on input/output bindings
- five logical-expression strategies — target whole expressions, disjuncts, and conjuncts with progressively stronger truth assignments
- invariant unit testing — compare evaluated invariant truth with requirement-derived expected results
- condition-process testing — require a witness output for each tested pre-state and separately test validity expectations
- integration obligations — test that sequential and conditional data-flow outputs satisfy successor preconditions
- decomposition refinement — test parent/child precondition and postcondition implications with shared inputs

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A non-confident test indicates a doubt whether the testing target (e.g., condition process) satisfies the required proof obligation."): I read the whole paper text and checked every quotation, formula, strategy definition, section and page reference, the Customer and Search examples with tables 6-9, and the integration and decomposition obligations against it; I changed two page references (p. 896 not 897), the 'target' quotation wording, the invariant consistency obligation (it is existence of a satisfying value, not a type-invariant implication), added the successful/failed test convention, and marked my own advice as Inference. I did not check the cited references or the PDF figure layout, and the link is from the fetch record (the paper text has no DOI).
