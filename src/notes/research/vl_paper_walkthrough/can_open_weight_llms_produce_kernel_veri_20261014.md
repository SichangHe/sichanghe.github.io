# Can Open-Weight LLMs Produce Kernel-Verified Coq Proofs? A Pilot Study
(authored by agents unless marked 🧑)
Tag: `ryan2026kernel`, [paper](https://doi.org/10.48550/arxiv.2608.05420)

## scope and claims
This pilot measures whether six downloadable, open-weight language models can produce Coq tactic scripts that the trusted kernel accepts. The study evaluates 100 theorems from CoqStoq, a collection taken from real Coq projects, with one attempt per theorem and temperature zero. Its success criterion is deliberately stronger than plausible text: compilation must close every goal, assumptions must be allowed, and `coqchk` must pass. The abstract states: “A proof was counted as successful if Coq’s trusted kernel accepted it.” (Abstract, p. 1.)

The questions are (RQ1) how often a kernel-accepted proof is generated, (RQ2) which theorems and projects are solved compared with fixed automation, and (RQ3) how many output tokens, wall-clock time, and GPU hours are spent. “verified@1” means the first and only attempt for a theorem; it does not estimate repeated sampling or repair. The paper explicitly warns: “verified@1 indicates whether a LLM’s first and only proof attempt for a theorem passes all verification checks.” (Key concepts, p. 2.)

## technique 1: a reproducible, leakage-controlled benchmark

what it is and when to use it
The protocol fixes the benchmark, model versions, prompt, dependencies, generation settings, and verifier before observing main results. Use this design when comparing proof generators and you need model success to have a stable denominator and no test-set tuning.

how to apply it
1. Clone the official CoqStoq repository and dependencies at one Git commit; record model and tokenizer commit identifiers (Methodology §IV.A.1, pp. 3–4).
2. Hash the prompt template, each formatted prompt, theorem context, code commit, container image, dependency locks, and settings. Reject a run if the recorded configuration does not match (same section).
3. Select 20 validation theorems for development and 100 test theorems for the main set. Sort candidates deterministically by split, date, and identifier; require fewer than ten selected theorems per project, distinct statements, a buildable project, and a reference proof that Coq verifies (§IV.A.1).
4. Cap every prompt at 24,000 tokens; show only the source prefix before the selected theorem. If an earlier theorem would expose a selected reference proof to a later theorem, remove and replace the affected theorem (§IV.A.1).
5. Keep development projects disjoint from main projects, and lock the final set before generation.

The paper's concrete example is its fixed selection procedure: “We continue the selection process until the main set contains exactly 100 theorems from at least 10 projects.” (§IV.A.1, p. 4.)

Verus form
Inference: Use a manifest of theorem identifiers, repository commit, dependency lock, model hash, and prompt hash as reviewable input to a Verus proof-generation benchmark. A Rust/Verus harness can execute a candidate, then invoke the project verifier; the benchmark's statistical rule is external to Verus. Verus contracts (`requires`, `ensures`) can specify the harness's file or result invariants, while executable Rust performs orchestration. Coq's source-prefix leakage check has no direct Verus construct and remains benchmark infrastructure.

evidence
The run completed 100 main and 20 development theorems, 600 model attempts, and fresh-container reverification. The authors state: “Before calculating any statistic, we confirm all of the following: (a) the benchmark contains exactly 100 main theorems and 20 development theorems.” (§IV.D.1, p. 6.)

limits and assumptions
The sample is only 100 test theorems, capped at ten per project, and excludes prompts over 24,000 tokens. The authors call this a pilot and say fixed settings do not establish a universal model ranking. Cross-project generality is therefore an inference, not a result.

## technique 2: one-shot constrained prompting

what it is and when to use it
Every model receives the same instruction and theorem context, with no fine-tuning, retrieval, examples, repair, or interactive feedback. Use this to measure raw one-attempt generation under equal conditions.

how to apply it
1. Replace `source_prefix` and `theorem_statement` in one template for each theorem.
2. Ask for only the body between `Proof.` and `Qed.`; forbid Markdown fences, proof markers, admissions, new axioms, and commentary (Listing 1, §IV.B.1).
3. Apply each model's official chat template without changing the instruction or theorem.
4. Generate exactly one candidate per theorem at temperature 0 with a 4,096-token output cap (§IV.B.2).
5. Warm up each model, distribute its fixed parameters over four GPUs, run models sequentially, record prompt hash, raw response, token counts, stopping reason, timestamps, and retries. Retry only infrastructure errors; never give a proof a second attempt.

The prompt itself says: “Complete the following Coq theorem. Return only the proof body: the commands that belong between ‘Proof.’ and ‘Qed.’” (Listing 1, p. 5.)

Verus form
Inference: For Verus, substitute a Rust function body plus its specification context, require only compilable Rust/Verus text, and keep one candidate per theorem. Verus proof functions and `assert`/`assert forall` steps are checked by Verus; generated executable code must still satisfy `requires` and `ensures`. A Coq tactic body cannot be reused because Lean/Coq tactics and Verus syntax differ.

evidence
All six models attempted all 100 main theorems. The one-shot setting yielded 21 accepted proofs in total, so the protocol gives a directly auditable numerator and denominator.

limits and assumptions
Temperature zero reduces sampling variation but does not guarantee bit-for-bit reproducibility across software or hardware. One attempt underestimates performance when repair, search, retrieval, or repeated sampling is available; the paper explicitly excludes those capabilities.

## technique 3: kernel-level acceptance pipeline

what it is and when to use it
The verifier turns each raw response into a source file and accepts it only after syntax and trust checks. This is the central anti-faking technique: natural-language plausibility never counts as success.

how to apply it
1. Normalize only recognized wrappers: remove at most one surrounding Markdown fence, reject ambiguous wrappers, and insert the body between fixed `Proof.` and `Qed.` (§IV.C.1, p. 6).
2. Run a syntax-aware scan and reject `Admitted`, `admit`, `Axiom`, `Conjecture`, `Parameter`, `Abort`, and `Declare ML Module`.
3. Compile with Coq 8.18 in the theorem's original project directory and library-path mappings; require no open proof obligations.
4. Run `Print Assumptions` and reject forbidden assumptions.
5. Run `coqchk` in a fresh container. Classify failures (syntax, tactic, unauthorized assumption, infrastructure); retry only infrastructure failures.

The acceptance rule is explicit: “We classify a candidate as verified only if it compiles, closes every proof obligation, uses no forbidden assumption, and passes ‘coqchk’.” (§IV.C.1, p. 6.)

Verus form
Inference: A Verus analogue should compile the generated Rust file with Verus, require all proof obligations to discharge, and reject `external_body` on code whose behavior is being verified. A harness can run the resulting executable separately. Verus's `assert`, `requires`, `ensures`, `invariant` clauses, `proof fn`, and `spec fn` must be used according to their actual roles; Coq's `Print Assumptions` and `coqchk` have no direct Verus equivalent, so dependency and trusted-code manifests must supply that audit.

evidence
Fresh-container reverification passed for all accepted results. The paper reports that all 21 model successes survived this check and that the final result contained no forbidden construct (Findings §V, p. 7).

limits and assumptions
Kernel acceptance proves the formal theorem under the supplied project environment and allowed assumptions. It does not prove that the theorem states the desired software requirement. Coq, its compiler, libraries, hardware, and the benchmark environment remain trusted components.

## results and interpretation

Gemma verified 12/100, Llama 8/100, and DeepSeek Coder V2 Lite 1/100; Qwen, Mistral, and GPT-OSS verified 0/100. Across models, the 21 successes covered 15 distinct theorems. The abstract records the headline: “G EMMA 4 verified 12 of 100 theorems, L LAMA 3.3 verified 8, and D EEP S EEK C ODER V2 L ITE verified 1.” (Abstract, p. 1.) Every model success was in the short or medium reference-proof groups; none of the 23 long-reference theorems succeeded. This is exploratory because reference-proof length is only a proxy for difficulty.

The fixed baseline script is `first [ solve [ auto ] | solve [ eauto ] | solve [ intuition auto ] ].` It verified 7/100. Model-only success therefore means only that this deliberately limited baseline failed; it does not mean all Coq automation failed. The models collectively solved 10 of 12 projects, with Gemma in 9, Llama in 7, and DeepSeek in 1. Resource cost per verified proof ranged from 741 to 36,193 generated tokens for models with at least one success; costs include failed attempts and are unstable with one success.

Inference: For VerusLaw, the strongest transferable lesson is the acceptance pipeline and denominator discipline, not the model ranking. Agent-written Rust should be counted only after Verus compilation and proof discharge in the target dependency environment, with forbidden trust escapes audited and accepted outputs rechecked from a clean environment. The observed 21/600 yield and frequent syntax, truncation, and project-interface failures indicate a substantial product threat if generated code is treated as verified merely because it looks like a proof. The paper itself limits that threat claim to this one-shot Coq setting.

## what is proved, measured, and trusted

The paper proves only that accepted candidates pass Coq's checks for the selected theorem and environment. It measures verified@1, project and proof-length distributions, overlap with the fixed automation baseline, output tokens, elapsed time, and GPU time. It does not prove a model's general success probability, superiority, or correctness outside CoqStoq. The trusted base includes Coq's kernel, compiler and libraries, project configuration, container image, hardware, and the theorem statements. A zero count is an observed zero, not proof of zero underlying probability.

## techniques for the catalog

- deterministic benchmark locking — fix commits, prompts, dependencies, hashes, and disjoint development/main projects before generation
- leakage-controlled context — expose only source before the theorem and replace any candidate that leaks a reference proof
- one-shot constrained generation — use one shared proof-body prompt, temperature zero, output cap, and no repair or retrieval
- kernel acceptance pipeline — compile in the original environment, close all goals, audit assumptions, run `coqchk`, and reverify cleanly
- denominator-aware reporting — report successes out of 100 per model, project and proof-length groups, with confidence intervals and resource denominators
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
