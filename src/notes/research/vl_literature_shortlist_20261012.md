# Literature shortlist for Verus work
(authored by agents unless marked 🧑)

## How this list was made

- 20,239 papers were collected. A script discarded 14,385 clear-noise titles.
- Cheap language-model readers read the title and abstract of the other 5,854, one by one.
- Each got a score from 0 to 100 and one line on what it offers for Verus work.
- This page lists the 697 papers scoring 60 or more.
- Papers are grouped by kind, then by technique. Highest score first.

## Limits

- Titles and abstracts only. Nobody read the full papers.
- Readers were cheap models. Scores are triage, not verdicts.
- A spot check of 60 records found 2 borderline over-keeps.
- 868 of the 5,854 had no abstract and were judged by title alone.
- 57 of the papers below are title-only judgments.
- Google Scholar-only entries are not covered yet.
- Group and technique labels were also assigned by cheap models.
- Papers with a study link have a longer walkthrough.

## Verus itself (8)

### Ghost state, permissions and ownership logic (3)

- Verus: Verifying Rust Programs using Linear Ghost Types (2023), score 95
  https://doi.org/10.1145/3586037
  Verus paper on linear ghost types, mode system, and a lambda-calculus soundness formalization with pointer and concurrency examples.
  Study: [verus_linear](vl_paper_walkthrough/verus_linear_20261012.md)
- Verus: Verifying Rust Programs using Linear Ghost Types (extended version) (2023), score 95
  http://arxiv.org/abs/2303.05491v2
  Extended version of the Verus linear ghost types paper with the same design and formalization.
- Verifying Probabilistic Programs in Rust (2026), score 80
  http://arxiv.org/abs/2607.12282v1
  Alerus: extends Verus with probabilistic error credits to verify randomized sampling algorithms in Rust, with soundness via VerusBelt.
  Study: [probabilistic_rust](vl_paper_walkthrough/probabilistic_rust_20261012.md)

### SMT engineering and proof stability (1)

- Tunable Automation in Automated Program Verification (2025), score 85
  http://arxiv.org/abs/2512.03926v1
  Tunable quantifier instantiation in Verus letting library authors and users set the automation level per module, function or context.

### Rust semantics and unsafe code (1)

- VerusBelt: A Semantic Foundation for Verus’s Proof-Oriented Extensions to the Rust Type System (2026), score 85
  https://www.semanticscholar.org/paper/9571023d66a9132f91c1385e0601a897a20accb5
  VerusBelt: semantic soundness proof of Verus's proof-oriented types, with lifetimes, concurrency and borrows, mechanized in Iris/Rocq.
  Study: [verusbelt](vl_paper_walkthrough/verusbelt_20261012.md)

### Benchmarks, evaluations and surveys (1)

- Identifying Challenges and Practitioner Techniques in the Use of Verification-Aware Programming Languages (2026), score 75
  https://openalex.org/W7200480583
  mines practitioner videos of verification-aware languages to find proof debugging and error message pain points, guides VL developer-experience design

### Other verification methods (2)

- Verus: A Practical Foundation for Systems Verification (2024), score 90
  https://www.semanticscholar.org/paper/b7b3d2695da710cd8fa8bb490218c49516b03cc6
  Verus system paper: design for faster verification of distributed systems, page tables and allocators, 3-61x faster than prior tools.
  Study: [verus_practical](vl_paper_walkthrough/verus_practical_20261012.md)
- Verifying Rust code with Verus (2026), score 85
  https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_1
  Tutorial on Verus, its design rationale versus prior approaches, getting started, and examples, from a core developer.

## Other Rust verifiers and Rust semantics (126)

### Invariant and annotation inference (1)

- Flux: Liquid Types for Rust (2022), score 88
  http://arxiv.org/abs/2207.04034v2
  liquid-type refinement checker for Rust with loop-invariant inference; beats Prusti on lightweight vector verification by slashing spec lines and time

### Specification synthesis (2)

- Specifying and Verifying Higher-order Rust Iterators (2023), score 90
  https://doi.org/10.1007/978-3-031-30820-8_9
  first-order specs for Rust iterators, verified with Creusot; directly applicable to specifying Rust library iterators in Verus
- Leveraging rust types for modular specification and verification (2019), score 85
  https://doi.org/10.1145/3360573
  uses Rust's type system to synthesise separation-logic proofs automatically, so users write specs only in Rust expressions

### Ghost state, permissions and ownership logic (10)

- The CREUSOT Environment for the Deductive Verification of Rust Programs (2021), score 95
  https://openalex.org/W4286682192
  Creusot deductive verifier for Rust with prophecies and trait-based specs; direct technique and competitor for Verus
- Using a Prophecy-Based Encoding of Rust Borrows in a Realistic Verification Tool (2025), score 95
  https://openalex.org/W4414486737
  prophecy-based encoding of Rust mutable borrows in Creusot, adds ghost code and type invariants, directly applicable to Verus borrow reasoning
- Formal account of ghost snapshots in a verification tool for Rust (2025), score 92
  https://doi.org/10.5281/zenodo.20425557
  Soundness account of ghost snapshots and mutable borrows in Creusot, a Rust deductive verifier, directly on Rust verification soundness
- RefinedC: automating the foundational verification of C code with refined ownership types (2021), score 90
  https://doi.org/10.1145/3453483.3454036
  RefinedC combines ownership types with refinement types to verify C automatically in Coq, a close analogue of Verus ownership reasoning
- Resource Specifications for Resource-Manipulating Programs (2023), score 90
  https://doi.org/10.48550/arxiv.2304.12530
  extends the Prusti verifier with first-class user-defined resources to shorten specs for resource-manipulating Rust smart contracts, directly applicable to Rust verifier work
- Using the Prophecy-Based Encoding of Rust Borrows in a Realistic Verification Tool (None), score 88
  https://www.semanticscholar.org/paper/b5a24b5d6c3af7fe90fbe158d06d2fd1ed1738e3
  duplicate record of the Creusot prophecy encoding for Rust borrows, title alone on-topic, no abstract
  (title only, no abstract)
- Nola: Later-Free Ghost State for Verifying Termination in Iris (2025), score 85
  https://doi.org/10.1145/3729250
  Later-free ghost state in Iris for termination verification of Rust with borrows, a prototype RustHalt for total correctness
- Borrowable Fractional Ownership Types for Verification (2023), score 85
  http://arxiv.org/abs/2310.20430v1
  borrowable fractional ownership types reduce verification of imperative reference programs to functional ones, combining RustHorn and ConSORT; direct technique for Rust borrow reasoning in Verus
- Using Ghost Ownership to Verify Union-Find and Persistent Arrays in Rust (2026), score 80
  https://www.semanticscholar.org/paper/7df384872533ea8ea9e1899cbb62cc292f149036
  Creusot extended with linear ghost resources to verify union-find and persistent arrays via interior mutability.
- GhostCell: separating permissions from data in Rust (2021), score 70
  https://doi.org/10.1145/3473597
  GhostCell separates Rust permissions from data via branded types, proved sound in RustBelt; ownership technique relevant to Verus

### Refinement proofs and refinement types (5)

- Artifact for "Bringing Foundational Verification to Real-World Rust Code" (2026), score 95
  https://doi.org/10.5281/zenodo.21506722
  artifact for RefinedRust, a foundational verifier for real-world Rust code; directly the same verification target as Verus
- Thrust: A Prophecy-Based Refinement Type System for Rust (2025), score 92
  https://doi.org/10.1145/3729333
  Prophecy-based refinement type verifier for Rust with CHC-solver invariant synthesis and borrow handling; direct Verus competitor and technique source
- Generic Refinement Types (2025), score 90
  https://www.semanticscholar.org/paper/ec23dcf8fb4f4a5a199550041b141b279c9e33d8
  Generic refinement types for Rust trait specifications with SMT-decidable verification in Flux, directly on Rust refinement-based verification
- RefinedRust: A Type System for High-Assurance Verification of Rust Programs (2024), score 85
  https://doi.org/10.1145/3656422
  foundational Coq refinement type system for unsafe Rust Vec, separation logic automation; a model for proving unsafe pointer code in Verus
- Bringing Foundational Verification to Real-World Rust Code (2026), score 82
  https://doi.org/10.1145/3839484
  Extends foundational RefinedRust with traits, closures and iterators while verifying a real ACE monitor allocator, showing how high-level Rust features are verified alongside unsafe code

### SMT engineering and proof stability (1)

- Ravencheck: Effectively-Propositional Reasoning for Rust (2026), score 88
  https://www.semanticscholar.org/paper/37ebd35ebf418e770b3ae87f243177b0d9f68235
  Rust verifier encoding Rust into effectively propositional logic for decidable, predictable SMT outcomes, directly comparable to Verus's instability problem

### Rust semantics and unsafe code (59)

- Vérification déductive de programmes Rust (2023), score 95
  https://doi.org/10.70675/a795c735zd4fbz4401z8e08z7c353004d1ad
  prophecy-based deductive verifier for Rust mutable borrows with Coq-proved encoding and iterator support; core technique for Verus
- Vérification déductive de programmes Rust. (Deductive verification of Rust programs) (2023), score 95
  https://www.semanticscholar.org/paper/08518c69a380534e95eaa91ea91eafa428fc16c2
  same thesis as record 255, prophecy encoding of Rust borrows with Coq-proved obligation generation; directly applicable to Verus
- RustHorn: CHC-based Verification for Rust Programs (2021), score 95
  https://doi.org/10.1145/3462205
  reduces pointer-manipulating Rust to CHCs using ownership permissions with proven soundness; core technique for automated Rust verification
- RustHorn: CHC-based Verification for Rust Programs (full version) (2020), score 95
  http://arxiv.org/abs/2002.09002v2
  full version of RustHorn: ownership-based CHC translation of Rust pointer programs with proofs; directly applicable to Verus
- Lessons Learned So Far From a Community Effort to Verify the Rust Standard Library (work-in-progress) (2025), score 95
  http://arxiv.org/abs/2510.01072v3
  community lessons from verifying the Rust standard library's unsafe code, lists tool limits and open obstacles, directly on Rust verification state of the art
- Aeneas: Rust verification by functional translation (2022), score 90
  https://doi.org/10.1145/3547647
  Aeneas translates Rust to pure lambda calculus via borrow semantics so proofs avoid memory reasoning; a direct Rust verifier competitor to Verus
- A Hybrid Approach to Semi-automated Rust Verification (2025), score 90
  https://doi.org/10.1145/3729289
  gillian-rust semi-automated separation logic for unsafe rust linked to creusot for safe code, a direct hybrid rust verification design for vl
- RustyDL: A Program Logic for Rust (2026), score 88
  https://doi.org/10.1007/978-3-032-26204-2_19
  Source-level program logic for Rust in the KeY deductive verifier with human-in-the-loop proofs; a direct competitor design to Verus-style deductive verification
- Compositional Reasoning for Side-effectful Iterators and Iterator Adapters (2022), score 88
  https://doi.org/10.48550/arxiv.2210.09857
  Modular specification of side-effectful Rust iterators and closures in an SMT-based Rust verifier, directly applicable to Verus-style ownership and closure reasoning
- A Complete, Formal Semantics for Rust Source Code (2026), score 88
  http://arxiv.org/abs/2610.06003v1
  Complete formal semantics for Rust source with soundness proofs of a Rust program logic, foundational for Rust deductive verification
- Crux, a Precise Verifier for Rust and Other Languages (2024), score 88
  http://arxiv.org/abs/2410.18280v1
  Crux-MIR bit-precise verifier for unsafe Rust using symbolic unit tests and compositional reasoning; direct Verus competitor
- Reasoning about Interior Mutability in Rust using Library-Defined Capabilities (2024), score 85
  http://arxiv.org/abs/2405.08372v1
  Mendel verifies safe Rust using interior mutability via library capabilities; shows where Prusti and Creusot are unsound
- Corten - Foundational Verification of Rust Programs (2026), score 85
  http://arxiv.org/abs/2609.04372v1
  Corten: Rocq/Iris semantics of surface Rust via THIR with proof automation; a foundational peer to Verus with proof-size gains
- RustHornBelt: a semantic foundation for functional verification of Rust programs with unsafe code (2022), score 85
  https://www.semanticscholar.org/paper/36674fd3bc28fd3f01711de8785171c720a97a25
  RustHorn-style prophecies turn mutable borrows into first-order specs for functional verification, a core technique Verus borrow reasoning relies on
- Place Capability Graphs: A General-Purpose Model of Rust's Ownership and Borrowing Guarantees (2025), score 85
  http://arxiv.org/abs/2503.21691v5
  Models Rust borrow and ownership results from the compiler and prototypes Prusti and Flowistry on them; directly informs how Rust verifiers can reason about aliasing
- Place Capability Graphs: A General-Purpose Model of Rust’s Ownership and Borrowing Guarantees (2025), score 85
  https://doi.org/10.1145/3763122
  Same paper as record 470 under a second listing; Place Capability Graphs model for Prusti and Flowistry, duplicate abstract
- Introduction to the Special Section on ESOP 2020 (2021), score 85
  https://www.semanticscholar.org/paper/a8327c643f054b276e80eea77ed0d0beed5952ea
  summarizes RustHorn, which uses Rust ownership to encode programs as constrained Horn clauses without modeling memory, a direct technique for Rust verifiers
- Sound Borrow-Checking for Rust via Symbolic Semantics (2024), score 85
  https://doi.org/10.1145/3674640
  proves LLBC symbolic semantics is a sound borrow checker for Rust; formal basis under Aeneas that Verus-style ownership reasoning relies on
- Verification of Unsafe Code in Rust Programs by Abstract Interpretation (None), score 85
  https://www.semanticscholar.org/paper/76bfa14886ec4d1e4e5f6c2270d3e94e49058a74
  verifies unsafe Rust code via abstract interpretation, title on-topic, directly comparable to Verus unsafe-code verification
  (title only, no abstract)
- Verifying Safe Clients of Unsafe Code and Trait Implementations in Rust (2020), score 85
  https://www.semanticscholar.org/paper/417738a0b6b1e2772bd3947e5d53cabbd8e6033a
  verifies safe clients of unsafe Rust code and trait implementations, title on-topic, no abstract, directly relevant to Verus specs at unsafe boundaries
  (title only, no abstract)
- Sound Borrow-Checking for Rust via Symbolic Semantics (Long Version) (2024), score 84
  http://arxiv.org/abs/2404.02680v2
  long version of the LLBC borrow-checker soundness proof; same Aeneas basis with added proof detail
- RustBelt: securing the foundations of the rust programming language (2017), score 80
  https://www.semanticscholar.org/paper/6a8ceba15f95d03617e79aaba35515776c4bc4d9
  Machine-checked separation-logic safety proof for Rust's ownership model and unsafe library extensions, foundational background for Verus's ownership reasoning
- Towards verifying unsafe Rust programs against Rust's pointer-aliasing restrictions (2026), score 80
  http://arxiv.org/abs/2603.28326v1
  Work-in-progress program logic to verify unsafe Rust respects pointer-aliasing rules; directly on Rust verification foundations
- All Your Assembly Belongs to Rust: Automated Lifting for Uniform Testing and Verification (2026), score 80
  https://www.semanticscholar.org/paper/d4179c0e7bec755d179e58730989468a91ee40ba
  lifts RISC-V inline asm into pure Rust via Sail-derived machine model so Kani and Miri can check it, transferable to Verus handling of unsafe asm
- Oxide: The Essence of Rust (2019), score 80
  http://arxiv.org/abs/1903.00982v4
  Formal core calculus of Rust ownership and borrowing with a type safety proof, a foundation for Rust verifier semantics
- Semi-Automated Verification of Interior Unsafe Code Encapsulation in Real-World Rust Systems (2024), score 80
  https://www.semanticscholar.org/paper/0cac98d2cea9bcaa950fd2ef142885de0f49ff11
  isolation graph to split unsafe Rust encapsulation into audit units for soundness checks; directly transferable to Verus trusted-boundary review
- Revisiting Borrow Checking with Abstract Interpretation. (2026), score 80
  https://doi.org/10.5381/jot.2026.25.1.a14
  formalizes borrow checking as abstract interpretation over a language-agnostic IR, a method for Rust ownership analysis
- LiquidRust: Refinement Types for Imperative Languages with Ownership (2022), score 80
  https://www.semanticscholar.org/paper/dd9c9bbd87ccc296a3b670b22786f42c77c2e453
  refinement types over ownership in Rust, a direct rival way to verify Rust; no abstract so judged by title
  (title only, no abstract)
- Verifying dynamic trait objects in rust (2022), score 75
  https://doi.org/10.1145/3510457.3513031
  Kani encodes dynamic trait objects and dispatched closures using MIR trait info; directly informs how a Rust verifier handles dyn dispatch, which Verus also must address
- Leveraging Rust Types for Program Synthesis (2023), score 75
  https://doi.org/10.1145/3591278
  Synthesizes correct-by-construction safe Rust from functional specs using ownership logic; Rust types cut spec burden, a direct alternative route to verified Rust code
- Soundness of Rust Verification in the Presence of Safe and Unsafe Code (None), score 75
  https://www.semanticscholar.org/paper/ae2dab670733ec8f4353f35a8bae97e77bc4eb78
  title asks about soundness of Rust verification with safe and unsafe code; abstract missing, so the claim is unverified
  (title only, no abstract)
- VARIES Replication Package (2026), score 75
  https://doi.org/10.5281/zenodo.19229604
  replication package for VARIES, verification harness synthesis for unsoundness in Rust libraries, title on-topic, no abstract
- Formal Veriﬁcation of Borrow-Checking by Local Commutation Diagrams (None), score 75
  https://www.semanticscholar.org/paper/3d863793fbb4bcecb1e23d9c6b4d1a1af87dc3d5
  no abstract; formal verification of Rust borrow checking with local commutation diagrams, directly about Rust ownership semantics
  (title only, no abstract)
- Programming Languages and Systems (2018), score 72
  https://www.semanticscholar.org/paper/e4eabbcd7ecc1ba3cf68e7ff9ecfb836c28bd22c
  RustBelt proves Rust safety in Iris separation logic and shows how library unsafe code gets a verification condition
- Tracking Borrows with Regular Expressions (2026), score 72
  https://www.semanticscholar.org/paper/7d9177e9c43a807c6361202521782f5109b54599
  regex-based borrow tracking mechanised in Lean; 39k-line metatheory built with an AI proof assistant in one month
- A Lightweight Formalism for Reference Lifetimes and Borrowing in Rust (2021), score 72
  https://doi.org/10.1145/3443420
  flow-sensitive formal calculus of Rust lifetimes and borrowing with type and borrow safety proofs; underpins ownership reasoning any Rust verifier needs
- Verification of Closures in Rust Programs (2020), score 70
  https://doi.org/10.3929/ethz-b-000444764
  Thesis on closure verification in Prusti with specification entailment and an arrow notation for effects of specific calls.
- Modular specification and verification of closures in Rust (2021), score 70
  https://doi.org/10.1145/3485522
  2021 technique for modular verification of Rust closures in Prusti, encoding higher-order concerns into first-order SMT logic.
- RustCompCert: A Verified and Verifying Compiler for a Sequential Subset of Rust (2026), score 70
  http://arxiv.org/abs/2602.07455v1
  Verified Rust compiler on CompCert with borrow checking so source-level verification is preserved; relevant to trust base assumptions for Verus-verified code
- Rust Distilled: An Expressive Tower of Languages (2018), score 70
  https://www.semanticscholar.org/paper/818243de8fb3c775c15ccec5611983efdbb7494b
  Formal semantics of Rust ownership and borrowing with progress and preservation proofs, a foundation that Rust verifiers rest on
- Taming stateful computations in Rust with typestates (2022), score 70
  https://doi.org/10.1016/j.cola.2022.101154
  Rust macro that checks typestate API misuse at compile time via the type system; transferable technique for encoding protocol state in Rust APIs
- UnsafeCop: Towards Memory Safety for Real-World Unsafe Rust Code with Practical Bounded Model Checking (2024), score 70
  https://doi.org/10.1007/978-3-031-71177-0_19
  bounded model checking with harnesses and stubbing to verify unsafe Rust at industrial scale; stubbing and loop-bound tricks transfer to Verus
- Thetis: A Booster for Building Safer Systems Using the Rust Programming Language (2023), score 70
  https://doi.org/10.3390/app132312738
  encapsulates unsafe Rust with ACSL-style formal contracts and uses Miri to find undefined behavior in ArceOS, transferable to specifying unsafe boundaries in Verus
- Formal Verification of Borrow-Checking by Local Commutation Diagrams (2026), score 70
  https://openalex.org/W7117396341
  formal proof of Rust borrow-checking via local commutation diagrams; directly informs the ownership semantics that Verus proofs depend on
- Safe4U: Identifying Unsound Safe Encapsulations of Unsafe Calls in Rust using LLMs (2025), score 65
  https://doi.org/10.1145/3728890
  LLMs with static analysis decompose unsafe-call contracts to find unsound safe wrappers in Rust; contract decomposition method applies to Verus unsafe-boundary specs
- KRust: A Formal Executable Semantics of Rust (2018), score 65
  http://arxiv.org/abs/1804.10806v1
  executable operational semantics of a Rust subset with ownership and borrows, a formal foundation that Rust verifiers and interpreters build on
- Annotating and Auditing the Safety Properties of Unsafe Rust (2025), score 65
  http://arxiv.org/abs/2504.21312v2
  tag-based safety-documentation audit and linter checking unsafe Rust API contracts against callee requirements; transferable to Verus precondition and unsafe-contract specification
- Does Rust SPARK Joy? Safe Bindings from Rust to SPARK, Applied to the BBQueue Library (2023), score 62
  https://doi.org/10.1145/3623503.3623534
  shows Rust-to-SPARK FFI boundary can lose compile-time guarantees, a lesson for Verus code that trusts foreign or unverified components
- Ownership Types for Verification of Programs with Pointer Arithmetic (2023), score 62
  http://arxiv.org/abs/2312.06455v1
  extends ownership-plus-refinement typing to pointer arithmetic with soundness proof, informs verifying unsafe Rust pointer code
- Modular Formal Verification of Rust Programs with Unsafe Blocks (2022), score 60
  http://arxiv.org/abs/2212.12976v1
  modular symbolic execution to verify soundness of Rust unsafe blocks; early-stage progress report
- Counterexamples in Safe Rust (2024), score 60
  https://www.semanticscholar.org/paper/5fe6d98243c4c895cde0f381cbc00f2b967cb76a
  safe-Rust counterexamples that evade analyzers and verifiers via third-party code; defines threat model verifiers must cover
- RustGuard: A Compile-Time Verification Framework for Memory Safety in Distributed Rust Applications (2026), score 60
  https://www.semanticscholar.org/paper/3e145f3c0e13aec925290ce975fb87920f54708f
  Linear-types ownership tracking and cross-node invariant proofs as a Rust compiler plugin; applies Rust type discipline to distributed memory safety
- Charon: An Analysis Framework for Rust (2025), score 60
  https://doi.org/10.1007/978-3-031-98685-7_18
  Charon exposes a Rust MIR-level AST used by Aeneas; shared Rust frontend infrastructure that informs how Rust verifiers obtain analyzable program representations.
- SquirrelFS: Using the Rust Compiler to Check File-System Crash Consistency (2025), score 60
  https://doi.org/10.1145/3769109
  uses Rust typestate to enforce crash-consistency ordering at compile time instead of separate proofs; a type-based alternative to verification
- UnsafeChecker: Finding Soundness Bugs in Rust Safe Abstractions (2026), score 60
  http://arxiv.org/abs/2609.09641v1
  MIR abstract interpretation finds soundness violations in Rust safe abstractions; a competing Rust analysis that checks unsafe contracts
- A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries (2024), score 60
  http://arxiv.org/abs/2404.11671v8
  dynamic detection of aliasing undefined behavior in Rust foreign-function code with Miri, a soundness gap Verus must rule out at FFI boundaries
- Compiling by Proving in \({\mathbb{K}}\) : From All-Path Reachability Proofs to Single-Step Semantic Rules (2026), score 60
  https://www.semanticscholar.org/paper/d08b012d86656d8f084ccdab78795de4b3229166
  turns symbolic-execution proof graphs into single-step rules, evaluated on Rust MIR semantics; proof reuse idea transfers to Verus
- PinChecker: Identifying Unsound Safe Abstractions of Rust Pinning APIs (2025), score 60
  http://arxiv.org/abs/2504.14500v2
  finds unsound safe wrappers around Rust pinning APIs by chaining library calls to build contract-breaking programs, directly about soundness of unsafe-backed Rust libraries that Verus proofs must rely on
- Borrowing and Lifetimes (2022), score 60
  https://doi.org/10.1007/978-1-4842-7208-4_23
  title indicates work on Rust borrowing and lifetimes, the ownership model Verus must reason about, no abstract to confirm content
  (title only, no abstract)

### Concurrency and weak memory (6)

- An approach for modularly verifying the core of Rust's atomic reference counting algorithm against the (X)C20 memory consistency model (2025), score 80
  https://www.semanticscholar.org/paper/1a3daf83679e1800be6871cb222b1723e026e596
  Modular verification of Rust's atomic reference counting core against a C20 weak memory model using Iris, directly on Rust concurrency verification
- An approach for modularly verifying the core of Rust's atomic reference counting algorithm against the (Y)C20 memory consistency model (2025), score 80
  http://arxiv.org/abs/2505.00449v4
  Modular verification of Rust's atomic reference counting core against a (Y)C20 weak memory model, same work as record 743
- An approach for modularly verifying the core of Rust's atomic reference counting algorithm against the (Y)C20 memory consistency model. (2026), score 80
  https://doi.org/10.5381/jot.2026.25.1.a3
  Modular verification of Rust's atomic reference counting core against the (Y)C20 model, a 2026 version of the same work
- Modular Responsiveness Verification of Rust Async Runtimes (2026), score 80
  http://arxiv.org/abs/2610.09198v1
  modular proof technique with static analyses proving eventual progress of Rust async runtimes, a liveness technique transferable to Verus concurrency proofs
- Converos: Practical Model Checking for Verifying Rust OS Kernel Concurrency (2025), score 70
  https://www.semanticscholar.org/paper/b1647e60460b6e0a555255de4d66d1e6178a8ced
  Practical model checking for Rust OS kernel concurrency; title only, but a direct verification technique for Rust kernel code like VL targets.
  (title only, no abstract)
- RustMC : Automated Verification of Real-World Concurrent Rust (2026), score 62
  https://www.semanticscholar.org/paper/ab8e2a8d3eef9f7cf5de033c09cfff9c020b0010
  title only: automated verification of real-world concurrent Rust, a competing verifier class for Rust concurrency code
  (title only, no abstract)

### Verified code translation (6)

- Formal Verification of Rust Programs by Functional Translation. (Vérification formelle de programmes Rust par traduction fonctionnelle) (2024), score 85
  https://www.semanticscholar.org/paper/1d1b855f89cd8537e51779c8724dbe855860f53c
  title only: formal verification of Rust by functional translation, the Aeneas-style approach; no abstract to confirm details
  (title only, no abstract)
- Refactoring and Equivalence in Rust: Expanding the REM Toolchain with a Novel Approach to Automated Equivalence Proofs (2026), score 80
  http://arxiv.org/abs/2601.19207v1
  REM2.0 extract-function refactoring for Rust with Charon/Aeneas Coq equivalence proofs; Aeneas is a direct peer toolchain
- Finding a Crab in the C: Assured Translation via Comparative Symbolic Execution (2026), score 80
  https://doi.org/10.48550/arxiv.2605.12731
  cozy compares binaries of C and its Rust translation and checks equivalence except developer-approved differences, directly targets verifying LLM or automated C-to-Rust translation
- Towards Scalable and Verifiable Automated Translation from C to Safe Rust (2026), score 80
  https://www.semanticscholar.org/paper/9d1b2877bacd10eb2d21e8aa985bfa29a2a3f11c
  verifiable C-to-safe-Rust translation with Rust type reasoning and verification, directly relevant to agents producing verified Rust code
- A Rust-to-Lean Verification Pipeline with AI Provers: An Experience Report (2026), score 75
  http://arxiv.org/abs/2605.30106v2
  Experience report on a Rust-to-Lean pipeline (Aeneas/Hax extraction plus AI provers) for kernel-checked crypto proofs, including toolchain and extraction gaps.
- Verified Rust Monitors for Lola Specifications (2020), score 75
  http://arxiv.org/abs/2012.08961v1
  compiler emits Rust with Viper verification annotations proving functional correctness and termination; directly transferable to generating verified Rust

### Benchmarks, evaluations and surveys (3)

- Surveying the Rust Verification Landscape (2024), score 88
  http://arxiv.org/abs/2410.01981v1
  survey of Rust verification tools and which properties and code to verify, including std library; direct map of the competing Rust verifier landscape
- Verifying Competitive-Programming Programs in a Rust Verifier (2021), score 80
  https://www.semanticscholar.org/paper/7e36cf9742371d0feff35b58f6947878757fb3e6
  verifies competitive-programming programs in a Rust verifier, title on-topic, no abstract, shows algorithm-level Rust verification benchmarks
  (title only, no abstract)
- How do programmers use unsafe rust? (2020), score 60
  https://doi.org/10.1145/3428204
  empirical study of unsafe Rust usage tests the safe-abstraction hypothesis; shows where a verifier must reason about unsafe code

### System case studies (4)

- Reproducible development environment for the Aeneas ACL2 backend (AES-128 verification artifact) (2026), score 90
  https://doi.org/10.5281/zenodo.22365955
  reproducible environment for Aeneas with ACL2 backend verifying Fixsliced AES-128 in Rust, direct Rust verification pipeline work usable by VL
- Verifying the Rust Standard Library (2026), score 85
  http://arxiv.org/abs/2606.17374v1
  Crowdsourced verification of the Rust standard library with tools in CI, showing what machine-checked proofs of unsafe std code achieve and where they fall short
- Deductive Verification of a Patricia Trie with Creusot (2026), score 85
  https://doi.org/10.1007/978-3-032-36849-2_3
  case study deductively verifying a Patricia trie in Rust with Creusot, a direct template for verified Rust data structures
  (title only, no abstract)
- Rust towards automotive safety standards : a comprehensive study (2024), score 62
  https://openalex.org/W7126664223
  thesis verifies a Rust circular buffer with Prusti and surveys Rust verifiers; a practical case study showing industry use of Rust verification

### Other verification methods (29)

- Solving VeriContest with a Lean-Backed Rust Verifier (2026), score 95
  http://arxiv.org/abs/2610.03994v2
  Lean-backed verifier for Rust solving all 1325 theorems of the VeriContest benchmark, with cost and model comparisons and specs checked against tests.
  Study: [lean_backed_rust_verifier](vl_paper_walkthrough/lean_backed_rust_verifier_20261012.md)
- Kani: A Model Checker for Rust (2026), score 92
  http://arxiv.org/abs/2607.01504v1
  Kani model checker for Rust with contracts, loop contracts and quantifiers; production CI with 16,000 harnesses, direct competitor to Verus
- The Prusti Project: Formal Verification for Rust (2022), score 90
  https://doi.org/10.1007/978-3-031-06773-0_5
  title only: the Prusti project, a Rust deductive verifier; closest competitor to Verus, no abstract
  (title only, no abstract)
- Kani: A Model Checker for Rust (Artifact) (2026), score 90
  https://doi.org/10.5281/zenodo.21142443
  artifact for Kani reporting 11 bugs missed by fuzzing in real Rust systems and 153 contract proofs on Hifitime, direct evidence for Rust bounded verification in production
- PropProof: Free Model-Checking Harnesses from PBT (2023), score 90
  https://doi.org/10.1145/3611643.3613863
  converts property-based test harnesses into Kani harnesses with data-structure models, found 2 bugs in an AWS protobuf library, a direct Rust verification technique
- Creusot: A Foundry for the Deductive Verification of Rust Programs (2022), score 90
  https://doi.org/10.1007/978-3-031-17244-1_6
  Creusot deductive verifier for Rust; title alone, direct peer of Verus, abstract missing so method details unknown
  (title only, no abstract)
- Rust2Viper: Building a Static Verifier for Rust (2016), score 88
  https://www.semanticscholar.org/paper/cd7109eba28fb08ccdbd2e5cbf2c9e69fd878255
  builds a static verifier for Rust by translating to Viper; direct precedent for a Rust-to-SMT verification pipeline relevant to Verus design
  (title only, no abstract)
- hax: Verifying Security-Critical Rust Software using Multiple Provers (2024), score 88
  https://www.semanticscholar.org/paper/eb2f2d610f115ef8e5e67286b9a6ba1aa8bc94f2
  no abstract, title alone shows hax verifies security-critical rust with multiple provers, a direct Rust verification toolchain comparable to Verus
  (title only, no abstract)
- Prusti: deductive verification for Rust (keynote) (2020), score 85
  https://www.semanticscholar.org/paper/7b64ff3854a1931043362adb77589e188022a4ae
  Prusti tutorial on deductive Rust verification with specs at Rust-expression level; core background for Verus design choices
- Verifying Extract Method Refactoring in Rust (2025), score 85
  https://doi.org/10.1145/3758316.3765486
  verifies Rust extract-method refactorings via Charon and Aeneas functional equivalence; a direct Rust verification pipeline that could feed VL
- Crust: A Bounded Verifier for Rust (N) (2015), score 85
  https://www.semanticscholar.org/paper/4f23104f00d382cf20184f5f1c14bf959d2b2f6b
  bounded verifier for Rust; title alone, direct peer of Verus with unknown method details since abstract missing
  (title only, no abstract)
- Enabling Rich Lightweight Verification of Rust Software (2024), score 85
  https://www.semanticscholar.org/paper/9be65908a3adc028767b632ffb9d7a3a3b799743
  title names lightweight rich verification of Rust software, squarely the Verus-adjacent space; abstract missing, so the technique is unknown
  (title only, no abstract)
- Verifying Rust Programs with SMACK (2018), score 85
  https://www.semanticscholar.org/paper/350795523676e071a64d8d60acd30252db2c7eec
  verifies Rust programs with the SMACK verifier, title on-topic, no abstract, shows an alternate Rust verification route
  (title only, no abstract)
- Don’t Just Test It, Prove It: Verifying AI-Written Rust (2026), score 80
  https://www.semanticscholar.org/paper/f952096ef8ba4f1af477500c8c12e56300169128
  Talk on a contract-first workflow where agents implement and provers check AI-written Rust, comparing Rust verification tools.
- Internship proposal: Formal verification of Rust programs (2022), score 80
  https://www.semanticscholar.org/paper/3f4ad1346ee6033286ece52558f3679f78f97282
  title only: internship on formal verification of Rust programs; no abstract, but the title is clearly on-topic
  (title only, no abstract)
- VARIES: Verification Harness Synthesis and Efficient Scheduling for Unsoundness Detection in Rust Libraries (2026), score 80
  https://doi.org/10.1145/3832783.3837450
  bounded model checking with synthesized harnesses finds Rust library unsoundness at scale; transferable to Verus harness design
- Soteria: Efficient Symbolic Execution as a Functional Library: Perhaps You Should Write Your Own Symbolic Execution Engine! (2026), score 80
  https://doi.org/10.1145/3808306
  Soteria builds symbolic execution engines directly over source semantics, including a Rust engine for Tree Borrows that beats Kani on bug count, a competing approach to Rust verification
- A Tale of Two Case Studies: A Unified Exploration of Rust Verification with SeaBMC (2025), score 75
  https://www.semanticscholar.org/paper/d42a3ff7def578539ecdc4414a85daae5dc19120
  unified exploration of Rust verification with the SeaBMC bounded model checker, direct Rust verification work whose abstract is absent so judged by title
  (title only, no abstract)
- PolyVer: A Compositional Approach for Polyglot System Modeling and Verification (2025), score 65
  http://arxiv.org/abs/2503.03207v3
  Polyglot verification combining CEGAR and CEGIS with LLM-synthesized contracts checked by CBMC and Kani.
- Foundational VeriFast: Pragmatic Certification of Verification Tool Results through Hinted Mirroring (2026), score 65
  http://arxiv.org/abs/2601.13727v1
  VeriFast extension emitting Rocq proof scripts by replaying symbolic execution, certifying Rust verification results.
- Broadly Enabling KLEE to Effortlessly Find Unrecoverable Errors in Rust (2024), score 65
  https://doi.org/10.1145/3639477.3639714
  PanicCheck annotates Rust functions to generate KLEE symbolic tests that find panics; practical annotation-driven Rust verification
- Debug, Execute, Verify! Development-Verification Co-Design Made Practical (2025), score 65
  https://www.semanticscholar.org/paper/8a2e16b4a497c31b8e4b19f3f98161e8fc787d83
  symbolic execution in Rust integrating development and verification early; co-design approach close to Verus workflow
- Symbolic Testing for C and Rust (2020), score 65
  https://www.semanticscholar.org/paper/029289afb8fd3654d75b60444cbab089b18ab522
  Crux symbolic testing for C and Rust, turning tests into exhaustive checks; transferable tooling idea
- Integrating an existing symbolic verification framework with Rust (None), score 65
  https://www.semanticscholar.org/paper/bec38553d4ed62fffc258156ecd1e60044cd2d4a
  title says a symbolic verification framework is integrated with Rust, no abstract, so method unknown but may map to Verus-style tooling; check
  (title only, no abstract)
- Translating Rust into ML for proving Program Equivalence by Bisimulation (2021), score 65
  https://www.semanticscholar.org/paper/af2f89d23cdf0c72cb1771494de88dd551b533d9
  uses ML to prove bisimulation-based program equivalence for Rust programs, title only, abstract unavailable, transferable to Verus equivalence proofs
  (title only, no abstract)
- No Panic! Verification of Rust Programs by Symbolic Execution (2018), score 60
  https://www.semanticscholar.org/paper/3792bbf28119c3620d3d036a89082f506bfed657
  KLEE symbolic execution over Rust LLVM proves panic freedom via contracts; shows an alternative route to Rust correctness beyond deductive verification
- Verification of Safety Functions Implemented in Rust - a Symbolic Execution based approach (2019), score 60
  https://www.semanticscholar.org/paper/f17890851dcaa805c0d47cc084113626c298382b
  klee symbolic execution of rust safety functions proving no undefined behavior on all paths, a rust verification approach with path explosion lessons
- MirChecker: Detecting Bugs in Rust Programs via Static Analysis (2021), score 60
  https://doi.org/10.1145/3460120.3484541
  MirChecker is a static analyzer that detects bugs in Rust programs, a direct competing approach to Verus-style checking for Rust, no abstract
  (title only, no abstract)
- Research Internship 2021-2022 Topic Formally Veriﬁed Compilation of C and Rust (2021), score 60
  https://www.semanticscholar.org/paper/25baae49df14165d650814bececc360fb7fbed4d
  internship topic on formally verified compilation of C and Rust, title alone is on-topic but no method detail, no abstract
  (title only, no abstract)

## Proof automation and verified-code generation by language models (192)

### Proof repair from verifier feedback (23)

- ExVerus: Verus Proof Repair via Counterexample Reasoning (2026), score 95
  http://arxiv.org/abs/2603.25810v2
  ExVerus: counterexample-guided LLM proof repair for Verus that generalizes counterexamples into inductive invariants.
- AxDafny: Agentic Verified Code Generation in Dafny (2026), score 95
  https://doi.org/10.48550/arxiv.2606.32007
  verifier-guided repair loop generating Dafny code with invariants, assertions and termination proofs, with a 250-problem benchmark; direct LLM-writes-verified-code analog for VL
- Large Language Models and Language Server Protocol: a match made in context (2026), score 88
  https://doi.org/10.48550/arxiv.2609.03086
  LSP tool where LLMs generate code and specs for Eiffel, checked by a static verifier with retries, fixing 76-95% of bugs; direct analog of the LLM-plus-verifier loop for Verus
- Baldur: Whole-Proof Generation and Repair with Large Language Models (2023), score 85
  https://doi.org/10.1145/3611643.3616243
  whole-proof LLM generation plus repair from failed attempts and error messages; directly transferable to Verus proof repair
- VeCoGen: Automating Generation of Formally Verified C Code With Large Language Models (2025), score 85
  https://doi.org/10.1109/formalise66629.2025.00017
  LLM plus Frama-C loop generating verified C from ACSL and tests, solving 13 of 15 problems, closely parallel to LLM-written Verus code
- Position: Vibe Coding Needs Vibe Reasoning: Improving Vibe Coding with Formal Verification (2025), score 85
  https://doi.org/10.1145/3759425.3763390
  position that a formal-verification sidecar autoformalizes specs and feeds verifier counterexamples back to LLM coding, close to the VL product thesis
- APOLLO: Automated LLM and Lean Collaboration for Advanced Formal Reasoning (2025), score 80
  https://doi.org/10.52202/085713-1389
  compiler-guided LLM proof repair in Lean isolating failing sub-lemmas; repair loop transfers to Verus proof failures
- VERITAS: Verifier-Guided Proof Search for Zero-Shot Formal Theorem Proving (2026), score 80
  https://doi.org/10.48550/arxiv.2606.19399
  routes Lean verifier error signals into MCTS proof search with negative examples, a proof-repair pattern for Verus LLM provers
- Open-Source LLM-Driven Formal Verification: A Multi-Agent Pipeline for RTL Repair (2026), score 78
  https://doi.org/10.48550/arxiv.2607.28877
  LLM repair loop feeds k-induction counterexamples back until proof, plus failure modes like vacuity and spec ambiguity transferable to Verus repair
- Proof Automation with Large Language Models (2024), score 78
  https://doi.org/10.1145/3691620.3695521
  llm generates a whole Coq proof, then symbolic methods repair low-level errors, proving 76 to 180 percent more theorems, generate-then-repair applies to Verus proof repair
- Counterexample Guided Inductive Synthesis Using Large Language Models and Satisfiability Solving (2023), score 75
  https://www.semanticscholar.org/paper/56c2569fa7ff9e7fa7983342e95851ca0b313dbd
  LLM generation with SMT counterexample feedback in a dialog loop, planning as a test; transferable CEGIS-style pattern for LLM-generated Verus code
- Mostly Automated Proof Repair for Verified Libraries (2023), score 75
  https://doi.org/10.1145/3591221
  Sisyphus repairs Coq proofs after code changes via program alignment and proof-driven testing for invariant synthesis; proof repair technique transferable to Verus maintenance
- Neuro Symbolic Reasoning for Planning: Counterexample Guided Inductive Synthesis using Large Language Models and Satisfiability Solving (2023), score 75
  https://www.semanticscholar.org/paper/1c89d8672a3742672850fa46f1e8ec51f3261019
  counterexample-guided LLM planning loop with SMT feedback, the same CEGIS pattern usable for LLM-generated verified code
- Euclean: Automated Geometry Problem Formalization with Unified Verification in Lean (2026), score 75
  https://www.semanticscholar.org/paper/19b69ca190bf62e9ae052733ee2db840866e584e
  LLM pipeline formalizes geometry in native Mathlib with repair and a 177k-problem dataset, directly transferable to LLM-written verified proofs
- A New Era in Software Security: Towards Self-Healing Software via Large Language Models and Formal Verification (2025), score 72
  https://doi.org/10.1109/ast66626.2025.00020
  LLM repairs C code using BMC counterexamples and re-verifies in a loop; the counterexample-guided repair loop transfers to Verus failure feedback
- 130k Lines of Formal Topology in Two Weeks: Simple and Cheap Autoformalization for Everyone? (2026), score 72
  https://www.semanticscholar.org/paper/541bb4761496f1e720484c8a832916402588cac8
  llm plus fast proof checker feedback loop produced 130k lines of topology for about 100 dollars, loop design transfers to cheap Verus proof generation
- LeanPolish: Verified Supervision for Lean Proof Compression (2026), score 70
  https://doi.org/10.48550/arxiv.2609.38384
  verified Lean proof edits used as supervision to train rankers and compress proofs; verified-edit training data lessons for proof repair in Verus
- Formal Model Construction Guided by Model-Based Proof Sketches (2026), score 62
  https://doi.org/10.48550/arxiv.2609.29870
  llm builds proof-sketch trees and repairs formal event-b models using structured verifier feedback; sketch-guided repair transferable to verus proof structure
- Fixing Rust Compilation Errors using LLMs (2023), score 60
  http://arxiv.org/abs/2308.05177v1
  LLM loop fixes Rust compile errors with about 74 percent peak accuracy; error-driven repair idea transferable to Verus compile and verify errors
- MA-LoT: Model-Collaboration Lean-based Long Chain-of-Thought Reasoning enhances Formal Theorem Proving (2025), score 60
  https://doi.org/10.48550/arxiv.2503.03205
  model-collaboration long chain-of-thought with Lean verifier error analysis for proof correction; transferable repair pattern
- AkiraRust: Re-thinking LLM-aided Rust Repair Using a Feedback-guided Thinking Switch (2026), score 60
  http://arxiv.org/abs/2602.21681v1
  LLM repair of Rust undefined behavior guided by runtime feedback and a state machine; transferable feedback loop for LLM-written Rust fixes
- Proof-Refactor: Refactoring Generated Formal Proofs into Modular Artifacts (2026), score 60
  https://doi.org/10.48550/arxiv.2606.03743
  agent that refactors generated lean proofs into helper lemmas and modules, a proof-repair and modularity technique transferable to vl proof maintenance
- MoVer: Motion Verification for Motion Graphics Animations (2025), score 60
  http://arxiv.org/abs/2502.13372v2
  LLM loop synthesizes animations, checks them with a first-order-logic DSL, and feeds failed predicates back; pattern transfers to LLM plus verifier feedback for Verus

### Retrieval of lemmas, examples and skills (20)

- KVerus: Scalable and Resilient Formal Verification Proof Generation for Rust Code (2026), score 96
  https://www.semanticscholar.org/paper/220a20b046af83f448b405111d76c45168ae2421
  KVerus: repository-scale LLM Verus proof generation with a knowledge base and verifier-driven repair, patches accepted upstream in Asterinas CortenMM.
- RAG-Verus: Repository-Level Program Verification with LLMs using Retrieval Augmented Generation (2025), score 92
  http://arxiv.org/abs/2502.05344v1
  RAG-Verus: retrieval and context-aware prompting for repository-level Verus proof synthesis, with the RepoVBench benchmark.
- Towards Repository-Level Program Verification with Large Language Models (2025), score 92
  http://arxiv.org/abs/2509.25197v1
  RVBench plus RagVerus: repository-level Verus benchmark and retrieval-augmented proof synthesis (same method as record 29).
- VerusSeek: Retrieval-Augmented LLM-Based Proof Synthesis for Rust Programs (2026), score 92
  https://www.semanticscholar.org/paper/a442c51be2fce0d85d4c17d80d69c6831e00a5c4
  VerusSeek: retrieval of verified proof constructs for LLM Verus proof synthesis, verifying 122 of 150 tasks versus 69 and 85 for baselines.
- Automated Lemma Discovery in Agentic Program Verification (2026), score 85
  http://arxiv.org/abs/2603.22114v2
  LLM agent proposes helper lemmas from program semantics to finish VC proofs in AutoRocq and Frama-C, a direct model for lemma discovery in Verus proof agents
- SkillForge: Compositional Skill Synthesis with Verification-in-the-Loop for Generating Formally Verified Dafny Programs (2026), score 85
  https://www.semanticscholar.org/paper/397a4d4616164c0bdd8816e1b9965c6a06d152fd
  LLM skill library with verifier-driven routing to repair skills for Dafny, with invariant generation and error diagnosis; transferable to Verus proof repair loops
- VeriSkill: A Self-Evolution Framework for Program Verification Skills (2026), score 80
  http://arxiv.org/abs/2607.27733v1
  self-evolving skill library for LLM program verification across several verifiers; directly applicable to Verus proof agents and their skill libraries
- A Learning Method for Symbolic Systems Using Large Language Models (2026), score 75
  https://doi.org/10.48550/arxiv.2605.08694
  LLMs mine reusable symbolic tactics from proof corpora, boosting CoqHammer 24 percent; transferable to mining Verus proof lemmas
- PROMISE: Proof Automation as Structural Imitation of Human Reasoning (2026), score 75
  https://doi.org/10.48550/arxiv.2604.05399
  mines structural proof-state patterns to guide LLM search over seL4 proofs in Rocq, beating Rango and Selene, a retrieval technique transferable to Verus proof search
- Lean Copilot: Large Language Models as Copilots for Theorem Proving in Lean (2024), score 75
  https://doi.org/10.48550/arxiv.2404.12534
  llm tactic, goal completion, and premise selection tools inside lean with 74 percent proof steps automated, a proof automation pattern vl could copy
- Thor: Wielding Hammers to Integrate Language Models and Automated Theorem Provers (2022), score 75
  https://doi.org/10.48550/arxiv.2205.10893
  hammers select premises for LLM theorem provers via ATPs, a premise-selection pattern directly usable for Verus proof search
- Guided Proof Search Using Large Language Models and Lemma Extraction in Coq (2024), score 72
  https://openalex.org/W7112158932
  whole-proof generation for Coq with recursive lemma extraction at failure points, 79 percent on Software Foundations, lemma extraction transfers to Verus proof repair
- Retrieval-Augmented TLAPS Proof Generation with Large Language Models (2025), score 70
  https://doi.org/10.48550/arxiv.2501.03073
  Retrieval-augmented proof generation with sub-obligation decomposition for TLAPS, a proof-automation technique that transfers to Verus proof search
- LeanDojo: Theorem Proving with Retrieval-Augmented Language Models (2023), score 70
  https://doi.org/10.52202/075280-0944
  open Lean playground with premise annotations and a retrieval prover, premise selection is a bottleneck technique that transfers to Verus lemma retrieval
- Formal Premise Selection With Language Models (2022), score 70
  https://doi.org/10.5281/zenodo.7823669
  retrieves premises into llm context to raise theorem proving rates; premise selection transferable to verus lemma retrieval
- Retrieval-Augmented Language Models are Mimetic Theorem Provers (2025), score 70
  https://doi.org/10.18653/v1/2025.findings-emnlp.1162
  retrieves theorems and proof techniques to guide LLM proof generation; retrieval of similar proofs transfers to Verus proof search
- CircuitProver: Agentic Lean 4 Theorem Proving with Reusable Circuit Proof Library for Hardware Verification (2026), score 62
  http://arxiv.org/abs/2607.27259v1
  agentic Lean proving with reusable proof library for hardware; reuse of accumulated proofs cuts proof length 16 percent
- Knowledge Graphs, the Missing Link in Agentic AI-based Formal Verification (2026), score 60
  https://doi.org/10.1109/icicdt69693.2026.11669279
  Knowledge graph linking spec, RTL and tool counterexamples to drive LLM assertion repair loops; loop design transfers to Verus proof repair from verifier feedback, though hardware domain
- Automated Formalization via Conceptual Retrieval-Augmented LLMs (2025), score 60
  https://www.semanticscholar.org/paper/0f6cf1dd8f7b5de47af24f0d9be653cde676a168
  retrieves formal Mathlib4 definitions to ground llm autoformalization and reduce hallucinated symbols, retrieval grounding applicable to Verus spec and lemma retrieval
- Reliable Proof Generation with LLMs via Analogical Retrieval and Symbolic Verification: A Case Study in Euclidean Geometry (2025), score 60
  https://doi.org/10.48550/arxiv.2505.14479
  retrieves analogous geometry proofs and feeds a formal verifier's errors back to the LLM, a proof-repair pattern for Verus

### Invariant and annotation inference (6)

- DafnyPro: LLM-Assisted Automated Verification for Dafny Programs (2026), score 95
  http://arxiv.org/abs/2601.05385v1
  llm writes dafny annotations with a diff checker, invariant pruner and proof hints; directly transferable to verus proof generation
- Laurel: Unblocking Automated Verification with Large Language Models (2025), score 90
  https://doi.org/10.1145/3720499
  LLM generates missing Dafny assertions using verifier error locations and proof-similarity example retrieval; directly applicable to LLM proof hints for Verus
- WybeCoder: Verified Imperative Code Generation (2026), score 88
  https://doi.org/10.48550/arxiv.2603.29088
  Agentic prove-as-you-generate framework co-evolving code, invariants and proofs with VC generation plus SMT and Lean, directly comparable to LLM-written verified code for VL
- Neuro-Symbolic Software Verification: Hyper-charging Local Language Models with Symbolic Reasoning at Scale (2026), score 88
  https://doi.org/10.48550/arxiv.2606.16886
  LLM loop-invariant synthesis with structured ESBMC verifier feedback on local open-weight models; directly applicable to invariant generation for Verus under privacy constraints
- Leveraging Large Language Models for Automated Proof Synthesis in Rust (2023), score 85
  http://arxiv.org/abs/2311.03739v2
  GPT-4 with static analysis to synthesize Verus invariants and proof structure, cutting developer effort on vector programs (2023 prototype).
- Lemur: Integrating Large Language Models in Automated Program Verification (2023), score 85
  http://arxiv.org/abs/2310.04870v5
  sound calculus that combines LLM proposals such as invariants with automated reasoners for program verification, directly transferable to LLM invariant generation for Verus

### Specification synthesis (20)

- Automatically Building Machine-Checked Assurance Cases from C Codebases to Requirements (2026), score 92
  https://doi.org/10.48550/arxiv.2609.40119
  LLM builds specs and VST proofs in Rocq that verify memory safety of 299 C functions with modular feedback, directly the LLM verified-code pattern VL sells
- Fewer Assumptions by Design: A Reusable Skill for LLM-Assisted Verus Verification (2026), score 90
  http://arxiv.org/abs/2609.34886v1
  LLM skill encoding domain knowledge to write low-trust Verus specs for doubly linked lists while minimizing assume and axioms.
  Study: [fewer_assumptions](vl_paper_walkthrough/fewer_assumptions_20261012.md)
- Teaching Code LLMs to Reason with Intermediate Formal Specifications (2026), score 85
  https://doi.org/10.48550/arxiv.2607.04232
  trains code LLMs to emit intermediate checkable specifications validated by execution and mutants; directly relevant to LLM-written internal invariants for Verus
- Assured Automatic Programming via Large Language Models (2024), score 85
  https://doi.org/10.48550/arxiv.2410.18494
  co-evolves code, spec and tests with an llm to pin down intent, raising verifiable dafny output; transferable to verus spec inference
- The Machine Proposes. The Proof Disposes: Neuro-Symbolic Synthesis of Formally Verified Markov Usage Models from Natural Language Requirements (2026), score 82
  https://doi.org/10.21203/rs.3.rs-10481051/v1
  LLM proposes and a prover disposes: neuro-symbolic synthesis of formally verified usage models from natural language, a direct model for LLM-written verified artifacts
  (title only, no abstract)
- From Natural Language to Verified Code: Toward AI Assisted Problem-to-Code Generation with Dafny-Based Formal Verification (2026), score 80
  https://openalex.org/W7157506001
  Natural-language to Dafny with self-healing prompts using verifier feedback and vacuity checks, closely matching LLM spec and code generation for Verus
- Neuro-Formal Verification: Agentic Language-Agnostic Formal Program Reasoning (2026), score 80
  https://doi.org/10.48550/arxiv.2608.21516
  Agent formalizes source programs for Dafny or CBMC with staged goal-blind transformations to limit formalization errors, a directly transferable LLM-verification pipeline
- Towards AI-Assisted Synthesis of Verified Dafny Methods (2024), score 80
  https://doi.org/10.1145/3643763
  GPT-4 and PaLM-2 Dafny synthesis with signature and retrieval-augmented CoT prompts yielding 153 verified MBPP solutions, a prompt-design result transferable to Verus generation
- ProofLoom: Proof-Obligation-Driven Theory Construction for Autoformalizing Research-Level Stochastic Optimization (2026), score 72
  https://www.semanticscholar.org/paper/6e8239a22f6f224b4422cf411fa045bab19d2c8e
  llm agents building lean theories driven by proof obligations, with a judge rejecting weakened assumptions, a transferable spec-revision guard for vl
- Smart Contract Synthesis via Multi-modal Specifications (2026), score 72
  https://www.semanticscholar.org/paper/26a68031846df2471b5514af3470bfc878ab8dc8
  synthesizes contract code from functional and safety specs with verification in the loop, a spec-first paradigm close to VL agents writing verified code
- Accessible Smart Contracts Verification: Synthesizing Formal Models with Tamed LLMs (2025), score 70
  http://arxiv.org/abs/2501.12972v1
  LLM fills in formal models transpiled from smart contract code with iterative syntactic and semantic repair, a direct LLM-to-formal-model pipeline close to VL
- SatLM: Satisfiability-Aided Language Models Using Declarative Prompting (2023), score 70
  https://doi.org/10.52202/075280-1974
  LLM writes declarative specs solved by an SMT prover, separating generation from solving; transferable to LLM spec-to-SMT pipelines
- A Neurosymbolic Approach to Natural Language Formalization and Verification (2026), score 65
  https://doi.org/10.1007/978-3-032-32526-6_28
  LLM autoformalisation of policies with redundant formalisation checks and auditable verdicts, a direct example of verification-backed LLM output that competes with VL
- Bridging Requirements and Assurance: Neurosymbolic Autoformalization for C++ Verification and Requirements-Coverage Testing (Keynote) (2026), score 65
  https://doi.org/10.1145/3842652.3850233
  keynote on neurosymbolic autoformalization for C++ verification and requirements coverage, title only, close to LLM-driven verified code work
  (title only, no abstract)
- Theory-Level Autoformalization: From Isolated Statements to Unified Formal Knowledge Bases (2026), score 65
  https://doi.org/10.2139/ssrn.6922158
  Position on autoformalizing whole theories into machine-verifiable libraries with LLMs; relevant to VL spec and library generation.
- PAT-Agent: Autoformalization for Model Checking (2025), score 60
  https://www.semanticscholar.org/paper/12119b826190f543bae0f2464f2b8aa538789e38
  LLM autoformalization into PAT model-checker models with counterexample-driven repair loop, transferable repair ideas though not a Rust verifier
- Resolving Natural Language Ambiguity for Verified Code Generation: A Two-Stage LLM Framework (2026), score 60
  https://doi.org/10.1007/978-981-92-3426-4_41
  title only: two-stage LLM framework resolving NL ambiguity before verified code generation; disambiguation step could feed Verus spec generation
  (title only, no abstract)
- StepFun-Formalizer: Unlocking the Autoformalization Potential of LLMs Through Knowledge-Reasoning Fusion (2026), score 60
  https://doi.org/10.1609/aaai.v40i40.40691
  RLVR-trained LLM autoformalizes math statements with a formal-knowledge and reasoning fusion, transferable to spec generation
- AI-Assisted Autoformalization of Combinatorics Problems in Proof Assistants (2025), score 60
  https://doi.org/10.1109/icse-nier66352.2025.00006
  AI-assisted autoformalization of combinatorics in proof assistants, LLM proof-writing; no abstract so judged by title
  (title only, no abstract)
- A Toolchain for AI-Assisted Code Speciﬁcation, Synthesis and Veriﬁcation (None), score 60
  https://www.semanticscholar.org/paper/220de67d469f8892d280b680bfaf3db59e0cbffb
  toolchain for AI-assisted code specification, synthesis and verification, no abstract; title alone suggests a competing LLM-to-verified-code pipeline
  (title only, no abstract)

### Specification testing and failure explanation (4)

- Lean Atlas: An Integrated Proof Environment for Scalable Human-AI Collaborative Formalization (2026), score 70
  https://www.semanticscholar.org/paper/05184678ff1182c980d3dc4c762b019410c54f5c
  tool to catch semantic hallucination in AI-generated Lean formalizations via human review of dependency graphs, a quality standard for LLM-written verified code
- Generative Explanations for Program Synthesizers (2024), score 62
  https://www.semanticscholar.org/paper/645901606cb1c337fd8e42072f5578c55df89e98
  llm names synthesized code and a program verifier validates proposals, lifting accuracy from 24 to 79 percent; verifier-gated llm output directly applicable to verus
- Don't Trust: Verify - Grounding LLM Quantitative Reasoning with Autoformalization (2024), score 60
  https://www.semanticscholar.org/paper/8e68b5d1808349fd53c372c0d952b6ebea9d7b9e
  autoformalizes math solutions into Isabelle and rejects answers failing consistency checks; autoformalization-as-checker idea for LLM code with specs
- LogicTrack: Auditing Reasoning Trajectories of Large Language Models with Formal Logic Solvers (2026), score 60
  https://doi.org/10.48550/arxiv.2609.21492
  auto-formalizes each reasoning step and checks it with theorem provers, rewarding sound steps in tree search; step-level prover feedback for proof search

### Proof agents, search and training (82)

- ANCORA: Learning to Question via Manifold-Anchored Self-Play for Verifiable Reasoning (2026), score 97
  http://arxiv.org/abs/2604.27644v2
  self-play LLM generates Verus specs and proofs, lifting Dafny2Verus pass@1 to 81.5 percent; direct competitor and training recipe for Verus proof generation
- AutoVerus: Automated Proof Generation for Rust Code (2025), score 95
  https://doi.org/10.1145/3763174
  AutoVerus: multi-agent LLM system generating Verus proofs in three phases, with a 150-task benchmark and over 90% success.
- AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement (2024), score 95
  https://doi.org/10.48550/arxiv.2412.06176
  self-improving LLM pipeline with verifier-guided tree search generates Verus code from translated programs; direct method for verified codegen in VL
- Reducing the Costs of Proof Synthesis on Rust Systems by Scaling Up a Seed Training Set (2026), score 92
  http://arxiv.org/abs/2602.04910v3
  VeruSyn: synthesizes 6.9M Verus-verified Rust programs with specs and proofs, fine-tuning a Qwen model that rivals Claude Sonnet 4.5 cost-wise.
- VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus (2025), score 92
  http://arxiv.org/abs/2510.25015v4
  VeriStruct: planner-driven LLM Verus verification of data-structure modules with syntax guidance and repair, verifying 128 of 129 functions.
- Automated Proof Generation for Rust Code via Self-Evolution (2024), score 92
  http://arxiv.org/abs/2410.15756v3
  self-evolving LLM generates Rust proofs using verifier feedback and self-debugging; 52.5 percent on expert benchmark vs GPT-4o 14.4
- StarVerus: LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation (2026), score 92
  https://www.semanticscholar.org/paper/2b1d8926a978f468ce80781baac50661a44a851f
  Multi-agent LLM generates full specifications and repairs proofs for industrial Rust under call-graph context, with contract alignment and proof repair; direct competitor to VL
- Can Large Language Models Verify System Software? A Case Study Using FSCQ as a Benchmark (2025), score 92
  https://doi.org/10.1145/3713082.3730382
  off-the-shelf LLMs with best-first tree search prove 38% of FSCQ file-system theorems in Coq; direct evidence for LLM proof automation on system software
- Propose, Solve, Verify: Self-Play Through Formal Verification (2025), score 90
  http://arxiv.org/abs/2512.18160v1
  Self-play with Verus as the reward signal: proposer and solver trained by expert iteration, improving pass@1 up to 9.6x.
- Goedel-Code-Prover: Hierarchical Proof Search for Open State-of-the-Art Code Verification (2026), score 90
  https://doi.org/10.48550/arxiv.2603.19329
  hierarchical proof search with an 8B model that decomposes Lean code verification goals, 62 percent success, a direct model for llm-written verified code transferable to Verus
- P$^{3}$: Joint Program-and-Proof Planning for Verified Code Generation (2026), score 88
  https://doi.org/10.48550/arxiv.2608.09277
  joint program-and-proof planning for llm verified code generation with a lean benchmark, directly the llm-writes-verified-code problem vl solves
- Inductive Deductive Synthesis: Enabling AI to Generate Formally Verified Systems (2026), score 87
  https://doi.org/10.48550/arxiv.2605.23109
  Agent jointly synthesizes implementation and proof for distributed key-value stores at 7/7 specs, a direct competitor to AI-built verified systems
  Study: [inductive_deductive_synthesis](vl_paper_walkthrough/inductive_deductive_synthesis_20261012.md)
- Formal Disco: Scalable Open-Ended Generation of Formally Verified Programs (2026), score 85
  http://arxiv.org/abs/2607.04631v1
  Distributed LLM worker system generating verified Dafny, Verus and Frama-C programs with entropy-maximizing self-improvement, matching Claude Opus 4.5 on some tasks.
- Automating Formal Verification with Agent-Guided Tree Search (2026), score 85
  https://doi.org/10.48550/arxiv.2605.27485
  LLM agents with mathlib search and tree search for Lean vericoding; 95 percent on 423 specs shows agent loops scale with budget
- Cobblestone: A Divide-and-Conquer Approach for Automating Formal Verification (2026), score 85
  https://doi.org/10.1145/3744916.3773178
  divide-and-conquer LLM proof synthesis that stays sound with unsound LLMs; directly transferable to Verus proof generation
- Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion (2026), score 85
  https://doi.org/10.1007/978-3-032-30693-7_6
  title names LLM proof synthesis for Rust via chunking and context expansion; likely Verus-style, no abstract so the method is unverified
  (title only, no abstract)
- ProofWright: Towards Agentic Formal Verification of CUDA (2025), score 85
  http://arxiv.org/abs/2511.12294v2
  agentic formal verification of LLM-written CUDA kernels for memory and thread safety, directly parallels verifying LLM-generated Rust code with Verus
- Towards Automated Verification of LLM-Synthesized C Programs (2024), score 85
  http://arxiv.org/abs/2410.14835v2
  biases LLM-generated C toward verifiable form and checks it with VST separation logic, a direct precedent for agent-written verified code
- Dissect-and-Restore: AI-based Code Verification with Transient Refactoring (2025), score 85
  http://arxiv.org/abs/2510.25406v2
  LLM verifier decomposes nested loops into sub-lemmas and recomposes proofs, raising success from 68 to 86 percent, directly transferable to Verus proof generation
- Agentic Proof and Property-Based Testing via Property-Templates in Data-Intensive Computing (2026), score 85
  https://www.semanticscholar.org/paper/3b5bde6d80922a14c37ac576e2ace45d800f99ca
  agents prove Spark data-parallel properties in Lean 4 from reusable property templates, raising proof success up to 2.6x, template idea transfers to Verus spec and proof generation
- Munkres' General Topology Autoformalized in Isabelle/HOL (2026), score 85
  https://www.semanticscholar.org/paper/43c82f2a871fe9111ed3a3a9d3728db7b2a2eba2
  LLM agents autoformalize Munkres topology in Isabelle with sorry-first workflow and sledgehammer, a concrete benchmark of LLM-written verified math
- BRIDGE: Building Representations in Domain-Guided Program Synthesis (None), score 85
  https://www.semanticscholar.org/paper/67c4fd01725cadc81b8864c6ea601966e45312d7
  structured prompting makes LLMs generate code, spec, and proof together in Lean, and spec-oriented prompting and fine-tuning on reasoning traces transfer directly to LLM-written verified code for Verus
- Advancing mathematics research with AI-driven formal proof search (2026), score 82
  https://doi.org/10.1126/science.aej2213
  LLM agent alternates proof generation with Lean compiler checks and resolves open Erdos problems, the same generate-then-verify loop VL agents need for Verus
- Second-Order Problem Solving for Recursive Self-Improvement in Formal Verification (2026), score 80
  https://doi.org/10.48550/arxiv.2610.05701
  Second-order recursive self-improvement of agent workflows, evaluated on Lean proof generation and Verus verifiable code generation.
  Study: [so_rsi](vl_paper_walkthrough/so_rsi_20261012.md)
- BRIDGE: Building Representations In Domain Guided Program Synthesis (2025), score 80
  https://doi.org/10.48550/arxiv.2511.21104
  code-first structured prompting coupling code, spec and proof in Lean; 1.5x executable correctness gain over direct prompting
- Agentic Proving for Program Verification (2026), score 80
  http://arxiv.org/abs/2605.23772v1
  Claude Code in agentic loop with compiler feedback proves Lean specs and programs on CLEVER; shows agentic provers work on verified codegen and flags weak isomorphism-based spec scoring
- Reward-Oracle MCTS for Formal Theorem Proving: Sample-Efficient Search and the Need for Kernel-Level Proof Auditing (2026), score 80
  https://doi.org/10.48550/arxiv.2608.28639
  uses compiler output as a reward signal in MCTS for proof search and audits proofs for sorryAx to catch reward hacking; audit applies to Verus assume and admit
- Improving LLM Code Reasoning via Semantic Equivalence Self-Play with Formal Verification (2026), score 80
  https://doi.org/10.48550/arxiv.2604.17010
  self-play uses Liquid Haskell proofs as the reward for equivalence training, showing a verifier can supervise LLM code reasoning, a direct model for Verus-backed training
- Neuro-Symbolic Proof Generation for Scaling Systems Software Verification (2026), score 80
  http://arxiv.org/abs/2603.19715v2
  best-first LLM proof search over Isabelle states proves 77.6 percent of seL4 theorems, a proof-automation method directly applicable to Verus proof search
- Scratchy: Visual-Scratchpad Multimodal Reasoning for Cryptographic Proof Generation in EasyCrypt (2026), score 80
  https://doi.org/10.48550/arxiv.2609.06226
  LLMs generate EasyCrypt proofs when given a typed proof-relation graph, evidence that explicit proof structure helps LLM proof generation
- AutoSOUP: Safety-Oriented Unit Proof Generation for Component-level Memory-Safety Verification (2026), score 80
  http://arxiv.org/abs/2605.10712v1
  LLM plus deterministic synthesis generates unit proofs with explicit scope, loop-bound and environment choices for memory safety; directly applicable to LLM proof generation for Verus
- Automating Formal Verification with Reinforcement Learning and Recursive Inference (2026), score 75
  http://arxiv.org/abs/2605.30914v1
  Thesis on RL with verifier rewards for Dafny and a Lean proof scaffold with proof reviser, plus a Lean benchmark derived from curve25519-dalek.
- Harnessing Code Agents for Automatic Software Verification (2026), score 75
  http://arxiv.org/abs/2607.06341v1
  Unstructured code agent given whole lemmas with a kernel-checked harness proves all Iris and reglang lemmas in Coq and Lean, beating prior LLM provers.
- TypePilot: Leveraging the Scala Type System for Secure LLM-generated Code (2025), score 75
  https://doi.org/10.26615/978-954-452-101-1-011
  Type-guided agentic LLM codegen in Scala with Stainless verification; closest analogue of VL idea of generating code in a verifier-friendly language
- ShannonProver: Towards Automating Formal Cryptographic Proofs (2026), score 75
  https://doi.org/10.48550/arxiv.2607.02847
  agentic LLM system decomposing cryptographic theorems into lemmas and generating EasyCrypt proof scripts, a direct analogue of agent-written machine-checked proofs
- HybridProver: Augmenting Theorem Proving with LLM-Driven Proof Synthesis and Refinement (2025), score 75
  https://doi.org/10.48550/arxiv.2505.15740
  combines whole-proof LLM synthesis with tactic-level generation via proof sketches in Isabelle, reaching 73.8 percent on miniF2F; transferable proof-search design for Verus
- Formal Theorem Proving by Rewarding LLMs to Decompose Proofs Hierarchically (2024), score 75
  https://doi.org/10.48550/arxiv.2411.01829
  rl rewards llm for proposing and proving helper lemmas in isabelle; lemma decomposition reward transferable to verus proof automation
- ProofFlow: A Dependency Graph Approach to Faithful Proof Autoformalization (2025), score 75
  https://www.semanticscholar.org/paper/cbb5e417c895ee59846222951609d6615a90e878
  builds a lemma-per-step dependency DAG for LLM proof autoformalization with a fidelity metric, a method for LLM-written verified proofs
- Towards Autoformalization of Mathematics and Code Correctness: Experiments with Elementary Proofs (2023), score 75
  https://www.semanticscholar.org/paper/10422b7bcf17eae9b04d4a020a591b3a61b45593
  neural translation of Hoare-triple imperative code into Coq correctness proofs, direct precedent for LLM-written verified code
- Long-horizon autoformalization of a core theorem underlying MIP* = RE (2026), score 72
  https://www.semanticscholar.org/paper/4ca11236662f424a6f3541b42ce47343a39f7dab
  agent-generated 126k-line lean proof with a shared blueprint and review loops, evidence that agent teams can produce large verified artifacts, a direct competitor pattern to vl
- CoqPilot, a plugin for LLM-based generation of proofs (2024), score 72
  https://doi.org/10.1145/3691620.3695357
  vs code plugin that fills admit proof holes in Coq by combining llm and symbolic candidates, checks each candidate, a plugin design directly applicable to Verus proof holes
- M2F: Automated Formalization of Mathematical Literature at Scale (2026), score 72
  https://www.semanticscholar.org/paper/6a60349b91fa9d6b3ed34765502fce91780636ef
  agentic project-scale Lean generation that commits edits only when the compiler confirms progress, a verifier-in-the-loop process pattern for large Verus builds
- Certified Program Synthesis with a Multi-modal Verifier (2026), score 70
  https://www.semanticscholar.org/paper/dbeace1b61a2f52ec0dfe5fa40cd3b1a36c04032
  LeetProof: staged agentic pipeline using a multi-modal Lean verifier, property testing of specs, and frontier provers for residual obligations.
  Study: [leetproof](vl_paper_walkthrough/leetproof_20261012.md)
- Automated Conjecture Resolution with Formal Verification (2026), score 70
  https://doi.org/10.70777/si.v3i3.18746
  informal LLM reasoning plus Lean formalization agent solves an open algebra problem; shows end-to-end pipeline with search tools
- FVEL: Interactive Formal Verification Environment with Large Language Models via Theorem Proving (2024), score 70
  http://arxiv.org/abs/2406.14408v2
  Transforms code to Isabelle and uses LLM theorem proving with fine-tuned Llama and Mistral on SV-COMP, a transferable LLM proof-generation pipeline
- CS 560 Project Report: Using Large Language Models to Formally Verify Correctness of Rust Code (None), score 70
  https://www.semanticscholar.org/paper/d5e84f6bae7cbca2444fab91771488881faab91a
  title says LLMs formally verify Rust code; no abstract, so the method and tool are unknown
  (title only, no abstract)
- Teaching LLMs Program Semantics via Symbolic Execution Traces (2026), score 70
  https://doi.org/10.48550/arxiv.2605.06184
  continued pretraining of an 8B model on symbolic execution traces raises C violation detection by 17 points, a method for training LLMs on verifier artifacts usable for Verus
- IsabeLLM: Automated Theorem Proving Applied to Formally Verifying Consensus (2026), score 70
  https://openalex.org/W7165219180
  adds retrieval, error tracing and counterexamples to LLM proof generation in Isabelle for consensus verification, feedback patterns transferable to Verus proof repair
- Draft, Sketch, and Prove: Guiding Formal Theorem Provers with Informal Proofs (2022), score 70
  https://doi.org/10.48550/arxiv.2210.12283
  maps informal proofs to formal sketches with holes, raising Isabelle prover success from 20.9 to 39.3 percent, sketch-guided decomposition transfers to Verus proof search
- Towards Language Model Guided $$\text {TLA}^{+}$$ Proof Automation (2026), score 70
  https://doi.org/10.1007/978-3-032-26204-2_32
  llm decomposes TLA+ proof obligations into normalized sub-claims while symbolic provers check them, constraining output to cut syntax errors, applicable to Verus proof decomposition
- Towards Language Model Guided TLA+ Proof Automation (2025), score 70
  https://doi.org/10.48550/arxiv.2512.09758
  same TLA+ approach as 2011 in an earlier version, llm decomposes obligations into sub-claims for symbolic provers, 119-theorem benchmark for distributed protocols
- LLM-as-a-Verifier: A General-Purpose Verification Framework (2026), score 70
  http://arxiv.org/abs/2607.05391v2
  scores candidate agent outputs by expected scoring-token logits and ranks candidates; verifier-as-scorer method transferable to choosing among VL proof candidates
- The LLM Era Demands Natural-Language-Aligned Theorem Provers for Mathematics (2025), score 70
  https://doi.org/10.1145/3759425.3763384
  argues theorem provers should use natural-language-like proof languages for LLMs, relevant to proof interface design for VL
- Translating Informal Proofs into Formal Proofs Using a Chain of States (2026), score 70
  https://doi.org/10.4208/csiam-am.so-2025-0105
  turns informal proofs into Lean via chain of intermediate proof states then tactics between states, a decomposition idea for LLM proof generation
- Formalizing Mathematics at Scale (2026), score 68
  https://www.semanticscholar.org/paper/225c1956cb19dabaa9ec35e9d951f683971c8349
  thousands of LLM agents formalize 26 textbooks into 45k Lean declarations; shows scheduling and version control at scale
- LeanMarathon: Toward Reliable AI Co-Mathematicians through Long-Horizon Lean Autoformalization (2026), score 68
  https://www.semanticscholar.org/paper/6d14f7f0363c89b9a1c251d85ec3fb5323595882
  multi-agent harness with an evolving blueprint file and CI-gated parallel proof rounds, a long-horizon harness design for large Verus projects
- AutoICE: Automatically Synthesizing Verifiable C Code via LLM-driven Evolution (2025), score 68
  https://www.semanticscholar.org/paper/d559cf238e3ecc976637a38a7a0ac966469b9465
  llm evolutionary search with crossover and self-reflective mutation synthesizes verified c code; search strategy transferable to verus proof generation
- Automatic Proof Generation: Fine-tuning and RAG in Reasoner vs. Math LLMs (2025), score 65
  https://doi.org/10.1145/3696630.3728705
  compares math, reasoner, and RAG LLMs for Isabelle proof inference; informs proof automation model choice
- Hilbert: Recursively Building Formal Proofs with Informal Reasoning (2025), score 65
  https://doi.org/10.48550/arxiv.2509.22819
  agent combining informal LLM reasoning, Lean prover, and verifier feedback with recursive decomposition; proof-automation architecture
- Towards Automating Blockchain Consensus Verification with IsabeLLM (2026), score 65
  http://arxiv.org/abs/2601.07654v1
  IsabeLLM integrates Isabelle with an LLM to prove a Bitcoin consensus model; LLM proof generation applied to protocol verification
- Compile to Compress: Boosting Formal Theorem Provers by Compiler Outputs (2026), score 65
  https://doi.org/10.48550/arxiv.2604.18587
  feeds compiler error categories back into tree search for LLM theorem provers on PutnamBench, transferable to using Verus or rustc errors to guide proof repair
- GraphAlignCoder: Aligning Program and Proof Graphs for Code Generation (2026), score 65
  https://doi.org/10.48550/arxiv.2608.11394
  trains a code llm with graph descriptions of why regions are correct, derived from Lean proof traces, improving LiveCodeBench solves, proof structure as training signal for verified code
- Diffusion-Proof: Recipe for Formal Theorem Proving Beyond Auto-Regressive Generation (2026), score 65
  https://doi.org/10.48550/arxiv.2606.19315
  diffusion llm writes whole formal proofs and corrects them by in-filling, beating an ar baseline on minif2f; alternative proof-generation paradigm for verus
- Formal Mathematics via Language-Model Probabilistic Programming (2026), score 65
  https://openalex.org/W7201929887
  smc guides llm autoformalization with incremental type checking and speculative decoding for theorem proving; checker-guided sampling transferable to verus proof search
- LLM-SYM: Integrating Symbolic Methods and Large Language Models for Automated Theorem Proving (2025), score 65
  https://doi.org/10.1007/978-981-95-4213-0_3
  title only: integrates symbolic methods with llms for automated theorem proving; likely proof-automation design relevant to verus
  (title only, no abstract)
- LogicReward: Incentivizing LLM Reasoning via Step-Wise Logical Supervision (2025), score 65
  https://www.semanticscholar.org/paper/8b7154e1ac5b4761d1460e3abcfde7a74cd4f453
  rewards llm reasoning steps verified by a theorem prover after autoformalization; prover-verified reward directly transferable to verus proof rl
- Exploring proof autoformalization with Mistral on Herald (2026), score 65
  https://doi.org/10.1007/978-3-032-07021-0_16
  LLM proof autoformalization on Herald, title only, a direct LLM-for-proofs technique
  (title only, no abstract)
- Beyond the Library: An Agentic Framework for Autoformalizing Research Mathematics (2026), score 62
  https://www.semanticscholar.org/paper/1233da9f7baa91de717962e947f30e7e39a51002
  multi-agent LLM autoformalization in Lean with auxiliary-lemma validation of new definitions; transferable to spec and lemma generation for Verus
- Expected Value Alignment for Generative Reward Modeling in Formal Mathematics Verification (2026), score 60
  https://doi.org/10.48550/arxiv.2606.01160
  continuous logit-based process reward model for Lean 4 proof steps; reward design transferable to proof search
- Kimina-Prover Preview: Towards Large Formal Reasoning Models with Reinforcement Learning (2025), score 60
  https://doi.org/10.48550/arxiv.2504.11354
  RL-trained Lean 4 prover with structured formal reasoning pattern; proof generation model relevant to LLM proof automation
- Passport: Improving Automated Formal Verification Using Identifiers (2023), score 60
  https://doi.org/10.1145/3593374
  identifier encodings that improve learned Coq proof synthesis; modeling choices transferable to Verus proof search
- TacTok: semantics-aware proof synthesis (2020), score 60
  https://doi.org/10.1145/3428299
  TacTok uses proof state semantics and partial scripts to synthesize Coq proofs; informs context choice for proof automation
- A Machine-Verified Proof of a Quantum-Optimization Conjecture (2026), score 60
  https://doi.org/10.48550/arxiv.2606.29687
  llm found and lean-checked proof of a qaoa conjecture, evidence that llm proof discovery with a mechanical checker can close open problems
- Autoformalization with Large Language Models (2022), score 60
  https://doi.org/10.48550/arxiv.2205.12615
  LLMs translate competition math to Isabelle specs and retrain a prover on them, raising miniF2F rate; autoformalization data idea transfers to Verus spec corpora.
- HOL4PSG: AI-Driven Proof Sequence Generation for the HOL4 Theorem Prover (2025), score 60
  https://doi.org/10.1109/adacis65663.2025.11436933
  seq2seq models (MarianMT, T5) generate whole HOL4 proof scripts from theorem statements, a whole-proof generation baseline transferable to Verus proof synthesis
- Quantifying the Importance of Data Alignment in Downstream Model Performance (2025), score 60
  https://www.semanticscholar.org/paper/2ca45e6356c32aea28e2b74eb715ba8d0e2dbcc7
  shows training-to-eval data alignment predicts LLM loss on autoformalization, guiding training data choice for LLM spec generation
- Process-Driven Autoformalization in Lean 4 (2024), score 60
  https://www.semanticscholar.org/paper/db0f9376882cf7805f36def33600805d330e5386
  uses Lean4 compiler error feedback to train a process-supervised verifier that improves autoformalization, a feedback-training recipe for LLM proof output
- Proof Artifact Co-training for Theorem Proving with Language Models (2021), score 60
  https://doi.org/10.48550/arxiv.2102.06203
  mines self-supervised data from Lean kernel proof terms to co-train a tactic predictor, a data-scarcity fix for LLM proof automation
- Closing the Loop: Formally Verified Law as a Reward Signal for Self-Improving Legal AI (2026), score 60
  https://doi.org/10.48550/arxiv.2606.23913
  LLM autoformalizes law into a verifier-checked calculus, using verifier outcomes as RL reward, a training-signal pattern for VL
- Generative Language Modeling for Automated Theorem Proving (2020), score 60
  https://doi.org/10.48550/arxiv.2009.03393
  transformer prover for Metamath whose proofs entered the main library, an early llm proof-generation technique usable for Verus proof search
- Self-Authored Verification Is Unreliable in Heuristic Self-Improving Agents (2026), score 60
  http://arxiv.org/abs/2607.24300v1
  self-written tests let agents accept regressions; sealed external audit fixes it, a warning for VL agents grading their own proofs
- Self-Trained Verification for Training- and Test-Time Self-Improvement (2026), score 60
  http://arxiv.org/abs/2605.30290v2
  trains an LLM verifier by imitating a reference-informed version of itself, transferable to LLM verifier loops that check generated verified code

### Refinement proofs and refinement types (1)

- Towards Large Language Model Aided Program Refinement (2024), score 85
  https://doi.org/10.48550/arxiv.2406.18616
  LLM generates code from refinement-calculus prompts and verifies it in Coq, directly on LLM-written verified code

### SMT engineering and proof stability (2)

- Schwarz: Solver-Aware Agentic Program Verification (2026), score 80
  http://arxiv.org/abs/2608.30803v1
  Schwarz: solver-aware agentic repair of SMT obligations for C and Verus, with local lemmas and theory-aware solver policies.
- LLM-Assisted Unsatisfiability Proofs for Satisfiability Modulo Theories, Oracles, and Natural Language (2026), score 65
  https://doi.org/10.1145/3839451
  LLMs conjecture auxiliary lemmas from documentation to make SMT unsatisfiability proofs succeed; lemma synthesis idea transfers to Verus proof automation

### Concurrency and weak memory (1)

- RESOLVE: Language-Agnostic Validation of GPU Kernels Through Testing, Reduction, and Proof (2026), score 75
  https://doi.org/10.48550/arxiv.2610.05683
  agent rewrites GPU kernels to reduced-concurrency forms that F*/Pulse can prove equivalent, shows LLM-written code paired with proof, transferable to Verus proof of agent-written code

### Verified code translation (12)

- VERT: Verified Equivalent Rust Transpilation with Few-Shot Learning (2024), score 82
  https://www.semanticscholar.org/paper/f7d0578c630649bda8a1e4c1d4661ae0acc38a63
  title only: llm few-shot transpilation to verified equivalent rust, a direct llm-plus-verification pipeline that competes with or informs vl code generation
  (title only, no abstract)
- STAFF: Towards Translating Formal Verification Benchmarks between Formal Specification Languages (2026), score 80
  https://doi.org/10.1145/3843777.3844531
  LLM pipeline translates verified Dafny programs to ACSL C with Frama-C checks and repair loops; cross-language verified-artifact generation close to Verus porting
- Verified Code Transpilation with LLMs (2024), score 75
  https://doi.org/10.52202/079017-1310
  LLM lifts code into DSLs and generates equivalence proofs checked by a verifier, shows LLM proof generation with verified outputs
- A Trust Ledger and an Execution Check for CPG-Based C-to-Lean 4 Autoformalization: Separating Declined from Silently Incorrect Translations (2026), score 75
  https://doi.org/10.48550/arxiv.2609.38237
  C-to-Lean translator with trust ledger separates declined from silently wrong translations, a method for measuring autoformalization soundness
- LLVM Translation Validation Automated with Large Language Models and Lean (2026), score 68
  https://doi.org/10.48550/arxiv.2609.19583
  LLM-scaffolded Lean translation validation with kernel-checked proofs; deterministic discharge plus delegated LLM reasoning is a reusable split
- Towards Automated Formal Verification of zkEVMs Using LLM-Guided Constraint Synthesis (2026), score 65
  http://arxiv.org/abs/2607.19795v1
  VeriSynth: LLM formalizes Rust zkEVM opcodes into Z3 models, with the SMT solver as arbiter and over 90% bug detection.
- Mostly Automatic Translation of Language Interpreters from C to Safe Rust (2026), score 65
  http://arxiv.org/abs/2606.27122v1
  Feature-reduction milestones plus multi-agent validation translate C interpreters to safe Rust; staged decomposition idea transfers to building Verus-verified translations
- Heimdall: Formally Verified Automated Migration of Legacy eBPF Programs to Rust (2026), score 62
  http://arxiv.org/abs/2605.25411v2
  LLM translates eBPF C to Rust with per-program equivalence via symbolic execution and Z3; translation-equivalence pattern transferable to VL
- Fine-Tuning Qwen3-27B for C-to-Rust Code Translation: A Three-Stage Curriculum of Pretraining, Debugging-Aware SFT, and Task-Specific SFT (2026), score 60
  http://arxiv.org/abs/2608.13681v1
  fine-tunes Qwen3-27B on Verus training data for C-to-Rust with agentic verification; shows Verus data can help Rust code LLMs
- RustAssure: Differential Symbolic Testing for LLM-Transpiled C-to-Rust Code (2025), score 60
  http://arxiv.org/abs/2510.07604v1
  LLM C-to-Rust transpiler checked by differential symbolic execution for equivalence; equivalence checking idea transfers to validating Verus-verified translations
- SafeTrans: LLM-assisted Transpilation from C to Rust (2025), score 60
  http://arxiv.org/abs/2505.10708v2
  LLM C-to-Rust transpiler with few-shot guided compile and runtime error repair, lifting success from 54% to 80%; repair technique transfers to Verus proof and compile repair
- Towards Translating Real-World Code with LLMs: A Study of Translating to Rust (2024), score 60
  http://arxiv.org/abs/2405.11514v3
  Differential fuzzing checks LLM C-to-Rust translations and feeds counterexamples back; equivalence-feedback loop applies to Verus translation repair

### Benchmarks, evaluations and surveys (5)

- A Case Study on the Effectiveness of LLMs in Verification with Proof Assistants (2025), score 78
  http://arxiv.org/abs/2508.18587v1
  measures llm proof generation on Verdi and hs-to-coq in Rocq, finds same-file context and dependencies help most, directly informs LLM proof generation for real verified systems
- Can Open-Weight LLMs Produce Kernel-Verified Coq Proofs? A Pilot Study (2026), score 74
  https://doi.org/10.48550/arxiv.2608.05420
  measures open LLM proof generation with kernel-checked Coq, 3.5 percent success; gives a baseline for LLM proof success rates
- Quantitative Comparison of Credible Compilation and Verification In Coding Agent Compiler Development (2026), score 65
  http://arxiv.org/abs/2605.08927v1
  measures effort of verified versus credible compilation done by a coding agent; direct evidence on agent cost of proofs and agent avoiding hard algorithms
- ML + FV = $\heartsuit$? A Survey on the Application of Machine Learning to Formal Verification (2018), score 65
  https://doi.org/10.48550/arxiv.1806.03600
  catalogues where machine learning helps theorem proving, model checking, SAT and static analysis; survey of ML-guided proof automation directly relevant to VL
- Human agency in initial human-AI proof formalization workflows (2026), score 60
  https://www.semanticscholar.org/paper/4c330dcdabbfff8e2536ec09345c7e5a92180964
  user study of AI-assisted proof formalisation, found higher accuracy with AI; direct evidence on how people will use AI for verified-code work

### System case studies (1)

- Generative File Systems: Specification-Driven Synthesis and Evolution via LLMs (2026), score 60
  https://www.semanticscholar.org/paper/216838beed0546d35402bd64a84b5c323220110a
  formal-methods-style specifications guiding LLM generation of concurrent file systems in Rust and C; spec-driven LLM systems code

### Other verification methods (15)

- The Fusion of Large Language Models and Formal Methods for Trustworthy AI Agents: A Roadmap (2024), score 80
  https://doi.org/10.48550/arxiv.2412.06512
  roadmap pairing LLMs with formal methods for certified outputs and usable FM tools, a direct map of VL's positioning
- Verify-in-the-Loop: Proof-Carrying AI Mathematics — a case study certifying, expanding, and stress-testing the Jacobian counterexample with Claude Code (Opus 4.8) and a signing verifier (2026), score 78
  https://doi.org/10.5281/zenodo.21567374
  proposer agent cannot certify its own result; a separate verifier signs a certificate only when its checker passes, a trust pattern directly applicable to agent-written verified code in VL
- Agentic Model Checking (2026), score 75
  https://doi.org/10.48550/arxiv.2605.21434
  Agentic bounded model checking for LLM-generated C and Rust systems code, with spec inference and counterexample validation pipeline.
- Generative Compilation: On-the-Fly Compiler Feedback as AI Generates Code (2026), score 75
  https://doi.org/10.48550/arxiv.2607.13921
  gives compiler feedback on partial Rust during LLM decoding, Lean-proved sealor; cuts non-compiling output, directly applicable to agent Rust generation
- Towards Formal Verification of LLM-Generated Code from Natural Language Prompts (2025), score 75
  https://doi.org/10.48550/arxiv.2507.13290
  verifies LLM-generated Ansible code against formal intent queries using symbolic execution; a direct model for verified LLM code generation
- Verified Learning for Compiler Optimization: An LLM-Guided Architecture with Formal Control (2026), score 72
  https://doi.org/10.48550/arxiv.2609.27214
  LLM compiler rewrites regenerated until Alive2 accepts equivalence, the same generate-then-check control layer for trustworthy AI output
- CaMeLoT: CaMeL orchestrated with Temporal logic for static verification and liveness (2026), score 72
  http://arxiv.org/abs/2609.18674v1
  nuxmv checks llm agent plans against ctl policies before execution, returning counterexamples for repair; transferable to verus proof repair loops
- HarnessLLM: Rust Verification Harness Generation with Large Language Models (2026), score 70
  http://arxiv.org/abs/2607.22161v1
  LLM workflow that generates Rust verification harnesses from test suites for memory-safety checking, outperforming Autoharness.
- FANS: Formal Answer Selection for LLM Natural Language Math Reasoning Using Lean4 (2025), score 65
  https://doi.org/10.18653/v1/2025.emnlp-main.158
  LLM math answers translated to Lean4 theorems, proved and kept only when the compiler accepts, a verified-selection pattern transferable to checked code output
- The Verification Horizon: No Silver Bullet for Coding Agent Rewards (2026), score 65
  http://arxiv.org/abs/2606.26300v2
  analyzes why verifiers for coding agents reward-hack and proxy gaps, a threat model for VL verification signals
- Formal-Method-Guided Vibe Coding: Closing the Verification Loop on AI-Generated Safety-Critical Software Through Model-Driven Engineering (2026), score 60
  http://arxiv.org/abs/2606.22413v2
  Closed-loop vibe coding for Java where Dafny, CSP and Isabelle checks drive regeneration, targeting safety-critical certification.
- Safe: Enhancing Mathematical Reasoning in Large Language Models via Retrospective Step-aware Formal Verification (2025), score 60
  https://doi.org/10.18653/v1/2025.acl-long.594
  checks LLM math reasoning steps by formalizing them in Lean 4 with proofs; step-level verification idea for proof-based checking
- Type-Constrained Code Generation with Language Models (2025), score 60
  https://doi.org/10.1145/3729274
  type-constrained LLM decoding that guarantees well-typed generated code, improving repair and synthesis; type-level constraint ideas transfer to Rust-typed generation
- Guiding Symbolic Execution with Static Analysis and LLMs for Vulnerability Discovery (2026), score 60
  https://www.semanticscholar.org/paper/261db6778f5806762b76f3cecda5fd93cf50fb14
  LLM orchestrates symbolic execution harness synthesis guided by static analysis, validated by concrete replay; LLM harness generation pattern applicable to Verus harnesses
- Watchdogs and Oracles: Runtime Verification Meets Large Language Models for Autonomous Systems (2025), score 60
  https://doi.org/10.4204/eptcs.436.8
  argues runtime verification can guard LLM agents while LLMs help write specs, a direct framing of VL's formal-plus-LLM role

## Specification writing (77)

### Retrieval of lemmas, examples and skills (2)

- PropertyGPT: LLM-driven Formal Verification of Smart Contracts through Retrieval-Augmented Property Generation (2025), score 85
  https://doi.org/10.14722/ndss.2025.241357
  retrieves similar human-written properties and iterates LLM generation with compiler and prover feedback, directly transferable to retrieval-augmented Verus spec generation
- Learning-Infused Formal Reasoning: From Contract Synthesis to Artifact Reuse and Formal Semantics (2026), score 60
  https://doi.org/10.48550/arxiv.2602.02881
  vision for LLM plus graph-based reuse of contracts and proofs across verification systems; supports a knowledge-reuse strategy for VL

### Invariant and annotation inference (11)

- Combining Mechanical and Agentic Specification Inference for Move (2026), score 88
  https://doi.org/10.48550/arxiv.2605.10005
  weakest-precondition analysis plus claude code proposes loop invariants checked by the move prover; close analogue of llm spec inference for verus
- Solving constrained Horn clauses modulo algebraic data types and recursive functions (2022), score 82
  https://www.semanticscholar.org/paper/04d914e8bc37b799c333c564cd1ed1cf4702543f
  IC3-style CHC solver over ADTs and catamorphisms for Rust programs, implemented in Z3; invariant synthesis transferable to Verus loop invariants
- Finding Inductive Loop Invariants using Large Language Models (2023), score 80
  https://doi.org/10.48550/arxiv.2311.07948
  LLM proposes inductive loop invariants checked by sound symbolic tools against a symbolic baseline; directly transferable to Verus loop invariant generation.
- SynRG: Syntax Guided Synthesis of Invariants with Alternating Quantifiers (2020), score 78
  https://www.semanticscholar.org/paper/19e3698c403145cfcd129bdd99575b57aad3ea23
  Synthesizes loop invariants with alternating quantifiers over arrays by generalizing finite-domain solutions; transferable to invariant inference for Verus loops.
- ConVer: Using Contracts and Loop Invariant Synthesis for Scalable Formal Software Verification (2026), score 75
  https://doi.org/10.48550/arxiv.2605.27051
  LLM synthesizes function contracts and loop invariants inside a CEGAR-CEGIS loop with verifier checks; transferable to decomposed Verus proofs of C programs.
- Invariant Synthesis for Incomplete Verification Engines (2017), score 75
  http://arxiv.org/abs/1712.05581v2
  CEGIS invariant synthesis where incomplete verifiers report non-provability to guide learning, including separation-logic heap properties; directly transferable to Verus invariant search
- Data-driven inference of representation invariants (2020), score 75
  https://www.semanticscholar.org/paper/6a6ce0cb749d4a1bcb5d37620d07e360c7d2ee50
  counterexample-driven inference of representation invariants with synthesizer and verifier (Hanoi), including higher-order code; invariant synthesis loop applicable to Verus data types
- Program Verification via Predicate Constraint Satisfiability Modulo Theories (2020), score 70
  http://arxiv.org/abs/2007.03656v1
  CEGIS-based synthesis of inductive invariants, ranking functions and Skolem functions over constrained clauses; invariant and termination synthesis directly relevant to Verus automation
- Automatic generation of specifications using verification tools (2017), score 70
  https://doi.org/10.26083/tuprints-00005910
  automatically infers sound loop invariants and method contracts using abstraction, directly relevant to automatic spec generation for Verus
- Verification of Threshold-Based Distributed Algorithms by Decomposition to Decidable Logics (2019), score 70
  http://arxiv.org/abs/1905.07805v1
  auto-generates the auxiliary properties that decompose distributed-protocol proofs into EPR and BAPA; transferable to automatic invariant and lemma generation for Verus
- Generating Loop Invariants for Program Verification by Transformation (2017), score 60
  http://arxiv.org/abs/1708.07223v1
  discovers loop invariants by distillation-based clause transformation, avoiding the blow-up of induction-iteration; invariant discovery directly useful for Verus loops

### Specification synthesis (45)

- Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization (2026), score 92
  http://arxiv.org/abs/2605.26457v1
  Verus-SpecBench and an agentic environment for spec autoformalization from Codeforces, with hack-based adversarial tests beating LLM judges.
- Remonter les barrières pour ouvrir une clôture: Inférence de spécification des clôtures pour la preuve de programmes Rust avec COMA (2025), score 92
  https://openalex.org/W4405899067
  COMA infers closure specifications to verify Rust programs, directly on Rust deductive verification and spec inference for Verus-style work
- Artifact for our ISSTA '26 paper "KaPilot: LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification" (2026), score 90
  https://doi.org/10.6084/m9.figshare.32834699
  KaPilot uses LLMs to write Kani specs for unsafe Rust functions; artifact directly competes with LLM spec work for Rust verifiers
- Automatic Generation of Formal Specification and Verification Annotations Using LLMs and Test Oracles (2026), score 88
  http://arxiv.org/abs/2601.12845v1
  LLMs add Dafny pre/postconditions, loop invariants and proof helpers with verifier-feedback repair and test assertions as oracles; closely mirrors Verus spec generation.
- Beyond Postconditions: Can Large Language Models infer Formal Contracts for Automatic Software Verification? (2025), score 88
  https://doi.org/10.48550/arxiv.2510.12702
  llms infer pre and postconditions from natural language and verifiers check them, cutting false alarms; directly transferable to verus spec inference
- KaPilot: LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification (2026), score 85
  http://arxiv.org/abs/2607.21957v1
  Multi-agent LLM generation and precheck of Kani specifications for unsafe Rust, compared against AutoSpec.
- Specification Inference for Stainless Programs with Large Language Models (2026), score 85
  https://openalex.org/W7166491219
  LLMs generate Stainless specs and loop invariants with Stainless checking outcomes, with cloud models passing 9 of 12, direct comparison point for Verus spec generation
- BODHI: Precise OS Kernel Specification Inference (2026), score 85
  https://www.semanticscholar.org/paper/43702d8f4304b3ff00321698f78564cebc1d87b3
  structured domain-knowledge prompting lifts LLM spec generation for OS kernel calls to 96.7 percent on OSV-Bench, a prompting method usable for Verus spec writing
- Enchanting Program Specification Synthesis by Large Language Models Using Static Analysis and Program Verification (2024), score 85
  https://doi.org/10.1007/978-3-031-65630-9_16
  LLMs propose candidate specs and loop invariants, validated each round by a verifier to avoid error accumulation; directly transferable to Verus spec synthesis.
- Formally Specifying the Intended Behavior of the Program: LLM-Driven Neuro-Symbolic Program Specification Synthesis (2026), score 85
  https://doi.org/10.48448/hpwj-s947
  LLM generates ACSL specs per proof-relevant component while a symbolic verifier rejects or repairs candidates; directly applicable to Verus spec synthesis loops.
- Agentic Separation Logic Specification Synthesis (2026), score 85
  https://www.semanticscholar.org/paper/49ffd7a2922566ff1249e63d8626d0192877a2b3
  agentic LLM synthesis of separation-logic specs for large C++ code with counterexample-guided refinement and fuzz validation; directly transferable to spec generation for Rust heap code
- Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions? (2024), score 85
  https://doi.org/10.1145/3660791
  llm turns code comments into postcondition assertions that catch 64 real defects4j bugs; directly transferable to verus spec generation from doc comments
- ClassInvGen: Class Invariant Synthesis Using Large Language Models (2025), score 85
  https://doi.org/10.1007/978-3-031-99991-8_4
  title only: llm synthesis of class invariants; directly transferable to verus struct and type invariant generation
  (title only, no abstract)
- Executable JavaScript as a Checkable Specification Language: A JS-SAM Case Study on SysMoBench (2026), score 82
  https://doi.org/10.48550/arxiv.2607.13092
  llms write executable specs of real systems checked by trace replay with counterexample repair; close to llm spec generation for verified systems
- Fun2spec: Code Contract Synthesis At Scale (2026), score 82
  https://www.semanticscholar.org/paper/510fbeddbfd320eb7784507d278a2963c234836a
  llm synthesizes first-order code contracts for industrial c++ with error-driven validation; directly transferable to verus contract generation
- Intent-aligned Formal Specification Synthesis via Traceable Refinement (2026), score 80
  https://www.semanticscholar.org/paper/80ec697e3d25d90d2478c9165becf837716f0e3e
  traceable refinement of Lean specs from atomic requirements with tests; 86.6 percent on VERINA, directly transferable to spec generation
- CNnotator: LLM-Guided Memory Safety Annotation Synthesis (2026), score 80
  https://www.semanticscholar.org/paper/6c1fdb1cd451bc97482281ef19ce03710b6b5ff2
  LLM synthesizes CN separation-logic specs and tests them; spec-synthesis from code that transfers to Verus spec generation
- Path2Spec: Path-Aware Specification Generation via Large Language Models (2026), score 80
  https://doi.org/10.48550/arxiv.2609.33438
  Path-wise LLM specification generation with decompose-then-retry, beating SpecGen on SV-COMP, directly applicable to Verus spec synthesis
- SpecAgent: Empowering Program Verification with Agentic Synthesis of Formal Program Specifications (2026), score 80
  http://arxiv.org/abs/2610.05132v1
  Agentic ACSL spec synthesis with dependency-aware planning, RAG and critique, discharging 604 of 811 verification targets; planning and critique transfer to Verus spec generation
- KBSpec: LLM-driven Formal Specification Generation with Evolving Domain Knowledge Base (2026), score 80
  https://doi.org/10.48550/arxiv.2606.21339
  LLM spec generation where verifier feedback feeds a self-evolving knowledge base with no fine-tuning, directly applicable to generating Verus specifications
- Natural Language based Specification and Verification (2026), score 80
  http://arxiv.org/abs/2605.11315v1
  LLMs write and check natural-language specifications compositionally against implementations, close to VL spec-driven generation though only preliminary
- Verifying LLM-Generated Code in the Context of Software Verification with Ada/SPARK (2025), score 80
  http://arxiv.org/abs/2502.07728v1
  LLM writes SPARK annotations so Ada code verifies, 50.7 percent correct on a benchmark; direct analogue of LLM annotation writing for Verus
- Evaluating the Ability of Large Language Models to Generate Verifiable Specifications in VeriFast (2024), score 80
  https://doi.org/10.48550/arxiv.2411.02318
  GPT-4o generated VeriFast specs preserve behavior but rarely verify, with redundancies; prompting lessons for LLM-written specs in Verus
- SpecPylot: Python Specification Generation with Large Language Models (2026), score 80
  https://doi.org/10.1145/3803437.3806427
  LLM proposes icontract specs and CrossHair symbolic execution rejects bad ones, a direct LLM-spec-plus-checker loop for Python
- AutoDeduct: A Tool for Automated Deductive Verification of C Code (2025), score 80
  http://arxiv.org/abs/2501.10889v1
  infers ACSL function contracts automatically in Frama-C to cut annotation overhead, directly transferable to inferring specs for Verus code
- AutoACSL: Synthesizing ACSL Specifications by Integrating LLMs with CPG-Based Static Analysis (2026), score 78
  https://www.semanticscholar.org/paper/1f6d8016b58991ae3000e7fdcd80bee22e984663
  LLM generates ACSL specs for C guided by Code Property Graph features and Frama-C feedback loop, a transferable spec-synthesis-with-verifier-feedback technique
- SpecSyn: LLM-based Synthesis and Refinement of Formal Specifications for Real-world Program Verification (2026), score 78
  http://arxiv.org/abs/2604.21570v1
  Segments large programs and refines LLM specs via semantic mutation checks, reaching 1071 of 1365 properties; mutation-based spec strength check transfers to Verus spec quality
  Study: [specsyn](vl_paper_walkthrough/specsyn_20261012.md)
- Specula: Scaling formal specifications for autonomous model checking of system code (2026), score 75
  https://doi.org/10.48550/arxiv.2607.25333
  LLM agents write TLA+ specs of real system code and model check them, finding 249 bugs; spec-generation at scale
- nl2spec: Interactively Translating Unstructured Natural Language to Temporal Logics with Large Language Models (2023), score 75
  https://doi.org/10.1007/978-3-031-37703-7_18
  LLM translates requirements to temporal logic with interactive sub-translation edits, a spec-writing method for VL
- SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop (2026), score 72
  http://arxiv.org/abs/2603.02895v1
  LLM generates specs from RTL and refines them using equivalence-checker counterexamples; the feedback loop transfers to LLM spec generation checked by Verus
- Automated Synthesis of Formally Verified Multi-Abstraction Function Summaries (2025), score 72
  https://www.semanticscholar.org/paper/661df86389823ffae6f954b68045688502591e76
  title only, automated synthesis of verified function summaries, directly transferable to inferring specs for Verus functions
  (title only, no abstract)
- A Case-Study using GPT-4 and Formal Methods For Specification Synthesis (None), score 72
  https://www.semanticscholar.org/paper/49f8fd751ba544739898171a7ae0856f2626c42c
  title only: GPT-4 plus formal methods for specification synthesis case study, directly about LLM-generated specs which Verus users need
  (title only, no abstract)
- Verification Modulo Tested Library Contracts (2026), score 72
  http://arxiv.org/abs/2604.15533v2
  synthesizes modular library contracts via CEGIS and ICE learning, checked by tests; directly transferable to inferring library specs for Verus clients.
- KerSpecGen: Co-piloting formal Kernel specification synthesis with refined knowledge graphs and large language models (2025), score 70
  https://doi.org/10.1371/journal.pone.0338821
  LLM plus knowledge graph generates seL4 kernel specs, shows that spec writing for verified systems can be semi-automated, though evaluated by BLEU rather than proof success
- Supporting Software Formal Verification with Large Language Models: An Experimental Study (2025), score 70
  http://arxiv.org/abs/2507.04857v1
  Claude turns natural-language requirements into assertions checked by ESBMC; shows LLM spec writing with bounded verification, transferable to Verus specs
- Verification of PETSc with CIVL using LLM-generated ACSL contracts and deterministic driver generation (2026), score 70
  https://doi.org/10.48550/arxiv.2609.31687
  LLM generates small ACSL contracts from docs, checked by CIVL with a deterministic driver, finding a 1997 PETSc bug; directly transferable to LLM-written specs checked by a verifier
- Position: Natural Language Should Not Fully Replace Formal Languages (2026), score 70
  https://doi.org/10.48550/arxiv.2607.20432
  argues formal languages stay necessary for strict specs and proves a specificity crossover; directly informs VL spec-writing strategy
- AGVTS: Automated Generation and Verification of Temporal Specifications for Aeronautics SCADE Models (2024), score 70
  https://doi.org/10.1007/978-3-031-71177-0_21
  turns restricted natural-language requirements into LTL and CTL with a BERT-augmented translator, then verifies SCADE models in nuXmv; a direct NL-to-spec-to-verification pipeline
- Event-B Agent: Towards LLM Agent for Formal Model Synthesis and Repair (2026), score 68
  https://doi.org/10.1145/3808218
  LLM agent synthesizes and repairs Event-B formal models with proof checking; a transferable agent loop for formal spec repair
- From Language to Logic: Bridging LLMs & Formal Representations for RTL Assertion Generation (2026), score 65
  https://doi.org/10.1109/vts69484.2026.11563398
  ReAct agent generates SVA with solver-in-the-loop repair using formal proof feedback and RAG; solver-feedback loop transferable to LLM proof generation.
- A type system for extracting functional specifications from memory-safe imperative programs (2021), score 65
  https://doi.org/10.1145/3485512
  type system extracts functional specs from imperative code and inserts dynamic checks, so proofs avoid pointer reasoning; useful to Rust ownership-based spec design
- Inference of Properties from Requirements and Automation of Their Formal Verification (2019), score 65
  https://doi.org/10.1109/ase.2019.00145
  infers declarative property specs from example data with ILP and tailors them to make proofs automatic; spec-inference idea transferable to Verus spec generation
- Automated Translation of Event-B Models to SPARK Proof Annotations (2020), score 65
  https://openalex.org/W3139067527
  Rodin plug-in auto-translates Event-B models into SPARK proof annotations, automatic contract generation from formal models
- Confidence-Guided Protocol IR for LLM-Aided Security Protocol Modeling (2026), score 62
  https://doi.org/10.48550/arxiv.2609.37396
  llm drafts tamarin security models via an auditable intermediate representation with confidence highlighting; human-in-loop spec drafting transferable to verus
- Talking with Verifiers: Automatic Specification Generation for Neural Network Verification (2026), score 60
  https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_68
  translates natural-language requirements into formal verification queries for NN verifiers, a spec-generation pattern for LLM-driven verification

### Specification testing and failure explanation (14)

- Beyond Benchmarks: A Case Study of LLM-Generated Verus Specification Failures on Asterinas Vostd (2026), score 92
  https://www.semanticscholar.org/paper/31418efab6a8d389afed475d40b5618945c2853b
  Case study of LLM-generated Verus specs failing systematically across four stages on the Asterinas Vostd OS kernel, with verifier diagnostics that mislead repair.
- Passing Proofs That Prove Nothing: Deciding Postcondition Vacuity, Precondition Satisfiability, and Contract Completeness for Rust and Kani (2026), score 88
  https://doi.org/10.5281/zenodo.21865170
  vacuity tool decides vacuous postconditions and preconditions for Kani contracts, Lean-proved; Verus proofs could pass vacuously too
- Formalizing Numerical Analysis: An Agent Pipeline and Quality Audit Beyond Kernel Acceptance (2026), score 80
  https://www.semanticscholar.org/paper/0bd5f9e42a027296b3c78134a3b766733d14b206
  coding agent formalizes an ODE textbook in Lean and shows compilation overstates quality via unfaithful specs, a direct warning and audit method for VL spec fidelity
- How Powerful are LLMs in Generating Formal Program Specifications? (2026), score 75
  https://doi.org/10.48550/arxiv.2608.13077
  Evaluates LLM-written Rocq specs by testing them on concrete cases, sidestepping proof difficulty; a useful method for measuring spec quality in Verus
- Evaluating LLM-Generated ACSL Annotations for Formal Verification (2026), score 75
  https://openalex.org/W7130237625
  compares LLM-generated ACSL specs against rule-based and Frama-C tools; transferable evaluation of LLM spec generation with verifier checks
- Neuro-Symbolic Generation and Validation of Memory-Aware Formal Function Specifications (2026), score 72
  https://doi.org/10.48550/arxiv.2603.13414
  LLM generates memory-aware C function specs and refutes wrong ones with prover-checked counterexamples; refutation idea transfers to Verus specs
- SHADOWBENCH: Toward Reliable Automatic Evaluation of Semantic Alignment in Autoformalization (2026), score 72
  https://www.semanticscholar.org/paper/44824efc89c85d81cd3ebd14d6743f3925380a05
  checks Lean autoformalized statements against shadow statements in both directions to catch misaligned specs, a spec-alignment check transferable to Verus spec validation
- Automated Repair of Declarative Software Specifications in the Era of Large Language Models (2023), score 72
  https://doi.org/10.48550/arxiv.2310.12425
  chatgpt repairs alloy specifications using solver counterexamples and finds bugs others miss; llm spec repair transferable to verus
- Detecting Inconsistencies in Arm CCA's Formally Verified Specification (2026), score 70
  https://www.semanticscholar.org/paper/c32071320a0860fdc6cb570abee16a42ebfe122c
  Scope models the Arm CCA RMM spec in Verus with SMT to find 35 specification bugs, beating LLM-based checkers on precision.
- Trustworthy Formal Natural Language Specifications (2023), score 65
  https://doi.org/10.1145/3622758.3622890
  addresses mistranslation of natural-language specs into formal claims, a spec-auditing problem central to VL specification writing
- Explainable Program Synthesis by Localizing Specifications (2023), score 65
  https://www.semanticscholar.org/paper/341947f9c3e4009c820a5fb04da957df25fb7e8b
  subspecifications explain each part of a synthesized program and aid debugging, transferable to explaining Verus specs and proof obligations
- SpecGuard: Proving a Task Is Broken Before the Agent Cheats (2026), score 62
  https://www.semanticscholar.org/paper/2a0a119cb160217adb080fe3d12eaf29a2445386
  LLM autoformalizes task intent into Lean specs and checks spec-test conflicts with a kernel certificate; relevant to spec writing and checking for agent tasks
- Faithful Autoformalization of Natural Language Assertions (2026), score 62
  https://www.semanticscholar.org/paper/1f791802f356cf5eaab7735f362bdd850fb2bf43
  filters llm-translated nl assertions by conformance score and test-based validity; filtering idea transferable to verus spec generation
- Closing the Loop on LLM-Generated RTL Assertions with Quality-Aware Formal Verification (2026), score 60
  https://doi.org/10.1109/sbcci69725.2026.11706772
  LLM assertions rejected when vacuous or non-distinguishing via mutation checks; transferable to filtering weak LLM-written Verus specs

### Benchmarks, evaluations and surveys (3)

- An Empirical Study of LLM-Generated Specifications for VeriFast (2026), score 85
  https://doi.org/10.48550/arxiv.2606.26490
  empirical study of LLM-generated specs for 303 C functions verified by VeriFast; shows low verification success and domain-knowledge errors, a key benchmark for VL
- Survey of annotation generators for deductive verifiers (2024), score 80
  https://doi.org/10.1016/j.jss.2024.111972
  Surveys specification inference tools for Java deductive verifiers, with their spec types and gaps; directly informs automated spec generation for Verus.
- Formal specifications investigated (2022), score 75
  https://doi.org/10.1145/3524482.3527652
  taxonomy of annotations deductive verifiers need, from 10k lines and expert interviews; directly informs spec and annotation generation for Verus

### Other verification methods (2)

- Monitoring with verified guarantees (2023), score 60
  https://doi.org/10.1007/s10009-023-00712-3
  adds assume and assert annotations to the Lola monitor language, checked by an integrated SMT solver, found real errors in avionics specs, transferable to specification checking
- A Semantics of Structures, Unions, and Underspecified Terms for Formal Specification (2024), score 60
  https://doi.org/10.1145/3644033.3644380
  formal Coq semantics of ACSL unions and underspecified terms, a spec-language semantics relevant to Verus spec design

## Verified systems (82)

### Invariant and annotation inference (1)

- Experiments in Verification of Linear Model Predictive Control: Automatic Generation and Formal Verification of an Interior Point Method Algorithm (2018), score 78
  https://doi.org/10.29007/qt5j
  annotates generated interior-point code, proves it deductively, and discharges helper lemmas via SMT; a close template for proving LLM- or codegen-produced Rust

### Specification testing and failure explanation (2)

- Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3 (2021), score 75
  https://doi.org/10.1145/3477132.3483540
  lightweight formal methods on production S3 storage with reference-model specs and automated checks; practical workflow model for sustaining VL proofs as code evolves
- Smart Casual Verification of the Confidential Consortium Framework (2024), score 65
  http://arxiv.org/abs/2406.17455v2
  checks a C++ system against a TLA+ spec in CI and finds six bugs, a spec-to-implementation validation method relevant to verified systems work

### Refinement proofs and refinement types (3)

- Denotation-based Compositional Compiler Verification (2024), score 65
  http://arxiv.org/abs/2404.17297v3
  denotational compiler verification with refinement algebra, applied to compcert front end; compositional proof structure transferable to modular verus verification
- Gale-Shapley Verified (2024), score 65
  https://doi.org/10.1007/s10817-024-09700-x
  stepwise refinement of imperative program and invariants into a linear-time verified Gale-Shapley implementation, a method for developing verified algorithms
- Refinement Verification of OS Services based on a Verified Preemptive Microkernel (2024), score 60
  https://doi.org/10.1007/978-3-031-57259-3_9
  Builds OS service verification on top of a verified microkernel via invariants linking kernel and service objects, a compositional verification pattern relevant to verified systems

### SMT engineering and proof stability (2)

- Formal Verification of a Library in Stainless (2025), score 70
  https://openalex.org/W7112475517
  Stainless verifies Scala interval library, finds a class invariant bug, and reports Z3 proves more VCs than cvc5 while cvc5 is faster, useful solver and counterexample evidence
- A verified, efficient embedding of a verifiable assembly language (2019), score 60
  https://doi.org/10.1145/3290376
  F* embedding of x64 assembly with VC generation during type checking, an SMT-automation technique for verified crypto code

### Rust semantics and unsafe code (1)

- Overcoming Restraint: Composing Verification of Foreign Functions with Cogent (2021), score 65
  http://arxiv.org/abs/2102.09920v4
  proves correctness of C foreign functions called from a verified uniqueness-typed language, a mixed-language verified-systems case relevant to Rust unsafe boundaries

### Concurrency and weak memory (9)

- Lion: Modular Verification of Async Runtime Liveness (2026), score 80
  https://www.semanticscholar.org/paper/e1c808304fdb2645fa0eb48d4391ad893fbdbf68
  Modular liveness verification of a Tokio-compatible async runtime in Verus, via an event log with LTL-to-FOL translation.
- DeterV: Verifying Deterministic Parallel Execution (2026), score 80
  https://www.semanticscholar.org/paper/bbc86edbfb3bcdf734807ea87a0080816c2a8e8f
  DeterV: deterministic parallel runtime verified in Verus for equivalence to serial execution, with a 3:1 proof-to-code ratio.
- Formal verification of parallel prefix sum and stream compaction algorithms in CUDA (2022), score 70
  https://doi.org/10.1016/j.tcs.2022.02.027
  VerCors deductive proofs of data-race freedom and functional correctness for CUDA prefix-sum and stream compaction; extends a verifier to GPU code, a close analogue for verified parallel Rust
- Verified Lock-Free Session Channels with Linking (2024), score 65
  https://doi.org/10.1145/3689732
  iris-verified lock-free session channels with linking, a layered concurrent separation logic proof of an implementation, transferable to vl lock-free code
- Practical Verification of Distributed Systems: Streamlining Safety Proofs Using Invariant Taxonomies, and Verifying Latency Properties Using Symbolic Latency (2025), score 65
  https://doi.org/10.7302/25607
  invariant taxonomies streamline inductive safety proofs of distributed systems and extend verification to end-to-end latency; directly transferable to proof structuring for VL
- Resume Means Resume: A Machine-Checked Conformance Contract for Checkpoint, Interrupt, and Resume Semantics in Workflow Persistence Layers (2026), score 60
  https://doi.org/10.48550/arxiv.2608.03836
  Machine-checked resume contract (TLA+, TLAPS) for agent workflows, with a Verus-verified recovery core and concurrent-resume failures.
- Stop Means Stop: Measuring and Repairing the Enforcement Gap in Agent-Framework Control Primitives (2026), score 60
  https://doi.org/10.1109/access.2026.3740448
  Measures and repairs enforcement gaps in agent-framework approval, cancel and timeout primitives with a Verus-verified Rust gate.
- Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent Large Language Model Systems (2026), score 60
  http://arxiv.org/abs/2606.17182v1
  TLA+ formalization of concurrency anomalies for multi-agent LLM state, with 274 Verus obligations for detectors and prevention.
- Verification of the Tree-Based Hierarchical Read-Copy Update in the Linux Kernel (2016), score 60
  http://arxiv.org/abs/1610.03052v3
  model checks Linux Tree RCU source directly with CBMC instead of hand translation; source-level verification of concurrent kernel code

### Verified code translation (1)

- Baking for Dafny: A CakeML Backend for Dafny (2025), score 60
  https://www.semanticscholar.org/paper/9ff51efec347e53a8d722d4430f15e707200f08b
  builds a Dafny backend targeting verified CakeML in HOL4 to shrink the trusted base, a verified-compilation route relevant to trusting Verus-to-Rust output

### Benchmarks, evaluations and surveys (1)

- The First Fifteen Years of the Verified Software Project (2021), score 60
  https://doi.org/10.1145/3477355.3477362
  no abstract; retrospective on the Verified Software Project, which bears on how large-scale verified software programs have fared over time
  (title only, no abstract)

### System case studies (60)

- Applying Modern Verification Techniques to a Root-of-Trust Bootloader (2025), score 95
  https://www.semanticscholar.org/paper/76540fe938e6624a337f82f6922441e98113f760
  Retrofits Verus onto an existing root-of-trust bootloader, reporting annotation overhead and workarounds, a direct field report for VL-style Verus adoption
- TickTock: Verified Isolation in a Production Embedded OS (2025), score 85
  https://www.semanticscholar.org/paper/d1c2e3bb58f75f473613be526ac9c6df7c8fff17
  Flux verifies process isolation in a production Rust OS kernel, finding real bugs; direct precedent for verified systems code
- Formal Verification of a Rust-Based Buddy Physical Memory Allocator (2026), score 85
  https://www.semanticscholar.org/paper/bf4ef1803c55ae2b9141a3fe121d940cc07c1ed8
  title only: formal verification of a Rust buddy allocator, a verified-systems case directly comparable to VL targets
  Study: [buddy_allocator](vl_paper_walkthrough/buddy_allocator_20261012.md)
  (title only, no abstract)
- Verifying Rust Implementation of Page Tables in a Software Enclave Hypervisor (2024), score 85
  https://www.semanticscholar.org/paper/d026a9156ac24ea878f37a56a37e61cf3dbd2781
  verifies a Rust hypervisor page-table implementation with a MIR semantics and layered proof framework, a verified-systems template for Verus
- The Secrets Must Not Flow: Scaling Security Verification to Large Codebases (2026), score 85
  https://doi.org/10.1109/sp63933.2026.00026
  Gobra verifies a 1% core of a 100k-line Go codebase with I/O independence analyses, a scaling method for verifying large Rust-like systems
- Unfolding Iterators: Specification and Verification of Higher-Order Iterators, in OCaml (2025), score 85
  https://doi.org/10.48550/arxiv.2506.20310
  Gospel specs plus Cameleer deductive proofs that OCaml higher-order iterator clients are correct; a direct method for specifying and verifying client code
- Auto-active Verification of Graph Algorithms, Written in OCaml (2022), score 85
  http://arxiv.org/abs/2207.09854v1
  auto-active proofs of real OCamlgraph algorithms with Cameleer and SMT, mostly automatic; a close analogue of Verus-style proofs of real Rust libraries
- How We Built Cedar: A Verification-Guided Approach (2024), score 85
  https://doi.org/10.1145/3663529.3663854
  Cedar team builds a Rust-era production policy engine with executable model proofs, differential testing and PBT; found 25 bugs, a direct blueprint for VL
- Atmosphere: Practical Verified Kernels with Rust and Verus (2025), score 80
  https://www.semanticscholar.org/paper/72319e8b81d851f112403809a0b3886a288e6681
  Verus-verified Rust microkernel with refinement proofs, reporting effort, proof-to-code ratio, and verification time as practicality evidence.
- Scaling Verification of Cryptographic Software with Aeneas, Rust, and Lean (2026), score 80
  http://arxiv.org/abs/2609.15648v1
  Aeneas and Lean verification of SymCrypt Rust crypto with agents writing proofs, 16.7 KLOC of Rust verified for safety and correctness.
- StateSync-GKR: Machine-Checking the Trust Chain from Sparse-Merkle State Transitions to GKR Verification (2026), score 80
  https://doi.org/10.48550/arxiv.2610.05335
  Isabelle proofs linking a compiler model to a Rust prover plus Creusot contracts; composes verified compilation with a Rust verification connection
- Vest: Verified, Secure, High-Performance Parsing and Serialization for Rust (2025), score 80
  https://www.semanticscholar.org/paper/81472ea500ce89e7d0db4223e56884c2a696edf3
  title only: verified secure parsing and serialization library for rust, a directly on-topic verified rust component whose method is unknown
  (title only, no abstract)
- Formal Specification and Verification of JDK’s Identity Hash Map Implementation (2023), score 80
  https://doi.org/10.1145/3594729
  JML specs and KeY proofs for JDK's IdentityHashMap, plus proof-effort comparison across hash maps, a direct real-library verification case study
- Development and Verification of a Flight Stack for a High-Altitude Glider in Ada/SPARK 2014 (2017), score 75
  http://arxiv.org/abs/1707.00945v1
  experience report verifying a flight stack in SPARK 2014, with pitfalls and design advice for proof-friendly code, directly transferable to Verus design
- Protocols to Code: Formal Verification of a Secure Next-Generation Internet Router (2025), score 72
  https://doi.org/10.1145/3719027.3765104
  isabelle protocol refinement linked to automated verifier proving go router code crash and race freedom, a protocol-to-code verification pattern transferable to vl
- Automatic kernel code synthesis and verification (2020), score 72
  https://www.semanticscholar.org/paper/7c811d7c5ead10f5abd13dc65640790dfbc277d1
  Builds an OS kernel with high proof automation by restricting interfaces to finite forms and generating C from specs, a transferable approach to low-burden verified systems code
- Techniques for formal modelling and verification on dynamic memory allocators (2018), score 72
  https://doi.org/10.70675/c5b26d85z0d00z493ezb0f9zc6c2fd6b704a
  Refinement-based Event-B specs and abstract-interpretation invariants for dynamic memory allocators; transferable to verified allocator design and invariant inference.
- Atmosphere: Towards Practical Verified Kernels in Rust (2023), score 70
  https://www.semanticscholar.org/paper/7e1afa64538227d03a0a80492e411e16c8f4a845
  Earlier 2023 version of the Atmosphere Verus kernel, with the proof-to-code ratio of 7.5:1 and the case for practical verified kernels.
- Veld: Verified Linux Drivers (2024), score 70
  https://www.semanticscholar.org/paper/38d4f6684f92ca4babb4e56b57691da0f7566a2a
  Verus-based Linux device driver framework, with early verification of parts of an MSR driver and concurrency challenges.
- Formal Security and Functional Verification of Cryptographic Protocol Implementations in Rust (2025), score 70
  https://www.semanticscholar.org/paper/465d08faa15b3a0cc0d0e80f07f064b3fc933bc1
  Multi-backend verification of a post-quantum TLS 1.3 Rust implementation (Bert13), spanning F*, ProVerif and SSProve.
- Lightweight Hypervisor Verification: Putting the Hardware Burger on a Diet (2025), score 70
  https://www.semanticscholar.org/paper/cb4c82a40b5420bfa373c8824ed272c6d462691a
  lightweight hypervisor verification using Kani on a RISC-V model, finding 21 bugs; practical Rust model-checking case study close to VL's needs
- Lessons Learned From Microkernel Verification -- Specification is the New Bottleneck (2012), score 70
  http://arxiv.org/abs/1211.6186v1
  Lessons from L4 microkernel verification showing specification writing is the main bottleneck, directly relevant to Verus spec cost
- A Formally Verified Robustness Certifier for Neural Networks (2025), score 70
  https://doi.org/10.1007/978-3-031-98679-6_15
  Dafny-verified robustness certifier that exposes unsound prior unverified code, a precedent for verified ML-adjacent implementations
- A Verified Implementation of the DPLL Algorithm in Dafny (2022), score 70
  https://doi.org/10.3390/math10132264
  Dafny-verified DPLL SAT solver with machine-checked soundness and completeness, shows auto-active verification can yield trusted solvers at usable speed
- For a Few Dollars More -- Verified Fine-Grained Algorithm Analysis Down to LLVM (2021), score 70
  https://doi.org/10.26226/morressier.604907f41a80aac83ca25d21
  verifies functional correctness and amortized complexity down to LLVM with a cost model, yielding introsort on par with GNU C++ library
- Formal Proof of SCHUR Conjugate Function (2010), score 70
  https://doi.org/10.48550/arxiv.1004.5034
  Frama-C ACSL deductive proof of a C conjugate-partition function with SMT provers; directly transferable to auto-active proof of systems code
- Practical Verification of System-Software Components Written in Standard C (2024), score 70
  https://doi.org/10.1145/3694715.3695980
  verifies raw-pointer system software in standard C with low annotation burden; technique transfers to verified systems code in Verus
- StarMalloc: Verifying a Modern, Hardened Memory Allocator (2024), score 68
  https://doi.org/10.1145/3689773
  verified concurrent c allocator in steel separation logic with smt and drop-in use in firefox, a verified systems artifact close to what vl targets
- Combining Type Checking and Formal Verification for Lightweight OS Correctness (2024), score 65
  http://arxiv.org/abs/2501.00248v1
  Hybrid of type-system invariants, formal verification and informal reasoning in the Theseus Rust OS, cutting proof effort.
- Towards System-Oriented Formal Verification of Local-First Access Control (2026), score 65
  http://arxiv.org/abs/2604.23560v1
  Early Verus verification of capability-based access control for local-first CRDT systems, aiming at Matrix and Keyhive.
- Leveraging Rust for Lightweight OS Correctness (2023), score 65
  https://doi.org/10.1145/3625275.3625398
  Theseus OS trades proof strength for lower effort by mixing type checks, formal proofs and informal reasoning; a useful cost model
- Towards a Formally Verified Security Monitor for VM-based Confidential Computing (2023), score 65
  https://www.semanticscholar.org/paper/44670c92636f1f03a8a0b1bc8975153bd142a27d
  verified security monitor for RISC-V in Rust; a formal-methods case for verified low-level systems code
- Applying formal verification to microkernel IPC at meta (2022), score 65
  https://doi.org/10.1145/3497775.3503681
  Iris separation logic verifies Meta's IPC queues and found real bugs; industrial verified-systems evidence on cost-benefit
- Verified Low-Level Programming Embedded in F* (2017), score 65
  https://doi.org/10.48550/arxiv.1703.00053
  Low* embeds a C subset in F* with SMT plus manual proofs for verified crypto; a template for verified systems code
- StarMalloc: A Formally Verified, Concurrent, Performant, and Security-Oriented Memory Allocator (2024), score 65
  https://doi.org/10.48550/arxiv.2403.09435
  verified concurrent allocator in Steel separation logic with reusable verified data structures; shows verified systems components that VL could target
- Formal Verification of Voting Schemes (2014), score 65
  https://doi.org/10.5445/ir/1000092716
  auto-active VCC proofs of voting schemes combined with bounded checking in an iterative workflow; direct analogue of auto-active verification practice for Verus
- Efficient Formally Verified Maximal End Component Decomposition for MDPs (2024), score 65
  https://doi.org/10.1007/978-3-031-71162-6_11
  Isabelle-proved maximal end component algorithm refined to LLVM and integrated into a model checker, verified-code extraction that cuts trusted base
- Efficient Verification of Optimized Code: Correct High-speed X25519 (2020), score 65
  http://arxiv.org/abs/2012.09919v2
  Why3 proofs of 3000 lines of hand-optimized AVR assembly crypto that found and fixed a real bug, shows automated provers on optimized low-level code
- Separating Separation Logic – Modular Verification of Red-Black Trees (2023), score 65
  https://doi.org/10.1007/978-3-031-25803-9_8
  modular separation-logic proof of red-black trees, a verified-data-structure case study for heap reasoning; no abstract so judged by title
  (title only, no abstract)
- Deductive Verification of Unmodified Linux Kernel Library Functions (2018), score 65
  http://arxiv.org/abs/1809.00626v1
  deductive verification of unmodified Linux kernel string and memory functions from source-derived contracts, a systems-C benchmark pattern reusable for Verus
- Mechanising and verifying the WebAssembly specification (2018), score 65
  https://doi.org/10.1145/3167082
  mechanises and verifies the WebAssembly formal specification in a proof assistant; verified-language spec work is directly transferable to Rust-to-Wasm verification
- Verified Cryptographic Code for Everybody (2021), score 62
  https://doi.org/10.1007/978-3-030-81685-8_31
  SAW proofs that production AES-256-GCM and SHA-384 assembly is memory safe and functionally correct; a benchmark-scale example of verified systems code
- Vosti: Specifying, Implementing, and Verifying Deterministic LLM Inference (2026), score 60
  http://arxiv.org/abs/2609.38981v1
  Specifies deterministic LLM inference and builds an engine with a Verus inductive proof of scheduling and KV-cache preservation.
  Study: [vosti](vl_paper_walkthrough/vosti_20261012.md)
- Cedar: An Expressive, Fast, Safe, and Analyzable Authorization Language for Modern Distributed Systems [Keynote Abstract] (2025), score 60
  https://www.semanticscholar.org/paper/2a1a01c64b57b0670620cef395f02ea3f8f39c45
  Cedar authorization language in Rust with Lean-verified core, built in verification-guided development at cloud scale
- Protocols to Code: Formal Verification of a Next-Generation Internet Router (2024), score 60
  https://doi.org/10.3929/ethz-b-000706537
  Isabelle protocol models linked to automated verification of production Go router code for memory safety, a lessons-learned case for verifying real systems
- A Mechanically Verified Garbage Collector for OCaml (2025), score 60
  https://doi.org/10.1007/s10817-025-09721-0
  verified ocaml mark-and-sweep gc in f* via low star and karamel, a verified runtime component showing a proof-oriented systems workflow
- Prove your Colorings: Formal Verification of Cache Coloring of Bao Hypervisor (2025), score 60
  https://doi.org/10.1007/978-3-031-90900-9_11
  formal verification of a hypervisor's cache coloring code with nested loops and linked lists found two real bugs, a verified systems-code precedent
- Towards Formal Verification of a TPM Software Stack: Achievements and Opportunities (2025), score 60
  https://doi.org/10.1145/3743153
  Frama-C verification of a real C library with linked lists needed Coq lemmas and exposed tool limits, the same pain VL faces on systems code
- Formal Verification of Prim’s Algorithm in SPARK (2023), score 60
  https://doi.org/10.24251/hicss.2023.809
  implements Prim's algorithm in SPARK with contracts proving absence of runtime errors, a concrete verified-algorithm case study close to Verus-style code verification
- Formally Verifying an Efficient Sorter (2024), score 60
  https://doi.org/10.1007/978-3-031-57246-3_15
  KeY deductive verification of an efficient in-place Java sample sort, shows verifying performance-tuned code without sacrificing efficiency, relevant to Verus systems code
- Verified Erasure Correction in Coq with MathComp and VST (2022), score 60
  https://doi.org/10.1007/978-3-031-13188-2_14
  Coq and VST proof of a C Reed-Solomon erasure code, finding a latent bug; end-to-end verified C with separation logic, a model for VL's real-world verified code
- Formal Verification of Resource Synchronization Protocol Implementations: A Case Study in RTEMS (2022), score 60
  https://doi.org/10.1109/tcad.2022.3197501
  deductive verification of RTEMS real-time synchronization code against contracts found real mismatches with theory; shows deductive proof of real OS implementations
- Towards Formal Verification of a TPM Software Stack (2023), score 60
  http://arxiv.org/abs/2307.16821v2
  Frama-C proof of linked-list C code absence of runtime errors, a case study of verifying real systems code that shows where auto-active tools struggle
- Formally Verified Suffix Array Construction (2025), score 60
  https://doi.org/10.1007/s10817-025-09735-8
  Isabelle-verified SA-IS suffix array algorithm with code extraction to Haskell, shows the gap between verified and efficient implementations
- Integrated Verification of Cryptographic Security Proofs and Implementations (2020), score 60
  https://doi.org/10.34626/wfm1-3g93
  connects a machine-checked security proof to an end-to-end verified MPC engine and software stack, a proof-to-implementation pipeline transferable to verified crypto
- Gillian, Part II: Real-World Verification for JavaScript and C (2021), score 60
  https://doi.org/10.1007/978-3-030-81688-9_38
  separation-logic verification of AWS Encryption SDK code in JavaScript and C, finding five bugs; a real-world verification case with concrete bug yield
- Deductive Verification of Sparse Sets in Why3 (2025), score 60
  https://doi.org/10.1007/978-3-031-86695-1_3
  deductive verification case study of sparse sets in Why3, title only; a template for verified set data structures
  (title only, no abstract)
- Formal Specification and Verification of Smart Contracts for Azure Blockchain (2018), score 60
  https://doi.org/10.48550/arxiv.1812.08829
  VeriSol automated verifier for Solidity contracts, found bugs and proved full contract verification; comparable auto-verifier for a language
- Verification of Configurable SRA Systems (2026), score 60
  http://arxiv.org/abs/2605.21385v2
  contract-based deductive verification of configurable schedulers with quantified invariants using Dafny; closely comparable to Verus-style modular proofs.
- Verification of a Smart Contract for a Simple Casino (2021), score 60
  http://arxiv.org/abs/2106.14457v1
  Whiley with Boogie and Z3 verified a smart contract and fixed spec bugs; a real verify-and-fix case relevant to VL spec writing.

### Other verification methods (2)

- Formal Verification of a Token Sale Launchpad: A Compositional Approach in Dafny (2025), score 65
  http://arxiv.org/abs/2510.24798v1
  bottom-up Dafny proof of a token-sale contract with non-linear arithmetic lemmas and refund bounds; shows how to structure a real business-logic verification
- Formal Verification of Minimax Algorithms (2025), score 60
  http://arxiv.org/abs/2509.20138v2
  Dafny proofs of alpha-beta minimax with transposition tables, plus a witness-based correctness criterion; shows deductive proof of tricky optimized algorithms

## Benchmarks (36)

### Proof repair from verifier feedback (1)

- Dataset for : A New Era in Software Security: Towards Self-Healing Software via Large Language Models and Formal Verification (2023), score 70
  https://doi.org/10.5281/zenodo.8026524
  LLM repairs vulnerabilities using bounded model checking counterexamples as feedback; a closed loop directly usable for verified repair

### Specification synthesis (1)

- Self-Spec Verifiable Code Generation (2026), score 88
  https://doi.org/10.48550/arxiv.2609.39568
  VeriCodeBench tests LLM self-written specs and code across C, Java, Rust, Python; CodeNova uses verifier feedback to repair

### Specification testing and failure explanation (1)

- LLMs as verification oracles for Solidity (2025), score 70
  http://arxiv.org/abs/2509.19153v2
  measures GPT-5 as a judge of contract property validity against SolCMC and Certora, an evaluation design transferable to judging LLM-written Verus specs

### Proof agents, search and training (2)

- Verifier-supervised fine-tuning for Rust/Verus: vericoding dataset (restricted) (2026), score 85
  https://doi.org/10.5281/zenodo.21523433
  Restricted verifier-supervised fine-tuning dataset for Rust/Verus vericoding; access requires a request due to licensing.
- ATLAS: Automated Toolkit for Large-Scale Verified Code Synthesis (2025), score 80
  https://doi.org/10.48550/arxiv.2512.10173
  Synthesizes 2.7K verified Dafny programs as fine-tuning data, showing synthetic verified-code datasets can lift LLM verification success; transferable to Verus training data

### Benchmarks, evaluations and surveys (30)

- VeriContest: A Competitive-Programming Benchmark for Verifiable Code Generation (2026), score 95
  http://arxiv.org/abs/2605.08553v1
  VeriContest: 946-problem Rust/Verus benchmark for spec, code and proof generation, with 13.95% proof success for the best model.
- VERINA: Benchmarking Verifiable Code Generation (2025), score 93
  https://doi.org/10.48550/arxiv.2505.23135
  189 Lean tasks benchmark code, spec and proof generation, o3 proves only 4.9 percent, a direct baseline for evaluating llm-written verified code
- A benchmark for vericoding: formally verified program synthesis (2025), score 92
  http://arxiv.org/abs/2509.22908v1
  Vericoding benchmark of 12.5k specs; off-the-shelf LLMs reach 44% success in Verus/Rust versus 82% in Dafny and 27% in Lean.
- VeruSAGE: A Study of Agent-Based Verification for Rust Systems (2025), score 92
  http://arxiv.org/abs/2512.18436v2
  VeruSAGE: study of agent systems on 849 Verus system proof tasks, with the best combination completing over 80%.
- NL2VBench: A Benchmark for End-to-End Natural-Language to Verifiable Rust Generation (2026), score 90
  https://www.semanticscholar.org/paper/e7d2e1fc06824923deab3df82b24df8b533c7eb2
  NL2VBench: 762 verifier-checked tasks for generating verifiable Rust from natural language with Verus, showing low LLM success.
- Can LLMs Reason Like Automated Theorem Provers for Rust Verification? VCoT-Bench: Evaluating via Verification Chain of Thought (2026), score 90
  http://arxiv.org/abs/2603.18334v2
  VCoT-Bench tests LLM steps in Rust verification proofs with 1988 tasks; shows models fragile versus provers, a baseline for VL evals
- Selene: Pioneering Automated Proof in Software Verification (2024), score 90
  https://doi.org/10.18653/v1/2024.acl-long.98
  Selene benchmark for project-level automated proof generation on seL4 with LLMs; direct benchmark template for LLM proof generation in Verus
- AlgoVeri: An Aligned Benchmark for Verified Code Generation on Classical Algorithms (2026), score 88
  https://doi.org/10.48550/arxiv.2602.09464
  Aligned vericoding benchmark of 77 classical algorithms with identical contracts in Dafny, Verus and Lean, showing Verus memory-constraint gaps.
- SWE-Proof: Can Language Models Resolve Real-World Issues with Machine-Checked Proofs? (2026), score 88
  https://doi.org/10.48550/arxiv.2609.21190
  Machine-checked proofs for real SWE-bench issues with agent-written specs, showing faithful spec synthesis is the bottleneck, direct evidence for VL-style agents
  Study: [swe_proof](vl_paper_walkthrough/swe_proof_20261012.md)
- Can LLMs Enable Verification in Mainstream Programming? (2025), score 85
  http://arxiv.org/abs/2503.14183v1
  Evaluates LLMs producing verified code in Dafny, Nagini and Verus from HumanEval-derived sets, and what context helps.
- VerifyThisBench: Generating Code, Specifications, and Proofs All at Once (2025), score 85
  https://doi.org/10.48550/arxiv.2505.19271
  Benchmark where LLMs write specs, verified code and proofs end-to-end with under 4% pass; direct benchmark for VL-style verified code generation
- DafnyBench: A Benchmark for Formal Software Verification (2024), score 85
  http://arxiv.org/abs/2406.08467v1
  DafnyBench measures LLM-generated hints that make Dafny verify 750 programs; a direct benchmark template for evaluating LLM proof generation in Verus.
- OSVBench: Benchmarking LLMs on Specification Generation Tasks for Operating System Verification (2025), score 85
  https://doi.org/10.48550/arxiv.2504.20964
  benchmark of LLM-generated formal specifications for OS kernel verification from long-context code; directly measures LLM spec writing for systems verification
- MshBench: A Cross-Language Dataset for Evaluating LLM-Generated Separation Logic Specifications (2026), score 82
  https://doi.org/10.5281/zenodo.20443732
  benchmark of LLM-written VeriFast separation-logic specs in C, Java, Rust; shows ownership and framing mistakes dominate failures
- From Informal to Formal -- Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs (2025), score 80
  https://doi.org/10.48550/arxiv.2501.16207
  benchmarks LLMs writing proofs and specs across Coq, Lean, Dafny, ACSL, TLA+ with fine-tuned models; directly informs Verus spec and proof generation
- From Informal to Formal – Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs (2025), score 80
  https://doi.org/10.32388/mlaotg
  duplicate of record 283: LLM spec and proof writing across five verification languages, fine-tuning gains
- Proving the Coding Interview: A Benchmark for Formally Verified Code Generation (2025), score 80
  https://doi.org/10.1109/llm4code66737.2025.00014
  Lean 4 benchmark where LLMs must prove sorry-marked correctness theorems for generated code; benchmark design transfers to a Verus verified-code benchmark
- Neural Theorem Proving for Verification Conditions: A Real-World Benchmark (2026), score 75
  http://arxiv.org/abs/2601.18944v2
  benchmark of verification conditions from Linux and Contiki proved by LLMs in Isabelle, Lean and Rocq; shows LLM VC proving gap and reusable eval data
- CASP: An Evaluation Dataset for Formal Verification of C Code (2025), score 75
  https://doi.org/10.1007/978-3-032-07132-3_5
  Curated dataset of 506 Frama-C-verified C and ACSL spec pairs, a usable training and benchmark resource analogous to Verus datasets
- CLEVER: A Curated Benchmark for Formally Verified Code Generation (2025), score 75
  https://www.semanticscholar.org/paper/1b6d9b4899d196be6bd9d244ec6fbcfadfb4aee9
  curated lean benchmark of 161 verified code generation tasks that avoids leaked specs and vacuous solutions, a benchmark design vl can reuse for verus
- s2n-bignum-bench: A practical benchmark for evaluating low-level code reasoning of LLMs (2026), score 72
  https://www.semanticscholar.org/paper/5f4c2b5785a0a469fc6ed2e0c4a1b4e541bc9cd8
  benchmark for LLM proof synthesis on verified cryptographic assembly in HOL Light; a direct testbed for LLM proofs on industrial low-level code
- Vero: Can AI Agents Build Formally Verified Software Repositories? (2026), score 70
  https://doi.org/10.48550/arxiv.2608.13522
  Vero: repository-level benchmark for joint implementation and proof by agents, with Lean and Verus among languages; strongest agent solves 27 of 43.
- VeriSoftBench: Repository-Scale Formal Verification Benchmarks for Lean (2026), score 70
  https://doi.org/10.48550/arxiv.2602.18307
  Repository-scale proof benchmark shows dependency-closure-restricted context beats full-repo context, a transferable idea for Verus proof search over large crates
- CrypFormBench: Benchmarking Formal Analysis Capability of Large Language Models for Cryptographic Schemes (2026), score 68
  https://doi.org/10.1145/3808184
  benchmark of llms writing and repairing formal crypto models across seven verifier languages; benchmark design transferable to verus evaluation
- VeriBench: An End-to-End Formal Verification Benchmark for AI Coding Agents in Lean 4 (None), score 62
  https://www.semanticscholar.org/paper/f0a3410eb24f296bb5f9f35e24c2f5ce7a6d0580
  Lean 4 benchmark for AI coding agents doing end-to-end verification; title alone shows direct agent-verification benchmark design, though Lean not Verus, no abstract
  (title only, no abstract)
- HierSVA: A Data Synthesis Pipeline, Dataset, and Benchmark for LLM-Driven Hierarchical Hardware Formal Verification (2026), score 62
  https://www.semanticscholar.org/paper/1305adf36513350463d5b58f83078af0d30ab6e8
  benchmark scores LLM-written assertions on proof success, vacuity and faithfulness, metrics that could judge LLM-written Verus specifications
- ACSLBench: A Verified C/ACSL Corpus and Benchmark with Compositional Call Chains for Formal Specification Synthesis (2026), score 60
  https://www.semanticscholar.org/paper/6eaa9316c2d964770497bba1e24258a52a73afd4
  C/ACSL spec-synthesis corpus built by translating verified Rust/Verus seeds into C, with a function-call composition benchmark.
- Enhancing Formal Theorem Proving: A Comprehensive Dataset for Training AI Models on Coq Code (2024), score 60
  https://doi.org/10.48550/arxiv.2403.12627
  a Coq source dataset for training LLMs on propositions and proofs; training data idea for Verus models
- A benchmark for C program verification (2019), score 60
  http://arxiv.org/abs/1904.01009v1
  benchmark of 25 C programs with a scoring formula for comparing C verifiers; template for a Verus benchmark with a comparable scoring scheme
- Mining the Archive of Formal Proofs (2015), score 60
  https://doi.org/10.1007/978-3-319-20615-8_1
  mines the Archive of Formal Proofs, title only; proof corpus analysis informs training data and proof-automation work for Verus
  (title only, no abstract)

### Other verification methods (1)

- SV-LIB 1.0: A Standard Exchange Format for Software-Verification Tasks (2025), score 60
  http://arxiv.org/abs/2511.21509v1
  SV-LIB exchange format with SMT-LIB and witnesses lets Rust verifiers share tasks and validate witnesses

## Competing products (5)

### Specification synthesis (1)

- Copper: Unifying Correctness and Performance Specification in Code Generation (2026), score 75
  https://www.semanticscholar.org/paper/554956d1d0d64da37a92274ca56753b721dc7703
  combines AI code synthesis with formal verification and performance profiling to produce provably correct, efficient code; direct competitor pattern for VL's verified generation

### Proof agents, search and training (1)

- Saarthi: The First AI Formal Verification Engineer (2025), score 60
  http://arxiv.org/abs/2502.16662v2
  agentic LLM system that does end-to-end formal verification of RTL; its agent loop design transfers to a Verus proof agent in VL

### Benchmarks, evaluations and surveys (1)

- Systems Correctness Practices at Amazon Web Services (2025), score 75
  https://doi.org/10.1145/3729175
  AWS industry practice using formal and semi-formal methods; direct evidence of what leading firms already do, benchmark for VL positioning.

### System case studies (1)

- An AI Approach to Verified Production Cryptographic Libraries (2026), score 98
  http://arxiv.org/abs/2608.00965v1
  AI system writes Verus proofs for curve25519-dalek and RustCrypto chacha20 with mechanical anti-weakening gates; direct competitor to VL in verified production crypto

### Other verification methods (1)

- Ethics by Design in Smart Environments: A Formally Verified Sidecar for Deterministic Legal Compliance in Public Transit (2026), score 65
  https://doi.org/10.52731/liir.v007.573
  intercepts LLM-generated code and checks information flow with Z3 on its control flow graph, a verification gate for LLM output like VL needs

## Other transferable techniques (171)

### Proof repair from verifier feedback (2)

- A Framework for Debugging Automated Program Verification Proofs via Proof Actions (2024), score 85
  https://doi.org/10.1007/978-3-031-65627-9_17
  proof-action framework that explains SMT proof failures to developers and suggests fixes, directly transferable to Verus failure diagnostics and proof repair
- Automatic Error Localization for Software using Deductive Verification (2014), score 60
  http://arxiv.org/abs/1409.4637v1
  uses deductive verifier failures in Frama-C to localize code edits that satisfy pre and postconditions, transferable to diagnosing Verus proof failures

### Invariant and annotation inference (10)

- Interactive Safety Verification of Distributed Protocols by Inductive Proof Decomposition (2024), score 85
  http://arxiv.org/abs/2404.18048v2
  human-guided inductive invariant decomposition with induction counterexamples, verifies Raft safety; directly transferable to Verus distributed-protocol proofs and proof automation
- Compositional Safety Verification with Max-SMT (2015), score 72
  http://arxiv.org/abs/1507.03851v3
  compositional safety proofs via Max-SMT-synthesized conditional invariants; bottom-up method transferable to Verus modular proofs
- Formal Verification of Parameterized Systems based on Induction (2025), score 65
  http://arxiv.org/abs/2503.18030v1
  induction-based parameterized verifier that synthesizes auxiliary invariants with mixed quantifiers; invariant generation idea transferable to proof automation for Verus
- Safety Verification of Declarative Smart Contracts (2022), score 65
  http://arxiv.org/abs/2211.14585v3
  safety verification of declarative smart contracts that infers inductive invariants from heuristic patterns without annotations, a transferable invariant-inference idea for Verus smart contract work
- Interpolant Tree Automata and their Application in Horn Clause Verification (2016), score 60
  http://arxiv.org/abs/1601.06521v2
  combines interpolant tree automata generalization with polyhedra abstract interpretation in Horn clause refinement, a transferable CEGAR technique for auto verifiers
- Reducing the Number of Annotations in a Verification-oriented Imperative Language (2010), score 60
  http://arxiv.org/abs/1011.3407v1
  verification-oriented language with high-level iteration constructs that cut loop-annotation burden, directly relevant to lowering Verus invariant overhead
- Optimization of Lyapunov Invariants in Verification of Software Systems (2011), score 60
  http://arxiv.org/abs/1108.0170v1
  Lyapunov-style invariants found by convex optimization certify overflow, division-by-zero and termination; invariant synthesis transfers to Verus numeric proofs
- Optimization of Lyapunov Invariants in Verification of Software Systems (Extended Version) (2011), score 60
  http://arxiv.org/abs/1108.5622v1
  extended version of Lyapunov invariant synthesis for numeric software; same convex-optimization certificate idea for Verus invariant search
- Relational Verification via Invariant-Guided Synchronization (2019), score 60
  http://arxiv.org/abs/1907.03997v1
  synthesizes relational invariants while searching synchronization points for equivalence proofs, applicable to proving Verus code versions equivalent
- Verification of Programs by Combining Iterated Specialization with Interpolation (2014), score 60
  http://arxiv.org/abs/1412.1151v1
  combines iterated specialization and interpolating Horn clause solving to verify programs; Horn-clause invariant discovery transfers to Verus invariant generation.

### Specification synthesis (4)

- Predicate Subtypes in VerCors (2026), score 75
  https://doi.org/10.4204/eptcs.444.6
  adds predicate subtypes to VerCors with auto-generated specs and strict overflow checking; range-type idea transfers to Verus refinement-style specs
- Practical Range Refinement Types with Inference (2026), score 74
  https://doi.org/10.48550/arxiv.2607.00824
  bidirectional inference of integer range refinement types cuts annotation burden, a transferable idea for lowering Verus spec overhead
- On Integrating Deductive Synthesis and Verification Systems (2013), score 72
  http://arxiv.org/abs/1304.5661v1
  counterexample-guided synthesis of recursive functional programs inside an interactive verifier; transferable to spec-driven generation of verified Rust
- Bottom-up synthesis of recursive functional programs using angelic execution (2021), score 60
  https://www.semanticscholar.org/paper/039cfa6ec008c6b7c9eaaf1efe3adab6325dfa2b
  synthesizes recursive functional programs from logical specs via angelic execution and spec strengthening, transferable to generating recursive code that meets Verus specs

### Specification testing and failure explanation (8)

- Escaping the Quicksand: A Call to Arms (2026), score 80
  https://doi.org/10.48550/arxiv.2608.19674
  argues for executable partial specs plus proof alongside testing so AI and humans get cheap-to-expensive feedback loops, matching the VL thesis
- F-IDEs with Features and VCs Designed to Assist Human Reasoning When Verification Fails (2021), score 80
  http://arxiv.org/abs/2111.08207v1
  IDE features and alternative VC generation that help humans reason when verification fails, directly relevant to Verus failure UX
- Contribution to software verification combining tests and proofs (2015), score 72
  https://openalex.org/W4392279178
  diagnoses deductive proof failures by generating tests on instrumented C code, transferable to explaining Verus proof failures
- Error Localization, Certificates, and Hints for Probabilistic Program Verification via Slicing (Extended Version) (2025), score 66
  https://doi.org/10.48550/arxiv.2512.20214
  slicing for error localization, proof simplification and verification hints in the Caesar deductive verifier; directly transferable to diagnosing failed Verus proofs
- Fulminate: Testing CN Separation-Logic Specifications in C (2025), score 65
  https://doi.org/10.1145/3704879
  runtime checks of separation-logic pre/post specs for C, tested on a production hypervisor allocator; a way to test the specs Verus users write
- A user study for evaluation of formal verification results and their explanation at Bosch (2023), score 62
  https://doi.org/10.1007/s10664-023-10353-4
  user study showing engineers grasp counterexample explanations better than raw model checker output, guidance for how VL should present Verus failures
- Why does it fail? Explanation of verification failures (2026), score 60
  http://arxiv.org/abs/2603.21788v1
  Explains SAT counterexamples of failed verification conditions in domain terms via predicate relevance; transfers to explaining Verus verification failures
- Debugging Program Verification Proof Scripts (Tool Paper) (2018), score 60
  http://arxiv.org/abs/1804.04402v1
  offline replay debugger for failing proof scripts in the KeY deductive verifier; proof-debugging tooling directly relevant to diagnosing Verus proof failures

### Proof agents, search and training (4)

- Synthesizing Proofs Using Proof Sharding and Exploration (2026), score 85
  https://doi.org/10.48550/arxiv.2609.28535
  shards verification tasks and searches proof annotations to complete distributed-system proofs automatically, directly applicable to proof search for Verus
- Ideas for a high-level proof strategy language (2010), score 65
  https://doi.org/10.25405/ncl.34130643
  learns a high-level proof strategy from one manual proof to auto-discharge similar proof obligations, a proof-automation idea for repetitive Verus proofs
- Deep Network Guided Proof Search (2018), score 65
  https://doi.org/10.29007/8mwc
  deep networks pick processed clauses to guide the E prover, a transferable idea for learned guidance of proof search
- Leroy and Blazy Were Right: Their Memory Model Soundness Proof is Automatable (2023), score 60
  https://doi.org/10.1007/978-3-031-25803-9_2
  automates Leroy and Blazy memory-model soundness proof in a verified compiler setting; proof automation directly informs Verus proof work
  (title only, no abstract)

### Ghost state, permissions and ownership logic (31)

- CN: Verifying Systems C Code with Separation-Logic Refinement Types (2023), score 85
  https://doi.org/10.1145/3571194
  separation-logic refinement types with decidable automation verify c hypervisor code including pkvm; transferable to verus proof automation design
- Sound State Encodings in Translational Separation Logic Verifiers (Extended Version) (2026), score 85
  https://openalex.org/W7140238387
  Isabelle-mechanized soundness of translational separation logic verifiers across Raven, VeriFast, Viper state encodings, directly relevant to Verus encoding correctness
- Recursive Data Structures in SPARK (2020), score 80
  https://doi.org/10.1007/978-3-030-53291-8_11
  spark pointer support with rust-style move ownership and local borrowing encoded as first-order pledges, directly transferable to verus-style aliasing reasoning
- QCP: A Practical Separation Logic-based C Program Verification Tool (2025), score 80
  http://arxiv.org/abs/2505.12878v3
  separation-logic C verifier mixing symbolic execution, an entailment solver and Rocq fallback, transferable to Verus proof-obligation splitting
- Linear types for large-scale systems verification (2022), score 80
  https://doi.org/10.1145/3527313
  linear types cut SMT heap-reasoning in Dafny, cutting proof size and verification time on a storage system, directly relevant to ownership-based verification in Rust
- Sound Automation of Magic Wands (2022), score 80
  https://doi.org/10.1007/978-3-031-13188-2_7
  sound wand packaging algorithm for separation logic in Viper, directly transferable to automating separation-logic proofs in Verus
- Gobra: Modular Specification and Verification of Go Programs (2021), score 78
  https://doi.org/10.1007/978-3-030-81685-8_17
  modular deductive verifier for go using separation logic over viper and smt; direct analogue for verifying systems code in verus
- Gobra: Modular Specification and Verification of Go Programs (extended version) (2021), score 78
  http://arxiv.org/abs/2105.13840v1
  extended version of gobra: separation-logic verifier for go over viper and smt; direct analogue for verifying concurrent systems code
- SecRef*: Securely Sharing Mutable References between Verified and Unverified Code in F* (2025), score 75
  https://doi.org/10.1145/3747522
  f* monotonic state and higher-order contracts to guard verified code calling unverified code, a verified-unverified interop technique applicable to vl trust boundaries
- Ownership Refinement Types for Pointer Arithmetic and Nested Arrays (2026), score 75
  https://openalex.org/W7157506019
  ownership-indexed refinement types for pointer arithmetic and nested arrays with soundness proof and verifier, directly transferable to ownership and array reasoning in Verus
- Gradually Verifying Unfolding Expressions & Pure Functions (2026), score 75
  https://doi.org/10.48550/arxiv.2607.15383
  semantics and soundness proof for unfolding expressions and pure functions in implicit dynamic frames, the ownership-spec machinery used by Gobra and Viper; directly transferable to Verus-style heap and ownership reasoning
- Modular Verification of Heap Reachability Properties in Separation Logic (2019), score 75
  http://arxiv.org/abs/1908.05799v1
  modular reachability specs in separation logic encoded into Viper, showing SMT-friendly heap reasoning that Verus ownership proofs could reuse
- Ghost Code in Action: Automated Verification of a Symbolic Interpreter (2020), score 75
  https://doi.org/10.1007/978-3-030-41600-3_8
  uses ghost code for automated verification of a symbolic interpreter; directly transferable to ghost-state proofs in Verus
  (title only, no abstract)
- VeriFast's separation logic: a logic without laters for modular verification of fine-grained concurrent programs. (2026), score 72
  https://doi.org/10.5381/jot.2026.25.1.a4
  soundness proof of VeriFast's higher-order ghost logic for fine-grained concurrency without laters; direct deductive verification technique for Rust-adjacent tools
- FO-Complete Program Verification for Heap Logics (2026), score 72
  http://arxiv.org/abs/2601.06719v1
  frame and separation logic with SMT quantifier instantiation gives FO-complete heap verification, transferable to Verus heap and ownership reasoning
- Principles for Verification Tools: Separation Logic (2014), score 72
  http://arxiv.org/abs/1410.4439v1
  derives separation logic verification conditions by equational reasoning in a quantale and proves the tool correct by construction in Isabelle, a design method for building verifiers that transfers to Verus-style separation logic
- Modular Reasoning about Global Variables and Their Initialization (2025), score 72
  https://doi.org/10.1145/3763133
  separation logic module invariants for global state and initialization, transferable to Rust statics and ownership reasoning in Verus
- The VerCors Verifier: A Progress Report (2024), score 70
  https://doi.org/10.1007/978-3-031-65630-9_1
  VerCors deductive verifier for concurrent programs using permission-based separation logic via Viper backend; transferable verifier-architecture and case-study lessons
- Fractional resources in unbounded separation logic (2022), score 70
  https://doi.org/10.1145/3563326
  fractional permission semantics that keep distributivity and combinability for separation logic; ownership reasoning foundations behind verus-style tools
- Modal Verification Patterns for Systems Software (2025), score 70
  http://arxiv.org/abs/2506.01719v3
  argues modal logic should specify and verify low-level systems code via resource contexts; ownership-style modalities are directly transferable to Verus
- Verification of the HARPO language (2014), score 68
  https://openalex.org/W128837028
  implicit dynamic frames with fractional permissions for data-race freedom, translated to Boogie, closely matching Verus ownership and permission reasoning
- Zoo: A Framework for the Verification of Concurrent OCaml 5 Programs using Separation Logic (2026), score 65
  https://doi.org/10.1145/3776701
  Iris separation logic for concurrent OCaml 5 via a Rocq deep embedding; a template for verifying concurrent code in another language
- Semi-Automated Modular Formal Verification of Critical Software: Liveness and Completeness Thresholds (2024), score 65
  https://doi.org/10.48550/arxiv.2403.00934
  Separation logic for termination of busy-waiting under fair scheduling plus completeness thresholds reducing unbounded memory proofs to bounded ones, transferable verification theory
- Formal Semantics and Program Logics for a Fragment of OCaml (2025), score 65
  https://doi.org/10.1145/3747509
  Iris-based separation logic plus stateless Hoare logic for an OCaml fragment with effect handlers; transferable to reasoning about Rust ownership in Verus-style proofs.
- Generically Automating Separation Logic by Functors, Homomorphisms, and Modules (2025), score 65
  https://doi.org/10.1145/3704903
  algebraic theory for automating separation logic in Isabelle with functors and modules, instantiated compositionally for data structures; SL automation transferable to Verus heap proofs
- VIP: verifying real-world C idioms with integer-pointer casts (2022), score 65
  https://doi.org/10.1145/3498681
  RefinedC-VIP automates verification of real C idioms with Coq foundational proofs, a separation-logic verifier close to Verus goals
- Le chameau et le serpent rentrent dans un bar : vérification quasi-automatique de code OCaml en logique de séparation (2024), score 65
  https://doi.org/10.48550/arxiv.2412.14894
  translates Gospel-specified OCaml into Viper separation logic, a model for routing Rust-style specs into an SL backend
- Temporary Read-Only Permissions for Separation Logic (2017), score 62
  https://doi.org/10.1007/978-3-662-54434-1_10
  temporary read-only permissions in separation logic, relevant to shared-borrow reasoning like Rust reads; no abstract so judged by title
  (title only, no abstract)
- Beyond Backtracking: Connections in Fine-Grained Concurrent Separation Logic (2023), score 60
  https://doi.org/10.1145/3591275
  connection calculus for disjunctions in concurrent separation logic proof automation; informs Verus invariant search
- Interactive proofs in higher-order concurrent separation logic (2017), score 60
  https://doi.org/10.1145/3093333.3009855
  Iris proof mode in Coq with named contexts for separation logic; proof-engineering ergonomics for verified systems
- Later credits: resourceful reasoning for the later modality (2022), score 60
  https://www.semanticscholar.org/paper/fcd7ffb8f7d05187877390ad9ea4ac48ef6eb24b
  Later credits as ownable resources in Iris, separation logic technique used for Rust semantic models

### Refinement proofs and refinement types (7)

- A Refinement Methodology for Distributed Programs in Rust (2025), score 70
  https://doi.org/10.1145/3763119
  bottom-up refinement with locally inductive invariants as a Rust library using guards and ownership; a proof-structure technique for Verus-style systems code
- Refinement Proofs in Rust Using Ghost Locks (2023), score 65
  http://arxiv.org/abs/2311.14452v1
  Refinement technique for Rust using ghost locks in a state-of-the-art verifier, supporting safety and liveness on case studies.
- Type Safety via Hoare Logic with Separation and Pure Types (2026), score 65
  https://doi.org/10.48550/arxiv.2607.25262
  Hoare logic with separation types unifies GADTs and liquid types, Lean-proved, no SMT oracle in the trusted base
- Combining Axiomatic Models for Refinement Proofs (2026), score 65
  https://doi.org/10.48550/arxiv.2606.27916
  unifies hoare, incorrectness and necessary-precondition logics across refinement simulations; logic foundations for verus refinement proofs
- Encode the ∀∃ Relational Hoare Logic into Standard Hoare Logic (2025), score 60
  https://doi.org/10.1145/3763138
  reduces forall-exists relational Hoare logic to unary Hoare logic so standard verifiers can prove refinement; directly applicable to refinement proofs in Verus
- Focusing on Refinement Typing (2023), score 60
  https://doi.org/10.1145/3610408
  bidirectional refinement typing that yields SMT constraints with no unification variables, with proven soundness and decidability; a design lesson for SMT-backed verification
- Regression verification of unbalanced recursive functions with multiple calls (long version) (2022), score 60
  http://arxiv.org/abs/2207.14364v1
  regression verification of recursive functions with multiple calls by bottom-up abstraction with uninterpreted functions, directly useful for proving refactored Rust code equivalent in Verus

### SMT engineering and proof stability (17)

- Accelerating Automated Program Verifiers by Automatic Proof Localization (2025), score 88
  https://www.semanticscholar.org/paper/430364be4fdb90648dd939ff8839e171a2385049
  localizes SMT axioms per assertion to cut quantifier instantiation in Verus, Dafny and Viper; directly speeds Verus verification and proof search
- grind: An SMT-Inspired Tactic for Lean 4 (Short Paper – System Description) (2026), score 78
  https://doi.org/10.1007/978-3-032-32589-1_7
  native SMT-style tactic in Lean with congruence closure and E-matching producing kernel-checked proofs, E-matching and instantiation control transfer to Verus SMT automation
- Predictable Verification using Intrinsic Definitions (2024), score 75
  https://doi.org/10.1145/3656450
  intrinsic definitions with ghost monadic maps reduce data-structure proofs to decidable logics; predictable SMT verification method relevant to Verus proof design
- Foundational Constraint Solving for Expressive Refinement Typing (2026), score 72
  https://doi.org/10.48550/arxiv.2607.12226
  Lean-based CHC solver shrinking the trusted base to the kernel; could answer Verus critics on SMT solver trust
- Quantifying SMT Solver Instability for Formal Verification (2026), score 72
  http://arxiv.org/abs/2610.12649v1
  measures SMT solver runtime instability from semantically equivalent query permutations, directly informs Verus solver-timeout and proof-stability engineering
- Proof automation and type synthesis for set theory in the context of TLA+. (Automatisation de preuves et synthèse de types pour la théorie des ensembles dans le contexte de TLA+) (2014), score 72
  https://www.semanticscholar.org/paper/23972e14592384336489e18adf3d79484dd7eb5f
  translates TLA+ proof obligations to external SMT and ATP provers via TPTP and SMT-LIB, a proof-automation bridge transferable to Verus SMT use
- Graph Based Reduction of Program Verification Conditions (2009), score 70
  http://arxiv.org/abs/0907.1357v1
  selects relevant hypotheses for verification conditions via syntactic analysis and graph traversal, shrinking SMT queries on industrial C; directly transferable to Verus solver performance
- TensorRight: Automated Verification of Tensor Graph Rewrites (2025), score 70
  http://arxiv.org/abs/2511.17838v1
  SMT proofs that tensor rewrites are sound for all ranks via a bounded-rank reduction; a transferable unbounded-verification technique
- Scalable Deductive Verification of Data-Level Parallel Programs (2026), score 70
  http://arxiv.org/abs/2605.13616v1
  quantifier rewriting for SMT triggers and non-alias array specs cut GPU kernel verification time 9x, directly transferable to Verus trigger and array tuning
- Overapproximation of Non-Linear Integer Arithmetic for Smart Contract Verification (2024), score 68
  http://arxiv.org/abs/2402.10174v1
  overapproximates nonlinear integer arithmetic in SMT encodings used by the industrial Certora prover, applicable to Verus arithmetic encoding and solver speed
- A Program Instrumentation Framework for Automatic Verification (2024), score 68
  http://arxiv.org/abs/2412.06431v1
  program instrumentation rewrites quantifier and aggregation constructs so weaker back-end solvers can verify arrays, transferable for encoding hard specs to SMT
- Interactive Bitvector Reasoning using Verified Bit-Blasting (2025), score 65
  https://doi.org/10.1145/3763167
  end-to-end verified bit-blaster for bitvector reasoning in lean, relevant to how smt bitvector queries behind verus can be trusted
- Partial Automation of Verification Condition Proving for Reflex Programs (Draft) (2026), score 65
  http://arxiv.org/abs/2606.23377v1
  partially automates verification condition proving for a process-control language via deductive verification, close to the proof automation pipeline Verus needs
- Efficient verification of imperative programs using auto2 (2016), score 65
  http://arxiv.org/abs/1610.06996v3
  auto2 prover in Isabelle verifies imperative data structures via functional refinement and separation logic; proof automation for heap programs transferable to Verus
- Different Maps for Different Uses. A Program Transformation for Intermediate Verification Languages (2019), score 65
  http://arxiv.org/abs/1901.01915v1
  program transformation that cuts SMT case splits by splitting map variables, directly applicable to reducing solver load in Verus encodings
- Automatic Program Instrumentation for Automatic Verification (Extended Technical Report) (2023), score 65
  http://arxiv.org/abs/2306.00004v1
  instruments programs to replace quantifier and aggregation constructs before SMT solving, a technique directly usable to ease Verus SMT proofs
- An Effective SMT Engine for Formal Verification (2009), score 60
  https://doi.org/10.15168/11572_368265
  MathSAT SMT solver with unsat cores and Craig interpolants driving software model checking; SMT background for Verus solver-level reasoning

### Rust semantics and unsafe code (3)

- Borrowing Safe Pointers from Rust in SPARK (2018), score 65
  http://arxiv.org/abs/1805.05576v1
  permission-based alias analysis borrowed from Rust borrow checker for SPARK pointers; a technique for aliasing in deductive verification of Rust-like code
- Safe Pointers in SPARK 2014 (2017), score 62
  https://www.semanticscholar.org/paper/5b354f63bf508bfa08848c3337b95ee2b749a275
  SPARK pointer extension with Rust-style borrow analysis, approved for SPARK; a design comparison point for handling aliasing in auto-active verification
- End-to-end Compositional Verification of Program Safety through Verified and Verifying Compilation (2025), score 60
  http://arxiv.org/abs/2510.10015v1
  open safety composes verified and verifying compilation for an ownership language inspired by Rust; theory for combining borrow-checking with end-to-end proof

### Concurrency and weak memory (15)

- Raven: An SMT-Based Concurrency Verifier (2025), score 85
  https://doi.org/10.1007/978-3-031-98668-0_4
  SMT-based concurrency verifier restricting Iris to first-order fragment for automation, a direct template for Rust concurrency proofs
- Prophecy-Based Automated Verification of Message-Passing Programs (2026), score 80
  http://arxiv.org/abs/2606.28066v1
  prophecy-based CHC encoding of channel programs extends RustHorn with a sound and complete reduction, a technique transferable to Verus channel reasoning
- Leaf: Modularity for Temporary Sharing in Separation Logic (2023), score 68
  https://doi.org/10.1145/3622798
  guarding operator in iris for temporarily shared state, verifying a reader-writer lock and hash table; sharing abstraction transferable to verus concurrency proofs
- Leaf: Modularity for Temporary Sharing in Separation Logic (Extended Version) (2023), score 68
  https://doi.org/10.48550/arxiv.2309.04851
  extended version of leaf: guarding in iris for temporary sharing, with reader-writer lock and hash table case study; transferable to verus concurrency
- Deductive techniques for model-based concurrency verification (2019), score 65
  https://doi.org/10.3990/1.9789036548984
  Deductive verification of parallel NDFS and process-algebra abstraction in VerCors with CSL; separation-logic verification technique relevant to Verus concurrency
- A flexible specification approach for verifying total correctness of fine-grained concurrent modules (2023), score 65
  https://doi.org/10.48550/arxiv.2312.15379
  obligation-passing specs for total correctness of fine-grained locks in separation logic, checked in VeriFast; concurrency progress reasoning for Verus locks
- DissProve: Automated Verification of Asynchronous Distributed Protocols with Affine Communication (2026), score 65
  http://arxiv.org/abs/2606.24003v2
  automated safety proofs for asynchronous distributed protocols via backward unreachability and affine classes, transferable to verifying Rust distributed systems
- Structural Temporal Logic for Mechanized Program Verification (2024), score 60
  http://arxiv.org/abs/2410.14906v7
  Ticl structural temporal logic gives compositional liveness proofs for scheduling and consensus programs in a proof assistant, a proof-structure idea for verified systems
- Formal verification of a concurrent bounded queue in a weak memory model (2021), score 60
  https://doi.org/10.1145/3473571
  Cosmo concurrent separation logic with views to verify a weak-memory MPMC queue; modular concurrent reasoning technique relevant to Verus concurrency proofs.
- Asynchronous Liquid Separation Types (2015), score 60
  https://doi.org/10.4230/lipics.ecoop.2015.396
  refinement types with concurrent separation logic and ownership transfer prove race freedom; transferable to verus concurrency reasoning
- Automated Verification of CountDownLatch (2019), score 60
  http://arxiv.org/abs/1908.09758v1
  separation-logic verifier for java CountDownLatch with waits-for deadlock check; technique transferable to verus concurrency and deadlock reasoning
- Automating Deductive Verification for Weak-Memory Programs (2017), score 60
  http://arxiv.org/abs/1703.06368v2
  encodes weak-memory separation logics into the Viper verifier, with novel encoding tricks that automate proofs; encoding techniques transfer to automating Verus-style logics
- Diaframe: automated verification of fine-grained concurrent programs in Iris (2022), score 60
  https://doi.org/10.1145/3519939.3523432
  automates separation-logic proofs for fine-grained concurrency via proof search in Iris, transferable to automation for concurrent Rust
- RacerD: compositional static race detection (2018), score 60
  https://doi.org/10.1145/3276514
  compositional static race detector deployed in CI at Facebook with high-confidence reporting, a practical model for concurrency checks in VL
- Specification and verification of GPGPU programs (2014), score 60
  https://doi.org/10.1016/j.scico.2014.03.013
  specification and verification of GPGPU kernels, a verifier-for-parallel-code topic that transfers to verifying Rust GPU or concurrent code
  (title only, no abstract)

### Verified code translation (2)

- Towards Trustworthy Automated Program Verifiers: Formally Validating Translations into an Intermediate Verification Language (extended version) (2024), score 70
  https://doi.org/10.48550/arxiv.2404.03614
  generates per-run Isabelle proofs that a front-end translation to an IVL is sound, a trust technique applicable to checking Verus translation to SMT
- Verifying Whiley Programs with Boogie (2022), score 66
  https://doi.org/10.1007/s10817-022-09619-1
  translates Whiley rich type system into Boogie, shows impedance-mismatch lessons applicable to Rust-to-SMT encodings in Verus

### Benchmarks, evaluations and surveys (11)

- QED at Large: A Survey of Engineering of Formally Verified Software (2019), score 88
  https://doi.org/10.1561/2500000045
  survey of proof engineering for verified software covering proof automation, organization and maintenance; directly applicable to Verus proof workflows
- Toward Practical Deductive Verification: Insights from a Qualitative Survey in Industry and Academia (2025), score 88
  http://arxiv.org/abs/2510.20514v2
  Interview study of 30 practitioners on deductive verification barriers: proof maintenance, automation control, usability; directly informs VL adoption risks.
- What's in a Proof? Analyzing Expert Proof-Writing Processes in F* and Verus (2025), score 80
  http://arxiv.org/abs/2508.02733v1
  User study of expert proof-writing telemetry in F* and Verus, with design guidance for AI proof assistants and an F* proof agent.
- Usability of AutoProof: a case study of software verification (2016), score 80
  http://arxiv.org/abs/1605.01663v1
  AutoProof case study on Tokeneer shows auto-active verifier usability and about two-thirds VC auto-discharge; direct usability benchmark comparable to Verus.
- Deductive Software Verification: From Pen-and-Paper Proofs to Industrial Tools (2019), score 70
  https://doi.org/10.1007/978-3-319-91908-9_18
  survey of deductive verification from pen-and-paper proofs to industrial tools, title only; a background map for Verus positioning
  (title only, no abstract)
- Formal Proofs of Tarjan’s Strongly Connected Components Algorithm in Why3, Coq and Isabelle (2019), score 65
  https://doi.org/10.4230/lipics.itp.2019.13
  same Tarjan SCC algorithm proved correct in Why3, Coq, and Isabelle, a head-to-head of deductive verifiers on a graph algorithm
- Usability Barriers for Liquid Types (2025), score 62
  https://doi.org/10.1145/3729327
  developer study of nine barriers to liquid types, directly reusable lessons for Verus usability and adoption
- Understanding the Usability of Cryptographic Verification Tools (2026), score 62
  http://arxiv.org/abs/2609.16323v1
  user study of Tamarin and ProVerif users shows proof-debugging pain points; directly informs usability design for VL verification tooling.
- Review of Recent Heap Specification and Verification Techniques (2019), score 60
  http://arxiv.org/abs/1910.10176v2
  review of heap specification and verification methods including separation logic and proof automation gaps, background for heap reasoning in Verus
- Developments in Formal Proofs (2014), score 60
  https://doi.org/10.48550/arxiv.1408.6474
  surveys HOL Light reliability, Coq Feit-Thompson proof, and proof-assistant automation, a broad background on large verified developments
- The past, present, and future(s): verifying temporal software properties (2018), score 60
  https://www.semanticscholar.org/paper/4e9237855902fcf87bd4c39c4db0e668ba0b7f46
  Title-only survey of verifying temporal software properties; clearly on-topic background on property verification history.
  (title only, no abstract)

### Other verification methods (57)

- Fifteen Years of Viper (2025), score 80
  https://doi.org/10.1007/978-3-031-98668-0_5
  Retrospective on Viper, the separation-logic verification infrastructure used as backend by Rust verifiers, with lessons on evolving verifier design
- OpenJML: Software verification for Java 7 using JML, OpenJDK, and Eclipse (2014), score 80
  http://arxiv.org/abs/1404.6608v1
  JML-based Java verifier integrated into IDE and used in courses; IDE integration and teaching adoption transfer to Verus tooling
- Practical Deductive Verification of OCaml Programs (Extended Version) (2024), score 80
  http://arxiv.org/abs/2404.17901v2
  hands-on deductive verification of OCaml with GOSPEL specs and Cameleer; mostly-automated verification tutorial close to Verus-style workflows
- The Design and Algorithms of a Verification Condition Generator (2012), score 80
  http://arxiv.org/abs/1204.6719v1
  Design of Boogie-based verification condition generator, passive form, incremental verification; directly relevant to Dafny/Verus-style VC pipelines.
- Towards a Deductive Verification Infrastructure for Weighted Programming (2026), score 78
  http://arxiv.org/abs/2608.18971v1
  Deductive verifier for weighted programs in an intermediate language with quantifier elimination, prototyped in Caesar; transferable to VC and automation design.
- Formal Verification of Large Software Systems (2010), score 75
  https://openalex.org/W2185774137
  scales proofs of large systems by synthesizing an abstract spec and proving one lemma per element; directly transferable to structuring Verus proofs of big codebases
- Verification Algorithms for Automated Separation Logic Verifiers (2024), score 75
  https://doi.org/10.1007/978-3-031-65627-9_18
  compares symbolic execution and VC generation algorithms for separation-logic verifiers on Viper, guidance for choosing a verification strategy applicable to Verus
- A machine checked soundness proof for an intermediate verification language: extended version (2008), score 75
  https://openalex.org/W224221139
  machine-checked soundness of an intermediate verification language and its VC generation, the design basis of Dafny and Boogie-style verifiers
- Coma , an Intermediate Verification Language with Explicit Abstraction Barriers (2025), score 75
  https://doi.org/10.1007/978-3-031-91121-7_8
  intermediate verification language with abstraction barriers inside functions and a proved VC generator, a design idea for modular specs
- Formally Validating a Practical Verification Condition Generator (2021), score 75
  https://doi.org/10.1007/978-3-030-81688-9_33
  validates Boogie verifier runs by producing Isabelle certificates for its VC generation phases, a checker for the verifier pipeline Verus-like tools share
- Formally Validating a Practical Verification Condition Generator (extended version) (2021), score 75
  http://arxiv.org/abs/2105.14381v1
  extended version of the Boogie certificate work, same idea of checking each VC transformation phase in Isabelle against a formal Boogie semantics
- Building Deductive Program Verifiers: Lecture Notes (2019), score 75
  https://doi.org/10.3929/ethz-b-000392504
  lecture notes on building deductive verifiers through intermediate verification language translations to SMT, architecture informs Verus verifier design and spec inference
- Safety Verification and Refutation by k-invariants and k-induction (extended version) (2015), score 75
  http://arxiv.org/abs/1506.05671v2
  one algorithm unifying abstract interpretation, bounded model checking and k-induction for software verification, a transferable technique for combined invariant and counterexample search in Verus
- Sound Gradual Verification with Symbolic Execution (2023), score 75
  http://arxiv.org/abs/2311.07559v1
  gradual verification with symbolic execution and a soundness proof covering a Viper subset, a transferable auto-active verification technique for partial specs in Verus
- Static and Dynamic Verification of Relational Properties on Self-Composed C Code (2018), score 75
  http://arxiv.org/abs/1801.06876v2
  Self-composition for relational properties of C functions with side effects in a Frama-C plugin; transferable to relational specs for Verus functions.
- Towards Trace-based Deductive Verification (Tech Report) (2022), score 75
  http://arxiv.org/abs/2211.09487v2
  Trace-based logic with symbolic execution and induction for modular recursive procedure specs beyond pre/postconditions; transferable to Verus specs.
- Staged Specification Logic for Verifying Higher-Order Imperative Programs (2024), score 72
  https://doi.org/10.1007/978-3-031-71162-6_26
  Multi-stage Hoare-style specs for higher-order imperative code with automated verifier Heifer; transferable to specifying closures and higher-order Verus code.
- Formal Verification of Imperative First-Class Functions in Move (2026), score 70
  https://www.semanticscholar.org/paper/08ae822f4177388169fc248c7a3d3b52d2ea9e29
  Move Prover handles first-class imperative functions via behavioural predicates; a spec technique beyond Dafny-style verifiers
- C*: Unifying Programming and Verification in C (2025), score 70
  http://arxiv.org/abs/2504.02246v1
  Proof-integrated C with embedded proof blocks and symbolic execution, a transferable design for interactive real-time verification by programmers
- Fast and Reliable Formal Verification of Smart Contracts with the Move Prover (2022), score 70
  https://doi.org/10.1007/978-3-030-99524-9_10
  Move Prover uses alias-free memory model and fine-grained invariant checking to stay fast enough for routine developer use, close analogue to Rust ownership-based verification
- IsaBIL: A Framework for Verifying (In)correctness of Binaries in Isabelle/HOL (Extended Version) (2025), score 70
  https://www.semanticscholar.org/paper/1f9c1edc36037dab23f57a872916acfc92aa7587
  IsaBIL pairs Hoare and incorrectness logic over BAP binaries incl. Rust, with tactics auto-discharging hundreds of goals, transferable proof automation idea
- A Formalization of Core Why3 in Coq (2024), score 70
  https://doi.org/10.1145/3632902
  Coq semantics for the Why3 logic with a verified natural-deduction system and sound transformations; relates to verifier-backend trust, applicable to Verus SMT encoding trust
- Formalization of a Realistic Verification-Condition Generator for an Intermediate Verification Language (2026), score 70
  https://doi.org/10.4230/lipics.itp.2026.11
  a Dafny-verified soundness proof for a verification-condition generator of an intermediate verification language; verifier internals that Verus-level tooling relies on
- Cameleer: A Deductive Verification Tool for OCaml (2021), score 70
  https://doi.org/10.1007/978-3-030-81688-9_31
  deductive verifier for OCaml that translates GOSPEL-annotated code to WhyML for Why3, close analogue to a Rust-to-Verus toolchain with behavioral specs
- Staged Specification Logic for Verifying Higher-Order Imperative Programs (Technical Report) (2023), score 70
  https://doi.org/10.48550/arxiv.2308.00988
  Technical report of Heifer staged logic; same multi-stage specification idea for higher-order imperative programs, transferable to Verus closure specs.
- solc-verify: A Modular Verifier for Solidity Smart Contracts (2020), score 70
  https://doi.org/10.1007/978-3-030-41600-3_11
  modular Solidity verifier built on Boogie, using verification-condition style like Verus-type tools; the most direct competitor-type tool for verified smart contracts.
  (title only, no abstract)
- A Machine Checked Soundness Proof for an Intermediate Verification Language (2009), score 66
  https://doi.org/10.1007/978-3-540-95891-8_51
  title only: machine-checked soundness proof of Boogie-like intermediate verification language, the IVL layer Verus-style tools build on
  (title only, no abstract)
- Verifying C++ Dynamic Binding (2023), score 65
  https://doi.org/10.1145/3605156.3606448
  separation logic with per-subobject vtable tracking for modular verification of C++ dynamic binding in VeriFast, transferable to trait-object reasoning in Verus
- Deductive Verification via the Debug Adapter Protocol (2021), score 65
  http://arxiv.org/abs/2108.02968v1
  integrates the SecC auto-active verifier's symbolic steps into Debug Adapter Protocol debugging, a usable design for stepping through Verus proof obligations in IDEs
- A verified VCGen based on dynamic logic: An exercise in meta-verification with Why3 (2023), score 65
  https://doi.org/10.1016/j.jlamp.2023.100871
  meta-verifies a verification-condition generator in Why3 via dynamic logic, a way to trust the VC generation layer that Verus-style tools rely on
  (title only, no abstract)
- Forall-Exists Relational Verification by Filtering to Forall-Forall (2025), score 65
  http://arxiv.org/abs/2509.04777v1
  auto-active verification of forall-exists properties by reducing to forall-forall on product programs; transferable to Verus relational proofs
- KestRel: Relational Verification Using E-Graphs for Program Alignment (2024), score 65
  http://arxiv.org/abs/2404.08106v2
  relational verification via e-graph program alignment and equality saturation; alignment-based intermediate programs could inform relational proofs in Verus
- Verifying Floating-Point Programs in Stainless (2026), score 65
  https://openalex.org/W7125352346
  extends Stainless with floating-point reasoning and axiomatizes math functions checked against the implementation; directly transfers to floating-point specs in Verus.
- Automated Verification of Integer Overflow (2019), score 62
  http://arxiv.org/abs/1909.09324v1
  specification mechanism and checker for integer overflow in verified programs that found 43 bugs in verified code, directly applicable to Verus arithmetic specs
- Semantics-based program verifiers for all languages (2016), score 62
  https://doi.org/10.1145/3022671.2984027
  generates a program verifier from an operational semantics via reachability logic, proving heap list and AVL tree programs, relevant to semantics-first verifier design
- A Framework for the Automated Verification of Algebraic Effects and Handlers (extended version) (2023), score 62
  http://arxiv.org/abs/2302.01265v3
  extends Cameleer deductive verifier to algebraic effects and handlers via defunctionalization, shows how to encode control-flow features for Why3-style auto-active tools
- Shard: Securing GPU Kernels with Lightweight Formal Methods (2025), score 60
  https://www.semanticscholar.org/paper/f161f32fb5fbc0092981015378cccfdfea320847
  Lightweight verification of CUDA kernels with annotations feeding Dafny and Verus backends, via a compiler extension.
- Mizzle: A Complete Concurrent Incorrectness Logic for Preventing False Alarms in Agentic Bug Finding (2026), score 60
  https://doi.org/10.48550/arxiv.2607.11611
  LLM must attach a machine-checked incorrectness proof to each bug report; uses proofs to reject false alarms, a useful pattern for LLM output checking
- Cameleer: a Deductive Verification Tool for OCaml (extended version) (2021), score 60
  http://arxiv.org/abs/2104.11050v2
  Cameleer deductive verifier for OCaml using GOSPEL specs and SMT via Why3; comparable auto-active verification design
- Formal Foundations for Translational Separation Logic Verifiers (2025), score 60
  https://doi.org/10.1145/3704856
  Soundness framework for translational separation-logic verifiers via a core intermediate language, relevant to understanding how Verus-like front-ends map to SMT back-ends
- A Programmer-Centric Approach to Program Verification in ATS (2012), score 60
  http://arxiv.org/abs/1203.6102v1
  verification inside the implementation language with dependent types and literate proofs, a programmer-centric style close to Verus in-language specs
- Veil: A Framework for Automated and Interactive Verification of Transition Systems (2025), score 60
  https://doi.org/10.1007/978-3-031-98682-6_2
  automated SMT verification of distributed transition systems with interactive fallback in Isabelle, a design pattern for Verus distributed-system proofs
- (Quantified) Horn Constraint Solving for Program Verification and Synthesis (2014), score 60
  http://arxiv.org/abs/1405.7739v1
  frames program verification and synthesis as quantified Horn constraint solving with separated obligation generation and solving; architecture idea for verifier backends
- Formal Verification of Programs Equivalence (2025), score 60
  https://openalex.org/W7162278376
  reduces relational program equivalence to standard verification via product programs so simpler specs can prove complex programs, a reuse idea for Verus proofs
- The Move Prover (2020), score 60
  https://doi.org/10.1007/978-3-030-53288-8_7
  Move Prover with a specification language translated to Boogie, a deductive-verifier design for a smart-contract language close to Verus
- Verification-Preserving Inlining in Automatic Separation Logic Verifiers (2023), score 60
  https://doi.org/10.1145/3586054
  shows when inlining preserves verification in automatic separation-logic verifiers, a bounded-checking technique for finding bugs cheaply
- Verification-Preserving Inlining in Automatic Separation Logic Verifiers (extended version) (2022), score 60
  http://arxiv.org/abs/2208.10456v2
  extended version of the verification-preserving inlining result for Viper-based verifiers, same bounded-checking technique
- Deductively Verified Program Models for Software Model Checking (2024), score 60
  https://doi.org/10.1007/978-3-031-75380-0_2
  title only, deductively verified program models fed into software model checking, a bridge between deductive and model-checking tools
  (title only, no abstract)
- Forward Symbolic Execution for Trustworthy Automation of Binary Code Verification (2023), score 60
  http://arxiv.org/abs/2304.08848v2
  machine-checked symbolic execution theory for unstructured binary code in HOL4, with precision versus overapproximation control, a method for verifying low-level code
- Automated Verification of Tree-Manipulating Programs Using Constrained Horn Clauses (2024), score 60
  https://doi.org/10.48550/arxiv.2410.09668
  reduces memory-safety proofs for tree-manipulating programs to CHC solving via knitted-tree encoding, a transferable encoding for pointer data structures
- Designing a verifying compiler: Lessons learned from developing Whiley (2015), score 60
  https://doi.org/10.1016/j.scico.2015.09.006
  lessons from building the Whiley verifying compiler, design guidance for a verifying language toolchain; title only
  (title only, no abstract)
- Coma, an Intermediate Verification Language with Explicit Abstraction Barriers (extended version) (2025), score 60
  https://doi.org/10.1007/978-3-031-91121-7_8
  intermediate verification language with explicit abstraction barriers, shows how verifier backends structure verification conditions, relevant to Verus design
- Enhancing Predicate Pairing with Abstraction for Relational Verification (2017), score 60
  http://arxiv.org/abs/1709.04809v1
  relational verification via constrained Horn clauses with abstract domains in predicate pairing, a two-run property technique for Z3-based verifiers
- Exploiting Pointer Analysis in Memory Models for Deductive Verification (2018), score 60
  http://arxiv.org/abs/1811.12515v1
  shares pointer-analysis memory partitioning with Frama-C deductive proofs to shrink verification conditions, a C memory reasoning technique
- Interpolation and SAT-Based Model Checking Revisited: Adoption to Software Verification (2022), score 60
  http://arxiv.org/abs/2208.05046v2
  adopts McMillan interpolation-based model checking to C software in CPAchecker and shows it competitive; interpolation technique is transferable to Rust verifiers
- Modular Verification of Recursive Programs (2009), score 60
  http://arxiv.org/abs/0907.4316v1
  modular Hoare-style proof of recursive programs, illustrated on Quicksort; modular deductive reasoning directly informs Verus proof structuring
- Semantics-based generation of verification conditions via program specialization (2016), score 60
  https://doi.org/10.1016/j.scico.2016.11.002
  generates verification conditions for programs via specialization, a core deductive verification technique that could inform how Verus discharges proof obligations
  (title only, no abstract)
