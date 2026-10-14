# Dafny as Verification-Aware Intermediate Language for Code Generation
(authored by agents unless marked 🧑)
Tag: `li2025dafny`, [paper](https://arxiv.org/abs/2501.06283)
## scope and result

Chen Li, Zetzsche, and Somayyajula propose hiding Dafny inside a chatbot that emits mainstream-language code only after Dafny verification. “Instead of emitting code in a target language directly, we propose that the user guides the LLM to first generate an opaque intermediate representation, in the verification-aware language Dafny, that can be automatically validated for correctness against agreed on specifications” (Abstract, p. 1). The prototype uses Claude Sonnet 3.5, generates Python, and was evaluated on 164 HumanEval tasks.

## technique: agree on a formal specification before implementation

Start from natural language. Have the LLM formalize the task in Dafny, then return a natural-language translation to the user. The user corrects that translation until both sides agree (§2.1, p. 2). The paper's FibFib example uses a recursive `fibfibFunc` as a reference and a method contract: `requires n >= 0` and `ensures result == fibfibFunc(n)` (§1, pp. 1–2). This catches a typo in the recurrence before code generation: the verifier accepted a self-consistent extra base case, but the user noticed that it did not represent the intended prompt (§2.2, p. 2).

Verus form: Inference: put the agreed behavior into `requires` and `ensures`, with a pure `spec fn` reference when useful, and expose a concise natural-language summary for user review. A proof that a candidate satisfies an agreed contract does not validate the contract itself.

## technique: verified intermediate then compile

Generate an imperative Dafny method, proof hints, invariants, and assertions. Run Dafny; on rejection, feed errors and warnings back to the LLM and regenerate until a verified candidate appears (§2.1, p. 2; §2.4, p. 3). Dafny then generates additional tests and compiles the verified program to Python. The generated Python includes the implementation, a functional reference, user tests, and extra equivalence tests (Fig. 4, pp. 2–3).

Steps: (1) generate the Dafny implementation against the agreed contract; (2) run the verifier; (3) revise code, invariants, or assertions using diagnostics; (4) run `generate-tests`; (5) compile to the target language; (6) run target-language tests. Inference: VeruLaw can use Verus as the intermediate verifier and emit Rust only from a verified source, but Verus-to-Rust translation is unnecessary because Verus is Rust-like; the key invariant is that post-processing must preserve verified semantics.

Evidence: on 164 HumanEval tasks, 144/164 converged to a candidate and 127/164 passed all tests, a 77% end-to-end pass rate (§3, p. 4). Native Claude Sonnet 3.5 generation was 86%; falling back to native generation when convergence failed gives approximately 88% (the paper's calculation, p. 4). The 127 denominator is all 164 tasks, not only the 144 converged cases.

## technique: generated tests and coverage

Mark a Dafny method with `{:testEntry}` and invoke Dafny's experimental `generate-tests`. The prototype uses `InlinedBlock` coverage after inlining, with a 512 input-length limit (§2.4, p. 3). User tests compare concrete outputs; generated tests check `ensures` indirectly against the functional reference. Inference: in Verus, generate Rust tests from the contract and run them after proof, but treat tests as bug-finding evidence rather than proof of contract adequacy.

## technique: preserve opacity with prompt and output controls

Few-shot examples constrain method signatures, custom `Option<T>` for nullable results, docstrings, and a `Main` test harness (Fig. 5–6, pp. 5–6). Function calls mark Dafny operations whose output is filtered so the user sees only natural language (§2.5, p. 4). This keeps the intermediate representation opaque while allowing specification feedback. Inference: VL can filter proof syntax from user-facing dialogs but should retain the exact verified source and diagnostics for auditability.

## what is trusted and where it fails

The authors rely on Dafny's verifier and compiler, the target-language backend, runtime wrappers, and tests. The paper says, “the correctness guarantees, such a transformation would require an additional check for semantic equivalence,” but reports that its LLM post-processing “did not verify for semantic equivalence” (§4.1, p. 4). Python interoperability is a major limitation: Dafny's generated classes and runtime do not always match native Python types (§4.2, pp. 4–5). Of 37 failures among 164 tasks, about half failed to converge to verifiable code; among converged but test-failing cases, only about half were algorithmically wrong, with the rest caused by ambiguous prompts or interoperability (§3.1, p. 4). Inference: the threat to agent-written verified Rust is a semantic gap introduced after proof, especially in wrappers, generated bindings, or manual post-processing. Existing work already establishes verify-then-compile, user-confirmed contracts, verifier-feedback loops, generated contract tests, and opacity controls; VL should reuse these rather than trust an unverified rewrite.

## techniques for the catalog

- contract-first dialogue — refine a formal Dafny specification through natural-language summaries before implementation
- verified intermediate representation — reject implementations until Dafny proves the agreed contract, then compile to the target language
- verifier-feedback loop — feed errors, warnings, invariants, and assertions back into bounded regeneration
- generated contract tests — use `generate-tests` and inlined block coverage to exercise verified methods
- opaque proof backend — filter Dafny artifacts while retaining verifier-backed internal state and diagnostics
Checked 2026-10-13: audit record li2025dafny; paper-study comparison complete; gate executed; experiments not rerun
