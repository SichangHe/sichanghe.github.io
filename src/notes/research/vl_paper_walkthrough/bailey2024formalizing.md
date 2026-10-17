# Formalizing Soundness Proofs of Linear PCP SNARKs
(authored by agents unless marked 🧑)
Tag: `bailey2024formalizing`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/bailey)

## objective and formal scope

This paper builds a Lean framework for machine-checked knowledge-soundness proofs of pairing-based linear PCP SNARKs in the algebraic group model (AGM). Knowledge soundness requires an efficient extractor to recover a valid witness from an accepting algebraic prover’s coefficients, except with negligible probability (Definition 3, p. 1493). The formal predicate checks an algebraic implication: verifier polynomial equalities imply that the extracted witness satisfies the relation. The paper explains the probabilistic reduction informally and explicitly leaves its Schwartz–Zippel details outside the formalization (Section 2.3, pp. 1493–1494; Section 7, p. 1503).

> “To increase the rigor of these proofs, we create a formal framework in the Lean theorem prover for representing a widespread subclass of SNARKs based on linear PCPs.” (abstract, p. 1489)

> “We automate a procedure to decide the soundness of straightforward linear PCPs SNARK schemes.” (Section 1.1, p. 1489)

The authors identify six schemes—GGPR, Pinocchio, Groth ’16, Baghery et al., Lipmaa, and BabySNARK—and formalize their soundness. They call the reusable subclass “Straightforward linear PCP SNARK schemes”; every linear PCP SNARK known to the authors belongs to it (Section 1.1, pp. 1489–1490). All six proofs were developed in Lean 3; only Baghery et al. and Lipmaa had soundness proofs translated to Lean 4 at publication (Section 6, Table 2, pp. 1501–1502).

Lean proofs are checked by the Lean kernel; the development uses mathlib’s finite-field and multivariate-polynomial structures and proof-producing simplification tactics (Section 1.2, p. 1490). In the AGM, every proof element is a linear combination of structured-reference-string (SRS) group elements. Toxic-waste samples are formal variables, not values known to the prover.

Inference: The directly transferable VL lesson is the separation of a generic protocol structure, an extractor, and a soundness predicate. In Verus, this can be represented with `spec fn` predicates over abstract field/group values and `proof fn` proofs that verification implies the extracted relation. The cryptographic algebra would remain an explicit model or trusted primitive unless separately formalized.

## generic SNARK representation and soundness predicate

The formalization represents SRS components as multivariate polynomials in toxic-waste variables, proof elements as parameterized linear combinations, verifier checks as polynomial equalities, and the NP relation as a predicate on statements and witnesses (Section 2.3, pp. 1493–1494). Soundness is defined by an extractor that receives the prover’s AGM coefficients:

> “We say that if the satisfaction of the multivariate polynomial equalities corresponding to the verifier checks implies that the extracted witness satisfies the predicate, then the system is sound with respect to that predicate and extractor.” (Section 2.3, p. 1494)

The Lean definition `AGMProofSystemInstantiation.soundness` quantifies over every statement and prover, assumes `P.verify prover stmt`, and concludes `relation stmt (extractor prover)` (Figure 3, p. 1494). The paper’s generic construction steps are (Section 2.3, p. 1494):

1. identify toxic-waste elements
2. model SRS elements as polynomials over those elements
3. model proof elements as parameterized linear combinations of SRS elements
4. formalize verifier equations over proof and SRS elements
5. formalize the NP-relation satisfaction condition
6. prove that verifier equations imply that the extractor returns a valid witness

Inference: A Verus implementation can make the relation a `spec fn`, have an executable verifier return a Boolean or result, and prove a `proof fn` implication from successful verification to the relation. The paper’s Lean code cannot be copied as Rust syntax; the decomposition is the reusable part.

## automated polynomial proof procedure

The authors demonstrate automation on a toy SNARK whose displayed relation is (A y=z) or (B x=z), with toxic-waste samples α and β. The trusted setup publishes group elements with exponents α and β; the prover emits a proof element with exponent Aα+Bβ; the verifier checks equality of two pairings (Section 3.1, pp. 1494–1495). The prose introducing the relation reverses x and y relative to the displayed relation; the coefficient equations in Section 3.2 support the displayed relation.

The proof procedure follows Section 3.2 (pp. 1495–1497) and Table 1 (p. 1496):

1. unfold the soundness predicate and use Lean `intro` to expose the verifier equality as a hypothesis
2. normalize products and sums into a multivariate polynomial with `simp` and distributivity lemmas
3. apply `congr_arg` to take coefficients of selected monomials (α², αβ, β²)
4. distribute coefficient extraction with `coeff_add`
5. reduce coefficients of monomials using `monomial_mul` and `coeff_monomial`, yielding conditional equalities
6. decide the monomial-equality conditionals by simplification
7. recursively simplify the resulting equations using the integral-domain rule that a zero product has a zero factor, split the resulting disjunctions, and solve remaining goals by hand or with `polyrith`

The core recursive operation is approximately 13 lines of Lean and repeatedly simplifies, splits disjunctions, and recurses until the goal is solved or no progress remains (Section 3.2.7, pp. 1497–1498; Figure 4, p. 1498). The key mathematical step is that equal multivariate polynomials have equal coefficients; the coefficient equations constrain the extractor’s values.

Inference: A possible Verus analogue is a sequence of proof functions for normalization, coefficient extraction, and field identities. Any external algebraic certificate would need a verified checker to avoid trusting the certificate producer. The paper does not implement or evaluate this transfer.

## why “straightforward” schemes are decidable

The procedure exploits three stated regularities and their consequence for scheme-level abstraction (Section 4, pp. 1497–1499):

- one high-degree variable: only one toxic-waste element appears at unbounded degree; `optionEquivRight` moves its polynomials into the coefficient ring, leaving bounded-degree multivariate polynomials
- extractor is a projection: each witness component is one proof coefficient, so the extractor is linear in prover coefficients
- SRS components are regular and fixed over circuits: collections share a uniform polynomial shape, allowing instance-specific sums to be treated as atoms
- scheme-level abstraction: factoring uniform components makes the ideal-membership problems depend on the scheme description rather than the circuit size

The paper’s theorem states that for the set of cryptographically secure pairings and all circuit instances, a straightforward linear PCP SNARK’s verification-to-extraction proposition is decidable (Theorem 1, p. 1499). Gröbner-basis methods are technically super-exponential, but the authors report that their scheme-level procedure terminates in reasonable practical time (Section 4, p. 1499).

Inference: For VL, the design principle is to choose proof APIs whose algebraic obligations have bounded, reusable normal forms. A Rust verifier can expose uniform polynomial components as ghost values and prove one scheme-level theorem instead of regenerating a proof for every circuit instance.

## handling awkward algebra and flawed source proofs

Groth ’16 uses denominators γ and δ, yielding Laurent polynomials that mathlib’s multivariate-polynomial type does not support. The authors multiply every SRS element by γδ, prove that this transformation preserves soundness, and formalize the transformed system (Section 5.2, pp. 1500–1501).

The formalization also found a typo and ambiguous reasoning in published proofs. The paper says:

> “The process of creating these formalizations was not always smooth, in part because there are a few places in which the arguments presented in the papers are misleading.” (Section 5, p. 1499)

For Groth ’16, the authors identify a typo in which A_t is written instead of A_h, and resolve an ambiguous “terms in” argument by explicitly extracting coefficients and doing case analysis on whether A(x)=0 (Section 5.2, p. 1501). For Pinocchio, attempting to prove that the first three checks force proof elements into the intended spans revealed extra terms. The authors use the check involving Z and βγ to finish the span and coefficient argument (Section 5.1, pp. 1499–1500). Their prose calls this the fifth check, although Equation 1 lists it fourth.

Inference: Formalization is therefore an error-discovery technique as well as a proof-production technique. In Verus, normalization lemmas should expose every algebraic side condition instead of relying on an informal cancellation step.

## evidence, denominators, and trusted base

The initial six proofs were developed in Lean 3 from 2021 through mid-2022. The code was ported during 2023, but at the evaluation point only two of six soundness proofs had been translated to Lean 4 (Section 6, pp. 1501–1502). The codebase contains approximately 3,000 lines defining and proving six schemes, 150 lines for the generic AGM structure and soundness property, 80 lines for `integral_domain_tactic` and other simplification tactics, 212 lines for transformations, 419 lines of supporting lemmas, and 53 lines modifying mathlib definitions (Section 6, p. 1502).

Table 2 reports checking times for each scheme in Lean 3 and Lean 4, respectively. GGPR: 140.61 s and no Lean 4 time; Pinocchio: 342.89 s and no Lean 4 time; Groth ’16: 13,741.86 s and no Lean 4 time; Baghery et al.: 552.67 s and 162.74 s; BabySNARK: 74.98 s and no Lean 4 time; Lipmaa: 81.82 s and 144.30 s (Table 2, p. 1502). The paper does not specify hardware or a repetition count. It says, “In each case, the proof time is dominated by the mutual simplification phase, as one might expect, given that this phase requires recursive casework.” (Section 6, p. 1502)

What is proved is the formalized algebraic soundness implication. The paper says, “working in Lean all proofs are checked by the kernel – vetting the proof only requires checking our formalization of the theorem statement” (Section 7, pp. 1502–1503). It explicitly identifies details “such as the Schwartz-Zippel lemma applications” as currently elided (Section 7, p. 1503). Proving soundness of real-world implementations by precisely modeling them is future work, as is extending the framework to polynomial-IOP SNARKs and the random-oracle model (Section 7, p. 1503).

Inference: Applying these results to a deployed verifier requires trusting the kernel and its logical foundations, validating the protocol and theorem statements, accepting the cryptographic assumptions, and establishing that the implementation matches the model. The formal results do not establish zero knowledge, completeness, or implementation side-channel resistance.

Inference: The threat to agent-written verified Rust is high for cryptographic verifier code if a product treats paper proofs as sufficient: this work shows that published soundness arguments can contain typos and missing span conditions. VL should reuse the generic verification-implies-extracted-relation shape and insist on machine-checked algebraic obligations, but it should not claim Lean proof artifacts as Verus proofs.

Inference: Existing formal SNARK work already covers six prominent linear PCP constructions and a reusable decision procedure. A new VL effort should focus on connecting a verified Rust implementation to the formal protocol model, or on producing independently checkable certificates for the algebraic simplification, rather than re-formalizing the same schemes without an integration target.

## techniques for the catalog

- generic AGM structure — represent SRS, proof elements, verifier equations, relation, and extractor in one parameterized formal object
- soundness predicate — quantify over statements and provers and require verification to imply the extracted witness relation
- polynomial normalization — use simplification lemmas to distribute and normalize multivariate field expressions
- coefficient isolation — apply coefficient functions to verifier equalities and derive equations for each monomial
- monomial reduction — simplify monomial products and coefficient conditionals until only field equations remain
- recursive integral-domain tactic — repeatedly simplify, split disjunctions, and recurse over algebraic proof obligations
- Gröbner-basis closure — discharge ideal-membership consequences with `polyrith` after reducing scheme equations
- straightforwardness abstraction — isolate the one unbounded-degree variable in the coefficient ring, use projection extractors, and abstract uniform SRS components
- soundness-preserving transformation — multiply Groth ’16 SRS elements by denominators to replace unsupported Laurent polynomials
- formalization audit — use kernel-checked proofs to expose typos, missing span arguments, and ambiguous coefficient reasoning
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The convenience of this is that a projection function is always linear, and can therefore be interpreted as a polynomial function in the prover coefficients which make up its inputs."): checked all paper text, quotations, numbers, section and page references, and technique steps; corrected references, the Lean 4 porting scope, the Groth ’16 typo, the Pinocchio check identification, and the formalization’s limits; replaced the link with the publisher page printed in the paper; did not inspect the code artifact, reproduce timings, or validate the proposed Verus transfer.
