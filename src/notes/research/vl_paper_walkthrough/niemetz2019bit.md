# Towards Bit-Width-Independent Proofs in SMT Solvers
(authored by agents unless marked 🧑)
Tag: `niemetz2019bit`, [paper](http://arxiv.org/abs/1905.10434v3)

## what is proved and measured

The paper translates bit-vector formulas whose width is a symbolic integer into quantified formulas over nonlinear integer arithmetic and uninterpreted functions (UFNIA). Its target is a validity result independent of the machine width. The abstract states: “To address this shortcoming, we propose a translation from bit-vector formulas with parametric bit-width to formulas in a logic supported by SMT solvers that includes non-linear integer arithmetic, uninterpreted functions, and universal quantification.” (Abstract, p. 1). The translation is automated but UFNIA is undecidable; success therefore depends on the participating SMT solvers and their timeout.

The paper defines parametric bit-vector variables and constants under a width/value mapping `ω`. A formula is first made well sorted under `ω`; each width is a positive integer term. In every case study, the authors replace each original variable with a fresh parametric variable, replace each concrete constant with a fresh symbolic constant, assign all of them a fresh width `k`, and invoke the Section 3 translation. A valid translated formula implies the original condition for every width represented by `k` (Section 4, p. 5). Inference: a Verus user could use this as an auxiliary proof-generation pipeline for width-generic arithmetic facts, but the paper does not connect its encoding to Verus.

## technique 1: parametric bit-vector to UFNIA translation

what it is: the translation `T_A(φ,ω)` returns `AX_A(φ,ω) ⇒ CONV(φ,ω)`. The antecedent constrains every integer variable to the range `0 ≤ χ(x) < pow2(width)` and requires width variables to be positive. The conclusion replaces bit-vector terms by integer terms. Because SMT solvers generally lack unrestricted exponentiation, `pow2 : Int → Int` is an uninterpreted function intended to mean `2^k`; each problematic bit-vector operator receives a width-indexed UF before arithmetic elimination (Section 3, pp. 3–4).

when to use it: use it when a property must hold for arbitrary bit-width and fixed-width bit-vector solving either cannot express the symbolic width or would require checking many widths. The approach also applies to large fixed widths when multiplication or other expensive bit-vector operations make direct solving difficult (Introduction, pp. 1–2).

how to do it:
1. make the input formula well sorted under a mapping `ω` of variables/constants to symbolic widths and values (Section 2.1, p. 3)
2. eliminate bit-vector extraction and concrete constants by introducing symbolic constants; extraction is handled as described before Section 3 and constants are represented through `ω` (Section 3, p. 3)
3. replace every parametric variable `x` by a fresh integer `χ(x)` and every constant `z` by `ω^N(z) mod pow2(ω^b(z))` (Figure 1 and its explanation, pp. 3–4)
4. replace each bit-vector operator with its width-indexed UF, then run `ELIM`; addition, subtraction, multiplication, shifts, division, remainder, negation, concatenation, and comparisons are expressed with integer arithmetic and `pow2` (Figure 1, p. 3)
5. conjoin the selected axiomatization `AX_A` and ask a UFNIA solver whether the implication is valid (Section 3, p. 4)

The paper gives a concrete conversion: for `(x +BV x) +BV z1 ≠ z0` with all widths `a`, conversion and elimination simplify to `(χ(x) + χ(x) + 1) mod pow2(a) ≠ 0` (Section 3, p. 4). The signed comparison helper is `uts_k(x) = 2·(x mod pow2(k−1)) − x`; signed relations compare these integer interpretations (Figure 1, p. 3).

evidence: Theorem 2 states that, for a well-sorted formula without extraction or concrete constants, validity is equivalent for the full and combined translations, while partial and quantifier-free translations are sound in the forward direction (Theorem 2, p. 5). The exact statement includes: “ϕ is TBV-valid under ω if and only if Tfull(ϕ, ω) is TUFIA-valid.” (Theorem 2, p. 5). Experiments used CVC4, Z3, and Vampire, with Intel Xeon E5-2637 3.5 GHz CPUs, 32 GB memory, 300-second wall-clock and 4 GB per solver/benchmark pair (Section 4, p. 5).

limits and assumptions: the result excludes formulas with multiple bit-widths in the reported studies, and the theorem assumes no extraction or concrete constants after preprocessing (Sections 3–4, pp. 3, 5). UFNIA validity is undecidable, so a timeout is not a counterexample. Full and combined encodings are intended to characterize the bit-vector semantics; partial and quantifier-free modes are under-approximating proof hints. Inference: a Verus proof relying on an external translation would need an independently checked lemma connecting the generated arithmetic formula to the Rust operation semantics; the SMT result alone would not become a Verus proof certificate.

## technique 2: choose an axiomatization mode

what it is: four modes govern the UFs left after elimination. `full` gives recursive quantified semantics for `pow2`, bitwise and, or, and xor; `partial` gives selected properties such as base cases, ranges, symmetry, idempotence, and special zero/max cases; `combined` conjoins full and partial; `qf` keeps only quantifier-free base cases (Tables 2–3, p. 4). The paper says: “The formulas for axiomatization mode full assert the intended semantics of these operators, whereas those for partial assert several properties of them.” (Section 3, p. 4).

when to use it: start with combined, which was best overall in the experiments; use partial or qf when quantified axioms cause solver difficulty, and full when a proof needs recursive operator semantics (Section 4, p. 5).

how to do it:
1. include range and positive-width constraints in every mode (Section 3, p. 4)
2. add the chosen `pow2`, `&N`, `|N`, and `⊕N` axioms; for partial, include only properties needed by the target proof (Tables 2–3, p. 4)
3. submit the resulting implication to each UFNIA solver under the fixed resource limits (Section 4, p. 5)
4. record a property as proved when at least one solver proves it in at least one mode (Section 4, p. 5)

The authors report that combined proved 104 of 160 invertibility conditions fully, while full, partial, and qf proved 64, 76, and 40 respectively (Table 4, p. 6). They also report that partial needed only “min” and “idempotence” for one `x & s ≠ t` invertibility condition (Section 4.1, p. 6). Inference: in Verus, this corresponds to exposing only the lemmas required by a proof context, rather than globally unfolding bit-vector semantics; candidate lemmas would be `lemma` declarations with `requires`/`ensures`, and the actual executable function would remain unchanged.

## technique 3: conditional inverses for quantified invertibility

what it is: for a literal `ℓ[x]`, an invertibility condition `φc` means `φc ⇔ ∃x.ℓ[x]`. The difficult direction is `φc ⇒ ∃x.ℓ[x]`. A conditional inverse `αc` is a term for which `φc ⇒ ℓ[αc]` is valid, allowing existential elimination. The paper gives `s` as a conditional inverse for `(x | s) ≤u t`: if any `x` works, then `(s | s) ≤u t` works (Section 4.1, p. 6).

when to use it: use it for quantified conditions where the existence direction cannot be solved directly. It is especially useful when a symbolic witness can be synthesized from the surrounding terms.

how to do it:
1. split `φc ⇔ ∃x.ℓ[x]` into `rtl: ∃x.ℓ[x] ⇒ φc` and `ltr: φc ⇒ ∃x.ℓ[x]` (Section 4.1, p. 6)
2. prove `rtl` by showing `ℓ[x] ∧ ¬φc` is unsatisfiable (equation `rtl'`, p. 6)
3. formulate the witness search as SyGuS: find a binary function `C` satisfying `∀s∀t. φc ⇒ C(s,t) ⋄ s ⊲⊳ t` (Section 4.1, p. 6)
4. synthesize candidates at width 4 with CVC4, then validate each candidate by checking `ltr'` for widths up to 64 (Section 4.1, p. 6)
5. substitute a surviving candidate into the translated parametric formula and prove it with the selected axiomatization (Section 4.1, p. 6)

evidence: SyGuS generated candidates for 143 of 160 conditions; 12 of those failed the width-up-to-64 check. Of the 160 conditions, 110 were fully proved, 19 had only one direction proved, and 129 `rtl'` formulas were proved unsatisfiable (Table 4 and text, p. 6). Conditional inverses helped: 102 left-to-right proofs used one, and 33 formulas could be proved only with one (Section 4.1, p. 6). Appendix B lists the surviving inverse terms by operator and relation in Tables 7–11; Appendix C proves the full encoding by translating interpretations and establishes the arithmetic/bitwise correspondence through Lemmas 3–7 (Appendices B–C, pp. 10–13). Inference: a Verus encoding would express the witness as a `spec fn` or a ghost value and prove `ensures` for the selected literal; synthesis remains an external search step, because Verus does not synthesize arbitrary functions from SyGuS in the paper’s workflow.

limits: a candidate found at width 4 is not automatically width independent; the 12 failures demonstrate this. `ltr'` is stronger than `ltr`, so failure of the strengthened witness formula does not refute the original existential property (Section 4.1, p. 6).

## technique 4: verify compiler optimizations independently of width

what it is: feed Alive-generated equivalence constraints through the parametric translation. Alive emits memory, definedness, poison, and equivalence constraints; the study retains 180 equivalence conditions whose type-instantiated SMT files differ only in width and excludes width-dependent cases (Section 4.2, pp. 6–7).

how to do it:
1. collect Alive translations and discard optimizations dependent on a specific width (113 of 433) (Section 4.2, p. 6)
2. require one width per SMT-LIB file and identical formulas modulo width-dependent constants (Section 4.2, p. 7)
3. replace each variable and constant by a fresh parametric symbol and invoke `T_A` (Section 4, p. 5)
4. solve the equivalence condition in all four axiomatization modes and aggregate proofs by family (Section 4.2, p. 7)

Evidence: 88 of 180 considered equivalence conditions were proved; the family totals were AddSub 9/16, MulDivRem 3/5, AndOrXor 60/124, Select 16/26, Shifts 0/9, and LoadStoreAlloca 0/0 (Table 5, p. 7). Across 720 solver/benchmark problems, CVC4 proved 42.6%, Vampire 36.2%, Z3 37.9%, and all solvers proved 32.5% (Section 4.2, p. 7). The paper’s example reduces an AndOrXor condition to transitivity of signed `<` plus Boolean reasoning, which is already native integer arithmetic (Section 4.2, p. 7).

Inference: a Verus adaptation would state the optimizer’s source/target equivalence as a `spec fn` relation and prove it for an abstract `nat` width or a fixed-width bit-vector model; it would not automatically cover LLVM memory, poison, or undefinedness unless those are modeled in the Rust specification.

## technique 5: enumerate and bootstrap bit-vector rewrite proofs

what it is: use CVC4 SyGuS enumeration to generate equivalent term/formula pairs at width 4, translate each candidate equivalence, then add proved rewrites as new axioms and rerun until no additional rewrites are proved (Section 4.3, p. 7).

how to do it:
1. enumerate 1,575 equivalent term pairs of depth three and 431 formula pairs of depth two at width 4 (Section 4.3, p. 7)
2. create four translated benchmarks per pair, for 8,024 total (Section 4.3, p. 7)
3. run full, partial, qf, and combined modes
4. collect every proved rewrite as an axiom, rerun, and stop at a fixpoint (Section 4.3, p. 7)

Evidence: 409 of 435 formula equivalences were proved (94%), reaching a fixpoint after the first iteration. Term equivalences rose from 878/1,575 (56%) to 935/1,575 (59%) after adding the first-run axioms and reached a fixpoint after two iterations. Across all 8,024 problems, CVC4 proved 64.2%, Vampire 66.5%, Z3 64.2%, and all three 63.8% (Section 4.3, p. 7). Inference: bootstrapping is a useful proof-search heuristic but is not itself a trusted inference rule; a Verus implementation should re-prove each selected rewrite as a lemma instead of treating the generated axiom set as trusted.

## trusted boundary, contradictions, and product threat

The paper relies on the correctness of the SMT solvers; it explicitly says: “The reliability of our approach depends on the correctness of the SMT solvers in use.” (Introduction, p. 2). Inference: the generated UFNIA formula, solver implementation, timeout behavior, SyGuS synthesis, and the hand-selected partial axioms remain trusted or unverified components of the reported workflow. Inference: a Verus product can use this method to generate candidate arithmetic lemmas, but its product verdict must still rest on Verus-checked contracts and proofs, not on a solver success report copied from this pipeline.

The paper reports 2696 invertibility problems: CVC4 proved 50.3%, Vampire 31.4%, Z3 33.8%, and all solvers 23.5% (Section 4.1, p. 6). It reports 720 Alive problems with the solver percentages above, and 8024 rewrite benchmarks with their percentages above. These denominators differ: 160 is the number of invertibility conditions, 2696 is the number of solver/mode problems; 180 is the selected Alive optimizations, 720 is their solver/mode expansion; 435 is the number of formula equivalences and 1575 the term-pair count, while 8024 counts all pair/mode combinations. Inference: a product evaluation must preserve these denominators and distinguish a property proved by one solver from a solver/benchmark run.

Inference: agent-written verified Rust faces a medium threat from width-dependent arithmetic and rewrite assumptions if it targets parsers, cryptography, or machine-integer libraries. The paper’s method addresses semantic width generality and can expose optimization mistakes, but it does not prove Rust ownership, memory safety, API contracts, or the adequacy of a product specification. Inference: VL should reuse the translation and conditional-witness ideas as candidate-generation tools and should not redo a generic campaign that checks a fixed list of widths when a parametric proof is available.

## techniques for the catalog

- parametric bit-vector translation — encode symbolic-width bit-vector formulas as UFNIA implications with range constraints, `pow2`, and width-indexed operator semantics
- axiomatization modes — select full, partial, combined, or quantifier-free axioms to trade semantic strength against solver tractability
- conditional inverse synthesis — synthesize a symbolic witness for an invertibility condition with SyGuS and validate it across widths
- width-independent compiler checking — translate Alive equivalence constraints and prove them for arbitrary width after filtering width-dependent instances
- rewrite enumeration with fixpoint bootstrapping — enumerate equivalent terms, prove candidates, add proved rewrites as axioms, and repeat to a fixpoint

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
