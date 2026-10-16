# Learning the Error Patterns of Language Models
(authored by agents unless marked 🧑)
Tag: `kim2026errorpatterns`, [paper](https://doi.org/10.48550/arxiv.2605.28328)

## scope and result

Kim, Berg-KirkPatrick, and D’Antoni study a practical way to learn repeated language-model failures and prevent them during decoding. Their object is a prefix filter, a symbolic function that examines a partial output and rejects it when the prefix already implies an invalid completion. PALLA learns these filters from samples, an external validity oracle, and a separate synthesizer model. The abstract says: “Prefix filters learned by PALLA (i) help us quantitatively analyze the error patterns of LLMs, and (ii) can be used to constrain the outputs of a model via constrained sampling algorithms.” (Abstract, p. 1.)

The paper evaluates five local models (Qwen2.5-1.5B/7B/14B, Llama3.1-8B, Gemma3-12B) over MLIR, molecules, dialogue summaries, and TypeScript. Learning budgets are 50, 100, 500, and 500 samples respectively; evaluation sets are 200, 200, 500, and 500 samples (§4, p. 5). Filters are learned in three rounds, because each round changes the error distribution (§4, p. 6). For TypeScript, validity rises from 16.0% unconstrained to 70.0% after three rounds (Figure 3 and §5.4, pp. 8–9; denominator 500 generated samples). Qwen-1.5B solves 13/50 disjoint MultiPL-E tasks unconstrained and 29/50 with filters at pass@10 (§5.4, p. 9). The gain is compile validity, not a guarantee of task correctness.

## technique 1: define a domain oracle and cluster concrete failures

What it is. The authors define an oracle O that labels an output valid or invalid, then learn from invalid outputs. For each invalid sample, the oracle can also return an error class, allowing failures to be grouped before synthesis. Algorithm 1 calls this “Error-Driven Pattern Learning.” The paper states: “Algorithm 1 describes error-driven pattern learning: which, at a high level, simply draws samples from L (line 3), divides them into valid and invalid samples (lines 4 and 5), then learns error patterns from the divided sets (line 7).” (Section 3, p. 4; the extracted text omits punctuation around “in”.) The formal goal is zero probability of invalid outputs under constrained generation (Definition 2.1, p. 3).

How to apply it.

1. Choose the target domain and a validity oracle, such as a compiler, RDKit, leak detector, or database engine (§2, p. 3; §4, p. 5)
2. Sample B unconstrained outputs from the target LLM (Algorithm 1, line 3, p. 3)
3. Split valid and invalid outputs using the oracle (Algorithm 1, lines 4–5, p. 3)
4. If the oracle reports causes, place each invalid output in its error group; otherwise use one group (§3, p. 4)
5. Learn a separate pattern set for every error group (Algorithm 1, lines 6–8, p. 3)

The MLIR oracle is `torch-mlir-opt`; its first compiler error assigns one of eight classes (§C, p. 13). TypeScript uses the first compiler error code, and the summary oracle rejects any protected name, phone, id, email, or contact_bundle value (§C, pp. 14–15).

Verus form. Inference: use Verus as the oracle for whether generated Rust verifies, and classify diagnostics such as parse/type errors, failed assertions, unsatisfied `requires`, and solver timeouts. Keep separate groups for distinct diagnostics so each filter targets a concrete failure. Inference: unlike the paper's binary compiler validity, a Verus pipeline should record the exact assumptions and verifier configuration with each result.

Evidence and limits. The authors use only 50–500 learning samples per domain and report high capture rates; for example, all learned MLIR/Qwen-7B filters catch 74.2% of that model's invalid samples, and the top three catch 51.7% (Figure 2, p. 6). The approach assumes that failures recur and that the oracle's error categories are useful. It cannot learn errors that never occur in the sample or errors with no stable prefix pattern.

## technique 2: synthesize and validate distributionally sound prefix filters

What it is. A prefix filter is a function `ϕ:Σ*→{true,false}` that triggers when it returns false (Definition 3.1, p. 4). Soundness means every suffix after a rejected prefix is invalid; completeness means every inevitably invalid prefix is rejected. Exact soundness can be undecidable, so PALLA uses distributional soundness: the filter may reject rare valid outputs, but its false-trigger probability on the target model distribution must be at most ε (Definition 3.2, p. 4). The paper explains: “This observation allows prefix filters to be simple, efficient, and easy-to-learn, all of which are key desiderata.” (Section 1, p. 2.)

How to apply it.

1. Give a large synthesizer the invalid group and valid samples (Algorithm 2, line 3, p. 4)
2. Ask it to emit Python `str -> bool` filters (§3.2, p. 4)
3. Validate each candidate for distributional soundness and whether it catches the intended invalid group (Algorithm 2, line 6, p. 4)
4. If validation fails, requery with the failure explanation up to retry limit R (Algorithm 2, lines 5–9, p. 4)
5. Keep only filters that pass final validation (Algorithm 2, line 9, p. 4)
6. Repeat learning on the shifted distribution produced by earlier filters (§4, p. 6)

Example 3.3 gives a whitespace filter that is unsound for arbitrary TypeScript but distributionally sound for Qwen-1.5B because whitespace prefixes almost always lead to empty, uncompilable completions (§3.1, p. 4). The experiments enforce a 1% error rate using both model samples and an external validated-solution set (§C, p. 13).

Verus form. Inference: synthesize a predicate over a partial Rust/Verus file, such as a regex or parser check for an impossible annotation shape, then validate it against verified and failed generations. A filter may reject a rare valid proof, so measure false triggers on an external corpus of known-verifying Rust. Inference: use textual prefix filters for early failures, but do not claim semantic soundness unless the completed artifact has passed Verus.

Evidence and limits. Filters are model- and domain-specific. Own-model capture is 69.4% for MLIR and 68.6% for TypeScript, while cross-model capture is 24.4% and 65.3% respectively (Figure 2, p. 6). The paper warns that a filter sound for one model can reject valid outputs from another; TypeScript whitespace is the explicit example (§5.3, p. 7). Errors that are not prefix-expressible, such as `list.print` invalid while `list.printAll` is valid, may be unlearnable (§6, p. 9).

## technique 3: constrain generation with CARS and intersecting filters

What it is. After learning filters, PALLA uses constrained adaptive rejection sampling (CARS). The decoder samples tokens, tests every new prefix against all filters, and immediately rejects a candidate when any filter triggers. It updates a probability trie to zero the rejected branch and rebalances the remaining mass (Algorithm 3 and §3.2, p. 5). The paper's algorithm says: “if ∃ϕ ∈ F such that ϕ(o · t) = false: ▷ If current prefix o is caught by a prefix filter” (Algorithm 3, p. 5).

How to apply it.

1. Initialize an empty output and token-probability trie (Algorithm 3, lines 2–4, p. 5)
2. Sample the next token from the LLM and append it to the output (line 6, p. 5)
3. Run every filter on the new prefix; filters are intersected by checking all of them (§3.2, p. 5)
4. On a trigger, zero the current trie node, rebalance probabilities, and restart the sample (line 8, p. 5)
5. Stop on EOF and return the accepted output (lines 5–9, p. 5)

Verus form. Inference: run filters while generating Rust contracts and proof code, rejecting prefixes that contain known malformed Verus syntax or recurring failed patterns. After a complete candidate, invoke Verus and keep only verified output. Inference: CARS can reduce wasted verifier calls but cannot ensure semantic validity because a prefix can look safe while a later proof obligation fails.

Evidence and limits. Prefix filters increase validity in most domains. MLIR gains have a 60.5% average token overhead; molecules 31.3%; summaries 26.5% (§5.4, p. 9). TypeScript overhead is 914.1% for Qwen-1.5B and 400.2% for Llama-8B because errors occur late or recur often (§5.4, p. 9). Thus generation cost can dominate the benefit for weak models or tail errors.

## technique 4: use repeated rounds to expose shifted error modes

What it is. Filtering removes common errors, which changes the distribution of remaining errors. PALLA therefore learns three rounds: train filters on unconstrained samples, apply them, sample from the shifted distribution, and learn again (§4, p. 6). For Qwen-1.5B TypeScript, TS1005 failures fall from 260/500 to 7/500 after round one, while TS2304 failures rise from 23/500 to 51/500 (§5.1, p. 6). The authors conclude that “PALLA is capable of learning prefix filters that capture a wide portion of the per-domain-and-LLM error pattern.” (§5.1, p. 6.)

How to apply it.

1. Learn and validate a first filter set from an unconstrained sample (§4, p. 6)
2. Decode with CARS and collect newly exposed failures (§4, p. 6)
3. Reclassify those failures with the oracle and learn another filter set (§5.1, p. 6)
4. Repeat for a fixed number of rounds, measuring validity and token cost after each round (§4–5, pp. 6–9)

Verus form. Inference: maintain a failure corpus across Verus runs. Each round can target newly exposed diagnostics, such as a syntax fix revealing a failed `ensures` or an invariant gap. Keep the round's verifier version, flags, and assumptions fixed when comparing rates.

Evidence and limits. The top three filters catch 48.6% of trigger events on average in MLIR and the top five 64.2% (Appendix E.1, p. 15). However, the paper observes cases where rounds merely shift errors without increasing validity, notably TypeScript with Llama-8B (§6, p. 9). Inference: repeated rounds should stop when marginal validity gain is below their verifier and sampling cost.

## what is proved, measured, and trusted

The paper formally defines errors, soundness, distributional soundness, and constrained generation; it does not prove that learned filters are globally sound. It measures filter capture, validity, quality, transferability, token overhead, and TypeScript pass@10 on disjoint tasks. The main validity denominator is generated samples: TypeScript uses 500 test samples, while pass@10 uses 50 MultiPL-E tasks (§4 and §C, pp. 5, 14). The paper reports 95% bootstrap confidence intervals for comparisons (§5, p. 6), and notes one molecule increase is significant only at 90% (§5.4, p. 8).

Trusted components include each domain oracle (compiler, RDKit, leak detector, or execution engine), external valid-solution sets, the synthesizer LLM, model checkpoints, CARS implementation, and filter validation policy. The paper itself says prefix filters can fail on competent models with too few invalid examples, non-prefix-expressible errors, and shifting error modes (§6, p. 9).

## techniques for the catalog

- oracle error grouping: sample unconstrained outputs, classify failures, and learn patterns per diagnostic group
- distributionally sound prefix filters: synthesize `str -> bool` predicates and validate false-trigger rates on model and external valid distributions
- CARS rejection sampling: reject a generation as soon as any filter matches and rebalance the token trie
- shifted-distribution rounds: relearn filters after earlier filters expose different recurring failures
