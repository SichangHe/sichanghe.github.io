# Learning Guided Automated Reasoning: A Brief Survey
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024learningguided`, [paper](https://arxiv.org/abs/2403.04017)

## what the paper proves or measures
This is a survey, not a new verifier. It organizes learning methods that guide automated theorem provers (ATPs), interactive theorem provers (ITPs), tableaux, instantiation-based systems, and related symbolic classifiers. Its central engineering fact is that proof calculi may be complete while search still faces combinatorial explosion. The introduction says, “These choices do not typically influence the theoretical correctness and completeness of the proof mechanisms but rather the systems’ efficiency and practical performance.” (Section 1, PDF p. 2). The survey covers learned selection of premises, clauses, instantiations, tactics, and strategies. Inference: proof acceptance should remain with the underlying prover or proof assistant.

The survey explicitly limits scope: “Automated Reasoning is however a large field and this brief survey does not make claims to be exhaustive.” (Section 1, p. 2). The evidence is a literature synthesis with reported results from cited systems, not one controlled benchmark. Examples include MaLeCoP avoiding 90% of inferences with guidance, rlCoP solving 40% more test problems than default leanCoP after iterative learning, TacticToe proving 66% of the HOL4 library, iProver neural guidance doubling Mizar performance, and Graph2Tac giving a 50% improvement over baselines that omit background definitions (Sections 6–7, pp. 15–18). Each number belongs to the cited system's corpus and comparison; the survey does not supply common denominators across them.

## technique 1: represent formulas with features that preserve useful structure

what it is and when to use it

Turn formulas or clauses into vectors so a learner can compare goals and candidate facts. Use syntactic features when extraction must be cheap; add semantic or neural representations when symbol overlap hides meaning or knowledge must transfer across signatures. The survey notes, “The aim of such early investigations was to provide HOL Light with automation (a hammer) for proof development in the Flyspeck project.” (Section 3.1, p. 4).

how to do it

1. Extract symbols, subterms, and types from each goal and premise; normalize variables by their types, de Bruijn numbers, or merging all variables, and add walks through term graphs (Section 3.1, pp. 4–5)
2. Weight sparse features with TF-IDF; the survey gives inverse-document frequency as `log(|D| / |{d in D : t in d}|)` (Section 3.1, p. 5)
3. For ENIGMA, traverse each clause's syntax tree and collect top-down symbol paths of length three; rename variables to `d` and Skolem symbols to `g`, then count triples in a vector (Section 3.2, p. 5)
4. Add clause length, positive/negative literal counts, horizontal top-symbol features, and conjecture features for goal-specific predictions (Section 3.2, pp. 5–6)
5. Hash feature strings into a fixed vector to limit vector size; optionally anonymize symbols by arity while retaining whether each is a function or predicate, accepting collisions (Section 3.2, p. 6)
6. For semantic features, use distinguishing finite models, unifiability-index nodes, or latent co-occurrences; for neural representations, use tree networks or name-invariant graph embeddings (Sections 3.3–3.4, pp. 7–8)

Verus form

Inference: represent a Verus proof state, goal, and candidate lemma by deterministic Rust structures and a `spec fn` feature extractor. Use `ensures` to state that extraction preserves the input's structural facts, then prove hash-index bounds with `assert` and arithmetic lemmas. The learned score is advisory; Verus proof checking remains the acceptance criterion. The embedding and training corpus affect search quality; checking the proposed proof need not trust their predictions.

evidence and limits

The survey reports that ENIGMA's second, training-data-indexed vectors reduce dimension and that symbol anonymization “performed surprisingly well in practice” (Section 3.2, p. 6). It also warns neural predictions may be overconfident and cites entropy regularization (Section 3.4, p. 8). Inference: feature collisions, distribution shift, and a poor semantic representation can lower recall without invalidating a proof; they affect search cost and coverage.

## technique 2: premise selection with similarity or probabilistic relevance

what it is and when to use it

Select a small set of likely useful facts before invoking an ATP. This is essential when a large theory would overwhelm deduction. The survey defines premise selection as selecting “a small number of facts that are relevant to the conjecture” (Section 4, p. 9).

how to do it

1. Build a feature vector for every premise and goal from Technique 1
2. For k-nearest neighbors, find the k facts most similar to the goal using weighted shared features; adapt k to the requested number of premises (Section 4.1, p. 9)
3. Rank a candidate fact by contributions from those neighbors whose proofs use it: divide each neighbor’s similarity to the goal by its dependency count, sum, and apply the scaling factor. Add the candidate’s own similarity to the goal if it is itself a neighbor (Section 4.1, p. 9)
4. For naive Bayes, estimate `P(premise relevant | goal features)` as a prior multiplied by per-feature likelihoods learned from proof dependencies; optionally include related absent features (Section 4.2, pp. 9–10)
5. For binary tree classifiers, obtain positive and pseudo-negative training examples; ATPBoost interleaves training with proving to improve both. Hashing millions of sparse symbolic features into a smaller space supports efficient training (Section 4.3, p. 10)
6. Pass the selected premises to the prover and iterate training on newly found proofs in a MaLARea-style loop (Sections 2 and 5, pp. 3, 14)

Verus form

Inference: maintain a candidate lemma index outside the verifier, then have an agent propose `use` facts or proof blocks. Verus checks the resulting proof obligations; it does not need to trust the ranker. A deterministic feature extractor can be verified with `spec fn`, but the learned probabilities, negative sampling, and index freshness are assumptions about search quality.

evidence and limits

The survey attributes considerable gains to MePo, SInE, and MaLARea in large theories (Section 2, p. 3), but gives no common cross-system denominator.

## technique 3: guide saturation-based ATP clause selection

what it is and when to use it

Predict which generated clause should enter the active set next. Use it when a saturation prover's branching dominates runtime. The survey says, “The central idea behind improving clause selection by ML, which goes back at least to the early work of Schulz [134,31,136], is to learn from successes.” (Section 5, p. 11).

how to do it

1. Collect clauses appearing in prior proofs as positive examples and other selected clauses as negative examples (Section 5, p. 11)
2. Train a classifier using syntactic, graph, derivation-history, or conjecture-conditioned features (Sections 3.2, 5, pp. 5–6, 13–14)
3. Order a learned clause queue using a combination of classification and clause length, positive-before-negative classification with age as tiebreaker, or continuous model scores. Combine this queue with original heuristics by alternating queues or using layered selection (Section 5, pp. 12–13)
4. With Deepire’s layered selection, apply the original heuristic to positively classified clauses and alternate with its application to all clauses; lazy evaluation avoids immediately evaluating every available clause (Section 5, p. 13)
5. After new proofs, retrain and repeat; reward intermediate proof clauses rather than only the final proof step to avoid prohibitively expensive trial-and-error (Section 5, p. 14)
6. Optionally predict term orderings or symbol weights, or synthesize and select prover strategies or schedules. Symbol-weight prediction influences clause selection indirectly before proof search starts (Section 5, p. 14)

Verus form

Inference: treat clause prioritization as a search policy for generating Verus proof candidates. Keep the queue and score computation in executable Rust; use `spec fn` only for deterministic ordering properties such as a predicate that the selected clause is in the queue. Verus does not prove that a policy is complete, so timeout and fallback behavior must remain explicit. Proof acceptance still comes from Verus's verifier.

evidence and limits

The survey reports a recurring speed/quality tradeoff: neural models can be more accurate but too slow to replace a tightly optimized selection loop (Section 5, pp. 11–12). Deepire's layered selection and iProver's neural guidance are cited as successful alternatives (Section 5, p. 13). Deepire uses derivation history independently of the problem signature, but still relies on a fixed initial axiom set (Section 5, p. 13).

## technique 4: guide tableaux, instantiation, and tactic-level proof search

what it is and when to use it

Apply learning at a higher-level action: choose a connection-tableaux extension, an SMT instantiation, or an ITP tactic. This can reduce the action space and exploit domain-specific procedures. The survey reports, “This showed that with good guidance, one can avoid 90% of the inferences.” (Section 6, p. 15).

how to do it

1. For tableaux, use FEMaLeCoP’s sparse naive Bayes to guide extension steps, MonteCoP’s Monte Carlo simulations to select promising branches, or rlCoP’s learned policy and value models to guide subtree exploration. rlCoP replaces leanCoP’s iterative deepening with an Alpha-Zero-like architecture and iterates proving and learning (Section 6, p. 15)
2. For instantiation-based ATPs and SMT, learn portfolio choices, strategies, or instantiation priorities from problem features; recent neural iProver guidance uses the given-clause loop (Section 6, p. 15)
3. For ITPs, learn tactic recommendations from existing proofs using clustering, k-NN, or neural models; TacticToe combines tactic prediction with Monte Carlo tree search (Section 7.1, p. 16)
4. Search by executing recommended tactics, which generate kernel inference steps or partial proof terms to advance the proof (Section 7, p. 16)
5. In TacticToe, before storing a new tactic-goal pair, compare the k closest pairs including the new one. Store the tactic that subsumes the original tactic on that goal and occurs in the most database pairs (Section 7.3, p. 17)

Verus form

Inference: let an agent rank Verus proof strategies (`assert`, lemma invocation, quantified trigger changes, or library search) and execute candidates in a bounded loop. Each candidate must compile and verify; a tactic ranking cannot be an `external_body` substitute. Use proof functions only at verification time and keep runtime code separate. Tactic incompleteness and resource allocation remain explicit assumptions.

evidence and limits

The survey cites rlCoP solving 40% more test problems than default leanCoP and TacticToe proving 66% of its HOL4 library (Section 6–7, pp. 15–16). These results have different systems, corpora, and baselines. Tactic sets may be incomplete; overlapping tactics, long-running actions, and new definitions make representation and scheduling difficult (Section 7.3, pp. 17–18). Graph2Tac's 50% improvement over no-background-definition baselines shows the value of representing definitions, but it is not a Verus result (Section 7.3, p. 18).

## techniques for the catalog

- structural proof-state features — extract normalized terms, paths, counts, hashes, and name-invariant graphs for learned guidance
- learned premise selection — rank a small relevant subset with k-NN, Bayes, trees, or neural models before proof search
- clause-selection guidance — prioritize saturation clauses using proof-derived labels while mixing learned and classical queues
- tactic and policy guidance — rank tableaux extensions, SMT instantiations, or ITP tactics and let the kernel check the result
- iterative learning loop — retrain guidance from newly discovered proofs while checking proposed proofs with the underlying prover or proof assistant
