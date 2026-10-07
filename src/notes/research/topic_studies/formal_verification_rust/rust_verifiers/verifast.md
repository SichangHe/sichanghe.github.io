VeriFast for Rust: explicit ownership proofs and early checked certificates
(authored by agents unless marked 🧑)

takeaway
- VeriFast verifies functions separately using explicit memory-ownership contracts
  - KU Leuven's [official repository](https://github.com/verifast/verifast), README: “research prototype”
  - supported projects include Rust, C, and Java
- distinguish ordinary VeriFast verification from its early 2026 Rocq certificate experiment
  - the latter covers a smaller subset and still has an acknowledged unsoundness in its Rust model

how it works
- users write preconditions, postconditions, loop invariants, ownership predicates, and proof-only helper functions
  - preconditions state what callers must provide
  - postconditions state what successful calls provide
  - ownership predicates describe accessible memory and representation invariants
- the Rust frontend reads compiler MIR
  - MIR is the compiler's intermediate program representation
- symbolic execution checks each function against its contract
  - calls use the callee's contract instead of exploring the callee again
  - separation logic tracks owned memory and permits local reasoning
  - see [the 2022 technical report](https://arxiv.org/abs/2212.12976)
- users guide the opening and closing of memory predicates
  - the tool uses limited solver search
  - inference: predictable checking comes partly from moving proof structure into annotations

actual Rust case studies
- selected unsafe pointer-manipulating programs
  - [official tests](https://github.com/verifast/verifast/tree/master/tests/rust/purely_unsafe)
  - includes a constant-space tree-marking algorithm
- selected LinkedList and RawVec standard-library abstractions
  - [official README](https://github.com/verifast/verifast): “A partial proof”
  - [LinkedList proof files](https://github.com/verifast/verifast/tree/master/tests/rust/safe_abstraction/linked_list)
  - [RawVec proof files](https://github.com/verifast/verifast/tree/master/tests/rust/safe_abstraction/raw_vec)
- simplified Cell, Mutex, Rc, Arc, and RefCell
  - the README explicitly calls these simplified versions
  - [safe-abstraction tests](https://github.com/verifast/verifast/tree/master/tests/rust/safe_abstraction)
  - their existence does not establish proofs of every current upstream method
- do not attribute the repository's Linux driver, Java Card, or C cryptographic-protocol results to its Rust frontend
  - those are separate language case studies in the same project
- the sources checked here do not establish a whole production Rust system proof or a comparable total annotation count

supported properties and limits
- contracts can state memory safety and functional behavior
- RustBelt-style semantic typing can check whether unsafe implementations preserve safe abstraction invariants
- simplified concurrency examples exist
  - this is narrower evidence than arbitrary Rust threads, relaxed atomics, async, or scheduler reasoning
- loops need invariants; proof helper functions have termination obligations
  - do not infer termination of every ordinary Rust function
- supported Rust features depend on the frontend and library specifications
  - assess traits, drop behavior, panic unwinding, and external calls against the exact revision used
  - a successful check proves the selected contracts under selected external specifications

2026 foundational certificate experiment
- Bart Jacobs, [Foundational VeriFast](https://arxiv.org/abs/2601.13727v1), January 2026 version
  - records hints from VeriFast's successful symbolic execution
  - generates a Rocq script replaying the reasoning
  - proves the symbolic checker sound relative to an axiomatic model of VeriFast MIR
- its model is not yet validated against Rust execution
  - §4: “It has one known unsoundness”
  - local variables are treated as live throughout the function
  - MIR StorageLive/StorageDead operations are ignored
  - checked certificates therefore do not yet establish soundness with respect to actual Rust execution
- certificate coverage is narrower than ordinary VeriFast
  - §5 lists loops, structs, generics, and unwinding as extensions still needed
  - also lists richer predicates, proof functions, fractional permissions, and semantic typing
  - these limitations describe the certificate prototype, not all ordinary VeriFast support
- ordinary verification still trusts the tool and solver
  - certificates can eventually reduce that trust
  - they cannot repair an incorrect execution model by themselves

research we could do
- proposal: validate certificate semantics against a shared Rust model
  - builds on [hinted mirroring](https://arxiv.org/abs/2601.13727), [Radium](https://doi.org/10.1145/3656422), and [MiniRust](https://github.com/minirust/minirust)
  - new contribution: correct local lifetimes, then prove selected operational rules agree
  - why it may matter: an independently checked proof is only useful if its execution model is sound
  - begin with stack addresses escaping their scopes and reused storage
- proposal: certificates for safe library wrappers
  - builds on [ordinary VeriFast's safe-abstraction proofs](https://github.com/verifast/verifast/tree/master/tests/rust/safe_abstraction)
  - new contribution: carry semantic ownership invariants through certificate generation
  - start with Cell or a deliberately limited RawVec API
  - why it may matter: these proofs justify safe clients, rather than only pointer routines with manually supplied callers
- proposal: maintain partial upstream proofs through library changes
  - builds on the existing LinkedList and RawVec artifacts
  - new contribution: measure which API and compiler changes invalidate annotations versus executable models
  - why it may matter: proof maintenance may dominate initial verification effort
  - record assumptions and covered methods per revision

reading status
- read collected 2022 and January 2026 full texts
- checked the official README during this study
- certificate limitations above describe the January 2026 preprint version
