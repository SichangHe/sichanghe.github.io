RefinedRust: checked proofs for safe and unsafe Rust
(authored by agents unless marked 🧑)

takeaway
- RefinedRust checks functional correctness and memory safety together
  - functional correctness means the code meets its stated input/output contract
  - unlike proving safe clients alone, this can cover the raw-pointer implementation beneath their APIs
  - Gäher et al., [PLDI 2024](https://doi.org/10.1145/3656422), abstract: “checked by the Coq proof assistant”
- the 2026 extension is substantially more capable than the original prototype
  - Gäher et al., [OOPSLA 2026](https://doi.org/10.1145/3839484), §1: “traits, closures, and iterators”
  - the paper adds these features alongside unsafe code, plus recursive data structures

how it works
- users annotate functions with contracts and loops with invariants
  - an invariant states what stays true through each loop iteration
- the frontend translates Rust compiler MIR into Radium
  - MIR is the compiler's intermediate code after source-level constructs have been simplified
  - Radium is the tool's formal model of Rust execution
- proof automation checks refined ownership types inside Rocq, formerly Coq
  - refined types attach mathematical facts to ordinary Rust types
  - ownership facts describe who may access which memory
  - Iris supplies separation logic, a way to reason about separately owned pieces of memory
  - users prove remaining mathematical obligations in Rocq
  - [PLDI 2024](https://doi.org/10.1145/3656422), abstract: “using separation logic automation in Coq”

what the proof covers
- memory safety, specified results, and absence of panics for supported code
  - [OOPSLA 2026](https://doi.org/10.1145/3839484), §2: “does not cause UB or panics”
  - UB means undefined behavior, an operation outside the language's allowed behavior
  - overflow checks are proof obligations where overflow would panic
- the papers establish correctness when execution returns
  - do not infer termination, timing guarantees, or confidentiality from that alone
- 2026 support includes traits, iterator clients, stateful closures, and recursive structures
  - the original 2024 feature limitations should not be repeated as current limitations
- unsized types remain a major missing feature
  - these include types whose size is not fixed at compilation, such as slices
  - [OOPSLA 2026](https://doi.org/10.1145/3839484), §1: “proper support for unsized types”
- closure specification inference remains an author-stated improvement
  - trait objects and async are also identified as future extensions in that paper
  - treat its claim about other tools' support as the authors' assessment, not a current survey result
- neither evaluated paper establishes general concurrent Rust verification

actual verified code
- 2024: a simplified vector implementation, rather than all of upstream Vec
  - [PLDI 2024](https://doi.org/10.1145/3656422), evaluation: “120 lines of code”
  - verified selected Vec and RawVec operations and their representation invariants
  - the same passage reports 76 lines of annotations
  - allocation and mutable element access require reasoning about raw pointers
- 2026: parts of IBM's ACE security monitor for confidential RISC-V virtual machines
  - [OOPSLA 2026](https://doi.org/10.1145/3839484), §1: “around 600 lines of Rust code”
  - covers page tokens and the page allocator
  - this is a memory-management component proof, not a proof of the entire monitor or VM isolation
  - §6 reports 320 lines of specifications, 1350 supporting definitions, and 1460 proof lines
  - those counts measure different artifacts; do not describe them as annotation lines alone
  - §6 reports two allocator bugs: an incorrect pointer bound check and discarded memory during page-token creation
  - the first was not exploitable in the evaluated ACE implementation
  - the paper reports both were missed during manual specification writing
- iterator case studies were adapted from Creusot
  - §6.1 adds allocation-size preconditions
    - Creusot's assumed Vec contracts omitted the panic condition at isize::MAX
  - the Knight's Tour port also changes its size restriction
  - compare client properties and supported features, rather than assuming equal proof boundaries
- §6.2 compares proof effort for ACE page-token functions using traits, closures, and iterators
  - research that measures idiom cost must extend this existing experiment

what still needs trust
- Rocq's kernel and infrastructure
- the frontend's faithful translation of Rust into Radium
- Radium's correspondence to actual Rust and the chosen top-level theorem
  - [PLDI 2024](https://doi.org/10.1145/3656422), trusted computing base: “Radium” and “the frontend”
  - the proof automation itself need not be trusted
  - a checked proof of a model does not prove compiler correctness

research we could do
- proposal: check the frontend translation independently
  - builds on [RefinedRust](https://doi.org/10.1145/3656422) and [MiniRust](https://github.com/minirust/minirust)
  - new contribution: produce a checkable relation between selected MIR operations and the emitted Radium code
  - start with allocation, casts, and pointer arithmetic
  - why it may matter: these translations remain trusted even when every generated proof is checked
  - evaluate supported operations, rejected translations, and errors caught through deliberately corrupted translations
- proposal: infer contracts for common unsafe iterator closures
  - builds on the [2026 trait and iterator extension](https://doi.org/10.1145/3839484)
  - new contribution: derive contracts from captured ownership and checked effects
  - begin with page-token transformations in ACE
  - why it may matter: reduce manual specifications without dropping foundational checking
  - evaluate annotation reduction and unchanged proof guarantees
- proposal: verify page allocator evolution
  - builds on the [ACE case study](https://doi.org/10.1145/3839484)
  - new contribution: replay the proof across actual allocator revisions and classify repairs
  - why it may matter: maintenance cost determines whether a one-time component proof stays useful
  - evaluate changed code, changed specifications, proof repair time, and genuine bugs separately

reading status
- read collected full texts of the 2024 and October 2026 papers
- tool claims above describe those versions; they are not measurements from running RefinedRust here
