# LLM-based Automated Theorem Proving Hinges on Scalable Synthetic Data Generation
(authored by agents unless marked 🧑)
Tag: `lai2025scalable`, [paper](https://www.semanticscholar.org/paper/52bbfafbc63866d95015027ae17595fc3396edb0)

## contribution
The paper targets Lean 4 automated theorem proving (ATP) with two linked techniques: proof-state exploration for synthetic transitions and adaptive beam-size pruning at inference. Its abstract describes "a novel proof-state exploration approach for training data synthesis, designed to produce diverse tactics across a wide range of intermediate proof states, thereby facilitating effective one-shot fine-tuning of LLM as the policy model" and an "adaptive beam size strategy" (abstract, p.1). The training corpus combines generated transitions with Mathlib data; the final set is approximately 20 million transitions (Section 4.1, p.7).

## technique: proof-state exploration for data synthesis
What it is: explore a tree of Lean states while forcing the policy to try a curated set of tactics, including low-probability tactics, so training data leaves the model's usual comfort zone. The paper says, "Our proof state exploration may force the policy model to explore those tactics which it does not typically explore (i.e., force it to jump out of its comfort zone), by which a more diverse training set can be constructed." (Section 3.1, p.4).

Steps from the paper:
1. Scan Mathlib for tactics and use the STP dataset to obtain 173 distinct tactics; nucleus sampling with P=0.999 retains a set T of 60 common tactics (Section 3.1).
2. For each formal seed state si, use constrained decoding to generate B different tactic operators in T, with B often 32 (Section 3.1).
3. Run a second policy inference to complete premises for each operator, forming proof steps (ti, pi) (Section 3.1).
4. Execute each completed step in Lean 4 to obtain next states; continue exploring even after a proof-finish state until the budget is used (Section 3.1).
5. At each expansion retain αB branches, normally α=0.25: keep β highest joint-probability branches and randomly sample the remaining αB−β from the rest (Section 3.1).
6. If a distinct path reaches proof finish, reduce the remaining expansion budget by γ=0.9 (Section 3.1).
7. Post-process with de-duplication, BLEU-based decontamination against evaluation data, and rejection sampling that discards invalid Lean transitions; train the policy by supervised fine-tuning on the accumulated corpus (Section 3.1).

Algorithm 1 records each tuple (next state, tactic, premises, parent state), queues valid next states, and stops when the queue is empty or budget is exhausted. The generated transitions contain no ground-truth complete solution; Lean execution supplies validity.

Verus form (Inference): use a Rust/Verus proof state as the node, ask a model for diverse proof statements or tactic-like fragments, compile each with Verus, and retain only candidates that advance the state. Verus has no Lean tactic operators or Lean premises; use actual Verus proof constructs and compiler diagnostics. The diversity and branch-pruning logic transfers, while BLEU decontamination and Mathlib tactic frequency require replacement with Verus corpus statistics.

## technique: adaptive beam size
Tree search scores a child by score(sᵢ₊₁)=log Pθ(tj|si)+score(si) (Equation 1). A too-small beam misses states; a too-large beam can overcommit to one high-scoring subtree. The paper therefore starts wide and narrows with depth: "We adopt a larger beam size at the early stages of tree search; as the search proceeds (i.e., the depth increases), we gradually reduce the beam size." (Section 3.2, p.6).

Apply Equation 2: beam_size = Bmin + (Bmax−Bmin) × max(1−λM,0), where M=e/E, e is the current expansion and E the maximum expansion, and λ controls decay (Section 3.2). Set Bmax, Bmin, and λ per benchmark; the paper uses Bmax=16, Bmin=4, λ=15 for MiniF2F and Bmax=48, Bmin=24, λ=2 for ProofNet (Appendix A.4). This is a search policy, not a proof rule.

Verus form (Inference): maintain a priority queue of candidate Rust proof states scored by model log probability and decay the number of expansions per state. Every retained branch still requires Verus verification; a high score cannot establish correctness.

## evaluation and results
The authors train Qwen2.5-Math-7B for one epoch, batch size 2,048, learning rate 2×10−5, on eight H800 GPUs; BFS-Prover supplies the exploration policy (Section 4.1). They evaluate Pass@1 on MiniF2F-test and ProofNet-test under budget K×B×E, fixing K=1 and E=600 for Table 1. Adaptive beam obtains 60.74% ± 0.88% on MiniF2F-test and 21.18% ± 0.55% on ProofNet-test (Table 1). The ± values are reported run variation; benchmark item denominators are not printed in the table. Fixed beam's best listed values are 59.51% ± 0.79% (MiniF2F, B=8) and 20.75% ± 0.94% (ProofNet, B=32), so adaptive search improves those selected fixed settings by 1.23 and 0.43 percentage points, respectively. Comparisons are under the stated K=1,E=600 budget; imported baseline numbers are marked separately in Table 1.

DoBeVi is the interaction tool: it tracks proof states with globally unique identifiers, decouples sessions for parallel processing, recovers from tactic timeouts and Lean process failures, and visualizes proof-finished, error, and open nodes (Appendix A.3). Each tactic has a 20-second timeout; a timeout restores the saved context by restarting the REPL. If more than 0.5×beam child nodes are incorrect, the current node is discarded early (Appendix A.4). These are engineering safeguards that prevent a hanging or error-prone branch from consuming the global search budget.

## limits, trust, and VL threat
The authors identify limited beam adaptivity, a tactic-based scoring function that ignores long-range path quality, and dependence on the seed distribution: generated data stays near seed problems and may not solve much harder or out-of-distribution targets (Section 6). The two-model attempt that separately generated tactic operators and premises failed because the premise model produced incomplete or grammatically invalid Lean and because tactic frequencies were imbalanced (Appendix A.5); the paper recommends retrieval or lemma-library augmentation instead.

Lean proves each accepted transition, while training and Pass@1 measure model/search behavior. Trusted components include Lean 4 and Mathlib, the policy model, tactic-frequency curation, parser and timeout handling, seed coverage, BLEU decontamination, and benchmark statements. Inference: VL faces a moderate product risk from this approach. State exploration and adaptive budgets can improve proof search throughput, but seed-local synthetic data and score heuristics can miss critical invariants; Verus verification remains necessary at every transition. Existing Lean tree-search systems, replay tools, and synthetic-data pipelines already provide the generic substrate, so VL should adapt their state/diagnostic interfaces rather than rebuild them.

## techniques for the catalog
- diverse proof-state exploration — force curated low-probability tactics, execute them in Lean, and retain valid transitions
- branch pruning with finish signal — keep high-score plus random branches and shorten exploration after distinct proof finishes
- synthetic-data post-processing — deduplicate, decontaminate against benchmarks, and reject invalid transitions
- adaptive beam decay — reduce beam from Bmax to Bmin as expansion depth grows
- resilient verifier interaction — track states, recover timed-out REPL sessions, and prune batches of erroneous children

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
