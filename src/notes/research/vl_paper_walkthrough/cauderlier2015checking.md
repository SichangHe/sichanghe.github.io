# Checking Zenon Modulo Proofs in Dedukti
(authored by agents unless marked 🧑)
Tag: `cauderlier2015checking`, [paper](http://arxiv.org/abs/1507.08719v1)

## purpose and trust boundary

The paper embeds proofs produced by Zenon Modulo into Dedukti, a checker for the λΠ-calculus modulo. The goal is to separate search from checking: the abstract says the embedding increases confidence “by separating untrusted proof search from trusted proof verification” (Abstract, p. 57). Automated theorem provers and SMT solvers otherwise act as oracles for many generated proof obligations; the paper proposes treating them as proof-certificate generators and leaving the final answer to an external checker (Section 1, p. 57).

The central engineering choice is a shallow embedding. The paper states, “Translation of proofs must rely on a shallow embedding in the sense proposed by Burel” (Section 1, p. 58): logical connectives and binders are mapped to corresponding target constructs, rather than introducing fresh axioms and constants for every inference rule. Dedukti's rewrite-capable λΠ-calculus makes computation and deduction distinct. Axioms such as definitions of `fst` and `snd` can become rewrite rules, so `fst(a,a)=snd(a,a)` computes to `a=a` (Section 2, p. 59).

Inference: for Verus, this is a proof-carrying architecture. An untrusted agent or solver may search for `proof fn` bodies and lemmas, but a small trusted Verus verifier and solver interface should check the resulting contracts. The analogy is architectural; the paper does not claim a Verus embedding.

## technique: typed deduction modulo

When to use it: use deduction modulo when theory computation should be removed from proof search, especially when obligations combine arithmetic, booleans, sets, or other rewrite-friendly definitions.

Steps from Sections 2–3 (pp. 59–61):

1. Choose a many-sorted TFF1 theory with type, term, predicate, axiom, and rewrite-rule declarations. A typed rewrite system contains proposition rules plus term rules, all well typed in a context.
2. Replace computational axioms with a confluent and terminating congruence, such as `fst(x,y) -> x` and `snd(x,y) -> y`.
3. Translate TFF1 types, terms, and formulas into Dedukti terms. The paper gives four correctness obligations: well-formed theories translate to well-formed Dedukti contexts; types translate to `type`; terms have the translated type; formulas have type `Prop` (Section 3.1, p. 61).
4. Add the shallow decoding `prf` so connectives use the built-in impredicative encodings of λΠ-calculus modulo. This makes proofs less sensitive to small logic changes and shareable with iProver Modulo (Section 3.2, p. 61).

Inference: in Verus, rewrite lemmas and `spec fn` definitions can play the computational role, while `proof fn` lemmas carry deductive steps. Verus's trusted kernel and SMT translation are different from Dedukti's dependent type checker, and the paper's confluence and strong-normalisation conditions do not automatically transfer.

## technique: translate LLproof certificates

When to use it: use this pipeline when an ATP already emits a structured proof tree and the product needs independently checkable certificates.

Steps from Section 4 (pp. 63–66):

1. Extend Zenon's sequent proof format to LLproof modulo with typed quantification and interleaved normalisation/deduction steps. Zenon Modulo first finds a tableau proof, then translates the tree to LLproof (Section 4, p. 63).
2. Declare λΠ-calculus modulo constants corresponding to the LLproof inference rules, yielding a deep embedding (Section 4.1, p. 65).
3. Define a recursive translation from LLproof sequents and proof trees to λΠ terms. For a disjunction, the translated term consumes the branch proofs for `P` and `Q` and constructs a proof of the parent sequent (Section 4.1, pp. 65–66).
4. Lift the deep embedding to a shallow one by defining rewrite rules that prove all inference-rule constants in the target logic. The authors report that the `modulogic.dk` file was successfully checked by Dedukti (Section 4.2, p. 66).
5. Run Dedukti on the generated term and theory. A successful check certifies the original obligation independently of Zenon's search heuristics.

Inference: a Verus version would serialize contracts and proof obligations, then have an independent checker replay lemma applications and solver certificates. Verus does not expose LLproof or arbitrary dependent λΠ terms; its usable constructs remain `requires`, `ensures`, `invariant`, `spec fn`, `proof fn`, and checked lemmas.

## evidence from applications

FoCaLiZe uses first-order specifications and can receive Dedukti certificates from Zenon Modulo (Section 5.1, pp. 67–68). BWare supplies an industrial benchmark of 12,876 proof obligations; the paper reports that Dedukti verified all 10,340 obligations that Zenon Modulo proved (Section 5.2, p. 69). The denominator is therefore 12,876 total obligations and 10,340 successful Zenon proofs, a conditional rate of about 80.3%; the paper does not claim that the remaining 2,536 were false, only that they were not among the proofs generated by Zenon Modulo.

The paper's strongest trust statement is: “We do not have to trust the full implementation of Zenon Modulo but only the translation of TFF1≡ problems to λΠ≡ discussed in Sec. 3 and, of course, Dedukti” (Conclusion, p. 70). The embedding adds the law of excluded middle as its only axiom (Section 4.2, p. 66), so classical reasoning remains trusted at that boundary. The earlier double-negation embedding was “not scalable to large proofs like those produced in BWare” (Section 1, p. 58), which motivates the shallow design.

Inference: the threat to agent-written verified Rust is reduced when the checker validates a certificate over the exact generated obligation, but it remains high if the obligation generator omits an implementation behavior or the contract is wrong. VL should reuse the separation of search and checking and track the 10,340/12,876 conditional evidence; it should not claim that a checker validates unproved obligations.

## what is proved and what remains trusted

The paper proves translation correctness properties for typed terms and formulas, embeds LLproof inference rules, and demonstrates successful checking on two projects. Trust remains in Dedukti, the TFF1-to-λΠ translation, the excluded-middle axiom, and (for FoCaLiZe) the external Focalide translator. Search is intentionally untrusted. The benchmark gives counts but no total checker runtime or per-obligation failure taxonomy.

## techniques for the catalog

- shallow proof embedding — map source logic connectives and binders to target primitives so certificates remain shareable
- deduction modulo — turn computational axioms into rewrite rules and remove computation from proof search
- certificate translation — translate typed LLproof trees into λΠ-calculus modulo terms and check them with Dedukti
- trust minimisation — treat ATP search as untrusted while trusting only obligation translation and a small proof checker
Checked 2026-10-14 against the paper by a Codex agent: audit record cauderlier2015checking; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
