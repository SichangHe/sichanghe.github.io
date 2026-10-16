# NeuroSynt: A Neuro-symbolic Portfolio Solver for Reactive Synthesis
(authored by agents unless marked 🧑)
Tag: `cosler2024neurosynt`, [paper](http://arxiv.org/abs/2401.12131v2)

## system and verification boundary
NeuroSynt combines a neural reactive-synthesis model, symbolic synthesizers, and a model checker. Its input is TLSF or assume-guarantee LTL; its output is an AIGER circuit and a realizability status. The architecture is explicit: “With a single call, a sample is 1) translated from TLSF [34], the standardized input format for reactive synthesis, to LTL assumptions and guarantees. 2) Fed into the neural solver described in Section 4 with candidate solutions being verified by a model-checker. 3) A symbolic solver is queried simultaneously with the neural solver.” (Section 3.1, p. 4)

Inference: the model is a proposal generator, while the model checker is the acceptance boundary. This is directly analogous to an agent proposing Rust and Verus deciding whether it is acceptable, although NeuroSynt checks temporal behavior of circuits rather than Rust memory and functional properties.

## technique 1: parallel portfolio with checked neural candidates
Use this when independent solvers have complementary strengths and a candidate can be cheaply checked.

Steps from Sections 3.1–3.3:
1. Convert TLSF into assumptions and guarantees with SyFCo.
2. Initialize each component in its isolated Docker container through standardized gRPC setup messages.
3. Send the same synthesis problem concurrently to the neural solver and symbolic solver.
4. For every neural candidate, send the circuit, specification, and suspected realizability status to the model checker.
5. Discard candidates whose model-checking status is false; return a verified neural circuit or the symbolic solver’s circuit, according to the configured “fastest” or “wait for all” policy.

The paper states: “All components, neural solver, symbolic solver, and model-checker, are isolated Docker containers.” (Section 3.1, p. 5) It also reports: “Before responding, the neural solver makes one or multiple calls to the model checker with candidate solutions, the specification, and the information on whether the specification is suspected to be realizable.” (Section 3.3, p. 6)

Verus form (Inference): run the LLM/Rust generator and Verus checker as separate processes; treat only a candidate that exits with a successful Verus proof as accepted. Preserve the paper’s explicit status and counterexample channel so failed proofs feed back into generation. Docker and gRPC are deployment choices, not Verus constructs.

Evidence: on 1,075 SYNTCOMP specifications, the neural solver’s semantic accuracy is 34.83% (Table 1, denominator 1,075, `syntcomp-full`). In the combined experiment, all symbolic solvers solve 945/1,075; adding NeuroSynt gives 20 additional exclusive solves, reported as 15.4% of the 130 samples unsolved by symbolic tools within one hour (Section 5.2, pp. 15–16). The paper’s percentages and denominators should be retained because “15.4%” is not a fraction of all 1,075 benchmarks.

## technique 2: supervised circuit generation from mined LTL patterns
Use this when a neural solver needs broad, labeled examples and the output has a decidable checker.

Steps from Section 4.1:
1. Mine assumption and guarantee patterns from SYNTCOMP 2022: 627 assumption and 7,948 guarantee patterns from 1,075 benchmarks.
2. Filter formulas to at most 15 inputs and outputs and AST size at most 30, leaving 519 assumption and 6,841 guarantee patterns.
3. Build specifications by alternating sampled guarantees until unrealizable and sampled assumptions until realizable; retain the last or second-to-last specification accordingly.
4. Bias pattern instantiation toward atomic propositions already present (bias 4), stop at 10 guarantees, 3 assumptions, a 120-second synthesis timeout, or seven failed assumption attempts.
5. Filter circuits with variable index above 60 and cap circuits sharing an AND-gate count at 20%.
6. Add augmented samples by combining patterns until a property reaches AST size 30, then combine previous, new, and augmented datasets.

The resulting dataset is “600 000 training samples and 75 000 validation and test samples.” (Section 4.1, p. 10) Each sample labels both a circuit and a realizability token; realizable examples contain a system winning strategy and unrealizable examples an environment winning strategy.

Verus form (Inference): generate verified Rust training pairs from specifications and proof-producing solvers, retaining a Boolean label for whether Verus can prove the candidate. Pattern mining can seed prompts and tests, but the label must be a proof result rather than a neural confidence.

## technique 3: counterexample-aware model checking and caching
The neural solver can generate multiple candidates and select one after checking. The API returns either a status or a counterexample. A practical optimization is to cache repeated candidate responses and avoid checking the same candidate again; the paper describes this mechanism in its solver implementation and reports model-checking time separately.

Inference: in VL, cache `(candidate Rust, specification, toolchain version)` to prevent repeated Verus runs, but invalidate the cache when dependencies or assumptions change. Counterexamples should be fed back verbatim to the generator because they identify a concrete failed obligation.

## measured results, assumptions, and trust
The model reports 84.2% semantic accuracy on its generated test set (denominator is the paper’s `test` dataset), 57.7% on `large`, 33% on `timeouts`, 65.8% on `syntcomp-small`, and 54.5% on `syntcomp-large` (Table 1). The paper also reports 38.6% syntactic accuracy on `test`; semantic and syntactic accuracy are different measures. On combinations, NeuroSyntBoSy solves 152 more samples than BoSy alone (20.8% of BoSy’s unsolved set) and NeuroSyntStrix solves 31 more than Strix alone (14.2% of Strix’s one-hour unsolved set) (Section 5.2).

The checker and symbolic solvers remain trusted. The neural model is not trusted to establish correctness; its candidate is accepted only after model checking. The evaluation uses generated data and SYNTCOMP; it does not establish correctness for arbitrary specifications, and performance depends on timeouts, model choice, and the selected symbolic solver.

Inference: for a product that emits agent-written verified Rust, this reduces the threat from hallucinated code to the residual threat in the verifier, specification, compiler, and trusted runtime. The product should still report the exact Verus assumptions and proof status. Existing work already demonstrates the portfolio pattern, candidate rejection, counterexample transport, and denominator-sensitive evaluation; VL should reuse those ideas rather than claim them as new.

## techniques for the catalog
- checked neural portfolio: run neural and symbolic synthesis in parallel and accept only model-checked candidates
- pattern-mined training: mine, filter, alternate, and augment specification patterns with realizability labels
- counterexample loop: send candidate circuits to a checker, retain status/counterexamples, and cache repeated checks
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
