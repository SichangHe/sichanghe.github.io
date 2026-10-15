# Refinement Proofs in Rust Using Ghost Locks
(authored by agents unless marked 🧑)
Tag: `bila2023refinement`, [paper](http://arxiv.org/abs/2311.14452v1)

## result
The paper gives a bottom-up refinement method: embed an abstract transition system as erased ghost state alongside an existing Rust implementation, then prove each concrete I/O step corresponds to an abstract transition. It supports arbitrary program structure, distributed and multithreaded code, safety, and liveness. The central device is a ghost lock. The authors state: “The implementation then interacts with this model using a ghost lock, which allows the program to acquire a view of the abstract state and to later release it, indicating which transition took place if the state was modified.” (Approach, PDF p. 2.)

A ghost lock is proof-only and never synchronizes executable threads. Each critical section is treated as one atomic model step and must be linearizable. Guards restrict which node can take which transition and preserve local knowledge across environment steps. Liveness is expressed as deeply embedded LTL formulas tied to obligations that must eventually be discharged. The implementation is in Prusti for Rust.

## technique 1: embed a transition model and ghost lock
Define an abstract state containing global data and the environment, an action type, and a transition predicate that says whether an action legally relates a pre-state to a post-state. Initialize one shared ghost lock with that state. Give each thread a handle. A thread acquires the lock, accesses the model through `state()`, performs executable operations whose contracts update the model, and releases with the action label or `release_stutter`.

Inference: I expanded the paper’s interface into this checklist; the paper does not label these as numbered steps. The critical steps are: (1) prove `acquire` grants exclusive model access; (2) require all I/O methods to receive an acquired lock; (3) specify each I/O method's abstract state update; (4) annotate release with the intended action; (5) prove the resulting state pair satisfies the transition predicate. After release, model state is havocked on re-acquisition, so only stable invariants may be carried across environment steps. The paper's interface includes `acquire`, `release(action)`, `release_stutter`, `locked`, and `state` (Section 2.3, pp. 6–7).

Evidence: Memcached, a producer/consumer queue, Paxos, and a lock-free hash set are verified case studies. Figure 3 reports, for example, Memcached v1 at 117 implementation lines, 225 model lines, 286 specification/ghost lines, and 334.7 seconds verification time; these are 10%-Winsorised means over 10 Prusti runs on an Intel i9-10885H with 16 GiB RAM (Figure 3, p. 16). Inference: Verus can model the abstract state with a `spec fn` transition predicate and ghost state, then use `requires`/`ensures` and proof functions to show each concrete operation refines one action. Verus proof code is erased, but its transition-system API and concurrency semantics must be modeled explicitly.

## technique 2: guards for interference and local knowledge
A node cannot assume every other node is equally able to change the model. A guard is an affine permission owned by one node or the environment; owning it rules out transitions that require another guard. Define an enum of guard kinds and a `guard_needed(action, guard)` predicate. Create all guards once in a dispenser and ensure each is dispensed once. Inside a ghost-lock section, call `guard.open` with a predicate that should remain true while the guard blocks interfering actions.

The paper's example gives NodeA the guard required for `ASend` and `ARecv`, NodeB the guard for `BSend` and `BRecv`, and the environment the guard for losses (Section 2.4, p. 8). If NodeA owns its guard and knows `a_ctr == ctr`, it may open that predicate, send `ctr`, and release `ASend`; induction shows the equality remains valid when it reacquires the lock. Guards can be combined when an action requires a disjunction or multiple guard kinds.

Inference: in Verus, represent a guard as a linear ghost token (often a proof-oriented type), and make action lemmas require that token. A `spec fn` can define `guard_needed`; proof functions can show that owning a token preserves a predicate across allowed transitions. The token must not become a runtime synchronization mechanism.

## technique 3: LTL and obligations for liveness
Safety checks one transition at a time; liveness concerns infinite traces. Deeply embed an LTL fragment with `always`, `eventually`, conjunction, implication, state predicates, action predicates, and value quantifiers. Examples in the paper are `always eventually ASend`, `always eventually (exists r. BSend(r))`, and “every number will eventually be requested and responded to” (Section 3.1, p. 11).

Associate each formula with an obligation, an abstract linear resource that must eventually be discharged. Give every obligation a termination measure in a well-founded set; each method call or loop iteration holding it must decrease the measure, which prevents indefinite delay. An acquire postcondition creates a ghost-lock-release obligation, and `release` consumes it. Proof rules split conjunctions and quantified obligations, strengthen formulas, and discharge a formula when its current trace index satisfies it (Figure 2, p. 12).

Inference: Verus does not automatically prove infinite traces from ordinary `ensures`. Encode the transition system and an explicit ghost obligation/measure in a proof-oriented API; use `decreases` clauses or equivalent well-founded ranking lemmas where supported, and state the liveness theorem as a separate proof function. The paper's LTL deep embedding is not a built-in Verus construct.

## technique 4: fairness assumptions
Some liveness claims require a non-faulty network. The paper assumes strong fairness: a message repeatedly sent is eventually delivered. It represents this as formulas of the form `◇□(channel length = 0) ∨ □◇receive` and supplies these assumptions to network-I/O specifications (Section 3.4, p. 15). Without fairness, a channel that always drops messages can satisfy local sending while global progress fails.

Apply it by making every environment assumption explicit in the model, attaching it to the I/O contract, and using it only in liveness proof steps. The Memcached liveness proof additionally assumes eventual client connections and commands and ignores error handling (Section 5.1, p. 18). Inference: Verus should encode fairness as a ghost premise or transition-system assumption, never as an unproved executable postcondition; the product must report such assumptions as trusted scope.

## technique 5: verified unsafe interior mutability
The producer/consumer queue uses atomics for head and tail but stores elements in `UnsafeCell`. The authors introduce `VerifiedCell<T>` and prove that non-atomic accesses are safe when a happens-before predicate relates operation identifiers. Each atomic or non-atomic access gets an abstract identifier; the accessor requires happens-before between subsequent accesses (Section 5.2, pp. 18–19).

The two verified variants use sequentially consistent and acquire-release atomics. The latter requires more annotations because the abstract model stores a set of write identifiers for each atomic. Figure 3 reports 125 implementation, 169 model, 247 proof lines and 392.8 seconds for SeqCst; acquire-release has 428 proof lines and 654.5 seconds. Inference: Verus can encode operation identifiers, an abstract happens-before relation, and `requires`/`ensures` on a safe wrapper around `UnsafeCell`; the memory-ordering axioms remain part of the trusted model unless the backend proves them.

## what is proved, measured, and trusted
The method proves refinement of the concrete program to the abstract transition model, plus safety and (under assumptions) liveness. It does not prove that the abstract model captures the intended product, that network fairness holds in deployment, or that ignored errors are harmless. The paper says ghost locks “cannot be used for synchronisation” (Section 2.3, p. 6), so executable linearizability is a required premise. It also assumes the execution environment and scheduler behave correctly (Section 3.4, p. 15).

Inference: for VL, ghost-lock refinement is a direct pattern for agent-written verified Rust: keep the implementation structure, add an abstract model and contracts at I/O boundaries, and make every action explicit. The threat is that an agent can satisfy a permissive transition model while the concrete protocol is wrong, or silently rely on fairness and scheduler assumptions. Existing VL work should reuse this model/implementation separation and obligation discipline; it should not re-prove ordinary Rust ownership as a distributed protocol theorem.

## techniques for the catalog
- ghost-lock refinement — embed an abstract transition system and label each erased critical section with a legal action
- guard permissions — use affine per-node tokens to restrict interference and preserve local facts
- LTL obligations — connect temporal formulas to linear obligations and well-founded discharge measures
- fairness assumptions — state eventual-delivery premises explicitly in network contracts
- verified interior mutability — prove `UnsafeCell` accesses safe through abstract operation identifiers and happens-before

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
