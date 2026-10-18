# A Bi-Directional Extensible Interface Between Lean and Mathematica
(authored by agents unless marked 🧑)
Tag: `lewis2021bidirectional`, [paper](https://arxiv.org/abs/2101.07758) (arXiv:2101.07758v1, from the paper text)

## what is proved and measured
Lewis and Wu build an extensible bidirectional bridge between Lean and Mathematica. Lean syntax is reflected into Mathematica, Mathematica results are reflected back and elaborated in Lean, and users choose whether to verify each result, use it as an untrusted oracle, or display it interactively. The paper reports examples for factoring, matrix decompositions, polynomial solving, linear arithmetic, error checking, notebook interaction, and querying Lean declarations. It gives no aggregate benchmark denominator; one statement says the Mathematica linear-arithmetic oracle succeeds on every linarith test case, while communication is slower on small problems (sec.4.2, pp.13–14).

## technique: extensible syntax reflection
What it is: Reflect Lean’s `expr` grammar into Mathematica heads (`LeanApp`, `LeanConst`, `LeanLocal`, etc.), then interpret familiar patterns into Mathematica operations with a user-extensible `LeanForm` function (secs.3–3.1, pp.5–8).
When to use it: Use this when an external symbolic tool has useful algorithms but its syntax and semantics differ from the proof assistant.
How to do it: (1) recursively serialize every Lean expression constructor; (2) strip no information (names, levels, binder info), so that an expression reflected into Mathematica and straight back translates to the original (sec.3.1, p.7); (3) add Mathematica pattern rules for concepts such as Lean `add`, `mul`, and numerals; (4) block evaluation with `Inactive` when needed, then activate selected operations; (5) translate the result back as `mmexpr`, a Mathematica-expression datatype; (6) use `pexpr_of_mmexpr` and Lean elaboration to recover a typed term (secs.3.1–3.2, pp.6–10). The paper’s example maps `x²−2x+1` to Mathematica, calls `Factor`, and returns `(x + -1)^2`.
Verus form: Inference: a Verus tool could serialize a `spec` expression or proof goal to an external solver AST, then parse a candidate result into ghost terms. The returned term must be checked by Verus lemmas; serialization itself is outside the proof.
Evidence: “Both directions of translation are handled independently, and the translation rules can be extended or changed at will” (sec.3, p.6).
Limits: The authors explicitly ignore translation unsoundness and rely on post-hoc checking (sec.3, p.5). The paper says "we should not expect a perfect correspondence between the two" (sec.3, p.5). Inference: untyped Mathematica symbols and Lean terms without a Mathematica analogue may have no faithful counterpart.

## technique: binding-aware translation
What it is: Lean to Mathematica: a list of symbols `env` tracks binder depth, and `LeanVar[i]` is read as the ith entry of `env`. Mathematica to Lean: a translation environment maps symbol names to placeholder variables (`trans_env := rb_map string expr`) (sec.3.3, p.10).
When to use it: Use it for lambdas, dependent functions, `let`, `Function`, `Integrate`, and `Sum`, where Mathematica has no privileged binder: the paper notes that `Function[x, x+x]` is, structurally, "no different from List[x, x+x]" (sec.3.3, p.10).
How to do it: extend the environment when entering a binder; translate the body under the extended environment; interpret a bound Lean variable by its index; in the reverse direction, map Mathematica binder symbols to placeholders and abstract after translating the body (sec.3.3, pp.10–11).
Verus form: Inference: avoid generating Rust source for binders; represent quantified terms in a solver AST with explicit variable identities, then prove the generated Verus formula corresponds to the original spec expression.
Evidence: “To properly interpret binder expressions, both translation routines need a notion of an environment” (sec.3.3, p.10).
Limits: "there are many Mathematica head symbols (e.g. Function, Integrate, Sum) that must be translated this way" (sec.3.3, p.11). Inference: the rule set must grow as new binding constructs appear.

## technique: certificate-based verified interaction
What it is: Mathematica performs search or computation; Lean checks a relation between input and output and constructs the final proof term. The paper calls this "separating search (or computation) and verification" (sec.4.2, p.12).
When to use it: Use it for factoring, matrix decomposition, polynomial solving, or any external computation with a compact checkable certificate.
How to do it: (1) translate Lean input; (2) evaluate the Mathematica command; (3) translate output; (4) state the expected relation; (5) invoke a Lean checker/tactic; (6) use the proved equality or certificate in the goal. For factoring, `ring` proves the original polynomial equals the returned factors. For matrix decompositions, re-multiply the returned factors in Lean; the LU example also states `is_lower_triangular l` and `is_upper_triangular u`. For polynomial solutions, use `norm_num` to check each returned witness (sec.4.2, pp.12–13).
Verus form: Inference: call an external solver only to produce a candidate lemma, model, or arithmetic certificate; encode the certificate in a Verus proof function and let Verus prove the relation. This follows the paper’s trust separation, but Verus-specific serialization/checking is an inference.
Evidence: “It would be hopeless to expect one tool to verify all results” (sec.4.2, p.12). The factoring tactic `factor` adds a hypothesis asserting `x^2 - 2*x + 1 = (x + -1)^2`, proved by `ring` (`eq_by_ring`), which the example then rewrites with (p.12).
Limits: the paper says "These examples are not meant to be exhaustive" (sec.4.2, p.12), so they are illustrative, not a coverage evaluation. Inference: a computation with no manageable certificate must be trusted or left unverified.

## technique: external linear-arithmetic oracle
What it is: Mathematica’s `FindInstance` solves the dual linear-programming problem and supplies nonnegative integer Farkas coefficients; Lean’s `linarith` turns them into a proof using ring normalization. The paper says the Lean side is 20 lines (sec.4.2, pp.13–14).
When to use it: The paper says a more efficient algorithm "can be desirable on large problems" (sec.4.2, p.14).
How to do it: preprocess hypotheses into linear constraints; ask Mathematica `FindInstance` for a dual solution; multiply by the LCM of denominators; return integer coefficients; let `linarith` construct and check the proof term. The authors report that "communication overhead makes this approach slightly slower than the native Fourier–Motzkin solver on small problems" while the oracle "succeeds on every linarith test case" (p.14).
Verus form: Inference: import integer/rational coefficients as ghost data and prove the weighted sum is contradictory with `nonlinear_arith` or arithmetic lemmas. The external solver remains a search oracle; only the checked certificate affects the proof.
Evidence: “The final line guarantees a solution in the nonnegative integers” (sec.4.2, p.14).
Limits: the paper reports only a slight slowdown on small problems from communication overhead (p.14). Inference: malformed certificates would fail `linarith`'s checking.

## technique: unverified oracle, plausibility check, and axioms
What it is: The bridge also supports Mathematica output used without proof: `plausibility_check` searches for a counterexample, notebook blocks display results, and tactics can add CAS equalities or numerical bounds as Lean axioms (sec.4.3, pp.14–16).
When to use it: Use unverified modes for exploration, debugging, or when users explicitly accept the trust tradeoff.
How to do it: ask `FindInstance` for an assignment satisfying the local hypotheses and the negation of the goal; `plausibility_check` fails if one is found. For notebook mode, embed Mathematica blocks with antiquoted Lean expressions and display translated results. For axiomatization, run `FullSimplify` (`prove_by_full_simp`, which checks the two sides are equal) or numerical approximation (`approx`) and add the returned equality/bounds as an axiom (sec.4.3, pp.14–16).
Verus form: Inference: exploration can suggest invariants or lemmas, but an agent-written Verus product should never treat external output as a proved `ensures` fact without a checker. An explicit `assume` would enlarge the trusted base and must be marked as such.
Evidence: “Alternatively, we can trust the CAS as an oracle, or use it in a purely informative role” (sec.1, p.2).
Limits: the paper applies axiomatization "when we are not concerned about complete verification" (sec.4.3, p.16). Inference: axiomatized output compromises soundness if Mathematica or the translation is wrong, and `plausibility_check` finding no counterexample is not a proof.

## technique: reverse Lean querying
What it is: A Mathematica notebook starts a Lean server process via `StartProcess`, sends expressions or tactics, and uses Lean’s library as a database of declarations and proof-producing procedures (sec.5, pp.17–21).
When to use it: Use it when CAS users need theorem statements, declaration metadata, or proof objects while staying in a Mathematica workflow.
How to do it: start a `ProcessObject`; send syntax with `SendToLeanServer`; use `RunLeanTactic` for a named tactic; `GetLeanInfo` shows a declaration’s category, type and documentation, and `GetLeanProof` shows `#explode` output as an expandable object; returned proof terms are translated into Mathematica heads. The paper mirrors Lean’s propositional proof calculus so a checked Lean proof can be displayed as a Mathematica natural-deduction object (sec.5.1–5.2, pp.17–19).
Verus form:

## techniques for the catalog
- bidirectional syntax reflection — serialize proof-assistant and CAS ASTs with extensible translation rules
- binder-aware environments — preserve variable identity across lambda and binder translation
- certificate checking — use external computation for search and the proof assistant for final validation
- arithmetic oracle — import Farkas coefficients and check them with a trusted arithmetic tactic
- unverified exploration modes — use counterexample search, notebook display, or axioms with explicit trust cost
- reverse proof querying — let an external tool inspect declarations and consume proof terms from the assistant
