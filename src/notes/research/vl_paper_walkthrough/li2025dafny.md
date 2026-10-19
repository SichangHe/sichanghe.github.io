# Dafny as Verification-Aware Intermediate Language for Code Generation
(authored by agents unless marked 🧑)
Tag: `li2025dafny`, [paper](https://arxiv.org/abs/2501.06283)
## scope and result

Yue Chen Li, Stefan Zetzsche, and Siva Somayyajula propose hiding Dafny inside a chatbot that emits mainstream-language code only after Dafny verification. “Instead of emitting code in a target language directly, we propose that the user guides the LLM to first generate an opaque intermediate representation, in the verification-aware language Dafny, that can be automatically validated for correctness against agreed on specifications” (Abstract, p. 1). The prototype uses Claude Sonnet 3.5, generates Python, and was evaluated on 164 HumanEval tasks.

## technique: agree on a formal specification before implementation

Start from natural language. Have the LLM formalize the task in Dafny, then return a natural-language translation to the user. The user corrects that translation until both sides agree (§2.1, p. 2). The paper's FibFib example uses a recursive `fibfibFunc` as a reference and a method contract: `requires n >= 0` and `ensures result == fibfibFunc(n)` (§1, p. 1). In the demo, a typo changes `n-3` to `n-4`. The chatbot adds a fourth base case and returns a summary of a verifiable specification; the user then corrects the recurrence because that specification does not match the intended task (§2.2, p. 2).

Verus form: Inference: put the agreed behavior into `requires` and `ensures`, with a pure `spec fn` reference when useful, and expose a concise natural-language summary for user review. A proof that a candidate satisfies an agreed contract does not validate the contract itself.

## technique: verified intermediate then compile

Generate an imperative Dafny method, proof hints, invariants, and assertions. Run Dafny; on rejection, feed errors and warnings back to the LLM and regenerate until a verified candidate appears (§2.1, p. 2; §2.4, p. 3). Dafny then generates additional tests and compiles the verified program to Python. The generated Python includes the implementation, a functional reference, user tests, and extra runtime comparisons with the reference (Fig. 4, p. 3).

Steps: (1) generate the Dafny implementation against the agreed contract; (2) run the verifier; (3) revise code, invariants, or assertions using diagnostics; (4) run `generate-tests`; (5) compile to the target language (§§2.1, 2.4, pp. 2–4). Inference: VeruLaw can use Verus as the intermediate verifier and emit Rust only from a verified source, but Verus-to-Rust translation is unnecessary because Verus is Rust-like; the key invariant is that post-processing must preserve verified semantics.

Evidence: on 164 HumanEval tasks, 144/164 converged to a candidate and 127/164 passed all tests, a 77% end-to-end pass rate (§3, p. 4). Native Claude Sonnet 3.5 generation was 86%; the authors estimate approximately 88% if native generation is used when the prototype does not converge (§3, p. 4). The overall test pass rate is 127/164; 127/144 is the rate among converged cases.

## technique: generated tests and coverage

Mark a Dafny method with `{:testEntry}` and invoke Dafny's experimental `generate-tests`. The prototype uses `InlinedBlock` coverage after inlining and sets `length-limit` to 512 to limit generated inputs (§2.4, p. 4). User tests compare concrete outputs; generated tests check `ensures` at runtime, often by comparing the implementation with a functional reference. Inference: in Verus, generate Rust tests from the contract and run them after proof, but treat tests as bug-finding evidence rather than proof of contract adequacy.

## technique: preserve opacity with prompt and output controls

The system prompt and few-shot examples guide method signatures, custom `Option<T>` for nullable results, docstrings, and a `Main` test harness (Figs. 5–6, p. 5). The prototype tags function calls for Dafny specification or implementation synthesis and selectively hides their output (§2.5, pp. 4–5). This keeps the intermediate representation opaque while allowing specification feedback. Inference: VL can filter proof syntax from user-facing dialogs but should retain the exact verified source and diagnostics for auditability.

## what is trusted and where it fails

The natural-language summary is checked by reconstructing a second Dafny program and comparing it with the first. This comparison is not a symbolic proof: “We currently use an LLM to decide whether two Dafny programs are equivalent (rather than verifying their equivalence symbolically).” (§2.5, p. 4).

The paper says, “To keep the correctness guarantees, such a transformation would require an additional check for semantic equivalence.” It then reports, “In our chatbot implementation, we post-processed the code with an LLM, but did not verify for semantic equivalence.” (§4.1, p. 4). For benchmarking, the authors used raw compiler output with targeted interventions for Python interoperability (§4.1, p. 5). Dafny's generated classes and runtime do not always match native Python types; custom wrappers and embeddings resolved some cases (§4.2, p. 5). Of 37 failures among 164 tasks, around half failed to converge, primarily because the prototype could not produce verifiable code. Among converged but test-failing cases, only about half were algorithmically wrong; other failures involved ambiguous prompts or interoperability (§3.1, p. 4). Inference: the threat to agent-written verified Rust is a semantic gap introduced after proof, especially in wrappers, generated bindings, or manual post-processing. Existing work already establishes verify-then-compile, user-confirmed contracts, verifier-feedback loops, generated contract tests, and opacity controls; VL should reuse these rather than trust an unverified rewrite.

## techniques for the catalog

- contract-first dialogue — refine a formal Dafny specification through natural-language summaries before implementation
- verified intermediate representation — reject implementations until Dafny proves the agreed contract, then compile to the target language
- verifier-feedback loop — feed verifier errors and warnings back to the LLM, which generates implementation code, invariants, and assertions
- generated contract tests — use `generate-tests` and inlined block coverage to exercise verified methods
- opaque proof backend — hide intermediate Dafny outputs while obtaining user feedback on natural-language summaries
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We currently use an LLM to decide whether two Dafny programs are equivalent (rather than verifying their equivalence symbolically)."): checked all study quotations, numbers, section and page references, and technique steps; corrected author names, page references, the pass-rate denominator wording, and descriptions of specification refinement, generated tests, output filtering, and regeneration; added the LLM equivalence-check limitation and benchmark post-processing distinction; did not reproduce experiments or inspect prototype code.
