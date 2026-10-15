# Learning Guided Automated Reasoning: A Brief Survey
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024learningguided`, [paper](https://www.semanticscholar.org/paper/edd3e9d9347a3866e1a5a913733f1d9477ec7a2c)

## what the paper proves or measures
This is a survey, not a new verifier. It organizes learning methods that guide automated theorem provers (ATPs), interactive theorem provers (ITPs), tableaux, instantiation-based systems, and related symbolic classifiers. Its central engineering fact is that proof calculi may be complete while search still faces combinatorial explosion. The introduction says, “These choices do not typically influence the theoretical correctness and completeness of the proof mechanisms but rather the systems’ efficiency and practical performance.” (Section 1, PDF p. 2). Learning therefore chooses premises, clauses, instantiations, tactics, or strategies; a trusted kernel or prover still checks the resulting proof.

The survey explicitly limits scope: “Automated Reasoning is however a large field and this brief survey does not make claims to be exhaustive.” (Section 1, p. 2). The evidence is a literature synthesis with reported results from cited systems, not one controlled benchmark. Examples include MaLeCoP avoiding 90% of inferences with guidance, rlCoP solving 40% more test problems than default leanCoP after iterative learning, TacticToe proving 66% of the HOL4 library, iProver neural guidance doubling Mizar performance, and Graph2Tac giving a 50% improvement over baselines that omit background definitions (Sections 5–7, pp. 11, 15–18). Each number belongs to the cited system's corpus and comparison; the survey does not supply common denominators across them.

## technique 1: represent formulas with features that preserve useful structure

what it is and when to use it

Turn formulas or clauses into vectors so a learner can compare goals and candidate facts. Use syntactic features when extraction must be cheap; add semantic or neural representations when symbol overlap hides meaning or knowledge must transfer across signatures. The survey notes, “The aim of such early investigations was to provide HOL Light with automation (a hammer) for proof development in the Flyspeck project.” (Section 3.1, p. 4).

how to do it

1. Extract symbols, subterms, types, and normalized term walks from each goal and premise; variable names can be replaced by types, de Bruijn numbers, or one merged variable (Section 3.1, p. 4)
2. Weight sparse features with TF-IDF; the survey gives inverse-document frequency as `log(|D| / |{d in D : t in d}|)` (Section 3.1, p. 5)
3. For ENIGMA, traverse each clause's syntax tree and collect top-down symbol paths of length three; rename variables to `d` and Skolem symbols to `g`, then count triples in a vector (Section 3.2, p. 5)
4. Add clause length, positive/negative literal counts, horizontal top-symbol features, and conjecture features for goal-specific predictions (Section 3.2, pp. 5–6)
5. Hash feature strings into a fixed vector to bound memory; optionally anonymize symbols by arity to transfer across signatures, accepting collisions (Section 3.2, p. 6)
6. For semantic features, mine distinguishing finite models, unifiability-index nodes, latent co-occurrences, tree neural networks, or name-invariant graph embeddings (Sections 3.3–3.4, pp. 7–8)

Verus form

Inference: represent a Verus proof state, goal, and candidate lemma by deterministic Rust structures and a `spec fn` feature extractor. Use `ensures` to state that extraction preserves the input's structural facts, then prove hash-index bounds with `assert` and arithmetic lemmas. The learned score is advisory; Verus proof checking remains the acceptance criterion. A neural embedding and training corpus are external trusted inputs unless separately specified.

evidence and limits

The survey reports that ENIGMA's second, training-data-indexed vectors reduce dimension and that symbol anonymization “performed surprisingly well in practice” (Section 3.2, p. 6). It also warns neural predictions may be overconfident and cites entropy regularization (Section 3.4, p. 8). Inference: feature collisions, distribution shift, and a poor semantic representation can lower recall without invalidating a proof; they affect search cost and coverage.

## technique 2: premise selection with similarity or probabilistic relevance

what it is and when to use it

Select a small set of likely useful facts before invoking an ATP. This is essential when a large theory would overwhelm deduction. The survey defines premise selection as selecting “a small number of facts that are relevant to the conjecture” (Section 4, p. 9).

how to do it

1. Build a feature vector for every premise and goal from Technique 1
2. For k-nearest neighbors, compute weighted feature similarity and rank premises by similarity to the goal; adapt k to the requested number of premises (Section 4.1, p. 9)
3. Add dependency-aware relevance: discount a fact when proofs that use it have many dependencies and add similarity from those dependencies (Section 4.1, p. 9)
4. For naive Bayes, estimate `P(premise relevant | goal features)` as a prior multiplied by per-feature likelihoods learned from proof dependencies; optionally include related absent features (Section 4.2, p. 10)
5. For tree ensembles, create positive examples from proof dependencies and pseudo-negative examples from nonselected facts; train random forests or gradient-boosted trees, using hashing for millions of sparse features (Section 4.3, p. 10)
6. Pass the selected premises to the prover and retain only kernel-checked proofs; iterate training on newly found proofs in a MaLARea-style loop (Sections 2 and 5, pp. 3, 14)

Verus form

Inference: maintain a candidate lemma index outside the verifier, then have an agent propose `use` facts or proof blocks. Verus checks the resulting proof obligations; it does not need to trust the ranker. A deterministic feature extractor can be verified with `spec fn`, but the learned probabilities, negative sampling, and index freshness are assumptions about search quality.

evidence and limits

The survey attributes considerable gains to MePo, SInE, and MaLARea in large theories (Section 2, p. 3), but gives no common cross-system denominator. Premise selection can omit the only useful lemma, yielding a timeout or failed proof; it does not make the underlying logic incomplete. Inference: VL can use selection to reduce solver context while preserving soundness if every accepted proof is rerun by Verus.

## technique 3: guide saturation-based ATP clause selection

what it is and when to use it

Predict which generated clause should enter the active set next. Use it when a saturation prover's branching dominates runtime. The survey says, “The central idea behind improving clause selection by ML ... is to learn from successes.” (Section 5, p. 11).

how to do it

1. Collect clauses appearing in prior proofs as positive examples and other selected clauses as negative examples (Section 5, p. 11)
2. Train a classifier using syntactic, graph, derivation-history, or conjecture-conditioned features (Sections 3.2, 5, pp. 5–6, 13–14)
3. Convert scores to a total clause order; combine learned order with the original heuristic by linear score, positive-before-negative plus age, alternation, or layered selection (Section 5, pp. 12–13)
4. Evaluate expensive models lazily and keep fast heuristics in the loop when prediction cost would erase search gains (Section 5, pp. 11–13)
5. After new proofs, retrain and repeat; reward intermediate proof clauses rather than only the final proof step to avoid prohibitively expensive trial-and-error (Section 5, p. 14)
6. Optionally predict term orderings, symbol weights, prover strategies, or schedules in an initialization phase (Section 5, p. 14)

Verus form

Inference: treat clause prioritization as a search policy for generating Verus proof candidates. Keep the queue and score computation in executable Rust; use `spec fn` only for deterministic ordering properties such as a predicate that the selected clause is in the queue. Verus does not prove that a policy is complete, so timeout and fallback behavior must remain explicit. Proof acceptance still comes from Verus's verifier.

evidence and limits

The survey reports a recurring speed/quality tradeoff: neural models can be more accurate but too slow to replace a tightly optimized selection loop (Section 5, pp. 11–12). Deepire's layered selection and iProver's neural guidance are cited as successful alternatives. Inference: for VL, an expensive proof-ranking model can reduce total verified throughput even when it improves per-step choices.

## technique 4: guide tableaux, instantiation, and tactic-level proof search

what it is and when to use it

Apply learning at a higher-level action: choose a connection-tableaux extension, an SMT instantiation, or an ITP tactic. This can reduce the action space and exploit domain-specific procedures. The survey reports, “With good guidance, one can avoid 90% of the inferences.” (Section 6, p. 15).

how to do it

1. For tableaux, train naive Bayes, Monte Carlo, or policy/value models on partial proof states and select promising extension branches; rlCoP iterates proving and learning (Section 6, p. 15)
2. For instantiation-based ATPs and SMT, learn portfolio choices, strategies, or instantiation priorities from problem features; recent neural iProver guidance uses the given-clause loop (Section 6, p. 15)
3. For ITPs, learn a tactic from prior tactic-goal pairs using k-NN, clustering, neural state encodings, or Monte Carlo tree search (Section 7.1, p. 16)
4. Execute the chosen tactic, feed the resulting proof state back to search, and let the proof assistant kernel check the final proof (Section 7, p. 16)
5. Orthogonalize tactic-goal training data: compare nearby pairs, retain a tactic that subsumes the goal and has broad coverage, and avoid duplicate actions (Section 7.3, pp. 17–18)

Verus form

Inference: let an agent rank Verus proof strategies (`assert`, lemma invocation, quantified trigger changes, or library search) and execute candidates in a bounded loop. Each candidate must compile and verify; a tactic ranking cannot be an `external_body` substitute. Use proof functions only at verification time and keep runtime code separate. Tactic incompleteness and resource allocation remain explicit assumptions.

evidence and limits

The survey cites rlCoP solving 40% more test problems than default leanCoP and TacticToe proving 66% of its HOL4 library (Section 6–7, pp. 15–16). These results have different systems, corpora, and baselines. Tactic sets may be incomplete; overlapping tactics, long-running actions, and new definitions make representation and scheduling difficult (Section 7.3, pp. 17–18). Graph2Tac's 50% improvement over no-background-definition baselines shows the value of representing definitions, but it is not a Verus result (Section 7.3, p. 18).

## what remains trusted, contradictions, and product threat

The soundness boundary is the underlying ATP/ITP kernel, calculus, specifications, feature extraction assumptions, and training data. Learned guidance affects which proofs are found, not whether a checked proof is valid. The survey's reported percentages cannot be combined: “40% more,” “66%,” “90%,” and “50% improvement” use different denominators and baselines. Its conclusion says LLM ATP performance in fair-resource evaluations has been questionable compared with signature-independent GNNs, and identifies conjecturing and autoformalization as promising uses (Section 9, pp. 19–20). Inference: an agent-written Verus product faces search-cost and proof-maintenance threats more than direct unsoundness, provided Verus checks every generated proof; an overconfident model can still waste resources or select a missing lemma.

## what VL should not redo

The survey already covers feature engineering, premise selection, clause and tactic guidance, model-based counterexamples, reinforcement loops, signature-independent embeddings, and kernel-checked proof workflows. VL should not present generic learned premise ranking or LLM proof search as new. Inference: a distinct contribution would measure these policies on Verus proof states with reproducible solver-time, timeout, repair, and dependency-upgrade denominators; this survey supplies no such experiment.

## techniques for the catalog

- structural proof-state features — extract normalized terms, paths, counts, hashes, and name-invariant graphs for learned guidance
- learned premise selection — rank a small relevant subset with k-NN, Bayes, trees, or neural models before proof search
- clause-selection guidance — prioritize saturation clauses using proof-derived labels while mixing learned and classical queues
- tactic and policy guidance — rank tableaux extensions, SMT instantiations, or ITP tactics and let the kernel check the result
- iterative learning loop — retrain guidance from newly discovered proofs while preserving the verifier as the acceptance gate

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
