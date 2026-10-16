# Towards Translating Real-World Code with LLMs: A Study of Translating to Rust
(authored by agents unless marked 🧑)
Tag: `eniser2024translating`, [paper](http://arxiv.org/abs/2405.11514v3)

## scope and result

The paper presents Fluorine, an LLM transpiler for C/Go to Rust that checks candidate behavior with a cross-language differential fuzzer and repairs failed candidates. Its key problem is missing target-language tests. The authors write, “Our cross language differential fuzzer allows us to obtain evidence of semantic equivalence without unit tests.” (p. 2). Fluorine extracts manageable function-centered benchmarks from seven GitHub projects, maps states across languages with JSON, and compares whole input/output states including side effects.

The benchmark has 408 samples: libopenaptx 31, opl 81, go-gt 43, go-edlib 36, ach 121, geo 67, and triangolatte 29 (Table 1, p. 7). Five LLMs run with four feedback strategies, three repetitions, for 8,160 experiments. Overall success—compile and pass the fuzzer—is 47.3% GPT-4o, 44.2% Claude 2, 38.5% Claude 3, 33.8% Gemini Pro, and 19.5% Mixtral. A translation is deemed equivalent when five minutes of fuzzing finds no counterexample; this is heuristic evidence, not a proof. Average fuzzer line coverage is 97%, but failures are 52.6% serialization, 40.3% found counterexamples, and 7.0% no compiling translation (p. 10).

## technique 1: extract function-centered benchmarks and prompt translations

Given a project and function identifier, analyze transitive callees, type definitions, globals, and standard-library dependencies, then emit one compilable source file. Keep samples with no third-party libraries and call-graph depth below four. Prompt the LLM with a preamble, source code, formatting constraints, safe Rust, unchanged names and return types, and restrictions needed by the fuzzer (Figure 6, p. 5). Compilation repair repeatedly sends the faulty Rust and compiler error to the LLM, requesting changes only to affected lines (p. 6).

Inference: a Verus version would retain this extraction but add a reviewed functional contract to the prompt and a `verus` check after compilation. A compilable translation is only a candidate; it does not establish that the contract matches the source.

## technique 2: cross-language state mapping and differential fuzzing

The paper states, “The framework contains a cross-language differential fuzzer.” (p. 4) Define a source program p and candidate p′ with state sets Sp and Sp′ and mappings M and M′. The target relation is `p(s) = M′(p′(M(s)))` for every source state s (p. 4). In practice, generate a Rust harness with Bolero and libFuzzer. Generate states in Rust, serialize them to JSON, deserialize into the source program through an FFI call, execute both programs, serialize the source output, deserialize it into Rust, and compare complete output states. User-defined fields are matched by names; JSON handles primitives, pointers, and structured values. Positive examples E+ are agreeing states. A counterexample E− is `(s_in, s_exp, s_act)` containing the input, source output, and candidate output (pp. 4–6).

The paper's running `add` example catches a mutated boolean in a nested array by comparing the entire serialized state, not only the explicit return value (p. 5). The authors caution, “Our fuzzer can only make heuristic based guarantees (e.g. coverage) on the equivalence of p and p′.” (p. 6). Unsupported concurrency, network, file I/O, and many Rust type features can make checking fail (p. 6).

Inference: the Verus analogue is a relational specification over source and Rust states, with conversion functions and an `ensures` relation. Verus can prove the relation for all modeled states, whereas Fluorine's random fuzzing only samples states. JSON/FFI mappings should be treated as trusted boundary code unless separately verified.

## technique 3: counterexample feedback strategies

After compilation repair, run the fuzzer. If E− is empty, return p′; otherwise construct a new query and retry until a fixed budget. Fluorine evaluates four feedback methods. Restart discards p′ and repeats the original prompt. Hinted adds positive and negative examples, grouped by exercised path (equivalence class), to the original prompt. BaseRepair keeps the faulty translation and supplies counterexamples from one path class. CAPR keeps a dialogue of failed translations, appending new counterexamples; its window is limited to the latest three failures. The experimental budget is five; Hinted and BaseRepair use four examples, and CAPR keeps three prior translations (pp. 6–7).

The surprising result is that Restart and Hinted outperform BaseRepair and CAPR; counterexamples can confuse the LLM. The best feedback strategy raises success 7–21% across benchmarks (p. 10). Inference: an agent repairing Verus code should preserve counterexamples as regression tests but may benefit from restarting generation with concise evidence rather than appending a long history. Never weaken a contract to make a counterexample disappear.

## evidence, limits, and VL implications

The study measures compile success, fuzzer success, coverage, Clippy warnings, and feedback improvements. Complexity matters: success declines as lines of code increase and tends to fall after about 100 lines; the ACH result near 80% is inflated by roughly 40 near-duplicate benchmarks and drops to about 55% when removed (p. 8). Successful translations occasionally contain 1–15% warning rates for style, complexity, performance, correctness/suspicious, or unsafe code (p. 8). C2Rust translations average 1.98 times as many lines as LLM translations and are less idiomatic, but rule-based translation has stronger theoretical guarantees (p. 9).

Trusted components are the source implementation as oracle, state mappings and JSON serializers, compiler and FFI, fuzzer generation, five-minute timeout, and the assumption that high coverage approximates equivalence. The paper itself acknowledges that the fuzzer may miss counterexamples. Inference: threat to agent-written verified Rust is high at state mapping and oracle boundaries; a passing fuzzer does not certify a Verus contract. Existing VL work should reuse whole-state differential testing and path-specific counterexample storage, but should not claim formal equivalence from coverage.

## techniques for the catalog

- benchmark extraction: slice a project around a function and its transitive dependencies into a compilable translation unit
- state mapping: serialize target states to JSON, execute source through FFI, and map outputs back for whole-state comparison
- differential fuzzing: generate Rust states with Bolero/libFuzzer and report positive matches or structured counterexamples
- compilation repair: iteratively send compiler diagnostics and affected code lines to the LLM
- restart feedback: discard a failing candidate and regenerate from the original prompt
- hinted feedback: add path-grouped positive and negative examples to the original prompt
- counterexample-guided repair: retain the faulty candidate and ask for a correction using E− from one path class
- conversational repair: append successive failed translations and counterexamples in a bounded dialogue

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
