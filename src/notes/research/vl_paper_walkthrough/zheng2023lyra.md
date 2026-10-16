# Lyra: Orchestrating Dual Correction in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zheng2023lyra`, [paper](https://arxiv.org/abs/2309.15806)
## pipeline
Lyra extends Draft, Sketch, and Prove (DSP) with two verifier-driven repairs: Tool Correction (TC) replaces a failed tactic with known alternatives, and Conjecture Correction (CC) feeds prover errors back into a new formal sketch. The base DSP sequence is informal-proof generation, formal-sketch generation, and prover validation; “Successful prover results yield verifiable formal proofs.” (Section 3.1, PDF p. 4).

Lyra uses Isabelle and GPT-4 on miniF2F. A proof counts only when it contains no `sorry` or `oops` and Isabelle verifies the formal statement (Section 4.1, PDF p. 6). This explicit acceptance criterion is useful for any generated-proof service.

## technique 1: tool correction
Use TC when the conjecture is plausible but the model selected an unsuitable Isabelle tactic. Run each tactic through Isabelle. If it fails and is `.` or starts with `by` or `sledgehammer`, try the fixed heuristic list: `by auto`, `by arith`, `by blast`, `by simp`, `by fastforce`, `by force`, `by eval`, `by presburger`, `by sos`, `by linarith`, `by (auto simp: field_simps)`, and `sledgehammer`. Keep the first replacement that verifies; if all fail, reject the proof. Algorithm 1 returns success only when the prover reaches `no goals`.

The paper's example is the statement `x = 19 * (x div 19) + 4`. It says, “Substituting it with by arith enables the theorem prover to successfully verify x = 19 ∗ (x div 19) + 4.” (Section 3.2, PDF p. 5). Thus TC repairs a tool choice without changing the mathematical conjecture. The paper also warns that “LLM might formulate correct conjectures but employ inappropriate tools, resulting in unsuccessful proof attempts.” (Section 3.2, PDF p. 5).

Inference: Verus can use the same architecture around candidate `assert`, `reveal`, and proof-function calls, but the listed Isabelle tactics do not transfer. Build a Verus-specific ordered replacement list from constructs documented in VL's Verus reference, and run Verus after each replacement. The conjecture and specifications should remain fixed during TC.

## technique 2: conjecture correction with reset rounds
Use CC when the generated formal statement or subgoal itself is wrong, or when tactic substitutions cannot repair it. In the initial round, generate as DSP does. In a rectification round, append the previous proof and Isabelle's error message to the original instruction, then request a complete proof beginning with `proof -`. Every fifth attempt is a reset: regenerate from the original prompt instead of repeatedly refining a bad proof. With 200 attempts and reset interval K=5, Lyra makes 40 patches, each containing one initial proof plus four error-guided refinements (Section 3.3, PDF pp. 5–6).

This avoids storing paired generation/error/refinement examples; the paper says CC “refines generation with instruction, but does not collect paired (generation, error & refinement) prompts.” (Section 3.3, PDF p. 5). It is an interaction protocol, not a claim that the LLM can certify its own correction.

Inference: for Verus, include the compiler/SMT diagnostic, prior Rust proof, and original `requires`/`ensures` in the repair prompt, force a complete compilable function, and periodically reset to prevent error accumulation. Treat changes to specifications as conjecture changes requiring separate review.

## technique 3: combine corrections and measure by verifier
On miniF2F's 244 validation and 244 test problems, use 100 or 200 autoformalization attempts and count unique Isabelle-verified proofs. Table 1 reports GPT-4 informal proofs with TC+CC at 52.8% validation and 44.2% test for 100 attempts, and 54.9%/47.9% at 200. Human informal proofs with TC+CC reach 55.3%/51.2% at 200. The denominator for each percentage is 244 problems in the corresponding split. The ablation table shows TC alone and CC alone separately; for GPT-4 informal proofs at 200 attempts, TC-only is 55.3% validation and 45.0% test, CC-only 48.3% and 40.9%, and both 54.9% and 47.9%. These are percentages of the same 244-problem splits, not per-attempt success rates.

The paper reports that TC improves test success by 4.1 percentage points without CC and 7.0 with CC for GPT-4 informal proofs, and by 3.3 and 8.2 for human informal proofs (Section 4.3, PDF p. 7). The numbers are derived from the matching rows in Table 2. It also reports a baseline comparison: at 100 attempts, Lyra with GPT-4 informal proofs rises from DSP's 42.6%/38.9% (validation/test, Minerva informal baseline) to 52.8%/44.2%.

## evidence, trusted components, and threat
Isabelle's kernel and prover validate formal statements; GPT-4, prompt construction, heuristic ordering, and the correctness of informal proofs remain trusted or empirical. The no-cheating check removes `sorry` and `oops`, but does not establish that the theorem statement expresses the intended natural-language problem. The framework is Isabelle-specific and experiments only high-school competition problems.

Inference: threat to VeruLaw is high for proof-agent reliability but low for the logical soundness boundary. TC and CC can reduce hallucinated tactics and repair failed Verus sketches, yet they cannot make an incorrect specification true. VL should reuse verifier-gated retries, heuristic substitution, and reset rounds, while measuring success over a fixed theorem set and reporting split denominators. It should not redo the paper's Isabelle baseline unless comparing systems.

## techniques for the catalog
- tool correction — retry a failed tactic with a fixed, verifier-tested heuristic list
- conjecture correction — append verifier diagnostics and the prior proof to a fresh repair instruction
- reset-round refinement — periodically regenerate from the original prompt to avoid compounding a bad proof
- dual-correction ablation — measure tool and conjecture repair alone and together on fixed validation/test denominators
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
