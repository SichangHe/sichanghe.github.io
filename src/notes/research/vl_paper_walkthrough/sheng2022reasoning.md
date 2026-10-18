# Reasoning About Vectors using an SMT Theory of Sequences
(authored by agents unless marked 🧑)
Tag: `sheng2022reasoning`, [paper](http://arxiv.org/abs/2205.08095v2)


## problem and result

Dynamic arrays need a solver model that exposes their changing length and supports reads, updates, concatenation, extraction, and equality. The paper's abstract states: “The theory of arrays is widely supported but is not ideal, because the number of elements is fixed (determined by its index sort) and cannot be adjusted” (Abstract, p. 1). It introduces a native theory of sequences, a basic calculus adapted from string solving, and an extended calculus that adds array-style read/update reasoning. Both variants are implemented in cvc5.

The target logic is quantifier-free formulas over sequences, integers, and arbitrary element sorts. The authors deliberately do not claim a decision procedure: “Since the decidability of even weaker theories is unknown ... we do not aim for a decision procedure” (Introduction, p. 2). Their soundness claim is conditional on termination: a closed derivation proves unsatisfiability, while a saturated configuration yields a model.

## technique 1: encode vectors directly as sequences

What it is. A vector is a term of sort `Seq`; length is `|s|`, indexing is `nth(s,i)`, concatenation is `s ++ t`, and update is `update(s,i,a)`. In the paper's array encoding of the same example (Example 1, p. 5), this role is played by an uninterpreted vector sort, auxiliary length/content functions, and quantified axioms; the paper says that encoding "introduces auxiliary symbols, and it uses quantifiers, thus reducing clarity and efficiency" (Section 3.1, p. 5).

When to use it. Inference: use this encoding for verification conditions involving variable-length vectors, especially when specifications mention length, indexed reads, or updates. The paper's `swap` example specifies that in-bounds equal elements leave a vector unchanged. The sequence encoding uses variables `a,b,i,j:Int` and `s,sout:Seq`, constraints `a = nth(s,i)`, `b = nth(s,j)`, `sout = update(update(s,i,b),j,a)`, and specification `0 ≤ i,j < |s| ∧ nth(s,i) = nth(s,j)` (Section 3.1, pp. 4–6; Figure 2, p. 6).

How to apply it.

1. Create two sequence terms for pre-state and post-state (`s` and `sout`) (Section 3.1, p. 5).
2. Translate each read to `nth` and each write to nested `update` (Figure 2, p. 6).
3. Translate bounds to integer inequalities over `|s|` and negate the desired postcondition (Section 3.1, p. 5; Figure 2, p. 6).
4. Ask the sequence solver whether the conjunction is unsatisfiable. Unsatisfiability entails that the code meets the encoded specification (Section 3.1, p. 5).

The array alternative in the paper declares an uninterpreted vector sort `V`, functions for length and contents, and axioms for vector equality and update. The sequence alternative needs no such axioms: “No auxiliary sorts or functions are needed, as the theory symbols can be used directly” (Example 2, p. 5).

Verus form. Inference (the Verus details here come from the study author, not from the paper, and were not checked against it): represent a Rust `Vec<T>` abstraction with a Verus sequence (`Seq<T>`) in a ghost/specification field or `spec fn`, and state length and element relationships with `s.len()` and `s[i]` where supported by the Verus sequence API. Use `requires` for index bounds and `ensures` to relate pre-state and post-state with `old(s)` and sequence updates. The paper's solver calculus is not Verus syntax; executable `Vec` mutation still needs a refinement invariant connecting concrete storage to the ghost sequence. Inference: this connection is the main additional proof work when carrying the encoding into Verus.

Evidence and limits. The paper does not report a standalone proof of the `swap` program in Rust; it reports that the sequence formula is unsatisfiable in the sequence theory. The model's `Elem` sort is arbitrary, and `nth` is only constrained where its index is defined (Section 3, p. 4). Inference: users must state bounds and update behavior explicitly; an omitted bound can make an apparently correct property vacuous or permit an out-of-bounds model.

## technique 2: the BASE and EXT calculi

What it is. The BASE calculus saturates sequence and arithmetic constraints using propagation, length introduction/validation, concatenation splitting, congruence, disequality extensionality, and reductions for `extract`, `nth`, and `update`. The EXT calculus adds rules for array-like reasoning: distributing reads and updates over concatenations or unit sequences, introducing bounds, matching reads to updates, and splitting reads with equivalent indices (Section 4, pp. 5–14; Section 5, pp. 14–15).

How to apply it.

1. Flatten a quantifier-free formula into a disjunction of conjunctions, then separate each conjunction into sequence constraints `S` and arithmetic constraints `A` (Lemma 1, Appendix A.1, p. 20).
2. Add length constraints for sequence terms and enforce non-negativity or positivity for variables as required by the saturation assumptions (Assumption 1, p. 7; rules L-Intro and L-Valid, Figure 4, p. 10).
3. Reduce compound terms to normal forms and propagate equalities between sequence and arithmetic theories; use congruence closure for equal sequence terms (Definition 6, p. 8; Figures 4–5, pp. 10–11).
4. Split ambiguous concatenation equalities with `C-Split`; use extensionality for disequalities and reduction rules for `extract`, `nth`, and `update` (Section 4.1, pp. 9–11; in EXT the `nth` and `update` reductions of Figure 5 are replaced by the rules of Figure 6, Section 4.2, pp. 11–12).
5. For EXT, distribute `update` and `nth` over concatenations, handle unit terms, add read/update bounds, match reads to updates, and split reads with equal indices (Figure 6, p. 13; Section 5, p. 15).
6. Return `unsat` when every branch closes. Otherwise, if a branch is saturated, construct a satisfying model using arithmetic values, sequence lengths, unit elements, and equivalent concatenations (Section 4.3, pp. 12–14; full construction in Appendix A.5, pp. 23–26).

The implementation runs inside cvc5's CDCL(T) architecture. The SAT solver proposes literals; cvc5 partitions them into `A` and `S`; the sequence solver applies one rule, returns to SAT, and restarts the priority list. The EXT priority order is printed as nine steps in Section 5 (p. 15), beginning with length constraints and ending with theory combination.

Verus form. Inference: Verus already lowers specifications to SMT obligations, so a sequence-aware backend could reduce the need for quantified vector axioms if Verus's `Seq` operations are translated directly. A Verus user can approximate the paper's decomposition manually with lemmas about sequence concatenation, indexing, and update, and use `assert`/`assert forall` only where the API supports them. The paper's `C-Split`, saturation state, and model construction are solver internals; they cannot be written as Verus proof functions and run at runtime. Inference: a backend change, rather than a library-only Verus annotation pattern, is required to obtain the paper's automation.

Limits. `C-Split` can fail to terminate on cyclic sequence constraints. The implementation detects some cycles, avoids splitting in those cases, and may return `unknown` (Section 5, p. 15). The calculi are sound when they terminate, but the paper does not claim completeness for all formulas.

## technique 3: cvc5 implementation and benchmark method

The implementation extends a string solver. Arithmetic conflicts use cvc5's linear integer arithmetic solver; sequence equalities use congruence closure; theory combination propagates shared arithmetic terms. Extended operators such as containment, replacement, reverse, and sequence-valued update are reduced using rules analogous to Figure 5 (Section 5, pp. 14–16).

The evaluation compares base cvc5, extended cvc5-a, and Z3 4.8.14. The ARRAYS benchmarks are derived from SMT-LIB QF_AX by replacing arrays with sequences of uninterpreted sorts, `store` with `update`, and `select` with `nth`; for Z3 the authors add a definition of `update` in terms of extraction and concatenation. The DIEM benchmarks are verification conditions from the Move Prover on Diem smart contracts; Z3 ran on the default encoding without `update`, while cvc5 ran on a modified encoding that uses `update`, and the benchmarks also use quantifiers and datatypes (Section 6, p. 16). Each solver-benchmark pair received one physical Intel Xeon E5-2620 v4 core, 8 GB RAM, and a 300-second limit (Section 6, p. 16). The ARRAYS set has 551 translated benchmarks: cvc5 solved 242, cvc5-a 390, and Z3 170; on commonly solved instances, total times were 162, 303, and 4329 seconds, respectively (Figure 7a, p. 17). The DIEM set has 558 smart-contract verification conditions: cvc5 solved 542, cvc5-a 547, and Z3 443; corresponding total times were 518, 440, and 639 seconds (Figure 7a, p. 17). For the 242 instances solved by both cvc5 variants, the paper reports cvc5-a as about 2.47× faster, 426 versus 1053 seconds (Section 6, p. 17).

On ARRAYS the paper notes that cvc5-a is slower than cvc5 on the commonly solved instances (303 versus 162 seconds): "This is not too surprising, as the extra machinery of the extended solver can sometimes slow down easy problems" (Section 6, p. 17). The numbers have different denominators: solved counts use all 551 or 558 benchmarks, while total times use the commonly solved subset. The paper also says translated array benchmarks are not equisatisfiable with originals because sequences model out-of-bounds cases (Section 6, p. 16). Inference: these results support an SMT encoding choice for vector-heavy verification conditions, but they do not establish that Verus programs become faster without measuring Verus's own translation and proof corpus.

## what is proved, measured, and trusted

The formal result is soundness of BASE and EXT and model construction from a saturated configuration (Theorem 1, Section 4.3, p. 12); the proofs are on paper in the appendix (pp. 20–36), and the paper reports no mechanized proof. The implementation and benchmark results measure solver behavior under a fixed machine, memory, and timeout setting. Inference: the soundness theorem is about the calculi, so trust also extends to cvc5's implementation of them, its SAT and arithmetic solvers, and the correctness of the verification-condition encoding. Inference: a Verus integration would additionally trust the Rust-to-sequence abstraction and the refinement invariant between a concrete vector and its ghost sequence.

Inference: threat to a product producing agent-written verified Rust is indirect but material. Vector specifications are common, and quantifier-heavy array models are a likely automation bottleneck. A native sequence theory could improve proof throughput and counterexample quality. It does not address ownership, aliasing, unsafe code, concurrency, or whether a vector specification captures the intended behavior.

## techniques for the catalog

- sequence vector encoding — model dynamic vectors with native length, indexing, concatenation, and update terms
- BASE sequence calculus — saturate sequence/arithmetic constraints with normal forms, propagation, splitting, and reductions
- EXT array-style calculus — add read/update distribution, bounds, and matching rules for vector operations
- solver integration and evaluation — schedule rules in cvc5 CDCL(T) and compare solved counts and common-instance time
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Whenever a rule is applied, the strategy will restart from the beginning in the next iteration."): I read the whole paper text (main text, references, and appendix proofs) and the whole study; checked every quotation word for word, the Figure 7a numbers (551/558 benchmark totals, solved counts, common-instance times), the 242-instance 2.47x comparison (426 vs 1053 s), the Z3 version and machine setup, the nine-step EXT strategy, the rule descriptions, the Example 1 and 2 encodings, and the section, figure and page references. Changed: corrected page references (Figure 2 is on p. 6, Figure 7a on p. 17, Section 4 spans pp. 5-14, Figures 4-5 on pp. 10-11) and added Figure 6, Assumption 1, Definition 6 and appendix pointers; replaced an unsupported claim that the array encoding must model out-of-bounds behavior separately with a quote from Section 3.1; added the paper note that cvc5-a is slower on commonly solved ARRAYS instances and how the ARRAYS and DIEM benchmarks were built and which encoding each solver ran; labeled the "when to use" advice, the trusted-components list, and the Verus statements as Inference. Did not check: the appendix proofs for correctness (read, not verified), the Verus claims (not from the paper), the external benchmark artifact, or any cited work. The link is the arXiv identifier printed on the paper text (arXiv:2205.08095v2).
