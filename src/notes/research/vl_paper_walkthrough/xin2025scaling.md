# Scaling up Multi-Turn Off-Policy RL and Multi-Agent Tree Search for LLM Step-Provers
(authored by agents unless marked 🧑)
Tag: `xin2025scaling`, [paper](http://arxiv.org/abs/2509.06493v2)
## system and reported results

BFS-Prover-V2 treats Lean tactic proving as a stateful interaction and scales both training and inference. The paper reports 95.08% on miniF2F test and 95.49% on miniF2F validation with planner enhancement (Section 3, pp. 8–9). Table 1 (p. 9) places 41.4% on ProofNet test in the BFS-Prover-V2-32B row without planner enhancement; its planner row leaves ProofNet blank. That table gives 86.1% miniF2F test and 85.5% validation without the planner, versus rounded scores of 95.1% and 95.5% with it. The V2 rows use an “accumulative” budget without a numerical total. Inference: these results do not establish success rates outside those benchmarks. Experiments use Lean v4.10.0 and LeanDojo (Section 3, p. 8).

The system has two coupled parts: multi-stage expert iteration at training time and planner-enhanced multi-agent best-first search at inference time. The components described in Sections 2.1–2.4 (pp. 3–8) are a step-level Markov model, self-generated proof trajectories, tactic-level data filtering, periodic retraining, hierarchical subgoal decomposition, and a shared cache that stops other searches after a proof is found.

## technique 1: step-level proof search as an MDP

What it is. The LLM is the agent, the Lean compiler with its current tactic state is the environment, and each tactic is an action. “We formulate proof search in Lean4 tactic mode as a multi-turn interaction between an agent and an environment, modeled as a MDP.” (Section 2.1, p. 3).

How to apply it. (1) Represent the state as Lean's hypotheses and current goals. (2) Give the state to the policy. (3) Let the policy emit one tactic string. (4) Submit it to Lean; the compiler deterministically transitions to a new tactic state or returns an error. (5) Assign reward +1 to state-action pairs on a successful proof path and 0 to other pairs. (6) Train a step prover that can react to intermediate compiler states rather than emitting a whole script in one shot.

Verus form. Inference: Use a Verus proof state, diagnostics, and unresolved obligations as the environment state, with each emitted Rust/proof edit or lemma invocation as an action. A clean Verus check determines transitions. The reward and state representation must be adapted to Verus; the paper's Lean tactic strings do not transfer.

Evidence and limits. Section 2.1 (p. 3) states: “Our MDP-based approach, by design, trains an agent that functions as a genuine Lean copilot, suggesting the next logical tactic at any point in the proof process [39].” Inference: this formulation makes intermediate states available to the policy, but does not alone establish reliable repair or successful exploration.

## technique 2: expert iteration with best-first tree search

What it is. The current prover searches a large corpus, and successful state-tactic trajectories become training data for the next prover. The paper describes two alternating phases: “Phase 1: Proof Generation” and “Phase 2: Model Refinement” (Section 2.2, p. 3).

How to do it. (1) Start with an expert model and roughly three million autoformalized problems. (2) Run best-first tree search to explore tactic paths. (3) Store each successful proof as state/tactic pairs. The paper reports approximately 10^7 tree searches in one iteration. (4) Fine-tune the model on successful trajectories. (5) Replace the expert with the updated model and repeat. Section 2.2 (p. 3) says: “This combination of a neural policy and systematic search allows the system to find proofs for problems that would be intractable for the model alone.”

Verus form. Inference: Generate proof trajectories by repeatedly compiling Verus actions, retain only paths ending in a clean verified artifact, and fine-tune a step model on `(obligations, action)` pairs. Cache compiler states and avoid training on paths that rely on disallowed trust escapes. This is an orchestration design inferred from the MDP analogy.

Evidence. Table 1 reports BFS-Prover-V2-32B at 86.1% miniF2F test and 41.4% ProofNet test before planner enhancement, and Section 3 (p. 9) interprets the ProofNet result as generalization from a corpus consisting mainly of high-school competition problems to undergraduate problems. The paper does not provide the number of successful trajectories or the fraction of the three million problems solved.

## technique 3: adaptive tactic filtering

What it is. Instead of training on every discovered tactic, the system filters by the model's tactic perplexity. “By selectively training only on the data from this central part of the distribution, we ensure that the model is constantly learning at the edge of its capabilities.” (Section 2.3.1, p. 4).

How to do it. (1) Compute the tactic score that the paper calls “perplexity (negative log-probability)” (Section 2.3.1, p. 4). Inference: this terminology should not be confused with the conventional definition of perplexity as exponentiated mean negative log-probability. (2) Estimate the round's distribution. (3) Remove the low-perplexity tail, which mostly repeats obvious steps. (4) Remove the high-perplexity tail, which the authors associate with noisy or unnecessarily complex tactics. (5) Train on the central “goldilocks” region. (6) Recompute the distribution every round, so the curriculum follows the current model rather than a fixed difficulty label.

Verus form. Inference: Score each generated Verus edit under the current policy and retain middle-uncertainty verified edits. Low-perplexity boilerplate can be downweighted; high-perplexity edits should be inspected for accidental `assume`, overbroad triggers, or brittle automation before inclusion. The filtering statistic is independent of Verus syntax.

Evidence and limits. Section 2.3 (pp. 3–4) motivates filtering and retraining by stagnation and mode collapse; Figure 2 (p. 5) illustrates removal of both tails, labeled 10% low and high. The paper provides no separate filtering ablation percentage. Inference: The paper’s interpretation that high-perplexity tactics are often noisy is an empirical assumption that may fail when a genuinely novel tactic is rare.

## technique 4: periodic retraining as a soft reset

What it is. When expert iteration plateaus, the system re-synthesizes and aggressively curates data, then retrains from a base checkpoint. Section 2.3.2 (p. 5) names three steps: “Re-synthesis and De-noise”, “Aggressive Data Curation”, and “Retrain from a base Checkpoint”.

How to do it (Section 2.3.2, pp. 5–6). (1) Use the current best prover to re-solve all previously encountered problems, replacing old proofs with shorter or cleaner ones where possible. (2) Apply stronger tactic-level perplexity filtering to the new corpus. (3) Discard the old training set and initialize from the general pretrained checkpoint. (4) Train on the compact curated set. (5) Return the reset model to expert iteration; tolerate a temporary benchmark drop while exploration recovers and surpasses the old peak.

Verus form. Inference: Re-run the strongest Verus prover over prior obligations, retain clean proofs with explicit trust metadata, curate by uncertainty and proof quality, and retrain from a base model when repair style saturates. A reset cannot fix an incorrect specification or a verifier bug.

Evidence. Figure 3 shows repeated performance jumps after retraining, but the paper does not state a per-reset table with denominators. Inference: that plotted trend does not isolate the causal contribution of each reset. Section 3 (p. 8) also triggers base-model retraining when a round yields a very large amount of new data. It specifies one epoch for continuous fine-tuning, three for retraining, and a global batch size of 1024 for both.

## technique 5: planner-prover decomposition with dynamic replanning

What it is. A general reasoning model proposes intermediate Lean `have` subgoals; a specialized prover solves each with best-first search. “It receives one subgoal at a time from the Planner and uses its learned policy, in conjunction with BFS [36], to find a formal proof for that specific subgoal.” (Section 2.4.1, p. 6). Section 3 (p. 8) identifies Gemini2.5-Pro as the Planner and gives Prover search settings: temperature 1.3, expansion width 3, and length normalization factor 2.0.

How to do it. (1) Query the Planner with the main theorem and request a list of subgoals. (2) Put them in a queue as Lean `have` statements. (3) Prove the first subgoal with the Prover's tree search. (4) Add a proven subgoal to the main context as a known fact. (5) Continue sequentially. (6) If a subgoal exceeds its budget, query the Planner again with the original theorem plus all already-proven subgoals. (7) Refine the remaining plan and continue (Section 2.4.2, p. 7). Appendix C.2 (p. 32) requires replanning to preserve the wording, order, and placement of already-proven subgoals and insert new `have` statements immediately after them; plans omit proofs. Inference: this procedure does not guarantee completion.

Verus form. Inference: Use a planner to propose Verus lemma statements, prove them as `proof fn`s, and add their `ensures` facts to the context. Replanning can be triggered by verifier diagnostics or timeout. The planner must not be allowed to treat an unverified lemma as a fact.

Evidence. With Planner, BFS-Prover-V2-32B reaches 95.1% miniF2F test and 95.5% validation in Table 1, compared with 86.1% test without planner. The comparison uses the table's accumulative search budget without a numerical total or matched wall-clock cost. Inference: the gain cannot be interpreted as cost-normalized. Appendix B (p. 23) gives one replanning example: “Without dynamic replanning, the prover gets stuck at h_y_is_sinusoid, failing to complete the proof even after 7,200 attempts. With dynamic replanning, however, the system successfully completes the proof in just 800 attempts.” These are counts for `imo_1969_p2`, not an aggregate speedup.

## technique 6: focused parallelism and shared subgoal cache

What it is. Multiple Prover agents all work on one active subgoal, and a shared cache tracks status and proof. “As soon as the first agent finds a valid proof, the subgoal cache records the proof and signals all other agents to terminate their searches.” (Section 2.4.3, p. 8).

How to do it. (1) Store the Planner's ordered subgoals in a shared cache with Pending, Proving, and Proven states. (2) Select the first unresolved subgoal. (3) Launch multiple independent BFS searches on that same subgoal. (4) On the first valid proof, record it and signal the other searches to terminate. Inference: atomic recording would be an implementation choice; the paper does not specify synchronization primitives. (5) Use the proof to augment the context and activate the next subgoal. (6) If no proof arrives within budget, invoke dynamic replanning instead of distributing agents across later subgoals that may become invalid.

Verus form. Inference: A coordinator can maintain a cache keyed by normalized Verus obligation and commit the first clean verification result. Cancellation and atomic status updates belong in the orchestration service. Cache entries must include compiler version, crate revision, and trust policy to avoid reusing stale proofs.

Evidence and limits. Section 2.4.3 (p. 8) says: “Furthermore, this sequential method ensures computational efficiency by preventing agents from wasting resources on later subgoals that would be rendered invalid if an earlier step fails and triggers a replan.” The paper gives no isolated cache ablation or aggregate wall-clock speedup. Inference: cancellation reduces work after a proof is found, but parallel searches can still overlap before then.

## trust, measurements, and product implications

Section 2.1 (p. 3) assigns tactic execution and transition feedback to the Lean compiler. Appendix C.1 (pp. 27–29) uses compiler feedback to repair autoformalized statements and explicitly permits `sorry` to skip their proofs during statement generation. Inference: compilation does not establish semantic equivalence to the original mathematics; generating candidate statements and plans should be distinguished from validating final proofs. The paper does not audit the full trust boundary or validate a Verus implementation. Inference: VL could reuse planner–prover decomposition and a verifier-backed cache, with periodic data curation when training plateaus. Whether these improve VL requires evaluation; they do not establish specification correctness or address Rust-specific ownership and concurrency obligations.

## techniques for the catalog

- step-level MDP proving — use compiler tactic states as states, tactics as actions, and the compiler as the environment
- expert iteration with best-first search — turn successful tree-search trajectories into training data for the next prover
- adaptive tactic filtering — train on middle-perplexity verified steps while dropping obvious and noisy tails
- periodic soft-reset retraining — re-solve, aggressively curate, and retrain from a base checkpoint after plateaus
- planner-prover replanning — decompose a theorem into verified subgoals and revise the plan after stuck subgoals
- focused parallelism with cache — run parallel agents on one subgoal and commit the first valid proof in a shared status cache
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "It directly invokes the corresponding theorem from Mathlib, Real.geom_mean_le_arith_mean, demonstrating an ability to leverage high-level library theorems for a more insightful and efficient proof."): checked all paper text, study quotations, numbers, section/page references, technique steps, tag, and arXiv identifier; corrected the ProofNet planner attribution, environment definition, truncated quotation, retraining and replanning details, and unsupported trust claims; marked Verus adaptations and other conclusions as Inference; did not reproduce experiments, inspect code or external sources, or compile the example proofs.
