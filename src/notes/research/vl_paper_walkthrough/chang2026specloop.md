# SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop
(authored by agents unless marked 🧑)
Tag: `chang2026specloop`, [paper](http://arxiv.org/abs/2603.02895v1)
## paper and result

Chang et al. introduce SpecLoop, an agentic pipeline that generates a structured specification from RTL, reconstructs RTL from that specification, and uses formal equivalence checking against the original RTL as iterative feedback. The abstract states: “SpecLoop first generates candidate specifications and then reconstructs RTL from these specifications; it uses formal equivalence checking tools between the reconstructed RTL and the original design to validate functional consistency.” (Abstract, p.1)

The central object checked is reconstruction equivalence, not a proof that the prose captures every design intent. The authors separate compilation errors, functional mismatches, invalid original RTL, and inconclusive checker results (§III-C, Table II, pp.4–5). The workflow stops after equivalence passes or after its generation/reconstruction budgets are exhausted (§III, pp.3–5).

## technique: structured first-round RTL specification

what it is

The first prompt asks an LLM to analyze signals and widths, data/control dependencies, sequential versus combinational behavior, state machines, clock/reset timing, and exceptional behavior before emitting a fixed-field specification. The paper's prompt requires a module name, input and output fields, a functional description, clock/reset behavior, and optional notes (Fig. 2, p.3). It forbids Verilog in the final specification and encloses output between `[SPEC START]` and `[SPEC END]` (§III-A, p.3).

when to use it

Use this format when a downstream parser or reconstructor needs stable fields and when the specification should describe behavior without copying RTL code. It is intended for RTL-to-specification generation, not narrative code explanation.

how to do it

1. Give the model RTL delimited by `[RTL START]` and `[RTL END]` (§III-A, Fig. 2, p.3)
2. Have it inspect signal definitions, widths, dataflow, control flow, clocks, resets, and exceptional cases (Fig. 2, p.3)
3. Emit module name, typed inputs/outputs, functional description, clock/reset behavior, and notes (§III-A, p.3)
4. Self-check that every signal exists, every output is explained, and clock/reset behavior is identified (Fig. 2, p.3)
5. Parse only the marked specification block for reconstruction (§III-A, p.3)

The paper's worked contrast describes a half-adder with explicit ports and bit widths (Table I, p.2). That example shows the desired level of abstraction; it does not show a formal proof.

Verus form (inference)

Inference: The direct Verus analogue is a structured contract record containing function inputs, outputs, state transitions, and `requires`/`ensures` clauses. Verus proofs still need executable Rust and proof lemmas; a prose marker format has no verification semantics by itself. The useful transfer is fixed fields plus a self-check before proof generation.

## technique: reconstruction as semantic verifier

what it is

An RTL reconstructor LLM translates each candidate specification into compilable RTL. A lightweight compiler runs first. If compilation succeeds, a formal equivalence checker compares reconstructed and original RTL. The paper says: “Compared to simulation, equivalence checking provides an exhaustive, semantics-level criterion: when it succeeds, it shows the specification is detailed enough for the reconstructed RTL to be functionally equivalent to the original.” (§III-C, p.4)

how to do it

1. Pass only the candidate specification to the reconstructor (§III-B, p.3)
2. Compile the reconstructed RTL; on failure, retry with compiler diagnostics (§III-C, Table II, p.5)
3. Run Yosys EQY with a SAT backend and depth bound 10 (§IV-D, p.5)
4. If equivalent, mark the specification verified for this reconstruction (§III, p.3)
5. If not equivalent, extract mismatched signals and VCD counterexamples (§IV-D, p.5)

Verus form (inference)

Inference: For Verus, reconstruct executable Rust from a candidate contract or specification, compile it, and run `verus` to check the contract. A failed proof obligation or counterexample can feed refinement. Verus does not provide hardware equivalence checking, so this is a workflow analogy; semantic equivalence must be defined over Rust executions and specifications.

limits

Equivalence failure is ambiguous: it can mean an inaccurate specification, an ambiguous one, or a reconstructor limitation (§III-A, Fig. 2, p.3). Resource-bounded checking can also return inconclusive results. The paper explicitly notes that “reconstructor capacity may still bound end-to-end performance” (§III-C, p.4). Therefore a pass proves equivalence of the reconstructed RTL under EQY's model and depth, not that the prose is complete for all unstated design intent.

## technique: diagnostic-guided refinement

what it is

After a failure, the spec generator receives a report, identifies the likely root cause, and changes only affected fields. The refinement prompt distinguishes (1) spec inaccuracy, (2) spec ambiguity, and (3) reconstruction limitation (Fig. 2, p.3). The authors state: “This makes feedback actionable and enables incremental improvements.” (§III-A, p.3)

how to do it

1. Summarize which signals were equivalent and which mismatched, including counterexamples and other tool errors (Fig. 2, p.3)
2. Classify the cause as inaccurate, ambiguous, or reconstruction-limited (§III-A, p.3)
3. For inaccuracy, revise only erroneous fields; for ambiguity, clarify wording without changing intent (§III-A, p.3)
4. If the cause is reconstruction limitation, keep the previous specification and stop (§III-A, p.3)
5. Regenerate and rerun compilation/equivalence until pass or budget exhaustion (§III, p.3)

The error policy gives concrete handling: invalid original RTL stops iteration; non-compilable reconstruction retries with compile errors; persistent functional mismatch sends a counterexample to the spec generator; inconclusive FEC sends an error message after a reconstruction retry (§III-C, Table II, pp.4–5).

Verus form (inference)

Inference: Feed Verus diagnostics (parse/type errors and failed proof obligations) to a contract-repair model, preserving unaffected clauses. Classifying a failure as a bad contract versus a prover/model limitation is essential; otherwise an agent may weaken a valid specification to make verification pass.

## evidence and measured setup

The evaluation uses VerilogEval (toy modules) and RTLLM (larger designs) and the RTL Reconstruction Score (RR), which tests reconstructed RTL with testbenches (§IV-B, p.5). It compares Single Round, Pass/Fail-Only, and Full Diagnosis. The same LLM is used for specification generation and reconstruction to isolate feedback effects (§IV-A, p.5); models include Qwen3-Coder-30B/480B, DeepSeek-V3.1, Llama4-Scout-16E, Llama4-Maverick-128E, and GLM-4.6 (p.5). The setup permits two spec-generator retries (three generations including the initial) and two reconstructor retries per specification, temperature 0.4, and EQY depth 10 (§IV-D, p.5).

Table III reports mean ± standard deviation RR scores. On VerilogEval, Full Diagnosis scores are 0.795 ± 0.021 (Qwen3-Coder-30B), 0.912 ± 0.012 (480B), 0.940 ± 0.003 (DeepSeek-V3.1), 0.705 ± 0.019 (Llama4-Scout), 0.842 ± 0.015 (Maverick), and 0.934 ± 0.020 (GLM-4.6); the corresponding Single Round values are 0.722, 0.885, 0.865, 0.686, 0.818, and 0.906 (Table III, p.6). On RTLLM, Full Diagnosis values are 0.747 ± 0.019, 0.767 ± 0.041, 0.800 ± 0.016, 0.687 ± 0.025, 0.813 ± 0.009, and 0.880 ± 0.000 for the same model order (Table III, p.6). These are means over the paper's benchmark runs; the supplied text does not give the number of RTL samples per model, so a per-sample denominator cannot be reconstructed.

The paper reports ranking counts over 12 model/dataset settings: Full Diagnosis ranks highest in 9, Pass/Fail-Only in 4, and Single Round in 0 (§V-A, p.6). Inference: these counts cannot all be mutually exclusive rankings; interpret them as counts of settings in which each method attained the top rank, with ties or reporting conventions unspecified. Figure 3 reports RR=1 fractions for verified versus unverified specifications averaged over benchmarks and verifier variants: verified values are 81.3%, 88.7%, 85.5%, and 91% for Llama4-Scout, Llama4-Maverick, Qwen3-Coder-30B, and Qwen3-Coder-480B; unverified values are 34.6%, 45%, 45.2%, and 42.8% (Fig. 3, p.6). The figure does not state each group's sample denominator, so these percentages cannot be converted to counts.

The qualitative counter example is a 0–999 counter whose original reset is synchronous. The first specification says asynchronous reset; reconstruction disagrees at `t=11` (`q=0` reconstructed versus `q=10` original), and the next specification says synchronous reset, after which EQY passes (Fig. 4, pp.7–8). This demonstrates error localization for one design; it does not establish general correctness.

## what is proved, trusted, and missing

A successful EQY result proves equivalence between the original RTL and one reconstructed RTL under Yosys EQY's SAT model and depth 10. It does not prove that the natural-language specification is unique, complete, or faithful to requirements that cannot affect the checked RTL behavior. The reconstructor, parser, compiler, EQY implementation, depth bound, and benchmark test harness remain trusted or assumed. The paper lists scaling limitations: resource-bounded checking, heuristic feedback parsing, and difficulty with large industrial RTL (§VI, p.8).

Inference: In VeruLaw, SpecLoop's transferable idea is a contract-reconstruction feedback loop: generate a candidate Rust/Verus specification, synthesize or reconstruct code from it, and use Verus proof failures and concrete counterexamples to refine only affected clauses. Its product threat is medium to high if an equivalence pass is treated as requirement validation; it is a useful consistency check, not evidence that an agent chose the right security property. The strongest practical guard is to combine this loop with independent requirement tests and final Verus proofs.

## techniques for the catalog

- structured RTL specification — generate fixed fields for ports, behavior, control, clocks, resets, and exceptional cases
- reconstruction verification — reconstruct RTL from prose and check it against original RTL with formal equivalence
- diagnostic classification — distinguish specification inaccuracy, ambiguity, reconstruction limits, invalid RTL, and inconclusive checks
- incremental feedback loop — revise only affected specification fields until equivalence passes or retry budgets end
- pass/fail versus rich diagnostics — compare binary feedback with counterexamples and mismatch reports
- bounded equivalence setup — use Yosys EQY SAT checking with an explicit depth bound and report its limits
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
