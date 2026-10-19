# SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop
(authored by agents unless marked 🧑)
Tag: `chang2026specloop`, [paper](https://arxiv.org/abs/2603.02895v1)
## paper and result

Chang et al. introduce SpecLoop, an agentic pipeline that generates a structured specification from RTL, reconstructs RTL from that specification, and uses formal equivalence checking against the original RTL as iterative feedback. The abstract states: “SpecLoop first generates candidate specifications and then reconstructs RTL from these specifications; it uses formal equivalence checking tools between the reconstructed RTL and the original design to validate functional consistency.” (Abstract, p.1)

Inference: Reconstruction equivalence does not independently establish that the prose captures every design intent. The authors separate compilation errors, functional mismatches, invalid original RTL, and inconclusive checker results (§III-C, Table II, pp.3–4). The workflow stops when equivalence passes or the iteration budget is reached (§III, p.2); invalid original RTL also stops iteration (§III-C, pp.3–4).

## technique: structured first-round RTL specification

what it is

The first prompt asks an LLM to analyze signals and widths, data/control dependencies, sequential versus combinational behavior, state machines, clock/reset timing, and exceptional behavior before emitting a fixed-field specification. The paper's prompt requires a module name, input and output fields, a summary, a functional description, clock/reset behavior, and optional notes (Fig. 2, p.3). It forbids Verilog in the final specification. The first-round template uses `[SPEC START]` and `[SPEC END]`; the refinement output rules use `[SPEC_START]` and `[SPEC_END]` (§III-A, p.2; Fig. 2, p.3).

when to use it

Inference: Use this format when a downstream parser or reconstructor needs stable fields and when the specification should describe behavior without copying RTL code. It is intended for RTL-to-specification generation, not narrative code explanation.

how to do it

1. Give the model RTL delimited by `[RTL START]` and `[RTL END]` (Fig. 2, p.3)
2. Have it inspect signal definitions, widths, dataflow, control flow, clocks, resets, and exceptional cases (Fig. 2, p.3)
3. Emit a summary, the exact module name, inputs/outputs with bit widths and purposes, functional description, clock/reset behavior, and applicable notes; describe each module separately if there are several (Fig. 2, p.3)
4. Self-check that every signal exists, every output is explained, and clock/reset behavior is identified (Fig. 2, p.3)
5. Delimit the final specification for parsing and keep Verilog out of it (§III-A, p.2; Fig. 2, p.3)

The paper's worked contrast describes a half-adder with explicit ports and bit widths (Table I, p.2). Inference: That example illustrates the intended abstraction rather than a formal proof.

Verus form (inference)

Inference: The direct Verus analogue is a structured contract record containing function inputs, outputs, state transitions, and `requires`/`ensures` clauses. Verus proofs still need executable Rust and proof lemmas; a prose marker format has no verification semantics by itself. The useful transfer is fixed fields plus a self-check before proof generation.

## technique: reconstruction as semantic verifier

what it is

An RTL reconstructor LLM translates each candidate specification into compilable RTL. A lightweight compiler runs first. If compilation succeeds, a formal equivalence checker compares reconstructed and original RTL. The paper says: “Compared to simulation, equivalence checking provides an exhaustive, semantics-level criterion: when it succeeds, it shows the specification is detailed enough for the reconstructed RTL to be functionally equivalent to the original.” (§III-C, p.3)

how to do it

1. Reconstruct RTL solely from the candidate specification (Fig. 2, p.3)
2. Compile the reconstructed RTL; on failure, retry with compiler diagnostics (§III-B–C, pp.3–4; Table II, p.4)
3. Run Yosys EQY with a SAT backend and depth bound 10 (§IV-D, p.4)
4. If equivalent, treat the specification as verified and stop the feedback loop (§III, p.2; §V-B, p.5)
5. For functional mismatches, extract counterexamples with a VCD parser; map checker outcomes to the four error types with a log parser (§IV-D, p.4)
6. Withhold formal equivalence logs from the reconstructor to avoid revealing original RTL semantics; only compiler errors go back to it (§III-C, p.4)

Verus form (inference)

Inference: For Verus, reconstruct executable Rust from a candidate contract or specification, compile it, and run `verus` to check the contract. A failed proof obligation or counterexample can feed refinement. Verus does not provide hardware equivalence checking, so this is a workflow analogy; semantic equivalence must be defined over Rust executions and specifications.

limits

Equivalence failure is ambiguous: it can mean an inaccurate specification, an ambiguous one, or a reconstructor limitation (§III-A, Fig. 2, p.3). Resource-bounded checking can also return inconclusive results. The paper explicitly notes that “reconstructor capacity may still bound end-to-end performance” (§III-B, p.3). Inference: A pass supports consistency of this reconstruction within the checker setup; it does not establish prose completeness or recovery of unstated design intent. The paper warns that resource-bounded checking, including fixed depth, can block useful feedback (§VI, p.5).

## technique: diagnostic-guided refinement

what it is

After a failure, the spec generator receives a report, identifies the likely root cause, and changes only affected fields. The refinement prompt distinguishes (1) spec inaccuracy, (2) spec ambiguity, and (3) reconstruction limitation (Fig. 2, p.3). The authors state: “This makes feedback actionable and enables incremental improvements.” (§III-A, p.2)

how to do it

1. Summarize which signals were equivalent and which mismatched, including counterexamples and other tool errors (Fig. 2, p.3)
2. Classify each failure as specification inaccuracy, specification ambiguity, or reconstruction limitation (Fig. 2, p.3)
3. For inaccuracy, fix identified errors; for ambiguity, clarify the relevant description without changing intent (Fig. 2, p.3)
4. Only if all failures are attributed to reconstruction limitation, keep the previous specification and stop (Fig. 2, p.3)
5. Regenerate and rerun compilation/equivalence until pass or budget exhaustion (§III, p.2)

The error policy gives concrete handling: invalid original RTL stops iteration; non-compilable reconstruction retries with compile errors, then sends persistent errors to the spec generator; functional mismatches retry reconstruction, then send persistent counterexamples to the spec generator; inconclusive checking retries reconstruction, then sends an error message to the spec generator if outcomes remain inconclusive (§III-C, Table II, pp.3–4).

Verus form (inference)

Inference: Feed Verus diagnostics (parse/type errors and failed proof obligations) to a contract-repair model, preserving unaffected clauses. Classifying a failure as a bad contract versus a prover/model limitation is essential; otherwise an agent may weaken a valid specification to make verification pass.

## evidence and measured setup

The evaluation uses VerilogEval (toy modules) and RTLLM (larger designs) and the RTL Reconstruction Score (RR), which tests RTL reconstructed by GPT-5 Codex with testbenches (§IV-B, p.4). It compares Single Round, Pass/Fail-Only, and Full Diagnosis; the two feedback variants share the retry budget (§IV-C, p.4). Within SpecLoop, the same LLM generates specifications and reconstructs RTL to isolate feedback effects (§IV-A, p.4). Models include Qwen3-Coder-30B/480B, DeepSeek-V3.1, Llama4-Scout-16E, Llama4-Maverick-128E, and GLM-4.6 (Table III, p.5). The setup permits two spec-generator retries (three generations including the initial) and two reconstructor retries per specification, temperature 0.4, and EQY depth 10 (§IV-D, p.4). Each experiment runs three times; scores report mean and standard deviation (§IV-D, pp.4–5).

Table III reports mean ± standard deviation RR scores. On VerilogEval, Full Diagnosis scores are 0.795 ± 0.021 (Qwen3-Coder-30B), 0.912 ± 0.012 (480B), 0.940 ± 0.003 (DeepSeek-V3.1), 0.705 ± 0.019 (Llama4-Scout), 0.842 ± 0.015 (Maverick), and 0.934 ± 0.020 (GLM-4.6); the corresponding Single Round values are 0.722, 0.885, 0.865, 0.686, 0.818, and 0.906 (Table III, p.5). On RTLLM, Full Diagnosis values are 0.747 ± 0.019, 0.767 ± 0.041, 0.800 ± 0.016, 0.687 ± 0.025, 0.813 ± 0.009, and 0.880 ± 0.000 for the same model order (Table III, p.5). Inference: The paper does not report the number of RTL samples per model, so these means do not identify a per-sample denominator.

The paper reports ranking counts over 12 model/dataset settings: Full Diagnosis ranks highest in 9, Pass/Fail-Only in 4, and Single Round in 0 (§V-A, p.5). Inference: Table III supports these counts when ties count for both methods: Qwen3-Coder-30B on RTLLM gives both feedback variants 0.747. The loop does not improve every individual result: Qwen3-Coder-480B on RTLLM gives Full Diagnosis and Single Round the same mean (0.767); Pass/Fail-Only is below Single Round in three settings. Full Diagnosis also trails Pass/Fail-Only for Llama4-Scout on both benchmarks (Table III, p.5). Figure 3 reports RR=1 fractions for verified versus unverified specifications averaged over benchmarks and verifier variants: verified values are 81.3%, 88.7%, 85.5%, and 91% for Llama4-Scout, Llama4-Maverick, Qwen3-Coder-30B, and Qwen3-Coder-480B; unverified values are 34.6%, 45%, 45.2%, and 42.8% (Fig. 3, p.5). Inference: Figure 3 does not provide group sample denominators, so these percentages alone cannot identify counts.

The qualitative counter example is a 0–999 counter whose original reset is synchronous. The first specification says asynchronous reset; reconstruction disagrees at `t=11` (`q=0` reconstructed versus `q=10` original), and the next specification says synchronous reset, after which verification passes (§V-C, p.5; Fig. 4, p.6). Inference: This illustrates error localization for one design rather than general correctness.

## what is proved, trusted, and missing

The paper lists limitations: dependence on the reconstructor and equivalence-checking setup, resource-bounded checking, heuristic feedback parsing and prompting, and difficulty scaling to large industrial RTL (§VI, pp.5–6).

Inference: Interpreting a successful EQY result requires the checker setup and assumptions. It checks one reconstructed RTL against the original; it does not independently prove that the prose is unique, complete, or faithful to unstated requirements. The reconstructor, parsers, compiler, EQY implementation, and benchmark test harness affect the resulting evidence. A depth bound of 10 alone does not establish an unrestricted equivalence guarantee.

Inference: In VeruLaw, SpecLoop's transferable idea is a contract-reconstruction feedback loop: generate a candidate Rust/Verus specification, synthesize or reconstruct code from it, and use Verus proof failures and concrete counterexamples to refine only affected clauses. Treating an equivalence pass as requirement validation risks accepting an unsuitable security property. Independent requirement tests and final Verus proofs could complement this consistency check.

## techniques for the catalog

- structured RTL specification — generate fixed fields for ports, behavior, control, clocks, resets, and exceptional cases
- reconstruction verification — reconstruct RTL from prose and check it against original RTL with formal equivalence
- diagnostic classification — distinguish specification inaccuracy, ambiguity, reconstruction limits, invalid RTL, and inconclusive checks
- information hiding — withhold equivalence logs from the reconstructor while allowing compiler diagnostics
- incremental feedback loop — revise only affected specification fields until equivalence passes or retry budgets end
- pass/fail versus rich diagnostics — compare binary feedback with counterexamples and mismatch reports
- bounded equivalence setup — use Yosys EQY SAT checking with an explicit depth bound and report its limits
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To isolate the contribution of our verification-guided loop, we use exactly the same LLM for both roles."): checked every quotation, number, page and section reference, and technique step against all seven pages; corrected references, marker conventions, stopping conditions, feedback isolation, evaluation roles, tied rankings, and equivalence claims; marked recommendations and conclusions as Inference; did not reproduce experiments or independently validate the tools, cited works, or Verus analogies.
