# Predicting SMT Solver Performance for Software Verification
(authored by agents unless marked 🧑)
Tag: `healy2017predicting`, [paper](http://arxiv.org/abs/1701.08466v1)
## problem and system

The paper presents Where4, a portfolio solver integrated with Why3. It predicts which SMT solver should receive each proof obligation by extracting static syntactic metrics from WhyML goals, estimating each solver’s cost with supervised learning, and trying solvers in predicted order. The goal is to increase the number of discharged obligations without requiring users to understand solver behavior.

The abstract states: “We present Where4: a portfolio-based approach to discharge Why3 proof obligations.” (abstract, PDF p. 20). The four contributions are the Where4 implementation, Why3 workflow integration, a metric set for Why3 goal formulae, and statistics for eight solvers over 1,048 goals (section 1, PDF p. 20). The initial corpus has 128 files, 289 theories, and 1,048 goals; a 10-second timeout is used for Table 1 (section 1, PDF p. 20).

Inference: for VeruLaw, the directly reusable idea is a solver portfolio around Verus proof obligations. Verus commonly relies on one automated backend, so a predictor could route obligations or choose proof settings. The paper’s measurements concern Why3 and eight historical SMT installations; they do not establish performance for Verus or modern Z3.

## technique 1: extract static goal features

Where4 traverses each Why3 goal and lemma abstract syntax tree (AST), counting syntactic features. Figure 2 groups metrics for size, operators, conditionals, leaves, variables, quantifiers, depth, average arity, literals, functions, and other constructs (section 2.1.1, PDF p. 23). A feature vector is computed without running a solver. The training set uses 96 files and 768 goals (75% of the 128-file corpus); 32 files and 263 goals are held out for evaluation (section 2.1, PDF pp. 22–23 and section 5, PDF p. 27).

How to apply it:
1. Parse every proof obligation produced by the verifier.
2. Traverse the goal and lemma ASTs, counting each selected operator and structural feature.
3. Keep axioms and predicates as logical context, while counting goal and lemma syntax.
4. Store the resulting integer vector with the solver outcomes for training.
5. Apply the same extractor to unseen obligations before solver selection.

Verus form. Inference: extract features from Verus specification and proof obligations after lowering to the verifier’s logical representation: quantifier counts, arithmetic operators, map/sequence operations, trigger annotations, hypothesis counts, and AST depth. Inference: features must be stable across Verus versions and generated code; source Rust syntax alone may miss the actual SMT formula.

Limits. The authors deliberately use simple Why logic metrics to improve generalisability to other formalisms such as Boogie (section 5.4.1, PDF p. 32). This choice omits semantic and solver-context information that may dominate difficult obligations.

## technique 2: define solver cost and ranking labels

Each solver response is Valid, Invalid, Unknown, Timeout, or Failure. The paper orders utility as {Valid, Invalid} > Unknown > {Timeout, Failure} and defines a cost for solver S on goal G: measured time for Valid/Invalid; time plus one timeout for Unknown; and time plus twice the timeout for Timeout/Failure (section 2.1.2, PDF p. 23). Sorting costs ascending yields a per-goal solver ranking.

The timeout is chosen using a Peter Principle Point. The authors inspect responses up to 60 seconds and select 10 seconds because it captures 99% of useful responses while remaining realistic for Why3; the per-solver threshold range is 7.35 seconds for veriT to 9.69 seconds for Z3-4.3.2 (section 2.1.2, PDF pp. 23–24).

How to apply it:
1. Run every candidate backend on each training obligation under a fixed resource limit.
2. Record answer class, CPU time, and memory as needed.
3. Convert each result to the cost function with the chosen timeout.
4. Sort solvers by cost to obtain the target ranking.
5. Keep the timeout, hardware, and answer policy fixed when comparing models.

Verus form. Inference: define Valid as a checked Verus proof, Unknown as an inconclusive verifier result, and Timeout/Failure as unsuccessful attempts. The cost penalty should reflect product goals: proof latency, deterministic builds, and engineer intervention. Inference: an unsound or failed proof must never be treated as Valid merely because it is fast.

## technique 3: regression-based ranking prediction

With eight solvers, direct classification would have 8! possible rankings, many rare or absent. Where4 instead predicts each solver’s cost and derives a ranking. The paper evaluates linear regression, ridge, k-nearest neighbours, decision trees, random forests with and without discretisation, and support-vector regression (section 3, PDF p. 24). Sample weights equal the standard deviation of solver costs, emphasizing goals where solver choice matters (section 3, PDF p. 25).

The evaluation uses time, normalized discounted cumulative gain (nDCG), R², mean absolute error, and regression error (section 3.1, PDF pp. 25–26). On the 768-goal training/cross-validation population, discretised random forest has average cumulative time 14.92 seconds, nDCG 0.48, R² −0.18, MAE 2.13, and regression error 39.19; ordinary random forest has time 15.02 seconds and R² 0.28 (Table 2, PDF p. 26). The authors select random forests because they score highest on three of five metrics and generally well on the others (section 3.2, PDF p. 27).

Verus form. Inference: train a multi-output regressor that predicts latency or success cost for candidate Verus backends, trigger settings, or proof tactics. Use file-level splits so obligations from one module do not leak into training and test sets. Inference: retain a simple fixed-order fallback when model confidence is low.

## technique 4: pre-solving, ranking, and fallback execution

Where4 first calls the highest-ranked installed pre-solver with a one-second timeout. If it returns Valid or Invalid, Where4 stops. Otherwise it extracts features, predicts a ranking, and calls each installed solver in order with the configured timeout until a conclusive result is obtained (section 4 and Algorithm 1, PDF pp. 27–28).

The tool workflow is:
1. Read a WhyML/Why file and extract feature vectors.
2. Traverse the random forest to predict each solver’s cost.
3. Sort costs into a ranking.
4. Optionally return the ranking without calling solvers.
5. Alternatively call solvers in rank order through the Why3 API until Valid/Invalid.

The model is serialized as JSON and compiled into an OCaml binary; local configuration determines which solvers are installed (section 4, PDF p. 27). Inference: a Verus implementation could serialize a model and expose it as a proof-driver policy, but the final proof result must still come from Verus’s sound checking path.

## technique 5: cost thresholds to control timeout cascades

Calling all ranked solvers can be expensive when an obligation is unprovable. Where4 therefore omits solvers whose predicted cost exceeds a threshold after pre-solving. If no solver is below threshold, it returns the pre-solver result (section 5.1, PDF p. 29). On the 263-goal test set, threshold 7 yields 192 Valid responses, 15 more than the best single solver, at an average 4.59 seconds per proof obligation (section 5.5, PDF p. 33).

The full Where4 ranking proves 203 of 263 goals (77.2%), 26 more than the next best single solver Alt-Ergo-1.01, but can pay multiple timeout costs; Where4’s average goal time is 1.98 seconds versus 0.33 for Alt-Ergo-1.01 (Table 3, PDF p. 29). The denominator is the held-out 263-goal test set. The authors explicitly identify this trade-off: “Where4 can perform badly with goals which are not provable by many SMT solvers: expensive Timeout results are chosen before the Valid result is eventually returned.” (section 5.1, PDF p. 29).

Verus form. Inference: use a product-specific threshold to prevent repeated expensive retries on stalled proof obligations. Log the predicted costs and all attempts so a timeout policy cannot conceal a missing lemma. Inference: thresholds should be tuned on representative Verus projects, not copied from Why3.

## evidence, trusted parts, and limits

The held-out test has 32 files, 77 theories, and 263 goals. Where4 proves 11/32 files (34.4%), 44/77 theories (57.1%), and 203/263 goals (77.2%) with average times 1.39, 0.99, and 1.98 seconds respectively (Table 3, PDF p. 29). The best theoretical ranking would need 0.37 seconds per goal, while Random needs 5.70 and Worst 18.35 (same table). Prediction overhead adds 0.46 seconds per file, or 0.056 seconds per goal, excluding Why3’s temporary-file overhead (section 5.3, PDF p. 30).

The dataset is imbalanced: no goal returned Invalid for any of the eight solvers, and all training and test data come from the same Why3 suite (section 5.4.1, PDF p. 32). The authors identify selection bias, likely Alt-Ergo advantage because Why3 examples resemble its input, single-machine timing, and limited external generalisability. Where4 is more suited to large-scale verification than a single small file (section 5.4, PDF pp. 32–33).

Trusted parts include the AST feature extractor, training labels and cost model, model calibration, solver installations, timeout measurement, and the assumption that timing rankings transfer across machines. The paper’s core claim is operational rather than a correctness theorem: “Users without any knowledge of SMT solvers can prove a greater number of goals in a shorter amount of time by delegating to Where4 than by choosing solvers at random.” (conclusion, PDF p. 36).

Inference: the threat to agent-written verified Rust is indirect but practical. Solver selection can make proofs appear reliable on one machine while timing, triggers, or backend version changes cause failures elsewhere. Existing Where4 work already covers static metrics, learned ranking, pre-solving, and timeout thresholds; VL should not redo those techniques without a Verus-specific corpus and leakage-resistant evaluation. The useful adaptation is a measured proof-orchestration layer that records backend versions, model confidence, retries, and unresolved obligations.

## techniques for the catalog

- AST feature extraction — count static logical and syntactic features of each proof obligation before solver invocation
- cost-labelled solver ranking — convert answer classes and timed runs into a timeout-penalized cost and sorted solver order
- regression portfolio prediction — predict all backend costs with a multi-output model and derive an obligation-specific ranking
- pre-solving — try a strong default backend briefly to discharge easy obligations before feature extraction and ranking
- timeout cost threshold — suppress predicted-expensive retries to balance proof coverage against cumulative latency
- reproducible evaluation split — separate files, not individual goals, into training and held-out test data
Checked 2026-10-13: audit record healy2017predicting; paper-study comparison complete; gate executed; experiments not rerun
