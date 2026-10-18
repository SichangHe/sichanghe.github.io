# Natural Hoare Logic: Towards formal verification of programs from logical forms of natural language specifications
(authored by agents unless marked 🧑)
Tag: `poroor2021naturalhoare`, [paper](https://arxiv.org/abs/2103.05779)

## purpose

Natural Hoare Logic (NHL) connects a domain expert's natural-language requirement to a conventional Hoare-logic proof. The paper's objective is explicit: “This enables formal verification of software directly against safety requirements specified by a domain expert in natural language.” (Abstract, PDF p. 1.) NHL does not prove the semantic parser correct. It defines how a parsed higher-order logical form is related to program variables, and which Hoare triples must then be proved for invariants, imperative commands, conditional commands, and pre/post-condition declaratives.

The logical forms are simply typed λ-calculus expressions with constants for logical connectives and quantifiers (Section 1, PDF p. 1). For example, “All balances must be greater than zero” is parsed as `∀x · balance(x) > 0` (Equation 1, PDF p. 2). The bridge is an LFPL (logical form - program logic) relation `R`, such as `∃x · balance(x) = _balance`, that identifies the logical entity with a concrete program variable. The paper warns that leaving this correspondence inside Hoare assertions can make the proof fail, because Hoare rules transform program variables while the variables in the logical forms stay unchanged, so the relation becomes inconsistent (Section 2.1, PDF p. 2).

## technique 1: declarative invariants through LFPL relations

when to use it

Use this for a natural-language invariant that should hold before and after the program `S`. The paper's footnote 4 says: “We consider the invariant to hold true only before and after the program execution, not in the intermediate states.” The paper considers only partial correctness, so termination is not proved (Section 1, PDF p. 1). The paper believes the approach is “useful enough for specifying pre-condition/post-conditions assertions on sequential imperative programs” (Section 2.2, PDF p. 3).

steps

1. Parse the sentence compositionally into a logical form `L`; define the semantic functions or constants used by its words (Section 2, PDF p. 2).
2. Write an LFPL relation `R` associating each logical variable with a program variable. For the balance example, `R ≜ ∃x · balance(x) = _balance` (Equation 3, PDF p. 2).
3. Choose `I` as the strongest condition satisfying `L ∧ R ⇒ I` and `I ⇏ R` (I does not imply R) (Equation 4, PDF p. 2). The paper says the second condition “is required to remove the correspondance relation from the Hoare logic assertions”, and that `I` should be an assertion on program variables only. The strongest-`I` requirement ensures that “a weakened form of the user requirement is not take up for proof”.
4. Prove `{I} S {I}` (Section 2.1, PDF p. 2). In the increment example (`_balance := _balance + 1`), the paper says to consider the stronger postcondition `_balance > 1`, apply the assignment rule, and then apply the consequence rule to weaken the postcondition back to the invariant (PDF p. 3).

evidence and Verus form

The paper's worked example is a short proof sketch, in prose, that incrementing a positive balance preserves positivity (Equations 5-9, PDF pp. 2-3); it is not mechanized. Inference: a Verus encoding would make `I` a `spec fn` over the Rust state, state the LFPL correspondence as a ghost predicate, and put `invariant I` on the loop if the program has one. The relation-to-program-variable proof would be an ordinary `assert` or lemma; Verus cannot check that an English parser produced the intended `L`.

## technique 2: imperative and conditional natural-language commands

when to use it

Use this for requirements that change state, such as “Increment the balance,” or conditional commands. NHL deliberately restricts imperatives to those that specify operations on program state; the paper says “Of course we are unable to model general imperative statements such as: you may increment the balance.” (Section 2.2, PDF p. 3.)

steps for an imperative

1. Give the command a before/after logical relation with a `post` function, which maps elements to their after-state. The paper defines `increment = λf · ∀x · f(post(x)) = f(x) + 1` (Section 2.2, PDF p. 3).
2. Define `R` for the before-state and `R′` for the after-state. `R′` is obtained by replacing the logical variable `x` by `post(x)` in the body of `R`; for the example, `R′ ≜ ∃x · balance(post(x)) = _balance` (Equation 12, PDF p. 3).
3. Prove `{L ∧ R} S {L ∧ R′}` (Equation 13, PDF p. 3). The paper says this is simpler than the invariant case “because post-condition and pre-condition use different LFPL relations”.

steps for a conditional imperative

1. Parse the conditional part, with logical form `E`, and the imperative part, with logical form `L`, separately (Section 2.3, PDF p. 3).
2. Prove `{L ∧ R ∧ E} S {L ∧ R′}` (Equation 19, PDF p. 3). The paper says the imperative proof approach extends to conditional imperatives “in a straightforward manner”; Figure 3 illustrates the rule.

Inference: this rule makes the command's logical form `L` a proof obligation only under the stated condition `E` in the precondition. Inference: in Verus, `post` is naturally a ghost snapshot represented by `old(...)` in an `ensures` clause; the executable command remains ordinary Rust. The method's two-state logical relation is a useful pattern for API contracts, but the paper provides no Rust or Verus implementation.

## technique 3: pre/post declaratives and domain knowledge

For a requirement with separate precondition and postcondition (example: “IF: the balance is greater than 0 THEN AFTER: balance must be remain non-negative”), parse the precondition `L` and postcondition `L′`, and prove `{L ∧ R} S {L′ ∧ R′}` (Equation 21, PDF p. 4). The paper calls this case “simpler than the imperative specification”; it does not give a reason.

NHL can reuse proofs through domain knowledge (Section 2.5, PDF p. 4). If the invariant `∀x · valueof(x) > 0` has already been proved for a program `S` with the relation `∃x · valueof(x) = _balance`, and the domain knowledge `∀x · balance(x) = valueof(x)` is available, the paper says “We may use this and our previous proof to now infer, that program S satisfies new invariant in Equation 25, without having to go through the proof again.” (Equation 25 is `∀x · balance(x) > 0`.) The paper also notes that ontological assertions that A isa B can be expressed as `∀x · A(x) ⇒ B(x)` (Equation 27) and that bringing such knowledge into the reasoning “is likely to be quite beneficial”. The paper gives no formal derivation or soundness proof for this reuse.

Inference: Verus can encode domain facts as reusable `proof fn` lemmas with `ensures`, then invoke them at call sites. Such lemmas must be proof-only; calling a `proof fn` at runtime would not implement the command.

## technique 4: parser-error guard by paraphrase

The highest-probability semantic parse can be wrong. NHL therefore defines a function `N` from logical forms to natural language and asks the user to confirm the paraphrase. The paper states: “Given a natural language sentence S input by a user and if its logical form generated by a semantic parser is S, then we could ask back the user: Did you mean: N(S)?” (Section 2.6, PDF p. 4.) If the answer is no, the system “could show the N-mappings of other probable logical forms (if available) for user to choose from”; the user's selection may serve as a label for retraining the model. If the user is unable to choose, “the system may prompt the user to rephrase the specification (perhaps as simpler sentences)”.

This guard is a product workflow rather than a proof rule. Its assumption is that `N` generates a consistent and understandable paraphrase; the paper calls this “usually a simpler problem than the semantic parsing itself” and points to semantic parsing based on synchronous context-free grammars as a way to obtain `N` by inverting the learnt grammar. The paper reports no error rates.

## what is proved, trusted, and missing

The paper proposes proof rules and gives small worked examples, but reports no implementation, benchmark, parser accuracy, formal soundness proof, or mechanization. Its conclusion lists as future work: “We intend to further validate the NHL framework with more elaborate examples and case studies. Exploring the use of domain knowledge to aid reasoning, investigating approaches for a formal soundess proof, and mechanization of the framework are other lines of future work.” (Section 4, PDF p. 6.) The paper does not cover general imperative modality, and does not prove parser correctness.

Inference: the components one would have to trust in an NHL pipeline are the semantic parser, the λ-calculus meanings of words, the LFPL relations, any domain facts, the Hoare-rule application, and the user's acceptance of the paraphrase.

## techniques for the catalog

- LFPL invariant bridge: relate a parsed logical form to program variables, eliminate the relation, and prove the resulting strongest invariant with Hoare rules
- before/after imperative relation: model state-changing commands with `post` and prove `{L ∧ R} S {L ∧ R′}`
- conditional imperative rule: include the parsed condition in the precondition before applying the command proof
- domain-knowledge reuse: transfer an existing proof to a new invariant through a domain-knowledge equality or implication
- parser paraphrase guard: translate candidate logical forms back to natural language and require user confirmation or rephrasing
