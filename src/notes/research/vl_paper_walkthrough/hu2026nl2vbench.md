# NL2VBench: A Benchmark for End-to-End Natural-Language to Verifiable Rust Generation
(authored by agents unless marked 🧑)
Tag: `hu2026nl2vbench`, [paper](https://doi.org/10.1145/3832783.3834619)

## what the paper contributes

NL2VBench measures the complete path from an English task to executable Rust, Verus specifications, and proof annotations. The benchmark contains 762 verifier-checked tasks. The authors define the target precisely: “the expected output must integrate all three parts: implementation, specification, and proof.” (Section 2.1, p. 3479.) This makes it useful for testing an agent that writes verified Rust, rather than an agent that only fills in a proof for a supplied program.

Each task has a natural-language description, task-defining interface information, metadata, and a verifier-checked Verus reference solution. The reference solution is withheld from the evaluated model and is used to validate the task. A representative binary-search task gives a function signature, quantified sortedness precondition, bounds and partition postconditions, a loop invariant, and `decreases hi - lo` (Figure 2, p. 3480). The paper says: “A verifiable program must include not only executable logic, but also formal specifications, loop invariants, and proof-oriented constructs that can be checked by a verifier.” (Section 1, p. 3478.)

Inference: For VL, this is a direct evaluation target: provide an agent with prose plus a fixed Rust/Verus interface, then require a complete verifier-accepted program and independently assess semantic correctness. A passing Verus check alone should not be treated as success.

## technique 1: curate a benchmark whose inputs do not leak reference code

Apply the construction pipeline when building training or evaluation data for verified-code agents:

1. Start with five public sources: VerusBench, MBPP_verified, HumanEval_Verus, DAFNY2VERUS, and VeriCoding (Section 2.2, p. 3479).
2. Filter malformed instances, syntactically incomplete programs, missing or severely incomplete specifications, and trivial examples. Remove duplicate and near-duplicate tasks.
3. Canonicalize the remaining code/specification pairs while preserving the task-defining interface and verifier-checked reference.
4. Use an LLM only to draft natural-language descriptions from the structured artifacts. The paper says GPT-5.2 was the drafting aid and is also one of the evaluated models, so "a residual stylistic overlap may remain"; the authors mitigate it by manual revision and by evaluating all models on the same final descriptions (Section 2.2, p. 3479).
5. Have humans revise every draft to remove ambiguity, reduce dependence on source surface form, and check consistency with the reference solution.
6. Have two authors independently inspect descriptions and resolve disagreements by discussion. Include only human-revised descriptions.

The paper does not report an agreement figure for this description review. The 93.4% raw agreement it reports (Section 3.1, p. 3481) belongs to the later SVC review of verifier-passed model outputs (see technique 3). The authors also state: “Because these sources differ in style, completeness, and verification quality, we do not merge them directly.” (Section 2.2, p. 3479.)

Inference: VL's benchmark should preserve the natural-language/interface pair as the agent input and keep reference code, metadata that reveals solutions, and reviewer labels out of prompts. Near-duplicate removal matters because otherwise memorization can look like proof ability.

## technique 2: classify verification structure without claiming a difficulty scale

Label each task `Simple`, `Loops`, or `Complex` only as a coarse structural descriptor. Simple tasks mainly need preconditions and postconditions; Loops contain one or more loops and usually need invariants; Complex tasks contain richer structures such as recursion, nested loops, or sophisticated data manipulation (Section 2.3, p. 3480). The authors caution that this is not a statistically balanced difficulty taxonomy and retain Complex mainly as a descriptive indicator.

The final 762 tasks contain 157 Simple, 598 Loops, and 7 Complex instances; 598 have loop invariants, 88 recursion, 558 quantified specifications, and 660 arrays, sequences, or complex data structures (Table 2, p. 3480). The percentages implied by these counts are approximately 20.6%, 78.5%, and 0.9%; the paper reports the counts and does not report these percentages. The 7-task Complex denominator is too small for a reliable performance comparison.

Inference: This classification can stratify VL evaluations, but the labels should not be used as a general difficulty ranking. Report the denominator for every category and keep the 7-task category descriptive.

## technique 3: evaluate complete generation with verifier pass and semantic review

Use the paper's baseline protocol to measure an agent:

1. Give the model only each task description and interface information.
2. Ask for a complete Verus program containing executable code, specifications, and proof-oriented constructs (Section 3.1, p. 3481).
3. Run the Verus verifier on each generated program.
4. For each model and prompting condition, make five candidates under the same decoding configuration. `pass@1` uses one fixed candidate; `pass@5` counts a task when at least one of five passes.
5. Apply Strict Verified Correct (SVC) review only to verifier-passed candidates. Two Verus-experienced authors independently inspect whether implementation matches the natural-language task, specification captures intent, and implementation and specification are mutually consistent (Section 3.1, p. 3481).

The distinction is essential. “Verifier acceptance alone may not fully capture semantic correctness, because a program can verify under weak or task-misaligned specifications.” (Section 3.1, p. 3481.) The paper reports 3,981 verifier-passed outputs reviewed in the primary direct-generation setting, with two reviewers. This is the size of the SVC review pool, not the number of benchmark tasks. The two reviewers reached 93.4% raw agreement on these outputs before resolving disagreements through discussion (Section 3.1, p. 3481). That is an agreement fraction between reviewers, not a model accuracy result.

Inference: VL should use both checks and retain failed specifications as a separate error class. A generated `ensures true` or an implementation that returns a constant can pass a weak contract while failing the task.

## evidence and interpretation

Five models were evaluated under four prompting strategies: zero-shot, few-shot, chain-of-thought, and least-to-most (Section 3.1, p. 3481). Table 3 gives each model's best result among those four strategies. GPT-5.2 reached Pass@1 29.92% and Pass@5 50.00%; SVC@1 was 27.82% and SVC@5 48.69%. DeepSeek-V3.2 reached 5.25% / 13.52% verifier pass and 4.59% / 11.81% SVC; Claude Sonnet 4.5 6.96% / 17.59% and 6.17% / 15.88%; GPT-4o-mini 2.76% / 4.20% and 2.23% / 3.81%; o4-mini 3.81% / 8.79% and 3.67% / 8.01% (Table 3, p. 3481). Each pair is Pass@1/Pass@5 or SVC@1/SVC@5, with five attempts for the @5 measure. Table 3 does not state its task denominator; Inference: it is the full 762 tasks, because Table 4's category counts sum to 762. The paper does not say whether the Pass and SVC "Best" columns for a model come from the same prompting strategy.

Table 4 reports best Pass@5/SVC@5 by structural category: Simple, 70.70%/70.06% over 157 tasks; Loops, 44.65%/43.31% over 598 tasks; Complex, 42.86%/28.57% over 7 tasks. The paper does not say which model Table 4 reports and gives no raw success counts. Inference: the percentages match integer counts (Simple 111/157 and 110/157; Loops 267/598 and 259/598; Complex 3/7 and 2/7), and these sum to 381 and 371 of 762, which equal GPT-5.2's 50.00% and 48.69% in Table 3, so Table 4 is most likely GPT-5.2. The authors conclude that repeated attempts improve results, while no evaluated model solves the benchmark reliably (Section 3.2, p. 3481).

The benchmark's claims are about this direct-generation setup, model versions, prompts, and hosted API decoding. They do not establish that another prompt, verifier version, or repair loop will have the same rates. The reference solutions and Verus verifier are trusted to validate instances; the human semantic review is trusted for SVC labels. The paper reports 93.4% raw agreement between the two reviewers for the SVC review, and no agreement statistic for the description review in construction.

## what VL should reuse and threat assessment

Inference: VL should reuse the three-part task format, human-revised descriptions, near-duplicate filtering, and dual metrics. A product agent should be tested on unseen tasks with a fixed interface, and a verifier pass should be followed by semantic review of the contract and implementation. The benchmark directly measures the threat from agent-written verified Rust: under the reported direct setup, even the best model produced SVC on fewer than half of 762 tasks at five attempts, and the gap between pass and SVC demonstrates that accepted proofs can still express the wrong behavior.

Inference: VL should not redo the paper's basic benchmark construction unless it needs a different language subset or product domain. It should add product-specific tasks, dependency and unsafe-interface cases, and tests for specification weakening; those extensions are not evaluated here.

## techniques for the catalog

- human-curated NL-to-Verus tasks: filter and deduplicate verified artifacts, draft prose with an LLM, then human-revise and cross-check every description
- coarse structural labels: classify tasks as Simple, Loops, or Complex while treating labels as descriptive rather than a balanced difficulty scale
- verifier plus SVC evaluation: report pass@1 and pass@5, then manually review verifier-passed outputs for implementation/specification intent
- denominator-aware baseline reporting: state task counts, attempt count, model, prompt setting, and category denominator for every percentage
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since GPT-5.2 was used as the drafting aid and is also included in our evaluation, a residual stylistic overlap may remain."): I read the whole paper text and checked the four quotations, section and page references, Table 2, 3 and 4 numbers, the construction steps, the evaluation protocol, and the tag and DOI link (matches the paper's ACM DOI). I changed the 93.4% raw agreement, which the paper attaches to the SVC review of 3,981 verifier-passed outputs and not to the description review; I added the GPT-5.2 drafting-overlap caveat; I removed the unstated claim that Table 3 covers all 762 tasks and marked it as an inference; and I added an inference that Table 4 is GPT-5.2's results. I did not check the cited sources, the artifact on Zenodo, or the demonstration video.
