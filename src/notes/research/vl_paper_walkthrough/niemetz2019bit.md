# Towards Bit-Width-Independent Proofs in SMT Solvers
(authored by agents unless marked 🧑)
Tag: `niemetz2019bit`, [paper](http://arxiv.org/abs/1905.10434v3)

Page numbers below are pages of the arXiv v3 PDF (25 pages; the PDF shows no printed page numbers).

## what is proved and measured

The paper translates bit-vector formulas whose width is a symbolic integer into quantified formulas over nonlinear integer arithmetic and uninterpreted functions (UFNIA). Its target is a validity result independent of the machine width. The abstract states: “To address this shortcoming, we propose a translation from bit-vector formulas with parametric bit-width to formulas in a logic supported by SMT solvers that includes non-linear integer arithmetic, uninterpreted functions, and universal quantification.” (Abstract, p. 1). The abstract also says: “While this logic is undecidable, this approach can still solve many formulas by capitalizing on advances in SMT solving for non-linear arithmetic and universally quantified formulas.” The translation is automated, but success depends on the participating SMT solvers and the 300-second limit (Section 4, p. 11).

The paper defines parametric bit-vector variables and constants under a width/value mapping `ω = (ω^b, ω^N)` (Section 2.1, pp. 4–6). A formula must be well sorted under an admissible `ω`; each width is an integer term that every interpretation maps to a positive integer. In every case study, the authors replace each variable of the original fixed-width verification condition with a fresh parametric variable, replace each concrete constant with a fresh symbolic constant, give all of them the same fresh width `k`, and invoke the Section 3 translation. In the paper's words: “If the resulting formula is valid, the original verification condition holds independent of the original bit-width.” (Section 4, p. 10). Formulas involving multiple bit-widths are excluded (Section 4, p. 10). Inference: a Verus user could use this as an auxiliary proof-generation pipeline for width-generic arithmetic facts, but the paper does not connect its encoding to Verus.

## technique 1: parametric bit-vector to UFNIA translation

what it is: the translation `T_A(ϕ,ω)` returns `AX_A(ϕ,ω) ⇒ CONV(ϕ,ω)` (Figure 1, p. 7). The antecedent requires the integer variables to be in the correct ranges (`0 ≤ χ(x) < pow2(ω^b(x))` for every bit-vector variable, and positive width variables) and the conclusion converts each parametric bit-vector term to an integer term (Section 3, pp. 6, 8). Because SMT solvers generally lack unrestricted exponentiation, `pow2 : Int → Int` is an uninterpreted function whose intended semantics is `λx.2^x` for non-negative `x`; each non-predicate bit-vector operator other than extraction receives a width-indexed UF `f^N` with one extra width argument, and predicates get similar UFs (Section 3, p. 6).

when to use it: the paper motivates the method by properties that must hold for arbitrary bit-width, such as parametric circuits or machine integers of arbitrary size, which current fixed-width solving approaches cannot reason about (Introduction, p. 1). The Introduction also says that for machine integers of fixed but large size, “current approaches do not perform as well in the presence of expensive operations such as multiplication [15]” (Introduction, p. 1). Inference: the paper does not show that its own encoding helps for large fixed widths; its Alive trial at bit-width up to 64 proved nothing that was not already proved for arbitrary widths, “which suggests that this restriction did not make the benchmarks easier” (Section 4.2, p. 15).

how to do it:
1. make the input formula well sorted under a mapping `ω` of variables/constants to symbolic widths and values (Section 2.1, pp. 4–6)
2. eliminate bit-vector extract and concrete constants: extract is rewritten via concatenation with fresh variables of appropriate widths (end of Section 2.1, p. 5), and each concrete constant becomes a symbol in `Z*` with its value in `ω^N` (Section 3, p. 7)
3. replace every parametric variable `x` by a fresh integer `χ(x)` and every constant `z` by `ω^N(z) mod pow2(ω^b(z))` (Figure 1 and its explanation, pp. 7–8)
4. replace each bit-vector operator by its width-indexed UF, then run `ELIM`; per Figure 1, `ELIM` expresses addition, subtraction, multiplication, division, remainder, bitwise negation, arithmetic negation, left and logical right shift, concatenation, and the comparisons with integer arithmetic and `pow2`; the paper says the remaining UFs are `pow2`, `&N`, `|N`, `⊕N` (Figure 1, p. 7; p. 8)
5. conjoin the selected axiomatization `AX_A` and ask a UFNIA solver whether the implication is valid (Section 3, p. 8)

The paper gives a concrete conversion: for `(x +BV x) +BV z1 ≉ z0` with all widths `a`, conversion and elimination simplify to `(χ(x) + χ(x) + 1) mod pow2(a) ≉ 0` (Section 3, p. 8). The signed comparison helper is `uts_k(x) = 2·(x mod pow2(k−1)) − x`; signed relations compare these integer interpretations (Figure 1, p. 7). For `div` and `mod` by zero, `ELIM` returns `pow2(k) − 1` (Figure 1, p. 7).

evidence: Theorem 2 gives, for a well-sorted formula with no extract and no concrete constants: (1) `ϕ` is valid iff `T_full` is valid; (2) iff `T_combined` is valid; (3) `ϕ` is valid if `T_partial` is valid; (4) `ϕ` is valid if `T_qf` is valid (Theorem 2, p. 9). Items 3 and 4 give only the “if” direction, so a successful partial or qf proof implies validity but a failed one says nothing. The exact statement of item 1 is: “ϕ is TBV -valid under ω if and only if Tfull (ϕ, ω) is TUFIA -valid.” (Theorem 2, p. 9). The proof is in Appendix C (pp. 20, 23–25). Experiments used CVC4 (GitHub master 6eb492f6), Z3 4.8.4, and Vampire (GitHub master d0ea236) on Intel Xeon E5-2637 3.5 GHz CPUs with 32 GB memory, a 300-second wall-clock limit and a 4 GB memory limit for each solver/benchmark pair (Section 4, pp. 10–11).

limits and assumptions: the theorem assumes no extract and no concrete constants after preprocessing (Theorem 2, p. 9); the reported studies exclude formulas with multiple bit-widths (Section 4, p. 10); extraction with symbolic range is not lifted (Section 2.1, p. 5). UFNIA is undecidable (Abstract, p. 1), so a timeout is not a counterexample. Full and combined axiomatizations assert the intended semantics (Section 3, p. 9). The paper describes the partial axiomatization as “a partial (hand-crafted) one that can be understood as an under-approximation” (Introduction, p. 2). Inference: a Verus proof relying on an external translation would need an independently checked lemma connecting the generated arithmetic formula to the Rust operation semantics; the SMT result alone would not become a Verus proof certificate.

## technique 2: choose an axiomatization mode

what it is: four modes govern the UFs left after elimination: full, partial, combined, and qf (Section 3, p. 8). `full` gives recursive quantified semantics for `pow2`, `&N`, `|N`, and `⊕N` (Table 2, p. 9); `partial` gives properties such as base cases, monotonicity, ranges, symmetry, idempotence, and special zero/max cases (Table 3, p. 10); `combined` “asserts both”; `qf` “takes only the formulas in partial that are quantifier-free”, so its `pow2` axioms are the base cases and its axioms for the other operators are simply ⊤ (Section 3, p. 9). The paper says: “The formulas for axiomatization mode full assert the intended semantics of these operators, whereas those for partial assert several properties of them.” (Section 3, p. 9).

when to use it: the paper's experimental finding is: “Overall, axiomatization mode combined yields the best results.” (Section 4, p. 10). Inference: start with combined; the paper does not give a rule for when to prefer partial, qf, or full beyond the per-benchmark results in Tables 4 and 5.

how to do it:
1. include range and positive-width constraints in every mode (Section 3, p. 8)
2. add the chosen `pow2`, `&N`, `|N`, and `⊕N` axioms (Tables 2–3, pp. 9–10); for partial, the paper says some axioms were hand-picked: “Other axioms (e.g., “never even”) were added after analyzing specific benchmarks to identify sufficient axioms for their proofs.” (Section 3, p. 9)
3. submit the resulting implication to each UFNIA solver under the fixed resource limits (Section 4, p. 11)
4. record a property as proved when at least one solver proves it in at least one mode: “We consider a bit-width independent property to be proved if at least one solver proved it for at least one of the axiomatization modes.” (Section 4, p. 11)

The authors report that combined fully proved 104 of 160 invertibility conditions, while full, partial, and qf fully proved 64, 76, and 40 respectively (Table 4, p. 13). They also report that, for the invertibility condition of `x &BV s ≉ t`, “from partial, it suffices to keep “min” and “idempotence”” (Section 4.1, p. 13). They note that qf still performs well and suggest this may be because, in many cases, the correctness of the invertibility condition does not rely on any particular property of the operators involved (Section 4.1, pp. 12–13). Inference: in Verus, this corresponds to exposing only the lemmas required by a proof context, rather than globally unfolding bit-vector semantics; candidate lemmas would be `lemma` declarations with `requires`/`ensures`, and the actual executable function would remain unchanged.

## technique 3: conditional inverses for quantified invertibility

what it is: for a literal `ℓ[x]`, an invertibility condition `φc` means `φc ⇔ ∃x.ℓ[x]` (Section 4.1, p. 11). The difficult direction is `φc ⇒ ∃x.ℓ[x]` (ltr). A conditional inverse `αc` is a term for which `φc ⇒ ℓ[αc]` is valid, allowing the existential to be eliminated (Section 4.1, p. 12). The paper gives `s` as a conditional inverse for `(x | s) ≤u t`: if some `x` works, then `(s | s) ≤u t` holds (Section 4.1, p. 12).

when to use it: the paper uses it for the existence direction of invertibility conditions, where eliminating the quantifier “is much trickier” and “typically amounts to finding a symbolic value for x” (Section 4.1, p. 12). Inference: it fits any property of the form a witness exists under a condition where a candidate witness can be guessed or synthesized.

how to do it:
1. split `φc ⇔ ∃x.ℓ[x]` into `rtl: ∃x.ℓ[x] ⇒ φc` and `ltr: φc ⇒ ∃x.ℓ[x]` (Section 4.1, pp. 11–12)
2. prove `rtl` by showing that `ℓ[x,s,t] ∧ ¬φc[s,t]` (rtl') is unsatisfiable; it is quantifier-free (Section 4.1, p. 11)
3. for `ltr`, find a conditional inverse `αc` and prove the stronger `φc ⇒ ℓ[αc]` (ltr') (Section 4.1, p. 12)
4. formulate the witness search as SyGuS: ask whether a binary bit-vector function `C` exists with `∃C∀s∀t. φc ⇒ C(s,t) ⋄ s ⊲⊳ t` (Section 4.1, p. 12)
5. synthesize candidates at bit-width 4 with the SyGuS feature of CVC4, 160 SyGuS problems per grammar (variants of the grammars used in [19]), then check each candidate by checking `ltr'` for bit-widths up to 64 (Section 4.1, p. 12)
6. prove `ltr'` with the parametric translation and the selected axiomatization (Section 4.1, p. 12; Table 4, p. 13)

evidence: SyGuS produced candidate conditional inverses for 143 of 160 invertibility conditions, and for 12 of these 143 the terms “were not conditional inverses for every bit-width” (Section 4.1, p. 12). Overall, “out of 160 invertibility conditions, we were able to fully prove 110, and for 19 (17) conditions we were able to prove only direction rtl’ (ltr’).” (Section 4.1, p. 12); the remaining 14 conditions had neither direction proved (Table 4, p. 13). For right-to-left, 129 formulas (rtl') were proved unsatisfiable, 32 of them trivial because `φc` was ⊤. For left-to-right, 127 formulas were proved, 102 with and 94 without a conditional inverse, and 33 could be proved only with one (Section 4.1, p. 12). Appendix B lists all verified conditional inverses by operator and relation in Tables 7 to 11 (pp. 20–22). Appendix C proves Property 1 of Theorem 2 by translating interpretations, through Lemmas 3 to 7 and Corollary 8, and then proves explicitly only the “difference” axiom of `&N` for properties 2 to 4 (pp. 23–25). Inference: a Verus encoding would express the witness as a `spec fn` or a ghost value and prove `ensures` for the selected literal; in the paper's workflow synthesis is an external step done by CVC4's SyGuS feature.

limits: a candidate found at width 4 is not automatically width independent; the 12 failures show this. `ltr'` implies `ltr`, but “if (ltr’) is refuted, (ltr) is not necessarily refuted” (Section 4.1, p. 12), so failure of the strengthened formula does not refute the original existential property. The case study excludes extraction and concatenation (Section 4.1, p. 11).

## technique 4: verify compiler optimizations independently of width

what it is: feed Alive-generated equivalence constraints through the parametric translation. For each optimization Alive generates four constraints (memory, definedness, poison, equivalence); the study retains 180 optimizations whose generated SMT-LIB files use a single bit-width and are identical modulo bit-width, and considers only their equivalence constraints (Section 4.2, pp. 13–14).

how to do it:
1. collect the 433 instcombine optimizations given as Alive translations and discard the 113 that depend on a specific bit-width, leaving 320 (Section 4.2, p. 13)
2. keep optimizations whose generated SMT-LIB files satisfy two criteria: only a single bit-width is used in each file, and all files generated for a property are identical modulo the bit-width (excluding, for example, bit-width dependent constants other than 0, 1, (un)signed min/max, and the bit-width itself); as an exception to the first criterion, instances where all terms of bit-width 1 can be read as Boolean terms are included (Section 4.2, p. 14); this leaves 180 of 320
3. note that none of the 180 involve memory operations or poison values and only some have simple definedness constraints, so verification conditions 1 to 3 are trivial and only the equivalence condition is checked (Section 4.2, p. 14)
4. replace each variable and constant by a fresh parametric symbol and invoke `T_A` (Section 4, p. 10)
5. solve the equivalence condition in the four axiomatization modes and aggregate by family (Section 4.2, p. 14)

Evidence: 88 of 180 considered equivalence conditions were proved. Family results (proved, all modes combined, out of considered) were AddSub 9/16, MulDivRem 3/5, AndOrXor 60/124, Select 16/26, Shifts 0/9, and LoadStoreAlloca 0/0 (Table 5, p. 14); the family sizes before filtering are 52, 29, 162, 51, 17, and 9. Per mode, full proved 80, partial 75, qf 72, combined 88 (Table 5, p. 14). The paper says the AndOrXor family succeeds because “many verification conditions of this family require only Boolean reasoning and basic properties of ordering relations that are already included in the theory TIA” (Section 4.2, p. 14); its example reduces AndOrXor:979 to transitivity of signed `<` plus Boolean reasoning. “None of the 9 benchmarks from the Shifts family were proven.” (Section 4.2, p. 14); Table 5 lists Shifts as 9 considered out of 17 and 0 proved. The paper explains that these benchmarks “combine bit-wise and arithmetical operations and thus rely on their axiomatization.” From the 720 problems of this case study, CVC4 proved 42.6%, Vampire 36.2%, Z3 37.9%, and all solvers 32.5% (Section 4.2, p. 15).

Inference: a Verus adaptation would state the optimizer's source/target equivalence as a `spec fn` relation and prove it for an abstract `nat` width or a fixed-width bit-vector model; it would not automatically cover LLVM memory, poison, or undefinedness unless those are modeled in the Rust specification.

## technique 5: enumerate and bootstrap bit-vector rewrite proofs

what it is: use the CVC4 SyGuS solver's feature to enumerate equivalent bit-vector terms and formulas (rewrite candidates) for a bit-width up to a term depth, translate them, then add proved rewrites as axioms and rerun until no additional rewrites are proved (Section 4.3, p. 15).

how to do it:
1. enumerate 1575 pairs of equivalent bit-vector terms of depth three and 431 pairs of equivalent formulas of depth two at bit-width 4 (Section 4.3, p. 15)
2. translate them with modes full, partial, qf, and combined, giving 6300 + 1724 = 8024 benchmarks (Section 4.3, p. 15)
3. after each run, collect all proven rewrites, add them as axioms to the initial problems, and rerun (Section 4.3, p. 15)
4. repeat until a fixpoint, meaning no further rewrites were proved (Section 4.3, p. 15)

Evidence: the paper says “we were able to prove 409 out of the 435 formula equivalences (94%), reaching a fixpoint at the first iteration”; the paper elsewhere says 431 formula pairs, and 1724 = 4 × 431, so “435” is probably a typo in the paper (Section 4.3, p. 15). For the term equivalences, 878 of 1575 were initially proved, rising to 935 (59%) after adding the first-run axioms, with a fixpoint after two iterations (Section 4.3, p. 15). Across the 8024 problems, CVC4 proved 64.2%, Vampire 66.5%, Z3 64.2%, and all three 63.8% (Section 4.3, p. 15). Inference: bootstrapping is a useful proof-search heuristic but not itself a trusted inference rule; a Verus implementation should re-prove each selected rewrite as a lemma instead of treating the generated axiom set as trusted.

## techniques for the catalog

- parametric bit-vector translation — encode symbolic-width bit-vector formulas as UFNIA implications with range constraints, `pow2`, and width-indexed operator semantics
- axiomatization modes — select full, partial, combined, or quantifier-free axioms to trade semantic strength against solver tractability
- conditional inverse synthesis — synthesize a symbolic witness for an invertibility condition with SyGuS and validate it across widths
- width-independent compiler checking — translate Alive equivalence constraints and prove them for arbitrary width after filtering width-dependent instances
- rewrite enumeration with fixpoint bootstrapping — enumerate equivalent terms, prove candidates, add proved rewrites as axioms, and repeat to a fixpoint
