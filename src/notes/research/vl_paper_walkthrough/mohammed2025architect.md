# Architect in the Loop Agentic Hardware Design and Verification
(authored by agents unless marked 🧑)
Tag: `mohammed2025architect`, [paper](http://arxiv.org/abs/2512.00016v1)

## scope and result

Inference: This case study uses an LLM agent to design processors from a structured blueprint, generate SystemVerilog and cocotb tests, and iterate with an engineer. It demonstrates a workflow for simulation and synthesis validation, rather than a formal proof system. “We propose agentic automated processor design and verification with engineers in the loop.” (Abstract, p.1) The two reported demonstrations are a simple LEGv8-like processor and a 32-bit RISC-V-like processor; the paper also discusses a pipelined LEGv8 attempt but does not report all designs (Abstract, p.1).

Inference: for VeruLaw, the transferable idea is a staged agent pipeline with machine-readable architecture, dependency ordering, bounded repair, and human approval. The evidence does not establish formal functional correctness, because cocotb tests and Verilator linting can miss behaviors outside their cases.

## technique 1: blueprint as a machine-readable specification

Inference: What it is. The foundation is a JSON document containing global parameters, an optional SystemVerilog ISA package, and a hierarchy of components, interfaces, and dependencies. “This document serves as the formal, machine-readable specification, defining:” followed by global project parameters, an optional ISA package, and component interfaces/dependencies. (III-A, p.2)

Inference: When to use it. Use a blueprint before generating any module when consistency across dozens of files matters. The authors report that early blueprints omitted a formal ISA or contradicted parameterizations, so their refined prompt explicitly asks for a complete, non-contradictory blueprint (III-A, p.2).

Inference: How to do it. (1) Choose widths and shared constants such as data, address, instruction, opcode, register-address, and ALU-operation widths. (2) Write every component name and source file. (3) List each component's ports, direction, and width. (4) List dependencies as a directed graph. (5) Include one ISA definition shared by decoder, execution, memory, and tests. (6) Review the JSON before generation. The appendix's LEGv8 blueprint includes `DATA_WIDTH: 8`, `ADDRESS_WIDTH: 8`, `INSTRUCTION_WIDTH: 16`, `REG_ADDR_WIDTH: 3`, and `PC_INCREMENT_VAL: 2` (Appendix blueprint, p.19).

Inference: Verus form. Inference: turn the blueprint into Rust structs and enums, and define shared constants in one module. Use `requires` and `ensures` to state port-level and instruction-level contracts; prove that each implementation obeys the same ISA predicate. Inference: JSON itself is not a Verus proof, so a generator must preserve the schema and a proof layer must check semantic consistency.

Inference: Evidence and limits. The agent followed names, parameters, and port widths well for local modules, but the paper reports inconsistent ISA encodings and parameter propagation errors in integrated systems (Table II, p.4). The blueprint therefore constrains structure but does not guarantee behavior.

## technique 2: dependency-ordered generation with bounded self-correction

Inference: What it is. An orchestrator traverses the dependency graph. For each submodule it generates HDL and a cocotb test, runs Verilator lint, then runs functional tests; failures trigger an analysis/fix/approval loop. “The number of retry attempts is bounded by a configurable limit (e.g., three attempts per component).” (III-B, p.3)

Inference: How to do it. (1) Select a component whose dependencies are available. (2) Generate synthesizable SystemVerilog and its cocotb testbench. (3) Run Verilator in lint mode. (4) If lint fails, feed the log to the agent, obtain a candidate fix, get human approval, and retry. (5) If lint passes, run cocotb functional tests. (6) On a test failure, repeat error analysis, candidate fix, human approval, and re-verification. (7) After the retry limit, let the engineer edit HDL or tests directly (III-B, pp.3–4). (8) Integrate passing modules at the top level, applying the same lint, test, and approval gates to wiring.

Inference: Verus form. Inference: replace lint/test gates with `verus` verification of each Rust module's contract, and retain bounded repair as an agent orchestration policy. A generated patch should be accepted only after the verifier proves the changed function and dependent lemmas. Inference: an approval loop remains needed for specification errors because a proof can establish an incorrect contract.

Inference: Evidence and limits. The paper's tests use Verilator and cocotb; the workflow catches syntax, structural, and selected behavioral errors. It is not a soundness theorem and does not cover all input traces.

## technique 3: golden-model system verification

Inference: What it is. After integration, the agent creates a cycle-accurate cocotb testbench that compares the DUT with a Python ISA model. “For each executed instruction, the golden model predicts the expected state updates, which are then compared against the DUT’s debug outputs at every cycle.” (III-C, p.4)

Inference: How to do it. (1) Implement the ISA's architectural state in Python, including registers and memory. (2) Execute the same instruction stream in the DUT and model. (3) At every cycle, compare predicted state updates with debug outputs. (4) Use failures to locate pipeline hazards, bus arbitration errors, or timing mismatches. (5) Run the AI repair loop with mandatory human approval. (6) Only after passing system tests proceed to FPGA synthesis and physical debugging (III-C, p.4).

Inference: Verus form. Inference: encode the ISA state as a Rust model and prove a refinement lemma: one implementation step preserves the model relation and produces the model's next state. Use loop invariants for instruction traces and `proof fn` lemmas for arithmetic/bit-vector facts. Inference: this is stronger than testing only if the trace relation and all inputs are specified and proved; a finite cocotb suite alone is evidence, not proof.

Inference: Evidence and limits. The authors say top-level verification exposed issues invisible at unit level. They also report that both RISC-V and LEGv8 implementations passed cocotb tests while lacking preloaded instruction hex files; adding the file was necessary for standalone execution (Appendix B–C, pp.18–19). This is a concrete example of test success not implying deployable correctness.

## technique 4: root-cause taxonomy and prompt refinement

Inference: What it is. The study records recurring errors, their causes, and fixes, then changes prompts or shared artifacts. Table II lists inconsistent ISA implementations, parameter propagation errors, package-import mistakes, memory-interface width mismatches, and clock errors (Table II, p.4). Table III records a missing instruction-memory initialization file, cascading data-width mismatches, and inconsistent ISA encodings (Table III, p.5).

Inference: How to do it. (1) Preserve the failing log and affected files. (2) Classify the failure as specification inconsistency, propagation, interface, initialization, timing, or semantics. (3) Apply a structural remedy: a shared JSON ISA, centralized parameters, package stubs before integration, or explicit initialization files. (4) Re-run all affected tests and synthesis. (5) Add the remedy to the blueprint or prompt so later components inherit it. The appendix describes iterative cocotb reruns after each modification (Appendix B, p.18).

Inference: Verus form. Inference: classify failed proof obligations by missing precondition, wrong postcondition, arithmetic lemma, ownership/model mismatch, or unsupported code. Store reusable contracts and lemmas in shared modules, then rerun verification of dependents after a change. Inference: Verus's proof result does not validate hardware timing unless timing is modeled.

## what is proved, measured, and trusted

Inference: The paper reports qualitative success for two processors, FPGA synthesis of the LEGv8-like processor, and a cost statement: “a simple processor can be completed in less than a million tokens.” (VI-A, p.6) It also claims the agent automated “more than 80% of the repetitive coding and first-pass verification.” (VI-A, p.6) These denominators are the authors' project-level estimates, not a controlled benchmark across processors. No formal proof, exhaustive input denominator, test coverage percentage, or independent replication is supplied. Inference: trusted elements include the blueprint's ISA, cocotb test adequacy, simulator, synthesis tools, and human judgment.

Inference: threat to agent-written verified Rust is medium for workflow and high for assurance if copied directly. The semantic-cohesion failure shows that local generation can pass while cross-module meaning is wrong; Verus contracts and refinement proofs could address this only when the architecture and specification are themselves correct.

## what VL should not redo

Inference: The paper already demonstrates blueprint-driven decomposition, dependency-order generation, bounded repair with approval, golden-model comparison, and a practical failure taxonomy. Inference: VL should not spend effort reproducing cocotb-only claims as formal verification; it should test whether the same stages produce durable Verus contracts, whether repairs preserve old proofs, and which human approvals catch specification errors.

## techniques for the catalog

- Inference: blueprint specification: define shared parameters, ISA, interfaces, and dependencies in one machine-readable architecture
- Inference: staged generation gate: generate, lint, test, repair, approve, and retry each component with a bounded budget
- Inference: golden-model checking: compare cycle-level DUT state with an executable architectural model
- Inference: failure taxonomy: convert recurring integration failures into shared schemas, prompts, and regression checks
- Inference: architect-in-the-loop: retain human approval for specification, repairs, synthesis, and physical validation
Checked 2026-10-15 against paper mohammed2025architect: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
