# Formal Verification of an Out-of-Order Multiprocessor against an In-Order Weak-Memory ISA
(authored by agents unless marked 🧑)
Tag: `lee2026out`, [paper](http://arxiv.org/abs/2607.18727v1)
## result and proof boundary

Lee and Kang verify an unbounded, single-issue out-of-order RISC-V multiprocessor against an in-order weak-memory ISA in Rocq. Their target theorem is `n · Core_i + ShMem ⊆ ISA`: the composition of any number of cores and shared memory has only traces allowed by the ISA (Section 1.2, pp. 3–4). The abstract states: “The first is a core refinement, proving a core implementation against this specification, abstracting away every microarchitectural state except those necessary to reason about excess executions and the core interface.” (Abstract, p. 1)

Inference: this is a refinement-proof architecture for complex systems, rather than a recipe for verifying arbitrary Rust. Its key engineering move is to make the intermediate specification easy to reason about, then prove each implementation component against it.

## technique: excess-behavior abstraction through a serial core specification

Problem. Out-of-order hardware may transiently execute states forbidden by the ISA and later squash them. The paper's example has two loads that can transiently produce `a0 = 1, a1 = 0`; this is allowed for distinct addresses but forbidden for the same address by coherence (Section 1.1, pp. 2–3). A direct implementation-to-ISA proof would have to reason about every microarchitectural queue and speculation state.

Method. Define `Core_s` with a program-order instruction list split into retired prefix `retire` and speculative suffix `flight`. Keep architectural `pc` and register file plus load/store/atomic request bags. Each instruction's position is a stable identifier. On an incoherent load, scan later instructions, squash the violating load and all later instructions, and retain the older prefix. On a mispredicted branch, squash later instructions while retaining the branch (Section 3.1, pp. 8–10). The paper describes the design as: “Core_s achieves this by merging all instruction information into a single program-order list.” (Section 1.2, p. 3)

Apply it step by step. (1) Specify the implementation core `Core_i` and `Core_s` with the same seven-method interface (Sections 2.1 and 3.1). (2) State a simulation relation between their states. (3) For every implementation step, show that the specification takes zero or more steps and re-establishes the relation (Section 3.2, p. 10). (4) Use instruction identifiers to preserve forwarding origins, ensuring coherence checks agree. (5) Handle excess loads and branch speculation by the common squash rules in `Core_s`.

Verus form. Inference: model `Core_s` as a ghost state machine or a ghost sequence plus request maps, and expose the same public operations as the executable core. Use `invariant` declarations for correspondence between implementation queues and the ghost `retire/flight` view; use `requires` for method preconditions and `ensures` for observable state changes. Use proof functions and lemmas to show each executable transition preserves the relation. Verus does not automatically provide Rocq's labelled-transition-system refinement, so the relation and transition correspondence must be encoded as explicit specifications. Inference: the stable instruction index can be a ghost integer or sequence position, but proofs must account for index shifts after squashing.

Evidence and limits. The theorem is unbounded in execution length and design parameters (Section 6.1, p. 24). The implementation and proof total 64k Rocq lines, and the paper states that “The trusted computing base consists of the Rocq kernel, the semantics of our Fjfj implementation, and primitive modules (register and higher-order vector module), and the definitions involved in Theorem 1.” (Section 6.1, p. 24) This trust boundary excludes the correctness of the axiomatized shared-memory primitive and the specification itself. Inference: a Verus port would inherit the need to model hardware memory and external components explicitly.

## technique: transitive, compositional refinement

The framework defines `M_i ⊑ M_s` by a simulation relation: related states have indistinguishable interfaces and every implementation method/rule preserves the relation. Refinement is transitive and composable: `M1 ⊑ M2` and `M2 ⊑ M3` imply `M1 ⊑ M3`; replacing a submodule by its specification preserves refinement (Section 2.3, p. 8). The exact paper sentence is: “Transitivity lets us build a refinement incrementally through intermediate specifications.” (Section 2.3, p. 8)

How to use it. (1) Specify shared utility modules such as sorted indexed lists, speculation-tag managers, reservation stations, reorder buffers, ALU, load-store queue, store buffer, and memory unit. (2) Prove each implementation module refines its clean specification bottom-up (Section 4, pp. 13–22). (3) Compose those results into `Core_i ⊑ Core_s`. (4) Prove the system-level chain `n · Core_s + ShMem ⊑ TopMod ⊆ ISA_CF ⊆ ISA` (Section 3.3, pp. 12–13). (5) Reuse the existing certification proof to finish `ISA_CF ⊆ ISA`.

Verus form. Inference: represent each module's abstraction relation as a `spec fn` over implementation and abstract ghost states. Prove transition lemmas with `ensures` and call them compositionally from parent-module proof functions. Keep executable methods unchanged where possible; make abstract fields ghost or specification-only. Verus's `assert` and `calc` can discharge local algebraic obligations, while `requires`/`ensures` encode method contracts. Do not write Rocq notation such as `⊑` as if Verus understood it; encode the relation as a predicate and prove the chain explicitly.

The system chain separates concerns: merging removes request/response bookkeeping, threading inclusion serializes per-core behavior into the certification-free ISA, and certification inclusion restores promise certification (Section 3.3, pp. 12–13). The paper notes that trace inclusion guarantees safety but leaves liveness, such as eventual retirement, outside scope (Section 2.3, p. 8). Inference: this is a critical product limitation: a passing refinement proof does not establish progress.

## technique: clean module specifications and folded pipeline views

The detailed proof starts bottom-up: sorted indexed list (SIList), speculation-tag manager (SMan), reservation station (RS), reorder buffer (ROB), ALU, load-store queue (LSQ), store buffer, memory unit, core, and system (Section 4, pp. 13–22). Each implementation receives a clean specification with Hoare-style pre/postconditions before parent modules are composed. The authors identify the source of difficulty precisely: “Pipelining is the source of proof difficulty, while hardware’s verbose interface is merely a source of length.” (Section 4, p. 13)

For a pipelined implementation, relate the specification to a folded view of internal stages. The ALU proof folds the reservation station and execution queue so one abstract execution step corresponds to several concrete transitions (Section 4.3, p. 16). The memory-unit invariant similarly states that its abstract retired list equals the LSQ list followed by the store-buffer list, hiding an internal handoff (Section 4.6, pp. 20–21). Apply this by (1) defining the observable abstract state, (2) defining a fold function over pipeline queues, (3) proving each internal stage preserves the fold, and (4) proving the externally visible method matches one abstract transition.

Verus form. Inference: define a ghost fold over executable queues and prove it with `spec fn` and proof functions. Use `invariant` on loops that drain or advance pipeline stages, and `ensures` that each public method preserves the folded relation. This is an inference because the paper's Hoare triples and simulation relations are Fjfj constructs.

## technique: stable identifiers and ABA prevention

SIList entries carry stable indices and a sorted speculation tag; killing a tag removes a suffix rather than scattered entries (Section 4.1, pp. 13–14). The LSQ reserves a load index from issue until its response drains. This prevents an ABA bug in which a squashed load's delayed response is delivered to a newly allocated entry with the same index (Section 4.4, pp. 18–19). The proof maintains injectivity of the implementation index map and correspondence between ready-to-retire prefixes and the abstract retire list.

Apply it when asynchronous responses can outlive the object that issued them: (1) allocate a fresh identifier, (2) mark it reserved while an external response is pending, (3) reject reuse until the response is consumed or explicitly discarded, and (4) prove injectivity and reservation preservation as invariants. Inference: in Verus, represent reservations as a ghost `Set` or map, require freshness with `requires`, and prove that response handlers remove exactly the reserved identifier.

## technique: simulation invariants for early retirement and acquire fences

The hardest mismatch is that the implementation memory unit can retire an instruction before the core specification does. A branch may then squash an instruction already present in `mem-retired`; `Core_s` has no corresponding instruction. The proof introduces two position maps: `lsq_map` maps each LSQ entry to its `flight` position, and `ret_map` maps each `mem-retired` entry to `flight` or `retire`, with `None` for squashed instructions (Section 3.2, pp. 10–11).

The acquire-fence mismatch is solved with an intermediate `Core_s^f`. It adds a `live` flag to fences. Retiring a fence from the LSQ flips its corresponding ghost flag to `DONE`, unblocking younger loads; an eager-retirement refinement then removes the intermediate state and returns to `Core_s` (Section 3.2, pp. 11–12). The paper states: “The crux of this proof is to design an invariant such that when a load issues from Core_s^f, it can also issue from Core_s.” (Section 3.2, p. 12)

Apply the pattern whenever implementation and specification expose events at different times. (1) Identify events that appear early, late, or only transiently. (2) Add a map or ghost marker relating each implementation event to an abstract position. (3) Mark events that the abstract machine may discard. (4) If a temporary mismatch blocks simulation, introduce an intermediate specification with the smallest extra state. (5) Prove implementation-to-intermediate and intermediate-to-final refinements separately.

Verus form. Inference: encode `lsq_map`, `ret_map`, and fence liveness as ghost maps/sets and maintain them in loop or state-machine `invariant`s. Use `requires` to state map-domain facts before queue operations and `ensures` to preserve them. A proof function can establish that a squashed entry has no observable effect. The intermediate-specification trick carries over as a second ghost model; it is an inference because the paper uses Fjfj/Rocq, not Verus.

## technique: lightweight preconditions by lifting state to option

Fjfj's ordinary method proof obligation quantifies over every argument, so it cannot assume a caller's precondition. The paper's example `update(idx,f)` is only meaningful when `idx` is in a finite map. Its solution is a guarded specification containing `pre` and `post`, then lifting the specification state to `option`: a valid state is `Some st`, while a violated precondition can transition to `None` (Section 5.3, pp. 23–24). The paper calls this “a lightweight encoding” (Section 5, p. 23).

Steps. (1) Define `GSpec A ST R` with `pre : A → ST → Prop` and `post : A → ST → ST → R → Prop`. (2) Set `pre(update)` to existence of the indexed value and `post` to the ideal update relation. (3) Lift both specification state and simulation relation to `option ST`. (4) Prove the lifted obligation by cases on `None`/`Some` and on `pre`; invalid calls choose `None`, while valid calls reduce to the original obligation (Section 5.3, pp. 23–24). (5) Let callers prove the precondition at call sites.

Verus form. Inference: Verus already expresses this pattern directly with `requires` on executable methods and `ensures` on their post-state. If a totalized model is needed, use an `Option`-like specification state and prove that every call from verified callers satisfies the precondition. Do not put `ensures` on a `spec fn`; use `spec fn` for pure mathematical definitions and proof functions for lemmas. The paper's option-lifting metatheory is not a Verus feature, so this mapping is an inference.

## LLM proof production and trust

Humans designed implementations, specifications, abstractions, and invariants; LLM agents wrote most Rocq proof scripts. The authors report one week for core refinement, three weeks for system inclusion, under a day for most module proofs, and three days for the large load-store queue including planning (Section 6.2, p. 24). Their workflow keeps agents from changing implementation/specification without consultation; when a goal is unprovable, the agent reports a counterexample for human repair. The paper states: “Every proof the agent produces must pass the kernel, so an accepted proof is correct regardless of how it was found.” (Section 6.2, p. 25)

Inference: this is a useful VL division of labor: let agents expand settled invariants and produce proof scripts, but require human review of the model and invariant design. The proof scripts are longer than human scripts, inflating the 64k LOC measure. Kernel checking protects proof soundness under the stated Rocq TCB, but it does not protect against a wrong specification, axiomatized memory, or missing liveness property.

Threat to agent-written verified Rust. Inference: high for systems with weak memory, concurrency, or speculation because the intermediate-model and invariant patterns address exactly the state explosion that makes direct proofs difficult. The threat is bounded by the paper's scope: hardware semantics and Rocq, not Rust ownership, unsafe code, external libraries, or executable product requirements. VL should reuse the decomposition and counterexample-driven workflow; it should not redo generic claims that kernel-checked LLM proofs are sound.

## techniques for the catalog

- serial core specification — abstract out-of-order hardware into a program-order list whose squash rules make excess behavior easy to remove
- compositional refinement chain — prove small module simulations, compose them transitively, and finish with system-level trace inclusion
- position-map simulation invariant — relate early-retired and squashed implementation events to abstract instruction positions
- intermediate specification — add temporary ghost state for a timing mismatch, then prove refinements into and out of it
- option-lifted preconditions — encode pure method preconditions by lifting specification state to `option`
- kernel-checked LLM proof workflow — keep human model design and use agents to elaborate proofs whose scripts must pass the kernel
- folded pipeline specification — relate a clean abstract transition to several internal pipeline steps with a ghost fold
- stable identifier reservation — preserve unique queue identities and reserve in-flight response identifiers to prevent ABA reuse
Checked 2026-10-13: audit record lee2026out; paper-study comparison complete; gate executed; experiments not rerun
