# Safety and Security Critical Systems with Rust
(authored by agents unless marked 🧑)
Tag: `munch2026safety`, [paper](https://doi.org/10.1007/s11265-026-02011-x)

## paper's purpose

Munch, Lindner, Eriksson, Dzialo, and Lindgren survey how Rust fits safety- and security-critical development under ISO 26262, IEC 61508, and ISO/SAE 21434. They compare hosted systems (dynamic loading and heap allocation) with bare-metal systems (statically linked, no standard-library heap). The paper is a position and engineering analysis rather than an evaluated verifier. It says: “In this work we identify challenges and opportunities for adopting Rust in the context of safety-critical systems.” (Abstract, p. 1).

The paper distinguishes safety claims from certification evidence. Rust's language guarantees address memory safety and defined behavior only within safe code and a correct toolchain; certification still requires process evidence, qualified libraries, hardware assumptions, and functional correctness arguments. It lists deductive verification as one option: “In cases where a formal specification exists, one may adopt different formal verification techniques, where deductive verification using e.g., Frama-c for programs written in C, and Creusot for programs written in the Rust can be done.” (Section 3, p. 5). This is the paper's principal direct guidance on formal verification.

## technique 1: deductive verification against a formal specification

Use this when a component has a formal specification and its safety or functional behavior must be proved rather than inferred from tests.

Steps stated by the paper (Section 3, p. 5):

1. write or obtain a formal specification for the component
2. use a deductive verifier for the implementation language: Frama-C for C or Creusot for Rust
3. prove that the implementation adheres to the specification
4. use testing when specifications are missing, too complex, or not required; the paper names coverage-guided fuzzing, unit testing, and integration testing as lighter alternatives

The paper gives no contracts, proof script, solver setup, benchmark, or proof result. Inference: a Verus workflow follows the same specification-first structure but uses Rust-like `requires`, `ensures`, loop `invariant`, and `proof fn` lemmas. A successful Verus proof establishes the written contract for supported code; it does not replace certification arguments about requirements, compiler, hardware, or external libraries. Creusot syntax and capabilities cannot be assumed to carry over to Verus.

## technique 2: type-state programming for hardware access

Use this when hardware resources must obey access-state rules such as exclusive pin ownership. The paper presents this as a Rust opportunity rather than a measured method.

Its method is: encode the hardware state in types, expose only operations valid in each state, and let the compiler reject invalid transitions. The paper says: “type state programming can be used to enforce mutual access restrictions for hardware, such as pin access on microcontrollers.” (Section 3.1.3, p. 6). It adds that the restrictions are then “enforced by the compiler and eliminate misuse.” (Section 3.1.3, p. 6).

Inference: in Verus, type states can be paired with ghost state and proof lemmas that show each transition preserves an ownership or protocol invariant. The Rust compiler's type rejection is not a Verus proof of functional behavior; Verus should specify the state transition and prove its postcondition. This technique is useful for preventing API misuse before deeper proofs, but the paper gives no implementation or evidence beyond the stated design argument.

## technique 3: stack-depth and schedulability analysis

Use this when fixed stack capacity and real-time constraints are safety requirements, especially on bare-metal targets. The paper identifies external tools rather than presenting a new algorithm.

The proposed workflow is to analyze the call graph and per-function stack allocation, then combine the resulting depth bound with schedulability or worst-case execution-time analysis. The paper states: “Hard real-time guarantees require schedulability analysis based on worst-case execution time analysis.” (Section 3, p. 5). For Rust specifically it reports: “Today, external tools such as Symex/EASY can be used for stack-depth and schedulability analysis.” (Section 6.3, p. 10).

Inference: Verus can prove a recursive or iterative resource bound with a `decreases` measure and specifications for stack-consuming operations, but it does not automatically model machine stack layout or interrupt scheduling. A complete assurance case needs a compiler/backend stack report, call-graph assumptions, and a separately justified WCET model. Unknown function pointers, recursion, or unbounded loops remain proof or analysis obligations.

## technique 4: heapless and fallible allocation for proof-friendly failure

Use this when out-of-memory behavior must be explicit and deterministic. The paper's recommendation is to avoid an infallible global allocator in high-assurance code.

The Heapless approach uses stack or statically preallocated storage and returns an error when allocation cannot satisfy a request. The paper says: “The Heapless crate [58, 59] offers solutions by providing a set of dynamic data-structure abstractions backed by stack or static heap pre-allocations.” (Section 6.1.1, p. 9). It reports the crate had “35 million downloads” at the paper's writing, but gives no adoption denominator or safety study. The alternative is a fallible allocator API in `std` that returns an allocation result while preserving a backward-compatible infallible layer.

Inference: in Verus, model allocation as a state transition that returns `Option` or `Result`, and prove that every caller handles the failure branch. A bounded collection gives a finite capacity parameter that can simplify invariants and termination arguments. Verus does not prove the allocator's implementation or OS memory availability unless those are specified and modeled. This technique changes behavior: callers must define what an out-of-memory result means.

## technique 5: make intentional leaks unsafe and preserve drop obligations

Use this when resource release is part of reliability or safety requirements. The authors argue that safe code should not silently opt out of destruction guarantees.

They identify `Box::leak` and `std::mem::forget` as ways to leak memory from safe Rust and propose requiring `unsafe` for intentional leakage. They also suggest syntax-level policy checks because searches for “terms such as Box::leak or std::mem::forget” are decidable (Section 6.2, p. 9). Their goal is to make drop-based obligations auditable; they give examples such as closing sockets or putting peripherals into sleep mode when objects leave scope.

Inference: Verus can specify a resource token or ghost counter and prove that normal control-flow paths consume it, while marking deliberate leak APIs as trusted boundary functions. A lexical lint cannot prove that all aliases are released or that `Drop` has the intended external effect. The proposal is a language and process change, not an evaluated verification technique.

## what is proved, measured, and trusted

The paper presents no new verifier implementation, proof benchmark, or quantitative certification experiment. Its evidence consists of standards descriptions, cited industry reports, and engineering claims. It reports that MISRA C:2025 has 22 Directives and 201 Rules, and that its Rust addendum says 95 of 201 Rules do not or only partially apply to unsafe Rust while 62 of 201 apply fully or partially to safe Rust (Section 2.3, p. 3). These are counts attributed to the cited addendum, not results generated by this paper. It also reports a Google Android vulnerability-rate claim of 5,000× lower in Rust and a codebase doubling every six years, then projects a return to the prior vulnerability amount in fewer than 13 doublings (Section 4.2, p. 7); the paper supplies no independent denominator or causal analysis.

The trusted boundary includes the Rust compiler and standard/core libraries, unsafe blocks, libc and kernel APIs in hosted systems, allocator behavior, hardware conformance, generated bindings, and the certification process. The paper explicitly summarizes safe Rust exceptions as: “Unsafe code: The goal is to isolate code that needs to opt-out of the strict compiler checking into code small blocks that particularly scrutinized”, “Stack overflow”, and “Bugs/shortcomings in the Rust toolchain.” (Section 2.9, p. 5). Inference: Verus narrows the trusted code for proved functions but does not remove these system-level assumptions; external calls and hardware effects require specifications or trusted wrappers.

## implications for VL

The paper's main lesson for agent-written verified Rust is that language safety, formal functional correctness, and certification evidence are separate claims. Rust's safe subset removes many memory errors, but stack overflow, allocator failure, intentional leaks, unsafe interfaces, and toolchain bugs remain. Inference: VL should report each contract's scope, trusted dependencies, failure behavior, and certification-relevant evidence instead of presenting a Verus proof as complete product assurance. The standards mapping and the named Frama-C, Creusot, Symex/EASY, and Heapless techniques are existing work that VL should integrate rather than rediscover.

## techniques for the catalog

- deductive specification checking — state a formal contract and use Frama-C or Creusot to prove C or Rust implementation adherence
- type-state hardware APIs — encode legal hardware access states in Rust types so invalid transitions are rejected by compilation
- stack and schedulability analysis — combine call-graph stack bounds with worst-case execution-time and schedulability analysis
- heapless and fallible allocation — use bounded preallocation or fallible allocator results so out-of-memory behavior is explicit
- audited drop obligations — require unsafe markers or lint checks for intentional leaks and preserve resource-release obligations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
