# RLTL;DR: Self-improvement by Internalizing Self-generated Feedback
(authored by agents unless marked 🧑)
Tag: `kirchhof2026rltldr`, [paper](https://arxiv.org/abs/2609.37633)

## scope and result
RLTL;DR addresses RL with verifiable rewards when every group of attempts fails. Its verifier supplies unit-test/final-state outcomes; the policy converts each failure into a one-sentence insight, conditions later attempts on accumulated insights, and backpropagates through insight tokens. The paper states: “This paradigm fails when tasks are so hard that the policy does not produce any successful rollouts in 128 attempts” (Introduction, p.1). It reports Qwen 3.5 9B on AppWorld, Synthetic-API (SAPI), and Leetcode tasks filtered to Pass@128=0.

## technique: sequential verifier-guided exploration
What it is: replace parallel iid rollouts with sequential attempts. After a failure, generate a compact TL;DR from the full attempt and verifier error, insert it as a user message before the next attempt, and continue until success or a budget limit.

Steps from Appendix A.1 and Figure 1:
1. execute an agent rollout and run verifier code (Appendix A.1, p.15)
2. on failure, give task, actions, observations, and unit-test output to an insight prompt (Appendix A.1, p.15)
3. generate summary, diagnosis, wrong-step id, corrected code, and one-sentence hint; retain only the hint (Appendix A.1, p.15)
4. insert all current one-sentence insights before the next rollout when running success rate is at most 50% (Appendix A.2, p.16)
5. evaluate unaided rollouts separately to avoid giving test-time credit for privileged insights (Section 4.1, p.5)

The paper’s concrete hints include “Remember to paginate search results.” and “Sort the notes to find the most recent one.” (Figure 1, p.2). It reports that sequential sampling finds at least one solution for Pass@k=14–59% of tasks (Introduction, p.1), but this is exploration with hints, not one-shot performance.

Verus form: Inference: use Verus verification failures or test counterexamples as structured feedback, but keep the final proof attempt deterministic. An orchestrator can store an insight string outside verified Rust; the Rust proof must still establish `ensures` independently. Verus cannot prove that a natural-language hint is correct, so treat it as an untrusted search heuristic.

## technique: insight-token internalization (LSFT)
What it is: backpropagate on the inserted insight tokens even though they are in user context and never generated at evaluation. The paper says: “This trains a task → something to keep in mind mapping into the policy” (Introduction, p.2).

Steps:
1. construct the third-attempt context containing task, prior attempt, verifier failure, and insight (Figure 1, p.2)
2. activate the backpropagation mask only on insight tokens (about 17 tokens per insight) (Introduction, p.2)
3. combine this SFT loss with GRPO rollout loss: (L=L_{GRPO}(rollout)+\lambda L_{SFT}(insights)) (Figure 1, p.2)
4. evaluate Pass@1 without insights and without sequential sampling (Section 4.1, p.5)

Evidence: on Pass@128=0 tasks, GRPO remains 0–1% while RLTL;DR reaches 11–14% Pass@1 (Introduction, p.2). On the 642-task SAPI split (256 eval, 386 train), RLTL;DR reaches 18.9% eval Pass@1 (Table 2, p.7; ±0.6% standard deviation). Removing GRPO but retaining LSFT reaches 17.0%; setting λ=0 reaches 13.2% (Table 2). The denominator is the 256 held-out tasks and metrics are unaided Pass@1.

Verus form: Inference: analogous training would feed verifier diagnostics to an agent fine-tuning loop while requiring generated Rust to pass `verus`. The insight is training data, not a proof premise. A failed proof is a verifier signal, but a passing proof remains the acceptance criterion.

## technique: SFTL;DR reduction
What it is: train only on (task, insight) tuples, omitting rollout tokens. The paper says: “LLMs can be trained simply via a LSFT loss on (task, one-sentence insight) tuples” (Section 5, p.8).

Steps:
1. collect unique task–insight tuples from failed rollouts (Section 5.1, p.7)
2. for SFTL;DR, apply loss to insight tokens only; do not forward or backpropagate the subsequent rollout (Section 5.1, p.7)
3. for deduplication, create unique tuples (g,f), 4k total, and train one by one (Section 5.1, p.7)
4. compare to offline SFT on successful full rollouts with equalized compute (Section 5.1, p.7)

Table 2 gives 16.8% eval Pass@1 for SFTL;DR and 16.9% for deduplicated SFTL;DR, versus 20.9–21.0% for SFT on 3.5k/1k rollouts; backward tokens are 292k and 68k versus 6.6M and 1.9M (Table 2, p.7). Full rollout collection still costs about 1B tokens (Section 5.2, p.8), so the reduction saves update compute, not data-generation compute.

Inference: for VL, this suggests storing compact verifier lessons and fine-tuning a proof-writing model on task–lesson pairs. The paper’s own limit applies: highly task-specific mathematical tricks may not transfer (Section 7.2, p.10). Verus proof idioms likely transfer when lessons name reusable invariant or trigger patterns, but this is an inference.

## technique: insight quality controls
Insights should identify the failure, remain broad enough to transfer, and avoid revealing a complete solution. Table 3 shows default TL;DR (21.4% train, 19.2% eval), diagnostic paragraph (20.3%, 18.6%), summary plus diagnosis (13.8%, 16.0%), and corrected code (15.7%, 17.3%) (Table 3, p.9). Removing failed-unit-test information drops train/eval to 3.4%/10.0% (Table 3). The paper therefore recommends verifier-informed but compact feedback.

It measures insight advantage (Pass@1 with minus without hints), too-easy ratio (all hinted rollouts correct; target below 20%), too-hard ratio (none correct; target below 50%), and insight generalization through held-out task curves (Appendix D.2, p.22). These are evaluation controls, not formal soundness guarantees.

## trusted, measured, and limits
The verifier and environment checks are trusted reward oracles; the model’s insight generator is not. The paper explicitly notes that “the source of the insight does not matter” if it is accurate and transferable (Section 7.3, p.10), but accuracy depends on privileged verifier outputs. It hypothesizes failure on overly specific tasks and domains where generating a good insight is as hard as solving the task (Section 7.2, p.10). Results are three-seed averages where stated; AppWorld has 34 Pass@128=0 tasks, SAPI 458 frontier tasks, and Leetcode 123 after filtering (Section 4.1, p.5).

Inference: threat to a product of agent-written verified Rust is moderate. Internalized lessons may improve search, but training can encode misleading diagnostics or overfit verifier behavior. Soundness remains with Verus contracts and solver checks; the main product risk is wasted proof search or learned specification mistakes.

## techniques for the catalog
- sequential verifier feedback: feed each failed rollout’s compact lesson into the next attempt
- insight SFT: backpropagate only on verifier-derived insight tokens to internalize reusable rules
- SFTL;DR: train on task–insight pairs without rollout-token supervision
- insight evaluation: measure advantage, too-easy/too-hard ratios, and unaided held-out Pass@1
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
