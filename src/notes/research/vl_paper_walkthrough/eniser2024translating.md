# Towards Translating Real-World Code with LLMs: A Study of Translating to Rust
(authored by agents unless marked 🧑)
Tag: `eniser2024translating`, [paper](http://arxiv.org/abs/2405.11514v3)

## scope and result

The paper presents Fluorine, an LLM transpiler for C/Go to Rust that checks candidate behavior with a cross-language differential fuzzer and repairs failed candidates. Its key problem is missing target-language tests. The authors write, “Our cross language differential fuzzer allows us to obtain evidence of semantic equivalence without unit tests.” (p. 2). The study extracts manageable function-centered benchmarks from seven GitHub projects, maps states across languages with JSON, and compares whole input/output states including side effects.

The benchmark has 408 samples: libopenaptx 31, opl 81, go-gt 43, go-edlib 36, ach 121, geo 67, and triangolatte 29 (Table 1, p. 8). Five LLMs and four feedback strategies give 8,160 benchmark/model/strategy combinations; each experiment is run three times and metrics are averaged (Section 6.2, p. 8). Overall success—compile and pass the fuzzer—is 47.3% GPT-4o, 44.2% Claude 2, 38.5% Claude 3, 33.8% Gemini Pro, and 19.5% Mixtral, averaged across feedback strategies (Section 6.2, p. 8). A translation is deemed equivalent when five minutes of fuzzing finds no counterexample; this is heuristic evidence, not a proof. The authors report, “However, our fuzzer achieves an average line coverage of 97%.” (Section 4.2, p. 6). Among failed translations, 52.6% have serialization failures, 40.3% fail with a counterexample in the final translation, and 7.0% have no compiling translation (p. 10).

## technique 1: extract function-centered benchmarks and prompt translations

Given a project and function identifier, analyze transitive callees, type definitions, globals, and standard-library dependencies, then emit one compilable source file. Keep samples with no third-party libraries and call-graph depth below four. Prompt the LLM with a preamble, source code, formatting constraints, safe Rust, unchanged function and parameter names and return types, and restrictions needed by the fuzzer (Figure 6, p. 6). Compilation repair repeatedly sends the faulty Rust and compiler error to the LLM, requesting changes only to affected lines (p. 6).

Inference: a Verus version would retain this extraction but add a reviewed functional contract to the prompt and a `verus` check after compilation. A compilable translation is only a candidate; it does not establish that the contract matches the source.

## technique 2: cross-language state mapping and differential fuzzing

The paper states, “The framework contains a cross-language differential fuzzer.” (p. 4) Define a source program p and candidate p′ with state sets Sp and Sp′ and mappings M and M′. The target relation is `p(s) = M′(p′(M(s)))` for every source state s (p. 4). In practice, generate a Rust harness with Bolero and libFuzzer. Generate states in Rust, serialize them to JSON, deserialize into the source program through an FFI call, execute both programs, serialize the source output, deserialize it into Rust, and compare complete output states. User-defined fields are matched by names; JSON handles primitives, pointers, and structured values. Positive examples E+ are agreeing states. A counterexample E− is `(s_in, s_exp, s_act)` containing the input, source output, and candidate output (pp. 4–6).

The paper's running `add` example illustrates a receiver mutation: the last element of field `s` changes from false to true, and the original and translation agree on all generated states (Figures 4–5, pp. 3, 5). The authors caution, “This is a limitation of fuzzing and testing in general.” (Section 4.2, p. 6). JSON serialization only partially supports Rust trait definitions, `impl` traits, and lifetimes in data type definitions; serialization failures can prevent equivalence checking. Concurrency, network, and file I/O are unsupported and excluded from the benchmarks (p. 6).

Inference: the Verus analogue is a relational specification over source and Rust states, with conversion functions and an `ensures` relation. Verus can prove the relation for all modeled states, whereas Fluorine's random fuzzing only samples states. JSON/FFI mappings should be treated as trusted boundary code unless separately verified.

## technique 3: counterexample feedback strategies

If compilation repair fails, stop with failure; otherwise run the fuzzer. If E− is empty, return p′; otherwise construct a new query and retry until a fixed budget. Fluorine evaluates four feedback methods. Restart discards p′ and repeats the original prompt. Hinted groups positive and negative examples separately by exercised path (equivalence class), then adds examples from one positive class and one negative class to the original prompt. BaseRepair keeps the faulty translation and supplies counterexamples from one path class. CAPR starts like BaseRepair, then appends failed translations and new counterexamples to the dialogue. The experimental budget is five; Hinted and BaseRepair use four examples, and CAPR keeps three prior translations (Section 5, pp. 6–7; Section 6.1.5, p. 8).

Restart and Hinted outperform BaseRepair and CAPR. The authors suggest that counterexamples may confuse the LLM; they do not establish this explanation. The best feedback strategy gives a proportional improvement in success rates of 7–21% across benchmarks (Figure 12, p. 10). Inference: an agent repairing Verus code should preserve counterexamples as regression tests but may benefit from restarting generation with concise evidence rather than appending a long history. Never weaken a contract to make a counterexample disappear.

## techniques for the catalog

- benchmark extraction: slice a project around a function and its transitive dependencies into a compilable translation unit
- state mapping: serialize target states to JSON, execute source through FFI, and map outputs back for whole-state comparison
- differential fuzzing: generate Rust states with Bolero/libFuzzer and report positive matches or structured counterexamples
- compilation repair: iteratively send compiler diagnostics and affected code lines to the LLM
- restart feedback: discard a failing candidate and regenerate from the original prompt
- hinted feedback: add path-grouped positive and negative examples to the original prompt
- counterexample-guided repair: retain the faulty candidate and ask for a correction using E− from one path class
- conversational repair: append successive failed translations and counterexamples in a bounded dialogue
