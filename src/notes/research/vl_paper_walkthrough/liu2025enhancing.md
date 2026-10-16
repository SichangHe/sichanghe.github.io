# Safe: Enhancing Mathematical Reasoning in Large Language Models via Retrospective Step-aware Formal Verification
(authored by agents unless marked 🧑)
Tag: `liu2025enhancing`, [paper](https://doi.org/10.18653/v1/2025.acl-long.594)

## scope and result

Safe checks individual natural-language reasoning steps by asking an LLM to produce a Lean 4 theorem and then asking an automated theorem prover to prove it. The paper's stated motivation is that opaque scores do not provide checkable evidence: “To address this issue, we draw inspiration from the idea that ‘the gold standard for supporting a mathematical claim is to provide a proof’ (Avigad et al., 2021).” (p. 1). It samples several complete solutions, decomposes each into steps, gives every step a four-valued verification state, and ranks solutions with a learned retrospective score combined with a process-reward-model score.

The main empirical result is Table 1's Best-of-5 accuracy (percent of test questions answered correctly after selecting among five samples). On MATH-500/GSM8K/CollegeMath respectively, Safe scores 60.0/90.8/59.0 for Llama 3.1, 36.3/87.4/43.4 for Llama 3.0, 80.4/96.0/74.2 for GPT-4o, and 52.4/87.6/55.4 for DeepSeek-Math. The denominator is each named dataset's test set under BoN@5; the table does not print question counts. Pass@5 is a different upper bound, not Safe: for the same models it is 70.8/95.5/72.3, 48.9/92.5/52.9, 87.8/97.0/81.5, and 62.6/92.1/67.1. Safe's weighted multiplication is the chosen ensemble: Table 4 reports Llama 3.1 MATH-500 60.0 versus 59.6 for weighted sum, 57.0 minimum, and 58.2 maximum (same BoN@5 setting).

## technique 1: sample and decompose trajectories

When a problem has a multi-step answer, sample n zero-shot chain-of-thought outputs with the prompt “Let’s think step by step” (p. 4). For each output Ai, split it into steps `step_i1 ... step_imi`, preserving the complete solution. The paper implements two decomposition methods. The preferred method uses LLM in-context learning with accurate stepwise examples from PRM800K; the fallback uses periods or line breaks as delimiters when the JSON output is unparsable. The authors warn that a period can be a decimal point, so heuristic splitting can fragment or corrupt a step (Appendix C, p. 12). This produces the input sequence for the verifier and lets independent step checks run concurrently (p. 4).

Inference: in a Verus-oriented pipeline, this is an orchestration layer outside verified Rust. A Rust driver can store each step as a string and dispatch checks, but Verus cannot prove that an LLM's decomposition preserves the intended mathematics unless that property is separately specified and modeled. The paper's own description is explicit: “For any given mathematical problem P, we employ zero-shot chain-of-thought (CoT) prompting to sample n output results from an LLM” (p. 4).

## technique 2: step auto-formalization with four states

Use the question, preceding steps, and target step in a prompt. The prompt asks for `False` when the step is simple, but requires verification of every numerical operation; for a non-obvious leap it asks for a Lean theorem and forbids a natural-language property description (Appendix A, p. 11). It also includes Lean-3/Lean-4 syntax differences and manually curated few-shot examples. The paper's method is: (1) identify whether verification is needed; (2) if needed, generate a Lean 4 statement whose premises encode the question and earlier facts and whose conclusion encodes the target transformation; (3) submit the generated text to the Lean REPL for syntax checking; (4) retry or classify failure. The example turns “(n + 2)(n + 4)(n + 6) becomes (4)(6)(1)” under `n ≡ 2 [ZMOD 7]` into a theorem whose conclusion is `((n + 2) * (n + 4) * (n + 6)) ≡ (4 * 6 * 1) [ZMOD 7]` (Figure 3, p. 5).

Each step receives exactly one state: no verification required; failed formalization; successful formalization with a proof; or successful formalization with theorem-proving failure (pp. 4–5). The state is evidence about the generated statement, not a direct truth certificate for the original prose. Appendix F shows the expressive range: a divisibility-by-three implication is proved with `rw`, `simp_all`, and `aesop`; an iff condition over absolute values is proved by sign case splits and `nlinarith`; and a numerical shirt-price calculation is proved with `ring_nf` and `linarith` (pp. 13–14).

Inference: the closest Verus form is a specification function for a step's mathematical relation plus a proof function that establishes it, with executable Rust kept separate. Verus uses `requires`, `ensures`, `assert`, `lemma`-style proof functions as documented in the local Verus notes; Lean syntax and tactics do not carry over. An actual Verus statement would need typed integers and explicit modulo/absolute-value lemmas, not a runtime call to a proof function. Inference: failed auto-formalization must remain an explicit “unknown” state rather than being treated as a counterexample.

## technique 3: bounded automated theorem proving

After Lean syntax succeeds, call an LLM-based prover (COPRA or DeepSeek-Prover-V1.5) to produce a proof, then validate that proof in the Lean REPL (pp. 4–5). The production setting uses DeepSeek-Prover-V1.5 with sample budget 16 and no Monte Carlo tree search. The reason is cost: step theorems are numerous, and the authors report that budget 16 proves over 80% of FormalStep statements. Figure 6 evaluates all 30,809 statements for DeepSeek-Prover-V1.5, but only a random 500-statement subset for COPRA because COPRA uses GPT-4o and is more expensive (Appendix H, p. 15).

FormalStep is built from 500 MATH training problems and Llama 3.1 trajectories. It contains 30,809 generated theorems: 11,515 number theory, 9,414 combinatorics, 5,525 algebra, 873 geometry, and 3,482 other. Table 2 reports 25,017/30,809 successfully proved, or 81.2%; category proof rates are geometry 72.3%, number theory 82.1%, algebra 81.7%, combinatorics 81.4%, and other 79.1%. These denominators are the generated statements in each category. Figure 5 uses the larger 43,652-step construction pool: 30,809/43,652 (72.2%) formalized, and 25,017/30,809 (81.2%) of those proved. Among sampled steps, “Proof Successful” had 56.7% eventual correctness and “Proof Failed” 40.4%, showing state noise (Appendix E, p. 13).

Inference: a Verus adaptation would replace Lean REPL/prover calls with `verus` verification and Z3-backed proof search, but it would still need a generated Rust specification and checked proof obligations. The paper does not establish that an LLM-generated theorem is semantically aligned with a Rust function; that transfer is an inference.

## technique 4: aggregate states and combine with a prospective score

Treat the four states as a four-token sequence. Train a two-layer LSTM with hidden size 64, batch size 32, learning rate 0.0001, and 200 epochs on roughly 500 MATH, 1,000 GSM8K, and all CollegeMath training data. The LSTM maps each trajectory's state sequence to `score_retro = sigmoid(W · LSTM(states) + b)` (p. 5). Independently obtain `score_pro` from an existing PRM over natural-language steps. Select the candidate maximizing `score_i = score_retro^α · score_pro^(1−α)`; the paper calls this weighted multiplication Safe (p. 6). The authors compare weighted sum, multiplication, max, and min; multiplication performs best on their Llama 3.1 MATH-500 ablation.

The paper says, “The information derived from formal verification is highly condensed and retrospective, as each state conveys only two bits of information.” (p. 5). This explains why aggregation is needed and why a failed proof is not simply discarded. Training uses about 2,000 trajectories from 500 questions, far fewer labels than PRM800K's approximately 800,000 step labels across 75,000 solutions and Math-Shepherd's more than 445,000 strategies (p. 8). Inference cost is substantial: at most three formalization and 16 proving queries per step; observed means are 1.02 and 6.97, respectively. Reducing the proving cap to eight lowers the mean proving attempts to 2.67 while keeping proof success above 80% (p. 8). The authors characterize this as roughly 4–8 times PRM query cost.

Inference: in Verus, the LSTM/PRM ranking remains an untrusted heuristic around independently checked proof artifacts. A verified Rust candidate should be accepted only after its Verus obligations pass; a score can prioritize repair but cannot replace the proof.

## what is proved, trusted, and limited

Proved or measured: Lean accepts generated statements and proofs; theorem-prover success rates; semantic alignment judged by GPT-4o-mini; and downstream BoN@5 accuracy. The alignment audit labels 24,938/30,809 (80.9%) good, 138/30,809 (0.4%) fair, and 5,733/30,809 (18.6%) poor (Table 5, p. 15). Trusted components include the LLMs, few-shot prompts, decomposition, GPT-4o-mini judge, Lean implementation/REPL, theorem provers, and the correctness of the formal statement's translation from prose. The authors state, “The correlation between the output of the Lean 4 REPL and the final evaluation scores appears to be relatively indirect.” (Limitations, p. 10). They also report that LSTM scores are not perfectly interpretable and that formal-language coverage is weaker for geometry and combinatorics.

Inference: for agent-written verified Rust, the threat is high at the specification boundary: an agent can generate a syntactically valid but wrong contract, or silently route an unformalizable step to “no verification required.” The paper's measured 18.6% poor semantic-alignment rate is direct evidence that this failure mode matters in its own setting, but it is not a Rust defect rate. Existing VL work should not redo generic step scoring, four-state aggregation, or bounded prover sampling without a Rust-specific semantic-alignment experiment. A useful adaptation would audit generated Verus contracts against executable tests and require an explicit unknown state for unsupported operations.

## techniques for the catalog

- step decomposition: sample chain-of-thought solutions and split each into complete logical steps using LLM few-shot JSON with heuristic fallback
- step auto-formalization: turn each target step into a Lean 4 theorem with prior facts as premises and validate syntax in the Lean REPL
- four-state evidence: distinguish no-check, failed formalization, proved theorem, and formalized-but-unproved theorem
- bounded theorem proving: run LLM theorem provers with a fixed sample budget and validate returned proofs in the prover's kernel/REPL
- retrospective aggregation: encode state sequences with a small LSTM to produce a trajectory score
- score ensembling: multiply retrospective formal evidence with a prospective PRM score to select Best-of-N outputs

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
