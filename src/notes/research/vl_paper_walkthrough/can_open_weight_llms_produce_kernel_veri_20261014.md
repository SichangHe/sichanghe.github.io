# Can Open-Weight LLMs Produce Kernel-Verified Coq Proofs? A Pilot Study
(authored by agents unless marked 🧑)
Tag: `ryan2026kernel`, [paper](https://arxiv.org/abs/2608.05420)

## scope and claims
This pilot measures whether six downloadable, open-weight language models can produce Coq tactic scripts that the trusted kernel accepts. The study evaluates 100 theorems from CoqStoq, a collection taken from real Coq projects, with one attempt per theorem and temperature zero. Its success criterion is deliberately stronger than plausible text: compilation must close every goal, assumptions must be allowed, and `coqchk` must pass. The abstract states: “A proof was counted as successful if Coq’s trusted kernel accepted it.” (Abstract, p. 1.)

The questions are (RQ1) how often a kernel-accepted proof is generated, (RQ2) which theorems and projects are solved compared with fixed automation, and (RQ3) how many output tokens, wall-clock time, and GPU hours are spent. “verified@1” means the first and only attempt for a theorem; it does not estimate repeated sampling or repair. The paper explicitly warns: “verified@1 indicates whether a LLM’s first and only proof attempt for a theorem passes all verification checks.” (Key concepts, p. 2.)

## technique 1: a reproducible, leakage-controlled benchmark

what it is and when to use it
The protocol fixes the benchmark, model versions, prompt, dependencies, generation settings, and verifier before observing main results. Inference: Use this design to compare proof generators with a fixed denominator and separate development and evaluation projects.

how to apply it
1. Clone the official CoqStoq repository and dependencies at one Git commit; record model and tokenizer commit identifiers (Methodology §IV.A.1, p. 3).
2. Hash the prompt template, each formatted prompt, and theorem context; record these alongside the code commit, container-image digests, dependency-lock hashes, and generation and verification settings. Check the current configuration against that record before generation (same section).
3. Select 20 validation theorems for development and 100 test theorems for the main set. Sort candidates deterministically by split, date, and identifier; add a candidate only while its project has fewer than ten selected theorems; require distinct statements, a buildable project, and a reference proof that Coq verifies (§IV.A.3, pp. 3–4).
4. Exclude a theorem if its prompt exceeds 24,000 tokens under any model’s tokenizer; show only the source prefix before the selected theorem. If an earlier theorem would expose a selected reference proof to a later theorem, remove and replace the affected theorem (§IV.A.3–4, pp. 3–4).
5. Keep development projects disjoint from main projects, and audit final prompts for reference-proof exposure before locking the protocol (§IV.A.3–4, p. 4). Stop if the fixed rules cannot produce the sets or the leakage audit fails.

The paper's concrete example is its fixed selection procedure: “We continue the selection process until the main set contains exactly 100 theorems from at least 10 projects.” (§IV.A.3, pp. 3–4.)

Verus form
Inference: A Verus benchmark could record theorem identifiers, repository commits, dependencies, model versions, and prompt hashes, with separate checks for reference-proof exposure. This is a proposed adaptation; the paper evaluates Coq, not Verus.

evidence
The run completed 100 main and 20 development theorems, 600 model attempts, and fresh-container reverification. The authors state: “Before calculating any statistic, we confirm all of the following: (a) the benchmark contains exactly 100 main theorems and 20 development theorems.” (§IV.D.1, pp. 5–6.)

limits and assumptions
The sample is only 100 test theorems, capped at ten per project, and excludes prompts over 24,000 tokens. The authors call this a pilot and say fixed settings do not establish a universal model ranking. Inference: These results do not establish performance on projects outside the sample.

## technique 2: one-shot constrained prompting

what it is and when to use it
Every model receives the same instruction and theorem context, with no fine-tuning, retrieval, examples, repair, or interactive feedback. Inference: Use this to measure one-attempt generation with a shared instruction template.

how to apply it
1. Replace `source_prefix` and `theorem_statement` in one template for each theorem.
2. Ask for only the body between `Proof.` and `Qed.`; forbid Markdown fences, proof markers, admissions, new axioms, and commentary (Listing 1, §IV.B.1).
3. Apply each model's official chat template without changing the instruction or theorem.
4. Generate exactly one candidate per theorem at temperature 0 with a 4,096-token output cap (§IV.B.2).
5. Warm up each model, distribute its fixed parameters over four GPUs, run models sequentially, record prompt hash, raw response, token counts, stopping reason, timestamps, and retries. Complete every model's development run before any main run (§IV.B.2, p. 5). Retry only infrastructure errors without changing the candidate (§IV.C.1, p. 5).
6. Estimate main-run duration using development throughput and loading overhead, without examining development success. Start only if the estimate fits 40 hours of the 48-hour budget; otherwise stop and report feasibility (§IV.B.3, p. 5).

The prompt itself says: “Complete the following Coq theorem. Return only the proof body: the commands that belong between ‘Proof.‘ and ‘Qed.‘” (Listing 1, p. 4.)

Verus form
Inference: A Verus experiment could provide a function specification and permitted project context, request one candidate body, and retain the same attempt and resource limits. The paper does not test this adaptation.

evidence
All six models attempted all 100 main theorems. The one-shot setting yielded 21 accepted proofs in total, so the protocol gives a directly auditable numerator and denominator.

limits and assumptions
Temperature zero reduces sampling variation but does not guarantee bit-for-bit reproducibility across software or hardware. One attempt does not estimate performance with repair, retrieval, repeated sampling, or interactive feedback; the paper excludes those capabilities.

## technique 3: kernel-level acceptance pipeline

what it is and when to use it
The verifier turns each raw response into a source file and accepts it only after syntax and trust checks. Only candidates that pass the checks count as successes.

how to apply it
1. Normalize only recognized wrappers: remove at most one surrounding Markdown fence, reject ambiguous wrappers, and insert the body between fixed `Proof.` and `Qed.` (§IV.C.1, p. 5).
2. Run a syntax-aware scan and reject `Admitted`, `admit`, `Axiom`, `Conjecture`, `Parameter`, `Abort`, and `Declare ML Module`.
3. Compile with Coq 8.18 in the theorem's original project directory and library-path mappings; require no open proof obligations.
4. Run `Print Assumptions` and reject forbidden assumptions.
5. Run `coqchk` on the compiled library. Classify failures (syntax, tactic, unauthorized assumption, infrastructure); retry only infrastructure failures without changing the candidate (§IV.C.1, p. 5).
6. Reverify every accepted proof in a fresh container. Before analysis, require complete unique records for all 600 attempts, no unresolved infrastructure errors, matching hashes, a clean leakage audit, and repeated assumption and `coqchk` checks (§IV.D.1, pp. 5–6).

The acceptance rule is explicit: “We classify a candidate as verified only if it compiles, closes every proof obligation, uses no forbidden assumption, and passes ‘coqchk‘.” (§IV.C.1, p. 5.)

Verus form
Inference: A Verus adaptation should require successful verification in the target project, audit any mechanisms that let code bypass verification, and recheck accepted outputs in a clean environment. The paper does not establish that this would provide the same assurance as the Coq checks.

evidence
Fresh-container reverification passed for all accepted results. The paper reports that all 21 model successes survived this check and that the final result contained no forbidden construct (Findings §V, p. 6).

limits and assumptions
Inference: Acceptance supports the formal theorem under the supplied environment and allowed assumptions; it does not establish that the statement captures an intended software requirement. This review does not independently assess the implementation or its trusted components.

## results and interpretation

Gemma verified 12/100, Llama 8/100, and DeepSeek Coder V2 Lite 1/100; Qwen, Mistral, and GPT-OSS verified 0/100. Across models, the 21 successes covered 15 distinct theorems. The abstract records the headline: “G EMMA 4 verified 12 of 100 theorems, L LAMA 3.3 verified 8, and D EEP S EEK C ODER V2 L ITE verified 1.” (Abstract, p. 1.) Every model success was in the short or medium reference-proof groups; none of the 23 long-reference theorems succeeded. This is exploratory because reference-proof length is only a proxy for difficulty.

The fixed baseline script is `first [ solve [ auto ] | solve [ eauto ] | solve [ intuition auto ] ].` It verified 7/100. Of the 15 distinct theorems solved by models, 4 were also solved by the baseline and 11 were not; the baseline solved 3 further theorems that no model solved (§V.B, p. 7). Model-only success therefore means only that this deliberately limited baseline failed; it does not mean all Coq automation failed. The models collectively verified at least one theorem in 10 of 12 projects, with Gemma succeeding in 9, Llama in 7, and DeepSeek in 1 (§V.B, p. 6; Table III, p. 7). Resource cost per verified proof ranged from 741 to 36,193 generated tokens for models with at least one success; costs include failed attempts and are unstable with one success (Tables VI–VII, p. 7). GPU usage was sampled every 15 seconds, limiting timing precision (§VII, p. 8).

Inference: For VerusLaw, the strongest transferable lesson is the acceptance pipeline and denominator discipline, not the model ranking. Agent-written Rust should be counted only after Verus compilation and proof discharge in the target dependency environment, with forbidden trust escapes audited and accepted outputs rechecked from a clean environment. The observed 21/600 yield and frequent syntax, truncation, and project-interface failures indicate a substantial product threat if generated code is treated as verified merely because it looks like a proof. The paper's empirical results concern this one-shot Coq setting; the VerusLaw implication is an inference.

## what is proved, measured, and trusted

The paper reports that accepted candidates passed Coq's checks for the selected theorem and environment. It measures verified@1, project and proof-length distributions, overlap with the fixed automation baseline, output tokens, elapsed time, and GPU time. It does not prove a model's general success probability, superiority, or correctness outside CoqStoq. A zero count is an observed zero, not proof of zero underlying probability. Theorem rates use Wilson 95% confidence intervals; secondary project rates give each project equal weight and use a project-clustered bootstrap with 10,000 resamples and seed 20260728 (§IV.D.2, p. 6). The authors did not test paired differences between models. They corrected an earlier implementation that grouped theorems by generated proof length: the reported groups use human reference proofs, with at most 3 nonblank lines for short, 4–10 for medium, and more than 10 for long (§IV.D.3, p. 6).

## techniques for the catalog

- deterministic benchmark locking — fix commits, prompts, dependencies, hashes, and disjoint development/main projects before generation
- leakage-controlled context — expose only source before the theorem and replace any candidate that leaks a reference proof
- one-shot constrained generation — use one shared proof-body prompt, temperature zero, output cap, and no repair or retrieval
- kernel acceptance pipeline — compile in the original environment, close all goals, audit assumptions, run `coqchk`, and reverify cleanly
- denominator-aware reporting — report successes out of 100 per model, project and proof-length groups, with confidence intervals and resource denominators
