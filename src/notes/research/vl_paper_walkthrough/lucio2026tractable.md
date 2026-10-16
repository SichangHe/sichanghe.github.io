# Tractable Verification of Model Transformations: A Cutoff-Theorem Approach for DSLTrans
(authored by agents unless marked 🧑)
Tag: `lucio2026tractable`, [paper](http://arxiv.org/abs/2604.18792v2)

## result and claim boundary
This paper makes bounded SMT verification complete for a restricted, monotone model-transformation language. The target is DSLTrans, whose rules are layered, local, non-recursive, and additive. The paper's core claim is: “for the fragment of DSLTrans we consider and for positive existence/traceability properties, every property violation has a bounded witness whose size depends only on the static characteristics of the transformation and property, not on the input model.” (Sec. 1.2, p.2)

The complete fragment is F-LNR (no indirect links, bounded rule matches, layered acyclic backward links, finite attribute domains, monotonicity) and G-BPP (bounded local pre/post patterns, local traces, positive existence semantics) (Secs. 3.2–3.3, pp.9–10). The theorem does not cover deletion, negative application conditions, transitive matching, global absence/uniqueness, or unrestricted attributes (Sec. 4.3, p.13). Inference: the method is transferable to a Verus component only when its state transition has an analogous finite witness bound and monotonicity; ordinary mutable Rust programs do not satisfy those assumptions automatically.

## technique: cutoff theorem and witness construction
Use this when the transformation and property satisfy F-LNR × G-BPP and you need an all-input-size guarantee.

Steps from the proof sketch:
1. Find a violating precondition match; seed `Support0` with its at most `p` source elements (Sec. 4.1, p.12).
2. Expand support with match elements of relevant rules that fire, across at most `d` backward-dependency layers; each connected firing adds at most `m−1` new elements and there are `r` relevant rules (p.12).
3. Add the least mandatory-association closure; the closure contributes at most factor `a+1` (p.12).
4. Induce a smaller source model and use monotonicity to show its target graph is a subset of the original target graph, so the missing positive witness remains missing (p.12).
5. Compute `K = min(Kcoarse, Ksharp, Ktight)`, using the paper's formulas: `Kcoarse = c·(m+p)·d′·(a+1)`, `Ksharp = p·(1+m·r)·d′·(a+1)`, and `Ktight = p·(1+(m−1)·r·d)·(a+1)` (Theorem 4.1, p.12).

The theorem says: “If there exists a model M such that T (M ) ̸|= P , then there exists a model M ′ with |M ′ | ≤ K such that T (M ′ ) ̸|= P .” (Theorem 4.1, p.12) Thus an UNSAT result at the theorem bound proves the property for every model size in the stated fragment.

Verus form (Inference): encode the bounded source graph as finite `Seq`/map state or a fixed slot array, and state the transition relation as a pure specification. A Verus proof would need lemmas showing support restriction preserves the counterexample and that the bound covers all rule firings. The paper's Z3 theorem is not a Verus proof and does not carry over as executable Rust.

## technique: direct SMT bounded model checking
Use this to decide a bounded violation query after computing `K`.

Steps:
1. Encode a well-formed source world of size at most `K` as `Φworld`.
2. Encode every rule's source matching, backward-trace resolution, firing, target creation, and trace links as `Φrules`.
3. Encode a precondition match as `Φpre` and negate the existential postcondition witness, including target links, attributes, and traces, as `¬Φpost`.
4. Ask Z3 for `Φ = Φworld ∧ Φrules ∧ Φpre ∧ ¬Φpost` (Sec. 5, p.14).
5. Interpret UNSAT as a theorem-backed proof, SAT as a concrete counterexample, and timeout as unknown (Sec. 6.4, p.23).

The paper gives the exact formula: “Φ = Φworld ∧ Φrules ∧ Φpre ∧ ¬Φpost” (Sec. 5, p.14). Inference: a Verus analogue would prove a universally quantified transition invariant rather than call Z3 at run time; Z3 remains a trusted external solver only for the paper's implementation.

## technique: fragment selection with CEGAR
Use this when encoding all transformation rules is expensive. Select only layers that can produce the property's postcondition and traces, then repair spurious counterexamples.

Steps:
1. Build a minimal fragment covering postcondition types and trace requirements (Sec. 5.1, p.14).
2. Verify the fragment. A proof is sound for the full transformation because additive semantics only adds target structure (Lemma 5.1, p.14).
3. If a counterexample appears, inspect the source model and test omitted rules for source matches.
4. Add only omitted rules with satisfiable matches, recompute `K`, and retry; fall back to the full relevant set if needed (Sec. 5.2, p.15).

The paper cautions: “A violated result on the fragment, however, might be spurious: rules in T \ F might produce the missing postcondition structure.” (Sec. 5.1, p.14) Verus form (Inference): this is analogous to proving a reduced transition system and refining it when a witness uses omitted transitions; each refinement needs a lemma that the reduced system over-approximates the real one.

## technique: per-class bound fixed point
Use this when one global `K` allocates many irrelevant slots. Seed source classes from the precondition, add mandatory associations, then compute target production for each relevant rule until a least fixed point.

For a target class `C`, the paper bounds production by `K_C^base = p_C + Σ_R N_R·m_C(R)` and bounds rule firings by `N_R ≤ Π_S K_S^{n_S(R)}` (Theorem 5.6, pp.15–16). Iterate source seeds, closures, productions, and target closures, capped at global `K`. The UML property's global `K=78` becomes one Property slot and one Class slot on the source side (p.16). In a separate example, `MultiValuedPropertyHasAddHelper` drops from `K=735` to `K=6`, a 122× reduction and a proof under seven minutes (Table 3, p.25).

Verus form (Inference): represent per-class slots as bounded sequences and prove a fixed-point upper-bound lemma. This technique reduces proof search but does not by itself establish the fixed point's correctness.

## technique: trace-aware dependency pruning and factored postconditions
Use trace-aware relevance when many rules produce the same target type. Retain rules that can create the required target traced from the required source; recurse through backward-link dependencies. The paper reports trace-aware mode reducing relevant rules from 10+ to 2–3 and shrinking `K` by 3–5× for many UML-to-Java properties (Sec. 5.4, p.17).

If postcondition components are independent, factor existential quantifiers per connected component. The paper states: “If the postcondition graph has independent connected components C1 , . . . , Ck , the monolithic existential quantification is equivalent to the factored formula” (Lemma 5.8, p.18). Property slicing, metamodel slicing, and singleton reduction of unused attribute domains are additional equisatisfiable rewrites (Sec. 5.5, p.18). Inference: in Verus, this suggests separate lemmas for independent postconditions, provided the state model proves component independence.

## technique: tractability-driven property refinement
Use this when a valid property exceeds the solver budget or polymorphic matches create spurious models.

Steps from Sec. 8.2 (pp.26–27): strengthen or specialize preconditions with attribute guards or concrete subtypes; decompose postconditions into independent properties; add marker classes/links to identify intended target objects; split a composite property into subproperties. The BPMN bipartite example specializes a polymorphic property: 383.75 s and `K=90` become 3.4 s and `K=17`, a 112× speedup, changing `violated` to `holds` (Table 4, p.27). UML getter checking falls from over 30 minutes to about 10 seconds after adding a marker; helper decomposition similarly reaches 12.1 s (Table 4, p.27).

Inference: for Verus, property specialization corresponds to narrower `requires` predicates and separate lemmas; marker fields can make a postcondition structurally identifiable. These are specification-design changes, not evidence that the original broad claim holds.

## evidence, trust, and product threat
The evaluation contains 29 transformations and 899 properties: 552 proved, 345 concrete counterexamples, and 2 undecided within timeout (abstract and Table 2, pp.1, 22). The 345 includes intentional negative tests and boundary properties, so it is not a bug count. The UML-to-Java running example has six layers, 22 rules, and 29 properties (Sec. 2, p.4). The implementation uses a Python prover with Z3, a parser/model layer, cutoff analysis, and SMT-direct encoders (Sec. 6.1, pp.19–20). A web IDE and concrete execution engine support test-driven authoring (abstract, p.1).

What is proved is completeness of bounded checking for F-LNR × G-BPP and soundness/composability of the stated optimizations. Trusted assumptions include the DSLTrans semantics, finite abstraction preserving property observables, implementation correctness, and Z3's verdict. Concrete attribute proofs lift only when the abstraction preserves the distinctions used by the property (Lemma 3.9, p.10). Inference: the threat to VeruLaw is moderate and conditional: the paper demonstrates a strong pattern for finite, additive specifications and counterexample-guided proof search, but it does not verify Rust memory safety, ownership, arithmetic overflow, or arbitrary agent-written code. VL should reuse cutoff-style domain restriction and CEGAR property refinement; it should not redo path-condition enumeration, which the paper reports as exponential and unable to scale beyond roughly 15–20 rules (Sec. 1.1, p.2).

## techniques for the catalog
- cutoff theorem — derive a finite complete bound for local monotone transformations and bounded positive properties
- direct SMT encoding — check `world ∧ rules ∧ precondition ∧ ¬postcondition` with Z3
- fragment CEGAR — verify a minimal rule fragment and add omitted rules only when a counterexample matches them
- per-class fixed-point bounds — allocate slots by source seeds, closures, and rule production instead of one global bound
- trace-aware pruning — retain rules by source-to-target provenance and backward-link dependencies
- factored postconditions — split independent existential witnesses into equisatisfiable component formulas
- tractability property refinement — specialize preconditions, add markers, and decompose postconditions to reduce search
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
