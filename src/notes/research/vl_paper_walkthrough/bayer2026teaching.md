# Teaching LLMs Program Semantics via Symbolic Execution Traces
(authored by agents unless marked 🧑)
Tag: `bayer2026teaching`, [paper](https://doi.org/10.48550/arxiv.2605.06184)

## what the paper establishes

The paper builds a 500-task C benchmark from SV-COMP 2025 and trains Qwen3-8B on Soteria symbolic-execution traces. It describes the benchmark directly: "We construct an evaluation framework where models perform binary classification: given a C program and a property, determine whether the property holds or is violated." (section 3, p. 4) The benchmark has 100 tasks in each of memory safety, overflow absence, termination, reachability, and data-race absence; each property has 50 holds and 50 violated tasks, with programs up to 400 lines (section 3.1, p. 4). The paper reports four model runs per configuration and averages accuracy; the denominator for each property side is 50 tasks per run. It evaluates only a binary verdict, not a machine-checkable witness: “We evaluate only the binary verdict; requiring witness generation would be substantially harder” (section 3.1, p. 5).

The authors summarize the pipeline as: "Soteria produces detailed traces that capture memory states, branch conditions, and the reasoning behind property violations, making implicit program semantics explicit." (section 4.1, p. 6) The baseline finding is asymmetric semantic competence. Claude Opus 4.7 gets 98.3% on holds and 92.0% on violated tasks, while four of 14 models identify fewer than half of violations despite exceeding 84% on holds (section 3.2, p. 5). Qwen3-32B violation accuracy falls from 90.0% for 0–25-line programs to 32.1% for 101–200 lines; these percentages use the tasks in each length bin, not the full 500-task denominator (section 3.2, p. 5). An LLM judge classified 1,069 false negatives: missing a triggering edge case 44%, rationalizing a detected bug away 27%, incorrect reasoning 19%, universal/existential confusion 8%, and superficial analysis 1% (section 3.2, p. 5).

## technique 1: generate semantic supervision with symbolic execution

what it is and when to use it

Soteria executes C or Rust symbolically, treating inputs as symbols and exploring paths with path conditions. This is useful when labels are expensive but an analysis tool can emit structured traces. The paper states: “Unlike concrete execution, which runs a program on specific inputs, symbolic execution reasons over all possible inputs simultaneously, exploring execution paths by treating inputs as symbolic variables and tracking the conditions under which each path is taken” (section 4.1, p. 6). Soteria's built-in checks cover memory safety, buffer overflows, and undefined behavior, so no specification synthesis or hand annotation is needed.

how to do it (paper's procedure)

1. Start with CodeParrot's more than 14 million C files (section 4.1, p. 6).
2. Filter to approximately one million self-contained files with no `#include` or `#import`, keeping traces simple (section 4.1, p. 6).
3. Run Soteria and retain its approximately 34,000 usable traces. Parser limitations, files without meaningful control flow, and path-exploration bounds account for the reduction (section 4.1, p. 6).
4. Classify traces as manifest bugs (a violation on all feasible inputs), latent bugs (an error path for some inputs without universality), or no-violation traces (section 4.2, p. 6).
5. Feed the selected traces to continued pretraining (CPT), with traces concatenated under a standard language-modeling objective (section 4.2, p. 6).

The training corpus is independent of the SV-COMP holdout. The authors explicitly note that they did not perform deduplication, so overlap with open-source repositories is possible; they argue that Soteria does not check the holdout's termination, reachability, or data-race labels (section 4.1, p. 6).

Verus form

Inference: Run a symbolic executor that supports Rust over unverified Rust examples, retain its path conditions, memory states, and violation locations, and train a model to predict or explain Verus obligations. Verus itself proves Rust contracts with specifications, proof functions, and solver-backed obligations; a Soteria trace is training evidence, not a Verus proof. The Verus analogue should preserve the exact structured trace and pair it with the Rust function and intended `requires`/`ensures`, while the final acceptance check remains `verus` verification.

what evidence supports it and limits

Soteria is described as supporting both C and Rust (section 4.1, p. 6), but every experiment here uses C and a single engine. The paper's 34,000 traces are generated, while the best model uses 3,208 manifest traces, so the usable-trace count and training denominator must not be conflated. The authors say the pipeline is annotation-free, but its correctness still trusts Soteria's checks and parser. It does not generate machine-checkable witnesses and has not been tested on downstream tasks (section 6.3, p. 9).

## technique 2: curate manifest bug traces and combine them with thinking

what it is and when to use it

The strongest configuration filters to 3,208 manifest bug traces in Soteria's HTML format and enables Qwen3 chain-of-thought (“thinking”) at inference. This targets the paper's hardest case—finding violations—rather than merely confirming holds.

how to do it

1. Use only the 3,208 manifest traces, or compare against 5,048 manifest-plus-latent, 16,234 filtered bug/non-bug, 34,495 all-trace, and 6,416 balanced datasets (section 4.2, p. 6).
2. Keep HTML structure, removing non-semantic metadata such as timestamps; compare with plain text and LLM-informalized traces (section 4.2, p. 6).
3. Continue-pretrain Qwen3-8B for one epoch; the best set is about 4.6 million tokens and takes about 10 minutes on eight GPUs (section 5, p. 7).
4. At evaluation, enable thinking and parse a final holds/violated verdict. Count timeouts and unparseable responses as incorrect, as the benchmark does (section 3.2, p. 5).

The paper reports fixed-denominator accuracy: CPT on 3,208 HTML manifest traces raises violation detection from 49.4% to 56.7% without thinking; with thinking it rises from 48.0% to 67.3%. Thinking alone changes 49.4% to 48.0%, while the combined result adds 10.6 percentage points beyond CPT alone (section 5, p. 7). The best 8B configuration's 67.3% violated accuracy exceeds the 32B no-thinking model's 56.9%, but the 32B thinking model reaches 77.8%; these are each over 200 violated tasks (4 runs × 50 tasks), with means and standard deviations in Table 1 (p. 8).

Verus form

Inference: Build a training set from manifest counterexamples or failed Verus proof obligations, retaining the solver's structured state and the exact source location. Use CPT to teach the model recurring obligation patterns, then ask it to reason before proposing a Rust/Verus repair. The model's output remains a candidate; only Verus verification should decide whether the repair is accepted. Verus has no Qwen-specific “thinking” construct, so this is an inference about test-time reasoning, not a paper feature.

what evidence supports it and limits

Training on all 34,495 HTML traces lowers violation accuracy to 39.9%, and training on the same 3,208 C files without traces lowers it to 40.2% (section 5, p. 7). Thus the reported gain is tied to curated trace semantics, though dataset composition is partly confounded: the 5,048 set samples only 754 manifest bugs (section 5, p. 7). HTML beats plain text without thinking, 56.7% versus 53.7%, but plain text is better for overflow (68.0% versus 51.0%) and data races (73.0% versus 65.5%) while worse for memory safety (22.0% versus 39.0%); all are Table 1 means over four runs and 50 tasks per property side. With thinking, plain text has a 45% unparsed rate and informalized traces have 62%, so the paper's structured-format conclusion includes an output-parsing confound (section 5, p. 8).

## technique 3: evaluate transfer and budget explicitly

what it is and when to use it

The authors test whether training on checks for memory safety, overflow, and undefined behavior transfers to termination, reachability, and data races. This is useful when a verifier's artifact vocabulary is narrower than the target property set.

how to do it

1. Compare the best HTML bug-trace model against the same Qwen3-8B base model with and without thinking (Table 1, p. 8).
2. Report each property separately, retaining the 50-task-per-property-side denominator and four-run mean.
3. Record unevaluated outputs as incorrect, then separately report parseable-only performance and a larger output-token budget (section 5, p. 8).

The best model improves violated accuracy over the no-thinking base by 28.5 points for overflow (to 66.0%), 28.0 for memory safety (47.0%), 16.0 for termination (94.5%), 11.5 for data races (69.0%), and 5.5 for reachability (60.0%). The data-race and reachability changes are not significant at p<0.05 with four runs and 50 tasks per cell (section 5, p. 8). Thinking causes 13.4% unevaluated tasks for the best configuration versus 1.6% for base; the rates are 14.1% holds and 12.7% violated. On parseable responses only, holds are 90.8% and violated 77.1%, versus 91.2% and 50.8% for base; this is a +26-point violated gain on a changed denominator (section 5, p. 8). Increasing the output budget from 8,192 to 24,576 tokens adds 1.8 overall points, but 10–14% still time out.

Verus form

Inference: For VL, report both fixed-denominator (including verifier failures and timeouts) and parseable-only rates. Separate property families such as memory safety, functional postconditions, termination, and concurrency invariants. A Verus proof that times out or fails to compile should remain a failure in the primary denominator; parseable candidate metrics can diagnose the model but cannot establish soundness.

## what is proved, trusted, and not established

The paper proves only empirical claims about model responses on its benchmark; SV-COMP tools establish the benchmark ground truth. It does not prove that the LLM's explanations are sound, that Soteria traces are complete, or that a candidate Verus proof is correct. The benchmark is single-file C, binary classification, and 500 tasks; the authors list one model family, one symbolic engine, no contamination test, limited per-cell power, and no downstream transfer (section 6.3, p. 9). The result therefore threatens VL mainly as an engineering risk: an agent may confidently miss violations, especially on longer code, while a trace-trained model may improve triage. Inference: product acceptance must continue to require Verus's checker and should treat trace-trained LLM judgments as prioritization or repair proposals.

## techniques for the catalog

- symbolic-trace supervision — run symbolic execution on unlabeled code and train on structured path, state, and violation traces
- manifest-trace curation — select traces where the analyzer establishes a violation for every feasible input
- structure-preserving CPT — retain HTML or equivalent hierarchy during continued pretraining instead of flattening tool output
- reasoning-plus-budget evaluation — combine curated traces with explicit reasoning and report fixed and parseable denominators
- transfer and ablation checks — compare trace semantics against code-only, all-trace, format, property, and output-budget controls

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
