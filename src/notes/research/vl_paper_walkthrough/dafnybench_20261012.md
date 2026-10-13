# DafnyBench: A Benchmark for Formal Software Verification
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## what the benchmark measures
DafnyBench is a dataset and protocol for measuring whether a language model can supply missing proof hints to a deductive verifier. A benchmark item is a complete, compiling Dafny program with `requires` and `ensures` retained but body `assert` and loop `invariant` statements removed. The model must put hints back so Dafny verifies the program. A run is successful only if the verifier succeeds, all preconditions and postconditions are unchanged, and the model does not use `{:verify false}` or `assume false` (Section 3.2, p. 4). This is a narrowly defined capability: proof-hint synthesis for an existing contract, not requirements discovery or implementation synthesis.

The abstract reports the scale and headline result: “over 750 programs with about 53,000 lines of code” and a best success rate of 68% (abstract, p. 1). The ground-truth release actually contains 782 stand-alone programs (Section 3.1, p. 3); the abstract's 750 is a lower bound (over 750). The benchmark is valuable for VL because it supplies denominators, retry curves, and difficulty controls instead of anecdotal successful proofs.

## technique 1: build ground truth from independently verified programs

What it is. The authors assemble programs from three sources, verify them locally with Dafny 4.3.0, remove programs without useful specifications or hints, and strip compiler hints to create tasks. This makes the target a real proof obligation rather than a text-completion exercise.

How to reproduce it.

1. scrape public Dafny files from GitHub and deduplicate with a minhash script
2. run `dafny verify` and retain compiling, verified files
3. remove files lacking `ensures`, and files lacking both `assert` and `invariant` clauses (the paper removes the union)
4. add curated Clover examples and MBPP-derived Dafny-synthesis examples
5. normalize each item as one stand-alone file
6. record the verified file as ground truth, then remove all body hints for the fill-hints task
7. keep `requires` and `ensures` immutable during evaluation

The GitHub pass reduced about 15,000 files to about 5,000 by deduplication, then to 1,112 verified files; filtering left 556 ground-truth files, of which 113 verified without hints. Clover contributed 62 files, 23 hint-free; Dafny-synthesis contributed 164, 72 hint-free (p. 3). The combined 782 programs average 2.12 methods, 1.03 functions, and 1.40 lemmas; maxima are 42 methods, 42 functions, and 35 lemmas (Table 2, p. 4).

Verus form (inference). Build an analogous corpus from Rust/Verus files whose contracts and proofs have been independently replayed. Remove `assert`, `invariant`, ghost lemma bodies, and proof hints while preserving `requires`/`ensures`; reject edits that weaken specifications or add `assume`. Record compiler and Verus versions, dependencies, and resource limits. The Dafny procedure's independent source mix and deduplication are more important than copying its file format.

Assumptions and threats. GitHub files may have appeared in model training. The paper warns: “Data contamination emerges as a potentially significant limitation for evaluating LLMs on this benchmark” (Section 5.2, p. 7). A VL benchmark should quarantine repositories used to construct evaluation items and publish hashes/splits. A passing ground truth also proves only the retained Dafny semantics; translation to Verus is a separate validation problem.

## technique 2: fill-hints task and mechanical anti-cheating gate

What it is. The task removes all `assert` and `invariant` statements without marking their locations, then asks the model to return the full program with hints restored. The checker accepts only a verified output that preserves the contract and avoids explicit escape hatches. The paper gives a simple LinearSearch example whose two loop invariants are removed for the task (Figure 2, p. 5).

When to use it. Use this task to isolate proof search and annotation placement from specification writing. It is a useful first Verus benchmark when the product already has trusted contracts and needs to measure an agent's ability to complete proofs.

How to evaluate one attempt.

1. provide the hint-free program and a fixed prompt
2. cap output at a known token budget and parse the returned source
3. compare `requires` and `ensures` text to the input; reject any change
4. reject `{:verify false}`, `assume false`, or equivalent axioms
5. run the exact Dafny verifier on the returned file
6. count success only if every method verifies

No separate semantic judge is required for the task's formal criterion, but this is also its weakness: the benchmark does not check whether the code's documentation or algorithm still matches an informal description. The authors explicitly distinguish this from Clover's stronger consistency check and state that they “do not yet implement the full Clover evaluation scheme” (Section 2, p. 2).

Verus form (inference). Apply the same immutable-contract check to Verus. Preserve executable code and public specifications, remove only proof material, run `cargo verus`, and reject `assume`, `admit`, new axioms, or changes to trusted external lemmas. A stronger VL task can add a separate semantic-equivalence check against tests or a reference implementation, but that measures a different property.

Evidence and limits. The no-LLM baseline is 26.9%, because some programs verify without hints. The paper's own counts do not give 26.9%: 113 + 23 + 72 = 208 of 782 is 26.6% (p. 3 against Table 3, p. 6), and the paper does not explain the difference. This denominator matters: an apparent model success can be copied from a task that needed no model work. The benchmark's gate therefore measures “verified with hints” after subtracting no capability; it does not report conditional success on programs that actually require hints.

## technique 3: bounded retries with verifier-error feedback

What it is. Each model receives up to ten attempts for one file. If an attempt fails, the next prompt includes Dafny's error message. Success stops early; failure after all attempts is recorded. Prompts use `max_tokens = 4096` and `temperature = 0.3` (Section 4.1, p. 5).

How to apply it.

1. generate a complete hints-filled source
2. run the verifier and capture the exact diagnostic
3. send the diagnostic with the same source/task context to the model
4. repeat up to a fixed `n`, avoiding an unbounded repair loop
5. record first-attempt success, cumulative success by attempt, and final success

The retry curve is itself an evaluation technique. Best models succeed on about 54% on the first attempt and approach a plateau near 65% around five attempts (Section 4.3, p. 5; Figure 3, p. 6). The authors infer that models either use Dafny errors poorly or cannot repair the underlying proof. The benchmark thus tests both initial proof generation and error-guided repair.

Verus form (inference). Run bounded `cargo verus` retries and feed diagnostics such as failed invariants or trigger warnings back to the agent. Keep attempt logs and count resource time. Use a fixed retry budget in product deployment so a model cannot hide failure through endless stochastic sampling. Distinguish a new proof from a repeated output that happens to compile.

Evidence and limits. Retry gains diminish sharply; ten attempts are not ten independent samples. The paper reports only aggregate curves, not per-error repair categories. A Verus benchmark should stratify diagnostics by ownership, arithmetic, quantifier, and termination failures to reveal what feedback actually helps.

## technique 4: difficulty stratification by program and hint size

What it is. DafnyBench bins items by source character count and by the number of characters in removed hint lines. The success rate falls as either quantity grows (Figures 4a–b, p. 6). Source length approximates dependency and control-flow complexity; hint quantity approximates proof-writing work.

How to use it. Report success separately by size bins rather than one mean. Keep the bin boundaries and item counts fixed across models. A benchmark comparison is meaningful only when models see the same files, prompt, output budget, and verifier version.

Verus form (inference). Track executable lines, number of contracts, loop count, ghost-code characters, lemma count, quantified formulas, and ownership nesting. Hint characters alone can mislead in Verus because one short lemma may be harder than many simple assertions. Still, retaining a hint-volume metric preserves the paper's main control: measure how proof burden scales.

The paper's model results are Claude 3 Opus 67.8 ± 1.7%, GPT-4 Turbo 59.8 ± 1.8%, GPT-4o 59.3 ± 1.8%, GPT-3.5 Turbo 44.0 ± 1.8%, and CodeLlama-7b 28.0 ± 1.6%, each with ten attempts on 782 programs (Table 3, p. 6). The “No LLM” baseline is 26.9%. These are success percentages over the full benchmark, not percentages among tasks that failed without hints.

## what is proved and what stays trusted

The verifier proves each returned Dafny program's contracts under Dafny's semantics. The benchmark measures proof completion, retry behavior, and scaling with text size. It does not prove that a model can write a correct contract from natural language: the authors say “this benchmark does not assess a model’s competence in translating natural language into concise formal specifications” (Section 5.2, p. 7). It also does not cover multi-file dependencies, external libraries, or full natural-language/code consistency (study's inference from the items being stand-alone single files; the paper states the Clover consistency check is not implemented).

Trusted components include the ground-truth source selection, Dafny's verifier, the specification text, parser and anti-cheating checks, prompt normalization, and the assumption that the model's output is the only changed artifact. Data contamination, source bias toward GitHub, and the 4096-token cap affect measured rates. The headline 68% is Claude 3 Opus's 67.8% ± 1.7% on 782 items, rounded in the abstract; it is not a universal LLM capability estimate.

## what VL should reuse and threat to the product

VL should reuse immutable-contract gates, verified ground-truth construction, explicit anti-cheating checks, fixed retry budgets, error-feedback logs, and size-stratified reporting. It should also create a second task for translating prose requirements into Verus contracts, because DafnyBench deliberately omits that central risk.

Threat assessment (inference): this paper threatens claims that an agent is good at verification based on a few successful demos. Even a strong model fails roughly one third of these relatively constrained tasks, while a quarter pass without any model. For agent-written verified Rust, the direct product risk is confusing compiler success or unchanged contracts with broad proof capability. The opportunity is a reproducible VerusBench with denominators and gates that make improvement measurable.

## techniques for the catalog

- verified-source corpus: assemble independently replayed programs from multiple sources, deduplicate them, and retain contracts as ground truth
- fill-hints benchmark: remove body assertions and invariants while freezing requires/ensures and rejecting verifier escape hatches
- bounded diagnostic retries: rerun a failed proof with the exact verifier error for a fixed number of attempts
- difficulty stratification: report proof success by source size and removed-hint volume, not only one aggregate
- contamination control: quarantine training repositories and document source overlap before comparing models
Audited 2026-10-12 against the paper: checked all counts (782, 556, 113, 62, 23, 164, 72, 1,112, 15,000 to 5,000, Table 2 means and maxima), Table 3 percentages and error bars, 54 percent first attempt and 65 percent plateau, 26.9 percent no-LLM baseline, 4096 tokens, temperature 0.3, ten attempts, Dafny 4.3.0, the success conditions, and the quotations; all matched. Changed: page references for Table 2 (p. 4), Figure 2 (p. 5), Table 3 and Figure 3 (p. 6); the 750 figure is described as a lower bound, not a rounding; the filtering step now states the paper's union rule; one unmarked inference about unsupported scope is now marked. The Verus form paragraphs are marked inference and are sound sketches.; follow-up: 113+23+72=208 of 782 is 26.6% against the stated 26.9% no-LLM baseline, confirmed from the paper and stated in one clause as unexplained.
