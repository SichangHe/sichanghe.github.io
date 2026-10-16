# StepFun-Prover Preview: Let’s Think and Verify Step by Step
(authored by agents unless marked 🧑)
Tag: `shang2025stepfun`, [paper](http://arxiv.org/abs/2507.20199v3)

## scope and result
StepFun-Prover is a Lean 4 theorem-proving model trained to interleave natural-language reasoning, Lean snippets, and live Lean4-REPL feedback. The abstract reports “a pass@1 success rate of 70.0%” on miniF2F-test (Abstract, PDF p. 1). Its formal-verification technique is an engineering loop: generate a proof sketch, execute it in Lean, interpret errors, revise, and only accept code after the verifier succeeds.

## technique: construct tool-integrated trajectories
The rollout begins with reasoning `g1`, emits a sketch `s1` delimited by `<sketch>` tags, executes it in a sandbox, inserts feedback `f1` in `<REPL>` tags, and repeats until a final proof. The paper specifies: “When a sketch termination trigger (</sketch>) is detected, the generation pause and the Lean 4 solution s1 is parsed and send to sandbox environment for execution.” (§2.4, PDF p. 4). It then requires `</think>` before the final Lean code so rule-based verification can isolate the submitted proof.

Steps from §2.4: sample reasoning; emit a partial Lean program; pause on the delimiter; run Lean4-REPL; insert success or error output; continue reasoning and emit another sketch or final answer; assign reward 1 only if the code after `</think>` passes REPL verification, otherwise 0. The binary reward is deliberately outcome-based: “This binary outcome-based reward design simplifies supervision, mitigates reward hacking, and promotes more diverse problem-solving behavior by focusing only on the final result.” (§2.4, PDF p. 4).

Inference: a Verus agent can use the same protocol with `verus` as the checker. Sketches can contain Rust/Verus functions and assertions; feedback is compiler/verifier diagnostics. The final artifact must be ordinary Verus syntax, with executable code separated from proof code. Lean delimiters and REPL APIs do not carry over.

## technique: cold-start data and two-stage SFT
The authors first combine Lean Workbook, STP, and autoformalized Numina problems, then filter tautological, contradictory, irrelevant, trivial, or ill-posed statements with DeepSeek-V3. They collect approximately 8,000 effective multi-turn trajectories using Claude Sonnet 4 and simplify Kimina proofs by removing intermediate tactic blocks while retaining natural-language reasoning and the final answer (§2.1, PDF p. 3). Stage one fine-tunes on STP question-answer pairs for Lean syntax and proof structure; stage two fine-tunes on the cold-start dataset D0 for tool interaction, producing M0 (§2.2, PDF p. 3).

Inference: for Verus, curate compilable Rust specifications and verifier conversations, filter vacuous contracts (for example, contradictory `requires`), and fine-tune first on syntax/contracts then on diagnostics-driven repair. Dataset filtering must check satisfiability and proof relevance; this is an adaptation, not a result demonstrated by the paper.

## technique: response-pattern fusion
M0 had trouble combining Claude-style multi-turn reasoning and Kimina-style proof outputs. The paper's repair is: collect incorrect Kimina-Prover-72B responses; use M0 to correct them while preserving valid reasoning; build D1; fine-tune exclusively on D1 to obtain M1 (§2.3, PDF p. 4). This targeted correction teaches the model to connect reasoning patterns rather than merely adding more solved examples.

Inference: a Verus training set can deliberately include failed verifier attempts, then retain the diagnostic interpretation and corrected Rust proof. Preserve the sequence that explains why a contract or invariant changed, while checking every final proof with Verus.

## technique: tool-integrated GRPO and dynamic data selection
During RL, the model samples G outputs per prompt, gives each a binary REPL reward, normalizes each reward against its group mean and standard deviation, and optimizes a clipped GRPO objective (§2.4, PDF pp. 4–5). After convergence, the authors collect correct trajectories from training problems with accuracy below 0.5, retain those with comprehensive feedback analysis, SFT on them, then run a second RL phase (§2.5, PDF p. 5).

For training-data selection, they train a 7B single-turn model, sample 32 outputs per prompt, aggregate success rates over RL, and retain only prompts with rates strictly between 0 and 1 (§2.6.2, PDF p. 6). This removes consistently trivial and currently impossible examples while keeping problems that can become solvable. Inference: replace the reward with Verus pass/fail and retain tasks with mixed outcomes; report the denominator (number of sampled attempts) because a rate from 32 attempts is not a proof of general capability.

## technique: verifier-service engineering
The team wrapped Lean4-REPL in Python, categorized return types, imposed a 60-second timeout, made streaming and proof submissions asynchronous, and used Redis producer-broker-consumer servers for more than 1,000 concurrent REPL processes (§2.6.2, PDF pp. 6–7). They report these changes made multi-turn RL “over 10𝑥 faster” (§2.6.2, PDF p. 7). Inference: a Verus service needs process isolation, bounded timeouts, cached dependencies, and structured diagnostics; throughput claims must identify hardware and workload.

## evidence, trust, and limits
On corrected Numina miniF2F-test, the 32B model scores 70.0% pass@1, the 7B model 66.0%, and baselines range from 58.6% (DeepSeek-Prover-V2-7B) to 63.9% (Kimina-Prover-72B) (Table 1, PDF p. 7). The paper says evaluation uses Lean 4.20.0, a 60-second timeout, temperature 1.0, top-p 0.999, and 32 responses per query to estimate pass@1 (§3, PDF p. 7). Table 2 gives 32B pass@1 at 58.3%, 66.5%, 68.9%, 69.9%, and 70.0% for maximum lengths 4,096, 8,192, 12,288, 16,384, and 20,480 tokens respectively (§3.2.1, PDF p. 8).

The verifier establishes each accepted Lean proof relative to imported libraries and the Lean kernel; training metrics do not prove all generated reasoning is sound. Trusted components include Lean, Mathlib, the REPL wrapper, dataset formalizations, and the rule that extracts code after `</think>`. Inference: the threat to agent-written verified Rust is high for proof-production productivity and low for semantic soundness, because Verus still checks the final artifact. Failure modes include timeouts, malformed delimiters, unsound or vacuous specifications, and overfitting to miniF2F. The paper's concrete contribution is the iterative checker-feedback loop; VL should reuse this pattern rather than redo static one-shot proof generation.

## techniques for the catalog

- tool-integrated proof search: alternate natural-language reasoning, checker-executed sketches, diagnostics, and final verified code
- outcome reward: give binary credit only when the final proof passes the formal environment
- cold-start and correction SFT: bootstrap syntax, then train on multi-turn trajectories and repaired failures
- mixed-success data selection: retain prompts whose sampled verifier success rate is strictly between zero and one
- verifier-service scaling: isolate, timeout, parallelize, and structure checker processes for training throughput

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
