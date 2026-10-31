# PRO-V-R1: Reasoning Enhanced Programming Agent for RTL Verification
(authored by agents unless marked 🧑)
Tag: `zhao2025prov`, [paper](http://arxiv.org/abs/2506.12200v4)

## system and verification target
PRO-V-R1 generates RTL testbenches with programmatic tools and trains verification agents from simulation outcomes. The authors motivate the design with the claim, “Register-Transfer Level (RTL) verification is a primary bottleneck consuming 60-70% of development time.” (Abstract, p. 1). Its evaluation measures both passing a known-good design and detecting faults in generated RTL mutants (Section 4.1, p. 5). Inference: compilation alone cannot establish either property.

The system has three specialized roles: “The architecture is composed of three distinct agentic roles: the Testcase Generator, the FRM Generator, and the Judge.” (Section 3.1, p. 2).

## technique: program-generated stimuli
What it is: have the model reason about a test scenario, then execute a short Python script to construct input vectors instead of emitting long bit strings directly. This targets width-sensitive, multi-cycle RTL stimuli (Section 3.1, p. 3).

Steps: (1) provide the RTL specification; (2) have the Testcase Generator reason about the desired scenario; (3) execute Python through the Code Interpreter; (4) produce JSON input signals; (5) pass those signals to the FRM Generator. The paper says, “It then executes a short Python script via the Code Interpreter to programmatically construct the required input sequences.” (Section 3.1, p. 3).

Verus form. Inference: model generated stimuli as a finite `Seq` or `Vec` of inputs, with a `spec fn` describing width and cycle constraints. Use `requires` for legal widths and `ensures` to state that every generated vector lies in range; prove a generator helper with `proof fn`. Inference: Verus can verify the generator's arithmetic properties but cannot certify adequate RTL fault coverage without a DUT model.

## technique: functional reference model and testbench synthesis
The FRM Generator consumes JSON inputs and the RTL specification to produce `testbench.json` containing cycle-aligned expected outputs. It samples N Python functional reference models (FRMs) and executes them with the Code Interpreter: “These scripts are executed by the Code Interpreter to compute 𝑁 sets of expected outputs for the step 1 testcases.” (Section 3.1, p. 3).

Apply it: (1) generate input JSON; (2) sample N Python FRMs; (3) execute each FRM; (4) pair inputs with cycle-aligned expected outputs; (5) select and refine a candidate through the Judge; (6) pass the final testbench to the Simulation Driver, which compiles and runs Verilator and compares DUT results with expected outputs (Section 3.1, p. 3). Inference: an incorrect FRM can make a faulty DUT appear correct.

Verus form. Inference: write a pure `spec fn` reference relation for each cycle and state `ensures` that the executable testbench oracle agrees with it. Ghost state can record prior inputs and outputs; a loop `invariant` can preserve cycle alignment. Python execution needs a separately checked connection to this reference relation.

## technique: majority vote and self-correction
The Judge receives N candidate artifacts, selects the most consistent by majority vote, validates the selected outputs, and applies targeted edits when errors occur: “The Judge then validates the selected outputs; if errors are detected, it performs targeted corrections by invoking the Testbench Edit Tool.” (Section 3.1, p. 3). The editor supports add, replace, and remove operations, using a JSON Pointer to identify the field to modify (Table 1, p. 3).

Steps: (1) sample N candidates; (2) majority-select; (3) validate selected outputs; (4) add, replace, or remove testbench entries to correct errors; (5) continue until validation or budget exhaustion; (6) run the final testbench through Verilator (Section 3.1 and Figure 3(c), p. 3). The efficiency analysis reports N = 5 programs in parallel per iteration, typically 1–2 self-consistency iterations, and a maximum of 3 (Section 4.3, p. 6).

Verus form. Inference: represent candidate testbenches as ghost sequences, prove that edits preserve shape and cycle bounds, and state these guarantees with `ensures` on an editor function. Majority voting does not prove semantic correctness; the DUT/reference relation still needs a contract.

## technique: simulation-validated SFT data
The training pipeline uses verified RTL datasets and teacher-generated trajectories for the Testcase Generator and FRM Generator. The paper states, “For each problem, we use its golden RTL design and prompt a SOTA ‘teacher’ model to generate trajectories for two agent roles: the Testcase Generator and the FRM Generator.” (Section 3.2, p. 4). A trace is retained only when its testcase/FRM combination forms a runnable harness and the golden RTL and FRM simulation outputs match for all generated testcases (Equation 1 and Figure 4, p. 4). The SFT objective trains on prompts paired with reasoning traces and code (Equation 2, p. 4).

Steps: (1) collect verified RTL problem/specification pairs; (2) have a teacher generate testcase and FRM trajectories; (3) simulate the RTL and FRM on the same testcases; (4) retain matching, runnable traces; (5) fine-tune the base model. Section 4.1 identifies DeepSeek-V3.2 as the teacher and Qwen3-8B as the base model (p. 5).

## technique: structured reinforcement learning from tool rewards
After SFT, PRO-V-R1 uses Group Relative Policy Optimization (GRPO): “We utilize Group Relative Policy Optimization (GRPO) [5, 27] to fine-tune the SFT model through direct interaction with the verification environment.” (Section 3.2, p. 4). Both the Testcase Generator and FRM Generator receive a weighted format reward for syntactically correct tool calls plus a distinct functional reward. The testcase functional reward is 1 when the testcase and FRM programs are syntactically valid and can compile and simulate together, otherwise 0. The FRM functional reward is 1 only when all testcases pass the golden-RTL/FRM matching filter; it requires a runnable harness. Rewards are normalized separately per agent to compute group-relative advantages, and the objective sums the two agents' clipped-ratio losses (Equations 3–6, pp. 4–5).

Verus form.

## evidence and limits
Table 2 reports VerilogEval-v2 Eval1 functional correctness of 57.7% and Eval2-100 full-mutant robustness of 34.0% for PRO-V-R1-8B with PRO-V sys (p. 5). Eval1 measures the fraction of testbenches compiling and passing the golden RTL; Eval2-100 measures the fraction of problems whose generated testbench verdict matches the reference verdict on all generated mutants. Section 4.1 uses 10 DeepSeek-V3.2-generated RTL mutants per problem (p. 5). The paper defines the robustness thresholds as follows: “This metric reports the fraction of problems where the generated TB’s verdict (pass/fail) matches the reference TB’s verdict on at least 80%, 90%, and 100% of the mutants, respectively.” (Section 4.1, p. 5).

Table 2 gives Eval0 as 94.8%, whereas Table 3 and Section 4.3 give 94.9% (pp. 5–6). The CorrectBench Qwen3-8B baseline has Eval1 25.6% and Eval2-100 21.8% in Table 3; the abstract instead states 25.7% for its functional-correctness comparison. Section 4.3 reports mean latency of 91.2 seconds versus 805.4 seconds for CorrectBench with Qwen3-8B, an 8.8× speedup (p. 6). All training and evaluation use a single-node NVIDIA H100 setup (Section 4.1, p. 5). The efficiency paragraph reports a median of 48.3 seconds, but Figure 6 labels it 40.5 seconds (p. 6).

Inference: simulation results depend on Verilator, the Python FRMs, reference testbench verdicts, and generated mutants. Agreement on these tests does not prove behavior for untested inputs or establish that generated mutants represent real faults. Inference: the technique transfers most directly to test-oracle synthesis for agent-written verified Rust; a successful proof of an incomplete contract can still miss a requirement.

## techniques for the catalog
- program-generated stimuli — execute code to construct width-sensitive, multi-cycle input vectors
- functional reference modeling — generate cycle-aligned expected outputs and compare DUT simulation
- majority-vote self-correction — select, validate, and edit candidate artifacts
- simulation-filtered SFT — train on runnable trajectories whose RTL and FRM simulation outputs match
- structured tool-reward RL — assign each agent format and functional rewards
