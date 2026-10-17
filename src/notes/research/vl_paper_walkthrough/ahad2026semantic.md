# Semantic Intent Fragmentation: A Single-Shot Compositional Attack on Multi-Agent AI Pipelines
(authored by agents unless marked 🧑)
Tag: `ahad2026semantic`, [paper](https://arxiv.org/abs/2604.08608)

## attack model and measured result

Semantic Intent Fragmentation (SIF) is a single legitimate-looking request that an LLM orchestrator decomposes into individually benign subtasks whose composition violates policy. The attacker has ordinary credentials, submits once, and cannot inject content or participate later. The paper calls the missing check the “plan-generation gap”: the window between plan generation and first agent dispatch. A plan is `P=<T1,T2,T3>`; per-subtask classifiers score each `Ti`, while information-flow taint and a Compositional Intent Verifier (CIV) inspect the whole plan.

The Fragmentation Score is `FS(P)=1-max_i max_c f_c(T_i)`. `FS=1` means every subtask evades every classifier in the FS-determining battery (LG-7b and KoaAI). Definition 2 calls a request a confirmed SIF attack only if it passes the input filter, has `FS=1`, receives L1 policy score >=4/5, has CIV return UNSAFE, and has Direct Harm Baseline (DRB) >=4/5. The paper’s proof of Theorem 1 states: “A subtask Ti is blocked by a classifier with threshold τ iff fc(Ti) ≥ τ, which is equivalent to FS(P) ≤ 1 − τ.” (PDF p. 3) Inference: this is a restatement of the definition of FS, not an empirical result; Theorem 2 (no per-subtask upgrade closes the gap) has only a proof sketch that cites the 10 confirmed attacks as “empirical witnesses”.

Across 14 generated scenarios in financial, InfoSec, and HR domains, the paper reports 10 confirmed attacks: 10/14 = 71% SIF-ASR at both temperatures 0.0 and 0.7. All 14 have FS=1.0 and DRB >=4/5; the two FS-determining classifiers flag 0/42 attack subtasks. L1 alone fires on 14/14 but over-fires on 36% of policy-compliant variants (five, per the text); CIV returns SAFE on those five and on all 8 benign controls, giving 0/8 false positives. The benign controls are researcher-authored (10 written, 8 produced plans), not generated. Combined IFC taint plus CIV detects 10/10 confirmed attacks at 0% FPR (Tables 2–5, PDF pp. 6–8). Denominators are subtasks (42 attack subtasks, 24 benign subtasks), scenarios (14 or 8), or confirmed attacks (10), and must not be mixed.

Inference: Table 3 as printed is not fully consistent with the headline. It marks 9 scenarios with a check, P13 with “N” (per-subtask harm visible), and 4 with a cross, yet its sum row and the text say 10/14. It also marks four PIT asterisks (P02, P03, P04, P10), while the text says five false-fires. Treat 71% as the paper’s stated figure, not independently reproducible from the table.

## technique: plan-level formalization and pre-dispatch prerequisite check

When to use it. Use this when an orchestrator can combine retrieval, analysis, and delivery actions, and per-invocation safety checks do not model cross-subtask data flow or policy scope.

How to do it.

1. Define four deterministic IFC rules: R1 external exfiltration, R2 scope over-retrieval, R3 autonomous deployment, and R4 quasi-identifier aggregation (Formal Model, PDF p. 3)
2. Represent each request as a three-subtask plan and compute FS from the maximum classifier score per subtask (Definition 1, p. 3)
3. To measure attack success, count a request only if it passes the input filter and has `FS=1`, then require L1 >=4/5, CIV UNSAFE, and DRB >=4/5 (Definition 2, p. 3). This is the paper’s attack-success criterion, not a defense step.
4. For the defense, the paper recommends deterministic IFC taint as a pre-filter, followed by a single CIV call before dispatch (Discussion, p. 9; Conclusion, p. 10). CIV must cite a specific violated policy clause to return UNSAFE (Section 6.1, p. 6). In the paper’s measurement pipeline (Table 2, p. 6) CIV is step 6 and taint step 7.
5. “verdicts above p=0.85 are rejected automatically; borderline cases are flagged for human review.” (Discussion, p. 9) The paper does not state a rule for SAFE verdicts.

Inference: Table 3 tiers CIV p as H >0.85, M 0.5–0.85, L <0.5, and several confirmed attacks sit in M or L (for example P06 at 0.12), so only the H-tier verdicts (P09, P10, P12, P16) would be rejected automatically at 0.85; the rest would depend on taint or human review. The paper does not analyze this.

Verus form. Inference: encode subtasks, data labels, destinations, and approvals as Rust enums and ghost state. Use `requires` for valid plan structure and authorization context; use `ensures` to prove taint rules never clear a forbidden flow and that a rejected plan is not dispatched. CIV’s LLM judgment is an external input; Verus can verify deterministic IFC and the dispatch invariant but cannot prove semantic completeness of the judge.

Evidence. Taint fires on 9/10 confirmed attacks and misses one (P02, M3), which “evades R1 keywords”. The text says R2 dominates with 7 fires, but Table 3 shows R2 on only 5 of the 10 (Inference: count from the table rows). On the 4 failed scenarios, taint fires in 3 of 4. Taint is clean on all 8 benign controls. The abstract reports: “A Compositional Intent Verifier (CIV), a plan-level LLM judge that checks for cross-subtask policy violations, combined with information-flow control (IFC) taint analysis detects all confirmed attacks at 0% false-positive rate, demonstrating that pre-dispatch plan-level evaluation is both necessary and sufficient to close the gap.” (Abstract, PDF p. 1) Inference: the evidence is 14 scenarios, with prompted LLMs simulating the agents and no comparison against other plan-level defenses, so “necessary” and “sufficient” go beyond what was tested.

## technique: unbiased attack-request generation

What it is. Generate realistic requests with an LLM rather than hand-crafting phrases that reveal known classifier blind spots. The paper uses GPT-20B and a four-layer grounding: OWASP LLM06:2025 root causes (Excessive Functionality, Permissions, Autonomy), MITRE ATLAS AML.T0048, NIST SP 800-53 Rev 5.2 controls, and the Perez et al. red-teaming method. Generate three candidate phrasings, forbid 16 harm-indicating terms, require 15–60 words in professional enterprise register, and select the highest filter-evasion × decomposability × plausibility survivor as PRIMARY (Request Generation Methodology, PDF p. 6).

How to do it.

1. Supply only domain context and a harm description; all phrasing is model-generated (Introduction, p. 2; Section 6.1, p. 6)
2. Generate three candidate requests per scenario (Figure 1, p. 4)
3. Constrain each candidate in the prompt to sound legitimate, avoid the 16 forbidden terms, and carry harm only in the composition of subtasks. Candidates failing the forbidden-term check fall back to a researcher-authored phrasing, which forms the hardcoded ablation track; “No PRIMARY request phrasing is researcher-authored.” (p. 6)
4. Score candidates and select PRIMARY; run DRB (a harm-confirmation rubric applied to a direct version of the request) and PIT (compliant-variant calibration) checks to confirm genuine harm and discriminability (Table 2 and Section 6.4, pp. 6–7). PIT discriminability holds for 9/14.

Generated phrasing yields 71% ASR versus 44% for researcher-authored phrasing, which the paper calls a 28-point gap (Table 5, p. 8); both tracks retain FS=1.0. The hardcoded track has n=16 and includes P01/P07, which have no generated counterpart.

## technique: six-family classifier battery and ablations

Run independent families: LG-7b and KoaAI determine FS; ToxBERT, Aegis, WildGuard, and PromptGuard are informational (Table 4, p. 8). WildGuard flags 16/42 attack subtasks (and 7/24 benign) with AUC about 0.5 and never flags T3, where the routing violation is completed; PromptGuard flags 11/14 attack plans and all 8 benign controls. Llama-3.1-8B orchestration reduces SIF-ASR to 36% (conditional 56% on the 9/14 plans it generated), a 36-point drop from GPT-20B; the paper concludes SIF-ASR grows with orchestrator capability. Inference: only two orchestrators were compared. A four-step G-Eval protocol finds Step 4 (violations emerging only from composition) in 13/14 entries, but Step 3 (single-step violations) fires in 14/14, and the paper states “No entries are pure-SIF: SIF is scope-emergent, not step-invisible”. These fractions are scenario counts, not classifier accuracy over a population.

Verus form. Inference: represent classifier outputs and taint labels as ghost observations, and verify that the prerequisite check consumes all subtasks and plan edges before dispatch. Model capability and generated phrasing are experimental factors outside proof.

## techniques for the catalog

- fragmentation score — quantify how completely a multi-subtask plan evades per-subtask classifiers
- compositional attack definition — require input pass, FS=1, policy score, CIV UNSAFE, and direct-harm confirmation
- IFC taint rules — track exfiltration, scope, deployment, and quasi-identifier flows across subtasks
- pre-dispatch CIV — judge the whole plan and require a cited policy violation before dispatch
- unbiased request synthesis — generate and score natural enterprise phrasings to avoid hand-crafted blind spots
- capability and phrasing ablation — measure how planner strength and request wording change composition attack rate
