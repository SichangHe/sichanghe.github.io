# Implementing Dependent Type Theory Inhabitation and Unification
(authored by agents unless marked 🧑)
Tag: `norman2026inhabitation`, [paper](https://arxiv.org/abs/2603.01463)

## type checking as a reusable solver core
Canonical-min is a sound and complete inhabitation and unification solver for dependent type theory, implemented in 185 lines of Lean. Its key design is a type checker whose effects are changed by the choice of monads, so the same checker can either reject a term or accumulate constraints for search. The abstract states, “We introduce Canonical-min, a sound and complete solver for inhabitation and unification in dependent type theory, implemented in 185 lines of Lean code.” (p. 1)

For definitional equality, apply both terms to fresh variables, beta-reduce to weak-head normal form, compare head symbols, and recursively compare arguments. The paper presents this as `Term.eq` and `WHNF.eq` (Section 2.1, pp. 2–3), and notes: “The function is labeled “partial” in Lean since we do not provide proof of termination.” (Section 2.1, p. 3) `Term.eq` calls `fresh`, `apply`, and recursive equality; `WHNF.eq` fails immediately when heads differ. The paper says exceptions matter because “this prevents unnecessary calls to apply after two terms have already been determined not to be equal.” (Section 2.1, p. 3)

For dependent type checking, create fresh variables for the type’s binders, apply the candidate term, extract the dependent input types, recursively check each argument, substitute arguments into the output, and compare the resulting outputs by WHNF equality. The paper’s `check` function (Section 2.2, p. 4) ends with `(← headType.get!.output.apply args (other ty.output vars)).eq (← ty.output.apply vars rigid)`.

Inference: in Verus, this architecture suggests separating a pure specification checker from search state. Use `spec fn`s for syntax and judgments and `proof fn`s for soundness lemmas; executable Rust can implement search but cannot call proof functions at runtime. Verus does not support Lean’s mutable metavariable references or monad elaboration directly.

## technique 1: compact persistent term representation
Represent every term as one metavariable plus an explicit substitution (ES), with a de Bruijn-indexed head and an argument spine. Store assignments as a de Bruijn block index, head index, and argument array. The ES is a persistent linked list of variable or term blocks. The paper says, “We will encode terms using exclusively de Bruijn indices [8].” (Section 3.1, p. 4) It says the decomposition “keeps bindings and arguments in contiguous blocks with efficient random access” (Section 3.1, p. 4), and that using blocks “will decrease the length of the linked list, improving access times” (Section 3.1, p. 5).

To apply a term, extend its ES with the argument block, resolve the assignment, return a variable-headed WHNF, or recursively beta-reduce a term block. Type metavariables additionally store input types and an output metavariable; dependent inputs share the extended ES. The representation avoids storing binder names and supports unassigned indices.

Inference: Verus can model these structures with immutable sequences and prove index bounds and substitution-preservation lemmas. The paper’s mutable references and partial functions require redesign; `seq`/`map` specifications and explicit fuel are safer than assuming termination.

## technique 2: delayed constraints with monads
An unassigned metavariable should not cause immediate failure. Instead, create a constraint containing the metavariable that blocked progress and a continuation that resumes checking after assignment. `ConstraintM` is a reader over an array of optional assignments layered on `Option`; a constraint continuation either fails or returns more constraints. The paper says, “If an unassigned metavariable is encountered during type checking, we should produce a constraint on that metavariable, representing the remaining checks to be performed once the metavariable is given an assignment.” (Section 4, p. 7)

Steps: (1) run the ordinary checker under `ConstraintM`; (2) when a metavariable is stuck, store its continuation; (3) assign a candidate; (4) invoke continuations and collect generated constraints; (5) reject candidates whose continuation throws; (6) retain valid assignments and their constraints for backtracking. This keeps checking code unchanged while adding search effects.

Inference: in Verus, represent a continuation as data describing a postponed obligation, then prove that replaying it after an assignment is equivalent to the original judgment. Verus has no general higher-order executable continuations in specifications, so an explicit constraint enum is more practical.

## technique 3: complete depth-first search with heuristic selection
`MVar.domain` enumerates every head and valid de Bruijn index, creates fresh metavariables for arguments, assigns the candidate, and filters it through stuck constraints. `dfs` assigns each candidate, pushes constraints, recurses with reduced entropy, pops constraints, and finally unassigns. The paper gives the core loop and states, “For the purposes of allocating new metavariable identifiers, we keep track of the first unused identifier, pos.” (Section 5, p. 10)

Selection is heuristic but completeness-preserving: choose a rightmost metavariable, unless an earlier one has a rigid equation; rigid equations are prioritised. Predicted entropy multiplies by five per unconstrained metavariable, and `dfs` backtracks when the prediction exceeds the remaining entropy, while `iddfs` repeats the search with entropy multiplied by 3 each round (Sections 5 and 5.1, pp. 9–13). The key completeness condition is that `next` returns none only when all metavariables are assigned.

Inference: Verus can verify a bounded search loop with an explicit fuel measure and invariants stating that assignments and constraints are restored after each branch. It cannot prove termination of an unbounded `partial def` without a supplied measure; the paper itself leaves termination proofs outside its implementation.

## evidence and limits
DTTBench contains 31 dependent-type problems adapted from Lean and Mathlib, evaluated with a 60-second timeout. Canonical-min solved 31/31: Eq 6/6, Leq 4/4, Logic 6/6, Relation 13/13, Set 2/2. Twelf solved 8/31, sauto 6/31, and mimer 2/31 (Section 6, pp. 13–14). The denominator is all 31 selected problems, not all DTT problems. The benchmark excludes problems needing reduction beyond beta and selects non-constant lambdas, so generality is limited.

The authors claim soundness because the checker completes without exception and completeness because every assignment is attempted with iterative deepening, but formal proofs of those claims are future work: “Formalizing these arguments, however, would require many proofs about the type theory, such as normalization, and about our monadic functions and data structures.” (Section 7, p. 15) Inference: the implementation is therefore evidence of behavior, not a machine-checked metatheory.

## techniques for the catalog
- WHNF equality checking: freshen binders, beta-reduce, compare heads, and recurse over argument spines with early failure
- explicit-substitution representation: use de Bruijn indices, persistent blocks, and metavariable assignments for compact dependent terms
- delayed constraints: turn stuck checks into continuations keyed by unassigned metavariables
- complete DFS inhabitation: enumerate domains, replay constraints, backtrack with entropy, and use rigid-equation heuristics
