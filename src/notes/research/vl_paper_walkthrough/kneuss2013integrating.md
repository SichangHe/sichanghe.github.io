# On Integrating Deductive Synthesis and Verification Systems
(authored by agents unless marked 🧑)
Tag: `kneuss2013integrating`, [paper](http://arxiv.org/abs/1304.5661v1)

## scope and result

The paper presents Leon, an integrated verifier and synthesizer for recursive functional programs over unbounded integers and algebraic data types (a Scala subset). The abstract states: “We describe techniques for synthesis and verification of recursive functional programs over unbounded domains.” (Abstract, p. 1). Its central design is to express a synthesis problem as a relational postcondition (`choose`), apply independently validated deduction rules, and use counterexamples from the verifier to guide search. The introduction claims that “when the synthesizer succeeds, the generated code is guaranteed to be correct for all possible input values” (Introduction, p. 1). The paper also names limits: “any general-purpose automated synthesis procedure will ultimately face limitations of scalability and the ability to control the development process” (Introduction, p. 2), and “the lack of inductive invariants prevents such fully-automated proof” in certain cases (Section 8.1, p. 13). In its own benchmark table, 3 of 18 synthesized programs were not automatically proved (Figure 3, p. 13).

Inference: for Verus, the transferable idea is to generate Rust bodies from `requires`/`ensures`-like relations and use verifier counterexamples to refine candidates. Verus still needs valid Rust syntax, executable code, termination arguments, and proof obligations in its supported subset; Leon's Scala `choose` and Scala compiler front end are not Verus constructs.

## technique 1: relational specifications and validated deduction rules

What it is. A synthesis problem is a path condition Π, a relation φ over inputs and outputs, and output variables. A solution is a precondition P plus a program term T. The two obligations are relation refinement, `Π ∧ P |= φ[x̄ ↦ T̄]`, and domain preservation, `Π ∧ (∃x̄:φ) |= P` (Sections 4.1–4.2, pp. 5–6). The paper says, “The validity of each rule can be established independently from its instantiations, or from the context in which they it is used.” (Section 4.3, p. 6; the “they it” wording is the paper's).

When to use it. Use this when a desired behavior is easier to state as a relation than as an implementation, especially with several orthogonal constraints such as sortedness, content, and size (Introduction, p. 1; Section 2, p. 4).

How to apply it.
1. Write the path condition and relational predicate, leaving the body as `choose` (Sections 2 and 4.1, pp. 3–5).
2. Apply one-point substitution for an equality atom `x0 = t` on an output variable, ground solving when the problem mentions no input variable, and case-split for disjunctions; the paper also adds rules that introduce disjunctions, such as branching on equality of two variables or on the type of a variable (Section 4.3, pp. 6–7, Figure 1).
3. Apply a recursion schema when an input has a recursive algebraic type. The LIST-REC rule produces a Nil-case subproblem and a Cons-case subproblem in which the recursive result is a fresh variable and the postcondition is assumed for the tail. It requires that the path condition for the recursive function be inductive (Section 4.3, p. 7).
4. Reconstruct the program from solved subproblems; the paper says programs obtained by successive validated rules are “correct by construction” (Section 4.3, p. 6).

Inference: in Verus, write a Rust function with a `requires` precondition and `ensures` relation, then use proof functions and loop invariants to justify each generated branch. Verus has no built-in synthesis primitive like Leon's `choose` (I did not check Verus documentation here), so candidate generation would be external; the resulting Rust body and its proof remain in Verus.

Evidence and limits. The `add` and `mult` examples over unary numerals are specified by `value(r) == value(x)+value(y)` and `value(r) == value(x)*value(y)`, and synthesized recursively; the paper reports, “Both functions are generated within three seconds.” (Section 2, p. 3). An under-specified `split` specification first yielded useless programs such as `(lst, Nil)`, and the specification had to be strengthened twice (Section 2, p. 4). Inference: no experiment establishes that a relational specification captures the programmer's intended behavior beyond the stated predicates.

## technique 2: symbolic term exploration (STE)

What it is. STE represents many candidate terms by a nondeterministic generator, encodes choices into SMT, and alternates candidate discovery with counterexample elimination. The paper says: “The core idea behind STE is to symbolically represent many possible terms (programs), and to iteratively prune them out using counterexamples and test case generation” until a valid term is proved or all programs in the search space are shown inadequate (Section 6, p. 9). The paper calls it one of its “most important” rules, responsible for “closing most of the branches in search trees” (Section 6, p. 9). STE searches only for terms made of constructors and calls to existing functions; branching and recursion come from other rules.

How to apply it.
1. Build recursive generators from constructors, in-scope variables of the proper type, and existing functions (Section 6, p. 9).
2. Choose an instantiation depth (typically starting at 0) and encode each nondeterministic choice with Boolean variables b̄, exactly one true per choice, plus equalities constraining generated values c (Section 6, pp. 9–10).
3. Solve `φ ∧ B(ā,b̄,c̄) ∧ C(c̄,x̄)` to obtain a candidate valuation b̄₀ (Equation 2, p. 10). If none exists, the generators at this depth cannot express a solution.
4. Fix b̄₀ and solve `¬φ ∧ B(ā,b̄₀,c̄) ∧ C(c̄,x̄)`; a model is an input ā₀ witnessing that the candidate fails (Equation 3, p. 10).
5. If such an input exists, discard the candidate by asserting the negation of the conjunction of b̄ and go back to step 3. If none exists, the candidate realizes φ and the search ends (Section 6, p. 10).
6. If no program is found at the current depth, increase the instantiation depth and retry; at the maximal depth, give up (Section 6, p. 10).
7. As an alternative to symbolic elimination, compile the candidate program into a function over the inputs and a Boolean array encoding the choices and run it on small models satisfying the path condition; this “allows us to rapidly discard hundreds or even thousand of programs” (Section 6, p. 10).

Inference: a Verus implementation could generate candidate Rust expressions outside Verus, compile each candidate with a verification harness, and feed failed `ensures` checks back as counterexamples. Verus proof functions can discharge the final candidate, but the Boolean-generator encoding and candidate compiler are additional infrastructure.

Evidence and limits. The paper says: “Note that very often, when STE is applied to a problem it cannot solve, concrete execution rules out all programs in a fraction of a second and symbolic reasoning is never applied.” (Section 6, p. 10). The formula encoding the nondeterministic program “typically grows exponentially as instantiation depth increases”, and the paper says the solver's difficulty with (2) and (3) grows with the number of programs (Section 6, p. 10). Inference: since generators are not required to produce every value of a type (Section 6, p. 9) and depth is bounded, failure to find a program does not show that no solution exists.

## technique 3: type-driven counterexample-guided synthesis with condition abduction

What it is. This rule enumerates well-typed expressions, ranks them on accumulated example models, and abduces guards under which a partially correct expression is valid. The paper describes the distinctive mechanism as: “The most distinctive aspect of this rule is the handling of conditional expressions.” (Section 1.1, p. 3).

How to apply it.
1. Initialize the uncovered partition `p′` to true, the partial solution `sol` to the identity function, and sample models M with the ground term generator (Algorithm 1, lines 1–3, p. 11).
2. Get a batch E of well-typed expressions and count, for each, how many models in M it handles correctly; take the highest-ranked expression r̄ (Algorithm 1, lines 5–8, p. 11; Section 7.3, p. 12).
3. Check whether `⟨Π ∧ p′ | r̄⟩` is a valid solution. If so, return `⟨Π | (sol r̄)⟩` (Algorithm 1, lines 9–10, p. 11).
4. If not, extract a counterexample model, add it to M, and call branch synthesis (Algorithm 1, lines 11–14, p. 11).
5. In branch synthesis, enumerate candidate conditions c; skip any c that is true on an accumulated counterexample in M′ (the paper's test is `c(m) = false` for every m in M′), then check `⟨Π ∧ c | r̄⟩`. If valid, return c; otherwise add the new counterexample to M′. If c is returned, extend `sol` with `if c then r̄ else x` and update `p′ := p′ ∧ ¬c` (Algorithms 1–2, pp. 11–12).
6. Repeat. The paper says only that the algorithm “eventually, given the appropriate terms from s, finds an expression that forms a complete correct implementation” (Section 7.2, p. 11). Example evaluations are used for ranking only, not for filtering, because a candidate may be correct only on part of the input space (Section 7.3, p. 12).

Inference: Verus can express each branch guard as ordinary Rust control flow and prove branch-specific postconditions. The abduction loop and ranking remain an external synthesizer; Verus supplies the final proof, including loop invariants and termination.

Evidence. In the paper's experiments the candidate set size is 50 expressions for Algorithm 1 (doubled in each iteration, as the paper's parenthesis states) and 20 for Algorithm 2 (Section 7.3, p. 12). This is a configuration, not a universal performance guarantee. The Figure 3 benchmarks (List, SortedList, StrictSortedList, UnaryNumerals operations) list times from 0.3 to 87.7 seconds in the “sec.” column, which the caption does not define; the paper does not say which rule produced each program (Figure 3, p. 13). Section 7 itself reports no measurements separate from Figure 3.

## interactive anytime synthesis and evaluation

The AND/OR search treats rule applications as AND nodes and problems as OR nodes. An OR node's cost is the minimum over remaining viable children; an AND node's cost is the sum of its children's costs plus a constant per rule. Program size, measured as the number of branches weighted by proximity to the root, is the cost proxy (Section 5, pp. 7–9). A user may interrupt and receive a program containing remaining `choose` calls. The paper says, “Because we maintain the search tree and know the current minimal solution at all times, we can stop the synthesis at any time and obtain a partial program that is likely to be good.” (Section 5, p. 9).

The benchmark table (Figure 3, p. 13) has 18 rows: 5 over lists, 7 over sorted lists, 3 over strictly sorted lists, and 3 over unary numerals. All 18 are marked synthesized, which the caption defines as “the solution generated is correct after manual inspection”. “Proved” marks automatic proof: 15 of 18 rows are marked proved; the three unmarked are SortedList.Delete, SortedList.Diff, and StrictSortedList.Delete. The text says verification stops “after a timeout of 3 seconds” (Section 8.1, p. 13). The paper reports no comparison against Verus or Rust.

## what is proved, measured, and trusted

The paper's claim is conditional on Leon's verifier: a synthesized program is proved to meet the supplied relational specification only for the 15 of 18 benchmark rows marked “Proved”; the other 3 rows were validated by manual inspection (Section 8.1 and Figure 3, p. 13). The measurements are the Figure 3 columns Size (syntax tree size), Calls, and “sec.”, with a 3-second verification timeout. Inference: the paper has no explicit trusted-computing-base discussion; from its architecture (Sections 3 and 8, pp. 5, 12), a reader must trust the Leon verifier, Z3, the Scala front end, the compilation-based evaluator, and the abstraction functions such as `value`, `content`, and `isSorted` written by the user. The paper does not provide a formal end-to-end theorem about generated machine code or about specifications matching external requirements.

## techniques for the catalog

- validated relational deduction: decompose relational synthesis problems with one-point, ground, case-split, and recursion rules whose validity composes
- symbolic term exploration: encode typed nondeterministic term generators in SMT and eliminate candidates with verifier counterexamples and concrete execution
- condition-abducting CEGIS: rank typed expressions on examples, abduce branch guards that exclude counterexamples, and grow a correct partition
- anytime AND/OR synthesis: cost-guided search maintains the best partial derivation and can return code with unresolved synthesis holes
