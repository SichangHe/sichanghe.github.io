# SteelCore: an extensible concurrent separation logic for effectful dependently typed programs
(authored by agents unless marked 🧑)
Tag: `swamy2020steelcore`, [paper](https://doi.org/10.1145/3409003)

Page numbers below are the ICFP article page suffixes (121:N printed in the paper header).

## scope and result
SteelCore embeds a concurrent separation logic (CSL) in F★'s effectful dependent type theory. It gives indexed action trees, a monotonic-state semantics, heap assertions, dynamically allocated invariants, atomic actions, fractional permissions, monotonic references, locks, and channels. The paper's central claim is: “The result is a full-featured separation logic shallowly embedded in F★, with a fully mechanized soundness proof, and applicable directly to dependently typed, higher order, effectful host language programs” (Section 4, p. 14).

Inference: the closest VL lesson is architectural. Put shared-state ownership and protocol facts in ghost specifications, expose atomic transitions as proof-relevant operations, and keep executable Rust separate from the separation-logic proof layer.

## technique 1: indexed action trees with partial-correctness semantics

What it is. A `ctree st a pre post` type indexes a potentially divergent concurrent computation by its initial footprint and result footprint. The state class contains memory, separation propositions, equivalence, `emp`, separating conjunction `star`, interpretation, an evolution preorder, and a memory invariant (Section 3, p. 8). The paper defines the intuition directly: “The program expects the fp0 footprint of some initial memory m0:st.mem. When run in m0, it may diverge or produce a result:a and m1:st.mem, providing the (fp1 result) fragment of m1 to the context” (Section 3, p. 8).

When and steps.
1. Define a `pre_state` record with memory and separation-logic operations; a `state` is a `pre_state` satisfying `st_laws` (Section 3, pp. 8-9).
2. Require the state laws: associative/commutative `star`, unit `emp`, extensional interpretation and `star`, and affinity (Section 3, pp. 8-9).
3. Define atomic actions as monotonic-state (MST) computations that require the initial footprint (together with `st.inv`) and ensure the final footprint plus `preserves_frame`, so every action is frameable (Section 3.1, p. 9).
4. Define the `ctree` constructors `Act`, `Ret`, `Bind`, `Par`, `Frame` and `Sub`, each indexed by pre/post footprints so that the indexes encode the CSL rules (Section 3.2, pp. 9-10, Fig. 2).
5. Define a single-step interpreter `step` whose type carries inductive invariants (`preserves_frame` and a stronger postcondition for the reduct), then close it into `run`, whose type is the partial-correctness statement: from `st.inv m0 ∗ fp0` it returns `x` in `m1` with `st.inv m1 ∗ fp1 x`, or diverges. Nondeterministic interleaving of `Par` is done by sampling, in the effect NMST (nondeterminism over monotonic state) (Sections 2.2 and 3.3, pp. 8, 11-12).

Verus form. Inference: represent a Rust state by a struct and a ghost ownership predicate `slprop(s, resource)`. Give transition functions `requires` pre-ownership and `ensures` post-ownership, and use `proof fn` lemmas for frame-preserving composition. SteelCore's dependent `ctree` type and its built-in interleaving semantics have no direct Verus counterpart; thread APIs and atomicity would have to be modeled with explicit ghost state and invariants.

Evidence and limits. The paper states “SteelCore is a fully mechanized CSL embedded in F★” (Section 1.1, p. 4) and that the soundness is the type of `run` (Section 3.3, p. 12). The semantics permits divergence and relies on the host F★ effect system and the state laws. It is a partial-correctness account, not a termination proof; the paper says total correctness “is a thorny issue that our work does not address at all” (Section 2.1, p. 5). The paper also says “we do not intend to run programs using run” because it is inefficient (Section 3.3, p. 13) and that “we have yet to extract and run any Steel program” (Section 2.2, p. 8). It omits the structural rule for disjunction (Section 3.2, p. 10).

## technique 2: affine separation propositions and frame reasoning

What it is. `slprop` is a heap predicate preserved by disjoint extension; `slstar` splits a heap into disjoint portions. The paper defines: “We define the type slprop of separation logic propositions as the type of heap propositions p that are preserved under disjoint extension” (Section 4.2, p. 15). The paper calls slprops “affine heap propositions”; separating conjunction gives local reasoning.

When and steps.
1. Define `slprop = p:(heap → prop){∀ h0 h1. p h0 ∧ disjoint h0 h1 ⇒ p (join h0 h1)}`, where `disjoint` and `join` require agreeing PCM and composable values at shared addresses (Sections 4.1-4.2, pp. 14-15).
2. Interpret a proposition against the heap component of memory: `interp p m = p m.heap`.
3. Use `slstar p1 p2` to split ownership into disjoint subheaps (`∃h1 h2. disjoint h1 h2 ∧ h == join h1 h2 ∧ p1 h1 ∧ p2 h2`).
4. Use the `Frame` node (and `Par`) so a command proved for one footprint runs in a larger disjoint context (Section 3.2, p. 10).
5. Use the connectives `slwand`, `sland`, `slor`, `slex`, `slall`; the quantifiers range over arbitrary universes, including over slprops (Section 4.2, p. 15).

Verus form. Inference: encode ownership as ghost maps/sets and define a separating predicate over disjoint domains. State frame preservation as a `proof fn` lemma whose `requires` includes disjointness and whose `ensures` preserves the untouched ghost portion. Rust borrow checking supplies some exclusivity but not arbitrary fractional or affine ghost permissions.

Limits. The paper says slprops reside in the same universe as heap, so “slprops cannot themselves be stored in the heap”, “the main limitation of our model”; a workaround is to store codes for a suitably small sub-language of slprops (Section 4.2, p. 15). Inference: affinity permits forgetting resources (the paper's `release` example uses it to forget an assertion, Section 5.1, p. 21), so leaks are not ruled out by the logic alone; the paper's memory has explicit, manually managed lifetimes (Section 4, p. 13).

## technique 3: dynamically allocated invariants and atomic access

What it is. Invariants are propositions stored in an invariant store (`istore`) and can be shared by threads, but opened and restored only by atomic actions. The feature list says invariants “can be dynamically allocated and freely shared among multiple threads and accessed and restored by atomic actions only” (Section 4, p. 13).

When and steps.
1. Allocate with `new_invariant p`: it consumes `p`, returns a value `ival p` (an index into the `istore`, a list of slprops), and witnesses `inv_for_p i p` (Section 4.3, pp. 16-17).
2. Share the `ival p` freely; it is an ordinary value and its stable form `i↪p` is a `prop`, hence duplicable (Section 4.3, p. 17).
3. Mark actions atomic: `atomic a uses is_ghost p q` is a total sub-effect of NMST whose invariant `inv'` omits the opened names in `uses`; a sequential composition may contain at most one non-ghost action (`bind_atomic`) (Section 4.4, p. 18).
4. Open and close with `with_invariant i e`, which turns an atomic `e` that assumes and restores `p ∗ q → p ∗ r` into an atomic command from `q` to `r` and removes `i` from `uses` (Section 4.4, p. 18). The paper notes that “Recursively opening the same invariant ival p is clearly unsound” (Section 4.4, p. 17), which is what `uses` tracks.
5. Finally turn an atomic command with `uses = {}` into an `action` and then `Act e` (Section 4.4, p. 18). The paper's replacement for Iris's later modality is the `witnessed`/`recall` step of monotonic state (Section 4.4, p. 18).

Verus form. Inference: use a ghost token and a `type_invariant` or explicit predicate over the protected state, with an atomic wrapper whose `requires` owns the token and whose `ensures` restores it. Verus code should keep the executable critical section and ghost proof synchronized; SteelCore's dynamically allocated invariant handles and action-tree typing would be project-specific ghost structures.

Evidence and examples. The spin-lock example (Section 5.1, pp. 21-22) represents a lock as a reference plus an invariant `lockinv r p = (pts_to r 1.0 available ∗ p) ∨ (pts_to r 1.0 locked)`; `acquire` and `release` run an atomic `cas` inside `with_invariant`. The lock-coupling list (Section 5.3, p. 23) is given only as a recursive representation invariant `llist_inv`; the paper shows no list operations verified. The paper says the proofs “are still quite manual” and that the code shown is simplified (Section 5, p. 21). No aggregate number of verified lines or failed examples is reported.

## technique 4: fractional permissions and monotonic references

What it is. Each cell stores a value in a user-chosen partial commutative monoid (PCM), supporting sharing disciplines including fractional permissions (Section 4, p. 13). Monotonic references constrain state evolution by a preorder (Section 4.5, pp. 19-20).

When and steps.
1. Choose a cell PCM with `one`, `composable`, and `op` (commutative, associative, unit); `pts_to r v` asserts partial knowledge `v ⪯ v'` of the cell (Sections 4.1-4.2, pp. 14-15).
2. For fractions use `frac t = option (t & r:real{0.0 < r})` with `pcm_frac`, whose `composable` requires equal values and `r0+r1 ≤ 1.0`; `share_gather` relates `r ↦_f u ∗ r ↦_g v` to `r ↦_{f+g} u` plus `u==v` (Section 4.5, p. 19).
3. Writing a plain reference needs a frame-preserving update; the monotonic-reference `write` needs full permission `r ↦_{1.0} v0` and `p v0 v` for the preorder `p` (Sections 4.2 and 4.5, pp. 16, 19).
4. `witness_mref` records `observed r q` for a property `q` stable under the preorder; `recall_mref` turns `observed r q` back into `q v` for the current value `v`. Paper example: for `r:mref int (≤)`, after observing 17 one can recall later that the value is at least 17 (Section 4.5, p. 20).
5. Monotonic references are built from PCMs: the type `mref a q` is supported by a PCM `frac_hist q` combining fractions with the history PCM from `pcm_of_preorder` (Section 4.5, p. 20).

Verus form. Inference: represent fractions by ghost rational-like tokens or an abstract permission algebra; represent monotonic state with a ghost old/new relation and a `requires old_value <= new_value` clause. Check whether vstd already provides a PCM or permission library before supplying the algebra and soundness lemmas explicitly.

## technique 5: protocol objects, locks, counters, and channels

SteelCore uses dependent types to package an abstract invariant with a callable operation. The counter example's type `ctr_t` pairs an abstract invariant `p:(int → slprop)` with a closure `x:erased int → Steel (y:int{y==x+1}) (p x) p`: each call consumes `p x`, returns `x+1`, and restores `p (x+1)` (Section 5.3, p. 23). The paper notes that, because slprops cannot be stored in the heap, a `ctr_t` cannot be stored in a ref cell (Section 5.3, p. 23). Lock-coupling lists combine node ownership, a lock handle, and a tail predicate in `llist_inv` (Section 5.3, p. 23). Fork/join is built from `par`, a lock and a boolean reference (Section 5.2, p. 22).

Channels (Section 5.4, pp. 23-26) are indexed by a protocol: the `protocol` type is a small action-tree-like language (`Ret`, `Msg`, `DoWhile`), `send`/`recv` change the sender/receiver predicate by one protocol step, and an internalized `history`/`extend_trace` guarantee, built on a ghost monotonic reference and a lock-protected `chan_inv`, says received messages form a partial trace of the protocol. The paper covers only synchronous simplex channels; asynchronous and duplex channels and 2-party sessions are left to future work (Section 5.4, p. 26).

Verus form. Inference: encode a counter as a Rust struct with a ghost numeric invariant and methods with `requires`/`ensures`; encode a channel protocol as a ghost state machine whose send/receive methods advance a protocol predicate. Rust lifetimes and ownership help with handles, but dynamic lock allocation and higher-order dependent indices would need explicit ghost modeling.

## proof boundary, trusted components, and VL impact
The paper claims a fully mechanized soundness proof inside F★ (Section 4, p. 14); it builds on F★'s own soundness (Swamy et al. 2016) and the monotonic-state effect's soundness (Ahman et al. 2018), both proved elsewhere (Section 2.2, p. 7). The paper supplies examples but no broad benchmark denominator or runtime comparison, and no Steel program has been extracted and run (Section 2.2, p. 8). Inference: the F★ kernel and effect semantics, and the model of atomicity (individual `Act` nodes run without interference), are what a reader must trust. Inference: VL should avoid rebuilding generic separation logic without checking existing Verus libraries; the reusable pieces are invariant protocols, frame lemmas, monotonic ghost state, and typed channel state machines. Inference: product threat is medium for concurrent agent-written Rust, since generated code can satisfy local functional contracts while violating a global ownership protocol unless the protocol is made a required ghost interface.

## techniques for the catalog
- indexed action trees — index concurrent computations by pre/post separation footprints and compose them semantically
- affine separation logic — define heap predicates closed under disjoint extension and use separating conjunction for frame reasoning
- atomic invariant protocols — allocate shared invariants, open them only inside atomic actions, and restore them before return
- fractional permissions — use a partial commutative monoid to split and recombine shared-cell authority
- monotonic references — constrain reference state evolution by a preorder and prove every update respects it
- typed concurrency objects — package locks, counters, lists, and channels with dependent protocol indices

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Recursively opening the same invariant ival p is clearly unsound since, although ival p is duplicable, p itself need not be."): read the whole paper text start to end and checked every quotation, section and page reference, and the steps of all five techniques against it; changed the link to the DOI from the paper, corrected page numbers (the state class and intuition quote are p. 8, the feature-list quote is p. 13, lock-coupling is p. 23), rewrote technique 1 steps to the real constructors (Act, Ret, Bind, Par, Frame, Sub) and the step/run proof, rewrote technique 3 and 4 steps to follow the paper (istore, uses set, with_invariant, pcm_frac, mref write), removed unsupported claims (lock-coupling list verified, authoritative monotonic state, trusted state-law axioms, Verus has no fractional primitive) and marked own conclusions as Inference; did not check the F★ sources or proofs, the cited prior work, or any Verus/vstd claim.
