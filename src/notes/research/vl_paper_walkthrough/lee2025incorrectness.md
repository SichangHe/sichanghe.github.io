# Incorrectness Separation Logic with Arrays and Pointer Arithmetic
(authored by agents unless marked 🧑)
Tag: `lee2025incorrectness`, [paper](http://arxiv.org/abs/2503.00809v1)

## scope and result

The paper extends Incorrectness Separation Logic (ISL) so that under-approximate proofs can describe variable-length arrays and pointer arithmetic. Its target is a concrete C-style error: freeing `array + 1` rather than the head of an allocated block (Introduction, §1.2, pp. 3–4). The abstract states: “Incorrectness Separation Logic (ISL) is a proof system designed to automate verification and detect bugs in programs manipulating heap memories.” It adds array predicates and pointer arithmetic, then proves relative completeness by constructing weakest postconditions. The abstract defines the assumption: “Relative completeness means that all valid ISL triples are provable, assuming an oracle capable of checking entailment between formulas; this property ensures the reliability of the proof system.”

Inference: For VL, the useful idea is an explicit under-approximate bug witness: a postcondition describes states that are definitely reachable through an erroneous exit, rather than every state that might result. This can complement ordinary safety contracts when an agent needs to prove that a bad state is reachable.

## technique 1: block-aware array and pointer model

What it is. Assertions are disjunctions of existential symbolic heaps. Atoms include points-to `t 7→ u`, variable-length positive arrays `arr(t,t')`, negative arrays, written here as `negarr(t,t')`, for consecutive deallocated cells, and arithmetic equalities/inequalities. A state is `(s,h,B)`: store, finite heap, and a set of non-overlapping half-open allocation blocks. The semantics requires live heap addresses to lie in blocks and deallocated addresses to lie outside them (Definition 4, §2.1, pp. 6–8). `b(t)` and `e(t)` return the block's base and end; pointer arithmetic is ordinary term addition. Here `negarr` distinguishes the negative predicate from the positive `arr`; the supplied text extraction renders both identically. Assertions may have countably infinite disjunctions, but symbolic heaps contain no internal `∨`, `∧`, or `¬` (Definition 1, pp. 4–5).

When to use it. Use `arr(p,q)` for a contiguous region whose length is symbolic, and the negative form when a free operation must preserve evidence that cells were deallocated. Use block terms when validity depends on allocation boundaries, such as rejecting an interior free.

How to apply it.
1. Model a heap as exact (the live domain equals the union of blocks) before executing a command (Definition 4, §2.1, p. 7).
2. Describe disjoint regions with separating conjunction `*`; describe pointer ordering with pure `<`, `≤`, and `≈` atoms (Definition 1, §2.1, pp. 4–5).
3. For `free(t)`, require `t = b(t) > 0` for normal deallocation. Replace every cell of that block with the deallocated marker and remove the block. If `t ≠ b(t)` or `b(t) = 0`, the error exit preserves the state (Definition 10, §2.2, p. 10).
4. For `x := [t]` and `[t] := u`, require `b(t)>0`; a null block gives an error result (Definition 10, §2.2, p. 10).

Inference: A Rust verification model could represent owned cells and allocation intervals separately. It would need explicit evidence of deallocation to retain the distinction between live and negative arrays; the paper does not provide such an encoding.

Evidence. The array error example is `int *array = (int *)malloc(10 * sizeof(int));` followed by `free(array + 1);` (Introduction, §1.2, p. 3). The semantics explicitly maps non-head frees to the `er` relation, so the model distinguishes the intended bug from a normal free (Definition 10, p. 10).

Assumptions and limits. The model assumes natural-number values, a distinguished null value, finite heaps, and exact states for program semantics (Definitions 4–6 and 10, pp. 6–10). Inference: C allocator metadata, integer overflow in size arithmetic, and Rust layout details are outside this semantics unless modeled separately.

## technique 2: canonicalize all term orderings before heap rules

What it is. Heap rules require a symbolic heap to be canonical. `cases(T)` enumerates every permutation of terms and every chain of `<` or `≈` relations; `cano(P,C)` conjoins each case with the input assertion. Lemmas 1 and 2 establish equivalence between the original assertion and its case split (Definitions 12–13, §2.3, p. 11).

How to apply it.
1. For each existential symbolic-heap disjunct `∃x̄.ψ` of `P`, rename bound variables away from command terms and collect `termS(ψ) ∪ termC(C)` (Definition 13, p. 11).
2. Enumerate permutations and `<`/`≈` choices in chains starting with `null`: `null R₀ t₁ R₁ … Rₙ₋₁ tₙ`. (Definitions 12–13, p. 11).
3. Add each resulting pure chain to the symbolic heap.
4. Apply the allocation, free, load, or store rule separately to each canonical disjunct; combine conclusions with the infinitary Disj rule (Definition 13 and Fig. 1, pp. 11, 13).

Inference: In a verification tool, the reusable pattern is to expose the relevant ordering cases before proving a heap update. A practical implementation would need to control the number of generated cases.

Evidence. The paper states: “The canonicalization divides into the cases for each possible sequence of strict inequalities and equalities individually to the input symbolic heap.” (§2.3, p. 11). It proves `P ≡ cano(P,C)` (Lemma 2, p. 11), which is the soundness basis for splitting.

Failure mode. Infinitely many disjuncts can arise for loops and infinitary assertions. The conclusion explicitly says this syntax is “not ideally suited for the developing a practical automatic theorem prover” (§6, p. 23). Inference: a VL implementation should bound or compress case generation rather than copy the infinitary presentation literally.

## technique 3: specialized under-approximate heap rules

What it is. The proof system has separate rules for allocation (Alloc 1–5), deallocation (FreeArr 1–4 and FreeEr), loads, and stores (Figs. 2–4, §2.4, pp. 14–16). Allocation splits according to overlap with existing negative arrays and adjusts block terms with `rep`. Deallocation converts the freed block into a negative array and uses replacement `τ` to preserve the old boundary values in the formula. Loads distinguish known points-to values from unspecified array contents; stores split or shorten arrays.

How to apply it.
1. Canonicalize the precondition.
2. For `x := alloc(t)`, choose Alloc 1–5 according to overlap with negative arrays. Rename the old `x` to fresh `x′` using `θ = [x := x′]`, add `arr(x,x+tθ)` and the new block constraints, and existentially hide `x′`. The `rep` operation replaces old `b`/`e` terms for newly allocated addresses with `null`; reused negative regions are removed or shortened (Fig. 2, p. 14).
3. For a normal `free(t)`, choose FreeArr 1–4 according to the block boundaries and the contiguous chain of array/points-to atoms. Introduce fresh end `y`, replace the freed region by `negarr(t,y)`, and preserve any exterior positive-array fragments. Apply `τ`, replacing base terms equal to `b(t)` by `t` and end terms equal to `e(t)` by `y` (Fig. 3, p. 15).
4. For a load from a points-to cell, retain the equality to its stored value after renaming the old assigned variable. For a load from an array, existentially hide the old variable without adding a value equality. For a store, replace a points-to value or use the first/interior/last-cell array case (Fig. 4, p. 16).
5. Use Frame only for `ok` exits, with `mod(C) ∩ termS(frame) = ∅` (Fig. 1, p. 13).

The paper gives a concrete warning: “Regarding the Frame rule, we consider only the ok case. This is because, if we include the er case in the Frame rule, we find that soundness is broken in our setting.” (§2.4, p. 12). Its counterexample shows that framing an `x 7→ 1` cell across an erroneous `free(x)` makes an invalid conclusion.

Inference: A Rust adaptation would need contracts for allocation, deallocation, and preservation of unrelated regions. The paper supplies no Rust or Verus API and does not justify transferring an error proof across an arbitrary frame.

Evidence. Soundness is Theorem 1 (§4, p. 21): every derivable triple is valid. The paper's rules distinguish `ok` and `er`; `FreeEr` returns the original assertion on a non-head or null free (Fig. 3, p. 15).

## technique 4: weakest-postcondition generation and relative completeness

What it is. `WPO[[P,C,ε]]` is the set of exact final states reachable from some state satisfying `P` through exit `ε` (Definition 15, §3, p. 17). `wpo` first canonicalizes `P`, then recursively computes `wposh` using the same command cases as the proof rules (Definition 16, p. 17; Figs. 5–6, pp. 18–19). For loops, it forms the union over all finite iteration counts. Proposition 1 proves expressiveness on exact states: satisfying `wpo` is equivalent to membership in semantic `WPO`. Proposition 2 derives the triple whose postcondition is `wpo`; combining both yields Theorem 2, relative completeness (Section 4, pp. 20–22).

How to apply it.
1. Normalize `P` with `cano(P,C)`.
2. Recurse over command syntax; normal sequence feeds the first result into the second command. An erroneous sequence includes errors in the first command and errors in the second after a normal first exit. Choice disjoins results; `error()` returns `false` for `ok` and the input assertion for `er` (Fig. 5, p. 18).
3. For loops, take the union of zero or more iterations for normal exits and an error postcondition from every finite prefix (Fig. 5, p. 18).
4. For heap commands, invoke the matching array/free/load/store formula in Fig. 6 (p. 19).
5. Prove entailment from a desired `Q` to `wpo(P,C,ε)` and use Cons to obtain `[P] C [ε:Q]` (Theorem 2 proof, p. 22).

Inference: To reuse this result for Rust, one would first need a reachable-state semantics matching the executable memory operations. An ordinary safety contract does not by itself establish the existential predecessor required by an incorrectness triple.

Evidence and trusted boundary. Theorem 1 states soundness and Theorem 2 states relative completeness (p. 21). The abstract assumes an entailment oracle; the conclusion also notes that practical automation is limited by infinitary syntax and complex heap postconditions (§6, p. 23). Inference: a Rust adaptation could misstate reachability if its specifications omit allocator behavior; the paper supplies a logical design without a Rust evaluation.

## what is proved, measured, and already done

The paper proves semantic soundness, expressiveness of `wpo`, and relative completeness. It reports no implementation benchmark or denominator-based empirical measurement. Relative completeness assumes an entailment oracle; soundness is proved with respect to the defined state and command semantics. Inference: VL could reuse the distinction between normal and erroneous exits and the array-boundary case analysis. Applying the completeness theorem would require checking that the chosen assertion language and command semantics match its assumptions. Existing work already handled points-to and negative heaps; this paper adds variable-length arrays and arithmetic (Introduction, §1.2, pp. 3–4; Related Work, §5.2, pp. 22–23). Inference: the main product threat is specification mismatch and proof complexity, not an automated exploit demonstrated by this paper.

## techniques for the catalog

- variable-length array and block model — represent contiguous live and deallocated regions with `arr`, negative arrays, and explicit allocation blocks

- canonical ordering split — enumerate all term orderings and equalities before applying heap rules

- boundary-sensitive heap rules — handle alloc/free/load/store by splitting arrays and updating block endpoints

- weakest-postcondition completeness — generate exact under-approximate postconditions and use entailment to derive all valid triples
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We acknowledge that this complexity is a trade-off made to achieve simpler proofs for relative completeness."): read the complete paper, including Appendices A–D; checked quotations, metadata, page and section references, semantics, rule steps, and theorem statements; corrected negative-array notation, free prerequisites, allocation overlap and substitution, load results, canonicalization, sequence/error generation, quotation punctuation, and page references; removed unsupported Verus claims; did not independently re-prove the theorems or validate a Rust implementation.
