# Natural Hoare Logic: Towards formal verification of programs from logical forms of natural language specifications
(authored by agents unless marked 🧑)
Tag: `poroor2021naturalhoare`, [paper](https://doi.org/10.48550/arxiv.2103.05779)

## purpose

Natural Hoare Logic (NHL) connects a domain expert's natural-language requirement to a conventional Hoare-logic proof. The paper's objective is explicit: “This enables formal verification of software directly against requirements specified by a domain expert in natural language.” (Abstract, PDF p. 1.) NHL does not prove the semantic parser correct. It defines how a parsed higher-order logical form is related to program variables and then derives preconditions, postconditions, and invariants that ordinary Hoare rules can check.

The logical forms are simply typed λ-calculus expressions with constants for predicates and quantifiers. For example, “All balances must be greater than zero” is parsed as `∀x · balance(x) > 0`. The bridge is an LFPL (logical-form–program-logic) relation `R`, such as `∃x · balance(x) = _balance`, that identifies the logical entity with a concrete program variable. The paper warns that leaving this correspondence inside every Hoare assertion causes it to become inconsistent as predicate-transformer rules rewrite program variables (Section 2.1, PDF p. 2).

## technique 1: declarative invariants through LFPL relations

when to use it

Use this for a natural-language invariant that should hold before and after a command or loop body. The method is suited to sequential imperative programs and partial correctness; the paper does not require termination.

steps

1. Parse the sentence compositionally into a logical form `L`; define the semantic functions used by its words (Section 2, PDF pp. 1–2).
2. Write an LFPL relation `R` associating each logical variable with a program variable. For the balance example, `R ≜ ∃x · balance(x) = _balance` (Section 2.1, PDF p. 2).
3. Choose the strongest program assertion `I` satisfying `L ∧ R ⇒ I` and `I ⇒ ¬R` (Equation 4, PDF p. 2). Eliminating `R` ensures that later Hoare substitutions affect only program variables.
4. Prove `{I} S {I}` with standard assignment, consequence, and sequencing rules. In the increment example, strengthen the postcondition to `_balance > 1`, apply the assignment rule, then weaken it back to `_balance > 0` (Section 2.1, PDF p. 2).

evidence and Verus form

The paper's worked proof establishes that incrementing a positive balance preserves positivity. Inference: a Verus encoding would make `I` a `spec fn` over the Rust state, state the LFPL correspondence as a ghost predicate, and put `invariant I` on the loop. The relation-to-program-variable proof would be an ordinary `assert` or lemma; Verus cannot check that an English parser produced the intended `L`.

## technique 2: imperative and conditional natural-language commands

when to use it

Use this for requirements that change state, such as “Increment the balance,” or conditional commands. NHL deliberately restricts imperatives to operations on program state rather than arbitrary modal language.

steps for an imperative

1. Give the command a before/after logical relation with a `post` function. The paper defines `increment = λf · ∀x · f(post(x)) = f(x) + 1` (Section 2.2, PDF p. 3).
2. Define `R` for the pre-state and `R′` by replacing each logical variable with `post(variable)` for the post-state (Equation 12, PDF p. 3).
3. Prove `{L ∧ R} S {L ∧ R′}` (Equation 13, PDF p. 3). This keeps the logical form stable while the relation changes with the command.

steps for a conditional imperative

1. Parse the conditional `E` and command logical form `L` separately.
2. Prove `{L ∧ R ∧ E} S {L ∧ R′}` (Equation 19, PDF p. 3), so the command is required only when its condition holds.
3. Use the same `R/R′` correspondence and ordinary Hoare consequence rules.

Inference: in Verus, `post` is naturally a ghost snapshot represented by `old(...)` in an `ensures` clause; the executable command remains ordinary Rust. The method's two-state logical relation is a useful pattern for API contracts, but the paper provides no Rust or Verus implementation.

## technique 3: pre/post declaratives and domain knowledge

For a requirement with separate precondition and postcondition, parse `L` and `L′`, define `R` and `R′`, and prove `{L ∧ R} S {L′ ∧ R′}` (Equation 21, PDF p. 4). This is simpler than imperative semantics because no `post` interpretation of a command phrase is needed.

NHL can reuse proofs through domain knowledge. If an invariant about `valueof(x)` has already been proved and an ontology supplies `∀x · balance(x) = valueof(x)`, the prior proof implies the new balance invariant without repeating the program proof (Section 2.5, PDF p. 4). The paper also gives implication-shaped ontology facts, `∀x · A(x) ⇒ B(x)`, as reusable knowledge.

Inference: Verus can encode domain facts as reusable `proof fn` lemmas with `ensures`, then invoke them at call sites. Such lemmas must be proof-only; calling a `proof fn` at runtime would not implement the command.

## technique 4: parser-error guard by paraphrase

The highest-probability semantic parse can be wrong. NHL therefore defines a reverse function `N` from logical forms to natural language and asks the user to confirm the paraphrase. The paper states: “Given a natural language sentence S input by a user and if its logical form generated by a semantic parser is S, then we could ask back the user: Did you mean: N(S)?” (Section 2.6, PDF p. 4.) If the user rejects it, show other probable parses; if none is acceptable, ask for a simpler rephrasing. Accepted choices can label parser retraining.

This guard is a product workflow rather than a proof rule. Its assumption is that `N` produces a consistent, understandable paraphrase; the paper calls that easier than parsing but does not measure error rates. Inference: VL should expose the generated contract and its English paraphrase for review before verification, because a successful Verus proof only establishes the generated contract.

## what is proved, trusted, and missing

The paper proves derivation rules on paper and supplies examples, but reports no implementation, benchmark denominator, parser accuracy, or mechanized soundness theorem. Its stated future work includes “formal soundess proof” and mechanization (Conclusion, PDF p. 6). Trusted components therefore include the semantic parser, λ-calculus meanings, LFPL relations, domain facts, Hoare-rule implementation, and the user's acceptance of the paraphrase. NHL covers invariants, state-changing commands, conditionals, pre/post assertions, and ontology reuse; it does not cover arbitrary imperative modality or prove parser correctness.

Inference: the threat to agent-written verified Rust is specification drift at the natural-language-to-contract boundary. A parser can produce a valid but unintended `L`, and Verus will still certify code against it. Existing NHL work means VL should not present English-to-contract confirmation as a novel idea; it should measure whether explicit paraphrase review catches realistic parser errors and whether the accepted relation remains true after Rust refactoring.

## techniques for the catalog

- LFPL invariant bridge — relate a parsed logical form to program variables, eliminate the relation, and prove the resulting strongest invariant with Hoare rules
- before/after imperative relation — model state-changing commands with `post` and prove `{L ∧ R} S {L ∧ R′}`
- conditional imperative rule — include the parsed condition in the precondition before applying the command proof
- domain-knowledge reuse — transfer an existing proof through logical ontology implications
- parser paraphrase guard — translate candidate logical forms back to natural language and require user confirmation or rephrasing

Checked 2026-10-15 against the paper by a Codex agent for natural_hoare_logic_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
