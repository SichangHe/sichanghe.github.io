# Proof Artifact Co-training for Theorem Proving with Language Models
(authored by agents unless marked 🧑)

Tag: `han2021proofartifact`, [paper](https://arxiv.org/abs/2102.06203)

## scope and contribution

PACT (Proof Artifact Co-Training) addresses data scarcity for neural theorem proving. Instead of training only on scarce human tactic sequences, it extracts many self-supervised prediction tasks from kernel-level Lean proof terms and trains one Transformer on those tasks alongside tactic prediction. The abstract reports, “We propose PACT (Proof Artifact Co-Training), a general methodology for extracting abundant self-supervised data from kernel-level proof terms for joint training alongside the usual tactic prediction objective.” (Abstract, p. 1.)

The paper's evidence is Lean 3 and mathlib. It reports a held-out test pass rate of 48.4% for the best 837M-parameter model in Figure 2, compared with 32.2% for WebMath-to-tactic and 9.9% for tidy-bfs in that experiment. A separate time-stratified future-mathlib set of 2,807 new theorems gives 1,043 proofs, reported as 37.1%, for the best model (Section 4, p. 8). The 48.4% figure carries a contamination caveat: the authors recomputed Figure 2 without 755 test theorems whose names occur in the crawled pre-training data and report an adjusted 47.4% for the best model (Appendix B.1, p. 16). These rates measure Lean theorem closure under fixed search budgets; they do not measure Verus or Rust verification.

## technique: extract PACT tasks from proof terms

when to use

Use this when human proof scripts are too scarce or expensive, but a small trusted kernel can produce complete proof terms. Inference: because the labels come from existing kernel-checked proof terms, the method does not need to invent unverified labels.

how the paper does it

1. For every proof term `τ`, record its type `Γ`, theorem name `nm`, and the list `ps` of named premises used by `τ` (Section 3.2, p. 4).
2. Recurse through every subterm `τ'` of `τ`, maintaining the bound variables `bs` in scope under lambda expressions.
3. For each subterm, record a tactic state whose goal is the subterm type `Γ'` and whose local context is `bs`.
4. Mask the subterm inside the full proof term to form a partial proof term.
5. Record a Boolean premise-selection label for each premise in `ps`, a Boolean local-context label for each bound variable in `bs`, and an optional next lemma when the subterm begins by applying a premise.
6. Store both pretty-printed and fully elaborated forms; the latter exposes implicit type information that Lean normally infers (Section 3.2, p. 4).
7. Assemble nine objectives: next-lemma prediction, full proof-term prediction, skip-proof (predict the masked subterm), type prediction, tactic-state elaboration, proof-term elaboration, premise classification, local-context classification, and theorem naming (Section 3.2, p. 4). The paper's own sizes: about 128K tactic examples versus, for example, about 9.3M premise-classification and 2.5M next-lemma examples (Appendix B.2, p. 17).

The paper emphasizes that proof terms are kernel-checkable: “A proof term is a Lean expression whose type is a proposition, i.e. a theorem. This proof term serves as a checkable artifact for verifying the proposition.” (Section 2, p. 2.)

what transfers to Verus

Inference: extract training examples from Verus proof functions, quantified assertions, lemma calls, and successful solver obligations after Verus has checked them. Candidate tasks include predicting the next lemma, reconstructing a masked proof expression, selecting relevant `requires` facts, and elaborating a proof state. Keep the verifier as the label oracle; do not train on generated proof text unless the exact artifact verifies. Verus does not expose Lean's single proof-term datatype, so the extraction format must follow Verus's verification trace or normalized proof AST. This is an inference.

evidence and limits

The paper states “Lean uses a small, trusted kernel to verify proof terms.” (Section 2, p. 2.) Inference: the learned model is not part of that trusted base, so a proof is accepted only if the kernel checks it. The paper uses the mathlib corpus, which it describes as containing “over 46,000 formalized lemmas backed by over 21,000 definitions” with “almost 500,000 lines of code” at the time (Section 2, p. 2). The paper also notes that the PACT data are noisy: “during pretty-printing, subtrees of proof terms beyond a certain depth are dropped entirely, there is generally no guarantee that they can be re-parsed, and the data is much more verbose than what humans typically supply in source code.” (Section 4, p. 5.) Inference: extraction quality therefore depends on the parser and elaborator instrumentation.

## technique: LeanStep data and environment instrumentation

when to use

Use a reproducible environment when a model must interact with an interactive prover rather than merely emit text. The environment must serialize proof states, parse generated actions, execute them, and capture resulting states and errors.

how the paper does it

1. Hook into Lean's parser and compilation process to collect source-target pairs: a pretty-printed tactic state and the human tactic invocation that follows it (Section 3.1, p. 3).
2. At a theorem, set the runtime environment to that source location so later declarations cannot be used and circular proofs are impossible (Section 3.3, p. 4; Section 4, p. 5).
3. Serialize the tactic state as an observation for the model.
4. Parse the model's generated string back into a Lean tactic; execute it and capture goals, errors, and the next state.
5. Execute the re-parsed tactics and capture the results, which enables recording trajectories for expert iteration and reinforcement learning (Section 3.3, p. 4). The paper builds the environment for this but its reported experiments are supervised training plus search evaluation.

The authors describe the purpose as “utilities for (1) setting the runtime environment at a particular theorem (ensuring proofs are never circular)” (Section 3.3, p. 4).

what transfers to Verus

Inference: build a Verus harness that records the source module, verifier version, solver options, diagnostic output, and the exact proof code proposed by an agent. Re-run verification in a clean dependency environment to prevent circular imports or accidentally available lemmas. Verus diagnostics are not Lean tactic states, so a project-specific serializer is required. This is an inference.

evidence and limits

The paper's split is deterministic by theorem name hashing, with 80% train, 5% validation, and 15% test (Section 4, p. 5). The paper says the name split “ensures, for example, that proof steps used to prove a test theorem never appear in the training data and vice-versa” (Section 4, p. 5). It also concedes that a random split “is non-chronological; e.g. test theorems can appear as lemmas in proofs of train theorems” (Section 4, p. 8). Inference: the name split does not guarantee semantic independence between related theorems.

## technique: generic best-first proof search

when to use

Use best-first search when a model proposes multiple tactics with heuristic scores and a proof may require branching. The same engine can express greedy, breadth-first, and bounded searches.

how the paper does it

1. Define an oracle `Omega : tactic_state -> list (string * float)` that maps each proof state to candidate tactic strings and scores (Section 3.3, pp. 4–5).
2. Put the initial tactic state in a priority queue of search nodes, each storing a partial proof and metadata.
3. Pop a node off the priority queue, serialize its tactic state, and query the oracle.
4. Re-parse every candidate string as a tactic; add a new node only if the parsed tactic advances the proof without raising errors.
5. Re-insert the new nodes into the queue in order of decreasing priority. Stop when no goals remain (proved), the queue is empty (failed), or a pre-set timeout or iteration budget is exceeded.
6. Optionally set maximum width `wmax` and depth `dmax`, which guard insertion into the queue: nodes deeper than `dmax` are ignored, and all nodes are ignored if the queue size is strictly larger than `wmax`. With `wmax = 0`, the engine becomes greedy depth-first; with equal scores and infinite width/depth, it becomes breadth-first (Section 3.3, p. 5).

what transfers to Verus

Inference: use a bounded repair/search loop that proposes one Verus edit or lemma invocation at a time, runs Verus, scores diagnostics and remaining obligations, and queues promising states. A Verus candidate must be parsed and fully verified before insertion. Width, depth, per-run solver timeout, and global timeout should be recorded because they define the pass-rate denominator. This is an inference.

evidence and limits

The Lean evaluation uses width 16, depth 128, 512 outer iterations, five seconds per tactic execution, and 600 seconds per theorem (Section 4, p. 6). The paper averages pass rates over three runs. Sampling completions takes about one second, while the constant tidy-bfs oracle is instantaneous, so “the tidy-bfs search runs many more iterations than gptf before timeout” (Section 4, p. 6). Inference: the comparison is at equal wall-clock limits, not equal iteration counts.

## technique: co-training proof artifacts with tactic prediction

when to use

Inference: use co-training when the direct tactic objective overfits because human tactic data are small. The paper hypothesizes that “PACT regularizes overfitting to the PROOFSTEP task while still imparting useful knowledge to the model due to large amounts of mutual information” (Section 4, p. 6); this is a hypothesis, not a tested mechanism.

how the paper does it

1. Partition tasks into `tactic` (human proof-step prediction), `mix1` (next lemma and complete proof-term prediction), and `mix2` (all other PACT tasks) (Section 4, p. 5).
2. Pre-train on WebMath and optionally on mix1 or mix2; for co-training, concatenate and shuffle task datasets rather than weighting one task specially (Section 4, p. 6).
3. Train a decoder-only Transformer on task-specific prompt keywords such as `PROOFSTEP`, `NEXTLEMMA`, `PROOFTERM`, and `SKIPPROOF` (Figure 1, p. 6).
4. Select the checkpoint with minimum validation loss and evaluate on held-out theorem proving.
5. Compare against pre-training-only and fixed-tactic baselines. The best `WebMath > mix1 + mix2 + tactic` setup reaches 48.4% pass rate in Figure 2, while WebMath-to-tactic reaches 32.2%.

The paper reports a regularization check: a WebMath-to-tactic model with 15% residual dropout reaches 33.6% pass rate and 1.01 validation loss, “far below the 48.4% PACT pass rate” (Section 4, p. 7). Inference: this supports a data/task effect in this setup, but it does not show that all improvement comes only from proof artifacts.

what transfers to Verus

Inference: co-train on verified Verus proof traces, contract elaborations, lemma selection, and diagnostic-to-repair tasks, while retaining direct proof generation as one objective. Use task tags and deterministic theorem/module splits. A Verus proof trace may contain solver internals unavailable in a stable interface; extract only artifacts that can be replayed and checked. This is an inference.

evidence and limits

Figure 4 varies model size under the best PACT setup: 121M parameters obtain 35.1%, 163M 39.8%, and 837M 48.4% pass rate, all on the same held-out setup (Figure 4, p. 8). The paper does not report a multi-billion-parameter model (“We leave as future work”, Section 4, p. 8), and in the no-WebMath table (Figure 3, p. 7) only one configuration, mix2 + tactic at 40.4%, has a pass rate; the others are marked unavailable “due to technical constraints”. The paper also reports that without WebMath pre-training co-trained models suffer a performance drop, and that WebMath is “not a replacement for” but “a complementary method” to PACT (Section 4, p. 6).

## technique: time-stratified generalization evaluation

when to use

Use a temporal split to test whether a proof model generalizes to new definitions and theorems added after training, rather than only memorizing a random historical split.

how the paper does it

1. Freeze the extracted dataset and training data.
2. Collect theorem statements added to mathlib during a later period; the paper's five-week interval added 2,807 theorems and 30K lines (Section 4, p. 8).
3. Evaluate the best model on this future set (the paper calls it future-mathlib), together with the refl and tidy-bfs baselines.
4. Compare the learned prover with simple `refl` and `tidy-bfs` baselines.
5. Report passed theorems over the complete temporal set. The paper reports: the best model closes 1043 proofs (37.1%) and proves 94% of the refl lemmas; `refl` closes 328 (11.6%); `tidy-bfs` closes 611 (21.8%) (Section 4, p. 8). The refl rate is much higher than on the random test split (1.1%), which the paper reads as “an important skew towards trivial boilerplate lemmas”.

The authors write “We attribute the weaker performance to heavy distribution shift” because future theorems often involve new definitions the model never saw (Section 4, p. 8). Inference: this is the authors' explanation, not an independently tested causal result.

what transfers to Verus

Inference: hold out future commits, dependency upgrades, and new APIs for Verus repositories. Measure proof success separately on old APIs, new definitions, and changed specifications. A temporal split directly tests maintenance risk for agent-written proofs. This is an inference.

## proof boundary and product implications

Inference: Lean's small kernel checks proof terms, but the learned generator, search oracle, data split, and Lean environment are outside the kernel guarantee. The experiments measure pass rate, validation loss, token budgets, and wall-clock constraints; they do not test whether a model understands a specification. The paper reports “More than one-third of the proofs found by our models are shorter and produce smaller proof terms (sometimes by several orders of magnitude) than the ground truth” and that “Manually inspecting a small, non-cherry picked sample of these shorter proofs has led to 19 GPT-f co-authored commits to mathlib” (Section 5, p. 9). Appendix D (p. 25) says “dozens” of commits, which differs from the 19 in Section 5. Inference: this is a small engineering outcome, not a measured benefit.

Inference: threat to VeruLaw is medium to high at proof-generation and maintenance layers. A Verus kernel/solver can reject invalid proof obligations, but weak or irrelevant contracts can still verify. PACT's strongest reusable idea is harvesting checkable artifacts from already verified proofs, not copying Lean's model or claiming that more proof text automatically improves Rust verification. VL should not redo generic tactic-data mining; it should test whether Verus's own verified traces improve repair success under dependency and specification changes. This is an inference.

## techniques for the catalog

- proof-artifact extraction — recurse through kernel proof terms and derive masked-subterm, type, lemma, context, and elaboration prediction tasks
- verifier-instrumented dataset — capture proof states, parse generated actions, execute them in a non-circular environment, and store trajectories
- bounded best-first search — queue model-proposed proof actions by heuristic score under width, depth, iteration, and timeout limits
- PACT co-training — train tactic prediction jointly with heterogeneous self-supervised tasks from verified proof artifacts
- temporal generalization test — evaluate on later-added theorems and report passed/total separately from random held-out rates
- kernel-filtered feedback (Inference, not an experiment in this paper) — use only proof attempts accepted by the trusted checker as training examples for expert iteration; the paper only says its environment enables recording trajectories for expert iteration and reinforcement learning

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We have presented PACT as a way of addressing the data scarcity issue for learning theorem proving from human tactic scripts in proof assistant libraries."): read the whole paper text including appendices; checked every quotation, number, section and page reference and every technique step against it. Changed: the link (now the arXiv page from the paper text); page references for Section 3.3 (p. 4) and the Section 3.2 task list (p. 4); search stopping conditions (width and depth limits guard insertion, they are not stop conditions); the future-mathlib rates (the paper reports 37.1%, 11.6%, 21.8%; the study had computed them as exact ratios); removed an unsupported claim that the same search budgets were used on future-mathlib and the claim that the commit sample was selected (the paper says non-cherry picked); labeled own conclusions as Inference; added the contamination-adjusted 47.4%, the tidy-bfs iteration remark, and the 19-versus-dozens commit discrepancy. Not checked: the PDF figures and the Appendix D proof examples beyond the text layer, and the cited external works.
