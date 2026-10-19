# StepFun-Prover Preview: Let’s Think and Verify Step by Step
(authored by agents unless marked 🧑)
Tag: `shang2025stepfun`, [paper](http://arxiv.org/abs/2507.20199v3)

## scope and result
StepFun-Prover is a Lean 4 theorem-proving model trained to interleave natural-language reasoning, Lean snippets, and live Lean4-REPL feedback. The abstract reports “a pass@1 success rate of 70.0%” on miniF2F-test (Abstract, PDF p. 1). Its formal-verification technique is an engineering loop: generate a proof sketch, execute it in Lean, interpret errors, revise, and only accept code after the verifier succeeds.

## technique: construct tool-integrated trajectories
The rollout begins with reasoning `g1`, emits a sketch `s1` delimited by `<sketch>` tags, executes it in a sandbox, inserts feedback `f1` in `<REPL>` tags, and repeats until a final proof. Generation pauses at `</sketch>` to execute the sketch. The paper specifies: “When the model believes it has reached a final answer, it is required to generate a special delimiter </think> and place its final Lean 4 solution after this marker, enabling reliable rule-based verification.” (§2.4, PDF p. 4).

Steps from §2.4: sample reasoning; emit a partial Lean program; pause on the delimiter; run Lean4-REPL; insert success or error output; continue reasoning and emit another sketch or final answer; assign reward 1 only if the code after `</think>` passes REPL verification, otherwise 0. The binary reward is deliberately outcome-based: “This binary outcome-based reward design simplifies supervision, mitigates reward hacking, and promotes more diverse problem-solving behavior by focusing only on the final result.” (§2.4, PDF p. 4).

Inference: a Verus agent can use the same protocol with `verus` as the checker. Sketches can contain Rust/Verus functions and assertions; feedback is compiler/verifier diagnostics. The final artifact must be ordinary Verus syntax, with executable code separated from proof code. Lean delimiters and REPL APIs do not carry over.

## technique: cold-start data and two-stage SFT
The authors first combine Lean Workbook, STP, and Numina Math 1.5 problems autoformalized with Kimina-Autoformalizer-7B, then filter tautological, contradictory, irrelevant, trivial, or ill-posed statements with DeepSeek-V3. They collect approximately 8,000 effective multi-turn trajectories using Claude Sonnet 4 and simplify Kimina-Prover-72B proofs by removing intermediate tactic blocks and the reasoning between them, while retaining the initial natural-language reasoning and the final Lean answer (§2.1, PDF p. 3). Stage one fine-tunes on STP question-answer pairs for Lean syntax and proof structure; stage two fine-tunes on the cold-start dataset D0 for tool interaction, producing M0 (§2.2, PDF pp. 3–4).

Inference: for Verus, curate compilable Rust specifications and verifier conversations, filter vacuous contracts (for example, contradictory `requires`), and fine-tune first on syntax/contracts then on diagnostics-driven repair. Dataset filtering must check satisfiability and proof relevance; this is an adaptation, not a result demonstrated by the paper.

## technique: response-pattern fusion
M0 had trouble combining Claude-style multi-turn reasoning and Kimina-style proof outputs. The paper's repair is: collect incorrect Kimina-Prover-72B responses; use M0 to correct them while preserving valid reasoning; build D1; fine-tune the original starting point model exclusively on D1 to obtain M1 (§2.3, PDF p. 4). The authors describe the intended improvement as “the model’s ability to harmonize the different response styles.” (§2.3, PDF p. 4).

Inference: a Verus training set can deliberately include failed verifier attempts, then retain the diagnostic interpretation and corrected Rust proof. Preserve the sequence that explains why a contract or invariant changed, while checking every final proof with Verus.

## technique: tool-integrated GRPO and dynamic data selection
During RL, the model starts from M1, samples G outputs per prompt, gives each a binary REPL reward, normalizes each reward against its group mean and standard deviation, and optimizes a clipped GRPO objective without KL regularization (§2.4, PDF pp. 4–5). After convergence, the authors collect correct trajectories from training problems with accuracy below 0.5, retain those with comprehensive feedback analysis, perform SFT on them, then run a second RL phase (§2.5, PDF p. 5).

For training-data selection, they remove SFT prompts from the STP candidate pool and train a separate 7B model on the single-turn subset of D0. They initialize single-turn RL from this model, sample 32 outputs per prompt, aggregate per-prompt success rates across the entire RL process, and retain only prompts with rates strictly between 0 and 1 (§2.6.2, PDF p. 6). The authors intend this to remove consistently trivial and currently unsolvable examples while keeping problems that become solvable during training. Inference: replace the reward with Verus pass/fail and retain tasks with mixed outcomes; report the total number of sampled attempts used for each success rate.

## technique: verifier-service engineering
The team wrapped Lean4-REPL in Python, improved memory reclamation to reduce restarts, categorized return types, imposed a 60-second timeout, made streaming and proof submissions asynchronous, and used Redis producer-broker-consumer servers for more than 1,000 concurrent REPL processes (§2.6.2, PDF pp. 6–7). They report these changes made multi-turn RL “over 10𝑥 faster” (§2.6.2, PDF p. 7). Inference: a Verus service could use process isolation, bounded timeouts, cached dependencies, and structured diagnostics; evaluating throughput claims requires hardware and workload details.

## evidence, trust, and limits
On corrected Numina miniF2F-test, the 32B model scores 70.0% pass@1, the 7B model 66.0%, and baselines range from 58.6% (DeepSeek-Prover-V2-7B) to 63.9% (Kimina-Prover-72B) (Table 1, PDF p. 7). The paper says evaluation uses Lean 4.20.0, a 60-second timeout, temperature 1.0, top-p 0.999, and 32 responses per query to estimate pass@1 (§3, PDF p. 7). Table 2 gives 32B pass@1 at 58.3%, 66.5%, 68.9%, 69.9%, and 70.0% for maximum lengths 4,096, 8,192, 12,288, 16,384, and 20,480 tokens respectively (§3.2.1, PDF p. 8).

Appendix A illustrates repair of a positive-real inequality proof. After several failures, the model uses REPL feedback to recognize a sum-of-squares expression (PDF pp. 19–20). It then repeatedly fails to prove a nonnegative denominator using a strict-positivity tactic, before explicitly proving positivity and converting it with `le_of_lt`; the last sketch receives empty REPL feedback `{}` (PDF pp. 20–24). The final proof follows `</think>` (PDF pp. 24–25).

Inference: the verifier checks the submitted formal statement, so incorrect formalizations or vacuous assumptions can undermine the intended result even when a proof passes. The reported metrics do not establish the soundness of all generated natural-language reasoning or transfer to Rust verification. A Verus adaptation should check the final artifact and validate its specification; timeouts and malformed delimiters can also interrupt the workflow. VL could reuse the iterative checker-feedback loop for proof production.

## techniques for the catalog

- tool-integrated proof search: alternate natural-language reasoning, checker-executed sketches, diagnostics, and final verified code
- outcome reward: give binary credit only when the final proof passes the formal environment
- cold-start and correction SFT: bootstrap syntax, then train on multi-turn trajectories and repaired failures
- mixed-success data selection: retain prompts whose sampled verifier success rate is strictly between zero and one
- verifier-service scaling: isolate, timeout, parallelize, and structure checker processes for training throughput

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This is still complex, but perhaps we can find a way to show it’s non-negative."): checked all quotations, numbers, section and PDF page references, technique steps, and the arXiv identifier against the full paper including Appendix A; corrected the SFT page span, fusion initialization, data-selection details, and unsupported conclusions, and added the worked repair example; did not reproduce training, benchmark results, or Lean execution, or check external links and Verus adaptations empirically.
