# Generating correctness proofs with neural networks
(authored by agents unless marked 🧑)
Tag: `sanchezstern2019generating`, [paper](https://arxiv.org/abs/1907.07794)
## scope and relation to earlier notes

Sanchez-Stern et al. present Proverbot9001, a learned proof-command predictor coupled to depth-limited search in Coq. It trains on CompCert proofs and generates checkable proof scripts. Earlier walkthroughs cover general proof search and Verus agents; this study captures this paper's two-stage tactic/argument model, recurrent term encoders, preprocessing of higher-order commands, search pruning, solver composition, and exact CompCert and cross-project measurements.

The paper's abstract reports 28% of test theorem statements solved when solver tooling is included, and 19.36% without external solvers. These are Coq/CompCert results and do not establish Verus performance. The abstract says: “We demonstrate Proverbot9001 on the proof obligations from a large practical proof project, the CompCert verified C compiler.” It also reports: “Our model is able to reproduce the tactic name from the solution 32% of the time.”

## technique 1: predict tactic and argument as separate but coupled models

What it is. Proverbot9001 predicts a proof command as a tactic name plus one argument. The tactic model `P_tac` uses manually engineered features; the argument model `P_arg` scores possible goal tokens, hypotheses, or lemma identifiers with recurrent encoders. Their scores are combined so argument selection is primary while tactic prediction narrows the search.

When to use it. Use this design when a proof language has a small, learnable command vocabulary but a large context-dependent argument space. It avoids forcing one classifier to memorize every tactic/argument pair.

How the paper does it.

1. Represent a proof state as obligations and proof-command history (Section 4, p. 154).
2. For tactic prediction, encode the goal head, previous tactic, the heuristically most relevant hypothesis, and its string-similarity score into 128-dimensional embeddings; pass them through a three-layer, 128-node feed-forward network with softmax (Section 5.1, p. 154).
3. For the selected top tactics, score arguments of three types: a token in the goal, a hypothesis identifier, or a lemma identifier (Section 5.2, pp. 154–155).
4. Use recurrent networks over goal, hypothesis, and lemma terms to produce one score per candidate argument (Section 5.2, pp. 154–155).
5. Select the top `n` tactics and top `m` arguments per tactic, and multiply their unnormalized scores to rank tactic/argument pairs (Section 5.3, p. 155).
6. Apply the highest-ranked commands in search, while continuing to feed predicted tactics, rather than only the correct training tactic, into the argument model (Sections 5.3–5.4, p. 155).

The paper states: “The argument selection is primary, with the tactic prediction mostly serving to help prune its search space.” (Section 5.3, p. 155)

Verus form. Inference: split candidate proof generation into (a) a classifier or ranker for Verus proof actions such as `assert`, `reveal`, `broadcast proof`, and helper `proof fn` calls, and (b) an argument ranker for available fields, predicates, lemmas, and expressions. Feed the generated action back into the argument model, produce several candidates, and rerun Verus on each. The final contract remains `requires`/`ensures`; the learned scores are search order only. Rust's ownership and borrow constraints should be included in the state features because a syntactically plausible argument can still fail Verus preconditions.

Evidence and limits. On 501 held-out CompCert proofs, the model predicted the full tactic and argument 28.66% of the time (3,784/13,203 individual proof commands, Appendix A.1, p. 15). Restricting to its prediction domain gave 39.25% (3,210/8,178). When the tactic name was correct, the argument was correct 89% of the time overall (Section 1, p. 151; Appendix A.2, p. 15), but many argumentless tactics make this conditional rate easier. These are token-level predictions, not complete-proof rates.

## technique 2: recurrent argument scoring over proof terms

What it is. `P_arg` uses separate recurrent networks to read the goal and the type of each hypothesis or lemma, then scores every goal token and candidate identifier. The model can therefore select arbitrary symbols in the goal, including symbols needed for unfolding.

When to use it. Use term-sequence encoders when argument identity depends on local syntax and the whole proposition, rather than on a fixed small set of binder positions.

How the paper does it. The goal RNN processes tokens and emits a score for each token. A hypothesis RNN processes a relevant hypothesis one token at a time; its initial state is computed from the predicted tactic, encoded goal, and similarity score. A separate RNN scores each candidate hypothesis or lemma type. The maximum score becomes the tactic argument (Section 5.2, pp. 154–155). The example chooses `unfold not` because the `not` token has the highest score in the goal (Figure 7, p. 155).

Verus form. Inference: tokenize Verus expressions, contract clauses, and names in scope; encode the current goal and each candidate lemma's `requires`/`ensures`; rank the expression or helper function that best matches the obligation. The model may propose a `reveal` or `assert` target, but Verus must check visibility, ownership, and triggers. A failed precondition is feedback, not evidence that the candidate is correct.

Evidence and limits. The paper's comparison says the model can predict “any token in the goal,” unlike the cited CoqGym argument model (Section 9.3, p. 12). That capability is demonstrated by benchmark completion, but no ablation isolates goal-token, hypothesis, and lemma RNNs.

## technique 3: preprocess higher-order proof commands into learnable sequences

What it is. Coq tacticals such as `;`, `now`, and multi-argument commands are difficult to predict directly. Proverbot9001 desugars commands into linear first-order commands where possible, filters cases that cannot be safely desugared, and treats irreducible forms such as `try eauto` as separate learned tactics.

When to use it. Use this when training traces contain macros or higher-order commands outside the predictor's one-argument model, but their ordinary cases can be expanded without changing proof behavior.

How the paper does it.

1. Split multi-argument commands such as `unfold a, b` into `unfold a. unfold b.` (Appendix A.4, p. 15).
2. Linearize semicolon proofs into sequences when subgoal switching and existential-variable propagation do not prevent it (Section 6.2, pp. 156–157).
3. Rewrite `now <tac>` as `<tac>; easy`, and rewrite `rewrite <term> by <tac>` and `assert <term> by <tac>` into semicolon forms (Section 6.2, p. 157).
4. Treat behavior-changing forms such as `try <tac>` and `solve <tac>` as separate tactics (Section 6.2, p. 157).
5. Train on the transformed commands and preserve their relationship to the original proof for evaluation (Appendix A.4, p. 15).

Verus form. Inference: normalize common generated proof patterns into atomic Verus operations only when the transformation preserves ownership and proof-state sequencing. For example, split a sequence of independent `assert`/lemma calls, but keep branch-sensitive code and mutable borrows intact. Record the source-to-normalized mapping, then rerun Verus on the normalized proof. Verus has no Coq tactical syntax, so this is a proof-trace normalization layer, not a direct language translation.

Evidence and limits. With data transformation disabled, default search solved 78/501 proofs (15.57%); with it, 97/501 (19.36%), and individual prediction accuracy fell from 26.77% to 16.32% without transformed data (Appendix A.4, p. 15). The authors therefore attribute substantial performance to preprocessing, but the transformation can fail when subgoal dependencies are not linearizable.

## technique 4: prediction-guided depth-limited search with hardness pruning

What it is. Proverbot9001 explores a proof tree depth-first, trying high-scoring commands first. It prunes a state when it is at least as hard as an earlier state, avoids reproving an already solved sub-obligation during backtracking, and counts depth over subproof structure rather than raw tactic text.

When to use it. Use these rules when exhaustive proof-command search is too large and syntactic repetition creates loops or redundant branches.

How the paper does it.

1. At each proof state, generate ranked tactic/argument predictions and expand the most likely branches first (Section 3, p. 153; Section 7, p. 157).
2. Define `σ1 ≥ σ2` when every obligation in `σ2` has a corresponding obligation in `σ1` with the same goal and no more hypotheses; stop a branch that reaches a state `≥` an earlier state (Section 7, pp. 157–158).
3. Do not search for a different proof of an already proved sub-obligation when backtracking (Section 7, p. 158).
4. Count depth by the proof tree's subgoal structure. An induction command that creates two obligations followed by one command per obligation has depth two, even if it is three textual commands (Section 7, p. 158).
5. Bound search by width (number of predictions per context) and depth (longest path for one obligation) (Appendix A.5, p. 16).

Verus form. Inference: rank candidate proof blocks, cap the number of alternatives at each diagnostic, and prune branches whose contracts or obligations subsume an earlier failed state. Verus does not expose Coq's interactive proof-state tree in the same way, so the agent can approximate state signatures from diagnostics, remaining `assert`s, and unsatisfied contract clauses. Use helper `proof fn`s for subgoals and verify each before composing the caller. Never infer that a timeout or syntactically similar state is impossible; rerun with a broader bound when completeness matters.

Evidence and limits. Default width 3 and depth 6 produced 97/501 proofs (19.36%). Width 1 solved 28/501 (5.59%); width 2 solved 81/501 (16.17%). At width 3, depths 2, 4, and 6 solved 26/501 (5.19%), 70/501 (13.97%), and 97/501 (19.36%), respectively (Appendix A.5, p. 16). These settings demonstrate a cost/completion tradeoff, not completeness.

## technique 5: combine learned search with solver tooling

What it is. Proverbot9001 can invoke CoqHammer after proof-command steps. The learned search and solver are complementary: one finds scripts the other misses, while the solver handles some goals directly.

How the paper evaluates it. Training used 162 CompCert files and testing 13 different files. In the default configuration without external tools, Proverbot9001 solved 97/501 (19.36%). With CoqHammer, it solved 138/501; CoqGym plus CoqHammer solved 48/501, while the union of both systems with CoqHammer solved 142/501 (Section 8.2, pp. 159–160). CoqHammer alone solved 37/501 in Figure 11. The 28% figure is 142/501, not 138/501.

Verus form. Inference: let the agent interleave Verus's normal SMT automation with learned candidate proof blocks, targeted `assert` lemmas, and `broadcast proof` facts. Keep the solver and any external tactic's accepted result inside the Verus verification boundary; an external suggestion cannot replace a Verus check. Log which proof obligations were discharged by ordinary automation versus generated lemmas.

## technique 6: transfer weights across projects

What it is. The learned models can be trained on one Coq development and used to rank proof commands in another.

How the paper does it. Weights learned on CompCert were applied without retraining to three Coq Contrib projects. The system solved 91/514 concat proofs (17.7%), 100/742 float proofs (13.48%), and 41/241 zfc proofs (17.01%), compared with 97/501 (19.36%) on CompCert (Section 8.3, pp. 160–161). These denominators are proof counts across the named projects.

Verus form. Inference: initialize a proof-action ranker from a different verified Rust project, but require current APIs and contracts to be encoded in the input and rerun Verus. Transfer is a search prior, not proof reuse. Project vocabulary and library conventions can differ enough that ranking quality falls.

## what is proved, measured, and trusted

The paper proves no theorem about neural prediction. It measures checkable proof completion: 97/501 without external tooling, 138/501 with Proverbot9001 plus CoqHammer, and 142/501 for the union of both CoqGym and Proverbot9001 with CoqHammer. The model predicts full individual commands at 3,784/13,203 overall, and 3,210/8,178 inside its restricted domain. Its test split uses 162 training files and 13 test files, with the 501 test proofs drawn after removing files without proofs.

Trusted components include Coq's kernel, CoqSerapi, the CompCert definitions and statements, CoqHammer and its external provers, preprocessing transformations, hand-engineered features, and the search-state hardness relation. The learned model is not trusted for soundness because every returned script is checked by Coq. The paper's own limits are search depth/width, an argument model restricted to zero or one arguments, and incomplete desugaring.

Threat to a product of agent-written verified Rust. Inference: medium to high productivity benefit and medium integration risk. VL can reuse the separation of action and argument ranking, proof-trace preprocessing, search-width/depth controls, solver composition, and cross-project initialization. The Coq state model and tactic language do not carry over directly to Rust ownership, mutable borrows, and Verus contracts. Soundness remains Verus's check; search pruning must not silently discard obligations, and any external solver result must be represented by a Verus-checked proof.

## techniques for the catalog

- two-stage proof-action ranking — predict a tactic-like action and its argument separately, then combine scores with argument selection dominant
- recurrent term argument model — score goal tokens, hypotheses, and lemmas with recurrent encoders over their sequential representations
- proof-trace normalization — desugar multi-argument and higher-order commands into learnable atomic sequences where behavior permits
- prediction-guided search — explore high-scoring branches under width/depth limits and prune states harder than prior states
- solver composition — combine learned proof search with CoqHammer-style solver calls and measure their union
- cross-project transfer — apply weights learned on one proof project to rank commands in other projects
Checked 2026-10-13: audit record sanchezstern2019generating; paper-study comparison complete; gate executed; experiments not rerun
