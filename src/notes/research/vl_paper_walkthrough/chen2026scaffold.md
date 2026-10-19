# SCAFFOLD-CEGIS: Preventing Latent Security Degradation in LLM-Driven Iterative Code Refinement
(authored by agents unless marked 🧑)
Tag: `chen2026scaffold`, [paper](https://arxiv.org/abs/2603.08520)
## what the paper establishes

The paper studies whether repeated LLM edits preserve security. Its formal model treats a program chain as (C=\langle P_0,…,P_n\rangle), with vulnerability count (V(P)). Safety monotonicity requires (V(P_{i+1})\le V(P_i)) for every step (Section III-A, p. 3). The authors attribute degradation to specification drift: the model optimizes functionality, performance, maintainability, and security together, so security constraints can be forgotten. The paper states: “When security constraints exist only as soft prompts, the optimization trajectory gradually departs from the intended security specification, for example by removing validation logic, breaking API compatibility, or introducing resource leaks.” (Section I-A, p. 2).

The observational GPT-4o experiment uses 96 chains and Semgrep's p/default rules. At iteration 10, 43.7% of chains exceed baseline vulnerability counts; explicit security-hardening prompts still leave a 28.6% degradation rate (Section IV-A, p. 7). The broader RQ1 protocol uses 24 task samples (six categories, two samples per category in Python and Java), 10 rounds, four strategies, and three models: 288 chains and 2,880 steps (Section IV-A, pp. 6–7). The authors report that GPT-5-Nano has overall DR 10.5%, Claude Sonnet 4.5 6.2%, and DeepSeek-V3 4.2% (Table IV, p. 9); DR counts Critical/High vulnerabilities there, while RDR is reliability degradation from LLM review.

The paper distinguishes SAST-visible degradation from latent security degradation (SSDR), such as deleting validation, weakening exception handling, or bypassing permission checks without triggering a known rule. Its key warning is: “static-analysis rules cannot cover structural degradations such as the removal of defensive logic or the weakening of exception handling” (Abstract, p. 1). The independent Claude Opus 4.5 reviewer identifies latent defects offline; it does not participate in candidate acceptance (Section IV-A, p. 7). The paper acknowledges that SSDR is reviewer-dependent and should be read as a trend indicator, not an exact count (Section V-A, pp. 10–11).

## technique 1: semantic anchor mining

What it is: SecurityArchitectAgent converts security-critical structure into an explicit anchor set Φ = ⟨I,A,R⟩: invariant anchors, API-signature anchors, and a security-rule base (Sections III-B–C, pp. 4–6). Anchors are hard or soft, have priority CRITICAL/HIGH/MEDIUM/LOW, and record selector, creation iteration, and confidence. The paper says: “Semantic anchors are formal representations of security-critical elements in code, used to prevent accidental modification or deletion during iteration” (Section III-C, p. 4).

How the paper does it:
1. Find function-level candidates with regexes for names such as `validate_*`, `sanitize_*`, and `auth*`; parse signatures, parameters, and return types with an AST. Record public API parameter lists to detect compatibility breaks (Section III-C, pp. 4–5).
2. Run data-flow analysis from sensitive sinks (`execute`, `open`, `exec`, `pickle.loads`) upstream to input boundaries. Mark a function when it lies on a relevant control-flow path, contains a branch or exception, and has data dependence between its parameters and sink parameters (Section III-C, p. 5).
3. Match defensive patterns such as `raise ValueError`, `raise PermissionError`, and `execute(..., ?)`; save matched snippets and context as substring or regex anchors (Section III-C, p. 5).
4. Derive invariant-level anchors from a task library. The examples require all SQL queries to be parameterized and all path operations to be normalized; static analysis checks them after each iteration (Section III-C, p. 5).
5. Assign each anchor type, selector, lock level, priority, creation iteration, and confidence. CRITICAL/HIGH anchors do not expire; MEDIUM and LOW receive TTL 10 and 5, reset when present, and migrate when equivalent functionality moves (Section III-C, p. 5).
6. For a refactor, submit an anchor-migration request. The verification agent checks equivalent security invariants, original defense scope, and interface compatibility; CRITICAL migration additionally needs equivalence evidence or security review (Section III-C, pp. 5–6).

Section IV-E describes three cases: deleting `validate_user_input` while retaining parameterized SQL, replacing concrete exception handling with an empty handler, and adding an administrator shortcut that bypasses permission checks. The corresponding defenses are function, pattern, and invariant anchors (pp. 8–9). Figure 3 illustrates related cases with different details: it removes `is_safe`, replaces audit logging and rethrowing with informational logging, and removes an administrator check during a batch-deletion request (p. 10). These are illustrations of defensive-logic loss outside the reported Semgrep coverage.

Inference: In Verus, represent each invariant as a contract or proof predicate over the Rust API, and expose security-critical state through ghost/spec data that proofs can relate to executable fields. Use `requires`/`ensures` on executable functions, `invariant` clauses on loops, and proof functions/lemmas to establish parameterization, path normalization, or authorization before a sink call. AST/name mining and TTL migration remain orchestration outside Verus; Verus proves the selected invariant and interface relation, but it does not automatically discover anchors. A refactor should preserve the same `ensures` and call-site proof obligations, with a separate proof of equivalence before changing an anchor's representation.

Evidence and limits: SCAFFOLD's anchor-enabled ablations have 8.75–9.44 anchors per chain; anchor-violation rate is 19.52% without assimilation and 16.25% with it (Table VI, p. 10). The authors limit language support to Python and Java and require language-specific parsers, scanners, and invariant libraries (Section V-A, pp. 10–11). Inference: A Verus product would need Rust-specific sink models and contracts; the paper's naming and pattern heuristics are incomplete evidence for arbitrary Rust.

## technique 2: four-layer prerequisite checks

What it is: The verification agent checks every candidate with correctness, safety monotonicity, diff budget, and anchor integrity. Its acceptance condition is (G(P,P',Φ)=V_{corr}(P')\land V_{sec}(P,P')\land V_{diff}(P,P')\land V_{anchor}(P',Φ)) (Section III-A, p. 3). A critical failure stops later checks. The paper states: “accept the candidate when all checks pass or only warnings are present; trigger re-implementation when FAIL_RETRY occurs and retry budget remains; rollback to the previous safe version when retries are exhausted or a FAIL is returned” (Section III-D, p. 6).

The correctness layer requires all tests to pass, otherwise returning FAIL_RETRY. The anchor layer checks hard anchors using substring search, regex matching, AST parsing, or semantic validation: missing CRITICAL anchors cause rejection, missing HIGH anchors cause retry, and lower-priority losses produce warnings (Section III-D, p. 6).

Step-by-step procedure from Algorithm 1 (Section III-B, p. 4):
1. Set (P=P_0), empty failure knowledge (K), and baseline latent-security review (S_0).
2. For each task τ_i, mine anchors Φ and set retry counter (r=0).
3. Implement a candidate (P') under Φ and (K); run tests for correctness.
4. Compute the SAST-count difference ΔVstep, net line-count change ΔL = |P'| − |P|, and anchor verification result.
5. Accept when tests pass, ΔVstep ≤ δmax, |ΔL| ≤ B, and anchors pass. Otherwise generate a structured counterexample, assimilate it into (K), increment (r), and retry.
6. On retry exhaustion, keep (P) unchanged. Review the final (P) for SSDR and RDR evaluation; the review does not determine candidate acceptance.

The detailed safety layer uses ΔCH = (Ccurr + Hcurr) − (Cprev + Hprev), the change in Critical/High vulnerability counts, and Δρ, the change in normalized SAST risk, where ρ = 1000 × SAST_Risk / max(LOC, 1). Acceptance requires ΔCH ≤ δmax and Δρ ≤ ε. The diff layer separately bounds added and deleted lines (Section III-D, p. 6). Algorithm 1 instead presents a simplified check on the SAST-count difference and absolute net line-count change (p. 4). The experiments set δmax=0. Inference: The claimed monotonicity must be interpreted within the selected scanner and metric scope; these conditions cannot establish that every security property is preserved.

Inference: In Verus, the correctness layer is a compile-time proof of the candidate's `requires`/`ensures`; loop invariants and proof functions discharge the local obligations. A safety-monotonicity check can be a ghost/spec measure with an `ensures` relation between old and new abstract states, while diff budgets and anchor presence are CI orchestration checks around the Verus proof. Verus has no paper-defined `V` or automatic change comparison, so those metrics and rollback policy remain external. `old(...)` in postconditions can relate pre-state values where supported; a proof function is not runtime code.

Evidence: Table V compares methods on GPT-5-Nano under DRCH (Critical/High SAST scope). Post-hoc SAST and Hybrid Guard report DR 0% and SMR 100% yet SSDR 20.8% and 12.5%; full SCAFFOLD reports DR 0%, SMR 100%, SSDR 2.1%, and ΔS −0.35 (Table V, p. 9). These denominators are the chains in that comparison; the paper does not state a separate chain count in the table caption. Inference: The result supports combining proof obligations with semantic review, because a Verus proof of the written contract cannot detect a missing contract or an unmodeled security property.

## technique 3: CEGIS-style failure assimilation

What it is: The framework keeps structured counterexamples rather than only pass/fail. AssimilatorAgent classifies rejected attempts by correctness, safety, anchor, or diff-budget failure, recording tests, messages, vulnerability type/location, or change scale (Section III-E, p. 6). Recurrent failures are generalized into natural-language rules, such as “avoid deleting functions whose names contain validate” and “use parameterized queries instead of string concatenation.” Similar historical cases are retrieved at the next iteration (Section III-E, p. 6). Current failures give immediate repair direction; historical failures form a knowledge base. The extracted rules are delivered as developer messages to ImplementerAgent. Feedback also adjusts anchors: repeated violations followed by acceptance can lower priority or change hard anchors to soft; frequently implicated code elements can acquire new anchors and higher priority (Section III-E, p. 6).

The CEGIS analogy is explicit: classical CEGIS generates a candidate, verifies it, and uses counterexamples to contract the search space; SCAFFOLD replaces formal counterexamples with structured reports from static analysis and anchor checks (Section III-B, p. 4). This trades formal completeness for handling properties difficult to formalize.

Inference: A Verus loop can feed failed proof diagnostics, counterexample models, and violated postconditions into an external repair agent. The agent may propose a proof lemma or code change, but only Verus acceptance should commit the candidate. A reusable failure record should identify the function, obligation, model values, and successful repair; this is an engineering mapping, not a mechanism claimed by the paper.

Evidence: In Table VI, the verification-only ablation has retry fix-success rate (FSR) 20.83% and task-completion rate (TCR) 72.38%; No-Assimilation has FSR 23.19% and TCR 66.19%; full SCAFFOLD has FSR 52.71%, TCR 77.14%, and reported CER +29.52% (Table VI, p. 10). The full method's rejection rate is 38.94%, versus 52.08% for No-Assimilation. Inference: Assimilation recovers useful evolution after stronger checks, but these are benchmark-specific rates over the paper's 24 small task samples and cannot establish production-scale repair reliability.

## what is proved, measured, and trusted

The paper states a formal implication from δmax=0 to non-increasing vulnerability count (Section III-A, Eq. 6, p. 3), and Algorithm 1 implements acceptance using static-analysis results (p. 4). It explicitly acknowledges that replacing formal verification with static analysis and anchor checking “trades formal completeness for practical applicability in real software-engineering settings” (Section III-B, p. 4). Experiments measure SAST DR/SMR, LLM-reviewed SSDR/RDR, utility, and ablation metrics. Inference: Tests, Semgrep rules, AST/data-flow analyses, anchor selectors, and reviewer judgments limit what these results establish.

SSDR depends on Claude Opus 4.5 review; only the three representative cases are reported as manually confirmed. The authors write: “SSDR should therefore be interpreted as a trend indicator of latent-security quality change, not an exact count; our core claims rely on relative ranking and magnitude gaps across methods” (Section V-A, pp. 10–11). The benchmark uses 24 self-contained single-file samples, Python/Java, and 10 refinement rounds; industrial multi-file scalability requires further validation (Section IV-A, pp. 6–7; Section VI, p. 11).

The paper distinguishes two experimental stages: the introduction calls the observational study 96 GPT-4o chains, while the broader setup describes 288 chains across three models. These are different stages, not a single denominator (Sections I-A and IV-A, pp. 2 and 6–7). Table IV's DR/RDR percentages are per model/category rows over the corresponding chains; Table V is a separate GPT-5-Nano method comparison. Inference: Results must never combine these denominators.

## techniques for the catalog

- semantic anchor mining — mine function, pattern, data-flow, and invariant anchors; assign hardness, priority, TTL, and migration checks before iterative edits
- four-layer prerequisite checks — accept only candidates passing tests, non-increasing safety metrics, diff budgets, and anchor integrity, with retry or rollback
- CEGIS failure assimilation — turn structured verification failures into reusable repair knowledge and feed it into subsequent candidate generation
- latent-security evaluation — use an independent semantic reviewer to detect defensive-logic loss that SAST misses, while reporting the reviewer and benchmark limits
