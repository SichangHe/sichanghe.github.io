# A complex-analytic proof of square-restricted stable phase retrieval in Fock space
(authored by agents unless marked 🧑)
Tag: `bortolotto2026complex`, [paper](http://arxiv.org/abs/2608.26365v1)

## result and scope

The paper proves a square-restricted stability theorem for phase retrieval in one-dimensional Bargmann–Fock space. If an entire function F has F² in the Fock space, then the distance of F² from a unimodular constant is controlled by the distance of |F|² from the constant 1. Theorem 1.1 first proves the stronger estimate against any real constant c; Corollary 1.2 chooses the phase. The authors state: “The proof has been completely verified in Lean with the aid of Large Language Models.” (Abstract, p. 1.)

The scope matters. The theorem is for squares, not arbitrary Fock functions, and the paper says that it does not cover higher Hermite windows or true polyanalytic Fock spaces (Section 3.1, p. 12). The method is a short complex-analytic argument: weighted derivative coercivity, Cauchy–Riemann identities, two integrations by parts for the gradient energy, two further integrations by parts for the Laplacian energy, and a weighted Cauchy estimate (Section 2, pp. 8–10). Inference: its formalization section offers a pattern for relating an analysis proof to formal declarations.

## technique: state the exact formal theorem before proving it

What it is. The authors formalize the mathematical statement itself rather than merely checking fragments. They define a normalized Gaussian measure, an L2 Fock norm, centered square, distance to a real constant, and distance to unimodular constants. The paper defines the measure as follows (Section 4.1, p. 13):

```lean
def gaussianMeasure : Measure C :=
  volume.withDensity gaussianDensity
```

It then defines `functionFockNorm`, `functionCenteredSquare`, `functionDistanceToConstant`, and `functionDistanceToUnimodularConstants` (Section 4.1, pp. 13–14). The theorem declaration is existential in an absolute positive constant and quantifies over every differentiable F whose square is in the Gaussian L2 space (Section 4.1, p. 14).

When to use it. Inference: use this technique when a prose theorem has several overloaded analytic notions. Inference: explicit definitions expose the measure, norm, domain, regularity condition, and infimum in the checked statement.

How it is done.

1. Define the Gaussian density against planar Lebesgue measure (Section 4.1, p. 13).
2. Define the Fock norm as `lpNorm f 2 gaussianMeasure`, rather than introducing an abstract Fock-space type (Section 4.1, p. 14).
3. Define the centered square and both distances as functions on the exact measurable space (Section 4.1, p. 14).
4. State Theorem 1.1 and Corollary 1.2 with an existential positive constant before the function quantifier (Section 4.1, p. 14).
5. Check that `Differentiable C F` means entire and `MemLp (fun z ↦ F z ^ 2) 2 gaussianMeasure` means F² belongs to Fock space (Section 4.1, p. 14).

Verus form. Inference: define the modeled quantities explicitly and express the intended relationship in a proof function’s contract. The paper supplies Lean definitions, not a Verus model of integration. Inference: transferring the theorem would require defining that model and proving the corresponding analytic facts.

Evidence and limits. The authors report kernel checking; I have not independently built the formalization. They explain that the coefficient identity is “a proved theorem” and “not a definition” (Section 4.1, p. 13). Inference: checking the encoded statement against the intended theorem remains necessary.

## technique: formalize the proof as reusable lemmas and a correspondence table

What it is. The proof is decomposed into Lemma 2.1 (weighted derivative equivalence), Lemma 2.2 (weighted Cauchy estimates), Theorem 1.1 in polynomial and entire-function forms, and Corollary 1.2. Section 4.2 maps each mathematical step to a Lean declaration: Gaussian monomial moments, coefficient identities, weighted derivative bounds, pointwise Cauchy bound, weight shifts, diffeomorphism, gradient and Laplacian identities, integration by parts, energy bound, polynomial approximation, and the two final theorems (Section 4.2, pp. 14–15). The paper says: “For every entry, the hypotheses, conclusion, constants, and cited Lean declaration were compared directly with the mathematical statement in the note.” (Section 4.2, p. 14.)

When to use it. Inference: use a correspondence table when a paper proof contains many implicit side conditions or when a formal development should be auditable against the prose proof. Inference: the table helps readers locate declarations and compare their assumptions with the prose.

How it is done.

1. Isolate a lemma with the same hypotheses and conclusion as the prose result (Sections 2 and 4.2).
2. Prove elementary infrastructure first, such as Gaussian moments and coefficient formulas (Section 4.2, p. 15).
3. Record each analytic transformation as a named declaration, including the weight comparison and outer-shift diffeomorphism (Section 4.2, p. 15).
4. Build the main estimate from those declarations and retain separate polynomial and entire-function cases (Sections 2 and 4.2).
5. Compare hypotheses, conclusions, constants, and declaration names directly, then publish the mapping (Section 4.2, p. 14).

Verus form. Inference: use proof functions for individual obligations and map each prose obligation to its declaration. Inference: the mapping supports review; the declarations and their proofs establish the encoded claims.

## technique: verify analytic side conditions instead of hiding them

What it is. The mathematical proof repeatedly relies on side conditions: Taylor-series coefficient bounds, Tonelli and dominated convergence, integration-by-parts boundary terms, weight comparisons, and injectivity/Jacobian bounds for an outer shift. Section 4.2 maps proof steps to named Lean declarations (pp. 14–15). For example, the outer Cauchy estimate uses the map Φθ(z) = z + e^{iθ}/|z| on |z| > 2. The proof explains: “To apply the change-of-variables formula to Φθ , we check that this map is one-to-one and that its Jacobian determinant is bounded away from zero.” (Section 2, p. 7.) The proof of Lemma 2.2 explicitly checks that the Jacobian determinant is at least 3/4 before applying change of variables (Section 2, pp. 6–8).

How it is done. For the weighted Cauchy estimate, apply Cauchy’s integral formula to F′, use Hölder, split the plane into |z| ≤ 2 and |z| > 2, choose radius 1 in the inner region and |z|⁻¹ in the outer region, compare Gaussian weights, prove injectivity and the Jacobian lower bound, and then change variables (Section 2, pp. 6–8). For Theorem 1.1, derive the gradient identity and integrate by parts twice to obtain (2.8). Define the Laplacian energy J and integrate by parts twice more to obtain (2.9). Reduce its three terms to weighted L4 norms, invoke Lemma 2.2, use J = 16∫|F′|⁴ dγ₂ to close the bound on J, and return to (2.8) (Section 2, pp. 8–10). The paper explicitly calls the second pair “two further integrations by parts” (p. 9).

Verus form. Inference: this corresponds to exposing every nontrivial side condition as a lemma or `requires` clause instead of using an opaque `external_body`. Inference: if a Rust implementation approximates an integral or a Jacobian computation, the approximation bound and domain restrictions belong in the specification; a solver success for a finite sample does not establish the continuous inequality.

Evidence and limits. The paper states that all listed results, including both theorem forms, were checked by the kernel (Section 4, p. 13). The authors report that the library “contains no sorry, no admit and no project axiom” and that `#print axioms` reports “only propext, Classical.choice and Quot.sound” for the listed declarations (Section 4, p. 13). Inference: those reports do not establish that the implementation or formalization process is free of bugs.

## technique: bridge polynomial proofs to entire functions by approximation

What it is. The paper proves Theorem 1.1 first for polynomials, then extends it to every entire F with F² in Fock space. It defines radial dilations Fr(z) = F(rz) and Taylor polynomials Pr,N, proves L4 convergence of Pr,N to Fr, proves convergence of their squares in the Fock norm, and takes rk = k/(k+1) with a suitable Nk before passing to the limit (Section 2, pp. 11–12).

How it is done.

1. Use the coefficient formula to show Fr² tends to F² in Fock norm as r ↑ 1 by dominated convergence (Section 2, p. 11).
2. Use Parseval and Cauchy–Schwarz on each circle to bound the L4 Taylor tail (Section 2, p. 11).
3. Integrate the tail bound against the Gaussian measure and conclude Pr,N → Fr in L4 (Section 2, p. 11).
4. Factor Pr,N² − Fr² and use Cauchy–Schwarz to obtain Fock-norm convergence of squares (Section 2, p. 11).
5. Choose rk and Nk, apply the polynomial estimate, and pass to the limit (Section 2, pp. 11–12).

Verus form. Inference: a finite approximation can have a contract stating its error bound. Passing from those bounds to an infinite limit requires a separate convergence argument; loop termination alone does not supply it. Inference: the transferable practice is to prove approximation and convergence obligations explicitly.

## what is proved, measured, and trusted

The formalized results are Lemma 2.1, Lemma 2.2, Theorem 1.1 for polynomials and entire functions, and Corollary 1.2 (Section 4, p. 13). The authors state: “The library builds with Lean v4.30.0 against Mathlib v4.30.0” (Section 4, p. 13). There is no performance experiment or comparison of LLMs on proof completion in this paper. The authors state: “The ideas in this manuscript are completely devised by humans.” They also write: “The main part where LLMs were instrumental was in the Lean formalization part.” (LLM Usage, p. 4.) Section 4 says: “All Lean statements reproduced or cited in this section were also read and checked by a human against the corresponding mathematical statements in the note.” (p. 13.)

The paper states: “The trusted base is therefore Lean’s kernel together with the pinned Mathlib” (Section 4, p. 13).

## threat to a product of agent-written verified Rust

The paper reports human-directed LLM assistance for a Lean analysis proof, with human checking of the formal statements (LLM Usage, p. 4; Section 4, p. 13). Inference: it does not establish the reliability of autonomous agents writing verified Rust. Inference: the relevant product risk is a checked proof of an unintended contract; publishing definitions and comparing statements with requirements can help reviewers detect that mismatch.

## techniques for the catalog

- exact formal statement — define the measure, norm, domain, regularity and infima explicitly before proving the theorem
- lemma decomposition and correspondence — map every prose step, hypothesis, constant and declaration in an auditable table
- side-condition verification — formalize weight bounds, Jacobians, integration-by-parts conditions and convergence obligations
- finite-to-infinite approximation — prove polynomial cases, establish norm convergence, and pass to the entire-function limit
- kernel and axiom audit — pin Lean/Mathlib versions, reject `sorry`/`admit`, and inspect reported axioms
