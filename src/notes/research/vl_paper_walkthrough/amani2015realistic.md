# Specifying a Realistic File System
(authored by agents unless marked 🧑)
Tag: `amani2015realistic` , [paper](http://arxiv.org/abs/1511.04169v1)

## scope and result
The paper presents the Abstract File system Specification (AFS) for BilbyFs, a Linux flash file system. It targets realistic asynchronous writes and verifies the C `fsync()` implementation by formal refinement. The abstract states: “The BilbyFs specification supports asynchronous writes, a feature that has been overlooked by several file system verification projects.” The implementation uses a global lock, so the specification is sequential. The authors' objective is precise: “every behaviour exhibited by the implementation is captured by its specification (i.e. formal refinement).”

## technique 1: shallow nondeterministic specification
What it is: model each computation as a set of possible return values in Isabelle/HOL's nondeterminism monad. `return` creates a singleton, bind sequences computations, and union expresses choice. “A computation that returns results of type σ is modelled as a value of type σ set: singleton sets model deterministic computations; the empty set models computations whose semantics is not well-defined.”

Steps (Section 2):
1. Define abstract state and operation results as Isabelle datatypes/records.
2. Use `return x ≡ {x}` for deterministic results, bind (`>>=`) for sequencing, and union (`u`) for alternatives.
3. Write readable `do`-notation specifications and prove implementation refinement compositionally.
4. Keep the embedding shallow so Isabelle's existing logic reasons directly about the functional specification.

Verus form: Inference: represent nondeterministic outcomes with a ghost/spec datatype and a `spec fn` returning a set-like abstraction, then prove implementation postconditions against every allowed outcome. Verus does not provide Isabelle's set monad or shallow embedding; this is a design translation, not a paper result.

## technique 2: abstract inode model and invariant
What it is: model the medium as a partial map from inode numbers to abstract inodes, with directories mapping names to inode identifiers and files containing VFS pages. The global invariant requires a root, no directory hardlinks, matching inode identifiers, correct link counts, and file sizes matching page counts (Section 3). Inference: this abstraction hides implementation indirection while retaining VFS-visible behavior.

Steps: define `afs-map`, `afs-inode`, and `afs-state`; state the invariant; specify each operation as a state transformation and error-returning computation; audit that every successful or failed branch preserves the invariant. The paper notes: “This abstraction allows the AFS to be as simple as possible while comprehensively capturing the behaviour of the various file system operations.”

Verus form: Inference: encode the map and inode records as Rust ghost state, write a `predicate`/`spec fn` for the invariant, and attach `requires`/`ensures` clauses to operation methods. Use `assert` and `assert_by` to preserve link-count and size relations. The exact Isabelle datatypes do not carry over.

## technique 3: asynchronous-write state separation
What it is: separate physical medium state from pending in-memory updates. `afs-state` stores read-only mode, current time, medium map, and an ordered list of update functions. `updated-afs` folds pending updates over the medium to describe immediately visible state. “For the file system correctness specification, this implies that the in-memory file system state and the state of the physical storage medium (afs-map in the AFS) need to be distinguished.”

Steps (Section 3):
1. Represent each update as `afs-map ⇒ afs-map`.
2. Append a new update to the pending list.
3. Nondeterministically split the list into a prefix to apply and a remainder, preserving order.
4. Fold the prefix onto medium state and retain the remainder.
5. For an error, remove the new update so no failed operation changes combined state; require that applied updates or pending updates never disappear.

The helper `afs-update` permits success when all updates reach disk, or success/error when updates remain buffered. Inference: Verus can model the list and fold as ghost state and prove order preservation with sequence lemmas; nondeterministic splitting needs an explicit relation or existential postcondition.

## technique 4: fsync and fault nondeterminism
`fsync()` applies an arbitrary prefix of pending updates to model a partial disk failure. It succeeds only when the pending list becomes empty; otherwise it returns one of the specified errors and sets read-only mode on `eIO`. The paper states: “fsync() returns successfully when all updates are applied; otherwise it returns an appropriate error code.” Inference: a Verus proof should quantify over every permitted prefix and prove that the implementation either reaches the success postcondition or establishes the modeled error state.

## evidence, trust, and limits
The completed proof establishes that BilbyFs `fsync()` formally refines AFS. The specification covers 16 VFS operations and a C wrapper that serializes calls. Trusted foundations include Isabelle/HOL, the shallow embedding, the wrapper assumptions, and the correctness of unmodeled VFS interactions. The paper explicitly limits the model: “An obvious limitation of the AFS is that, like all other file systems specifications of which we are aware, it supports no form of concurrency.” It also imposes strict update ordering and does not specify mount behavior or post-crash state. Inference: these omissions are direct threats for a Verus product targeting concurrent or crash-tolerant Rust storage; the state-separation and nondeterministic-error techniques remain reusable.

## techniques for the catalog
- shallow nondeterministic monad — model each operation as a set of outcomes and compose with bind and union
- abstract inode invariants — specify VFS-visible maps and preserve root, link, size, and acyclicity conditions
- pending-update state separation — keep medium state and ordered in-memory transformations distinct
- nondeterministic fsync faults — apply an arbitrary update prefix and specify success, error, and read-only outcomes

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
