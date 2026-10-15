# CombiBench: Benchmarking LLM Capability for Combinatorial Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2025combibench`, [paper](http://arxiv.org/abs/2505.03171v1)

## scope and contribution

The paper introduces a 100-problem Lean 4 benchmark for combinatorics and Fine-Eval, an evaluation protocol that checks both ordinary proofs and fill-in-the-blank answers. The abstract states: “We introduce CombiBench, a comprehensive benchmark comprising 100 combinatorial problems, each formalized in Lean 4 and paired with its corresponding informal statement.” The benchmark combines 10 Hackmath problems, 42 exercises from Brualdi’s textbook, 36 IMO problems, and 12 problems from other competitions (section 3, pp. 4–5; Table 2). It covers fourteen textbook topic areas, including permutations, pigeonhole arguments, inclusion-exclusion, recurrences, graph theory, and Pólya counting (section 3, p. 4).

The benchmark is meant to expose the formalization gap. The authors report that “The above formal mathematics benchmarks in Lean 4 scarcely cover combinatorial mathematics.” They identify three causes: no robust combinatorics benchmark, limited combinatorics content in Mathlib, and a larger gap between informal and formal statements because each problem often needs unique definitions (section 1, p. 3). Inference: VL should treat combinatorics as a separate domain-coverage problem: a verifier can check a Rust proof only after the domain definitions and lemmas exist.

## technique 1: construct a domain benchmark with paired informal and formal statements

What it is. Build a manually curated corpus in which every informal competition statement is paired with a Lean 4 statement, then classify source, topic, difficulty, and whether a solution must be supplied. The authors sampled three exercises from each of Brualdi’s fourteen chapters and removed IMO 2004 P3 because its statement contains an image (section 3, pp. 4–5). They use systematic names such as `brualdi_ch8_6` and `imo_2019_p5` (section 3, p. 5).

When to use it. Use this when measuring an agent’s formal reasoning rather than only its ability to solve natural-language mathematics. The paired corpus lets a system be tested on both translation and proof.

How to apply it. (1) Choose a source taxonomy and topic list. (2) Select problems with a stated sampling rule. (3) Formalize each statement in Lean 4, retaining the informal version. (4) Record source and difficulty metadata. (5) Exclude cases whose essential data cannot be represented, and document exclusions. (6) Count formalization size to identify outliers. The paper reports that more than half of CombiBench statements exceed ten nonblank lines, more than a quarter exceed twenty, and the longest reaches 67 lines (section 3, p. 6; Figure 1).

Verus form. Inference: the analogous VL artifact is a corpus of Rust specifications plus Verus `requires`, `ensures`, `spec fn`, and proof functions. The informal statement remains documentation; the executable contract and proof are the checked benchmark item. Lean definitions and tactics do not carry over. The sampling and metadata procedure does.

Evidence and limits. The corpus has 100 items and 100% combinatorics coverage in the benchmark comparison (Table 1, p. 3). The construction is manual, so coverage depends on author choices. Inference: benchmark scores measure this selected distribution, not all combinatorics.

## technique 2: two-stage Fine-Eval for fill-in-the-blank proofs

What it is. Fine-Eval turns answer checking into a theorem-proving task. The paper says: “Fine-Eval interacts with two servers, LLM and Lean.” The LLM receives a complete formal statement in which blanks are replaced with `sorry`; Lean compiles the returned code. The output must contain no `sorry`, define no new axioms, compile without errors, and preserve every nonblank part exactly (section 4.1, p. 6).

When to use it. Use this protocol when a task asks an agent to provide both a mathematical value and a proof. Ordinary pass/fail proof checking cannot tell whether a generated fill-in value is correct when it differs syntactically from a reference value.

How to apply it, stage 1. (1) Replace each answer blank with `sorry`. (2) Ask the model for a complete Lean snippet. (3) Strip comments and reject any output containing `sorry` or new axioms. (4) Require exact preservation of all nonblank input text. (5) Compile with Lean. (6) If the proof compiles and the answer text exactly equals the ground truth, count a pass. The paper’s example defines `sol : ENNReal := 10 / 20` and checks a probability statement with a Lean proof (Figure 2, p. 7).

How to apply it, stage 2. If the answer is not textually equal, generate a proposition asserting `model_answer = ground_truth`, then first try `rfl` and `norm_num`. The paper gives the exact shape: “example : imo_2006_p2_solution = ground_truth := by / try rfl / try norm_num” (section 4.1, p. 6). If these tactics fail, send the equality proposition back to the LLM and require a proof. To prevent a trivial first answer followed by a long ground-truth reconstruction, cap the second proof at 42 characters after removing whitespace (section 4.1, p. 7).

Verus form. Inference: use a Rust value plus a `proof fn` whose `ensures` states equality to the reference specification. First attempt definitional simplification or arithmetic lemmas; if that fails, request a short proof of the equality. Verus has no Lean `rfl`/`norm_num` pair with identical behavior, so the specific tactics do not carry over. Keep the exact-input preservation and rejection of axioms as harness rules.

Evidence and limits. The protocol compiles candidate proofs in Lean, so the kernel checks the final claim. The second-stage 42-character cap is a paper-specific anti-cheating heuristic, not a soundness theorem. Inference: a product harness should log compiler version, imported libraries, and whether admitted axioms or external bodies are allowed; otherwise results are not reproducible.

## technique 3: simplified one-stage equivalence checking

What it is. The paper offers a cheaper variant: perform stage 1, and when exact matching fails, try only `rfl` on the generated answer versus the ground truth (section 4.1, p. 7). It states that this “enables the evaluation of fill-in-the-blank problems using only a single Large Language Model (LLM) call.”

When to use it. Use it when answers are expected to be definitionally equal and the cost of a second model call matters. It is stricter than two-stage Fine-Eval because algebraically equivalent but non-definitional answers fail.

How to apply it. (1) Generate and compile the filled statement under the stage-1 restrictions. (2) If the answer text differs, add an equality example. (3) run `rfl`. (4) Count a pass only if Lean closes the equality. The Figure 3 example uses `example : sol = 1 / 2 := by rfl` (p. 8).

Verus form. Inference: first use a `proof fn` that establishes equality by unfolding definitions; there is no general Verus `rfl` tactic contract to copy. Preserve the strict one-call budget only as an evaluation policy.

Evidence and limits. The authors say one-stage checking is easier to embed but imposes stricter requirements (section 4.1, p. 8). It can reject valid but non-definitional answers, so it is unsuitable when mathematical equivalence needs algebraic normalization.

## measured results and trusted components

The evaluation uses whole-proof generation and reports pass@1, pass@8, and pass@16 on 100 problems (section 4.2, p. 8; Table 3). Kimina-Prover Preview, a 72B theorem-proving model, obtains 2/100 at pass@1, 6/100 at pass@8, and 7/100 at pass@16 in both with-solution and without-solution settings. Gemini-2.5-pro-preview obtains 4/100 at pass@16 with solution and 3/100 without; the other general models obtain at most 2/100. Goedel-Prover, STP, and Leanabell-Prover-GD-RL obtain 0/100 in every listed budget. These denominators are the 100 CombiBench problems, and the settings are whole-proof generation with or without a supplied solution (Table 3 caption, p. 8). The paper notes that the reported 7/100 result is from a model not trained specifically on combinatorics or fill-in-the-blank tasks (section 4.2, p. 8).

The Lean compiler and kernel, Mathlib, the benchmark formalizations, and the exact harness rules remain trusted. The LLM is untrusted and only receives credit after compilation. Inference: a Verus deployment should similarly trust the Verus checker and pinned standard library, while treating generated Rust and proof search as untrusted input. The benchmark does not measure soundness of Lean or Mathlib themselves, nor does it test Rust or Verus.

## contradictions, reuse, and VL threat

The paper reports that with-solution and without-solution results are almost identical for general reasoning models and identical for both evaluation methods in the without-solution case (section 4.2, p. 8). This supports the authors’ inference that answers are usually wholly correct or wholly wrong, but the paper does not provide per-problem traces. No numerical contradiction is visible between Table 3 and the prose: the best score is 7/100 in both settings.

Inference: direct product threat is moderate. The work demonstrates a robust verify-after-generation harness and highlights missing domain libraries, but it does not provide a method for verifying systems code, concurrency, memory safety, or adversarial Rust. VL should reuse the staged admission pattern and exact-output checks while building domain-specific Verus libraries and tests. Existing theorem-prover benchmarks already cover this evaluation design; VL should not redo a generic fill-in-the-blank harness without adapting it to Rust contracts.

## techniques for the catalog

- paired formal benchmark: curate informal problems with Lean or Verus statements, metadata, and documented exclusions
- staged answer verification: compile exact model output, then prove equality to a reference when syntax differs
- strict one-call check: use definitional equality as a low-cost but deliberately incomplete fallback
Checked 2026-10-15 against paper liu2025combibench: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
