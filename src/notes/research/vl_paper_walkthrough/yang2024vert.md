# VERT: Verified Equivalent Rust Transpilation with Large Language Models as Few-Shot Learners
(authored by agents unless marked 🧑)
Tag: `yang2024vert`, [paper](https://arxiv.org/abs/2404.18852v2)

VERT combines LLM-generated Rust with a reference generated through WebAssembly. The abstract states: “VERT first uses the Web Assembly compiler to obtain an oracle Rust program. In parallel, VERT uses an LLM to generate a readable candidate Rust program. This candidate is verified against the oracle, and if verification fails, we regenerate a new candidate transpilation until verification succeeds.” (p. 1)

## technique 1: compile-then-lift oracle

Clean the source into functions, compile it to Wasm, and translate Wasm to Rust with rWasm. The oracle need not be readable. The paper calls this “an alternate trusted transpilation pipeline for generating a reference Rust program against which the LLM output is checked” (Section 3.2, p. 6; continued on pp. 8–9). The source-language prerequisite is that “the language of the source program has a Web Assembly compiler” (Section 1, p. 3). In parallel, prompt the LLM for safe Rust. The template requests: “Use the same function name , same argument and return types .” and “Make sure the output program can compile on its own .” (Figure 10, p. 12)

To locate inputs and outputs inside rWasm's assembly-like code, start from a source-language call with constant inputs and an expected output. Mutate those constants, re-transpile, and compare the rWasm outputs: “Taking the diff, we can identify inputs and outputs by what changed.” (Section 3.3, p. 9). The user may instead identify the entry point manually. Replace the identified constants with global reads to inject harness inputs and the candidate's output as the expected baseline. The paper notes: “while this injection requires unsafe code, it is fine as this is only done in the oracle and the oracle is discarded once the equivalence is checked.” (Section 3.4, p. 10)

Inference: candidate-to-oracle equivalence depends on the oracle preserving the source semantics. A Verus adaptation would need a trusted reference or a separately justified specification; proving a candidate's relation to a reference does not itself prove the compiler correct.

## technique 2: compiler-guided repair

Compile the candidate with `rustc` and classify errors: “For each error, we first classify the error into one of three main categories: syntax, typing, and domain specific.” (Section 3.1, p. 6). Apply local repairs using diagnostic locations, delimiters, and suggestions. When these cannot resolve the errors, regenerate using the compiler error in the prompt: “we only regenerate an LLM output after exhausting all rustc helper messages.” (Section 3.1, p. 6)

Inference: a Verus workflow could similarly use compiler and verifier diagnostics to repair a body while preserving its contracts. Compilation alone does not establish functional equivalence.

## technique 3: staged equivalence checking

The paper defines equivalence as follows: “for all inputs, running both functions yields no crashes and identical outputs.” (Section 3.4, p. 9). Figure 9 (p. 11) feeds the candidate's output into the oracle's expected-output location and asserts that the oracle's comparison returns zero. VERT runs three checks in order (Section 3.5, pp. 10–11):

- Property-based testing (PBT) through bolero generates random inputs. “If no counterexample is found within the time limit, we say this candidate passes PBT.” (p. 10)
- Kani bounded verification uses loop bound k with unwind checks disabled. “Bounded verification does not check whether 𝑘 is exhaustive.” (p. 10). A counterexample or timeout fails this check
- Full verification increases the bound with all checks enabled, including unwind checks. “This ensures the equivalence and safety properties holds for every input the harness generates.” (p. 10). A counterexample or timeout fails this check

Each metric has a 120-second limit. For PBT, success means no counterexample within that limit; bounded and full verification must establish equivalence within it (Section 4.1.4, pp. 14–15): “For Bounded and Full verification, success requires establishing verified equivalence within 120 seconds.”

The input model limits the guarantee. For primitive types and types composed solely of primitives, the paper claims soundness and completeness. For unbounded types, “VERT synthesizes harnesses that generate inputs up to the size encountered in the sample function call.” It warns: “As a limitation, any divergences that require bigger vector than encountered will be missed.” (Section 3.5, p. 11). Section 3.4 (p. 10) also permits unsigned-integer range assumptions and says: “We assume the string’s range to valid ASCII only.”

Inference: a Verus adaptation could express the allowed input domain in `requires`, output equivalence in `ensures`, and loop reasoning in `invariant`s. Its proof would still depend on those contracts and the reference specification.

## technique 4: counterexample few-shot repair

Feed failing inputs into subsequent prompts. The paper explains: “Specifically, we ask the LLM to consider the specific inputs that caused a test or verification failure from the previous iterations.” (Section 3.6, p. 12). The prompt includes: “Test that outputs from inputs { counter_examples } are equivalent to source program .” (Figure 10, p. 12). The evaluation distinguishes single-shot, few-shot repair, and few-shot repair with counterexamples; the last mode requires instruction-tuned models. “We re-prompt the LLM up to 20 times for few-shot modes.” (Section 4.2, p. 15)

Inference: concrete counterexamples can guide a Verus repair when available. A timeout alone supplies no failing input, and a failed check does not justify weakening the intended contract.

## evidence and limits

Table 1 (p. 16) uses denominators of 569 C++, 520 C, and 341 Go programs. For Claude-2 with few-shot repair and counterexamples, its bounded-verification counts are 233, 193, and 159; full-verification counts are 19, 15, and 9, respectively. The prose confirms: “For passing full verification, VERT with Claude-2 can transpile 19 C++ programs, 15 C programs, and 9 Go programs.” (Section 4.2, p. 15)

The paper's totals conflict. Section 4.1.3 (p. 14) states: “In total, we evaluate our approach on 569 C++ programs, 520 C programs, and 341 Go programs.” These sum to 1,430. The abstract instead reports “a suite of 1,394 programs” (p. 1), and the contributions list gives “569 C++ programs, 520 C programs, and 305 Go programs” (p. 4). Inference: the abstract's reported 42% bounded-verification and 54% PBT results should therefore not be presented as aggregates derived from Table 1 without clarification.

For the pointer benchmarks, the paper reports: “VERT can produce transpilations for 7 of the 14 C programs that pass PBT, and 2 of those can pass bounded verification.” (Section 4.2, p. 18; Table 3, p. 19). Manual Verus checking addresses five Kani timeout cases: “We succeed in verifying equivalence for 3 of the 5 failed benchmarks while we fail to verify AVL benchmarks due to Verus’s limitations on returning mutable pointers.” (p. 20). Table 4 (p. 20) reports 92 specification lines for 15 code lines for `brotli_parse_int`, and 1 specification line for 16 code lines for `buffer_new`. The authors caution: “We note that full specification, while possible, is not compatible with the automatic nature of the tool.” (p. 20)

Table 2 (p. 17) gives average component times of 25 seconds for PBT, 52 for bounded verification, and 67 for full verification. The surrounding text qualifies the full-verification average as applying to “non-timeout failure cases”; the table does not label all three averages as per non-timeout program. Section 6 (p. 23) acknowledges “potential training data contamination” and cautions that “real-world code bases are often much more complicated than competitive solution programs.” It states: “Full verification provides exhaustive guarantees but few programs actually reach that stage due to performance limitations of Kani.” (Section 6, p. 23). The harness-size restriction above still applies.

Inference: the transferable techniques are oracle comparison, compiler-guided repair, staged checking, and counterexample prompting. Applying them to Verus still requires justified specifications and scalable proofs for loops and pointer-manipulating code.

## techniques for the catalog

- compile-then-lift oracle — compile source to Wasm, lift it to Rust, and identify harness inputs and outputs through constant mutation
- diagnostic-guided repair — apply compiler suggestions, then regenerate using unresolved errors
- staged equivalence checking — run property tests, bounded model checking, then verification with exhaustive unwinding within the harness's input model
- counterexample few-shot repair — feed failed inputs into later LLM prompts
