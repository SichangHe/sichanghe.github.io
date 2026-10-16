# Fine-Tuning Qwen3-27B for C-to-Rust Code Translation: A Three-Stage Curriculum of Pretraining, Debugging-Aware SFT, and Task-Specific SFT
(authored by agents unless marked 🧑)
Tag: `zhao2026qwen3`, [paper](http://arxiv.org/abs/2608.13681v1)

## scope and result

The paper trains a Qwen3-27B model in three successive stages: Rust-focused continued pretraining, supervised fine-tuning (SFT) on Verus debugging data, and C-to-Rust task SFT. It evaluates the resulting checkpoint with SACTOR, an agentic translation-and-repair harness that uses static analysis, compilation, foreign-function-interface (FFI) execution, and bounded retries. The paper states that its model reaches 87.2% success rate (SR) and that the abstract reports 87.2%; Table 11 prints 87.30% for the same model. The paper's own discussion says 87.20%, so the displayed precision is inconsistent.

The direct formal-verification lesson is the Stage 2 data pipeline: create failed-and-repaired Verus proof examples by running a prover, preserve its error report, and reject examples that satisfy the prover by weakening the intended specification or using escape hatches. The evaluation lesson is complementary: for translation, define a behavioral oracle by compiling and running the original C program and compare generated Rust output on the same tests. This is testing-based evidence, not a proof of all-input semantic equivalence.

## technique 1: Rust continued pretraining as a verification-oriented prior

What it is. Stage 1 adapts the base model to Rust syntax, ownership idioms, standard-library use, partial-code completion, and repair patterns before proof or translation SFT. The paper says the corpus has 1,673,289 examples from seven sources (Table 4, §4.1.1, p. 9): Strandset-Rust-v1 (191,008), CodeFIM-Rust-Mellum (56,920), a Rust instruction dataset (524), humaneval-rust (164), the Rust subset of Magicoder-OSS-Instruct-75K (4,695), xCodeEval-rust (39,510), and the Rust subset of starcoderdata (380,468). The listed component counts sum to 673,289, not 1,673,289; this is an arithmetic inconsistency in the table or prose. The model is trained on the full corpus for one epoch, BF16, full parameters, eight GPUs, sequence length 16,384, per-device batch 8, gradient accumulation 2, learning rate 1.0 × 10−6, cosine decay with 5% warmup (§4.1.3, p. 12).

When to use it. Use this stage when the base model produces syntactically valid but unidiomatic Rust, mishandles ownership, or cannot complete Rust code from context. Include raw source, fill-in-the-middle triples, instruction/code pairs, before/after repairs, and executable benchmark solutions when the downstream workflow needs those capabilities.

How to do it. The paper's data procedure is:

1. collect the seven public Hugging Face sources and retain their Rust examples (§4.1.1, p. 9)
2. split sources with natural categories into one JSONL file per category (§4.1.2, p. 11)
3. flatten instruction-formatted fields into a single text column rather than chat turns (§4.1, p. 9)
4. concatenate fields according to data type: prefix + middle + suffix for FIM, instruction + code, context + code, code + explanation, before-code + rationale + after-code, or prompt + declaration + solution + test (Table 5, §4.1.2, pp. 11–12)
5. run full-parameter continued pretraining with the Table 6 recipe (§4.1.3, p. 12)

The paper explicitly describes the design as follows: “A core principle across all seven sources is that pretraining text is built by directly concatenating a source’s own raw fields, with no added fixed headers, template boilerplate, or markdown code fences (e.g., no synthetic ## Rust Code Review section titles, and no wrapping code in ```rust fences) – the goal is text that reads as a natural, continuous document rather than an artificially templated instruction example, since any natural-language fields present (descriptions, explanations, rationale) already provide connective structure between code spans.” (§4.1.2, p. 11)

Verus form. Inference: this stage would be ordinary Rust-language pretraining data for a Verus model, with examples containing executable Rust and, where available, `requires`, `ensures`, `invariant`, `decreases`, `assert`, and proof functions. Inference: the paper's continuation-text recipe does not itself establish a Verus fact; it only changes the model's distribution over Rust and proof-like text. Inference: preserve category boundaries so that proof-oriented and application-oriented examples can be ablated separately.

Evidence and limits. The paper does not report a Stage 1 ablation, a proof-pass metric, or a causal comparison isolating this stage. Inference: its effect on Verus proof completion therefore remains unmeasured in this report. The StarCoderData component is reported as 380,468 examples while the total is 1,673,289; any reproduction must resolve that denominator before claiming corpus size.

## technique 2: VeruSyn-style verifier-error repair data

What it is. Stage 2 uses `microsoft/Verus Training Data`, released with VeruSyn. The paper defines each debugging instance as a Rust program with an incomplete or incorrect Verus proof, the verifier error report, and a corrected program accepted by Verus (§4.2.1, p. 12). The executable program and its specification are intended to remain unchanged; the target is a repaired proof annotation. The corpus is reported as approximately 6.9 million verified programs (about 5.7M direct-generation and 1.2M debugging after deduplication and compatibility checking) plus 4,557 agent-trajectory instances (§4.2.2, pp. 12–13; Table 7, p. 14). The trajectory split is 871 long direct-generation chains and 3,686 single-step debugging chains, which sum to 4,557.

When to use it. Use this technique when an agent must turn structured verifier feedback into a minimal proof repair. It targets proof annotations rather than runtime bug fixing. The paper's stated transfer hypothesis is that Verus error reports train a general feedback-conditioned repair behavior useful for compiler errors and failing end-to-end tests in C-to-Rust translation (§4.2.4, p. 13).

How to do it. The paper's synthesis algorithm is:

1. start from about 10,000 verified programs and 15,000 debugging pairs in SAFE (§4.2.2, p. 12)
2. fine-tune an initial Llama-3.3-70B-Instruct proof generator on that seed set (§4.2.2, p. 12)
3. alternate self-synthesis of complete Rust specifications/proofs with tutorial-based expansion of expert seeds covering Verus knowledge points (§4.2.2, p. 12)
4. run generated programs through Verus; deduplicate outputs with SimHash (§4.2.2, p. 12)
5. keep first-attempt verified outputs as direct-generation data; feed rejected outputs and their verifier error reports back for repair (§4.2.2, p. 12)
6. retain successful repairs as debugging pairs and perform a final compatibility pass against a newer Verus release (§4.2.2, p. 13)
7. record successful Copilot CLI/Claude Sonnet 4.5 trajectories, retaining verifier invocations, edits, and reasoning; split them into long chains and single-step examples (§4.2.2, p. 13)

The paper states: “After each round, outputs are deduplicated (via SimHash), checked against the Verus prover, and either kept as direct-generation data (if verified on the first attempt) or fed back to the model together with the verifier’s error report to attempt a repair, with successful repairs kept as debugging data.” (§4.2.2, p. 12)

Quality control is part of the technique, not optional cleanup. The paper says: “Because a fine-tuned proof-generation model can learn to satisfy the verifier without actually proving the intended property, VeruSyn applies automated anti-cheating filters before accepting any synthesized instance, rejecting programs that: (i) alter the original specification (e.g., quietly moving a postcondition into a precondition), (ii) introduce unjustified escape hatches such as assume, admit, or external body to bypass proof obligations, or (iii) rely on non-terminating loops to trivially avoid verification of subsequent code.” (§4.2.3, p. 13)

Verus form. Inference: implement the accepted target as a normal Verus proof-bearing function: keep executable code and its `requires`/`ensures` contracts fixed, then repair proof code with `assert`, `assert forall`, `broadcast`, loop `invariant`, `decreases`, `lemma` functions, and solver-triggered facts that are valid Verus constructs. Inference: do not train examples that add `assume`, `admit`, `external_body`, or altered contracts as the repair; those would teach the exact anti-pattern the paper filters. Inference: a repair record should store source, verifier output, patch, and a re-run result, so a model cannot receive credit for text that was never accepted by the verifier.

Evidence and limits. The counts above are corpus counts, not proof-quality rates. The paper gives no independent audit rate for the anti-cheating filters and no ablation of direct-generation versus debugging or trajectory data. Inference: Verus acceptance is evidence that the encoded specification was discharged, but it does not show that the specification matches the intended requirement. The paper itself notes a domain mismatch: Verus proof debugging is not arbitrary runtime logic repair (§4.2.1, p. 12).

## technique 3: structure-aware translation with two verification phases

What it is. SACTOR decomposes C-to-Rust translation into a static-analysis-guided sequence: task division, interface-preserving unidiomatic translation, idiomatic translation, and verification/repair (§5.1, p. 16). The first Rust version may retain raw pointers, C representations, and unsafe operations. The second phase reconstructs ownership and removes raw pointers where possible. The paper evaluates behavior through FFI-linked execution rather than textual similarity.

When to use it. Use the pipeline for legacy C where a one-shot safe rewrite is unreliable. Preserve interfaces first so that the translated unit can be compared with the C implementation; only then perform ownership and idiom refinement. This sequencing isolates semantic translation from safety-oriented refactoring.

How to do it. The paper's four steps are:

1. analyze the C input and decompose it into data types, globals, and functions; infer dependencies and translation order (§5.1, p. 16)
2. generate interface-preserving, potentially unidiomatic Rust for each unit (§5.1, p. 16)
3. refine that implementation toward idiomatic Rust, including ownership reconstruction and raw-pointer replacement where possible (§5.1, p. 16)
4. compile and execute tests; on failure, revise within a fixed retry budget (§5.1, p. 16; §5.3, p. 17)

The benchmark has 200 C programs: 92 argv programs and 108 stdin programs, with approximately 120 from IBM Project CodeNet and the remainder constructed for the benchmark (§5.2, p. 16). For each program, reference outputs come from compiling and running the original C program. A generated Rust program succeeds only if it compiles and passes all associated tests. Each program receives at most six translation attempts (§5.3, p. 17). The metric is per-program SR, `Npass,s / Ntotal × 100%` for each random seed, followed by the arithmetic mean over five seeds (§5.6, p. 18).

The paper states: “A program is considered successfully translated only if the generated Rust code compiles and passes all associated end-to-end tests.” (§5.3, p. 17)

Verus form. Inference: a Verus implementation would keep the two-phase engineering boundary but replace or supplement the test oracle with contracts. The interface-preserving phase can be represented by executable Rust plus `requires`/`ensures` describing the C function's documented behavior; loop `invariant` and `decreases` clauses establish local obligations; proof functions and `assert` statements discharge arithmetic, ownership, and representation lemmas. Inference: FFI calls and unknown C behavior remain outside a Verus proof unless modeled with a trusted external specification, so the paper's FFI test should be treated as an integration check rather than a Verus theorem. Inference: unsafe pointer manipulation can be isolated behind a small trusted boundary and then exposed through a safe, specified Rust API, but the boundary's implementation must be separately verified or trusted.

Evidence and limits. The harness tests only provided inputs, so it does not prove equivalence for all inputs; §5.3 explicitly characterizes the measure as behavioral agreement on the test suite. Six attempts and stochastic decoding (temperature 0.6, top-p 0.95, top-k 20, max output 1,536; Table 10, p. 17) make SR depend on the repair budget and random seeds. Inference: a product using this pipeline should log every attempt and classify compiler, timeout, static-analysis, and translation-process failures, as the paper does in §5.5.

## techniques for the catalog

- verifier-error repair corpus — generate rejected Verus proofs, retain verifier errors with successful patches, deduplicate, and filter contract weakening or escape hatches before SFT

- staged Rust-to-proof curriculum — pretrain on categorized Rust continuation text, then SFT on Verus debugging and paired C/Rust translations

- structure-aware C-to-Rust translation — decompose by dependencies, produce interface-preserving Rust, then refine ownership and idioms

- FFI behavioral verification — compile and run the original C and generated Rust on identical inputs, compare outputs, and allow a fixed repair budget

- seed-averaged success rate — compute per-seed pass fractions over a fixed program denominator and report the arithmetic mean over five stochastic runs
