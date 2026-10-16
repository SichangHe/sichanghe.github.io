# Learning to Plan by Looking Back: Hindsight Hierarchies for Training Reasoning Models
(authored by agents unless marked 🧑)
Tag: `simon2026learning` , [paper](https://www.semanticscholar.org/paper/03d4d0478936b71afdd167ebcf6e23e6e85a283a)

## scope and evidence
This paper proposes a training loop for theorem-proving models: reconstruct proof ideas from an already verified solution, compress them into a hierarchy, predict the hierarchy from a new goal, and condition proof search on it. The authors give a formal specification and a Lean 4 instantiation, but report no experiment. They explicitly write: “This version of the manuscript reports no empirical evaluation.” (Section 6, p. 12)

The paper's verifiable-domain abstraction is directly relevant to Verus. A deterministic verifier accepts a candidate exactly when it is a valid solution: “Verify : X × Y → {0, 1}, which, on every input (x, y) we consider, terminates and returns 1 if and only if (x, y) ∈ R.” (Section 3.1, p. 3) Inference: Verus compilation and verification can play the role of `Verify`, with a candidate consisting of Rust specifications and proof code, but this mapping is an engineering analogy, not a result of the paper.

## technique 1: represent proof ideas as a bidirectional hierarchy

What it is

A hierarchy is `z = (z0,…,zn)`, from a detailed plan `z0` to a coarse strategy `zn`. Three shared-backbone components use it: solver `Sθ`, foresight `Fθ` (coarse to fine), and hindsight `Hθ` (fine to coarse). The formal definition says: “A hierarchy z ∈ Z for a problem x ∈ X is intended to represent a semantically meaningful idea, plan, or approach for constructing a solution y ∈ Y for x at different levels of granularity.” (Section 4.1, p. 4)

When to use it

Use this when proof search benefits from a stable strategic plan but tactics are local and numerous. The method assumes a reference solution for hindsight training. Hindsight-generated ideas may be wrong or unusable; the paper treats them as training candidates rather than trusted proofs.

How to apply it

1. Choose levels `Z0,…,Zn`; the Lean implementation uses `n=1`, a detailed plan and a coarse idea (Section 5.1, p. 9).
2. Train hindsight bottom-up: sample `z̃0 ~ H0,θ(x,y)` from a verified solution and then `z̃j ~ Hj,θ(x,z̃j−1)` (Section 4.2, p. 4).
3. Train foresight top-down: sample `ẑn ~ Fn,θ(x)`, then refine with `ẑj ~ Fj,θ(x,ẑj+1)` (Section 4.2, p. 4).
4. Give the complete predicted hierarchy and the initial problem to the solver; it generates a candidate solution `ŷ` (Section 4.2, p. 4).
5. In a verifiable domain, run `Verify(x,ŷ)` immediately and stop on the first accepted candidate. The paper permits multiple sampled hierarchies and multiple candidates per hierarchy under a fixed budget (Section 4.2, p. 5).

Verus form (inference)

Inference: use a hierarchy such as (a) ownership/resource invariant, (b) data-structure invariant, and (c) top-level safety claim. Ask a planner to produce these as plain text or structured records, then condition proof search on them. The final candidate must be compiled and checked by Verus; only a passing verification result is accepted. Keep hierarchy text outside executable code and translate only selected claims into `requires`, `ensures`, `invariant`, `decreases`, `spec fn`, and proof code. Inference: unlike Lean tactics, Verus proofs may need explicit quantified lemmas and solver triggers, so a hierarchy should name those obligations rather than pretending a tactic sequence is sufficient.

Evidence, assumptions, limits

The evidence is a formal architecture and a hand-written arithmetic-series example; Figure 2 labels its texts “hand-written illustrations, not model outputs or empirical observations.” (Figure 2 caption, p. 5) No success rate, model comparison, or denominator exists. The paper warns that hindsight ideas may not be suitable foresight targets and calls for evaluation (Section 6, p. 12).

## technique 2: verifier-guided hindsight selection

What it is

For each verified pair `(x,y)`, sample `K` hindsight hierarchies, test each with the solver, and retain the one with the highest utility minus a compression penalty if its score exceeds `δ`. The paper's algorithm computes `Score(i) ← u(i) − λ · Penalty(z̃(i))`, chooses `arg max`, and returns `fail` below threshold (Algorithm 2, Section 4.6, pp. 7–8).

When to use it

Use this refinement when a deterministic verifier can cheaply reject failed candidates. It supplies a selection signal without changing the supervised training objective. It assumes utility is a useful proxy; a high score does not prove the hierarchy caused success.

How to apply it

1. Sample `K` hierarchies from `Hθ(·|x,y)` with parameters fixed during the call.
2. For each, run the joint `(Utility, DiscoveredSolution)` procedure and compute the penalized score.
3. Select the maximum-scoring candidate; return `(x, ỹ, z̃)` only if `Score ≥ δ`, otherwise return `fail` (Algorithm 2).
4. Add returned triples to the replay dataset and train all three components jointly (Section 4.4, p. 6).

Lean's concrete utility runs the solver `N` times under a fixed budget. If `M` runs succeed, it sets success ratio `r=M/N`, chooses the shortest discovered proof, and returns utility `r + η/ℓ`; if none succeeds, utility is zero (Section 5.3, p. 10). The denominator is exactly `N` solver runs for one hierarchy; `M` is the successful subset.

Verus form (inference)

Inference: for each generated proof plan, invoke Verus `N` times with fixed solver options or seeds, record whether verification passes and proof size/time, and retain plans whose pass ratio exceeds `δ`. Store only passing Rust candidates as training data. This is an experimental pipeline, not a Verus theorem: repeated verification is deterministic for a fixed source and configuration, so variation may come from generated candidates rather than the checker.

Evidence and limits

The paper supplies no measured results. It explicitly cautions: “a high score does not by itself establish that the retained idea helped the model solve the problem.” (Section 6, p. 12) The score can reward a solver that ignores the hierarchy, and selecting by score may introduce bias.

## technique 3: anti-hindsight seed generation

What it is

The Lean instantiation creates 15,000 seed hierarchies with a teacher model from verified theorem/tactic pairs, then uses the trained hindsight component thereafter. The teacher sees the initial state, complete proof, and metadata, but must produce a forward-usable plan rather than replaying tactics. Its prompt says: “The verified proof is evidence for inferring the idea, not something to copy.” (Appendix A.3, p. 16)

How to apply it

1. Start with pairs `(x,y)` where `Verify(x,y)=1`; the training source has 50,523 such pairs, with 2,000 held out for validation and 2,000 for testing, while 15,000 training pairs receive teacher hierarchies (Appendix A.2, p. 15).
2. Prompt the teacher for a detailed plan, a coarse idea, and an anti-hindsight check in JSON (Appendix A.3, pp. 15–16).
3. Exclude intermediate states from the teacher prompt; optionally use them only for later hindsight calls (Appendix A.2 and Section 5.2, p. 10).
4. Augment the pairs with generated hierarchies to form `D0`; later triples come from `Hθ` (Section 5.1, p. 9).

Verus form (inference)

Inference: generate plans from verified Verus functions while hiding later proof states and solver outcomes. Require the plan to mention the initial contract, intended invariant, and mathematical lemmas. Treat the plan as untrusted metadata; the Verus checker remains the acceptance gate. The anti-hindsight check can be a separate classifier or human audit, but the paper does not validate either.

Evidence and limits

The counts above are dataset construction counts, not success results. The source itself labels the teacher a data-generation tool and states that no empirical evaluation was performed.

## technique 4: joint prompt training with balanced batches

What it is

Each triple `(x,y,z)` yields `2n+k+2` prompt-response pairs: `n+1` foresight, `n+1` hindsight, and `k` solver tactic pairs (Section 5.4, p. 11). Groups are balanced with fixed counts `bS`, `bF`, and `bH`; a mini-batch has `b = bS + (n+1)(bF+bH)` pairs, with fractions `βS=bS/b`, `βF=(n+1)bF/b`, and `βH=(n+1)bH/b` (Section 5.4, p. 11).

How to apply it

1. Convert each verified proof and hierarchy into role-specific prompts.
2. Group by component and hierarchy level; shuffle each group independently.
3. Draw the prescribed count from each group, reshuffling exhausted groups without resetting others.
4. Minimize the weighted mean token loss `L(θ;D)` over solver, foresight, and hindsight group means (Section 5.4, pp. 11–12).

Verus form (inference)

Inference: create training records for plan generation, contract/specification generation, and proof-step generation, then balance them so long proofs do not dominate. A proof-step target should include the exact Verus error or verification condition, while the plan target states the invariant. Acceptance remains `verus` success, not token loss. The paper's loss is a training recipe, not a correctness argument.

Evidence and limits

The paper gives implementation versions (Lean 4.10.0, LeanDojo 2.1.3, InternLM2-Math-Plus-7B) and data counts in Appendix A.1–A.2, but no outcomes. It reports that the verifier may time out and treats timeout as rejection (Section 4.2, p. 4).

## what is proved and trusted

Proved in the paper: the abstract definitions of hierarchies, verifier-guided construction, training loop, and Lean data-conversion procedure. No theorem says the method improves proof success. Trusted: the deterministic verifier, reference solutions, model optimization, prompt interpretation, and all external Lean/mathlib behavior. The paper excludes `sorry` and `admit` from allowed Lean tactics (Section 3.1, p. 3), a useful hygiene rule for Verus equivalents.

## techniques for the catalog

- bidirectional hindsight/foresight hierarchy — reconstruct detailed-to-coarse ideas from verified solutions and predict coarse-to-detailed plans before proof search
- verifier-guided hierarchy selection — sample candidate plans, score them with repeated verified solves, penalize poor compression, and retain only scores above a threshold
- anti-hindsight seed generation — ask a teacher to infer forward-usable plans while withholding later proof states and forbidding tactic replay
- balanced multi-role training — jointly train solver, foresight, and hindsight prompts with fixed per-role batch fractions
