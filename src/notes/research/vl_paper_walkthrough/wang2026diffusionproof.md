# Diffusion-Proof: Recipe for Formal Theorem Proving Beyond Auto-Regressive Generation
(authored by agents unless marked 🧑)
Tag: `wang2026diffusionproof`, [paper](https://doi.org/10.48550/arxiv.2606.19315)

## what the paper establishes
Diffusion-Proof trains two block-diffusion language models for Lean4 theorem proving: dLLM-Prover-7B writes complete proofs, and dLLM-Corrector-7B repairs a local failed subgoal by filling a large masked block with both prefix and suffix context. The abstract describes the goal as a “novel large block diffusion-based correction model” and reports absolute gains of 1.61 percentage points on ProofNet-Test and 6.14 points on MiniF2F-Test over an autoregressive (AR) model trained on the same 300k examples.

The method starts from 5,595,798 proof records, cleans and samples 300,000 for prover SFT, and derives 128,000 correction records (Sections 2.2–2.3, pp.3–4). Training uses 4 H100 GPUs, global batch size 64, context length 2,048, learning rate 1e-5 for the prover and 5e-6 for the corrector, and about one day per model (Section 3.2, p.5; Appendix B, p.12). MiniF2F-Test has 244 problems and ProofNet-Test 186 (Section 3.1.1, p.5). Under pass@32, Diffusion-Proof proves 50.00% of MiniF2F (122/244) and 7.53% of ProofNet (14/186), versus 43.85% (107/244) and 5.91% (11/186) for Qwen-2.5-Lean-SFT-7B (Table 1, p.6). The displayed “improvement” percentages in Table 1 are 6.14% and 1.61%, which are percentage-point differences; they are not relative percentage gains.

Inference: the paper's Lean checks make each accepted proof mechanically valid for its theorem statement, but the system does not verify that the theorem statement captures a user's intended property. Inference: adapting the recipe to Verus would require a block diffusion model trained on Rust/Verus syntax and verifier feedback, not merely substituting the word “Verus” for “Lean”.

## technique: prepare structured prover and corrector data
What it is: normalize a heterogeneous proof corpus into formal-language statements, natural-language statements, and formal proofs, then make two datasets. The authors use rule-based extraction because prior records lacked a clear separation of FL statements, NL statements, and FL proofs (Section 2.2, p.3). Prover data are code-completion examples with an approximate 1:2 ratio of pure Lean proofs to records with NL annotations/comments. Corrector data come only from proofs with top-level `have` subgoal decompositions.

How to apply it:
1. Collect proof records from prior datasets.
2. Rule-parse each record into NL statement, FL theorem statement, and FL proof (Section 2.2).
3. Sample 300k records for prover SFT, preserving the pure/formatted ratio.
4. Find top-level `have` statements; treat each as a subgoal and its proof as a correction target.
5. Partition the top-level subgoal proof into 256-token blocks and replace one block with `<|fim_middle|>`; create 128k corrector records.
6. For a multi-subgoal theorem, mask one block at a time (Section 2.2, p.3).

The paper's example has `have h1`, `have h2`, `have h3`, and `have h4` statements, each followed by a proof; this supplies explicit correction boundaries (Figure 2, p.3). The paper states, “The data trains the model to fill placeholder token when a block of proof is finished.” (Section 2.2, p.3).

Verus form: Inference: construct analogous records from Verus `requires`/`ensures`, `spec fn` predicates, `proof fn` blocks, `assert` chains, and loop invariants. A corrector example could replace one failing proof block with a mask while preserving the Rust function, contract, and neighboring proof text. The paper's Lean `have` decomposition does not carry over automatically; Verus proofs can be organized differently and must be checked by Verus after filling.

Evidence and limits: the data counts are stated by the paper, but no ablation isolates the effect of the 1:2 ratio or rule-based parser. Inference: malformed decomposition or an incorrect “top-level” boundary could teach the corrector to repair the wrong scope.

## technique: train a block-diffusion whole-proof prover
What it is: a diffusion language model predicts masked token blocks iteratively rather than committing left-to-right one token at a time. A sequence is split into blocks of size `B`; attention is bidirectional within a block and causal across blocks (Section 2.1, p.3). During training, tokens are independently masked with probability `t`, and the model predicts the original tokens at masked positions. The prover uses block size 32, Fast-dLLM-V2-7B as its base, code-completion formatting, and curriculum sorting by increasing proof length (Section 2.3, p.4).

How to apply it:
1. Present the natural-language and Lean4 theorem statement as the input.
2. Fine-tune the base dLLM on the 300k SFT records, keeping block size 32.
3. Sort training examples by proof length so short proofs precede longer proofs (Section 2.3).
4. At inference, iteratively decode one block at a time until the stopping condition is reached (Section 2.1).
5. Submit the complete proof to Lean; retain it only if Lean verifies it.

The paper says, “During inference, the dLLM-Prover-7B firstly generates proofs based on the theorem statement.” (Section 2.4, p.4). It attributes gains to iterative refinement, long-range coherence, and bidirectional information, but validation loss alone does not establish which mechanism causes the gain.

Verus form: Inference: feed a Verus function signature, contracts, and Rust body to a block-diffusion generator; use generated `spec fn`, `requires`, `ensures`, `proof fn`, and `assert` blocks as candidate text. Run Verus after each complete generation. The model's diffusion schedule is external to Verus; Verus remains the acceptance checker. Do not use an unverified `external_body` to bypass a generated obligation.

Evidence: on MiniF2F-Test, the prover plus corrector gets 122/244, and on ProofNet-Test 14/186 (Table 1, p.6). A prover-only ablation reaches 48.36% on MiniF2F, compared with 50.00% for the two-model pipeline (Table 4, Appendix C.3, p.13). The longest 25% MiniF2F subset is 5/54 (9.26%) versus 4/54 (7.41%) for the AR baseline; the longest 50% is 26/108 (24.07%) versus 20/108 (18.52%) (Table 3, Appendix C.2, p.12). Inference: these denominators and pass@32 settings support an advantage on longer proofs in this experiment, not a universal advantage over AR systems.

## technique: train large-block local correction
What it is: when the initial proof has a correct top-level skeleton but a failed subgoal proof, replace the offending proof with a 256-token mask. dLLM-Corrector-7B fills it using a 512-token diffusion block that can attend to both the preceding and following proof context. Corrector training increases the block size from 32 to 512 and applies loss to both the subgoal proof and placeholder tokens (Section 2.3, p.4). Inference uses temperature 1.2 and raises one-token denoising confidence to 0.95 (Section 2.4, p.4).

The decision gate is explicit: “If the initial proof by the prover fails the Lean verification but all the top-level subgoal statements and their usages are correct, we perform a large-block correction using the corrector.” (Section 2.4, p.4). The correction steps are:
1. Run the prover and Lean verification.
2. Check that the skeleton and subgoal statements/usages are correct.
3. Delete the proof text for the failing subgoal.
4. Insert a 256-token `<|MASK|>` region.
5. Ask the corrector to fill with its 512-token block and placeholder tokens where needed.
6. Re-run Lean; accept only a verified proof.
7. Repeat up to five correction rounds for a theorem valid for correction (Appendix G, p.12).

Verus form: Inference: identify a failing Verus `proof fn`, assertion chain, or loop-invariant subproof while preserving the function's contract and executable code; mask only that region; use suffix context such as later assertions and `ensures` obligations; run Verus after each fill. A Verus correction system must distinguish a syntax/type failure from a false contract or missing invariant, because a local fill cannot repair an unsatisfied specification without changing the skeleton.

Evidence: the corrector contributes 4 of 122 solved MiniF2F problems, a 1.64-point improvement (Section 3.5, p.7). It adds no ProofNet theorem because that dataset emphasizes advanced knowledge rather than subgoal decomposition (Section 3.5, p.7). The complete pipeline reaches 50.00%; a unified corrector-only model reaches 40.98%, and the prover-only model 48.36% (Table 4, Appendix C.3, p.13). Inference: separating global proof writing from local correction is supported by this ablation, while the corrector's value is workload-dependent.

## technique: use verifier feedback and bidirectional context as a repair loop
The paper's correction loop treats Lean as the executable oracle: model output is generated, Lean reports failure, and only structurally eligible failures enter correction. Case studies show the corrector replacing incorrect `linarith`/`rw` uses with `omega`, and completing an internal `have` decomposition in a single large block (Section 3.6.1, pp.7–8). A separate case solves `imo_1962_p2` that DeepSeek-Prover-V2-7B failed under pass@32 with Long CoT (Appendix C.2, p.12). The paper's error analysis also finds seven failed proofs: four from overconfident arithmetic tactics, one from invalid tactic combinations, and two from insufficient proof length or decomposition (Appendix D, p.13).

Inference: for VL, the same loop should classify Verus diagnostics before choosing a repair scope. Syntax or type errors can be filled locally; a missing `requires`, wrong `ensures`, or representation invariant may require regeneration of the contract and proof together. The acceptance evidence must be Verus verification, with tests as supplementary evidence. Inference: a reward that counts only compilation could be gamed by weakening contracts; a verifier-backed loop should preserve an independently reviewed specification.

## what is proved, measured, and trusted
The paper measures pass@32 on two Lean benchmarks, correction ablations, proof-length subsets, validation losses, and training/inference costs. It explicitly compares only a same-dataset 7B AR SFT baseline for its controlled claim; Table 2 is not controlled because competing systems use different data scales, RL, search, and Long CoT. It reports 96 H100 GPU-hours for each prover/baseline training, 48 additional H100-hours for the corrector, about 16 hours for the full evaluation pipeline, and about 24 hours for the AR baseline without vLLM (Appendix B, p.12). Trusted components include Lean's kernel, theorem statements, benchmark formalizations, dataset preprocessing, base model, and the pass@32 sampling procedure. Inference: Verus adds its verifier, SMT solver, Rust compiler, and any modeled external behavior to that trust boundary.

## threat to VL and work already done
Inference: the residual risk for VL-generated verified Rust is substantial but bounded. Diffusion's bidirectional repair could reduce long proof drift and make local proof repair more effective, but a Lean proof generator is not a Verus Rust generator, and the paper's 50.00% MiniF2F result leaves half the benchmark unsolved. The paper already covers block-diffusion whole-proof writing, 256/512-token large-block correction, proof-length curriculum, subgoal decomposition, pass@32 correction rounds, and verifier-gated repair. VL should not redo these as generic LLM ideas. A novel VL study would measure whether Verus diagnostic classes, contract-preserving masks, and Rust-specific bidirectional context improve verified-function completion without weakening specifications.

## techniques for the catalog
- structured proof-corpus preparation — normalize NL, formal statements, proofs, and explicit subgoals into separate training records
- block-diffusion prover — generate complete formal proofs by iterative multi-token denoising with within-block bidirectional attention
- large-block corrector — replace one failed subgoal with a mask and fill it from both prefix and suffix context
- verifier-gated repair loop — invoke correction only after the checker confirms a repairable skeleton failure and re-check every fill
- proof-length curriculum — sort training examples by proof length to stabilize whole-proof model training
Checked 2026-10-15 against paper wang2026diffusionproof: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
