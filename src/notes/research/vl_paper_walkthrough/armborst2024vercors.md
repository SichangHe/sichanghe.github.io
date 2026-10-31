# The VerCors Verifier: A Progress Report
(authored by agents unless marked 🧑)
Tag: `armborst2024vercors`, [paper](https://doi.org/10.1007/978-3-031-65630-9_1)

The paper reports a deductive verifier for concurrent software in several languages. Its central engineering pattern is to translate annotated source programs through an internal representation into Viper, whose permission-based separation-logic backend discharges obligations. The paper states: “VerCors is a deductive verifier for concurrent software, written in multiple programming languages, where the specifications are written in terms of pre-/postcondition contracts using permission-based separation logic.” (Abstract, p. 3.) The transformation is sound but incomplete: a successful Viper proof implies the source satisfies its specification, while failure is inconclusive (Introduction, p. 4).

## technique: contract-driven translation pipeline

Use this when one verifier must accept several languages or source abstractions while keeping one proof engine. The paper's steps are:

1. annotate the source program with pre-/postcondition contracts in permission-based separation logic, as verification annotations in comments (Abstract, p. 3; Introduction, p. 4)
2. for languages VerCors does not support directly (SystemC, LLVM IR, Halide), first encode the program, by VerCors itself or by an external tool, into an existing VerCors language, typically PVL, VerCors' internal language (Section 2, p. 5; Section 2.3, pp. 6–7)
3. apply a sequence of approximately eighty recursive AST rewrite steps (Section 3, p. 7)
4. translate the result into Viper input and use Viper as the verification back-end (Abstract, p. 3)
5. accept the result only when the backend verifies; preserve the soundness direction and treat failure as unknown (Introduction, p. 4)

Verus form (Inference): keep executable Rust and proof code in one crate, put `requires` and `ensures` on Rust functions, use `spec fn` for mathematical abstractions and `proof fn` for lemmas, and encode ownership/concurrency facts with Verus' supported tracked permissions or state-machine constructs. A Rust front end would lower source contracts to these constructs rather than to PVL. The source-to-source transformations would be ordinary compiler passes; each pass needs a semantic preservation argument because Verus does not automatically certify a custom translator. What does not carry over is Viper's permission assertion syntax and its backend semantics.

Evidence is architectural rather than a single benchmark: the abstract says the tool is used on “a range of realistic case studies,” and Section 5 documents tunnel control software, red-black trees, GPU kernels, and student projects.

## technique: explicit exceptional-control encoding

Use when a source language has exceptions but the core verifier reasons about straight-line control flow. VerCors adds exceptional contracts with `signals` clauses, then transforms `throws`, `try_catch`, throwing calls, `break`, and `continue`. The paper says: “throws modifiers are encoded into signals clauses, and try_catch and throwing method calls are encoded into goto’s.” (Section 2.1, p. 5.) Steps from the paper:

1. write `signals` clauses: each gives the postcondition that must hold when an exception of the indicated type is thrown, and can also specify properties of the thrown object (Section 2.1, p. 5)
2. encode `throws` declarations as signals clauses (Section 2.1, p. 5)
3. encode try/catch and throwing calls as gotos (Section 2.1, p. 5)
4. transform abrupt termination (`break`, `continue`) into exceptional statements handled by the same encoding; after the transformations only `goto`, `return`, `requires`, and `ensures` remain (Section 2.1, p. 5)

Verus form (Inference): model a fallible Rust function with `Result`, and give separate `ensures` clauses for `Ok` and `Err` cases through a postcondition over the returned enum. Use helper `spec fn`s to describe the error payload and prove each branch. Verus has no Java `signals` clause, so the error case is represented in the return value. The paper provides no Verus implementation or quantitative result. Inference: the encoding assumes that exception translation preserves control flow and that contracts describe every exceptional outcome.

## technique: permission-based concurrent and accelerator verification

Use when threads or GPU work share memory and the proof must prevent races while proving functional behavior. For OpenCL/CUDA, VerCors translates kernels into parallel blocks and supports dynamic and static local memory; for OpenCL only, local and global memory fences for barriers are supported, "only allowing redistribution of memory permissions when the appropriate fence is used" (Section 2.1, pp. 5–6). For SYCL, the host function and kernel receive contracts; VerCors adds predefined specifications for SYCL data types and functions, and uses the kernel contract to handle automatically the permissions for data transfer and access through buffers and accessors (Section 2.2, p. 6). Inference: the method is to specify each thread's footprint, encode synchronization, verify that permissions are split and rejoined, then prove the postcondition. Inference: in Verus, use state machines, tracked tokens, and explicit invariants for ownership transfer; Rust's borrow checker can express some exclusive access, but GPU address spaces and barrier semantics need ghost models and external assumptions. The paper reports no denominator or aggregate success rate; its evidence is the individual prefix-sum, stream-compaction, summed-area-table, and CUDA case studies (Section 5.3, p. 12).

## technique: transformation-aware optimisation

Use when source-level optimisation could invalidate an existing proof. Alpinist applies loop unrolling, tiling, kernel fusion, iteration merging, matrix linearisation, and data prefetching to GPU programs while transforming annotations too (Section 4, p. 10). Its four phases are parsing, applicability checking, transformation, and output. Applicability checks can be deductive: “Alpinist unrolls a loop n times only if it can prove that the loop is executed at least n times.” (Section 4, p. 10.) Inference: a Verus tool could generate a transformed Rust function plus transported contracts, then run Verus on the result; the applicability proof could be a `proof fn` establishing loop bounds. Verus does not provide Alpinist's transformation engine, so the optimizer and its proof-preservation theorem remain trusted unless separately verified.

VeyMont takes a different route: first verify a sequential global program with endpoints, communication statements, conditional statements with branch unanimity, and loops, with no local variables; then project each endpoint to a concurrent implementation. The paper says: “After the global program is verified, VeyMont transforms it into a concurrent program, where an implementation is derived for each endpoint by projection [16].” (Section 4, p. 10.) Inference: a Verus version would prove a global state machine, generate per-node Rust, and use a refinement lemma connecting the projection to the global trace. The paper states that VeyMont's meta-theory shows the transformed program behaves the same as the sequential program (Section 4, p. 10); it gives no Verus encoding or performance denominator.

## technique: proof-engineering for quantifiers and diagnostics

Use when solver instantiation and debugging dominate proof time. VerCors permits explicit quantifier triggers to avoid matching loops. For parallel-block specifications over a flattened multi-dimensional array, VerCors automatically rewrites a quantifier whose array index is arithmetic, such as `A[(j*8)+i]` over `i` and `j`, into one over a single index `k` with `0 ≤ k < 8*10`, making `A[k]` a legal trigger; the paper says the rewrite applies for most surjective mappings from variables to values (Section 3, p. 8). Inference: as manual steps, identify the arithmetic index mapping, rewrite the quantified domain to the mapped index, choose an array-access trigger, and verify the rewritten obligation. Inference: Verus users can expose a helper `spec fn` with a trigger-compatible shape and use `assert`/lemma calls, but Verus trigger syntax and solver behavior differ; do not import Viper trigger syntax without checking Verus support.

The implementation also resolves names once to declaration pointers, stores typing coercions on AST nodes, maps backend errors back through each rewrite, and emits fine-grained timing profiles (Section 3, pp. 8–9).

## technique: staged case-study decomposition

The distributed-lock case study split the implementation into four increasingly realistic layers; layers one and two were fully verified, while later layers were unfinished because of time (Section 5.4, pp. 12–13). The red-black-tree study used ghost variables for producer-consumer state and the separating “magic wand” for deletion (Section 5.2, p. 11). The tunnel study found two possible explanations of an unexplained runtime behaviour, later confirmed by Technolution: a mutable internal data structure accidentally aliased into a reference assumed immutable, and methods whose inspection leaked an internal data structure not designed to be thread safe (Section 5.1, p. 11).

## what is proved, measured, and left trusted

The paper claims, without a proof in this paper, that the transformation is sound but incomplete (Introduction, p. 4); the verified results are individual annotated case studies. The paper gives no common denominator such as total programs attempted, proof hours, or percentage verified; unfinished lock layers and initially unproven SCC lemmas are explicit limits. It measures usability through examples and reports no controlled comparison. Inference: a product built from these techniques must track specification coverage, trusted libraries, compiler/translator versions, solver results, and unverified assumptions separately. The strongest product threat is specification and translation drift: a passing proof can still certify the wrong contract, and a backend failure does not prove a bug.

## techniques for the catalog

- contract-driven translation pipeline — lower annotated multi-language programs through a typed intermediate form to a separation-logic backend, preserving soundness of successful proofs
- exceptional-control encoding — represent exception contracts and abrupt control flow with a small core of verifiable primitives
- permission-based concurrency verification — split and transfer memory permissions across threads, barriers, and accessors while proving functional postconditions
- transformation-aware optimisation — check optimisation applicability and transport annotations so verified code remains provable
- global-to-concurrent projection — verify a sequential endpoint program and derive communicating implementations by projection
- quantifier trigger rewriting — reshape quantified array indices so solver triggers are legal and avoid matching loops
- staged case-study decomposition — verify progressively richer layers, using ghost state and separation-logic implications for difficult concurrent structures
