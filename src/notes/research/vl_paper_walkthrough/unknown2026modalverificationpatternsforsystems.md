# Modal Verification Patterns for Systems Software
(authored by agents unless marked 🧑)
Tag: `kuru2025modalverificationpatternsforsystems`, [paper](https://doi.org/10.1145/3764860.3768337)

## what the paper contributes

This paper is a design survey, not a new verifier or an experimental evaluation. It argues that low-level systems repeatedly need to state facts relative to a changing resource context: an address space, stack frame, actor, memory view, reference-count root, or crash epoch. Its proposed method is to make that context an explicit dimension of a modal assertion. The authors summarize the thesis as follows: “We believe that certain properties of modalities enable us to understand and address the verification challenges of these systems by tailoring specification and proof to the same patterns used to design the systems.” (Introduction, PDF p. 1)

The paper distinguishes three related tools: a modality changes which state, place, or circumstance an assertion describes; a resource element is the atomic fact (for example, a points-to assertion); and a resource context is the container or abstraction in which that fact is meaningful. The survey primarily covers Iris work and includes one Dafny example, but the paper does not report pass rates, timing, or a new mechanized soundness theorem.

## technique 1: encode a state transition or Hoare triple as a modality

Use a modality when a postcondition must be interpreted in a state reached by a command or transition. Dynamic logic uses `[C](P)` to say that if command `C` terminates, `P` holds afterwards (Section 2.1, PDF p. 2); the paper notes that this gives the Hoare encoding `{P} C {Q}` as `P -> [C](Q)` (Section 3.1, PDF p. 5). A Kripke model supplies worlds, a relation between worlds, and an interpretation of assertions; the modality chooses the relation relevant to the system operation (Section 3.1, PDF p. 5).

Inference: a workflow suggested by the relational encoding is to (1) define the relevant worlds (program states, actor states, memory views, or executions); (2) define the transition relation for the operation; (3) define the modal operator indexed by that relation and any context parameters; (4) put the desired resource assertion inside the modality; and (5) prove the transition preserves the modal contract. The paper states, “However, for this to hold for a specific programming language and assertion language, the modal representation requires a semantics in terms of an underlying model.” (Section 3.1, PDF p. 5), so the modality is not a notation-only wrapper.

Inference: Verus usually expresses a sequential transition with a function's `requires` and `ensures`, and a state-machine proof can encode allowed transitions. A Verus design could define a ghost state and a `spec fn` describing the post-state, then prove each transition's `ensures`; this is an inference rather than a modal operator provided by Verus. The executable Rust operation remains the same, while the proof state gains an explicit context parameter.

## technique 2: define resource elements and resource contexts

Use this decomposition when a system's ownership fact is only meaningful relative to a container. The paper defines a resource element as “The simplest atomic facts we want to work with in a particular setting, specific to that setting.” (Definition 3.1, Section 3.3, PDF p. 6). It defines a resource context as “an abstraction, context, or container of resource elements of the same type, e.g., an address space of a process.” (Definition 3.2, Section 3.3, PDF p. 6).

Inference: apply the decomposition in four steps: (1) identify the system abstraction that groups related resources; (2) choose the atomic fact, usually a points-to or ownership assertion; (3) define a modality carrying the context identity; and (4) specify and prove how operations change the available assertions and their interpretation. For virtual memory, a virtual-points-to assertion belongs to the address-space root; switching `cr3` changes the context and therefore which virtual mappings are available (Section 3.3, PDF p. 6). The Introduction uses a transaction containing dirty disk pages as a resource-context example (PDF p. 1). Section 2.2.2 distinguishes continued-execution and crash postconditions (PDF pp. 3–4); the Conclusion mentions ongoing work with assertions for different filesystem snapshots (PDF p. 7).

Inference: in Verus, represent the context as a ghost identifier or state-machine field and include it in predicates such as `owns(ctx, addr, value)`. Use `requires` to establish the current context and `ensures` to preserve or transform it. Rust ownership can enforce exclusive access to a concrete object, but it does not by itself mean that the same address is valid in every virtual-address context; that relation needs a specification and proof.

## technique 3: choose strong or weak nominalization

Nominalization names the context to which an element belongs. Strong nominalization stores the context identity in every resource assertion; weak nominalization lets the surrounding modality supply it implicitly (Section 3.4, PDF p. 7). Use strong nominalization when one proof step combines small pieces from several contexts. The paper's example combines points-to assertions from two stack frames, and its table marks Post-Crash, NextGen, and StackRegion as strongly nominalized (Table 1, PDF p. 6). Use weak nominalization when proofs usually manipulate a larger portion of one context; the assertion is shorter but changing the modality changes its meaning (Section 3.4, PDF p. 7).

Table 1 classifies Memory-Fence as weakly nominalized (PDF p. 6), but Section 3.4 says, “Given that views are identified by nominals, referring to all the other views makes weak-memory modalities strongly nominalized.” (PDF p. 7). Inference: these classifications conflict, and the paper supplies no resolution.

For Post-Crash, the presentation hides the names: footnote 4 says that the modality internally quantifies over names `gamma`, dealing with sets of possible contexts (PDF p. 7).

The tradeoff is explicit: “Strongly nominalized elements track additional specifier/prover-visible book-keeping data.” (Section 3.4, PDF p. 7). The paper also states that weakly nominalized elements are more concise but make talking about multiple contexts marginally more complex (Section 3.4, PDF p. 7). Decide by examining proof granularity: many cross-context joins favor strong names; mostly single-context reasoning favors weak names.

Inference: in Verus, make the choice visible by parameterizing ghost predicates with a context token (strong) or storing the token in the enclosing state-machine invariant (weak). A token parameter is ordinary specification data, not a new Verus modality. The proof obligation is to show that a token cannot be confused with another context, which can be enforced by distinct state-machine states or uniqueness facts.

## technique 4: map recurring systems problems to context-indexed modalities

Inference: use the taxonomy as a design procedure: identify the system pattern, then choose a context, element, nominalization, and context step.

Table 1 maps: address-space switching to `[r]P` over virtual points-to elements; memory fences to modalities `Delta_pi` and `Nabla_pi` over thread-local views; reference counting to `@l P` over reachable heap nodes; actors to `@i P` over another actor's state; and crash recovery to a post-crash modality with named in-memory points-to elements (Table 1, PDF p. 6).

For weak memory, define the element in a thread's address-value view and make a fence the context step. For reference counting, put reachable nodes under the root address: `@l (l1 ↦ v1 * ... * lj ↦ vj)` (Section 3.3, PDF p. 6). For actors, `@i(P)` means `P` is evaluated at the actor named by identifier `i`, so an actor's specification can refer to the state and knowledge of another actor (Sections 2.1 and 3.3, PDF pp. 2, 6). For crash safety, Perennial tracks names that determine which assertions are usable; a crash resets the names, discarding volatile-state assumptions. The post-crash modality describes what holds after RAM is discarded. Its context can be a set of executions rather than a literal data structure (Section 3.3, PDF pp. 6–7).

NextGen generalizes Post-Crash to assertions that hold after a transformation `t` of global state, subject to technical constraints not detailed here (Section 3.3 and footnote 3, PDF p. 7). StackRegion is an instance of NextGen; its elements name stack frames and its context steps are allocation and return to/from the stack (Table 1, PDF p. 6).

Inference: for verified Rust, this taxonomy suggests separate predicates and transition lemmas for page-table roots, fence-visible views, actor IDs, reference roots, and crash epochs. It does not provide ready-made Verus libraries. The implementation work is to define the state machine and prove that every executable transition updates the context consistently.

## technique 5: shallowly embed modal assertions in separation logic

Use this when the base logic is substructural, such as Iris, and modal assertions must themselves carry ownership. The paper explains that assertions can be predicates over worlds and that a pointwise lifting of the BI algebra lets modal predicates use the same separation-logic operations (Section 3.1, PDF p. 5). Modal definitions can then represent ownership used to interpret the modality as well as ownership implied by its argument (Section 3.1, PDF p. 5). This is a shallow embedding: the modal assertion is represented using the host logic's predicate and algebra machinery rather than a separate object language.

The construction starts from a type `B` carrying a BI-algebra structure. Predicate functions into `B` inherit that structure pointwise. Existing projects lift Iris's structure to predicates used as assertions within modalities, then connect the embedded logic to Iris typeclasses for interactive proofs. This describes surveyed work rather than a new implementation (Section 3.1, PDF p. 5).

Inference: a possible Verus adaptation is to encode resource ownership as ghost maps or tokens and write proof functions that compose and split those tokens under explicit conditions. This would require its own correctness argument; the survey does not establish that such an encoding reproduces Iris's algebra or proof rules.

## what is evidence, and what remains open

The evidence is the survey's correspondence between the table's modality patterns and published systems efforts in crash consistency, weak memory, virtualization, actors, reference counting, and next-generation separation logic. The paper reports no new benchmark denominator, proof count, or measured speedup. Its conclusion is a design claim: “We believe that these essential patterns in the designs of modal abstractions for systems verification constitute a fundamental concept when working out how to specify different kinds of systems code.” (Conclusion, PDF p. 7)

Inference: a new application still needs its own soundness argument and engineering assessment. The paper does not prove that every systems property has a useful context decomposition, nor that strong nominalization is always more precise. Existing projects cited in the taxonomy have their own proofs and assumptions; this survey does not re-prove them.

Inference: for agent-written verified Rust, the main threat is context confusion: a proof can establish a local points-to fact while silently using the wrong address space, snapshot, actor, or memory view. VL should adopt explicit context parameters or state-machine fields for such resources. The survey's modal vocabulary is useful for architecture and specifications, but implementing a new modal logic is outside a normal Verus application and should not be mistaken for a missing Rust annotation.

## techniques for the catalog

- transition modalities — encode a command or system transition as a relation between worlds and place the postcondition under that relation
- resource-context decomposition — separate atomic ownership facts from the address space, snapshot, actor, or execution context that gives them meaning
- nominalization choice — explicitly name contexts for cross-context proofs or inherit them implicitly for concise single-context proofs
- context-indexed taxonomy — map virtualization, fences, actors, reference counts, and crashes to dedicated context modalities and steps
- shallow modal embedding — lift separation-logic predicates pointwise so modal assertions can compose ownership and interactive proof rules
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Program logics which would like to enjoy modal propositions need to have an underlying model that allows encoding of the propositions."): read the full paper text, including references, and inspected PDF pages 5–7; checked quotations, numbers, section and page references, definitions, taxonomy, and technique descriptions; corrected the author/year tag, source link, quote location and page references, crash-resource description, unsupported embedding steps and Verus claims, and marked proposed workflows as inferences; recorded the paper's conflicting weak-memory classification; did not check cited papers, mechanizations, or the proposed Verus adaptations.
