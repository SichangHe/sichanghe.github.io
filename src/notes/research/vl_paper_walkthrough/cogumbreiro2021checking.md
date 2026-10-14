# Checking Data-Race Freedom of GPU Kernels, Compositionally
(authored by agents unless marked 🧑)
Tag: `cogumbreiro2021checking`, [paper](https://www.semanticscholar.org/paper/07563462d4609541723c93bfdc068a80b538eec2)

## scope and result

This paper presents Faial, a static analyzer for CUDA kernels. Its central abstraction is an access memory protocol, a behavioral type describing accesses to one shared-memory location while abstracting away the values stored. The abstract says: “Our work includes fully mechanized proofs of our theoretical results, the first mechanized proofs in the field of DRF analysis for GPU kernels.” (Abstract, p. 403). The analysis is compositional, does not require array-size information or user loop invariants, and reduces the final checks to SMT formulas.

The GPU model is SIMT: threads execute one kernel with distinct `tid` values, communicate through shared arrays, and use barriers; writes become visible after a barrier (Section 2.1, p. 405). A race is two different threads accessing the same array index with at least one write (Definition 1, p. 411). Protocol inference is the only approximation: “Thus, the only source of approximation in our analysis stems from the inference of protocols from CUDA kernels.” (Section 4.2, p. 414).

## technique 1: access memory protocols and exact DRF semantics

What it is. A protocol records reads and writes to one shared location. Unsynchronized fragments `u` prohibit barriers; synchronized fragments `p` must include barriers. Evaluating an unsynchronized fragment yields a phase, a set of accesses. Evaluating a synchronized fragment yields a history, a list of phases; a barrier creates empty phases before and after synchronization, while sequencing merges adjacent phases that can execute concurrently (Section 3, pp. 409–411).

When to use it. Use this abstraction when the property concerns concurrent access conflicts and exact data values are irrelevant. It exposes which thread/index pairs may overlap and makes barrier causality explicit. It is unsuitable when correctness depends on the value read or written, because the protocol intentionally forgets values.

How to apply it.
1. Slice the kernel to accesses to one shared array and represent each read/write as `rd[index]` or `wr[index]` (Sections 2.2–3, pp. 406–410).
2. Instantiate `tid` with each symbolic thread identifier and evaluate loops over their integer ranges (Section 3, p. 409).
3. Form phases for unsynchronized code and histories for synchronized code, merging accesses that can occur in the same phase (Section 3, pp. 409–411).
4. Mark a phase safe when no pair of accesses from distinct threads targets the same index with a write; mark a history safe when every phase is safe (Definition 1, p. 411).
5. Declare the protocol DRF exactly when its evaluated history is safe (Definition 1, p. 411).

The paper's representative unsynchronized formula quantifies loop indices and distinct threads: `∀j1, i1, j2, i2 ... ==> ... DRF with? ...`; it rejects the protocol when `rd[t1+j1]` can overlap `wr[t2]` (Section 2.2, p. 407). Its synchronized example similarly finds a race between iterations `r=1`, `t1=0`, `t2=1`, `j1=1`, with `N>1` and `M>1` (Section 2.2, pp. 407–409).

Verus form. Inference: define an enum for `rd`/`wr`, a ghost access record `(thread,index,mode)`, and `spec fn safe_phase` that forbids conflicting pairs. Use `requires`/`ensures` on proof functions for each protocol evaluator and `while` invariants for loop bounds. Inference: this protocol layer can be verified in Verus, but it cannot prove value-dependent functional properties that the abstraction erases.

Evidence and limits. The protocol semantics, well-formedness, and race definitions are mechanized in Coq (Sections 3–4, pp. 409–414). Well-formedness requires structural conditions, free variables only `{tid}`, and synchronized loops that execute at least once (Definition 1, p. 411). These assumptions must be checked or enforced by the implementation.

## technique 2: barrier aligning for synchronized loops

What it is. Synchronized loops can race across iterations because an access in iteration `r` may overlap one in `r+1`. The syntax-directed `align : W -> A × U` transformation normalizes a well-formed protocol into an aligned synchronized part plus a trailing unsynchronized part (Section 4.1, pp. 411–412). In the paper's matrix example, code before the first barrier remains outside the aligned loop, code after the barrier moves to the beginning of the aligned loop, and the final iteration's trailing code becomes an unsynchronized suffix (Listing 2.3 and its aligned form, p. 408).

When to use it. Apply aligning before compositional analysis whenever a protocol contains synchronized loops whose barriers do not occur exactly before the loop and at the end of its body. It prevents accesses from leaking between iterations while preserving race behavior.

How to apply it.
1. Classify every loop as synchronized or unsynchronized according to whether its body contains `sync`, and reject malformed combinations (Sections 3 and 5, pp. 409, 415–416).
2. Recursively apply `align` to sequences. For a synchronized loop `u1; forS x in n..m {p;u2}`, emit the first iteration's prefix, an aligned loop from `n+1` to `m`, and the final iteration's `u2` suffix (Figure 3, p. 412).
3. Use the sequencing operator to append unsynchronized fragments to the outermost position of the following aligned protocol (Figure 3, p. 412).
4. Analyze the resulting `q;u` protocol. Theorem 1 states: “If p ∈ W and align(p) = (q, u), then p is DRF if and only if q; u is DRF.” (Section 4.1, p. 412).

Verus form. Inference: represent protocol syntax as a ghost AST and implement `align` as a `spec fn` returning an aligned/suffix pair. Prove semantic preservation with a lemma whose `ensures` equates the original and transformed safety predicates. Inference: the loop-unrolling argument relies on the paper's non-empty synchronized-loop precondition; a Verus proof must preserve that precondition in the loop invariant.

## technique 3: split aligned protocols into symbolic traces

What it is. After aligning, `split : A -> [L]` creates symbolic traces for fragments between barriers. A trace has accesses, sequencing, and integer-range binders. `trace` extracts one-thread behavior from unsynchronized code; `split` introduces two fresh symbolic thread variables for each unsynchronized fragment and reinterprets synchronized loops as binders (Section 4.2, pp. 413–414).

How to apply it.
1. For each aligned fragment `u; sync`, create fresh distinct thread variables `t1,t2`, bind their ranges, and concatenate `trace(u)[tid:=t1]` and `trace(u)[tid:=t2]` (Figure 4, p. 413).
2. For an aligned synchronized loop, bind the loop variable over its range and recursively split the body (Figure 4, p. 413).
3. Evaluate each trace to a history by taking the product of histories for sequencing and enumerating binder assignments (Section 4.2, pp. 413–414).
4. Check each resulting history for safe phases with the race predicate. Theorem 3 states that the original aligned history is safe iff the histories generated by `split` are safe (Section 4.2, p. 414).

The method is compositional because each trace can be checked independently. Splitting can grow exponentially with nested synchronized loops, although the authors report that this did not pose practical problems (Section 4.2, p. 414).

Verus form. Inference: encode traces as ghost sequences and use quantified proof functions to show that every pair of distinct thread bindings has distinct indices whenever a write is present. Use `forall`-style quantified assertions supported by the Verus specification subset, with arithmetic lemmas for bounds. Inference: if quantifier instantiation becomes difficult, preserve the paper's trace decomposition but discharge each trace using a solver-backed lemma rather than runtime code.

## technique 4: infer protocols, enforce well-formedness, and quantify to SMT

Implementation pipeline. Faial parses CUDA with libclang, converts code to SSA, and slices away code unrelated to shared-array accesses (Section 5, p. 415). It normalizes non-unit loops by changing the stride to one and guarding the body with a divisibility test; power-of-`n` loops use a `powerof` guard. It inlines annotated shared-memory helper calls and discards calls that do not access shared memory. Recursive functions are unsupported (Section 5, p. 415).

Faial tags loops and conditionals as synchronized or unsynchronized, groups sequencing around barriers, rejects synchronized loops that manipulate thread-local `tid`, and inserts assertions that synchronized-loop ranges are non-empty. It duplicates synchronized conditionals with global assertions for each branch; synchronized conditionals inside synchronized loops are unsupported (Section 5, pp. 415–416).

Quantification translates each symbolic trace into QF_LIA SMT constraints. The generated formula requires the indices of two distinct threads to differ whenever one access is a write; multidimensional arrays generate one index pair per dimension and require at least one pair to differ (Section 5, p. 416). The implementation uses SMT-LIB QF_LIA even though multiplication can make the logic undecidable (Section 5, p. 416).

Verus form. Inference: a Verus front end could produce the same ghost protocol AST from Rust array accesses, with proof functions checking well-formedness and `assert` statements exposing the final arithmetic obligations. Verus's `requires` can encode non-empty loop ranges and synchronization preconditions; `ensures` can state that each generated access pair satisfies `safe_phase`. Inference: the paper's use of an external SMT solver and its QF_LIA status are trust-boundary choices; a Verus deployment must document whether solver results are checked by Verus and which arithmetic axioms are trusted.

## evidence from experiments

Claim 1 used five tests, each with one racy and one DRF variation, on an Intel i5-6500 with 7.7 GB RAM and a 90-second timeout (Section 6, Table 1, pp. 416–418). Faial passed 4 of 5 tests; GPUVerify passed 1/5; PUG, GKLEE, and SESA passed 0/5. Faial's only failure was Test 5, where protocol abstraction caused one spurious race (`0/1` actual races), because the protocol omits array-element data (Section 6, pp. 417–418). These are counts over five tests, not percentages of all kernels.

Claim 2 generated five categories of DRF synthetic kernels, repeating each pattern from size 1 to 50 and averaging five runs; each run had a 90-second timeout, and timed-out or false-alarm runs were excluded (Section 6, pp. 418–419). Faial verified all tests within 0.46 s and was the only tool with near-constant time/memory through 50 unsynchronized loops. It timed out only above 17 nested synchronized loops; real-world kernels in Claim 3 had at most three such levels (Section 6, p. 419). The paper reports growth curves rather than a single aggregate percentage.

Claim 3 used 227 real-world DRF CUDA kernels: 8 from NVIDIA SDK 2.0, 166 from NVIDIA SDK 5.0, 20 Microsoft C++ AMP samples, and 33 gpgpu-sim benchmarks (Section 6, pp. 420–421). On this denominator, Faial was correct on 218/227 (96.0%), false-alarm on 9/227 (4.0%), unsupported on 0/227, and timed out on 0/227. GPUVerify was correct on 153/227 (67.4%), false-alarm on 47/227 (20.7%), unsupported on 1/227 (0.4%), and timed out on 26/227 (11.5%). PUG was correct on 79/227 (34.8%), false-alarm on 6/227 (2.6%), unsupported on 142/227 (62.6%), and timed out on 0/227. The percentages match the displayed counts after rounding. All kernels had been preprocessed with minimal preconditions; 22 had array-function calls inlined and 8 had control flow simplified (Section 6, p. 421).

## evidence boundary and implications for VL

Proved: protocol semantics, well-formedness transformations, alignment correctness (Theorem 1), compositionality (Theorem 2), splitting correctness (Theorem 3), and the DRF checker in mechanized Coq (Sections 3–4). Measured: the benchmark counts, runtimes, memory curves, and real-world rates above. Trusted or assumed: CUDA's barrier visibility model, the kernel front end and its protocol inference, unsupported-feature checks, the arithmetic solver, and the abstraction that drops read/write values and array-element identity.

Inference: for VeruLaw, the transferable design is a staged proof pipeline: normalize concurrency syntax, split at synchronization boundaries, and reduce each fragment to explicit relational obligations. The main product threat is abstraction mismatch: a protocol can report a spurious race or miss a bug if the front end loses index or value information. Inference: VL should retain exact index expressions and make every abstraction boundary explicit in the verified Rust specification. Existing work already gives mechanized alignment and splitting theorems; VL should reuse the proof architecture rather than rebuild an ad hoc race checker.

## techniques for the catalog

- access memory protocols: model each shared location's thread-indexed reads and writes as synchronized or unsynchronized behavioral types
- barrier aligning: normalize synchronized loops so barriers delimit iterations, preserving and reflecting DRF
- symbolic trace splitting: split aligned barrier intervals into independently checkable traces with quantified thread and loop variables
- SMT DRF reduction: translate traces to quantified index/mode constraints and require distinct indices whenever a write is present
- front-end well-formedness: infer protocols from SSA-sliced CUDA, normalize loops, and reject unsupported synchronization forms
Checked 2026-10-14: audit record cogumbreiro2021checking; paper-study comparison complete; gate executed; experiments not rerun
