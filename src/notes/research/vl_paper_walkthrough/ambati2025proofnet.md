# ProofNet++: A Neuro-Symbolic System for Formal Proof Verification with Self-Correction
(authored by agents unless marked 🧑)
Tag: `ambati2025proofnet`, [paper](http://arxiv.org/abs/2505.24230v1)

ProofNet++ combines a language model with a symbolic proof-tree interface, a machine checker, verifier-guided reinforcement learning, curriculum training, and repair of rejected subtrees. The paper states its motivation plainly: “Current LLM-based systems suffer from hallucinated logical steps and unverifiable reasoning” (Abstract, p. 1). The implementation is described for Lean 4 and HOL Light, so the Verus mapping below is an inference.

## techniques

### symbolic proof-tree representation and checker loop

What it is: model output is parsed into a structured tree; nodes are statements or lemmas and edges are dependencies. A symbolic interface turns generated steps into tactics, and Lean 4 or HOL Light checks each step. The paper says, “The overall system forms a feedback loop where each generated proof step is formally validated before reinforcement or continuation” (III-A, p. 2).

When to use it: use this boundary whenever an LLM proposes a proof step that must be machine-checked before later generation depends on it. It localizes errors to a node and preserves dependency context.

How to do it: (1) fine-tune a transformer on formal proofs; (2) parse each generated tactic into a labeled n-ary proof tree; (3) submit the current step to the backend; (4) continue only on acceptance and retain the failed node plus its context on rejection. The paper explicitly defines the tree: “Each node corresponds to a logical statement or lemma” and “Each edge denotes a dependency or derivation step” (III-B, p. 2).

Verus form: Inference: represent the executable Rust function with `requires` and `ensures`; use `assert` and proof functions to establish intermediate facts, while the Verus verifier checks the resulting obligations. Verus does not consume Lean tactics or HOL trees, so the tree-to-tactic parser must be replaced by generation of Rust/Verus source and compilation with Verus. The executable code and its specification remain; proof-only code is erased.

Evidence and limits: the reported backend uses Lean 4 v4.1.0 and HOL Light with an eight-second proof timeout (IV-C, p. 3). The paper does not provide per-prompt denominators beyond dataset sizes, and the checker, specifications, and model remain trusted assumptions.

### proof-tree curriculum supervision

What it is: complete trees from mathlib and HOL Light are linearized into state-action sequences and sorted by syntactic complexity and logical depth. The paper says curriculum “encourages early learning of fundamental axioms and progressively harder lemmas” (III-B, p. 2).

How to do it: extract full trees; record each state and action; order examples from shallow to deep; train supervised next-step prediction; then expose deeper trees. Inference: for Verus, order examples from simple contracts and arithmetic lemmas to ownership, borrowing, and concurrency invariants. The paper’s data are Lean/HOL, so this transfer is a proposed adaptation.

### verifier-guided reinforcement learning

What it is: the checker is the environment and gives binary reward, `r = 1` for a verifiable step and `r = −1` otherwise; PPO or A3C updates the policy, and n-step returns propagate delayed subtree feedback (III-C, p. 2). The paper states, “The verifier acts as an environment: it accepts or rejects a given proof step” (III-C, p. 2).

How to do it: generate a candidate; submit it; assign the binary reward; update with PPO/A3C; propagate reward over the proof subtree; repeat. Inference: a Verus service can run `verus` on candidate Rust files and use successful verification as the positive reward. A failed compile or proof obligation is negative; the verifier itself supplies no semantic reward for a bad specification.

Evidence: Table I reports FPSR (fully validated proofs divided by prompts) of 68.4% on miniF2F, 74.9% on mathlib-extract, and 63.5% on HOL Light Testbed; PPC (valid intermediate steps divided by attempted steps) is 81.2%, 88.0%, and 76.5%, respectively (IV-D, Table I, p. 3). EDPT is an average tree-edit count, 3.2, 2.4, and 4.0; latency is mean milliseconds per validation call, 198, 176, and 214. These denominators and settings are the table’s metric definitions, not a claim of universal performance.

### rejected-subtree self-correction

What it is: rejection triggers extraction of the failed node and context subtree; a correction head proposes alternatives; the verifier tests replacements; successful replacement updates the tree and resumes forward generation (III-D, p. 2). The paper states, “If successful, the proof tree is updated and forward generation resumes” (III-D, p. 2).

How to do it: preserve the failure trace; generate depth-limited candidate substitutions; verify each; commit the first accepted candidate; regenerate downstream nodes. Inference: in Verus, pass compiler diagnostics and the local specification context to a repair model, apply a candidate patch, and rerun Verus. Do not mark the repair function `external_body`; the repaired function must itself verify.

Evidence and limits: on the paper’s approximately 120,000 normalized proofs, flawed prevalence is 23%; synthetic error injection increased flawed-sample diversity by 150%, and the split is 70%/15%/15% train/validation/test (V-A, p. 4). Post-correction, the paper reports a 36% reduction in tree edit distance and a 12% increase in proof success rate, but it does not state the absolute number of corrected test trees in that paragraph. Its final summary reports 94.7% verifier-confirmed correctness and reductions of hallucinated lemmas by 71%, topological errors fixed in 85.3% of cases, and incomplete induction recovered in 78.6% of trees (VII, p. 6). These figures depend on the stated corpus and synthetic-error setup.

## what is proved, measured, and trusted

Lean/HOL kernel acceptance proves only that submitted formal terms satisfy those systems’ rules. Measured outcomes are proof success, intermediate correctness, edit distance, and latency. The paper also reports a 2.4x speedup from batch verification with subtree memoization, 1.7x throughput from asynchronous scheduling, and an 88.9% accuracy/91.3% recall graph-transformer approximation trained on 40,000 subtrees (VI-B, p. 5). Inference: a Verus deployment would additionally trust Verus, Z3, Rust compilation, specifications, and external-library contracts. The paper’s 8-second timeout and long-proof degradation show scalability limits; HOL Light has both the lowest FPSR (63.5%) and highest latency (214 ms) in Table I.

## what VL should reuse and threat

VL should reuse the verifier-in-the-loop boundary, explicit failure traces, subtree-scoped repair, and curriculum over proof depth. It should not redo the paper’s generic Lean/HOL benchmark pipeline. Inference: for agent-written verified Rust, the threat is substantial at the workflow level: unconstrained generation can produce plausible but unverified contracts, while a compile-and-verify gate can reject them. The gate cannot detect a specification that is weaker than the product requirement, and the paper does not evaluate Verus, unsafe code, dependency assumptions, or production Rust.

## techniques for the catalog

- symbolic proof-tree checking — parse generated steps into dependency trees and validate every step before continuation
- proof-tree curriculum — train on linearized formal trees ordered from shallow to deep
- verifier-guided RL — use checker acceptance as binary reward and propagate it with n-step returns
- rejected-subtree repair — use diagnostics to propose, verify, and commit local tree substitutions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
