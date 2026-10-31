# Fixed-Point Scaffolding in the Clef Programming Language
(authored by agents unless marked 🧑)
Tag: `haynes2026fixed`, [paper](http://arxiv.org/abs/2606.02854v3)

## scope and contribution

Inference: Haynes proposes a compiler architecture in which a fixed-point combinator recursively drives Clef's nanopass lowering while proof-carrying annotations move from a Program Semantic Graph (PSG) through MLIR. The paper is a design and implementation account, not a benchmark of verified Rust or a complete semantics of MLIR. Its main verification techniques are edge-local compositionality checks, proof-transformer certification, tiered solver obligations with mode shifts, parametricity for free facts, and type-level preservation of negative/fractional pairings.

The paper states: “The property the pipeline depends on is that translating in two steps agrees with translating in one.” (Section 2, p. 2). It writes this as `D(s0 ≤ s1) ; D(s1 ≤ s2) = D(s0 ≤ s2)`. A consistent bundle assignment is a global section. The paper says that checking structure-map equations only on Hasse-diagram edges is sufficient because transitivity propagates the rest (Section 2, p. 2). This is the basic local-to-global verification rule.

## technique: carry obligations as a global section and check edges

What it is: represent each pipeline stage as a node in a finite poset, attach an obligation bundle to each node, and make every lowering edge a structure map. A global verification record is valid when each edge equation holds; all-pairs checking is unnecessary by the Hasse-edge theorem.

When to use it: use this when a compiler has ordered lowering stages and properties that must survive each pass. It is most useful when many stages would make pairwise checking expensive.

How to do it (paper's method):

1. Define the ordered stages (PSG, MLIR dialects, binary) and bundle assignment `F` (Section 2, p. 2)
2. Define each edge translation `D` and require the compositionality equation above (Section 2, p. 2)
3. Check the equation on Hasse-diagram edges; use transitivity for longer paths (Section 2, p. 2)
4. Treat a failed local extension as an obstruction and refine the bundle category or move to a stronger verification tier (Sections 2–3, pp. 2–3)

Inference: In Verus, the corresponding shape is a Rust function with `requires` and `ensures` contracts plus proof functions that establish each pass's preservation lemma. The pipeline driver can call the proof functions at pass boundaries; a pass's postcondition supplies the next pass's precondition. Verus does not provide the paper's categorical global-section object automatically, so the stage relation and edge lemmas would be explicit ghost/specification data. Use only Verus constructs documented in the local Verus notes; do not model `invariant(...)` as a call or use `modifies`.

Evidence: the paper gives no measured benchmark for edge checking. Its evidence is the stated compositionality equation, the compiler architecture, and three appendix traces. The trusted base table says Tier 1–3 use Z3 and Tier 4 uses Z3 plus the Rocq kernel (Section 3, p. 3). Inference: the denominator for any claimed coverage is therefore the set of pipeline edges, but the paper reports no edge count or pass count.

Assumptions and failure: an edge proof can be trusted only if the bundle and translation model faithfully describe the compiler. The paper itself says MLIR operation behavior is adjacent to, and not the same as, PSG type-level structure, and that it is “not yet a complete semantics of the MLIR mechanism” (Section 9, p. 11). Inference: a malformed PSG annotation or an omitted side condition can make every local check pass while the intended property is wrong.

## technique: fixed-point recursion with proof-transformer passes

What it is: a lazy recursive combinator supplies itself to nanopasses that need to descend into nested lambdas, control-flow scopes, or matches. The paper's code defines `lazyCombinator` over `SemanticNode`, tries witnesses, and passes `lazyCombinator.Value` to nested-scope witnesses (Section 4, pp. 5–6). The fixed point ties the recursive descent while preserving SSA region structure.

When to use it: use it for an IR whose nested scopes remain explicit and for a sequence of passes that should compose over every nested node.

How to do it (paper's method):

1. Define a `Nanopass` with a witness function from context and semantic node to a witness output (Section 4, p. 5)
2. Define a lazy recursive combinator that tries registered witnesses and skips when one returns `TRSkip` (Section 4, p. 5)
3. Give nested-scope witnesses the combinator itself so they recurse into lambda, control-flow, and match regions (Section 4, p. 5)
4. Compose MLIR-to-MLIR passes as functions of shape `MLIROp list -> MLIROp list` (Section 4, p. 6)
5. Certify a pass as an Ohori proof transformer when it preserves the carried bundle by construction; otherwise issue an SMT re-check on that edge (Section 4, p. 6)

The paper quotes the proof-theoretic basis: “A lowering pass realized as a proof transformer satisfies the compositionality equation of Section 2 by construction, because the composite transformer is type-preserving by the substitution rule above” (Section 4, p. 6). It further says that for an uncertified pass “the verification cost on that edge falls to zero” only after certification (Section 4, p. 6).

Inference: In Verus, write each executable transformation as a Rust function and prove a postcondition relating input and output abstract states. Recursive traversal can use ordinary Rust recursion where termination is accepted, with a `decreases` clause if needed; proof-only helper functions can establish preservation. The fixed point is an implementation pattern, not a Verus primitive. Inference: a Verus proof of each pass's contract replaces the paper's unformalized proof-transformer certification, but proving that an MLIR transformation preserves all dialect invariants still requires explicit models.

Evidence: Appendix A.1 lowers a typed kinetic-energy function to f64 MLIR; A.2 lowers a stack-scoped accumulator to `memref.alloca`; A.3 lowers a phase counter with widening, modulo, and narrowing (Sections A.1–A.3, pp. 12–14). No pass count, proof time, or success denominator is reported. The implementation claim is therefore qualitative.

## technique: tiered obligations and adjoint mode shifts

What it is: keep the compilation poset fixed while changing the category of obligation bundles by verification tier. The table lists Tier 1 integer equalities, Tier 2 QF LIA/QF BV, Tier 3 restricted probabilistic facts, and Tier 4 pRHL; Z3 is trusted through Tier 3, while Rocq enters at Tier 4 (Section 3, p. 3).

When to use it: use a lower tier for decidable arithmetic or bitvectors and shift upward when the current tier cannot produce a witness. The paper's example shifts a claim from Tier 2 to Tier 3 with `↑2,3`.

How to do it (paper's method):

1. Attach each obligation to the weakest tier that can express it (Sections 3 and 5, pp. 3 and 7)
2. When a lower tier cannot tighten a bound, create a typed shift `↑k,k+1` carrying the refinement obligation (Section 5, p. 7)
3. Conjoin the source constraint and shift obligation and submit one solver query (Section 5, p. 7)
4. Compose consecutive shifts by `↑2,3 ; ↑3,4 = ↑2,4`; use the round-trip law `↓3,2 ; ↑2,3 = id` where applicable (Section 5, p. 7)
5. On failure, use the unsatisfiable core to localize the transition (Section 5, p. 7)

The paper states: “the discharge would reuse the existing solver path, since a shift extends the source-tier constraint with the obligation that justifies it and Z3 can discharge the conjunction in one query” (Section 5, p. 7). Inference: in Verus, represent a tier shift as a lemma whose `ensures` states that the stronger predicate follows from the weaker predicate and side conditions. Call the lemma before the stronger proof; do not treat proof functions as runtime computations. Verus can send arithmetic obligations to Z3, but the paper's pRHL/Rocq tier and adjoint laws would need an external model or a separately verified abstraction.

Evidence and limits: the paper reports no number of shifts, solver queries, unsat cores, or successful obligations. Inference: there is no empirical denominator from which to estimate automation coverage. The stated trusted bases are facts about the proposed tiers, not a soundness proof of the full Clef implementation.

## technique: parametricity for free preservation facts

The paper's claim is that a type interpreted as a relation forces every well-typed term to respect that relation. Its examples are `map` naturality and dimensional multiplication, and it identifies preservation through a dimension-blind lowering pass as `dim ◦ L = dim` (Section 6, p. 8). It explicitly limits this free theorem: inequalities, distributions, and relations between runs remain obligations for Tiers 2 and beyond (Section 6, p. 8).

Inference: in Verus, encode the dimension relation as a specification predicate and prove a generic lemma for a function that does not inspect the dimension ghost value. Each concrete call then instantiates the lemma. This is a useful proof-reuse pattern, but Verus does not infer Reynolds-style abstraction theorems for arbitrary Rust types.

## technique: preserve negative and fractional pairing as type-level codata

What it is: represent a negative or fractional type as a pairing with its positive or multiplicative counterpart, carried as PSG codata and then MLIR attributes. The paper gives duality equations `T ⊕ (−T) ≅ 0` and `T ⊗ T⁻¹ ≅ 1`, plus unit/counit snake identities (Section 7.1, p. 9). It withholds contraction and weakening so values cannot be silently duplicated or erased (Section 7.1, p. 9).

How to do it: recognize η/ε source constructs; create PSG hyperedges linking paired values; lower the pairing to operation attributes; choose interaction-net or constraint-based realization; preserve the pairing through certified proof-transformer passes; otherwise re-check it with Z3 (Sections 7.1–7.2, pp. 9–10). The paper calls the SMT-dialect obligation a proposed addition, while width inference and truncation are implemented (Appendix A.3, pp. 13–14).

Inference: in Verus, model the pairing with ghost/specification state and prove that each operation preserves a predicate expressing the pairing and linear-use condition. Rust ownership can enforce some non-duplication, but the compact-closed equations and MLIR attributes need explicit lemmas. Inference: this technique is therefore a design transfer, not demonstrated Verus code.

Evidence, trusted parts, and threat: the only concrete evidence is the appendix's proposed bitvector query. The paper says an unsat result certifies no overflow under the inferred range (Appendix A.3, p. 14), but gives no solver version, runtime, or count of cases.

## contradictions and scope

The paper says the fixed-point scaffold is “a real object in the middle end” (Section 4, p. 5) but describes the SMT dialect obligation as “a proposed addition” (Appendix A.3, p. 14). Inference: implemented lowering and proposed verification infrastructure must be kept separate when assessing readiness. The paper reports no percentages or denominators, so there are no percentage arithmetic inconsistencies to resolve. It explicitly bounds its claim by saying the work is not a complete MLIR semantics (Section 9, p. 11).

## techniques for the catalog

- edge-global-section checking — model lowering obligations on a finite poset and check compositionality on Hasse edges
- fixed-point proof-transformer recursion — tie nested nanopass traversal with a lazy combinator and certify passes as compositional proof transformers
- tiered solver obligations — place constraints in progressively stronger tiers and discharge typed mode shifts with the existing solver path
- parametricity preservation — obtain dimension-blind preservation from relational typing and use explicit proofs for value-dependent facts
- pairing-carrying types — carry negative/fractional duality as type-level PSG codata and MLIR attributes, with edge re-checks when construction is uncertified
