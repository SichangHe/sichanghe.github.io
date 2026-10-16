# Enhancing Neural Theorem Proving through Data Augmentation and Dynamic Sampling Method
(authored by agents unless marked 🧑)
Tag: `vishwakarma2023enhancing`, [paper](http://arxiv.org/abs/2312.14188v2)

## what the paper builds and measures

Vishwakarma and Mishra introduce DS-Prover for Lean 3. A ByT5-Small model proposes tactics, LeanDojo applies them to the current goal, and a best-first proof-search tree keeps open goals ordered by cumulative tactic log probability (Sections 1 and 4.3, pp. 1, 6). The abstract states, “This method dynamically determines the number of tactics to apply to expand the current goal, taking into account the remaining time compared to the total allocated time for proving a theorem.” (Abstract, p. 1). The second contribution augments training data by splitting multi-premise rewrite and simplification tactics into single-premise tactics. The paper describes its training objective as “The training objective over here is to generate a tactic for the given goal.” (Section 4.2, p. 5)

The training source is Mathlib at commit `d11f435d4e34a6cea0a1797d6b625b0c170be845`; its 98,508 theorems are randomly divided into 96,508 train, 1,000 validation, and 1,000 test theorems (Section 3.2, p. 4). The original extraction contains 212,840 goal–tactic pairs. Rewrite decomposition adds 41,036 pairs; simplification decomposition adds 102,682 unique pairs (Section 3.2.1 and Section 3.3, pp. 4–5). The model has 300M trainable parameters, 12 encoder layers, and 4 decoder layers, and consumes raw UTF-8 bytes (Section 4.1, p. 5).

Evaluation uses a ten-minute limit. MiniF2F has 245 test and 244 validation statements, ProofNet has 374 Lean 3 statements, and the authors evaluate 500 of the 1,000 Mathlib test theorems because of resource limits (Section 5.2, p. 8). Table 1 reports Pass@1 for the stated test denominators: augmented data plus DS-Prover and optimized LeanDojo reaches 29.8% on MiniF2F (245 test problems), 14.2% on ProofNet (374), and 58.8% on the 500-problem Mathlib subset. The cumulative union across methods is 31.4%, 15.7%, and 63.4%, respectively (Table 1, p. 8). The paper compares 29.8% against a previously reported 29.6% MiniF2F Pass@1, but says previous systems were not rerun because of their computational requirements (Section 5.3, p. 9).

Inference: The results show that data shaping and search scheduling can improve a tactic generator without adding a retrieval model or value network. They do not show that the same percentages transfer to Verus or Rust programs.

## technique: decompose multi-premise tactics into training examples

Use this when the prover has few examples of individual lemma names or when a model tends to emit long premise lists that are hard to learn. The paper’s procedure is:

1. Identify rewrite tactics with ordered premise lists (`rw`, `erw`, `rwa`, `equiv rw`, and `assoc rw`)
2. Replace `rw [p1, ..., pn]` by the ordered sequence `rw [p1]; ...; rw [pn]`, including variants applied at a hypothesis
3. Identify simplification tactics (`simp`, `dsimp`, `simpa`, `simp rw`) whose premises are unordered
4. Apply candidate single-premise tactics one by one to the original goal with LeanDojo
5. Keep a goal–tactic pair when the candidate succeeds
6. Continue on the subgoals produced by the first successful candidate, removing used tactics from the remaining list
7. Retain the original Mathlib pairs as well as generated pairs, so the augmented model sees both long and short forms

The paper gives a concrete chain: `rw [h1, h2]` becomes `rw [h1]`, then `rw [h2]`, leaving the goal that can be closed by `assumption` (Section 3.3, p. 5). Appendix Table 3 enumerates variants such as `rw [p1, ..., pn] at h1`, `simp only [p1, ..., pn]`, and `simpa [p1, ..., pn]` (Appendix A.1, p. 15). For simplifiers, the authors explicitly warn that order is not fixed and applicability must be checked by the prover; this is why generated examples are not a blind textual split.

Inference: A Verus analogue would mine verified Rust proof blocks and split sequences of `assert`, `assert forall`, `lemma` calls, and invariant-strengthening steps into smaller goal–proof-action examples, but only when Verus rechecks each intermediate state. Rust and Verus do not have Lean’s `rw`/`simp` syntax, so the decomposition rule must be defined for actual Verus constructs rather than copied. The paper does not test this transfer.

The measured effect is tied to the full pipeline. On MiniF2F, optimized LeanDojo with original data gives 28.6%, while the same interface with augmented data gives 29.4%; adding DS-Prover gives 29.8%. On ProofNet the corresponding values are 13.3%, 14.2%, and 14.2%; on Mathlib they are 55.0%, 57.2%, and 58.8% (Table 1, p. 8). Thus the paper supports a small or zero additional gain from dynamic sampling on ProofNet in this setting, although augmentation itself raises the baseline.

## technique: time-dependent dynamic sampling

Use this when fixed-width expansion either exhausts the proof queue early or creates an exponential tree that prevents deeper proofs. DS-Prover computes the number of successful tactics to apply at a goal as

`n = a + b * exp(-c * r)`, where `r = time passed / total time`

with `a = 6`, `b = 12`, `c = 5`, and total time ten minutes in the experiments (Section 4.3.1, p. 6). At each expansion:

1. Read elapsed and total proof-search time
2. Compute `n` from the decay function
3. Sample `5n` tactics from ByT5, because some will be inapplicable
4. Apply at most `n` successful tactics to the current goal
5. Add resulting subgoals to the best-first queue ordered by cumulative log probability
6. Repeat until a proof closes or the time limit expires

The fixed baseline samples 64 tactics at every step and applies every successful tactic (Section 4.3.1, p. 6). The authors’ stated motivation is that an empty queue can stop search without a proof; a larger initial `n` keeps nodes available, while reducing `n` later limits tree growth and permits deeper exploration (Section 4.3.2, p. 6). They describe the exploration/exploitation tradeoff as beginning with lower-confidence alternatives and ending with the model’s highest-confidence tactics.

Inference: For Verus, a scheduler could generate many candidate proof actions near a root goal and progressively narrow the number as a verification timeout approaches. The queue item would need to contain a Rust/Verus state and cumulative model score; each candidate must be compiled and verified before entering the queue. Verus-specific proof actions, ownership errors, and solver timeouts make the cost of “successful tactic” different from Lean tactic applicability. This is an engineering inference, not paper evidence.

The paper’s ablation is on 500 Mathlib test theorems with the augmented model. Figure 3 compares fixed and dynamic sampling at 2.5, 5, and 10 minutes and reports dynamic sampling ahead at every limit, but the figure does not print the exact counts in the text (Section 5.4 and Figure 3, pp. 9–10). The Venn analysis says dynamic sampling proves eight more theorems than fixed sampling across the evaluated datasets (Section 5.4, p. 10). Appendix A.2 reports that fixed sampling peaks in node count at depth 3, dynamic sampling at depth 4, and that dynamic search is relatively better as proof size grows (Appendix A.2, pp. 16–17). These are observations about generated search trees, not a proof that the exponential schedule is optimal.

## technique: verifier-in-the-loop best-first search

The search loop starts by asking Lean for a theorem’s initial goal, asks ByT5 for tactic candidates, applies candidates through LeanDojo, discards failed applications, and stores the resulting open goals in a priority queue. The highest cumulative-log-probability goal is expanded next (Section 4.3, p. 6). Validation-based early stopping selects the checkpoint with the highest validation Pass@1 (Section 4.2, p. 5). This architecture makes Lean the acceptance authority: the model’s text only creates a branch after Lean accepts its tactic.

Inference: The same trust pattern is suitable for VL: generated Rust proof code should be admitted to subsequent search only after Verus accepts it, and the final artifact should be rechecked from source. A tactic generator cannot by itself establish a Verus postcondition. External specifications, libraries, and the Rust compiler remain outside the paper’s Lean result.

The authors optimized LeanDojo by hardcoding Lean 3 instead of querying GitHub for the version and increasing tactic application timeout from 5 to 10 seconds (Section 5.1.1, p. 8). Collection took about two hours each for original and rewrite-modified Mathlib, simplification-pair generation took about one day, each model’s four-A100 training about one day, and evaluation about one week (Section 5.1.1, p. 8). The optimization itself raises original-data MiniF2F from 27.8% to 28.6% and Mathlib from 52.2% to 55.0% (Table 1, p. 8), so timing and infrastructure changes are part of the reported comparison.

## limitations, trust, and product threat

The evidence is bounded by Lean 3, Mathlib’s July 2023 snapshot, the selected test sets, and ten-minute runs. The authors did not reproduce prior systems and instead used their published numbers (Section 5.3, p. 9). Their cumulative Pass@1 is a union over several methods, so it is not the success rate of one model; the denominator remains the same test set. The paper’s own conclusion says, “Our experiments show that using the model trained on the augmented dataset has better performance than using the model trained only on the original dataset.” (Conclusion, p. 10). It does not claim a soundness improvement over Lean.

Inference: The threat to agent-written verified Rust is medium for search cost and proof maintenance, and low for soundness when Verus rechecks every generated branch. Dynamic scheduling may miss proofs if its late `n` is too small; augmentation may encode brittle syntax or stale lemma names; a ten-minute Lean benchmark says little about compilation and solver costs in large Rust crates. VL should treat the paper’s already-demonstrated ingredients—single-premise data generation, elapsed-time sampling, verifier-in-the-loop queues, and cumulative-union accounting—as prior art. A Verus study should add denominated Rust evidence and report what specifications and external contracts remain trusted.

## techniques for the catalog

- premise decomposition — split ordered rewrites and verifier-checked simplifications into single-premise goal–action examples while retaining original tactics
- dynamic sampling — compute an exponentially decaying candidate width from elapsed/total time, sample five times that width, and keep at most the successful width
- best-first verifier search — prioritize open goals by cumulative model log probability and let the proof assistant reject inapplicable actions
- validation checkpointing — periodically run the verifier on validation theorems and keep the model checkpoint with highest Pass@1
- tool-path optimization — remove unnecessary environment-version queries and set a measured tactic timeout before comparing prover rates
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
