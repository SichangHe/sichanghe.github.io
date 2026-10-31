# SCOPE: Leveraging Subgoal Critiques for Code Generation
(authored by agents unless marked 🧑)
Tag: `zhang2026scope`, [paper](https://arxiv.org/abs/2607.05810)

## scope and result
SCOPE is a two-model code-generation loop: a frozen coder proposes a program and a prover-initialized critic emits structured obligations for revision. It is a formal-verification-inspired workflow, not a verifier. The paper is explicit: “The output is natural language, not a machine-checked Lean proof” (Section II, p. 2). Its three stages are supervised fine-tuning, process-aligned reinforcement learning, and critique-guided inference (Section I, p. 2).

The method's reusable idea is to turn an implicit specification into explicit subgoals, gap analysis, and robustness checks. The paper says, “Each emitted subgoal is a natural-language semantic obligation, such as a precondition, an invariant, an output constraint, or an edge case requirement.” (Section II, p. 2).

## technique: structured prover-style critique
What it is: given task `x` and draft `p0`, the critic returns `y=(s,g,c)`, where `s` are subgoals, `g` is gap analysis, and `c` is a robustness checklist. The output uses the exact tags `<subgoal>...</subgoal> <gap_analysis>...</gap_analysis> <checklist>...</checklist>` (Section V, p. 4).

When to use it: use before a repair when requirements, invariants, or boundary cases are implicit and test feedback is too weak. Do not describe the result as a proof; the authors say SCOPE “does not run this proof search on Python code” (Figure 2 caption, p. 3).

Steps from the paper: (1) let the coder produce `p0`; (2) feed `(x,p0)` to the critic; (3) parse the three fields; (4) ask the coder for `p1=C(x,p0,y)`; (5) run benchmark tests; (6) repeat if desired. The paper states, “The coder first produces an initial draft program p0. The critic then receives (x, p0) and returns a structured critique” (Section V-D, p. 5).

Verus form (Inference): have an agent produce candidate Rust plus a checklist of `requires`, `ensures`, loop `invariant`s, and missing lemmas. A second pass turns each checklist item into a Verus contract, then `cargo verus` is the acceptance gate. Keep the critic's text outside executable code; only verified contracts and proof functions affect the artifact. Verus constructs here are an inferred integration, not in the paper.

Evidence: on LiveCodeBench V6, SCOPE Full solves 69/175 (39.4% pass@1), versus Reflexion 64/175 (36.6%), Self-Refine 58/175 (33.1%), and coder-only 36/175 (20.6%) (Table I, Section VII-A, p. 7). On BigCodeBench, SCOPE Full solves 63/148 (42.57%), while coder-only solves 51/148 (34.46%) (Table III, p. 8). Denominators and benchmark settings are those captions/tables. These are execution tests, not formal proofs.

## technique: execution-grounded critic training
What it is: SFT first teaches the output interface; GRPO then combines dense semantic quality with sparse downstream execution improvement. The dense reward is `R_dense = λ_emb R_emb + λ_qual R_qual`; the sparse reward is `R_sparse(y)=S(p(y))-S(p0)` (Section V-C, pp. 5–6).

Steps: (1) construct critique traces with a tutor LLM; (2) SFT a DeepSeek-Prover-V2-7B critic to emit the tags; (3) score embedding similarity against target subgoals/gap/checklist; (4) score concision, grounding, parseability, and usefulness; (5) revise with the frozen coder and execute tests; (6) reward improvement over the original draft; (7) optimize with the KL-regularized objective in Equation 4. The paper says, “The sparse term ensures that the critic is ultimately optimized” for downstream improvement (Section V-C, p. 6), with the sentence continuing across the column to explain execution grounding.

Verus form (Inference): replace test-only `S` with a tiered signal: parse success, Verus verification success, and property-test results. Rewarding a failed proof as success would be unsound, so the final gate must inspect Verus diagnostics directly. Use no Verus keyword absent from the documented subset; contracts belong on executable functions, while mathematical facts belong in `spec fn`, proof functions, or lemmas as supported by the project conventions.

Evidence and assumptions: the paper's reward quality uses a frozen GPT-5.2 judge (Section V-C, p. 5), and execution scores include partial progress and runtime penalties. The judge, tutor traces, coder, benchmark tests, and base models are trusted operational components; no theorem establishes that critiques are complete. Inference: this creates a product risk if an agent treats fluent obligations as sufficient evidence.

## technique: repair localization and obligation-state analysis
What it is: compare coder-only failures with successful revisions to determine whether the critic identifies the trigger line and encourages a compact edit. The paper reports that SCOPE “rescues more failed solutions than Reflexion (19 vs. 16)” and obtains “42.1% vs. 31.3% localized wins” (Section I, p. 2; Table IV, p. 8).

Steps: (1) select tasks where coder-only fails and a method succeeds; (2) identify the failure-trigger line in the baseline; (3) compare the changed hunk in the repaired program; (4) label whether the repair is localized; (5) compare recovery, localization, edit size, and crash-like failures across methods. These steps are described in Section VI-E and Table IV; the paper does not claim a formal localization proof.

Verus form (Inference): preserve the same analysis but define localization around changed verified functions and proof obligations. A useful metric is the fraction of failures for which one contract/lemma change makes the verifier pass, with denominator reported per benchmark. This can reveal whether agent repairs weaken specifications; require unchanged postconditions or independently checked tests to guard against that failure.

## what is proved, trusted, and left open
SCOPE proves no semantic property of generated programs. Its measured claims are pass@1 and repair/localization statistics under stated benchmark and model settings. The paper itself concludes that it adapts subgoal decomposition “without claiming full formal verification” (Section IX, p. 9).

Threat assessment for agent-written verified Rust (Inference): medium for workflow quality, low for assurance. A critic may improve contracts and repair targeting, yet a wrong or incomplete obligation can still yield compiling code that fails the intended specification. Verus verification and specification review remain the decisive evidence.

## techniques for the catalog
- structured subgoal critique: emit subgoals, gap analysis, and robustness checks before code repair
- critique-guided revision loop: coder draft, critic fields, revised program, then execution or verification feedback
- dense-plus-sparse training: combine semantic structure rewards with downstream improvement over the original draft
- repair localization: measure trigger-line recovery and edit-hunk compactness on baseline failures
