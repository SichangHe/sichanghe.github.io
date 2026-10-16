# A complex-analytic proof of square-restricted stable phase retrieval in Fock space
(authored by agents unless marked 🧑)
Tag: `bortolotto2026complex`, [paper](http://arxiv.org/abs/2608.26365v1)

## result and scope

The paper proves a square-restricted stability theorem for phase retrieval in one-dimensional Bargmann–Fock space. If an entire function F has F² in the Fock space, then the distance of F² from a unimodular constant is controlled by the distance of |F|² from the constant 1. Theorem 1.1 first proves the stronger estimate against any real constant c; Corollary 1.2 chooses the phase. The authors state: “The proof has been completely verified in Lean with the aid of Large Language Models.” (Abstract, p. 1.)

The scope matters. The theorem is for squares, not arbitrary Fock functions, and the paper says that it does not cover higher Hermite windows or true polyanalytic Fock spaces (Section 3.1, p. 12). The method is a short complex-analytic argument: weighted derivative coercivity, Cauchy–Riemann identities, two integrations by parts, and a weighted Cauchy estimate. It is not a systems verification method, but its formalization section is a concrete example of turning a long analysis proof into kernel-checked declarations.

## technique: state the exact formal theorem before proving it

What it is. The authors formalize the mathematical statement itself rather than merely checking fragments. They define a normalized Gaussian measure, an L2 Fock norm, centered square, distance to a real constant, and distance to unimodular constants. The paper gives the definitions verbatim: “def gaussianMeasure ( : Measure C := volume.withDensity gaussianDensity” and then defines `functionFockNorm`, `functionCenteredSquare`, `functionDistanceToConstant`, and `functionDistanceToUnimodularConstants` (Section 4.1, pp. 13–14). The theorem declaration is existential in an absolute positive constant and quantifies over every differentiable F whose square is in the Gaussian L2 space (Section 4.1, p. 14).

When to use it. Use this technique when a prose theorem has several overloaded analytic notions. Formal definitions expose exactly which measure, norm, domain, regularity condition, and infimum the checker sees.

How it is done.

1. Define the Gaussian density against planar Lebesgue measure (Section 4.1, p. 13).
2. Define the Fock norm as `lpNorm f 2 gaussianMeasure`, rather than introducing an abstract Fock-space type (Section 4.1, p. 14).
3. Define the centered square and both distances as functions on the exact measurable space (Section 4.1, p. 14).
4. State Theorem 1.1 and Corollary 1.2 with an existential positive constant before the function quantifier (Section 4.1, p. 14).
5. Check that `Differentiable C F` means entire and `MemLp (fun z ↦ F z ^ 2) 2 gaussianMeasure` means F² belongs to Fock space (Section 4.1, p. 14).

Verus form. Inference: the direct Verus analogue is to write an explicit `spec fn` for each mathematical quantity and put the relationship in `ensures` clauses on a `proof fn` or verified executable wrapper. Inference: Verus has no Lean `Measure` library equivalent supplied by this paper, so one would need a model of the relevant integrals and a trusted or separately verified numerical/analytic library; copying the Lean names would not prove the continuous theorem. Inference: the key transferable practice is exact contracts and explicit domains, not the particular analytic definitions.

Evidence and limits. The formal theorem is stronger evidence than an informal claim because it is checked by Lean's kernel, but it proves only the encoded statement. The paper explicitly says that the Fock norm is interpreted as Gaussian L2 and that the coefficient identity is proved rather than defined (Section 4.1, p. 14). Inference: any mismatch between that encoding and the intended Fock space would remain a specification risk.

## technique: formalize the proof as reusable lemmas and a correspondence table

What it is. The proof is decomposed into Lemma 2.1 (weighted derivative equivalence), Lemma 2.2 (weighted Cauchy estimates), Theorem 1.1 in polynomial and entire-function forms, and Corollary 1.2. Section 4.2 maps each mathematical step to a Lean declaration: Gaussian monomial moments, coefficient identities, weighted derivative bounds, pointwise Cauchy bound, weight shifts, diffeomorphism, gradient and Laplacian identities, integration by parts, energy bound, polynomial approximation, and the two final theorems (Section 4.2, pp. 14–15). The paper says: “For every entry, the hypotheses, conclusion, constants, and cited Lean declaration were compared directly with the mathematical statement in the note.” (Section 4.2, p. 14.)

When to use it. Use a correspondence table when a paper proof contains many implicit side conditions or when a formal development should be auditable against the prose proof. A reader can locate the declaration for each mathematical step and identify omitted assumptions.

How it is done.

1. Isolate a lemma with the same hypotheses and conclusion as the prose result (Sections 2 and 4.2).
2. Prove elementary infrastructure first, such as Gaussian moments and coefficient formulas (Section 4.2, p. 15).
3. Record each analytic transformation as a named declaration, including the weight comparison and outer-shift diffeomorphism (Section 4.2, p. 15).
4. Build the main estimate from those declarations and retain separate polynomial and entire-function cases (Sections 2 and 4.2).
5. Compare hypotheses, conclusions, constants, and declaration names directly, then publish the mapping (Section 4.2, p. 14).

Verus form. Inference: use small `proof fn` lemmas for arithmetic identities, data-structure facts, and each loop or state-machine invariant, then call them from a top-level proof of the contract. Verus lemmas must use supported Rust values and specifications; an analytic theorem about integrals would require a verified discrete model or an external trusted assumption explicitly documented. Inference: a mapping file that pairs every prose obligation with its Verus declaration would reduce accidental gaps, but it is audit metadata rather than a proof construct.

## technique: verify analytic side conditions instead of hiding them

What it is. The mathematical proof repeatedly relies on side conditions: Taylor-series coefficient bounds, Tonelli and dominated convergence, integration-by-parts boundary terms, weight comparisons, and injectivity/Jacobian bounds for an outer shift. These are represented as named Lean declarations. For example, the outer Cauchy estimate uses the map Φθ(z) = z + eiθ/|z| on |z| > 2; the paper records declarations for “injectivity/diffeomorphism of Φθ outer shift” and for the inner and outer weight shifts (Section 4.2, p. 15). The proof of Lemma 2.2 explicitly checks that the Jacobian determinant is at least 3/4 before applying change of variables (Section 2, pp. 6–8).

How it is done. For the weighted Cauchy estimate, apply Cauchy’s integral formula to F′, use Hölder, split the plane into |z| ≤ 2 and |z| > 2, choose radius 1 in the inner region and |z|⁻¹ in the outer region, compare Gaussian weights, prove injectivity and the Jacobian lower bound, and then change variables (Section 2, pp. 6–8). For Theorem 1.1, derive the gradient identity, integrate by parts twice, reduce to weighted L4 norms, and invoke Lemma 2.2 (Section 2, pp. 8–10).

Verus form. Inference: this corresponds to exposing every nontrivial side condition as a lemma or `requires` clause instead of using an opaque `external_body`. Inference: if a Rust implementation approximates an integral or a Jacobian computation, the approximation bound and domain restrictions belong in the specification; a solver success for a finite sample does not establish the continuous inequality.

Evidence and limits. The paper states that all listed results, including both theorem forms, were checked by the kernel (Section 4, p. 13). The code contains no `sorry`, no `admit`, and no project axiom; `#print axioms` reports only `propext`, `Classical.choice`, and `Quot.sound` (Section 4, p. 13). These are the paper's exact setup facts. They do not establish that Lean, Mathlib, the compiler, or the formalization process is free of bugs.

## technique: bridge polynomial proofs to entire functions by approximation

What it is. The paper proves Theorem 1.1 first for polynomials, then extends it to every entire F with F² in Fock space. It defines radial truncations Fr(z) = F(rz) and Taylor polynomials Pr,N, proves L4 convergence of Pr,N to Fr, proves convergence of their squares in the Fock norm, and takes rk = k/(k+1) with a suitable Nk before passing to the limit (Section 2, pp. 11–12).

How it is done.

1. Use the coefficient formula to show Fr² tends to F² in Fock norm as r ↑ 1 by dominated convergence (Section 2, p. 11).
2. Use Parseval and Cauchy–Schwarz on each circle to bound the L4 Taylor tail (Section 2, p. 11).
3. Integrate the tail bound against the Gaussian measure and conclude Pr,N → Fr in L4 (Section 2, p. 11).
4. Factor Pr,N² − Fr² and use Cauchy–Schwarz to obtain Fock-norm convergence of squares (Section 2, p. 11).
5. Choose rk and Nk, apply the polynomial estimate, and pass to the limit (Section 2, pp. 11–12).

Verus form. Inference: a terminating Rust loop can be verified with an explicit `invariant` describing approximation error and a decreasing measure for convergence of finite truncations. Inference: Verus can check finite arithmetic and data-structure approximations, but the infinite limit theorem requires a separately modeled library and cannot be obtained by asserting convergence. The transferable pattern is proving a strong finite case and then a checked refinement relation; the analytic convergence proof itself does not carry over automatically.

## what is proved, measured, and trusted

The formalized results are Lemma 2.1, Lemma 2.2, Theorem 1.1 for polynomials and entire functions, and Corollary 1.2 (Section 4, p. 13). The setup is Lean v4.30.0 with Mathlib v4.30.0, and the paper reports no `sorry`, `admit`, or project axiom (Section 4, p. 13). There is no performance experiment or comparison of LLMs on proof completion in this paper. The authors say that LLMs helped with the Lean formalization but that the ideas were devised by humans and the statements and results were checked by the authors (Introduction, p. 4).

The trusted base reported by the paper is Lean's kernel together with the pinned Mathlib; the listed declarations use only `propext`, `Classical.choice`, and `Quot.sound` (Section 4, p. 13). Inference: for VL, the analogous trusted base includes Verus's verifier and solver translation, the Rust compiler and libraries, and the correctness of any model used for continuous mathematics. Inference: a Verus contract can establish only the encoded finite behavior, so the product specification and external dependencies remain trusted assumptions.

## contradictions, scope boundaries, and prior work VL should not redo

The paper consistently limits its claim to squares. It explicitly says that the argument does not prove stability for arbitrary G in Fock space and lacks the broader theorem of the companion work (Section 3.1, p. 12). No numerical denominator contradiction appears: the only quantitative model experiments are absent; all constants in the theorem are existential absolute constants. The Lean statement uses an infimum over real constants and over phases literally, rather than selecting a minimizer (Section 4.1, p. 14).

VL should not redo this paper's Lean formalization architecture: explicit definitions, lemma-level decomposition, kernel checking, axiom printing, and a proof-to-code correspondence table are already demonstrated. Inference: VL's contribution would need to address Verus-specific Rust behavior, ownership, solver stability, or maintenance rather than claim that LLM-assisted formalization itself is new.

## threat to a product of agent-written verified Rust

Inference: the direct threat is moderate but bounded. This paper demonstrates that LLMs can assist a human team in closing a nontrivial Lean proof, yet it does not show autonomous specification design, generalization to Rust, or resistance to false formal statements. Inference: an agent-written Verus proof can be mechanically checked while still proving the wrong contract; the paper's insistence on publishing exact definitions and a statement correspondence table is therefore a practical control. Inference: the threat is lower when product contracts, external assumptions, and checker versions are pinned and audited, and higher when an agent is rewarded only for producing a proof that compiles.

## techniques for the catalog

- exact formal statement — define the measure, norm, domain, regularity and infima explicitly before proving the theorem
- lemma decomposition and correspondence — map every prose step, hypothesis, constant and declaration in an auditable table
- side-condition verification — formalize weight bounds, Jacobians, integration-by-parts conditions and convergence obligations
- finite-to-infinite approximation — prove polynomial cases, establish norm convergence, and pass to the entire-function limit
- kernel and axiom audit — pin Lean/Mathlib versions, reject `sorry`/`admit`, and inspect reported axioms
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
