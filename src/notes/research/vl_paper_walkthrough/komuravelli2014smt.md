# SMT-based Model Checking for Recursive Programs
(authored by agents unless marked 🧑)
Tag: `komuravelli2014smt`, [paper](http://arxiv.org/abs/1405.4028v2)

## what the paper proves and measures

Komuravelli, Gurfinkel, and Chaki present RecMC, an SMT-based safety checker for recursive programs. It analyzes procedures separately, maintains both over-approximating summary facts and under-approximating reachability facts, and alternates bounded checking with an inductiveness test. The abstract states, “Under-approximations are used to analyze procedure calls without inlining.” (Abstract, p. 1) For decidable theories RecMC is a co-semidecision procedure: it is guaranteed to find a counterexample if one exists. For Boolean programs it is a complete decision procedure with worst-case `O(N² · 2^(2k))` rule applications, where N is the number of procedures and k = max{|v_P|} is the largest number of parameter variables (inputs and outputs) of any procedure (Theorems 2–3, Section 4, p. 11). Safety itself is undecidable in general with unbounded recursion, and for LRA or LIA (Section 1, p. 2).

The implementation, Spacer, is built on Z3 for SMT solving and interpolation, with a front-end based on UFO that converts C programs to Z3's Horn-SMT format; MBP provides lazy under-approximate quantifier elimination (Sections 5–6, pp. 11–13). The authors summarize the central result as, “For Linear Arithmetic (integers and rationals), we give an efficient instantiation of the algorithm by applying QE lazily.” (Abstract, p. 1) The paper proves soundness (Theorem 1) and, for termination, assumes an oracle for satisfiability modulo the background theory (Theorem 2). Inference: for Verus, the analogous trusted boundary includes Verus’s translation and solver, Rust compiler and proof erasure, and the function specifications used as procedure summaries. Inference: RecMC’s facts are search summaries; they do not by themselves prove that a specification captures the product requirement.

## technique 1: dual bounded summaries for recursive procedures

what it is: RecMC stores a reachability map ρ and summary map σ, partitioned by call-stack bound. A reachability fact under-approximates a procedure’s bounded behavior: every satisfying assignment corresponds to an execution. A summary fact over-approximates it: every bounded execution satisfies the fact (Section 2, pp. 3–4; Section 3, pp. 6–7). The environment Uρ^b is the disjunction of the ρ facts at bounds ≤ b, and Oσ^b is the conjunction of the σ facts at bounds ≥ b (Section 3, p. 7).

when to use: Inference: use this when recursion makes inlining grow the call tree. The paper says that BMC-based competitors' SMT instance “grows exponentially with the bound on the call-stack” (Section 1, p. 2). Reachability facts can witness real counterexamples and let callers jump over calls without re-analyzing bodies. Summary facts block infeasible paths and may become inductive proofs.

how to do it:
1. initialize `n=0`, `ρ=∅`, and `σ=∅`
2. run BndSafety at stack bound n; it answers bounded reachability queries using ρ facts (to witness a violation) and σ facts (to block infeasible paths), and updates ρ and σ
3. if BndSafety returns UNSAFE, the ρ facts suffice to construct a counterexample; return UNSAFE with ρ
4. otherwise run CheckInductive: for each procedure P and each δ in σ(P, n), test whether `JβP Kσ^n ⇒ δ`; if so copy δ to bound `n+1` (the paper likens this to push generalization in IC3); if any δ fails, the result is not inductive
5. return SAFE with σ when everything is inductive; otherwise increment n and repeat (Fig. 5, Section 4, pp. 7–8)

The paper’s example (Fig. 3, Fig. 4, Section 2, pp. 4–5) shows that at n = 1, σ is `σ(M, 1) = {m0 ≥ 2m + 4}`, `σ(T, 0) = {t0 ≥ 2t}`, `σ(D, 0) = {d ≤ d0 − 1}`, and that, ignoring bounds, σ is inductive, so RecMC declares the program SAFE. The n = 0 iteration is trivial because M has no call-free executions. Inference: in Verus, a summary corresponds to a function’s `requires`/`ensures` contract or a ghost relation over input and output state. A reachability witness can be represented by a ghost state and a proved lemma, but Verus has no native bounded-call-stack summary map; an external driver would generate and check candidate contracts.

what is proved: BndSafety preserves the invariant `I(Uρ^b(ΣQ)) ⊆ ⟦Q⟧^b_I ⊆ I(Oσ^b(ΣQ))` (Equation 3, Appendix B, pp. 20–21), so the Safe and Unsafe terminal rules are sound (Theorem 1, Section 4, p. 10; the proof shows only the Sum case in detail). The paper assumes procedures are not passed as parameters (Section 1, p. 1), and without loss of generality no loops, no global variables and no internal procedures (Section 3, p. 6). Calls appear only positively in βP so that semantics is a least fixed point (Section 3, p. 6).

## technique 2: interpolation-based summary inference

what it is: when a bounded query cannot be answered from existing facts, `Sum` checks whether an over-approximation of a procedure body is inconsistent with the queried bad condition. If so, it uses interpolation to synthesize a new summary ψ over the procedure’s input/output variables, adds ψ to σ at bound b, and removes pending queries `<P, η, c>` with c ≤ b that ψ now blocks (Section 4, pp. 8–9).

how to do it:
1. represent a pending query as `<P, ϕ, b>`, asking whether there is an execution of P with call-stack bounded by b whose parameter values satisfy ϕ
2. build `JβP Kσ^(b−1)`, replacing calls by over-approximating summaries of callees
3. if `JβP Kσ^(b−1) ⇒ ¬ϕ` is valid, compute `ψ = Itp(JβP Kσ^(b−1), ¬ϕ)`
4. add ψ to σ(P,b), and remove any pending query `<P, η, c>`, c ≤ b, for which `JΣP Kσ^c ∧ ψ ⇒ ¬η` (rule Sum, Fig. 6 and Section 4, pp. 8–9). Interpolation is Craig interpolation, citing [16] (p. 8)

Interpolation supplies a fact over the procedure’s visible variables while eliminating locals. Inference: a Verus analogue would infer a candidate `ensures` clause from failed proof obligations and then ask Verus to prove the function under that clause; interpolation itself is outside Verus’s normal Rust proof language. The soundness proof (Appendix B, pp. 20–21) uses that `∃ℓP · JβP Kσ^(b−1) ⇒ ψ` and the invariant (3). Inference: it does not need the interpolant to be strong or complete.

## technique 3: path-based reachability facts and recursive query refinement

what it is: `Reach` extracts a real execution path from a procedure’s path formula using under-approximations of callees. If a path is satisfiable with the bad condition, it existentially quantifies locals and records the resulting ψ as a reachability fact. If neither Sum nor Reach applies, `Query` selects a call on a potential counterexample path, whose under-approximation is too strong to witness the path but whose over-approximation is too weak to block it, and creates a bounded query for that callee at bound b − 1 (Section 4, pp. 8–10).

how to do it:
1. enumerate prime-implicant paths of P’s body
2. use ρ facts for callees to build `JπKρ^(b−1)`; if it is satisfiable with ϕ, existentially quantify P’s locals and add ψ to ρ(P,b)
3. if Sum and Reach do not apply, choose (nondeterministically) a path π such that `JπKσ^(b−1)` is satisfiable with ϕ but `JπKρ^(b−1) ⇒ ¬ϕ`
4. partition π as prefix πu, call `ΣR(a)`, and suffix πv such that `JΣR(a)Kρ^(b−1)` is too strong to witness it and `JΣR(a)Kσ^(b−1)` too weak to block it; form ψ by existentially quantifying all variables of `Jπu Kσ^(b−1) ∧ Jπv Kρ^(b−1) ∧ ϕ` except the call arguments a, and rename a to the parameters of R
5. enqueue `<R, ψ, b−1>`, provided ψ does not overlap with other queries for R at b−1 (in practice by always applying the rule to the query with the smallest b), and repeat until Sum or Reach answers the query (Fig. 6 and the worked example, pp. 9–10)

The example, for query `<M, m0 < 2m + 4, 1>`, creates the query `<T, t0 < 2t, 0>`, whose negative answer makes the execution `<m0 = 3, ℓ0 = 3, ℓ1 = 2, m = 1>` spurious (Section 4, p. 10). The paper proves termination of BndSafety with an SMT satisfiability oracle because the number of reachability facts for a bound is finite (a fact corresponds to a path) and the non-overlap side-condition of Query bounds the number of queries (Theorem 2, p. 11; Appendix C, Lemmas 3–6, pp. 21–25). Inference: for Verus, this is a counterexample-guided decomposition of a failed proof into a callee contract obligation; it can produce a `proof fn` obligation, but the path partition and bounded recursion are an external analysis layer.

## technique 4: Model Based Projection for lazy quantifier elimination

what it is: existential variables introduced by Reach and Query can make formulas exponentially large. MBP replaces `∃x·λm(x,y)` with a finite set of quantifier-free under-approximations selected from models. For Linear Rational Arithmetic, `LRAProj` chooses a Loos–Weispfenning disjunct based on equalities and lower bounds in a model; for Linear Integer Arithmetic, `LIAProj` is based on Cooper’s method and additionally selects a residue i modulo D, the least common multiple of the divisors in the divisibility literals (Section 5, pp. 11–12; Appendix G, pp. 27–28; Equations 9–11). The paper notes that LRAProj is “linear in the size of λ” (p. 12).

how to do it:
1. express the quantified formula as `∃x·λm(x,y)` in negation normal form
2. derive finite virtual-substitution disjuncts: `λm[e]` for each equality `x = e`, `λm[ℓ+ε]` for each lower bound `ℓ < x`, and `λm[−∞]` (Equation 2, p. 12; the paper assumes x is a single variable and x occurs only in literals `ℓ < x`, `x < u`, `x = e`)
3. given a model M of λm, pick `λm[e]` if M satisfies some `x = e`; else `λm[ℓ+ε]` for a lower bound `ℓ < x` satisfied by M with every other satisfied lower bound `ℓ′ ≤ ℓ`; else `λm[−∞]`; break ties by a syntactic ordering on terms
4. in the modified Reach, set ψ = Projλ(M) with M ⊨ λm ∧ ϕ; in the modified Query, set ψ = Projλ(M) with M ⊨ λm ∧ `JΣR(a)Kσ^(b−1)`
5. the stronger model requirement keeps Reach answering the current query and keeps the new query from being immediately answered by known facts (Section 5, pp. 12–13)

The paper defines MBP as a function with finite image such that λ is equivalent to the disjunction of its images and every model satisfies its own projection (Section 5, p. 11), and proves `LRAProj` is an MBP (Theorem 4, p. 12; proof in Appendix F, pp. 26–27; LIAProj is Lemma 7, Appendix G, with proof only said to be “similar”). The modified BndSafety is sound and terminating assuming an oracle and an MBP for the theory (Theorem 5, p. 13; Appendix E, pp. 25–26). Inference: a Verus tool could use MBP offline to shrink quantified ghost-state candidates before emitting quantifier-free `spec fn` relations; the resulting relation still needs Verus proof, and Verus does not expose a general MBP API.

## evidence and limitations

Spacer was evaluated on 2,908 Boolean Programs from the SLAM toolkit and 799 C programs from SV-COMP 2014 (Svcomp-1), plus two variants (Svcomp-2, Svcomp-3) with parts factored into procedures, against the GPDR implementation in Z3, with a 30-minute time limit and 16 GB memory limit on a 2.2 GHz AMD Opteron 6174 with 516 GB RAM (Section 6, p. 13). Figure 8 reports counts of programs verified, not percentages (SAFE/UNSAFE). Spacer: SLAM 1,721/985; Svcomp-1 249/509; Svcomp-2 213/497; Svcomp-3 234/482. Z3: 1,722/997; 245/509; 208/493; 234/477. Virtual Best Solver (programs verified by at least one tool): 1,727/998; 252/509; 225/500; 240/482 (Fig. 8, p. 13). Inference: Spacer is not strictly better, since Z3 verifies more SAFE SLAM programs (1,722 vs 1,721) and more UNSAFE SLAM programs (997 vs 985). The paper says that on most SLAM benchmarks “the runtimes of Spacer and Z3 are similar (within 2 minutes)”, that Spacer handles a Bebop example whose call tree grows exponentially in the number of procedures “significantly better than Z3” (Fig. 9(a), p. 13), and that on the SVCOMP sets the scatter plots (Figs. 9(b) and 10, p. 14) show Spacer “significantly better on most of the programs”. Inference: because the benchmark sets have 2,908 and 799 programs, Spacer’s SAFE plus UNSAFE counts (2,706 and 758) leave programs unverified (timeout, memory-out, or other); the paper does not break this down.

The paper’s strongest theoretical claims are relative to decidable background theories and satisfiability/interpolation/MBP oracles. Its conclusion states, “We presented RecMC, a new SMT-based algorithm for model checking safety properties of recursive programs.” (Section 8, p. 15) Safety is undecidable for LRA and LIA; RecMC is guaranteed to find a counterexample if one exists. Inference: it need not terminate on a safe instance in those theories, since otherwise safety would be decidable. The Boolean complexity theorem is for N procedures and maximum parameter count k, not for arbitrary Rust program size. Inference: VL should reuse dual over/under-approximate procedure contracts, interpolation-like candidate strengthening, and model-based projection as proof-search infrastructure. It should not treat inferred summaries as trusted specifications or inline all recursive Rust by default. Inference: product threat is medium; stale or weak contracts can hide behavior, while final Verus checking protects only the contract actually supplied.

## techniques for the catalog

- dual procedure summaries — maintain under-approximating reachability facts and over-approximating summaries by call-stack bound
- interpolation summary inference — derive a visible-variable procedure fact from an unsatisfiable bounded query
- path-guided recursive refinement — split a potential counterexample at a callee and recursively query the smaller procedure
- model-based projection — replace existential quantification with finite model-selected quantifier-free under-approximations
- inductive summary checking — test bounded summaries against every procedure body and promote inductive facts to an unbounded safety proof

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "On most of the SLAM benchmarks, the runtimes of Spacer and Z3 are similar (within 2 minutes)."): I read the paper text from first line to last, including the appendices, and checked the quotations, theorem numbers and statements, complexity bound, algorithm steps (Figs. 2, 5, 6), the Section 2 example, the LRA MBP definition and the Fig. 8 counts; I corrected the Conclusion quote page (p. 15, not 16), the Theorem 2 and Theorem 4 page references, the Query and CheckInductive step descriptions, and the description of k, added the Z3 comparison row and the Section 6 runtime claims, and labelled own conclusions as Inference; I did not check the Verus-related inferences against Verus itself, nor the PDF layout for two-column page numbers beyond the pdftotext page headers, nor the cited external works or the linked Spacer artifacts.
