# Agentic Separation Logic Specification Synthesis
(authored by agents unless marked 🧑)
Tag: `suresh2026agentic`, [paper](https://arxiv.org/abs/2605.27531)

## problem and result

Spec-Agent synthesizes contracts for large C++ repositories. The paper targets preconditions and postconditions expressive enough for loops, conditional behavior, dynamic allocation, and heap structure. Its central design combines an adaptive choice among four logics with fuzz validation and counterexample-guided refinement. The four target languages are propositional logic (Prop), first-order logic (FOL), propositional separation logic (Prop SL), and first-order separation logic (FOSL).

> “For each function, Spec-Agent uses static analysis and runtime heap tracing to select the appropriate target specification language, generalizes existing functional tests into fuzz harnesses, and iteratively refines LLM-generated candidates via counterexample-guided feedback.” (abstract, PDF p. 1)

Separation logic supplies points-to (`x 7→ n`) and separating conjunction (`⋆`), which asserts disjoint memory footprints. Fuzzing is a pseudo-oracle: it can reject a candidate when an input violates it, but cannot prove that all executions satisfy it. The paper states the limitation directly: “This system constitutes a pseudo-oracle: it can detect when a candidate specification is wrong (via counterexample), but cannot assert correctness, which would require a full C++ program verifier.” (section 3, PDF p. 4)

The evaluation uses BDE (651 public documented functions with unit tests) and BlazingMQ (508). On BDE, the best Spec-Agent configuration, Qwen3-Coder-Next, has 85.87% Test Valid; on BMQ it has 77.73%. These are fractions of the extracted functions in each repository, and Table 1 also reports compilation errors, test-invalid contracts, trivial contracts, and mean logical atoms. Inference: The abstract's “85% of target functions” matches the best BDE result (85.87%) and does not hold for BMQ (best 77.73%) or for every model; the introduction says “up to 85%”.

## technique 1: mine static and dynamic features

For each function, recover source, documentation comments, and existing unit tests. Parse the function with Tree-sitter to compute static features: loops, conditionals, and induction-variable use. Run its existing tests under heap tracing and inspect the heap profile to determine whether it accesses the heap (section 3, PDF p. 4).

Use the features to select a target logic: loops require FOL to quantify over collections; dynamic allocation selects separation logic; both select FOSL. The paper describes the rule as follows:

> “Whenever f contains a loop, first-order logic is required to model predicates over entire collections (e.g., elements of a list or container). Separation logic is selected when f uses dynamic memory allocation.” (section 3, PDF p. 5)

Inference: For Verus, this is a front-end triage pass. A code-mining tool can classify functions before asking an LLM for a Verus contract: loop summaries suggest quantified sequence or set predicates, while heap or pointer APIs suggest ownership and memory-shape lemmas. This is an inference because the paper does not use Rust or Verus and its four grammar levels are not Verus syntax.

## technique 2: generate a candidate at the selected expressivity

Prompt the LLM with the function source, project documentation, the selected logic's formal grammar, specific instructions, and up to ten manually written correct examples. Unit tests are withheld from generation and reserved for validation. The output is a candidate pair `⟨P,Q⟩` of precondition and postcondition (section 3, PDF p. 5).

The logical lattice is `Prop ⊑ FOL`, `Prop ⊑ Prop SL`, `FOL ⊑ FOSL`, and `Prop SL ⊑ FOSL`; FOSL is the top. A candidate is structurally acceptable when its operators reach at least the selected target level. A candidate below the target, such as one omitting points-to atoms for a heap-touching function targeted at FOSL, is rejected with a structural diagnostic for the next attempt.

Inference: In Verus, ask for `requires` and `ensures` clauses plus any needed `spec fn`, `predicate`, loop `invariant`, and proof lemmas. The paper's “at least target expressivity” check maps to a syntactic review that rejects a contract lacking the ownership or quantified facts needed by the function. Verus's exact grammar and proof obligations differ, so the lattice is a design analogy, not a Verus feature.

## technique 3: generalize unit tests into fuzz harnesses

For each function, prompt a coding agent with its signature, source, and existing tests. The agent extracts shared fixture and setup logic, replaces hard-coded inputs with fuzzer-controlled parameters, and emits a harness that invokes the function on generated inputs. This preserves realistic initialization while broadening the input distribution (section 3, PDF p. 4).

Parse the candidate against the selected grammar and compile it into executable assertions. Boolean, arithmetic, and implication operators map to C++ operations. Bounded quantifiers become bounded loops over `[a,b)` using LLM-supplied bounds such as `0` to `v.size()` or iterator begin/end. At runtime, points-to atoms inspect observed heap cells; `⋆` records each side's footprint and checks disjointness; separating quantifiers extend this check over an index range (section 3, PDF p. 5).

Run the harness with libFuzzer. If any generated input violates the assertion, reject the candidate and feed the input and violated assertion to the next LLM attempt. Acceptance requires both no fuzz counterexample and a candidate at least as expressive as the selected target.

Inference: In Verus, fuzzing can generate concrete Rust tests around a verified or candidate contract, but it is evidence for finding mistakes rather than a proof. A Verus-compatible workflow would retain the fuzz harness for counterexamples, then require a `requires`/`ensures` proof with loop invariants and ownership facts. Fuzzer-observed disjointness cannot replace a Verus proof of the corresponding memory predicate.

## technique 4: counterexample-guided refinement and stopping

Repeat one LLM call, assertion instrumentation, fuzzing, and structural checking. Each attempt includes the candidate and any prior counterexample. Stop when the candidate is fuzz-valid and reaches the target logic, or when the retry budget is exhausted. On BDE with Qwen3.5-35B-A3B, the paper says the curves “grow rapidly through the first five attempts, continue to climb with diminishing returns, and effectively plateau by 20 attempts” (section 4, PDF p. 7).

This loop distinguishes a valid contract from a strongest contract. A strongest contract characterizes all expected and error-path behavior; some accepted contracts describe only a subset of behavior and still pass the available tests and fuzzing. The paper says: “To our knowledge, no existing algorithm can decide whether a given specification for a function is the strongest possible one.” (section 6, PDF p. 9).

## evidence, denominators, and limitations

Table 1's denominators are the 651 BDE functions and 508 BMQ functions extracted as public, documented, and unit-tested. For example, BDE Qwen3-Coder-Next is 85.87% Test Valid, 0.00% Test Invalid, 14.13% Compilation Error, 5.84% Trivial among valid contracts, and 3.35 mean atoms. BMQ for the same model is 77.73%, 0.00%, 22.27%, 16.94%, and 4.15 respectively. Table 3 covers candidates that reached the fuzzing stage, which the paper says had already passed the project's unit tests under assertion instrumentation: BDE has 98.3% Passed, 0.4% Violated, and 1.2% Timeout; BMQ has 92.0%, 8.0%, and 0.0%. The denominator is therefore these unit-test survivors, not all extracted functions (the paper does not say which model Table 3 uses).

The two experts reviewed every generated fuzz harness and a random sample of 100 synthesized specifications per repository, and agreed (section 4, PDF p. 6). The paper reports “cumulative per-function means of 170 seconds for inference and 400 seconds for testing”; Figure 7 shows these for accepted BDE functions with Qwen3.5-35B-A3B (section 4, PDF p. 8). The system ran on one Intel Xeon Silver 4410Y and four NVIDIA H100 GPUs, using greedy decoding with a maximum of 400 tokens per refinement attempt (section 4, PDF p. 6).

The paper states that Spec-Agent “does not employ full C++ verification using a logic prover”, that LLMs “are not always capable of generating the strongest possible specification”, so “some inferred contracts may represent only a subset of all possible program behaviors”, and that the selector is heuristic (sections 3 and 6, PDF pp. 5, 9). The evaluation covers two repositories, BDE and BlazingMQ.

Inference: fuzzing does not cover all inputs, generated harnesses can omit behaviors, and the study's two repositories are a narrow sample. Separation-logic runtime checks observe the instrumented heap rather than establish a theorem about every possible heap.

## techniques for the catalog

- feature-directed logic selection: mine loops, conditionals, induction variables, and heap access, then choose propositional, first-order, separation, or combined specification language
- structured contract generation: prompt an LLM with grammar, documentation, source, and correct examples to emit preconditions and postconditions
- test-to-fuzz harness lifting: replace fixed test inputs with fuzzer parameters while preserving project fixtures and setup
- runtime separation-logic checking: interpret points-to and separating-conjunction atoms over observed heap state and reject violations
- counterexample-guided refinement: feed each violating input and assertion back into the next generation attempt until valid or the retry budget ends
- expressivity-lattice acceptance: require a candidate to use at least the logic level selected from static and dynamic features
