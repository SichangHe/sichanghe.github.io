# Compiler-Guided Adaptive Proof Search with Cross-Model Synergy on Context-Dependent Theorem Proving
(authored by agents unless marked 🧑)
Tag: `liu2026compiler`, [paper](https://arxiv.org/abs/2608.18084)

This paper treats whole-proof generation in real Lean 4 projects as controlled search. Project context includes local definitions, lemmas, naming conventions, and proof patterns. The central claim is that a failed proof can contain useful progress, but unconditional revision can destroy it. The abstract reports: “Within the pass@32 budget, our method improves average pass rate by 12.8 percentage points while reducing LLM calls by 21.9%” (Abstract, p.1). The method alternates exploration of diverse starting proofs with exploitation of one current-best proof, using Lean verification as both a final check and feedback source (§3, pp.3–4). The paper observes, “A revised proof may fix one error while introducing another, or degrade a partially correct proof” (§1, p.2).

## technique: compiler-grounded feedback

For each candidate, invoke Lean immediately. On failure, extract the error position and message and align it to the tactic line that caused it (§3.1, p.4). The paper says, “We use the Lean 4 compiler not only as a verifier, but also as a source of structured error feedback and lightweight automatic tactics” (§3.1, p.4). Feed this compact, line-level report to both a repair model and a comparison controller. The implementation keeps only one line of surrounding context per error and maps error positions to proof lines (Appendix C, pp.19–20). Before any model call, run `AUTO SOLVE`: deterministic closers such as `rfl`, `simp`, `omega`, `linarith`, `norm_num`, `ring`, and `decide`, then Lean library search (`exact?`, `hint`) (§3.1, p.4; Appendix C, p.20).

Steps: validate the project context; try the automatic tactics; generate a proof; compile; if it fails, parse each diagnostic into location, tactic line, and message; send the report to repair and judging; repeat until verified or the budget ends. Inference: for Verus, the analogous feedback is the `cargo verus` error location/message plus any failed `requires`, `ensures`, invariant, or trigger obligation. The paper's Lean tactic names do not carry over. Inference: automatically retrying deterministic Verus lemmas or arithmetic proof steps before an LLM call could reduce cost, but such a tactic list must be measured for the target codebase.

## technique: dual-model exploration

A generalist model and a Lean-specialist model each generate one complete candidate from the theorem and preceding project context (§3.2, p.4). The generalist (GPT-5-mini in the main experiment) has long-context reasoning and uses project declarations well; the specialist (DeepSeek-Prover-v2-7B) tends to produce precise Lean tactics but can underuse context (§3.2, p.4; §4.2, p.6). Verify both immediately; return a verified one if either succeeds. Otherwise pass both, with their compiler reports, to the pairwise judge. This is deliberately different from independent pass@k sampling: the failed candidates are retained as possible starting states.

Steps: sample one candidate from each model; compile each; terminate on success; otherwise compare them and retain the more promising candidate as current best. On stagnation, sample fresh candidates from both models again rather than from only the model that produced the stuck proof (§3.4, p.5). Inference: VL can pair a general code model with a Verus-tuned model, but the paper does not show that model specialization transfers from Lean to Rust. Inference: preserving rejected Rust proofs is useful only if diagnostics and source context remain attached, so a repair agent can reuse partial invariants and API choices.

## technique: propose-then-accept current-best refinement

Naive iterative repair overwrites a proof after every revision. Sage-like search control here instead computes a proposal and accepts it only if a judge considers it more promising. Formally, the repair model generates `s̃(t+1) = REFINE(s*(t), e*(t))`; the controller sets `s*(t+1) = BETTER(s*(t), s̃(t+1))` (§3.3, p.5). If the proposal verifies, stop. Otherwise, the pairwise LLM judge compares old and new proofs together with compiler errors, considering current progress, error severity, and overall strategy (§3.3, p.5). Rejected proposals leave the old proof intact and increase a stagnation counter; accepted proposals reset it.

Apply it by retaining `(proof, diagnostics)` as a state; ask the repair model for a complete revised proof; compile it; if verified, return; otherwise ask the judge to choose old or proposal; keep the winner and its diagnostics. Inference: in Verus, the state should include Rust source, verifier diagnostics, and any generated proof code. The judge is a heuristic controller, not proof evidence; only a successful Verus verification is evidence. Inference: keeping a semantically weaker but compiling contract is dangerous, so a VL judge should compare specification strength as well as syntax and local progress.

## technique: stagnation-triggered resampling

Local refinement can be trapped by a fundamentally bad proof strategy. Count consecutive rejected proposals (`n_stag`). When it reaches threshold `N`, re-enter exploration, generate candidates from both models, verify them, and choose a new current best with the same pairwise judge (§3.4, p.5). Algorithm 1 makes `N` explicit: smaller values favor exploration; larger values spend more budget on refinement (Appendix A, p.15). The paper's concrete example reports four failed refinements, resampling at iteration five, and success after one further refinement (Appendix B.5, p.18).

Steps: initialize the counter to zero; increment it on each rejected proposal; reset on acceptance; when `n_stag ≥ N`, discard the stuck trajectory as the active state, sample both models, compare, and resume refinement. Inference: VL can trigger resampling on repeated identical Verus errors, unchanged obligation counts, or a proof-state score that fails to improve. Those signals are design choices, not results established by this paper.

## evidence, trust, and limits

The main benchmark is miniCTX-v2: seven real-world Lean projects. Under an average pass@32 budget, the method improved average pass rate by 12.8 percentage points over the two base models and reduced calls by 21.9% (§5.1, p.7). Without `AUTO SOLVE`, Table 5 reports average pass rates of 60.71% for the method, 49.75% for GPT-5-mini, and 51.71% for DeepSeek-Prover-v2, with 20.71 average calls per theorem (Appendix B.4, p.17). On RLMEval-FLT3 (84 theorems), the method reached 39.3% at 13.5 calls, versus 36.9% for Generalist pass@32 and 28.6% for Specialist pass@32 (§5.2, p.8). A robustness run replacing the generalist with Gemini-2.5-Flash reached 52.86% average pass rate at a 16-call budget (Table 1, p.8). Denominators are theorem counts or pooled projects as stated; the paper's pass percentages are reported without raw success numerators.

The analysis supports the control policy: across nine theorems, average variation between different wrong starting proofs (inter-WP standard deviation 3.36) exceeded repeated runs from one starting proof (intra-WP 2.41) (Appendix B.1, p.16). Across 391 pairwise comparisons, GPT-5-mini was selected 58.6% and DeepSeek-Prover-v2 41.4%; this is a judge preference, not proof quality (§B.7, p.19). The system relies on Lean's compiler, imported project libraries, the repair and judge models, and the correctness of context extraction. It proves only that returned Lean proofs compile in the benchmark environment; it does not establish specification correctness, external-library soundness, or Rust/Verus behavior.

Inference: the threat to agent-written verified Rust is substantial when a controller overwrites promising proof states or repeatedly samples correlated failures; this paper gives a practical mitigation with measured Lean gains. Inference: the numerical gains are evidence for this Lean model pair, projects, budgets, and compiler versions (Lean 4.16.0 for miniCTX-v2 and 4.7.0-rc2 for FLT3), not a guarantee for Verus. Inference: pairwise judging can itself become a trusted heuristic that biases search, so VL should log every accept/reject decision and evaluate ablations with the same verifier budget. What VL should not redo is the basic idea of preserving failed whole proofs, dual-model exploration, and stagnation resampling; those are explicitly implemented and evaluated here.

## techniques for the catalog

- compiler-grounded feedback — compile every candidate, extract line-level diagnostics, and use automatic tactics before model repair

- dual-model exploration — sample complementary generalist and specialist proofs and compare failed candidates instead of discarding them

- propose-then-accept refinement — retain a current-best proof and accept a repair only after compiler checking and pairwise comparison

- stagnation-triggered resampling — restart exploration after a rejection threshold and select a fresh starting proof
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
