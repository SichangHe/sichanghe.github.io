LLMs writing and repairing ordinary Rust
(authored by agents unless marked 🧑)

the useful question
- inference: Rust compilation provides strong feedback about types and borrowing
  - it does not establish that a generated program implements the requested behavior
- proposal: study the gap between a repair that compiles and a repair we would accept
  - include behavior, resource use, interfaces, and unsafe operations
- proof generation is reviewed in the sibling LLM-for-verification study
  - this file concerns ordinary Rust development
- source cutoff: 2026-10-07
  - recent model and benchmark discovery remains incomplete

RustAssistant
- [Deligiannis, Lal, Mehrotra, Poddar, Rastogi, ICSE 2025](https://www.microsoft.com/en-us/research/publication/rustassistant-using-llms-to-fix-compilation-errors-in-rust-code/)
  - repairs Rust compilation errors with LLM suggestions
  - [full paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/08/paper.pdf)
  - workflow
    - compile and select an error
    - retrieve related source locations
    - ask the LLM for an edit
    - compile again and repair new errors
    - restore the previous version when repair fails
  - authors, section II: “must also retain the intended semantics of the code”
    - input code does not compile
    - intent is assessed using tests or the actual developer repair
    - this differs from proving equivalence between two already defined programs
  - authors, introduction: “182 GitHub commits”
    - drawn from popular Rust crates
    - additional sets contain 270 authored examples and 50 Stack Overflow programs
  - reported GPT-4 repair rates
    - 73.63% for GitHub commits
    - 72% for Stack Overflow examples
    - 92.59% for authored examples
    - these are study results for their models, prompts, and dataset
    - not predictions for current models or arbitrary repositories
  - authors, section II: “unsafe keyword”
    - errors involving its use are excluded
    - build-configuration edits are also outside scope
    - inference: success does not establish soundness of generated unsafe wrappers
  - an example changes a returned reference to an atomically counted shared pointer
    - also changes the collection's value type
    - inference: valid repair can change interface and allocation costs
    - useful motivation for evaluating more than whether the compiler accepts the edit

relation to translation
- [C2Rust postprocessor](https://github.com/immunant/c2rust/blob/master/c2rust-postprocess/README.md)
  - maintainers: “not a replacement for these efforts”
    - refers to humans or more extensive agent workflows producing fully safe and idiomatic Rust
  - inference: migration assistance should be evaluated as a pipeline
    - upstream translation can preserve a behavior that later cleanup changes
    - separate failure attribution for translation, repair, and ownership redesign
- [translation review and proposals](c_to_rust_translation.md)
  - covers deterministic translators, learned translation, interoperability, and behavior preservation

research we could do
- proposal 1: measure what compiler-guided repair quietly changes
  - prior: RustAssistant's real compilation-error dataset and developer-repair comparison
  - question: which successful repairs change behavior, resource cost, or public interfaces?
  - proposed new contribution: classify accepted repairs by observable consequences
    - include cloning, reference counting, allocation, locking, and newly introduced panics
    - distinguish necessary redesign from avoidable cost
  - evaluation
    - historical real commits with developer repairs kept hidden from the model
    - independent tests that fail for plausible wrong repairs
    - allocation counts, representative workloads, and interface compatibility checks
    - compare compiler-only feedback against test and performance feedback
    - use equally capped attempts and report cost per acceptable repair
  - why it may matter: the easiest way to silence a borrow error can be a poor systems design
  - novelty uncertainty: repository-level repair benchmarks and current Rust agents need further screening
- proposal 2: study unsafe introduced to escape borrow errors
  - prior: RustAssistant explicitly excludes unsafe-related errors
  - question: how often do assistants introduce raw pointers or unsound wrappers when safe repair is difficult?
  - proposed new contribution: a task set with independent adversarial clients for proposed safe interfaces
    - clients exercise operations that a safe caller is allowed to perform
    - seek violations of the wrapper's hidden memory assumptions
  - evaluation
    - compare unrestricted repair against repair forbidden to add unsafe operations
    - run Miri on supported cases and manually inspect remaining obligations
    - report useful safe repairs, unsafe repairs, runtime failures, and unresolved tasks separately
    - do not count an unexplored execution as evidence of soundness
  - why it may matter: compilation can accept unsafe shortcuts that undermine Rust's intended benefit
  - novelty uncertainty: unsafe-code generation and wrapper-soundness studies may overlap
- proposal 3: find the context a multi-file ownership repair actually needs
  - prior: RustAssistant retrieves source regions related to compiler errors
  - question: do callers, cleanup paths, or async cancellation behavior explain failures that local context misses?
  - proposed new contribution: controlled comparison of context chosen by error locations and context chosen by ownership obligations
  - evaluation
    - tasks with multiple files and actual caller tests
    - equal token budgets across retrieval methods
    - compare acceptable repair rate, edit scope, and public-interface changes
    - include realistic failures involving lock guards, returned references, and dropped async operations
  - why it may matter: an edit can fix the reported location while moving the problem to callers
  - novelty uncertainty: dependency-aware repair is established broadly
    - the Rust-specific ownership and cancellation contribution must be demonstrated

limits of this review
- no comprehensive comparison of current commercial coding agents
- no unsupported claim that newer models solve ownership or unsafe reasoning
- no overall rate for incorrect generated Rust
  - requires a defined task population and independent assessment
