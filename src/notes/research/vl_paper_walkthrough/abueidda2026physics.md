# Physics-Audited Agentic Discovery in Scientific Machine Learning
(authored by agents unless marked 🧑)
Tag: `abueidda2026physics`, [paper](https://www.semanticscholar.org/paper/9f95e3dc86970d1e25059a3d22d1510ed417e238)

## what the paper establishes

Physics-Audited Agentic SciML (PA-SciML) makes output-level physics checks part of automated surrogate selection. The paper's central distinction is predictive error versus evidence that a trained field obeys specified physical contracts. It states: “A selected surrogate is reported as verified only under the stated checks.” (abstract, p. 1). This is conditional verification over a declared input domain, sampling rule, tolerance, and hard-check set, not a proof for every input.

The workflow has three parts. Setup fixes a data summary, one lower-is-better evaluator, calibration results, and (when enabled) a contract file. Candidate search lets LLM roles propose, critique, implement, repair, train, and score models. The fixed routines validate interfaces, train and score, and record failures separately from bad predictions. The Verification layer audits each trained output, computes normalized violations, and applies a sampled hard-contract gate. Post-discovery attribution optionally isolates edits and saves a method card. The authors emphasize: “The method is organized into three parts: the Discovery loop, the Verification layer, and Post-discovery attribution with Method-card saving.” (section 3, p. 4).

## technique 1: fixed evaluator plus candidate lineage

Use this when agents are exploring architectures and training choices, but their scores must remain comparable. First state the problem, data, admissible input domain, and scoring target. During setup, build and save one evaluator. Build a search tree whose root is the first implementation; each child edits a scored parent. For every child, check the expected interface, completeness, executability, and trainability, then apply the unchanged evaluator. Store parent, status, score, lineage, and artifacts; an unscorable candidate cannot become a parent. The paper says the evaluator is reused unchanged, while warning that this is not a formal guarantee that the saved file itself cannot change (section 3.1, p. 5).

Verus form (Inference): model the evaluator as a pure `spec fn` over an output and reference, and state an `ensures` clause that the reported score equals that function. A Rust driver can keep candidate metadata in ordinary structs; the proof can establish bookkeeping invariants, but Verus does not verify an arbitrary Python training implementation. What carries over is separating execution failure, score, and audit records; what does not carry over automatically is neural-network numerical behavior.

Evidence: static elasticity used 28 trial surrogates, all scored and audited; the transient run had 16 trials, 14 scored and two training-time failures (sections 4.2–4.3, pp. 14, 20). These are single-run counts, not general success rates.

## technique 2: typed contracts and normalized sampled gate

Use this when requirements such as linearity, boundary conditions, bounds, symmetry, or temporal consistency must be checked independently of error. Before search, have the setup component choose a supported check type, parameters, severity, and tolerance from the problem statement and calibration evidence. Keep hard contracts (gating) separate from soft diagnostics. For each active hard contract c, evaluate finite probes S_c and compute the dimensionless statistic
`violmax = max_c max_q v_c(q) / tau_c`.
A candidate passes if this value is at most the configured threshold; if all hard checks are skipped, there is no gate pass. The paper explicitly says: “A contract is a typed physics-check specification interpreted by routines that are part of the framework implementation and supplied before the run.” (section 3.2, p. 8).

Steps from the method are: choose only regime-valid checks; calibrate residual scales before candidate training; archive tolerances, labels, domain, and sampling; run fixed check code on each candidate's input-output map; report the lowest-score passing candidate, or the lowest-score candidate as unverified if none pass. The suggested tolerance is no tighter than three times measured calibration residual, but the authors call this guidance rather than a validity guarantee (section 3.2, p. 8).

Verus form (Inference): represent a finite probe list and contract parameters in ghost/spec data, implement each supported check as a `spec fn`, and prove aggregation properties with `proof fn`s and `ensures`. Use `requires` to state admissible domains and `assert`/lemmas for normalization. Verus can prove the gate arithmetic for a fixed implementation; it cannot prove that an LLM-selected contract captures the real mechanics, nor the floating-point neural outputs without an appropriate model.

Evidence: in static elasticity the common audit had selected rel-L2 8.864e-5 and baseline 2.103e-4 on 1,000 validation cases; both passed, with sampled worst violations 1.708e-4 and 1.080e-3 (Table 3, p. 15). In transient dynamics, on 500 validation histories, the selected model scored 2.629e-3 and passed, while the error-only model scored 2.724e-3 and failed with sampled causality violation 12.62 (Table 6, p. 20). Values are normalized; threshold is 1.

## technique 3: adversarial no-reference input search

Use after the sampled audit when a contract has a differentiable or otherwise implemented search objective. Keep trained weights fixed. Parameterize only admissible inputs Z, seed baseline samples and multiple starts, and perform constrained Adam ascent on the violation. Report the largest found value separately; do not merge it into the sampled gate. The paper states: “The report gives the largest violation found under the chosen budget and parameterization; it does not prove that larger violations are absent.” (section 3.2, p. 9).

Verus form (Inference): specify `z` bounds with `requires`, prove each input-construction operation preserves the bounds, and state that the checker reads a fixed model abstraction. A proof can certify admissibility and the reported maximization loop's invariants, but not global optimality of gradient ascent.

Evidence: transient baseline causality was 2750.62 in the adversary report versus 12.62 sampled; the selected model's largest reported value was 6.7e-5 (Table 7, p. 22). These are finite-budget search results, not universal bounds.

## technique 4: physics-structured surrogate architectures

The static selected model hard-codes linear elasticity. It predicts `u = (fx/E) Gx(nu) + (fy/E) Gy(nu)`, multiplies `ux` by `(1-x)` and `uy` by `y`, and therefore enforces load superposition, reciprocal-E scaling, sign reversal, and roller conditions for every trained weight. Listing 1 (p. 14) gives the code shape. The transient model uses left-padded bias-free causal convolutions, a factorized spatial-time trunk, and a lifting term `alpha*u_bar` plus an envelope that vanishes at initial and boundary locations (Listing 2, p. 19). The paper says: “Causality, load linearity, amplitude scaling, sign symmetry, zero response to zero input, the zero initial state, and the two displacement boundary conditions therefore hold for any trained weights.” (section 4.3, p. 19).

Verus form (Inference): encode the architectural equations as executable Rust functions with `ensures` for boundary factors and linearity lemmas. A causal history type can expose only prefixes to a `spec fn`; Verus can prove that an output at time t depends on indices up to t if the implementation's indexing is modeled. Neural weights remain trusted data unless separately abstracted.

Evidence: transient baseline's bidirectional branch changed pre-midpoint outputs when only future loading changed: sampled relative change about 63% divided by a 5% tolerance gives 12.62 (section 4.3, p. 20). This failure was invisible to mean trajectory error.

## technique 5: isolated-edit attribution and method cards

After an improving parent-child edge, split the code change into at most K edits, retrain each one-edit variant, and compute `phi_i=(s_parent-s_edit_i)/(s_parent-s_child)`. Treat the share as an operational attribution, not causal proof; values below zero or above one are possible. Save a method card only if relative improvement, dominant share at least 0.5, uniqueness, and any required audit pass all hold (section 3.3, pp. 10–11). Static elasticity saved the physics factorization at 149% share (Table 5, p. 18); transient saved three dominant edits with 129%, 57%, and 55% shares (Table 8, p. 22).

Verus form (Inference): make each edit a separate verified function and prove metadata and score-record consistency. The numerical retraining experiment remains outside Verus's proof domain.

## trust, limits, and product threat

Proved or checked: fixed-code arithmetic checks, sampled outputs, and bounded adversarial searches under named contracts. Trusted: contract choice, calibration quality, model implementation and weights, finite-element reference data, floating-point behavior, optimizer completeness, and external tools. The static comparison is one audit-enabled versus one error-only run; transient has one seed, modest budgets, and two timeouts. The paper itself cautions: “A pass is a conditional statement” tied to its verification setting (section 4.4, p. 22).

Inference: for agent-written verified Rust, the strongest transferable idea is specification-first acceptance gates: derive explicit contracts before generation, run fixed checks on outputs, and retain counterexample searches. The threat is that a Verus proof can establish a poorly chosen contract while an agent's unmodeled model or environment violates the intended requirement. VL should already have this paper's separation of score, runtime failure, contract evidence, and untrusted external assumptions; redoing a generic LLM candidate-tree architecture would add little.

## techniques for the catalog

- physics contract gate — fix typed hard/soft checks and select the lowest-score candidate whose sampled normalized violation is below threshold

- adversarial input search — hold weights fixed and maximize contract violation over bounded admissible inputs without reference fields

- structure by construction — encode linearity, scaling, boundary, and causality in the surrogate architecture before training

- isolated edit attribution — retrain one change at a time and save reusable method cards only after score and audit checks

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
