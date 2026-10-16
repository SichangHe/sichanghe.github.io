# OptProver: Bridging Olympiad and Optimization through Continual Training in Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2026optprover`, [paper](https://www.semanticscholar.org/paper/e6b9dcf563a27ef5c8f448099a7ad57f9ede454a)

## problem and evidence

OptProver adapts a step-level Lean prover trained on Olympiad mathematics to undergraduate optimization. The paper identifies interactive distribution shift: textbook data can lower perplexity while teaching tactics that are valid but unproductive in the proof search style learned by the base model. Its abstract says the system combines “large-scale optimization-focused data curation via expert iteration” with “a specialized preference learning objective that integrates perplexity-weighted optimization with a mechanism to penalize valid but non-progressing proof steps.” (Abstract, p. 1).

The evaluation benchmark is OptBench, 400 undergraduate optimization problems from Optlib: 121 basic, 135 convex, and 144 algorithmic problems (Section 5.1, pp. 7–8). Lean is v4.10.0 with LeanDojo v2.1.3; OptProver is a 7B model fine-tuned from BFS-Prover-V2-7B, with best-first step-level search and cumulative Pass@1/Pass@32 budgets (Section 5.2, p. 8). On the full 400-problem benchmark, the EI + PW-UAPO variant reaches 37.75% Pass@1 and 55.25% Pass@32 (Table 2, p. 8). Pass@k is the fraction of benchmark problems solved within k accumulated attempts; the table uses Pass@32/256 for whole-proof models and Pass@1/32 for step-level models (Table 2 caption, p. 8).

## technique: diagnose interactive distribution shift before training

What it is. The authors distinguish static corpus fit from interactive proof utility. Their claim is: “While static evaluation metrics such as perplexity may suggest that a model has been successfully adapted to a new domain, they provide limited guidance for step-level proving, where success is determined by interactive proof search.” (Section 3, p. 3).

Steps from Section 3 (pp. 3–5).

1. Start from a step-level prover whose search policy was learned on a source style, here Olympiad proofs.
2. Collect candidate target-domain state–tactic corpora, including formalized textbooks and verified search traces.
3. Measure sequence perplexity under the source model for each corpus.
4. Fine-tune a controlled baseline on the target corpus and evaluate interactive proof success, not only perplexity.
5. Inspect whether locally valid tactics consume search budget without closing goals and whether source benchmark performance falls.
6. Treat this validity–utility mismatch as an interactive distribution shift and alter data/training accordingly.

Evidence. The Convex Analysis Book has 21,021 state-tactic pairs and average perplexity 3.201; Real Analysis has 22,238 pairs and 2.875; Expert Iteration traces have 121,322 pairs and 2.606 (Table 1, p. 4). Filtering sequences below perplexity 5 slightly mitigates but does not remove catastrophic forgetting on validation benchmarks (Section 3.2, p. 5).

Inference: For Verus, measure model likelihood on Rust proof-state transitions and then verify actual contract-closure success. A low-likelihood crate or solver trace may be useful, while a high-likelihood tactic can be a dead end. The product risk is training on surface syntax that increases the probability of valid but strategically useless proof steps.

## technique: curate verified state–tactic corpora with expert iteration

What it is. OptProver uses search to translate static mathematical knowledge into trajectories in the base model's own tactic language. For each Mathlib theorem T, the current policy searches for a proof and retains only successfully closed trajectories. The paper says: “By filtering for successfully closed proofs, we construct a dataset Dlib consisting exclusively of trajectories that are mathematically correct and discoverable by the model.” (Section 4.1, p. 6).

The corpus combines three sources (Section 4.1, pp. 6–7): Dlib from verified Mathlib searches; Dbook from formalized Convex Analysis and Real Analysis textbooks; and Dpro, nearly 7,000 natural-language analysis and linear-algebra problems translated from DeepTheorem. State–tactic extraction records state s immediately before tactic a so every pair represents a verifiable transition (Section 3.1, p. 4).

Steps.

1. Run the current policy πθk on many Mathlib theorem states using best-first search.
2. Keep only search trajectories that close under Lean's verifier, yielding Dlib.
3. Add verified state–tactic traces from the optimization textbooks, Dbook.
4. Add formalized exercise problems, Dpro, for problem-centric coverage.
5. Update the policy by negative log likelihood on the mixture Dlib ∪ Dbook ∪ Dpro (Equation 5, Section 4.1, p. 7).
6. Re-run search with the updated policy, append newly discovered verified trajectories, and repeat expert iteration.

Inference: In Verus, extract `(proof_state, proof_step)` pairs from contract obligations, loop invariants, and solver feedback. Keep a trajectory only after a clean Verus run in a pinned Rust and dependency environment. The exact Lean search and dataset names do not carry over; the verified-transition principle does.

Evidence. On OptBench, EI alone raises the average score from the BFS-Prover-V2-7B baseline of 13.25% Pass@1 and 32.00% Pass@32 to 28.75% Pass@1 and 50.00% Pass@32 (Table 2, p. 8). These averages are over 400 tasks with the step-level budget described in Table 2; they are not per-step acceptance rates.

## technique: label utility, including valid but stagnant tactics

What it is. The verifier gives each state–tactic pair a utility u(s,a) in {0,1,2}: 2 for a step on a verified closed proof path, 0 for a compilation/runtime error, and 1 for a syntactically valid state transition whose branch exhausts search without resolving the theorem (Section 4.2, pp. 6–7). The intermediate class is the key addition. The paper explains: “These tactics are syntactically valid and successfully modify the proof state, yet lead to subtrees that exhaust the search budget without resolution.” (Section 4.2, p. 6).

Steps from Section 4.2 (pp. 6–7).

1. During self-play search, record every state s, proposed tactic a, and downstream outcome.
2. Label verified-path tactics u=2.
3. Label syntax or runtime failures u=0.
4. Label tactics that compile and change the state but fail to produce a proof within the fixed search budget u=1.
5. For each verified state, mark the successful next tactic as winner a_w.
6. Sample sibling tactics as negatives a_l, including invalid and stagnant branches.
7. Train a preference relation a_w ≻ a_l so the model downweights branches that are valid but inefficient.

The paper's example is a sum inequality where `Finset.sum_add_distrib` is valid but separates terms and creates a dead end (Section 4.2, pp. 6–7). Inference: For Verus, label a proof step as stagnant when Verus accepts the local obligation but the branch cannot close the function's contract within a fixed search/repair budget. This requires a declared budget; “not solved yet” is not a semantic proof of impossibility.

## technique: utility-aware preference optimization (UAPO)

What it is. Construct preference data from self-play search rather than from binary compile success. The winner is the tactic that advances a verified proof; sibling invalid and stagnant branches are losers. This teaches the policy to prefer realized proof efficiency, not merely potential eventual provability.

Steps from Section 4.2 (pp. 6–7).

1. Generate search trees with the current prover.
2. Restrict preference examples to states on a verified proof trajectory.
3. Pair the confirmed next action with sibling actions.
4. Include both compile-error siblings and valid-but-budget-exhausting siblings as rejected actions.
5. Optimize the pairwise preference objective while preserving the source policy as a reference where applicable.

Evidence. On OptBench, standard EI+DPO reaches 52.00% Pass@32 average; EI+UAPO reaches 53.50%; these use the same 400-problem benchmark and step-level Pass@32 budget (Table 2, p. 8). The paper attributes the gain to explicitly accounting for stagnant tactics (Section 5.3, p. 9).

Inference: In Verus, UAPO can prefer invariant steps that measurably reduce unsolved obligations over locally accepted `assert` or solver calls that leave the same hard state. It cannot prove that a branch would never succeed with more budget; the preference is budget-relative.

## technique: perplexity-weighted DPO and PW-UAPO

What it is. Standard preference learning can become unstable when a token has tiny probability under the frozen reference model. OptProver assigns each token y_t a reference-model perplexity PPL_t and a bounded inverse-perplexity weight:

w_t = clip((τ/(PPL_t+ε))^α, δ_min, δ_max)

(Equations 6–7, Section 4.3, p. 7). It uses the normalized weighted sequence log probability in Equation 8 and substitutes this into DPO to form PW-DPO; combining PW-DPO with utility-aware pairs yields PW-UAPO (Section 4.3, pp. 7–8).

Steps.

1. For every preference pair, compute token-level reference probabilities and PPL_t.
2. Choose normalization τ, exponent α, and bounds δ_min/δ_max.
3. Downweight high-perplexity tokens with the clipped inverse-perplexity rule.
4. Compute weighted sequence log probabilities for winner and loser.
5. Apply the DPO pairwise loss to the weighted log-ratio.
6. Use utility-aware winner/loser data to obtain PW-UAPO.

Evidence. On the full OptBench benchmark, EI+PW-DPO reaches 54.25% Pass@32 and EI+PW-UAPO 55.25% Pass@32 (Table 2, p. 8). The τ ablation uses the same full OptBench and reports τ=1.00: 36.00% Pass@1/54.00% Pass@32; τ=1.08 (the median token perplexity): 36.25%/54.25%; τ=2.42 (75th percentile): 32.75%/53.25% (Table 3 caption and table, p. 10). The authors conclude that a large τ weakens suppression of high-perplexity tokens (Section 5.6, p. 10).

Inference: For Verus, weight tokens or proof actions by a pinned reference policy's likelihood only after measuring whether this stabilizes contract closure. Rust identifiers, solver diagnostics, and crate-specific syntax can be out of distribution for benign reasons, so a perplexity penalty should not be treated as a correctness signal.

## technique: benchmark in-domain capability and out-of-domain retention

What it is. OptProver evaluates optimization ability on OptBench and checks catastrophic forgetting on MiniF2F and ProofNet. Whole-proof baselines use Pass@32/256, while step-level models use Pass@1/32 (Table 2 caption, p. 8), so cross-regime comparisons need that denominator distinction.

Steps from Sections 5.1–5.4 (pp. 7–10).

1. Construct a domain benchmark from a fixed library and categorize problems by domain.
2. Pin Lean, LeanDojo, model size, search algorithm, and sampling budget.
3. Compare baseline, EI-only, DPO, UAPO, PW-DPO, and PW-UAPO variants.
4. Report Pass@k with the model regime and k in every table.
5. Evaluate general benchmarks after domain training to detect forgetting.
6. Run parameter ablations and expert-iteration curves to expose diminishing returns.

Evidence. On ProofNet, OptProver improves from 21 to 31 solved problems at Pass@1 and from 42 to 49 at Pass@32; the denominator is the ProofNet test set, not OptBench (Section 5.4, p. 10). On MiniF2F, Pass@32 is unchanged while Pass@1 improves (Section 5.4, p. 10). Expert iteration's largest gain occurs in the first round and later rounds show diminishing returns (Section 5.5, p. 10).

## what remains trusted and what VL should learn

Lean's kernel checks each accepted tactic sequence, but the paper's training data, utility labels, search-budget choice, perplexity implementation, benchmark curation, and model comparison remain experimental infrastructure. The out-of-domain results are evidence for this model and these settings, not a universal guarantee against forgetting.

Inference: The threat to VeruLaw is a prover that emits many locally valid Rust/Verus steps while consuming solver and agent budgets without closing the contract. OptProver's utility class, verified trajectory curation, and separate pass-rate reporting directly address that threat. A second threat is catastrophic forgetting when adaptation to a new crate or API changes tactic priors; a third is misusing perplexity as a proxy for proof value.

Already done. The paper already combines expert iteration, verified state–tactic data, utility-aware pair construction, perplexity-weighted preference learning, domain benchmarks, out-of-domain retention tests, and parameter ablations. VL should not claim these generic methods as new. Inference: A distinct VL contribution would need Rust-specific search states, ownership/concurrency obligations, dependency-upgrade evaluation, or proof-repair evidence beyond this Lean study.

## techniques for the catalog

- interactive distribution diagnosis: compare corpus perplexity with verifier-backed search utility before adapting a prover
- verified expert iteration: repeatedly search, retain closed trajectories, and train on state–tactic pairs in the model's own style
- three-level utility labels: distinguish proven, invalid, and valid-but-stagnant steps
- utility-aware preference learning: prefer winner tactics over invalid and budget-exhausting sibling branches
- perplexity-weighted DPO: clip inverse token perplexity weights before computing preference loss
- combined PW-UAPO: apply perplexity weighting to utility-aware preference pairs
- domain and retention benchmark: measure in-domain Pass@k with correct regime denominators and test out-of-domain forgetting

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
