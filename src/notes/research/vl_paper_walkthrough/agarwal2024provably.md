# Towards provably performant congestion control
(authored by agents unless marked 🧑)
Tag: `agarwal2024provably`, [paper](https://www.usenix.org/conference/nsdi24/presentation/agarwal-anup)

## central idea

The paper designs congestion-control algorithms (CCAs) with guarantees under nondeterministic network models. It introduces beliefs: the set of paths and latest states consistent with the history of actions and feedback. “The belief set (or beliefs) gives us a way to model all CCAs and formally reason about them.” (Section 1, p. 951). A CCA’s sending rate can then be synthesized as a function of beliefs.

The design scope is single-flow, infinite-backlog traffic: “In this paper, we only focus on the single-flow case with an infinite backlog of data to transmit when designing provably performant CCAs for S1 and S2.” The authors also state: “Our current formal framework gives no guarantees or predictions on the outcome of multi-flow experiments.” (Section 2, p. 953). Inference: guarantees concern the modeled networks; applying them to deployments requires checking the model assumptions.

## technique 1: invert a network model into beliefs

Represent a network as constraints relating path parameters, state, CCA actions, and feedback. For CBR-delay, a path is `<C,Rm,D,β>` and state is queue and in-flight bytes. Fix the observed send/ack/loss history in the model constraints; the remaining feasible tuples are the belief set (Section 4, p. 954). Compute closed-form bounds such as `CL, CU` for link rate and `qdelL, qdelU` for queueing delay. For example, `qdelU=RTT−Rm` and `qdelL=max(0,RTT−Rm−D)` (Section 5.1.1, p. 956).

Use over-approximations when exact beliefs are too complex: include every path that could explain observations, even extra paths. This preserves soundness because the CCA must work on more possibilities, but can lose completeness and produce “no solution in template” despite a solution existing (Section 5.1, p. 956).

Inference: In Verus, beliefs can be ghost sets or bounded sequences of parameter tuples, with lemmas showing each observation preserves inclusion. Quantified set reasoning is deterministic; the nondeterministic network and SMT feasibility checks remain trusted models unless separately certified.

## technique 2: belief sufficiency and impossibility

Prove that beliefs contain sufficient information for action choice. Theorem 4.1 states: “If there exists a deterministic CCA that ensures a performance property on a network model, then, there exists a belief-based CCA that ensures the performance property on the model.” Its scope is explicit: “For this theorem, we assume that the performance property is specified as a boolean valued function over a belief set and CCA’s action on that set.” (Section 4, p. 955). The proof views CCA and network as a zero-sum game: beliefs summarize the game history, determine feasible moves, and update after each move. If no action over a valid belief set can ensure such a property, no deterministic CCA can ensure it under that model. Appendix A explicitly excludes arbitrary properties of the entire execution (p. 969).

Inference: A Verus formalization could represent belief membership and prove that observations update beliefs correctly. This alone would not prove sufficiency; it would also need the construction in Appendix A, which merges game-tree nodes with equal beliefs and retains one CCA action per merged node (pp. 967–969).

## technique 3: CEGIS synthesis with SMT

Use Counterexample-Guided Inductive Synthesis (CEGIS). The generator chooses a candidate from a finite template; the verifier searches for a network path, initial state, and nondeterministic choices that violate the property. If found, add constraints excluding candidates that make the same rate choice on that counterexample. Repeat until a candidate has no counterexample or the search space is exhausted (Section 5, p. 955).

CCmatic encodes templates, network models, and performance properties in Z3 linear-real-arithmetic constraints: “We implement the generator and verifier using the constraint solver Z3 [47], by encoding the search inputs (i.e., search space, network models, and performance properties) into SMT (Satisfiability Modulo Theories) constraints in the theory of linear real arithmetic (LRA) [38].” (Section 5, p. 955). Its template uses piecewise-linear `if` conditions over belief bounds and expressions for sending rate; holes range over a small finite coefficient set (Listing 1, p. 956). It enforces a positive minimum rate `MSS/Rm`. Synthesis happens offline; the resulting CCA can be implemented in Linux or QUIC (Section 5, p. 955).

Synthesis alone does not establish the final performance guarantees: “The synthesis invariant is not a sufficient proof. Hence, after synthesis, we build proof lemmas for the solution CCAs.” (Section 5.2, p. 958). The verifier checks bounded execution snapshots. Transition lemmas establish progress and preservation of performance, and mathematical induction joins snapshots into arbitrarily long executions (Section 5.2, p. 957; Appendix F, pp. 974–975). Constants in the lemmas are found by binary search; failed lemmas can require changing the CCA, invariant, or lemmas (Section 5.2, p. 958).

Inference: For a Rust implementation verified in Verus, candidate correctness, correspondence to the network model, and inductive performance arguments would be separate proof obligations. The finite-template search does not establish that every possible CCA was considered. CEGIS counterexamples could supply regression cases for generated Rust.

## evidence and limits

The introduction reports: “CCmatic synthesized CCAs that guarantee performance across all paths described by models like CCAC, where existing CCAs struggle to even guarantee 1% utilization [7].” (Section 1, p. 951). The guarantees differ by CCA and model. On CCAC with `D=Rm` and `β≥3C(Rm+D)`, `cc_qdel` guarantees at least 89% steady-state utilization, RTT at most `4.4(Rm+D)`, and at most 3 lost packets per `Rm`. On CBR-delay, `cc_probe_slow` guarantees at least 30% steady-state utilization and RTT at most `1.5(Rm+D)`; its bound of 2 lost packets per `Rm` requires consistent beliefs and no link-rate decrease (Section 6.3, p. 962).

Theorem 6.1 applies to deterministic end-to-end CCAs on CBR-delay with `0<β≤CD`: avoiding arbitrarily low utilization requires either losses growing with `C` or convergence time `Ω(C(Rm+β/C))` (Section 6.2, p. 960; Appendix D, pp. 971–973). `cc_probe_slow` attains the constant-loss, linear-convergence tradeoff on CBR-delay. The authors do not prove the same attainable bound for CCAC: “Due to this, we conjecture that either large losses cannot be avoided for CCAC or will require asymptotically longer convergence time (e.g., quadratic instead of linear in BDP).” (Section 6.2.1, p. 962).

The encoding discretizes time with `D=Rm`; Appendix B.1 explains how using the minimum observed RTT gives guarantees for the corresponding modeled parameters when actual jitter is at most twice that minimum (p. 969). Belief approximations and finite templates restrict the search, while link-rate changes require belief timeouts and the conditions in Section 5.1.2 (p. 957). Empirical evaluation uses UDP implementations and emulated random ACK aggregation; the implementation increases the probe parameter from 1 to 5 MSS, allowing up to 10 MSS loss per probe (Section 6.4, p. 962; Appendix H, p. 976). The authors caution: “Further evaluation is warranted before deployment.” (Section 6.4, p. 962).

Inference: For verified agent-written Rust, the transferable method is to synthesize control logic against an explicit environment model, then prove its long-run properties separately. The paper does not demonstrate Rust or Verus verification; source-level correctness and model validity remain additional obligations.

## techniques for the catalog

- belief inversion: derive all feasible path and state parameters from a network model and observed actions/feedback
- over-approximate beliefs: use conservative closed-form bounds to retain soundness when exact sets are intractable
- belief sufficiency: for a deterministic history-based CCA and a property expressed over beliefs and actions, prove that a belief-based CCA can ensure the same property
- CEGIS: alternate SMT counterexample search with candidate-template pruning
- impossibility by beliefs: show no action works on a valid belief set to rule out a performance objective for deterministic CCAs
- transition lemmas: join bounded execution checks by induction to prove progress and performance over arbitrarily long executions

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We will show that the network can compute the set of all feasible actions using the belief set."): checked all paper text, including appendices and references, against the study's quotations, numbers, references, technique steps, assumptions, and catalog; corrected quotation punctuation, the scope page reference, the publisher link, the sufficiency theorem's scope, and the utilization claim; added post-synthesis proofs, model-specific guarantees, the tradeoff's conditions, and implementation limits; replaced unsupported Verus assertions with labeled inferences; did not reproduce experiments, run synthesis, or independently certify the mathematical proofs.
