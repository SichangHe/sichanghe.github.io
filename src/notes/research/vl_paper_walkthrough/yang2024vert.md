# VERT: Verified Equivalent Rust Transpilation with Large Language Models as Few-Shot Learners
(authored by agents unless marked 🧑)
Tag: `yang2024vert`, [paper](http://arxiv.org/abs/2404.18852v2)

VERT combines an LLM's readable Rust with a rule-based reference generated through WebAssembly. The paper's abstract says: “VERT first uses the Web Assembly compiler to obtain an oracle Rust program. In parallel, VERT uses an LLM to generate a readable candidate Rust program. This candidate is verified against the oracle, and if verification fails, we regenerate a new candidate transpilation until verification succeeds.” (abstract, p. 1)

## technique 1: compile-then-lift oracle

Use this when the source language has a WebAssembly compiler and the desired output is readable Rust. Clean the source into functions; compile it to Wasm; translate Wasm to Rust with rWasm; retain this generated program as an oracle. The oracle need not be readable, because its role is a reference implementation (Sections 3 and 3.2, pp. 6–7). In parallel prompt an LLM for safe Rust using the original function name, argument and return types, and no external dependencies.

The oracle is not trusted because the paper later checks candidate-vs-oracle behavior, but equivalence to the source depends on the source compiler and rWasm translation. The paper explicitly assumes “the language of the source program has a Web Assembly compiler” (Section 1, p. 3). Inference: in Verus, keep the oracle in a verification harness and express a relation between oracle output and candidate output with `ensures`; do not use `external_body` to bypass the oracle call. Verus can prove a candidate's functional relation, but it cannot automatically establish that an arbitrary Wasm compiler preserved source semantics.

## technique 2: compiler-guided repair

After LLM generation, compile with `rustc`. Classify each error as syntax, typing, or domain-specific; apply a hand-written repair where the diagnostic determines a local edit, otherwise include the compiler message in a new LLM prompt (Section 3.1, pp. 6–7). Repeat until compilation succeeds or the retry budget ends. This separates type-checking failures from semantic equivalence failures.

Inference: a VL workflow can parse Verus and Rust diagnostics, preserve the original `requires` and `ensures`, and ask for a body repair. A compiling candidate is only a syntactic milestone; no proof claim follows until Verus checks its contracts.

## technique 3: staged equivalence checking

Generate a harness that feeds identical inputs to candidate and oracle and asserts equal outputs with no crash. VERT runs three increasingly strong checks (Section 3.4–3.5, pp. 9–11). First, Bolero property-based testing generates random inputs for 120 seconds; a counterexample fails the candidate. Second, Kani bounded model checking exhaustively explores paths up to loop bound k for 120 seconds; timeout or divergence fails, and passing does not prove that k is exhaustive. Third, Kani increases the bound with unwind checks until all loops are fully unwound; only success at this stage establishes equivalence for the harness's input model.

The paper's harness uses an oracle wrapper and an assertion that the two return values match (Figure 9, p. 10). For primitive types the approach is sound and complete; vectors and other unbounded types are generated only up to sizes observed in the sample, so larger-input divergences can be missed (Section 3.5, p. 11). It also permits valid-range assumptions for unsigned integers and ASCII strings to reconcile Wasm and source-language semantics (Section 3.4, p. 10).

Inference: in Verus, use a `spec fn` equivalence relation and a `proof fn` or executable wrapper with `requires` for the input domain and `ensures` for equal results. Replace Kani's finite unwinding with loop `invariant`s and arithmetic lemmas. A bounded test remains testing evidence; it is not a universal proof. Keep assumptions explicit in contracts.

## technique 4: counterexample few-shot repair

When verification fails, add the concrete failing inputs to the next LLM prompt. The template asks for safe Rust, unchanged signatures, standalone compilation, and: “Test that outputs from inputs { counter_examples } are equivalent to source program.” (Figure 10, p. 12). VERT retries up to 20 times in few-shot modes, applying compiler repair before each check (Section 4.2, p. 15). This turns a failed proof or test into a targeted example rather than asking the model to regenerate blindly.

Inference: for Verus, pass the failing assertion context and concrete model values to an agent, but require it to preserve the contract and add a justified lemma or loop `invariant`. A counterexample can reveal a missing precondition or an incorrect specification; it cannot justify weakening `ensures`.

## evidence and limits

The main benchmark contains 569 C++, 520 C, and 341 Go programs (Section 4.1.3, p. 14), run on Ubuntu 22 with 32 Xeon 2.30 GHz processors, 240 GB RAM, and four Tesla V100 GPUs (Section 4.1.5, p. 15). Claude-2 with counterexample repair passes bounded verification for 233/569 C++, 193/520 C, and 159/341 Go programs, and full verification for 19/569, 15/520, and 9/341 respectively (Table 1, p. 16). The abstract's 42% bounded and 54% PBT figures refer to the aggregate reported setting, while Table 1 gives the per-language denominators. The 14-program pointer benchmark yields PBT success for 7/14 and bounded-verification success for 2/14 (Table 3, p. 19). Manual Verus checking succeeds for 3/5 Kani-timeout cases; `brotli_parse_int` needs 92 specification lines for 15 code lines, while `buffer_new` needs 1 line for 16 code lines (Table 4, p. 20).

The paper measures candidate equivalence to the generated oracle, not source-to-Rust correctness independent of the compiler, rWasm, harness assumptions, or verifier soundness. It reports that full verification averages 67 seconds, bounded verification 52 seconds, and PBT 25 seconds per non-timeout program (Table 2, p. 17). Inference: threat to agent-written verified Rust is high at the generation layer but limited at the checking boundary. VERT already demonstrates oracle comparison, staged checking, compiler repair, and counterexample prompting; VL should not repeat those as generic ideas. The open product problem is specification and oracle trust, plus scalable Verus contracts for loops and ownership-heavy code.

## techniques for the catalog

- compile-then-lift oracle — compile source to Wasm and lift it to a reference Rust implementation
- diagnostic-guided repair — classify compiler errors and regenerate or patch until Rust compiles
- staged equivalence checking — run property tests, bounded model checking, then exhaustive unwinding
- counterexample few-shot repair — feed failed inputs back into later LLM prompts

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
