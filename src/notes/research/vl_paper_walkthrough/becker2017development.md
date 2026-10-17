# Development and Verification of a Flight Stack for a High-Altitude Glider in Ada/SPARK 2014
(authored by agents unless marked 🧑)
Tag: `becker2017development`, [paper](http://arxiv.org/abs/1707.00945v1)
## scope and result

Becker, Regnath, and Chakraborty report building a complete flight stack for a high-altitude glider while verifying it in SPARK 2014. Their central engineering method is co-verification: static analysis runs during implementation and is allowed to change the design. The paper states: “we deliberately applied static analysis early and continuously during implementation, to give verification the possibility to steer the software design.” (abstract, p. 1)

The target is an ARM Cortex-M4 flight controller with a separate mission-logging task. Verification focuses on absence of run-time errors (AoRTE), contracts, dimensional types, task separation, and selected homing properties. The reported stack has 55,422 lines, 3,981 verification conditions (VCs), and 88.8% of VCs proven in 19 minutes on an Intel Xeon E5-2680 octa-core with 16 GB RAM, timeout 120 s and unlimited steps (Table 1, p. 9). Application bodies/specifications have 81.9%/99.4% SPARK coverage; HAL and RTS coverage are much lower (15.5%/23.5% and 8.6%/11.8%).

## technique 1: co-verify and reshape code for proof

what it is

Run GNATprove in parallel with development, not on a finished product (section 1, p. 2). SPARK contracts summarize callees, and callers inherit proof obligations for preconditions and run-time checks. The paper explains: “The effects of callees are summarized by their post-condition when the calling subprogram is analyzed, and the precondition of the callee is imposing a proof obligation on the caller” (section 2, p. 2). This modular barrier lets the team find proof-hostile code early and rewrite it.

when to use it

Use this for safety-critical code where late proof failures would force expensive redesign. It is useful when code structure, data types, and task boundaries are still flexible.

how to do it

1. Define subprogram preconditions, postconditions, and data dependencies (section 2, p. 2).
2. Run the analyzer continuously during implementation; inspect overflow, index, range, initialization, contract, and task checks.
3. Split long expressions into multiple statements. The authors list this as their first design recommendation because it “discharges more VCs” (section 5.1, p. 10).
4. Limit data ranges, especially floating-point ranges, to give better analysis of overflows (section 5.1, p. 10).
5. Leave suspicious failures visible. Do not suppress a false positive merely to obtain a green report.
6. Re-run callers after changing a callee contract, because an inconsistent contract can make caller proofs vacuous (section 4.1, pp. 5–6).

Verus form

Inference: In Verus, place `requires` and `ensures` on executable functions, use `assert` and lemma proof functions to discharge intermediate facts, and add loop invariants where loops occur. Split expressions when a single SMT obligation is difficult. Verus modularizes calls through specifications in the same broad way, but SPARK’s data-flow aspects and GNATprove syntax do not carry over. A proof accepted for an inconsistent or too-weak `ensures` remains a proof of that written contract only.

limits and evidence

The project had three months and did not prove every property. The reported 88.8% denominator is all 3,981 VCs across application, HAL, and RTS; the application alone has 3,214 VCs with 88.1% proven, while RTS has two VCs and 100% proven (Table 1, p. 9). The paper says, “we could not prove all properties during the time of this project” (section 5, p. 8), and calls the non-proven checks largely “fixable”. It also says “static analysis is ready to replace unit tests, but integration tests have still been found necessary” (section 7, p. 11).

## technique 2: never hide failures that can make later proofs vacuous

what it is

The paper documents three related proof-unsoundness hazards: suppressing a false positive, writing an inconsistent contract, and trusting an incorrect run-time system model. In the GPS example, a suppressed array-initialization length-check warning makes a later off-by-one slice appear unreachable. The authors conclude: “We therefore recommend to avoid suppressing False Positives, and either leave them visible for the developer as warning signs, or even better, rewrite the code in a prover-friendly manner” (section 4.1, p. 5). The paper's footnote says this particular false-positive case “has been fixed in recent versions of GNATprove”.

An inconsistent postcondition can act as an axiom from which any result follows. The paper says: “The resulting theory for Caller is an inconsistent axiom set, from which (principle of explosion) anything can be proven, including that false VCs are true.” (section 4.1, pp. 5–6)

when to use it

Apply this audit whenever a proof report contains suppressed warnings, imported contracts, `assume`-like axioms, or manually modeled hardware/runtime behavior.

how to do it

1. Keep failed VCs visible rather than suppressing them (section 4.1, p. 5).
2. Check that every postcondition is itself provable; the paper's example warns about the inconsistent postcondition, and the developer can correct it (section 4.1, pp. 5–6).
3. Read the analyzer’s assumptions report. GNATprove’s `--assumptions` output identifies when a caller proof depends on a callee body or postcondition (section 4.1, p. 6).
4. Validate the RTS model against the processor. The glider’s FPU supported subnormal values, but its RTS incorrectly claimed otherwise; a floating-point exception then occurred despite proven AoRTE (section 4.1, p. 6). The paper's footnote says this has been fixed in recent versions of the embedded ARM RTS.
5. Avoid saturation. The paper says that almost every case where saturation was applied “was masking a boundary case that needs to be addressed”; for the GPS latitude range [−90, 90] degrees this meant handling faulty GPS values, which indicates a missing requirement (section 4.1, pp. 6–7).

Verus form

Inference: In Verus, treat every `assume`, external specification, and `external_body` boundary as trusted input requiring an independent review. Keep failed proof obligations visible, avoid proving callers from an inconsistent `ensures`, and model hardware or foreign functions with explicit contracts whose assumptions are tested separately. `assert` can expose a suspected contradiction, but it cannot validate the real device. The paper does not say whether Verus has an equivalent of GNATprove’s `--assumptions` report.

limits and evidence

The paper’s concrete failures are execution evidence against unsound proof workflow, not a measured frequency of such bugs. It reports one guaranteed array-slice precondition failure, one floating-point underflow exception, and one inconsistent-contract pattern. It does not claim all GNATprove proofs are unsound; it says static analysis can be refuted by incorrect premises.

## technique 3: encode units and criticality in the program structure

what it is

The authors use GNAT’s dimension system to make physical units part of numeric types. They define length, mass, time, temperature, current, and angle dimensions; the compiler rejects inconsistent operations such as dividing time by angle when an angular velocity is expected (section 2.1, p. 3). They also partition execution into a high-criticality flight task and a lower-priority mission task, with a protected message queue and Ravenscar scheduling.

The goals are explicit: “termination of low-critical tasks must not cause termination of high-critical tasks,” “higher-criticality tasks must not be blocked by lower-critical tasks,” and adverse effects such as “deadlocks, priority inversion and race condition must not occur” (section 3, p. 3).

when to use it

Use unit types at sensor and actuator boundaries, and separate tasks when a logging or diagnostic failure must not stop control. Choose a deterministic tasking subset whose scheduling rules can be analyzed.

how to do it

1. Declare base dimensions and unit subtypes, including angle (section 2.1, p. 3).
2. Make arithmetic use dimensioned values so compiler checks catch mismatched units (section 2.1, p. 3). The paper reports that generic operations and vectors/matrices with mixed dimensions were not possible (section 4.2, pp. 7–8).
3. Partition code into criticality-based tasks. The flight-critical task reads sensors and writes actuators; the mission-critical task logs weather data when the former is idle (section 3, pp. 3–4).
4. Use Ravenscar’s deterministic tasking subset and a protected queue (section 3, p. 3).
5. Rely on Ravenscar for deadlock, priority-inversion and blocking goals, which “hold true by design”, and use GNATprove to find race conditions and non-thread-safe subprograms (section 5, p. 10).
6. Provide a last-chance handler that keeps a failed low-priority task in a null loop but allows reset when the flight task fails (section 5, p. 10). The handler is outside SPARK and not analyzed.

Verus form

Inference: Encode units with wrapper structs and `spec fn` conversion relationships, then put unit-preservation facts in `requires`/`ensures` and lemmas. Verus state-machine or proof-oriented concurrency APIs can model allowed task transitions and ownership, but the paper’s Ravenscar scheduler and last-chance handler are platform-specific. Hardware registers and interrupt code remain trusted unless separately modeled and verified.

evidence and limits

The authors report that the multi-threading goals could be proven to hold, by design through Ravenscar, and that GNATprove found several race conditions and non-thread-safe subprograms (section 5, p. 10). Dimensioned generic operations were unavailable, forcing dimensionless floats in the PID controller and Kalman filter; the resulting unproven overflow checks explain “more than 70 % of our failed floating-point VCs” (section 4.2, p. 8). The denominator is the project’s failed floating-point VCs, not all VCs. The conclusion says a solution for generic operations on dimensioned types “will be part of future GNAT releases” (section 7, p. 11).

## technique 4: quantify proof coverage and solver cost by VC type

what it is

Report coverage separately for application, HAL, RTS, and all components, and measure solver time by VC category. This exposes where a high percentage hides unverified hardware code or where a small class dominates cost.

how to do it

1. Count lines, packages, bodies/specifications, and VCs per component, as Table 1 does (Table 1, p. 9).
2. Report proven VCs as a fraction of each component’s VCs, not just one project-wide percentage (Table 1 gives 88.1%, 92.5%, 100% and 88.8%).
3. Break down success and CPU time by VC type, including floating-point overflow, range, index, precondition, and task checks (Figure 1, p. 9).
4. Record solver limits and hardware. The experiment used an Intel Xeon E5-2680, 16 GB RAM, timeout 120 s and unlimited steps (Table 1, p. 9).
5. Prioritize expensive classes. Floating-point overflow checks were 21% of VCs but consumed 65% of analysis time (section 5, p. 10).

Verus form

Inference: For Verus, collect verification time and success by function, lemma, invariant, and dependency boundary. Report denominators and solver settings for each category. A project-wide pass rate should be accompanied by counts for `external_body` functions, unsafe or hardware wrappers, and proof-only lemmas. Verus proof time is not directly comparable to GNATprove’s measurements.

## techniques for the catalog

- co-verification design loop: run modular checks during implementation and reshape code around proof obligations
- false-positive and contract audit: preserve warnings, prove contracts themselves, inspect assumptions, and validate runtime models
- units and criticality types: encode physical dimensions and isolate high-criticality tasks with deterministic scheduling
- denominator-aware VC accounting: report proof fractions and solver time by component and obligation type
