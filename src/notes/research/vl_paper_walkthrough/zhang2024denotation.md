# Denotation-based Compositional Compiler Verification
(authored by agents unless marked 🧑)
Tag: `zhang2024denotation`, [paper](http://arxiv.org/abs/2404.17297v3)

## result

Cheng, Wu, Wang, and Cao replace most small-step simulation obligations with denotations: semantic functions map syntax to sets of terminating, diverging, aborting, and event-trace behaviors. Their abstract states the goal: “Our denotational semantics is defined by semantic functions that map a syntactic component to a semantic domain composed of multiple behavioral sets, with compiler correctness established through behavior refinement between the semantic domains of the source and target programs.” (Abstract, p.1). The framework is implemented in Rocq and applied to the CompCert front end and prototype optimizations (Abstract, p.1).

The practical workflow is: define a behavior record for each language; define composition operators for syntax; define a state-matching relation when source and target representations differ; prove each compilation phase by behavior refinement; compose phases vertically and modules horizontally. The paper's final theorem states that the front end's phases and module linking compose, but the proof remains a formal model of CompCert languages, not a proof of arbitrary Rust compiler behavior.

## technique: denotations as behavior sets

For a toy WHILE language, a command denotation has normal relation `state → state → Prop` and divergence predicate `state → Prop`; Boolean denotations record true and false states (Section 3.1, pp.9–10). `skip` is identity, choice is union, sequential composition is relational composition, and while uses reflexive-transitive closure. The paper's code shape is explicit: “Record CDenote: Type := { nrm: state → state → Prop; dvg: state → Prop }.” (Section 3.1, p.9). Apply by giving each syntax constructor equations, then prove equations by set algebra.

Realistic languages add finite event traces, infinite traces, aborts, finite divergence, and infinite divergence. The denotation record therefore includes `nrm`, `err`, `fin_dvg`, and `inf_dvg`; sequential composition concatenates traces (Section 3.1, pp.10–11). Control-flow exits are additional fields: `brk`, `ctn`, and `rtn` for Clight, while Csharpminor uses a map indexed by block depth (Section 3.2, pp.11–12). Divergence with traces is split by silent and nonsilent filters: “We demand that R∞ is only defined if either all traces in R are nonempty (i.e., nonsilent), or all traces in R are empty (i.e., silent).” (Section 3.3, p.12). This prevents a stuttering proof from conflating silent loops with observable progress.

Verus form (inference): model the Rust component's observable behavior as ghost `Seq<Event>` traces and a `spec fn` relation over pre/post ghost states. Use separate predicates for normal return, panic/abort, finite divergence assumptions, and progress events. A `proof fn` can establish that sequential trace concatenation preserves a relation. Verus does not provide Rocq's coinductive set library or the paper's infinite-trace fixed-point operators directly; liveness and infinite traces require a separate ghost trace model and lemmas, so this translation is an inference.

## technique: open modules and semantic linking

A module's denotation is parameterized by an oracle describing external procedure behavior. The paper defines open-module normal behavior as a least fixed point over internal calls and the external oracle (Section 4.2.1, pp.14–15). Semantic linking merges two module denotations and takes another fixed point so cross-module calls become internal. The key equation is described in the paper as “semantic linking is defined by merging their denotations as if all the procedures reside in one module and then taking the fixed point.” (Section 4.2.2, p.14). Theorem 4.1 proves semantic and syntactic linking equivalent; its proof uses Bekić's theorem to rearrange nested fixed points (Section 4.2.2, p.14).

How to apply it: (1) define query/reply interfaces and a semantic oracle for unresolved calls; (2) define each open module's behavior as the least fixed point of internal procedures plus oracle behavior; (3) link modules by unioning their denotations and recomputing the fixed point; (4) prove equality with physically concatenating module definitions; (5) use the same construction for CFG procedures. This allows horizontal compositionality without proving every closed whole program at once.

Verus form (inference): represent an interface as a ghost relation and a module as a `spec fn` from an oracle to a behavior relation. Fixed-point equality is not a built-in Verus construct; for finite state or bounded call depth, define an inductive approximation sequence and prove monotonic stabilization. For unbounded recursion, retain a mathematical theorem outside executable Rust or supply a well-founded bound. The paper's Rocq fixed-point library and Bekić proof remain trusted infrastructure (inference).

## technique: behavior refinement with state matching

Simple inclusion `JT(c)K ⊆ JcK` works only when states have identical representation. For compiler phases that change memory or state layout, the paper defines refinement using a relation R between source and target states: every target behavior from a related target state must correspond to a source behavior ending in a related state (Section 1, pp.2–3, Equation (2)). Equality is the special case where R is identity. For CompCert's undefined behavior, target termination, finite divergence, or infinite divergence may correspond either to the source behavior or to a source abort whose trace is a prefix of the target trace (Section 7.1, pp.28–30).

Apply it by: (1) choose R for the compiler phase; (2) prove target normal behavior implies related source normal behavior or source abort; (3) prove target abort implies source abort; (4) prove analogous obligations for finite and infinite divergence; (5) compose R relations between phases. The paper's Theorem 7.5 says: “For any matching relations R1 and R2, if L3 ­R2 L2 and L2 ­R1 L1, then L3 ­R2 ◦R1 L1.” (Section 7.1, p.30).

Verus form (inference): write R as a `spec fn` over ghost source/target views; put the per-function refinement condition in `ensures` and prove composition with a lemma that existentially composes intermediate states. Abort-prefix and trace conditions become sequence-prefix predicates. Verus checks the supplied relation; it does not infer a correct memory abstraction, so choosing R is a major trusted assumption.

## technique: Kripke interfaces for modules

For open modules, the framework uses Kripke worlds and Kripke interface relations (KIRs) to relate source and target query/reply interfaces. A KIR contains worlds, an accessibility relation, and world-indexed query and reply relations (Section 7.1, pp.30–31). Vertical composition takes a product of worlds and composes query and reply relations. The paper proves horizontal and vertical compositionality for open modules, then applies the algebra to Clight, Csharpminor, and Cminor (Sections 7–8).

Verus form (inference): model a world as a ghost state carrying abstract resources or valid module assumptions; represent accessibility as a `spec fn`; state query/reply refinement as quantified `ensures` clauses. Product-world composition is a ghost pair and a proof lemma. This requires explicit resource invariants; there is no automatic Kripke-world manager in Verus (inference).

## evidence and limits

The Rocq development includes denotational semantics, linking, refinement algebra, and CompCert front-end correctness. Table 5 reports significant lines relative to CompCert v3.11; Table 7 reports additions for language features, and toy-language definitions/proofs total 2,151 and 5,103 lines respectively (Section 10, pp.42–43). The evaluation is a mechanization-size and theorem-completion report, not a runtime performance study. Trusted elements include Rocq, set/fixed-point libraries, the semantic definitions, state-matching relations, and CompCert's source models. Inference: VL can reuse behavior-refinement and explicit trace modeling to verify Rust modules and compiler-like transformations, but an agent-generated relation can be vacuous or too weak; every relation needs independent specification review. Existing verified compiler work already covers compositional linking, so VL should avoid rebuilding a generic compiler proof and instead apply the refinement algebra to Rust/Verus APIs where the state relation captures ownership and memory views.

## techniques for the catalog

- behavior-set denotations — define normal, aborting, divergent, and event-trace behaviors as typed sets with algebraic composition
- open-module fixed-point linking — parameterize module semantics by external-call oracles and link by union plus a least fixed point
- state-matching behavior refinement — prove target behaviors correspond to source behaviors through a representation relation and compose those relations
- Kripke interface composition — index query/reply relations by worlds and compose interfaces horizontally and vertically
Checked 2026-10-15 against paper zhang2024denotation: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
