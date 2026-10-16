# MultiPL-E: A Scalable and Extensible Approach to Benchmarking Neural Code Generation
(authored by agents unless marked 🧑)
Tag: `cassano2022multipl` , [paper](https://www.semanticscholar.org/paper/780f7eebde16b1ae5843df3a79a7772899ef6a71)

## scope and result

MultiPL-E is a method for turning a unit-test-driven benchmark written in Python into parallel benchmarks for many languages. Its central engineering choice is to translate only the interface, tests, comments, and types; the model still writes the function body. The paper reports 18 target languages (19 languages including Python), three models, and HumanEval and MBPP as source suites. No earlier note in the local research tree covers this paper.

The authors state: “MultiPL-E supports 18 languages and is straightforward to extend with more.” (Abstract, p. 1). They also state: “what makes MultiPL-E possible is that code generation benchmarks have unit tests to determine if the generated function behaves correctly.” (Introduction, p. 1). The measured object is pass@k: a generated completion passes when it passes all translated tests. This measures benchmark behavior, not functional correctness beyond those tests. Inference: for VL, the same architecture can make a Verus benchmark by translating specifications and proof-facing interfaces, but passing generated tests cannot replace a Verus proof.

## technique 1: build a thin benchmark compiler

Use this when the source benchmark has independent functions and executable tests, and when a full source-language compiler would be unnecessary. The method is:

1. Select problems whose behavior is determined by first-order inputs and expected outputs. The paper says HumanEval has “164 problems” and that “all problems have tests to check correctness” (Section 3.1, p. 3).
2. For each target language, implement translation of four pieces: function name and arguments, simple unit tests, the natural-language comment, and type annotations. The paper explicitly lists these four components (Section 1, p. 1).
3. Do not translate the function body. The model synthesizes it after receiving the translated prompt. The paper says: “the compiler does not have to translate the body of a function, since it is the job of the code generation model to synthesize it.” (Introduction, p. 1).
4. Keep each compiler small. The paper reports each is approximately 200 lines of code (Introduction, p. 1), then manually inspect cases where language semantics differ.

Inference: in Verus, a thin compiler would emit a Rust function signature plus `requires` and `ensures` contracts, ghost/spec types, and proof obligations, while leaving the executable body and proof blocks to the model. Verus code must be checked with Verus; a translated test harness alone is weaker. `requires`, `ensures`, `assert`, and `proof fn` are constructs documented in the local Verus study. A Python test body does not carry over when the property depends on quantified specifications or ownership.

Evidence and limits: the method scales to the paper's 18 compilers, but the authors caution that typed languages and Perl, Bash, and R require care (Section 3.2, p. 4). It excludes higher-order test values: “We do not support testing higher-order functions” (footnote 4, p. 4). Inference: a VL port therefore needs an explicit unsupported-feature inventory, especially for aliasing, concurrency, and unsafe Rust.

## technique 2: compile values, equality, and types semantically

Use this when syntax translation alone would change test meaning. The steps in Section 3.3 are:

1. Recursively translate Python constants and data structures into target-language values. The paper says: “Each MultiPL-E compiler has a recursive function that compiles Python values to the target language’s values.” (Section 3.3.1, p. 4).
2. Choose a natural analogue when the source type has no exact target type. Their example maps Python tuples and lists to JavaScript arrays because JavaScript lacks a canonical tuple type (Section 3.3.1, p. 4).
3. Choose equality deliberately. Python `==` checks deep equality, so translated tests use deep equality and import a library helper where necessary (Section 3.3.1, pp. 4–5). Figure 4 shows R `identical` and JavaScript `assert.deepEqual`.
4. Translate annotations for typed targets and infer missing types from tests. For MBPP, the authors infer types of values in assertions rather than manually annotating more than 400 problems (Section 3.3.2, p. 5).
5. Represent algebraic options explicitly. Python `Optional[Int]` becomes an option-like target value such as Rust `Some(n)` (Section 3.3.2, p. 5).

Inference: a Verus compiler must preserve the semantic type and proof meaning, not merely print Rust syntax. It can emit Rust datatypes and `spec fn` descriptions, then use `ensures` to state the relation between input and output. It cannot infer a sound contract from examples alone; a human or trusted specification source must define the intended predicate. Verus's ownership and ghost-state rules also mean that translating a Python aliasing behavior requires a new model.

Evidence and limits: five HumanEval problems use `Any` and are not compiled to most traditional typed languages including C++ and Rust (Section 3.3.2, p. 5). Up to five typed-language problems are dropped, three helper-function problems are excluded, and two randomized-test problems are modified (Section 3.4, p. 5). The authors say the approach generalizes only when natural analogues for Python data exist (Section 3.4, p. 5).

## technique 3: isolate execution and score hidden tests

Use this to evaluate generated programs reproducibly and prevent the prompt from containing its own answer. The method has four sandbox stages: compile when needed, run with a language-specific timeout, validate against unit tests, and classify the output (Introduction, p. 1). For MBPP, remove assertions from prompts and retain them as hidden tests; the paper says the HumanEval approach “where test cases are hidden, is a significantly better way to evaluate code generation.” (Section 3.1, pp. 3–4).

For each language, compute pass@k with 200 completions. The paper defines pass@1 as the likelihood that a completion passes all tests and uses temperature 0.2 for pass@1, 0.8 for pass@10 and pass@100 (Section 4.2, p. 6). The denominator is the 200 sampled completions per temperature, not the number of benchmark problems. Inference: a VL evaluation should report both proof acceptance and test outcomes per generated candidate, with the number of candidate programs and benchmark tasks as separate denominators. A sandbox can run `verus` and classify verification errors, but timeout and compiler version become part of the trusted setup.

The reported evidence is model- and setting-specific: Codex, CodeGen, and InCoder on MultiPL-HumanEval and MultiPL-MBPP, with the translated prompts and the sampling settings above (Sections 4–5, pp. 6–9). The paper notes Codex's Python HumanEval pass@1 as 45.9% for `code-davinci-002`, compared with 28.8% in earlier work (Section 5.1.1, p. 7), and warns that model training data are not public. Inference: these percentages do not estimate Verus proof success or agent reliability.

## technique 4: ablate prompt translations

Use this to identify which translated artifacts actually help generation. The authors compare four prompt variants (Section 6.1, p. 10): original prompt; test-only translation; full translation of doctests and terminology; and no-doctests translation. They then compare pass@1 under the same Codex sampling setup. They find significant differences between full and test-only translation (`p = 0.03`) and between no-doctests and test-only (`p < 0.001`), but not between no-translation and test-only (`p = 0.2`) (Section 6.1, p. 10). Inference: VL should similarly ablate contracts, lemmas, examples, and proof hints, measuring proof pass rate, verifier time, and repair effort while keeping model, temperature, task count, and Verus version fixed.

## what is proved, trusted, and unresolved

The paper proves that its translators and sandbox produce a scalable multilingual benchmark and measures model pass rates; it does not prove that generated code is correct for all inputs. Trusted components include each handwritten compiler, target compiler/runtime, unit-test adequacy, hidden-test selection, timeout policy, and the sampling estimator. The authors report that “a handful of benchmarks cannot be easily translated” (Section 3.4, p. 5), and type mismatches can force exclusions. Inference: for a product receiving agent-written verified Rust, the main threat is specification and translation mismatch: a generated proof may certify the emitted contract while the translated contract no longer expresses the source requirement. Secondary threats are unsupported Rust/Verus features, solver timeouts, and benchmark contamination. MultiPL-E already supplies the reusable benchmark-porting and sandbox pattern; VL should not redo that pattern without adding proof-specific measurements.

## techniques for the catalog

- thin benchmark compiler — translate signature, tests, comments, and types while leaving the function body to generation
- semantic value and type translation — recursively map values, equality, options, and inferred annotations with explicit unsupported cases
- hidden-test sandbox — compile, timeout, execute, validate, and classify generated outputs using hidden tests
- pass@k evaluation — sample 200 completions at declared temperatures and report the estimator's denominator
- prompt ablation — compare test-only, doctest, terminology, and original prompts under fixed model settings

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
