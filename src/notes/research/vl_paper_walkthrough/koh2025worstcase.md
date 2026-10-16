# Worst-Case Symbolic Constraints Analysis and Generalisation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `koh2025worstcase`, [paper](https://arxiv.org/abs/2506.08171)

## problem and verifier-backed design
The paper studies generation of symbolic constraints describing worst-case program executions. Symbolic execution can produce exact path constraints but suffers exponential path growth. WARP (Worst-case Asymptotic Reasoner for Path constraints) obtains solver-checked constraints at small input sizes, asks an LLM to generalize them to larger sizes, and uses SMT feedback during reinforcement learning. The paper’s abstract states that WARP “computes worst-case constraints on smaller concrete input sizes using existing program analysis tools, and then leverages LLMs to generalise these constraints to larger input sizes.” (Abstract, p. 1.) Inference: this is a transferable pattern for Verus: generate candidate invariants or contracts, check them with a formal solver, and train or prompt from checked small cases rather than trusting free-form proof text.

## technique 1: incremental constraint curation
Inference: Use this when exhaustive symbolic execution at the target size is infeasible. Run SPF-WCA on each Java program at several tractable sizes. It returns SMT path constraints under a depth-of-symbolic-path cost model. Put the resulting sequence `{Φ_n1, Φ_n2, …, Φ_nk}` in the prompt or training record and request a held-out constraint `Φ̂_n` for a larger `n`; correctness means solver-based semantic equivalence. The paper defines this as “semantics-preserving pattern induction” (Section 3.3, pp. 6–7).

The benchmark’s concrete example is QuickSort. At n=3, one worst-case constraint is `(assert (and (<= in0 in2) (<= in1 in2) (<= in0 in1)))`; at n=12, path count grows by 2^12 = 4096 relative to the illustrative small case; at n=30, exhaustive exploration would involve about 2^30 paths (Section 3.1, pp. 4–5). Inference: for Verus, curate checked proofs for small array lengths or loop bounds, then ask an agent to generalize the invariant schema. The larger proof must still be discharged by Verus; examples are scaffolding, not evidence of universal validity.

## technique 2: canonical machine-readable outputs
The vanilla baseline prompts GPT-5 to output one canonical SMT assertion for each Java program and input size in `{2,4,8,16,30}`. A result counts only if it is syntactically valid and semantically equivalent to the Z3-verified ground truth (Section 3.2, pp. 5–6). Direct GPT-5 prompting obtains 13/100 correct outputs: 20 programs times five input sizes (Table 1, p. 6). Most outputs are syntactically valid but semantically wrong.

Inference: VL should require generated Verus code and proof annotations in a parser-ready format, then invoke Verus and Rust compilation. Separate formatting failures from parser failures and semantic proof failures; otherwise a model may appear weak because an extractor missed a valid proof. Canonical syntax reduces evaluation noise but cannot ensure that the stated contract matches the product requirement.

## technique 3: solver-guided reinforcement learning (RLSGF)
WARP-1.0-3B is fine-tuned from Qwen2.5-3B with a prompt that supplies smaller constraints and requests a canonical SMT-LIB answer in `<answer>` tags. Each rollout receives a semantic reward of one when Z3 proves equivalence to the ground truth and zero otherwise, plus a smaller syntactic reward for exact `<think>…</think><answer>…</answer>` formatting. The total reward is `0.1 × Syntactic_Reward + 0.9 × Semantic_Reward` (Section 4.3, pp. 9–10). Group Relative Policy Optimisation (GRPO) estimates advantages from group scores without a critic model. Training uses learning rate 10^-6, KL penalty 0.001, bfloat16, two A100 80GB GPUs, batch size 256, sequence limits 2048, and 16 rollouts per prompt (Section 4.3, p. 10).

Inference: a Verus analogue can assign reward only after `verus` accepts the generated proof and a separate test/specification check passes. A runtime proof function cannot be used as evidence unless it is actually verified; keep proof code separate from executable code. Solver feedback is a training signal, not a replacement for checking the final artifact.

## technique 4: bidirectional UNSAT equivalence
For generated formula `φ̂` and ground truth `φ★`, the paper checks both `(φ★ ∧ ¬φ̂)` and `(φ̂ ∧ ¬φ★)` for unsatisfiability. This certifies logical equivalence rather than string similarity (Section 4.4, p. 10). The paper states: “This bidirectional UNSAT test guarantees that no interpretation satisfies one constraint while violating the other.” (Section 4.4, p. 11.) Accuracy is the proportion of outputs that are syntactically valid and solver-equivalent.

Inference: Verus contract equivalence can be approximated by proving mutual implication over the same preconditions, but the exact proof obligations depend on the specification logic. Use `requires` to state the common domain and `ensures` for each direction, with `proof fn` lemmas for arithmetic. Do not call an unverified proof at runtime; the verifier’s checked result is the evidence.

## technique 5: benchmark construction with held-out extrapolation
The fine-tuning corpus has 23,600 instances: 17,700 training and 5,900 test examples. An independent benchmark has over 600 instances from 20 Java programs; after prompt-size and n≤30 filtering, the final set is 671 instances (Section 4.2, pp. 7–9). Each instance provides constraints at several smaller sizes and holds out a larger target, preventing direct memorization of the target solution. Difficulty is stratified by jump size (small, medium, large), and prompts are truncated to three representative examples when all examples exceed the output budget.

Inference: a VL benchmark should split by program family and proof shape, not only by random examples, and should hold out target loop bounds or data structures. The paper’s 20 programs and n≤30 scope cannot establish performance on arbitrary software; a product benchmark needs larger and adversarial cases.

## measured results and failure modes
Under WARP prompting, GPT-5 averages 95.47% across three trials on the 671-instance benchmark, whereas direct prompting is 13/100 on the separate 100-case baseline. WARP-1.0-3B averages 41.08% (41.43, 41.58, 40.24; ±0.72) versus Qwen2.5-3B-Instruct at 9.79% (9.99, 8.20; ±1.49 as tabulated) (Table 2, p. 12). The trial values are percentages over the benchmark evaluation runs; the table does not restate a per-trial denominator, while Section 4.2 defines 671 instances.

Error categories are dependent: formatting must succeed before syntax can be parsed, and syntax must succeed before semantic equivalence can be checked. Aggregated over three trials, WARP-1.0-3B has 827 correct, 275 syntax, 497 semantic, and 414 formatting outcomes (Table 3, p. 14). In a case study, a baseline reverses inequality direction and omits a strict operator, while WARP generates a solver-equivalent chain; another WARP output is solver-equivalent but lacks `<answer>` delimiters (Sections 5.3.1–5.3.2, pp. 14–16). Inference: a proof-agent dashboard should report these dependent categories separately and retain solver-equivalent artifacts even when packaging fails, while still requiring a corrected package before merge.

Accuracy degrades for large extrapolation jumps. Across program families, Dijkstra has 3.57% micro-accuracy and BinarySearch 8.75% overall, while TowerOfHanoi and MazeSolver reach 88.99% and 85.92% (Section 5.4.3, p. 17). These are family-level aggregate percentages, not guarantees for individual programs.

## trusted components, limits, and VL threat
Z3 equivalence checks, SPF-WCA constraints, Java source programs, ground-truth formulas, benchmark filtering, and the reward implementation are trusted. The LLM’s reasoning text is explicitly unscored; formatting can hide a semantically correct formula. The authors list internal-validity risk from automated Z3 checks and uniform prompts, construct-validity risk from binary metrics, external-validity limits of 20 Java programs and n≤30, and token-length limits (Section 5.5, pp. 17–18). The paper warns: “purely non-symbolic approaches do not offer formal correctness guarantees.” (Related Work, p. 3.)

Inference: threat to agent-written verified Rust is high when an agent extrapolates invariants beyond checked cases, and lower after Verus proves the final contract. However, Verus proves the supplied specification, so an incorrect postcondition can still produce a formally verified but functionally wrong product. VL should reuse incremental examples, solver-aligned rewards, canonical output, and error taxonomy; it should add requirement review and independent semantic tests. The paper has already demonstrated why direct prompting alone is insufficient for symbolic constraints.

## techniques for the catalog
- incremental solver-checked examples: derive small constraints with symbolic execution and generalize to larger bounds
- canonical formal output: require parser-ready SMT or Verus artifacts with explicit delimiters
- solver-guided reinforcement: reward semantic equivalence far more than formatting
- bidirectional equivalence: prove both formulas imply each other with UNSAT checks
- held-out extrapolation benchmark: test unseen larger sizes and stratify jump difficulty
- dependent error taxonomy: separate formatting, syntax, and semantic verification outcomes
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
