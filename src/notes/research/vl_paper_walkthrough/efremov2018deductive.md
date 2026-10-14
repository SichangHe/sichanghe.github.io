# Deductive Verification of Unmodified Linux Kernel Library Functions
(authored by agents unless marked 🧑)
Tag: `efremov2018deductive`, [paper](http://arxiv.org/abs/1809.00626v1)

## what the paper proves and why it matters

Efremov, Mandrykin, and Khoroshilov build a benchmark of 26 Linux 4.12 memory and string functions and verify their existing C implementations with AstraVer, a Frama-C/Jessie based deductive tool. The central technique is to extract contracts from the implementation, then prove safety and behavior with explicit preconditions, postconditions, loop invariants, and variants. The abstract reports the headline result: “The correctness of 23 functions was completely proved using AstraVer toolset, although success for 11 functions was achieved using 2 new specification language constructs.” Two more functions required a small source change, and one (memmove) remained incomplete because of the memory model. The denominator is 26 functions; 23/26 were fully proved without source changes, 2/26 after a minor change, and 1/26 was not complete.

This is a benchmark and engineering method rather than a new end-user program. It demonstrates that unmodified low-level code can be verified when the specification language models its pointer, integer, and aliasing idioms. The source is Linux 4.12 and the reported solver experiment uses an AMD FX-8120, 16 GB RAM, a 60-second time limit, and 6000 MB memory limit (Section 8, p. 14).

## technique: derive a contract from the implementation

When to use it: use this when an existing API must remain unchanged and prose documentation is incomplete or inaccurate. The authors explicitly reject documentation-only contracts because Linux implementations differ from standard-library versions. Their method is to inspect the complete source, state validity and frame conditions, then strengthen postconditions until the implementation's actual behavior is captured.

Steps from the paper:
1. identify the memory ranges read and written by the function and encode validity in a predicate such as `valid_strn` (Section 6, p. 11)
2. write `requires` and `assigns` clauses for those ranges and side effects (Listing 4, p. 11)
3. state the returned value and functional relation in `ensures` clauses
4. split distinct outcomes into complete, disjoint behaviors. The paper says, “ACSL includes a special construct for such composite specifications, which is called behaviors.” (Section 3, p. 4)
5. weaken preconditions where the source permits it and strengthen postconditions to expose solver and language limits (Section 6, p. 12)

Verus form (Inference): model the same API with executable Rust plus `requires` and `ensures`; use a predicate over borrowed slices or proof-oriented memory abstractions for validity. Keep the implementation unchanged where Rust's type and ownership model already expresses the C precondition. C pointer casts, arbitrary aliasing, and byte-level block identity need an explicit model or a wrapper, so a direct translation is not automatic.

Evidence and limits: the benchmark's contracts contain approximately 2.6 times as many lines as the library source (Section 9, p. 16). The approach assumes the source is the authoritative behavior and that the memory model can express all accesses. It does not prove that the contract matches an external standard.

## technique: loop invariants and variants for bounded scans

Use this for loops that advance pointers while preserving a relationship to the original range. Listing 1 specifies `strnchr` with invariants for the remaining count, pointer bounds, string validity, the number of bytes already scanned, and absence of the searched character in the prefix; it also gives `count` as the loop variant (Listing 1, pp. 4–5). The paper states, “To verify the function strnchr against its contract specification with a deductive verification tool, the loop invariant and a ranking function (loop variant) are specified in lines 16–22.”

Steps:
1. save initial pointer and count as ghost values
2. state bounds linking current pointer and remaining count to those ghost values
3. state the searched-prefix property
4. provide a decreasing nonnegative variant
5. discharge the invariant at initialization, preservation, and exit (Listing 1)

Verus form (Inference): use ghost variables and `invariant` clauses inside the loop, plus a `decreases` measure when required by the loop proof. Express the prefix property over a sequence or slice view. The mathematical invariant carries over; C pointer arithmetic and intentional wrapping require a representation-specific lemma.

## technique: explicit modulo arithmetic at individual operations

The benchmark mixes operations that must wrap (casts to `char`, postfix decrement) with operations where overflow must be rejected. A single global integer model cannot do both. The authors add ACSL annotations such as `+/*@%*/`, `++/*@%*/`, and `(unsigned char)/*@%*/` to select modulo semantics per operation (Section 5.2, pp. 9–11). They explain that “The integer model used to model both defensive (the default) and modulo arithmetic operations is a combined one.”

Steps:
1. choose the defensive model for ordinary arithmetic so the verifier generates overflow VCs
2. mark intentional machine wrapping and truncating casts with the modulo annotation
3. use modulo operators in logic for bit-vector relations
4. connect bit-vector and mathematical views with the generated two-sided postconditions
5. add ghost expressions when a concise bit-twiddling identity needs instantiation (the average-of-two-unsigned example, Listing 3, p. 11)

Verus form (Inference): represent wrapping with Rust's explicit wrapping operations or bounded integer types and prove conversion lemmas; use ordinary mathematical `int` facts for non-wrapping arithmetic. Do not silently replace a wrapping cast with an unbounded addition. Verus proof code can supply the bridge lemma, while executable code retains the intended Rust operation.

The paper warns that quantified axioms reduce solver predictability and performance. Thus the technique trades specification convenience for solver sensitivity.

## technique: region separation to simplify framing

Jessie performs a conservative static separation analysis and assigns disjoint heap regions to pointers. In the copy loop of Listing 2, this makes the source and destination regions independent, so a `strlen` fact about the source remains unchanged without a user-written framing lemma (Section 4, pp. 5–6). The authors write, “So in Jessie the non-interference trivially holds and does not require any additional proof effort.”

Steps:
1. run conservative region analysis before VC generation
2. use the inferred disjoint regions in heap encoding
3. write invariants referring to pre-state values with `\at(..., Pre)`
4. weaken the separation assumption explicitly when callers may alias the regions

Verus form (Inference): Rust borrows provide disjointness for many safe slices; for shared mutable structures, encode separation with ownership or permission predicates and prove framing lemmas. Verus does not inherit Jessie regions automatically, so aliasing facts must come from the Rust type or explicit proof state.

The assumption is that the analysis is sound; it is also imprecise and can require weakening. This optimization cannot solve genuine aliasing.

## technique: model pointers and expose memory-model failure

Jessie represents pointers as an abstract pointer type with `sub_pointer`, `shift`, `same_block`, and `address`, and uses allocation tables with `offset_min` and `offset_max` to define dereference validity (Section 5.1, pp. 6–8). This model catches out-of-bounds accesses while supporting some non-standard C idioms, but its incomplete `address` axiomatization prevents proofs requiring arbitrary cross-block comparison. The paper reports that memmove's remaining VC is exactly such a case (Section 7, p. 13).

Steps:
1. encode each allocation and deallocation in the allocation-table state
2. require `offset_min ≤ 0` and `offset_max ≥ 0` before dereference
3. restrict pointer inequalities to pointers in the same block by adding `sub_pointer(...)` and `same_block(...)` conditions
4. treat unsupported casts, unions, and cross-block comparisons as explicit proof obligations or open failures

Verus form (Inference): prefer slices, references, and ownership-checked indexes. For raw-pointer APIs, define a ghost allocation/validity predicate and prove each offset operation stays in bounds. A Verus proof of memmove would need a model of overlapping ranges and ordering; it cannot assume that arbitrary raw-pointer comparisons are defined.

## technique: logical functions plus ordinary executable contracts

For pure functions such as `strlen`, the authors define a logical function and axioms/lemmas, then also retain ordinary postconditions. The logical function makes specifications of clients such as `strcmp` and `memcpy` concise, while ordinary contracts remain usable by executable-specification tools (Section 6.1, pp. 12–13). Initially, the lemmas were only contradiction-checked; a later branch proved them with auto-active lemma functions (footnote 2, p. 13).

Verus form (Inference): use a `spec fn` for a pure mathematical view and prove lemmas connecting it to the executable function. Keep an `ensures` contract on the executable function when clients need a direct API fact. A `spec fn` is not runtime code, and proof functions are erased; the paper's axiomatic ACSL definitions therefore require explicit Verus lemmas rather than trusted runtime calls.

## technique: normalize verification conditions before solver comparison

The solver experiment applies the same Why3 transformation pipeline to every VC: repeatedly split conjunctions, inline logical symbols, split again, and Skolemize with `introduce_premises` (Section 8.1, p. 15). This controls solver input and makes solver results comparable. Under the stated hardware and limits, the benchmark generated 2,781 VCs. Table 1 reports totals after transformation and successful counts per solver; all VCs except one memmove VC were discharged by at least one solver. CVC4 1.5 discharged the most VCs (2,761/2,781), while Z3 had the lowest average time among successful attempts (0.22 seconds in the table's total row). These are totals for this benchmark and configuration, not general solver rankings.

Verus form (Inference): keep proof obligations small with local assertions and helper lemmas, and expose only the facts needed by the current proof. The exact Why3 transformations do not carry over as a Verus user procedure because Verus generates solver formulas internally.

## what remains trusted, fails, and threatens VL

The proof establishes the stated contracts under AstraVer's C semantics, Jessie memory model, Why3 translation, solver behavior, and trusted toolchain. It does not prove Linux's informal documentation, the C compiler, hardware, or the correctness of axioms and unproved logical lemmas. The 1/26 incomplete memmove result demonstrates a concrete boundary: cross-block pointer comparison and difference exceed the model. Two functions (memset and strcmp) needed explicit casts because implicit overflow could not be marked; ctype macros had to be replaced with inline functions and still could not be proved because solvers could not handle the 256-byte axiomatic array (Section 7, p. 14).

Inference: the threat to VL is high for agent-written low-level Rust when agents preserve unsafe pointer idioms, wrapping arithmetic, or contracts copied from prose. The paper's mitigations suggest a practical VL workflow: derive contracts from source, make wrapping explicit, keep loop invariants and variants close to code, and maintain a benchmark of representative APIs. Rust's ownership removes some C aliasing cases, but raw pointers, FFI, integer casts, and external specifications recreate the paper's trust boundary. VL should not redo this paper's basic benchmark pattern; it should measure the same failure modes on Verus code and track which assumptions remain external.

## techniques for the catalog

- source-derived contracts: extract validity, frame, behavior, and functional postconditions from existing implementations
- loop invariants and variants: preserve pointer, range, and prefix facts while proving termination
- per-operation modulo annotations: distinguish intentional machine wrapping from arithmetic that must not overflow
- region separation: use conservative disjoint heap regions to simplify framing and non-interference
- explicit pointer memory model: encode allocation validity, pointer offsets, and same-block comparison limits
- logical-function specifications: pair pure mathematical views with ordinary executable contracts
- VC normalization: split, inline, and Skolemize obligations before comparable solver runs
Checked 2026-10-13: audit record efremov2018deductive; paper-study comparison complete; gate executed; experiments not rerun
