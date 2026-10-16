# Soft Contract Verification
(authored by agents unless marked 🧑)
Tag: `nguyen2014softcontract`, [paper](https://doi.org/10.1145/2628136.2628156)

## central method
Soft contract verification (SCV) statically proves complete or partial contract correctness in an untyped, higher-order language with first-class contracts. The abstract states: “Our approach uses higher-order symbolic execution, leveraging contracts as a source of symbolic values including unknown behavioral values, and employs an updatable heap of contract invariants to reason about flow-sensitive facts.” It proves that symbolic execution soundly approximates dynamic semantics and that verified programs cannot be blamed (Abstract, p. 1).

Use SCV when dynamic-language contracts are expressive but runtime checks are costly or discover faults too late. The workflow is: replace concrete inputs by unknown abstract values; refine those values with contracts and predicates during symbolic execution; maintain refinements in a heap keyed by addresses; summarize recursive evaluation contexts; translate arithmetic facts to a first-order SMT solver; and remove only checks proved redundant. Inference: Verus can use the same separation of executable behavior and proof state, but Rust’s static types make many contracts explicit and do not provide SCV’s dynamic blame semantics.

## technique: higher-order symbolic execution
A contracted function `(f : pos? → neg?)` with body `(* x -1)` is run on an unknown input refined by `{pos?}`. The symbolic reduction `(* {pos?} -1) ↦ {neg?}` proves the function meets its contract and cannot be blamed (Section 1, p. 1). The paper says: “Checking the domain contract refines the input to be an unknown satisfying the set of contracts {pos?}.” (Section 1, p. 1).

For a higher-order example, `e2o` maps even functions to odd functions by applying `f` to `n+1` and subtracting one. The analysis assumes the input function’s contract, refines `n` from `odd?`, proves `n+1` is even, and propagates the even result to an odd result (Section 2.1, p. 2). The symbolic semantics uses contract-refined values such as `(+ {odd?} 1) ↦ {even?}` and `({even?→even?} {even?}) ↦ {even?}`.

Inference: in Verus, encode the contract as `requires` and `ensures`, use a lemma to prove parity preservation, and represent a higher-order argument with a specification trait or explicit function contract. Inference: Verus does not infer blame labels; failed obligations are proof failures rather than runtime contract blame.

## technique: flow-sensitive heap refinements
Substitution loses branch facts in untyped code. SCV instead allocates abstract values in a heap and refines their contract sets when predicates execute. For a conditional testing `(int? x)` and `(int? (car p))`, the true branch changes the heap entries to `{int?}` and the false branch to `{string?}`; arithmetic is checked using the refined values (Section 2.2, pp. 2–3). The paper says: “We overcome this challenge by modelling symbolic values as heap-allocated sets of contracts.”

Apply it by allocating an address for each unknown; on each predicate, fork execution into true and false branches; update the address’s contract set; propagate updates through accessors and calls; and prune paths when accumulated facts prove them impossible. This handles nested and inter-procedural conditionals. Inference: Verus’s nearest form is ghost state plus branch-local assertions and loop invariants; mutable Rust variables carry facts directly, so a heap of contract sets is an analysis design rather than source syntax.

## technique: solver queries over base values
SCV delegates arithmetic to an off-the-shelf SMT solver while avoiding an encoding of the whole higher-order language. Contract applications generate refinements and heap translation generates first-order assertions. For `main`, the solver receives `n ≥ 0`, `n1 = n+1`, `n2 > n1`, and queries `n2 > 0` (Section 2.3, p. 3). The paper says: “we use the solver only for queries on base values, rather than attempting to encode a rich, higher-order language into one that is accepted by the solver.”

Steps are: evaluate higher-order structure symbolically; collect only primitive arithmetic facts; translate them to solver variables and assertions; query validity; and retain soundness when predicates lack translations by losing precision rather than accepting an invalid proof. Inference: in Verus, arithmetic obligations are discharged by the verifier’s SMT backend using `assert`, `requires`, `ensures`, and lemmas. Inference: the trusted solver and translation remain part of the proof base.

## technique: convergence for non-tail recursion
Abstract execution can diverge on recursive calls over unknown values. SCV detects repeated evaluation contexts, summarizes their accumulated structure, and resumes pending calls with an approximation. In `make-list`, it recognizes recursive calls on the same non-negative shape, summarizes results as empty for zero and non-empty positive lists for positive inputs, and proves `reverse` and `car` safe without user loop invariants (Section 2.4, pp. 3–4). The paper notes: “we accelerate the convergence of programs by identifying and approximating regular accumulation of evaluation contexts.”

Inference: in Verus, recursion usually needs a decreases measure and inductive lemmas; summaries correspond to postconditions over recursive calls. Inference: SCV’s automatic widening is not a Verus construct and would need a separate analyzer that emits lemmas or invariants.

## technique: first-class and dependent contracts
SCV executes contract combinators as ordinary values, so it handles contracts that are first-class, recursive, arbitrary predicates, and dependent on selected arguments. The vector contract `vec/c` checks messages `'x`, `'y`, and recursive `'add`; the mixin `extend` adds `'len` while preserving the interface (Section 2.5, pp. 4–5). The paper lists that example’s features as: “contracts may be recursive, as in the contract for ’add,”

Inference: in Verus, model interfaces with enums or traits, recursive contracts with datatype invariants, and dependent relationships with quantified `requires`/`ensures`. Dynamic message dispatch and arbitrary predicates require explicit Rust representations or trusted external bodies.

## evidence, trust, and limits
SCV was evaluated against benchmarks from soft typing, occurrence typing, static contract checking, refinement typing, and higher-order model checking. The paper reports that “99% of the contract and run-time type checks are proved safe, and could be eliminated” over its corpus, and that three video games saw speedups from 7× to three orders of magnitude after monitoring removal (Section 1, p. 2). These percentages and speedups are benchmark-corpus results, not universal guarantees. Section 4 reports that SCV cannot yet prove deep structural properties such as preservation of list length by map. SCV remains incomplete: unverified checks stay at run time, abstract execution may not terminate, and solver translations can lose precision. Inference: trusted components include the symbolic semantics, contract translations, SMT solver, parser, and any unknown-value assumptions. Inference: for VL, SCV’s strongest lesson is modular partial verification; removing checks is safe only for obligations actually proved, while dynamic boundaries and solver modeling remain product risks.

## techniques for the catalog
- higher-order symbolic execution — execute unknown values refined by contracts to prove behavior without concrete inputs
- heap contract refinement — store flow-sensitive predicate sets at abstract addresses and update them across branches
- solver-aided base reasoning — translate primitive arithmetic facts to first-order SMT queries
- recursive context summarization — widen repeated evaluation contexts to make abstract recursion converge
- first-class contract execution — verify contract combinators and recursive contracts as ordinary program values
- dependent contract checking — preserve relationships between selected inputs and outputs
- partial check elimination — remove only runtime checks whose obligations symbolic execution proves
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The analysis quickly terminates for a majority of programming patterns with decent precision, although it is not guaranteed to terminate in the general case—see section 4 for empirical results."): checked the central method, symbolic execution, heap refinements, solver use, recursion summarization, contracts, evaluation claims, and trust limits against the complete paper; corrected page references and a shortened quotation, marked Verus mappings as inference, clarified path pruning, and added the structural-property limitation; did not check claims against external sources.
