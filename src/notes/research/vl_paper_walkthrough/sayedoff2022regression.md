# Regression verification of unbalanced recursive functions with multiple calls (long version)
(authored by agents unless marked 🧑)
Tag: `sayedoff2022regression`, [paper](http://arxiv.org/abs/2207.14364v1)

## problem and contribution
Regression verification compares two program versions under a chosen equivalence definition. The paper uses partial equivalence: "f1 and f2 are partially equivalent if given the same input, and both terminate, they return the same output" (Section 1, p. 2). RVT's stated strategy is: “progress bottom up on the call graphs of P1 , P2 , abstract those functions that were already proven to be equivalent with uninterpreted functions, turn loops into recursion, and abstract the recursive calls also with uninterpreted functions.” (Abstract, p. 1.) The target is unbalanced recursion, meaning two recursive functions that are not "in sync". Def. 2 (Section 2.1, p. 5): "f1 and f2 are said to be in sync if for every input they are called recursively at the top frame with the same sets of parameters, or not called at all." The running example (Fig. 4, p. 6) is two Fibonacci implementations, one with calls f1(n-1), f1(n-2) and one with calls f2(n-2), f2(n-2), f2(n-3).

The authors describe the contribution as “a new proof rule and a corresponding (incomplete) verification method for proving the equivalence of unbalanced recursive functions, when there are multiple such calls in the top frame of the functions” (Section 1, p. 3). The paper extends earlier work [27] that handled a single recursive call site and needed the unrolling to be given manually. The method combines uninterpreted functions and CBMC (step case), symbolic execution (base case), and concolic execution (path conditions).

## technique 1: bottom-up uninterpreted-function abstraction (RVT's existing strategy, background for the paper)
Use this when callees have already been shown equivalent and callers should be compared without re-entering their implementations. The paper's description of RVT's strategy:

1. traverse the call graphs of the two programs bottom-up and generate one verification condition per function pair (Section 2, p. 3)
2. when a pair is proven equivalent, replace any call to those functions with a call to the same uninterpreted function (Section 2, p. 3)
3. as a preprocessing step, replace all loops with calls to new recursive functions (Section 2.1, p. 5)
4. for a recursive pair, rule (part-eq), eq. (2): assume that the calls to f1 and f2 are partially equivalent, prove that the bodies are, and conclude that the functions are (Section 2, p. 4). In practice the recursive calls in both bodies are replaced with the same uninterpreted function, which returns the same value on related calls (calls with the same parameters, Def. 1, p. 4)
5. the resulting program is loop- and recursion-free and is checked with the bounded model checker CBMC (Section 2.1, p. 5)

This works when the functions are in sync; "once the functions are not in sync, it typically fails" (Section 2.1, p. 5). The CEGAR-based abstraction/refinement loop mentioned in Section 1 (p. 3) belongs to ARDiff [3], not to RVT or to this paper's method.

Inference: in Verus, represent a previously proved function by a specification-level summary lemma and call that lemma from the caller proof. Verus does not provide RVT's automatic uninterpreted-function replacement; summaries must be stated as `ensures` contracts or `spec fn` equalities and then proved. The soundness boundary is clear: the summary is trusted only to the extent its equivalence proof is checked.

## technique 2: path-based equivalence with synchronization unrolling
Use this when two recursive functions have the same eventual behavior but their call structures are unbalanced. Section 3 (pp. 6-12) handles functions with a single control-flow path that contains recursive calls, and assumes a sync-unrolling `su` is given (Def. 3, p. 6: after unrolling "the sets of recursive calls on both sides are the same"). The input domain is split into a base-case domain (inputs that reach a base case on at least one of the unrolled functions) and a step-case domain (its complement). Rule (path-part-eq), eq. (3), p. 7, concludes partial equivalence from (path-base-equiv) and (path-step-equiv); Proposition 1 (p. 8) proves the rule sound.

The paper summarizes the base-case procedure as: “Algorithm 1 describes our process for proving (path-base-equiv)” (Section 3.1, p. 8). Algorithm 1 (p. 9) takes the two functions and `su`. Its steps are:

1. apply the unrolling instructions to each function, so the recursive calls at the leaves are in sync (Algorithm 1 line 3, pp. 8-9)
2. compute for each unrolled function its base-case precondition bcpc_i in two steps with concolic execution (PathCrawler): first a predicate rho_i for taking a base case in the top frame, with recursive calls replaced by a function containing `assume(false)`; then a flag `bc_flag` set in every frame that takes a base case, followed by `assume(bc_flag)` and recursive calls replaced by a trivial `ret` function (Section 3.1, p. 9, Figs. 6-7, p. 10). For f1 of Fig. 4 the paper gets rho_1 = n < 3 and bcpc_1 = n <= 3
3. build the verification program of Fig. 1, add `assume(bcpc1 ∨ bcpc2)`, assert equal outputs, and run symbolic execution with the recursive calls kept (Algorithm 1 lines 5-8, p. 9; Fig. 9(a), p. 11)
4. for the step case (Algorithm 2, p. 12; Section 3.2, pp. 12-13): unroll according to `su`, replace all remaining recursive calls with uninterpreted functions, assume the negation of the base-case precondition, assert equal outputs, and call CBMC (Fig. 9(b), p. 11)

Why symbolic execution for the base case: the step-case strategy would likely fail when one side returns in a base case and the other calls an uninterpreted function with no related call (Section 3, p. 8). The paper gives a worst-case argument that CBMC with increasing unrolling is "double exponential in k", while symbolic execution "has better worst-case complexity" (Section 3.1, pp. 11-12). Symbolic execution can still fail: for the Pascal's-triangle pair of Fig. 8, "KLEE times out when trying to prove the equivalence of this base-case" (Example 3, p. 11).

Section 5 (pp. 16-19) generalizes to functions with several paths that make recursive calls, because "the correct sync-unrolling may depend on the input" (p. 16). Rule (full-part-eq), eq. (4), p. 18, requires the path-base-equiv and path-step-equiv premises for every pair of paths (p1, p2) of the top frames, with the inputs restricted to the base cases plus that pair of paths; Proposition 3 (p. 18) proves it sound. Algorithm 4 (p. 18) enumerates path predicates with concolic execution (GetAllPaths, PathCrawler), skips pairs whose path predicates have an empty intersection (checked with the task of Fig. 15, p. 19), runs FindSyncUnrolling, ProvePathBaseEquiv and ProvePathStepEquiv for each remaining pair, and returns FALSE if any pair fails.

Inference: a Verus implementation would use relational predicates over two ghost states, then prove each synchronized path with `assert` and lemmas. Rust functions can stay executable, while the two-state relation is specification code. The paper's model-checker call, symbolic execution and uninterpreted functions are external to Verus and need checked contracts.

## technique 3: automatic search for a synchronization unrolling
Use this when the correct unrolling is unknown. Section 4 (pp. 13-15) says that earlier work ([27] and [10]) "supplied this data manually" (p. 13). Algorithm 3 (p. 14) builds a C program in which CBMC's `nondet()` lets the solver decide at each call site whether to unroll. When it decides not to unroll, the call parameters are recorded as leaves of the pruned call graph. The program asserts that the recorded sets of the two functions are different, so a counterexample is a sync-unrolling together with an input (p. 13). The steps of Algorithm 3 are:

1. per function: AddDepthAndCallsTracking (records depth D and call-site index), GetNaturalBaseCasePrecondition (rho_i), AddAssumption of !rho_i, and ApplyNonDeterministicRecording (Algorithm 3 lines 2-6, p. 14; the program for Fig. 4 is in Fig. 11, p. 15)
2. CreateSyncUnrollingProgram (line 7): after calling f1 and f2, assert that the recorded sets of leaf inputs (only those with more than one recording, i.e. at least one recursive call) differ (p. 14)
3. loop: "for unwinding factor uw increasing from 1 up until a predefined timeout", unwind the program and call CBMC; if CBMC returns a counterexample, GenerateSyncUnrolling extracts D and Site from it (Algorithm 3 lines 8-11, p. 14)

Algorithm 3 is titled “An algorithm for finding a synchronization unrolling, if it exists” (Algorithm 3, Section 4, p. 14). Only a single input is needed "since we consider a single path (that has recursive calls) at a time" (p. 13). For Example 4 (Fig. 4), CBMC finds a counterexample for any n bigger than 2, and the derived sync-unrolling is the one in Fig. 5 (p. 14).

Documented failures of the search (Section 4): in Example 5 (Fig. 12, pp. 14-16) the generated unrolling negates the polarity of the `flag` parameter, so the uninterpreted functions of the step case are unrelated and CBMC fails; in Example 6 (Fig. 13, pp. 15-17) redundant recursive calls cannot be paired, and "Whenever RVT fails to generate a sync unrolling, it does not unroll at all, and this fails the proof with this pair" (p. 15).

Inference: Verus could search a bounded ghost execution externally, emit a proposed pairing, and verify the resulting relational lemmas. A `decreases` clause is needed for actual Rust recursion, while the paper's bounded unwinding is a discovery device. A failed search means the heuristic did not find a proof, not that the versions differ.

## evidence, trust, and limits
The paper reports that “based on experiments, RVT is the only tool that can prove the equivalence of programs with unsynchronized multiple recursive calls such as the pairs in Figs. 4 and 14” (Section 6, p. 19). The tools reported to fail on these examples are REVE, CPAchecker and Ultimate Automizer (run on a reduction as in Fig. 1); CLEVER and ARDiff "cannot handle unbounded loops and recursions" (Section 6, pp. 19-20). This is a comparative claim about a few example pairs: the paper has no experiments section, no benchmark table, no running times and no success rates (Inference from reading the whole paper). The method is incomplete, and the paper says so ("incomplete" proof rule, Section 1, p. 3). Further limits stated in the paper: a sync-unrolling may not exist even for equivalent functions (for example, summing an array forwards versus backwards, Section 3, p. 7); the base-case symbolic execution runs on programs with recursion and may not terminate in time (Section 3.1, pp. 10-11); the examples 5 and 6 above. The proofs rest on CBMC, KLEE-style symbolic execution and PathCrawler as trusted tools.

## techniques for the catalog
- bottom-up summary abstraction: replace already-equivalent callees with shared uninterpreted summaries
- synchronized path equivalence: unroll recursive calls until the recursive calls on both sides are related, prove the base-case domain by symbolic execution and the step-case domain with shared uninterpreted functions
- bounded synchronization search: instrument calls, increase the unwinding factor, and read the sync-unrolling off a CBMC counterexample
