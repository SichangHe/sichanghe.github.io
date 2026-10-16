# FormalSpecCpp: A Dataset of C++ Formal Specifications created using LLMs
(authored by agents unless marked 🧑)
Tag: `chakraborty2025formalspeccpp`, [paper](https://arxiv.org/abs/2502.15217)

## scope and claim

FormalSpecCpp is a dataset and translation workflow for C++ programs with preconditions, postconditions, and tests. The authors state that it is “a dataset designed to fill the gap in standardized benchmarks for verifying formal specifications in C++ programs” (abstract, PDF p. 1). It starts from verified Dafny-synthesis programs rather than asking an LLM to invent specifications. The result is useful for evaluating specification inference and translation, but it does not prove that generated C++ contracts preserve Dafny semantics.

## technique: verified-source translation

Use this when a target language lacks a mature specification corpus and a verified source language is available.

1. Select source programs from Dafny-synthesis that already have preconditions and postconditions (section III.A, PDF p. 3)
2. Give an LLM a structured prompt containing the Dafny program, contracts, type rules, and required C++ format (section III.A, PDF pp. 3–4)
3. Translate Dafny types to C++ types, formal properties to target assertions, and executable code while preserving intended behavior (section II.C, PDF p. 3)
4. Represent contracts consistently in C++ with `#define REQUIRE(cond) assert(cond)` and `#define ENSURE(cond) assert(cond)` (section III.A, PDF p. 4)
5. Compile and test every generated translation, then manually inspect a subset and repair semantic errors (sections III.C–D, PDF pp. 4–5)

The rationale is explicit: “Since Dafny programs in the benchmark are already verified, translating their specifications directly to C++ ensures that formal and logical correctness is maintained rather than relying on speculative inference by the LLM” (section III.A, PDF p. 3). This is a useful benchmark-design technique, but translation can change semantics. Dafny integers are unbounded, while C++ has fixed-size types and signed/unsigned behavior (section VI.A, PDF p. 6).

Inference: for Verus, translate from a verified Dafny or Lean source into Rust plus Verus contracts only as a dataset-generation aid. Replace macro assertions with `requires` and `ensures`, use `assert` for local facts, and verify each function in Verus. Source verification does not carry across language semantics, ownership, overflow, or panic behavior; those require new proofs.

## technique: prompt constraints for type and assertion mapping

The paper identifies three prompt goals: “Specification Preservation,” “Type Safety,” and “Assertion Mapping” (section II.C, PDF p. 3). Apply them by making the prompt specify (a) which pre/postcondition expressions must remain logically equivalent, (b) the target type for every source type, and (c) the target construct for every source assertion. The authors report that prompt refinement explicitly addressed types, preconditions, invariants, postconditions, and correct C++ constructs after early syntax and misalignment errors (section VI.B, PDF p. 6).

Inference: a Verus prompt should require a contract table mapping each source `requires`/`ensures` clause to Verus syntax, identify integer-width changes, and forbid unsupported constructs. The model's output remains untrusted until Verus verifies it and a reviewer checks that the contract states intended behavior rather than an easier property.

## technique: direct test translation and execution feedback

Use source tests to detect translation defects and contract mismatches.

1. Translate original MBPP tests directly, preserving input, expected output, and assertions (section III.B, PDF p. 4)
2. Compile and execute all translated programs and tests (section III.C, PDF p. 4)
3. Classify failures: inconsistent contracts, incomplete tests, expected/actual output mismatches, linker errors, or compilation errors (section III.C, PDF p. 4)
4. Feed failures into contract, code, and test repairs, then rerun the suite (section III.D, PDF p. 5)

Automated tests found structural defects but missed semantically wrong specifications: “Some programs compiled successfully but contained incorrect specifications or logical inconsistencies that required manual review” (section III.C, PDF p. 5). In the initial run, 62 programs passed all tests and 43 failed; after refinement, all 105 converted programs compiled on the first attempt (sections III.C and IV, PDF pp. 4–5). The 62/43 split is the initial test run, whereas 105/105 is first-attempt compilation after the workflow; they are different denominators and must not be conflated.

Inference: in VL, run Verus verification in addition to concrete tests. A passing test is evidence about those inputs only; a passing Verus proof is evidence conditional on the contract. Add adversarial tests for overflow, aliasing, panic, and boundary inputs because this dataset does not cover Rust-specific failure modes.

## evidence, cost, and trust boundary

The dataset contains 105 programs with both preconditions and postconditions (section III.A, PDF p. 4). The pipeline used GPT-4-turbo (introduction, PDF p. 1; section II.B, PDF p. 3). Conversion of programs cost $2.07, averaged $0.02 per file, and took about 27 minutes; test generation cost $1.31 and took about 15 minutes (section IV, PDF p. 5). Dafny files averaged 17.3 lines and converted C++ averaged 33.1 lines, a reported 91.2% increase (section IV, PDF p. 5). Table I reports 105 total files and 105 successfully compiled programs on the first attempt (100%) (PDF p. 5). The paper gives no denominator for the manually reviewed subset and no formal semantic-equivalence proof.

The trusted components are the original Dafny specifications, the LLM translation, C++ compiler and assertion macros, test-oracle expected values, and manual review. Tests exposed assertion and output failures, but manual review was needed for misaligned assertions and faulty preconditions (section III.D, PDF p. 5). What remains unproved is that every C++ contract means the same thing as its Dafny source or that tests cover all behaviors.

Inference: threat to VeruLaw is moderate. The dataset and workflow provide a useful source-to-target contract corpus and a concrete validation loop, but the 105-program scale and C++ compilation evidence do not establish verified Rust correctness. VL should reuse verified-source seeding, explicit type/assertion mapping, compile-test feedback, and manual contract review. It should not redo the idea as if direct LLM specification inference were equivalent to translation; the paper deliberately avoids that problem.

## techniques for the catalog

- verified-source seeding — build a target-language specification dataset by translating already verified source programs
- contract-preserving prompt — require explicit preservation, type mapping, and assertion mapping rules
- contract macro normalization — represent target preconditions and postconditions in a uniform format before verification
- test translation — carry source inputs, expected outputs, and assertions into the target language
- compile-and-test feedback — classify generated failures and iterate on code, contracts, and tests
- manual semantic review — inspect successful compilations because tests cannot detect every logically wrong specification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
