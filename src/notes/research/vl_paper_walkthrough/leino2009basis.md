# A Basis for Verifying Multi-threaded Programs
(authored by agents unless marked 🧑)
Tag: `leino2009basis`, [paper](https://www.semanticscholar.org/paper/6fbf834aeb3142a7425146ccb520451a64b1a311)

## scope and result
The paper presents a modular verification methodology for object-based concurrent programs. It combines implicit dynamic frames, fractional permissions, monitor invariants, thread contracts, and a dynamically changeable lock order. The implementation targets Chalice and generates first-order verification conditions for SMT solving. The abstract states: "The methodology is based on implicit dynamic frames and uses fractional permissions to support fine-grained locking." (§0, p.379)

The basic object is a permission-bearing heap location. "A permission is a percentage between 0 and 100%, inclusive." (§1, p.379) A thread can read with any nonzero permission and can write only with 100%; the sum held by threads, monitors, and the system is at most 100%. A method precondition receives permissions from its caller and its postcondition returns them. `acc(o.f)` means full permission, `acc(o.f,n)` a fractional percentage, and `rd(o.f)` an infinitesimal read permission. Permissions transfer when assertions are evaluated, so a call is also a resource transfer.

## technique: permission contracts and fractional ownership

Use this when several threads share fields, when a method needs a read-only view, or when a write must be exclusive. Steps from §1 (pp.379–381):

1. Put every permission required by a method in `requires`; put every permission that the caller regains in `ensures` (§1)
2. Give a read-only caller a nonzero permission such as `rd(this.val)`, and give a writer `acc(this.val)` (§1)
3. At each read, prove nonzero permission; at each write, prove full permission (§1)
4. Account for transfer: a callee receives the precondition permissions and the caller regains only permissions named in the postcondition (§1)
5. Split a field's permission among monitors or threads with `acc(o.f,n)`; combine complementary fractions before writing (§1)

The paper's `Cell.Clone` shape requires `rd(this.val)`, allocates `tmp`, reads `this.val`, writes `tmp.val`, and ensures `acc(result.val) ∧ rd(this.val)` (Fig. 0, p.380). Omitting `rd(this.val)` from the postcondition permanently loses that infinitesimal permission and can make the location immutable (§1).

Inference: In Verus, model a fractional permission as a ghost token or proof-oriented resource whose invariant states the permitted fraction, and pass it through `requires`/`ensures`; use executable Rust references only after proving the corresponding ownership fact. Verus's `requires` and `ensures` belong on executable or proof functions, while mathematical facts belong in `spec fn`; the paper's `acc` syntax itself does not carry over. Inference: A write proof should establish the full token before mutating a field, and a read proof should establish a positive token. Verus's Rust ownership prevents ordinary aliasing, so this encoding is most useful for shared-state protocols rather than replacing Rust's local borrow checker.

Evidence: the authors state that each read and write generates the corresponding permission proof obligation (§1, p.381), and that permissions are transferred at object creation, monitor acquisition, thread fork, and thread join (§1, pp.380–381). The paper reports automatic verification of hand-over-hand linked-list locking and lock reordering (§0, p.379), but gives no aggregate task count or timing. Assumption: permission arithmetic and the generated first-order conditions are sound; the specification must state every location on which an invariant depends.

## technique: monitor invariants and shared objects

Use this when an object is shared and a lock must protect both state and a relational invariant. Steps from §2 (pp.381–384):

1. Declare an `invariant` containing both permissions and state conditions (§2)
2. Make the invariant a precondition of `share` and `release`, and a postcondition of `acquire`; this establishes it whenever no thread holds the monitor (§2)
3. On `share o`, transfer the permissions named by the invariant from the thread to `o`'s monitor; on `acquire o`, transfer them back (§2)
4. Require read permission for every location mentioned by an invariant; otherwise reject the invariant for soundness (§2)
5. For a linked list, split `sum` permissions across adjacent node invariants, acquire both monitors before changing a sum, and check both invariants on release (§2, pp.382–384)
6. Use `share o` to move a thread-local object into the shared state and `unshare o` while holding its monitor to make it thread-local (§2, pp.384–385)

Fig. 1 gives a concrete sorted-node invariant: full permission for `next`, read permission for `val`, a sortedness implication for `next.val`, and 50% permissions for `sum` and `μ`. The paper explains: "It is important to understand that the monitor invariant of an object o may depend on a location x.f only if o's monitor has (at least) read permission for x.f." (§2, p.382) The List example holds 20% of `List.sum` in the monitor and 50% of the head node's sum; a writer must acquire both List and head monitors (§2, pp.383–384). The `Insert` loop uses hand-over-hand locking and a `lockchange p` clause (Fig. 2, p.383).

Inference: In Verus, represent each monitor invariant as a state-machine invariant or a ghost predicate guarded by a token; make `acquire` and `release` proof-bearing operations that transfer the token and establish the predicate. Inference: Verus does not use Chalice's `share`, `acquire`, `release`, or `lockchange` syntax, so a Rust implementation needs an explicit lock API and a proof that the API's transitions preserve the predicate. Inference: an `invariant` declaration in Verus is a declaration or state-machine invariant, not an `invariant(...)` call.

Evidence and limits: the linked-list example is verified automatically according to the abstract (§0), but no per-example proof time is reported. The soundness condition is explicit: an invariant may not mention a location without read permission, and unsharing does not promise full ownership because other threads may still hold fractions (§2, p.384). The methodology therefore assumes a faithful monitor implementation and exact permission accounting.

## technique: dynamically ordered locks for deadlock prevention

Use this when lock acquisition order changes as a data structure is reorganized. Steps from §3 (pp.385–386):

1. Store each object's lock position in a field `μ` drawn from a dense lattice: between any two ordered values another value exists (§3)
2. Define `u ≺ v` as strict order and use `⊥` to mean thread-local; require each monitor invariant to state the order it relies on (§3)
3. Track the greatest lock currently held by a thread as `maxlock`; before `acquire o`, prove `maxlock ≺ o.μ` (§3)
4. Place a new object with `share o between p and s`, requiring write permission for `o.μ`, read permission for bounds, and every lower bound below every upper bound (§3)
5. Reorder a shared object only with `reorder o` while its monitor is held, so another thread cannot observe an inconsistent `maxlock` (§3)

The paper says: "To prevent deadlocks, locks must be acquired in ascending order, according to a user-defined locking order." (§3, p.385) It uses the Node invariant `this.μ ≺ next.μ` for list traversal and reports that the same mechanism supports an association list that moves frequently used elements toward the head (§3, pp.385–386).

Inference: In Verus, put the lock rank in a ghost field or state-machine state, prove a strict-order invariant, and require each lock-acquire proof to show the new rank is above all held ranks. Inference: a dense rank can be modeled with an ordered integer plus a proof that a fresh rank lies between bounds, or with an abstract ordered type; the paper's lattice and `between` statements are not Verus syntax. Inference: dynamic reordering should require exclusive logical ownership of the lock's rank and a transition proof preserving all neighboring-order invariants.

## formal treatment, trust, and product implications
Section 4 translates statements to first-order logic and gives proof rules; the approach is designed for off-the-shelf SMT solvers (§0, p.379; §4, p.386). What is proved is that verified programs satisfy permission, invariant, contract, and lock-order obligations under the model. What remains trusted is the Chalice implementation, the translation, the SMT solver, the modeled lock/monitor behavior, and the adequacy of the contracts. Inference: for agent-written verified Rust, the techniques are a high threat to any concurrency feature that relies on shared mutable state, lock ordering, or data-structure invariants; they are a reusable design pattern rather than an automatic verifier for arbitrary Rust. Inference: VL should reuse the permission/invariant decomposition and rank-based lock proof ideas, but should not redo this paper's basic hand-over-hand or dense-order methodology without a Rust-specific gap.

## techniques for the catalog

- fractional permission contracts — transfer read and write fractions through preconditions and postconditions, combining fractions before mutation
- monitor invariants — guard shared state with permission-carrying invariants checked at share, acquire, and release
- hand-over-hand locking — traverse linked structures by acquiring the successor before releasing the predecessor while preserving split invariants
- dense dynamic lock order — store ordered ranks, require ascending acquisition, and reorder only with exclusive ownership
- SMT verification conditions — translate permission and concurrency proof obligations into first-order formulas for automated solving
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
