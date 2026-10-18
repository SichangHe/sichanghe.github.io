# Simple, light, yet formally verified, global common subexpression elimination and loop-invariant code motion
(authored by agents unless marked 🧑)
Tag: `monniaux2021simple`, [paper](https://arxiv.org/abs/2105.01344)

## result and setting

Monniaux and Six implement global common subexpression elimination (CSE) and loop-invariant code motion (LICM) in CompCert’s RTL compiler. Their central engineering claim (Section 1.3, p. 5) is to compose simple verified passes: “We propose implementing loop-invariant code motion as the composition of two simpler phases, which are proved to be correct independently of each other”. The two phases are first-iteration unrolling (Sec. 3) and global CSE (Sec. 4). The implementation is in Coq with an untrusted OCaml analysis, built in a fork of CompCert (kvx), and is evaluated on ARM Cortex-A53 (the main text), plus x86-64 Xeon Gold 6138, RISC-V Rocket and Kalray KV3 (Appendix C). The paper is the arXiv full version of an LCTES 2021 article.

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

The authors explicitly describe the trust split: “some untrusted OCaml function transforms the code, then a formally proven verifier in Coq either accepts or rejects the transformed code.” Footnote 7 (p. 8): “A bug in these algorithms might result in a worst performance, but never to incorrectness, since that would be caught by the certified verifier.” The same pass also performs loop rotation (Sec. 3.3), and the evaluated configuration is called “unroll+rotate”.

Verus form. Inference: represent the original and transformed control-flow graphs as ghost sequences/maps, specify a reverse-location relation with `spec fn`, and prove each transformed step matches an original step using `proof fn` lemmas. Runtime Rust can execute the transformed graph after the proof code is erased. Verus will not certify an arbitrary graph transformation without a model of instructions and a simulation relation.

## technique 2: global CSE as checked dataflow invariants

The CSE3 pass is described in Section 4 (pp. 9–15) as “implemented in four steps”, but the list that follows has five items: an untrusted analysis collects inductive invariants; a verified checker checks that they are inductive; a verified transformation replaces redundant computations by moves; a verified transformation replaces moves from a variable to itself by no-operations; and a verified transformation removes dead code. Sec. 4.4 says the last step uses CompCert’s existing dead code elimination.

The abstract domain records equalities such as `rd = rhs(r1,…,rn)` for operations and memory loads. Each control location receives a set of equalities. Kildall’s forward dataflow algorithm computes a fixed point; at control-flow joins, only equalities present on every incoming path remain, so the merge is set intersection. Transfer rules are:

- for an assignment to `rd`, discard equalities involving `rd`, then add the new operation equality
- for a load, apply the analogous rule
- for a store, conservatively discard equalities involving memory, or retain non-aliasing loads when the alias analysis proves they cannot overlap
- forward operands through known move equalities
- if an equivalent expression already exists, add a move equality from the existing register

The final untrusted output contains a catalog, lookup tables, and location invariants, but no logical axiom is accepted about their contents. The verified checker recomputes tables from the catalog and checks inductiveness with Coq transfer functions. Section 4.2 states the soundness property proved for the transfer functions: “if the program can take a step σ → σ′ through an instruction I, and σ ∈ JSK, and I] is the abstract transfer function associated with instruction I, then σ′ ∈ JI](S)K.” The check itself is that the entry point has the top element and that for each edge p to p′ labeled I, I](Sp) is below Sp′ in the lattice order.

The transformation intersects the location invariant with equalities having the same right-hand side; if it finds `rd0 = rhs`, it replaces `rd := rhs` with `rd := rd0`; “trivial” operations such as loading immediate constants are not replaced (Sec. 4.3). Its lock-step proof relies on the invariant: the source and transformed states have equal registers and memory, and the reused register has the same value as the recomputed expression.

Verus form. Inference: model the abstract equality set as a ghost `Set` or finite map, write `spec fn` transfer functions, and prove inductiveness with `proof fn` lemmas. The executable optimizer can use hash maps, but its `ensures` contract must connect each replacement to a proved equality. A loop invariant in Verus is a declaration attached to the loop; do not encode it as an `invariant(...)` function call. Solver automation may need explicit lemmas for set intersection, alias conditions, and expression evaluation.

## technique 3: hash-consed sets with a narrow trust assumption

CSE performs equality tests and intersections frequently, so the implementation represents each equality by a positive integer and uses hash-consed integer sets. Hash-consing makes equal structures share nodes and makes pointer equality a fast equality test. The authors verify the set algorithms, but retain a small trusted base around the OCaml weak hash table. Section 5 (pp. 15–17) states: “The property that we really use about hash-consing is that pointer equality implies structural equality, which is not an issue.” Appendix D.2 (pp. 32–33) says the only addition to CompCert’s trusted computing base is the hashed set library: a tiny OCaml hash-consing wrapper and OCaml’s weak hash tables.

Steps: assign a fresh integer to every new equality; maintain reverse maps from identifiers to equations and from right-hand sides/registers/memory to identifiers; use hash-consed sets for intersections and differences; recompute derived tables in verified code; assume only the specified pointer-equality property of the weak table. Footnote 12 (p. 13) notes that the read-only hash tables are exported to Coq as `find` operations, with “an implicit logical assumption that this ‘find’ operation behaves as a pure function.”

Verus form. Inference: use a verified map/set specification for the proof model and an optimized runtime hash table behind an `external_body` only when that boundary is explicitly trusted and the verified wrapper proves the needed contract. Do not put `external_body` on the function whose behavior is being verified. If pointer identity is used, state the identity-to-structural-equality assumption as a trusted axiom or replace it with a verified equality check.

## evidence and limitations

On the AArch64 Cortex-A53 PolyBench and application benchmark set, the table reports time ratios relative to CompCert without SSA or CSE3. The paper reports geometric-mean speed improvements of 10–20% depending on architecture; adding unrolling to CSE3 gains 12% speed over CSE3 alone on Cortex-A53. The authors report that on Cortex-A53 and KV3 the improved CompCert produces code “only 10% slower than gcc -O2” (Sec. 6.2, p. 20); the averages versus gcc `-O2` there are +10% (A53), +29% (Rocket), +21% (Xeon), +8% (KV3). The paper’s footnote 21 says these are geometric means of the ratios across all benchmarks, not a claim about every program (minimum and maximum per architecture are in the table on p. 20, e.g. A53 from -63% to +3%); the table contains 5 application rows and 29 PolyBench rows (34 total) on AArch64, while other architectures are in Appendix C.

Section 6.2 says the running time of the transformation “is dominated by that of register allocation on larger functions” (Fig. 2), and that the hashed approach is “way faster” than one without hashing (Appendix A, Fig. 4, timed on x86-64 on Yarpgen-generated programs). The paper also reports its SSA middle-end (including GVN) is about 53,000 lines against 2,700 for CSE3 plus 1,500 for the hashed set library, and is significantly slower (Fig. 3). Unrolling increases object-file size by an average of 5% on AArch64 under their settings. Section 7 says the rejected alternative (injecting dead copies of invariant statements before the loop, then CSE) cannot move loads out of loops because they may trap, nor trapping arithmetic, nor remove loads of values just written by the preceding iteration; the unrolling approach is the one adopted. A store discards all memory-related equalities unless the simple alias analysis shows non-overlap. Future work named: an untrusted check for loop-invariant values before unrolling, and a pass to roll back needless unrolling.

What is proved is lock-step simulation preservation for the RTL transformations and correctness of the dataflow checker and set library. Trusted parts per Appendix D.1 include Coq and its extraction, OCaml, the CompCert semantics, option parsing, front-end, assembly expansion and printer, ABI compatibility, assembler and linker; the new additions are the hash-consing code and weak hash tables. Experimental caveats stated by the paper (Appendix B, C.3): experiments use a verified-checked pre-pass instruction scheduler “developed without access to microarchitectural documentation”, gcc ran with `-ffp-contract=off`, and on RISC-V Rocket there were unexpected crashes so “performance must be taken with a grain of salt”. Inference: benchmark representativeness (PolyBench plus five applications) limits how far the speedups generalize. Inference: verified compiler passes reduce the threat of optimizer-induced miscompilation in agent-written Rust, but the remaining trusted hash-consing and source-to-RTL pipeline can still invalidate a product claim. VL should reuse the pass decomposition and explicit trust accounting rather than redo generic CSE theory.

## techniques for the catalog

- certified unrolling — use an untrusted graph duplicator plus a verified reverse-map checker and lock-step simulation
- global CSE invariants — compute available-expression sets, verify inductiveness, and replace equivalent expressions with moves
- conservative memory transfer — invalidate memory equalities on stores unless alias analysis proves non-overlap
- proof-preserving cleanup — separately verify self-move removal (needs an extensional register-map equivalence) and reuse CompCert’s dead-code elimination
- hash-consed proof data — accelerate equality and set operations while isolating pointer-equality assumptions
- compositional LICM — obtain loop-invariant motion by composing independently proved unrolling and CSE passes

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The second limitation is overcome by hash-consing the nodes, ensuring that there are never, at a given moment, two copies of the same tree residing at different memory locations inside the OCaml program extracted from Coq."): read the whole paper including appendices; checked every quotation, the technique steps for code duplication, CSE3 and hashed sets, section and page references, the benchmark counts (5 application plus 29 PolyBench rows) and the reported averages; changed the link to the arXiv page printed in the paper (the DOI is not in the paper text), fixed two quotation boundaries, the “five stages” description (paper says four steps but lists five), the attribution of the trapping-load limitation (it applies to the rejected alternative), the trusted-base list, and the dead-code-elimination claim (CompCert’s existing pass); added caveats from Appendices B and C. Did not check: the Verus mappings (Inference, not claims of the paper), the cited external works, the Coq development, or the accuracy of the PDF-extracted table values beyond the counts and the averages quoted.
