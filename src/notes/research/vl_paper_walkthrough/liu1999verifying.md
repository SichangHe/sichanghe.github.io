# Verifying Consistency and Validity of Formal Specifications by Testing
(authored by agents unless marked 🧑)
Tag: `liu1999verifying`, [paper](https://doi.org/10.1007/3-540-48119-2_49)

## central method

Liu proposes testing a formal specification before implementation. A specification is consistent if some computational model can implement it; it is valid if it expresses user requirements. “The target is to deal with implicit or nonprocedural specifications” (section 1, p. 897) “A specification is valid if it expresses the user requirements satisfactorily.” (section 1, p. 897)

The method derives logical proof obligations from invariants, operations, compositions, and decompositions, then evaluates those obligations on selected input/output bindings. The paper defines the process as “test case generation; (2) evaluation of proof obligations” (section 1.1, p. 897). Testing therefore checks finite samples and does not replace proof.

Inference: for VeruLaw, this is a low-cost contract-fuzzing layer: test `requires`/`ensures` relations and compositions before investing in full Verus proofs. A passing finite test is evidence about sampled states, not a universal theorem.

## technique: five logical-expression test strategies

Represent an expression in disjunctive normal form `P = P1 ∨ ... ∨ Pn`, with each disjunct a conjunction of atoms. A test case binds every free variable; quantified domains are replaced by finite samples (section 2, pp. 900–903).

1. Strategy 1 evaluates the whole `P` to true and false.
2. Strategy 2 evaluates each disjunct `Pi` to both true and false, without controlling the other disjuncts.
3. Strategy 3 strengthens this: make one `Pi` true while all others are false, and vice versa. The paper warns this can be impossible for overlapping predicates such as `x > 0 ∨ x > 3` (p. 902).
4. Strategy 4 makes every conjunct `Qji` true when testing `Pi` true, and tries each conjunct false when testing `Pi` false.
5. Strategy 5 makes every conjunct true for a true case, then makes exactly one conjunct false while all others remain true for each false case (p. 903).

When to use them. Use Strategy 1 for broad smoke tests; Strategies 2–3 for disjunct coverage; Strategies 4–5 for diagnosing individual conjuncts. If expected results come from user requirements, disagreement is a validity fault; if only structural obligations are tested, results indicate consistency evidence.

Verus form. Inference: extract Boolean clauses from a Verus `requires` or `ensures`, generate concrete Rust values, and evaluate the predicate in a test harness. For quantified `spec fn`s, choose finite domains explicitly and label them as assumptions. Keep proof obligations in ghost/spec code; do not execute `proof fn`s at runtime.

Evidence and limits. The paper gives definitions and truth tables but no aggregate fault-detection denominator. Strategy 3 may be infeasible for logically overlapping clauses; finite quantifier samples can miss counterexamples.

## technique: unit testing invariants

For an invariant `Inv`, derive the obligation that every state satisfying the type invariant also satisfies `Inv` (section 3.1, pp. 904–905). Generate cases from informal requirements or Strategies 1–3, evaluate `Inv`, and compare actual truth with expected truth. Liu's report includes five customer records; `(1999,"Sue")` is expected true but evaluates false, identifying the bound `x.id < 1000` as a likely fault (table 7, p. 905).

How to apply.
1. Enumerate valid and invalid boundary values for each field.
2. Bind a complete state to the invariant's free variables.
3. Evaluate the invariant expression.
4. Compare to expected validity from requirements; a mismatch is a successful test (fault detected).

Verus form. Inference: write a `#[test]` harness around a pure Rust mirror of the spec predicate, then use `assert` to compare expected outcomes. The Verus proof should separately establish the invariant preservation lemma; tests only expose likely specification errors.

## technique: condition-process consistency and validity

A condition process is `CP:[I,O,E,pre,post]`. Its consistency obligation is `∀x̃∈Σ • pre(I,x̃) ⇒ ∃x∈Σ • post(I,x,x̃,O)` (section 3.2, p. 906): every valid input and initial external state must have some output and final state satisfying the postcondition.

How to apply.
1. Generate test pairs `<Iv,Ov>` containing inputs and candidate outputs, including before/after external variables.
2. Evaluate the precondition and postcondition with type invariants.
3. For every tested input satisfying `pre`, check that at least one candidate output satisfies `post`.
4. Classify a set as a failed test when all such inputs have a witness output; classify it as non-confident when some input lacks a tested witness. A non-confident result does not prove a fault because output sampling may be inadequate (p. 907).
5. For validity, attach expected outputs from user requirements; mismatches are successful tests.

The `Search` example tests `x`, a sequence, and `index`; cases `(5,[0,8],0)` and `(6,[0,2,6],3)` witness the postcondition, while `(5,[0,8],2)` does not, but is not considered a fault because another output witness exists (table 8, pp. 907–908).

Verus form. Inference: represent the relation as a `spec fn` and prove existence with a lemma for each input class; executable tests can search candidate outputs. Use `requires` for `pre` and `ensures` for `post`; do not put `ensures` on a `spec fn`.

## technique: integration proof obligations

For sequential data-flow processes `A1...An` feeding `B`, derive `(preA1 ∧ postA1(x1)) ∧ ... ∧ (preAn ∧ postAn(xn)) ⇒ preB` (section 4.1, pp. 909–910). Generate tuples of intermediate outputs, evaluate the antecedent and `preB`, and report a successful test if the antecedent is true while `preB` is false.

For IF-THEN use `pre ∧ post(x) ∧ C(x) ⇒ preB`; IF-THEN-ELSE uses separate obligations with `C` and `¬C`; CASE uses one obligation per branch plus a default branch (section 4.2, pp. 910–911). This ensures every control path supplies the next process's precondition.

Verus form. Inference: model each process as a Rust function with contracts and prove composition lemmas that feed one function's postcondition into the next function's precondition. Branch-specific `assert` statements should establish the corresponding branch contract.

## technique: decomposition/refinement testing

When a high-level process `OP` is decomposed into a CDFD `G`, derive `preOP ⇒ preG` and `preOP ∧ postG ⇒ postOP` (section 5, pp. 911–912). Reuse the high-level process's input test set for `G`; unit-test each subprocess, then integration-test its flows. In the paper's example, check `preA ⇒ preA1`, `preA ∧ postA1 ⇒ preA2 ∧ preA3`, `preA2 ∧ postA2 ⇒ preA4`, and `(preA3 ∧ postA3) ∧ (preA4 ∧ postA4) ⇒ postA` (p. 912).

Verus form. Inference: expose the decomposition as helper functions and prove refinement lemmas connecting their pre/post contracts to the parent function. Tests should use identical input bindings at both abstraction levels.

## evidence, trust, and limits

The paper supplies worked tables and formulas, not a large empirical evaluation; it explicitly lists automatic test generation and a future university-information-system case study as future work (section 6, p. 913). Trusted assumptions are test-case adequacy, expected results from user requirements, expression evaluator correctness, and type invariants. Inference: agent-generated Verus contracts should undergo these tests because a formally provable but invalid contract can pass every proof. Existing work already specifies five clause-coverage strategies and composition/decomposition obligations; VL should integrate them as pre-proof checks rather than recreate a theorem prover.

## techniques for the catalog

- proof-obligation testing — derive consistency formulas from specifications and evaluate them on input/output bindings
- five logical-expression strategies — target whole expressions, disjuncts, and conjuncts with progressively stronger truth assignments
- invariant unit testing — compare evaluated invariant truth with requirement-derived expected results
- condition-process testing — require a witness output for each tested pre-state and separately test validity expectations
- integration obligations — test that sequential and conditional data-flow outputs satisfy successor preconditions
- decomposition refinement — test parent/child precondition and postcondition implications with shared inputs

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
