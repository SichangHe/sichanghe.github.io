# Lyra: Orchestrating Dual Correction in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zheng2023lyra`, [paper](https://arxiv.org/abs/2309.15806)
## pipeline
Lyra extends Draft, Sketch, and Prove (DSP) with two verifier-driven repairs: Tool Correction (TC) replaces a failed tactic with known alternatives, and Conjecture Correction (CC) feeds prover errors back into a new formal sketch. The base DSP sequence is informal-proof generation, formal-sketch generation, and prover validation; “Successful prover results yield verifiable formal proofs.” (Section 3.1, PDF p. 4).

Lyra uses Isabelle and GPT-4 on miniF2F. A proof counts only when it contains no `sorry` or `oops` and Isabelle verifies the formal statement (Section 4.1, PDF p. 6). Inference: this explicit acceptance criterion is useful for any generated-proof service.

## technique 1: tool correction
The paper motivates TC by cases where the conjecture is correct but the model selected an unsuitable Isabelle tactic. Run each tactic through Isabelle. If it fails and is `.` or starts with `by` or `sledgehammer` (Section 3.2 and Algorithm 1, PDF pp. 4-5), try the fixed heuristic list: `by auto`, `by arith`, `by blast`, `by simp`, `by fastforce`, `by force`, `by eval`, `by presburger`, `by sos`, `by linarith`, `by (auto simp: field_simps)`, and `sledgehammer`. Keep the first replacement that verifies; if all fail, reject the proof. Algorithm 1 returns success only when the prover reaches `no goals`.

The paper's example is the statement `x = 19 * (x div 19) + 4`. It says, “Substituting it with by arith enables the theorem prover to successfully verify x = 19 ∗ (x div 19) + 4.” (Section 3.2, PDF p. 5). Inference: TC repairs a tool choice without changing the mathematical conjecture. The paper also warns that “LLM might formulate correct conjectures but employ inappropriate tools, resulting in unsuccessful proof attempts.” (Section 3.2, PDF p. 5).

Inference: Verus can use the same architecture around candidate `assert`, `reveal`, and proof-function calls, but the listed Isabelle tactics do not transfer. Build a Verus-specific ordered replacement list from constructs documented in VL's Verus reference, and run Verus after each replacement. The conjecture and specifications should remain fixed during TC.

## technique 2: conjecture correction with reset rounds
CC refines the formal proof sketch (the paper calls its steps conjectures) using prover error messages. In the initial round, generate as DSP does. In a rectification round, reuse the initial prompt, append the previous proof and the prover's error messages, and end the instruction with `proof -` so the LLM response is a formal proof (Algorithm 2 sends the previous response as an assistant message, then the errors as a user message). Every fifth attempt (K=5, round_count % 5 == 0 in Algorithm 2) is a reset: regenerate an initial-round proof instead of repeatedly refining a bad one, because the paper says refinement quality "is tied to the initial round proof". With 200 attempts and reset interval K=5, Lyra makes 40 patches, each containing one initial proof plus four error-guided refinements (Section 3.3, PDF pp. 5–6).

This avoids storing paired generation/error/refinement examples; the paper says CC “refines generation with instruction, but does not collect paired (generation, error & refinement) prompts.” (Section 3.3, PDF p. 5). Inference: it is an interaction protocol in which Isabelle, not the LLM, certifies each result.

Inference: for Verus, include the compiler/SMT diagnostic, prior Rust proof, and original `requires`/`ensures` in the repair prompt, force a complete compilable function, and periodically reset to prevent error accumulation. Treat changes to specifications as conjecture changes requiring separate review.

## technique 3: combine corrections and measure by verifier
On miniF2F's 244 validation and 244 test problems, use 100 or 200 autoformalization attempts and count problems with an Isabelle-verified proof. Table 1 reports GPT-4 informal proofs with TC+CC at 52.8% validation and 44.2% test for 100 attempts, and 54.9%/47.9% at 200. Human informal proofs with TC+CC reach 55.3%/51.2% at 200 (Table 1, PDF p. 6). Each split has 244 problems. The ablation table (Table 2, PDF p. 7) shows TC alone and CC alone separately; for GPT-4 informal proofs at 200 attempts, TC-only is 55.3% validation and 45.0% test, CC-only 48.3% and 40.9%, and both 54.9% and 47.9%. Inference: these are percentages of problems in the same 244-problem splits, not per-attempt success rates. Note that TC-only (55.3%) beats TC+CC (54.9%) on validation in this row.

The paper reports that TC improves test success by 4.1 percentage points without CC and 7.0 with CC for GPT-4 informal proofs, and by 3.3 and 8.2 for human informal proofs (Section 4.3, PDF p. 7). The numbers are derived from the matching rows in Table 2. It also reports (Section 4.2, PDF p. 7) that at 100 attempts, compared to DSP with 540B Minerva informal proofs, Lyra with GPT-4 informal proofs improves validation from 42.6% to 52.8% and test from 38.9% to 44.2%; the informal-proof source differs between the two systems.

Inference: CC alone does not help in Table 2 rows without TC (GPT-4 informal, 200 attempts: 49.5% to 48.3% validation, 40.9% to 40.9% test; human informal: 50.4% to 46.7% validation, 42.6% to 43.0% test), so the conclusion's "both Tool Correction and Conjecture Correction are critical" holds only for CC combined with TC. The paper itself says CC "needs a more powerful prover (e.g. with Tool Correction) to fill the formal gaps" (Section 4.3, PDF p. 8).

## evidence, trusted components, and threat
Isabelle's kernel and prover validate formal statements; GPT-4, prompt construction, heuristic ordering, and the correctness of informal proofs remain trusted or empirical. The paper's acceptance check rejects `sorry` and `oops`. Inference: it does not establish that the theorem statement expresses the intended natural-language problem. The framework is run only with Isabelle, and the experiments use only miniF2F, whose problems the paper describes as "derived from high-school competitions" (Section 4.1, PDF p. 6).

Inference: threat to VeruLaw is high for proof-agent reliability but low for the logical soundness boundary. TC and CC can reduce hallucinated tactics and repair failed Verus sketches, yet they cannot make an incorrect specification true. VL should reuse verifier-checked retries, heuristic substitution, and reset rounds, while measuring success over a fixed theorem set and reporting split denominators. It should not redo the paper's Isabelle baseline unless comparing systems.

## techniques for the catalog
- tool correction — retry a failed tactic with a fixed, verifier-tested heuristic list
- conjecture correction — append verifier diagnostics and the prior proof to a fresh repair instruction
- reset-round refinement — periodically regenerate from the original prompt to avoid compounding a bad proof
- dual-correction ablation — measure tool and conjecture repair alone and together on fixed validation/test denominators
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "As demonstrated in Figure 3, our Lyra successfully proves IMO 1974 p5 with Tool Correction and Conjecture Correction."): read the whole paper including appendix; checked every quotation, the Table 1 and Table 2 numbers, the derived TC deltas (4.1, 7.0, 3.3, 8.2), section and page references, Algorithm 1 and 2 steps, split sizes and the arXiv link and tag. Changed: reworded a CC usage claim the paper does not make, marked own conclusions "Inference:", replaced "unique proofs" with problems solved, added page references, the paper's own note that CC needs a stronger prover, and the observation that CC alone does not help in Table 2. Not checked: the GitHub code, cited baselines beyond Tables 1-2, and the Verus-transfer inferences.
