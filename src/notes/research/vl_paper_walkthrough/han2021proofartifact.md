# Proof Artifact Co-training for Theorem Proving with Language Models
(authored by agents unless marked 🧑)

Tag: `han2021proofartifact`, [paper](https://doi.org/10.48550/arxiv.2102.06203)

## scope and contribution

PACT (Proof Artifact Co-Training) addresses data scarcity for neural theorem proving. Instead of training only on scarce human tactic sequences, it extracts many self-supervised prediction tasks from kernel-level Lean proof terms and trains one Transformer on those tasks alongside tactic prediction. The abstract reports, “We propose PACT (Proof Artifact Co-Training), a general methodology for extracting abundant self-supervised data from kernel-level proof terms for joint training alongside the usual tactic prediction objective.” (Abstract, p. 1.)

The paper's evidence is Lean 3 and mathlib. It reports a held-out test pass rate of 48.4% for the best 837M-parameter model in Figure 2, compared with 32.2% for WebMath-to-tactic and 9.9% for tidy-bfs in that experiment. A separate time-stratified future-mathlib set gives 1,043/2,807 = 37.1% for the best model (Section 4, p. 8). These rates measure Lean theorem closure under fixed search budgets; they do not measure Verus or Rust verification.

## technique: extract PACT tasks from proof terms

when to use

Use this when human proof scripts are too scarce or expensive, but a small trusted kernel can produce complete proof terms. The method turns each proof artifact into many supervised examples without inventing unverified labels.

how the paper does it

1. For every proof term `τ`, record its type `Γ`, theorem name `nm`, and the list `ps` of named premises used by `τ` (Section 3.2, p. 4).
2. Recurse through every subterm `τ'` of `τ`, maintaining the bound variables `bs` in scope under lambda expressions.
3. For each subterm, record a tactic state whose goal is the subterm type `Γ'` and whose local context is `bs`.
4. Mask the subterm inside the full proof term to form a partial proof term.
5. Record a Boolean premise-selection label for each premise in `ps`, a Boolean local-context label for each bound variable in `bs`, and an optional next lemma when the subterm begins by applying a premise.
6. Store both pretty-printed and fully elaborated forms; the latter exposes implicit type information that Lean normally infers (Section 3.2, p. 4).
7. Assemble nine objectives: next-lemma prediction, full proof-term prediction, skip-proof reconstruction, type prediction, tactic-state elaboration, proof-term elaboration, premise classification, local-context classification, and theorem naming (Section 3.2, pp. 4–5).

The paper emphasizes that proof terms are kernel-checkable: “A proof term is a Lean expression whose type is a proposition, i.e. a theorem. This proof term serves as a checkable artifact for verifying the proposition.” (Section 2, p. 2.)

what transfers to Verus

Inference: extract training examples from Verus proof functions, quantified assertions, lemma calls, and successful solver obligations after Verus has checked them. Candidate tasks include predicting the next lemma, reconstructing a masked proof expression, selecting relevant `requires` facts, and elaborating a proof state. Keep the verifier as the label oracle; do not train on generated proof text unless the exact artifact verifies. Verus does not expose Lean's single proof-term datatype, so the extraction format must follow Verus's verification trace or normalized proof AST. This is an inference.

evidence and limits

Lean's trusted kernel is part of the evidence chain; the learned model is not trusted to establish the theorem. The paper uses the mathlib corpus, which it describes as over 46,000 lemmas backed by over 21,000 definitions and almost 500,000 lines at the time (Section 2, p. 2). Extraction quality depends on parser and elaborator instrumentation and on avoiding data leakage between theorem names.

## technique: LeanStep data and environment instrumentation

when to use

Use a reproducible environment when a model must interact with an interactive prover rather than merely emit text. The environment must serialize proof states, parse generated actions, execute them, and capture resulting states and errors.

how the paper does it

1. Hook into Lean's parser and compilation process to collect source-target pairs: a pretty-printed tactic state and the human tactic invocation that follows it (Section 3.1, p. 3).
2. At a theorem, set the runtime environment to that source location so later declarations cannot be used and circular proofs are impossible (Section 3.3, p. 5).
3. Serialize the tactic state as an observation for the model.
4. Parse the model's generated string back into a Lean tactic; execute it and capture goals, errors, and the next state.
5. Record successful trajectories for expert iteration and reinforcement learning (Section 3.3, p. 5).

The authors describe the purpose as “utilities for (1) setting the runtime environment at a particular theorem (ensuring proofs are never circular)” (Section 3.3, p. 5).

what transfers to Verus

Inference: build a Verus harness that records the source module, verifier version, solver options, diagnostic output, and the exact proof code proposed by an agent. Re-run verification in a clean dependency environment to prevent circular imports or accidentally available lemmas. Verus diagnostics are not Lean tactic states, so a project-specific serializer is required. This is an inference.

evidence and limits

The paper's split is deterministic by theorem name hashing, with 80% train, 5% validation, and 15% test (Section 4, p. 5). It notes that random splits can leak related proof steps; a theorem-name split prevents the proof of a test theorem from appearing in training. This protects the reported denominator but does not guarantee semantic independence between related theorems.

## technique: generic best-first proof search

when to use

Use best-first search when a model proposes multiple tactics with heuristic scores and a proof may require branching. The same engine can express greedy, breadth-first, and bounded searches.

how the paper does it

1. Define an oracle `Omega : tactic_state -> list (string * float)` that maps each proof state to candidate tactic strings and scores (Section 3.3, p. 5).
2. Put the initial tactic state in a priority queue of search nodes, each storing a partial proof and metadata.
3. Pop the highest-priority node, serialize its state, and query the oracle.
4. Re-parse every candidate string as a tactic; discard parse failures and tactics that raise errors or make no valid progress.
5. Insert successful successor nodes by decreasing score. Stop when no goals remain, the queue is empty, a depth/width limit is exceeded, or a timeout/budget expires.
6. Set maximum width `wmax` and depth `dmax`. With `wmax = 0`, the engine becomes greedy depth-first; with equal scores and infinite width/depth, it becomes breadth-first (Section 3.3, p. 5).

what transfers to Verus

Inference: use a bounded repair/search loop that proposes one Verus edit or lemma invocation at a time, runs Verus, scores diagnostics and remaining obligations, and queues promising states. A Verus candidate must be parsed and fully verified before insertion. Width, depth, per-run solver timeout, and global timeout should be recorded because they define the pass-rate denominator. This is an inference.

evidence and limits

The Lean evaluation uses width 16, depth 128, 512 outer iterations, five seconds per tactic execution, and 600 seconds per theorem (Section 4, p. 6). The paper averages pass rates over three runs. Model completions take about one second, while the fixed tidy-bfs oracle is instantaneous, so search budgets are not equivalent across agents (Section 4, p. 6).

## technique: co-training proof artifacts with tactic prediction

when to use

Use co-training when the direct tactic objective overfits because human tactic data are small. Mix related proof-term objectives and unrelated artifact objectives with tactic examples so the model receives additional structural signal.

how the paper does it

1. Partition tasks into `tactic` (human proof-step prediction), `mix1` (next lemma and complete proof-term prediction), and `mix2` (all other PACT tasks) (Section 4, p. 5).
2. Pre-train on WebMath and optionally on mix1 or mix2; for co-training, concatenate and shuffle task datasets rather than weighting one task specially (Section 4, p. 6).
3. Train a decoder-only Transformer on task-specific prompt keywords such as `PROOFSTEP`, `NEXTLEMMA`, `PROOFTERM`, and `SKIPPROOF` (Figure 1, p. 6).
4. Select the checkpoint with minimum validation loss and evaluate on held-out theorem proving.
5. Compare against pre-training-only and fixed-tactic baselines. The best `WebMath > mix1 + mix2 + tactic` setup reaches 48.4% pass rate in Figure 2, while WebMath-to-tactic reaches 32.2%.

The paper reports a regularization check: a WebMath-to-tactic model with 15% residual dropout reaches 33.6%, far below PACT's 48.4% (Section 4, p. 7). This supports a data/task effect in this setup, but it does not prove that all improvements come only from proof artifacts.

what transfers to Verus

Inference: co-train on verified Verus proof traces, contract elaborations, lemma selection, and diagnostic-to-repair tasks, while retaining direct proof generation as one objective. Use task tags and deterministic theorem/module splits. A Verus proof trace may contain solver internals unavailable in a stable interface; extract only artifacts that can be replayed and checked. This is an inference.

evidence and limits

Figure 4 varies model size under the best PACT setup: 121M parameters obtain 35.1%, 163M 39.8%, and 837M 48.4% pass rate, all on the same held-out setup (Figure 4, p. 8). The paper does not report a multi-billion-parameter model, and several no-WebMath configurations have no pass-rate entry because of technical constraints (Figure 3, p. 7).

## technique: time-stratified generalization evaluation

when to use

Use a temporal split to test whether a proof model generalizes to new definitions and theorems added after training, rather than only memorizing a random historical split.

how the paper does it

1. Freeze the extracted dataset and training data.
2. Collect theorem statements added to mathlib during a later period; the paper's five-week interval added 2,807 theorems and 30K lines (Section 4, p. 8).
3. Run the same proof search and budgets on this future set.
4. Compare the learned prover with simple `refl` and `tidy-bfs` baselines.
5. Report passed theorems divided by the complete temporal set: the best model closes 1,043/2,807 = 37.1%; `refl` closes 328/2,807 = 11.6%; `tidy-bfs` closes 611/2,807 = 21.8% (Section 4, p. 8).

The authors attribute the lower rate to distribution shift because future theorems often involve definitions absent from training. This is a model-specific explanation, not an independently proved causal result.

what transfers to Verus

Inference: hold out future commits, dependency upgrades, and new APIs for Verus repositories. Measure proof success separately on old APIs, new definitions, and changed specifications. A temporal split directly tests maintenance risk for agent-written proofs. This is an inference.

## proof boundary and product implications

Lean's small kernel checks proof terms, but the learned generator, search oracle, training data split, and Lean environment are outside the kernel guarantee. The experiments measure pass rate, validation loss, token budgets, and wall-clock constraints; they do not prove that a model understands a specification. The paper reports that more than one-third of model-found proofs are shorter than ground truth and that manual inspection led to 19 GPT-f co-authored mathlib commits (Section 5 discussion, p. 9), but this is a small, selected engineering outcome.

Inference: threat to VeruLaw is medium to high at proof-generation and maintenance layers. A Verus kernel/solver can reject invalid proof obligations, but weak or irrelevant contracts can still verify. PACT's strongest reusable idea is harvesting checkable artifacts from already verified proofs, not copying Lean's model or claiming that more proof text automatically improves Rust verification. VL should not redo generic tactic-data mining; it should test whether Verus's own verified traces improve repair success under dependency and specification changes. This is an inference.

## techniques for the catalog

- proof-artifact extraction — recurse through kernel proof terms and derive masked-subterm, type, lemma, context, and elaboration prediction tasks
- verifier-instrumented dataset — capture proof states, parse generated actions, execute them in a non-circular environment, and store trajectories
- bounded best-first search — queue model-proposed proof actions by heuristic score under width, depth, iteration, and timeout limits
- PACT co-training — train tactic prediction jointly with heterogeneous self-supervised tasks from verified proof artifacts
- temporal generalization test — evaluate on later-added theorems and report passed/total separately from random held-out rates
- kernel-filtered feedback — use only proof attempts accepted by the trusted checker as training examples for expert iteration

Checked 2026-10-15 against the paper by a Codex agent for proof_artifact_co_training_for_theorem_p_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
