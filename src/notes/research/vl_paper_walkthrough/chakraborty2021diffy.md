# Diffy: Inductive Reasoning of Array Programs using Difference Invariants
(authored by agents unless marked 🧑)
Tag: `chakraborty2021diffy`, [paper](https://arxiv.org/abs/2105.14748)

## problem and central construction
Diffy verifies C array programs parameterized by array size N. The input is a Hoare triple {ϕ(N)} P_N {ψ(N)} required for every N>0, including sequential and nested loops. The abstract states: “The technique relies on constructing two slightly different versions of the same program.” (p. 1). One version, Q_(N−1), changes loop bounds from N to N−1 but leaves other uses of N unchanged; P_(N−1) replaces every use of N. The tool computes a simpler peel(P_N) such that P_N is semantically equivalent to Q_(N−1); peel(P_N), then relates corresponding variables of Q_(N−1) and P_(N−1) with difference invariants. This avoids discovering a complex loop invariant for every loop.

Inference: In Verus, the closest encoding is a recursive/specification function over a size parameter plus a proof that one size step preserves the contract. Verus does not natively accept C Hoare triples, so the executable Rust loops and array accesses would need contracts and loop invariants where the paper's transformed proof supplies facts.

## technique 1: generate Q and peel
Use this when a program has loop bounds linear in N and well-nested loops. Algorithm 1 (`GenQandPeel`) first lists top-level loops in order, then calls `GenQandPeelForLoop` for each. For a loop L with upper bound U_L(N), form Q_L by substituting N−1 only in upper-bound expressions. Construct the missed iterations as a peel, move peeled fragments after Q loops, and repair expressions whose values changed when earlier peels moved. For nested loops, process inner loops by nesting depth and insert their peels into the enclosing loop's peel. The algorithm guarantees strictly lower maximum nesting depth in peel(P_N); if P_N has no nested loops, peel(P_N) is loop-free (Section 4.1, pp. 10–13). Closed-form summaries can replace peeled loops, e.g. “the peeled loop … `S = S + 1` … is summarized as `S = S + N`” (Section 4.1, p. 13).

The semantic reason is explicit: “Given P_N, we first algorithmically construct two programs Q_N−1 and peel(P_N), such that P_N is semantically equivalent to Q_N−1 ; peel(P_N).” (Section 2, p. 6). This differs from earlier difference-program methods because Q_N−1 preserves non-bound uses of N.

Inference: In Verus, a proof can define a size-reduced ghost/spec computation and expose the peeled operations as a lemma over slices or sequences. The paper's automatic code transformation does not carry over to arbitrary Rust control flow; it would need a restricted grammar or manually supplied transformation.

## technique 2: difference-invariant inference
Construct the standard cross-product Q_(N−1) × P_(N−1), with disjoint variable sets V_Q and V_P. Corresponding loops have synchronized bounds; if branch conditions can be proved equivalent, synchronize them, otherwise explore all four branch combinations. Run dataflow analysis at loop heads, exits, and branch conditions. Start with equalities relating corresponding variables in the two preconditions and propagate equality expressions, including disjunctions. The resulting D(V_Q,V_P,N−1) is the difference invariant.

The authors report: “The only dataflow values of interest are differences between corresponding variables in Q_N−1 and P_N−1.” (Section 4.3, p. 14). In all experiments they needed no more than quadratic expressions in N (Section 4.3, p. 14). Their worked example obtains x′−x = (N−1)(2N−1) at the first loop exit and corresponding array differences for the second loop (Section 4.3, p. 14). They note that equality is the default domain, with interval analysis for inequalities or a guess-and-check expression library as extensions (Section 4.3, p. 14).

Inference: A Verus analogue would use ghost sequences and `assert forall` relations between size-N and size-(N−1) executions, then invoke `lemma` proofs to propagate equalities. Verus's `invariant` is a clause on a loop, not a callable function; the relation would be supplied as a loop invariant or lemma postcondition.

## technique 3: inductive verification and strengthening
Algorithm 2 executes the following steps. First check the base triple at N=1 and report a counterexample if it fails. Generate Q and peel (Algorithm 1). Split ϕ(N) into ϕ′(N−1) and Δϕ′(N), allowing quantifier ranges to change while keeping unaffected uses of N. Infer D on the cross-product. Eliminate V_P from ψ(N−1) ∧ D using quantifier elimination to obtain ψ′(N−1). Check the inductive triple {ψ′(N−1) ∧ Δϕ′(N)} peel(P_N) {ψ(N)}. If it fails, call `Strengthen`: compute a weakest precondition of the peel, map it back through D, accumulate ξ(N) and ξ′(N−1), recheck the base case, and iterate until success or timeout. The algorithm itself says: “if the inductive step succeeds, then we conclude that the assertion holds.” (Section 4.4, p. 15).

The soundness theorem requires a finite base range 1≤N≤M, a relation ξ(N)∧D⇒ξ′(N), and a successful strengthened inductive triple for all N≥M (Theorem 2, p. 16). Fixed-point iterations may not converge in general; the paper reports convergence within a few iterations for its experiments (Section 4.2, p. 7).

Inference: In Verus, the base range can be proved by finite lemmas or explicit small-N cases; the inductive step can be a `proof fn` whose `ensures` states the size-N contract and whose body uses sequence extensionality, arithmetic lemmas, and solver assertions. Inference: quantifier elimination and weakest-precondition computation are external automation; Verus still checks the resulting proof obligations and requires explicit loop `invariant` clauses for executable loops.

## evaluation, trust, and limits
Diffy is a C++ prototype using LLVM 6.0.0 and Z3 4.8.7, evaluated on an Intel i7-6500U, 16 GB RAM, Ubuntu 18.04.5, with a 60-second timeout for every tool (Section 5, p. 17). The benchmark set has 303 array benchmarks: 157 safe and 146 unsafe, divided into C1 (standard operations), C2 (N-dependent branches/modulo), and C3 (nested loops) (Section 5, p. 17). Table 1's safe total is 157: Diffy succeeds on 151, is inconclusive on 3, and times out on 3. Diffy therefore verifies 151/157 safe programs; Vajra and VeriAbs each verify 110/157, and VIAP 20/157 (Table 1, p. 17). For unsafe programs, Diffy succeeds on 142/146 (98 C1, 24 C2, 20 C3) and is inconclusive on 4, with no reported timeout in the table. The text says most programs are proved within three seconds (Section 5, p. 18).

Failures are informative: three safe cases time out in Z3's induction query involving modulo, and three cannot compute predicates needed for the assertion (Section 5, p. 18). VIAP times out on 113 benchmarks and is inconclusive on 24; these are different denominators from Diffy's 303-program set and must not be compared as percentages without stating category and result type. What is proved is validity of the modeled Hoare triples under the transformation and solver checks. Trusted elements include C parsing/LLVM, transformation soundness assumptions, Z3, quantifier elimination, the input contracts, and the theorem's restrictions on loop bounds and variable updates.

Inference: For VL, Diffy is a direct design pattern for array-heavy verified Rust: reason by size induction and cross-execution differences when loop invariants are difficult. Inference: it threatens agent-written Rust verification in the narrow class of parametric array algorithms, especially nested loops, but its C benchmarks and restricted grammar leave product-wide threat unknown. Existing induction tools Vajra, VIAP, and VeriAbs already cover the baseline portfolio; VL should test whether Verus ghost sequences can express Diffy's difference relations instead of reimplementing those tools.

## techniques for the catalog
- Q-and-peel transformation — replace N-bound loops by N−1 loops plus a lower-depth peeled fragment
- cross-product difference invariants — relate corresponding variables of two synchronized executions with dataflow equalities
- inductive strengthening — prove base cases, eliminate old-state variables, and iterate weakest-precondition strengthening
- parametric array verification — evaluate the transformed proof on symbolic-size safe and unsafe benchmark suites
Checked 2026-10-14: audit record chakraborty2021diffy; paper-study comparison complete; gate executed; experiments not rerun
