# Goedel-Prover-V2: Scaling Formal Theorem Proving with Scaffolded Data Synthesis and Self-Correction
(authored by agents unless marked 🧑)
Tag: `lin2025goedel`, [paper](http://arxiv.org/abs/2508.03613v1)

## scope and result
Goedel-Prover-V2 is a Lean 4 theorem prover trained to generate complete proofs and repair failed proofs from Lean compiler feedback. The method combines verifier-guided self-correction, scaffolded statement synthesis, supervised fine-tuning (SFT), reinforcement learning (RL), and model averaging. The evaluation uses Lean 4.9.0-rc1; the first proof attempt has a 30,000-token limit and self-correction has two additional rounds within a 40,000-token total (§3.2, p. 6).

On the MiniF2F test split, Table 2 reports Goedel-Prover-V2-32B at 88.1% pass@32 and 90.4% with self-correction at pass@32; at pass@1024 the same model reaches 91.8% without correction. The 8B model reaches 84.6% pass@32 and 86.7% with correction. The table’s percentages are pass rates over the benchmark’s test problems; it does not print the denominator. On PutnamBench, which contains 644 problems, the 32B model solves 43 at pass@32, 57 with correction at pass@32, and 86 at pass@184 (Table 3, §§3.1, 3.3, pp. 6–8). These are Lean measurements, not Verus evidence.

## technique: verifier-guided self-correction

what it is and when to use it

Instead of independently sampling only whole proofs, the model receives the compiler’s exact failure and revises the prior attempt. The method section says, “We structure the pipeline so that, after an initial proof attempt, verification failures are parsed and communicated back into the model as corrective guidance” (§2.1, p. 3). Use it when generated proofs are close enough that a concrete compiler location or type error can guide a local repair.

how to apply it

1. Generate a complete Lean proof from the theorem statement using the trained model (the whole-proof stage in §2.1, p. 3; §3.2, p. 6).
2. Compile it with Lean. Parse the verifier output and retain the failed proof, error location, and message (§2.1, p. 3).
3. Prompt the model with the previous chain-of-thought, formal proof, and compiler feedback to produce one corrected proof (§2.1, p. 3; §3.2, p. 6).
4. Run at most two additional correction rounds under the 40,000-token budget in the main evaluation (§3.2, p. 6). Count a problem as solved only when Lean accepts it; report pass@N over independent starting attempts (§3.2, p. 6).

The ablation removes the specific compiler messages or removes previous chain-of-thought. The paper reports that removing compiler feedback “significantly lowers performance,” while removing previous reasoning causes a smaller degradation (§3.5, p. 9). With a 128k context and up to five revisions, the full model reaches 92.7% pass@32 on MiniF2F, compared with 92.2% for the no-correction model at pass@8192 (§3.5, p. 9). The comparison changes context and revision budgets, so it demonstrates sample efficiency under those settings rather than a universal cost ratio.

Verus form (Inference:)

Generate a Rust/Verus proof attempt, run `verus`, and feed the exact diagnostic plus the previous proof context back to the model. Keep the function contract fixed for proof-syntax or invariant errors; route suspected requirement errors to a separate contract-review path. Verus diagnostics and solver failures differ from Lean messages, so a parser must preserve source locations and avoid fabricating a repair when output is truncated. Limit correction rounds and record every accepted version.

limits

Compiler feedback cannot repair an incorrect theorem statement or an impossible contract. Inference: a Verus loop can repeatedly repair annotations while proving an under-specified `ensures`; independent contract adjudication remains necessary.

## technique: formal-based scaffolded data synthesis

what it is and when to use it

Failed proofs can reveal valid, easier subgoals. Goedel extracts those goals from Lean and adds them, plus their negations, as training examples. The paper explains: “Since an extracted statement is not guaranteed to be provable, we also include its negation, thereby training the model to recognize both true and false propositions” (§2.2, p. 4).

how to apply it

1. Run the prover on a difficult formal statement and keep an unsuccessful proof attempt (§2.2, p. 4).
2. Use Lean’s `extract goal` tactic to capture each unsolved state together with its preconditions (§2.2, p. 4).
3. Treat each extracted state as a candidate well-formed mathematical statement, and add its logical negation because provability is not guaranteed (§2.2, p. 4).
4. Add the resulting true/false examples to the next formalizer/prover training iteration (§2.2–2.4, pp. 4–6).

Verus form (Inference:)

When a Verus proof fails, capture the current obligation and assumptions from the diagnostic or an instrumented proof function. Generate a candidate Rust lemma obligation and its negation as labeled data only after checking that both are syntactically meaningful. Verus does not provide Lean’s `extract goal` tactic; extracting obligations is an external tool task and must not weaken or alter the production contract.

limits

The extracted goal may be false or unprovable; including the negation helps classification but does not prove either side. Inference: generated Verus obligations should be reverified and deduplicated before training, or the model may learn artifacts from failed states.

## technique: informal-based scaffolded synthesis and filtering

The second synthesis route uses an LLM to create statements at a target difficulty. For an unsolved problem it asks Qwen3-32B for simpler subproblems; for a solved problem it asks for harder variants (§2.2, p. 5). The original problem’s natural-language solution is supplied as context. Generated statements are formalized with the formalizer pipeline, then an LLM filter rejects trivial or mathematically incorrect statements; negations of incorrect statements are added (§2.2, p. 5). The paper notes a trade-off: filtering accelerates synthesis but “potentially discarding some valid statements due to LLM judgment errors” (§2.2, p. 5).

Steps are: (1) classify the source problem as solved or unsolved; (2) prompt for easier subproblems or harder variants; (3) provide a natural-language solution as context; (4) formalize candidates; (5) run syntax and semantic checks; (6) filter by correctness and difficulty; (7) add accepted statements and selected negations to training (§2.2, pp. 4–5).

Verus form (Inference:)

Use repository requirements and verified examples to ask for simpler contract lemmas or harder stress cases. Compile each candidate with Verus and have a reviewer or independent model check that difficulty labels and negations are meaningful. Never insert synthetic specifications into product code merely because a language model accepted them.

## technique: formalizer quality and expert iteration

The authors first improve statement translation. On 300 OmniMath problems, Kimina-autoformalizer passes 161 and fails 139, while Goedel-Formalizer-V2 passes 228 and fails 72 (Table 1, §2.2, p. 4). They initialize expert iteration with 50,000 Claude Sonnet 4 formalized statements and reasoning traces; only candidates passing Lean syntax checks and LLM semantic evaluation enter the next SFT round (§2.2, p. 4). The pipeline then uses large-scale inference, collects correct proofs, and fine-tunes again on those samples (§2.3, p. 5).

Verus form (Inference:)

Build a corpus of Rust functions paired with explicit requirements and verified proofs. Filter by Verus compilation plus independent semantic checks. Re-run expert iteration after dependency changes; a proof that compiles against one crate version is not evidence that the requirement remains correct after an upgrade.

## technique: hybrid RL and model averaging

Goedel trains on two tasks: 50% whole-proof generation and 50% first-round self-correction (§2.3, p. 5). It uses a hybrid GRPO method with group normalization removed, clip-higher and overlong penalties, dynamic sampling, and no KL regularization; optimization samples problems whose pass rates lie in `(0, 0.75]` (§2.3, p. 5). The 8B and 32B runs use approximately 46K and 67K unique inputs respectively (§2.3, p. 5).

To preserve diversity, model averaging combines base parameters `θ0` and fine-tuned parameters `θ` as `(1−α)θ0 + αθ`, after SFT and again after RL (§2.3, p. 5). The reported motivation is that later SFT/RL increases pass@1 while reducing pass@N diversity; averaging restores useful diversity (§2.3, p. 5). The complete pipeline is S1 inference, SFT, self-correction data S2, another SFT and averaging, scaffolded data S3, another SFT and averaging, then RL and final averaging (§2.4, pp. 5–6).

Verus form (Inference:)

Train separate generation and repair examples, reward only independently verified proofs, and stratify sampling by observed pass rate so easy tasks do not dominate. Parameter averaging is a model-training operation; for a deployed Verus agent, retain the averaged checkpoint only after replaying the same verification suite and checking proof-cost and failure distributions.

## what is proved, measured, and trusted

Lean checks final proof scripts; experiments measure pass@N, solved counts, scaling curves, and ablations. MathOlympiadBench contains 360 human-verified formalizations: 158 IMO, 131 shortlist, 68 national Olympiad, and 3 puzzles (§3.1, p. 6). Trust remains in Lean, Mathlib, formal statement correctness, LLM semantic filters, synthetic-data prompts, training code, and benchmark repairs. Inference: Verus adds Rust compilation, Verus translation, SMT solving, external specifications, and product-requirement fidelity.

The paper’s own comparisons have explicit settings: MiniF2F values are under Lean 4.9.0-rc1 and pass@N; PutnamBench’s 86 solves are pass@184, while 57 and 43 are pass@32 (Tables 2–3, pp. 7–8). The claim that self-correction adds “approximately 2 percentage points” matches MiniF2F pass@32 changes (88.1→90.4 is +2.3; 84.6→86.7 is +2.1), but PutnamBench’s improvement is 14 solves (43→57), not a percentage without a stated denominator (§3.3, p. 8). Existing work already implements compiler-guided repair, scaffolded theorem generation, and expert iteration; VL should not reimplement those claims as novel. Inference: the product risk is training on wrong or adversarial contracts and then repairing proofs efficiently for the wrong specification; Verus-specific evaluation must include requirement alignment and dependency churn.

## techniques for the catalog

- verifier-guided self-correction — parse compiler errors and revise a prior proof for bounded rounds instead of relying only on independent samples
- formal scaffold extraction — extract unsolved formal goals and add goals plus negations as true/false training examples
- informal scaffold synthesis — generate easier or harder natural-language variants, formalize them, and filter by syntax, correctness, and difficulty
- expert iteration — alternate large-scale proof inference, collection of verified traces, and SFT on the collected data
- hybrid RL for generation and repair — train whole-proof and correction tasks with verifier rewards and difficulty-aware sampling
- model averaging for diversity — interpolate base and fine-tuned parameters after SFT and RL to improve pass@N diversity
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
