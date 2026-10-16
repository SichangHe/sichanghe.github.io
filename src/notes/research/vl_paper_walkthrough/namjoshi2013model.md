# Model Checking in Bits and Pieces
(authored by agents unless marked 🧑)
Tag: `namjoshi2013model`, [paper](http://arxiv.org/abs/1309.5151v1)

## central idea

Namjoshi addresses state explosion in concurrent model checking by computing an inductive invariant one process at a time. The invariant is a conjunction of local pieces, each mentioning one process and its neighboring shared state. The abstract states: “We show that this strategy leads to the notion of a ‘split’ invariant, an assertion which is globally inductive, while being structured as the conjunction of a number of local, per-component invariants.” (abstract, p. 404)

The running example is a Dining Philosophers protocol on an arbitrary graph. A node has local state `T` (thinking), `H` (hungry), `E` (eating), or `R` (release); each edge is a fork whose value is one endpoint or `⊥`. The safety property is that adjacent nodes never eat simultaneously. The paper’s techniques are model-checking and invariant-generation methods, not deductive proofs of a particular Rust implementation.

## technique 1: split invariants and local proof obligations

A process network is a graph of nodes and shared-state edges. Process `Pi` may access internal variables and only edge variables in its neighborhood. The global transition relation is an asynchronous disjunction of process transitions. A split assertion is `θ = ∧i θi`, where `θi` depends only on process `Pi`’s local variables and neighboring edges.

To check a candidate split invariant, use three obligations for each component `i`: initial states imply `θi`; a transition of `Pi` from the complete split assertion preserves `θi`; and every process `Pj` that points to `i` preserves `θi` when starting from `θi ∧ θj`. The paper writes the key condition as: “In the last constraint, nodes j which do not point to i are not considered, as any action in T j must leave the state of Vi unchanged since there are no variables in common.” (section 2.3, p. 408)

How to apply it. Build each local state space `Vi`; initialize `θi` to the empty set (the strongest exclusion) and repeatedly compute `Fi(θ)`, the disjunction of initial, local-step, and neighbor-interference predecessors. Iterate all components until `θ` stops changing. The result is globally inductive because the conjunction is closed under every asynchronous transition. For Dining Philosophers, this local calculation verifies exclusion for 3000 philosophers in about one second; the paper contrasts this with SPIN running out of space at approximately 10 philosophers (section 2, p. 405).

Evidence and limits. The fixpoint is polynomial in the number `N` of processes; the rough bound reported is `O(N^2 * L^3 * D)`, where `L` is local state-space size and `D` is maximum network degree (section 2.3, p. 409). The method can be incomplete: a property may have no sufficiently strong split invariant over the chosen variables.

Inference: In Verus, make `θi` a `spec fn` predicate over a process’s ghost state and adjacent shared state. A transition `proof fn` can require the global conjunction of local predicates and ensure the affected `θi`; separate lemmas handle neighboring interference. A Rust loop can carry the resulting facts with an `invariant` clause, but the paper’s fixpoint computation would be an external generator, not a Verus feature. This is an inference.

## technique 2: auxiliary-state discovery when split invariance is too weak

The paper gives a concrete incompleteness example: a shared Boolean `x` and processes that atomically test-and-set `x` before entering `E`, then set `x` true on exit. The strongest split fixpoint has `θi = true` for every process, which cannot prove mutual exclusion. Add an auxiliary global variable `last` recording the process that most recently entered `E`. Recompute the fixpoint; the component becomes `θi = (Ei ⇒ (¬x ∧ last = i))`, which proves two distinct processes cannot both be eating because `last` cannot equal both identifiers.

How to apply it. When a counterexample shows that local pieces permit an unsafe global combination, identify history information that must agree across components. Promote that information to shared auxiliary state, constrain each process transition to update it atomically, and rerun the split fixpoint. Namjoshi reports a heuristic that analyzes counterexamples and exposes an aspect of internal process state as an auxiliary global predicate. For finite-state processes the heuristic is complete in the worst case, but may expose the entire internal state and thereby reduce to global reachability (section 2.4, p. 410).

Inference: For Verus, introduce a ghost owner/token field and prove that each process transition updates it consistently. The safety lemma can then use equality of the ghost owner to rule out two owners. The auxiliary field must be part of the verified transition relation; adding an unconstrained ghost variable after the fact proves nothing. This is an inference.

## technique 3: simultaneous least-fixpoint computation

The local constraints can be expressed as `Fi(θ) ⇒ θi`, where `Fi` is monotone in the vector of component predicates. Knaster-Tarski therefore gives a least fixpoint, which is the strongest compositional invariant for the chosen decomposition. The paper states: “By the Knaster-Tarski theorem, there is a least fixpoint, which defines the strongest compositional invariant.” (section 2.3, p. 409)

To compute it, initialize every `new_theta[i]` to the empty set; assign `theta := new_theta`; compute all `new_theta[i] := F(i, theta)`; repeat until the vectors are equal (Figure 3, p. 409). Components can be computed in parallel because each iteration uses the previous vector. The paper’s asymptotic bound and 3000-node result are for this synchronous iteration, not for a solver with a hidden denominator.

Inference: A VL proof generator could use the same monotone iteration to propose local Verus predicates, then emit proof lemmas for each transition obligation. The generated predicates are candidates, not evidence; Verus still checks each `requires`/`ensures` relation and each loop `invariant`. This is an inference.

## technique 4: local symmetry and balance

Global symmetry reduction is ineffective for many regular networks because only linear savings remain. Split invariants depend on neighborhoods, so the paper replaces global groups with a network groupoid: a local symmetry is a neighborhood isomorphism `(m, β, n)` preserving edge directions. Local symmetries compose and invert, but merely having isomorphic neighborhoods is insufficient because neighboring invariants may differ.

The stronger relation is a balance relation, a sub-groupoid closed recursively over pointed-to neighbors and agreeing on shared edge mappings. The paper’s theorem says: “If (m, β , n) is in a balance relation, then [θn ≡ hβ iθm ].” (Theorem 2, section 3, p. 411) Thus balanced nodes have isomorphic strongest local invariants. Compute the fixpoint only for representatives of local-symmetry classes. On a ring, one component suffices instead of `N`, making the calculation independent of ring size (section 3, p. 412).

Inference: In Verus, symmetry can reduce generated proof obligations by proving one parameterized lemma and instantiating it under an index-renaming function. The renaming must preserve adjacency and shared-state ownership; Rust types do not provide this automatically. This is an inference.

## technique 5: local abstraction for irregular networks

Local symmetry cannot relate nodes with different degrees. Namjoshi defines for each node `m` an abstract domain `Dm` and total abstraction `αm` from concrete local states to abstract states, with concretization `γm`. The abstract initial set is `αm(Im)`. The abstract transition exists when some concrete transition maps representatives of abstract states; neighbor interference is existentially abstracted using both the local and neighbor abstractions.

For Dining Philosophers, choose predicate `A` meaning “the node owns all forks.” The abstract state is `(l, a)`, with local control state `l ∈ {T,H,E,R}` and Boolean `a`. The computed abstract invariant implies `E ⇒ A`; concretizing it says an eating node owns all adjacent forks, so neighboring nodes cannot both eat because they would both own the shared fork. The paper notes that all interference transitions are self-loops for this abstraction because a neighbor cannot make a node acquire or release a fork it owns (section 4, pp. 412–413).

The method also yields a parametric result. The paper states: “For a parameterized family of process networks, any compositional invariant of the form (∀i : θi ), where each θi is local to process Pi , can be established by compositional reasoning over a small abstract network.” (Theorem 3, section 4, p. 413) The theorem is complete only after a suitable abstraction is chosen; choosing that abstraction is not automatic.

Inference: In Verus, an abstraction can be a `spec fn` from concrete ghost state to a small enum or Boolean, with a lemma that every concrete transition is simulated by an abstract transition. Prove the safety property on the abstract state and a refinement lemma back to concrete ownership. This is an inference.

## what is proved, measured, and trusted

The paper proves mathematically that the split and assume-guarantee constraints imply inductive invariance, that balance preserves isomorphism of strongest local invariants, and that suitable local abstraction establishes parameterized local invariants. Its empirical evidence is the reported 3000-node ring calculation in about one second, the rough polynomial bound, and the contrast with SPIN’s approximately 10-philosopher limit. No source-code benchmark corpus, machine specification, or success denominator is given. The transition relation, chosen auxiliary variables, abstraction functions, and fixpoint implementation remain trusted inputs to the method.

Inference: The product risk for agent-written verified Rust is moderate for local safety properties: split invariants can reduce proof search, but a poorly chosen decomposition or abstraction can miss a global invariant. The key engineering safeguard is to make each generated local predicate and its interference obligations explicit and machine-checked, then retain a counterexample path when the fixpoint is too weak. This is an inference.

## what VL should not redo

The paper already supplies the foundational split-fixpoint algorithm, auxiliary-state counterexample heuristic, local-symmetry/balance reduction, and local-abstraction route to parametric invariants. VL should not present per-thread checking as a new method without the neighbor-interference conditions. A useful new study would test these ideas on a real Verus state machine with ownership permissions and measure proof obligations before and after abstraction.

## techniques for the catalog

- split invariants — conjoin per-process predicates and check only local and pointing-neighbor transitions
- auxiliary-state strengthening — expose history predicates such as the last owner when local pieces are too weak
- least-fixpoint generation — iterate monotone component transformers to obtain the strongest compositional invariant
- balance-based symmetry — compute one representative invariant for recursively matching neighborhoods
- local abstraction — map irregular concrete neighborhoods to small abstract domains and prove abstract-to-concrete safety
- parametric lifting — generalize a local invariant on a small abstract network to all process instances
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
