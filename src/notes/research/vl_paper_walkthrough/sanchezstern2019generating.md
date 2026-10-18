# Generating correctness proofs with neural networks
(authored by agents unless marked 🧑)
Tag: `sanchezstern2019generating`, [paper](https://arxiv.org/abs/1907.07794)
## scope and relation to earlier notes

Sanchez-Stern et al. present Proverbot9001, a learned proof-command predictor coupled to depth-limited search in Coq. It trains on CompCert proofs and generates checkable proof scripts. The paper is a MAPL '20 workshop paper (arXiv v4). Page numbers below are PDF pages of the arXiv v4 file (15 pages), not ACM proceedings pages. Earlier walkthroughs in this notes collection cover general proof search and Verus agents (not re-checked here); this study captures this paper's two-part tactic/argument model, recurrent term encoders, preprocessing of higher-order commands, search pruning, solver composition, and CompCert and cross-project measurements.

The paper's abstract reports 28% of test theorem statements solved when solver tooling is included, and Section 1 gives that as 138/501; without external solvers the rate is 19.36% (97/501). These are Coq/CompCert results and do not establish Verus performance. The abstract says: “We demonstrate Proverbot9001 on the proof obligations from a large practical proof project, the CompCert verified C compiler”. Section 1 (p. 2) reports: “Our model is able to reproduce the tactic name from the solution 32% of the time”.

## technique 1: predict tactic and argument as separate but coupled models

What it is. Proverbot9001 predicts a proof command as a tactic name plus zero or one argument (Section 4, p. 4: "we assume that all tactics take zero or one arguments"). The tactic model `P_tac` uses manually engineered features; the argument model `P_arg` scores possible goal tokens, a hypothesis, or lemma identifiers with recurrent networks. Their scores are multiplied so argument selection is primary while tactic prediction narrows the search.

When to use it. Inference: use this design when a proof language has a small, learnable command vocabulary but a large context-dependent argument space, so one classifier need not memorize every tactic/argument pair.

How the paper does it.

1. Represent a proof state as a list of obligations (hypotheses and a goal) with their proof-command history (Section 4, p. 4, Figure 5).
2. For tactic prediction, Section 5.1 (p. 4) lists four features: the head of the goal, the previous tactic, a hypothesis chosen heuristically by string similarity to the goal as most relevant, and that hypothesis's similarity score. They are "embedded into a continuous vector of 128 floats using a standard word embedding" and fed to a fully connected feed-forward network ("3 layers, 128 nodes-wide") with a softmax layer, trained on 153402 samples with stochastic gradient descent. Figure 6 and Sections 5.4 and 6.1 describe only three inputs (previous tactic, goal head, hypothesis head), and the Figure 6 caption (p. 5) restricts the previous-tactic feature to the 50 most common tactics and the head tokens to the 100 most common.
3. For the top tactics, score arguments of three kinds: a token in the goal, a hypothesis identifier, or a lemma identifier (Section 5.2, p. 4). By default lemmas are those defined previously in the current file.
4. One RNN scores each hypothesis or lemma by reading its type; a different RNN scores each goal token (Section 5.2, p. 4). Section 5.4 (p. 6) says the argument model outputs one score per goal token and one for the single hypothesis.
5. Pick the `n` highest-scoring tactics and for each the `m` highest-scoring arguments, then score each proof command by multiplying the tactic score and the argument score "without any normalization" (Section 5.3, p. 6).
6. In search, try the ranked commands in order (Section 3, p. 3). In training, the tactics predicted by `P_tac`, not only the correct tactic name, are fed to the argument model so argument scores are comparable across tactics (Section 6.1, p. 6). Training runs 20 epochs with the NLLLoss criterion.

The paper states: “the argument selection is primary, with the tactic prediction mostly serving to help prune its search space.” (Section 5.3, p. 6)

Verus form. Inference: split candidate proof generation into (a) a classifier or ranker for Verus proof actions such as `assert`, `reveal`, `broadcast proof`, and helper `proof fn` calls, and (b) an argument ranker for available fields, predicates, lemmas, and expressions. Feed the generated action back into the argument model, produce several candidates, and rerun Verus on each. The final contract remains `requires`/`ensures`; the learned scores are search order only. Rust's ownership and borrow constraints should be included in the state features because a syntactically plausible argument can still fail Verus preconditions.

Evidence and limits. On the test set broken into 13,203 individual linearized proof commands, the model predicted the full tactic and argument 28.66% of the time (3784/13203, Appendix A.1, p. 14). Restricting to its prediction domain gave 39.25% (3210/8178). The tactic was in the top 3 predictions 38.93% and in the top 5 42.66% of the time (52.17% and 60.39% inside the domain). When the tactic name was correct, the argument was correct 89% of the time overall (Section 1, p. 2; Appendix A.2, p. 14) and 96% inside the domain, but the paper itself notes that many common tactics take no argument, which makes argument prediction trivial for them. These are per-command predictions, not complete-proof rates. (Appendix A.2 text says the tactic was right and argument wrong "32.24%" of the time; given the 89% figure this appears to be the tactic-correct rate, matching the 32% in Section 1. Inference.)

## technique 2: recurrent argument scoring over proof terms

What it is. `P_arg` uses recurrent networks (GRUs) to read the goal and the type of the candidate hypothesis or lemma, then scores every goal token and candidate identifier. The model can therefore select arbitrary symbols in the goal, including symbols needed for unfolding.

When to use it. Inference: use term-sequence encoders when argument identity depends on local syntax and the whole proposition, rather than on a fixed small set of binder positions.

How the paper does it (Section 5.2, pp. 4-5, Figure 7). An RNN processes the goal token by token and gives a score for each token; its initial state is a constant (0 in the example). A second RNN encodes the goal as a vector. The most relevant hypothesis is fed to a hypothesis RNN one token at a time; that RNN's initial state comes from a feed-forward network whose inputs are the tactic predicted by `P_tac`, the encoded goal, and the hypothesis similarity score. The highest-scoring element is chosen as the argument. In the Figure 7 example the `not` token scores highest, giving `unfold not`; had the hypothesis scored highest, the argument would be the hypothesis identifier.

Verus form. Inference: tokenize Verus expressions, contract clauses, and names in scope; encode the current goal and each candidate lemma's `requires`/`ensures`; rank the expression or helper function that best matches the obligation. The model may propose a `reveal` or `assert` target, but Verus must check visibility, ownership, and triggers. A failed precondition is feedback, not evidence that the candidate is correct.

Evidence and limits. The paper's comparison says the model can predict “any token in the goal”, unlike CoqGym's argument model, which predicts a hypothesis name, a number from 1 to 4, or a random quantified variable (Section 9.3, p. 11). Appendix A.2 (p. 14) says the argument model's effect on search "is hard" to measure because it cannot be separated from the tactic predictor, so no ablation isolates the goal-token, hypothesis, and lemma components.

## technique 3: preprocess higher-order proof commands into learnable sequences

What it is. Coq tacticals such as `;` and `now`, and multi-argument commands, are hard to predict directly. Proverbot9001 desugars commands into linear first-order commands where possible, filters out cases that cannot be desugared, and treats irreducible forms such as `try eauto` as separate learned tactics.

When to use it. Inference: use this when training traces contain macros or higher-order commands outside the predictor's one-argument model, but their ordinary cases can be expanded without changing proof behavior.

How the paper does it.

1. Split multi-argument commands such as `unfold a, b` into `unfold a. unfold b.` (Section 5.2, pp. 4-5; Appendix A.4, p. 14).
2. Desugar `;` into linear sequences of proof commands where possible. This is not always possible without explicit subgoal-switching commands because of propagation of existential variables across proof branches; the remaining commands containing `;` are filtered out of the training set (Section 6.2, pp. 6-7).
3. Rewrite `now <tac>` as `<tac>;easy`, `rewrite <term> by <tac>` as `rewrite <term> ; [ | <tac>]`, and `assert <term> by <tac>` as `assert <term> ; [ | <tac>]` (Section 6.2, p. 7).
4. Treat behavior-changing forms such as `try <tac>` and `solve <tac>` as separate learned tactics, for example `try eauto` (Section 6.2, p. 7).
5. For the ablation, the paper disabled the transformation and "filtered the proof commands in the dataset which did not fit into our proof command model" (Appendix A.4, p. 14).

Verus form. Inference: normalize common generated proof patterns into atomic Verus operations only when the transformation preserves ownership and proof-state sequencing. For example, split a sequence of independent `assert`/lemma calls, but keep branch-sensitive code and mutable borrows intact. Record the source-to-normalized mapping, then rerun Verus on the normalized proof. Verus has no Coq tactical syntax, so this is a proof-trace normalization layer, not a direct language translation.

Evidence and limits. With data transformation disabled, the proof completion rate was 15.57% (78/501), against 19.36% with it. Individual prediction accuracy fell from 26.77% to 16.32% without transformed data (Appendix A.4, pp. 14-15). The paper says performance "benefits greatly" from the transformation, though the system without it still outperforms CoqGym. A caveat: Appendix A.4 states the default search width as 5, while Section 8.2 and Appendix A.5 give 3. The paper also says desugaring of `;` is not always possible.

## technique 4: prediction-guided depth-limited search with hardness pruning

What it is. Proverbot9001 explores a proof tree depth-first, trying high-scoring commands first. It prunes a state that is at least as hard as an earlier state in the history, does not look for a different proof of an already proven sub-obligation when backtracking, and counts depth over subproof structure rather than raw tactic text.

When to use it. Inference: use these rules when exhaustive proof-command search is too large and syntactic repetition creates loops or redundant branches.

How the paper does it.

1. At each proof state, generate ranked tactic/argument predictions and expand the most likely branches first (Section 3, p. 3; Section 7, p. 7).
2. Define `σ1 ≥ σ2` ("at least as hard") when for every obligation `O2` in `σ2` there is an obligation `O1` in `σ1` with the same goal in which each hypothesis of `O1` is also a hypothesis of `O2`; stop a branch whose command yields a state `≥` a state in the history (Section 7, pp. 7-8).
3. Do not attempt a different proof of an already proven sub-obligation when backtracking. The paper acknowledges this can miss proofs because of existential variables, but says it "has not been an issue" so far (Section 7, p. 8).
4. Count depth by the proof tree's subgoal structure. In `induction n. eauto. simpl.` the `induction n` command produces two obligations, so the proof has depth two, not three (Section 7, p. 8).
5. The paper's two parameters are search width (how many predictions are explored at each context) and depth (the longest path from the root a single proof obligation state can have) (Appendix A.5, p. 15).

Verus form. Inference: rank candidate proof blocks, cap the number of alternatives at each diagnostic, and prune branches whose contracts or obligations subsume an earlier failed state. Verus does not expose Coq's interactive proof-state tree in the same way, so the agent can approximate state signatures from diagnostics, remaining `assert`s, and unsatisfied contract clauses. Use helper `proof fn`s for subgoals and verify each before composing the caller. Never infer that a timeout or syntactically similar state is impossible; rerun with a broader bound when completeness matters.

Evidence and limits. Section 8.2 uses width 3 and depth 6, giving 97/501 proofs (19.36%). Width 1 solved 28/501 (5.59%); width 2 solved 81/501 (16.17%). At width 3, depths 2, 4, and 6 solved 26/501 (5.19%), 70/501 (13.97%), and 97/501 (19.36%), respectively (Appendix A.5, p. 15). These settings show a cost/completion tradeoff, not completeness. The paper also finds it does better on short proofs: 35% (89/256) of proofs of ten or fewer original commands, against 19.36% overall (Section 8.4, p. 10).

## technique 5: combine learned search with solver tooling

What it is. The paper compares Proverbot9001 and CoqGym alone and combined with CoqHammer, a solver-based tactic that invokes Z3, CVC4, Vampire, and E Prover and a crush-like tactic. Proverbot9001 and CoqGym are complementary: "both can complete proofs which the other cannot" (Section 8.2, p. 9). The paper says CoqHammer "is run after every proof command invocation" in CoqGym, and that "our system was not originally designed this way" but both systems were compared with it.

How the paper evaluates it. Training used 162 CompCert files and testing 13 different files (Section 8.2, p. 9; footnote 2, p. 2: a 90/10 split, then removing from the test set files that do not contain proofs). Figure 11 (p. 9), read from the bar chart, gives: CoqHammer alone 37, CoqGym alone 23, Proverbot9001 alone 97, CoqGym plus Proverbot9001 union 100, CoqGym with CoqHammer 48, Proverbot9001 with CoqHammer 138, union of the two with CoqHammer 142 (of 501 proofs). The text says CoqHammer alone "can only solve 7% of proofs" (Section 1). The 28% figure is used for both 138/501 (Section 1, p. 2; Section 8.1) and 142/501 (Section 8.2, p. 9: "142/501 proofs, a success rate of 28%"); the abstract does not say which. The paper reports 2.88X (138 vs 48) and 2.96X (142 vs 48) improvements over CoqGym with CoqHammer.

Verus form. Inference: let the agent interleave Verus's normal SMT automation with learned candidate proof blocks, targeted `assert` lemmas, and `broadcast proof` facts. Keep the solver and any external tactic's accepted result inside the Verus verification boundary; an external suggestion cannot replace a Verus check. Log which proof obligations were discharged by ordinary automation versus generated lemmas.

## technique 6: transfer weights across projects

What it is. Models trained on one Coq development are used to predict proof commands in another.

How the paper does it. Weights learned on CompCert were applied, with Proverbot9001 in its default configuration and without CoqHammer, to three Coq Contrib projects. The system solved 91/514 concat proofs (17.7%), 100/742 float proofs (13.48%), and 41/241 zfc proofs (17.01%), compared with 19.36% (97/501) on CompCert (Section 8.3, p. 9). Here concat is a library of constructive category theory proofs, float a formalization of floating point numbers, and zfc a formalization of set theory. The paper concludes "that it can effectively transfer training from one project to another" (Section 8.3, p. 10). The text says the concat 91 solved were "without the use of CoqHammer"; for float and zfc it does not repeat this.

Verus form. Inference: initialize a proof-action ranker from a different verified Rust project, but require current APIs and contracts to be encoded in the input and rerun Verus. Transfer is a search prior, not proof reuse. Project vocabulary and library conventions can differ enough that ranking quality falls.

## what is proved, measured, and trusted

The paper proves no theorem about neural prediction. It measures checkable proof completion: 97/501 without external tooling, 138/501 for Proverbot9001 with CoqHammer, and 142/501 for the union of CoqGym and Proverbot9001, both with CoqHammer. The model predicts full individual commands at 3784/13203 overall, and 3210/8178 inside its restricted domain. The test split uses 162 training files and 13 test files; files without proofs were removed from the test set, leaving 501 test proofs.

What the paper says about trust: foundational verification lets proofs "be checked with a small kernel", so "only the kernel needs to be trusted" (Section 1, p. 1), and the Figure 3 architecture is built on CoqSerapi, Python, and PyTorch. Inference: because the search returns scripts that Coq checks, the learned model is not trusted for soundness; the CompCert statements, CoqSerapi, CoqHammer and its external provers (when used), the preprocessing transformations, the hand-engineered features, and the search-state hardness relation are outside the learned model and should be treated as part of what must be trusted or audited. The paper's own stated limits: argument model of zero or one argument (Section 4), not all `;` can be desugared (Section 6.2), possible missed proofs from existential variables when not re-proving sub-obligations (Section 7), and search width/depth bounds (Appendix A.5).

Threat to a product of agent-written verified Rust. Inference: medium to high productivity benefit and medium integration risk. VL can reuse the separation of action and argument ranking, proof-trace preprocessing, search-width/depth controls, solver composition, and cross-project initialization. The Coq state model and tactic language do not carry over directly to Rust ownership, mutable borrows, and Verus contracts. Soundness remains Verus's check; search pruning must not silently discard obligations, and any external solver result must be represented by a Verus-checked proof.

## techniques for the catalog

- two-stage proof-action ranking — predict a tactic-like action and its argument separately, then combine scores with argument selection dominant
- recurrent term argument model — score goal tokens, hypotheses, and lemmas with recurrent encoders over their sequential representations
- proof-trace normalization — desugar multi-argument and higher-order commands into learnable atomic sequences where behavior permits
- prediction-guided search — explore high-scoring branches under width/depth limits and prune states harder than prior states
- solver composition — combine learned proof search with CoqHammer-style solver calls and measure their union
- cross-project transfer — apply weights learned on one proof project to rank commands in other projects
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Taking this sub-proof structure into account is important because it allows Proverbot9001 to discover more proofs for a fixed depth."): read all 15 PDF pages of the text (body, Appendix A.1-A.5, references) and the Figure 11 bar chart image; checked quotations, numbers, section and page references against the paper; changed page references from ACM-style numbers to arXiv PDF pages, corrected the claim that 28% is 142/501 only (the paper uses 28% for both 138/501 and 142/501), moved the 32% quotation from the abstract to Section 1, fixed the tactic-feature, argument-RNN, hardness-relation, desugaring, and trust descriptions, removed the unsupported claim that Proverbot9001 invokes CoqHammer after each step and the claim of preserving source mapping, and marked own conclusions as Inference; did not check: the claim about earlier notes in this collection, the Verus-form proposals (own inferences), the cited external works, or the exact page of every sentence in the appendix beyond the sections listed.
