# Specifying concurrent programs in separation logic: morphisms and simulations
(authored by agents unless marked 🧑)
Tag: `nanevski2019specifying`, [paper](https://www.semanticscholar.org/paper/359eaababf64d01ed3a69a6be8a42eb14fb3bda8)

## what the paper proves and builds

The paper extends fine-grained concurrent separation logic with resource morphisms and morphism-specific simulations. A resource is a state-transition system (STS) carried in a Hoare type; its transitions bound interference that concurrent threads may perform. A morphism reinterprets a program verified under one resource as a program under another, while a simulation invariant makes each source transition realizable in the target. The paper's summary is: “We apply morphisms and simulations to programs verified under one resource, to compositionally adapt them to operate under another resource, thus facilitating proof reuse.” (Abstract, PDF p. 1). The formalization is in Coq and builds on FCSL.

## technique 1: resource-typed concurrent specifications

what it is and when to use it

Annotate a Hoare specification with a resource `V`: `e : {P}{Q}@V`. `V` contains states and permitted atomic transitions, so parallel composition is allowed only for programs typed by the same resource. Use it to make interference explicit for lock-free code. The paper states, “Two programs can be composed in parallel (or sequentially), only if they are typed by the same resource.” (Section 1.1, PDF p. 2). The spin-lock resource `Spin` allows idle transitions for failed CAS, a `lock_tr` transition for successful acquisition, and `unlock_tr` for release (Sections 1.1–2, PDF pp. 2–7).

how to apply it

1. Define the resource state, including concrete heap components and ghost histories (Section 2).
2. Define each atomic transition with its guard and state update; for `lock`, require the pointer be free, and for `unlock`, require it be held (Section 1.1, PDF p. 2).
3. Give methods preconditions and postconditions over that state, and include the resource in each Hoare type (Section 1.1).
4. Compose threads only when their transition systems match, then use framing and ownership rules to account for shared and private state.

Verus form

Inference: represent a resource as a Verus ghost state machine with a transition enum and invariants. Give each Rust method `requires` and `ensures` over the state-machine view, and prove atomic transitions in proof functions. Verus concurrency state machines provide the closest construct; Coq predicates, PCM operations, and FCSL's exact Hoare-type embedding do not transfer directly. A lock implementation still needs an atomic CAS contract supplied by the chosen Rust primitive or hardware model.

evidence, assumptions, limits

The paper formalizes the rules in Coq and uses the spin-lock example to show that a shared environment cannot deallocate the lock pointer while methods execute. It does not provide runtime performance measurements or a machine-checked proof of a Rust implementation. The resource abstraction assumes the transition specification accurately bounds interference.

## technique 2: resource morphisms and simulations for proof reuse

what it is and when to use it

A morphism `f : V → W` maps source states and transitions into a target resource while preserving structure. A simulation `I` is a predicate on target states that guarantees the mapping can continue after every source step. The central inference rule transforms a verified program without re-verifying its body. The paper states: “An f-simulation (or simply, a simulation, when f is clear from the context) is a predicate I over W-states that acts like a loop invariant for the iterative process of morphing by f.” (Section 1.3, PDF p. 4).

how to apply it

1. Define partial state map `fΣ` from target states to source states (contravariantly) and transition map `fΔ` from a target state and source transition to a target transition (Section 1.2, PDF pp. 3–4).
2. Define a target-state predicate `I` and prove the commuting condition: for every source step from `fΣ(sw)` under `I(sw)`, `fΔ` yields a target step to `sw'` with `I(sw')` and `fΣ(sw')` equal to the source successor (Section 1.3, PDF p. 4).
3. Lift source pre/postconditions through `fΣ`; the paper defines `f̂R(sw)` by existence of a source state related by `fΣ` that satisfies `R` (Section 1.3).
4. Apply the Morph rule. It conjoins the lifted source specification with `I` in both precondition and postcondition, yielding `morph f e : {...}@W` (Section 1.3, PDF p. 4).
5. Compose morphisms when building several layers of abstraction; each simulation must preserve the next layer's invariant.

Verus form

Inference: encode `fΣ` and `fΔ` as ghost/spec functions over state-machine states, and encode `I` as a state invariant. Prove a transition-preservation lemma with `ensures` and use it at each target transition. A Verus proof can then call a verified source method through a wrapper whose contract is the lifted pre/postcondition. The wrapper must be proof-only or execute the same body; do not mark the function being verified `external_body`. Coq's higher-order predicates and partial functions need explicit Verus encodings.

evidence, assumptions, limits

The Morph rule's soundness is proved in the paper's Coq development, and the authors provide an artifact. The result reuses a proof only when the morphism and simulation obligations hold; it does not make arbitrary APIs compatible. Simulation predicates are invariants of the morphing process, not ordinary loop invariants of the original program.

## technique 3: derive exclusive locking by coupling transitions

what it is and when to use it

The paper derives a CSL-style exclusive lock from the basic spin-lock resource. A lock acquisition transfers a shared heap satisfying invariant `R` into the owning thread's private heap; release requires restoring `R` and returns the heap. This is useful when a generic lock proof must be adapted to a concrete ownership discipline.

how to apply it

1. Define `CSLX` with ownership status, shared/private heaps, and `open_tr`/`close_tr` transitions (Section 4, PDF p. 18).
2. Combine `Spin` and `CSLX`, coupling `lock_tr` with `open_tr` and `unlock_tr` with `close_tr` through a morphism (Section 4, PDF p. 18).
3. Add permissions `πs` and `πo` so the resource distinguishes “unlock enabled for us” from “enabled for others”; the paper explains that the original Spin resource lacked this distinction (Section 4, PDF p. 19).
4. Prove coherence and exclusivity invariants, including ownership/permission agreement and non-overlapping histories (Section 4, PDF pp. 19–20).
5. Define simulation `Sim` stating that the private heap satisfies `R` when the thread owns the lock and is empty otherwise. Apply `morph (ι ◦ f)` to derive `exlock` and `exunlock` (Section 4, PDF pp. 20–21).

The derived contracts are explicit: `exlock` requires ownership and an empty private heap and ensures ownership plus `R`; `exunlock` requires ownership plus `R` and ensures an empty private heap (Section 4, PDF p. 18).

Verus form

Inference: use a Verus state machine with ghost ownership, permission count, and shared/private heap views. Couple transitions in one proof function and maintain coherence as a state-machine invariant. Require the unlock method to hold a ghost permission token and prove that the protected heap satisfies `R` before transfer. Verus can express the invariant and transfer contracts, but actual mutex/CAS behavior and allocator ownership must be modeled or trusted.

evidence, assumptions, limits

The paper gives a derivation outline and Coq code, including the key contradiction showing another thread could not have unlocked first. It assumes a precise separation-logic heap predicate and PCM operations; permission design affects composability.

## technique 4: indexed morphism families for quiescence

what it is and when to use it

A plain morphism cannot “invent” source ghost state when a target state omits it. An indexed family supplies the missing source information as an index. The paper uses this to forget concurrent stack histories when the stack is installed privately and no unrelated thread can race: a quiescent specification says two concurrent pushes end in either `[a,b]` or `[b,a]`.

how to apply it

1. Choose an index type `X` containing omitted source information, such as a history.
2. Define `fΣ : X → Σ(W) ⇀ Σ(V)` and `fΔ` with the index, and prove indexed simulation conditions (Section 5, PDF pp. 21–23).
3. Apply `MorphX` with an initial index; its postcondition existentially chooses an ending index (Section 5, PDF p. 22).
4. For the stack, pass an empty self history and an empty interfering history to encode quiescence, erase histories in the target, and use the no-gap history invariant to conclude the two possible final orders (Section 5, PDF pp. 22–23).

Verus form

Inference: make the index an explicit ghost argument to the morphism wrapper, and prove an existential postcondition for the ending ghost history. State quiescence as an invariant that excludes unrelated transitions during the scope. Verus can check the sequence reasoning and heap-layout predicate, but a real scheduler's quiescence guarantee must be specified.

evidence, assumptions, limits

The paper formalizes the indexed family and derives the quiescent stack contract. Its conclusion notes, “Morphisms compose and can support different constructions and applications.” (Section 7, PDF p. 27). It assumes a precise `layout` predicate so the source heap decomposition is unique. No empirical denominator or timing result is reported.

## trusted boundary and VL implications

The paper's trusted basis includes Coq, FCSL definitions, the operational semantics, atomic primitive models, and the correctness of each resource invariant and PCM. It proves a logic rule and examples, not a verified Rust runtime. Inference: the threat to VL is high for concurrent libraries that duplicate proofs for every wrapper or ownership policy. Morphisms offer a direct reuse pattern for Verus state machines: prove a generic lock or queue once, then add ownership, permissions, or private ghost state through a simulation wrapper. Inference: VL should not redo the mathematical morphism idea as a new contribution; the product-specific work is a sound, ergonomic Verus library and evidence that wrappers preserve the actual Rust implementation and memory model.

## techniques for the catalog

- resource-typed concurrency — bound interference by putting allowed atomic transitions in a Hoare specification
- morphism-based proof reuse — reinterpret a verified program under a new resource through state and transition maps
- simulation invariant — preserve a commuting diagram so every source step has a target step
- coupled ownership refinement — derive exclusive locks by coupling lock transitions to heap-transfer transitions
- indexed morphism family — pass omitted ghost state as an index to express quiescent or private execution

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
