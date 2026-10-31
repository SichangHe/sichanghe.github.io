# Beyond Postconditions: Can Large Language Models infer Formal Contracts for Automatic Software Verification?
(authored by agents unless marked 🧑)
Tag: `richter2025postconditions`, [paper](https://arxiv.org/abs/2510.12702v1)

## paper and purpose

Richter and Wehrheim introduce NL2Contract: ask an LLM to translate the natural-language intent already present in code into a functional contract containing both input preconditions and output postconditions. The motivating failure is postcondition-only inference: a postcondition may pass the benchmark tests yet permit invalid inputs, so a verifier reports a counterexample that is a false alarm. Their central claim is empirical: on HumanEval+ and Python-by-Contract, generated contracts are often verification-sound, discriminate many mutants, and produce fewer false alarms than `nl2postcond` postconditions. The paper states the goal directly: “Can LLMs translate informal constraints into function contracts useful for software verification?” (Introduction, p. 3).

## technique 1: infer a contract rather than a postcondition

What it is. NL2Contract maps a natural-language description `φ_nl` to a set of `(Pre, Post)` contracts. The LLM sees only function signature, docstring, imports and available surrounding context; it does not see the reference implementation or reference precondition. Preconditions encode assumptions such as type, range, and domain restrictions, while postconditions encode returned-value relations. The paper's example requires `n > 1` and “not a prime number” for largest-prime-factor code. A postcondition-only baseline omitted those assumptions and produced a false alarm at `n = 1`.

When to use it. Use this when implementation intent exists as comments/docstrings but no machine-checkable contract exists, and a verifier must report defects only on intended inputs. It is especially useful when invalid-input behavior is undefined, because the precondition prevents those states from becoming bug reports.

How to do it. (1) Extract the function signature and natural-language documentation. (2) Add imports and definitions needed by names in the docstring. (3) Prompt the model to write a contract function with typed parameters, a precondition block, a call to the function, and postcondition assertions. (4) Generate multiple samples at temperature 0.7. (5) Verify each generated contract on the reference implementation and retain only sound samples. The prescribed prompt says: “Specify preconditions in a try-catch block and postconditions as assert statements.”

Python form. The generated shape is:

```python
def f_contract(typed_args):
    try:
        assert PRECONDITION
    except AssertionError as e:
        raise ValueError(f"Precondition failed: {e}") from e
    result = f(args)
    assert POSTCONDITION(args, result)
    return result
```

Verus form (inference). Use a Rust function with `requires` for `Pre` and `ensures` for `Post`; keep the implementation call and return value unchanged. A precondition should state valid domains (`requires n > 1 && !is_prime(n)`), and an `ensures` clause should relate old inputs and the returned value. The Python exception wrapper does not carry over: invalid inputs are excluded by `requires`, while a failed postcondition is a verifier proof failure. Types become Rust types and explicit predicates; dynamic Python calls and reflection need replacement with compilable Rust.

Evidence and limits. On HumanEval+, NL2Contract `sound@1` ranges from 66.7% (CodeQwen 2.5) to 81.1% (GPT-5), versus 11.5–13.4% for `nl2postcond`; at `sound@10`, NL2Contract reaches 90.0–93.9%. Yet 10.4–12.4% of NL2Contract samples still violate the reference precondition. These are generated-specification rates, not proof guarantees for arbitrary software. The benchmark is small Python code, and the authors warn that “the benchmarks focus on simple Python programs which often do not have dependencies beyond the scope of a single file.”

## technique 2: verification-guided soundness checking

What it is. The paper checks both soundness conditions in one verifier call. For each inferred `(Pre, Post)`, it constructs `Post* (σ, σ') = Pre_gt(σ) ∧ Post(σ, σ')` and asks the verifier to check the reference implementation against `(Pre, Post*)`. If the verifier returns success, then inferred `Pre` implies the true valid-input predicate and the reference output satisfies `Post`.

How to do it. (1) Keep the inferred precondition as the contract precondition. (2) Conjoin the benchmark's trusted `Pre_gt` to the postcondition for validation only. (3) Run a sound verifier on the reference implementation. (4) Accept the sample as verification-sound only if the verifier proves it or finds no violation under the timeout policy. Their CrossHair policy declares a sample unsound if a violation is found within 60 seconds and sound otherwise; CrossHair can return unknown, so “sound” here is operational and timeout-bounded.

Verus form (inference). Encode the reference function with only the inferred `requires Pre`, and put `Pre_gt(args) && Post(args, result)` in `ensures`, mirroring `Post*`; assuming `Pre_gt` as well would make the check `Pre ==> Pre_gt` vacuous. Verus's proof result is stronger than CrossHair's timeout convention when it succeeds, but a timeout or unsupported feature remains inconclusive.

Evidence. The construction is justified by the paper's statement: “By this construction, we can check soundness within a single verifier call.” The key measured gap is why this matters: for `nl2postcond`, test-set correctness was 59.1–86.6% at `accept@1` (Table 1) but verification soundness only 11.5–13.4% at `sound@1`; the paper's text contrasts 73.6–89.0% (NL2Contract's `accept@1`) with 11.5–13.0%, which does not match Table 1.

## technique 3: mutation-based completeness and bug discrimination

What it is. Since completeness quantifies over all possible programs, the authors approximate it with a set `C_M` of buggy mutants of the reference implementation. A contract is considered complete over this set when the verifier finds a specification violation for every mutant. They reuse the mutant set of the `nl2postcond` evaluation, 4–233 mutants per HumanEval+ task (median 55), generated as code completions from an earlier ChatGPT, each with known valid bug-triggering inputs.

How to do it. (1) Start with a reference implementation and its valid-input predicate. (2) Generate diverse mutants that differ on at least one valid input. (3) Run the verifier on each mutant and inferred contract. (4) Count a mutant killed when the verifier returns an input satisfying `Pre` and violating `Post`. (5) Report both the fraction of sound contracts killing all mutants (`%complete`) and the fraction of mutants killed by at least one sound contract (`%killed`). Distinguish this from bug completeness measured by replaying known test inputs; the paper finds test-input replay overestimates verifier completeness.

Verus form (inference). Generate Rust mutants (operator changes, branch inversions, off-by-one bounds, wrong constants) and run Verus on each. A failed `ensures` proof identifies a mutant, but whether Verus yields a concrete failing input, rather than only the failed obligation, is not established by the paper or the local Verus references; if not, pair it with targeted test generation or model-based search to obtain an input. Preserve the inferred `requires` domain when judging mutants so invalid-state failures are excluded.

Evidence. NL2Contract yields verification-complete samples for 12.9–29.9% of generated contracts, compared with 2.8–4.8% for `nl2postcond`; at least one sound complete contract exists for 58–69 of 164 tasks, and the verifier kills 69.1–73.7% of mutants (Table 2; the text says up to 73%). GPT-5's sound-and-bug-complete rate is 39.5%, GPT-4o 31.4%, and CodeQwen 18.4%. These denominators are important: percentages are over generated contracts or 164 tasks, not all software.

## technique 4: exception-based contract encoding for executable verifiers

What it is. Python lacks a broadly supported `assume` construct in the verifiers used, so preconditions are assertions inside a try/except that raises `ValueError`; postconditions are assertions after the call. The wrapper raises an assertion error only for valid inputs whose outputs violate the postcondition. CrossHair is run with `--analysis_kind=asserts`; the experiment adds `assert True` because CrossHair requires an assertion and replaces `ValueError` with a return during preprocessing.

How to do it. Keep the original function untouched. Build a wrapper with identical arguments and inferred type hints. Catch precondition assertion failures as invalid-input exits. Call the original function. Assert output properties over both arguments and result. Feed the wrapper to CrossHair or another assertion-oriented verifier.

Verus form (inference). Translate the wrapper's precondition assertions to `requires`; translate output assertions to `ensures`; remove exception control flow. If the original function can panic, state and prove a non-panicking precondition or model a `Result`. The contract's executable wrapper is useful for runtime testing, while Verus uses specifications erased from runtime.

Evidence. The encoding is language-portable to languages with exceptions; the authors specifically mention Java assertions and `IllegalArgumentException`, but they evaluate only Python. A concrete clock example generated `0 <= hour <= 23`, `0 <= minute <= 59`, and `0 <= second <= 59`; CrossHair then found the bug at `compute_angles(12, 0, 0)`, while postcondition-only checking reported invalid `(-1,-1,-1)` as a false alarm.

## technique 5: source-context prompt construction

What it is. The prompt is assembled mechanically from source: signature, docstring, global/class variable definitions, called-function signatures and documentation, and class header. The authors found that omitting this context makes LLMs hallucinate names that do not exist.

How to do it. Parse the function under test; resolve names it calls and global/class accesses; include their definitions and signatures; insert all into the fixed prompt template; request typed parameters and contract code. For a real buggy program, hide the function body so the model cannot simply copy implemented behavior.

Verus form (inference). Feed the model Rust signatures, trait bounds, ownership-relevant context, and existing spec functions. Then place inferred predicates into `requires`/`ensures`, checking that every referenced name is in scope and that ownership does not change the function's executable body. Rust generic bounds and lifetimes must be explicit; Python's inferred dynamic types do not carry over.

Evidence. The paper reports 104/164 HumanEval+ tasks lack input type hints, 92/164 have non-type preconditions, 46/164 use standard-library functions in preconditions, and 5/164 use loops, conditionals, or helper functions. These counts describe the benchmark's preconditions; reading them as the reason context and type inference matter is the study's inference.

## technique 6: combine verifier and random testing

What it is. A contract wrapper can serve as a test oracle. The authors instrument programs with generated contract functions and run Pynguin, a coverage-guided Python test generator, for 600 seconds. An assertion failure is a specification violation; it is bug-triggering only if the mutant differs from the reference on that valid input.

Evidence. On Python-by-Contract, 59 buggy solutions exist, 31 are implementation bugs, and CrossHair can confirm 19 with the reference specification. NL2Contract contracts let CrossHair detect 14 of those 19; generated specifications enable detection in 34.8–39.4% of all model cases. Pynguin finds up to 9 of 31 bugs, but spends time exploring preconditions; NL2Contract violations are more often real bugs. The authors leave formats tailored to testing and property-based methods open.

Verus form (inference). Use `requires` as the generator's input domain and `ensures` as a property oracle in a Rust test harness. Verus itself proves universal properties; a separate fuzzer or symbolic executor can search for counterexamples to candidate contracts. Keep the valid-input predicate when classifying a failing test.

## what is proved, measured, and trusted

Proved or checked operationally: CrossHair proves or searches assertions on reference and mutant Python programs; a no-violation result within 60 seconds is labeled sound. Measured: accept@k test correctness, sound@k verification soundness, bug completeness, verification completeness, mutant kill percentage, CrossHair/Pynguin detection and false-alarm rates. Trusted inputs include HumanEval+ reference implementations and asserts, Python-by-Contract reference contracts, generated mutant sets, model outputs, CrossHair's soundness when it returns a result, and the benchmark's intended behavior. The LLM is not trusted as a proof source; its contract is filtered by verification.

The paper reports a documentation inconsistency: the approximate-square-root docstring says `abs(t*t-c) < eps`, while the reference implementation guarantees `<= eps`; CrossHair finds `c=2, eps=0.25`. This is a real mismatch between documentation and code, but deciding whether documentation or implementation is authoritative remains human work. The paper's “2018” ACM reference metadata conflicts with arXiv identifier 2510.12702 and 2025 dates; this appears to be a template artifact, not an experimental result.

## techniques for the catalog

- NL2Contract inference — translate code-local natural language into typed preconditions plus postconditions and verify the result
- verification-guided soundness — conjoin the trusted reference precondition with inferred postconditions and check the reference in one verifier call
- mutation completeness — generate valid-input mutants and require verifier-found violations to measure discriminative power
- exception contract encoding — wrap precondition assertions as invalid-input exceptions and postconditions as executable assertions
- context-built prompting — include signatures, docs, imports, globals, class members, and called APIs to reduce hallucinated contracts
- verifier plus testing — reuse executable contracts as CrossHair assertions and Pynguin test oracles while preserving valid-input domains
Audited 2026-10-12 against the paper: checked every number against Tables 1 to 3, Figures 4 to 6 and the text (soundness and completeness rates, mutant counts, benchmark counts, Python-by-Contract bug counts), the soundness construction, the contract encoding and CrossHair setup, the two quotations and the page reference, and the Verus forms. Changed: the Verus form of technique 2, which assumed the reference precondition and so made the implication check vacuous; the mismatched test-set versus soundness comparison (paper text and Table 1 disagree); the mutant set, which the paper reuses rather than generates; the mutant kill rate range (69.1 to 73.7 in Table 2); the Verus counterexample claim, now stated as unestablished; and one unmarked inference in technique 5. The Verus counterexample question from the findings list could not be settled from the paper or the local Verus notes.
