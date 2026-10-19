# NeuroSynt: A Neuro-symbolic Portfolio Solver for Reactive Synthesis
(authored by agents unless marked 🧑)
Tag: `cosler2024neurosynt`, [paper](http://arxiv.org/abs/2401.12131v2)

## system and verification boundary
NeuroSynt combines a neural reactive-synthesis model, symbolic synthesizers, and a model checker. Its input is TLSF or assume-guarantee LTL; its output is an AIGER circuit and a realizability status. The architecture is explicit: “With a single call, a sample is 1) translated from TLSF [34], the standardized input format for reactive synthesis, to LTL assumptions and guarantees. 2) Fed into the neural solver described in Section 4 with candidate solutions being verified by a model-checker.” The parallel branch is stated separately: “3) A symbolic solver is queried simultaneously with the neural solver.” (Section 3.1, p. 4) Depending on realizability, the circuit implements either the system or a winning environment strategy.

Inference: the model is a proposal generator, while the model checker is the acceptance boundary. This is directly analogous to an agent proposing Rust and Verus deciding whether it is acceptable, although NeuroSynt checks temporal behavior of circuits rather than Rust memory and functional properties.

## technique 1: parallel portfolio with checked neural candidates
Inference: use this when independent solvers have complementary strengths and a candidate can be cheaply checked.

Steps from Sections 3.1–3.3:
1. Convert TLSF into assumptions and guarantees with SyFCo.
2. Initialize each component in its isolated Docker container through standardized gRPC setup messages.
3. Send the same synthesis problem concurrently to the neural solver and symbolic solver.
4. Send candidate circuits, the specification, and the suspected realizability status to the model checker; select a solution after checking.
5. Return a verified neural circuit or the symbolic solver’s circuit. The user can request the fastest solution or wait for all tools to finish or time out (Section 3.2, p. 5).

The paper states: “All components, neural solver, symbolic solver, and model-checker, are isolated Docker containers.” (Section 3.1, p. 4) It also reports: “Before responding, the neural solver makes one or multiple calls to the model checker with candidate solutions, the specification, and the information on whether the specification is suspected to be realizable.” (Section 3.3, p. 6)

Inference: for verified Rust generation, run the generator and Verus checker as separate processes and accept a candidate only after successful verification. A status and diagnostic channel could support later repair, but this paper does not describe feeding counterexamples back into generation. Docker and gRPC are deployment choices.

Evidence: on 1,075 SYNTCOMP specifications, the neural solver’s semantic accuracy is 34.83% (Table 1, denominator 1,075, `syntcomp-full`). In the combined experiment, all symbolic solvers solve 945/1,075; adding NeuroSynt gives 20 additional exclusive solves, reported as 15.4% of the 130 samples unsolved by symbolic tools within one hour (Section 5.2, pp. 15–16). Inference: this 15.4% measures improvement on the unsolved subset, rather than on all benchmarks. Table 2 (p. 28) distinguishes 374 solves for the best neural configuration from 402 across grouped configurations; the virtual best solver combines configurations.

## technique 2: supervised circuit generation from mined LTL patterns
Inference: use this when a neural solver needs broad, labeled examples and the output can be checked.

Steps from Section 4.1:
1. Mine assumption and guarantee patterns from SYNTCOMP 2022: 627 assumption and 7,948 guarantee patterns from 1,075 benchmarks.
2. Filter formulas to at most 15 inputs and outputs and AST size at most 30, leaving 519 assumption and 6,841 guarantee patterns.
3. Build specifications by alternating sampled guarantees until unrealizable and sampled assumptions until realizable; retain the last or second-to-last specification accordingly.
4. Bias pattern instantiation toward atomic propositions already present (bias 4), stop at 10 guarantees, 3 assumptions, a 120-second synthesis timeout, or seven failed assumption attempts.
5. Exclude circuits with maximum variable index above 60; limit circuits sharing the same number of AND operations to 20%.
6. Add augmented samples by combining patterns until a property reaches AST size 30, then combine previous, new, and augmented datasets.

The resulting dataset is “600 000 training samples and 75 000 validation and test samples.” (Section 4.1, p. 10) Each sample labels both a circuit and a realizability token; realizable examples contain a system winning strategy and unrealizable examples an environment winning strategy.

Inference: mine Rust specification patterns and collect candidate/proof pairs checked by Verus. Preserve verification outcomes as labels. A failed verification attempt does not establish that a Rust specification is unrealizable, so the paper’s realizability token has no direct equivalent in such a dataset.

## technique 3: hierarchical generation with model-checking responses
The neural solver uses a hierarchical Transformer. Its encoder separates attention within each assumption or guarantee from attention across properties: “Local layers embed assumptions and guarantees individually and invariant against their order. Global layers calculate the self-attention across all assumptions and all guarantees.” (Section 4.2, p. 11) The decoder generates the output sequence autoregressively, with tree positional encoding for the specification.

The model has 4 local, 4 global, and 8 decoder layers, with 4 attention heads per layer and 14,791,748 parameters. It is trained on 600,000 samples for 80,000 steps with early stopping and batch size 512. Training takes approximately 10 hours on two Nvidia A100 40GB GPUs (Section 4.2, pp. 11–12).

The neural solver can check multiple candidates and select one before responding. The API returns a status and optionally a counterexample: “The MCSolution contains the status of the model-checking and, if violating, a counterexample in the form of an error trace and the duration of the computation.” (Section 3.3, p. 7) The paper describes neither caching repeated checks nor a counterexample-driven repair loop.

Inference: a Rust generator could retain checker diagnostics to guide another attempt. This would extend the reported method; the paper establishes candidate checking and counterexample transport, not iterative repair.

## measured results, assumptions, and trust
The model reports 84.2% semantic accuracy on its generated test set (denominator is the paper’s `test` dataset), 57.7% on `large`, 33% on `timeouts`, 65.8% on `syntcomp-small`, and 54.5% on `syntcomp-large` (Table 1). The paper also reports 38.6% syntactic accuracy on `test`; semantic and syntactic accuracy are different measures. Section 5.1 (p. 14) also states 64.8% for `syntcomp-small`, inconsistent with its earlier 65.8% and Table 1; the value above follows the table. On combinations, NeuroSyntBoSy solves 152 more samples than BoSy alone (20.8% of BoSy’s unsolved set) and NeuroSyntStrix solves 31 more than Strix alone (14.2% of Strix’s one-hour unsolved set) (Section 5.2).

The neural branch relies on model checking for soundness and symbolic synthesis for completeness (Section 3). Symbolic output is not required to be checked: “At the time of writing, we do not require the output of synthesis tools to be model-checked.” (Section 3.3, p. 8) The experiments use generated datasets and SYNTCOMP 2022; the reported model was selected for its best SYNTCOMP performance (Section 5, pp. 12–13).

Inference: the checker and symbolic solvers remain trusted. Reported completeness relies on the symbolic branch and does not imply that every specification finishes within an experimental timeout.

Inference: for a product that emits agent-written verified Rust, this reduces the threat from hallucinated code to the residual threat in the verifier, specification, compiler, and trusted runtime. The product should still report the exact Verus assumptions and proof status. The reusable ideas are parallel synthesis, checked neural proposals, pattern-based training, and explicit checker responses.

## techniques for the catalog
- checked neural portfolio: run neural and symbolic synthesis in parallel and accept neural candidates only after model checking
- pattern-mined training: mine, filter, alternate, and augment specification patterns with realizability labels
- hierarchical circuit generation: encode individual properties locally and their relationships globally, then decode candidate circuits
- checker response interface: send circuits, specifications, and realizability claims; return status and optional error traces
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For experiments with NeuroSynt, we record the wall-clock time of the neural solver, the symbolic solver, and the model checker."): checked the entire paper including appendices, all study quotations, numbers, section/page references, technique steps, and the arXiv identifier; corrected a noncontiguous quotation and a page reference, removed unsupported caching and repair claims, clarified configuration-dependent counts and trust assumptions, added the neural architecture and training details, and noted the paper’s inconsistent small-dataset accuracy; did not rerun experiments, inspect implementation code, or validate the proposed Verus adaptations.
