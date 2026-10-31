# Verified Software Toolchain (Invited Talk)
(authored by agents unless marked 🧑)
Tag: `appel2011verified`, [paper](https://www.semanticscholar.org/paper/9cdd6da72a90e4fd786012b33f85efc16cdac0d3)

## central result and scope

Appel describes the Verified Software Toolchain (VST), a planned Coq-verified composition of a static analyzer, compiler, runtime or operating-system context, and machine-language semantics. Its end theorem connects source-level claims to machine-level observations. The paper itself marks several parts of its proof plan as in early stages (the analyzer instrumentation and checker) or not even begun (the weak-memory equivalence); only the program-logic specification, decorated and angelic semantics, and erasure correspondences are marked completed or nearly so (Introduction, pp. 2–3). The abstract says: “Our verification approach is modular, in that proofs about operating systems or concurrency libraries are oblivious of the programming language or machine language, proofs about compilers are oblivious of the program logic used to verify static analyzers, and so on.” (abstract, p. 1)

The paper is an invited technical overview, not a new benchmark report. Its evidence is the semantic construction, the listed proof obligations, and the Foundational Proof-Carrying Code comparison. It does not give an aggregate count of VST-verified applications or a runtime denominator. The abstract also states the foundational boundary: “the trusted base for proofs of observable properties of the machine-language program includes only the operational semantics of the machine language, not the source language, the compiler, the program logic, or any other part of the toolchain.” (abstract, p. 1)

## technique: observable, extensional specifications

what it is and when to use it

Specify behavior as input-output observations shared by source and target languages. The specification ignores individual loads and stores and does not cover execution time, allowing compiler optimizations while retaining externally visible system calls, lock operations, and shared-memory transfers. This is appropriate when compiler correctness should preserve externally visible behavior rather than a particular instruction sequence. The paper states: “Specifications of program behavior must be robust with respect to translation from source language to machine language.” (Section 1, p. 3)

how to do it

1. Characterize the observable behavior of source and machine programs in the same language (Section 1, p. 3).
2. Treat system calls and lock acquire/release as events at which some portion of memory is observable, with the observable addresses made explicit as permissions (Section 1, pp. 3–4).
3. Restrict attention to well-synchronized programs, in which any thread's write (read) access to data is done while holding a semaphore granting exclusive (shared) permission to that data (Section 1, p. 4).
4. State extensional properties over observations; the paper says this approach “deliberately avoids intensional properties” and that “we cannot specify properties such as execution time” (Section 1, p. 4).

Verus form

Inference: express the extensional contract as a `spec fn` over abstract inputs and outputs, then connect executable Rust functions with `requires` and `ensures`. Inference: use Verus `invariant` clauses for the internal facts needed to establish the postcondition. Inference: Verus does not automatically prove that a system call or foreign function preserves the chosen observation relation; model such calls with explicit specifications and keep the model in the trusted boundary until it is separately verified.

what evidence and limits show

The paper excludes execution-time properties by design and restricts attention to well-synchronized programs “at least for the time being” (Section 1, p. 4). The paper does not claim to cover timing or data races.

## technique: oracle semantics for runtime context

what it is and when to use it

Factor core program execution from interactions with an operating system or other threads. The oracle represents the external context and is shared by source and machine semantics, so compiler proofs need not model the context's internal details. The paper says: “We factor the operational semantics to separate core programming-language execution from execution steps in the operating-system/runtime-system/concurrency context, which we call the oracle for short.” (Section 3, p. 5)

how to do it

1. Use a small-step state with oracle state `Ω`, memory `m`, and core state `q` (Section 3, p. 6).
2. Let core steps change `m` and `q` but not `Ω`; let oracle steps occur at external function calls and change `Ω` and `m` (Section 3, p. 6).
3. Instantiate the oracle as the operating system for a sequential program (external calls are system calls) or as all the other threads for one thread of a concurrent program (external calls are lock acquire and release) (Section 3, p. 6).
4. Keep the compiler-correctness proof independent of the oracle's internal details; the paper says that “from the point of view of the C compiler and its correctness proof, issues of concurrency hardly intrude at all” (Section 3, p. 6; Section 8, p. 12).

Verus form

Inference: wrap an external operation in a Rust function with a Verus contract describing its permitted state transition. Inference: use a ghost state-machine model for shared state and prove that each operation's `ensures` clause matches a legal transition. Inference: the oracle is a modeling pattern, not a Verus primitive; `external_body` or `assume_specification` can mark an unverified boundary but leaves that boundary trusted and should not be confused with a proof of the OS.

what evidence and limits show

The paper reports that the oracle keeps concurrency largely out of the compiler proof and that Dockins proves simulation lemmas very similar to CompCert's originals, so CompCert proofs can be reused with very little modification (Sections 3 and 8, pp. 6, 12). It also notes that, as of mid-2010, CompCert was not yet fully ported to the new model of observations (footnote 6, p. 12). It does not report a quantitative proof-size or runtime comparison. Inference: the OS and external-function model remain assumptions unless separately verified.

## technique: expressive Hoare and concurrent separation logic

what it is and when to use it

Use Hoare triples as the intermediate interface between static analyzers and operational semantics. VST extends Hoare logic with separation logic for pointers and arrays, impredicative quantification for higher-order functions and abstraction, recursive assertions for inductive data, permissions for partial ownership, and resource invariants for concurrency. The paper summarizes: “We end up with impredicative higher-order concurrent separation logic.” (Section 4, p. 9)

how to do it

1. Define a judgment `Γ ⊢ {P} c {Q}`: if `c` starts in a state satisfying `P`, then either it safely infinite-loops or it reaches a state satisfying `Q`; `Q` is really a triple of postconditions for fall-through, `exit n`, and `return` (Section 4, pp. 6–7).
2. Use separating conjunction to split the state into disjoint parts, with a separation algebra for partial ownership (Section 4, p. 8).
3. Represent ownership with permissions: some permissions give read access, stronger ones give write access, and the top permission gives the capability to deallocate (Section 4, p. 8).
4. Associate each lock with a resource invariant: on release a thread gives up a portion of memory satisfying the invariant, and on acquire it receives one (Section 4, pp. 8–9).
5. Prove the program logic sound with respect to the decorated operational semantics (Section 4, p. 6; proof plan, p. 2).

Verus form

Inference: use Verus `requires` and `ensures` for function contracts, `invariant` for loop and state-machine preservation, and ghost/specification state to model ownership and resources. Inference: Verus's ownership and tracked-resource mechanisms can encode some permission discipline, but the paper's separation algebra and impredicative assertions do not carry over automatically. Inference: a Rust API should expose only operations whose contracts preserve the resource invariant; unsafe pointer operations need separately proved models.

what evidence and limits show

The logic is a semantic interface, not an empirical claim. The paper reports one experiment by William Mansky, who reimplemented in Gallina the concurrent-separation-logic-based shape analysis of Gotsman et al. and proved it correct “almost”: Gotsman et al. assume imprecise resource invariants, whereas VST's logic requires precise ones (Section 5, p. 9, footnote 4). The paper presents this mismatch as the kind of discovery that end-to-end machine-checked proofs yield; it gives no success percentage.

## technique: instrument an untrusted analyzer with a verified checker

what it is and when to use it

Instead of proving a large analyzer, make it emit invariants and recheck those witnesses with a small, verified core. This is a proposal, marked as in early stages in the proof plan (p. 2). The paper's method is: “The toolchain then starts with the full (untrusted, unverified) static analyzer, whose results are rechecked with the (verified) core analyzer.” (Section 5, p. 9)

how to do it

1. Have the analyzer output the program “liberally sprinkled with invariants” (Section 5, p. 9).
2. Implement the core of the analyzer, which checks that the invariants before and after each program statement (or block) match up, in Coq's Gallina language (Section 5, p. 9).
3. Prove the core sound with respect to the VST program logic (Section 5, p. 9).
4. Use Coq's program extraction to obtain a Caml program implementing the core, and run it on the analyzer's output (Section 5, p. 9).

Verus form

Inference: use an external candidate generator for agent-written Rust and make Verus the checker of emitted `spec fn`, `requires`, `ensures`, and `invariant` clauses. Inference: keep the generator outside the trusted proof boundary. Inference: unlike VST's extracted checker, a Verus proof is checked by Verus's own pipeline; an independently verified checker would require a separate formalization of Verus semantics.

what evidence and limits show

The paper motivates the approach by noting that producing derivation trees may require large changes to an analyzer and the trees will be huge, while proving an analyzer correct is hard because analyzers are large and “sometimes they have major components such as SAT solvers or ILP solvers” (Section 5, p. 9). It does not quantify checker size, runtime, or rejected-witness rates. The one experiment (Mansky's shape analysis) did not use this witness-checking pipeline: the analysis was simple enough that he implemented “the entire analysis including invariant inference in Gallina, without needing an unverified front end” (Section 5, p. 9). Inference: the core checker would still rely on Coq, extraction, and the modeled semantics, which the paper lists as trusted (Section 11, p. 15).

## technique: decorated, angelic, and erased semantics with partial erasure

what it is and when to use it

Maintain rich proof-only information long enough for the program-logic proof, then erase it in stages so compiler bisimulation remains tractable. The decorated semantics carries predicates and permissions; the angelic semantics removes predicates and replaces their operational effects with an oracle (the angel); the erased semantics removes permissions as well (Sections 6–7, pp. 10–11). The paper states: “Thus we erase the predicates in moving from the decorated to the angelic semantics.” (Section 7, p. 11)

how to do it

1. Prove assertions against the decorated semantics, where states include permissions, lock invariants, and function predicates (Section 6, p. 10).
2. Prove a correspondence from decorated executions to angelic executions with the same observations: for each safe decorated execution there exists an angel giving a safe angelic execution with the same observable behavior (Sections 6–7, pp. 10–11).
3. Use the angelic semantics for compiler-correctness bisimulation; the angel supplies the permission changes that were formerly computed from the erased predicates at lock releases (Sections 7–8, pp. 11–12).
4. Prove correspondence from angelic to fully erased semantics, where permissions disappear (Section 6, p. 10; proof plan, p. 3).

Verus form

Inference: keep ghost/specification state in Verus proofs and ensure it is erased from executable Rust. Inference: model the correspondence as proof lemmas between an abstract state machine and the concrete Rust state. Inference: Verus's proof erasure does not by itself establish a compiler-correctness theorem; the generated executable, compiler, and foreign runtime remain outside the paper's semantic chain unless separately modeled.

what evidence and limits show

The paper reports that the angelic semantics lets the existing CompCert simulation proofs be reused with very little modification (Section 8, p. 12). It also explains why leaving predicates in the compiler's states would complicate proofs: a compiler phase may change the number of steps executed, and thus the amount of aging required by Indirection Theory (Sections 7–8, pp. 11–12). No quantitative proof-maintenance measurement is supplied.

## technique: modular compiler correctness by bisimulation

The compiler is proved correct in the angelic semantics of each intermediate language, preserving the common observable behavior. CompCert's existing simulation lemmas are adapted to the oracle/observable interface (Section 8, p. 12). The proof plan (pp. 2–3) lists as separate obligations: program-logic soundness with respect to the decorated semantics, decorated-to-angelic correspondence, compiler correctness with respect to the angelic semantics, equivalence of weak and sequentially consistent memory executions in the angelic semantics (marked as not begun), and angelic-to-erased correspondence; Section 9 (p. 12) says the weak-memory proof “should be possible” but is not done.

## technique: foundational trusted-base theorem

what it is and when to use it

State the end theorem directly over the installed analyzer, compiler, machine semantics, and desired observation set. The paper formalizes it as `∀p, p', S, o. A(p,S) ∧ C(p,p') → M(p',o) → o ∈ S`, where `A` is the analyzer, `C` the compiler, and `M` the machine's operational semantics (Section 11, p. 14). The paper says the statement is independent of the source-language semantics, and that the consumer “just needs to make sure that A and C are installed, bit-for-bit, in his computer”; whether `S` is the right specification remains for a human consumer to check (Section 11, p. 14).

what remains trusted

The paper says VST's analyzer and compiler are written in Gallina and depend on Coq's proof checking (s1), Coq's translation of Gallina to ML (s2), the OCaml compiler (s3), and the OCaml runtime (s4); “bugs in the si can render the proved theorem useless” (Section 11, p. 15). Foundational PCC previously reduced its trusted base to less than 3000 lines of source code: about 800 for a proof checker written in C, a few lines for the representation of higher-order logic in LF, and about 1500 for Sparc instruction encodings and semantics (Section 10, p. 14). These are line counts for that FPCC project, not VST's size.

## techniques for the catalog

- observable extensional contracts — specify source and machine behavior through common input-output observations that survive optimization
- oracle semantics — factor runtime and concurrency context into an abstract oracle shared by source and target executions
- concurrent separation logic — combine Hoare triples with permissions, recursive assertions, and lock resource invariants
- verified witness checker — recheck invariants emitted by an untrusted analyzer with a small Coq-proved core (proposed in the paper, early stage)
- staged semantic erasure — relate decorated, angelic, and erased semantics while preserving observations
- bisimulation compiler proof — prove each compiler phase preserves the shared observable semantics
- foundational trusted-base theorem — state the final analyzer/compiler/machine implication directly over the desired specification
