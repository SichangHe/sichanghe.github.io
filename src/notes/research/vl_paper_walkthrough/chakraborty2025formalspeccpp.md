# FormalSpecCpp: A Dataset of C++ Formal Specifications created using LLMs
(authored by agents unless marked 🧑)
Tag: `chakraborty2025formalspeccpp`, [paper](https://arxiv.org/abs/2502.15217)

## scope and claim

FormalSpecCpp is a dataset and translation workflow for C++ programs with preconditions, postconditions, and tests. The authors call it “a dataset designed to fill the gap in standardized benchmarks for verifying formal specifications in C++ programs” (abstract, PDF p. 1). They translate verified Dafny-synthesis programs instead of inferring C++ specifications directly: “Instead of inferring formal specifications directly for C++ using LLMs, we used LLMs for a structured translation process from Dafny to C++” (section III.A, PDF p. 2).

Inference: this provides a benchmark-construction method, but the reported testing and partial manual review do not establish semantic equivalence between every C++ translation and its Dafny source.

## technique: verified-source translation

The paper's workflow is:

1. Select Dafny-synthesis programs with both preconditions and postconditions, totaling 105 programs (section III.A, PDF pp. 2–3)
2. Use GPT-4-turbo for translation (introduction, PDF p. 1; section II.B, PDF p. 2). Figure 2 supplies the Dafny-to-C++ translation prompt (PDF p. 3)
3. Ask the model to translate the program and assertions, identify conditions under which C++ may fail, and select signed or unsigned integer types according to possible negative values and constraints from preconditions or invariants (Figure 2, PDF p. 3)
4. Map preconditions to `REQUIRE`, loop invariants to `assert`, and postconditions to `ENSURE`; require the definitions `#define REQUIRE(cond) assert(cond)` and `#define ENSURE(cond) assert(cond)`. Output only the final code without a main function (Figure 2 and section III.A, PDF p. 3)
5. Generate associated tests, execute them, and manually review and refine a subset of programs and tests (sections III.B–D, PDF p. 3)

The authors' rationale is: “Since Dafny programs in the benchmark are already verified, translating their specifications directly to C++ ensures that formal and logical correctness is maintained rather than relying on speculative inference by the LLM” (section III.A, PDF p. 2). They also note a translation problem: “Dafny supports an unbounded integer type, which can represent any integer value without overflow, whereas C++ offers multiple fixed-size integer types” (section VI.A, PDF p. 4).

Inference: for Verus, translating verified Dafny or Lean programs into Rust plus Verus contracts could seed a dataset. Use `requires` and `ensures` for contracts and verify each function in Verus. Source verification does not establish correctness after changes in language semantics, ownership, integer ranges, or panic behavior.

## technique: prompt constraints for type and assertion mapping

The paper identifies three prompt goals: “Specification Preservation,” “Type Safety,” and “Assertion Mapping” (section II.C, PDF p. 2). Section VI.B describes refinement after early assertion and syntax errors: “The iterative process focused on explicitly specifying rules around types, preconditions, invariants, and postconditions, ensuring consistency and correctness across the translations” (PDF p. 4). Figure 2 supplies the concrete integer-type and assertion-mapping rules above (PDF p. 3).

Inference: a Verus prompt could map every source contract clause to Verus syntax and identify integer-width changes. Verus verification should be accompanied by a review of whether the translated contract retains the intended behavior.

## technique: direct test translation and execution feedback

1. Translate original MBPP tests directly into C++: “we used LLM to directly convert the original MBPP test cases into C++, translating test input, expected output, and assertions while maintaining functional equivalence” (section III.B, PDF p. 3)
2. Execute the generated programs and tests. Reported failures include inconsistent contracts, incomplete or ill-formed tests, expected/actual output mismatches, assertion errors, linker errors, and compilation errors (section III.C, PDF p. 3)
3. Inspect and repair a subset manually, including successful programs. The authors describe “Correcting errors detected by automated tests,” “Inspecting a subset of successful programs,” and “Refining specifications and tests to better capture intended function behavior” (section III.D, PDF p. 3)

The testing result is: “In our initial run, 62 programs passed all tests, while 43 failed due to assertion errors, linker errors, and compilation errors” (section III.C, PDF p. 3). The limitation is explicit: “Some programs were compiled successfully but contained incorrect specifications or logical inconsistencies that required manual review” (section III.C, PDF p. 3).

Section IV separately reports “all converted programs successfully compiling on the first attempt, achieving a 100% success rate” (PDF p. 4), and Table I lists 105 programs. The paper does not explain how this first-attempt compilation result relates to the initial run's compilation errors. It does not say that the 105/105 result followed refinement or give a final all-tests-passing count.

## evidence, cost, and trust boundary

The dataset has 105 programs with both preconditions and postconditions (section III.A, PDF p. 3). Section IV reports program conversion cost of $2.07, averaging $0.02 per file, and approximately 27 minutes. Test generation cost an additional $1.31 and took around 15 minutes (PDF p. 4). The reported code sizes are: “Dafny files averaged 17.3 lines of code, while the converted C++ code showed a 91.2% increase in size, with an average of 33.1 lines per file” (section IV, PDF p. 4). Table I reports 105 processed files and 105 first-attempt compilations (100%) (PDF p. 4).

Manual checking was partial: one author “manually reviewed and refined a subset of translated programs and test cases” (section III.D, PDF p. 3). The paper does not give that subset's size or a formal proof of source-to-target semantic equivalence.

Inference: the reliability of the resulting corpus depends on source specifications, LLM translations, compiler and assertion behavior, test expected values, and manual review. Neither compilation nor passing tests establishes that every translated contract retains its source meaning.

## techniques for the catalog

- verified-source seeding — build a target-language specification dataset by translating already verified source programs
- contract-preserving prompt — specify preservation, type mapping, and assertion mapping goals
- contract macro normalization — represent C++ preconditions and postconditions with uniform assertion macros
- test translation — translate source test inputs, expected outputs, and assertions into the target language
- execution feedback and repair — use failures to identify problems in translations and tests for manual correction
- manual semantic review — inspect a subset of successful programs for logically incorrect specifications
