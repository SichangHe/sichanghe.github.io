# Absynthe: Abstract Interpretation-Guided Synthesis
(authored by agents unless marked 🧑)
Tag: `guria2023absynthe`, [paper](http://arxiv.org/abs/2302.13145v2)

## problem and contribution
Absynthe synthesizes programs with a user-defined abstract domain and concrete input/output tests. The synthesis engine is independent of the target language; users provide abstract values, transfer functions, and a concrete interpreter. The paper states: “The synthesis engine is parameterized by the abstract semantics [Cousot and Cousot 1977] and independent of the source language.” (section 1, PDF page 2). A candidate is accepted only after its holes are filled and it passes all concrete tests: “A program that passes all tests is considered the solution.” (section 1, PDF page 2). Inference: this is a search-and-testing guarantee, not a proof that the examples characterize all executions.

## technique 1: design an abstract domain and interpreter
Use this when exact source-language semantics are expensive but a coarse property can prune candidates. The paper’s Pandas example uses a column-name set and a type domain. The column domain stores a set and defines subset ordering and union; its interpreter maps `merge` to union of input columns and maps `query` to its input columns (section 2, PDF pages 5–6). The paper gives the concrete shape `pd_merge(left,right,opt) -> left ∪ right` and `pd_query(df,pred) -> df` (Figure 2, PDF page 4). The type interpreter returns `DataFrame` only when receiver, arguments, and keyword option have required types; otherwise it returns top (section 2, PDF page 6).

Steps:
1. inspect examples and choose an abstraction that captures constraints useful for pruning (section 2, PDF page 5)
2. subclass `AbstractDomain` (which provides ⊤ and ⊥) and define the domain's value constructor and partial order `⊆`; an optional `∪` is defined when the abstract semantics use it (section 2, PDF page 5)
3. implement an interpreter recursively evaluating terms and operation-specific abstract transformers (section 2, PDF pages 5–6)
4. combine independent domains pointwise with `ProductDomain` (section 2, PDF page 6)

Inference: in Verus, the analogous design is a ghost/spec datatype for the abstract value, a `spec fn` abstraction and ordering relation, and proof lemmas showing each Rust operation preserves the abstraction. Verus does not execute this Ruby-style interpreter at runtime; executable Rust remains separate from `spec fn` and `proof fn` code. The mapping is an engineering analogy, not a claim made by the paper.

## technique 2: abstract-variable narrowing
Use this when a partial candidate contains holes whose abstract values are not yet known. Absynthe labels holes with abstract variables and maintains lower and upper bounds. Its transformer DSL supports conditionals and `⊆`; when a comparison succeeds, the bounds are narrowed. The paper says: “The rules for evaluating `e ⊆ e` are most interesting, as these test for the ⊆ relation while constraining abstract variables `x˜` to the range under which the relation `e ⊆ e` holds.” (section 3.1, PDF page 9, continuing on page 10).

Steps:
1. create a hole tagged with a fresh abstract variable when an application is introduced (section 2, PDF page 7; rule S-Enumer, section 3.2, PDF page 11)
2. evaluate the transformer condition under the current bounds environment (section 3.1, PDF pages 9–10)
3. when a variable is compared with an abstract value and that value lies within the variable’s range, the rule evaluates to true and sets the variable’s upper bound to that value (rule A-VC, Figure 5b, PDF page 9; text on page 10)
4. abstractly evaluate each partial term and discard it if its abstraction is not included in the goal abstraction (section 3.2 and Algorithm 1 line 8, PDF page 11)

Inference: a Verus implementation could represent bounds as ghost state and prove that each narrowing operation preserves inclusion; SMT arithmetic or set lemmas could discharge simple intersections. The paper’s dynamic abstract-variable mechanism does not carry over directly.

## technique 3: size-ordered search with five hole-replacement rules
Use the finite, solver-backed, or otherwise enumerable rule matching the domain. Figure 6 defines `S-Val` (replace with a concrete value), `S-Var` (replace with a compatible variable), `S-Finite` (enumerate a finite abstract domain), `S-Solve` (solve one unknown abstract argument), and `S-Enumer` (introduce fresh abstract-variable holes) (section 3.2, PDF pages 10–11). Algorithm 1 starts with a return hole, repeatedly expands a work-list candidate, abstractly evaluates each expansion, retains terms satisfying the goal abstraction, concretely tests hole-free terms, and bounds remaining terms by maximum size (Algorithm 1, PDF page 11).

The algorithm’s key sentence is: “Each candidate is abstractly interpreted, and then checked to see if the computed abstraction satisfies the goal abstraction.” (section 3.2, PDF page 11). Concrete tests are run through a reference interpreter; failed candidates are discarded (section 4, PDF page 13). A min-heap by term size, small-expression caching, and predicate-based template inference reduce repeated enumeration (section 4, PDF page 13). The implementation explores candidates smallest first (section 4, PDF page 12).

## evidence, limits, and trust
On SyGuS strings, the study reports medians over 11 runs on a 2016 MacBook Pro, with a 600-second timeout (section 5.1, PDF pages 15–16). Table 1 reports 22 benchmarks and says Absynthe solves around 77% of them (section 5.1, PDF page 16); rows marked `–` timed out. Inference: 17 of the 22 rows have times, and 17/22 is about 77%, so the denominator is the 22 standard benchmarks. `phone-6` explores 5,937 candidates in 100.54 seconds (16.93 ms per candidate, string length domain, which calls Z3), while `name-combine-3` explores 117,370 in 47.86 seconds (0.41 ms per candidate, string suffix domain) (section 5.1, PDF pages 16–17). On AutoPandas, Table 2 reports 17 solved programs, equal to the AutoPandas neural model’s 17, under a 20-minute timeout (section 5.2, PDF pages 18–19). Inference: these are benchmark results, not formal soundness or completeness proofs.

The paper explicitly limits the method: it only has forward abstract semantics; product domains remain independent; fully formal semantics are better handled by solver-aided tools; and fallback enumeration can have combinatorial explosion (section 4, PDF page 13). Inference: trusted components include the user-written abstract transformers, the reference interpreter, test adequacy, Ruby/Python/Pandas behavior, and the implementation. Inference: for agent-written verified Rust, the threat is medium: abstract pruning can reduce invalid candidate generation, but tests and user abstractions can miss behaviors, whereas Verus proof obligations can provide stronger per-contract evidence if the generated code and specifications are actually verified.

## techniques for the catalog
- abstract-domain-guided synthesis: define lightweight abstract values and transfer functions to prune language-independent program search
- abstract-variable narrowing: constrain hole ranges through successful abstract ordering tests
- mixed hole expansion: use finite enumeration, solver solving, or fresh abstract variables according to domain structure
- filter-then-test pipeline: abstractly filter partial programs, then run concrete tests on complete candidates
- synthesis optimizations: use size heaps, cached subterms, and input/output predicates to seed partial templates
