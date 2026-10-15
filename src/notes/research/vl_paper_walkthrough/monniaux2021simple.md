# Simple, light, yet formally verified, global common subexpression elimination and loop-invariant code motion
(authored by agents unless marked 🧑)
Tag: `monniaux2021simple`, [paper](https://doi.org/10.1145/3461648.3463850)

## result and setting

Monniaux and Six implement global common subexpression elimination (CSE) and loop-invariant code motion (LICM) in CompCert’s RTL compiler. Their central engineering claim is to compose simple verified passes: “We propose implementing loop-invariant code motion as the composition of two simpler phases, which are proved to be correct independently of each other.” The two phases are first-iteration unrolling and global CSE. The implementation is in Coq with an OCaml analysis and is evaluated on ARM Cortex-A53, x86-64, RISC-V, and Kalray KV3.

Inference: the lesson for Verus is proof decomposition around small simulation-preserving transformations. The paper is about compiler correctness in Coq, so Rust and Verus syntax below are mappings, not claims made by the authors.

## technique 1: verified code duplication for first-iteration unrolling

Purpose. A loop’s first iteration computes values that remain invariant later. Unroll that iteration so a later global CSE pass can reuse those values. The paper’s PolyBench `kernel_syrk` example computes the address of `C[i][j]` repeatedly; after unrolling, the address and base pointers are available before the remaining loop.

Steps from Section 3 (pp. 7–9):

1. identify innermost loops in the RTL control-flow graph
2. duplicate the condition and loop-body instructions for the first iteration
3. redirect the duplicated body’s successor to the original loop instead of the back edge, equivalent to `while(c){b}` becoming `if(c){b; while(c){b}}`
4. have an untrusted transformation return the new graph and a reverse map `f` from every transformed location to its origin
5. run the verified checker: each transformed instruction must match its origin, and every successor pair must satisfy `f(s') = s`
6. prove lock-step simulation with identical registers and memory and program counters related by `f`

The authors explicitly describe the trust split: “some untrusted OCaml function transforms the code, then a formally proven verifier in Coq either accepts or rejects the transformed code.” A bug in the untrusted algorithm can reduce performance but is rejected if it changes the checked structure.

Verus form. Inference: represent the original and transformed control-flow graphs as ghost sequences/maps, specify a reverse-location relation with `spec fn`, and prove each transformed step matches an original step using `proof fn` lemmas. Runtime Rust can execute the transformed graph after the proof code is erased. Verus will not certify an arbitrary graph transformation without a model of instructions and a simulation relation.

## technique 2: global CSE as checked dataflow invariants

The CSE3 pass has five stages: an untrusted analysis collects equalities; a verified checker verifies they are inductive; a verified transformation replaces redundant computations with moves; a verified cleanup removes self-moves; and dead-code elimination removes useless moves. The paper lists this pipeline in Section 4.

The abstract domain records equalities such as `rd = rhs(r1,…,rn)` for operations and memory loads. Each control location receives a set of equalities. Kildall’s forward dataflow algorithm computes a fixed point; at control-flow joins, only equalities present on every incoming path remain, so the merge is set intersection. Transfer rules are:

- for an assignment to `rd`, discard equalities involving `rd`, then add the new operation equality
- for a load, apply the analogous rule
- for a store, conservatively discard equalities involving memory, or retain non-aliasing loads when the alias analysis proves they cannot overlap
- forward operands through known move equalities
- if an equivalent expression already exists, add a move equality from the existing register

The final untrusted output contains a catalog, lookup tables, and location invariants, but no logical axiom is accepted about their contents. The verified checker recomputes tables from the catalog and checks inductiveness with Coq transfer functions. The paper explains the criterion: “if the program can take a step σ → σ′ through an instruction I, and σ ∈ JSK, and I] is the abstract transfer function associated with instruction I, then σ′ ∈ JI](S)K.”

The transformation intersects the location invariant with equalities having the same right-hand side; if it finds `rd0 = rhs`, it replaces `rd := rhs` with `rd := rd0`. Its lock-step proof relies on the invariant: the source and transformed states have equal registers and memory, and the reused register has the same value as the recomputed expression.

Verus form. Inference: model the abstract equality set as a ghost `Set` or finite map, write `spec fn` transfer functions, and prove inductiveness with `proof fn` lemmas. The executable optimizer can use hash maps, but its `ensures` contract must connect each replacement to a proved equality. A loop invariant in Verus is a declaration attached to the loop; do not encode it as an `invariant(...)` function call. Solver automation may need explicit lemmas for set intersection, alias conditions, and expression evaluation.

## technique 3: hash-consed sets with a narrow trust assumption

CSE performs equality tests and intersections frequently, so the implementation represents each equality by a positive integer and uses hash-consed integer sets. Hash-consing makes equal structures share nodes and makes pointer equality a fast equality test. The authors verify the set algorithms, but retain a small trusted base around the OCaml weak hash table. They state that “the property that we really use about hash-consing is that pointer equality implies structural equality.”

Steps: assign a fresh integer to every new equality; maintain reverse maps from identifiers to equations and from right-hand sides/registers/memory to identifiers; use hash-consed sets for intersections and differences; recompute derived tables in verified code; assume only the specified pointer-equality property of the weak table. The paper notes that read-only hash tables are exported as `find` operations and that their behavior is an implicit logical assumption.

Verus form. Inference: use a verified map/set specification for the proof model and an optimized runtime hash table behind an `external_body` only when that boundary is explicitly trusted and the verified wrapper proves the needed contract. Do not put `external_body` on the function whose behavior is being verified. If pointer identity is used, state the identity-to-structural-equality assumption as a trusted axiom or replace it with a verified equality check.

## evidence and limitations

On the AArch64 Cortex-A53 PolyBench and application benchmark set, the table reports time ratios relative to CompCert without SSA or CSE3. The paper reports geometric-mean speed improvements of 10–20% depending on architecture; adding unrolling to CSE3 gains 12% speed over CSE3 alone on Cortex-A53. The authors report that on Cortex-A53 and KV3 the improved CompCert is only 10% slower than gcc `-O2`. These are geometric means of the listed benchmark ratios, not a claim about every program; the table contains 5 application rows and 29 PolyBench rows (34 total) on AArch64, while other architectures are in Appendix C.

The transformation itself is dominated by register allocation on larger functions, and hashing is much faster than the non-hashed implementation. Unrolling increases object-file size by an average of 5% on AArch64 under their settings. The optimization cannot safely move potentially trapping loads or arithmetic without additional proof, and a store may invalidate all memory-related equalities when alias information is insufficient.

What is proved is simulation preservation for the RTL transformations and correctness of the dataflow checker and set library. Trusted parts include CompCert’s semantics and Coq kernel, the OCaml hash-table behavior, parser/front-end invariants, hardware counters, and benchmark representativeness. Inference: verified compiler passes reduce the threat of optimizer-induced miscompilation in agent-written Rust, but the remaining trusted hash-consing and source-to-RTL pipeline can still invalidate a product claim. VL should reuse the pass decomposition and explicit trust accounting rather than redo generic CSE theory.

## techniques for the catalog

- certified unrolling — use an untrusted graph duplicator plus a verified reverse-map checker and lock-step simulation
- global CSE invariants — compute available-expression sets, verify inductiveness, and replace equivalent expressions with moves
- conservative memory transfer — invalidate memory equalities on stores unless alias analysis proves non-overlap
- proof-preserving cleanup — separately verify self-move removal and dead-code elimination
- hash-consed proof data — accelerate equality and set operations while isolating pointer-equality assumptions
- compositional LICM — obtain loop-invariant motion by composing independently proved unrolling and CSE passes

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
