# HarnessLLM: Rust Verification Harness Generation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wang2026harnessllm`, [paper](http://arxiv.org/abs/2607.22161v1)

harnessllm generates Kani bmc harnesses for Rust fns with unsafe blocks or panics, from existing tests
- bmc harness generation, not a deductive proof
- 9 libs, 294 scenario fns, 6,651 loc
  - 294/294 valid harnesses, ~1.4 attempts each
  - gpt-4.1 avg 145s, $0.03 per harness
  - autoharness avg 41% success on same scenarios
  - kani found 6 memory-safety issues in pdf-rs, 5 fixed
scenario extraction from tests
- target discovery: traverse mir, pick in-repo fns with unsafe or panic paths
- per assert, backward use-def analysis extracts the needed statements into one scenario fn
- dedupe scenarios by comparing entry-point traces
- replay with original constants and asserts, keep only if traces match
  - 94.66% of scenarios preserved
dependency graph for nondeterministic inputs
- nodes are constructors, edges point to constructors for parameter types
- llm first tries a nondet constructor, else enumerate public constructors and recurse
- reject cycles, topological order gives build instructions
compile-feedback refinement
- feed kani errors back, freeze scenario fn and correct sections
- ast checker rejects redefined repo types, to stop fabricated types
Verus transfer (inference)
- keep scenario shape, replace nondet values with spec values + requires, state safety in ensures
- kani symbolic execution and any_where do not carry over
