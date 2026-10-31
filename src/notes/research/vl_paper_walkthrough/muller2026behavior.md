# LLM-enabled Behavior Driven Development Workflow for Formally Verified Hardware Designs
(authored by agents unless marked 🧑)
Tag: `muller2026behavior`, [paper](https://arxiv.org/abs/2609.15318)

## scope and contributions

The paper proposes an integrated hardware workflow with three specialized agents: a Gherkin specification agent, a Verilog RTL agent, and an SVA formal-verification agent. The input is a design requirement in plain text, Markdown, or PDF. The Gherkin agent emits a complete formal-verification Gherkin specification; the Verilog agent emits RTL; the SVA agent emits SystemVerilog Assertions (SVAs). A formal testbench combines RTL and SVAs and is run by a formal property verification (FPV) tool. The paper states: “Our proposed LLM-enabled behavior driven hardware development workflow is presented in Figure 1.” (Section 3, p.3)

The paper evaluates two paths: requirements → FV Gherkin specification → RTL implementation, and requirements → FV Gherkin specification → SVAs. It uses Python, Cadence Xcelium for simulation, Cadence JasperGold for FPV, Claude Sonnet 5 for workflow and applicable baselines, and pass@1 scoring. “All evaluations are strictly pass@1 [7] and metrics are retrieved using the aforementioned EDA tools.” (Section 4, p.7)

## technique 1: formal-verification Gherkin scenarios

What it is. A Formal Verification Gherkin Scenario is a controlled-natural-language scenario whose values are symbolic enough to describe all input cases. Definition 1 imposes three requirements: no signal value may be represented implicitly by example placeholders (R1); every post-condition signal value must be symbolic over pre-condition signals or a constant (R2); and the scenario must contain no example table (R3). The paper explains why: “In the FV Gherkin Scenario, all four outputs are represented by symbolic values (R2).” (Example 1, Section 3.1, p.5)

When to use it. Use the format when natural-language requirements must feed both generated implementation and formal properties. Inference: it replaces finite test examples with symbolic behavior that covers the whole input range. Constants remain available for cases such as reset; otherwise outputs are expressed over the complete value range admitted after the trigger condition (Section 3.1, p.4).

How to do it.

1. Translate the unstructured design requirements into scenarios, using signal names extracted from them (Section 3.1, p.3-4).
2. Generate FV scenarios whose pre-condition names symbolic operands rather than concrete examples. In the paper's ALU example, “And I have operand A” and “And I have operand B” provide symbolic inputs, while the opcode is `0000` (Listing 2, p.4).
3. Express each post-condition as a symbolic relation. The example sets `result` to `A + B`, makes `zero` conditional on `A + B = 0`, and defines overflow and negative from sign bits (Listing 2, p.4).
4. Ask a formal-compliance judge to check Definition 1 and return feedback, and ask a coverage judge to score whether all design requirements are represented and identify holes (Section 3.1, p.4).
5. Refine by adding, removing, or modifying scenarios, then commit when judge feedback indicates convergence (Section 3.1, p.4).

Evidence. The paper gives the complete ADD scenario in Listing 2 (p.4) and says of the symbolic flag definitions: “This symbolic definition circumvents the need for an example table (R3).” (Example 1, p.5) In the RTL path (Table 4, p.8), the workflow obtains valid syntax on 154/156 (98.7%) and a functional pass (testbench pass at 100%) on 139/156 (89.1%) of VerilogEval v2 designs; on ChipBench it obtains syntax 43/45 (95.6%) and functional 14/45 (31.1%). These are pass@1 results with Claude Sonnet 5, and the denominators are benchmark designs. The paper itself notes that on VerilogEval v2 the functional rate is close to its VerilogCoder re-score (90.4%), and that on ChipBench it equals the MAGE re-run on Sonnet-5 (14/45). Inference: no ablation isolating the FV Gherkin step is reported, so the results do not show how much of the outcome the specification format contributes.

Failure and assumptions. The three requirements assume signal names and behavior can be made explicit in controlled text. The coverage judge is itself an LLM judge, so its score is feedback rather than a proof. The paper does not report a soundness theorem for the translation from natural language to FV Gherkin.

Inference: In Verus, the closest analogue is a `requires`/`ensures` contract over symbolic arguments in a Rust function or a `spec fn`; each scenario becomes a contract case, with `assert` or a proof function connecting arithmetic conditions. Gherkin syntax, SVA temporal operators, and example-table restrictions do not carry over directly. Inference: symbolic operands correspond to unconstrained function parameters, while reset and clock behavior need explicit state-machine modeling rather than a direct Verus event annotation.

## technique 2: agentic RTL generation with deterministic tool feedback

What it is. The Verilog agent receives the FV Gherkin specification and produces an RTL implementation. It may generate or refine Verilog, lint it with an EDA tool, and simulate it against a reference testbench. “The Verilog agent converges and commits the RTL implementation based on deterministic tool feedback from Lint Verilog and Simulate RTL calls.” (Section 3.2, p.6)

How to do it.

1. Generate Verilog from the Gherkin specification, pinned to signal declarations (the paper says the declarations are taken from the design requirements) (Section 3.2, p.5).
2. Generate Verilog implementing every scenario; the ALU listing maps opcode `0000` to addition, computes flags, and registers outputs on the rising edge (Listing 3, p.5).
3. Run lint and return syntax diagnostics to the agent (Section 3.2, p.5-6).
4. If a reference testbench is available, simulate and return semantic mismatches; refine against feedback, and commit based on deterministic tool feedback (Section 3.2, p.6).

Evidence. The VerilogEval v2 and ChipBench fractions above measure the resulting RTL path. The paper reports a 2.48× functional-pass improvement over its CodeV re-run on VerilogEval v2 (Section 4.1.2, p.8); this ratio compares the workflow's 139/156 (89.1%) with CodeV's 56/156 (35.9%). On the same benchmark the MAGE (Sonnet-5) re-run scores 119/156 (76.3%) with 28 designs erroring, and the VerilogCoder re-score is 141/156 (90.4%).

Inference: A Verus implementation can use the generated Rust function as executable code and a separate proof function to establish its postcondition; `assert` statements and contracts replace lint-plus-simulation feedback for functional properties. Inference: deterministic compiler and verifier diagnostics can drive refinement, but Verus cannot execute arbitrary hardware clock semantics without a chosen state-transition model.

## technique 3: SVA generation and formal property checking

What it is. The SVA agent translates FV Gherkin scenarios into assertions, then lints and checks coverage with an FPV tool. The generated ADD property uses `@(posedge clk)`, `disable iff (rst)`, an overlapping implication, and `##1` to connect the trigger to the next-cycle outputs (Listing 4, p.6). The paper states: “All post-conditions of the FV Gherkin Scenario are directly mapped in the consequent and connected with logical conjunctions &&.” (Example 3, p.6)

How to do it.

1. Read the FV Gherkin specification and signal declarations from generated or golden RTL (Section 3.3, p.6).
2. Generate one or more SVAs, mapping the pre-condition to the antecedent and post-conditions to the consequent (Section 3.3, p.6).
3. Lint and elaborate the assertions with reference RTL; refine on lint errors (Section 3.3, p.6).
4. Run FPV coverage and inspect failing properties or coverage holes; refine and commit when deterministic tool feedback is satisfactory (Section 3.3, p.6).
5. Merge assertions and the RTL implementation into a formal testbench and execute it with the FPV tool, JasperGold in the experiments (Section 3.3, p.7; Section 4, p.7).

Evidence. The SVA path is evaluated in Section 4.2 (Table 7, p.9) on AssertLLM and a 23-design subset of AssertLLM2, with Claude Sonnet 5 and JasperGold. Metrics: Proof (percentage of generated assertions proven), COI (cone of influence coverage), and Formal (coverage computed by JasperGold). On AssertLLM the workflow gets Proof 43.2%, COI 96.8%, Formal 44.1%, against AssertionForge (Sonnet-5, re-run) 19.0%, 63.0%, 36.7%. On the AssertLLM2 subset it gets 43.1%, 92.9%, 39.5%, against AssertLLM2 Plain (Sonnet-5, re-run) 67.8%, 99.9%, 15.5%. The paper reports a 2.3x proof-rate gain over AssertionForge on AssertLLM and a 2.54x formal-coverage gain over AssertLLM2 Plain. On AssertLLM2 the baseline's proof and COI numbers are higher than the workflow's. Inference: these metrics measure assertions against golden RTL, not whether the assertions capture the natural-language requirements.

Inference: In Verus, a temporal SVA property must be decomposed into state fields and transition invariants. A `requires` clause captures the trigger condition, `ensures` captures a post-state relation, and a `proof fn` can establish the relation for one transition; loop invariants or inductive lemmas are needed for repeated cycles. Inference: `disable iff` and `##1` have no direct Verus construct, so their meaning must be represented in the transition relation.

## what is proved, measured, and trusted

Measured: syntax and functional pass rates for generated RTL, and proof, COI and formal coverage for generated SVAs, all pass@1, using Claude Sonnet 5 and Cadence tools (Section 4, p.7). In the SVA path, assertions are scored against a golden RTL provided by the benchmark (Section 4.2.1, p.9). Inference, not stated in the paper, on what is trusted: the input requirements, LLM-generated Gherkin, LLM judges, signal extraction, EDA tools, and the interpretation that a passing assertion set covers the intended requirements. The paper presents no formal proof that the LLM translation preserves requirements.

## techniques for the catalog

- FV Gherkin symbolic scenarios: express complete behavior with symbolic pre- and post-conditions and no example tables
- deterministic agent refinement: iterate generated RTL or assertions using lint, simulation, and FPV feedback
- Gherkin-to-SVA mapping: translate scenario triggers and symbolic post-conditions into temporal assertions and check them with an FPV tool
