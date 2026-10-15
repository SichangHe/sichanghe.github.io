# SteelCore: an extensible concurrent separation logic for effectful dependently typed programs
(authored by agents unless marked 🧑)
Tag: `swamy2020steelcore`, [paper](https://www.semanticscholar.org/paper/1aa48021e1f62dcd5f71836d936d8ffc9e1176cf)

## scope and result
SteelCore embeds a concurrent separation logic (CSL) in F★'s effectful dependent type theory. It gives indexed action trees, a monotonic-state semantics, heap assertions, dynamically allocated invariants, atomic actions, fractional permissions, monotonic references, locks, and channels. The paper's central claim is: “The result is a full-featured separation logic shallowly embedded in F★, with a fully mechanized soundness proof, and applicable directly to dependently typed, higher order, effectful host language programs” (Section 4, p. 14).

Inference: the closest VL lesson is architectural. Put shared-state ownership and protocol facts in ghost specifications, expose atomic transitions as proof-relevant operations, and keep executable Rust separate from the separation-logic proof layer.

## technique 1: indexed action trees with partial-correctness semantics

What it is. A `ctree st a pre post` type indexes a potentially divergent concurrent computation by its initial footprint and result footprint. The state class contains memory, separation propositions, equivalence, `emp`, separating conjunction `star`, interpretation, an evolution preorder, and a memory invariant (Section 3, p. 9). The paper defines the intuition directly: “The program expects the fp0 footprint of some initial memory m0:st.mem. When run in m0, it may diverge or produce a result:a and m1:st.mem, providing the (fp1 result) fragment of m1 to the context” (Section 3, p. 9).

When and steps.
1. Define a `pre_state` record with memory and separation-logic operations.
2. Prove the state laws: associative/commutative `star`, unit `emp`, extensional interpretation, and affinity (Section 3, p. 9).
3. Define action-tree constructors for return, bind, state operations, concurrency, and atomic actions, indexing each by pre/post footprints.
4. Prove each constructor preserves the semantic relation; compose trees through their indexed types.
5. Interpret divergence as partial correctness: a terminating result must satisfy the postcondition, while divergence is permitted (Sections 2 and 3).

Verus form. Inference: represent a Rust state by a struct and a ghost ownership predicate `slprop(s, resource)`. Give transition functions `requires` pre-ownership and `ensures` post-ownership, and use `proof fn` lemmas for frame-preserving composition. Verus does not provide SteelCore's dependent `ctree` type or a built-in concurrent CSL; thread APIs and atomicity must be modeled with explicit ghost state and invariants.

Evidence and limits. The paper mechanizes soundness of the generic action-tree semantics and SteelCore instantiation (Sections 3.3 and 4). The semantics permits divergence and relies on the host F★ effect system, extensionality, and the state laws. It is a partial-correctness account, not a termination proof.

## technique 2: affine separation propositions and frame reasoning

What it is. `slprop` is a heap predicate preserved by disjoint extension; `slstar` splits a heap into disjoint portions. The paper defines: “We define the type slprop of separation logic propositions as the type of heap propositions p that are preserved under disjoint extension” (Section 4.2, p. 15). Propositions are affine, so owned resources may be discarded; separating conjunction gives local reasoning.

When and steps.
1. Define `slprop = p:(heap → prop){∀ h0 h1. p h0 ∧ disjoint h0 h1 ⇒ p (join h0 h1)}` (Section 4.2, p. 15).
2. Interpret a proposition against the heap component of memory.
3. Use `slstar p1 p2` to split ownership into disjoint subheaps and recombine after a command.
4. Apply the frame rule: a command proved for one footprint can run in a larger disjoint context.
5. Quantify over values, references, or propositions with the logic's existential/universal connectives.

Verus form. Inference: encode ownership as ghost maps/sets and define a separating predicate over disjoint domains. State frame preservation as a `proof fn` lemma whose `requires` includes disjointness and whose `ensures` preserves the untouched ghost portion. Rust borrow checking supplies some exclusivity but not arbitrary fractional or affine ghost permissions.

Limits. The paper notes that `slprop` cannot itself be stored in the heap because of universe levels; storing codes for a small proposition language is a workaround (Section 4.2, p. 15). Affinity intentionally permits forgetting resources, so memory leaks are not ruled out by the logic alone.

## technique 3: dynamically allocated invariants and atomic access

What it is. Invariants are propositions stored in an invariant store and can be shared by threads, but opened and restored only by atomic actions. The feature list says invariants “can be dynamically allocated and freely shared among multiple threads and accessed and restored by atomic actions only” (Section 4, p. 14).

When and steps.
1. Allocate an invariant name with a proposition describing protected heap state.
2. Publish the invariant handle to threads while retaining no unrestricted heap ownership.
3. Enter an atomic action; open the invariant and combine its proposition with the action's local footprint.
4. Read or update protected state while proving the invariant's transition condition.
5. Restore the invariant before the atomic action returns; no thread may observe the opened state.

Verus form. Inference: use a ghost token and a `type_invariant` or explicit predicate over the protected state, with an atomic wrapper whose `requires` owns the token and whose `ensures` restores it. Verus code should keep the executable critical section and ghost proof synchronized; SteelCore's dynamically allocated invariant handles and action-tree typing must be represented by project-specific ghost structures.

Evidence and examples. The paper's spin-lock example (Section 5.1) verifies lock acquisition/release by transferring an invariant around an atomic compare-and-swap. Its higher-order lock-coupling list example gives each node a lock and recursively defined representation invariant (Section 5.3, pp. 23–24). No aggregate number of verified lines or failed examples is reported.

## technique 4: fractional permissions and monotonic references

What it is. Cells use a user-chosen partial commutative monoid, supporting sharing disciplines including fractional permissions; monotonic references constrain state evolution by a preorder. These are listed as core features in Section 4 (p. 14). A fractional split gives read sharing while requiring recombination for writes. A monotonic reference permits updates only when the new value is above the old one in the chosen preorder.

When and steps.
1. Choose a cell resource monoid and define its composition and validity laws.
2. Allocate a cell with a full permission or authoritative monotonic state.
3. Split a fractional permission among readers, or derive a monotonic observation token.
4. Before a write, prove permission ownership and (for a monotonic reference) `old ≤ new`.
5. Recombine permissions or publish the new monotonic state.

Verus form. Inference: represent fractions by ghost rational-like tokens or an abstract permission algebra; represent monotonic state with a ghost old/new relation and a `requires old_value <= new_value` clause. Verus has no built-in fractional permission primitive, so the algebra and soundness lemmas must be supplied explicitly.

## technique 5: protocol objects, locks, counters, and channels

SteelCore uses dependent types to package an abstract invariant with a callable operation. The counter example's type has an invariant `p` indexed by the counter value; each call consumes `p x`, returns `x+1`, and restores `p (x+1)` (Section 5.3, p. 23). Lock-coupling lists recursively combine node ownership, lock handles, and tail predicates (Section 5.3). Channels are typed from indexed action trees into action-tree indexes (Section 5.4), so send/receive protocols are checked at the type level.

Verus form. Inference: encode a counter as a Rust struct with a ghost numeric invariant and methods with `requires`/`ensures`; encode a channel protocol as a ghost state machine whose send/receive methods advance a protocol predicate. Rust lifetimes and ownership help with handles, but dynamic lock allocation and higher-order dependent indices require explicit ghost modeling.

## proof boundary, trusted components, and VL impact
The fully mechanized F★ soundness proof, F★ kernel, effect semantics, state-law axioms, and model of atomicity are trusted. The paper supplies examples but no broad benchmark denominator or runtime comparison. It assumes a coherent monotonic-state model and partial correctness. Inference: VL should avoid rebuilding generic separation logic without checking existing Verus libraries; the reusable pieces are invariant protocols, frame lemmas, monotonic ghost state, and typed channel state machines. Product threat is medium for concurrent agent-written Rust: generated code can satisfy local functional contracts while violating a global ownership protocol unless the protocol is made a required ghost interface.

## techniques for the catalog
- indexed action trees — index concurrent computations by pre/post separation footprints and compose them semantically
- affine separation logic — define heap predicates closed under disjoint extension and use separating conjunction for frame reasoning
- atomic invariant protocols — allocate shared invariants, open them only inside atomic actions, and restore them before return
- fractional permissions — use a partial commutative monoid to split and recombine shared-cell authority
- monotonic references — constrain ghost state evolution by a preorder and prove every update is increasing
- typed concurrency objects — package locks, counters, lists, and channels with dependent protocol indices

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
