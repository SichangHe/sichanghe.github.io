# PRO-V-R1: Reasoning Enhanced Programming Agent for RTL Verification
(authored by agents unless marked 🧑)
Tag: `zhao2025prov`, [paper](http://arxiv.org/abs/2506.12200v4)

## system and verification target
PRO-V-R1 is an open agent that generates RTL testbenches with programmatic tools, then trains the agent from simulation outcomes. The authors motivate the design because RTL verification consumes 60–70% of development time (Abstract, p. 1). Its target is a testbench that both passes a known-good design and detects injected faults; compiling a testbench alone is therefore insufficient.

The system has three specialized roles: Testcase Generator, FRM Generator, and Judge (Section 3.1, p. 4). The paper states, “The architecture is composed of three distinct agentic roles: the Testcase Generator, the FRM Generator, and the Judge.” (Section 3.1, p. 4)

## technique: program-generated stimuli
What it is: have the model reason about a test scenario, then execute a short Python script to construct precise input vectors instead of emitting long bit strings directly. This handles width-sensitive, multi-cycle RTL stimuli (Section 3.1, p. 4).

Steps: (1) provide the RTL specification; (2) ask the Testcase Generator to reason about desired coverage; (3) call the Code Interpreter with Python; (4) produce JSON input signals; (5) pass those signals to the next agent. The paper says, “Instead of attempting to directly emit long bit strings, the agent first reasons about the desired test scenario.” (Section 3.1, p. 4)

Verus form. Inference: model generated stimuli as a finite `Seq` or `Vec` of inputs, with a `spec fn` describing width and cycle constraints. Use `requires` for legal widths and `ensures` to state that every generated vector lies in range; prove a generator helper with `proof fn`. Inference: Verus can verify the generator's arithmetic properties but cannot certify that the vectors provide adequate RTL fault coverage without a DUT model.

## technique: functional reference model and testbench synthesis
The FRM Generator consumes JSON inputs and the RTL specification to produce `testbench.json` containing cycle-aligned expected outputs (Section 3.1, p. 4). It samples N Python functional reference models, executes each with the Code Interpreter, and uses them as behavioral oracles. The simulation driver later compares DUT outputs with those expected outputs.

Apply it: (1) generate input JSON; (2) sample N Python FRMs; (3) execute each FRM; (4) pair expected outputs with cycle-aligned vectors; (5) serialize the testbench; (6) compile and simulate the DUT. Inference: use a reference model only when its semantics are independently checked; an incorrect FRM can make a faulty DUT appear correct.

Verus form. Inference: write a pure `spec fn` reference relation for each cycle and state `ensures` that the executable testbench oracle agrees with it. Ghost state can record prior inputs and outputs; loop `invariant` preserves cycle alignment. The Python tool remains outside Verus's trusted proof unless its result is imported as checked data.

## technique: majority vote and self-correction
The Judge receives N candidate artifacts, selects the most consistent by majority vote, validates it, and applies targeted edits through an editor tool when errors occur (Section 3.1, p. 4). The paper's tool API supports add, replace, and remove operations on JSON pointers (Table 1, p. 4). The loop repeats until validation succeeds or the budget is exhausted, after which Verilator runs the final testbench.

Steps: (1) sample N candidates; (2) majority-select; (3) validate selected outputs; (4) edit only failing vectors; (5) repeat up to the iteration budget; (6) run cycle-accurate simulation. Figure 3(c) reports typically 1–2 self-consistency iterations and a maximum of 3 in the efficiency analysis (Section 4.3, p. 7).

Verus form. Inference: represent candidate testbenches as immutable ghost sequences, prove that an edit preserves JSON shape and cycle bounds, and use `ensures` on an editor function. A majority vote is an executable policy, not a proof of semantic correctness; the final DUT/refinement relation still needs a contract.

## technique: simulation-validated SFT data
The training pipeline uses verified RTL datasets and teacher-generated trajectories. Candidate testcase and FRM programs are simulated; only trajectories whose outputs match are retained in the SFT dataset (Section 3.2, Figure 4, p. 5). The SFT objective then trains on prompt, reasoning trace, and code pairs.

Steps: (1) collect RTL problem/specification pairs; (2) use a teacher model to generate trajectories; (3) execute candidate FRMs and RTL simulations; (4) filter to matching outputs; (5) fine-tune the base model on retained traces. Inference: for VL, analogous data should contain Verus source plus successful verifier output, but a successful build must be paired with a semantic test oracle to avoid learning weakened contracts.

## technique: structured reinforcement learning from tool rewards
After SFT, PRO-V-R1 uses GRPO with agent-specific rewards. Testcase generation receives a format reward for syntactic validity; FRM generation receives a functional reward when all testcases pass; group-relative advantages update each agent (Section 3.2, Figure 4, pp. 5–6). This converts sparse simulation outcomes into denser credit assignment.

Verus form. Inference: define reward events from verifier compilation, contract checks, and model-based tests; retain the Verus proof artifact as the acceptance gate. Inference: reward shaping can optimize proxy properties, so VL must separately measure semantic coverage and adversarial counterexamples.

## evidence and limits
On VerilogEval-v2, PRO-V-R1-8B with PRO-V reports Eval1 functional correctness 57.7% and Eval2-100 full-mutant robustness 34.0%; the denominator is the benchmark's test problems, and Eval2-100 requires matching the reference verdict on 100% of generated mutants (Section 4.1, p. 6; Table 2, p. 6). The paper reports Eval0 94.9%, but passing compilation does not establish fault detection. It reports mean latency 91.2 seconds versus 805.4 seconds for the Qwen3-8B CorrectBench baseline, an 8.8× comparison under the paper's single-node H100 setup (Section 4.3, p. 7).

The authors' conclusion is, “Our method replaces this by generating 𝑁 = 5 Python programs in parallel per iteration and typically succeeding within 1-2 self-consistency iterations (max 3)” (Section 4.3, p. 7). Trusted components include Verilator, the RTL simulator, Python reference models, mutant generation, benchmark labels, and the assumption that generated mutants represent real faults. Inference: the threat to agent-written verified Rust is high for test-oracle synthesis and medium for proof search; a proof can pass while an inadequate test or reference model misses a requirement.

## techniques for the catalog
- program-generated stimuli — execute code to construct precise, coverage-driven input vectors
- functional reference modeling — generate cycle-aligned expected outputs and compare DUT simulation
- majority-vote self-correction — select, validate, and surgically edit candidate artifacts
- simulation-filtered SFT — train only on trajectories whose tool executions match
- structured tool-reward RL — assign agent-specific rewards from format and functional outcomes
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
