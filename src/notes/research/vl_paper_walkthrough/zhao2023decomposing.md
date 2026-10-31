# Decomposing the Enigma: Subgoal-based Demonstration Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zhao2023decomposing`, [paper](https://arxiv.org/abs/2305.16366v1)

## what is measured

Zhao, Li, and Kong study demonstration formatting and organization for LLM-generated formal sketches in Isabelle. Their two components are subgoal-based proofs and diffusion-based demonstration organization. The abstract reports: “Through the integration of subgoal-based learning methodologies, we have successfully increased the prevailing proof accuracy from 38.9% to 44.3% on the miniF2F benchmark.” It then reports 45.5% with diffusion (Abstract, p. 1). Table 2 distinguishes the ChatGPT baseline without either component, 38.5%, from DSP with 540B Minerva, 38.9% in Table 1 (p. 6).

The dataset has 488 problems, divided into 244 validation and 244 test problems (Section 3.2, p. 5). Table 1 reports test pass rates of 10.4% for Sledgehammer, 20.9% with heuristics, 29.9% for Thor, 35.2% for Thor with expert iteration, 38.9% for DSP, and 45.5% for the full method (p. 6). These are Isabelle miniF2F results. The authors use ChatGPT, specifically `gpt-3.5-turbo-0301`, with temperature 0 and `max_tokens` 1024 for formal-sketch generation (Section 3.4 and footnote 2, pp. 5–6).

Validation-set results require a separate interpretation: “This involves integrating the pass rates from both the data collection stage for training and the inference stage.” The full method's 48.0% validation result is cumulative because successful miniF2F-valid organizations train the diffusion model; test results and results without diffusion use ordinary pass rates (Section 3.2, p. 5; Tables 1–2, p. 6).

## technique: replace informal proofs with verifier-aligned subgoals

The authors define their intended subgoal condition: “Following Zhang et al. [49], we seek to obtain a valid sequence of subgoals which satisfies the condition that each subgoal in this sequence should be reachable from both the initial state (i.e., the statement) and the final state (i.e., the passing state of the proof).” (Section 2.1, p. 3)

The refinement starts with manually written subgoal-based proofs derived from informal proofs and statements. For each iteration and example, Algorithm 1 extracts the statement and formal sketch, generates subgoals using the previous iteration's demonstrations, calls `Refine`, and composes the refined subgoals with the statement and formal sketch for the next iteration. Algorithm 2 recursively processes adjacent subgoals through `Verify_and_correct` (Appendix A, p. 13). The appendix describes what correction means: “Afterward, a Refine module is called to confirm the validity of the created subgoals and adjust any subgoals identified as infeasible.”

Figures 5–12 show the operational check: ask ChatGPT to reconstruct the proof for a described step, check it with Isabelle, and split unsuccessful steps into finer subgoals. For example, Figure 6 splits the original first step into three steps; the second of those fails reconstruction and is split again (Appendix A, pp. 13–22). Inference: this is an executable reconstruction test for a described step, rather than an independent mathematical test of the abstract reachability condition.

Evidence: Table 2 reports test pass rates of 38.5% without either component, 40.6% without subgoals, 44.3% without diffusion, and 45.5% with both (p. 6). Section 4.2 states: “This trend remains consistent across all LLM call numbers, suggesting a noteworthy positive effect of subgoal-based proof on the overall performance of our method.” (p. 7)

Verus form (Inference): Try decomposing a target proof into intermediate assertions or lemmas. Ask the model to reconstruct the proof for each described step, run Verus, and split failed steps into smaller ones. Keep the original function contract fixed. This is a proposed adaptation; the paper does not evaluate Verus.

## technique: iterative LLM plus proof-assistant refinement

The authors describe the loop as follows: “To address this problem, we iteratively refine the subgoal proof, in the spirit of self-play in reinforcement learning [39], making calls to both the LLM and the off-the-shelf automated theorem prover.” They randomly select previous-iteration examples as context for generating subgoals (Section 2.1, p. 3). They use 15 refinement iterations and 61 demonstration examples (Section 3.4, p. 6).

Verus form (Inference): Build a demonstration pool by repeatedly generating, checking, and repairing proof steps. Retain successful proof examples for the next iteration and record the verifier version and unchanged contract. The paper's 15 iterations and 61 examples are experimental settings, not established requirements for Rust.

## technique: jointly select and order demonstrations with diffusion

The context constraint motivates organization: “If we assume a maximum context length of 3072 tokens, only 4.79 examples on average can be included.” The graph represents demonstrations as nodes: “A traverse following the path corresponds to the selection and the ordering of the in-context examples.” The authors formulate organization as a (Sub)hamiltonian graph problem and condition a discrete diffusion model on the theorem statement, using a GNN for encoding and denoising (Section 2.2, pp. 3–4).

Training proceeds by randomly selecting and ordering demonstrations, querying the LLM, and keeping organizations that yield successful proofs. The authors collect 137 successful proofs for 116 distinct miniF2F-valid statements and divide the corresponding contexts into 81 training and 56 validation instances. They use 80 diffusion steps, learning rate 5e-4, batch size 16, 50 epochs, early stopping, and report performance averaged over three runs (Section 3.4, p. 6).

The implemented sampling procedure differs from simply decoding an arbitrary graph sample. Appendix B.3 identifies cycles and disconnected subgraphs as problems, then states: “Taking a cue from treating diffusion models as discriminative approaches [23], we start by randomly creating 200 potential solutions.” The diffusion model scores those candidates using conditional density estimates; the highest-scoring organization supplies examples in sequence until the LLM context limit (Appendix B.3, p. 23). The GNN combines ada embeddings of the statement and each demonstration; it has three layers and hidden dimension 256, and runs on an NVIDIA RTX 3090 (Appendix B.2–B.4, pp. 23–24).

Evidence: “Notably, with demonstration reorganization, our method exhibits an impressive capability of successfully deriving proofs for 94 problems (equivalently, a pass rate of 38.5%), with a mere 20 LLM calls.” The authors compare this with DSP using five times as many calls for a comparable result (Section 4.3, p. 7). Table 1 gives DSP's test rate as 38.9% (p. 6). Section 4.3 reports diminishing diffusion gains as calls approach 100 and offers this explanation: “Consequently, it may encounter difficulties in discerning the optimal organization for data that deviates significantly from its training dataset.”

Verus form (Inference): Treat verified proof examples as candidates for a limited prompt. Measure whether selecting their subset and order improves successful verification per model call. A learned scoring policy, including diffusion, would need training and evaluation on Rust proofs before claiming a benefit.

## technique: use a certified reconstruction backend

The paper separates model generation from formal acceptance. Sledgehammer sends translated goals to automated provers and reconstructs successful results inside Isabelle/HOL using certified provers: “In the event that any of these automated theorem provers successfully derives the proof in their respective formats, Sledgehammer undertakes the task of reconstructing the proof within the Isabelle/HOL framework using certified provers, namely metis, meson, and smt.” (Section 3.1, p. 4)

Acceptance also excludes admissions: “The validity of a formal sketch depends on two criteria: first, the absence of ‘cheating’ keywords such as ‘sorry’ and ‘oops’ that prematurely terminate a proof prior to its completion; second, the capacity of the interactive theorem prover Isabelle to authenticate the corresponding formal statement with the proof.” (Section 3.2, p. 5; quotation marks normalized)

Verus form (Inference): Require a successful verifier run for the original contract, with a prerequisite check for proof admissions. Keep the model's explanations as guidance; accept the proof based on the verifier result. This proposed workflow does not establish that Verus has Isabelle's reconstruction architecture.

## technique: ablate each component and measure call efficiency

Table 2 removes subgoals, diffusion, and both; Figure 2 plots solved problems against model calls (pp. 6–7). Inference: reuse these two comparisons to distinguish proof-decomposition benefits from demonstration-organization benefits and to measure model-call cost. The reported five-fold improvement concerns calls for a comparable pass rate, not measured end-to-end runtime or total compute.

## techniques for the catalog

- Inference: verifier-aligned subgoal proofs — split proof steps until the model can reconstruct them and the assistant accepts them
- Inference: iterative checker feedback — reuse refined demonstrations across generation and verification iterations
- Inference: diffusion demonstration organization — score candidate subsets and orders under a context budget
- Inference: certified reconstruction and prerequisite check — authenticate sketches and exclude proof admissions
- Inference: component ablation and call accounting — compare pass rates and model-call budgets separately
