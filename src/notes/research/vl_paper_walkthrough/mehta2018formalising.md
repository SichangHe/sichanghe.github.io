# Formalising Filesystems in the ACL2 Theorem Prover: an Application to FAT32
(authored by agents unless marked 🧑)
Tag: `mehta2018formalising`, [paper](https://doi.org/10.4204/EPTCS.280.2)

## purpose and result
Mehta builds an executable ACL2 model of FAT32 and proves functional read-over-write properties. The paper's overview says, “We also detail the methodology used to build up this type of executable specification through a series of models which incrementally add features of the target filesystem.” (Abstract, p. 18). The method starts with simple abstract models (L1 to L6) that the paper says are "suitable for reuse"; the concrete models M1 (directory tree) and M2 (disk image) "are based upon" them (§3, p. 19). The proved properties are that a write is immediately visible at the same location and does not change reads at another location (Introduction, §1, p. 18; Proof methodology, §5, p. 21).

## technique 1: incremental models and refinement

Use this when a system has complex representation details but a simple abstract behavior can be proved first. The six models are L1 (tree and unbounded file strings), L2 (file length), L3 (fixed-size blocks and unbounded disk), L4 (bounded blocks plus allocation vector and garbage collection), L5 (ownership and permissions), and L6 (FAT file-allocation table) (Program architecture, §3, pp. 19–20). M1 represents a directory tree; M2 is a faithful FAT32 disk image as an ACL2 single-threaded object (stobj).

Steps (Inference, distilled from §3 and §5; the paper does not list numbered steps). (1) Define the simplest executable filesystem model. (2) Add one feature in a new model. (3) Prove read-over-write in the first model. (4) Prove that reads and writes in each new model correspond to operations in the previous model. (5) Reuse the prior model's read-over-write theorem as a corollary. For L4 and L6 the authors prove refinement without stuttering; other models reuse proofs without a formal refinement relation. The paper says, “In each subsequent model, the read-over-write properties are proven as corollaries of equivalence proofs which establish the correctness of read and write operations in the respective model with respect to a previous model.” (Proof methodology, §5, p. 23).

Verus form (Inference). Define an abstract state as a Rust struct or ghost view and a concrete state as the disk/stobj representation. Use `requires` and `ensures` on conversion and operation functions, and prove a lemma that concrete read/write commutes with the abstraction. Verus does not provide ACL2 `defthm`, stobjs, or automatic refinement; ownership and executable arrays remain Rust code, with ghost proof functions establishing correspondence.

Evidence and limits. The paper gives no aggregate theorem count or timing denominator. It explicitly says L1 read-over-write is proved from scratch and later proofs are corollaries. Future work says "the set of system calls is not yet complete and the translation functions between disk images, M2 instances and M1 instances are not yet verified" (Future work, §9, p. 27). Inference: the read-over-write proofs therefore do not yet cover the disk-image level end to end.

## technique 2: read-over-write contracts

The two contracts are ACL2 theorems over `l1-rdchs` and `l1-wrchs`. The first requires a valid filesystem, text, path, start, `n = length(text)`, and a regular file at `path` (`(stringp (l1-stat path fs))`), then proves reading `n` bytes at the same path/start after writing returns `text`. The second requires distinct paths and proves a read at `path1` equals the read before writing `path2` (Proof methodology, §5, pp. 21–23). The paper's theorem names are `l1-read-after-write-1` and `l1-read-after-write-2`, with complete ACL2 forms printed on p. 23.

Apply them step by step (Inference). (1) State a filesystem predicate (`l1-fs-p`, later model predicates). (2) State type and path hypotheses. (3) For same-location writes, set the read length to the text length. (4) For noninterference, require `path1` and `path2` unequal. (5) Compose the two lemmas to reason about multiple writes and reads; the paper prints a composed theorem that writes `text1` at `path1`, then `text2` at `path2`, and reads `text1` back (p. 23).

Verus form (Inference). Express same-location behavior as `ensures rd(path, new_state, start, text.len()) == text`; express noninterference with a precondition `path1 != path2` and a postcondition equating the old and new reads. Use `old(state)` in the postcondition where the pre-state is required, and prove composition in a `proof fn` lemma. The exact ACL2 list predicates and recursive tree functions must be translated to Verus `Seq`, `Map`, or user-defined datatypes; this is design work, not a direct syntax conversion.

## technique 3: invariants for alias and allocation safety

As the model gains auxiliary data, package sanity conditions into one predicate and maintain it across writes. L4 requires that every disk index assigned to a regular file is marked used in the allocation vector and that all assigned indices are distinct (no hardlinks, which FAT32 lacks). The paper says these properties "simplify the verification of read-over-write properties by helping us ensure that write operations do not create an aliasing situation" (Proof and implementation details, §6.1, p. 24). The printed `l4-stricter-fs-p` (p. 25) combines `l4-fs-p`, `boolean-listp`, `no-duplicatesp`, and `indices-marked-p`.

The concrete M2 invariant `compliant-fat32-in-memoryp` additionally checks FAT32 field bounds, minimum sector size, cluster count, and root cluster. It cannot be assumed before the filesystem is initialised by reading a disk image, which is why the paper says an abstract stobj is not straightforward for M2 (§6.1, p. 25). Apply this technique (Inference) by (1) identifying representation invariants, (2) packaging them as one predicate, (3) proving each mutator preserves it after initialization, and (4) weakening or staging the invariant when initialization can violate it.

Verus form (Inference). Use a ghost predicate or a `view` of the filesystem and prove preservation with lemmas after each mutator. Distinct allocation can be represented by a set/map and quantified `forall` facts; array bounds use ordinary `requires`. Initialization should have a separate contract that establishes the invariant before operations requiring it.

## technique 4: allocation refinement and typed definitions

L4 models allocation with a Boolean vector and proves writes succeed iff enough free blocks exist. L6 replaces it with FAT; mapping each nonzero FAT entry to `true` and zero to `false` yields an allocation vector with the same free-space count (§6.2, p. 25). The paper says the L4 invariant effort "need not be replicated for L6". The write-succeeds-iff-enough-free-blocks result is stated in §6.4 (p. 26); the paper says reusing it for the M2 file allocation table "is not straightforward", though L6 allocation and file-reconstruction algorithms and proofs are reusable in M2. The FTY discipline (used in M1) simplifies definitions and eliminates many type hypotheses; the authors say it proves M1 read-over-write properties "with a significantly smaller number of helper lemmas compared to our abstract models in which FTY is not used" (The FTY discipline, §6.3, p. 26), but give no numbers.

Verus form (Inference). Define a pure conversion from FAT entries to a ghost allocation map and prove preservation of occupancy and free-count predicates. Rust enums/structs and `requires` type predicates can provide the FTY-like benefit, but the amount of lemma reduction is unmeasured for Verus.

## technique 5: executable co-simulation

The model is tested against Linux kernel 3.10 FAT32. The authors create images with `mkfs.fat`, compare its verbose field summary with an ACL2 pretty-printer using `diff`, and co-simulate `cp` to test multi-cluster reads and writes (Stobjs and co-simulation, §7, pp. 26–27). The paper states, “This validates our code for constructing an in-memory representation of the disk image and also serves as a regression test during the process of modifying the model to support proofs and filesystem calls.” (§7, p. 26). Inference: these are executable compatibility tests, not a proof covering all disk images. No number of test cases is reported.

Verus form (Inference). Keep co-simulation as an external integration test around a Verus-verified model. The test oracle and Linux implementation remain trusted; Verus proofs cover only the stated model contracts.

## proved, trusted, and product implications

The paper's Conclusion (§8, p. 27) says it "proves read-over-write properties through refinement of a series of models" and "proves the correctness of FAT32's allocation and garbage collection mechanisms".

## techniques for the catalog
- incremental refinement models — add one representation feature at a time and reuse prior proofs
- read-over-write contracts — prove same-location visibility and distinct-location noninterference, then compose them
- packaged invariants — maintain allocation, uniqueness, and on-disk sanity predicates across mutators
- allocation refinement — map FAT entries to a Boolean allocation vector to reuse bounded-disk proofs
- FTY typed definitions — reduce type hypotheses and helper lemmas with ACL2's typed record discipline
- executable co-simulation — compare generated disk images and file operations with Linux implementations
