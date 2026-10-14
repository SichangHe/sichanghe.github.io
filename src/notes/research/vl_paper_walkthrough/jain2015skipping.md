# Skipping Refinement
(authored by agents unless marked 🧑)
Tag: `jain2015skipping`, [paper](http://arxiv.org/abs/1502.02942v1)

## scope and evidence
Skipping refinement verifies optimized reactive systems whose concrete step can perform several abstract steps at once. The paper defines skipping simulation (SKS), a sound and complete local characterization called well-founded skipping (WFSK), and a reduced form (RWFSK). It mechanizes three case studies: a JVM-like stack machine, a buffered memory controller, and scalar-to-vector compiler transformation. The finite hardware models range from 24K gates/500 latches to 2M gates/23K latches; model-checker timeout is 900 seconds on a 16-core Xeon X5677 with 96 GB RAM. Most I/O-equivalence configurations time out, while all but TIP solve all skipping configurations, with “an improvement of several orders of magnitude” (Section 5, pp. 12–14). Exact per-configuration counts are shown only graphically, so no total solved denominator is available. The infinite-state compiler case uses ACL2s interactive proofs and reports less manual effort than I/O equivalence without a numeric effort measure.

## technique: matching paths that may skip abstract steps
What it is: Relate a concrete and abstract transition system by partitioning their infinite paths into finite, nonempty segments. Every concrete state in a segment must relate to the first abstract state in the corresponding segment; a segment can therefore absorb multiple abstract steps. The abstract explains: “Skipping can be thought of as the dual of stuttering: stuttering allows us to ‘stretch’ executions of the specification system and skipping allows us to ‘squeeze’ them” (Section 1, p. 2).

How to apply it: (1) Define labeled transition systems with left-total transition relations. (2) Choose a relation B between concrete and abstract states and ensure labels agree. (3) For each concrete fullpath σ, find an abstract fullpath δ and increasing partition sequences π and ξ. (4) Prove every concrete segment `πσi` is B-related to `δ(ξ.i)`. (5) Define a refinement map r from concrete to abstract states and require each concrete state s to relate to r(s) (Definitions 1–4, pp. 4–6).

Verus form (Inference: the paper is not about Rust): encode concrete and abstract states as ghost state-machine datatypes, with a `spec fn` relation B and refinement map r. A Verus proof function can show label equality and a simulation step; infinite-path matching requires an inductive/coinductive argument or a bounded-step invariant, not an ordinary postcondition on one function call. For a bounded optimized operation, model the skipped abstract steps as a ghost loop and prove the final state relates to the abstract state.

Evidence: Definition 3 requires label agreement and that every concrete fullpath has a matching abstract fullpath. This is a semantic property, not an experiment. The paper’s discrete-event example demonstrates priority-queue execution jumping over empty times (Section 2, pp. 2–3).

Limits: Fullpath existence assumes left-total systems; deadlock behavior is not stuttering. Inference: a Verus encoding must decide how to represent infinite traces and fairness, which the paper leaves at the transition-system level.

## technique: well-founded skipping proof rule
What it is: Replace quantification over infinite matching paths with local obligations involving successors and well-founded ranks. For a related pair (s,w) and concrete successor u, WFSK checks four cases: immediate match, concrete-side stuttering with a decreasing `rankt`, abstract-side stuttering with decreasing `rankl`, or bounded skipping to a state v reachable from w with u B v. Definition 5 (p. 7) gives these cases.

How to apply it: (1) Define B and prove label equality (WFSK1). (2) Choose a well-founded rank domain W and rank functions `rankt` and `rankl`. (3) For every s→u with sBw, discharge one of cases (a)–(d). (4) For skipping case (d), prove a bounded path from w to v; the paper notes the bound is often a design constant such as request-buffer capacity (p. 7). (5) Prove the theorem’s side condition that all concrete states relate to their refinement-map image. (6) Conclude skipping refinement by soundness Theorem 2.

Verus form (Inference): state WFSK as a ghost predicate over state pairs. Use `requires` for B and transition guards, `ensures` for the matching successor or rank decrease, and proof lemmas for well-founded ordering. A bounded skip can be encoded as a recursive proof over a `Seq` of transitions with a length bound. Verus has no `rankt` syntax; use a `spec fn` measure and arithmetic/order lemmas.

Evidence: The paper states: “This notion allows us to match infinite sequences by checking local properties and bounded reachability” (Section 4, p. 8). Theorem 2 proves every RWFSK is an SKS; Theorem 3 proves completeness in the other direction (pp. 9–11), establishing the proof rule is sound and complete.

Limits: WFSK case (d) still requires reachability unless the skip bound makes it local. The rank domain may be an ordinal, which is difficult to encode directly in executable Rust. Inference: practical Verus proofs should use natural-valued bounded ranks where the implementation permits them.

## technique: reduced WFSK and completeness construction
What it is: RWFSK removes the abstract-side stuttering case because cases (a) and (d) subsume it, leaving a single rank-decrease disjunct or a positive-length abstract path. Definition 6 (p. 8) gives the reduced rule. The completeness proof constructs `rankt` from a computation tree and assigns ordinals to finite paths.

How to apply it: (1) Build the computation tree rooted at state s. (2) Restrict it to nodes that remain B-related to w and have no B-related state reachable from w. (3) Prove every path in this subtree is finite. (4) Assign each node an ordinal size equal to one plus the union of child sizes. (5) Use this ordinal as `rankt`; show every concrete step either reaches a B-related abstract successor or decreases the ordinal (Definitions 7–8 and Lemmas 4–6, pp. 10–11).

Verus form (Inference): use a finite tree or bounded sequence for concrete systems; define a natural rank equal to remaining skip budget. For unbounded state spaces, ordinal encodings are outside routine Verus arithmetic and would need an explicit well-founded datatype and lemmas.

Evidence: Theorem 3 states, “If B is an SKS on M, then B is an RWFSK on M” (p. 10), while Theorem 2 supplies soundness. These are mathematical theorems, not measured data.

## technique: memory-controller and stack-machine refinement
What it is: Apply the rule to implementations that buffer work and then commit many abstract operations. BSTK buffers JVM instructions and drains them in bulk; OptMEMC buffers requests, marks redundant writes, and executes a batch, while STK and MEMC execute one operation at a time (Section 5, pp. 12–13).

How to apply it: (1) Specify the atomic abstract machine. (2) Specify concrete buffer state and a capacity parameter. (3) Choose B relating concrete state to the abstract state after zero or more buffered operations. (4) Prove buffer fill/drain transitions by WFSK: fill is stuttering; drain is bounded skipping. (5) Compare the proof with direct I/O equivalence.

Verus form (Inference): represent the buffer as a Rust `Vec` or bounded sequence, with ghost abstract state. A drain method has `requires` capacity and well-formed requests and `ensures` that its post-state equals the abstract machine after a bounded number of steps. Prove redundant-write elimination preserves the abstract memory map using a lemma over addresses.

Evidence and limits: Hardware models cover 24K gates/500 latches through 2M gates/23K latches. Under a 900-second timeout, all model checkers except TIP solve all skipping configurations, whereas most I/O-equivalence configurations time out (Section 5, pp. 13–14). The figure does not expose the number of configurations, so percentages cannot be computed. Inference: this demonstrates capacity on these models, not universal scalability.

## technique: translation validation for scalar-to-vector compilation
What it is: Prove each transformed scalar program implements its SIMD target using skipping refinement. The source and target transition systems have unbounded instruction/store sizes; ACL2s supplies deductive proofs (Section 5, p. 14).

How to apply it: (1) Define scalar and vector operational semantics. (2) Define the transformation from source program to target program. (3) Choose B relating source state to target state while a vector instruction replaces two scalar instructions. (4) Prove the vector step is a bounded skip and that labels/stores agree. (5) Use ACL2s proof scripts to discharge WFSK obligations. This is translation validation because each generated target is checked against its source.

Verus form (Inference): model source and target instruction sequences as ghost `Seq`s and define a refinement relation over program counters and stores. Prove each vector execution corresponds to a bounded sequence of scalar executions. Verus can verify a concrete Rust optimizer if its instruction semantics are encoded, but it will not infer the relation automatically.

Evidence: The paper says ACL2s proofs made skipping refinement “straightforward” while I/O-equivalence proofs required substantially more invariant insight (p. 14). No proof-script length or timing denominator is reported.

## trusted boundary and product threat
The approach trusts transition-system semantics, labels, refinement maps, ACL2s/BAT/model-checker soundness, and the chosen skip bound. It proves behavioral correspondence modulo skipping, not compiler correctness outside the modeled instruction set, hardware implementation, or memory-model assumptions. Inference: for VeruLaw, skipping refinement is a high threat to any agent-written optimizer, batching layer, memory controller, or compiler pass: ordinary step-by-step simulation can reject a correct optimization or miss a multi-step collapse. A Verus state-machine proof with bounded skip lemmas is a practical adaptation. VL should not redo the paper’s abstract SKS/WFSK theory; it should integrate bounded refinement obligations with executable Rust and quantify proof maintenance.

## what remains already done
The paper already provides a sound and complete local proof rule, a computation-tree completeness construction, and case studies spanning hardware buffers and compiler vectorization. Repeating a generic skipping-refinement definition would duplicate this work. The open engineering gap is a verified Rust/Verus library that supplies reusable bounded-skip relations and checks generated optimizations.

## contradictions or missing accounting
The paper calls skipping refinement “the first notion” that supports faster optimized systems “as far as we know,” while related-work discussion lists multiple refinement frameworks; this is a qualified novelty claim. The experimental narrative says “all model-checkers except TIP can solve all the configurations,” but Figure 1 is a plot without a configuration count, so no exact success percentage follows. The phrase “several orders of magnitude” has no reported arithmetic summary. ACL2s manual effort is described qualitatively, without person-hours or script sizes.

## techniques for the catalog
- skipping path matching: partition concrete and abstract fullpaths so one abstract state can cover many concrete steps
- well-founded skipping: discharge local successor obligations with stuttering ranks and bounded reachability
- reduced WFSK: use a rank-decrease or positive-length path rule equivalent to full skipping simulation
- buffered-system refinement: verify stack machines and memory controllers whose batch steps skip abstract operations
- translation validation: check scalar-to-SIMD compiler outputs by a bounded skipping relation
Checked 2026-10-14: audit record jain2015skipping; paper-study comparison complete; gate executed; experiments not rerun
