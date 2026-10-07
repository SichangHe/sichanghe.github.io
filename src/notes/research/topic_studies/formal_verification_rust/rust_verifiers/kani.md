Kani: symbolic checks with explicit proof boundaries
(authored by agents unless marked 🧑)

takeaway
- Kani checks ordinary Rust through a small test-like entry point called a proof harness
  - symbolic inputs represent every permitted value, rather than sampled test inputs
  - the result covers the harness assumptions, modeled dependencies, enabled checks, target architecture, and loop treatment
- its experimental loop contracts support proofs without a fixed iteration limit for annotated loops
  - this does not turn every Kani result into a proof of arbitrary programs or every kind of Rust undefined behavior
- evidence checked on 2026-10-06

how it works
- Rust compiler intermediate code, MIR, is translated for CBMC, a model checker that encodes executions as solver constraints
  - machine integers retain their actual widths and overflow behavior
  - `kani::any()` supplies symbolic inputs
  - `kani::assume(...)` restricts admitted inputs
  - assertions and contracts specify desired results
  - [Kani README](https://github.com/model-checking/kani): “The Kani Rust Verifier is a bit-precise model checker for Rust.”
- ordinary loop checking expands the loop into a finite sequence of iterations
  - an unwinding assertion checks that no admitted execution needs another iteration
  - if that assertion passes, the bound was sufficient for the harness
  - if an input-size assumption excludes larger inputs, those inputs remain outside the proof
  - disabling unwinding assertions leaves a weaker result over the explored executions
  - [Kani loop tutorial](https://model-checking.github.io/kani/tutorial-loop-unwinding.html) explains the bound and unwinding checks
- loop contracts replace expansion with induction
  - an invariant is a condition established before the loop and preserved by each iteration
  - Kani checks those obligations and uses the invariant to reason about the loop's result
  - [current loop-contract documentation](https://model-checking.github.io/kani/reference/experimental/loop-contracts.html): “extending Kani’s bounded proofs to unbounded proofs”
  - function contracts permit modular reasoning about called functions
    - replacing a callee with its contract requires a separately justified contract

what it can establish
- assertion-defined functional properties over the supported model
  - examples include parser acceptance conditions and arithmetic relations
- absence of selected memory errors, panics, and overflow failures
  - uninitialized-memory checking and other experimental features require attention to the selected configuration
- current experimental loop termination checks
  - a decreasing integer expression supplies a termination argument
  - this is newer than the June 2026 standard-library paper
    - that paper states “termination is not verified” in §4.1
  - current documentation describes integer-only measures and unsupported recursive termination proofs
    - also reports problems with struct-field and multiple-component measures
    - termination expressions must avoid side effects
      - the documentation warns that Kani does not check this condition
    - [loop-contract documentation](https://model-checking.github.io/kani/reference/experimental/loop-contracts.html)

what it cannot establish by default
- full Rust memory safety from a successful check alone
  - unchecked undefined behavior can invalidate reasoning about the surrounding program
  - [Kani undefined-behavior documentation](https://model-checking.github.io/kani/undefined-behaviour.html): “Kani focuses on sequential code.”
  - the same source lists missing aliasing checks, reference-lifetime tracking, invalid values, and inline assembly support
- correctness of external code replaced with a model or stub
- arbitrary generic instances from a proof for selected concrete types
- concurrent correctness under Rust's relaxed atomic memory ordering
- termination from a loop invariant alone

real code and the exact boundary
- Firecracker virtio block request parser
  - checks a device-protocol requirement against symbolic guest-memory observations
  - uses extracted Firecracker v1.0 code and a modeled memory interface
  - [Kani team, 2022 case study](https://model-checking.github.io/kani-verifier-blog/2022/07/13/using-the-kani-rust-verifier-on-a-firecracker-example.html): “not be verifying the implementation of GuestMemoryMmap itself”
  - this is a parser case study, not a verified virtual-machine monitor
- Rust standard-library functions
  - a 2026 campaign reports thousands of successful checks and a smaller set of explicit contract proofs
  - [campaign details and counts](rust_std_verification_effort.md)

recent primary reading
- [Kani: A Model Checker for Rust, Delmas et al., ASE 2026, citation in official README](https://github.com/model-checking/kani#citing-kani)
  - the current repository identifies this as the tool's reference paper
  - conference dates are 2026-10-12–16, after this note's check date
  - listed DOI: 10.1145/3832783.3834499
    - DOI resolver returned 404 during this check
  - paper text was not retrieved here; do not infer evaluation results from its citation
- [Verifying the Rust Standard Library, Cook et al., 2026](https://arxiv.org/abs/2606.17374)
  - concrete evidence for automatic harnesses, modular contracts, and missing model coverage
- [HarnessLLM, Wang et al., July 2026 preprint](https://arxiv.org/abs/2607.22161)
  - harness generation, reviewed in the [existing source study](../../../autoverus_citations_20260801.md)
- [KaPilot, Wang et al., July 2026 preprint](https://arxiv.org/abs/2607.21957)
  - specification generation and vacuity checks, reviewed in the same study
  - venue acceptance was not established by that study

research we could do: recommendations, not established results
- convert useful bounded proofs into inductive proofs
  - builds on Kani loop contracts and the standard-library campaign
    - the campaign already includes LLM-based contract synthesis
    - merely asking an LLM for annotations is therefore insufficient novelty
  - proposed contribution: infer invariants and modified-memory regions for actual slice and collection loops
  - newness must exceed generating harnesses or enabling existing loop-contract support
  - evaluation: held-out upstream functions, independently checked invariants, retained input coverage, proof time, annotation effort
  - why it may matter: larger input lengths can make exhaustive expansion impractical
- detect proofs that succeed after assumptions become too strong
  - builds on Kani assumptions, coverage checks, and mutation of known requirements
    - [existing harness and vacuity work](../../../autoverus_citations_20260801.md) already addresses parts of this problem
    - [existing research directions](../../../static_analysis.md) discuss checking assumptions
  - proposed extension: track assumption changes across upstream revisions and target mutations at newly excluded behaviors
  - combining satisfiable-input checks with mutation alone is insufficient novelty
  - evaluation: deliberately contradictory assumptions, omitted postconditions, dependency models, and historical regressions
  - why it may matter: a green solver result is useful only when the admitted behaviors match the intended claim
  - limitation: mutations test specification strength; they do not prove completeness
- choose generic instances by a justified abstraction
  - builds on the campaign's skipped generic functions
  - proposed contribution: identify which type features affect a function's behavior, then derive representative instances under explicit conditions
  - why it may matter: selecting many types without a completeness argument gives examples, not a theorem over all types
  - evaluation should compare against generic deductive proofs on a small shared set
