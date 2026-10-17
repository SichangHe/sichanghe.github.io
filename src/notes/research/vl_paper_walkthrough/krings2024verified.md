# A verified low-level implementation and visualization of the adaptive exterior light and speed control system
(authored by agents unless marked 🧑)
Tag: `krings2024verified`, [paper](https://doi.org/10.1007/s10009-024-00750-5)

## scope and contribution

The paper presents a MISRA C implementation of the ABZ 2020 adaptive exterior light system (ELS) and speed control system (SCS), first validated with test-driven development and then checked with CBMC. It explicitly positions the result as a baseline rather than a complete formal-method development. The abstract states: "Rather than using a (correct-by-construction) approach following a formal method, we use C for a low-level implementation instead." (Abstract, p. 403)

Inference: For VeruLaw, the useful lesson is a staged workflow in which executable code, tests, and bounded model checking expose different classes of defects; the paper's own evidence does not establish a complete proof of all requirements.

## technique: derive tests and assertions directly from requirements

What it is and when to use it. The authors keep the case-study requirements unchanged and derive both executable tests and CBMC assertions for each covered requirement. They say: "For each requirement we covered, we generated: • Unit tests, which are used for test-driven development. See Sect. 6.1 for details. • Assertions to be checked via CBMC as presented in Sect. 6." (Section 4.1, p. 406) The validation sequences "were taken from an Excel file and encoded in integration tests, using the same techniques as the unit tests."

How to do it. (1) Use the requirements unmodified ("without further modification or transformation") and encode the given validation sequences as integration tests, without a separate formal model (Section 4.1). (2) Write a unit or integration test and run it before changing implementation code (Section 2.2). (3) Add the implementation needed for the first failing assertion, then repeat for the next failure (Section 5.1). (4) Add a separate assertion expressing the requirement as a property intended to hold beyond the finite scenario (Section 4.1). (5) Run CBMC over the same C code after the test suite has been built (Section 5.1). The paper gives the key ordering: "Instead, as our first step, we set up the validation sequences as test cases. Then, following test-driven development, we added to the implementation code by only considering the first failing assertion in a scenario." (Section 5.1, p. 408)

Verus form. Inference: Put the requirement's universal property in a Rust `ensures` clause or a loop invariant, and use executable Rust tests for the concrete scenario. A Verus proof function can establish helper facts, while the executable function remains the implementation under test. The C test's finite trace does not itself become a Verus proof; the universal contract must be stated explicitly.

Evidence and limits. The authors report 49 ELS requirements (ELS-1 to ELS-49) and "43 requirements (SCS-1 to SCS-41)" for the SCS (Sections 3.1 and 3.2, p. 406); the SCS count and its numbering range disagree in the paper, and the ELS category list also contains a typo ("ELS-39 to ELS-30"). They implemented all ELS requirements except the emergency brake light and "about two-thirds" of the SCS requirements, up to and including SCS-28 (Section 4.5, p. 408). Inference: the denominator for coverage is the stated requirement count, not the number of tests, and a Verus project must record uncovered requirements instead of treating passing tests as complete coverage.

## technique: test-driven development with mocked sensors and time

What it is and when to use it. Tests use cmockery to replace sensor and clock reads while leaving user input direct. The paper states: "Since we did not want to execute all tests in real-time, we mocked functions that extract sensor data and the current time in our test cases." (Section 6.1, p. 411)

How to do it. (1) Initialize a configuration, such as driver side, market, and optional extras, and assert the initial state (Listing 5, Section 6.1). (2) Set the sensor values the scenario needs, including an artificial millisecond timestamp, and call the mocked-function setup (Sections 5.4 and 6.1). (3) Execute one system step. (4) Assert a complete or partial state. (5) Advance the mocked timestamp and repeat assertions over the relevant interval; the ELS-3 example checks each millisecond interval through `progress_time_partial` (Listing 5, p. 412). (6) Keep user commands as direct calls so the test models the distinction between human interaction and sensor acquisition (Section 6.1).

Verus form. Inference: Model sensors as function inputs or a ghost state snapshot and pass time explicitly to a transition function. Use a precondition that the next timestamp is no smaller than the previous one, and prove state postconditions for every call. Replace cmockery with ordinary Rust test values; no mocking framework is needed for a pure transition function.

Evidence and limits. The paper reports 5,223 source lines including Makefile and visualization code, of which 3,786 are test code (Section 6.1, p. 412). This denominator includes infrastructure and therefore is not a test-to-production ratio. The authors say the tests helped understand requirements, made refactoring safer, and kept implementation close to the specification (Section 6.1). Inference: mocked time gives fast deterministic tests but cannot establish scheduler or wall-clock behavior.

## technique: encode bounded domains with enumeration types

What it is and when to use it. The implementation represents ordinary integer domains such as percentages and steering angles as C enumerations. The authors give the reason: "The reasons for this are twofold: first, we can easily identify thresholds and the value range for each type." (Section 5.2.1, p. 409)

How to do it. (1) Define every valid value and its numeric encoding in an enum, for example `percentage_low = 0` and `percentage_high = 100` (Section 5.2.1). (2) Give names to meaningful threshold regions, such as `st_hard_left_max` through `st_neutral` (Section 5.2.1). (3) Express conditions with named bounds, for example `st_hard_left_max <= angle && angle <= st_hard_left_min` (Section 5.2.1). (4) Add CBMC assumptions constraining enum and Boolean values before verifying (Listing 1, Section 5.3).

Verus form. Inference: Use a Rust `enum` for discrete states and a bounded integer type or a `spec fn` predicate for numeric ranges. State the range predicate in `requires` clauses and prove it after state transitions; do not rely on C enum out-of-range behavior, because Verus proofs require an explicit domain invariant.

Evidence and limits. The paper warns that C behavior is undefined when an out-of-range value is passed to an enum (Section 5.2.1). Inference: the encoding narrows CBMC's search only when assumptions are sound; an assumption that excludes reachable values can make a proof vacuous.

## technique: represent time as a monotonic sensor

What it is and when to use it. Instead of sleeping against operating-system time, the authors inject a millisecond timestamp and assume it never decreases. They state: "The only assumption made is that one cannot go back in time." (Section 5.4, p. 410)

How to do it. (1) Add a time sensor returning an integer timestamp. (2) Mock it in tests and assign explicit values. (3) Add CBMC assumptions that the timestamp is at least each stored timer value (Listing 2, Section 5.4). (4) Call the step function repeatedly; permit multiple calls at one timestamp or skipped timestamps (Section 5.4). (5) Replace the mock with an operating-system clock implementation when deploying (Section 5.4).

Verus form. Inference: Pass `now` into each transition and require `old(now) <= now` when the state stores a previous timestamp. Use a loop invariant to preserve monotonicity and prove timer-triggered branches for elapsed-time inequalities. The Verus contract must state any resolution or wraparound assumption that the C model leaves implicit.

Evidence and limits. The paper says scenarios taking minutes of wall time can execute in milliseconds with the mock (Section 5.4), but it gives no denominator or measured speedup. Inference: this technique validates discrete timer logic; it does not prove real-time scheduling, clock accuracy, or interrupt ordering.

## technique: bounded model checking of state and temporal properties

What it is and when to use it. CBMC checks C assertions plus a default set of properties: memory safety, "occurrence and treatment of exceptions", and absence of undefined behavior (Section 2.3). The authors note these "only ensure general correctness but not adherence to the requirements". Assertions at different locations represent different properties: "If placed at the end of the loop implemented by the ELS and the SCS state machines depicted in Fig. 2, assertions correspond to safety invariants that have to hold in every state reachable by one of the subsystems." (Section 6.2, p. 412)

How to do it. (1) Place an assertion at the end of a state-machine loop for a safety invariant, inside it for an intermediate invariant, or after a bounded number of iterations for a trace property (Section 6.2). (2) Use "additional variables for unrolling state traces" for a "lightweight verification of temporal properties", which the authors say is "not as powerful as LTL or CTL" (Section 6.2). (3) Supply domain and monotonic-time assumptions through `__CPROVER_assume` (Listings 1–2). (4) Run CBMC and inspect counterexample traces. (5) Repair either implementation or property, then rerun. For ELS-22, CBMC first produced a counterexample that revealed a code error (only the low beam was activated by the daytime running light, based on ELS-17), which the test scenarios had not uncovered. The assertion still failed afterwards; further analysis of the property showed a conflict between ELS-22 and hazard blinking in Canadian and US cars, where hazard blinking deactivates both tail lights for the dark cycle. The authors extended the assertion with `blinking_direction != hazard`, after which they "were able to successfully verify the property" (Section 6.2, pp. 413–414).

Verus form. Inference: Translate the transition loop into a Rust function with a `requires` state-domain contract and `ensures` invariant preservation. Use a `while` loop invariant for repeated steps and a ghost previous-state variable for temporal relations. A Verus proof is unbounded only relative to the stated transition and assumptions; a bounded trace proof should be encoded with an explicit iteration bound.

Evidence and limits. The ELS-22 property verified only after the assertion was weakened to exclude hazard blinking (Section 6.2, p. 414); the paper shows this one property in detail. The paper reports no aggregate count of CBMC-verified assertions or total states, so no overall verification percentage can be computed. The authors report a counterexample of "more than 200 lines and 50 low-level states" for ELS-22, which was "barely readable" to them (Section 6.2, p. 413). Inference: readable counterexample reduction is necessary for debugging, and a successful CBMC result is only as strong as the assumptions and assertion.

## technique: visualize counterexample state transitions

What it is and when to use it. Raw CBMC traces interleave assignments, calls, and returns, so the team manually projected them into full-step state changes and built visualizations. The paper says: "We ended up manually writing state variables in a spreadsheet to comprehend the scenario and ultimately created our own visualization which we will present in Sect. 7.2." (Section 6.2, p. 413)

How to do it. (1) Select state variables relevant to the violated property. (2) Group low-level CBMC states into one row per complete step-function iteration. (3) Record values before and after each iteration, as in Table 2. (4) Render either a technical PlantUML state view or a domain-specific car view (Section 7.2). (5) Keep the visualizer behind a small sensor implementation linked as a shared library, which reduces communication to "a simple and somewhat stable C interface" (Section 7.2, p. 415).

Verus form. Inference: Use a ghost trace or serialized state snapshots in Rust tests, then inspect the failing snapshot sequence; Verus itself proves predicates and does not supply this domain visualization. A separate executable visualizer can consume an erased state log.

Evidence and limits. The authors found that the earlier C++/OpenGL domain-specific view, which used the C sources directly in compilation, "proved rather inflexible and prone to breakage when implementation details changed"; they then built an F# RayLib visualizer on a shared library (Section 7.2, pp. 415–416). Inference: visualization improves diagnosis but contributes no proof unless the rendering adapter is itself verified.

## what is proved, measured, and trusted

The paper reports verifying selected C assertions with CBMC (only ELS-22 is worked through) and validates scenarios with cmockery tests. It measures development effort in Table 1: 2 hours for basic implementation and structure, 30 for ELS implementation/tests/scenarios, 22 for SCS implementation/tests/scenarios, 3 for model checking, 2 for refactoring, 6 for state visualization, and 25 for domain-specific visualization (Section 4.2, p. 407). Inference: the table's denominator is the listed task hours, not all project labor outside those tasks.

The authors report that by default CBMC "only is able to work with internal state changes"; external state changes were "not part of our first verification attempts" and need getter functions prefixed with `nondet_`, which also forced them to retrieve constant values (market code, installed features) once and made them unable to express orderings of external states such as the light rotary switch moving from off via auto to on (Section 6.2, p. 414). Inference: the implementation, compiler, CBMC, C semantics, cmockery, mocked sensors, external clock, and hardware are trusted or assumed. Inference: a Verus version would still need contracts for hardware and foreign interfaces; proving the transition function would not prove those interfaces.

The paper itself concludes: "Overall, for an untrained developer, it is very easy to show “the wrong thing” and obtain a “proven correct” signal while the code may still be faulty." (Section 9, p. 417) Just before it they write that "we seemed to have hit every pitfall and in many instances actually did not verify anything." Inference: this is a direct threat to agent-written verified Rust: agents can satisfy an incorrectly stated contract or an overly strong assumption while leaving the product requirement unmet. The threat is high for specification translation and environmental modeling, and lower for routine arithmetic properties once the contract and state model are independently reviewed.

## what VL should not redo

Inference: VL should not repeat the paper's baseline experiment of implementing a low-level automotive controller in C, using tests, and then adding CBMC assertions; the workflow and its failure modes are already documented here. VL should instead reuse the requirement-to-test/property split, monotonic-time modeling, explicit domain invariants, and counterexample projection as Verus design patterns, while measuring the stronger guarantees and remaining trusted assumptions.

## techniques for the catalog

- requirement-to-test-and-assertion derivation — derive executable tests and general CBMC properties from each covered requirement
- mocked sensor and monotonic time — inject deterministic sensor/time inputs and assume timestamps do not decrease
- enumeration domain modeling — encode finite or bounded values with named enums and explicit verifier assumptions
- CBMC state and temporal checking — place assertions at loop boundaries or use ghost history variables for bounded temporal properties
- counterexample state visualization — collapse low-level traces into complete step iterations and render relevant state variables
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Mocking the sensor also has the advantage that test scenarios, which would take several minutes of wall time, can be executed in milliseconds instead."): read the whole paper text (pp. 403–419, including the references) and the whole study; checked every quotation, number, section and page reference, and each technique step against the paper; changed the Section 4.1 quotation (a sentence had been dropped inside it), the curly quotation marks in the Section 9 quotation, the requirement counts (the paper itself gives SCS as 43 requirements but SCS-1 to SCS-41), the ELS-22 account (the counterexample first revealed a code error; the hazard-blinking conflict came from further analysis), the temporal-property step, the "proves" wording, the visualization-boundary claim, the cmockery init arguments, and marked the trusted-base list and denominator remarks as Inference; did not check the Verus translations (all labeled Inference), the GitHub repository, the figures beyond their captions, or the cited works; the DOI link is from the paper text.
