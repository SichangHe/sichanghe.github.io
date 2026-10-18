# The WhyRel Prototype for Relational Verification
(authored by agents unless marked 🧑)
Tag: `nagasamudram2023whyrel`, [paper](http://arxiv.org/abs/2303.14314v1)

## scope and result

WhyRel is an auto-active verifier for relational properties of pointer programs with dynamic allocation, mutable state, framing, and encapsulation. It translates a source language and relational biprograms into WhyML, then uses Why3 and SMT solvers to discharge verification conditions. “This article presents WhyRel, a tool for the auto-active verification of relational properties of pointer programs based on relational region logic.” (Abstract, p. 1)

The target properties include conditional equivalence, representation independence, and noninterference. The user supplies specifications, loop invariants, assertions, and alignment hints; the tool performs the translation and generates proof obligations. Inference: for Verus, the central lesson is that relational verification needs an explicit two-run state model and a disciplined way to relate their heaps. A single-run postcondition is not enough for equivalence of two implementations.

## technique: dynamic regions and boundaries for modular heap reasoning

### what it is and when to use it

A region is a set of references. A dynamic boundary is a footprint naming a module’s internal locations. A client may not directly read or write boundary locations; it must use module methods. Field-image expressions expand a region into locations such as every `o.f` for objects `o` in the region. The `any` datagroup abstracts over all fields. The paper explains, “Encapsulation is specified using a kind of dynamic frame, called a dynamic boundary: a footprint that captures a module’s internal locations.” (Section 1, p. 2)

This is useful when clients should rely only on an interface while implementations use different pointer layouts. The Stack interface illustrates a boundary containing `capacity`, `pool`, all fields of objects in `pool`, and all fields in the representation region of each stack. A public invariant states that representation regions of distinct stacks are disjoint except for `null` (Section 2, p. 4, Fig. 1).

### how to apply it

1. define an interface with public fields, abstract state, methods, and a boundary (Section 2, pp. 3–4)
2. express each method’s precondition, postcondition, and allowed read/write effects (Section 2, pp. 4–5)
3. add public invariants that clients may use and private invariants over boundary locations (Section 2, p. 5)
4. implement the interface with a concrete representation, proving its private invariant and method contracts (Section 2, pp. 5–8)
5. statically reject client writes to boundary variables, generate assertions that client heap updates are disjoint from boundary regions, and generate lemmas that the boundary frames each public/private invariant and coupling (Section 4, p. 14)

WhyRel’s stack `push` contract allows writes to the stack and its representation and reads of the stack and capacity; allocation is listed explicitly. Inference: this makes the permitted footprint part of the contract rather than an informal convention (Section 2, p. 4, Fig. 1 and text on p. 5).

Inference: in Verus, represent the abstract state with a ghost or specification value, expose methods with `requires` and `ensures`, and prove that client code changes only the resources promised by the API. Verus ownership and proof-oriented types can enforce some locality, but the exact dynamic-boundary analysis is not a Verus construct. A Verus encoding would need explicit predicates for membership and disjointness.

### evidence and limits

The paper reports that boundary and coupling lemmas often require manual proof because image expressions contain existentials and nontrivial region set operations. “Manual effort involves applying a series of Why3 transformations (or proof tactics) and introducing intermediate assertions.” (Section 5, p. 15) Inference: the method therefore improves modular structure without eliminating proof engineering. The source language also has no pointer arithmetic, and references support only equality (Section 4, p. 10).

## technique: relational specifications with couplings

### what it is and when to use it

A relational specification describes two executions at once. Variables are written as a left/right pair, and formulas can require equality or another relation between the two values. Pointer correspondence is represented by a partial bijection between allocated references, rather than strict pointer equality. A coupling relation connects two concrete representations through a shared abstraction, such as two stacks having equal mathematical contents. The paper states, “Strict pointer equality is too strong as it would not allow for modeling allocation as a nondeterministic operation or permit differing allocation patterns between programs being related.” (Section 2, p. 7)

Use this technique when two modules have different layouts but should implement the same abstract behavior. In the Stack example, the coupling says corresponding stacks have equal `abs` lists, while the concrete arrays and linked lists may allocate different objects.

### how to apply it

1. prove each implementation conforms to the unary interface and its abstraction invariant (Section 2, pp. 5–8)
2. define a bimodule pairing the two implementations (Section 2, p. 7)
3. state a coupling relation over pairs of abstract and concrete objects (Section 2, p. 7)
4. give relational contracts for paired methods, preserving the coupling and relating results (Figure 4, p. 7)
5. use the paired method contracts at client call sites rather than exposing representation details (Section 2, pp. 7–8)

The paper’s complete Stack workflow is explicit: “(i) build the STACK interface in WhyRel, with public invariants clients can rely on and a boundary that designates encapsulated locations; (ii) develop two modules refining this interface, ArrayStack and ListStack, and verify that their implementations conform to STACK interface specs, relying on any private invariants that capture conditions on encapsulated state; (iii) provide a bimodule relating the two stack modules and prove equivalence of stack operations, relying on a coupling relation that captures relationships between pointer structures used by the two modules; (iv) verify the client with respect to specs given in STACK and prove it respects WhyRel’s encapsulation regime; and finally (v) develop a bimodule for the client and verify equivalence using relational specs for stack methods.” (Section 2, p. 8)

Inference: in Verus, define a `spec fn` relation over two abstract states and prove paired operations with `proof fn`s whose `ensures` preserve that relation. Rust references should be related through an abstract identifier or mathematical map, not by requiring address identity. This is an inference because Verus does not provide WhyRel’s bimodule syntax.

### evidence and limits

Inference: the approach assumes that the coupling and each method contract are strong enough to imply the desired client relation, and a relational proof can succeed while the coupling omits a behavior that matters to the product. VL should treat coupling definitions as specifications requiring review, not as evidence that two implementations are equivalent in every observable respect.

## technique: alignment as a biprogram

### what it is and when to use it

A biprogram pairs commands from two programs so that their effects and assertions can be reasoned about together. A maximal alignment pairs corresponding control points. A synchronized command is shorthand for pairing a command with itself. Lockstep loops require the two loop guards to agree. In the Stack client, both loops are aligned lockstep; the first loop's invariant is `i` and `stk.abs` equal on both sides, and the second loop's invariant is agreement on the stack abstractions and `result` (Section 2, pp. 6–7).

Alignment is valuable when intermediate relational invariants are simpler than two independent functional proofs. The paper says, “If the chosen alignment is adequate in the sense of capturing all pairs of executions of the related programs, relational properties of the alignment entail the corresponding relation between the underlying programs.” (Section 2, p. 6)

### how to apply it

1. choose corresponding points or commands in the two control flows (Section 2, pp. 6–8)
2. pair commands with `(C | C′)` and use synchronized syntax for identical commands (Section 2, p. 6)
3. align method calls so relational method specifications are used modularly (Section 2, p. 7)
4. state a relational loop invariant and prove it initially, preserved by each aligned iteration, and sufficient for the post-relation (Section 2, pp. 6–8)
5. check adequacy by projecting the biprogram to each unary program and comparing the projections with the originals (Section 4, p. 13)

Inference: Verus can encode a paired execution as a ghost/spec record containing left and right states, then prove a relation-preservation lemma for each synchronized step. A generated two-run harness may call the two executable functions while a `proof fn` maintains the relation. This is an inference; Verus has no native biprogram projection check.

### evidence and limits

Adequacy is a syntactic condition in WhyRel: the left and right projections must equal the original programs. For conditionally aligned loops, the translation requires a condition `A` to be invariant, stating that until both sides terminate the loop can perform a lockstep or a one-sided iteration (Section 4, p. 14). If the alignment is wrong, a relational proof does not entail the intended relation. Inference: alignment generation is a product risk for agent-written proofs because a too-restrictive alignment can silently omit executions unless adequacy is checked.

## technique: data-dependent one-sided alignment

### what it is and when to use it

Lockstep alignment fails when one program performs extra iterations. WhyRel therefore supports alignment guards that select left-only, right-only, or lockstep iterations. In the multiplication example, an inner loop with `m` increments is aligned with one right-side addition of `m`. In the public-list example, a side whose current node is nonpublic iterates alone while the other side pauses, and both sides iterate together when both nodes are public.

### how to apply it

1. write a relational loop invariant over both program states (Section 3, pp. 8–10)
2. define left and right alignment guards as relational formulas (Section 3, p. 10)
3. execute a left-only iteration when the left guard holds, a right-only iteration when the right guard holds, and a lockstep iteration otherwise (Section 3, pp. 9–10)
4. prove each branch preserves the invariant and prove that the loop can always make one of the allowed moves (Section 4, p. 14)
5. restrict guards to forms that the Why3 translation can branch on, such as agreement formulas, points-to assertions, booleans, and boolean connectives (Section 4, p. 14)

For `sumpub`, the invariant existentially records a sequence of public values reachable from both cursors and asserts equality of the partial sums. One-sided iterations preserve the public sequence without changing the sum; lockstep iterations add equal public values (Section 3, pp. 9–10).

Inference: in Verus, encode each branch as a separate proof lemma with branch-specific `requires` and a shared `ensures` relation. A loop `invariant` should state the progress condition as well as the semantic relation, because otherwise one-sided behavior may be unmodeled. This is an inference.

### evidence and limits

The paper says WhyRel restricts guards because arbitrary quantified formulas cannot be translated into the required Why3 conditional. The technique therefore trades expressiveness for an executable product-program encoding. It does not infer alignments or invariants: users provide them, and inference is explicitly out of scope (Section 1, p. 2).

## technique: translation to a two-state WhyML model

### what it is and when to use it

WhyRel represents references with an abstract WhyML type and encodes regions as ghost mathematical sets. A state record contains allocation information, heap maps for each field, global variables, and a well-formedness invariant. Field-image expressions become generated functions with axioms. Unary programs update an explicit state parameter; biprograms operate on a pair of states and a bijective reference renaming.

### how to apply it

1. parse and typecheck the source program (Section 4, p. 10)
2. translate references, fields, regions, and globals into WhyML state maps (Figure 8, p. 11)
3. generate state invariants for allocation, null, dangling references, and field typing (Section 4, p. 11)
4. translate unary commands and add frame postconditions that constrain untouched locations (Section 4, pp. 11–12)
5. translate biprogram commands into a product program over two states, with a reference renaming as an extra parameter (Figure 10 and text, pp. 12–14)
6. generate assertions for guard agreement, alignment adequacy, encapsulation, and boundary framing (Section 4, pp. 13–15)
7. submit the generated verification conditions to Why3 provers (Sections 1 and 5, pp. 3, 14–15)

The frame encoding is fine-grained: because a WhyML map update would otherwise permit writes to every object’s field, WhyRel adds a postcondition stating that all locations outside the intended region retain their old value (Section 4, pp. 11–12). For programs with loops, the generated WhyML function carries a `diverges` clause because the authors are "only concerned with partial correctness" (Section 4, p. 11).

Inference: a Verus model can use a ghost state record and `spec fn`s for heap abstractions, with `requires` and `ensures` expressing frame and relational conditions. Verus ownership may encode some frame facts directly, but the WhyML state-map translation and generated image axioms are outside Verus. The paper’s use of an explicit state model is still useful for proving equivalence of mutable code.

### evidence and limits

The translation generates an axiom for each image expression (Section 4, p. 11). The paper mentions, as a possible alternative to proving every state well-formedness condition, "assumptions, which can be justified by correctness of the WhyRel type checker and translator" (Section 5, p. 15). Inference: generated axioms and any such assumptions, and the parser, typechecker, and translator, would be part of the trusted computing base for a product that adopts this architecture.

## evaluation and evidence

The evaluation covers representation independence, optimizations such as loop tiling, examples from recent literature, alignment patterns including data-dependent ones, Dijkstra’s shortest-path algorithm with two priority-queue implementations, and Kruskal’s minimum-spanning-tree algorithm with two union-find implementations (Section 5, p. 14). Noninterference is a case-study class in the Abstract and the `sumpub` example (Section 3, pp. 9–10). Verification conditions were discharged by Alt-Ergo, CVC4, and Z3. Replaying most saved Why3 sessions took less than 30 minutes on an Intel Core i5-6500 with 32 GB RAM (Section 5, p. 14). The denominator is the set of the paper’s case-study developments; the paper does not give a complete count of all attempted examples or a success percentage.

The strongest evidence is therefore qualitative and case-study based: the examples exercise dynamic framing, representation couplings, and several alignment patterns. The paper reports that basic heap-effect reasoning is generally simple, while boundary and coupling lemmas require considerable manual effort and image-expression reasoning (Section 5, p. 15). It also reports that well-formedness VCs form a substantial fraction of replay time. These measurements do not establish a universal runtime or proof-effort advantage over another verifier.

## trusted scope, contradictions, and threat to VL

The paper says soundness is proved for the relational logic in a separate paper, "of which our prototype is a faithful implementation" (Section 1, p. 2); this paper does not prove the WhyML encoding correct. WhyRel’s own checks include syntactic projection adequacy, client boundary checks, intermediate disjointness assertions, and framing lemmas (Section 4, pp. 13–15). Inference: solver soundness, the source-to-WhyML translation, generated axioms, and the adequacy of user-supplied alignments (which WhyRel checks syntactically) remain trusted or separately justified assumptions.

Inference: the direct threat to VeruLaw is high for any agent that writes relational proofs over mutable Rust without an explicit coupling, frame model, and alignment check. A proof can establish that two executions agree under a chosen relation while the relation omits an observable field or the alignment omits a trace. The paper’s modular method is a useful design target, but its manual image-expression obligations show that generated proofs will still need domain-specific lemmas.

Inference: VL should reuse dynamic abstract state, explicit coupling predicates, relational loop invariants, and adequacy checks. It should not redo WhyRel’s translation to WhyML (implemented in OCaml) or its region-logic soundness theory unless a Rust-specific semantics is required. The novel work for VL would be the correspondence between Rust ownership and a two-run heap relation, plus checks that generated contracts mention all product-relevant observations.

## techniques for the catalog

- dynamic boundaries: represent module footprints as regions and enforce client access through interface methods
- coupling relations: relate distinct pointer representations through a shared abstract state and partial reference correspondence
- biprogram alignment: pair two command streams so relational invariants can be checked compositionally
- data-dependent alignment: use left-only, right-only, and lockstep guards for differing control flow
- relational frame translation: encode heap effects with explicit two-state maps and postconditions for untouched locations
- adequacy and encapsulation checks: project biprograms and generate boundary, disjointness, and framing obligations before proving the relation

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Well chosen alignments help decompose relational verification, allowing for the use of simple relational assertions and loop invariants."): I read the whole paper text (arXiv v1, pp. 1–18) and the whole study, and compared every quotation, section and page reference, figure reference and technique step. I corrected several page references (Fig. 1 is on p. 4, state invariants on p. 11), the encapsulation check description (static check covers boundary variables; heap updates get disjointness assertions), the loop-invariant and public-list descriptions, the adequacy-condition wording, the evaluation list and the trusted-scope paragraph, and marked my own conclusions with the word Inference. Quotations were already word for word. I did not check the cited related work, the Zenodo artifact, or the companion TOPLAS paper on the logic; the Tag link is the arXiv link already present, and the paper text shows arXiv:2303.14314v1 (the arXiv title differs and reads The WhyRel Prototype for Modular Relational Verification of Pointer Programs).
