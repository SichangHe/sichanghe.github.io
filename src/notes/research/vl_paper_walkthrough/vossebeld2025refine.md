# Learning to Refine: An Agentic RL Approach for Iterative SPARQL Query Construction
(authored by agents unless marked 🧑)
Tag: `vossebeld2025refine`, [paper](https://arxiv.org/abs/2511.11770)

## problem and result

The paper treats multi-hop knowledge-graph question answering as sequential query construction. Its central claim is that outcome-only reinforcement learning can teach a 3B-parameter model to repair SPARQL queries from execution feedback. The authors state: “This paper introduces a novel agentic framework where an LLM learns a resilient policy for the sequential process of iterative SPARQL construction” (Abstract, p. 1). The implementation uses Qwen2.5-3B-Instruct with QLoRA adapters, a private Wikidata endpoint, and Group Relative Policy Optimization (GRPO).

The curated LC-QuAD 2.0 test set contains 1,279 single-binding questions (Table 2, §4.1). Table 3 reports, on this denominator, 49.7% answer accuracy and 81.0% query executability for the RL agent, versus 32.2% and 54.7% for the prompt-guided iterative baseline. The paper reports 354 test questions on which RL was correct and the baseline wrong, versus 130 in the opposite direction, with McNemar χ²(1)=102.75 and p≪.001 (§5.1). Table 3 states N=1,279 for the test set. Executability is defined differently from accuracy: it is “total successful executions divided by the total number of queries issued across the test set” (§4.5), so its denominator is the number of queries, not questions.

## technique 1: turn tool use into an agentic MDP

What it is. The state is the complete textual history; the action is a tagged reasoning block followed by either a query or an answer. The paper defines the transition: “Given state s_t and a query action a_t, the environment executes the SPARQL query from a_t. The resulting observation o_{t+1} (the content of the <query_result> block) is appended to the history” (§3.1, p. 4). Episodes stop at an answer, a turn limit, or malformed output.

When to use it. Use this decomposition when a generated artifact can be executed and the execution result gives useful feedback before the final objective is known. Inference: a Verus proof-repair agent can represent the current Rust/proof text, compiler diagnostics, and prior attempts as state, and choose either a proof edit or a final submission action.

How to do it (paper's procedure, §3.2):
1. Provide the question and previous interaction history to the policy.
2. Generate `<think>...</think>` followed by `<query>...</query>` or `<answer>...</answer>`.
3. If a query is emitted, execute it and append `<query_result>` to history; if an answer is emitted, terminate; abort malformed output.
4. Repeat until success or maximum turns.

Verus form. Inference: encode the state as an external controller record containing the Rust source, Verus diagnostics, and an attempt counter; have an LLM propose a patch or stop. Run `verus` on each patch and feed diagnostics back. The proof checker, rather than a SPARQL endpoint, is the deterministic environment. Verus constructs in the resulting program remain ordinary `requires`, `ensures`, loop `invariant` declarations, `assert`, `assume` only for explicitly trusted facts, and `proof fn`; the controller itself is outside the verified artifact. This transfer is an inference because the paper does not use Verus.

Evidence and limits. The authors report a concrete case in which the agent “pivoted to an exploratory query to find all cities twinned with Plovdiv, and then used a second verification query on the candidates” (§5.4.2). The scope is limited: “our system’s performance is evaluated on a curated subset of single-answer questions, and it relies on pre-linked entities provided in the dataset” (§3.4). Entity linking, multi-answer aggregation, noisy or incomplete graphs, and open-domain deployment are therefore untested.

## technique 2: outcome-only GRPO with a composite terminal reward

What it is. GRPO samples several trajectories for one prompt, compares each terminal reward with its group average, and updates only the policy adapters. The paper says: “GRPO compares the terminal reward of each trajectory against others in a group sampled from the same prompt, using relative performance to compute an advantage signal” (§3.3, p. 5). No learned value function or supervised gold trajectory is required.

How to do it (paper's §3.3.1–3.3.2):
1. For each question, sample G=16 complete trajectories.
2. Give a structurally invalid trajectory reward −1; otherwise compute 1 + answer reward − (0.1×failed executions + 0.02×turns). The answer reward is +0.5 when the judge accepts the answer and −0.2 otherwise.
3. Compute each trajectory's advantage relative to the group mean.
4. Update QLoRA adapters with AdamW; mask loss on environment tokens and apply KL regularization (β=0.04).
5. Repeat for one epoch. Training used batches of 128 questions, a 3-second query timeout, and one NVIDIA H100 for 11.5 hours (§4.2–4.3).

The loss-masking detail is operationally important: “The policy’s parameters θ are updated only based on the log-probabilities of tokens generated by the agent ... Tokens from the environment ... are masked out from the loss calculation” (§3.2.2). Inference: for Verus, mask compiler output and unchanged source from the policy loss, while scoring only generated edits and proof text. A composite reward could combine verifier success, regression tests, edit size, and number of retries; reward design would remain a product decision, not a theorem about correctness.

Evidence. On the test denominator N=1,279, the RL agent reaches Pass@5 77.7%, compared with 61.7% for the prompt-guided baseline (Table 3). The reactive ablation, trained identically without `<think>`, reaches 48.1% accuracy and 82.3% executability; the deliberative agent reaches 49.7% and 81.0% (Table 4). Inference: the nearly equal ablation scores show that the reward and interaction loop account for most measured gains; the paper's attribution of a cognitive scaffold to `<think>` rests only on this 1.6-point accuracy difference, and the paper reports no repeated runs or significance test for it.

## technique 3: make execution cheap and deterministic

The authors deploy “a containerised qEndpoint (truthy Wikidata HDT) inside our Azure VNet” with asynchronous requests, an in-memory LRU cache, RDFLib pre-flight syntax checks, retries, and back-off (§3.2.1). They use the 2023-12-21 Wikidata dump, memoization, and a 3-second timeout (§4.2). Inference: a Verus repair loop should isolate a reproducible toolchain and cache verification results by source and dependency hash; otherwise nondeterministic dependencies can teach the policy to exploit infrastructure noise. The paper's own environment is trusted for query execution and its GPT-4o-nano judge supplies the Boolean correctness label (§4.5); those components are not independently proved.

## techniques for the catalog

- agentic MDP loop — represent complete artifact-and-feedback history as state and alternate generated action with deterministic tool execution

- GRPO terminal-reward repair — sample grouped trajectories and update QLoRA policy adapters from relative terminal rewards without gold traces

- loss masking for tool interaction — train on model-generated reasoning and actions while masking deterministic environment observations

- deterministic execution harness — use a local endpoint, syntax pre-checks, caching, retries, and bounded timeouts to make thousands of training interactions reproducible
