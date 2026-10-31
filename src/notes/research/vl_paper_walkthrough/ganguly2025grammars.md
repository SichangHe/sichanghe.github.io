# Grammars of Formal Uncertainty: When to Trust LLMs in Automated Reasoning Tasks
(authored by agents unless marked 🧑)
Tag: `ganguly2025grammars`, [paper](http://arxiv.org/abs/2505.20047v1)

## what the paper establishes

The paper studies a reliability problem before a solver can certify an answer: an LLM may generate a syntactically valid formal artifact that encodes the wrong meaning. Its central proposal is to estimate the distribution of many generated SMT-LIB programs with a probabilistic context-free grammar (PCFG), then use structural uncertainty to decide when to accept an artifact and when to abstain or review it. The authors state: “The central thesis of this paper is that the inherent probabilistic uncertainty in LLM outputs for formal reasoning tasks, particularly when generating formal artifacts like SMT-LIB programs, is not a mere nuisance but a valuable source of information for guiding verification.” (section 1, PDF p. 1)

The initial evaluation uses five models, four datasets, and five samples per question for the text-versus-SMT comparison. Section 3 names o3-mini, DeepSeek-R1, DeepSeek-v3-04-21, Gemini Flash 2.0, and Gemini Flash 2.0 Lite; the datasets are StrategyQA, ProntoQA, ProofWriter, and FOLIO (PDF p. 5). The detailed PCFG setup specifies 100 questions each from StrategyQA, ProofWriter, and ProntoQA, with 100 SMT samples per question; FOLIO is excluded because robust formalizations were difficult to obtain (appendix D, PDF p. 29). Model version labels differ: Tables 2–4 and 5–9 label DeepSeek-v3 as 0324, unlike section 3. The authors explicitly warn that “No approach universally outperforms the other across all models and datasets.” (Table 1 caption, PDF p. 6)

Inference: The task-dependent result matters for a verifier prerequisite check. Table 1 reports o3-mini/ProofWriter accuracy rising from 0.8893 to 0.9418, or 5.25 percentage points from the displayed values; its delta cell instead gives -0.0524. For FOLIO, o3-mini falls from 0.9450 to 0.5000 (Table 1, PDF p. 6). DeepSeek-R1/ProofWriter is listed as 0.9423 versus 0.4935, but the authors explicitly say: “We advise the reader to ignore DeepSeek R1’s SMT performance, since it is based on a “Partial Run,”” (appendix C.1, PDF p. 21). Table 1 gives no question-count denominators; the detailed confusion counts appear in Tables 5–9 (PDF pp. 21–22). Section 3 attributes the contrast to explicit premises helping formal deduction and knowledge-intensive questions exposing formalization errors (PDF p. 6).

## technique 1: use SMT-LIB as a common formal intermediate representation

what it is and when to use it

The method replaces a bespoke DSL with SMT-LIB v2, whose standard grammar can be parsed and whose programs can be sent to SMT solvers. The paper says: “To mitigate this overhead, we adopt the stable, widely supported SMT-LIB standard as a common intermediate representation targeting SMT solvers.” (section 2, PDF p. 2) Inference: Use this when an LLM must turn a natural-language reasoning task into a machine-checkable artifact and you need one parser and solver interface across tasks.

how the paper does it

1. Prompt the LLM with the natural-language question and request an SMT-LIB program.
2. Generate multiple programs for the same question. In the main benchmark, five samples per question are used; in the PCFG study, 100 samples per question are used (section 3, PDF p. 5; supplementary section D, PDF p. 29).
3. Execute each syntactically valid program with Z3 and compare the result with the dataset ground truth or with the model's direct text answer. The paper describes the two prediction targets as whether “LLM-generated SMT programs, when executed by Z3, would yield the correct ground truth answer” and whether the SMT output is consistent with the model's natural-language reasoning (section 3.1, PDF pp. 6–7).

Verus form

evidence and limits

The paper reports that SMT generation “required significantly less effort (more syntactically valid programs in fewer attempts) and used dramatically fewer tokens per prompt” than an earlier approach, while retaining multi-solver interoperability (section 3, PDF p. 5). It also reports that SMT changes the error profile, often trading precision for recall, and that formalization can introduce false positives or miss correct answers (section 3, PDF p. 6). Inference: syntax validity and correct solver use are prerequisite checks; neither establishes that the formalization matches the intended meaning. A correct answer may require unsatisfiability rather than satisfiability.

## technique 2: induce a PCFG from generated formal artifacts

what it is and when to use it

A PCFG gives each production rule of a context-free grammar a probability. Here the underlying grammar is SMT-LIB v2. The paper's formal setup treats the LLM as a probability measure over strings and conditions that measure on valid SMT-LIB programs; it then approximates the conditioned distribution with a PCFG (section 2, PDF pp. 2–3). Inference: Use this when many candidate formalizations are available and you want uncertainty features that describe structure rather than only token probabilities.

how to do it

1. Fix the SMT-LIB grammar `G_SMT` and generate `P_N = {P_1, ..., P_N}` from one LLM and one task.
2. Parse the generated programs with the fixed grammar and retain successful parse trees.
3. Record each applied production `r = (A -> beta)`, its source program and structural context such as depth, and optionally its source-text mapping (section 2, PDF p. 3).
4. Count rule applications. For a rule r with left-hand side A, compute the maximum-likelihood estimate `p_hat(r) = C(r)/C(A)`, where `C(A)` is the sum of counts for all rules expanding A. The unsmoothed estimate requires `C(A) > 0`; otherwise the paper assigns uniform probabilities over the rules for A (section 2, PDF p. 3).
5. Apply additive Lidstone smoothing to rule probabilities to avoid zero counts: `(C(r)+beta_s)/(C(A)+beta_s |R_A|)`; the supplementary setup uses Laplace smoothing with `beta_s = 1` (section 2, PDF p. 3; supplementary section D, PDF p. 29).
6. Optionally replace MLE with a symmetric Dirichlet posterior mean or a neural PCFG, but the experiments find MLE computationally efficient and sufficiently accurate (section 3.1, PDF pp. 6–7).

Verus form

Inference: A Verus implementation would treat the parser and feature extractor as executable Rust and prove parser contracts such as the parser emits only valid SMT grammar productions. Inference: Counts and probabilities can be represented as ordinary integer and rational data with `spec fn` definitions for totals and probability normalization, while a `proof fn` establishes count-preservation and normalization. Inference: The paper does not provide Rust or Verus code, so exact library types, solver support, and parser invariants must be designed and checked in Verus.

evidence and limits

Theorem 1 states a coverage bound for N i.i.d. samples: for a region of mass epsilon, the stated miss-probability bound is `exp(-N epsilon / 2^H(mu))`, with entropy measured in bits and N sufficiently large (section 2, PDF p. 4; appendix A.1, PDF p. 17). This is the authors’ theorem claim, not an independently established guarantee here. The authors use 100 samples per question in the detailed study and one PCFG per question, not one global PCFG (supplementary section D, PDF p. 29). Inference: the learned grammar describes the sampled behavior of one model on one question; it does not establish coverage of all valid specifications or all future prompts. The paper assumes independent and identically distributed samples for the convergence statement (section 2, PDF p. 3), while its generation procedure allows up to ten attempts per sample (supplementary section D, PDF p. 29). Inference: a deployment should record whether retries change the sampling distribution.

## technique 3: compute structural and information-theoretic uncertainty metrics

what to compute

The paper defines static grammar size and branching metrics, the mean-matrix spectral radius, Shannon and Rényi entropy, grammar perplexity, KL divergence from a uniform rule distribution, the composite NSUI score, rule-distribution statistics, and text/SMT self-consistency (section 2.1, PDF pp. 4–5). The formulas are operational: for each nonterminal A, Shannon entropy is the sum of `-p(A -> beta) log2 p(A -> beta)` over rules expanding A; grammar entropy weights nonterminal entropies by expected derivation frequency; perplexity is `2^H(G)`; NSUI is `E_ratio * S_factor`, where `E_ratio = H(G)/H_max(G)` and `S_factor = rho(B)/(1+rho(B))` (section 2.1, PDF pp. 4–5).

how to apply the metrics

1. From the PCFG, count nonterminals, productions, average rules per nonterminal, average right-hand-side length, maximum branching factor, and left/right recursion.
2. Build the mean matrix B. Each entry is the expected number of occurrences of one nonterminal on the right-hand side of a production chosen for another nonterminal. Compute its spectral radius `rho(B)` (section 2.1, PDF p. 4).
3. Compute Shannon entropy and Rényi entropy at the reported orders 0.5 and 2.0. Compute grammar entropy, perplexity, and KL divergence from a uniform choice of rules.
4. Compute rule-probability mean, median, minimum, maximum, standard deviation, skewness, and kurtosis.
5. Compute text self-consistency by agreement among textual outputs and SMT self-consistency by solver agreement among formal outputs (section 2.1, PDF p. 5).

Verus form

Inference: These are analysis functions over a finite collected corpus, so a Verus wrapper can specify that counts are nonnegative, denominators are positive before division, probabilities sum to one within a tolerance or exact rational representation, and entropy terms are computed only for positive probabilities. Inference: Use `requires` and `ensures` on executable helper functions and separate `spec fn` definitions for mathematical quantities; do not model a runtime proof as a `proof fn` call. Inference: Floating-point logarithms and eigenvalue routines may need an external numerical contract or a discrete approximation, and the paper gives no Verus encoding for either.

evidence from the experiments

For ground-truth correctness, one of the tied strongest individual AUROC results in Table 3 is grammar entropy on o3-mini/ProofWriter: AUROC 0.9301 and AURC 0.0008, measured on the paper's selected model-task setting with 100 SMT samples per question (Table 3, PDF p. 7; supplementary section D, PDF p. 29). On StrategyQA/o3-mini, grammar entropy has AUROC 0.7448 and AURC 0.1113 in the corresponding table cell. For SMT-text consistency, rule-distribution kurtosis reaches AUROC 0.8695, AURC 0.4448, and relative error reduction 0.3056 for Gemini Flash 2.0 Lite on StrategyQA (Table 16, supplementary PDF p. 28). For o3-mini on ProofWriter, ensemble weighted and ensemble ML each report AUROC 1.0000, with 0.05 optimal abstention and 1.00 relative error reduction; the table defines error at threshold as 0.00 in that setting (Table 17, supplementary PDF p. 28). These scores concern selected question sets, with 100 SMT samples used to construct each question’s PCFG (appendix D, PDF p. 29). Inference: they do not establish universal model error rates.

The paper also reports poor calibration despite strong discrimination: grammar entropy on o3-mini/ProofWriter has AUROC 0.9301 but ECE 0.4419 (Table 3, PDF p. 7). It concludes that anomaly magnitude does not linearly predict error probability and that calibration-aware fusion is needed (discussion, PDF p. 8).

## technique 4: fuse metrics and perform selective verification

what it is

The paper implements four predictors: an unweighted subset average, an unweighted average of all metrics, a weighted ensemble, and a logistic-regression meta-model. It evaluates AUROC for discrimination, AURC for risk under abstention, ECE and Brier score for calibration, and reports an optimal threshold, error at that threshold, and relative error reduction (section 2.1, PDF p. 5; supplementary section D, PDF p. 29).

how to do it

1. Create one feature vector from the PCFG metrics and consistency scores for each question's candidate set.
2. Train Ensemble ML using logistic regression with balanced class weights, scaled features, and up to 10,000 iterations (supplementary section D, PDF p. 29).
3. Compute AUROC, ECE using ten confidence bins, Brier score, and AURC. The paper does not specify a training/test split for Ensemble ML. Inference: evaluate a deployment on held-out examples before trusting its calibration or error reduction.
4. Choose an abstention threshold to maximize relative error reduction while allowing at most 50% abstention (supplementary section D, PDF p. 29).
5. Retain answers below the chosen uncertainty cutoff and abstain on the rest; report error among retained answers. Inference: route abstentions to human review if the deployment requires an answer.

Verus form

evidence and limits

The paper reports that its “lightweight fusion of these signals enables selective verification, drastically reducing errors (14-100%) with minimal abstention” (abstract, PDF p. 1). The detailed tables show that the range is setting-dependent. For example, Table 17's 100% relative error reduction is on o3-mini/ProofWriter SMT-text consistency, with a 5% abstention threshold; Table 16's kurtosis result is 30.56% relative reduction at 50% abstention for Gemini Flash Lite/StrategyQA (Tables 16–17, supplementary p. 28). Inference: these numbers support a configurable review prerequisite check, not a product-wide guarantee. The authors selected model-dataset combinations where a performance gap existed and SMT was not near random guessing, with N=100 samples (section 3.1, PDF p. 7). Inference: these selected settings do not establish performance on other distributions.

## technique 5: qualitative PCFG diagnostics of formalization errors

The paper uses parse-tree distributions to inspect semantic and structural failure modes. It identifies formalization aliasing, variance in logical decomposition, atypical assertions, semantic divergence in axiomatization, and instability in representing ground facts (supplementary section F, PDF pp. 30–31). Inference: A diagnostic procedure based on those examples is:

1. Group all generated programs for one natural-language input and induce its PCFG.
2. Locate low-probability rule sequences and map them back to source assertions.
3. Compare logically equivalent alternatives, such as an implication rendered directly versus as a disjunction, to distinguish benign syntax variation from semantic drift.
4. Inspect nested quantifiers, connectives, predicates, and decomposition depth for divergent strategies.
5. Compare ground facts across samples and flag contradictory predicates or entities.

The paper gives a concrete semantic-divergence example: “one SMT sample might correctly assert (forall ((x Engineer)) (usesLaTeX x)), while a semantically divergent sample might erroneously assert (forall ((x User)) (implies (usesLaTeX x) (isEngineer x))).” (supplementary section F, PDF p. 31) It also gives four divergent SMT programs for a StrategyQA problem, including differing declarations and assertions (Table 18, supplementary PDF p. 31).

Verus form

## temperature and sampling evidence

The temperature findings conflict within the paper. The main ablation discussion says the spectral radius “consistently decreases with sampling temperature” (section 3.1, PDF p. 8), whereas appendix B says: “Notably, the PCFG spectral radius generally trended upwards with increasing temperature.” (PDF p. 18). The main text describes smooth, monotonic grammatical changes, but appendix B reports that NSUI fluctuates without a clear monotonic direction (PDF p. 19). Appendix A.2 discusses Gaussian and exponential schedules and favors a systematic uniform schedule (PDF p. 18); appendix D says the primary UQ samples used default temperature, distinct from the ablation (PDF p. 29). Inference: the study cannot support one universal spectral-radius trend. Record temperature and remeasure uncertainty features for the intended generation setting.

## what is proved, measured, and trusted

Theorem 1 claims a mathematical coverage bound under entropy, measurability, sufficiently-large-N, and i.i.d.-sampling assumptions (section 2, PDF p. 4). Its proof is given in appendix A.1 (PDF p. 17); the proof’s validity was not independently established in this check. The PCFG formulas, metric definitions, and threshold metrics are specified mathematically. The empirical AUROC, AURC, ECE, Brier, accuracy, and error-reduction values are measurements on selected datasets, models, samples, parser outputs, and thresholds. The supplementary setup says each selected question has 100 SMT samples, parses them with an ANTLR-based parser, uses Laplace smoothing with beta_s=1, uses ten ECE bins, and trains logistic regression with balanced class weights (supplementary section D, PDF p. 29).

## techniques for the catalog

- SMT-LIB intermediate representation: generate solver-checkable formal artifacts in a stable standard language instead of a bespoke DSL
- PCFG induction from artifact ensembles: parse many valid outputs and estimate production-rule probabilities with MLE and smoothing
- grammar uncertainty metrics: use entropy, perplexity, KL divergence, spectral radius, NSUI, rule statistics, and consistency scores
- selective verification by fusion: combine uncertainty signals, calibrate a predictor, and abstain at a threshold chosen for error reduction
- qualitative formalization diagnostics: inspect low-probability parse structures for aliasing, decomposition variance, semantic drift, and unstable facts
- temperature-aware sampling analysis: measure how sampling temperature changes recursive structure and uncertainty before setting a generation policy
