# Regression verification of unbalanced recursive functions with multiple calls (long version)
(authored by agents unless marked 🧑)
Tag: `sayedoff2022regression`, [paper](http://arxiv.org/abs/2207.14364v1)

## problem and contribution
Regression verification compares two program versions under a chosen equivalence relation. The abstract defines partial equivalence as equal outputs when both functions terminate. RVT's stated strategy is: “progress bottom up on the call graphs of P1 , P2 , abstract those functions that were already proven to be equivalent with uninterpreted functions, turn loops into recursion, and abstract the recursive calls also with uninterpreted functions.” (Abstract, p. 1.) The target is unbalanced recursion, where corresponding versions make different numbers or orders of recursive calls.

The paper's method is symbolic execution plus abstraction and refinement. It proves base cases separately, then reduces recursive equivalence to path conditions and synchronization of call trees. The authors describe the method as “a new proof rule and a corresponding (incomplete) verification method for proving the equivalence of unbalanced recursive” functions (Section 1, p. 2).

## technique 1: bottom-up uninterpreted-function abstraction
Use this when callees have already been shown equivalent and callers should be compared without re-entering their implementations. The paper's steps are:

1. build the two call graphs and traverse them bottom-up (Section 2, p. 3)
2. when a pair of functions is equivalent, replace both implementations by calls to the same uninterpreted function (Section 2, pp. 3–4)
3. convert loops into recursive form so the same recursion machinery handles loops and recursive procedures (Section 2, p. 3)
4. abstract recursive calls by uninterpreted functions while checking the surrounding path conditions (Section 2, pp. 3–4)
5. refine the abstraction when a counterexample shows that a removed fragment matters; RVT uses a CEGAR loop (Section 2, p. 3)

Inference: in Verus, represent a previously proved function by a specification-level summary lemma and call that lemma from the caller proof. Verus does not provide RVT's automatic uninterpreted-function replacement; summaries must be stated as `ensures` contracts or `spec fn` equalities and then proved. The soundness boundary is clear: the summary is trusted only to the extent its equivalence proof is checked.

## technique 2: path-based equivalence with synchronization unrolling
Use this when two recursive functions have the same eventual behavior but their call structures are unbalanced. Algorithm 1 receives compared functions and a synchronization-unrolling sequence. Its steps are:

The paper summarizes the procedure as: “Algorithm 1 describes our process for proving (path-base-equiv).” (Section 3, p. 9.)

1. apply the prescribed unrolling instructions to obtain a pruned call graph (Section 3, pp. 7–8)
2. symbolically execute the resulting paths and construct a path-equivalence condition (Algorithm 1, p. 9)
3. separate base-case paths from recursive paths; prove base paths with an equivalent-input/equal-output condition (Section 3.1, pp. 9–12)
4. replace already-proved recursive calls by uninterpreted functions and check the remaining path formula with a model checker (Algorithm 2, pp. 13–15)
5. accept the unrolling when all paths satisfy the condition; otherwise refine the unrolling or report failure (Section 4, pp. 16–18)

The paper emphasizes that synchronization is a sufficient condition, not a completeness guarantee. Its proof obligations include matching path conditions and equality of outputs under the same inputs. Inference: a Verus implementation would use relational predicates over two ghost states, then prove each synchronized path with `assert` and lemmas. Rust functions can stay executable, while the two-state relation is specification code. The paper's model-checker call and uninterpreted functions are external to Verus and need checked contracts.

## technique 3: automatic search for a synchronization unrolling
Use this when the correct unrolling factor is unknown. Algorithm 3 first instruments both functions with recursion-depth and call tracking, obtains natural base-case preconditions, adds the negated base assumptions, and records nondeterministic outcomes (Section 4, pp. 18–20). It then creates a synchronization program and repeatedly increases the unwinding factor until a timeout. The generated program is checked by CBMC; a counterexample identifies an unsuccessful factor, while a proof yields a candidate synchronization.

Algorithm 3 is explicitly titled “An algorithm for finding a synchronization unrolling, if it exists.” (Section 4, p. 20.)

The paper's algorithm text explicitly says it loops “for unwinding factor uw increasing from 1 up until a predefined timeout” (Algorithm 3, p. 20). After finding a candidate, the method checks that recursive calls are paired consistently and then invokes the path-equivalence proof. For multiple recursive calls, Algorithm 4 partitions paths and applies the same base and recursive checks (Section 5, pp. 24–27).

Inference: Verus could search a bounded ghost execution externally, emit a proposed pairing, and verify the resulting relational lemmas. A `decreases` clause is needed for actual Rust recursion, while the paper's bounded unwinding is a discovery device. A failed search means the heuristic did not find a proof, not that the versions differ.

## evidence, trust, and limits
The paper reports that “based on experiments, RVT is the only tool that can prove the equivalence of programs with unsynchronized multiple recursive calls” (Section 5, p. 27). This is a comparative claim about the tested examples; the excerpt gives no universal benchmark denominator or success percentage. The method is incomplete and depends on symbolic execution, CBMC/model checking, abstraction choices, and the supplied equivalence definition. Counterexamples and solver results are evidence, but the paper does not establish equivalence when no synchronization unrolling is found.

Inference: threat to VL is high for refactoring-heavy verified code because relational summaries could preserve behavior across versions, but implementing the search and two-program ghost state is substantial. VL should reuse bottom-up summaries and bounded synchronization as optional proof-generation passes rather than redo RVT's CEGAR engine without a Rust benchmark.

## techniques for the catalog
- bottom-up summary abstraction: replace already-equivalent callees with shared uninterpreted summaries
- synchronized path equivalence: unroll recursive calls until paired paths satisfy equal-output conditions
- bounded synchronization search: instrument calls, increase unwinding, and validate a candidate with model checking
Checked 2026-10-14: audit record sayedoff2022regression; paper-study comparison complete; gate executed; experiments not rerun
