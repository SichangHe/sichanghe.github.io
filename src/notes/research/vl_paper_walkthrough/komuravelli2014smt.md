# SMT-based Model Checking for Recursive Programs
(authored by agents unless marked 🧑)
Tag: `komuravelli2014smt`, [paper](http://arxiv.org/abs/1405.4028v2)

## what the paper proves and measures

Komuravelli, Gurfinkel, and Chaki present RecMC, an SMT-based safety checker for recursive programs. It analyzes procedures separately, maintains both over-approximating summary facts and under-approximating reachability facts, and alternates bounded checking with an inductiveness test. The abstract states, “Under-approximations are used to analyze procedure calls without inlining.” (Abstract, p. 1) For decidable theories RecMC is a co-semidecision procedure: it is guaranteed to find a counterexample if one exists. For Boolean programs it is a complete decision procedure with worst-case `O(N² · 2^(2k))` rule applications, where N is the number of procedures and k the maximum parameter count (Theorems 2–3, Section 4, pp. 10–11).

The implementation, Spacer, uses Z3 for SMT solving and interpolation and Model Based Projection (MBP) for lazy under-approximate quantifier elimination (Sections 5–6, pp. 11–14). The authors summarize the central result as, “For Linear Arithmetic (integers and rationals), we give an efficient instantiation of the algorithm by applying QE lazily.” (Abstract, p. 1) The paper proves soundness relative to the background theory and solver oracle. Inference: for Verus, the analogous trusted boundary includes Verus’s translation and solver, Rust compiler and proof erasure, and the function specifications used as procedure summaries. RecMC’s facts are search summaries; they do not by themselves prove that a specification captures the product requirement.

## technique 1: dual bounded summaries for recursive procedures

what it is: RecMC stores a reachability map ρ and summary map σ, partitioned by call-stack bound. A reachability fact under-approximates a procedure’s bounded behavior: every satisfying assignment corresponds to an execution. A summary fact over-approximates it: every bounded execution satisfies the fact (Section 2, pp. 3–4; Section 3, pp. 6–7).

when to use: use this when recursion makes inlining grow the call tree. Reachability facts can witness real counterexamples and let callers jump over calls without re-analyzing bodies. Summary facts block infeasible paths and may become inductive proofs.

how to do it:
1. initialize `n=0`, `ρ=∅`, and `σ=∅`
2. run bounded safety at stack bound n; for each procedure, use known ρ facts to search for a reachable violation and σ facts to rule out paths
3. if a violation is witnessed, return UNSAFE with the reachability facts
4. if bounded safety succeeds, check whether each σ fact is inductive through every procedure body; propagate inductive facts to bound `n+1`
5. return SAFE when σ is inductive; otherwise increment n and repeat (Fig. 5, Section 4, pp. 7–8)

The paper’s example shows that after bound one, σ contains `m0 ≥ 2m + 4` for M, `t0 ≥ 2t` for T, and `d ≤ d0 − 1` for D, and these summaries are inductive (Section 2, pp. 4–5). Inference: in Verus, a summary corresponds to a function’s `requires`/`ensures` contract or a ghost relation over input and output state. A reachability witness can be represented by a ghost state and a proved lemma, but Verus has no native bounded-call-stack summary map; an external driver would generate and check candidate contracts.

what is proved: BndSafety preserves `Uρ ⊆ bounded semantics ⊆ Oσ` (Appendix B, pp. 20–21), and the Safe/Unsafe terminal rules are sound (Theorem 1, Section 4, p. 10). The method assumes procedures are not passed as parameters and uses a positive-occurrence encoding of calls to obtain least-fixed-point semantics (Section 3, pp. 6–7).

## technique 2: interpolation-based summary inference

what it is: when a bounded query cannot be answered from existing facts, `Sum` checks whether an over-approximation of a procedure body is inconsistent with the queried bad condition. If so, it uses interpolation to synthesize a new summary ψ over the procedure’s input/output variables, stores ψ at the current bound, and removes queries it now blocks (Section 4, pp. 8–9).

how to do it:
1. represent a pending query as `<P, ϕ, b>`, asking whether P has a bound-b execution satisfying ϕ
2. build `JβP Kσ^(b−1)`, replacing calls by over-approximating summaries of callees
3. if `JβP Kσ^(b−1) ⇒ ¬ϕ` is valid, compute `ψ = Itp(JβP Kσ^(b−1), ¬ϕ)`
4. add ψ to σ(P,b), and remove any pending query whose condition is inconsistent with the strengthened summary (Fig. 6 and Section 4, pp. 8–9)

Interpolation supplies a fact over the procedure’s visible variables while eliminating locals. Inference: a Verus analogue would infer a candidate `ensures` clause from failed proof obligations and then ask Verus to prove the function under that clause; interpolation itself is outside Verus’s normal Rust proof language. The paper’s soundness relies on the interpolant implication and the over-approximation invariant, not on a heuristic claim that the interpolant is complete.

## technique 3: path-based reachability facts and recursive query refinement

what it is: `Reach` extracts a real execution path from a procedure’s path formula using under-approximations of callees. If a path is satisfiable with the bad condition, it existentially quantifies locals and records the resulting ψ as a reachability fact. If the current over- and under-approximations disagree, `Query` selects a call on a potential counterexample path and creates a smaller bounded query for that callee (Section 4, pp. 8–10).

how to do it:
1. enumerate prime-implicant paths of P’s body
2. use ρ facts for callees to build `JπKρ^(b−1)`; if it is satisfiable with ϕ, existentially quantify P’s locals and add ψ to ρ(P,b)
3. if no existing fact proves or witnesses the query, choose a path whose prefix is blocked only by σ and whose suffix is constrained by ρ
4. partition the path as prefix, call `ΣR(a)`, and suffix; existentially quantify all variables except call arguments to form ψ
5. enqueue `<R, ψ, b−1>` and repeat until Sum or Reach answers the query (Fig. 6 and the worked example, pp. 9–10)

The example creates query `T(t) |=0 t0 < 2t` to eliminate a spurious path (Section 4, p. 10). The paper proves termination of BndSafety with an SMT satisfiability oracle because each bound has finitely many reachability facts and non-overlapping queries (Theorem 2 and Appendix C, pp. 10, 21–25). Inference: for Verus, this is a counterexample-guided decomposition of a failed proof into a callee contract obligation; it can produce a `proof fn` obligation, but the path partition and bounded recursion are an external analysis layer.

## technique 4: Model Based Projection for lazy quantifier elimination

what it is: existential variables introduced by Reach and Query can make formulas exponentially large. MBP replaces `∃x·λm(x,y)` with a finite set of quantifier-free under-approximations selected from models. For Linear Rational Arithmetic, `LRAProj` chooses a Loos–Weispfenning disjunct based on equalities and lower bounds in a model; for Linear Integer Arithmetic, `LIAProj` uses Cooper-style residue classes (Section 5, pp. 11–13; Appendix G, pp. 27–28).

how to do it:
1. express the quantified formula as `∃x·λm(x,y)` in negation normal form
2. derive finite virtual-substitution disjuncts: equality terms, lower-bound `ℓ+ε` cases, and a `−∞` case for LRA (Equation 2, p. 12)
3. given a model M of λm, choose the disjunct whose equality or maximal satisfied lower bound covers M; use a fixed syntactic ordering for ties
4. replace the existential formula with the selected quantifier-free projection in Reach and Query
5. require the model to satisfy the stronger path/query premises, preventing redundant rule applications (Section 5, pp. 12–13)

The paper defines MBP so that its finite image covers all models and every selected projection is satisfied by its source model, then proves `LRAProj` is an MBP (Theorem 4, pp. 11–12). The modified BndSafety remains sound and terminating assuming an MBP oracle (Theorem 5, p. 13). Inference: a Verus tool could use MBP offline to shrink quantified ghost-state candidates before emitting quantifier-free `spec fn` relations; the resulting relation still needs Verus proof, and Verus does not expose a general MBP API.

## evidence and limitations

Spacer was evaluated on 2,908 Boolean programs and 799 SV-COMP programs, plus two factored SV-COMP variants, with 30-minute and 16-GB limits (Section 6, p. 13). Figure 8 reports counts rather than percentages: for the four benchmark sets, Spacer verifies 1,721 SAFE and 985 UNSAFE SLAM programs; 249 SAFE and 509 UNSAFE Svcomp-1; 213 SAFE and 497 UNSAFE Svcomp-2; and 234 SAFE and 482 UNSAFE Svcomp-3. The Virtual Best Solver counts are 1,727/998, 252/509, 225/500, and 240/482 respectively (Fig. 8, p. 13). The denominator for each row is the benchmark set’s programs, not the sum of Spacer’s categories when timeout/memory-out programs remain.

The paper’s strongest theoretical claims are relative to decidable background theories and satisfiability/interpolation/MBP oracles. Its conclusion states, “We presented RecMC, a new SMT-based algorithm for model checking safety properties of recursive programs.” (Conclusion, p. 16) General Linear Arithmetic safety remains undecidable; RecMC is guaranteed to find a counterexample if one exists but need not terminate on a safe instance. The Boolean complexity theorem is for N procedures and maximum parameter count k, not for arbitrary Rust program size. Inference: VL should reuse dual over/under-approximate procedure contracts, interpolation-like candidate strengthening, and model-based projection as proof-search infrastructure. It should not treat inferred summaries as trusted specifications or inline all recursive Rust by default. Product threat is medium: stale or weak contracts can hide behavior, while final Verus checking protects only the contract actually supplied.

## techniques for the catalog

- dual procedure summaries — maintain under-approximating reachability facts and over-approximating summaries by call-stack bound
- interpolation summary inference — derive a visible-variable procedure fact from an unsatisfiable bounded query
- path-guided recursive refinement — split a potential counterexample at a callee and recursively query the smaller procedure
- model-based projection — replace existential quantification with finite model-selected quantifier-free under-approximations
- inductive summary checking — test bounded summaries against every procedure body and promote inductive facts to an unbounded safety proof

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
