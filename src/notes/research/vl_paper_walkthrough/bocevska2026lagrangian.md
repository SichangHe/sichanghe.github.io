# Lagrangian-Based Duality for Quantified SMT Algorithms
(authored by agents unless marked 🧑)
Tag: `bocevska2026lagrangian`, [paper](https://doi.org/10.1007/978-3-032-32526-6_4)

## purpose and scope

Bocevska et al. give one framework for three quantified-SMT solvers: QSAT, QSMA, and SynSAT. The paper's central object is a two-valued Lagrangian comparing a candidate refutation with a candidate proof. It then recursively applies the same primal-dual search to quantified subformulas and isolates quantified model-based projection (∃∀-MBP) as the main algorithmic choice.

The paper says: “A Lagrangian in that context is a function L : X × Y → {−1, +1}, where X denotes candidate refutations and Y denotes candidate proofs” (Section 1, pp. 75–76). It also says: “We show that despite their significant differences, these algorithms can be captured by a unified Lagrangian” (Section 1, p. 77). Inference: this is a reusable design pattern for a verifier whose proof search and counterexample search exchange increasingly strong artifacts.

## technique 1: generalized Lagrangian primal-dual search

What it is. Let X be a meet semilattice of refutation candidates, Y the proof candidates, and L(x,y) ∈ {−1,+1}. The refuter seeks x with every proof losing, while the prover seeks y with every refutation losing. The paper defines these outcomes by `inf_x sup_y L(x,y) = −1` for a genuine refutation and `sup_y inf_x L(x,y) = +1` for a genuine proof (Section 1, pp. 75–76).

When to use it. Use this abstraction when a verification procedure can maintain (a) a candidate proof and (b) a candidate over-approximation, and can improve one in response to a failed comparison. The paper reports that, in the earlier work [21], CEGAR and ICE learning "can be viewed as instances of the primal-dual procedure with suitably-defined Lagrangians" (Section 1, p. 76).

How to do it.
1. Choose candidate spaces X and Y and an L that says which candidate dominates (Section 1, p. 75).
2. Keep a current pair `(alpha, beta)` of refutation candidate and proof candidate. If `L(alpha,beta) = -1`, the prover updates `beta` so that it wins against `alpha`; if it is `+1`, the refuter updates `alpha` so that it wins against `beta` (Section 1, p. 76). In Algorithm 1 the refutation candidate is updated by taking the meet of the current and the new candidate, `alpha <- alpha ⊓ gamma` (Section 2, p. 79).
3. Progress comes from the meet semilattice structure of X and the monotonicity of L (Section 2, pp. 78–79); the paper states the procedure "does not always terminate", and termination of the QSMT instance needs an image-finite ∃∀-MBP (Theorem 1, p. 84).

Verus form. Inference: represent a candidate proof/refutation as ghost state in a `spec fn` or ghost data structure; express the comparison as a `spec fn` returning `bool` (or an ordered enum encoded in booleans), and prove each update with `requires`/`ensures`. Inference: use a `while` loop with a `invariant(...)` clause for the semilattice ordering and a decreasing ghost measure for termination; do not treat `invariant` as a call. Inference: concrete counterexamples remain executable data, while proof candidates and lattice facts remain ghost.

Evidence. The framework is mathematical; its direct evidence is the paper's soundness lemma: “Assume that Φ ⇐⇒ F* for some F* ∈ C. Then infF supv LM,∃x.Φ(F,v) = supv infF LM,∃x.Φ(F,v), which is +1 if and only if M |= ∃x.Φ” (Lemma 1, p. 81).

Assumptions and failure. The definition assumes X is a meet semilattice and L is monotone on X (Definition 1, p. 78). Inference: without a monotone refinement order, the update argument does not establish progress. Inference: if candidate generation is incomplete, the procedure can fail to find either witness even when one exists.

## technique 2: recursive primal-dual QSMT procedure

What it is. For an input `M |= ∃x.∀x'.Phi`, the solver maintains an over-approximation F and asks a recursive solver whether the chosen `x` satisfies the remaining quantified formula. The paper's Algorithm 3 calls itself on `M[x←v], ∃x'.¬Phi` and branches on `Refutation(F)` versus `Proof(v)` (Section 3.3, Algorithm 3, p. 82).

How to do it.
1. Maintain F with `Φ ⇒ F` and test whether `M |= ∀x'.¬F`; if true, return `Refutation(F)` (Algorithm 3, lines 2–4, p. 82).
2. Select v with `M[x←v] |= F` (line 5).
3. Recursively solve the negated remainder `∃x'.¬Φ` under `M[x←v]` (line 7).
4. If recursion returns a refutation, return `Proof(v)`; if it returns a proof, strengthen F with a new H satisfying `(∀x'.Φ) ⇒ H` and `M[x←v] |= H` (lines 8–12).

The paper says that constructing an appropriate H from the recursive call's `Proof(v')` alone "is not straightforward" (Section 3.4, p. 82), and so asks the recursive call to return an under-approximation G as well (p. 83). Inference: a practical implementation must return certificates or projections, not only success/failure.

Verus form. Inference: encode the recursive solver as a `proof fn` over ghost formula representations if the formulas are symbolic; keep the executable solver separate and connect it with `ensures` lemmas. Inference: recursive calls need a decreases argument based on quantifier depth; the postcondition should state either a refutation certificate or a proof witness plus its projection. Inference: Verus cannot execute a `proof fn`, so an executable QSMT engine would need a separately verified implementation and ghost proof layer.

Evidence. The paper states: “The algorithm in Algorithm 3 implements this idea” (Section 3.3, p. 82), and explains that the recursive call is on the negated formula because the input starts with an existential quantifier (Section 3.3, p. 82).

## technique 3: model-based projection and quantified MBP

What it is. Standard MBP takes a formula `F(x,y)` in C and a model `M |= F` and returns a formula `G(x)` in C with `M |= G(x)` and `G(x) ⇒ ∃y.F(x,y)` (Definition 2, Section 3.4, p. 83). The needed quantified form, ∃∀-MBP, takes `F(x,y,z)` and an assignment `M` on x,y with `M |= ∀z.F(x,y,z)`, and returns `G(x)` in C with `M |= G(x)` and `G(x) ⇒ ∃y.∀z.F(x,y,z)` (Definition 3, p. 83).

How to do it.
1. Ask the recursive call to return, with its proof, an under-approximation G of `∃x'.¬Φ` that contains `M[x←v]` (Section 3.4, p. 83).
2. On a successful inner proof returning `Proof(v',G')`, take `H = ¬G'` and strengthen F, `F ← F ∧ ¬G'` (p. 83; Algorithm 4, lines 11–12, p. 84).
3. On a refutation branch, compute `G := Projection(M[x←v], ∃x'.∀x''.¬F)` and return `Proof(v,G)` (Algorithm 4, lines 7–10, p. 84).
4. Require image-finiteness of the projection procedure to obtain termination (Theorem 1, p. 84).

The paper distinguishes implementations: QSMA removes ∀ by interpolation and ∃ by MBP; SynSAT uses model-guided term selection; QSAT controls Φ so ignoring x gives a suitable projection (Section 1, p. 77; detailed in Sections 4–6).

Verus form. Inference: model G as a ghost predicate over a finite symbolic domain and prove `G ==> exists`-style semantic obligations in lemmas; Verus's SMT-backed quantifiers can express bounded logical formulas, but arbitrary quantifier elimination is outside ordinary executable Rust. Inference: for finite domains, a verified projection can be a ghost `spec fn` plus a lemma; for unbounded arithmetic, keep the projection engine trusted or verify it separately.

Evidence and limits. The paper says: “If the theory T admits quantifier elimination, a finite-image ∃∀-MBP is also possible” (Section 3.4, p. 84). It also states an open question: “An open question is whether ∃∀-MBP admits an efficient procedure” (Section 8, p. 93). Inference: projection efficiency is the main portability risk when moving this design into a production verifier.

## technique 4: progress-preserving QSAT modification

What it is. The authors noticed that the QSAT algorithm of Bjørner and Janota "admits an execution trace that is difficult to capture by our intended Lagrangian" and concluded it "has a progress issue" (Section 1, p. 77). They propose a modified algorithm (Algorithm 7, Section 6.1, p. 90), implement it as MuCyc, and compare progress and non-progress configurations (Section 7, pp. 92–93). Section 6.2 (pp. 91–92) names two differences from the original: the original may return to a lower level than `j-2` (the level is the max of `{i | xi ∈ fv(G)}` intersected with `{j-2, j-4, ...}`), and it refreshes the model there (`Mj ← nil`). The authors say they proved that the first difference leads to non-progressive behavior, and that the fix is to take the level as the maximum of `{j-2, j-4, ...}` satisfying `x ∈ fv(G) ⟹ j ≥ ` the index of `x`. For the second difference they observed non-progress in their reimplementation but "have not yet completed a theoretical analysis".

How to do it. Inference: audit every update for strict movement in the candidate order; add a progress-preserving projection/update when a trace can repeat. The paper's experimental setup used the SMT-LIB2 quantified LRA benchmark set of 2,439 instances, a 300 s timeout, AWS t3.2xlarge instances with an Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50 GHz and 32 GB of memory, and Z3 version 4.15.2 (Section 7 and Fig. 1, p. 92).

Evidence. The paper reports, over the 2,439-instance benchmark, Z3 solved 754 sat and 1,427 unsat instances; MuCyc (Progress) solved 758 sat and 1,532 unsat; MuCyc (Non Progress) solved 727 sat and 1,507 unsat (Section 7, p. 93). The paper says the progress configuration "significantly outperforms the non-progress configuration" (p. 93). Inference: the progress property correlated with higher solved counts in this setting, but the MuCyc-versus-Z3 comparison is confounded, since the paper says Z3's engine "is not a direct implementation of the method described in the paper" (p. 92). The paper notes that some instances timed out in MuCyc but were solved by Z3, hypothesizing different MBP models (Section 7, p. 93).

Verus form. Inference: encode the progress relation in a loop invariant and prove a strict decrease of a well-founded ghost measure at each update. Inference: this is a proof obligation about the algorithm's control state, not a runtime `modifies` annotation.

## what is proved, measured, and trusted

Theorem 1 states progress, and termination under image-finite ∃∀-MBP; the paper gives only a proof sketch, with progress taken from the general result of [21] and termination by induction on the number of quantifiers (Section 3.4, p. 84). MuCyc's benchmark measures solver performance, not semantic correctness beyond the solver's underlying procedures. Trusted components include the QF-SMT solver, interpolation or MBP implementation, arithmetic theory, parser, and benchmark oracle; the paper does not present a machine-checked Verus proof.

Contradictions and arithmetic checks. Solved counts sum to 2,181 (Z3: 754 + 1,427), 2,290 (MuCyc Progress: 758 + 1,532) and 2,234 (MuCyc Non Progress: 727 + 1,507), all below 2,439. Inference: the remaining instances timed out or otherwise went unsolved; the paper does not break this down. The paper calls the progress configuration “significantly” better but gives scatter plots (Fig. 1) rather than aggregate runtimes (Section 7, pp. 92–93). Inference: report solved counts with the full denominator 2,439 rather than percentages.

What VL should reuse. Inference: VL should reuse the candidate-proof/counterexample duality, certificate-carrying recursive calls, explicit progress measures, and projection interfaces. VL should not redo the paper's theoretical unification as product functionality; the actionable artifact is a typed interface for proof/refutation exchange and a termination argument around projection.

Threat to a product of agent-written verified Rust. Inference: medium threat. A product that only checks local postconditions may miss quantified search nontermination or unsound projection; a ghost certificate interface and verified progress proof reduce this risk, but the projection engine and theory solver remain substantial trusted bases.

## techniques for the catalog

- generalized Lagrangian primal-dual search: compare proof and refutation candidates with a monotone two-valued Lagrangian and update the losing side
- recursive primal-dual QSMT: solve quantified subformulas recursively and return proof/refutation certificates
- quantified model-based projection: compute an under-approximation for `∃∀` obligations and use it to strengthen the outer candidate
- progress-preserving solver repair: audit candidate updates for strict progress and evaluate the repaired solver against the original
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, the eﬃciency can diﬀer dramatically, and it is known that, for some theories, MBP can be computed signiﬁcantly faster than quantiﬁer elimination."): read the whole paper text and rendered p. 83 of the PDF to check Definitions 2 and 3; checked every quotation, page and section reference, the algorithm line numbers, the benchmark setup and all solved counts and sums; changed the CEGAR/ICE attribution (the paper credits [21]), the page of the open-question quote (p. 93, not 94), the Definition 2 and 3 statements (variable roles were wrong), the page of the under-approximation requirement (p. 83), the paraphrase that proof tags alone are insufficient (the paper says "not straightforward"), the Z3 sum (2,181, not 2,290) and its reason, the Theorem 1 description (proof sketch only), and added the Section 6.2 details and the Z3 confound; did not check the cited external papers, the artifact or MuCyc code, or Fig. 1 beyond its caption; the Verus-form paragraphs are my inferences and were not tested.
