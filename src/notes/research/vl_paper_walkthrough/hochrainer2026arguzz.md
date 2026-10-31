# Arguzz: Testing zkVMs for Soundness and Completeness Bugs
(authored by agents unless marked 🧑)
Tag: `hochrainer2026arguzz`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/hochrainer)

## scope and result
Arguzz tests zero-knowledge virtual machines (zkVMs) for soundness bugs, which accept invalid executions, and completeness bugs, which reject valid executions. Its two complementary techniques are a metamorphic product program and fault injection that simulates a malicious prover. The paper reports eleven previously unknown bugs in three of six tested zkVMs (RISC Zero, Nexus, Jolt): three soundness and eight completeness bugs (Abstract, p. 1807; Section 1, p. 1809; Section 4.2, p. 1816). One RISC Zero soundness bug earned a $50,000 bounty (Abstract, p. 1807; Section 1, p. 1809). The abstract summarizes the contribution: “We present A RGUZZ, the first automated tool for testing zkVMs for soundness and completeness bugs.” (Abstract, p. 1807)

### what it is and when to use it
Use metamorphic testing when no independent expected-output oracle exists. Generate a program and semantics-preserving variants, execute all of them inside one product program, and compare their outputs. Arguzz makes the expected result explicit: equivalent functions should produce `SUCCESS`; a mismatch produces `OOPS`. The paper says: “Instead of running the original and transformed programs separately, we merge them into a single Rust program that compares their results and computes a known, expected output.” (Section 1, p. 1808).

### steps in the paper
1. Generate a random CIRCIL circuit, optionally with inline-assembly constructs (Section 2, p. 1810; Section 3.1, p. 1812).
2. Stack random semantics-preserving rewrites on it, omitting rules specific to field arithmetic and adding new rules; Appendix A lists all included rules (Section 2, p. 1810; Section 3, p. 1812; Appendix A, pp. 1825–1826).
3. Translate original and transformed circuits directly to standalone Rust functions. CIRCIL is extended with custom functions that emit inline RISC-V assembly, such as `mulhsu`, to cover the instruction set of the target zkVMs (Section 2, p. 1810; Sections 3 and 3.1, p. 1812).
4. Generate random inputs by black-box fuzzing guided by the Rust functions’ type signatures, drawing on a configurable set of boundary constants such as 0, 1, −1 and maximum or minimum integers (Section 3, p. 1812).
5. Build a product Rust program that calls all equivalent functions and returns `SUCCESS` if outputs match and `OOPS` otherwise; execute it in the unmodified zkVM and collect the trace (Section 2, pp. 1810–1811; Section 3.2, p. 1813).
6. A crash on the unmodified VM indicates a completeness bug; an unexpected output indicates a soundness bug, a completeness bug, or both (Section 1, p. 1809; Section 2, p. 1811).
7. Two loops reuse work: steps 2–4 add more transformed variants to the same product program (k variants, k-safety); steps 5–7 rerun each product program with new inputs and fault injections (Section 2, p. 1812; Section 3.2, p. 1813).

### Verus form
Inference: a Verus harness can encode each rewrite’s semantic relation as a `spec fn` and prove that the original and transformed functions return equal values under their preconditions. A product function can carry `requires` for valid inputs and `ensures` that equal inputs imply equal outputs, while executable Rust runs both functions. Inference: this proves the oracle construction for modeled rewrites, but does not prove the zkVM’s generated proof constraints; that requires testing or a separate verified backend model. The paper does not mention Verus.

### evidence and limits
The eight completeness bugs were found by metamorphic testing (Section 4.2, p. 1816). In a bug-refinding experiment (5 campaigns with different seeds, 4 CPUs, 24 h each, on the original buggy versions), Arguzz rediscovered six of ten bugs (bug 11 excluded), including all soundness bugs, within a median of 13 hours; two were found in under 20 minutes and five within six hours (Section 4.1, pp. 1815–1816; Section 4.2, p. 1818). Metamorphic testing alone cannot detect soundness bugs caused by overly weak constraints when original and transformed programs behave the same (Section 1, p. 1808). Bundling variants reduces padding overhead because the trace is padded once rather than once per execution (Section 3.2, p. 1813); measured VM execution times fell in a narrow range, so the number of bundled functions had little effect on runtime (Section 4.2, p. 1818).

### what it is and when to use it
Use fault injection to expose overly weak constraints that metamorphic equivalence cannot reveal. Arguzz modifies VM execution as if the prover were malicious, then runs the unchanged verifier. A report requires both a changed program output and verifier acceptance. The paper states: “A bug report is only generated when the injected fault actually changes the program’s output” and that “the verifier still accepts the resulting proof.” (Section 3.3, p. 1814).

### steps in the paper
1. Enable an injection run; the fuzzer picks the injection type at random and a scheduler picks the target step. The generic implementation checks a global injection flag, the injection type, and a global step counter before replacing the decoded instruction (Section 3.3, Figure 7, p. 1814).
2. Apply an instruction-modification fault: change the operation, the output value, or a register operand, such as the divisor register of `remu` (Section 3.3, p. 1814); in Jolt bug 6 it changed the immediate operand of `lui` (Section 4.2, p. 1817). The modified value propagates through normal data dependencies (Section 3.3, p. 1813).
3. Replace the VM’s built-in assertion and panic macros with versions that disable selected runtime checks when the injection flag is set, so the fault propagates (Section 3.3, p. 1814).
4. Rerun the product program with the same inputs on the malicious prover and check whether the unmodified verifier accepts the proof (Section 1, p. 1809; Section 2, p. 1811).
5. Report a soundness bug only when the output changes from `SUCCESS` to `OOPS` and the verifier accepts; a crash, an unchanged output, or verifier rejection is not reported (Section 3.3, pp. 1814–1815; Section 4.2, p. 1819).

### Verus form
Inference: model the VM trace as a sequence and define a fault transition that changes one instruction result. A Verus proof can show that the test oracle reports only when an output-difference predicate and verifier-acceptance predicate both hold. It cannot establish that the injected trace is physically realizable in every backend unless the instruction semantics and trace constraints are modeled. Inference: use ordinary Rust for the fuzzer and proof functions for the oracle’s logical implications; do not treat a `proof fn` as runtime instrumentation.

### evidence and limits
All three soundness bugs were triggered by instruction-modification injection (Section 3.3, p. 1814). Table 3 gives outcomes on the fixed versions: RISC Zero had 4,404 injections, with 4,129 (93.8%) `OOPS, EC != 0`; Nexus had 2,366, with 1,807 (76.4%); Jolt had 1,040, with 593 (57.0%); every zkVM had 0 `OOPS, EC == 0` (Table 3, p. 1820). EC is the zkVM exit code. The paper explains the zero `OOPS, EC == 0` count: “no such cases occurred here because the experiment was run on the fixed versions of the zkVMs.” (Section 4.2, p. 1819). Enabling fault injection costs throughput: disabling it raised the number of tested programs by 25.6% (OpenVM) to 98.4% (Pico) (Section 4.2, Table 2, p. 1818). If an injected run crashes or produces the expected output, the paper says “we cannot draw any definitive conclusions.” (Section 3.3, p. 1815).

## technique 3: fair instruction coverage

Uniform random injection over trace positions over-tests frequent instructions. Arguzz records how often each RISC-V instruction has been targeted, chooses at random among the least-targeted instructions in the trace, and chooses uniformly at random among that instruction’s occurrences (Section 3.3, p. 1815). Figure 8 shows the scheduler distributing injections more evenly across instructions; the paper reports this only as box plots (Section 4.2, pp. 1818–1819). Inference: a Verus model can prove that the scheduler’s counters are nonnegative and that selected instructions belong to the least-covered set; it cannot prove statistical uniformity of a finite random run.

## technique 4: inline assembly and boundary inputs

Arguzz extends CIRCIL with inline RISC-V assembly to force rarely used instructions into generated Rust. The extension increased instruction coverage by 38.2% in RISC Zero, 15.0% in Nexus, 45.2% in Jolt, 44.0% in SP1, 34.5% in OpenVM, and 44.0% in Pico (Section 4.2, p. 1818). The paper defines the metric as “the percentage increase in instruction coverage, measured as the share of instructions included in the binaries generated from our product programs when the extension is enabled.” (Section 4.2, p. 1818). Jolt bug 10 involved `mulhsu`, which circuits contained thanks to the extension (Section 4.2, p. 1817). Boundary constants aim to trigger edge cases (Section 3, p. 1812); for Nexus bug 5 (carry overflow), the paper says Arguzz was essential for producing the triggering inputs (Section 4.2, p. 1817). Inference: a Verus specification can state the intended semantics of each assembly wrapper and prove the wrapper’s result, but the actual inline assembly and zkVM constraints remain trusted or separately verified.

## proved, measured, and trusted
The paper experimentally measured bug discovery, instruction coverage, throughput, and fault outcomes. It does not formally prove zkVM soundness. The threat model treats the verifier as the only trusted component and the prover as potentially adversarial (Section 3.3, p. 1813). The six zkVMs were chosen from a list of mature implementations provided by the Ethereum Foundation, as actively maintained and representative (Section 4.1, p. 1815).

## techniques for the catalog
- product-program metamorphic oracle: merge equivalent Rust variants and compare them against an explicit `SUCCESS`/`OOPS` result
- malicious-prover fault injection: alter execution and report only changed output that an unchanged verifier accepts
- least-covered instruction scheduling: target rarely injected instructions to avoid coverage bias
- inline-assembly coverage extension: generate rarely used RISC-V instructions via inline assembly and boundary-value inputs to exercise under-tested constraints
