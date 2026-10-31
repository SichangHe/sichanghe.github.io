# ImProver 2: Iteratively Self-Improving LMs for Neurosymbolic Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2026improver2`, [paper](https://arxiv.org/abs/2605.22885)

## purpose and formal objective

ImProver 2 rewrites an already verified Lean 4 proof into a semantically equivalent proof that scores better under a chosen structural metric. The paper describes candidate selection: “In practice, we approximate this via language model-based Lean 4 code generation: by independently generating multiple variants, we may pick the one with greatest improvement, if it surpasses the original.” (Section 3.2, p. 3)

The paper defines a verifier v(c,x,y) that returns 1 when proof y is syntactically correct and sound for theorem x in context c, and defines the feasible set F(c,x) of accepted proofs (Section 3.1, p. 3). It then seeks the highest-scoring accepted proof, arg max over y with v(c,x,y)=1 of a computable metric μ(c,x,y) (Equation 1, Section 3.2, p. 3). The paper stresses that the metrics are proxies: “These metrics are proxies rather than reviewer-validated measures of subjective proof quality: they support automatic evaluation at scale, but they do not by themselves establish human maintainer preference or downstream theorem-prover utility.” (Section 3.2.1, p. 3).

The three metrics are length, dependency footprint, and modularity. Length is the negative number of tactics. Dependency is the negative number of unique external lemmas explicitly named in the proof, and does not measure hidden facts used by `simp` or `omega` (Section 3.2.1, pp. 3–4). Modularity counts effective spawned goals in a tactic-derived proof tree; heuristics remove trivial goals and wrapper artifacts but leave stylistic judgment (Section 3.2.1, p. 4).

## technique: generate many verified candidate rewrites

What it is. Given a theorem, original proof, context, and target metric, the current model samples n candidate rewrites. Each candidate is formally checked; the best valid improvement can replace the original. Formal correctness is required throughout optimization (Section 3, p. 3).

Steps from Sections 3.2 and 4.2 (pp. 3–6).

1. Keep the theorem statement, context, and verified original proof fixed.
2. Choose one metric and describe its direction (minimize length/dependencies or maximize modularity).
3. Ask the model for n independent proof variants.
4. Compile each variant in the same Lean environment and discard failures.
5. Score compiling variants with the selected metric.
6. Keep a variant only when its score improves over the original.

Inference: In Verus, present a verified Rust function, its contract, and a target proof-quality metric. Sample alternative proof bodies or lemma decompositions, run Verus on each, and retain only proofs that pass with the original contract. This is a transfer of the optimization loop, not a claim made by the paper about Verus.

## technique: neurosymbolic augmentation

What it is. The generator receives three additional views of the formal proof: a context slice, chain-of-states (CoS), and auto-informalization (Section 4.2.1, pp. 5–6). Context serialization collects signatures and documentation for definitions and theorems directly referenced by the theorem statement or original proof. CoS uses Lean InfoTree data to serialize goals before and after each tactic as adjacent comments (Appendix D, p. 20). Auto-informalization asks a language model to describe the proof-state transitions in natural language, while the optimizer is still required to emit formal Lean. Appendix E.4 (p. 22) generates these informal statements and proofs with the base model at iteration 0. The generation prompts also supply illustrative positive and negative examples (Appendix E.3, p. 22).

Steps from Section 4.2.1 (pp. 5–6).

1. Collect directly named definitions and theorems from the statement and original proof; include signatures and documentation comments.
2. Extract Lean InfoTree goals before and after each tactic and serialize them alongside the original proof.
3. Use a language model to explain each tactic's effect and produce a natural-language proof sketch.
4. Provide the original theorem, proof, metric description, context slice, CoS comments, and informal sketch to the optimizer.
5. Compile the generated formal proof; treat the informal sketch as auxiliary input, never as evidence of correctness.

Inference: A Verus scaffold can serialize referenced `spec fn`, contracts, lemmas, loop invariants, and solver diagnostics; a state trace can record proof-state obligations after each proof step; and an informal summary can explain the intended invariant. Verus has different introspection APIs, so the exact extraction is implementation work rather than a paper result. The checker must judge the Rust proof, not the summary.

Evidence. Table 3 reports scaffold effects as mean improvement at best@16. For DeepSeek-R1 7B, length rises from 0.118 without the scaffold to 0.236 with it, modularity from 0.003 to 0.007, and dependency from 0.050 to 0.056. For GPT-5-high, the corresponding values are 0.660 to 0.875, 0.120 to 0.183, and 0.208 to 0.315 (Table 3, p. 11). Each value averages the selected best-of-16 improvement per test problem; it is not an average over the 16 samples or a pass rate.

## technique: replay-buffered iterative preference optimization

What it is. ImProver 2 repeatedly generates data, mixes new and old candidates, forms preference pairs, and trains the next model with Iterative Reasoning Preference Optimization (IRPO). The paper's four-step loop is stated in Section 4.1 (p. 5): generate n candidates per training problem; interleave the prior replay buffer with new data; filter and pair winners and losers; train and evaluate the next model. The loop stops at convergence of mean improvement or exhaustion of compute.

Steps from Sections 4.1 and 4.3 (pp. 5–7), with replay and pairing details from Appendix C (pp. 18–20).

1. At iteration t, sample n candidates per training theorem from model G_t using the scaffold and metric description.
2. Mark problems for replay if a previous iteration produced at least one compiling improvement. Aim for replay proportion ρ: when eligible problems exceed it, remove the easiest first; when below it, replace randomly selected frontier problems with eligible reservoir items as available.
3. For replay-marked problems, either join old and new candidates (deduplicating normalized proof text), replace new candidates with old ones, or keep the new candidates unchanged in mark mode.
4. Remove problems whose compiling-improvement rate exceeds π_max. Winners must compile and score above the dataset-wide γ-th percentile threshold; all other candidates are losers.
5. Deduplicate winners by improvement score and losers by proof text; randomly discard or duplicate candidates to obtain W winners and L losers per problem. Form pairs between winners of unequal scores and between each winner and loser.
6. Train G_t for one epoch with IRPO and obtain G_{t+1}; train on final proof outputs, excluding reasoning traces.
7. Evaluate n samples on the test set, compute improvement over originals, and repeat until convergence or budget exhaustion.

The IRPO loss combines DPO loss over the preference pair with a weighted negative log-likelihood loss on the winner (Equation in Section 4.3.2, p. 7). The replay buffer is intended to avoid self-training collapse and preserve older useful examples (Section 4.3, p. 7).

Inference: For Verus, retain the Rust source, contract, verifier environment, verification result, and metric score with replay candidates. Reverify candidates in the target environment before treating them as winners; preserve older useful examples and compare verified improvements against failures or lower-scoring proofs.

Evidence and limits. Most gains occur in the first two or three iterations: dependency peaks at iteration 2, while length and modularity peak at iteration 3 (Section 5.2.3, p. 10). Later rounds plateau or regress. The paper studies single-step rewriting, not full Codex-style agents (Section 6, p. 13), so an agentic repair loop is an inference and remains unmeasured here.

## technique: distinguish improvement from compilation accuracy

What it is. Mean metric improvement alone can hide a few high-reward successes. The paper reports compilation accuracy A and improved accuracy A^+_μ, the fraction of test problems whose output both compiles and strictly improves the metric (Section 5.2.5, pp. 11–12).

Steps.

1. For each problem, select the best@16 candidate under the evaluation metric.
2. Record whether it compiles and whether it strictly improves the original.
3. Report the fraction of test problems with compiling selections as A, and with compiling, improving selections as A^+_μ; display the pair as A^+_μ/A, not a division.
4. Interpret A as compilation stability and A^+_μ as optimization success (Section 5.2.5 and Tables 4–5, pp. 11–12).

Evidence. For dependency minimization, the base model has compilation accuracy 0.754 and improved accuracy 0.037; after ImProver 2, these are 0.368 and 0.069 (Table 4, p. 12). Iteration 2 reaches improved accuracy 0.106 with compilation accuracy 0.464 (Table 5, p. 12). The paper interprets this as a trade-off: larger edits can improve more when they succeed but fail compilation more often (Section 5.2.5, p. 12). These are the printed Table 4 values; its ImProver 2 row matches iteration 4 for length/modularity and iteration 3 for dependency in Table 5, whereas Section 5.2.3 selects iterations 3 and 2 respectively. Inference: the paper does not consistently identify which checkpoints its accuracy summary represents. Section 5.1 also describes improved accuracy as a percentage of compiling theorems, whereas Section 5.2.5 explicitly uses all test problems; this study follows the latter definition.

## results and product implications

The trained 7B model improves its base model on all three objectives: length 0.118 to 0.330, modularity 0.003 to 0.143, and dependency 0.050 to 0.206 (Section 5.2, p. 8). It exceeds the 671B DeepSeek baseline on all three, including modularity 0.143 versus 0.055 and dependency 0.206 versus 0.153 (Section 5.2.1, pp. 8–9). These are mean improvements under the paper's best@16 evaluation, not theorem-proving completion percentages. The model leads evaluated unscaffolded systems on modularity, is described by the authors as effectively tied with GPT-5-high on dependency (0.206 vs. 0.208), and matches GPT-5-mini on length while trailing GPT-5-high and the prior ImProver system on length (Sections 5.2–5.2.2, pp. 8–10). With the same scaffold, several frontier systems outperform ImProver 2; for example, GPT-oss-120B reaches 0.508 on length and 0.406 on dependency (Table 3, p. 11).

Correctness and limits. Lean kernel/type checking supplies the formal correctness check (Section 3.1, p. 3). Inference: assessing the reported optimization gains also requires trusting the metric implementation, proof-tree extraction, sampling, and training pipeline; informalizations are inputs, not correctness certificates. The authors do not run a maintainer-preference study and leave downstream prover effects to future work (Section 6, p. 13). Inference: In Verus, a passing proof still relies on Verus, solver behavior, imported specifications, compiler integration, and the correctness of the chosen contract; optimization metrics cannot establish product correctness.

Already done. ImProver 2 already combines candidate generation, formal verification filtering, context retrieval, proof-state traces, auto-informalization, preference optimization, replay buffers, separately targeted structural metrics, and accuracy/improvement reporting.

## techniques for the catalog

- verified candidate rewriting: sample many proof variants, compile each, and keep only metric-improving valid proofs
- context-slice augmentation: expose directly referenced definitions, theorem signatures, and documentation to the generator
- chain-of-states prompting: serialize intermediate proof goals after each tactic to reveal formal structure
- auto-informalization: provide a natural-language proof-state sketch as auxiliary input while judging formal output
- replay-buffer IRPO: mix old and new candidates, form winner–winner and winner–loser pairs, and train iteratively
- dual accuracy reporting: separate compilation accuracy from the fraction of outputs that compile and improve the metric
- structural proof metrics: score tactic length, explicit dependencies, and effective spawned subgoals with stated proxy limits
