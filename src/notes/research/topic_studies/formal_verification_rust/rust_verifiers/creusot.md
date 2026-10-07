Creusot: turning Rust ownership into simpler proof problems
(authored by agents unless marked 🧑)

takeaway
- Creusot exploits Rust ownership to reason about mutation using mathematical values
  - useful for algorithms with mutable borrows and generic traits
  - newer permission APIs also support selected shared-mutation algorithms
- its strongest distinctive idea describes a borrow's current value and its value when the borrow ends
  - this lets a function promise what later mutation through its returned reference will mean

how it works
- Rust code carries input/output conditions, loop invariants, and logical helper functions
- Pearlite is the specification language
  - it extends Rust-like expressions with mathematical integers and statements about all or some values
  - logical helpers exist for proofs rather than execution
- Creusot translates checked Rust intermediate code into Coma inside the Why3 verification platform
  - Why3 sends proof obligations to automated solvers
  - difficult obligations may need interactive proof steps
  - team README: “translating Rust code to Coma”
    - [current README](https://github.com/creusot-rs/creusot/blob/master/README.md)
    - retrieved 2026-10-07
- mutable borrows become pairs of values
  - one is the value now
  - the other names the value that will exist when the borrow ends
  - the end of the borrow connects this second value to the actual final value
  - the authors call the second value a prophecy
  - architecture document: “a pair of a current and a final value”
    - [architecture](https://github.com/creusot-rs/creusot/blob/master/ARCHITECTURE.md)
- traits carry reusable logical assumptions
  - an ordering trait needs a contract saying what a valid ordering means
  - this supports proving generic sorting without knowing a particular element type
  - Denis, Jourdan, Marché, ICFEM 2022, abstract: “advanced abstraction features”
    - [paper](https://inria.hal.science/hal-03737878v1)

what it can verify
- panic, overflow, and assertion freedom on supported safe Rust
- functional correctness of algorithms using owned data and mutable borrows
- termination when users request it and supply decreasing measures
  - current homepage: “Prove that your programs terminate”
    - [homepage](https://creusot.rs/)
- selected shared-mutation and raw-pointer algorithms through permission APIs
  - CPP 2026 adds proof-only ownership resources
  - Golfouse, Guéneau, Jourdan, abstract: “union-find and persistent arrays”
    - [paper](https://hal.science/hal-05396946v1)
  - current homepage: “interior mutability, raw pointers, or atomics”
    - [homepage](https://creusot.rs/)
- generic code under specified trait laws
- safe interfaces to low-level libraries under supplied models
  - an interface model describes the observable behavior of the library
  - it does not prove the library's unsafe implementation
- the current README summarizes the goal as code doing “the correct thing”
  - [README](https://github.com/creusot-rs/creusot/blob/master/README.md)

limits and trust
- the 2022 safe-code restriction is no longer a complete description of current Creusot
  - the older architecture still says “(safe) Rust code”
    - [architecture](https://github.com/creusot-rs/creusot/blob/master/ARCHITECTURE.md)
  - the current site and CPP 2026 paper document permission-based raw-pointer access
  - the paper says these APIs require Rust's unsafe marker because their proof-only preconditions exceed what Rust's type system can enforce
  - this establishes support for specific checked APIs
  - it does not establish support for arbitrary unsafe blocks
- CPP 2026 leaves a full semantic justification of its new ghost-code features open
  - §7.2 distinguishes prior prophecy soundness results from these added resources
  - author wording: “We believe we could prove the soundness of ghost code”
    - [paper](https://hal.science/hal-05396946v1)
- proving a client using a Vec or another dependency still needs correct library contracts
- the translation, Why3, solvers, Rust compiler, and chosen specifications remain part of the assurance boundary
- the supported Rust fragment and compiler version should be checked for a proposed target
  - no claim here that arbitrary Cargo projects work unchanged

real systems
- CreuSAT is a Rust SAT solver
  - SAT asks whether some assignment of true/false values satisfies a Boolean formula
  - author README: “formally verified using Creusot”
    - [repository](https://github.com/sarsko/CreuSAT)
  - the author reports correct SAT and UNSAT answers and absence of runtime panics
  - implemented techniques include learned clauses and two watched literals
  - distinguish the verified CreuSAT directory from experimental unverified variants in the same repository
  - repository README labels JigSAT “An unverified solver based on CreuSAT”
- Krabka is an Apache Kafka-compatible broker with proofs of selected executable kernels
  - team README: “Creusot proves contracts for small executable kernels”
    - [repository](https://github.com/krabka-io/krabka-broker)
  - same README: “not a whole-system formal proof”
  - proofs coexist with bounded model checking and live comparisons against Kafka
  - token buckets and consensus/log kernels are named verification targets
  - use its [verification catalog](https://github.com/krabka-io/krabka-broker/blob/main/docs/verification.md) to inspect caller conditions and excluded orchestration
  - this is current project-reported evidence
  - the proofs were not rerun for this literature review

2025–2026 developments
- Denis et al., September 2025 draft, scales prophecy encoding to ghost code and type invariants
  - abstract: “several case studies (4k LOC)”
    - [draft](https://inria.hal.science/hal-05244847/)
  - treat its claims as draft results rather than a confirmed venue publication
- Golfouse, Guéneau, Jourdan, CPP 2026, verifies shared mutable data structures
  - combines mutable borrows with proof resources
  - [paper](https://hal.science/hal-05396946v1)
- Xia and Jourdan present Rust standard-library verification at RustVerify 2026
  - official list: “Verifying the Rust standard library with Creusot”
    - [publication list with slides and code](https://creusot.rs/research)
  - a presentation listing alone does not establish complete standard-library verification

open problems
- proving soundness of current ghost ownership, snapshots, type invariants, and erasure
  - [CPP 2026 §7.2](https://hal.science/hal-05396946v1) explicitly leaves this work open
- concurrency support beyond the paper's prototype and sequentially consistent atomics
  - [CPP 2026 §7.1](https://hal.science/hal-05396946v1) describes that limited scope
- composing verified kernels with asynchronous adapters and I/O
  - the correctness of a small decision function does not establish that surrounding code calls it correctly
- explaining final-value contracts to ordinary Rust programmers
- extending standard-library coverage while reducing assumed behavior
- maintaining proof sessions across compiler, Why3, and solver changes

research we could do
- recommendation: test whether verified kernels still prevent failures after integration changes
  - builds on [Krabka's separation of kernels and orchestration](https://github.com/krabka-io/krabka-broker)
  - possible new contribution
    - evidence of which adapter mistakes escape unchanged kernel proofs
    - a small mechanism checking that real callers meet proved input conditions
  - why it may matter
    - production behavior crosses the boundary between proven computation and unproved orchestration
  - decisive experiment
    - mutate only adapters, serialization, or call ordering
    - compare existing tests, bounded models, kernel proofs, and added boundary checks
    - classify faults by the assumption they violate
  - novelty unresolved
    - compare contract monitoring, model-based integration testing, and existing Krabka checks
- recommendation: study proof maintenance in an optimized solver
  - builds on [CreuSAT](https://github.com/sarsko/CreuSAT) and [Creusot's borrow model](https://github.com/creusot-rs/creusot/blob/master/ARCHITECTURE.md)
  - possible new contribution
    - a controlled account of optimization benefits versus proof repair costs
  - why it may matter
    - shows which implementation choices keep verified algorithms competitive
  - require comparable algorithms and pinned versions
    - older repository claims alone cannot establish present performance rankings
- recommendation: formally connect current ghost ownership to the existing prophecy model
  - builds on [RustHornBelt](https://hal.science/hal-03777103/) and [CPP 2026's stated foundation gap](https://hal.science/hal-05396946v1)
  - possible new contribution
    - a semantic account of permission APIs and erasure with nested mutable borrows
  - why it may matter
    - stronger foundations for new shared-mutation proofs
  - this is an explicitly identified author research agenda
    - check ongoing work before selecting it
    - proving a smaller language is useful only with a clear correspondence to implemented APIs
