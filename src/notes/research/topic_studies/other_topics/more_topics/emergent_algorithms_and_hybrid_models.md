emergent algorithms and knowledge-guided models
(authored by agents unless marked 🧑)

human topics and research direction
- 🧑 [reading notes](../../../../reading_notes/index.md)
  - “Emergent Algorithms in Foundation Models, Deqing Fu, Theory Lunch”
  - “experiment show layers converge like Newton's method steps”
  - “disentangle transformer into algorithm + heuristic channel”
  - “Intelligent, Robust and Trustworthy AI: Managing GenAI Challenges, Next Phase of Hybrid AI Models and Enterprise AI for Mission-Critical Applications”, Amit Sheth
  - “knowledge graph auxiliary to DL, bring explainability”
  - “deep infusion”
- assessment: these topics ask different questions
  - what computation a trained network performs internally
  - whether external knowledge changes learning, reasoning, or decisions
- agent recommendation: begin with a controlled test of shortcut learning
  - match task accuracy while changing whether a shortcut remains useful
  - measure behavior on deliberately chosen counterexamples
- none of the reviewed results establishes reliability of arbitrary foundation models in critical applications

terms
- transformer: a neural-network architecture that combines information across input positions using attention
- layer: one stage of the network’s computation
- in-context learning: using examples supplied in the input without updating trained model weights
- linear regression: predicting an output as a weighted sum of input features
- conditioning: how sensitive solving a numerical problem is to perturbations
- algorithmic solution: here, a computation matching a specified procedure across the tested problem family
- shortcut: a predictive pattern that works on training-like data but can fail when that pattern changes
- out-of-distribution test: a test drawn differently from the training examples
- knowledge graph: entities joined by labeled relations
- symbolic reasoning: manipulating explicitly represented facts or rules
- knowledge infusion: adding knowledge to model inputs, representations, training objectives, or decision procedures
- RAG: retrieval-augmented generation
  - retrieves documents and conditions generated answers on them
- constraint: a stated condition outputs or intermediate decisions should obey
- ablation: removing one component while holding other conditions as constant as possible

Fu’s linear-regression result: numerical resemblance versus construction proof
- [Fu and colleagues, Transformers Learn to Achieve Second-Order Convergence Rates for In-Context Linear Regression](https://arxiv.org/pdf/2310.17086), §§3–5 and selected appendices
  - authors: “very similar to second-order methods”
  - synthetic tasks sample Gaussian features and random regression weights
    - most reported experiments use noiseless labels
    - includes ill-conditioned covariance matrices and additional noisy experiments
  - trains transformer predictors and probes successive layers
    - compares predictions and inferred regression weights with iterative numerical methods
    - layer depth is compared with solver iteration count
  - empirical evidence favors Newton-like convergence over the tested gradient-descent baselines
    - numerical similarity does not uniquely identify every internal operation
  - separate theorem constructs weights implementing repeated inverse-approximation updates
    - uses modified attention and activation choices in parts of the construction
    - proves representational possibility, not that training must discover those weights
  - reviewed version notes that a gradient-descent variant can mimic inverse approximation
    - the human’s “gradient descent” objection should be scoped to particular baseline algorithms
  - limitation: synthetic regression is not natural-language reasoning or a theorem about pretrained general-purpose models

Fu’s graph result: training distribution controls a restricted model’s shortcut
- [Transformers Provably Learn Algorithmic Solutions for Graph Connectivity, But Only with the Right Data](https://arxiv.org/pdf/2510.19753), §§3–5 and selected appendices
  - authors: “Under suitable conditions”
  - task: infer whether node pairs are connected from a graph’s adjacency matrix
  - theoretical architecture appends attention outputs instead of adding them to a fixed residual representation
    - dimensions grow with depth
    - uses a simplified attention-only model
  - expressivity theorem constructs matrix-powering computation for graph diameter at most 3^L
    - L is layer count
    - capacity upper bound belongs to the specified model family
    - not a universal limit for all transformers or input encodings
  - training theorem assumes random-graph distribution, nonnegative symmetry-structured weights, and a specified loss
    - suppression of the degree-based shortcut requires a balance favoring disconnected-graph penalties
    - convergence statements concern the modeled optimization conditions
  - empirical tests compare random graphs with two-chain and two-clique examples
    - two-layer standard-model experiment uses one billion generated 20-node graphs
    - one-layer simplified experiment uses 4,096 eight-node graphs
  - implication: both within-capacity examples and sufficiently informative boundary examples matter
    - filtering to easy examples alone is not established as sufficient

curriculum and distribution diversity already have close prior work
- Garg and colleagues, [What Can Transformers Learn In-Context?, NeurIPS 2022](https://arxiv.org/pdf/2208.01066), curriculum methods and Appendix B.5
  - authors: “Curriculum does not affect final performance significantly”
  - starts synthetic regression with fewer active dimensions and shorter prompts
    - increases dimension and prompt length during training
  - compares convergence and shifted-distribution errors against full-dimensional training
    - curriculum substantially speeds some harder training settings
    - successful 20-dimensional models show similar final accuracy and robustness
  - implication: faster training does not establish selection of a uniquely identified robust algorithm
  - reading limit: selected full curriculum and shift comparisons inspected
    - no artifact reproduction
- Zhang, Frei, and Bartlett, [Trained Transformers Learn Linear Models In-Context, JMLR 2024](https://www.jmlr.org/papers/volume25/23-1042/23-1042.pdf), model, results, and Appendix E
  - authors: “LSAs still fail under covariate shift”
    - LSA means linear self-attention
    - covariate shift here changes the distribution of regression inputs
  - theory analyzes one linear-attention layer trained by gradient flow on Gaussian regression tasks
    - convergence guarantees do not automatically apply to ordinary deep softmax models
  - generalized training varies input covariance across prompts
    - covariance describes which input dimensions vary together
    - empirical tests also compare GPT2-style models
  - implication: covariance-diverse training is an existing baseline
    - diversity does not guarantee robustness to every later input shift
  - reading limit: selected full theory assumptions and experimental setup inspected
    - proofs not independently rederived
- Goddard and colleagues, [When Can In-Context Learning Generalize Out of Task Distribution?, ICML 2025](https://raw.githubusercontent.com/mlresearch/v267/main/assets/goddard25a/goddard25a.pdf), §§2–3
  - authors: “control task diversity by sampling tasks from hyperspherical caps of varying half-angles”
    - regression-weight vectors occupy a restricted region on a sphere
  - varies training-task diversity, task count, model size, and regression dimension
    - tests weights beyond the training region
  - implication: equal task counts do not ensure equal diversity or generalization difficulty
  - reading limit: selected full regression design inspected
    - not a verified graph-boundary or adversarial-augmentation experiment
- [Transformers Learn Robust In-Context Regression under Distributional Uncertainty, 2026 preprint](https://arxiv.org/pdf/2603.18564), §2 and Appendix A.1
  - authors: “All models are trained and evaluated in-distribution”
  - separately trains under different coefficient priors, input distributions, noise, and prompt dependence
    - uses dimension/prompt-length curriculum and prediction-error endpoints
  - implication: comparisons between separately trained estimators do not establish shift robustness of one fixed model
  - reading limit: selected full task definitions and training protocol inspected
    - broader adversarial in-context-learning literature remains unchecked

- withdrawn graph-learning lead
  - Roy and Saparov, [Transformers Can Learn Connectivity in Some Graphs but Not Others](https://arxiv.org/abs/2509.22343)
  - author withdrawal comment, April 21 2026: “This paper contains some assumption which is not correct”
  - current record supplies no PDF
    - older abstract remains discoverable but is excluded as validated evidence here
    - exact faulty assumption and affected results remain unchecked

what these papers permit us to test
- claim to avoid: good benchmark scores prove an algorithm was learned
- controlled experiment
  - reproduce one released regression or graph configuration
  - compare distributions matched on size and label balance but differing in shortcut usefulness
  - test chains, disconnected dense components, relabeled nodes, and adversarial degree-matched pairs
  - report per-instance success and performance by graph diameter
  - separate representational capacity from optimization failure
- causal test
  - intervene on the proposed shortcut channel in the simplified model
  - compare changed behavior with predicted failures
  - do not transfer channel labels directly to an ordinary pretrained language model
- narrower research possibility
  - determine whether a curriculum selects a robust computation at equal training cost
  - compare random sampling, capacity filtering, boundary-example sampling, and adversarial augmentation
  - distinguish example ordering from changing the final training distribution
    - compare ordered and shuffled schedules using the same example multiset
    - vary boundary-example frequency separately from graph size, diameter, degree statistics, and class balance
  - match processed tokens and measured training cost
    - equal optimizer steps can process different prompt lengths
  - novelty needs comparison with existing curriculum and shortcut-learning methods
- stop condition
  - results only reproduce the published distribution effect without a new mechanism or useful generalization

Sheth’s topic: retrieval, learned constraints, and explicit decision rules differ
- retrieved facts can supply missing information
- training constraints can bias what a model learns
- explicit rules can restrict how model outputs become decisions
- none automatically supplies trustworthy explanations
  - a readable rule trace can faithfully describe an incorrect rule
  - a learned model can score highly while violating a rare critical condition
- the exact talk transcript and its enterprise evaluations were not identified
  - papers below are related primary work, not asserted to be the talk’s complete evidence

process knowledge in a clinical classification benchmark
- [Roy, Gaur, Zhang, and Sheth, Process Knowledge-infused Learning for Clinician-friendly Explanations](https://arxiv.org/pdf/2306.09824), methods and evaluation inspected
  - authors: “layers clinical process knowledge structures on language model outputs”
  - represents clinical conditions explicitly and derives a classification from condition evaluations
  - creates revised labels for 448 Reddit posts
    - three experts edit 235 labels and record relevant conditions
    - evaluated CSSRS 2.0 contains the 235 edited examples
    - clinical-style classification labels are not prospective patient outcomes
  - compares augmented models on suicidality and depression-related benchmarks
    - experiments use CSSRS 2.0 and PRIMATE
    - includes a language-model prompting alternative for condition questions
  - explanation study reuses experts involved in dataset construction
    - reports explanations rated beneficial more often than baselines
    - evaluators are told proposed explanations are human-generated and baselines model-generated
    - inference: different provenance labels confound the comparison rather than establish neutral masking
  - errors include difficulty distinguishing casual from serious mentions
  - assessment: useful evidence for explicit condition-level evaluation
    - not proof of safer diagnosis, clinician performance, or deployment readiness

retrieval baseline
- [Lewis and colleagues, Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks, NeurIPS 2020](https://arxiv.org/pdf/2005.11401), §§2–4
  - authors: “non-parametric memory”
  - retrieves Wikipedia passages with a dense retriever and generates answers conditioned on retrieved passages
    - non-parametric means knowledge stored outside model weights
  - training combines retrieval scores and generation probabilities
    - considers retrieval per answer sequence and per generated token
  - evaluates question answering, fact verification, and generation
  - separates retrieval benefit from a model using only learned weights
  - limitation: retrieval does not guarantee truth, logical consistency, or conformity with a domain process
  - fair hybrid comparison should give competing systems the same underlying documents

explicit constraint-learning baseline
- [Ahmed and colleagues, Pylon, 2022](https://proceedings.mlr.press/v176/ahmed22a/ahmed22a.pdf), framework and case studies inspected
  - authors: “compiles them into a differentiable loss”
  - expresses knowledge as Python functions over model outputs
  - supports exact and approximate ways to compute the constraint loss
  - case studies include language, vision, games, and knowledge graphs
  - limitation: discouraging violations during training does not guarantee every deployment output satisfies the rule
  - compare with an explicit output checker using the same constraints
    - distinguish rejection rate, violation rate, and task success

neural-symbolic graph reasoning baseline
- [Zhu, Galkin, Zhang, and Tang, GNN-QE, ICML 2022](https://proceedings.mlr.press/v162/zhu22c/zhu22c.pdf), §§3–5 and benchmark appendix
  - authors: “fuzzy sets of entities”
  - represents candidate answers as weighted sets
  - neural graph operations predict missing links
    - symbolic set operations implement combinations and negation
  - evaluates generated logical queries on FB15k, FB15k-237, and NELL995
    - scores ranking of answers requiring missing-link inference
    - intermediate answers can be inspected
  - limitation: graph incompleteness can make plausible answers count as wrong
    - negation needs an explicit interpretation when facts are missing
    - visible intermediate scores are not a proof of correct reasoning
  - direct prior work for interpretable intermediate graph-query execution

bounded hybrid experiment
- task: a nonclinical workflow with a small explicit policy and independently verifiable answers
  - example: route a synthetic incident using facts, dependency relations, and allowed escalation steps
  - avoid claiming clinical validity from a systems benchmark
- compare five configurations
  - base model
  - same model with retrieved documents
  - knowledge-guided condition prompts
  - learned constraint penalty
  - symbolic decision procedure over extracted conditions
- control information and budget
  - identical facts, policy version, examples, retrieval access, and inference budget
  - separate extraction errors from rule-execution errors
  - include a symbolic oracle supplied with correct extracted facts
- stress conditions
  - missing facts, contradictory sources, policy changes, negation, rare exceptions, and misleading shortcuts
  - test contradictory constraints rather than silently selecting a convenient one
- outcomes
  - answer correctness and policy violations separately
  - abstention, latency, maintenance cost, and explanation faithfulness
  - whether changed evidence causes the correct changed decision
- possible contribution
  - a reproducible failure taxonomy explaining which integration boundary caused errors
  - evidence that a particular combination remains correct after policy updates
  - not a claim that hybrid AI or knowledge infusion is new

limits and nearby coverage
- selected full methods read for both Fu papers and four hybrid baselines
- proof assumptions inspected, not mechanically checked
- no artifact replication or experiment completed
- exact seminar transcript and enterprise deployment evidence remain unavailable
- [language infrastructure](language_infrastructure.md)
- [cross-topic ChatGPT review](chatgpt_review.md)
