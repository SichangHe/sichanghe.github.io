# Compositional Verification of Procedural Programs using Horn Clauses over Integers and Arrays
(authored by agents unless marked 🧑)
Tag: `komuravelli2015compositional`, [paper](http://arxiv.org/abs/1508.01288v1)

## scope and result

Komuravelli, Bjørner, Gurfinkel, and McMillan give an SMT-based compositional safety algorithm for procedural C programs with heap and arrays. The representation is constrained Horn clauses (CHCs), where unknown predicates are procedure summaries and array memory uses the extensional theory of arrays (ARR). The key algorithms are array quantifier elimination (QE), model-based projection (MBP), and SPACER's may/must summary search. The paper claims polynomial-time MBP per model for array projection, but exact QE is exponential and combined ARR+LIA may not have a finite MBP.

The paper states: “We present a compositional SMT-based algorithm for safety of procedural C programs that takes the heap into consideration as well.” (Abstract, p. 1). It also states: “The ability to reason with ARR makes it possible to handle heap-allocating programs without inlining procedures, as the heap can be faithfully modeled using ARR.” (Section 1, p. 1). Inference: this is relevant to VL because a summary-based verifier can avoid expanding every call, but the technique operates over CHCs and SMT formulas rather than Rust/Verus syntax.

## technique 1: encode procedures as CHCs and summaries

Use this to obtain modular, procedure-level safety obligations. A CHC has body predicates and a constrained formula implying either another predicate or a query. Each predicate `P_k` denotes an unknown partial-correctness summary. A satisfying interpretation of all predicates is a certificate corresponding to Floyd/Hoare annotations. The paper's normal-form reduction uses one invariant predicate:

- `Inv(x) <- init(x)`
- `¬bad(x) <- Inv(x)`
- `Inv(x') <- Inv(x), Inv(xo), tr(x,xo,x')`

Here `x` is the pre-state, `x'` the post-state, and `xo` a summarized call state. Replace `Inv` occurrences with candidate formulas through `F(φA,φB) = (φA(x) ∧ φB(xo) ∧ tr(x,xo,x')) ∨ init(x')`.

Step by step: encode each procedure transition and call as a CHC; choose quantifier-free summary candidates; ask the SMT solver for a satisfying predicate interpretation; treat a satisfying assignment as the proof certificate. The paper says: “A satisfying assignment to the symbols Pk is thus a certificate that the program satisfies its specification and corresponds to the annotations in a Floyd/Hoare style proof.” (Section IV-A, p. 5).

Inference: a Verus version would express each procedure summary as a `requires`/`ensures` contract and ghost state predicate, then prove callers against those contracts. CHC solving can guide candidate discovery, but Verus proof functions and contracts remain the checked artifact; no direct CHC syntax carries over. Trusted components are the CHC translation and solver interpretation.

## technique 2: array quantifier elimination with rewrite rules

Use this when heap or array variables must be projected from a verification condition. For `∃a:arr(I,V). φ`, `ARRAY_QE` performs three phases. First, repeatedly eliminate writes using read-after-write, partial-equality, trivial-equality, and symmetry rewrites. Second, case-split partial equalities and factor reads of the quantified array by introducing value variables. Third, lift equality/disequality cases, eliminate array equalities by substitution, eliminate disequalities over an infinite index domain, and apply Ackermann reduction to remove read terms.

The algorithm's five-line shape is: `φ1 ← (ELIM_WR*) (∃a·φ)`; `φ2 ← (CASE_SPLIT_EQ; FACTOR_RD)(φ1)`; split into disjuncts with `LIFT_EQ_DISEQ_RD`; for each disjunct apply `ELIM_EQ; ELIM_DISEQ; ACKERMANN`; return the disjunction. The paper's worked rewrite starts from `∃a·(b = wr(a,i1,v1) ∨ (...))`, uses `ELIM_WR_RD`, `PARTIAL_EQ`, `ELIM_WR_EQ`, and `CASE_SPLIT_EQ`, and ends with formulas free of the array quantifier (Section III-A, pp. 3–4).

Correctness and cost are explicit: “ARRAY QE(∃a : arr(I, V ) · ϕ) returns ∃v : V · ρ, where ρ is quantifier-free and ∃v · ρ ≡ ∃a · ϕ.” (Theorem 1, Appendix B, p. 8). “ARRAY QE(∃a · ϕ) terminates in time exponential in the size of ϕ.” (Theorem 2, Appendix B, p. 8). The denominator for this complexity claim is formula size `N`, not benchmark count; the appendix bounds total disjuncts by `O(N^N)` and each disjunct's size by a polynomial in `N`.

Inference: Verus can model an array or heap map as a spec-level sequence/map and prove read-after-write lemmas, but it does not automatically perform this CHC QE. The rewrite rules are a candidate preprocessing pass outside Verus. Assumptions include quantifier-free input except introduced index/value quantifiers and, for `ELIM_DISEQ`, an infinite index domain.

## technique 3: model-based projection (MBP) for arrays and ARR+LIA

Use MBP to create a finite, model-specific under-approximation rather than an exact projection. Given a model `M` of quantifier-free `φ`, return `ψM` such that `M |= ψM` and `ψM` entails `φ`. Apply the array QE rewrites but choose only one model-true disjunct at each branching point. For array-valued variables this is polynomial per model, although the set of possible generalizations can be exponential. For index/value variables, use substitution of their model values; in ARR+LIA, first apply `ARRAY_MBP`, then `LIA_MBP` to integer quantifiers absent from array terms, then substitution for remaining integers.

The paper warns: “There is no equivalent quantifier-free formula for ∃i : int · rd (a, i) > 0.” (Section III-B, p. 4). Thus ARR+LIA MBP may be useful but “not necessarily finite”; non-finite MBP means SPACER can generate infinitely many queries even for a fixed recursion depth. Equality resolution can eliminate cases such as `∃i·i=t ∧ rd(a,i)>0`; otherwise substitution is required.

Inference: in Verus, a model-guided candidate invariant can suggest lemmas or instantiate quantified facts, but proof acceptance must still be universal over all states. A finite MBP result is evidence for a bounded search step, not a Verus proof by itself. The paper's correctness obligation is MBP's entailment and model inclusion; termination is conditional on finite MBP.

## technique 4: SPACER may/must summary search

Use this to search local reachability goals without inlining procedures. SPACER requires (a) a model-generating SMT solver, (b) an MBP procedure, and (c) an interpolation procedure. It maintains reachability queries `Q`, may summaries `Oi` over-approximating states at recursion depth `i`, and a must summary `U` under-approximating reachable states. Initialize `N=0`, `O0=init`, `Oi=⊤` for `i>0`, and `U=init`.

Apply the rules operationally: `Candidate` creates a query from a model of `ON ∧ bad`; `DecideMust` projects through `U`; `DecideMay` projects through the caller's `Oi`; `Leaf` advances a query when the previous may summary excludes it; `Successor` enlarges `U` with a projected reachable state; `Conflict` strengthens all relevant `Oj` with an interpolant; `Induction` propagates a clause; `Unfold` increments recursion depth; `Safe` returns `Oi` when `Oi+1 ⇒ Oi`; `Unsafe` returns when `U ∧ bad` is satisfiable.

This separation avoids duplicate subgoals: “The key distinguishing feature of SPACER is compositional reasoning.” (Section IV-B, p. 5). The paper's soundness/termination claim is conditional: “SPACER is sound and if MBP utilizes finite MBP functions, SPACER also terminates for a fixed N.” (Section IV-B, p. 6).

Inference: Verus can use the same architecture conceptually by giving each function a summary predicate and maintaining inductive invariants, but Verus does not expose SPACER's query queue or interpolation API. A product integration would need a CHC front end and a proof-producing bridge back to Verus contracts.

## technique 5: stabilize interpolation with array equalities

Use this when interpolants retain model-specific integer constants and cause non-termination. The paper's example has `Inv(a,b) <- a=b` and a bad query requiring opposite signs at an index. Standard MBP yields `rd(a,k)<0 ∧ rd(b,k)>0`; interpolation may repeatedly return `rd(a,k)=rd(b,k)` instead of the useful `a=b`. Modify MBP by adding `a=b` or `a≠b` according to the model for every array pair in the projected formula. Modify interpolation with a minimal unsatisfiable subset (MUS): separate literals whose integer quantifiers were substituted, generalize them to `φ̂2`, and interpolate against the generalized formula. Add these equalities lazily on demand.

The authors explicitly limit the claim: “adding such (dis-)equalities to the queries is only a heuristic and may not always help with termination.” (Section IV-C, p. 6). Inference: a Verus analogue is to expose extensional map equality as a lemma instead of repeatedly proving pointwise equalities, while treating this as a proof-search heuristic, not a soundness extension.

## evidence, limitations, and product threat

The evaluation uses a prototype SPACER with SeaHorn/LLVM and compares non-inlined versus inlined encodings on 215 SV-COMP 2015 Device Drivers benchmarks selected because Z3 GPDR with inlining exceeded one minute or timed out. Hardware was a 2.2 GHz AMD Opteron 6174 with 516 GB RAM, Ubuntu Linux; each task had 30 minutes and 15 GB. The paper reports scatter plots, not a table of pass fractions. It reports that SPACER with non-inlining has a clear runtime advantage over inlining and that LIA-only handles only a small fraction of the non-inlined benchmarks. For the seven unsafe programs verified by Z3, five could not be verified by SPACER; denominator and setting are exactly these 7 unsafe Z3-verified programs under the inlined comparison. The authors also say they cannot distinguish divergence from timeout, so plots do not support a clean success-rate claim.

Proved: array QE equivalence and exponential bound (theorems), MBP model inclusion, and conditional SPACER soundness/termination. Measured: the 215-benchmark comparison under the stated hardware and limits. Trusted: LLVM/SeaHorn translation, SMT solver, interpolation and MBP implementations, CHC encoding, and user specifications. Inference: agent-written verified Rust is threatened by summary/specification mismatch and non-finite proof search; the strongest reusable idea is modular summaries plus explicit heap extensionality, while automatic CHC inference cannot replace checking the final Verus contracts.

## techniques for the catalog

- CHC summary encoding — represent each procedure by an unknown predicate whose satisfying interpretation is a Hoare-style certificate
- array QE — eliminate heap arrays by read/write rewrites, case splits, substitution, and Ackermann reduction
- model-based projection — select model-true under-approximations to obtain polynomial-per-model proof subgoals
- may/must SPACER search — combine over- and under-approximating summaries with interpolation for recursive modular safety
- equality-guided interpolation — add array equalities and MUS generalization to avoid model-constant interpolants
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
