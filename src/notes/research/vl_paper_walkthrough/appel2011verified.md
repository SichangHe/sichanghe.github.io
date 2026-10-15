# Verified Software Toolchain (Invited Talk)
(authored by agents unless marked 🧑)
Tag: `appel2011verified`, [paper](https://www.semanticscholar.org/paper/9cdd6da72a90e4fd786012b33f85efc16cdac0d3)

## central result and scope

Appel describes the Verified Software Toolchain (VST), a Coq-verified composition of a static analyzer, compiler, runtime or operating-system context, and machine-language semantics. Its end theorem connects source-level claims to machine-level observations. The abstract says: “Our verification approach is modular, in that proofs about operating systems or concurrency libraries are oblivious of the programming language or machine language, proofs about compilers are oblivious of the program logic used to verify static analyzers, and so on.” (abstract, p. 1)

The paper is an invited technical overview, not a new benchmark report. Its evidence is the semantic construction, the listed proof obligations, and the Foundational Proof-Carrying Code comparison. It does not give an aggregate count of VST-verified applications or a runtime denominator. The abstract also states the foundational boundary: “the trusted base for proofs of observable properties of the machine-language program includes only the operational semantics of the machine language, not the source language, the compiler, the program logic, or any other part of the toolchain.” (abstract, p. 1)

## technique: observable, extensional specifications

what it is and when to use it

Specify behavior as input-output observations shared by source and target languages. The specification ignores internal loads, stores, and execution time, allowing compiler optimizations while retaining externally visible system calls, lock operations, and shared-memory transfers. This is appropriate when compiler correctness should preserve externally visible behavior rather than a particular instruction sequence. The paper states: “Specifications of program behavior must be robust with respect to translation from source language to machine language.” (Section 1, p. 3)

how to do it

1. Define a common observation language for source and machine programs (Section 1, p. 3).
2. Treat system calls and lock acquire/release as observable events that expose controlled memory portions (Section 1, pp. 3–4).
3. Restrict the concurrency model to well-synchronized programs, where accesses occur under exclusive or shared permissions (Section 1, p. 4).
4. State extensional properties over observations; do not promise execution time or other intensional behavior (Section 1, p. 4).

Verus form

Inference: express the extensional contract as a `spec fn` over abstract inputs and outputs, then connect executable Rust functions with `requires` and `ensures`. Use Verus `invariant` clauses for the internal facts needed to establish the postcondition. Inference: Verus does not automatically prove that a system call or foreign function preserves the chosen observation relation; model such calls with explicit specifications and keep the model in the trusted boundary until it is separately verified.

what evidence and limits show

The paper explicitly excludes execution-time properties by design and assumes well-synchronized programs (Section 1, p. 4). Therefore the method does not establish timing preservation, behavior of data races, or arbitrary OS interactions. Inference: a VL product that promises latency or behavior under unsynchronized unsafe code needs additional specifications and proofs.

## technique: oracle semantics for runtime context

what it is and when to use it

Factor core program execution from interactions with an operating system or other threads. The oracle represents the external context and is shared by source and machine semantics, so compiler proofs need not model the context's internal details. The paper says: “We factor the operational semantics to separate core programming-language execution from execution steps in the operating-system/runtime-system/concurrency context, which we call the oracle for short.” (Section 3, p. 5)

how to do it

1. Use a small-step state with oracle state `Ω`, memory `m`, and core state `q` (Section 3, p. 6).
2. Let core steps change `m` and `q` but not `Ω`; let oracle steps occur at external calls and change `Ω` and `m` (Section 3, p. 6).
3. Instantiate the oracle as the OS for sequential programs or as the other threads for a concurrent thread (Section 3, p. 6).
4. Prove compiler correctness against this factorized semantics, then separately reason about the oracle's behavior (Section 3, pp. 5–6).

Verus form

Inference: wrap an external operation in a Rust function with a Verus contract describing its permitted state transition. Use a ghost state-machine model for shared state and prove that each operation's `ensures` clause matches a legal transition. Inference: the oracle is a modeling pattern, not a Verus primitive; `external_body` or `assume_specification` can mark an unverified boundary but leaves that boundary trusted and should not be confused with a proof of the OS.

what evidence and limits show

The paper reports that the oracle keeps concurrency largely out of the compiler proof and enables reuse of CompCert's simulation lemmas (Sections 3 and 8, pp. 6, 12). It does not report a quantitative proof-size or runtime comparison. The OS, scheduler, and external-function model remain assumptions unless separately verified.

## technique: expressive Hoare and concurrent separation logic

what it is and when to use it

Use Hoare triples as the intermediate interface between static analyzers and operational semantics. VST extends Hoare logic with separation logic for pointers and arrays, impredicative quantification for higher-order functions and abstraction, recursive assertions for inductive data, permissions for partial ownership, and resource invariants for concurrency. The paper summarizes: “We end up with impredicative higher-order concurrent separation logic.” (Section 4, p. 9)

how to do it

1. Define a judgment `Γ ⊢ {P} c {Q}` whose precondition and postcondition describe safe termination or divergence (Section 4, pp. 6–7).
2. Use separating conjunction to split disjoint or partially owned heap portions (Section 4, p. 8).
3. Represent ownership with permissions; stronger permissions permit writes or deallocation (Section 4, p. 8).
4. Associate each lock with a resource invariant and transfer the invariant's resources on acquire/release (Section 4, p. 8–9).
5. Prove the program logic sound with respect to the decorated operational semantics (Section 4 and the proof plan on pp. 2–3).

Verus form

Inference: use Verus `requires` and `ensures` for function contracts, `invariant` for loop and state-machine preservation, and ghost/specification state to model ownership and resources. Verus's ownership and tracked-resource mechanisms can encode some permission discipline, but the paper's separation algebra and impredicative assertions do not carry over automatically. Inference: a Rust API should expose only operations whose contracts preserve the resource invariant; unsafe pointer operations need separately proved models.

what evidence and limits show

The logic is a semantic interface, not an empirical claim. The paper reports one successful experiment reimplementing a concurrent-separation-logic shape analysis in Gallina, but notes a mismatch: the cited analysis assumes imprecise resource invariants while VST requires precise ones (Section 5, p. 10). This is evidence that end-to-end mechanization exposes specification mismatches; it is not a success percentage.

## technique: instrument an untrusted analyzer with a verified checker

what it is and when to use it

Instead of proving a large analyzer, make it emit invariants and recheck those witnesses with a small, verified core. The paper's method is: “The toolchain then starts with the full (untrusted, unverified) static analyzer, whose results are rechecked with the (verified) core analyzer.” (Section 5, p. 10)

how to do it

1. Let the existing analyzer infer invariants and insert them into the program (Section 5, p. 10).
2. Implement the core checker in Coq's Gallina language (Section 5, p. 10).
3. Prove the core checker sound with respect to the VST program logic (Section 5, p. 10).
4. Extract the checker to Caml and run it on the analyzer's output (Section 5, p. 10).
5. Reject any witness whose before/after invariants do not match the program logic (Section 5, p. 10).

Verus form

Inference: use an external candidate generator for agent-written Rust and make Verus the checker of emitted `spec fn`, `requires`, `ensures`, and `invariant` clauses. Keep the generator outside the trusted proof boundary. Inference: unlike VST's extracted checker, a Verus proof is checked by Verus's own pipeline; an independently verified checker would require a separate formalization of Verus semantics.

what evidence and limits show

The approach avoids trusting a SAT or ILP solver embedded in the analyzer, but the paper does not quantify checker size, runtime, or rejected-witness rates. The shape-analysis experiment is described qualitatively (Section 5, p. 10). The core checker still relies on Coq, extraction, and the modeled semantics.

## technique: decorated, angelic, and erased semantics with partial erasure

what it is and when to use it

Maintain rich proof-only information long enough for the program-logic proof, then erase it in stages so compiler bisimulation remains tractable. The decorated semantics carries predicates and permissions; the angelic semantics removes predicates and replaces their operational effects with an oracle; the erased semantics removes permissions as well (Section 6, pp. 10–11). The paper states: “Thus we erase the predicates in moving from the decorated to the angelic semantics.” (Section 7, p. 11)

how to do it

1. Prove assertions against the decorated semantics, where states include permissions, lock invariants, and function predicates (Section 6, p. 10).
2. Prove a correspondence from decorated executions to angelic executions with the same observations (Sections 6–7, pp. 10–11).
3. Use the angelic semantics for compiler-correctness bisimulation; the oracle supplies effects formerly computed from erased predicates (Sections 7–8, pp. 11–12).
4. Prove correspondence from angelic to fully erased machine semantics, where permissions disappear (Section 6, p. 10; proof plan pp. 2–3).

Verus form

Inference: keep ghost/specification state in Verus proofs and ensure it is erased from executable Rust. Model the correspondence as proof lemmas between an abstract state machine and the concrete Rust state. Inference: Verus's proof erasure does not by itself establish a compiler-correctness theorem; the generated executable, compiler, and foreign runtime remain outside the paper's semantic chain unless separately modeled.

what evidence and limits show

The paper reports that erasure allows reuse of existing CompCert bisimulation proofs with little modification (Section 8, p. 12). It also explains why leaving predicates in compiler states would complicate proofs: compiler optimizations change the number of steps and therefore approximation aging (Section 7, p. 11). No quantitative proof-maintenance measurement is supplied.

## technique: modular compiler correctness by bisimulation

The compiler is proved correct in the angelic semantics of each intermediate language, preserving the common observable behavior. CompCert's existing simulation lemmas are adapted to the oracle/observable interface (Section 8, p. 12). The proof plan lists source logic soundness, decorated-to-angelic correspondence, compiler correctness, angelic-to-erased correspondence, and weak-memory correspondence as separate obligations (Sections 6–9, pp. 10–13). Inference: VL could use the same decomposition for a Rust verified library, separating function-contract proofs from an independently justified compiler or runtime model.

## technique: foundational trusted-base theorem

what it is and when to use it

State the end theorem directly over the installed analyzer, compiler, machine semantics, and desired observation set. The paper formalizes it as `A(p,S) ∧ C(p,p') → M(p',o) → o ∈ S` for all programs, compiled programs, specifications, and observations (Section 11, pp. 14–15). This makes the consumer's question—whether the desired `S` is the right specification—separate from the internal source-language proof machinery.

what remains trusted

The paper says VST's Gallina analyzer and compiler depend on Coq proof checking and extraction, the OCaml compiler, and the OCaml runtime; bugs in those components can invalidate the theorem (Section 11, p. 15). Foundational PCC previously reduced its base to fewer than 3,000 lines: about 800 lines for a proof checker, a few lines for higher-order logic representation, and about 1,500 lines for Sparc instruction encodings and semantics (Section 10, p. 14). These are line counts for that FPCC project, not VST's size.

Inference: for VL, the corresponding trusted boundary includes Verus, its solver and translation, the Rust compiler, external libraries, hardware, and the correctness of the specification. A machine-checked proof prevents errors in a proof derivation but not a wrong specification; the paper closes with this warning in Section 12, p. 15. The product threat is therefore specification and interface drift across agent-written code, dependencies, and runtime assumptions. VL should reuse the paper's end-to-end contracts, witness checking, staged erasure, and observable-behavior framing rather than claim that a local loop proof covers the deployed binary.

## techniques for the catalog


- observable extensional contracts — specify source and machine behavior through common input-output observations that survive optimization
- oracle semantics — factor runtime and concurrency context into an abstract oracle shared by source and target executions
- concurrent separation logic — combine Hoare triples with permissions, recursive assertions, and lock resource invariants
- verified witness checker — recheck invariants emitted by an untrusted analyzer with a small Coq-proved core
- staged semantic erasure — relate decorated, angelic, and erased semantics while preserving observations
- bisimulation compiler proof — prove each compiler phase preserves the shared observable semantics
- foundational trusted-base theorem — state the final analyzer/compiler/machine implication directly over the desired specification

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
