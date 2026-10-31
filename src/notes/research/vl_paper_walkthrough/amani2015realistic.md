# Specifying a Realistic File System
(authored by agents unless marked 🧑)
Tag: `amani2015realistic` , [paper](https://doi.org/10.4204/EPTCS.196.1)

## scope and result
The paper presents the Abstract File system Specification (AFS) for BilbyFs, a Linux flash file system. It targets realistic asynchronous writes and verifies the C `fsync()` implementation by formal refinement. The abstract states: “The BilbyFs specification supports asynchronous writes, a feature that has been overlooked by several file system verification projects.” The implementation uses a global lock, so the specification is sequential. The authors' objective is precise: “every behaviour exhibited by the implementation is captured by its specification (i.e. formal refinement).”

## technique 1: shallow nondeterministic specification
What it is: model each computation as a set of possible return values in Isabelle/HOL's nondeterminism monad. `return` creates a singleton, bind sequences computations, and union expresses choice. “A computation that returns results of type σ is modelled as a value of type σ set: singleton sets model deterministic computations; the empty set models computations whose semantics are not well-defined.”

Steps (Section 2; the paper gives no numbered procedure, so this list is a reconstruction):
1. Choose the nondeterminism monad: computations are sets of values, singleton for deterministic, empty for not well-defined.
2. Use `return x ≡ {x}` for deterministic results, bind `f >>= g ≡ ⋃ r∈f. g r` for sequencing, and choice `x ⊓ y ≡ x ∪ y` for alternatives (the text extraction renders ⊓ as `u`).
3. Write the specification in `do x ← f; g x od` notation, which "makes the specification readable by ordinary programmers".
4. Embed it shallowly in Isabelle/HOL, which the paper says is "more straightforward to reason about than if it were deeply-embedded", and prove refinement with the compositional framework of Cock et al. [3] (“this formalism supports a scalable, compositional framework for proving refinement”).
5. The authors deliberately do not use a state monad: the state is passed explicitly, because a state monad made specifications "harder to read".

Verus form: Inference: represent nondeterministic outcomes with a ghost/spec datatype and a `spec fn` returning a set-like abstraction, then prove implementation postconditions against every allowed outcome. Verus does not provide Isabelle's set monad or shallow embedding; this is a design translation, not a paper result.

## technique 2: abstract inode model and invariant
What it is: model the medium as a partial map from inode numbers to abstract inodes, with directories mapping names to inode identifiers and files containing VFS pages. The global invariant (Section 3, described only briefly because it is "very similar to that of [4]") requires: (1) a root inode exists; (2) each directory inode is pointed to by only one directory entry, i.e. no hardlinks on directories, which keeps the structure acyclic; (3) each inode's `i-ino` matches the `afs-map` key; (4) `i-nlink` tracks the number of links; (5) each file inode's `i-size` is consistent with its number of VFS pages. Inference: this abstraction hides implementation indirection while retaining VFS-visible behavior.

Steps (reconstruction; the paper gives no numbered procedure): define `afs-map` (partial map from `ino` to `afs-inode`, where `afs-inode-type` is `IDir` of a filename-to-ino map or `IFile` of a VFS page list), `afs-inode`, and `afs-state`; state the invariant; specify each operation as a function from state to a set of (state, result) outcomes with explicit error results (Figure 3 for `create()`, Figure 4 for `fsync()`). Inference: a user of this technique should also check that every success and error branch preserves the invariant; the paper does not describe such an audit. The paper notes: “This abstraction allows the AFS to be as simple as possible while comprehensively capturing the behaviour of the various file system operations.”

Verus form: Inference: encode the map and inode records as Rust ghost state, write a `spec fn` returning `bool` for the invariant, and attach `requires`/`ensures` clauses to operation methods. Use `assert` and `assert_by` to preserve link-count and size relations. The exact Isabelle datatypes do not carry over.

## technique 3: asynchronous-write state separation
What it is: separate physical medium state from pending in-memory updates. `afs-state` stores read-only mode, current time, medium map, and an ordered list of update functions. `updated-afs` folds pending updates over the medium to describe immediately visible state. “For the file system correctness specification, this implies that the in-memory file system state and the state of the physical storage medium (afs-map in the AFS) need to be distinguished.”

Steps (Section 3, `afs-update` and `afs-apply-updates-nondet`; reconstruction):
1. Represent each update as `afs-map ⇒ afs-map`.
2. Append a new update to the back of the pending list.
3. Nondeterministically split the list into `to-apply` and `rem` with `t @ r = a-medium-updates afs`, so order is preserved; the number applied may be zero or more.
4. Fold `to-apply` onto the medium map and keep `rem` as the pending list.
5. If `rem` is empty, the operation "must report Success"; otherwise it may succeed or return an error from `{eIO, eNoSpc, eNoMem}`. On error the new update is dropped (`butlast`), "ensuring operations that report an error do not modify the (combined in-memory and on-medium) file system state".

The paper states: “Importantly, this specification requires that no updates get lost when an error occurs: each is either applied (in order), or is still in the list of pending updates (in order).” It also forbids the implementation from reporting an error after it has propagated all updates to disk. Inference: Verus can model the list and fold as ghost state and prove order preservation with sequence lemmas; nondeterministic splitting needs an explicit relation or existential postcondition.

## technique 4: fsync and fault nondeterminism
`fsync()` (Figure 4) returns `eRoFs` if the file system is already read-only; otherwise it applies the first n pending updates, "with n chosen nondeterministically to model the effect of e.g. a disk failure happening part-way through". It succeeds only when the pending list becomes empty; otherwise it returns one of `{eIO, eNoMem, eNoSpc, eOverflow}` and puts the file system in read-only mode when the error is `eIO`. The paper states: “fsync() returns successfully when all updates are applied; otherwise it returns an appropriate error code.” Inference: a Verus proof should quantify over every permitted prefix and prove that the implementation either reaches the success postcondition or establishes the modeled error state.

## evidence, trust, and limits
The paper says the proof, "completed for the fsync() operation", establishes that the BilbyFs implementation refines the AFS; the other operations are not claimed verified. The specification covers 16 VFS operations, and a small C wrapper between the Linux VFS and BilbyFs serialises calls and excludes `rename()` aliasing (Section 5). The paper does not list a trusted computing base; Inference: it includes Isabelle/HOL, the C wrapper, and the unspecified Linux cache interaction, which the AFS "does not specify". The paper explicitly limits the model: “An obvious limitation of the AFS is that, like all other file systems specifications of which we are aware, it supports no form of concurrency.” It also imposes strict update ordering and does not specify mount behavior or post-crash state. Inference: these omissions are direct threats for a Verus product targeting concurrent or crash-tolerant Rust storage; the state-separation and nondeterministic-error techniques remain reusable.

## techniques for the catalog
- shallow nondeterministic monad — model each operation as a set of outcomes and compose with bind and union
- abstract inode invariants — specify VFS-visible maps and preserve root, link, size, and acyclicity conditions
- pending-update state separation — keep medium state and ordered in-memory transformations distinct
- nondeterministic fsync faults — apply an arbitrary update prefix and specify success, error, and read-only outcomes
