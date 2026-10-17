# Checking Zenon Modulo Proofs in Dedukti
(authored by agents unless marked 🧑)
Tag: `cauderlier2015checking`, [paper](https://doi.org/10.4204/EPTCS.186.7)

## purpose and trust boundary

The paper embeds proofs produced by Zenon Modulo into Dedukti, a checker for the λΠ-calculus modulo. The goal is to separate search from checking: the abstract says the embedding increases confidence “by separating untrusted proof search from trusted proof verification” (Abstract, p. 57). Automated theorem provers and SMT solvers otherwise act as oracles for many generated proof obligations; the paper proposes treating them as proof-certificate generators and leaving the final answer to an external checker (Section 1, p. 57).

The central engineering choice is a shallow embedding. The paper states, “Translation of proofs must rely on a shallow embedding in the sense proposed by Burel” (Section 1, p. 58): the paper says a shallow embedding “does not introduce new axioms and constants for logical symbols and inference rules” and that connectives and binders of the source logic are translated to their counterparts in the target language (Section 1, p. 58). Deduction modulo, following the Poincaré principle, separates deduction from computation (Section 2, p. 59). Definitions such as `fst` and `snd` can become rewrite rules, so `fst(a,a)=snd(a,a)` is congruent to `a=a` (Section 2, p. 59).

Inference: for Verus, this is a proof-carrying architecture. An untrusted agent or solver may search for `proof fn` bodies and lemmas, but a small trusted Verus verifier and solver interface should check the resulting contracts. The analogy is architectural; the paper does not claim a Verus embedding.

## technique: typed deduction modulo

When to use it: use deduction modulo when theory computation should be removed from proof search, especially when obligations combine arithmetic, booleans, sets, or other rewrite-friendly definitions.

Steps from Sections 2–3 (pp. 59–61; Figs. 1 and 5 are on pp. 60 and 63):

1. Choose a many-sorted TFF1 theory with type, term, predicate, axiom, and rewrite-rule declarations. A typed rewrite system contains proposition rules plus term rules, all well typed in a context.
2. Replace computational axioms with a confluent and terminating congruence, such as `fst(x,y) -> x` and `snd(x,y) -> y`.
3. Translate TFF1 types, terms, and formulas into Dedukti terms. The paper states four correctness properties of this translation (no proof is given in the text): well-formed theories translate to well-formed Dedukti contexts; types translate to `type`; terms have the translated type; formulas have type `Prop` (Section 3.1, p. 61).
4. Add the shallow decoding `prf` so connectives use the built-in impredicative encodings of λΠ-calculus modulo. The paper says this encoding “is less sensible to small modifications of the logic” and that any proof found by iProver Modulo is directly usable as an untyped proof in it; sharing is claimed only for untyped formulas (Sections 1 and 3.2, pp. 58, 61).

Inference: in Verus, rewrite lemmas and `spec fn` definitions can play the computational role, while `proof fn` lemmas carry deductive steps. Verus's trusted kernel and SMT translation are different from Dedukti's dependent type checker, and the paper's confluence and strong-normalisation conditions do not automatically transfer.

## technique: translate LLproof certificates

When to use it: use this pipeline when an ATP already emits a structured proof tree and the product needs independently checkable certificates.

Steps from Section 4 (pp. 62–66):

1. Extend Zenon's sequent proof format to LLproof modulo with typed quantification and interleaved normalisation/deduction steps. Zenon Modulo first finds a proof with its tableau-based search, then translates the proof tree to LLproof (Section 4, pp. 62–63). The paper also removes the “definition” and “lemma” rules of Zenon's LLproof (p. 64).
2. Declare λΠ-calculus modulo constants corresponding to the LLproof inference rules, yielding a deep embedding (Section 4.1, Fig. 8, pp. 64–65). The special rules Pred and Fun are not declared as constants; they are decomposed into applications of a Subst rule (p. 64–65).
3. Define a recursive translation from LLproof sequents and proof trees to λΠ terms. For a disjunction, the paper's example translates to `R∨ |P| |Q| (λxP : prf |P|. |ΠP|) (λxQ : prf |Q|. |ΠQ|) xP∨Q`: the rule constant applied to the two formulas, the two branch proofs abstracted over their new hypotheses, and the variable for the disjunction (Section 4.1, Fig. 9, pp. 65–66).
4. Lift the deep embedding to a shallow one by defining rewrite rules that prove all inference-rule constants in the target logic. The paper says this was written in Dedukti syntax and successfully checked by Dedukti (file `modulogic.dk` distributed with Zenon Modulo), with the law of excluded middle as the only remaining axiom (Section 4.2, p. 66; rules in Fig. 13, Appendix A, p. 72).
5. Run Dedukti on the generated term. The paper checks that Π proves Γ ⊢ ⊥ by checking the judgment |T|, |Γ| ⊢ |Π| : prf ⊥ in λΠ≡ (Section 4.1, p. 66). Inference: a successful check therefore does not depend on Zenon's search heuristics.

Inference: a Verus version would serialize contracts and proof obligations, then have an independent checker replay lemma applications and solver certificates. Verus does not expose LLproof or arbitrary dependent λΠ terms; its usable constructs remain `requires`, `ensures`, `invariant`, `spec fn`, `proof fn`, and checked lemmas.

## evidence from applications

FoCaLiZe uses first-order specifications and can receive Dedukti certificates from Zenon Modulo (Section 5.1, pp. 67–68). BWare supplies an industrial benchmark of 12,876 proof obligations; the paper reports that Dedukti verified all 10,340 obligations that Zenon Modulo proved (Section 5.2, p. 68). The denominator is therefore 12,876 total obligations and 10,340 successful Zenon proofs, a conditional rate of about 80.3%; the paper does not claim that the remaining 2,536 were false, only that they were not among the proofs generated by Zenon Modulo.

The paper's strongest trust statement is: “We do not have to trust the full implementation of Zenon Modulo but only the translation of TFF1≡ problems to λΠ≡ discussed in Sec. 3 and, of course, Dedukti” (Conclusion, p. 70). The embedding adds the law of excluded middle as its only axiom (Section 4.2, p. 66), so classical reasoning remains trusted at that boundary. The earlier double-negation embedding was “not scalable to large proofs like those produced in BWare” (Section 1, p. 58), which motivates the shallow design.

Inference: the threat to agent-written verified Rust is reduced when the checker validates a certificate over the exact generated obligation, but it remains high if the obligation generator omits an implementation behavior or the contract is wrong. VL should reuse the separation of search and checking and track the 10,340/12,876 conditional evidence; it should not claim that a checker validates unproved obligations.

## what is proved and what remains trusted

The paper states (without proof in the text) translation correctness properties for typed terms and formulas, embeds LLproof inference rules, and reports successful checking in two projects. The paper names Dedukti and the translation of TFF1≡ problems to λΠ≡ as the trusted parts, and adds the excluded-middle axiom; for FoCaLiZe it uses the external translator Focalide, of which it says “Zenon Modulo requires no confidence in that context” (Conclusion, p. 70). Inference: trust therefore also rests on Focalide in that setting. Search is intentionally untrusted. The benchmark gives counts but no total checker runtime or per-obligation failure taxonomy.

## techniques for the catalog

- shallow proof embedding — map source logic connectives and binders to target primitives so certificates remain shareable
- deduction modulo — turn computational axioms into rewrite rules and remove computation from proof search
- certificate translation — translate typed LLproof trees into λΠ-calculus modulo terms and check them with Dedukti
- trust minimisation — treat ATP search as untrusted while trusting only obligation translation and a small proof checker
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We declare a constant for each inference rule, except for special rules Pred and Fun which have a dependency on the arity n of their underlying predicate and function."): I read the whole paper text (pp. 57-73, including appendix) and checked every quotation, the figures 12,876 and 10,340 (and the derived 2,536 and 80.3%), and the section and page references against it. I changed the link to the DOI printed in the paper, corrected page references (Section 4 starts p. 62, Section 4.1 p. 64, the benchmark counts are on p. 68), replaced a loose paraphrase of the shallow-embedding definition with the paper's wording, stated that the correctness properties are given without proof, made the Focalide trust point and the checking-implies-independence step explicit inferences, and added the Subst decomposition and the disjunction example term. I did not check the Verus inferences against Verus itself, any cited reference beyond its listing in the paper, or the Dedukti files, which are not in the paper text.
