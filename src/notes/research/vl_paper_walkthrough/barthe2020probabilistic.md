# A Probabilistic Separation Logic
(authored by agents unless marked 🧑)
Tag: `barthe2020probabilistic`, [paper](http://arxiv.org/abs/1907.10708v4)

## purpose and model
The paper introduces PSL, a program logic for probabilistic programs in which separating conjunction represents probabilistic independence. The abstract states: “We propose a probabilistic separation logic PSL, where separation models probabilistic independence.” It gives a resource semantics over deterministic memories paired with distributions of randomized memories. A configuration combines when deterministic memories agree on overlap and randomized-variable domains are disjoint; the randomized parts combine by the product distribution. The central assertion `ϕ * ψ` therefore means that the state can be split into independent factors satisfying `ϕ` and `ψ` (Section 3.2, pp. 7–9).

The motivation is operational: fresh samples create independent variables, local updates preserve independence from untouched variables, and conditioning on an independent guard preserves facts about the other variables. The authors state: “Independence is preserved under local modifications.” The quotation is from Section 1.1 (p. 2). The authors also show that independence can be lost after conditioning: in Example 1 (Section 4.3, p. 11), independent fair bits `x` and `y` become correlated after conditioning on `z = x ∨ y` being true.

## technique 1: encode independence as probabilistic BI

What it is. Start with BI formulas (`∧`, `∨`, implication, separating conjunction `*`, and magic wand), but interpret worlds as program configurations. Atomic assertions include uniformity `U_S[e_r]`, randomized-expression equality `e_r ~ e'_r`, and deterministic equalities/inequalities. The product operation uses independent distribution products. Definition 4 interprets `U_S[e_r]` as assigning probability `1/|S|` to every value in a finite set; `e_r ~ e'_r` requires the two expressions to evaluate to the same value on every memory in the support of the distribution.

How to apply it.

1. Classify program state into deterministic variables and randomized variables (Sections 2.2, 2.3 and 3.2).
2. Give each randomized expression a distribution and each assertion a footprint of free variables; validity depends only on the projected distribution over that footprint (Lemma 1, “Restriction”).
3. Use `U[e]` for uniformity and `e ~ e'` for equality of randomized expressions. `D[e]` abbreviates `e ~ e`; it holds exactly when all free variables of `e` are in the configuration's domain (Section 3.2, Definition 4). Inference: `D[e]` is thus a "defined here" assertion, and `D[x] * D[y]` is how the paper writes independence of `x` and `y`.
4. Write `ϕ * ψ` when the memory can be factored into disjoint variable sets whose distributions are independent; use ordinary conjunction when independence is not claimed. The paper explicitly distinguishes `U[x] ∧ U[y]` (possibly correlated) from `U[x] * U[y]` (independent), Section 3.4.
5. Apply the paper's valid axioms for symmetry/transitivity and uniformity (Lemma 3 and Lemma 4), plus Restriction and Extrusion when moving deterministic or footprint facts across `*`.

Inference: in Verus, the corresponding design is a ghost probability model and predicates/specification functions describing finite distributions, with proof lemmas for product, projection, conditioning, and uniformity. Inference: Verus's ordinary ownership separation is about resources and aliases, so it cannot by itself mean probabilistic independence; an explicit probabilistic model and contracts are required. Inference: PSL's BI connectives would be represented by ghost predicates and `proof fn`s rather than new executable Rust syntax.

Evidence and assumptions. The paper states that its probabilistic configurations form a Kripke resource monoid (Definition 3; I found no proof of this in the paper text). It proves Restriction (Lemma 1), Extrusion (Lemma 2) and the axioms of Lemmas 3, 4 and 7 in Appendix B; weakening `|= ϕ * ψ → ϕ ∧ ψ` is stated in Section 3.2 without proof. The semantics assumes countable values and discrete distributions; uniformity is over a nonempty finite set. The logic is intuitionistic under its nontrivial world order, and the authors leave a classical probabilistic BI variant for future work (Section 3.4, Section 7).

## technique 2: use PSL proof rules for randomized code

What it is. PSL judgments have the form `{ϕ} c {ψ}`. Deterministic assignments, sequencing, conditionals, and loops use Hoare-style rules. Randomized assignment uses `RAssn`: if the expression does not mention the destination, `{⊤} x_r ← e_r {x_r ~ e_r}`. Uniform sampling uses `RSamp`: `{⊤} x_r ←$ U_S {U[x_r]}`. The paper states: “Both rules are presented in their ‘local’ form, where the pre-condition is trivial.”

How to apply it.

1. Prove local facts for each random assignment or sample using RAssn or RSamp (Figure 3, p. 11).
2. For deterministic code, use DAssn, DCond, DLoop, sequencing, and the derived DFor rule with the loop invariant substituted at each iteration (Figure 2 and Section 4.2).
3. For a randomized conditional, use RDCond only when the guard's truth value is covered by the precondition; use RCond when the guard is separated from the rest of the precondition as `ϕ * D[b]`, branch proofs preserve the guard, and the postcondition is supported (SP) (Figure 3, Definition 6).
4. Use Weak, True, Conj, Case, and RCase to combine branch proofs. Use Const when a fact mentions no possibly modified variable.
5. Use Frame to carry an independent fact through a command. Check its side conditions (Figure 4, with `RV`, `WV`, `MV` in Definition 7): the frame `η` mentions no variable the command may modify; the postcondition mentions only variables in `T`, read by the command, or written by it; and `ϕ` has a footprint containing `T` and all variables the command reads (discussion on pp. 12–13).
6. Derive global sampling, for example `{ϕ} x_r ←$ U_S {ϕ * U[x_r]}` when `x_r` is absent from `ϕ`, using Frame (Example 4), and global assignment `{ϕ} x_r ← e_r {ϕ ∧ x_r ~ e_r}` using Const (Example 3). Lemma 5 gives a syntactic fragment of SP formulas (`pd`, `x ~ e` for deterministic `e`, `U_S[x]`, and `*` of these); Appendix A gives a variant rule RCondCM that allows branches to modify the guard but proves only a weaker postcondition.

The key guard condition is substantive. The paper explains: “This separation is crucial for ϕ to be soundly used as a pre-condition in each branch.” It gives a counterexample where `D[x]` is not a supported postcondition because it holds in incomparable point distributions; allowing it in RCond would be unsound (Example 2, pp. 11–12; the sentence quoted above is on p. 11).

Inference: a Verus encoding would put executable sampling and branch code in Rust, model random choices with ghost values or a finite sampler contract, and use `requires`/`ensures`, loop `invariant`, `assert`, and `proof fn` lemmas for the PSL rules. Inference: the SP and Frame side conditions must be stated as explicit ghost predicates; Verus will not infer distribution independence from variable non-aliasing. Inference: if randomness comes from an external RNG, its distribution contract remains trusted unless separately verified.

Evidence. Theorem 2 (Section 4.5) states: “If ⊢ {ϕ} c {ψ } is derivable, then it is valid: |= {ϕ} c {ψ }.” The proof is by induction on the derivation (Appendix B), a metatheoretic soundness result for the rules, not an implementation test. Soundness is proved for programs assumed to terminate on all inputs (Section 2.3). The logic is not complete (Section 7): the atomic axioms are not complete (Section 3.3), the rule for randomized conditionals is incomplete, and even for xor it is unclear how to axiomatize uniformity completely.

## technique 3: prove information-theoretic security by uniformity or input independence

What it is. The examples encode a cryptographic protocol as a probabilistic program and prove either that the observer's view is uniform regardless of a secret input (uniformity/non-interference) or that the view is probabilistically independent of the input. The abstract lists private information retrieval, oblivious transfer, secure multi-party addition (a three-party protocol in Section 5.4), and simple oblivious RAM; Section 5.1 also uses the one-time pad as a warm-up.

How to apply it.

1. Model the protocol as a program whose private and public inputs and observer view are explicit variables (Section 1.2).
2. Choose the target: uniformity `U[view]`, or independence between `view` and secret (Definitions 8 and 9, Section 5.1).
3. Annotate every fresh random value with `U`; preserve independent components with Frame and structural rules.
4. For PIR and secure addition, prove each server's/party's observed shares are uniform or independent, then compose the array/tuple facts with separating conjunction. For ORAM, compile read/write instructions to pWhile with ghost code that records leakage in an array, and prove the leakage pairs uniform and independent for every program `P` of length `k` (Section 5.5.2; the paper gives a sketch, details in Appendix C.4).
5. Conclude the security definition from the proved uniformity or independence postcondition. For ORAM, the paper reduces security to showing that the leakages `(ℓ[1].1, ℓ[1].2), …, (ℓ[k].1, ℓ[k].2)` are independently and uniformly distributed in the postcondition of the compiled program, and it proves only this uniformity form (Section 5.5.2).

Caveats stated in the paper. The oblivious-transfer input-independence proof was only attempted: “it does not seem possible to prove this judgment in our logic” (Section 5.3.2); OT is proved by uniformity only, with ghost code for the sender's side (Section 5.3.1). For multi-party addition only the security of secret sharing is proved, not end-to-end security, which the paper says is usually shown by simulation and “does not have a clean translation to our logic” (Section 5.4). The ORAM is a “simple and idealized variant” without bucket overflow (Section 5.5, Discussion).

Inference: in Verus, this pattern can verify a finite-state cryptographic protocol's distributional contracts, but it needs ghost distributions and explicit finite-domain lemmas. Inference: it is suitable for proving information-theoretic properties of a verified Rust implementation only when the executable protocol, sampler, and leakage model are connected by contracts.

## what is proved, measured, and trusted
The paper proves semantic soundness of PSL (pen and paper, Appendix B) and gives proofs or proof sketches for the one-time pad and four classes of constructions (Section 5, details in Appendix C); I found no implementation, mechanization, runtime benchmark or empirical success rate in the paper text. Inference: the trusted elements include the mathematical distribution model, the pWhile operational semantics, finite-domain arithmetic, protocol encodings, and the correctness of any cryptographic abstraction. Inference: a Verus product inherits the gap between a proof of a distributional specification and the real RNG, machine arithmetic, compiler, and side-channel behavior unless those are modeled and verified. Inference: the threat to agent-written verified Rust is high for randomized cryptographic code when independence or leakage is a required property, because ordinary functional postconditions do not express it; PSL supplies a design vocabulary but not a drop-in Verus library.

The paper's stated limits (Section 7) include incompleteness (the randomized-conditional rule and the equational theory), no existential quantifiers, no quantitative reasoning about probabilities or expectations, and a simple language with deterministic loop guards and terminating programs (Section 2.3); sampling is uniform over finite sets. Inference: VL should reuse the guard-separation and Frame side conditions rather than redo the basic soundness theory; new work should connect these abstractions to concrete Rust RNG and memory models.

## techniques for the catalog
- probabilistic BI model: interpret separating conjunction as factorization into independent distributions over disjoint randomized variables
- PSL randomized rules: verify sampling, randomized assignment, conditioning, and framing with independence side conditions
- security by distributional postconditions: prove cryptographic uniformity or input independence and derive information-theoretic security
- supported assertions: restrict randomized conditional postconditions to SP formulas so conditioning remains sound
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We first show R’s secrecy, followed by S’s secrecy, and then combine the results using Conj."): read the whole paper text including Appendices A-C; checked the quotations, section/page/figure references, Definitions 3-4 and 6-7, the rules of Figures 2-4 and the Frame side conditions, Theorem 2, and the descriptions of the OTP, PIR, OT, multi-party addition and ORAM examples; changed the Section 1.1 quote reference, the meaning of `e ~ e'`, the `D[e]` description, the claims that the paper proves the monoid structure and weakening (they are stated only), the Frame side-condition wording, the ORAM proof description (uniform and independent leakage pairs, not independence from initial memory), the unsupported "restricted language" claim, and added the OT input-independence failure, the secret-sharing-only scope of the multi-party proof, the ORAM idealization, and the Inference markers on trusted elements; did not check the Verus-related Inference statements (the paper does not cover Verus), the cited external works, or the ACM version beyond the arXiv v4 text; link kept from the fetch record (it matches arXiv:1907.10708v4 in the paper text; DOI 10.1145/3371123 also appears there).
