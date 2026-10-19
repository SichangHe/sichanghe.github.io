# ProofNet++: A Neuro-Symbolic System for Formal Proof Verification with Self-Correction
(authored by agents unless marked 🧑)
Tag: `ambati2025proofnet`, [paper](https://arxiv.org/abs/2505.24230v1)

ProofNet++ combines a language model with a symbolic proof-tree interface, a machine checker, verifier-guided reinforcement learning, curriculum training, and repair of rejected subtrees. The paper states its motivation plainly: “Current LLM-based systems suffer from hallucinated logical steps and unverifiable reasoning.” (Abstract, p. 1). The implementation is described for Lean 4 and HOL Light, so the Verus mapping below is an inference, not an evaluated result.

### symbolic proof-tree representation and checker loop

What it is: model output is parsed into a structured tree; nodes are statements or lemmas and edges are dependencies. A symbolic interface turns generated steps into tactics, and Lean 4 or HOL Light checks each step. The paper says, “The overall system forms a feedback loop where each generated proof step is formally validated before reinforcement or continuation.” (III-A, p. 2).

Inference: use this boundary when later generation depends on a proposed step being accepted by a formal checker. A tree can retain the failed node and its dependency context for repair.

How to do it: (1) fine-tune a transformer on formal proofs; (2) represent generated steps in a labeled n-ary proof tree and translate them into formal tactics; (3) submit the current step to the backend; (4) continue only on acceptance and retain the failed node plus its context on rejection. The paper explicitly defines the tree: “Each node corresponds to a logical statement or lemma.” and “Each edge denotes a dependency or derivation step.” (III-B, p. 2).

Verus form: Inference: represent the executable Rust function with `requires` and `ensures`; use `assert` and proof functions to establish intermediate facts, while the Verus verifier checks the resulting obligations. Adapt the interface to generate and check Verus source rather than Lean/HOL tactics. This adaptation is not described or tested in the paper.

Evidence and limits: the reported backend uses Lean 4 v4.1.0 and HOL Light with an eight-second proof timeout (IV-C, p. 3). Inference: the reported percentages cannot be reconstructed exactly from the paper because it gives approximate dataset sizes without exact evaluated prompt counts. Formal acceptance also depends on the checker and the submitted specification; model reliability alone does not establish correctness.

### proof-tree curriculum supervision

What it is: complete trees from mathlib and HOL Light are linearized into state-action sequences and sorted by syntactic complexity and logical depth. The paper says, “This encourages early learning of fundamental axioms and progressively harder lemmas.” (III-B, p. 2).

How to do it: extract full trees; record each state and action; sort proofs by syntactic complexity and logical depth; train on the linearized sequences, introducing harder proofs progressively. Inference: for Verus, order examples from simple contracts and arithmetic lemmas to ownership, borrowing, and concurrency invariants. The paper’s data are Lean/HOL, so this transfer is a proposed adaptation.

### verifier-guided reinforcement learning

What it is: the checker is the environment and gives binary reward, `r = 1` for a verifiable step and `r = −1` otherwise; PPO or A3C updates the policy, and n-step returns propagate delayed subtree feedback (III-C, p. 2). The paper states, “The verifier acts as an environment: it accepts or rejects a given proof step.” (III-C, p. 2).

How to do it: generate a candidate; submit it; assign the binary reward; use n-step returns over proof subtrees for delayed feedback; update the policy with PPO or A3C; repeat. The paper names both algorithms but does not identify which produced Table I. Inference: a Verus service can run `verus` on candidate Rust files and use successful verification as the positive reward. A failed compile or proof obligation is negative; the verifier itself supplies no semantic reward for a bad specification.

Evidence: Table I reports FPSR (fully validated proofs divided by prompts) of 68.4% on miniF2F, 74.9% on mathlib-extract, and 63.5% on HOL Light Testbed; PPC (valid intermediate steps divided by attempted steps) is 81.2%, 88.0%, and 76.5%, respectively (IV-D, Table I, p. 3). EDPT is defined as the minimum number of subtree transformations needed to reach a correct proof structure, computed with post-order tree edit distance; Table I reports 3.2, 2.4, and 4.0; latency is mean milliseconds per validation call, 198, 176, and 214. These denominators and settings are the table’s metric definitions, not a claim of universal performance.

### rejected-subtree self-correction

What it is: rejection triggers extraction of the failed node and context subtree; a correction head proposes alternatives; the verifier tests replacements; successful replacement updates the tree and resumes forward generation (III-D, p. 2). The paper states, “If successful, the proof tree is updated and forward generation resumes.” (III-D, p. 2).

How to do it: preserve the failure trace; generate depth-limited candidate substitutions; submit replacements to the verifier; update the tree on successful verification and resume generation. Inference: in Verus, pass compiler diagnostics and the local specification context to a repair model, apply a candidate patch, and rerun Verus. Require the patched function to pass verification rather than treating a generated patch as evidence of correctness.

Evidence and limits: on the paper’s approximately 120,000 normalized proofs, flawed prevalence is 23%; synthetic error injection increased flawed-sample diversity by 150%, and the split is 70%/15%/15% train/validation/test (V-A, p. 4). The paper reports, “Synthetic flawed data validated error detection with 94.7% accuracy and 91.3% recall.” (V-C, pp. 4–5). It also reports a 36% reduction in tree edit distance and a 12% increase in proof success rate (V-C, p. 5). The conclusion calls the latter a “12% absolute improvement in final proof success rate” and reports “an overall verifier-confirmed correctness of 94.7%” (VII, p. 5). Inference: those passages assign 94.7% to different outcomes without explaining the relationship. The conclusion additionally reports hallucinated lemma prevalence reduced by 71%, topological misorderings mitigated in 85.3% of cases, and valid induction structure recovered in 78.6% of incomplete proof trees (VII, pp. 5–6). Exact counts of corrected test trees are not supplied.

### verification cost optimizations

What it is: batch structurally similar proofs and reuse subtree results through memoization and dependency-aware caching; train a graph transformer to predict verification success and prune low-likelihood branches from RL rollouts; evaluate subtrees asynchronously with an event-driven scheduler (VI-B, p. 5).

Evidence and limits: the paper reports a 2.4× verification speedup for batching, an approximation model trained on 40,000 subtrees with 88.9% accuracy and 91.3% recall on synthetic flawed data, approximately 35% of low-likelihood branches skipped, and a 1.7× mean throughput gain for asynchronous evaluation. It states, “However, computational costs remain prohibitive for scaling beyond our current corpus of approximately 120,000 annotated trees.” (VI-B, p. 5). Inference: an approximate checker can prioritize search; its prediction alone does not establish formal acceptance.

## what is proved, measured, and trusted

Inference: Lean/HOL kernel acceptance establishes correctness relative to the submitted formal statement and the formal system. It does not establish that the statement captures a product requirement. Measured outcomes include proof success, intermediate correctness, tree edit distance, and verifier latency. HOL Light has the lowest FPSR (63.5%) and highest latency (214 ms) in Table I (IV-D, p. 3).

The abstract claims, “We provide theoretical analysis of the convergence and stability of the verifier-guided RL framework and release our datasets and codebase for future research.” (Abstract, p. 1). Inference: the supplied six-page paper contains no convergence derivation or linked code/data release, so those claims are not independently established here. It also does not give a comparative baseline table or a detailed ablation table supporting its state-of-the-art claim. Its current integration is explicitly limited: “Our architecture currently parses LLM outputs into symbolic trees post-hoc, resulting in a loosely coupled relationship between neural and symbolic components.” (VI-C, p. 5). Joint embeddings, a backward planner, and differentiable verifiers are proposed future directions; they are not the current correction algorithm. A preliminary contrastive-loss experiment on 50,000 proof trees is reported to improve logical coherence scores by 9.8% (VI-C, p. 5).

## techniques for the catalog

- symbolic proof-tree checking — parse generated steps into dependency trees and validate every step before continuation
- proof-tree curriculum — train on linearized formal trees ordered from shallow to deep
- verifier-guided RL — use checker acceptance as binary reward and propagate it with n-step returns
- rejected-subtree repair — use diagnostics to propose, verify, and commit local tree substitutions
- verification cost reduction — batch similar trees, cache subtree results, prune RL branches with a learned approximation, and schedule subtree evaluations asynchronously
