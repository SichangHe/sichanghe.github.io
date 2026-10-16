# SCAFFOLD-CEGIS: Preventing Latent Security Degradation in LLM-Driven Iterative Code Refinement
(authored by agents unless marked 🧑)
Tag: `chen2026scaffold`, [paper](https://arxiv.org/abs/2603.08520)
## what the paper establishes

The paper studies whether repeated LLM edits preserve security. Its formal model treats a program chain as (C=\langle P_0,…,P_n\rangle), with vulnerability count (V(P)). Safety monotonicity requires (V(P_{i+1})\le V(P_i)) for every step (Section III-A, p. 3). The motivating observation is specification drift: the model optimizes functionality, performance, maintainability, and security together, so security constraints can be forgotten. The paper states: “When security constraints exist only as soft prompts, the optimization trajectory gradually departs from the intended security specification” (Section I-A, p. 2).

The observational GPT-4o experiment uses 96 chains and Semgrep's p/default rules. At iteration 10, 43.7% of chains exceed baseline vulnerability counts; explicit security-hardening prompts still leave a 28.6% degradation rate (Section IV-A, p. 6). The broader RQ1 protocol uses 24 task samples (six categories, two samples per category in Python and Java), 10 rounds, four strategies, and three models: 288 chains and 2,880 steps (Section IV-A, pp. 5–6). The authors report that GPT-5-Nano has overall DR 10.5%, Claude Sonnet 4.5 6.2%, and DeepSeek-V3 4.2% in Table IV; DR counts Critical/High vulnerabilities there, while RDR is reliability degradation from LLM review.

The paper distinguishes SAST-visible degradation from latent security degradation (SSDR), such as deleting validation, weakening exception handling, or bypassing permission checks without triggering a known rule. Its key warning is: “static-analysis rules cannot cover structural degradations such as the removal of defensive logic or the weakening of exception handling” (Abstract, p. 1). The independent Claude Opus 4.5 reviewer identifies latent defects offline; it does not participate in gating (Section IV-A, p. 6). The paper acknowledges that SSDR is reviewer-dependent and should be read as a trend indicator, not an exact count (Section V-A, p. 9).

## technique 1: semantic anchor mining

What it is: SecurityArchitectAgent converts security-critical structure into an explicit anchor set Φ = ⟨I,A,R⟩: invariant anchors, API-signature anchors, and a security-rule base (Sections III-B–C, pp. 3–4). Anchors are hard or soft, have priority CRITICAL/HIGH/MEDIUM/LOW, and record selector, creation iteration, and confidence. The paper says: “Semantic anchors are formal representations of security-critical elements in code, used to prevent accidental modification or deletion during iteration” (Section III-C, p. 4).

How the paper does it:
1. Find function-level candidates with regexes for names such as `validate_*`, `sanitize_*`, and `auth*`; parse signatures, parameters, and return types with an AST. Record public API parameter lists to detect compatibility breaks (Section III-C, p. 4).
2. Run data-flow analysis from sensitive sinks (`execute`, `open`, `exec`, `pickle.loads`) upstream to input boundaries. Mark a function when it lies on a relevant control-flow path, contains a branch or exception, and has data dependence between its parameters and sink parameters (Section III-C, p. 4).
3. Match defensive patterns such as `raise ValueError`, `raise PermissionError`, and `execute(..., ?)`; save matched snippets and context as substring or regex anchors (Section III-C, p. 4).
4. Derive invariant-level anchors from a task library. The examples require all SQL queries to be parameterized and all file paths to be normalized; static analysis checks them after each iteration (Section III-C, p. 4).
5. Assign each anchor type, selector, lock level, priority, creation iteration, and confidence. CRITICAL/HIGH anchors do not expire; MEDIUM and LOW receive TTL 10 and 5, reset when present, and migrate when equivalent functionality moves (Section III-C, p. 4).
6. For a refactor, submit an anchor-migration request. GatekeeperAgent checks equivalent security invariants, original defense scope, and interface compatibility; CRITICAL migration additionally needs equivalence evidence or security review (Section III-C, p. 4).

The three cases in Figure 3 show the purpose. A validation function removed during “simplify the code” still leaves parameterized SQL and therefore passes Semgrep, but the function anchor rejects it. Replacing concrete exception handling with an empty handler is caught by a pattern anchor. An administrator shortcut that bypasses authorization is caught by an invariant anchor even outside SAST data-flow coverage (Section IV-E, pp. 7–8).

Inference: In Verus, represent each invariant as a contract or proof predicate over the Rust API, and expose security-critical state through ghost/spec data that proofs can relate to executable fields. Use `requires`/`ensures` on executable functions, `invariant` clauses on loops, and proof functions/lemmas to establish parameterization, path normalization, or authorization before a sink call. AST/name mining and TTL migration remain orchestration outside Verus; Verus proves the selected invariant and interface relation, but it does not automatically discover anchors. A refactor should preserve the same `ensures` and call-site proof obligations, with a separate proof of equivalence before changing an anchor's representation.

Evidence and limits: SCAFFOLD's anchor-enabled ablations have 8.75–9.44 anchors per chain; anchor-violation rate is 19.52% without assimilation and 16.25% with it (Table VI, p. 8). The authors limit language support to Python and Java and require language-specific parsers, scanners, and invariant libraries (Section V-A, p. 9). Inference: A Verus product would need Rust-specific sink models and contracts; the paper's naming and pattern heuristics are incomplete evidence for arbitrary Rust.

## technique 2: four-layer gated verification

What it is: GatekeeperAgent checks every candidate with correctness, safety monotonicity, diff budget, and anchor integrity. The gate is (G(P,P',Φ)=V_{corr}(P')\land V_{sec}(P,P')\land V_{diff}(P,P')\land V_{anchor}(P',Φ)) (Section III-A, p. 3). A critical failure stops later checks. The paper states: “accept the candidate when all checks pass or only warnings are present; trigger re-implementation when FAIL_RETRY occurs and retry budget remains; rollback to the previous safe version when retries are exhausted or a FAIL is returned” (Section III-D, p. 5).

Step-by-step procedure from Algorithm 1 (Section III-B, p. 3):
1. Set (P=P_0), empty failure knowledge (K), and baseline latent-security review (S_0).
2. For each task τ_i, mine anchors Φ and set retry counter (r=0).
3. Implement a candidate (P') under Φ and (K); run tests for correctness.
4. Compute the SAST change ΔVstep, line-change magnitude ΔL, and anchor verification result.
5. Accept when tests pass, ΔVstep ≤ δmax, |ΔL| ≤ B, and anchors pass. Otherwise generate a structured counterexample, assimilate it into (K), increment (r), and retry.
6. On retry exhaustion, keep (P) unchanged. Review the final (P) only for SSDR measurement.

The safety layer compares changed complexity and normalized SAST risk: ΔCH ≤ δmax and Δρ ≤ ε; the diff layer bounds added and deleted lines (Section III-D, p. 5). In experiments δmax=0, so the formal state-transition guarantee is non-increasing (V) under the gate (Sections III-A–B, p. 3).

Inference: In Verus, the correctness layer is a compile-time proof of the candidate's `requires`/`ensures`; loop invariants and proof functions discharge the local obligations. A safety-monotonicity check can be a ghost/spec measure with an `ensures` relation between old and new abstract states, while diff budgets and anchor presence are CI orchestration checks around the Verus proof. Verus has no paper-defined `V` or automatic change comparison, so those metrics and rollback policy remain external. `old(...)` in postconditions can relate pre-state values where supported; a proof function is not runtime code.

Evidence: Table V compares methods on GPT-5-Nano under DRCH (Critical/High SAST scope). Post-hoc SAST and Hybrid Guard report DR 0% and SMR 100% yet SSDR 20.8% and 12.5%; full SCAFFOLD reports DR 0%, SMR 100%, SSDR 2.1%, and ΔS −0.35 (Table V, p. 8). These denominators are the chains in that comparison; the paper does not state a separate chain count in the table caption. Inference: The result supports combining proof obligations with semantic review, because a Verus proof of the written contract cannot detect a missing contract or an unmodeled security property.

## technique 3: CEGIS-style failure assimilation

What it is: The framework keeps structured counterexamples rather than only pass/fail. AssimilatorAgent classifies rejected attempts by correctness, safety, anchor, or diff-budget failure, recording tests, messages, vulnerability type/location, or change scale (Section III-E, p. 5). Recurrent failures are generalized into natural-language rules, such as “avoid deleting functions whose names contain validate” and “use parameterized queries instead of string concatenation,” then retrieved at the next iteration (Section III-E, p. 5). Current failures give immediate repair direction; historical failures form a knowledge base (Section III-E, p. 5).

The CEGIS analogy is explicit: classical CEGIS generates a candidate, verifies it, and uses counterexamples to contract the search space; SCAFFOLD replaces formal counterexamples with structured reports from static analysis and anchor checks (Section III-B, p. 3). This trades formal completeness for handling properties difficult to formalize.

Inference: A Verus loop can feed failed proof diagnostics, counterexample models, and violated postconditions into an external repair agent. The agent may propose a proof lemma or code change, but only Verus acceptance should commit the candidate. A reusable failure record should identify the function, obligation, model values, and successful repair; this is an engineering mapping, not a mechanism claimed by the paper.

Evidence: In Table VI, Gate-Only has retry fix-success rate (FSR) 20.83% and task-completion rate (TCR) 72.38%; No-Assimilation has FSR 23.19% and TCR 66.19%; full SCAFFOLD has FSR 52.71%, TCR 77.14%, and counterexample-effectiveness improvement +29.52 percentage points (Table VI, p. 8). The full method's rejection rate is 38.94%, versus 52.08% for No-Assimilation. Inference: Assimilation recovers useful evolution after stronger checks, but these are benchmark-specific rates over the paper's 24 small task samples and cannot establish production-scale repair reliability.

## what is proved, measured, and trusted

The paper proves only the algebraic implication that setting δmax=0 in its gate enforces non-increasing measured vulnerability count (V); experiments measure SAST DR/SMR, LLM-reviewed SSDR/RDR, utility, and ablation metrics. The implementation's tests, Semgrep rules, AST/data-flow analyses, anchor selectors, LLM reviewer, and model outputs remain trusted or partially trusted components. SSDR depends on Claude Opus 4.5 review and manual confirmation of three cases; the authors call reviewer noise an unavoidable limitation (Section V-A, p. 9). The benchmark is single-file/small-module code, 24 samples, Python/Java, and 10 iterations, so industrial multi-file scalability is not measured (Sections IV-A and V-A, pp. 5–6, 9).

Inference: For VL, the principal threat is specification incompleteness: agent-written Rust can pass Verus while omitting the security invariant, using an unsound external-body boundary, or relying on an inaccurate model of a dependency. The paper's gate is therefore a useful process pattern but not a proof of end-to-end security. Existing Verus studies already cover contracts, loop invariants, state machines, and solver-backed proofs; VL should reuse those constructs and focus on anchor discovery, proof-preserving iterative edits, and measured repair rather than redoing a generic CEGIS description.

The paper reports an internal inconsistency in scope that a reader should preserve: the introduction calls the observational study 96 GPT-4o chains, while the broader setup describes 288 chains across three models. These are different stages, not a single denominator (Sections I-A and IV-A, pp. 2 and 6). Table IV's DR/RDR percentages are per model/category rows over the corresponding chains; Table V is a separate GPT-5-Nano method comparison. Inference: Results must never combine these denominators.

## techniques for the catalog

- semantic anchor mining — mine function, pattern, data-flow, and invariant anchors; assign hardness, priority, TTL, and migration checks before iterative edits
- four-layer gated verification — accept only candidates passing tests, non-increasing safety metrics, diff budgets, and anchor integrity, with retry or rollback
- CEGIS failure assimilation — turn structured gate failures into reusable repair knowledge and feed it into subsequent candidate generation
- latent-security evaluation — use an independent semantic reviewer to detect defensive-logic loss that SAST misses, while reporting the reviewer and benchmark limits
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
