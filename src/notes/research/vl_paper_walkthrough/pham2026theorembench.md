# TheoremBench: Evaluating LLMs on Theorem Proving in Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `pham2026theorembench`, [paper](https://www.semanticscholar.org/paper/66bf9ee034750fcc28a6673e17daf770dece7b33)

## scope and benchmark design

TheoremBench evaluates Lean4 theorem provers on classical theorems embedded in longer developments. The paper's motivation is that existing benchmarks emphasize standalone contest problems, while real developments contain definitions, namespaces, typeclass assumptions, and intermediate lemmas. It introduces two aligned views: plain-main, one final theorem per parent; and premised, a group containing the final theorem plus extracted supporting subtheorems. The abstract says the premised version “expands each theorem into a structured family of related proving tasks” and that it exposes “partial progress through the internal proof structure of a theorem” (Abstract, p. 1).

Inference: VL should evaluate agent-written Verus code with structured proof obligations, not only final compile success. The benchmark does not measure Verus or Rust, so transfer requires replacing Lean's declaration and premise machinery with Verus specifications and proof functions.

## technique 1: dependency-aware premised dataset construction

What it is. The authors parse Lean source files into theorem groups, reconstruct enough context for independent compilation, convert earlier declarations used in each proof into explicit premise binders, and retain only snippets that Lean accepts. The paper's pipeline says, “For every theorem or subtheorem, earlier results used in its proof are converted into explicit premise binders” (Section 3.1, p. 6).

How to do it.
1. Collect raw Lean4 developments based on classical formalizations; treat each source file's final declaration as the parent theorem (Section 3.1, p. 6).
2. Parse the file and reconstruct imports, namespaces, local definitions, implicit binders, and typeclass context so an extracted instance can compile independently (Section 3.1, p. 6).
3. Extract supporting theorem and lemma declarations as subtheorems (Section 3.1, p. 6).
4. Replace each earlier result used by a theorem with an explicit premise binder, preserving its type and required context (Section 3.1, p. 6).
5. Emit plain-main and premised snippets, run Lean4 on every candidate, and keep only compilable instances with IDs, declaration names, premises, environment context, and ground-truth proof (Section 3.1, p. 6).

Verus form. Inference: parse Rust/Verus modules, identify `requires`, `ensures`, `invariant`, `spec fn`, and `proof fn` dependencies, then expose selected earlier lemmas as explicit parameters to isolated proof tasks. Compile every extracted task with Verus. Preserve module imports and generic bounds; record the source lemma and the generated premise list. A premise should be a proof argument or a proposition, not an `external_body` escape hatch.

Evidence and limits. The released benchmark contains 1,142 instances, with undergraduate and postgraduate mathematics, but it is limited to formalizations that already exist and can be extracted. The authors caution that syntactic dependency analysis may not recover the mathematically minimal dependency set (Section 5, p. 12). Inference: a Verus benchmark built this way measures proof completion under a chosen dependency projection, not absolute mathematical difficulty.

## technique 2: theorem-level coverage and complete-parent metrics

What it is. Instance pass@k says whether an individual generated proof is accepted. The premised structure adds parent-level completion, coverage, and average subtheorems proved. For parent `T`, coverage is `p(T)/m(T) × 100`, where `m` is the number of subtheorems and `p` the number proved. The paper states, “This allows us to study partial progress even when the full theorem group is not solved” (Section 4.1, p. 8).

How to do it.
1. Sample up to `k_max=64` proof attempts per instance; let `s_i` indicate Lean acceptance and compute pass@k as the mean of `1` when any of the first `k` attempts succeeds (Section 4.1, p. 7).
2. Mark a parent fully proved only when the main theorem and every associated subtheorem are proved (Section 4.1, p. 8).
3. Compute `Cov(T)=p(T)/m(T)×100` for each parent and plot the fraction of parents above each coverage threshold (Section 4.1, p. 8).
4. Compute average subtheorems proved, `AvgSub=(1/N)Σ_T p(T)`, to show practical progress per theorem group (Section 4.1, p. 8).

Verus form. Inference: define a task group around each Rust module or API theorem. Count accepted Verus proof tasks, full groups, and coverage over required lemmas. Keep denominators explicit: number of tasks in the group and number of generated attempts. This avoids reporting a high sublemma success rate as if it were end-to-end API verification.

Evidence. On the premised benchmark, DeepSeek-Prover-V2-7B reaches approximately 0.46 pass@64, Goedel-Prover-V2-8B about 0.33, Kimina-Prover-Distill-8B about 0.22, and Goedel-Prover-SFT about 0.11 (Section 4.3, p. 9). These denominators are generated attempts per instance, not parent theorems. The paper's parent-level curves show DeepSeek covering more subtheorems at most thresholds, but the figure does not supply an exact table of parent counts.

## technique 3: token-efficiency and proof compactness

What it is. The benchmark compares generated Lean proof length with a ground-truth proof after removing explanatory prose and comments. For solved theorem `T`, it reports average and minimum generated-token ratios to ground truth. The paper defines values above one as longer generated proofs (Section 4.1, p. 8).

How to do it.
1. Strip non-Lean prose and comments before tokenization (Section 4.1, p. 8).
2. Count ground-truth tokens `ℓ_gt(T)` and all successful generated proof lengths `ℓ_gen,j(T)` (Section 4.1, p. 8).
3. Compute average ratio `E_avg(T)` and minimum ratio `E_min(T)` relative to `ℓ_gt(T)` (Section 4.1, p. 8).
4. Report distributions by model and state how selective solving affects interpretation (Section 4.3, p. 11).

Evidence. Median token-efficiency is around 16 for Goedel-Prover-V2-8B, 7.8 for DeepSeek-Prover-V2-7B, 3.6 for Kimina-Prover-Distill-8B, and 1.44 for Goedel-Prover-SFT. The paper cautions that the last figure reflects a smaller, selective solved subset (Section 4.3, p. 11). Inference: Verus evaluation should report proof-token or line ratios only alongside solve rates; a compact ratio from few easy successes is not evidence of better proof planning.

Verus form. Inference: strip comments from Rust/Verus files, tokenize proof functions separately from executable code, and compare accepted generated proofs with a checked reference. Record whether generated code includes helper lemmas or specification changes, since moving work into a `spec fn` changes what is being measured.

## technique 4: premise ablation and model-behavior diagnosis

The authors compare plain-main and premised forms on shared theorem units at pass@64. Explicit premises improve DeepSeek-Prover-V2-7B from 0.053 to 0.263 and Goedel-Prover-V2-8B from 0.053 to 0.123; Kimina rises from 0.053 to 0.070; Goedel-Prover-SFT stays at 0.035 in both settings (Section 4.3, pp. 9–10). Each number is a fraction of theorem instances solved within 64 samples in the shared comparison. The paper concludes that premises help only models able to exploit them.

Inference: VL should run the same agent with and without retrieved Verus lemmas, keeping model, sampling budget, and theorem units fixed. The difference estimates the value of explicit proof context. A high subtheorem pass rate with low parent completion indicates search bias toward easy obligations; TheoremBench reports exactly that bias (Section 4.3, p. 12).

## what is proved, measured, and trusted

The benchmark proves only that retained Lean snippets compile and that reported metrics follow accepted verifier outcomes. Measured are pass@k, full-parent completion, coverage, average subtheorems, and token efficiency across four Lean4-capable models, with `k_max=64`. Trusted are Lean's kernel, mathlib and imported declarations, the source formalizations, dependency-extraction transformation, tokenizer, and sampling protocol. The benchmark does not prove semantic adequacy of the original informal mathematics or minimality of extracted premises. Inference: the threat to a product of agent-written verified Rust is evaluation blind spots. A final Verus check gives a strong local guarantee, but without group coverage, premise accounting, and compactness metrics, the product can still hide incomplete or needlessly brittle proofs.

Inference: VL should reuse dependency-aware extraction, explicit premise ablations, parent-level completion, and denominator-aware proof-length metrics. Inference: VL should add Rust compilation and Verus verification outcomes, trusted-base manifests, specification-change detection, and separate counts for executable code, `spec fn`s, and `proof fn`s.

## techniques for the catalog

- dependency-aware premise extraction — turn hidden prior declarations into explicit, independently compiled proof tasks
- theorem-level coverage — measure partial and complete progress over all subtheorems in a parent theorem group
- token-efficiency analysis — compare accepted generated proof length with checked reference proofs and report selective-solve bias
- premise ablation — compare identical theorem units with and without explicit context to diagnose proof-agent use of dependencies

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
