# HunyuanProver: A Scalable Data Synthesis Framework and Guided Tree Search for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024hunyuanprover`, [paper](http://arxiv.org/abs/2412.20735v3)

## scope and central result
HunyuanProver is a Lean 4 theorem prover trained by iteratively generating tactic trajectories and searching over candidate tactics at test time. Its two system components are a prover-data generator and guided tree-search algorithms. “The prover is lastly iteratively improved on such data where new proof data is generated at each iteration.” (Section 1, p. 1.) The paper evaluates on MiniF2F, whose test set has 244 problems (Section 4.1, p. 5).

The main result is HunyuanProver v16 with best-first search and a distance critic: 68.4% on MiniF2F-test, or 167/244 problems when the displayed rounded percentage is converted using the benchmark denominator (Table 1, p. 5). The table's sampling budget is 600 × 8 × 400 for BFS methods. The paper compares 65.9% for InternLM2.5-StepProver+BFS+CG under 256 × 32 × 600 and 63.5% for DeepSeek-Prover-V1.5-RL+RMaxTS under 32 × 6400; these are different models and search budgets (Table 1, p. 5). The abstract also reports four IMO statements proved in MiniF2F-test (Abstract, p. 1).

## technique 1: scalable autoformalization and iterative tactic-data generation

What it is. Start with paired natural-language problems and Lean statements, train an autoformalizer, generate many candidate formal statements, filter them, then repeatedly solve them and fine-tune the prover on successful tactic trajectories. The initial data has 130,000 pairs: 50,000 from Lean Workbook and 80,000 from MMA (Section 2.1, p. 2). The system translates the natural-language side into Chinese to double the training set, then converts 30 million internal math problems; eight temperature-varied outputs are sampled per problem and 20 million grammar/rule-conforming Lean statements are retained (Section 2.1, p. 2).

When to use it. Use this pipeline when a verifier agent lacks enough step-level examples for difficult proofs. It is a data-engineering method, not a replacement for kernel checking: every trajectory is executed by Lean.

How to apply it. (1) Assemble seed natural-language/Lean statement pairs. (2) Train an autoformalizer that emits target-language statements. (3) Sample multiple temperatures per source problem. (4) Filter outputs that fail Lean grammar or project rules. (5) On each iteration t, run the previous prover with best-first search over unsolved statements. (6) Keep non-null proving trajectories for newly solved statements, forming `D_t = {(q, τ) | q ∈ D_q − D_{t−1}, τ ~ BFS(q), τ ≠ null} ∪ D_{t−1}` (Equation 1, Section 2.2, p. 2). (7) Filter easy statements and rejection-fine-tune the prover on the retained trajectories. (8) Add diversity by turning unfinished final states into new statements and by collecting harder Olympiad-level problems (Section 2.2, p. 2). After more than ten rounds, the authors report more than 20 million tactic-level examples (Section 2.2, p. 2).

Verus form. Inference: build a corpus of Rust/Verus obligations paired with accepted proof scripts, generate candidate contracts or proof steps, run `verus` to retain only checked trajectories, and fine-tune or prompt a prover on those steps. Verus contracts and diagnostics replace Lean tactic states; the data pipeline must preserve crate versions and dependency specifications. Inference: autoformalizing natural language into Rust contracts is riskier than generating tactics, so a statement/source gate like LeanFlow's is needed before training on generated contracts.

Evidence. Figure 3 reports early accuracy gains as training tokens rise from about 2.75B (v8) to 4.25B (v12), followed by smaller gains; removing easy data after v12 improves performance (Section 4.2, p. 6). The conclusion says the method expands training data “by nearly 40-fold” (Conclusion, p. 7). These are aggregate training-process observations; no independent variance estimates are reported.

Failure and assumptions. The 20 million generated statements are filtered by grammar and rules, not by proof quality or semantic faithfulness to their natural-language source. Inference: for VL, a large synthetic corpus can amplify incorrect contracts unless every contract is audited against requirements.

## technique 2: best-first tactic search

What it is. Model tactic proving as a tree where each node is a Lean state and each edge applies a tactic. BFS repeatedly selects the active node with highest critic score, samples K candidate tactics, executes them in Lean, removes duplicate states by string matching, and adds valid states to the active set. The paper states: “In the selection step, the node n̂ with the highest critic score is selected (without return) from the set of active nodes N.” (Section 3.1, p. 3.)

When to use it. Use BFS when a single-pass proof is too brittle and a cheap critic can rank partial states. It is simpler than MCTS and supports broad tactic sampling at each expansion.

How to apply it. (1) Put the theorem state at root n0. (2) Score active nodes with a critic. (3) Select the highest-scoring node and remove it from the active set. (4) Sample K tactics from policy π conditioned on the theorem and selected state. (5) Execute each tactic against Lean; keep valid successors. (6) Deduplicate successor states by string match. (7) Continue until the theorem is proved or T iterations are exhausted (Section 3.1, p. 3). In the reported evaluation, K=8, at most 800 search steps are allowed, and tactic timeouts are 60 seconds per step and 3,600 seconds overall (Section 4.1, p. 5).

Verus form. Inference: represent each Verus proof state as a node containing source edits, verifier diagnostics, and remaining obligations; sample K candidate edits, run `verus`, and rank surviving states. String matching is unsafe for Rust states because equivalent diagnostics can differ textually; use normalized obligations or hashes only as an implementation choice, not a proof of equivalence. Inference: the verifier remains the acceptance oracle.

Evidence. HunyuanProver v16+BFS+DC reaches 68.4% (Table 1, p. 5); v16+BFS+PC reaches 64.75% in the ablation (Table 2, p. 6). The different rows share the v16 model but differ in critic, so the gain is associated with distance guidance under the listed search budget. BFS's limitation is that “each node is only visited once with a fixed amount of expansion budget.” (Section 3.1, p. 3.)

## technique 3: ηMCTS with critic-guided exploration

What it is. The adapted ηMCTS repeatedly selects nodes using an Upper Confidence Bound (UCB), expands K tactics, and updates node visit/importance budgets. The authors remove the simulation stage from the standard four-step MCTS loop (Section 3.1, p. 3). A node's importance is the maximal critic-value difference from any descendant; its expansion budget is bounded by Bmin/Bmax and scaled by α (Equations 4–5, p. 4). UCB combines critic score (exploitation) with an under-exploration term (Equation 6, p. 4).

When to use it. Use ηMCTS for difficult proofs where revisiting a promising state and allocating more expansion to uncertain branches may beat one-shot BFS expansion. The paper cautions that computation limited its ablation: MCTS is evaluated together with PRM, so the individual effects are not isolated (Section 4.2, p. 6).

How to apply it. (1) Initialize the theorem root and empty visit counts. (2) Select a child maximizing UCB. (3) Sample K candidate tactics at that state. (4) Execute valid tactics in Lean and add successors. (5) Compute critic differences and update each node's bounded expansion budget. (6) Backpropagate visit counts/values; repeat until success or budget exhaustion. The paper's adaptation omits simulation and samples K tactics per expansion rather than one (Section 3.1, p. 3).

Verus form. Inference: use UCB over candidate Rust proof edits, with verifier success/remaining obligations as critic signals; maintain immutable source snapshots so backtracking cannot corrupt the baseline. Inference: no Verus guarantee follows from a high UCB score—only a completed verifier check certifies the candidate.

Evidence. Table 2 reports MCTS+PRM at 62.29% for v12 and 66.39% for v14, while corresponding BFS+PC rows are 61.07% and 62.70% (MiniF2F-test denominator 244; Table 2, p. 6). These comparisons use different model versions and jointly vary search/critic components, so they are suggestive rather than a clean MCTS-only experiment.

## technique 4: critic models, especially distance critic

What it is. The system uses policy confidence, a process reward model (PRM), and a distance critic. Policy confidence is the token-average log probability of a candidate tactic (Equation 7, p. 4). PRM labels each state +1 or −1 according to whether it can reach a successful proof and trains a scalar predictor by mean squared error (Equation 8, p. 4). The distance critic predicts remaining proof steps using a balanced binary-tree path rather than a single exact integer. “This hierarchical structure helps reduce prediction errors during tree search by enabling the model to first make broader, more reliable predictions before refining them.” (Section 3.2, p. 4.)

How to apply the distance critic. (1) Compute shortest successful proof lengths for solved trajectories. (2) Encode each remaining-step number as a path in an 8-level binary tree, representing numbers up to 64; values above 64 are clipped to 64 (Section 3.2, p. 5). (3) Train special-token predictions for each path level. (4) At search time, compare states by their path tuples, which gives coarse-to-fine distance ordering. (5) Use the resulting critic in BFS or another tree search. The paper's 4-level example represents 1–8; number 6 has path root → 2/2 → 3/4 → 6/8 (Figure 2, p. 5).

Verus form. Inference: predict remaining verifier-repair steps or obligation depth from logged Verus states, encode a bounded coarse-to-fine score, and use it to rank candidate edits. This is an orchestration heuristic; it must never weaken a contract or accept an unverified edit. Inference: distance labels can be biased by the current prover and may reward short but poor proof shapes.

Evidence. For HunyuanProver v16, BFS+DC reaches 68.44% versus BFS+PC 64.75% on MiniF2F-test (Table 2, p. 6); the main table rounds the DC value to 68.4% (Table 1, p. 5). The study says DC finds more deep proofs but can take more steps on some easy theorems (Section 4.2, p. 6). This is a benchmark-specific effect, not evidence that distance critics are optimal for systems proofs.

## what is proved, measured, and trusted

Lean kernel execution of each tactic trajectory is the proof certificate. MiniF2F accuracy measures the share of 244 test problems solved under the stated model, search, and timeout budgets. Training-token counts and iteration curves measure data-generation scale. The paper's final conclusion is: “critic-guided tree search algorithms further enhance the overall effectiveness of the prover.” (Conclusion, p. 7.)

Inference: trusted components include Lean's kernel and environment, the autoformalizer's statement translation, data filters, critic labels, model checkpoints, timeout policy, and benchmark statements. The paper does not establish semantic faithfulness of generated natural-language-to-Lean translations, nor transfer from MiniF2F to Rust systems. Inference: the threat to VL is moderate for search architecture and high if synthetic contracts are accepted without requirement review.

Inference: VL should not redo generic tree-search results as new science; it can reuse the practical pattern of verifier-backed candidate branching, critic-guided ranking, and iterative data synthesis. A useful new experiment would compare BFS/MCTS over Verus repairs on a fixed Rust benchmark, reporting exact denominators, wall-clock cost, proof stability under dependency changes, and contract-fidelity errors.

## techniques for the catalog

- iterative verifier-backed data synthesis — generate many formal statements, retain checked tactic trajectories, and fine-tune across rounds
- best-first tactic search — select the highest-scoring proof state, sample multiple tactics, execute in Lean, deduplicate, and repeat
- ηMCTS with UCB — revisit states and allocate expansion by critic importance while balancing exploration and exploitation
- policy-confidence and process critics — rank tactics or states using token likelihood and +1/−1 reachability labels
- coarse-to-fine distance critic — predict remaining proof length as a balanced-tree path and use it to guide search
Checked 2026-10-15 against paper li2024hunyuanprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
