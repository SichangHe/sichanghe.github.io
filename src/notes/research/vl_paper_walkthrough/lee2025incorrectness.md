# Incorrectness Separation Logic with Arrays and Pointer Arithmetic
(authored by agents unless marked 🧑)
Tag: `lee2025incorrectness`, [paper](http://arxiv.org/abs/2503.00809v1)

## scope and result

The paper extends Incorrectness Separation Logic (ISL) so that under-approximate proofs can describe variable-length arrays and pointer arithmetic. Its target is a concrete C-style error: freeing `array + 1` rather than the head of an allocated block (Introduction, §1.2, pp. 3–4). The abstract states: “Incorrectness Separation Logic (ISL) is a proof system designed to automate verification and detect bugs in programs manipulating heap memories.” It adds array predicates and pointer arithmetic, then proves relative completeness by constructing weakest postconditions. The paper defines relative completeness as completeness assuming an oracle for entailment; this leaves entailment checking trusted.

Inference: For VL, the useful idea is an explicit under-approximate bug witness: a postcondition describes states that are definitely reachable through an erroneous exit, rather than every state that might result. This can complement ordinary safety contracts when an agent needs to prove that a bad state is reachable.

## technique 1: block-aware array and pointer model

What it is. Assertions are disjunctions of existential symbolic heaps. Atoms include points-to `t 7→ u`, variable-length positive arrays `arr(t,t')`, negative arrays `arr(t,t')` for sequential deallocated cells, and arithmetic equalities/inequalities. A state is `(s,h,B)`: store, finite heap, and a set of non-overlapping half-open allocation blocks. The semantics requires live heap addresses to lie in blocks and deallocated addresses to lie outside them (Definition 4, §2.1, pp. 6–8). `b(t)` and `e(t)` return the block's base and end; pointer arithmetic is ordinary term addition. The paper says: “The negative array predicates (arr(t, t′ )) represent a set of consecutive negative heaps with sequential addresses.”

When to use it. Use `arr(p,q)` for a contiguous region whose length is symbolic, and the negative form when a free operation must preserve evidence that cells were deallocated. Use block terms when validity depends on allocation boundaries, such as rejecting an interior free.

How to apply it.
1. Model a heap as exact (the live domain equals the union of blocks) before executing a command (Definition 4, §2.1, p. 7).
2. Describe disjoint regions with separating conjunction `*`; describe pointer ordering with pure `<`, `≤`, and `≈` atoms (Definition 1, §2.1, pp. 4–5).
3. For `free(t)`, require `t` to equal `b(t)` for normal deallocation; otherwise use the error exit (Definition 10, §2.2, p. 10).
4. For `x := [t]` and `[t] := u`, require `b(t)>0`; a null block gives an error result (Definition 10, §2.2, p. 10).

Inference: A Verus encoding would use a sequence or map model for the owned cells, an abstract block interval, and `requires`/`ensures` on executable functions. Ownership and `Tracked` permissions can represent disjoint regions; `proof fn` lemmas can relate an index to the block base. The paper's `arr` and negative heaps are logical predicates, so their exact representation in Rust is a modeling choice rather than a direct translation.

Evidence. The array error example is `int *array = (int *)malloc(10 * sizeof(int));` followed by `free(array + 1);` (Introduction, §1.2, p. 3). The semantics explicitly maps non-head frees to the `er` relation, so the model distinguishes the intended bug from a normal free (Definition 10, p. 10).

Assumptions and limits. The model assumes natural-number values, a distinguished null value, finite heaps, and exact input states (Definitions 4–6, pp. 6–8). Inference: C allocator metadata, integer overflow in size arithmetic, and Rust layout details are outside this semantics unless modeled separately.

## technique 2: canonicalize all term orderings before heap rules

What it is. Heap rules require a symbolic heap to be canonical. `cases(T)` enumerates every permutation of terms and every chain of `<` or `≈` relations; `cano(P,C)` conjoins each case with the input assertion. Lemmas 1 and 2 establish equivalence between the original assertion and its case split (Definitions 12–13, §2.3, pp. 10–11).

How to apply it.
1. Collect terms from the assertion and command (`termS(P) ∪ termC(C)`).
2. Enumerate permutations and relation choices in `cases(T)`.
3. Add each resulting pure chain to the symbolic heap.
4. Apply the allocation, free, load, or store rule separately to each canonical disjunct; combine conclusions with the infinitary Disj rule (Definition 13 and Fig. 1, pp. 11, 13).

Inference: In Verus, this is a proof-lemma pattern: expose ordering cases with `if`/`match` in proof code, then call arithmetic lemmas for each branch. Verus `requires` and `ensures` state the branch facts; `assert` and `assert forall` can discharge simple order consequences. There is no direct `cases` operator in the cited Verus material, so an implementation must generate finite case lemmas or use solver-supported arithmetic.

Evidence. The paper states: “The canonicalization divides into the cases for each possible sequence of strict inequalities and equalities individually to the input symbolic heap” (§2.3, p. 11). It proves `P ≡ cano(P,C)` (Lemma 2, p. 11), which is the soundness basis for splitting.

Failure mode. Infinitely many disjuncts can arise for loops and infinitary assertions. The conclusion explicitly says this syntax is “not ideally suited for the developing a practical automatic theorem prover” (§6, p. 23). Inference: a VL implementation should bound or compress case generation rather than copy the infinitary presentation literally.

## technique 3: specialized under-approximate heap rules

What it is. The proof system has separate rules for allocation (Alloc 1–5), deallocation (FreeArr 1–4 and FreeEr), loads, and stores (Figs. 2–4, §§2.4, pp. 14–16). Allocation splits according to where a newly allocated interval lies relative to existing arrays and updates `b`/`e` terms with `rep`; free splits the array at the freed address and uses replacement `τ` to update block boundaries. Loads preserve an array predicate when the index is inside it; stores split an array into prefix, singleton, and suffix.

How to apply it.
1. Canonicalize the precondition.
2. For `alloc(t)`, select the ordering case and one of Alloc 1–5, introduce a fresh existential old value for the assigned variable, add `arr(x,x+t)`, and replace block terms for newly allocated locations (Fig. 2, p. 14).
3. For `free(t)`, prove that `t` is the block base and choose the matching boundary case; split `arr` around `t`, introduce a fresh end `y`, and apply `τ` (Fig. 3, p. 15).
4. For a load, match either a points-to cell or an enclosing array and produce the corresponding value fact; for a store, split or shorten the enclosing array (Fig. 4, p. 16).
5. Use Frame only for `ok` exits, with `mod(C)` disjoint from framed terms.

The paper gives a concrete warning: “Regarding the Frame rule, we consider only the ok case. This is because, if we include the er case in the Frame rule, we find that soundness is broken in our setting” (§2.4, p. 12). Its counterexample shows that framing an `x 7→ 1` cell across an erroneous `free(x)` makes an invalid conclusion.

Inference: In Verus, executable allocation/free would be wrapped in trusted or specified APIs; the proof-facing function would carry `requires` ownership and `ensures` slice/map partition facts. A store proof would update a sequence at one index and re-establish prefix/suffix invariants. Verus has no `modifies` construct in the supplied reference, so frame stability should be stated as unchanged fields in `ensures` or proved by ownership separation.

Evidence. Soundness is Theorem 1 (§4, p. 21): every derivable triple is valid. The paper's rules distinguish `ok` and `er`; `FreeEr` returns the original assertion on a non-head or null free (Fig. 3, p. 15).

## technique 4: weakest-postcondition generation and relative completeness

What it is. `WPO[[P,C,ε]]` is the set of exact final states reachable from some state satisfying `P` through exit `ε` (Definition 15, §3, p. 17). `wpo` first canonicalizes `P`, then recursively computes `wposh` using the same command cases as the proof rules (Definition 16, p. 17; Figs. 5–6, pp. 18–19). For loops, it forms the union over all finite iteration counts. Proposition 1 proves expressiveness: satisfying `wpo` is equivalent to membership in semantic `WPO`. Proposition 2 derives the triple whose postcondition is `wpo`; combining both yields Theorem 2, relative completeness (Section 4, pp. 20–22).

How to apply it.
1. Normalize `P` with `cano(P,C)`.
2. Recurse over command syntax; sequence composes the first postcondition with the second, choice disjoins, and error swaps `ok`/`er` outcomes (Fig. 5, p. 18).
3. For loops, take the union of zero or more iterations for normal exits and an error postcondition from every finite prefix (Fig. 5, p. 18).
4. For heap commands, invoke the matching array/free/load/store formula in Fig. 6 (pp. 19–20).
5. Prove entailment from a desired `Q` to `wpo(P,C,ε)` and use Cons to obtain `[P] C [ε:Q]` (Theorem 2 proof, p. 22).

Inference: In Verus, the analogous workflow is to write a function contract, establish a loop `invariant`, and prove each branch's postcondition with `assert`/lemmas. A `spec fn` can define a mathematical reachable-state predicate; a `proof fn` can show the implementation's postcondition entails it. Verus's solver and supplied lemmas discharge arithmetic, but the paper's entailment oracle remains an assumption unless independently verified.

Evidence and trusted boundary. Theorem 1 states soundness and Theorem 2 states relative completeness (p. 21). Relative means entailment checking is assumed; the conclusion also notes that practical automation is limited by infinitary syntax and complex heap postconditions (§6, p. 23). Inference: for agent-written verified Rust, the threat is high when generated specifications omit allocator behavior or when entailment/solver assumptions are trusted; the paper supplies a logical design, not an implementation or Rust evaluation.

## what is proved, measured, and already done

The paper proves semantic soundness, expressiveness of `wpo`, and relative completeness. It reports no implementation benchmark or denominator-based empirical measurement. The trusted components are the entailment oracle, the mathematical state model, and the proof of the underlying logic. Inference: VL should reuse the paper's separation between normal and erroneous exits and its array-boundary case analysis, but should not redo a new logical completeness theorem unless it changes the Rust memory model. Existing work already handled points-to and negative heaps; this paper adds variable-length arrays and arithmetic (Introduction, §1.2, pp. 3–4; Related Work, §5.2, pp. 22–23). Inference: the main product threat is specification mismatch and proof complexity, not an automated exploit demonstrated by this paper.

## techniques for the catalog

- variable-length array and block model — represent contiguous live and deallocated regions with `arr`, negative arrays, and explicit allocation blocks

- canonical ordering split — enumerate all term orderings and equalities before applying heap rules

- boundary-sensitive heap rules — handle alloc/free/load/store by splitting arrays and updating block endpoints

- weakest-postcondition completeness — generate exact under-approximate postconditions and use entailment to derive all valid triples
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
