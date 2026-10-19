# VerIF: Verification Engineering for Reinforcement Learning in Instruction Following
(authored by agents unless marked 🧑)
Tag: `peng2025verif`, [paper](http://arxiv.org/abs/2506.09942v1)

## problem and verifier split

Peng et al. design VerIF for reinforcement learning with verifiable rewards (RLVR) on instruction following. The method uses generated code for hard constraints and a reasoning LLM for soft constraints, then combines their binary scores. The authors describe “hard constraints, which can be verified using simple rules, e.g., length, and soft constraints, which require semantic judgment, e.g., style.” (Section 1, p. 1). Section 3.1 considers length, format, and keyword as possible hard constraints; Appendix A.2 classifies the dataset's format, content, and style constraints as soft, including formats requiring semantic interpretation. Length and keyword constraints make up 22.3% of the dataset; soft constraints account for 77.7% (p. 13). The training artifact is VERINSTRUCT, approximately 22,000 English single-turn instructions, each averaging 6.2 constraints and carrying verification methods (Sections 3.2 and 4.2, pp. 4–5).

The key formalization is `VERIF(x,y) = F(Code(y, Ch), LLM(y, Cs))`, where each component returns 0 or 1 for satisfaction of all constraints in its group; `F` is average in the experiments (Sections 3.1 and 4.1, pp. 3–5). Inference: the evidence for hybrid verification is empirical; it does not prove that an LLM judgment is correct.

## technique: engineer a hybrid reward

when to use it

Inference: use deterministic checks for properties that have an unambiguous executable predicate and a reasoning model for constraints requiring semantic interpretation. This split is useful when a single judge is weak on counting but code cannot assess meaning.

how to construct and apply it

1. Represent an instruction as task text plus constraint set `C`, partitioned into `Ch` and `Cs` (Section 3.1).
2. For each hard constraint, generate a Python verifier; the paper uses Qwen2.5-72B-Instruct and manually checks the simple scripts (Section 3.2).
3. Send all soft constraints and the response to QwQ-32B in one online verification call; its binary verdict is the soft score (Sections 3.1 and 3.3).
4. Aggregate hard and soft scores with `F`; the training setup uses their average (Section 4.1).
5. Use the resulting score as the online reward in GRPO, with 16 rollouts per prompt (Section 3.3).

The pilot IFBench has three hard and two soft constraint types. Code-only accuracy is 60.6% hard, 13.2% soft, 48.6% overall; QwQ-only is 31.5%, 48.1%, 37.4%; hybrid is 61.3%, 48.1%, 58.1% (Table 1, p. 3). The task is to choose the better-following response from a pair; the hard and soft subsets identify the type of constraint violated by the rejected response. The paper concludes that “code verification is more effective for hard constraints and LLM verification performs better on soft constraints” (Section 2.2, p. 3).

Verus form (inference)

Inference: represent each hard constraint as a Verus predicate or `spec fn` over an immutable response model, then prove an executable checker's `ensures` clause against that predicate. For example, a length checker can return a Boolean with `ensures result == (len(response) >= min_len)`. A semantic style score cannot be proved by Verus unless style is formalized as a computable specification; an LLM verdict is an external, trusted signal. A hybrid product would carry the deterministic proof result and LLM result as separate fields and make aggregation explicit in a postcondition. `proof fn` lemmas can establish arithmetic properties of score aggregation, but are erased and cannot be called at run time.

## technique: construct RL data with verification methods

The construction pipeline starts with 25,000 sampled instances from Alpaca-GPT4, Orca-Chat, Evol Instruct, and OpenAssistant. Llama3.1-70B-Instruct generates constraints implicitly satisfied by each response; Python synthesizes length constraints because LLMs struggle with counting. The generated constraints are combined with the original instruction. Qwen2.5-72B-Instruct produces Python verification code for hard constraints; soft constraints receive an `LLM` tag for online judgment. Instances with fewer than two constraints are filtered, yielding approximately 22,000 records (Section 3.2, p. 4). Appendix A.1 additionally describes Python-based generation of keyword and selected format constraints (p. 13). Inference: the reusable idea is to construct each instruction together with its reward computation, without requiring a target answer for RL training.

## technique: ablate each verifier

The authors train TULU 3 SFT with VerIF and compare three ablations: only LLM for every constraint (`w/o code*`), LLM for soft constraints while omitting code (`w/o code`), and only Python for hard constraints (`w/o LLM`). On IFEval prompt-level strict, Multi-IF Turn 3, and CFBench ISR, full VerIF scores 84.5, 54.0, 72.0; `w/o code*` 81.7, 51.2, 70.0; `w/o code` 76.2, 52.0, 73.0; `w/o LLM` 74.7, 46.0, 59.0 (Table 4, p. 7). These are separate benchmark percentages. The paper states that “removing any verification component degrades model performance compared to V ER IF” (Section 4.5, p. 7). Inference: this describes the overall pattern, not every cell; `w/o code` improves CFBench by one point. The authors observe limited code-only reward growth and faster LLM-only reward growth, “possibly because the LLM verifier is easier to fit or hack” (Section 4.5, p. 7). Inference: reward hacking is a proposed explanation, not a demonstrated attack in these experiments.

## technique: distill a smaller online verifier

QwQ-32B verification is expensive: when training TULU 3 SFT, the authors deploy the verifier on eight H800 GPUs, with batch size 32 and 16 rollouts. Reward computation takes about 180 seconds per batch, roughly 80% of a training step (Section 4.6, pp. 7–8). They first generate an additional 20,000 instances following VERINSTRUCT construction, then mine instructions from WildChat and Infinity Instruct. For each instruction, they randomly sample a response from six models and use QwQ-32B to generate step-by-step verification, obtaining about 130,000 instruction-response-verification examples. They fine-tune DeepSeek-R1-Distill-Qwen-7B for two epochs at learning rate 2 × 10^-5, batch size 64, and maximum sequence length 8,192, producing IF-Verifier-7B (Appendix C, pp. 13–14).

In Table 5 (p. 8), QwQ-VerIF scores 84.5/87.1/89.3/91.4/79.4/65.2/54.0/54.7/68.6/72.0. The columns are IFEval prompt strict/loose, IFEval instruction strict/loose, Multi-IF turns 1–3, SysBench ISR, FollowBench SSR, and CFBench ISR. IF-Verifier-7B scores 80.0/84.5/86.0/89.4/80.1/63.7/52.7/49.5/68.8/70.0. The smaller verifier uses one H800 and averages 120 seconds per reward batch (Section 4.6, p. 8). Inference: the comparison shows a resource/performance tradeoff, not equivalence.

## results, trust, and limits

With VerIF, R1-Distill-Qwen-7B improves IFEval prompt strict from 59.9 to 75.6 and TULU 3 SFT from 68.4 to 84.5 (Table 2, p. 5). On general benchmarks, R1-VerIF changes GSM8K 87.0 to 90.0 and Omni-MATH 35.0 to 33.6; TULU-VerIF changes AlpacaEval 2.0 length-controlled win rate 7.9 to 22.0 and MT-Bench score 6.3 to 7.0 (Table 3, p. 6; Appendix B, p. 13). Inference: these numbers show gains and regressions, not universal improvement. The authors report gains on multilingual and multi-turn benchmarks despite English single-turn training (Section 4.2, p. 5). Inference: this is evidence of generalization, not a formal guarantee.

Appendix B uses IFEval to select the best checkpoint, with early stopping after more than five checkpoints without improvement (p. 13). Inference: the reported IFEval result also serves model selection, so independent benchmarks matter when assessing transfer. The limitations identify “potential biases” and “vulnerability to adversarial attacks” in LLM judging (p. 9).

## techniques for the catalog

- hard/soft verifier split — route exact predicates to generated code and semantic constraints to a reasoning judge, then combine group-level binary scores (Sections 3.1 and 3.3)
- verifier-bearing RL data — construct constraints and verification methods alongside each instruction (Section 3.2)
- verifier ablation and distillation — remove reward components to measure their contribution; train a smaller judge on QwQ-generated verification and measure downstream performance and cost (Sections 4.5–4.6, Appendix C)
