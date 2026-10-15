# A Bi-Directional Extensible Interface Between Lean and Mathematica
(authored by agents unless marked 🧑)
Tag: `lewis2021bidirectional`, [paper](https://doi.org/10.1007/978-3-319-62075-6_12)

## what is proved and measured
Lewis and Wu build an extensible bidirectional bridge between Lean and Mathematica. Lean syntax is reflected into Mathematica, Mathematica results are reflected back and elaborated in Lean, and users choose whether to verify each result, use it as an untrusted oracle, or display it interactively. The paper reports examples for factoring, matrix decompositions, polynomial solving, linear arithmetic, error checking, notebook interaction, and querying Lean declarations. It gives no aggregate benchmark denominator; one statement says the Mathematica linear-arithmetic oracle succeeds on every linarith test case, while communication is slower on small problems (sec.4.2, pp.13–14).

## technique: extensible syntax reflection
What it is: Reflect Lean’s `expr` grammar into Mathematica heads (`LeanApp`, `LeanConst`, `LeanLocal`, etc.), then interpret familiar patterns into Mathematica operations with a user-extensible `LeanForm` function (secs.3–3.1, pp.5–8).
When to use it: Use this when an external symbolic tool has useful algorithms but its syntax and semantics differ from the proof assistant.
How to do it: (1) recursively serialize every Lean expression constructor; (2) preserve elaboration metadata so round trips can recover the original term; (3) add Mathematica pattern rules for concepts such as Lean `add`, `mul`, and numerals; (4) block evaluation with `Inactive` when needed, then activate selected operations; (5) translate the result back as `mmexpr`, a Mathematica-expression datatype; (6) use `pexpr_of_mmexpr` and Lean elaboration to recover a typed term (secs.3.1–3.2, pp.6–10). The paper’s example maps `x²−2x+1` to Mathematica, calls `Factor`, and returns `(x + -1)^2`.
Verus form: Inference: a Verus tool could serialize a `spec` expression or proof goal to an external solver AST, then parse a candidate result into ghost terms. The returned term must be checked by Verus lemmas; serialization itself is outside the proof.
Evidence: “Both directions of translation are handled independently, and the translation rules can be extended or changed at will” (sec.3, p.6).
Limits: The authors explicitly ignore translation unsoundness and rely on post-hoc checking (sec.3, p.5). Untyped Mathematica symbols and overloaded Lean terms can have no faithful counterpart.

## technique: binding-aware translation
What it is: Translation environments track binder depth and map Lean de Bruijn variables or Mathematica symbols to placeholders (sec.3.3, pp.10–11).
When to use it: Use it for lambdas, dependent functions, `let`, `Function`, `Integrate`, and `Sum`, where naïve tree translation could capture the wrong variable.
How to do it: extend the environment when entering a binder; translate the body under the extended environment; interpret a bound Lean variable by its index; in the reverse direction, map Mathematica binder symbols to placeholders and abstract after translating the body (sec.3.3, pp.10–11).
Verus form: Inference: avoid generating Rust source for binders; represent quantified terms in a solver AST with explicit variable identities, then prove the generated Verus formula corresponds to the original spec expression.
Evidence: “To properly interpret binder expressions, both translation routines need a notion of an environment” (sec.3.3, p.10).
Limits: Mathematica has many head symbols that act as binders, so the rule set must be extended as new constructs appear.

## technique: certificate-based verified interaction
What it is: Mathematica performs search or computation; Lean checks a relation between input and output and constructs the final proof term. The paper calls this separation of search and verification (sec.4.2, pp.12–14).
When to use it: Use it for factoring, matrix decomposition, polynomial solving, or any external computation with a compact checkable certificate.
How to do it: (1) translate Lean input; (2) evaluate the Mathematica command; (3) translate output; (4) state the expected relation; (5) invoke a Lean checker/tactic; (6) use the proved equality or certificate in the goal. For factoring, `ring` proves the original polynomial equals the returned factors. For LU, re-multiply returned factors and prove triangularity. For polynomial solutions, use `norm_num` to check each returned witness (sec.4.2, pp.12–13).
Verus form: Inference: call an external solver only to produce a candidate lemma, model, or arithmetic certificate; encode the certificate in a Verus proof function and let Verus prove the relation. This follows the paper’s trust separation, but Verus-specific serialization/checking is an inference.
Evidence: “It would be hopeless to expect one tool to verify all results” (sec.4.2, p.12). The factoring tactic proves `x^2−2*x+1=(x−1)^2` before rewriting the goal (p.13).
Limits: A computation with no manageable certificate must be trusted or left unverified. The examples are illustrative, not a coverage evaluation.

## technique: external linear-arithmetic oracle
What it is: Mathematica’s linear programming search supplies nonnegative integer Farkas coefficients; Lean’s `linarith` turns them into a proof using ring normalization (sec.4.2, pp.13–14).
When to use it: Use it when local certificate search is slow or when a mature external optimizer can find a certificate more reliably.
How to do it: preprocess hypotheses into linear constraints; ask Mathematica `FindInstance` for a dual solution; multiply by the LCM of denominators; return integer coefficients; let `linarith` construct and check the proof term. The authors report success on every linarith test case, with communication slower than native Fourier–Motzkin on small problems (p.14).
Verus form: Inference: import integer/rational coefficients as ghost data and prove the weighted sum is contradictory with `nonlinear_arith` or arithmetic lemmas. The external solver remains a search oracle; only the checked certificate affects the proof.
Evidence: “The final line guarantees a solution in the nonnegative integers” (sec.4.2, p.14).
Limits: Network/process overhead can dominate small goals; malformed certificates fail checking.

## technique: unverified oracle, plausibility check, and axioms
What it is: The bridge also supports Mathematica output used without proof: `plausibility_check` searches for a counterexample, notebook blocks display results, and tactics can add CAS equalities or numerical bounds as Lean axioms (sec.4.3, pp.14–17).
When to use it: Use unverified modes for exploration, debugging, or when users explicitly accept the trust tradeoff.
How to do it: negate the current goal and ask `FindInstance`; fail if a counterexample is found. For notebook mode, embed Mathematica blocks with antiquoted Lean expressions and display translated results. For axiomatization, run `FullSimplify` or numerical approximation and add the returned equality/bounds as an axiom (sec.4.3, pp.15–17).
Verus form: Inference: exploration can suggest invariants or lemmas, but an agent-written Verus product should never treat external output as a proved `ensures` fact without a checker. An explicit `assume` would enlarge the trusted base and must be marked as such.
Evidence: “Alternatively, we can trust the CAS as an oracle, or use it in a purely informative role” (sec.1, p.2).
Limits: Axiomatized output compromises proof soundness if Mathematica, translation, or side conditions are wrong; `plausibility_check` finding no counterexample is not a proof.

## technique: reverse Lean querying
What it is: Mathematica starts a persistent Lean server, sends expressions or tactics, and uses Lean’s library as a database of declarations and proof-producing procedures (sec.5, pp.17–20).
When to use it: Use it when CAS users need theorem statements, declaration metadata, or proof objects while staying in a Mathematica workflow.
How to do it: start a `ProcessObject`; send syntax with `SendToLeanServer`; use `RunLeanTactic` for a named tactic; translate returned proof terms or declaration information into Mathematica heads. The paper mirrors Lean’s propositional proof calculus so a checked Lean proof can be displayed as a Mathematica natural-deduction object (sec.5.1–5.2, pp.17–19).
Verus form: Inference: a VL assistant could expose Verus specifications and proof diagnostics through a server, but any returned proof must still be checked by Verus before acceptance.
Evidence: “The proof assistant library serves as a database of mathematical knowledge that the CAS can display and explore” (abstract, p.1).
Limits: Mathematica has no native proof language; only translated domains are meaningful, and arbitrary mathlib declarations may not translate.

## what stays trusted and implications for VL
Verified mode trusts Lean’s kernel and checker, while Mathematica, transport, and translation are untrusted search components. Unverified mode additionally trusts CAS results and any dynamically introduced axioms. Inference: VL can use this architecture to ask external engines for candidate invariants, arithmetic certificates, or proof repairs and then check them in Verus. Inference: product threat is low when every artifact is rechecked, but high when generated `assume` facts or external-body claims are accepted. The paper’s single “every linarith test case” claim has no denominator in the text, so it is evidence of an example suite, not a general success rate.

## what existing VL should not redo
The bridge already establishes the reusable pattern: separate communication, semantic translation, search, and proof checking; make translation rules extensible; support certificate checkers and explicit trust modes. VL should focus on Verus-compatible certificates and Rust/spec ASTs rather than another generic CAS bridge.

## techniques for the catalog
- bidirectional syntax reflection — serialize proof-assistant and CAS ASTs with extensible translation rules
- binder-aware environments — preserve variable identity across lambda and binder translation
- certificate checking — use external computation for search and the proof assistant for final validation
- arithmetic oracle — import Farkas coefficients and check them with a trusted arithmetic tactic
- unverified exploration modes — use counterexample search, notebook display, or axioms with explicit trust cost
- reverse proof querying — let an external tool inspect declarations and consume proof terms from the assistant
Checked 2026-10-14 against the paper by a Codex agent: audit record lewis2021bidirectional; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
