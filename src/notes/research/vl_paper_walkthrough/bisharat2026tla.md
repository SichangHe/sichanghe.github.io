# TLA+-Bench: An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA+ Specification Generation
(authored by agents unless marked 🧑)
Tag: `bisharat2026tla`, [paper](https://arxiv.org/abs/2607.23425)
## scope and result

TLA+-Bench evaluates natural-language-to-TLA+ generation with an executable oracle. It releases 403 gold specifications that parse and model-check, 897 parse-only silver specifications, and four descriptions per specification from two providers and two styles, sourced from 13 repositories (Abstract; §4–5, pp. 1, 4–6). The task is graded first by SANY parsing and then by TLC over the full reachable state space of a reference configuration. The authors state, “A generated specification is checked with the TLA+ model checker, which walks the full reachable state space and decides property satisfaction exactly against the reference configuration and its bound constants” (Abstract, p. 1).

The benchmark's main lesson is that “an exact oracle gives not one correctness number but a range” (Abstract, p. 1). On 100 non-trivial system specifications, three frontier models produce 300 outputs. The reported correctness envelope is 18.7% when interface names are supplied, 10.0% by default, 4.0% after requiring substantive behavior, and 1.7% after mutation survival; every denominator in these pooled rates is 300 (Table 5, p. 8). These are different questions, not estimates of one quantity.

## technique: two-stage execution grading

Use SANY as a validity gate, then run TLC with the reference configuration and constants. A model output is correct only if it parses and TLC reports no property violation (§3, pp. 2–3). Keep the configuration fixed so the checker explores every reachable state for that instance. Record parse and semantic results separately; Table 6 reports Claude Opus 4.5 at 87% parse and 16% TLC-correct on the 100-specification evaluation set, Gemini-2.5-pro at 63% and 10%, and GPT-5 at 89% and 4% (p. 8). Open models are much lower: qwen2.5-coder-32b 29%/1%, llama3.3-70b 23%/0%, and gpt-oss-20b 7%/1%.

Verus form: Inference: compile generated Rust/Verus, run Verus proofs, and report syntax/verification separately. A passing Verus proof establishes the supplied contract for the checked model and assumptions; it does not establish that the contract captures the natural-language requirement. Inference: keep executable tests or model-level checks as a second oracle when the contract can be vacuous.

## technique: correctness envelopes and explicit grading choices

The benchmark exposes three hidden choices: whether interface names must be recovered, whether a pass must exercise behavior, and whether the named property must be load-bearing (§1, pp. 1–2; §8.2, p. 8). Run the same outputs under multiple regimes. The default gives only the description; configuration-aware prompts supply constant and property names; substantive grading requires more than one reachable state and a non-tautological behavioral property; mutation grading changes each named safety invariant to `TRUE` and reruns TLC. A mutation pass survives only if the modified run fails (§8.7, p. 9).

The 30 raw TLC passes include 12 substantive passes. Of 18 passes with a mutable safety invariant, only 5 survive mutation; the other 12 are temporal-only and scored non-surviving, yielding 5/300 = 1.7% (the conservative lower bound) (§8.7, pp. 9–10). Verus form: Inference: mutate a generated `ensures` predicate to `true` (or weaken it), rerun Verus and an independent behavior check, and count only contracts whose removal causes a meaningful failure. The exact mutation operation must match the property language; this paper's replacement applies to TLA+ safety invariants only.

## technique: data construction and audit pipeline

Collect candidate modules from public repositories, parse with SANY, model-check with TLC, and apply heuristic cleaning. The pipeline started with 1,614 candidates and removed 314, releasing 1,300; 403 are gold and 897 silver (§4, Fig. A2, Appendix A3). Remove trivial one-state fixtures from headline evaluation: 46 of 146 system specifications are flagged and excluded, leaving 100 (Table 3, p. 6; §8.1, p. 8). Preserve source files unchanged, record SHA-256 checksums, and ship the runnable configurations so users can reproduce the oracle (§4, §6).

Generate declarative descriptions retaining real names and intent descriptions hiding names, from GPT-5 and Claude Opus 4.5. Have two TLA+ annotators judge 400 sampled descriptions (100 from each set); the GPT-5 declarative set is fully faithful in 83%, partially faithful in 14%, and unfaithful in 3%, while agreement across all sets is 94% with Cohen's kappa 0.84 (§6, p. 6). The audit is author-team conducted and disclosed as non-blind.

## technique: checker-grounded failure taxonomy

Classify each failed output from deterministic checker outcomes rather than inferred prose. Categories are parse failure, configuration binding, malformed temporal formula, safety violation, liveness violation, runtime error, deadlock, and resource limit (Table 4, p. 7). On the 100-specification set, configuration binding dominates frontier failures: 74% for GPT-5 and 73% for Opus 4.5; Gemini splits 47% binding and 41% parser failures (§8.5, p. 9). At least two of three frontier models agree on the outcome for 85/100 specifications, and all three share a category on 30/100, 29 of those configuration-binding (§8.5, p. 9).

Verus form: Inference: classify failures from Verus diagnostics (parse/type, unresolved proof, timeout/resource) and from explicit harness checks (contract vacuity, panic behavior), retaining the exact tool output and denominator. This makes repair targets measurable but does not imply that a category is a root cause.

## what the oracle proves and what remains trusted

TLC explores a full reachable state space for one reference configuration and named properties. It does not certify equivalence to the reference implementation, and 112 of 403 gold configurations name only the specification rather than an explicit safety or temporal property (§6, p. 6). The authors explicitly warn that “It is not a proof that m reproduces the reference behavior” (§3, p. 3). Descriptions are model-generated; one sample per specification gives roughly ±4–7 percentage-point binomial error; hosted model snapshots and decoding settings differ (§9, pp. 10–11; Appendix A2).

Inference: the threat to agent-written verified Rust is a high parse/proof rate masking a weak or vacuous contract. VL should report separate compile, Verus-proof, behavior, and mutation-survival rates, with all denominators and model/settings stated. Existing work already provides exact-oracle grading, pass-quality probes, failure taxonomies, contamination-aware artifacts, and reproducible configurations; VL should adapt these patterns rather than count parse-valid Rust as verified behavior.

## techniques for the catalog

- two-stage execution oracle — separate parser validity from full-state model-checking correctness
- correctness envelope — report interface-aware, default, substantive, and mutation-surviving rates with fixed denominators
- mutation pass-quality probe — replace checked safety properties with `TRUE` and require the checker to fail
- reproducible dataset pipeline — parse, model-check, clean, checksum, and ship runnable configurations
- checker-grounded failure taxonomy — classify failures from deterministic tool outcomes and preserve the category counts
Checked 2026-10-13: audit record bisharat2026tla; paper-study comparison complete; gate executed; experiments not rerun
