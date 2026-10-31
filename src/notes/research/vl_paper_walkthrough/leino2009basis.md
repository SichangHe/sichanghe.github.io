# A Basis for Verifying Multi-threaded Programs
(authored by agents unless marked 🧑)
Tag: `leino2009basis`, [paper](https://www.semanticscholar.org/paper/6fbf834aeb3142a7425146ccb520451a64b1a311)

## scope and result
The paper presents a modular verification methodology for object-based concurrent programs. It combines implicit dynamic frames, fractional permissions, monitor invariants, thread contracts, and a dynamically changeable lock order. The implementation is a translator from the experimental language Chalice to the intermediate verification language Boogie, and the paper prescribes first-order verification conditions for SMT solving (§6, p.392). The abstract states: "The methodology is based on implicit dynamic frames and uses fractional permissions to support fine-grained locking." (abstract, p.378)

The basic object is a permission-bearing heap location. "A permission is a percentage between 0 and 100%, inclusive." (§1, p.379) A thread can read with any nonzero permission and can write only with 100%; for each location the sum of permissions held by the various threads is between 0 and 100%, and what remains is held by the system or by an un-acquired monitor (§1, p.379). A method precondition receives permissions from its caller and its postcondition returns them. `acc(o.f)` means full permission, `acc(o.f,n)` a fractional percentage, and `rd(o.f)` an infinitesimal read permission. Permissions transfer when assertions are evaluated, so a call is also a resource transfer.

## technique: permission contracts and fractional ownership

Use this when several threads share fields, when a method needs a read-only view, or when a write must be exclusive. Steps from §1 (pp.379–381):

1. Put every permission required by a method in `requires`; put every permission that the caller regains in `ensures` (§1)
2. Give a read-only caller a nonzero permission such as `rd(this.val)`, and give a writer `acc(this.val)` (§1)
3. At each read, prove nonzero permission; at each write, prove full permission (§1)
4. Account for transfer: a callee receives the precondition permissions and the caller regains only permissions named in the postcondition (§1)
5. Split a field's permission among monitors or threads with `acc(o.f,n)`; to write, a thread must hold full permission, e.g. the List example needs the thread to hold exactly 80% of `sum` and then acquire the monitor holding the other 20% (§1 p.379; §2 p.384)

The paper's `Cell.Clone` shape requires `rd(this.val)`, allocates `tmp`, reads `this.val`, writes `tmp.val`, and ensures `acc(result.val) ∧ rd(this.val)` (Fig. 0, p.380). Omitting `rd(this.val)` from the postcondition permanently loses that infinitesimal permission and can make the location immutable (§1).

Inference: In Verus, model a fractional permission as a ghost token or proof-oriented resource whose invariant states the permitted fraction, and pass it through `requires`/`ensures`; use executable Rust references only after proving the corresponding ownership fact. Verus's `requires` and `ensures` belong on executable or proof functions, while mathematical facts belong in `spec fn`; the paper's `acc` syntax itself does not carry over. Inference: A write proof should establish the full token before mutating a field, and a read proof should establish a positive token. Verus's Rust ownership prevents ordinary aliasing, so this encoding is most useful for shared-state protocols rather than replacing Rust's local borrow checker.

Evidence: the authors state that each read and write generates the corresponding permission proof obligation (§1, p.381), and that a thread obtains permissions at object creation, monitor acquisition, thread fork, and thread join (§1, p.381). The paper reports that the implementation verified hand-over-hand linked-list locking and a lock re-ordering algorithm, and that "all of our examples could be verified fully automatically" (§6, p.392), but gives no aggregate task count or timing. The paper does not prove soundness: it lists "a formal soundness result" as future work (§6, p.392), and it states that the implementation does not support abstract predicates and does not check that permissions are not lost (§5, p.391). Assumption: permission arithmetic and the generated first-order conditions are sound; the specification must state every location on which an invariant depends.

## technique: monitor invariants and shared objects

Use this when an object is shared and a lock must protect both state and a relational invariant. Steps from §2 (pp.381–384):

1. Declare an `invariant` containing both permissions and state conditions (§2)
2. Make the invariant a precondition of `share` and `release`, and a postcondition of `acquire`; this establishes it whenever no thread holds the monitor (§2)
3. On `share o`, transfer the permissions named by the invariant from the thread to `o`'s monitor; on `acquire o`, transfer them back (§2)
4. Require read permission for every location mentioned by an invariant; otherwise reject the invariant for soundness (§2)
5. For a linked list, split `sum` permissions across adjacent node invariants, acquire both monitors before changing a sum, and check both invariants on release (§2, pp.382–384)
6. Use `share o` to move a thread-local object into the shared state and `unshare o` while holding its monitor to make it thread-local (§2, pp.384–385)

Fig. 1 gives a concrete sorted-node invariant: full permission for `next`, read permission for `val`, a sortedness implication for `next.val`, and 50% permissions for `sum` and `μ`. The paper explains: "It is important to understand that the monitor invariant of an object o may depend on a location x.f only if o's monitor has (at least) read permission for x.f." (§2, p.382) In the List example (Fig. 2, p.383), the List monitor holds 20% of `List.sum` and 50% of the head node's `sum`; to write `head.sum` a thread must acquire both the head monitor and the List monitor (§2, p.384). The `Insert` loop uses hand-over-hand locking and a `lockchange p` clause (Fig. 2, p.383; §2, p.384).

Inference: In Verus, represent each monitor invariant as a state-machine invariant or a ghost predicate guarded by a token; make `acquire` and `release` proof-bearing operations that transfer the token and establish the predicate. Inference: Verus does not use Chalice's `share`, `acquire`, `release`, or `lockchange` syntax, so a Rust implementation needs an explicit lock API and a proof that the API's transitions preserve the predicate. Inference: an `invariant` declaration in Verus is a declaration or state-machine invariant, not an `invariant(...)` call.

Evidence and limits: the paper says the implementation verified hand-over-hand locking for linked lists (abstract, p.378) and that all examples were verified fully automatically (§6, p.392), but no per-example proof time is reported. The soundness condition is explicit: an invariant may not mention a location without read permission, and unsharing does not promise full ownership because other threads may still hold fractions (§2, p.384). The methodology therefore assumes a faithful monitor implementation and exact permission accounting.

## technique: dynamically ordered locks for deadlock prevention

Use this when lock acquisition order changes as a data structure is reorganized. Steps from §3 (pp.385–386):

1. Store each object's lock position in a field `μ` drawn from a dense lattice: between any two ordered values another value exists (§3)
2. Define `u ≺ v` as strict order and use `⊥` to mean thread-local (an object is thread-local if and only if `o.μ = ⊥`); a monitor invariant can state the order it relies on, as Node's last invariant does for a node and its successor (§3, p.385)
3. Track the greatest lock currently held by a thread as `maxlock`; before `acquire o`, prove read permission for `o.μ` and that `o` is strictly above all objects already held, i.e. `maxlock ≺ o.μ` (§3, pp.385–386)
4. Place a new object with `share o between p and s`, requiring write permission for `o.μ`, read permission for bounds, and every lower bound below every upper bound (§3)
5. Reorder a shared object only with `reorder o` while its monitor is held, so another thread cannot observe an inconsistent `maxlock` (§3)

The paper says: "To prevent deadlocks, locks must be acquired in ascending order, according to a user-defined locking order." (§3, p.385) It uses the Node invariant `this.μ ≺ next.μ` for list traversal and reports that the same mechanism supports an association list that moves frequently used elements toward the head (§3, pp.385–386).

Inference: In Verus, put the lock rank in a ghost field or state-machine state, prove a strict-order invariant, and require each lock-acquire proof to show the new rank is above all held ranks. Inference: a dense rank can be modeled with an ordered integer plus a proof that a fresh rank lies between bounds, or with an abstract ordered type; the paper's lattice and `between` statements are not Verus syntax. Inference: dynamic reordering should require exclusive logical ownership of the lock's rank and a transition proof preserving all neighboring-order invariants.

## formal treatment, trust, and product implications
Section 4 gives proof rules by translating statements to a simple guarded-command language with `assert` and `assume`, using `Exhale` and `Inhale` operations for permission transfer (§4, pp.386–389); the approach is designed for off-the-shelf SMT solvers (§0, p.379; §6, p.392). What is proved is that verified programs satisfy permission, invariant, contract, and lock-order obligations under the model.

## techniques for the catalog

- fractional permission contracts — transfer read and write fractions through preconditions and postconditions, combining fractions before mutation
- monitor invariants — guard shared state with permission-carrying invariants checked at share, acquire, and release
- hand-over-hand locking — traverse linked structures by acquiring the successor before releasing the predecessor while preserving split invariants
- dense dynamic lock order — store ordered ranks, require ascending acquisition, and reorder only with exclusive ownership
- SMT verification conditions — translate permission and concurrency proof obligations into first-order formulas for automated solving
