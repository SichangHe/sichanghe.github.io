# A Study of the Reliability of Agentic AI-Generated Programs
(authored by agents unless marked 🧑)
Tag: `shafique2026reliability`, [paper](https://arxiv.org/abs/2609.18298)

## question, corpus, and result
The paper compares ten agent-generated Linux utilities with current human-written repository versions. The agents used a staged, best-practice workflow; reliability was measured with classic black-box generational fuzzing and AFL++ coverage-guided mutational fuzzing. The abstract reports that AI versions were “less likely to have failures such as memory errors (such as buffer overflows) but more likely to have hangs such as infinite loops.” (Abstract, p. 3.)

Across both versions, fuzzing exposed 24 unique failures: 19 in repository programs and 5 in AI programs (Section 6, p. 19). The combined methods found 17 unique crashes and 7 unique hangs: classic uniquely found 7 crashes and 4 hangs, AFL++ uniquely found 10 crashes and 7 hangs, and both found 4 common hangs (Table 2, p. 18). These denominators are unique root-cause failures after deduplicating multiple inputs that trigger the same bug (Section 5.3, pp. 18–19). Inference: this is evidence about tested executions, not a proof that either implementation is correct.

## technique 1: turn documentation into a feature checklist and test oracle
Use this before code generation when prose requirements are too easy for an agent to omit. The paper’s steps are:

1. Read the utility’s user documentation, which is the only specification used in this workflow (Section 2.1, p. 6).
2. Extract one checklist entry for every documented behavior (Section 2.3.1, p. 8).
3. Convert each checklist item into specification-based test cases, forming the test oracle (Section 2.3.1, p. 8).
4. Add publicly available tests to capture edge cases and long-standing assumptions (Section 2.3.1, p. 8).
5. During implementation, run the oracle after each checklist item and repair failures until the full oracle passes; explicitly defer an item only when it does not apply to the target Unix environment (Section 2.3.3, p. 9).

The paper says, “The feature checklist is a list of the documented behavior that the agent must implement, with one entry for each documented behavior.” (Section 2.3.1, p. 8.) It also says, “The test oracle is the suite of test cases used to guide test-driven development during implementation and check whether the agent-written code conforms to the specification.” (Section 2.3.1, p. 8.)

Inference: for Verus, map each checklist item to a Rust function contract, data invariant, or executable test. A Verus `requires` clause states assumptions and an `ensures` clause on an ordinary `fn` states a postcondition; proof functions can establish lemmas used by those contracts. The checklist remains a requirements artifact, and tests do not replace proofs. This Verus mapping is an inference because the paper implements C, not Rust or Verus.

Evidence: the workflow requires a clean build, a passing full test oracle, coverage of every checklist item by implementation or explicit deferral, and an ACCEPT audit verdict before completion (Section 2.3.4, p. 10). No denominator is supplied for how many checklist items each utility had.

Failure assumptions: documentation can be incomplete or ambiguous. The workflow escalates ambiguity to a human operator during design rather than silently choosing a behavior (Section 2.3.2, p. 8).

## technique 2: freeze architecture and resolve ambiguity before coding
Use this to prevent an implementation agent from making architectural choices while writing code. The sequence is:

1. Produce a high-level architecture describing components, data structures, error behavior, resource management, and special mechanisms such as concurrency (Section 2.3.2, p. 8).
2. Produce an implementation plan naming modules and recording every silent or ambiguous specification case (Section 2.3.2, p. 8).
3. Escalate each ambiguity and adopt the human operator’s resolution in the plan (Section 2.3.2, p. 8).
4. Launch a critic subagent to compare architecture and plan against the specification and feature checklist (Section 2.3.2, p. 8).
5. Revise the documents until the critic raises no further issues (Section 2.3.2, p. 8).

The paper states, “We fix the design and implementation plan before writing any code so that the agent resolves the program structure and any gaps in the specification in advance.” (Section 2.3.2, p. 8.)

Inference: for VL, freeze a Rust module plan and a Verus proof-obligation list before implementation. Record unresolved ownership, arithmetic, and state-transition decisions and require human resolution. In Verus, the resulting plan can identify where `requires`, `ensures`, `assert`, `assert forall`, and loop invariants will be needed; the paper does not prescribe these constructs.

Evidence: the paper reports experience across ten utilities, but gives no count of design-review findings or critic iterations. The workflow’s claim is procedural rather than a quantified causal comparison.

## technique 3: implement one bounded requirement at a time with execution feedback
Use this when a large program overwhelms one context. The method is:

1. Give the coding agent the architecture, implementation plan, checklist, and test oracle (Section 2.3.3, p. 9).
2. Select one checklist item as a bounded coding task; independent items may be assigned to fresh subagents (Section 2.3.3, p. 9).
3. Write code for that item, run the test oracle, inspect the failing behavior, repair, and rerun (Section 2.3.3, p. 9).
4. Repeat until the full oracle passes and every item is implemented or explicitly deferred (Section 2.3.3, p. 9).
5. Apply defensive-programming, trust-boundary validation, secure-memory, clarity, modularity, and maintainability skills throughout (Section 2.3.3, p. 9).

The paper emphasizes, “This process provides external execution feedback rather than requiring the agent to identify errors solely by reviewing its own output” (Section 2.3.3, p. 9; the sentence continues).

Inference: replace the C test cycle with a Verus cycle: implement one Rust behavior, run unit tests where useful, run `verus` on the relevant module, inspect counterexamples, then repair the contract or implementation. Keep the proof obligation local, but rerun the complete verifier before accepting the whole artifact. This is an inference from the paper’s execution-feedback principle.

Evidence: the authors say that for the smaller utilities the agents were generally able to implement features, run the tests, and make corrections quickly, but this changed as programs became larger; less and make needed many iterations, requiring hundreds of commits, and changes to one feature often broke previously working behavior (Section 4.3, pp. 13–14). No per-item success denominator is reported.

## technique 4: independent conformance and security audits
Use separate clean-context agents to reduce confirmation bias. Stage 4 is a conformance audit; Stage 5 is a security and correctness audit.

Stage 4 steps are: review source, build and execute selected inputs, compare behavior with the specification, checklist, oracle, architecture, and plan; return ACCEPT, KICK BACK, or ESCALATE; send KICK BACK findings to Stage 3; repeat until ACCEPT (Section 2.3.4, pp. 9–10). A program is complete only after clean build, full oracle pass, checklist coverage, and ACCEPT.

Stage 5 starts only after Stage 4. The fresh agent inspects memory safety, resource management, unchecked inputs and return values, and exploitable vulnerabilities, using compiler diagnostics, static analyzers, sanitizers, GDB, or Valgrind where appropriate (Section 2.3.5, p. 10). The workflow prohibits fuzzing in this stage so independent fuzz evaluation remains unbiased (Section 2.3.5, p. 10).

Inference: a VL version should have a specification audit that checks whether the Verus contracts encode the user’s requirements, followed by an independent proof audit that checks the verifier invocation and trusted boundaries. Verus proving a wrong contract is analogous to a conformance audit that checks the wrong specification; it does not establish intended behavior.

## technique 5: classic black-box fuzzing with environmental isolation
Use this for broad, grammar-free input exploration and to find crashes or hangs. The paper generates eight random-input sets across four sizes from below 1 KB to 100 MB, totaling 4,280 cases and about 12 GB of data (Section 5.1, p. 16). Inputs include arbitrary bytes, printable characters, NULL bytes, unstructured streams, line-oriented data, standard input, files, pseudo-terminals, and randomly selected command-line options (Section 5.1, p. 16).

The oracle classifies a failure when the program crashes or hangs. Interactive utilities run in Docker containers to isolate filesystem and process side effects; reported hangs are manually examined to distinguish waiting for input or slow large-input processing from real failures (Section 5.1, pp. 16–17). Later in that section the paper notes, “the main difficulty is distinguishing genuine hangs from programs that were simply waiting for more input or taking a long time to process very large test cases.” (Section 5.1, p. 17.)

Inference: fuzz a Verus-verified Rust binary at its external trust boundaries, but interpret a fuzz finding as a counterexample to an executable behavior or resource assumption, not as a refutation of a proved functional contract unless the same input reaches that contract. A timeout policy and sandbox are required for nontermination; these are engineering inferences.

## technique 6: AFL++ coverage-guided mutation and deduplicated debugging
Use this after seed inputs exist and input structure can guide deeper path exploration. The steps are:

1. Compile with `afl-clang-fast` and run AFL++ 5.01a inside Docker (Section 5.2, p. 17).
2. Build a seed corpus containing valid, empty, malformed, binary, and unusually long inputs; add syntax dictionaries where useful (Section 5.2, p. 17).
3. Run one campaign mutating stdin/file data with no command-line options, then a second using argv-fuzz to mutate arguments over fixed input (Section 5.2, p. 17).
4. Give repository and AI versions identical seeds and configurations (Section 5.2, p. 17).
5. Replay and reduce reports, replay hangs individually with longer timeouts, and count only reproducible root causes; combine multiple triggering inputs into one unique failure (Sections 5.2–5.3, pp. 17–19).

Table 2 reports 24 unique failures across both implementations and ten utilities: 19 repository and 5 AI. Classic black-box found 7 unique crashes and 4 unique hangs; AFL++ found 10 unique crashes and 7 unique hangs; four hangs were common (Table 2, p. 18). The paper concludes that classic testing still found failures AFL++ missed (Section 6, p. 19).

Inference: this complements Verus by exploring environmental, parser, and resource behaviors that a functional proof may abstract away. It cannot prove absence of bugs. Verus can express loop termination and bounded-resource assumptions where modeled, but external OS behavior and the fuzz harness remain trusted.

## what is proved, measured, and trusted; threat to VL
The study measured crashes, hangs, and root causes under two fuzz methods. It did not prove memory safety, semantic equivalence to the Unix utilities, or absence of untested failures. The human repository versions are a practical baseline, not a formal specification. Fuzzing, Docker isolation, manual triage, compiler instrumentation, and the agent workflow are trusted for the reported measurements.

Inference: the threat to an agent-written verified-Rust product is high for requirements omissions and nontermination, medium for memory/resource interactions outside the model, and lower for the exact properties Verus proves under explicit preconditions. The paper’s observation that AI code had fewer memory failures but more hangs is a warning that proving local functional properties does not automatically establish termination or resource bounds.

The paper already provides checklist/oracle synthesis, staged design and coding, independent audits, classic fuzzing, AFL++ mutation, root-cause deduplication, and prompt-based sustainability maintenance. VL should not redo these generic workflow components; it should adapt the checklist to Verus contracts, make `verus` success a required acceptance condition, and fuzz the compiled verified artifact.

## techniques for the catalog
- specification artifacts: convert documentation into a feature checklist and specification-derived test oracle before coding
- staged agent workflow: freeze architecture, resolve ambiguities, implement bounded checklist items with execution feedback, then audit independently
- black-box fuzzing: generate varied byte and option inputs in isolated containers and manually classify crashes and hangs
- coverage-guided fuzzing: mutate seeded inputs with AFL++, replay and reduce reports, and deduplicate by root cause
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This suggests that claims produced by an agent should be treated as hypotheses to verify, rather than as the truth."): read the whole paper text and checked every quotation, the 24/19/5 and 17/7 failure counts against Table 2 and Section 6, the input-size, 4,280-case and 12 GB figures, the AFL++ 5.01a and afl-clang-fast details, the stage descriptions, and section and page references; changed the paper link (the old arXiv id 2506.11022 is a cited prior paper; the paper text gives arxiv.org/abs/2609.18298), corrected page references for Section 2.1 (p. 6), Section 6 (p. 19), the Section 5.1 hang quotation (p. 17), Sections 5.2–5.3 (pp. 17–19) and Section 4.3, reworded the Section 4.3 evidence sentence, and marked one quotation as truncated; did not check the Verus mappings (marked Inference, not from the paper), the cited external works, or the PDF figures and layout beyond the text extraction.
