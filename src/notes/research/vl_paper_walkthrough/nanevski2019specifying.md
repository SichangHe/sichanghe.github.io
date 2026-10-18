# Specifying concurrent programs in separation logic: morphisms and simulations
(authored by agents unless marked 🧑)
Tag: `nanevski2019specifying`, [paper](https://doi.org/10.1145/3360587)

## what the paper proves and builds

The paper extends fine-grained concurrent separation logic with resource morphisms and morphism-specific simulations. A resource is a state-transition system (STS) carried in a Hoare type; its transitions bound interference that concurrent threads may perform. A morphism reinterprets a program verified under one resource as a program under another, while a simulation invariant makes each source transition realizable in the target. The paper's summary is: “We apply morphisms and simulations to programs verified under one resource, to compositionally adapt them to operate under another resource, thus facilitating proof reuse.” (Abstract, PDF p. 1). The formalization is in Coq and builds on FCSL.

## technique 1: resource-typed concurrent specifications

what it is and when to use it

Annotate a Hoare specification with a resource `V`: `e : {P}{Q}@V`. `V` contains states and permitted atomic transitions, so parallel composition is allowed only for programs typed by the same resource. Use it to make interference explicit for lock-free code. The paper states, “Two programs can be composed in parallel (or sequentially), only if they are typed by the same resource.” (Section 1.1, PDF p. 2). The spin-lock resource `Spin` allows idle transitions for failed CAS, a `lock_tr` transition for successful acquisition, and `unlock_tr` for release (Sections 1.1–2, PDF pp. 2–7).

how to apply it

1. Define the resource state, including concrete heap components and ghost histories (Section 2).
2. Define each atomic transition with its guard and state update; `lock_tr` may fire only if the lock pointer is free and `unlock_tr` only if it is held (footnote 3, PDF p. 3; Section 2.2, PDF p. 7).
3. Give methods preconditions and postconditions over that state, and include the resource in each Hoare type (Sections 1.1 and 2.3, PDF pp. 2 and 7).
4. Compose threads only when their transition systems match (Section 1.1), then use framing and ownership rules to account for shared and private state (Section 3.1.5, PDF pp. 11-12).

Verus form

Inference: represent a resource as a Verus ghost state machine with a transition enum and invariants. Give each Rust method `requires` and `ensures` over the state-machine view, and prove atomic transitions in proof functions. Verus concurrency state machines provide the closest construct; Coq predicates, PCM operations, and FCSL's exact Hoare-type embedding do not transfer directly. A lock implementation still needs an atomic CAS contract supplied by the chosen Rust primitive or hardware model.

evidence, assumptions, limits

The paper formalizes the rules in Coq and uses the spin-lock example to illustrate that, because `lock` and `unlock` are typed by `Spin`, the concurrent environment "can't cause 'surprises', such as deallocating the pointer r while lock or unlock are executing" (Section 1.1, PDF p. 3). It does not provide runtime performance measurements or a machine-checked proof of a Rust implementation. Inference: the guarantee is only as good as the transition specification; if the specified transitions do not bound what the real environment does, the typing says nothing. The paper also notes that the claim that its actions erase to atomic read-modify-write commands (for example `trylock_act` to CAS) "we proved this only by hand" (footnote 11, PDF p. 13), because the formalism and Coq implementation do not issue proof obligations for it.

## technique 2: resource morphisms and simulations for proof reuse

what it is and when to use it

A morphism `f : V → W` maps source states and transitions into a target resource while preserving structure. A simulation `I` is a predicate on target states that guarantees the mapping can continue after every source step. The central inference rule transforms a verified program without re-verifying its body. The paper states: “An f-simulation (or simply, a simulation, when f is clear from the context) is a predicate I over W-states that acts like a loop invariant for the iterative process of morphing by f.” (Section 1.3, PDF p. 4).

how to apply it

1. Define partial state map `fΣ` from target states to source states (contravariantly) and transition map `fΔ` from a target state and source transition to a target transition (Section 1.2, PDF pp. 3–4). Definition 3.9 (PDF p. 13) adds three conditions: locality of `fΣ` (a target frame `p` is matched by a source frame `ϕ(p)`), locality of `fΔ`, and other-fixity.
2. Define a target-state predicate `I` and prove the commuting condition: for every source step from `fΣ(sw)` under `I(sw)`, `fΔ` yields a target step to `sw'` with `I(sw')` and `fΣ(sw')` equal to the source successor (Section 1.3, PDF p. 4). Definition 3.11 (PDF p. 14) adds a second clause: if `I sw` holds and the environment other-steps `sw` to `sw'` in `W`, then `I sw'` holds, `fΣ(sw')` exists, and `V` can other-step to it.
3. Lift source pre/postconditions through `fΣ`; the paper defines `f̂R(sw)` by existence of a source state related by `fΣ` that satisfies `R` (Section 1.3).
4. Apply the Morph rule. It conjoins the lifted source specification with `I` in both precondition and postcondition, yielding `morph f e : {...}@W` (Section 1.3, PDF p. 4).
5. Morphisms compose (Definition 3.10, PDF p. 14; the paper states that associativity with the identity as unit is proved in Coq). Section 4 applies one composite `ι ◦ f` with a single simulation `Sim`. Inference: stacking several layers would need one simulation per morphism, but the paper does not work out such a case.

Verus form

Inference: encode `fΣ` and `fΔ` as ghost/spec functions over state-machine states, and encode `I` as a state invariant. Prove a transition-preservation lemma with `ensures` and use it at each target transition. A Verus proof can then call a verified source method through a wrapper whose contract is the lifted pre/postcondition. The wrapper must be proof-only or execute the same body; do not mark the function being verified `external_body`. Coq's higher-order predicates and partial functions need explicit Verus encodings.

evidence, assumptions, limits

The Morph rule's soundness is proved in the paper's Coq development, and the authors provide an artifact. The result reuses a proof only when the morphism and simulation obligations hold; it does not make arbitrary APIs compatible. Simulation predicates are invariants of the morphing process; the paper says being a simulation "relies only on the resource in the program's type, and the morphism in question, not on the program's code" and contrasts this with loop invariants, "which are properties of programs" (Section 2.5, PDF p. 9).

## technique 3: derive exclusive locking by coupling transitions

what it is and when to use it

The paper derives a CSL-style exclusive lock from the basic spin-lock resource. A lock acquisition transfers a shared heap satisfying invariant `R` into the owning thread's private heap; release requires restoring `R` and returns the heap. This is useful when a generic lock proof must be adapted to a concrete ownership discipline.

how to apply it

1. Define `CSLX` with ownership status, shared/private heaps, and `open_tr`/`close_tr` transitions (Section 4, PDF p. 18).
2. Combine `Spin` and `CSLX`, coupling `lock_tr` with `open_tr` and `unlock_tr` with `close_tr` through a morphism (Section 4, PDF p. 18).
3. Redefine `Spin` with permission components `πs` and `πo` (a permission to unlock, with `lock′` and `unlock′` specs) so the resource distinguishes “unlock enabled for us” from “enabled for others”; the paper explains that the original Spin resource lacked this distinction (Section 4, PDF p. 19).
4. Prove that `Inv` = (4) ∧ (5) ∧ (6) is an invariant of the combined resource `CSL′`: (4) the histories agree with the ownership flag `α` (`ω(τs s) = (αs s = own)`), (5) the permission `πs` is 1 exactly when `αs s = own`, and (6) `τs s ⊥ω τo s`, which says that if one history ends in a lock then no other thread can have added a later entry to its own history (Section 4, PDF pp. 19–20). The critical case is that (6) is preserved by `unlock_tr ▷◁ close_tr`. Then restrict `CSL′` by `Inv` to get resource `CSL` via a sub-PCM construction (Appendix B, PDF pp. 31–33), with the generic morphism `ι : CSL′ → CSL`.
5. Define simulation `Sim s` = if `αs s = own` then `R (σs s)` else `σs s = ∅`; the paper shows it is an `(ι ◦ f)`-simulation and notes it is not an invariant (Section 4, PDF p. 20). Apply `morph (ι ◦ f)` to `lock′` and `unlock′` to derive `exlock` and `exunlock`. The paper shows the derivation only for `exunlock = morph (ι ◦ f) unlock′` and refers to the Coq code for `exlock`, which it calls similar (Section 4, PDF pp. 20–21).

The derived contracts are explicit (Section 4, PDF p. 18): `exlock` requires that we do not own the lock (`µs s` equal to the overlined `own`, the "not owned" value of `O = {own, own̄}`) and that our private heap `χs s` is empty, and ensures ownership plus `R (χs s)`; `exunlock` requires ownership plus `R (χs s)` and ensures not-owned and an empty private heap.

Verus form

Inference: use a Verus state machine with ghost ownership, permission count, and shared/private heap views. Couple transitions in one proof function and maintain coherence as a state-machine invariant. Require the unlock method to hold a ghost permission token and prove that the protected heap satisfies `R` before transfer. Verus can express the invariant and transfer contracts, but actual mutex/CAS behavior and allocator ownership must be modeled or trusted.

evidence, assumptions, limits

The paper gives a derivation outline and Coq code, including the key contradiction showing another thread could not have unlocked first. The development relies on PCM operations and on a user-supplied resource invariant `R`; the paper says that "the design of resource's permissions obviously and essentially influences how that resource composes with others" (footnote 16, PDF p. 19).

## technique 4: indexed morphism families for quiescence

what it is and when to use it

A plain morphism cannot “invent” source ghost state when a target state omits it. An indexed family supplies the missing source information as an index. The paper uses this to forget concurrent stack histories when the stack is installed privately and no unrelated thread can race: a quiescent specification says two concurrent pushes end in either `[a,b]` or `[b,a]`.

how to apply it

1. Choose an index type `X` containing omitted source information, such as a history.
2. Define `fΣ : X → Σ(W) ⇀ Σ(V)` and `fΔ` with the index, and prove indexed simulation conditions (Section 5, PDF p. 21; the conditions are listed in Appendix C, PDF pp. 33–34, and include injectivity on indices).
3. Apply `MorphX` with an initial index; its postcondition existentially chooses an ending index (Section 5, PDF p. 21).
4. For the stack, `gΣ x sPriv` builds a `Stack` state whose self history is the index `x` and whose other history is declared empty, which formalizes quiescence; the morph is applied with `x = ∅` and an always-true simulation. Erase histories in the target and use the no-gap history invariant to conclude the two possible final orders (Section 5, PDF pp. 22–23).

Verus form

Inference: make the index an explicit ghost argument to the morphism wrapper, and prove an existential postcondition for the ending ghost history. State quiescence as an invariant that excludes unrelated transitions during the scope. Verus can check the sequence reasoning and heap-layout predicate, but a real scheduler's quiescence guarantee must be specified.

evidence, assumptions, limits

The paper defines the indexed family and derives the quiescent stack contract; the Coq stack development is for the Treiber variant with minor modifications (footnote 20, PDF p. 22). Its conclusion notes, “Morphisms compose and can support different constructions and applications.” (Section 7, PDF p. 27). It insists that the `layout` predicate is precise so that `gΣ` is a function (footnote 21, PDF p. 23). No empirical denominator or timing result is reported.

## techniques for the catalog

- resource-typed concurrency — bound interference by putting allowed atomic transitions in a Hoare specification
- morphism-based proof reuse — reinterpret a verified program under a new resource through state and transition maps
- simulation invariant — preserve a commuting diagram so every source step has a target step
- coupled ownership refinement — derive exclusive locks by coupling lock transitions to heap-transfer transitions
- indexed morphism family — pass omitted ghost state as an index to express quiescent or private execution
