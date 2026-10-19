# REAL-Prover: Retrieval Augmented Lean Prover for Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `shen2025real`, [paper](https://arxiv.org/abs/2505.20613v3)

## what is proved or measured
REAL-Prover is a Lean 4, retrieval-augmented, stepwise prover. Its paper describes three coupled components: HERALD-AF generates formal statements; Jixia-Interactive applies tactics and returns proof states; LeanSearch-PS retrieves Mathlib premises. The authors state, “Each model invocation is conditioned on the current proof state and enhanced through the retrieval of semantically relevant theorems from Mathlib.” (Introduction, p.3). Their claimed measurements are benchmark pass rates, not a theorem about the neural model.

## technique 1: consistency-filtered auto-formalization (HERALD-AF)
what it is: a pipeline that turns informal mathematics into candidate Lean statements and filters semantic mismatches.

how to apply it:
1. use regular expressions to extract theorem blocks and exercises, then use an LLM to generate and refine informal statements (Section 2.1, p.5)
2. run Herald-translator to generate multiple formal Lean candidates (Section 2.1)
3. translate each candidate back to natural language with DeepSeek-V3 (Section 2.1)
4. have a general LLM judge whether the back-translation faithfully reflects the original; retain only passing candidates (Section 2.1)

The paper’s complete statement is: “This translation pipeline comprises three key stages: Auto-Formalization, Auto-Informalization, and LLM Judgement.” (Section 2.1, p.5). The filter makes a training corpus of formal statements, but the paper does not report its acceptance denominator or error rate.

Verus form: Inference: use the same round-trip idea for a Rust/Verus contract: generate a candidate `requires`/`ensures` specification, render it into plain language, and require a reviewer or checker to compare the rendering with the requirement before proof search. Verus can then check the retained contract, but semantic agreement between prose and contract remains outside Verus. Do not treat LLM judgment as proof.

## technique 2: interactive best-first tactic search
what it is: a search tree whose nodes are Lean proof states and whose edges are candidate tactics checked immediately by Lean.

how to apply it:
1. initialize a proof state in Jixia-Interactive for each formal statement (Section 2.2, p.5)
2. ask the LLM for multiple candidate tactics at the current node
3. apply each tactic in Jixia-Interactive; discard invalid tactics and retain resulting states (Section 2.2)
4. score a path by the paper’s length-normalized log probability, `sum_t log p(a_t|s_t) / L^alpha`, where `L` is path length and `alpha` is in [0,1] (Section 2.2, p.6)
5. expand the highest-scoring node; stop on a proof with no goals or when the search budget is exhausted, then reconstruct the tactic path (Section 2.2)

The paper says, “We adopt a best-first search strategy, selecting the node with the highest score to expand further by generating new tactics.” (Section 2.2, p.6). At inference it uses 64 passes, 64 samples per step, temperature 1.5, and `alpha = 0.5` (Section 3.1, p.8).

Verus form: Inference: use an external search controller to generate alternative Rust/Verus proof candidates and run Verus on each candidate. Retain successful candidates and use diagnostics to guide further attempts. This adapts the search idea; the paper does not establish a Verus interface equivalent to Lean's interactive proof states. Verify the complete final artifact.

## technique 3: semantic premise retrieval with hard negatives (LeanSearch-PS)
what it is: dense retrieval maps a proof state and Mathlib theorem into one vector space, then supplies nearest theorems to the tactic model.

how to apply it:
1. extract `(s, t_pos)` pairs with Jixia, where `s` is a proof state and `t_pos` is the theorem successfully applied there (Section 2.2.1, p.7)
2. train an embedding model with InfoNCE: the positive theorem competes against in-batch negatives
3. embed all statements and theorems with the initial model; for each query select a hard negative randomly from ranks 30–100 (Section 3.1, p.8)
4. train a second time on `(s, t_pos, t_hard_neg)` triples; at proving time nearest-neighbor retrieve top-k theorems and put them in the LLM prompt (Sections 2.2.1 and 3.1)

The paper states, “These selected premises are then supplied as context to our language model, helping it produce more effective and accurate proof steps.” (Section 2.2.1, p.7). The training used E5-mistral-7b-instruct, LoRA, learning rate `2 × 10^-5`, batch 128, and one epoch (Section 3.1, p.8).

Verus form: Inference: build a retrieval index over Verus lemmas, specification definitions, and verified proof snippets. Retrieve using verification diagnostics and available program context, then insert candidate names and signatures into the generation prompt. Recheck the resulting proof with Verus; retrieval alone establishes no proof.

## technique 4: expert iteration for state–tactic data
what it is: repeatedly use the current prover to solve formal statements, add verified traces to supervised data, and fine-tune a stronger prover.

how to apply it:
1. fine-tune an initial model on open datasets
2. run it inside REAL-Prover on HERALD-AF statements
3. keep generated state–tactic traces whose proofs pass Lean
4. add them to the SFT corpus, fine-tune, and repeat on harder statements (Section 2.2.2, p.7)

The resulting corpus has 210,420 state–tactic pairs: 25,818 and 30,589 from two expert-iteration sources, 18,669 human-annotated, 92,152 Mathlib, and 43,192 augmented Lean-Workbook pairs (Section 3.1, p.8). The contribution list separately says, “We release a comprehensive dataset consisting of 55k state–tactic pairs generated through our expert iteration process.” (Section 1.2, p.4). Inference: 55k describes the released expert-iteration subset rather than the full mixture, but it does not exactly match the 56,407 expert-iteration pairs listed in Section 3.1; the paper does not explain that difference.

Verus form: Inference: collect `(verification_state, generated_step)` traces only after Verus checks the resulting function or lemma. Re-train on proof states plus diagnostics, but preserve independent re-verification because accepted traces still inherit the specification and tool assumptions.

## evidence, limits, and product threat
On ProofNet Test, REAL-Prover scores 23.7% at 64×64 sampling (Table 1, p.11), versus 22.6% in the ablation without retrieval (Table 4, p.12). On FATE-M Test it scores 56.7% at 64×64, versus 44.7% without retrieval (Tables 2 and 4, pp.11–12). On MiniF2F Test it scores 54.1%, below several larger-budget systems (Table 3, p.12). Section 3.2 (p.9) gives the respective benchmark sizes as 186 test problems, 141 problems, and 244 test problems. The ablation changes both training prompts and inference: “we trained a prover model, REAL-Prover-v1-NoRet, which used the same dataset but without retrieval information.” (Section 4.4, p.12); it also disables LeanSearch-PS for that model. Inference: this comparison measures the combined effect of retrieval during training and inference, not an inference-only intervention. The authors offer two possible explanations for the MiniF2F performance gap: Olympiad problems rely less on Mathlib, and the model lacks reinforcement learning (Section 4.3, p.11). The paper’s conclusion says, “Despite these promising results, several limitations remain.” (Section 5, p.13), then names absent RL and absent informal chain-of-thought planning. Section 3.2 (p.9) describes FATE-M as undergraduate-level, although the introduction (p.3) describes graduate-level reasoning.

What is checked: Jixia-Interactive applies candidate tactics and discards invalid ones (Section 2.2, p.5). Appendix A (p.19) states, “This final term is then type-checked by the kernel to ensure correctness.” For FATE-M specifically, Section 3.2 (p.9) states, “Additionally, Lean-checked proofs are provided for all statements to guarantee their correctness.” Inference: formal checking does not establish that an informal requirement was translated correctly; translation fidelity still needs separate assessment. Retrieval ranking and search scoring affect which proof candidates are explored. Inference: for agent-written verified Rust, specification mismatch and search cost remain concerns even when every final artifact passes Verus. Inference: VL could reuse the paper's retrieval, tree search, automatic statement generation, and verified-trace collection patterns; their effectiveness for Verus remains untested here.

## techniques for the catalog
- consistency-filtered auto-formalization — generate formal statements, back-translate them, and retain only candidates judged faithful
- interactive best-first tactic search — sample tactics, verify each in an interactive prover, and expand the highest-scoring state
- hard-negative premise retrieval — train a dense state-to-theorem retriever first with in-batch negatives and then mined near-miss premises
- expert iteration — add prover-generated, verifier-checked state–tactic traces to successive supervised-training rounds

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each formalized statement was rigorously verified by Mathlib contributors and PhD students in algebra to ensure it accurately represents the original mathematical meaning."): checked all paper text, quotations, numbers, section and page references, and technique steps; changed the link to the paper's arXiv identifier, clarified the retrieval ablation and dataset-count discrepancy, qualified the benchmark description, corrected the scope of formal checking, and removed unsupported Verus syntax claims; did not reproduce experiments, inspect code or datasets, or validate the proposed Verus adaptations.
