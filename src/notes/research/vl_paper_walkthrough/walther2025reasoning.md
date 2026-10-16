# Reasoning About Incompletely Defined Programs
(authored by agents unless marked 🧑)
Tag: `walther2025reasoning`, [paper](https://www.semanticscholar.org/paper/77f15a44443d6aa0d40a070e87ead346a822ac3d)

## problem and trust boundary

Walther studies terminating functional programs that deliberately leave some calls undefined, such as division by zero or `head([])`. The abstract states: “We show how so-called domain procedures are synthesized which decide the domain of incompletely deﬁned procedures in almost all cases.” (abstract, p. 1). A stuck computation represents a runtime error. The method keeps partiality explicit instead of assigning arbitrary values to undefined calls. The interpreter and VeriFun theorem prover are trusted implementation components; the paper proves properties of the calculus and synthesized procedures under termination and safety assumptions.

Inference: in Verus, this is a direct model for panic preconditions. A Rust function that can panic should expose a `requires` condition; replacing panic with an arbitrary return value would permit false lemmas. The inference is about applying Walther's semantic discipline to Verus, not a claim made by the paper.

## technique 1: exception guards and explicit stuck computation

what it is and when to use it. Replace each undefined-result marker with a self-call in the semantic body, but guard calls created by that replacement so they cannot execute. This lets the ordinary evaluator model partial functions while retaining a detectable stuck result.

steps. For procedure `f` with body containing an indeterminate result, form an exception guard `except_f` that is true exactly on arguments where the body contains the replacement. Replace each marker with `f(x1,...,xn)` in a semantic copy. Before symbolically opening a call that originated from a replacement, prove the guard false; otherwise leave it blocked. The paper states: “A procedure call f (σ (x1 ), . . . , σ (xn )) must not be executed symbolically if it stems from a  – replacement.” (Section 4, p. 16). This preserves ordinary rewriting for defined calls and yields a stuck term for undefined ones.

Verus form. Inference: keep the Rust function's panic path explicit with `requires` and prove callers establish it. If a panic branch is modeled in a spec, use a ghost `Option` or result datatype and prove that the `None`/panic case is unreachable under the precondition. Verus does not use Walther's marker or exception guard syntax; the conceptual guard becomes the function precondition and branch proof.

Evidence and limits. The paper's motivating examples show division by zero and selector calls on empty lists producing stuck terms instead of arbitrary values (Introduction, pp. 2–3). The technique assumes terminating procedures; nontermination is a separate problem and domain decidability is not guaranteed in general. Inference: this directly limits automation for recursive Rust code whose panic condition depends on an undecidable invariant.

## technique 2: synthesize determination/domain procedures

what it is and when to use it. A determination guard computes whether an expression will produce a value. A domain procedure `∇f` is synthesized for each partial procedure or selector and can be placed in theorem preconditions.

steps from the definitions. (1) For a marker ``, set `dg[] = false`; for a variable or value, set it to true. (2) For constructors, equality, negation, and already-known domain procedures, conjoin the guards of all arguments. (3) For an `if`, require the guard of the condition and then guard only the selected branch. (4) For a partial call `f(t1,...,tn)`, require all argument guards and `∇f(t1,...,tn)`. The formal definition says: “Informally, dg[f (t1 , . . . , tn )] states that the result of a procedure (or selector) call f (t1 , . . . , tn ) is determined iff all arguments are determined (as dg[t1 ] ∧ . . . ∧ dg[tn ] must hold) and are in the domain of f (as ∇f (t1 , . . . , tn ) must hold).” (Section 5, p. 17). (5) Define `∇f` as the weakly normalized determination guard of `f`'s body; define a selector guard by testing that its argument has the constructor shape. (6) Prove termination of `f` before generating `∇f`; recursive calls coincide, so the domain procedure terminates as well.

Verus form. Inference: define `spec fn domain_f(args) -> bool` and require `domain_f(args)` in the Rust function contract. Prove `domain_f` implies no panic and use it in caller preconditions and lemmas. Verus `spec fn` is pure and cannot call runtime code; recursive domain predicates need termination measures and proof lemmas. The paper's automatic symbolic evaluator has no direct Verus equivalent, so synthesis would be a separate source transformation.

Evidence. For logarithm, the paper writes a guarded law requiring `∇log(x,b) ∧ ∇log(y,b)` before concluding the log identity (Section 5, p. 17). The authors prove soundness of domain procedures in Theorem 2 and characterize exactness for safe procedures in Theorems 4 and 5 (Section 5, pp. 18–20). The paper says the method decides domains “in almost all cases” (abstract, p. 1), so completeness is not universal.

## technique 3: optimize synthesized guards

why. Initial guards contain redundant conditions, recursive calls, and calls to other domain procedures. Since guards occur in proof obligations, simplify them before use.

steps. First use weak simplification, which does not unfold recursive procedures but rewrites nonrecursive calls and removes conditions implied by the context. The paper reports that calls such as `∇−` in the division guard can be reduced by simplification (Section 5.2, pp. 18–19). Next identify recursive calls in conditions whose false branch is unreachable because the mother procedure terminates; Theorem 6 permits replacing those guards with `true`. Finally group recursive result terms into clusters and prove a recursion-elimination formula; Theorem 7 then permits replacing the cluster with `true` or `false` followed by weak normalization. The paper states: “By Theorem 7, the body R∇f of domain procedure ∇f can be soundly replaced with the optimized procedure body R∇f ,b if the recursion elimination formula Re,b has been proved.” (Section 5.2.2, p. 28).

Verus form. Inference: simplify `spec fn` domain predicates with rewrite lemmas and explicit `assert` facts; prove recursive simplifications with induction on a `decreases` measure. Never erase a recursive condition merely because it appears unreachable without a proof. The resulting compact predicate improves solver performance but remains a logical definition, not executable panic handling.

Evidence and limits. The paper gives examples where guards for membership, Fibonacci, and Ackermann collapse to `true` because termination makes the false base case unreachable (Section 5.2.2, pp. 24–25). It also gives a list-minimum example where a recursive call cannot be eliminated and remains in the final guard (pp. 26–28). Optimization therefore depends on proved recursion formulas, not a syntactic shortcut.

## technique 4: refined theory and well-formed lemmas

what it is. Even a true formula can evaluate to a runtime error on a ground instance. Define a lemma guard with the determination guard and admit a formula into the refined theory only when that guard is itself true.

steps. For a lemma body `b`, compute `dg[b]` with weak simplification. Require the universally quantified guard to be valid; call the lemma well-formed. Define `Th*Pr = {ϕ ∈ ThPr | ∇ϕ ∈ ThPr}`. Run the Disprover on the guard before attempting the proof, because a counterexample avoids wasted proof search. The paper states: “The refined theory Th∗Pr excludes each specification formula from ThPr which is not well-formed.” (Section 5.3, p. 29). Then Theorem 8 guarantees that every monomorphic constructor ground instance of a well-formed verified formula evaluates to `true` without a stuck result.

Verus form. Inference: require panic-freedom as an explicit precondition or prove a separate `no_panic` lemma before admitting a specification lemma. Use `requires` to express the guard and `ensures` for the property; a test harness can instantiate constructor-like values to search for guard counterexamples. Verus's solver does not automatically construct Walther's refined theory, so the discipline must be encoded in contracts and proof lemmas.

limits and threat. The paper admits that some formulas that never get stuck are still excluded as unsafe specification style (Section 5.3, pp. 30–31). Inference: this conservatism is useful for agent-written verified Rust: it prevents proofs that rely on evaluation behavior outside the stated domain, but may reject harmless lemmas and require manual guard proofs. Existing work already provides a complete workflow for partiality—guard synthesis, guard optimization, and refined-theory admission—so VL should not silently treat panics as arbitrary values.

## proved, measured, and trusted

Proved: soundness of determination guards and domain procedures, exact domain decision for safe procedures, sound recursion elimination, and absence of stuck results for ground instances of refined-theory lemmas (Theorems 2, 4–8). Measured: the paper reports implementation in VeriFun and case studies, with automated termination and proof heuristics; it does not give a single benchmark denominator or aggregate success percentage. Trusted: the interpreter, symbolic evaluator, Disprover, termination hypotheses supplied by users when automation fails, and VeriFun implementation. Inference: product risk is high if a verifier's panic model differs from executable Rust; domain predicates and well-formedness checks should be part of the contract boundary.

## techniques for the catalog

- exception guards for partial calls — block semantic calls introduced by undefined-result markers and represent them as stuck computations
- determination/domain procedure synthesis — recursively compute guards for definedness and synthesize `∇f` predicates for partial procedures and selectors
- guard optimization by recursion elimination — simplify guards and replace recursive calls only when Theorem 6/7-style formulas are proved
- refined well-formed theory — admit specifications only when their determination guard is valid, guaranteeing ground evaluation without runtime errors

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
