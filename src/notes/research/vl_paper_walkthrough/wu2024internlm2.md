# InternLM2.5-StepProver: Advancing Automated Theorem Proving via Critic-Guided Search
(authored by agents unless marked 🧑)
Tag: `wu2024internlm2`, [paper](http://arxiv.org/abs/2410.15700v2)

## scope and result

InternLM2.5-StepProver searches Lean 4 proofs one tactic at a time. It adds a critic model that scores intermediate proof states, then uses the score to choose which state to expand. The abstract reports that critic guidance raises miniF2F performance from 59.4% to 65.6% without vanilla best-first search and to 65.9% when combined with it (Abstract, p.1). A pass rate here means the Lean checker accepts a complete proof under the benchmark's formalization; it is not a guarantee about informal mathematics or software requirements.

## technique 1: critic-guided state expansion

Use this when a tactic prover can produce many valid next tactics but token likelihood is a poor guide to deep proofs. The paper's critic is a function V(s)→R over a Lean proof state (§2.1, p.2). At each iteration: (1) maintain all unexpanded states; (2) query V on each; (3) choose the highest-scoring state; (4) ask the prover to sample S tactics; (5) execute each valid tactic in Lean to create child states; (6) repeat until a state has no goals or the budget is exhausted. The critic score, rather than average tactic log probability, determines expansion priority. The paper says, “Critic-Guided Search employs a critic model to re-rank states, enabling more informed state expansion decisions.” (Figure 1 caption, p.2)

Train V with preference pairs rather than binary solved/unsolved labels. Path pairs use a successful proof path: a child closer to no goals is positive and its parent is negative. Sibling pairs use a successful-path child as positive and a sibling that did not lead to a proof as negative (§2.1, pp.2–3). The authors explicitly assume that “any legal tactic on a successful path toward no goals yields a positive reward” (§2.1, p.2); this is a heuristic assumption, not a theorem.

Verus form (inference): encode a Rust verification state as the current function, hypotheses, and unsolved proof obligations. A critic can rank candidate proof states; a Driver model emits Verus proof steps, and `verus` validates each resulting program. The checker, rather than the critic, decides acceptance. Verus does not expose Lean tactic states, so this requires an external orchestrator and a state serializer. Use only documented constructs such as `requires`, `ensures`, `invariant`, `proof fn`, and `assert`.

Evidence: with 7B models and search budget S=32, K=600, T=0.7, critic-guided search obtains 65.6% miniF2F-test at 256×32×600, versus 59.4% for best-first at the same budget; hybrid BF+CG obtains 65.9% (Table 1, p.5). On ProofNet, CG reaches 23.9% and BF+CG 27.0% overall at the listed budgets (Table 2, p.6). These denominators are benchmark problems under each pass configuration, not model confidence.

## technique 2: hybrid best-first plus critic search

Use both heuristics because critic guidance can miss easy proofs at low budgets while likelihood can solve trivial cases. Split the search budget between BF, which ranks by tactic log likelihood, and CG, which ranks by V, then union their solved results. In the paper, BF+CG “equally distributes search budgets on two methods” (Table 1 setup, p.5). The hybrid reaches 69.6% miniF2F-valid and 65.9% miniF2F-test at 256×32×600, while CG alone reaches 68.4% and 65.6% (Table 1, p.5). On ProofNet, BF solves 22.3%, CG 23.9%, and their combination 27.0% (p.6). The sets of solved problems differ, so union coverage explains the gain.

Verus form (inference): run two queues of candidate Rust proofs, one ranked by model likelihood and one by a critic trained on proof-state outcomes. Deduplicate candidates by normalized source or proof state and run Verus on each. Keep a strict budget so speculative search cannot consume unbounded product resources.

## technique 3: bootstrapped expert iteration

Use expert iteration to improve both prover and critic from successful searches. Initialize from miniF2F-train, mathlib, Lean-Workbook, and Lean-Github states. Sample K trajectories per theorem, collect successful trajectories, derive preference pairs, and train the prover and critic. Search Lean-workbook-plus repeatedly, remove solved problems and their negated statements, and increase the budget from 10 iterations/50 seconds per problem to at most 2,000 iterations/3,600 seconds (§2.2, p.3). After each round, retrain on expanded successful trajectories; then use the critic to rank unproven statements and focus the next round on the top 50% (§2.2, p.3). Stop initialization when CG exceeds vanilla BF on miniF2F-train.

The paper reports more than 20,000 CPU hours for training and about 21,364 CPU days over the complete expert iteration process (§3, p.4; §3.2, p.6). Lean-workbook-plus ends with 14,075 of its problems proved or disproved (17.0%), using 331 CPU days (1.5% of resources); 68,200 (83.0%) remain unproven and consume 21,033 CPU days (98.5%) (Tables 3–4, p.6). These denominators and resource fractions are explicitly reported; the 17.0% is not a success rate on all theorem-proving tasks.

Verus form (inference): collect verified Rust/proof trajectories only after `verus` succeeds, pair states by later proof success, retrain the generator and a state critic, and rescore unresolved obligations. Remove solved obligations from the active queue but retain negative or failed examples for calibration. This could teach repair patterns, but the trusted contract and proof checker remain outside the learned policy.

## technique 4: proof-context prompt

Use previous tactics as explicit context for deep search. The standard prompt supplies declaration, goal, and next tactic. StepProver adds a `PROOF_BEFORE` field containing tactics leading to the current state, alongside `STATE_BEFORE`; Figure 2 shows a divisibility theorem prompt with `rw [h, pow_two]` and a proposed next tactic (p.3). This preserves local proof history that would otherwise be lost when states are serialized.

Verus form (inference): include prior `assert`, lemma calls, invariant openings, and the current failed obligation in the proof-generation prompt. Preserve exact source and diagnostics; do not ask a model to invent a Verus construct absent from the project language reference.

## what is proved, trusted, and missing

Lean's kernel checks accepted proofs; the paper's model, search code, benchmark formalizations, auto-formalization pipeline, and theorem statements remain trusted inputs. The paper notes that auto-formalized propositions may be incorrect and includes negated statements to expose inherently unprovable cases (§2.2, p.3). Critic preferences are heuristics and can be wrong. Search cost is severe: 83% of Lean-workbook-plus problems remain unproven after the reported iteration, and longer searches face state-space explosion (§3.2, p.6).

Inference: threat to VeruLaw is moderate. Critic ranking and expert iteration directly suggest a queue for failed Verus obligations, but Lean tactics and Verus proof functions differ. The reported gains come from a specific 7B model, Lean 4.7.0 adaptations, corrected benchmark formalizations, and large CPU budgets; they do not establish that agent-written Rust will verify reliably. VL should reuse the checker-gated trajectory collection and explicit resource accounting, while independently validating contracts and dependency assumptions.

## techniques for the catalog

- critic-guided state expansion — score intermediate proof states with a learned critic and expand the highest-value state
- hybrid search — combine likelihood-ranked best-first search with critic-ranked search to cover complementary proof regions
- bootstrapped expert iteration — retrain prover and critic on successful verified trajectories over repeated search rounds
- proof-context prompting — include the tactics leading to the current state when proposing the next proof step
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
