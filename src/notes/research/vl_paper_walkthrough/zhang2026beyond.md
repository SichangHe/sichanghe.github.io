# Beyond Compilation: Evaluating Faithful Natural-Language-to-Lean Statement Formalization
(authored by agents unless marked 🧑)
Tag: `zhang2026beyond`, [paper](http://arxiv.org/abs/2606.31002v3)

## scope and result
This paper measures whether generated Lean statements preserve an informal mathematical claim. It separates compilation from semantic faithfulness because Lean checks only the declaration the model wrote. The abstract states: “Lean verifies that a generated declaration is well typed, but not that it states what the user intended.” The benchmark contains 227 graduate-level statements from four textbooks with no canonical Lean target (§2.2, p.2). A candidate is faithful only if it compiles and GPT-5.2 and Gemini-2.5-Pro both assign a faithfulness grade of at least 9/10 (§2.4, p.2).

## technique 1: reference-free, human-calibrated faithfulness criterion

What it is. The criterion combines Lean compilation with two independent LLM judges. Human audits calibrate the strict intersection; LeanScorer, Claude Sonnet, and BEq provide cross-checks (§2.4–§3.1, pp.2–4). This handles open-ended encodings where exact match to a canonical theorem is impossible.

How to apply it. (1) Collect an informal statement and require a statement-only Lean declaration ending in `:= by sorry` (§2.1, p.2). (2) Compile each declaration with Lean 4 and Mathlib (§2.4, p.2). (3) Ask GPT-5.2 and Gemini-2.5-Pro to grade source/declaration meaning from 0 to 10 under one rubric (§2.4, p.2). (4) Count faithful only when both grades are at least 9 and compilation passed (§2.4). (5) Audit random positives and all automatic negatives with blinded human reviewers, then report precision and negative confirmation with denominators (Table 1, p.3).

Evidence. On Batch B, the rule agrees with human majority on 54/59 cases (91.5%), confirms 44/46 positives (95.7%), and confirms 10/13 negatives (76.9%) (Tables 1–2, p.3). The paper reports, “humans confirm 95.7% of the outputs it accepts and 77–81% of the outputs it rejects” (abstract, p.1). LeanScorer agrees on 45/59 (76.3%) (Table 2, p.3). BEq certifies 116/189 accepted-output pairs (61.4%); 67/140 pairs with different normalized encodings are certified (47.9%), while the remaining pairs are unresolved by bounded search (Table 4, p.4).

Verus form. Inference: apply a parallel criterion to VL by requiring Verus verification plus two semantic checks against the natural-language requirement, followed by human calibration. `ensures` proves the generated postcondition; it does not establish that the postcondition is the requirement. A reference-free criterion is useful when multiple Rust implementations satisfy one behavior, but semantic judges remain a measurement layer rather than a proof.

## technique 2: factorial tool ablation of drafting, search, and verifier feedback

What it is. The GPT-5.2 agent has three binary factors: translation prior T (Herald draft), search S (Mathlib symbol and web search), and elaboration feedback F (Lean REPL). Every configuration `c=(t,f,s)` in `{0,1}^3` runs on all 227 inputs (§4.2, p.5). The persistent agent state stores compiler errors, retrieved symbols, and draft translations (§4.1, p.5).

How to apply it. (1) Hold prompts and task definition fixed (§4.1, p.5). (2) Toggle each tool in all eight configurations (§4.2, p.5). (3) For every item, record compile rate, faithful rate, gap (compile minus faithful), and tool cost (Tables 6–7, pp.5–6). (4) Compute each factor’s high-minus-low average over the other two factors (§4.2, p.5). (5) Record per-item transitions so a small net effect does not hide regressions (Table 9, p.7).

Verus form. Inference: run the same design with Verus-aware drafting, dependency/spec search, and verifier feedback. Keep the natural-language prompt fixed and measure verified contracts and semantically faithful contracts separately. Tool ablation can expose whether verifier feedback raises proof completion while increasing wrong-specification acceptance.

## technique 3: separate validity, faithfulness, and trajectory churn

The full agent compiles 198/227 statements (87.2%) but satisfies the semantic criterion on 131/227 (57.7%), a 29.5-point gap (§3.2, p.4). Across eight systems, gaps range from 1.3 points for one-shot Gemini-2.5-Pro to 29.5 for the full GPT-5.2 agent (abstract, p.1; Figure 1, p.2). The human majority confirms 54/67 compile-pass rejections as genuine mismatches (80.6%; §3.2, p.4). These denominators are the 227 benchmark statements, except the audited rejection denominator 67.

The factorial main effects quantify boundaries. Elaboration feedback raises compilation by 49.3 points and faithfulness by 27.2, while increasing the compile-pass gap by 22.1; search raises compilation 9.7, faithfulness 8.5, and gap 1.2; translation raises compilation 4.0, faithfulness 1.0, and gap 3.0 (Table 7, p.6). With feedback and no search, adding search makes 30 items faithful and 25 unfaithful, net +5; with translation and feedback it makes 26 faithful and 17 unfaithful, net +9 (Table 9, p.7). Faithfulness in feedback runs falls from 82.9% for 1–2 steps to 11.5% for 19–24 steps (§3.2, p.4; denominator is pooled runs in the stated configurations).

How to apply it. (1) Log every tool call and intermediate declaration. (2) Stop or route when compilation first passes, but still run semantic evaluation (Appendix B, p.8). (3) Plot compile and faithfulness separately. (4) Inspect long trajectories for semantic drift and regressions. (5) Compare tool combinations per item, not just aggregate averages.

Verus form. Inference: treat `cargo verus` success as validity and a separately reviewed contract check as faithfulness. Persist verifier diagnostics and specification edits. Early stopping on the first proof pass is unsafe if later semantic auditing is omitted; long repair chains should be measured for contract drift.

## trust, limitations, and VL threat
The criterion is a proxy, not proof of equivalence; proprietary judges and family overlap with the orchestrator remain limitations (§5, p.7). BEq certifies only pairs resolved by bounded proof search, and the benchmark has no research-level mathematics (§5, p.7). The paper concludes, “Autoformalization systems should therefore report validity and faithfulness separately and pair verifier-driven repair with semantic auditing, routing, and stopping” (§6, p.8).

Inference: this is a direct warning for agent-written verified Rust. A Verus proof can make a malformed or weakened requirement fully trusted. VL should adopt separate validity/faithfulness metrics, independent semantic review, and per-item routing experiments. Existing systems already demonstrate verifier feedback and retrieval; the missing product discipline is to prevent compile/proof success from standing in for requirement fidelity. The paper’s numbers do not establish that every long trajectory is bad, only that pooled long runs in this benchmark had lower faithfulness.

## techniques for the catalog
- human-calibrated semantic criterion: combine compilation and two LLM judges, then calibrate positives and negatives against blinded human review
- factorial verifier ablation: toggle drafting, search, and feedback across all tool combinations while holding prompts fixed
- validity-faithfulness split: report compile/verify rates separately from semantic faithfulness and their gap
- trajectory churn analysis: log per-item transitions and repair length to expose regressions hidden by aggregate averages
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
