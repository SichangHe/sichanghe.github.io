# Scaling up Multi-Turn Off-Policy RL and Multi-Agent Tree Search for LLM Step-Provers
(authored by agents unless marked 🧑)
Tag: `xin2025scaling`, [paper](http://arxiv.org/abs/2509.06493v2)
## system and reported results

BFS-Prover-V2 treats Lean tactic proving as a stateful interaction and scales both training and inference. The paper reports 95.08% on the miniF2F test set, 95.49% on miniF2F validation, and 41.4% on ProofNet test for its 32-billion-parameter system with a planner (Section 3, p. 8; Table 1, p. 9). Table 1 also lists the budget and model size for each comparison, so these percentages are benchmark-specific and should not be read as a general proof-success rate. Experiments use Lean v4.10.0 and LeanDojo (Section 3, p. 8).

The system has two coupled parts: multi-stage expert iteration at training time and planner-enhanced multi-agent best-first search at inference time. Its reusable ideas are a step-level Markov model, self-generated proof trajectories, tactic-level data filtering, periodic retraining, hierarchical subgoal decomposition, and a shared cache that stops redundant searches.

## technique 1: step-level proof search as an MDP

What it is. The LLM is an agent, Lean's current tactic state is the environment, and each tactic is an action. “We formulate proof search in Lean4 tactic mode as a multi-turn interaction between an agent and an environment, modeled as a MDP.” (Section 2.1, p. 3).

How to apply it. (1) Represent the state as Lean's hypotheses and current goals. (2) Give the state to the policy. (3) Let the policy emit one tactic string. (4) Submit it to Lean; the compiler deterministically transitions to a new tactic state or returns an error. (5) Assign reward +1 to state-action pairs on a successful proof path and 0 to other pairs. (6) Train a step prover that can react to intermediate compiler states rather than emitting a whole script in one shot.

Verus form (inference). Use a Verus proof state, diagnostics, and unresolved obligations as the environment state, with each emitted Rust/proof edit or lemma invocation as an action. A clean Verus check determines transitions. The reward and state representation must be adapted to Verus; the paper's Lean tactic strings do not transfer.

Evidence and limits. The MDP supports incremental repair and human-like interaction, but the binary +1/0 reward is sparse. The paper addresses this through search-generated trajectories and filtering rather than claiming the MDP alone solves exploration.

## technique 2: expert iteration with best-first tree search

What it is. The current prover searches a large corpus, and successful state-tactic trajectories become training data for the next prover. The paper describes two alternating phases: “Phase 1: Proof Generation” and “Phase 2: Model Refinement” (Section 2.2, p. 3).

How to do it. (1) Start with an expert model and roughly three million autoformalized problems. (2) Run best-first tree search to explore tactic paths. (3) Store each successful proof as state/tactic pairs. The paper reports approximately 10^7 tree searches in one iteration. (4) Fine-tune the model on successful trajectories. (5) Replace the expert with the updated model and repeat. The search supplies examples the model could not generate greedily, while the refined model supplies a stronger policy for the next round.

Verus form (inference). Generate proof trajectories by repeatedly compiling Verus actions, retain only paths ending in a clean verified artifact, and fine-tune a step model on `(obligations, action)` pairs. Cache compiler states and avoid training on paths that rely on disallowed trust escapes. This is an orchestration design inferred from the MDP analogy.

Evidence. Table 1 reports BFS-Prover-V2-32B at 86.1% miniF2F test and 41.4% ProofNet test before planner enhancement, demonstrating that the step-level training pipeline generalizes beyond its high-school-heavy training corpus. The paper does not provide the number of successful trajectories or the fraction of the three million problems solved.

## technique 3: adaptive tactic filtering

What it is. Instead of training on every discovered tactic, the system filters by the model's tactic perplexity. “By selectively training only on the data from this central part of the distribution, we ensure that the model is constantly learning at the edge of its capabilities.” (Section 2.3.1, p. 4).

How to do it. (1) Compute negative log-probability (perplexity) for each successful tactic. (2) Estimate the round's distribution. (3) Remove the low-perplexity tail, which mostly repeats obvious steps. (4) Remove the high-perplexity tail, which the authors associate with noisy or unnecessarily complex tactics. (5) Train on the central “Goldilocks” region. (6) Recompute the distribution every round, so the curriculum follows the current model rather than a fixed difficulty label.

Verus form (inference). Score each generated Verus edit under the current policy and retain middle-uncertainty verified edits. Low-perplexity boilerplate can be downweighted; high-perplexity edits should be inspected for accidental `assume`, overbroad triggers, or brittle automation before inclusion. The filtering statistic is independent of Verus syntax.

Evidence and limits. The paper presents this as an automated curriculum that prevents overfitting and mode collapse, but Figure 2 is descriptive and does not isolate a separate ablation percentage for filtering. Inference: The paper’s interpretation that high-perplexity tactics are often noisy is an empirical assumption that may fail when a genuinely novel tactic is rare.

## technique 4: periodic retraining as a soft reset

What it is. When expert iteration plateaus, the system re-synthesizes and aggressively curates data, then retrains from a base checkpoint. The procedure has three explicit steps: “1. Re-synthesis and De-noise”; “2. Aggressive Data Curation”; and “3. Retrain from a base Checkpoint” (Section 2.3.2, pp. 5–6).

How to do it. (1) Use the current best prover to re-solve all previously encountered problems, replacing old proofs with shorter or cleaner ones where possible. (2) Apply stronger tactic-level perplexity filtering to the new corpus. (3) Discard the old training set and initialize from the general pretrained checkpoint. (4) Train on the compact curated set. (5) Return the reset model to expert iteration; tolerate a temporary benchmark drop while exploration recovers and surpasses the old peak.

Verus form (inference). Re-run the strongest Verus prover over prior obligations, retain clean proofs with explicit trust metadata, curate by uncertainty and proof quality, and retrain from a base model when repair style saturates. A reset cannot fix an incorrect specification or a verifier bug.

Evidence. Figure 3 shows repeated performance jumps after retraining, but the paper does not state a per-reset table with denominators. The claim is therefore a trend shown in the plotted miniF2F curve, not a separately quantified causal effect.

## technique 5: planner-prover decomposition with dynamic replanning

What it is. A general reasoning model proposes intermediate Lean `have` subgoals; a specialized prover solves each with best-first search. “This division of labor mirrors the cognitive workflow of a human mathematician, who might first sketch out the high-level structure of a proof by identifying key lemmas.” (Section 2.4.1, p. 7).

How to do it. (1) Query the Planner with the main theorem and request a list of subgoals. (2) Put them in a queue as Lean `have` statements. (3) Prove the first subgoal with the Prover's tree search. (4) Add a proven subgoal to the main context as a known fact. (5) Continue sequentially. (6) If a subgoal exceeds its budget, query the Planner again with the original theorem plus all already-proven subgoals. (7) Replace or refine the remaining plan and continue until all subgoals and the final theorem are proved (Section 2.4.2, p. 7).

Verus form (inference). Use a planner to propose Verus lemma statements, prove them as `proof fn`s, and add their `ensures` facts to the context. Replanning can be triggered by verifier diagnostics or timeout. The planner must not be allowed to treat an unverified lemma as a fact.

Evidence. With Planner, BFS-Prover-V2-32B reaches 95.1% miniF2F test and 95.5% validation in Table 1, compared with 86.1% test without planner. The comparison uses the table's accumulative search budget; it does not report a matched cost or wall-clock denominator, so the gain is not a cost-normalized claim.

## technique 6: focused parallelism and shared subgoal cache

What it is. Multiple Prover agents all work on one active subgoal, and a shared cache tracks status and proof. “As soon as the first agent finds a valid proof, the subgoal cache records the proof and signals all other agents to terminate their searches.” (Section 2.4.3, p. 8).

How to do it. (1) Store the Planner's ordered subgoals in a shared cache with Pending, Proving, and Proven states. (2) Select the first unresolved subgoal. (3) Launch multiple independent BFS searches on that same subgoal. (4) On the first valid proof, atomically record it and cancel the other searches. (5) Use the proof to augment the context and activate the next subgoal. (6) If no proof arrives within budget, invoke dynamic replanning instead of distributing agents across later subgoals that may become invalid.

Verus form (inference). A coordinator can maintain a cache keyed by normalized Verus obligation and commit the first clean verification result. Cancellation and atomic status updates belong in the orchestration service. Cache entries must include compiler version, crate revision, and trust policy to avoid reusing stale proofs.

Evidence and limits. The architecture reduces duplicate work by construction, but the paper gives no isolated cache ablation or wall-clock speedup. Focused parallelism may leave independent subgoals idle; the authors choose it to avoid wasted work when an earlier subgoal causes a replan.

## trust, measurements, and product implications

Lean's compiler and kernel validate tactic transitions and final proof terms. LeanDojo, autoformalized training data, planner outputs, best-first search, and benchmark scripts remain trusted components. Reported benchmark percentages measure solved benchmark statements under the listed model, search budget, and Lean version. Inference: For VL, the most valuable transfer is the planner–prover split plus a verifier-backed shared cache, combined with periodic data curation when the repair policy plateaus. Inference: this is a material threat to a product that uses one-shot Rust generation because it scales search, decomposition, and training around the verifier. Inference: it does not by itself solve specification correctness, trusted-code policy, or Rust-specific ownership and concurrency obligations.

## techniques for the catalog

- step-level MDP proving — model verifier states as environments and tactic or proof edits as actions with compiler transitions
- expert iteration with best-first search — turn successful tree-search trajectories into training data for the next prover
- adaptive tactic filtering — train on middle-perplexity verified steps while dropping obvious and noisy tails
- periodic soft-reset retraining — re-solve, aggressively curate, and retrain from a base checkpoint after plateaus
- planner-prover replanning — decompose a theorem into verified subgoals and revise the plan after stuck subgoals
- focused parallelism with cache — run parallel agents on one subgoal and commit the first valid proof in a shared status cache
Checked 2026-10-13: audit record xin2025scaling; paper-study comparison complete; gate executed; experiments not rerun
