# HunyuanProver: A Scalable Data Synthesis Framework and Guided Tree Search for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024hunyuanprover`, [paper](http://arxiv.org/abs/2412.20735v3)

## scope and central result
HunyuanProver is a Lean 4 theorem prover fine-tuned from Hunyuan 7B by iteratively generating tactic trajectories and searching over candidate tactics at test time (Abstract, p. 1; Section 4.1, p. 6). Its two system components are a prover-data generator and guided tree-search algorithms. “The prover is lastly iteratively improved on such data where new proof data is generated at each iteration.” (Section 1, p. 1.) The paper evaluates on MiniF2F, whose test set has 244 problems (Section 4.1, p. 5).

The main result is HunyuanProver v16 with best-first search and a distance critic: 68.4% on MiniF2F-test (Table 1, p. 6). Inference: this rounded percentage corresponds to 167/244 solved problems. The table's sampling budget is 600 × 8 × 400 for both HunyuanProver v16 rows, with cost defined as passes × beam × iterations. The paper compares 65.9% for InternLM2.5-StepProver+BFS+CG under 256 × 32 × 600 and 63.5% for DeepSeek-Prover-V1.5-RL+RMaxTS under 32 × 6400; these are different models and search budgets (Table 1, p. 6). The abstract also reports four IMO statements proved in MiniF2F-test (Abstract, p. 1).

## technique 1: scalable autoformalization and iterative tactic-data generation

What it is. Start with paired natural-language problems and Lean statements, train an autoformalizer, generate many candidate formal statements, filter them, then repeatedly solve them and fine-tune the prover on successful tactic trajectories. The initial data has 130,000 pairs: 50,000 from Lean Workbook and 80,000 from MMA (Section 2.1, p. 2). The system translates the natural-language side into Chinese to double the training set, then converts 30 million internal math problems; eight temperature-varied outputs are sampled per problem and 20 million grammar/rule-conforming Lean statements are retained (Section 2.1, p. 2).

When to use it. Inference: use this pipeline when a prover lacks enough tactic-level training examples. The paper generates successful trajectories using best-first search with Lean (Section 2.2, p. 2).

How to apply it. (1) Assemble seed natural-language/Lean statement pairs. (2) Train an autoformalizer that emits target-language statements. (3) Sample multiple temperatures per source problem. (4) Filter outputs that fail Lean grammar or project rules. (5) On each iteration t, run the previous prover with best-first search over unsolved statements. (6) Keep non-null proving trajectories for newly solved statements, forming `D_t = {(q, τ) | q ∈ D_q − D_{t−1}, τ ~ BFS(q), τ ≠ null} ∪ D_{t−1}` (Equation 1, Section 2.2, p. 2). (7) Filter easy statements and rejection-fine-tune the prover on the retained trajectories. (8) Add diversity by turning unfinished final states into new statements and by collecting harder Olympiad-level problems (Section 2.2, p. 2). After more than ten rounds, the authors report more than 20 million tactic-level examples (Section 2.2, p. 2).

Verus form. Inference: build a corpus of Rust/Verus obligations paired with accepted proof scripts, generate candidate contracts or proof steps, run `verus` to retain only checked trajectories, and fine-tune or prompt a prover on those steps. Verus contracts and diagnostics replace Lean tactic states; the data pipeline must preserve crate versions and dependency specifications. Inference: check generated contracts against their source requirements before using them for training; verifier acceptance alone does not establish that correspondence.

Evidence. Section 4.2 reports early performance gains until v8, then minor improvements as training tokens increase from roughly 2.75B (v8) to 4.25B (v12). Figure 3 shows improved accuracy after easy data from before v8 is removed after v12 (pp. 6–7). The conclusion says the method expands training data “by nearly 40-fold” (Conclusion, p. 7). Inference: these training-process observations do not isolate the effects of data quantity, data selection, and iteration; the paper reports no variance estimates.

Failure and assumptions. Section 2.1 describes filtering statements that “do not conform with LEAN grammar or do not satisfy other rules adopted by previous practices” (p. 2), without enumerating those rules. Inference: this description does not establish semantic faithfulness to the natural-language source; incorrect synthetic contracts could contaminate a Verus training corpus.

## technique 2: best-first tactic search

What it is. Model tactic proving as a tree where each node is a Lean state and each edge applies a tactic. BFS repeatedly selects the active node with highest critic score, samples K candidate tactics, executes them in Lean, removes duplicate states by string matching, and adds valid states to the active set. The paper states: “In the selection step, the node n̂ with the highest critic score is selected (without return) from the set of active nodes N :” (Section 3.1, p. 3.)

When to use it. Inference: use best-first search when alternative tactic sequences need exploration and a critic can rank partial states.

How to apply it. (1) Put the theorem state at root n0. (2) Score active nodes with a critic. (3) Select the highest-scoring node and remove it from the active set. (4) Sample K tactics from policy π conditioned on the theorem and selected state. (5) Execute each tactic against Lean; keep valid successors. (6) Deduplicate successor states by string match. (7) Continue until the theorem is proved or T iterations are exhausted (Section 3.1, p. 3). In the reported evaluation, K=8, at most 800 search steps are allowed, and tactic timeouts are 60 seconds per step and 3,600 seconds overall (Section 4.1, p. 5). Table 1 instead lists 400 iterations for the main HunyuanProver results (p. 6); the paper does not explain this difference.

Verus form. Inference: represent each Verus proof state as a node containing source edits, verifier diagnostics, and remaining obligations; sample K candidate edits, run `verus`, and rank surviving states. Inference: identical diagnostics need not imply identical Rust source states; any deduplication rule must account for the source and verification environment. Inference: the verifier remains the acceptance oracle.

Evidence. HunyuanProver v16+BFS+DC reaches 68.4% (Table 1, p. 6); v16+BFS+PC reaches 64.75% in the ablation (Table 2, p. 7). Inference: the within-v16 comparison associates the accuracy gain with distance guidance; the main table gives both v16 rows the same sampling budget. BFS's limitation is that “each node is only visited once with a fixed amount of expansion budget.” (Section 3.1, p. 3.)

## technique 3: ηMCTS with critic-guided exploration

What it is. The adapted ηMCTS repeatedly selects nodes using an Upper Confidence Bound (UCB), expands K tactics, and updates node visit/importance budgets. The authors remove the simulation stage from the standard four-step MCTS loop (Section 3.1, p. 3). A node's importance is the maximal critic-value difference from any descendant; its expansion budget is bounded by Bmin/Bmax and scaled by α (Equations 4–5, p. 4). UCB combines critic score (exploitation) with an under-exploration term (Equation 6, p. 4).

When to use it. Inference: use ηMCTS when revisiting a state and adapting its expansion budget may help. The authors state: “we leave separately examining the effectiveness of MCTS and PRM in future work.” (Section 4.2, p. 7.)

How to apply it. Follow selection, expansion, and backpropagation, omitting simulation. Sample K tactics at a time rather than one, allow repeated visits, and adapt each node's expansion budget using `I(n) = max_{m ∈ SUCC(n)} |CRITIC(m) − CRITIC(n)|` and `E(n) = max(Bmin, min(Bmax, floor(αI(n)) + 1))`. Select using the critic score plus the UCB exploration term (Section 3.1, pp. 3–4, Equations 4–6). The paper does not specify visit-count initialization or detailed backpropagation rules.

Verus form. Inference: use UCB over candidate Rust proof edits, with verifier success/remaining obligations as critic signals; maintain immutable source snapshots so backtracking cannot corrupt the baseline. Inference: no Verus guarantee follows from a high UCB score—only a completed verifier check certifies the candidate.

Evidence. Table 2 reports MCTS+PRM at 62.29% for v12 and 66.39% for v14, while corresponding BFS+PC rows are 61.07% and 62.70% (MiniF2F-test denominator 244; Table 2, p. 7). Inference: each within-version comparison jointly changes search and critic, so it cannot isolate the effect of MCTS.

## technique 4: critic models, especially distance critic

What it is. The system uses policy confidence, a process reward model (PRM), and a distance critic. Policy confidence is the token-average log probability of a candidate tactic (Equation 7, p. 4). PRM labels search-tree nodes +1 or −1 according to whether they reach a successful final state in the generated tree, then trains a scalar predictor by mean squared error (Section 3.2, Equation 8, p. 4). Inference: a negative label need not mean that no proof exists from that state. The distance critic predicts remaining proof steps using a balanced binary-tree path rather than a single exact integer. “This hierarchical structure helps reduce prediction errors during tree search by enabling the model to first make broader, more reliable predictions before refining them.” (Section 3.2, p. 5.)

How to apply the distance critic. (1) Train the critic to predict a path encoding the remaining number of proof steps. (2) Represent tree nodes with separate special tokens and clip step counts above 64 to 64. (3) At search time, compare the predicted tuples directly to rank states from coarse to fine (Section 3.2, p. 5). The paper says it uses an “8-level binary tree to represent numbers up to 64”; it does not explain this level count. Figure 2's 4-level example represents 1–8, with 6 encoded as root → 2/2 → 3/4 → 6/8 (p. 5). The paper does not specify how distance-training labels are selected among alternative proofs; its shortest-proof convention is stated for Figure 4's proof-length analysis (Section 4.2, p. 7).

Verus form. Inference: predict remaining verifier-repair steps or obligation depth from logged Verus states, encode a bounded coarse-to-fine score, and use it to rank candidate edits. Inference: preserve the target contract and accept a final proof only after verification. Inference: distance labels can be biased by the current prover and may reward short but poor proof shapes.

Evidence. For HunyuanProver v16, BFS+DC reaches 68.44% versus BFS+PC 64.75% on MiniF2F-test (Table 2, p. 7); the main table rounds the DC value to 68.4% (Table 1, p. 6). The paper says DC “finds more deep proofs” and “takes more steps” on some easy theorems (Section 4.2, p. 7). Inference: these MiniF2F results do not establish effectiveness on Rust systems proofs.

## what is proved, measured, and trusted

The paper uses the Lean engine from LeanDojo for tactic-data generation and evaluation (Section 4.1, p. 5). Inference: a successful Lean proof checks the formal statement; a tactic trajectory is not itself evidence that the statement matches a natural-language requirement. MiniF2F accuracy measures the share of 244 test problems solved under the stated model, search, and timeout budgets. Training-token counts and iteration curves measure data-generation scale. The paper's final conclusion is: “critic-guided tree search algorithms further enhance the overall effectiveness of the prover.” (Conclusion, p. 7.)

## techniques for the catalog

- iterative verifier-backed data synthesis — generate many formal statements, retain checked tactic trajectories, and fine-tune across rounds
- best-first tactic search — select the highest-scoring proof state, sample multiple tactics, execute in Lean, deduplicate, and repeat
- ηMCTS with UCB — revisit states and allocate expansion by critic importance while balancing exploration and exploitation
- policy-confidence and process critics — rank tactics or states using token likelihood and +1/−1 reachability labels
- coarse-to-fine distance critic — predict remaining proof length as a balanced-tree path and use it to guide search
