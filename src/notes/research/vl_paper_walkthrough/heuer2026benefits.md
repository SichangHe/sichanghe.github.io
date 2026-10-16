# Benefits of Applying Software Design Patterns to Backend Rust Applications
(authored by agents unless marked 🧑)
Tag: `heuer2026benefits`, [paper](http://arxiv.org/abs/2607.02744v1)

## scope and contribution

The thesis studies typestate and newtype refactorings in three production-backend components. Its abstract states: “This work investigates how patterns affect software quality and compile-time enforcement of invariants through a case study on three representative components of production backend applications.” The evaluation combines benchmarks, static analysis, and interviews: “An evaluation framework based on criteria derived from the SQuaRE quality model, incorporating benchmarking, static code analysis and expert interviews, is developed to assess the refactored code.” Functional correctness is explicitly outside the study: “However, verifying the subcriterion Functional Correctness would require a formal proof of correctness, which is out of scope for this thesis.”

The selected quality criteria are time behaviour, faultlessness, modularity, reusability, analysability, modifiability, and testability (section 3.1, pp. 6–8). The method requires existing tests to pass and compilation to succeed, then compares status quo and refactored code. Criterion-rs warms up, samples repeatedly, classifies outliers, fits a regression, computes confidence intervals by resampling, and compares versions with another resampling and t-test (section 3.2, p. 8). A result inside Criterion's ±2% noise threshold is not interpreted as a real change (section 3.2, p. 8).

## technique 1: typestate for ordered business operations

What it is. Typestate encodes the permitted state of an object in its type so semantically invalid operations fail at compile time. The paper gives the motivating example: “When defining typestates, a program where a file is closed and subsequently read, can no longer compile.” Rust implementation has two forms: a generic marker field, or separate structs for each state with transition methods; enums represent multiple resulting states. The paper reports that empty marker types are zero-cost, exhaustive `match` handles enum states, and consuming `self` prevents a state transition from being invoked twice (section 4.1.3, pp. 18–19).

When to use it. The case-study recommendation is code with branching logic and many invariants; a linear flow benefits less. The paper says typestate is intended to “enforce invariants at compile time, so that the behaviour during runtime is constrained to allowed operations for that type” (section 4.1.3, p. 18). It also expects improved testability because each transition can be constructed with only its own dependencies, while warning that state and transition boilerplate can hurt analysability.

How the paper applies it. First, identify the large function's ordered phases and implicit invariants (case study 1, section 4.1.2, pp. 17–18). Second, define one state struct per phase and move that phase's data into it (implementation, section 5.1, pp. 25–27). Third, implement a transition that consumes the current state and returns the next state; the listing includes a transition returning a background-task handle. Fourth, start the machine from an entry function and keep transitions small. For the third use case, states additionally carry accumulated success and error data, and enums make expected outcomes explicit (section 5.3, pp. 28–30).

Verus form (Inference: the paper does not use Verus). Encode each state as a Rust struct and each transition as a `fn` with `requires` and `ensures`; use `#[verifier::external_body]` only for genuinely trusted external operations, not the transition being verified. State invariants can be predicates in `spec fn`, and transitions can prove preservation with `assert` and lemmas. Rust ownership still consumes the old state. A Verus proof can establish data properties in addition to the compile-time sequencing guarantee, but the paper's typestate code itself is not a formal proof.

Evidence and limits. In use case 1, the refactored benchmark changed time by −1.8605% (95% interval −2.8563% to −0.7604%, Table 3, p. 32), inside the ±2% noise threshold. The paper interprets this as no practical performance impact. The interpretation reports lower complexity in large functions and easier isolated tests, but tightly coupled states, more boilerplate, and reduced reusability. Experts suggested greater benefit for branching logic, pure transitions without database dependencies, and separate modules (section 6.2.8, pp. 37–38). The experiment does not prove functional correctness and trusts the compiler, tests, benchmark harness, and expert judgments.

## technique 2: newtype plus “Parse, don’t validate”

What it is. A tuple struct wraps a primitive value and exposes construction only after validation. The paper explains: “The newtype pattern in Rust is a concept where a tuple struct with a single field is introduced,” and says construction fails when validation fails, so downstream code receives only the validated domain value (section 4.2.2, pp. 20–21). This centralizes validation and prevents raw strings from bypassing it.

When to use it. Use it for primitive data with domain invariants, especially when repeated manual checks cause duplication. The paper's recommendation is to construct the newtype as early as possible in the call hierarchy so more code benefits from the guarantee (section 6.3.9, p. 42). It warns that developers can bypass the guarantee if adoption is not consistent.

How the paper applies it. Define `ValidatedDreson` around `String`; implement `from_string` to return an error for invalid input; add accessors and comparison/containment traits needed by existing handler code (implementation, section 5.2, pp. 27–28). Convert request strings with `map` at the handler boundary, then pass the newtype downstream. The paper also recommends `TryFrom`, `Deref`, `Into`, and `TryInto` for idiomatic construction and integration (section 6.3.9, p. 42).

Verus form (Inference). Define a wrapper struct and a `spec fn` predicate for validity. A checked constructor can return `Result<ValidatedDreson, Error>` and use `ensures` to state that `Ok(v)` satisfies the predicate. Downstream functions accept the wrapper, so their `requires` clauses can rely on validity without rechecking. Do not claim that Rust's newtype alone proves the predicate: the paper's validation code remains ordinary runtime code.

Evidence and limits. Use case 2 measured +1.252% mean time, with a 95% interval of +0.905% to +1.653% and R² 0.964 (Table 4, p. 38), still within the 2% noise threshold. Experts judged validation more modular, reusable, and testable in isolation; the paper reports no practical runtime degradation (section 6.3.9, p. 42). The guarantee depends on every boundary adopting the wrapper and on the validator's implementation; external services and the benchmark environment remain trusted.

## technique 3: explicit state and error modeling

The third use case combines typestate with enums for recoverable business outcomes and an `Either` value where paths rejoin. The paper says enums expose all possible outcomes through exhaustive matching, but experts preferred `Result` for technical failures and suggested reserving business enums for expected exceptions (section 6.4.4, pp. 46–47). This is a design rule for keeping error semantics visible rather than a proof technique.

Inference: In Verus, model expected outcomes with an enum and prove each match arm's postcondition; return `Result` for trusted I/O failures and specify which errors are outside the functional proof boundary. This can make agent-written code's state space explicit, but does not verify external effects.

## what is proved, measured, and trusted

The thesis measures execution-time distributions, static complexity metrics, and four expert interviews. It reasons that type-directed sequencing eliminates classes of invalid states, but explicitly does not prove functional correctness. Benchmarks use Criterion's warmup, regression, resampling, and t-test; code quality conclusions depend partly on expert opinion. The three use cases are backend components, not safety-critical systems. Inference: For VL, the direct threat is structural: an agent may encode a plausible typestate or newtype while leaving its invariant unproved, bypassing wrappers, or marking external operations trusted. Verus specifications and proof obligations must therefore cover constructor validity, transition preservation, and boundary adoption.

## techniques for the catalog

- typestate state structs: represent each legal phase with a distinct Rust type and consuming transitions
- newtype validation: parse a primitive into a checked wrapper at the earliest boundary
- explicit outcome enums: enumerate expected business outcomes and handle them exhaustively
- criterion-rs comparison: use warmup, repeated samples, regression, confidence intervals, and a noise threshold
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
