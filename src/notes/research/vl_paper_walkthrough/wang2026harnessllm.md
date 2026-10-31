# HarnessLLM: Rust Verification Harness Generation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wang2026harnessllm`, [paper](http://arxiv.org/abs/2607.22161v1)

## scope and result
HarnessLLM generates Kani bounded-model-checking harnesses for Rust functions that contain unsafe blocks or can panic. It is a harness-generation pipeline, not a deductive proof of arbitrary Rust. The paper says, “HarnessLLM leverages LLMs to automatically generate verification harnesses from existing test suites.” (section 1, page 2). Its goal is to expose memory-safety failures with symbolic inputs while preserving real API invocation scenarios.

## technique: identify targets and extract calling scenarios
Inference: when to use it: Use this front end when a Rust repository has tests but no verification harnesses, especially where generic types and constructors make hand-written nondeterministic inputs expensive.

Paper procedure (sections 3.2–3.3, pages 3–5):
1. Traverse Rust MIR and select in-repository functions containing unsafe blocks or runtime-panic paths; exclude standard-library and third-party functions.
2. Locate tests that call each target. Scan `impl Ty` blocks for public constructors returning `Self`, `Ty`, `Result<Ty>`, or `Option<Ty>`, and collect doctest examples, type definitions, visibility, and trait implementations.
3. For every assert in a test, perform backward use-def analysis, extract the statements needed by that assertion, and place them in a scenario-separated test function.
4. Deduplicate equivalent scenarios by instrumenting function entry points, executing each separated test, and comparing traces.
5. Remove assertions, promote active constants to parameters, and iteratively remove unused parameters. Replay each scenario with the original constants and assertions; retain it only when execution traces match. Flaky tests are run repeatedly and their observed traces are aggregated.

The paper's encode example extracts `encode_with_array_macro` and `encode_with_push_null`, then produces `scen_encode_array(v: Value)`; the prompt explicitly requires: “Perform a backward use-def analysis on each asserted expression and identify all dependent statements.” (Figure 3, page 4). Inference: for a Verus harness, replace trace equivalence with a proof-oriented scenario contract: keep the same constructors and call shape, then specify the safety and functional postconditions in `ensures`. Verus does not provide Kani's `kani::proof` or symbolic execution; this technique therefore remains an inference about organizing test scenarios before writing Verus specs.

## technique: dependency graph and nondeterministic construction
What it is: HarnessLLM builds a graph whose nodes are constructors or type constructors and whose edges point to constructors needed for parameter types. Basic types use Kani primitives. Complex values are built recursively from public constructors, enum variants, public fields, and concrete implementations of trait parameters.

Procedure (section 3.4 and Algorithm 1, pages 5–6):
1. For each scenario parameter, query the type/trait database for implementations and constructor usages.
2. Ask the LLM for a nondeterministic constructor. If it succeeds, wrap it as a graph node; otherwise enumerate public constructors and recurse on their parameter types.
3. Reject cycles, then topologically traverse the graph to emit Markdown instructions with one section per node.
4. Give the LLM concrete Kani examples for integers, enums, and structs. Synthesize `_verifier_nondet_<type>` functions and a `#[kani::proof]` harness invoking the scenario.

The paper's Algorithm 1 calls `db.get_usages`, `db.get_impl_trait`, `llm.gen_nondet_for`, and recursively `GEN_DEP_GRAPH`; it states, “The steps to build parameters of scenario function can be determined by performing a topological traversal of the dependency graph.” (section 3.4, page 6). Inference: for Verus, use ghost/spec values and explicit constructors with `requires` constraints instead of nondeterministic runtime values; use `proof fn` lemmas to relate constructor fields to the scenario invariant. Verus's executable code cannot call proof-only functions at runtime, and arbitrary Kani `any_where` does not carry over.

## technique: compile-feedback refinement with anti-fabrication checks
After synthesis, the pipeline invokes Kani, feeds compiler errors to the LLM, and asks it to edit only the affected sections. A stronger error prompt freezes the scenario function and external-knowledge primitive constructors in three parts and requests only the fixes. An AST checker rejects redefinitions of types already in the repository. The paper warns that a simple prompt is ineffective because the model may alter correct code or fabricate types (section 3.5, pages 6–7).

## evidence and limits
The real-world dataset contains 9 Rust libraries, 294 extracted scenario functions, and 6,651 lines of code (section 5, page 7). HarnessLLM generated 294 valid harnesses, a 100% success rate, with about 1.4 generation attempts per harness; GPT-4.1 averaged 145 seconds and $0.03 per harness (Table 3 and section 5.2, pages 8–9). Autoharness averaged 41% success on the same scenario dataset (Figure 12, page 10). Calling-scenario extraction preserved 94.66% of scenarios across the nine libraries (Table 2, page 8). Kani then exposed six memory-safety issues in `pdf-rs`; five were fixed and one remained open (section 5.2, page 9). The denominators are respectively 294 harnesses, 9 libraries, and the six discovered issues; the result is compilation/harness generation, not proof that all paths are safe.

The paper's example finds an out-of-bounds access in `decode_utf16`: when a two-byte chunk has length less than two, accessing `w[1]` is unsafe; the generated harness uses a bounded maximum length so BMC can explore it (section 5.2, page 9).

## techniques for the catalog
- MIR target discovery — find unsafe or panic-prone in-repository functions before harness generation
- scenario extraction — split assertions with backward use-def analysis, deduplicate traces, and preserve calls by replay
- dependency graph synthesis — recursively build nondeterministic complex values from constructors and trait implementations
- compiler-feedback refinement — compile with Kani, freeze correct sections, and reject fabricated declarations
