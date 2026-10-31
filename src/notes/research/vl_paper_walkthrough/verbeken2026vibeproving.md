# Early Evidence of Vibe-Proving with Consumer LLMs: A Case Study on Spectral Region Characterization with ChatGPT-5.2 (Thinking)
(authored by agents unless marked 🧑)
Tag: `verbeken2026vibeproving`, [paper](http://arxiv.org/abs/2602.18918v1)

## scope and result

Verbeken and colleagues report a case study in which a consumer ChatGPT subscription helped resolve Conjecture 20 of Ran and Teng (2024), concerning the nonreal eigenvalue region of a structured 4×4 row-stochastic matrix family. The paper analyzes seven shareable ChatGPT threads and four versioned proof drafts. Its abstract states: “The model is most useful for high-level proof search, while human experts remain essential for correctness-critical closure.” (abstract, p. 1)

The output is a conventional, human-checked proof of a necessary-and-sufficient spectral-region characterization with explicit boundary attainment. It is not a mechanically checked Lean, Coq, Isabelle, or Verus proof. The authors explicitly say: “We did not attempt a formalization of the present proof.” (Section 4.4, p. 7) Evidence therefore concerns an auditable generate–referee–repair workflow, not formal-verifier soundness.

## technique 1: start from a concrete target theorem and mathematical scaffolding

What it is. Give the model a precise theorem statement, known boundary information, and a recognizable classical proof template before asking for a strategy. The target family is
`A(α,β,γ,δ)` with cyclic zero pattern and parameters in `[0,1]`; for λ=a+bi with b≠0, the theorem requires `0≤a≤1`, `a+|b|≤1`, and `G(a,|b|)≥0`, where `G(a,b)=(b²+a²+a)²+2a²−b²`. The converse asserts that every upper-half-plane point satisfying the inequalities is attained, with explicit right boundary segment and left curve constructions (Section 2.4, pp. 3–4).

When to use it. Use this when the problem has known partial results, a candidate boundary, or a classical reduction. The paper’s own later recommendation is: “Start from scaffolding. Prefer problems where you can state a concrete target theorem and where a recognizable reduction/template exists.” (Section 4.6, p. 7)

How to do it. (1) Supply the source conjecture and known right-boundary result. (2) State the full desired theorem, including domains, inequalities, converse, and boundary-attainment cases. (3) Ask for a strategy specialized to the Dmitriev–Dynkin trigonometric method. (4) Use the resulting roadmap to plan proof obligations. In this case ChatGPT proposed angle parametrization plus Jensen/Karamata and an extremal strategy (Sections 2.4 and 3.3, pp. 3–4).

Verus form (Inference: the paper uses narrative mathematics, not Verus). Encode the matrix family and spectral assumptions as Rust specification values. A verified function can use `requires` for parameter bounds, row-stochasticity, nonreal eigenvalue, and denominator positivity; `ensures` can state the three necessary inequalities. A second function can specify constructive parameter existence for the converse, although existence over reals may require a suitable Verus mathematical encoding. Boundary constructions can be separate `proof fn`s with explicit postconditions. The LLM’s theorem statement is input and must be checked against the intended specification.

Evidence and limits. The scaffolding was strong: Karpelevich supplied the right boundary and Ran–Teng supplied the conjectured left boundary. The authors call the strategy an adaptation of a classical template rather than a fundamentally new method (Section 4.5, p. 7). Inference: success on this one structured problem does not establish performance on problems without known structure.

## technique 2: use the Dmitriev–Dynkin trigonometric reduction

What it is. Convert eigenvalue equations into a multiplicative constraint, reparameterize by arguments, and optimize a trigonometric expression. The paper lists the method’s steps: “For an eigenvalue λ with eigenvector v, derive a multiplicative constraint from the eigenvalue equations”; “Reparametrize using arguments (u = Arg(z + t)) to convert the constraint into a trigonometric optimization problem”; and “Use convexity and majorization arguments to characterize the boundary.” (Section 2.2, p. 3)

When to use it. Use this for cyclic stochastic matrix families where complex eigenvalue constraints factor into terms whose arguments can be ordered. It is more elementary than the general Karpelevich theorem and can adapt to subclasses with zero patterns (Section 2.2).

How to do it. (1) Derive the multiplicative eigenvalue constraint. (2) Introduce argument variables `u=Arg(z+t)`. (3) Define the convex objective and admissible angle interval. (4) Apply Jensen and Karamata/majorization to locate extremal configurations. (5) Translate the extremal inequality back to `G(a,b)≥0` and prove boundary attainments. The case study’s proof includes a key factorization `|λ|⁶−N(a,b)=|λ−1|²G(a,b)` (Section 3.4, p. 5).

Verus form (Inference). Encode angle domains as explicit preconditions and use specification functions for the trigonometric objective and `G`. Prove algebraic identities with `assert` and `proof fn`; use `ensures` to connect the factorization to the sign of `G` when `|λ−1|²` is nonnegative. Trigonometric convexity, real-number completeness, and majorization lemmas would need library support or explicit axioms. Do not write an unproved `external_body` around the critical inequality if the goal is to verify it.

Evidence and limits. The factorization was repeatedly checked in referee threads and expanded in Version D. The paper does not provide a machine-checked certificate for Jensen, Karamata, or the trigonometric inequalities. Inference: a Verus port would need substantial real-analysis lemmas beyond ordinary Rust arithmetic.

## technique 3: iterate generate, referee, and repair

What it is. Treat every model derivation as a candidate, run targeted criticism, and repair only the identified obligation. The authors summarize: “Across the seven threads, we converged on a stable loop of generate, referee, repair.” (Section 4.2, p. 6)

When to use it. Use this for long proofs where a one-line branch or sign error can invalidate an otherwise plausible derivation. Referee prompts should seek missing assumptions and unsafe transformations rather than ask for another polished proof.

How to do it. (1) Generate a global proof skeleton. (2) Ask a fresh session for a hypercritical gap list. (3) Convert each concern into a local obligation: branch convention, positivity before squaring, endpoint admissibility, or missing algebra. (4) Request a targeted repair. (5) Recheck all downstream dependencies. (6) Freeze a version only after obligations are explicit and discharged. Version A had incorrect arctangent quadrant handling, a false inequality in Lemma 2, and incomplete algebra; Version C was the first draft where critical obligations were explicit and discharged end-to-end (Section 3.4, p. 5).

Verus form (Inference). Map each obligation to a contract or lemma. Use `requires` for branch intervals and positive denominators, `assert` immediately before squaring or cross-multiplication, and `ensures` for repaired inequalities. Split the proof into small `proof fn`s so Verus diagnostics localize failures. A loop of repairs can be external orchestration; only accepted Verus proofs enter the trusted artifact.

Evidence and limits. Human verification found recurrent errors in early drafts: inverse-trigonometric branch mistakes, missing signs before squaring, and compressed algebra that omitted steps (Section 4.5, p. 7). The authors report diminishing returns from repeated hypercritical prompting after major gaps were fixed (Section 4.2, p. 6). Inference: bounded review rounds reduce noise and cost.

## technique 4: parallel patch search with independent sessions

What it is. When an obligation fails, ask multiple independent sessions for competing patches and adopt only independently checkable fixes. The paper states: “When a gap was identified, we opened multiple independent sessions with the same obligation and treated their outputs as competing patches.” (Section 4.2, p. 6)

How to do it. (1) State the exact failed obligation and all domain assumptions. (2) Request separate derivations in independent threads. (3) Compare algebra, branch cases, and hidden assumptions. (4) Reject patches that rely on silent case splits or unverifiable compression. (5) Adopt a patch only after local checking or convergence of independent derivations. Transcript 6 independently corroborated the branch/quadrant and Lemma 2 repair (Section 3.4, p. 5).

Verus form (Inference). Treat generated proof lemmas as competing candidates. Compile each candidate under the same Verus specification and retain only proofs that verify. Independent sessions provide diversity, not trust; the verifier’s result and exact contract decide acceptance. Preserve rejected candidates for regression analysis if storage permits.

Evidence and limits. The paper reports this as a workflow practice, not a controlled ablation. It does not quantify how often independent sessions agree or how much time they save. Inference: parallel generation can increase candidate quality but cannot replace a checker for shared systematic errors.

## technique 5: versioning, dependency visibility, and Lamport-style decomposition

What it is. Keep proof drafts aligned with transcript excerpts, expose claim dependencies, and recheck downstream claims after every rewrite. The authors say: “Proof rewrites sometimes reintroduced errors elsewhere (notation drift, dropped sign constraints).” (Section 4.2, p. 6)

How to do it. (1) Maintain Versions A–D and link each to the responsible transcript. (2) Decompose the proof into claims and dependencies in Lamport style. (3) After repairing a lemma, recheck every dependent claim. (4) Expand load-bearing algebra rather than hiding it behind a compressed assertion. Version D primarily improves auditability by expanding the factorization and rewriting the argument as a dependency structure (Section 3.4, p. 5).

Verus form (Inference). Encode each dependency as a named `proof fn` with explicit `ensures`. Keep specifications and proof code in version control; compile the complete dependency graph after changes. An `invariant` annotation can preserve assumptions through loops over algebraic terms. Do not use `modifies` or runtime calls to proof functions; Verus proof functions are erased and contracts express their logical effects.

Evidence and limits. The approach exposed branch/sign obligations that earlier drafts left implicit: a discriminant condition, Arg/arctan/tan branch conventions, tangent monotonicity interval, and positivity before every squaring or cross-multiplication (Section 3.4, pp. 5–6). These are process observations from one proof, not a measured general reliability rate.

## technique 6: mechanize the verification bottleneck

What it is. Reserve human effort for conceptual choices and boundary cases while delegating algebraic expansion and inequality-domain checks to computer algebra or certified checkers. The paper observes: “The dominant verification load was algebraic expansion/simplification and inequality-domain checking.” (Section 4.3, p. 6)

When to use it. Use this when a proof skeleton is plausible but dense symbolic manipulation dominates review time. The checkers should validate explicit obligations, not silently replace the theorem’s assumptions.

How to do it. (1) Extract each dense identity or inequality as a standalone obligation. (2) Supply its domain and positivity conditions. (3) Run CAS or certified interval/inequality checking. (4) Compare the result with the narrative derivation. (5) Keep a human review for branch choices, endpoint cases, and theorem applicability (Sections 4.2–4.3).

Verus form (Inference). Express polynomial identities as `assert` goals and prove them with Verus arithmetic lemmas. Encode domain checks in `requires`; state the resulting inequality in `ensures`. For transcendental inequalities, call only a separately verified or explicitly trusted library theorem. A successful algebra tactic does not prove that the selected domain or model matches the physical matrix problem.

Evidence and limits. The case study’s slowest work concentrated on Lemma 4’s tight-regime inequality and load-bearing factorization, not on generating candidate derivations (Section 4.3, p. 6). No runtime, cost, or checker-accuracy measurements are supplied. Inference: mechanization targets the observed bottleneck but requires engineering not included in the paper.

## what is proved, measured, and trusted

The mathematical result is reported as complete and human checked, with seven chat artifacts and four proof drafts for auditability. No formal proof assistant checked the result. Trusted elements include the matrix model, theorem statement, human interpretation of boundary conditions, ChatGPT outputs, algebraic tools, and final human review. The authors explicitly limit scope to one structured problem with strong prior scaffolding and say the model adapted a classical method rather than introduced a fundamentally new one (Section 4.5, p. 7). Inference: a Verus translation could mechanically check encoded algebra and contracts, but would not by itself validate the theorem specification, numerical-to-symbolic modeling, or transcendental libraries.

## techniques for the catalog

- theorem scaffolding — provide a precise target, known boundaries, and a recognizable proof template before strategy generation
- trigonometric spectral reduction — derive multiplicative eigenvalue constraints, reparameterize by arguments, and optimize with convexity/majorization
- generate–referee–repair — iterate candidate proof generation with targeted gap lists and local repairs
- parallel patch search — compare independent fixes for one obligation and retain only checkable patches
- versioned dependency control — keep drafts and transcript anchors, expose dependencies, and recheck downstream claims
- mechanized bottleneck checking — delegate algebra and inequality-domain obligations to CAS or certified checkers while retaining human boundary review
