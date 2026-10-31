# LLM-based Automated Theorem Proving Hinges on Scalable Synthetic Data Generation
(authored by agents unless marked 🧑)
Tag: `lai2025scalable`, [paper](https://arxiv.org/abs/2505.12031)

## contribution
The paper targets Lean 4 automated theorem proving (ATP) with two linked techniques: proof-state exploration for synthetic transitions and adaptive beam-size pruning at inference. Its abstract describes "a novel proof-state exploration approach for training data synthesis, designed to produce diverse tactics across a wide range of intermediate proof states, thereby facilitating effective one-shot fine-tuning of LLM as the policy model" and an "adaptive beam size strategy" (abstract, p.1). The training corpus combines generated transitions with Mathlib data; the final set is approximately 20 million transitions (Section 4.1, p.7).

## technique: proof-state exploration for data synthesis
What it is: explore a tree of Lean states while forcing the policy to try a curated set of tactics, including low-probability tactics, so training data leaves the model's usual comfort zone. The paper says, "Our proof state exploration may force the policy model to explore those tactics which it does not typically explore (i.e., force it to jump out of its comfort zone), by which a more diverse training set can be constructed." (Section 3.1, p.5).

Steps from the paper:
1. Scan Mathlib for tactics and use the STP dataset to obtain 173 distinct tactics; nucleus sampling with P=0.999 retains a set T of 60 common tactics (Section 3.1).
2. At each expanded proof state si, starting from a formal seed, use constrained decoding to generate B different tactic operators in T, for example B=32 (Section 3.1).
3. Run a second policy inference to complete premises for each operator, forming proof steps (ti, pi) (Section 3.1).
4. Execute each completed step in Lean 4 to obtain next states; continue exploring even after a proof-finish state until the budget is used (Section 3.1).
5. At each expansion retain αB branches, normally α=0.25: keep β highest joint-probability branches and randomly sample the remaining αB−β from the rest (Section 3.1).
6. If a distinct path reaches proof finish, multiply the expansion budget by γ=0.9 (Section 3.1).
7. Post-process with de-duplication, BLEU-based decontamination against evaluation data, and rejection sampling that discards invalid Lean transitions; train the policy by supervised fine-tuning on the accumulated corpus (Section 3.1).

Algorithm 1 records each tuple (next state, tactic, premises, parent state), queues valid next states, and stops when the queue is empty or budget is exhausted. The method does not require ground-truth solutions: the conclusion describes generation "without relying on ground-truth solutions" (Section 7, p.10). Lean execution checks transition validity; valid transitions need not lie on a completed proof path.

Inference: Verus form: use a Rust/Verus proof state as the node, ask a model for diverse proof statements or tactic-like fragments, compile each with Verus, and retain only candidates that advance the state. Verus has no Lean tactic operators or Lean premises; use actual Verus proof constructs and compiler diagnostics. The diversity and branch-pruning logic could transfer; tactic curation would need Verus corpus statistics, and decontamination would compare against Verus evaluation problems.

## technique: adaptive beam size
Tree search scores a child by score(sᵢ₊₁)=log Pθ(tj|si)+score(si) (Equation 1). A too-small beam misses states; a too-large beam can overcommit to one high-scoring subtree. The paper describes starting wide and narrowing with depth: "We adopt a larger beam size at the early stages of tree search; as the search proceeds (i.e., the depth increases), we gradually reduce the beam size." (Section 3.2, p.6).

Apply Equation 2: beam_size = Bmin + (Bmax−Bmin) × max(1−λM,0), where M=e/E, e is the current expansion step and E the maximum number of expansions, and λ controls decay (Section 3.2, pp.6–7). Inference: the formula depends on consumed expansions, rather than directly on node depth. Set Bmax, Bmin, and λ per benchmark; the paper uses Bmax=16, Bmin=4, λ=15 for MiniF2F and Bmax=48, Bmin=24, λ=2 for ProofNet (Appendix A.4). Inference: this changes the search policy, not the proof rules.

Inference: Verus form: maintain a priority queue of candidate Rust proof states scored by model log probability and decay the number of candidate proof steps generated per expansion as the search budget is consumed. Every retained branch still requires Verus verification; a high score cannot establish correctness.

## evaluation and results
The authors train Qwen2.5-Math-7B for one epoch, batch size 2,048, learning rate 2×10−5, on eight H800 GPUs; BFS-Prover supplies the exploration policy (Section 4.1). They evaluate Pass@1 on MiniF2F-test and ProofNet-test under budget K×B×E, fixing K=1 and E=600 for Table 1. Adaptive beam obtains 60.74% ± 0.88% on MiniF2F-test and 21.18% ± 0.55% on ProofNet-test (Table 1). The paper does not define the ± values or print benchmark item denominators in the table. Fixed beam's best listed values are 59.51% ± 0.79% (MiniF2F, B=8) and 20.75% ± 0.94% (ProofNet, B=32). Inference: subtracting these fixed-beam values from the adaptive-beam values gives improvements of 1.23 and 0.43 percentage points, respectively. Comparisons are under the stated K=1,E=600 budget; results re-evaluated by the authors have an asterisk, while other baseline results are imported from the original papers (Table 1 caption).

DoBeVi is the interaction tool: it tracks proof states with globally unique identifiers except for ProofFinish nodes, decouples sessions for parallel processing, recovers from tactic timeouts and Lean process failures, and visualizes proof-finished, error, and open nodes (Appendix A.3). Each tactic has a 20-second timeout; a timeout restores the saved context by restarting the REPL. Each search has a global timeout of 1,800 seconds. If incorrect child nodes exceed a threshold, usually 0.5×beam size, the current node is discarded early (Appendix A.4, pp.16,18). Inference: these measures limit the search time spent on hanging or error-prone branches.

## techniques for the catalog
- diverse proof-state exploration — force curated low-probability tactics, execute them in Lean, and retain valid transitions
- branch pruning with finish signal — keep high-score plus random branches and shorten exploration after distinct proof finishes
- synthetic-data post-processing — deduplicate, decontaminate against benchmarks, and reject invalid transitions
- adaptive beam decay — reduce beam from Bmax to Bmin as the expansion count grows
- resilient verifier interaction — track states, recover timed-out REPL sessions, and prune batches of erroneous children
