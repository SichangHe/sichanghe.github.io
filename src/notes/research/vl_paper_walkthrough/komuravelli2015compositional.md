# Compositional Verification of Procedural Programs using Horn Clauses over Integers and Arrays
(authored by agents unless marked 🧑)
Tag: `komuravelli2015compositional`, [paper](http://arxiv.org/abs/1508.01288v1)

## scope and result

Komuravelli, Bjørner, Gurfinkel, and McMillan give an SMT-based compositional safety algorithm for procedural C programs with heap and arrays. The representation is constrained Horn clauses (CHCs), where unknown predicates are procedure summaries and array memory uses the extensional theory of arrays (ARR). The key algorithms are array quantifier elimination (QE), model-based projection (MBP), and SPACER's may/must summary search (SPACER itself comes from the authors' earlier work, reference [17] in the paper; this paper instantiates it for ARR+LIA). The paper claims polynomial-time MBP per model for array projection, but exact QE is exponential and, per the paper, no finite MBP exists for the combination of ARR and linear integer arithmetic (LIA).

The paper states: “We present a compositional SMT-based algorithm for safety of procedural C programs that takes the heap into consideration as well.” (Abstract, p. 1). It also states: “The ability to reason with ARR makes it possible to handle heap-allocating programs without inlining procedures, as the heap can be faithfully modeled using ARR [14].” (Section I, p. 2; [14] is SeaHorn). Inference: this is relevant to VL because a summary-based verifier can avoid expanding every call, but the technique operates over CHCs and SMT formulas rather than Rust/Verus syntax.

## technique 1: encode procedures as CHCs and summaries

Use this to obtain modular, procedure-level safety obligations. A CHC is a constraint `ϕ` and body predicates `P1(x1),…,Pm(xm)` implying a head; the CHC is a query if the head is a formula over the base signature and a rule if the head is a predicate application. It is linear if the body has at most one predicate. The paper says: “Intuitively, each predicate symbol Pk represents an unknown partial correctness specification of a procedure (that is, an over-approximate summary).” A satisfying interpretation of all predicates is a certificate corresponding to Floyd/Hoare annotations. Any set of CHCs encoding safety of procedural programs can be transformed to an equisatisfiable set of three CHCs with a single predicate (the program location is encoded in a variable):

- `Inv(x) <- init(x)`
- `¬bad(x) <- Inv(x)`
- `Inv(x') <- Inv(x), Inv(xo), tr(x,xo,x')`

Here `x` is the pre-state, `x'` the post-state, and `xo` the summary of a procedure call (if one is made). The paper restricts attention to quantifier-free interpretations of `Inv`, "to avoid the difficulty of reasoning with quantifiers". It rewrites the rules with `F(φA,φB) = (φA(x) ∧ φB(xo) ∧ tr(x,xo,x')) ∨ init(x')`, so the rules are equivalent to `F(Inv,Inv) ⇒ Inv(x)`.

Step by step: encode each procedure transition and call as a CHC; look for a quantifier-free interpretation of the predicates that satisfies all CHCs; treat a satisfying interpretation as the proof certificate. The paper says: “A satisfying assignment to the symbols Pk is thus a certificate that the program satisfies its specification and corresponds to the annotations in a Floyd/Hoare style proof.” (Section IV-A, pp. 5-6; the sentence spans the page break).

Inference: a Verus version would express each procedure summary as a `requires`/`ensures` contract and ghost state predicate, then prove callers against those contracts. CHC solving can guide candidate discovery, but Verus proof functions and contracts remain the checked artifact; no direct CHC syntax carries over. Trusted components are the CHC translation and solver interpretation.

## technique 2: array quantifier elimination with rewrite rules

Use this when heap or array variables must be projected from a verification condition. For `∃a:arr(I,V). φ`, the goal is an equivalent existentially quantified formula where every remaining quantifier is of index sort `I` or value sort `V`. The paper describes `ARRAY_QE` as three steps (inspired by the Stump et al. decision procedure, reference [20]): (i) eliminate write terms using the read-after-write axiom schema and partial equalities over arrays, (ii) eliminate (partial) equalities and disequalities over arrays, (iii) eliminate read terms over arrays. Algorithm 1 has six lines:

1. `φ1 ← (ELIM_WR*)(∃a·φ)`: eliminate writes with `ELIM_WR_RD`, `ELIM_WR_EQ`, `PARTIAL_EQ`, `TRIV_EQ`, `SYMM` (Fig. 1).
2. `φ2 ← (CASE_SPLIT_EQ*; FACTOR_RD*)(φ1)`: case-split on partial equalities of the quantified array and factor out its read terms by introducing fresh value variables (Fig. 2).
3. `LIFT_EQ_DISEQ_RD`: Boolean rewriting into a disjunction `δ1 ∨ … ∨ δn` in which partial equalities, array disequalities, and read-term equalities appear at the end of each disjunct.
4. For each disjunct (line 5): `ELIM_EQ; ELIM_DISEQ; ACKERMANN` (Fig. 3). `ELIM_EQ` substitutes `wr(t,i,v)` for `a`; `ELIM_DISEQ` drops disequalities, which is valid only when the index domain is infinite and no partial equality remains; `ACKERMANN` removes read terms by Ackermann reduction.
5. Return the disjunction of the results (line 6).

The paper's worked example (Fig. 4, pp. 3-4) starts from `∃a·(b = wr(a,i1,v1) ∨ (rd(wr(a,i2,v2),i3) > 5 ∧ rd(a,i4) > 0))` and ends with a formula in which `a` is gone and only index/value quantifiers (`v, s3, s4`) remain. The paper notes that in practice the rules need only be applied to terms containing the quantified array. For finite index domains `ELIM_DISEQ` is not equivalence-preserving and the paper gives `ELIM_DISEQ_FINITE` (Appendix A, p. 9).

Correctness and cost are explicit: “ARRAY QE(∃a : arr(I, V ) · ϕ) returns ∃v : V · ρ, where ρ is quantifier-free and ∃v · ρ ≡ ∃a · ϕ.” (Theorem 1, Section III-A, p. 3; restated in Appendix B, p. 9, with a proof sketch). “ARRAY QE(∃a · ϕ) terminates in time exponential in the size of ϕ.” (Theorem 2, same places). The denominator for this complexity claim is formula size `N`, not benchmark count; the Appendix B sketch bounds the total number of disjunctions by `O(N^N)` and the size of each disjunct by a polynomial in `N`. Both proofs are only sketches in the paper.

Inference: Verus can model an array or heap map as a spec-level sequence/map and prove read-after-write lemmas, but it does not automatically perform this CHC QE. The rewrite rules are a candidate preprocessing pass outside Verus. Assumptions include a quantifier-free input formula, and for `ELIM_DISEQ` an infinite index domain.

## technique 3: model-based projection (MBP) for arrays and ARR+LIA

Use MBP to create a finite, model-specific under-approximation rather than an exact projection. Given a model `M` of quantifier-free `φ`, an MBP returns a quantifier-free `ψM` such that `M |= ψM` and `ψM` entails `φ`; it is a finite MBP if its image is finite up to logical equivalence. Apply the array QE rewrites but, using the MBP rules of Fig. 5 (`MBP_LEFT`, `MBP_RIGHT`, `MBP_VAC`), keep only one disjunct that is true in `M` at each disjunction introduced by a QE rule (and replace the formula by `⊥` for that disjunction if neither disjunct is true in `M`). Theorem 3 (Section III-B, p. 4): for quantifier-free `φ` in ARR, `ARRAY_MBP(∃a:arr(I,V). φ)` is a finite MBP; the paper says that being an MBP "can be easily shown by induction on the number of rewrites applied" and finiteness follows because there are finitely many ways to resolve the disjunctions. Assuming that evaluating a formula in a model takes polynomial time, `ARRAY_MBP(φ)(M)` takes time polynomial in the sizes of `M` and `φ`, while the number of distinct generalizations can still be exponential. When the index sort is `int`, a modified `ACKERMANN_M` that partitions index terms by their model values, adds equalities within each class, and linearly orders the class representatives gives a more efficient (linear time and space) rule.

The combination with integers is not finite: “For example, there is no equivalent quantifier-free formula for ∃i : int · rd (a, i) > 0.” (Section III-C, p. 5). The paper concludes that no finite MBP exists for LIA+ARR, and the only way to under-approximate such a quantifier is substitution of its model value as a numeric literal. Its MBP for ARR+LIA is: first `ARRAY_MBP` (with the modified `ACKERMANN_M`), then `LIA_MBP` for integer quantifiers that do not appear in any array term, then the substitution method for remaining integer quantifiers. “When the last step of substitution method is not necessary, the resulting MBP will be finite.” Because the MBP is not finite, SPACER “is not guaranteed to terminate even for a fixed bound on the recursion depth N” (Section IV-C, p. 7); it can generate an infinite sequence of queries and must summaries. The paper identifies cases where equality resolution eliminates the index quantifier (e.g. `∃i·i=t ∧ rd(a,i)>0` becomes `rd(a,t)>0`) and says these seem natural for a single procedure; it gives no precise termination theorem for them.

Inference: in Verus, a model-guided candidate invariant can suggest lemmas or instantiate quantified facts, but proof acceptance must still be universal over all states. A finite MBP result is evidence for a bounded search step, not a Verus proof by itself.

## technique 4: SPACER may/must summary search

Use this to search local reachability goals without inlining procedures. SPACER is instantiated for a theory by (a) a model-generating SMT solver, (b) an MBP procedure, and (c) an interpolation procedure. Algorithm 2 maintains reachability queries `Q` (pairs `⟨ϕ,i⟩`: is `ϕ` reachable at recursion depth `i`), may summaries `Oi` over-approximating states at recursion depth `i`, and a must summary `U` under-approximating reachable states. Initially it returns UNSAFE if `init ∧ bad` is satisfiable; else `Q=∅`, `N=0`, `O0=init`, `Oi=⊤` for `i>0`, `U=init`. The rules fire non-deterministically:

- `Candidate`: if `ON ∧ bad` is satisfiable, add `⟨ϕ,N⟩` for some `ϕ` implying `ON ∧ bad`.
- `DecideMust`: expand a query by jumping over the call using `U`, adding `⟨MBP(∃xo,x'·F(Oi,U)∧ϕ', M), i⟩`.
- `DecideMay`: create a query for the call using the may summary of the calling context.
- `Leaf`: if `F(Oi-1) ⇒ ¬ϕ'` and `i<N`, move `⟨ϕ,i⟩` to level `i+1`.
- `Successor`: if the query is reachable via `U`, set `U := U ∨ MBP(...)`.
- `Conflict`: if `F(Oi) ⇒ ¬ϕ'`, strengthen `Oj` for all `j ≤ i+1` with an interpolant.
- `Induction`: propagate a clause `ϕ` of `Oi` if `F(ϕ ∧ Oi) ⇒ ϕ'`.
- `Unfold`: if `ON ⇒ ¬bad`, increment `N`.
- `Safe`: if `Oi+1 ⇒ Oi`, return the invariant `Oi`.
- `Unsafe`: if `U ∧ bad` is satisfiable, return UNSAFE.

MBP is used in `DecideMay`, `DecideMust`, and `Successor`; the paper says the quantifier elimination in `Successor` is only an optimization. The paper says the key distinguishing feature is compositional reasoning: “the key distinguishing feature of SPACER is compositional reasoning.” (Section IV-B, p. 6). The must summaries serve “to avoid redundant reachability queries”. The soundness/termination claim is conditional and is cited to the earlier paper, not proved here: “SPACER is sound and if MBP utilizes finite MBP functions, SPACER also terminates for a fixed N [17].” (Section IV-B, p. 7).

Inference: Verus can use the same architecture conceptually by giving each function a summary predicate and maintaining inductive invariants, but Verus does not expose SPACER's query queue or interpolation API. A product integration would need a CHC front end and a proof-producing bridge back to Verus contracts.

## technique 5: stabilize interpolation with array equalities

Use this when interpolants retain model-specific integer constants and cause non-termination. The paper's example has `Inv(a,b) <- a=b` and the query `⊥ <- Inv(a,b), rd(a,j)<0, rd(b,j)>0` (a check for a sign change at index `j` across the procedure). `DecideMay` creates queries of the form `rd(a,k)<0 ∧ rd(b,k)>0` for specific integer constants `k`; if interpolation returns `rd(a,k)=rd(b,k)`, SPACER does not terminate even for `N=0`, although `a=b` is a trivial solution. Modify MBP: for every pair of array terms `a, b` in the MBP result `ψ`, strengthen `ψ` with `a=b` or `a≠b` according to `M`. Queries then become `rd(a,k)<0 ∧ rd(b,k)>0 ∧ a≠b`, but `rd(a,k)=rd(b,k)` remains an interpolant, so interpolation is also modified: write `ϕ = ϕ1 ∧ ϕ2` where `ϕ2` holds all literals whose integer quantifier was substituted by its model value, use a minimal unsatisfiable subset (MUS) algorithm to generalize `ϕ2` to `φ̂2` such that `ψ ∧ (ϕ1 ∧ φ̂2)'` is unsatisfiable, and interpolate against `¬(ϕ1 ∧ φ̂2)'`. In the example the paper says one can show `φ̂2` is simply `⊤` and the only possible interpolant is `a=b`. The implementation adds the (dis-)equalities lazily on demand.

The authors explicitly limit the claim: “Note that adding such (dis-)equalities to the queries is only a heuristic and may not always help with termination.” (Section IV-C, p. 7). Inference: a Verus analogue is to expose extensional map equality as a lemma instead of repeatedly proving pointwise equalities, while treating this as a proof-search heuristic, not a soundness extension.

## evidence, limitations, and product threat

The evaluation (Section V, pp. 7-8) uses a prototype SPACER with ARRAY_MBP and SeaHorn (LLVM front end, CHCs in SMT-LIB2; SeaHorn can optionally inline calls). It compares non-inlined versus inlined encodings on 215 SV-COMP'15 Device Drivers benchmarks, chosen because "Z3 GPDR (with inlining) needed more than a minute of runtime or did not terminate within the resource limits of SVCOMP". Hardware was a 2.2 GHz AMD Opteron 6174 with 516GB RAM, Ubuntu Linux; each task had 30 minutes and 15GB. The paper reports scatter plots (Fig. 7, Fig. 8), not a table of pass fractions. It reports "A clear advantage is seen in the non-inlining case" (Fig. 7) and that SPACER with only LIA "is able to handle only a small fraction of the non-inlined benchmarks". Against Z3 GPDR (which does not use must summaries and whose MBP is limited to equality resolution and substitution), Fig. 8 compares with inlining on and the paper reports "an overwhelming advantage for S PACER". The paper also says "of the 7 unsafe programs verified by Z3, 5 could not be verified by S PACER"; the denominator is these 7 unsafe programs, and the paper does not say in that sentence whether the setting is inlined or not. The authors say in footnote 4 that they "have no way to distinguish divergence from timeouts", so the plots do not support a clean success-rate claim.

Stated or measured: Theorems 1-3 with sketch proofs only for 1 and 2 (Theorem 3 gets a short argument in the text); the 215-benchmark comparison under the stated hardware and limits. SPACER soundness and conditional termination are cited from [17], not shown here. Inference: trusted components are the LLVM/SeaHorn translation, SMT solver, interpolation and MBP implementations, CHC encoding, and user specifications. Inference: agent-written verified Rust is threatened by summary/specification mismatch and non-finite proof search; the strongest reusable idea is modular summaries plus explicit heap extensionality, while automatic CHC inference cannot replace checking the final Verus contracts.

## techniques for the catalog

- CHC summary encoding — represent each procedure by an unknown predicate whose satisfying interpretation is a Hoare-style certificate
- array QE — eliminate heap arrays by read/write rewrites, case splits, substitution, and Ackermann reduction
- model-based projection — select model-true under-approximations to obtain polynomial-per-model proof subgoals
- may/must SPACER search — combine over- and under-approximating summaries with interpolation for recursive modular safety
- equality-guided interpolation — add array equalities and MUS generalization to avoid model-constant interpolants
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, the combination of arrays and integers introduces terms over the combined signature which need to be handled as well."): read all 9 pages in reading order (pdftotext of the PDF) and checked every quotation, page and section reference, the Algorithm 1 and Algorithm 2 steps, the CHC normal form, and the evaluation setup and numbers; changed quotations that were not word for word (lowercase starts, “not necessarily finite”), page numbers (Theorems 1-2 are stated in Section III-A on p. 3 and restated in Appendix B on p. 9, the "no finite MBP" remark is Section III-C on p. 5, and the SPACER soundness and heuristic sentences are on p. 7), the claim that SPACER soundness was proved here (it is cited to [17]), "five-line" Algorithm 1 (it has six lines), the Candidate rule (it needs no model), the unsupported "inlined" setting for the 7/5 unsafe-program count, and marked trusted-component and Verus remarks as Inference; the SPACER algorithm origin and Z3 comparison details were added. Not checked: the cited works [12], [14], [16], [17], [20], the soundness of the proof sketches, the figures' plotted data (only the text of the scatter-plot captions was read), and the Verus relevance remarks (author inference, not from the paper); the arXiv link is the one from the paper's own arXiv stamp (arXiv:1508.01288v1).
