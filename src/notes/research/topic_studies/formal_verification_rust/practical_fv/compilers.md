verified compilers and compiler checking
(authored by agents unless marked 🧑)

short version

- fact: a verified source program still depends on its compiler
- fact: CompCert proves a large C compilation core; CakeML also verifies bootstrapping into executable compiler code
- fact: Alive2 checks individual LLVM transformations with bounded reasoning
  - its useful bug finding does not imply all optimized programs are correct
- inference: preserving outputs and preserving secret-independent execution require different theorems
- recommended research: detect changes in compiler behavior that invalidate properties proved about deployed systems
  - start with a narrow property and a reproducible version history

what is being verified

- semantic preservation: compiled behavior respects the source program's meaning
- translation validation: check one concrete compilation result instead of proving the compiler algorithm once
- bounded validation: restrict execution or resources during checking
  - failure to find a counterexample outside those bounds gives no universal guarantee

what existing work shows

- [CompCert official manual, introduction](https://compcert.org/man/manual001.html), current primary project documentation
  - fact: the manual describes eight intermediate languages and fifteen passes in the verified compilation phase
    - not a separately peer-reviewed new paper
  - fact: the guarantee transfers source properties to output when compilation succeeds and the relevant source semantics are satisfied
    - section 1.2: “semantic preservation”
  - fact: preprocessing and some source simplifications precede the verified phase
  - fact: producing assembly text, assembling, and linking involve external components
    - section 1.3: “we have no formal guarantees yet”
  - fact: source behavior is interpreted using CompCert's supported C semantics
    - checking unsupported extensions or source undefined behavior is a separate task
  - inference: saying a source system uses CompCert is insufficient to describe its whole trusted compilation path
  - measurement limit: this review uses the manual's pipeline counts rather than treating changing benchmark results as a timeless speed comparison

- [CakeML: A Verified Implementation of ML](https://cakeml.org/popl14.pdf), POPL 2014, peer reviewed
  - fact: verifies a substantial ML subset and an x86-64 read-eval-print loop in HOL4
    - abstract: “our compiler can bootstrap itself”
  - claim: compiler machine code implements the specified compilation algorithm
  - fact: the result covers parsing, type checking, compilation, garbage collection, and arbitrary-precision arithmetic
  - inference: bootstrapping removes dependence on an unrelated host compiler from producing the proved compiler binary
    - it still relies on the proof checker, accurate machine semantics, and execution environment
  - fact: [the current project page](https://cakeml.org/) reports eight intermediate languages and six machine-code targets
    - project page: “targets machine code for 6 architectures”
  - fact: that page explicitly asks whether its machine model and interactions with unverified C are correct
    - project page: “Are we interacting with the unverified C code correctly?”
  - measurement limit: no directly comparable industrial C workload or staffing total established here

- [Verified Inlining and Specialisation for PureCake](https://cakeml.org/esop24-inlining.pdf), ESOP 2024, peer reviewed
  - fact: adds verified inlining and loop specialization to a lazy Haskell-like compiler
    - abstract: “mechanised in the HOL4 interactive theorem prover”
  - fact: preserves compiler semantics while specializing higher-order calls with known arguments
  - inference: verified compilers can gain useful optimizations incrementally
    - this result is not a correctness proof for GHC or full Haskell
  - measurement limit: this review did not extract a reliable single aggregate speedup or engineering-cost figure

- [Alive2: Bounded Translation Validation for LLVM](https://web.ist.utl.pt/nuno.lopes/pubs/alive2-pldi21.pdf), PLDI 2021, peer reviewed
  - fact: automatically checks LLVM intermediate-representation transformations with an SMT solver
    - abstract: “there are circumstances in which it misses bugs”
  - fact: the paper reports 47 newly reported bugs, with 28 fixed at publication
    - also eight patches to LLVM's language reference
  - fact: loops are checked within bounds
    - the theorem or result must retain those bounds
  - fact: validates transformations expressed within its LLVM model
    - parser/front end, unsupported operations, code generation, assembly, linking, and hardware remain separate
  - inference: changes to the formal semantics can matter as much as fixes to optimizer code
  - maintenance limit: those counts describe the 2021 paper, not today's cumulative totals

what is missing

- inference: these sources do not supply a single proof covering arbitrary production front ends, transformations, foreign libraries, linkers, and hardware
- research gap candidate: routinely identify which compiler version changes invalidate a particular source-level proof assumption
  - general translation validation already exists
  - [ct-verif and Jasmin](crypto.md) already check optimized-code leakage and support proved assembly generation
  - a new contribution needs evidence beyond rerunning Alive2 or compiler fuzzing
- research gap candidate: connect observed low-level leakage with the precise secret-independence model used by the source proof
  - hardware behavior is not fully represented by ordinary functional compiler correctness

research we can do

- regression checking for proof-relevant compilation boundaries
  - question: does a supported compiler upgrade preserve the property a verified application actually relies on?
  - builds on [Alive2](https://web.ist.utl.pt/nuno.lopes/pubs/alive2-pldi21.pdf), [CompCert](https://compcert.org/man/manual001.html), and [HACL*](crypto.md)
  - proposed new contribution: a property-specific corpus tracking source proof, generated code, validator limits, and compiler changes together
    - choose constant-time coding or arithmetic overflow semantics first
  - why it may matter: developers can upgrade a dependency without rerunning an entire expensive verification campaign
  - first experiment: compile selected proved crypto routines across ten historical compiler releases and optimization settings
    - compare semantic validation, low-level leakage checks, and ordinary functional differential tests
  - convincing result: a real property regression missed by functional tests, with a minimized cause and a correct model explanation
  - cost estimate: six to eight weeks for a pilot, excluding a new machine semantics
    - agent estimate
  - closest work: Alive2, compiler fuzzing, constant-time checking, and verified cryptographic compilation
    - compare against ct-verif on optimized LLVM and Jasmin/EasyCrypt on proved assembly paths
    - merely combining existing checks is insufficient novelty
    - target changes to unsupported deployment assumptions, not a claim that constant-time compilation is unsolved

- validate foreign-function contracts for verified compiler runtimes
  - question: can executable contracts detect bad C interactions that remain outside a CakeML theorem?
  - builds on [CakeML](https://cakeml.org/) and refinement testing
  - proposed new contribution: automatically derive wrapper tests from the formal observable I/O assumptions
  - why it may matter: validated libraries may change while compiler proofs remain unchanged
  - first experiment: one file/socket interface, historical changes and controlled mutations
  - convincing result: fewer untested contract clauses and more distinct violations than manually written runtime tests
  - cost estimate: one to two months for a narrow interface
  - closest work: foreign-function verification and contract-based testing
    - novelty search remains incomplete

ChatGPT's opinion

- Extra High consultation submitted with the storage and crypto findings
  - local helper attempt failed with a redacted diagnostic
  - see [consolidated research directions](research_directions.md) for the group consultation

what was searched

- opened CompCert manual, CakeML project page, CakeML POPL 2014 PDF, PureCake ESOP 2024 PDF, Alive2 PLDI 2021 PDF
- inspected the human's notes on compilation assumptions and testing against specifications
- primary-source fetches succeeded; search tool failed with HTTP 404
- not covered deeply: CompCert extensions, Vellvm, Crellvm, verified LLVM-to-machine-code paths, JIT validation, GPU compilers, recent Alive2 development
  - no exhaustive novelty claim
- overlap: [crypto](crypto.md) covers leakage preservation; [trusted base](spec_quality_trusted_base.md) covers general trust accounting
