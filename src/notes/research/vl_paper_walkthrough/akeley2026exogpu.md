# Exo-GPU: Safe, Imperative, User-schedulable Programming for Tensor Cores
(authored by agents unless marked 🧑)
Tag: `akeley2026exogpu`, [paper](https://doi.org/10.1109/SC.2012.71)

## contribution

Exo-GPU is a low-level GPU language that exposes parallel loops, distributed memory, asynchronous instructions, and synchronization while defining program meaning sequentially. The compiler checks that annotations preserve that meaning. The paper states the core guarantee as “sequential-parallel equivalence—ensuring that the parallel interpretation of a program matches the sequential one.” (Introduction, PDF p. 2.) It extends Exo’s checked scheduling rewrites and adds collective analysis plus an abstract-machine synchronization interpreter.

The authors generated H100 GEMM kernels using wgmma, TMA, and split-k. The abstract says, “The benefit is two-fold: programmers can reason about code without hidden control flow or mutation, while allowing the Exo-GPU compiler to verify sequential-parallel equivalence.” They report over 80% of theoretical peak on large problems, sometimes outperforming cuBLAS (Abstract, p. 1). Measurements used an H100 80GB SXM5, CUDA 12.3, 105 iterations per problem/hardware combination (five warmups and 100 timed), and the mean of the middle 50 samples (Section 6, PDF pp. 18–19).

Inference: The transferable idea for Verus is to make concurrency annotations proof-relevant while proving a simpler sequential specification. Exo-GPU is not Verus and does not provide a Rust implementation.

## technique 1: sequential semantic baseline and equivalence chain

What it is. A program written with `seq` loops is the semantic baseline. `cuda_tasks` and `cuda_threads` only assign iterations to thread collectives; fences, arrives, and awaits describe ordering. Exo verifies equivalence between the original sequential program and the transformed program while ignoring synchronization, then Exo-GPU verifies equivalence between parallel and sequential interpretations (Introduction, PDF p. 2).

How to apply it.
1. Write a simple sequential kernel.
2. Apply Exo checked rewrite rules for tiling, fusion, and memory movement.
3. Add explicit CUDA task/thread loops and memory annotations.
4. Add synchronization for hazards created by asynchronous instructions.
5. Run collective and distributed-memory analyses.
6. Translate to AMIR and execute synchronization checks for concrete control inputs.
7. Generate CUDA only after checks succeed (Sections 2 and 5, pp. 3, 13–18).

Verus form. Inference: keep a pure/spec sequential function as the reference and prove the executable Rust implementation refines it with `ensures`. Model parallel ownership and synchronization as ghost state or a state machine; prove each transition preserves the sequential postcondition. Verus does not have Exo-GPU’s GPU instruction semantics, so PTX and hardware effects remain assumptions unless separately modeled.

Limits. The paper says generated CUDA is based on NVIDIA’s natural-language PTX documentation and “We do not show that our generated code is correct with respect to any formal CUDA semantics.” (Section 8, PDF p. 21.)

## technique 2: explicit parallel loops and distributed memory

GPU IR has `seq`, `cuda_tasks`, and `cuda_threads` loops. A `cuda_threads` unit names the collective shape, such as a warp or one thread. Allocations state precision and memory space, and logical objects may be sharded across thread hierarchy levels. Threads may access only owned shards except through explicit communication (Section 2.1, PDF pp. 3–4).

The distributed-memory analysis runs four steps (Section 4.1, pp. 11–12):
1. Desugar each hardware instruction call into explicit loops with its required collective unit.
2. Run collective analysis and annotate scopes with a collective tiling.
3. Collect an access triple for every data/barrier use: subdivided dimensions, use-site tiling, and index coordinates.
4. Check allocation/access consistency and derive one thread-pitch tuple for all uses.

Programs are rejected when allocation and accesses disagree, the same object is indexed inconsistently, or required CUDA-thread iterators are missing (Section 4.1, p. 12). The motivating example rejects a shared temporary read by another thread unless it is explicitly sharded or communicated (Section 2.1, p. 4).

Verus form. Inference: encode shard ownership as a ghost map from indices to thread IDs and require each access to carry a permission predicate. Use Rust ownership for local memory and ghost permissions/state-machine transitions for shared memory. A Verus proof can check the modeled ownership invariant; it cannot establish that a CUDA intrinsic obeys the modeled collective unless that intrinsic is trusted or specified.

## technique 3: collective tiling analysis

Collective analysis is a forward dataflow analysis that annotates every lexical scope with a collective tiling. A tiling records hierarchical dimensions, thread pitches, and operators over control variables. New tilings arise at device entry, `cuda_threads`, and `CudaWarps`; other statements inherit their parent tiling (Section 4, PDF pp. 10–11).

Application steps are: align parent and statement shapes by hierarchical splits; refine at most one dimension with one operator; compile the tiling to a mapping from control environments to thread sets; attach that mapping to every AMIR statement (Section 4, p. 11). This static map then drives memory analysis, code generation, and AMIR interpretation.

Verus form. Inference: represent the mapping as a `spec fn` from loop indices to a finite set or range of logical thread IDs, and prove injectivity/disjointness where required. Use loop invariants for tiled iteration coverage. Since Verus does not execute GPU warps, the thread set is an abstract model parameter.

## technique 4: abstract-machine synchronization checking

The compiler translates GPU IR to AMIR solely for validation. AMIR records reads and mutations, tracks visibility levels ordered from invisible through atomic-only, unordered, temporally ordered, to fully ordered, and turns fences/arrive/await into visibility updates (Section 5.1, PDF pp. 13–14).

How it is done.
1. Inline windows and CPU-scope subprocedures.
2. Preserve loops/guards and convert assignments into explicit read and write effects.
3. Record each access in a synchronization environment.
4. Translate fences and split barriers into qualitative timeline updates.
5. Insert `CheckReads`, `CheckMutates`, and `CheckBarrier` operations.
6. Interpret AMIR with concrete control-variable values; any missing visibility or mismatched arrive/await count yields an error (Sections 5.2–5.3, pp. 14–18).

The checks are pure: successful checks leave state unchanged; violations reduce execution to an error state (Figure 7, PDF p. 17). The interpreter catches data races, asynchronous hazards, and barrier mismatches before code generation.

Verus form. Inference: model synchronization state as a ghost state machine with transitions for read, mutate, fence, arrive, and await. Prove that every executable access requires a visibility predicate and that barrier counts agree. Use `invariant` clauses on loops and state-machine transition proofs; do not treat `invariant` as a function call. Runtime GPU operations should be represented by trusted transition specifications unless modeled.

Evidence and limits. AMIR synchronization-check runtime is linear in interpreted memory operations; the paper reports approximately 2/16/128 seconds for GEMM sizes 1024/2048/4096 on one laptop CPU (Section 6, PDF p. 19). The approach currently supports only concrete problem sizes and can limit compiler performance (Section 8, p. 21).

## technique 5: explicit synchronization and code generation

`Fence` handles blocking ordering; paired `Arrive`/`Await` handles split barriers and asynchronous operations. Synchronization timelines distinguish full ordering for reads from temporal ordering for writes, allowing fences to be elided when an old value is overwritten without being read (Section 2.1, PDF pp. 4, 9).

Lowering computes the inverse of the thread mapping: each `cuda_threads` loop becomes a CUDA condition over `blockIdx` and `threadIdx`; warp specialization generates one path per warp variable and uses `setmaxnreg` to enforce register requirements (Section 4.2, PDF p. 12). Shared-memory lifetimes are statically assigned offsets, and reuse is allowed only after AMIR proves all accesses retired.

Verus form. Inference: represent a fence as a proof transition that raises visibility in a ghost map; represent an await as requiring a matching arrival count. Executable synchronization calls remain in Rust, while proof functions establish ordering facts. This mirrors Verus concurrency state machines but does not carry over CUDA’s actual memory model automatically.

## evaluation, trust, and product threat

The paper compares TF32 GEMM/GEMV against cuBLAS and reports similar performance for large square GEMM, with Exo-GPU sometimes ahead on unusual sizes; GEMV generally favors cuBLAS (Section 6, PDF p. 19). It does not prove PTX semantics, support Blackwell tcgen05, or support non-CUDA platforms (Section 8, p. 21). Two Hopper GEMM rewrites are marked unsafe because Exo’s dependency checks cannot prove value-sensitive redundancy, although the authors believe the transformations semantically sound (Section 8, p. 21).

Inference: For agent-written verified Rust, the threat is concurrency specifications that omit ownership, visibility, or barrier obligations. Exo-GPU’s sequential baseline and fail-on-check-error design are reusable defenses, but a Verus proof still trusts the modeled hardware API, compiler, solver, and erasure. The paper’s concrete-size interpreter is evidence of bug detection, not a universal proof over all dimensions.

## what VL should not redo

Inference: VL should reuse the sequential-reference pattern, explicit ownership/collective maps, and fail-closed synchronization checks instead of inventing informal concurrency annotations. Remaining gaps include formal CUDA semantics, symbolic sizes, Blackwell support, and value-sensitive rewrite proofs (Section 8, p. 21).

## techniques for the catalog

- sequential-parallel equivalence — prove optimized parallel annotations preserve a sequential semantic baseline
- collective tiling analysis — derive thread mappings from hierarchical loop and warp annotations
- distributed-memory ownership — check allocation, indexing, and thread-shard consistency across all uses
- abstract-machine synchronization — translate accesses and barriers into visibility records and interpret checks
- barrier timeline modeling — use full and temporal ordering to validate fences and split barriers
- fail-on-error code generation — generate CUDA only after collective, memory, and synchronization checks succeed
- equivalence-chain scheduling — compose sequential rewrite proofs with a separate parallel-safety proof
Checked 2026-10-15 against paper akeley2026exogpu: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
