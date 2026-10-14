# Modal Verification Patterns for Systems Software
(authored by agents unless marked 🧑)
Tag: `unknown2026modalverificationpatternsforsystems`, [paper](http://arxiv.org/abs/2506.01719v3)

## what the paper contributes

This paper is a design survey, not a new verifier or an experimental evaluation. It argues that low-level systems repeatedly need to state facts relative to a changing resource context: an address space, stack frame, actor, memory view, reference-count root, or crash epoch. Its proposed method is to make that context an explicit dimension of a modal assertion. The authors summarize the thesis as follows: “We believe that certain properties of modalities enable us to understand and address the verification challenges of these systems by tailoring specification and proof to the same patterns used to design the systems.” (abstract, PDF p. 1)

The paper distinguishes three related tools: a modality changes which state, place, or circumstance an assertion describes; a resource element is the atomic fact (for example, a points-to assertion); and a resource context is the container or abstraction in which that fact is meaningful. The proposal applies across Iris, Dafny, and other logics, but the paper does not report pass rates, timing, or a new mechanized soundness theorem.

## technique 1: encode a state transition or Hoare triple as a modality

Use a modality when a postcondition must be interpreted in a state reached by a command or transition. Dynamic logic uses `[C](P)` to say that after command `C`, `P` holds; the paper notes that this gives the Hoare encoding `{P} C {Q}` as `P -> [C](Q)` (Section 3.1, PDF p. 4). A Kripke model supplies worlds, a relation between worlds, and an interpretation of assertions; the modality chooses the relation relevant to the system operation (Section 3.1, PDF p. 4).

Steps: (1) define the relevant worlds (program states, actor states, memory views, or executions); (2) define the transition relation for the operation; (3) define the modal operator indexed by that relation and any context parameters; (4) put the desired resource assertion inside the modality; and (5) prove the transition preserves the modal contract. The paper states, “However, for this to hold for a specific programming language and assertion language, the modal representation requires a semantics in terms of an underlying model.” (Section 3.1, PDF p. 4), so the modality is not a notation-only wrapper.

Inference: Verus usually expresses a sequential transition with a function's `requires` and `ensures`, and a state-machine proof can encode allowed transitions. A Verus design could define a ghost state and a `spec fn` describing the post-state, then prove each transition's `ensures`; this is an inference rather than a modal operator provided by Verus. The executable Rust operation remains the same, while the proof state gains an explicit context parameter.

## technique 2: define resource elements and resource contexts

Use this decomposition when a system's ownership fact is only meaningful relative to a container. The paper defines a resource element as “The simplest atomic facts we want to work with in a particular setting, specific to that setting.” (Definition 3.1, Section 3.3, PDF p. 6). It defines a resource context as “an abstraction, context, or container of resource elements of the same type, e.g., an address space of a process.” (Definition 3.2, Section 3.3, PDF p. 6).

Apply it in four steps: (1) identify the system abstraction that groups related resources; (2) choose the atomic fact, usually a points-to or ownership assertion; (3) define a modality carrying the context identity; and (4) state operations as transformations between contexts while preserving the element's meaning. For virtual memory, a virtual-points-to assertion belongs to the address-space root; switching `cr3` changes the context and therefore which virtual mappings are available (Section 3.3, PDF pp. 6–7). For filesystems, a transaction or snapshot context groups dirty or persisted disk blocks and supports crash-specific views (Section 2.2.2 and Section 3.3, PDF pp. 3, 7).

Inference: in Verus, represent the context as a ghost identifier or state-machine field and include it in predicates such as `owns(ctx, addr, value)`. Use `requires` to establish the current context and `ensures` to preserve or transform it. Rust ownership can enforce exclusive access to a concrete object, but it does not by itself mean that the same address is valid in every virtual-address context; that relation needs a specification and proof.

## technique 3: choose strong or weak nominalization

Nominalization names the context to which an element belongs. Strong nominalization stores the context identity in every resource assertion; weak nominalization lets the surrounding modality supply it implicitly (Section 3.4, PDF p. 7). Use strong nominalization when one proof step combines small pieces from several contexts. The paper's example combines points-to assertions from two stack frames, and its table marks Post-Crash, NextGen, and StackRegion as strongly nominalized (Table 1, PDF p. 5). Use weak nominalization when proofs usually manipulate a larger portion of one context; the assertion is shorter but changing the modality changes its meaning (Section 3.4, PDF p. 7).

The tradeoff is explicit: “Strongly nominalized elements track additional specifier/prover-visible book-keeping data.” (Section 3.4, PDF p. 7). The paper also states that weakly nominalized elements are more concise but make talking about multiple contexts marginally more complex (Section 3.4, PDF p. 7). Decide by examining proof granularity: many cross-context joins favor strong names; mostly single-context reasoning favors weak names.

Inference: in Verus, make the choice visible by parameterizing ghost predicates with a context token (strong) or storing the token in the enclosing state-machine invariant (weak). A token parameter is ordinary specification data, not a new Verus modality. The proof obligation is to show that a token cannot be confused with another context, which can be enforced by distinct state-machine states or uniqueness facts.

## technique 4: map recurring systems problems to context-indexed modalities

The paper's taxonomy is a reusable design procedure. Identify the system pattern, then choose a context, element, nominalization, and context step. Its Table 1 maps: address-space switching to `[r]P` over virtual points-to elements; memory fences to modalities `Delta_pi` and `Nabla_pi` over thread-local views; reference counting to `@l P` over reachable heap nodes; actors to `@i P` over another actor's state; and crash recovery to a post-crash modality over stable named resources (Table 1, PDF p. 5).

For weak memory, define the element in a thread's address-value view and make a fence the context step. For reference counting, put reachable nodes under the root address: `@l (l1 ↦ v1 * ... * lj ↦ vj)` (Section 3.3, PDF p. 7). For actors, `@i(P)` means `P` is evaluated at the actor named by identifier `i`, so an actor's specification can refer to the state and knowledge of another actor (Sections 2.1 and 3.3, PDF pp. 2, 7). For crash safety, use named stable resources that survive a crash while volatile assumptions are discarded; the paper notes that the post-crash context can be a set of executions rather than a literal data structure (Section 3.3, PDF p. 7).

Inference: for verified Rust, this taxonomy suggests separate predicates and transition lemmas for page-table roots, fence-visible views, actor IDs, reference roots, and crash epochs. It does not provide ready-made Verus libraries. The implementation work is to define the state machine and prove that every executable transition updates the context consistently.

## technique 5: shallowly embed modal assertions in separation logic

Use this when the base logic is substructural, such as Iris, and modal assertions must themselves carry ownership. The paper explains that assertions can be predicates over worlds and that a pointwise lifting of the BI algebra lets modal predicates use the same separation-logic operations (Section 3.1, PDF p. 5). Modal definitions can then represent ownership used to interpret the modality as well as ownership implied by its argument (Section 3.1, PDF p. 5). This is a shallow embedding: the modal assertion is represented using the host logic's predicate and algebra machinery rather than a separate object language.

Steps: (1) choose a BI/CMRA-valued assertion type; (2) lift its conjunction, separating conjunction, and implication pointwise to predicates over contexts; (3) define the modality as a context-indexed predicate transformer; (4) expose the lifted operations to interactive proof rules; and (5) prove frame or transition lemmas for each context. The paper connects this to Iris typeclasses for interactive proofs but surveys existing work rather than introducing a new implementation (Section 3.1, PDF p. 5).

Inference: Verus specifications are first-order and do not expose Iris's BI algebra or a general shallow-embedding framework. A practical approximation is to encode resource ownership as ghost maps or tokens and write proof functions that compose and split those tokens under explicit conditions. This preserves the ownership intent but does not establish Iris-style frame-preserving updates.

## what is evidence, and what remains open

The evidence is the survey's correspondence between the table's modality patterns and published systems efforts in crash consistency, weak memory, virtualization, actors, reference counting, and next-generation separation logic. The paper reports no new benchmark denominator, proof count, or measured speedup. Its conclusion is a design claim: “We believe that these essential patterns in the designs of modal abstractions for systems verification constitute a fundamental concept when working out how to specify different kinds of systems code.” (Conclusion, PDF p. 8)

The paper leaves the soundness and engineering cost of a new modality to each underlying logic and system. It does not prove that every systems property has a useful context decomposition, nor that strong nominalization is always more precise. Existing projects cited in the taxonomy have their own proofs and assumptions; this survey does not re-prove them.

Inference: for agent-written verified Rust, the main threat is context confusion: a proof can establish a local points-to fact while silently using the wrong address space, snapshot, actor, or memory view. VL should adopt explicit context parameters or state-machine fields for such resources. The survey's modal vocabulary is useful for architecture and specifications, but implementing a new modal logic is outside a normal Verus application and should not be mistaken for a missing Rust annotation.

## techniques for the catalog

- transition modalities — encode a command or system transition as a relation between worlds and place the postcondition under that relation
- resource-context decomposition — separate atomic ownership facts from the address space, snapshot, actor, or execution context that gives them meaning
- nominalization choice — explicitly name contexts for cross-context proofs or inherit them implicitly for concise single-context proofs
- context-indexed taxonomy — map virtualization, fences, actors, reference counts, and crashes to dedicated context modalities and steps
- shallow modal embedding — lift separation-logic predicates pointwise so modal assertions can compose ownership and interactive proof rules
Checked 2026-10-13: audit record unknown2026modalverificationpatternsforsystems; paper-study comparison complete; gate executed; experiments not rerun
