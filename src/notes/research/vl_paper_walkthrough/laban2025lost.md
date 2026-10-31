# LLMs Get Lost In Multi-Turn Conversation
(authored by agents unless marked 🧑)
Tag: `laban2025lost`, [paper](https://arxiv.org/abs/2505.06120)

## finding
This paper studies whether models can solve the same generation tasks when a complete instruction is split across conversational turns. It reports a degradation in every model on every task: across six tasks and 15 models, the Introduction says models in multi-turn underspecified conversations “achieved an average performance of 65%–a 25-point drop from single-turn performances of 90%” (Introduction, p. 2). Section 6.1 states “every model sees its performance degrade on every task when comparing FULL and SHARDED performance, with an average degradation of -39%” (Section 6.1, p. 8); the abstract also says 39%, while the Figure 1 caption (p. 1) says “-35%”. The paper does not reconcile the 65-vs-90 and 39% figures in text. Inference: the 39% is a relative drop; the Overall SHARDED column of Table 1 (p. 8) holds SHARDED-to-FULL ratios in percent and, by my arithmetic, averages about 61 over the 15 models, so 61 is a ratio to FULL, not an absolute score. The paper calls the phenomenon “the lost in conversation phenomenon: when LLMs take a wrong turn in multi-turn conversation, they get lost and do not recover.” (Introduction, p. 2.)

The mechanism analysis identifies verbose responses, premature final answers, incorrect assumptions about underspecified details, and over-reliance on previous incorrect attempts (Introduction, p. 2). Inference: these are failure modes for an agent eliciting a Verus specification: an early guessed invariant or API contract can persist after later user clarification.

## technique 1: construct valid sharded instructions
Use this to convert a fully specified task into a controlled multi-turn test while preserving its information. The paper’s procedure is:

1. Start with an existing fully specified instruction from a benchmark (Section 3, p. 3).
2. Make Shard 1 state the high-level intent; make later shards each add one clarification (Section 3.1, p. 3).
3. Ensure the set of shards jointly contains the same information as the original instruction; the paper defines five validity properties in Appendix B (Section 3.1, p. 3).
4. Use the semi-automatic process in Appendix C to scale sharding and inspect validity (Section 3.1, p. 4). Appendix C (pp. 19–20) has four steps: (a) an LLM segments the instruction into non-overlapping segments, discarding instructions with fewer than three; (b) an LLM rephrases segments into decontextualized conversational shards, with one segment becoming the first shard; (c) verification by simulating ten FULL, ten CONCAT and ten SHUFFLE-CONCAT conversations per instruction, keeping an instruction only if both P(CONCAT) and P(SHUFFLE-CONCAT) are at least 0.8 of P(FULL); (d) manual inspection and editing, with every included sharded instruction reviewed by two authors.

The paper’s example splits the snowball problem into five shards: the question (how long before Jay is ready), the snowball fight with his sister, 20 snowballs per hour, a 60-snowball target, and 2 melting every 15 minutes (Figure 2, p. 4). It states, “The sharded instruction is composed of a set of shards, each introducing a single element from the original instruction.” (Section 3.1, p. 3.)

Inference: for Verus, shard a specification request into intent, data representation, safety invariants, functional postconditions, and exceptional cases. Keep a machine-readable canonical requirement set so later turns can be checked against the original rather than only the latest prose. This preservation mechanism is not in the paper.

Evidence: the authors use 600 instructions across Code, Database, Actions, Data-to-Text, Math, and Summary, with ten simulations per model/instruction/simulation type (Section 5, p. 7). Table 1 (p. 8) reports per-model, per-task scores for FULL, CONCAT and SHARDED, and its caption says the last two columns “average the performance drops from the CONCAT and SHARDED compared to the FULL in percentages across the six tasks”. CONCAT, which gives all shards at once with rephrasing, has “CONCAT performance averaging 95.1% of the FULL counterpart” (Section 6.1, p. 8). The paper concludes that “the loss in performance for SHARDED is not explained by potential loss of information in sharded instructions” (Section 6.1, p. 8).

## technique 2: simulate a user revealing at most one shard per turn
Use this to measure behavior under underspecified conversation. The method is:

1. Give the assistant only Shard 1 on the first turn (Section 3.2, p. 4).
2. Let a user simulator with access to all shards choose and naturally rephrase at most one unrevealed shard per turn (Section 3.2, pp. 4–5).
3. Let the assistant produce free text after each shard (Section 3.2, p. 4).
4. Classify the response as clarification, refusal, hedging, interrogation, discussion, missing, or answer attempt (Section 3.2, p. 4).
5. If it is an answer attempt, extract the answer span within the free-form response (the paper’s examples are “code snippet, number”) and score it with a task-specific evaluator (Section 3.2, p. 4).
6. End when an answer is correct or no unrevealed shards remain (Section 3.2, p. 4).

The assistant receives only a minimal system instruction (for example a database schema or API tool list) and is not told that the conversation is multi-turn or underspecified (Section 3.2, p. 5). The system uses GPT-4o-mini for the user simulator, strategy classifier, and answer extractor (Section 3.2, pp. 4–5). Manual annotation found that errors from these components “occurred in less than 5% of inspected conversations and that these errors disfavored the assistant model in less than 2% of the conversations” (Section 3.2, p. 5; details in Appendix D, pp. 20–21). The paper cautions, “a fully automated simulation limits the scope of our findings: the conversations we simulate are not representative of human-AI conversations.” (Section 2, p. 3.)

Inference: a Verus agent can use the same protocol to test whether it asks for missing type and invariant information before writing proof code. The answer extractor should be replaced by a parser that identifies the proposed Rust specification and proof obligations; this is a design inference, not a paper method.

## technique 3: separate aptitude from unreliability
Use repeated stochastic runs when a mean score hides whether a model can succeed occasionally or succeeds consistently. For N scores S from one instruction, the paper defines average performance P as the mean, aptitude A90 as the 90th percentile, and unreliability U10^90 as the 90th minus 10th percentile; reliability is 100 minus unreliability (Section 4.2, p. 7). The authors run N=10 simulations per condition (Section 5, p. 7) at temperature 1.

The method is:

1. Repeat the same instruction and model condition N times (Section 4.2, p. 7).
2. Score every run from 0 to 100 using the task evaluator (Section 4.2, p. 7).
3. Compute P, A90, and U10^90 per instruction, then average over the corpus (Section 4.2, p. 7).
4. Compare FULL and SHARDED settings to attribute degradation to aptitude loss, variance, or both (Section 6.2, pp. 9–10). The paper finds that in SHARDED, aptitude drops by an average of 16% while “unreliability skyrockets with an average increase of 112%” (Section 6.2, p. 10).

Inference: for Verus code generation, P can measure the fraction of generated artifacts that compile and verify, A90 can show best-case proof capability, and U10^90 can expose nondeterministic proof success. A run should count as successful only when the exact Rust artifact passes Verus; this criterion is not in the paper.

## technique 4: compare full, concatenated, and sharded controls
The paper’s simulation types include FULL (original single-turn instruction), CONCAT (all shards concatenated into one turn), and SHARDED (one shard revealed per turn) (Section 3.3, p. 5; Table 1, p. 8). The paper intends CONCAT as a verification baseline: “a model that succeeds at both FULL and CONCAT, but not at SHARDED, struggles specifically because of underspecification and the multi-turn nature of the conversation” (Section 3.3, p. 5). Every tested model degraded from FULL to SHARDED on every task, while CONCAT averaged 95.1% of FULL (Section 6.1, p. 8).

## numbers and limitations
The reported 39% degradation is an average across six tasks and 15 models, not a per-model guarantee. The 95.1% CONCAT figure is stated as CONCAT performance averaging 95.1% of FULL (Section 6.1, p. 8); the paper does not say how the average is taken (by my arithmetic the Overall CONCAT column of Table 1 averages about 95.8). The authors ran “more than 200,000 simulated conversations” (Section 5, p. 7) at an estimated total cost of about $5,000 (Section 5, p. 8). The paper’s model set spans 15 models from eight families, with exact versions listed in Appendix H (p. 25). The paper reports that lowering temperature did not fix multi-turn unreliability: even with user and assistant temperature both 0.0, unreliability stays around 30% (Section 7.2, p. 11; Table 3 uses GPT-4o-mini and GPT-4o on 40 instructions, Appendix L). The paper itself lists limitations: simulated users only, analytical tasks only, and English text only (Section 9, p. 13). A seventh task, document translation, showed no degradation in SHARDED; the authors “believe” this reflects that the task can largely be done sentence by sentence, so the sharded conversation is not underspecified (Section 7.3, p. 12).

## techniques for the catalog
- instruction sharding: split a complete instruction into one-intent and clarification shards whose union preserves the original information
- underspecified conversation simulation: reveal at most one shard per turn, classify responses, extract answer attempts, and stop on correctness or shard exhaustion
- aptitude/reliability metrics: use repeated stochastic runs and mean, 90th percentile, and interpercentile range to separate capability from instability
- controlled conversation conditions: compare full, concatenated, and incrementally sharded settings to isolate information and interaction effects
