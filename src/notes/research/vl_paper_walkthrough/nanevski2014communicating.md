# Communicating State Transition Systems for Fine-Grained Concurrent Resources
(authored by agents unless marked 🧑)
Tag: `nanevski2014communicating`, [paper](https://www.semanticscholar.org/paper/df0f6416cb99fe25b69c1e14a85c29dad43ef1af)

## what is proved and measured
The paper presents Fine-grained Concurrent Separation Logic (FCSL), whose resource unit is a concurroid: a communicating state-transition system (STS) with shared state, thread and environment views, internal transitions, and external ownership-transfer transitions. The abstract says the logic supports “uniform Hoare-style reasoning about partial correctness of coarse- and fine-grained concurrent programs” (abstract, p.290). The authors prove “FCSL is sound with respect to the denotational model of action trees” (Theorem 1, p.307), and formalize the model, logic, CSL construction, and examples as a shallow Coq embedding (sec.1.1, p.292; sec.5, p.307). The Coq development itself is not in the paper text (it points to online supporting material [11]). This is a logic and mechanized metatheory paper; it does not report a benchmark denominator or runtime comparison.

## technique: model a resource as a concurroid
What it is: A concurroid is `V = (L,W,τ,E)`: labels, valid subjective states, an internal transition relation, and paired acquire/release external transitions (sec.4, p.301). A state records self PCM-map, joint heap-map, and other PCM-map. The state validity condition requires matching labels, disjoint heaps, and defined PCM composition (sec.3, p.296).
When to use it: Use this for a shared resource whose legal evolution includes arbitrary fine-grained interference and ownership transfer. The resource invariant defines `W`; `τ` captures footprint-preserving updates; `E` captures adding or removing heap ownership.
How to do it: (1) choose resource labels and a PCM for subjective ownership; (2) define `W` with state validity and the resource invariant; (3) define `τ` and prove reflexivity plus footprint preservation; (4) define each acquire `α h` and release `ρ h` and prove footprint extension/reduction; (5) prove guarantee (other view unchanged) and locality (framing by environment-owned PCM data); (6) use the resulting concurroid in Hoare tuples `{p} c {q}@U` (secs.3–5, pp.296, 301–306). Example 2 makes a lock resource whose invariant relates lock bit, protected heap, and auxiliary views (sec.4, pp.302–303).
Verus form: Inference: represent the abstract state with a `struct` plus `spec fn` view and invariants; express transition relations as `spec fn`s over old/new states and prove preservation with `requires`, `ensures`, and `proof fn`s. Verus has no direct FCSL concurroid or subjective assertion notation, so ownership-transfer permissions need ghost state or Verus state-machine constructs; executable lock code remains ordinary Rust.
Evidence: The paper states “A concurroid is a 4-tuple V = (L, W, τ, E)” (sec.4, p.301), and Lemma 1 states that `U ⋊ V` is a concurroid (p.304); the paper text gives no proof of it, deferring to the supporting material [11].
Limits: Internal transitions cannot add or remove pointers; external transitions must handle that (sec.4, p.302). The paper does not provide a cost study, and the Coq implementation correspondence to displayed rules is “established by hand” (sec.5, p.307).

## technique: subjectivity and PCM views
What it is: Each resource state has self and other views in a partial commutative monoid. The PCM operation combines thread contributions, and undefined combinations reject impossible ownership, such as two simultaneous lock owners (sec.2, pp.293–294).
When to use it: Use subjective views when parallel threads need compositional specifications that track each thread’s contribution while abstracting the environment.
How to do it: (1) define a PCM with commutative, associative, partial `•` and unit; (2) put self and other PCM values in every state; (3) define the invariant relating their `•` combination to concrete heap; (4) split self values when forking and recombine them on join; (5) use subjective separating conjunction `*s` in the PAR rule. For the increment example, addition is the PCM and `lock ↦ (−,aS)` records the self contribution; two calls compose to `i+j` using the equivalence in equation (5) (sec.3, pp.296–297).
Verus form: Inference: define a ghost monoid carrier and operation, then prove associativity, commutativity, unit, and definedness lemmas. Use ghost fields for self/environment contributions and `assert`/`reveal` in proof functions. Rust ownership is executable ownership and does not by itself encode FCSL’s environment view.
Evidence: “A PCM is a set with a commutative and associative operation • with a unit element” (sec.2, p.294). The paper’s concurrent `incr(i) || incr(j)` proof derives the final contribution `i + j` (sec.3, pp.296–297).
Limits: the paper does not describe an automated method for choosing a PCM or for discharging stability proofs. Inference: these obligations fall on the verifier.

## technique: entanglement and communication
What it is: External transitions are dangling input/output wires. Entanglement `U ⋊ V` (the paper's asymmetric entanglement operator; `⋈` denotes interconnection of two transitions) composes resources by synchronizing opposite acquire/release transitions, allowing heaps to move directly between components (sec.1.1, p.292; sec.4, pp.303–304).
When to use it: Use it to build a system from independently specified resources, or to coerce a command verified for `U` into a larger context `U ⋊ V`.
How to do it: (1) define each component’s external transitions; (2) form disjoint label and heap state union; (3) define interconnected internal transitions, including `αU h ⋈ ρV h` and the converse `αV h ⋈ ρU h`; (4) keep the chosen component’s external transitions open; (5) apply INJECT with a frame stable under `V`. The paper’s lock/private-state composition transfers protected `x` between lock and private resources (secs.2, 4, pp.295, 303).
Verus form: Inference: model each component as a Verus state machine or ghost transition relation and prove a composition lemma that synchronizes ownership tokens. There is no direct `inject` command; use a proof-level refinement lemma and ghost token transfer.
Evidence: “Communication and entanglement endow FCSL with the compositionality of CSL” (sec.1.1, p.292). Lemma 2 (stated without proof in the paper text) gives the exchange law `(U ⋊ V) ⋊ W = (U ⋊ W) ⋊ V` (sec.4, p.304).
Limits: The operator is asymmetric and non-associative in general; external transitions of one side are kept open (sec.4, p.303). This choice must match the intended allocation protocol.

## technique: injection, hiding, and stability
What it is: INJECT embeds `{p} c {q}@U` into `{p * r} inject c {q * r}@U ⋊ V` when `r` is stable under `V`; HIDE locally installs a resource and makes its state appear as private heap to the environment (sec.3, pp.298–301).
When to use it: Use injection for framing an independently verified command with another resource. Use hiding for scoped allocation/deallocation of a lock or resource.
How to do it: (1) prove the command under its small concurroid; (2) choose a frame over disjoint labels; (3) prove the frame stable under environment transitions; (4) inject and retain the frame. For hiding, define `Φ(g)` mapping an abstract state to concrete resource states, choose initial `g`, prove fixed other views, run the body, then existentially hide the final `g`. Their example hides a lock around `incr(n)`, starting private `x=0` and ending private `x=n` (sec.3, pp.299–301).
Verus form: Inference: use a ghost wrapper invariant and a lemma proving that environment transitions preserve the framed predicate; encode scoped resources with a state-machine token whose creation and destruction are proved. No Verus construct directly implements FCSL’s `hideΦ,g`.
Evidence: “The burden of stability proofs is further reduced in FCSL by formulating private heaps as a separate concurroid” (sec.6, p.308). The lock-hiding proof outline is given on pp.300–301.
Limits: HIDE requires semantic side conditions on `Φ`, especially a fixed other view; the paper calls it “the most important” of the semantic properties on which HIDE's soundness depends (p.301), and says the omitted side condition “is essential for the existence of entanglement” (p.299). It does not address linearizability, leaving that as future work (sec.6, p.308).

## technique: action-level atomic specifications
What it is: An action is `(U,A,σ,μ)`, naming a concurroid, return type, enabled-state predicate, and relation from initial state to final state/result (sec.5, pp.306–307).
When to use it: Use actions to connect a concrete atomic read, write, CAS, or read-modify-write operation with logical ownership and auxiliary-state changes.
How to do it: define `σ` and `μ` in large-footprint form; prove precondition strengthens `σ`, postcondition follows from `μ`, and both are stable under `U`; invoke the ACTION rule. The release example transfers `x` from private ownership into the lock while operationally mutating only `lk` (sec.5, pp.306–307).
Verus form: Inference: write a spec relation over pre/post ghost states and prove the Rust atomic operation’s contract against it; use `old(...)` in postconditions and atomicity lemmas. The relation is a proof model, not executable code.
Evidence: “If the logical information is erased ... an action implements a single atomic memory operation” (sec.5, p.306).
Limits: the paper says how an action manipulates the logical state “is up to the user”, who must adhere to the formal definition of actions (p.306). Inference: whether a chosen `σ` and `μ` match the real atomic operation is the user's modeling responsibility, not something the theorem checks.

## techniques for the catalog
- concurroid resource modeling — define labels, valid subjective states, internal transitions, and external ownership-transfer transitions
- PCM subjectivity — split and recombine self/environment ownership views with a partial commutative monoid
- communicating entanglement — compose resource STSs by synchronizing dangling transitions and transferring heaps
- stable injection — frame independently verified commands into larger concurroid contexts
- scoped hiding — install a resource locally and expose its evolution as private state
- action contracts — specify atomic operations with enabled-state predicates and pre/post state relations
