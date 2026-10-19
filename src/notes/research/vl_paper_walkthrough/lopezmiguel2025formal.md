# Formal Verification of PLCs as a Service: A CERN-GSI Safety-Critical Case Study (extended version)
(authored by agents unless marked 🧑)
Tag: `lopezmiguel2025formal`, [paper](http://arxiv.org/abs/2502.19150v1)

## what the paper contributes

The paper describes a service in which an independent verification team checks PLC code against requirements, and a method for modeling proprietary, time-dependent PLC functions whose internals are hidden. Its abstract states: “This paper introduces a formal verification service for PLC (programmable logic controller) programs compliant with functional safety standards, providing external expertise to organizations while eliminating the need for extensive internal training.” (Abstract, p. 1). The case study verifies the Personnel Access System (PAS) of the FAIR accelerator at GSI with CERN’s PLCverif (Sect. 3, p. 6).

## technique 1: separate requirements, implementation, and independent verification

What it is. The service has three independent teams: requirement engineers know the physical system and write requirements; PLC developers implement them; verification engineers check that the PLC behaves exactly as specified (Sect. 2.1, pp. 2–3). The paper says, “It is important to highlight the iterative nature of this process.” (Sect. 2.1, p. 3).

How it is done. Requirement engineers distribute requirements to developers and verifiers. Developers share the PLC program with the other teams. Requirement engineers formalize requirements (Sect. 2.2, pp. 3–4); verification engineers use PLCverif to check the code against them (Sect. 2.3, pp. 4–6). When a discrepancy appears, they inform requirement engineers, who work with developers to identify the cause; updated requirements or code return to verification, and the cycle repeats until no discrepancies remain (Sect. 2.1, p. 3). The authors explicitly caution that the process “does not entirely ensure the lack of errors in the code or in the requirements due to the possible bugs in the program verifier” (Sect. 2.1, p. 3).

Verus form. Inference: apply the same separation to a Verus product by giving a requirement owner, implementation owner, and independent proof reviewer separate artifacts and review paths. A Verus proof establishes the written contract, so the requirement artifact must remain independently reviewable. Use a contract review before proof review; do not treat a passing solver run as evidence that the requirement itself is complete.

Evidence and limits. The PAS collaboration had GSI requirement engineers, CERN verification engineers, and a different CERN developer team (Sect. 3, p. 6). The paper reports that formalization improved understanding and reduced ambiguity, but it gives no numerical defect rate, labor hours, or independent comparison. Inference: the service model is evidence from one safety-critical project, not a measured business-cost result.

## technique 2: turn requirements into checkable formalisms

What it is. The paper presents cause-and-effect matrices for stateless Boolean logic, input-output matrices with priorities, state machines for modes and transitions, logic diagrams, and assertions for safety properties (Sect. 2.2, pp. 3–4). The forms are intended to be simple and shared across the lifecycle.

How it is done. Choose a representation that matches the requirement. For a cause-and-effect matrix, encode Boolean expressions for each output. For an input-output matrix, specify set/reset conditions and either ensure inputs are mutually exclusive or state output priority. For a state machine, enumerate states and guard conditions. For a safety assertion, state that an unsafe state cannot be reached. Feed the formalized requirements and PLC code to PLCverif (Sects. 2.2–2.3, pp. 3–5).

Verus form. Inference: encode each requirement as a `requires`/`ensures` contract, a state-machine invariant, or a `proof fn` over a transition relation. Use explicit priority conditions when two guards can be true simultaneously. Use `assert` in proof code only for facts that the verifier can establish; keep executable checks separate from proof-only code.

Evidence and limits. The case study says requirements were formalized “leading to a better understanding of the desired program behavior and less ambiguities” (Sect. 3, p. 6). Appendix B shows why this matters: two requirements that set and reset the same output are ambiguous unless priority or mutual exclusion is stated (Appendix B.1, pp. 20–21). No denominator of all requirements or number of ambiguity defects is given.

## technique 3: reconstruct know-how-protected, time-dependent functions

What it is. Proprietary TIA Portal functions hide their behavior. Time-dependent functions are difficult because behavior propagates across PLC cycles. The paper’s method combines simulation and formal verification to produce transparent PLC code usable inside whole-project verification (Sect. 2.3, pp. 5–6). It describes the process as a form of automata learning, but learns PLC code directly because no tool generates PLC code from automata (Sect. 2.3, p. 5).

How it is done, using the simplified FDBACK function. First analyze documentation: FDBACK checks `ON=0` and `FEEDBACK=1`, raises `ERROR` after a maximum time, and keeps the error until `ACK=1` (Sect. 2.3, p. 5). Second create a small PLC simulation of the function (Appendix A.1, p. 11). Third force documented input scenarios in TIA Portal/PLCSIM and observe outputs; for safety inputs that cannot be forced directly, assign a standard data block to those inputs (Appendix A.2, p. 11). Fourth record the observations in a cycle-by-cycle timing diagram. The paper’s three example scenarios are no error (`ON=FALSE`, `FEEDBACK=TRUE`), error after two cycles (`ON=TRUE`, `FEEDBACK=TRUE`), and acknowledged error removal (`ON=FALSE`, `FEEDBACK=TRUE`, with a rising edge of `ACK`) (Appendix A.2, pp. 12–13). Fifth translate each timing-diagram row into input assignments and output assertions; leave an unassigned input nondeterministic, as with `ACK` in early cycles (Appendix A.3, pp. 13–14). Sixth write a transparent PLC model from the documentation and simulations (Sect. 2.3; Appendix A.4, pp. 14–15). Seventh call the model once per cycle and assert the expected output after each call (Appendix A.5, pp. 16–17). Iterate simulations, diagrams, model, and assertions until no discrepancy remains (Sect. 2.3, p. 6).

Verus form. Inference: represent the hidden function as a Rust state machine with explicit state, cycle transition, and `spec fn` for the expected trace. Use a ghost trace or a finite sequence of input/output observations. Prove each modeled transition against the assertions generated from the timing diagram. If the real implementation remains proprietary, keep it as a trusted external body with a reviewed contract; do not claim that the model proves the hidden implementation without an equivalence argument.

Evidence and limits. The paper reports that the original FDBACK model was about 100 lines of PLC code (Sect. 2.3, p. 6). Appendix A.3 reports six spreadsheets with 25 cycles each for modeling the original FDBACK (p. 14). For the simplified example, Appendix A.5 specifies a 100 ms cycle, the formula `cc = int(T/T_CYCLE)+1`, and loop unwinding `max(cc, ct)`, with `ct` the timing-diagram length. It then states “cc = 2 (200ms/100ms)” and sets unwinding to 6 for a six-cycle diagram (p. 17; Figs. 13–14, p. 18). Inference: the stated `cc=2` conflicts with the formula, which gives 3 for these inputs; either value still gives unwinding 6. Listing 1.1 also uses `PT := 2*200` with a comment specifying 200 ms safety cycles (p. 15), whereas Appendix A.5 uses 100 ms cycles and a 200 ms timer (p. 17). These timing descriptions are inconsistent. Figure 15 reports all assertions satisfied (p. 19). The authors limit model agreement to “all the simulated scenarios” (Sect. 2.3, p. 6). Inference: this does not establish equivalence with the hidden implementation for untested scenarios; completeness of simulations and accuracy of documentation remain assumptions.

## technique 4: use counterexamples to repair requirements and module assumptions

What it is. Appendix B classifies discrepancies from different CERN PLC projects, not just GSI, as incomplete requirements, PLC bugs, or minor documentation errors (Appendix B, pp. 19–20). The authors also identify missing priorities, incomplete state-machine guards, unexplained shared-variable ranges, and unspecified timer behavior.

How it is done. For competing set/reset requirements, state which has priority, state mutual exclusion if it is a physical fact, or add the other condition to each requirement (Appendix B.1, pp. 20–21). For an incomplete state machine, add guards so exactly one transition is enabled; the paper’s repaired example transitions from manual mode to forced mode when auto-mode and forced-mode requests are simultaneous (Appendix B.1, p. 21). For a variable passed from one module to another, state restrictions imposed by the producer and make the consumer requirement conditional on them, or use assume-guarantee/contracts (Appendix B.1, pp. 21–23). For timers, specify activation, behavior before and after expiry, and reset conditions (Appendix B.1, p. 23). The paper’s example has module 1 always set `v_1=FALSE`; verifying module 2 with unrestricted `v_1` finds a counterexample, while assuming the producer fact makes the requirement hold (Appendix B.1, pp. 22–23).

Verus form. Inference: write producer postconditions as guarantees and consumer preconditions as assumptions. Use a transition invariant for state-machine exclusivity and a contract for every shared variable’s legal range. Keep hardware-failure behavior explicit: the paper notes that robust modules may still need to accept values outside nominal producer ranges (Appendix B.1, p. 23).

Evidence and limits. These examples demonstrate diagnosis patterns, not a statistical evaluation. The paper gives no count for each discrepancy bucket and no proof that all hardware-failure cases are covered.

## service case study and what was delivered

The PAS prevents personnel from entering areas exposed to particle beams and radiation; its configurability makes exhaustive testing impractical and its TIA Portal code uses proprietary functions (Sect. 3, p. 6). CERN and GSI used the three-team process. The reported outcomes are formalized requirements, a PLC program aligned with those requirements after discrepancies were amended, and added PLCverif support for FDBACK, CTUD, ESTOP1, and FDB_TIME (Sect. 3, p. 6). The paper claims this is the first complete real-world safety-critical PLC project verified through an organization trusted by another, while distinguishing earlier work that verified specific modules (Sect. 4, p. 7).

## techniques for the catalog

- independent service verification — separate requirement, implementation, and verification teams and iterate until code and requirements agree
- requirement formalization — encode logic as matrices, state machines, diagrams, and safety assertions with explicit priorities
- black-box timing reconstruction — simulate proprietary functions, record cycle traces, generate assertions, model transparently, and verify iteratively
- cycle-bounded checking — choose loop unwinding as the maximum of timer-trigger cycles and timing-diagram length
- assume-guarantee boundaries — constrain shared-module inputs with producer guarantees and conditional consumer requirements
