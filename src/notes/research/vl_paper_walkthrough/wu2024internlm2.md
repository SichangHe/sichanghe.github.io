# InternLM2.5-StepProver: Advancing Automated Theorem Proving via Critic-Guided Search
(authored by agents unless marked 🧑)
Tag: `wu2024internlm2`, [paper](http://arxiv.org/abs/2410.15700v2)

## scope and result

InternLM2.5-StepProver searches Lean 4 proofs one tactic at a time. It adds a critic model that scores intermediate proof states, then uses the score to choose which state to expand. The introduction reports that critic guidance raises miniF2F performance from 59.4% to 65.6% without vanilla best-first search and to 65.9% when combined with it (§1, p.2; Table 1, p.5). The abstract reports only the combined gain: “The trained InternLM2.5-StepProver critic significantly boosts the performance of the prover model (59.4% → 65.9%).” The supplied version is arXiv:2410.15700v2, dated 21 October 2025, and identifies its publication as PMLR 267, 2025 (p.1). Inference: a benchmark pass rate concerns the formalized statements, so it does not establish correctness of informal mathematics or software requirements.

## technique 1: critic-guided state expansion

Use this when a tactic prover can produce many valid next tactics but token likelihood is a poor guide to deep proofs. The paper's critic is a function V(s)→R over a Lean proof state (§2.1, p.2). Maintain unexpanded states, use the critic to select a state for expansion, ask the prover for candidate tactics, and execute valid tactics to create child states. Repeat until no goals remain or the search budget is exhausted (§2.1, p.2). The critic score, rather than average tactic log probability, determines expansion priority. The paper says, “Right: Critic-Guided search employs a critic model to re-rank states, enabling more informed state expansion decisions.” (Figure 1 caption, p.3)

Train V with preference pairs rather than binary solved/unsolved labels. Path pairs use a successful proof path: a later state closer to no goals is positive and an earlier state is negative; the stated comparison is V(s_t) < V(s_{t+Δ}). Sibling pairs use a successful-path child as positive and a sibling that did not lead to a proof as negative (§2.1, pp.2–3). The authors explicitly assume that “any legal tactic on a successful path toward no goals yields a positive reward” (§2.1, p.2); Inference: this preference is a training heuristic rather than a proved property of search difficulty.

Inference: a possible Verus adaptation would encode the current program and unresolved obligations for a critic, use its score to prioritize candidate proof edits, and accept a candidate only after Verus verifies it. The paper does not implement or evaluate this adaptation.

Evidence: with a 7B prover, S=32, K=600, and temperature T=0.7, critic-guided search obtains 65.6% miniF2F-test at 256×32×600, versus 59.4% for best-first at the same budget; hybrid BF+CG obtains 65.9% (Table 1, p.5). On ProofNet, CG reaches 23.9% overall at 128×32×600 and BF+CG reaches 27.0% at 256×32×600 (Table 2, p.7). These are pass rates over benchmark problems.

## technique 2: hybrid best-first plus critic search

Use both heuristics because critic guidance can miss easy proofs at low budgets while likelihood can solve trivial cases. Split the search budget between BF, which ranks by tactic log likelihood, and CG, which ranks by V, then union their solved results. For miniF2F, the paper says, “In a BF+CG scenario, the computation budgets are equally distributed.” (§3.1, p.5). The hybrid reaches 69.6% miniF2F-valid and 65.9% miniF2F-test at 256×32×600, while CG alone reaches 68.4% and 65.6% (Table 1, p.5). On ProofNet, BF solves 22.3% and CG 23.9% at 128×32×600 each; their combination solves 27.0% at 256×32×600 (Table 2, p.7). Inference: the combined result indicates complementary coverage, but this ProofNet comparison gives the combination twice the total passes of either individual method.

Inference: a Verus adaptation could split a fixed search budget between candidates ranked by model likelihood and candidates ranked by a critic, accepting the union of verified results.

## technique 3: bootstrapped expert iteration

Use expert iteration to improve both prover and critic from successful searches. Initialize from miniF2F-train, mathlib, Lean-Workbook, and Lean-Github states. Sample K trajectories per theorem and derive preference pairs from successful search trajectories. The conclusion describes improving the prover and critic together by fine-tuning on correct proof trajectories (§5, p.8). Because auto-formalized propositions may be incorrect, the dataset includes each proposition and its negation. Scan Lean-workbook-plus with at most 10 iterations and 50 seconds per problem, add discovered proofs to training, and remove solved problems together with their negated statements. Repeat with increasing budgets, up to 2,000 iterations and 3,600 seconds per problem. Continue searching problems whose found proofs contain irrelevant steps with high CPU consumption, aiming for shorter proofs (§2.2, p.3). After each round, retrain on expanded successful trajectories; then use the critic to rank unproven statements and focus the next round on the top 50% (§2.2, p.3). Stop initialization when CG exceeds vanilla BF on miniF2F-train: “The process terminates when the critic-guided search method achieves performance superior to that of standard (vanilla) methods on the miniF2F-train benchmark, which serves as an indicator that the critic model is stabilized.” (§2.2, p.3). Appendix A instead lists miniF2F-valid, Mathlib, and Lean-Workbook-Plus as critic-pair sources; this differs from the bootstrapping description (p.11).

The resource units conflict: §3 says “more than 20000 CPU hours of expert iteration” (p.4), whereas §3.2 says “approximately 21,364 CPU days are consumed throughout the entire expert iteration process” (p.6). Table 4 totals 21,364 CPU days (p.7); the paper does not explain the discrepancy. Lean-workbook-plus ends with 14,075 of its problems proved or disproved (17.0%), using 331 CPU days (1.5% of resources); 68,200 (83.0%) remain unproven and consume 21,033 CPU days (98.5%) (Tables 3–4, p.7). Table 3 separates the solved total into 10,880 proved (13.1%) and 3,195 disproved (3.9%). Inference: these percentages describe this auto-formalized dataset and do not establish a general theorem-proving success rate.

Inference: a Verus adaptation could collect verified proof-edit trajectories, derive preferences from successful paths and unsuccessful siblings, retrain the generator and critic, and prioritize unresolved obligations. The paper supplies no Verus results for this proposal.

## technique 4: proof-context prompt

Use previous tactics as explicit context for deep search. The standard prompt supplies declaration, goal, and next tactic. StepProver adds a `PROOF_BEFORE` field containing tactics leading to the current state, alongside `STATE_BEFORE`; Figure 2 shows a divisibility theorem prompt with `rw [h, pow_two]` and a proposed next tactic (p.4). The authors explain: “Hoping to improve the reasoning performance in deep search trees, we augment our prompt template with ongoing proof context.” (§2.2, p.4).

Inference: a Verus prompt could likewise include prior proof edits, the current program, and verification diagnostics. The paper does not isolate the effect of proof-context prompting in an ablation.

## what is proved, trusted, and missing

The paper describes “correct proof trajectories that the prover model samples and verifies using the Lean solver” (§5, p.8). Inference: the learned models propose and prioritize candidates; verification establishes the formal statement, while correspondence to the intended informal problem still depends on the formalization. The paper notes that auto-formalized propositions may be incorrect and includes negated statements to expose inherently unprovable cases (§2.2, p.3). Critic preferences are heuristics and can be wrong. Search cost is severe: 83% of Lean-workbook-plus problems remain unproven after the reported iteration, and the paper discusses search-space explosion (§3.2, pp.6–7). The authors also state: “Besides, we currently do not have a stable metric to measure critic models, which makes iteration of critic models difficult.” (Limitations, p.8). Appendix A reports 78.0% accuracy on 6,510 preference pairs generated on miniF2F-test (p.11); this pair-ranking metric is distinct from benchmark proof success.

## techniques for the catalog

- critic-guided state expansion — score intermediate proof states with a learned critic and expand the highest-value state
- hybrid search — combine likelihood-ranked best-first search with critic-ranked search to cover complementary proof regions
- bootstrapped expert iteration — retrain prover and critic on successful verified trajectories over repeated search rounds
- proof-context prompting — include the tactics leading to the current state when proposing the next proof step
