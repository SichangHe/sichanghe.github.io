# ImProver 2: Iteratively Self-Improving LMs for Neurosymbolic Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2026improver2`, [paper](https://doi.org/10.48550/arXiv.2210.12283)

## purpose and formal objective

ImProver 2 rewrites an already verified Lean 4 proof into a semantically equivalent proof that scores better under a chosen structural metric. The paper states: “We define a verifier as a computable function.” (Section 3.1, p. 3)

The paper defines a verifier v(c,x,y) that returns 1 when proof y is syntactically correct and sound for theorem x in context c, and defines the feasible set F(c,x) of accepted proofs (Section 3.1, p. 3). It then seeks the highest-scoring accepted proof, arg max over y with v(c,x,y)=1 of a computable metric μ(c,x,y) (Equation 1, Section 3.2, p. 3). The paper stresses that the metrics are proxies: “These metrics are proxies rather than reviewer-validated measures of subjective proof quality.” (Section 3.2.1, p. 3).

The three metrics are length, dependency footprint, and modularity. Length is the negative number of tactics. Dependency is the negative number of unique external lemmas explicitly named in the proof, and does not measure hidden facts used by `simp` or `omega` (Section 3.2.1, pp. 3–4). Modularity counts effective spawned goals in a tactic-derived proof tree; heuristics remove trivial goals and wrapper artifacts but leave stylistic judgment (Section 3.2.1, p. 4).

## technique: generate many verified candidate rewrites

What it is. Given a theorem, original proof, context, and target metric, the current model samples n candidate rewrites. Each candidate is formally checked; the best valid improvement can replace the original. The paper's central promise is: “Given a verified proof, a proof optimization agent synthesizes a semantically equivalent proof that is ‘better’ under a user-specified objective while remaining correct according to the Lean kernel.” (Section 3, p. 3).

Steps from Sections 3.2 and 4.2 (pp. 3–6).

1. Keep the theorem statement, context, and verified original proof fixed.
2. Choose one metric and describe its direction (minimize length/dependencies or maximize modularity).
3. Ask the model for n independent proof variants.
4. Compile each variant in the same Lean environment and discard failures.
5. Score compiling variants with the selected metric.
6. Keep a variant only when its score improves over the original.

Inference: In Verus, present a verified Rust function, its contract, and a target proof-quality metric. Sample alternative proof bodies or lemma decompositions, run Verus on each, and retain only proofs that pass with the original contract. Verus proof functions and specifications must remain in Verus-supported syntax; runtime code cannot call a proof function for optimization metadata. This is a transfer of the optimization loop, not a claim made by the paper about Verus.

## technique: neurosymbolic augmentation

What it is. The generator receives three additional views of the formal proof: a context slice, chain-of-states (CoS), and auto-informalization (Section 4.2.1, pp. 5–6). Context serialization collects signatures and documentation for definitions and theorems directly referenced by the theorem statement or original proof. CoS uses Lean InfoTree data to interleave each tactic with the resulting goals. Auto-informalization asks a language model to describe the proof-state transitions in natural language, while the optimizer is still required to emit formal Lean.

Steps from Section 4.2.1 (pp. 5–6).

1. Collect directly named definitions and theorems from the statement and original proof; include signatures and documentation comments.
2. Extract Lean InfoTree states after each tactic and serialize remaining goals alongside the original proof.
3. Use a language model to explain each tactic's effect and produce a natural-language proof sketch.
4. Provide the original theorem, proof, metric description, context slice, CoS comments, and informal sketch to the optimizer.
5. Compile the generated formal proof; treat the informal sketch as auxiliary input, never as evidence of correctness.

Inference: A Verus scaffold can serialize referenced `spec fn`, contracts, lemmas, loop invariants, and solver diagnostics; a state trace can record proof-state obligations after each proof step; and an informal summary can explain the intended invariant. Verus has different introspection APIs, so the exact extraction is implementation work rather than a paper result. The checker must judge the Rust proof, not the summary.

Evidence. Table 3 reports scaffold effects as mean improvement at best@16. For DeepSeek-R1 7B, length rises from 0.118 without the scaffold to 0.236 with it, modularity from 0.003 to 0.007, and dependency from 0.050 to 0.056. For GPT-5-high, the corresponding values are 0.660 to 0.875, 0.120 to 0.183, and 0.208 to 0.315 (Table 3, p. 11). These denominators are mean improvements over 16 samples, not pass rates.

## technique: replay-buffered iterative preference optimization

What it is. ImProver 2 repeatedly generates data, mixes new and old candidates, forms preference pairs, and trains the next model with Iterative Reasoning Preference Optimization (IRPO). The paper's four-step loop is stated in Section 4.1 (p. 5): generate n candidates per training problem; interleave the prior replay buffer with new data; filter and pair winners and losers; train and evaluate the next model. The loop stops at convergence of mean improvement or exhaustion of compute.

Steps from Section 4.1 and Section 4.3.1 (pp. 5–7).

1. At iteration t, sample n candidates per training theorem from model G_t using the scaffold and metric description.
2. Interleave the new dataset with the previous iteration's replay buffer.
3. Remove trivially easy problems and partition candidates into winners (compiling with high improvement) and losers (all others).
4. Build winner–winner pairs ordered by metric improvement and winner–loser pairs preferring valid improving proofs over failures.
5. Train G_t for one epoch with IRPO and obtain G_{t+1}.
6. Evaluate n samples on the test set, compute improvement over originals, and repeat until convergence or budget exhaustion.

The IRPO loss combines DPO loss over the preference pair with a weighted negative log-likelihood loss on the winner (Equation in Section 4.3.2, p. 7). The replay buffer is intended to avoid self-training collapse and preserve older useful examples (Section 4.3, p. 7).

Inference: For Verus, a replay item should include the exact Rust source, contract, verifier version, dependency lockfile, compiler output, and metric score. A winner must pass a fresh verification; a loser includes compile failures and valid-but-no-improvement proofs. Pairing should prefer verified improvements over failures and preserve examples from previous iterations. The Verus solver version and crate environment must be pinned because proof validity is context-dependent.

Evidence and limits. Most gains occur in the first two or three iterations: dependency peaks at iteration 2, while length and modularity peak at iteration 3 (Section 5.2.3, p. 10). Later rounds plateau or regress. The paper studies single-step rewriting, not full Codex-style agents (Section 6, p. 13), so an agentic repair loop is an inference and remains unmeasured here.

## technique: distinguish improvement from compilation accuracy

What it is. Mean metric improvement alone can hide a few high-reward successes. The paper reports compilation accuracy A and improved accuracy A^+_μ, the fraction of test problems whose output both compiles and strictly improves the metric (Section 5.2.5, pp. 11–12).

Steps.

1. For each sampled output, record whether it compiles.
2. Among compiling outputs, record whether metric improvement is strictly positive.
3. Report A and A^+_μ together as A^+_μ/A.
4. Interpret A as stability and A^+_μ as solving the optimization task.

Evidence. For dependency minimization, the base model has compilation accuracy 0.754 and improved accuracy 0.037; after ImProver 2, these are 0.368 and 0.069 (Table 4, p. 12). Iteration 2 reaches improved accuracy 0.106 with compilation accuracy 0.464 (Table 5, p. 12). The paper interprets this as a trade-off: larger edits can improve more when they succeed but fail compilation more often (Section 5.2.5, p. 12).

Inference: A VL dashboard should report Verus pass rate and strictly improved proof-quality rate separately. An agent that preserves every proof but never reduces dependencies is reliable but not an optimizer; an agent that improves a few proofs while breaking most is an unsafe refactoring policy.

## results and product implications

The trained 7B model improves its base model on all three objectives: length 0.118 to 0.330, modularity 0.003 to 0.143, and dependency 0.050 to 0.206 (Section 5.2, p. 8). It exceeds the 671B DeepSeek baseline on all three, including modularity 0.143 versus 0.055 and dependency 0.206 versus 0.153 (Section 5.2.1, p. 8). These are mean improvements under the paper's best@16 evaluation, not theorem-proving completion percentages. The model leads evaluated unscaffolded systems on modularity, ties GPT-5-high on dependency within rounding (0.206 vs. 0.208), and matches GPT-5-mini on length while trailing GPT-5-high (Section 5.2.2, p. 9).

Inference: The direct VL opportunity is proof maintenance: train a small local model to shorten proof scripts, reduce explicit lemma dependencies, or expose reusable invariant subproofs after correctness is already established. The product threat is metric gaming. Fewer named dependencies can hide heavy automation dependencies, and more spawned goals can create artificial modularity. The paper itself says dependency does not measure semantic independence and that modularity heuristics do not remove all stylistic disputes (Section 3.2.1, pp. 3–4).

What is proved and trusted. Lean compilation/kernel checking establishes formal correctness relative to the Lean environment. The metric implementation, proof-tree parser, context extraction, auto-informalization model, sampling policy, and training code remain trusted infrastructure for the reported measurements. The authors do not run a maintainer-preference study and do not measure downstream prover performance (Section 6, p. 13). Inference: In Verus, a passing proof still relies on Verus, solver behavior, imported specifications, compiler integration, and the correctness of the chosen contract; optimization metrics cannot establish product correctness.

Already done. ImProver 2 already combines candidate generation, formal verification filtering, context retrieval, proof-state traces, auto-informalization, preference optimization, replay buffers, multi-objective structural metrics, and accuracy/improvement reporting. VL should not claim these general techniques as new. Inference: New work would need Rust-specific proof maintenance evidence, such as dependency-upgrade robustness, ownership-aware modularity, solver-time reduction, or measured human repair effort.

## techniques for the catalog

- verified candidate rewriting: sample many proof variants, compile each, and keep only metric-improving valid proofs
- context-slice augmentation: expose directly referenced definitions, theorem signatures, and documentation to the generator
- chain-of-states prompting: serialize intermediate proof goals after each tactic to reveal formal structure
- auto-informalization: provide a natural-language proof-state sketch as auxiliary input while judging formal output
- replay-buffer IRPO: mix old and new candidates, form winner–winner and winner–loser pairs, and train iteratively
- dual accuracy reporting: separate compilation accuracy from the fraction of outputs that compile and improve the metric
- structural proof metrics: score tactic length, explicit dependencies, and effective spawned subgoals with stated proxy limits
Checked 2026-10-15 against paper ahuja2026improver2: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
