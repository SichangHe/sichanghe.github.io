proving concurrent and asynchronous Rust correct
(authored by agents unless marked 🧑)

short version
- the reviewed Verus proofs use sequentially consistent (SeqCst) atomics
  - Verus and IronSync prove under SeqCst plus race-free plain memory
    - fact: IronSync "does not take advantage of the weaker atomic memory orderings (e.g., release-acquire ordering or relaxed)" ([Hance et al., OSDI 2023](https://par.nsf.gov/biblio/10379023))
    - fact: Verus paper says RustBelt "can also handle atomics with relaxed memory ordering [Dang et al. 2020], which Verus does not support" ([Lattuada et al., OOPSLA 2023](https://arxiv.org/abs/2303.05491))
  - other reviewed work proves relaxed-memory library reasoning in Iris and a logic for Arc
    - [Jacobs and Fasse 2025](https://arxiv.org/abs/2505.00449)
- I found no general functional-verification support for async/await in the reviewed program verifiers
  - Rumpsteak checks asynchronous message protocols through types, as described below
  - fact: Kani 2026 lists "sequential execution (no threads or async)" as an assumption
  - fact from the existing notes: [Charon lists async as unsupported](aeneas.md), [RefinedRust lists async as future work](refinedrust.md)
  - gap: not found in Verus, Creusot, VeriFast or Gillian-Rust docs either (my search was thin, see end)
- Loom, Shuttle, Miri, and RustMC check executions under different bounds and memory models
  - Loom (exhaustive but small and not full C11), Shuttle (random schedules), Miri (one execution), Miri with GenMC and RustMC (exhaustive under the C++ memory model, early)
  - exhaustive checking can prove a property for the modelled finite harness
  - randomized testing establishes only that the sampled executions passed
- the std-library campaign has no accepted solution for atomics or Arc
  - fact: "neither has received accepted solutions" ([Cook et al. 2026](https://arxiv.org/abs/2606.17374))
- interrupt-driven code is verified by modelling the interrupt as a call that can happen anywhere in kernel code, not as weak-memory concurrency
  - [TickTock, SOSP 2025](https://cseweb.ucsd.edu/~dstefan/pubs/rindisbacher:2025:ticktock.pdf) does this with Flux
- best ideas
  - add release/acquire atomics to Verus and prove one real lock-free structure with it
  - run proofs and bounded checkers on the same code, mutating memory orderings, to see who catches what
  - prove a minimal executor-plus-waker has no lost wakeup, then compare with Loom and Shuttle

what the topic is
- three different problems get called "concurrent Rust"
  - data races: threads make conflicting non-atomic accesses without ordering
    - at least one access writes
    - safe Rust rules these out by types; unsafe code (locks, Arc, queues) must be proved
  - weak memory: atomics with Relaxed, Acquire, Release let hardware and compiler reorder, so reasoning by interleaving is not enough
  - progress: no deadlock, no lost wakeup, every request finishes
    - async adds cancellation and wakers; see [async bugs](../rust_language/async_concurrency_bugs.md)
- deductive proofs and exhaustive model checking both establish claims within their models
  - bounded checking restricts inputs, executions, or thread counts
  - random testing samples executions
  - what a proof covers is set by its memory model; check that first

what existing work shows

shared memory, locks, atomics: SMT-style provers (Verus family)
- the existing note on Verus has the basics: [verus.md](verus.md); this part adds the concurrency details
- Verus ghost state, [Lattuada et al., OOPSLA 2023](https://arxiv.org/abs/2303.05491), peer reviewed
  - did: user-defined ghost state ("tokenized state machines", Rust macro `tokenized_state_machine!`) plus `AtomicInvariant`
    - a token is a ghost value that proves you may take one step; having it is the permission
    - the user proves the state machine's invariant once; each program step must then hand over the right token
  - number: FIFO ring buffer with atomic head and tail: 220 lines of code, 119 of proof, 138 of spec, 4.58 s; reader-writer lock: 200, 80, 145, 4.44 s (Fig. in §7)
  - limit: an invariant can only be opened around one atomic operation
    - fact: "this comes with an additional requirement, that the invariant may only be opened for atomic operations"
  - limit: no relaxed ordering (quote above)
  - naming: the [Verus guide](https://verus-lang.github.io/verus/state_machines/) calls the feature tokenized state machines
    - this survey did not establish a separate tool called VerusSync
- IronSync, "Sharding the State Machine", [Hance et al., OSDI 2023](https://par.nsf.gov/biblio/10379023), peer reviewed
  - did: ownership types plus a "localized transition system" (a state machine split into pieces, one piece per thread)
    - this is the design Verus's state machines come from
    - note: the system was written in Dafny, not Rust; the same authors then moved the ideas into Verus (claim, their abstract and the Verus paper)
  - number: verified two systems of thousands of lines: node replication (NUMA black-box replication) and a concurrent page cache; claim: "Each case study's performance matches its unverified" original
  - memory model, quote: "IronSync supports data-race-free non-atomic memory and sequentially-consistent atomic memory"
    - inference: relies on the DRF-SC theorem: if all plain accesses are race-free, execution looks sequentially consistent; so the SeqCst-only restriction costs speed on weak hardware, not safety
- VerusBelt, [Hance et al., PLDI 2026](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf), peer reviewed
  - did: proves in Iris that Verus's proof types (including `AtomicInvariant`, `LocalInvariant`) are sound
  - memory model, quote: "supports atomics with “sequentially consistent” ordering (SeqCst), together with non-atomic ordering, in which any data race is considered undefined behavior"
  - limit, quote: the one-atomic-op rule is justified by a global "atomic lock" argument that they "leave ... as an informal one"
  - see also [verus.md](verus.md) for the rest of VerusBelt
- logical atomicity in Verus, [Bies, Hance, Dreyer, Iris Workshop 2026 talk](https://iris-project.org/workshop-2026/slides/bies.pdf), slides only, not a paper
  - did: adds Iris-style "atomic updates" so a library function can say "this call behaves as one atomic step at some point" (a linearization point)
    - old way in Verus is the HOCAP style, which the slides say is "Inherently higher-order & complicated encoding"
  - claim: the slides say the HOCAP style "Has been used to verify CapybaraKV (LeBlanc et al. OSDI'25)"
  - example: a verified `increment` using a compare-exchange loop, but with SeqCst
  - status: a talk; I found no paper yet
- Verus in kernels: [Atmosphere, CortenMM, vostd](newer_tools_2025_2026.md)
  - fact (vostd README): verifies OSTD's `sync` module and `rwlock` and `spinlock`, and says verification "surfaced real bugs in OSTD and the upstream Asterinas kernel"
  - not checked: what memory ordering their lock proofs assume

shared memory: foundational and separation-logic tools
- RustBelt Relaxed, [Dang, Jourdan, Kaiser, Dreyer, POPL 2020](https://people.mpi-sws.org/~dreyer/papers/rbrlx/paper.pdf), peer reviewed (published as "RustBelt Meets Relaxed Memory"; I read the draft titled "RustBelt Relaxed")
  - did: redoes the RustBelt soundness proof in Coq/Iris under a relaxed memory model
  - quote: "in the process uncovering a data race in the Arc library"
  - limit: proves the type system and chosen libraries sound; it does not verify your code
- Verifying Arc under C20, [Jacobs and Fasse, 2025](https://arxiv.org/abs/2505.00449), journal article (Journal of Object Technology format; I did not confirm the issue)
  - did: a logic for relaxed atomics and fences, with a soundness argument against C20 and a stronger-but-close model YC20 (YC20 rules out out-of-thin-air values and allows load buffering)
  - quote: "sufficient for verifying the core of Rust's Atomic Reference Counting (ARC) algorithm"
  - limit: only core Arc; soundness for C20 leans on a static check and leaves "an open sub-problem" (abstract summary)
  - inference: this is the strongest relaxed-memory proof of real Rust-library logic I found, but it is a logic and a pen-and-paper-style proof, not a Rust tool you can run on your crate
- VeriFast, [verifast.md](verifast.md)
  - fact ([Cook et al. 2026](https://arxiv.org/abs/2606.17374)): it "inherently verifies absence of data races and can check the proof obligations implied by Send and Sync implementations; its test suite already includes proofs of simplified Mutex and Arc implementations using sequentially consistent atomics"
  - [Jacobs 2025](https://arxiv.org/abs/2505.04500) formalizes VeriFast's logic "without laters" for fine-grained concurrency; preprint
  - [Foundational VeriFast, Jacobs 2026](https://arxiv.org/abs/2601.13727): makes VeriFast emit Rocq proofs; early, 8 pages, Rust only; preprint
  - limit: relaxed-memory logic of Jacobs and Fasse is not the same as shipped VeriFast support (inference; I did not test VeriFast)
- Corten, [Farka et al., arXiv Sept 2026](https://arxiv.org/abs/2609.04372), preprint: Iris-in-Rocq framework over Rust's THIR
  - abstract does not mention concurrency (I only read the abstract page)
- RefinedRust, [refinedrust.md](refinedrust.md): no general concurrent Rust verification in its evaluated papers
- Creusot, [creusot.md](creusot.md)
  - fact (Bies talk): Creusot uses HOCAP-style logical atomicity (Denis et al., ICFEM 2022)
  - fact (existing note): concurrency is a prototype with SeqCst atomics only
- Gillian-Rust, [gillian_rust.md](gillian_rust.md): does not address concurrency-specific verification
- Aeneas: concurrency "ongoing extension" per [aeneas.md](aeneas.md)

refinement and liveness for distributed Rust
- Refinement Proofs in Rust Using Ghost Locks, [Bílý, Pereira, Schär, Müller, PLDI 2024](https://arxiv.org/abs/2311.14452), peer reviewed
  - did: proves a Rust program refines an abstract state-machine model, for safety and liveness (progress), with "ghost locks" to share proof state between threads
  - implemented in Prusti (§ on implementation), evaluated on a simplified Memcached plus smaller cases
  - liveness is stated as LTL formulas and proved under fairness assumptions about the network (fact, §3.4)
  - limit: simplified Memcached only; the memory model is not the point of the paper (I did not check which atomics it uses)
- Anvil (Verus, liveness of Kubernetes controllers): [verified_systems.md](verified_systems.md)

message passing
- Rumpsteak, [Cutner, Yoshida, Vassor, PPoPP 2022](https://arxiv.org/abs/2112.12693), peer reviewed
  - did: a Rust library where a protocol is a "multiparty session type"; if your code type-checks against it, it cannot deadlock
    - works with async/await; allows sending and receiving in any order the protocol permits
  - number: "around 1.7–8.6x more efficient" than three earlier Rust session-type libraries
  - limit: checks the protocol shape, not what the messages compute; it is a type check plus an offline algorithm, not a proof about your unsafe code
- no Rust channel implementation proof found (crossbeam, mpsc, tokio channels)
  - gap, see below

interrupts and embedded code
- TickTock, [Rindisbacher et al., SOSP 2025](https://cseweb.ucsd.edu/~dstefan/pubs/rindisbacher:2025:ticktock.pdf), peer reviewed
  - did: Flux proofs of process isolation in the Tock kernel, including interrupt handlers and context switch, via an executable ARMv7-M model ("FluxArm")
  - found: several isolation bugs, some in interrupt handling (fact, intro)
  - how interrupts are modelled: the handler is a step the model may take at any point (a `preempt` method); the proof is about CPU mode and MPU state
  - limit: single-core, no shared-memory race or weak-memory reasoning (inference from what the paper models; it does not claim it)
- RTIC, [Dzialo et al., DVCon](https://dvcon-proceedings.org/wp-content/uploads/Minimally-Intrusive-Safety-and-Security-Verification-of-Rust-RTIC-Applications.pdf), slides-style proceedings
  - did: symbolic execution of the compiled binary for RTIC apps, to check memory access, absence of panic, and worst-case time
  - RTIC's own claim: scheduling by Stack Resource Policy, "Guaranteed* free of race conditions/deadlocks"
  - limit: a verification of the binary's accesses and timing, not a functional proof
- no proof of an interrupt-to-main-loop lock-free queue (heapless-style) found

async/await
- verifiers: nothing found (quotes above)
- bug and test side: [async bugs note](../rust_language/async_concurrency_bugs.md) covers cancellation, Gray et al. OOPSLA 2026, Tip 2026
- inference: async is easier to prove than threads in one respect, a single-threaded executor has no weak memory; the hard part is the state machine the compiler generates from `async fn`, which no verifier front end models yet

bounded checkers instead of proofs
- Loom and Shuttle: [existing note](../rust_language/async_concurrency_bugs.md#schedule-testing-methods)
  - how they are used for real: [Bornholt et al., SOSP 2021](https://www.cs.utexas.edu/%7Ebornholt/papers/shardstore-sosp21.pdf), peer reviewed
    - did: Amazon S3 ShardStore checked for linearizability against a reference model with Loom (small, sound) and Shuttle (large, random)
    - number: "prevented 16 issues from reaching production" (all checks together, not only concurrency)
    - limit: random Shuttle runs are not sound; quote from RustMC: Shuttle "aims at better scalability at the cost of soundness"
  - Loom gaps, [Muntwiler thesis 2025](https://ethz.ch/content/dam/ethz/special-interest/infk/inst-pls/plf-dam/documents/StudentProjects/MasterTheses/2025-Patrick-Thesis.pdf), thesis, not peer reviewed
    - quote: "Loom does not model the C11 memory model precisely, namely missing support for the atomic Sequential Consistency ordering, and not being able to produce all weak memory effects allowed by C11"
    - quote: "The biggest drawback of Loom is that it cannot detect any UB unless it causes a crash or assertion failure"
- Miri's own weak-memory emulation: exists, covers relaxed, acquire, release (Miri source and README; I read the search summary, not the source)
  - clean run is one execution only: see [unsafe_rust_foundations.md](unsafe_rust_foundations.md)
- Miri-GenMC: [doc](https://rust.googlesource.com/miri/+/HEAD/doc/genmc.md), flag `-Zmiri-genmc`
  - did: explores supported executions of its model within the harness bounds
  - limits (fact, doc): no `compare_exchange_weak` spurious failures; no separate failure ordering in `compare_exchange`; needs `-Zmiri-disable-stacked-borrows`; "WIP"; `cargo miri test` unsupported
  - claim (thesis): can "outperform existing, state-of-the-art concurrency testing tools for Rust code in terms of bug detection capabilities, ease-of-use and in certain cases even in verification performance"
- RustMC, [Pearce, Lange, O'Keeffe, arXiv 2025](https://arxiv.org/abs/2502.06293), later FORTE 2026 per the [Royal Holloway record](https://pure.royalholloway.ac.uk/en/publications/rustmc-automated-verification-of-real-world-concurrent-rust/)
  - did: GenMC on LLVM IR of Rust plus C/C++ dependencies, so FFI races are covered
  - claim: "the only available framework capable of exhaustively exploring the state space of Rust programs and their dependencies"
  - FORTE abstract: tested against Loom's test suite and production concurrent data structures; I did not read the numbers
  - limit: exhaustive only for the harness inputs and thread counts
- Kani: [kani.md](kani.md); 2026 paper [Delmas et al.](https://arxiv.org/abs/2607.01504) lists "sequential execution (no threads or async)"
  - claim ([Lessons from std verification, 2025](https://arxiv.org/abs/2510.01072)): "Kani’s documentation states that it does not support concurrent features"; the backends CBMC and ESBMC "were both designed for concurrency", so the limit is the Rust front end (authors' belief)
- Lockbud, RcChecker and other static bug finders: see [async bugs note](../rust_language/async_concurrency_bugs.md)

what is missing
- relaxed-memory proofs in a tool you can run
  - evidence: Verus and IronSync are SeqCst-only; relaxed proofs exist only in a logic ([Jacobs and Fasse](https://arxiv.org/abs/2505.00449)) and in the type-system proof (RBrlx)
  - evidence: std-library challenges 7 (atomics) and 27 (Arc) unsolved
- general functional verification of async/await in the reviewed program verifiers
  - evidence: two reviewed tools list async as unsupported or future work
  - Rumpsteak's protocol checks cover a narrower asynchronous property
  - the generated state machine, `Pin`, wakers and cancellation (drop at an await point) have no proof-level model that I found
- proofs of lock-free code against a model checker's view
  - no paper I found checks a proved structure and a Loom/GenMC harness side by side
- channel and executor libraries
  - no proof of mpsc, crossbeam channels, or an executor's waker contract
- interrupt-driven shared state
  - TickTock proves isolation, not that an interrupt handler and the main loop share a buffer correctly
- logical atomicity in Verus is a talk, with no paper
- memory-ordering bugs from the field, such as the `spin` crate's wrong orderings that broke mutual exclusion ([CVE-2019-16137](https://vulert.com/vuln-db/crates-io-spin-92828), seen only as a search hit, not opened)
  - I found no study of whether SeqCst-only proofs or bounded checkers would have caught such bugs

research we can do

idea 1: release/acquire atomics in Verus
- question: can Verus prove an Arc-like counter and a single-producer single-consumer ring buffer when the atomics are Acquire/Release, not SeqCst?
- builds on
  - [IronSync](https://par.nsf.gov/biblio/10379023) and [Verus ghost state](https://arxiv.org/abs/2303.05491) for the proof style
  - [Jacobs and Fasse](https://arxiv.org/abs/2505.00449) for the logic
  - [VerusBelt](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf) for soundness of the ghost layer
- what is new: ghost tokens that also carry "what this thread has seen" (a view), an extension no Verus paper has
- why it may matter: real queues and Arc use weaker orderings for speed; today they are outside the proof
- first experiment: the existing FIFO in the Verus paper, with head and tail loads changed to Acquire and stores to Release, then show the proof breaks without the right ordering
- convincing result: the proof goes through, and weakening any single ordering makes it fail, matching what a weak-memory checker finds
- cost: high; needs a soundness argument (months), though a trusted-axiom prototype is weeks
- closest scoop: Dreyer's group (they say Verus lacks relaxed; they are building Verus extensions as in the Bies talk), and Jacobs for VeriFast

idea 2: proofs versus bounded checkers on the same code, with mutated orderings
- question: for a lock-free structure, which orderings does a SeqCst proof, Loom, Shuttle, Miri, Miri-GenMC and RustMC each accept or reject?
- builds on
  - [Muntwiler thesis](https://ethz.ch/content/dam/ethz/special-interest/infk/inst-pls/plf-dam/documents/StudentProjects/MasterTheses/2025-Patrick-Thesis.pdf) and [RustMC](https://arxiv.org/abs/2502.06293) which compare mainly with Loom
  - the Verus FIFO and `spin`-style locks as targets
- what is new: a table of "ordering mutation versus tool" including the proof tools; I found no such comparison
  - distinguish rejection of unsupported orderings from verification under an abstraction that replaces them with SeqCst
    - a proof under the replacement says nothing about the original weak ordering
- why it may matter: tells practitioners which tool to trust for which ordering bug
- first experiment: 5 structures (Treiber stack, SPSC queue, spinlock, Arc, seqlock), for each, every single-site ordering weakening; record detect or miss, time and false alarms
- convincing result: identify which mutations each tool detects, rejects as unsupported, or cannot cover
- cost: low, a few weeks; no new theory
- closest scoop: the RustMC FORTE paper (compares with Loom's test suite); the Miri-GenMC authors

idea 3: minimal executor and waker proof
- question: can we prove that a small executor and its wakers never lose a wakeup, and that dropping a future at an await point leaves the executor consistent?
- builds on [async bugs note](../rust_language/async_concurrency_bugs.md), [Gray et al.](https://arxiv.org/abs/2608.20677) (cancellation semantics), Verus state machines
- what is new: first proof-level model of poll, wake and cancel for Rust futures, by hand-writing the `Future` state machine in Verus instead of using `async fn`
- why it may matter: most async Rust bugs sit in this contract, not in memory safety
- first experiment: single-thread executor with one task and one waker, then two wakers across threads with SeqCst atomics (Verus can do that today); check the proof against a Loom test of the same code
- convincing result: a proof, plus a seeded lost-wakeup bug that the proof rejects and a plain test misses
- cost: medium, a few months; real `async fn` support would need front-end work (hard part)
- closest scoop: unknown; my async search was thin, check Verus mailing list and Zulip first

smaller leads
- interrupt plus main-loop SPSC queue proof, using TickTock's interrupt model for the preemption step and idea 1 for the atomics
- a Rumpsteak-style protocol check whose generated code is proved to follow the protocol in Verus (deadlock freedom by type plus functional proof)

what I searched
- web search queries (about 20)
  - VerusSync, tokenized state machines, atomics; Verus weak memory; Verus/Creusot/Iris async executor; ghost locks; Verus interrupt and lock-free queue; Miri GenMC; Kani concurrency; IronSync; Creusot logical atomicity; Tokio executor verification; Loom, Shuttle, Miri comparison; verified lock-free Rust 2026; Kani async; VeriFast Rust concurrency; session types Rust; Rust embedded interrupt verification; Verus Mutex/RwLock/Asterinas; Iris async; ShardStore
- opened and read (text or abstract): Verus OOPSLA 2023, VerusBelt, IronSync, ghost locks, Jacobs-Fasse, RBrlx (draft), Bies talk, Hance FMCAD abstract, RustMC, Miri-GenMC doc and thesis, Kani 2026, Cook et al. 2026, std lessons 2025, TickTock, Rumpsteak, RTIC slides, ShardStore, Foundational VeriFast, VeriFast logic, Corten (abstracts only for the last three)
- added to the paper collection: Jacobs-Fasse, RustMC, Rumpsteak, Muntwiler thesis, RBrlx draft
- not covered
  - the Springer chapter 10.1007/978-3-032-26220-2_20 (paywalled; unidentified)
  - Atmosphere and CortenMM lock proofs, and their memory orderings
  - Loom and Shuttle source and issues; Miri weak-memory source (only search summaries)
  - Creusot, Verus, Gillian-Rust and Prusti repositories for async; no async hit means "not found", not "unsupported"
  - formal-methods work outside Rust that could transfer: TLA+, P, Stateright, Turmoil, Lincheck, GenMC's C/C++ papers
  - ChatGPT opinion (unavailable)
