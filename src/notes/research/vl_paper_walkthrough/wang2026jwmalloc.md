# jwmalloc: A Verified Memory Allocator for Mobile Devices
(authored by agents unless marked 🧑)
Tag: `wang2026jwmalloc`, [paper](https://www.usenix.org/conference/osdi26/presentation/wang-jiawei)

## scope and result
jwmalloc is a mobile allocator with a uniform slab frontend, size-class-exact backend, lifetime-based reclamation, a non-blocking interface, and bounded verification under weak memory models. Its correctness target includes memory safety, no data races, loop termination, and functional allocator properties. The authors state, “We employed bounded formal verification of jwmalloc’s functional correctness (e.g., no memory corruption) and general properties (e.g., its memory safety, absence of data races, loop termination) under weak memory models (WMMs) [6,60] using the VSync toolchain [72].” (section 1, p. 2516).

## technique: bounded weak-memory verification

What it is. VSync explores all weak-memory executions of bounded multithreaded client programs and checks assertions plus generic properties. The paper contrasts this with ordinary testing: “unlike testing, all weak-memory executions of the library on the test cases are explored” (section 5, p. 2524). The paper motivates WMM checking by noting that RefinedC and Verus “reason only under sequential consistency” and that mobile hardware is dominated by architectures like ARM that implement weak memory models (section 5, p. 2524).

How to apply it.
1. Treat each allocator component as a library with a standard API; the test cases act as functional specifications by means of assertions (section 5, p. 2524).
2. Decouple frontend, midend, and backend behind malloc/free-style interfaces; verify components both in isolation and in combination (section 5, p. 2524).
3. Build specialized multi-threaded clients for edge cases: for the frontend, cross-thread frees, on-demand draining, periodic draining, and thread creation and destruction; the paper also uses a client targeting the backend (section 5, p. 2524).
4. Have each client thread invoke the relevant API operations a bounded number of times; shrink constants, e.g., the backend bitmap from 64 to 2 entries, without changing the code logic (section 5, p. 2524).
5. Run VSync to explore all weak-memory executions and check memory safety, absence of data races, and loop termination on each execution (section 5, p. 2524).
6. Engineer clients to balance verification time and coverage; the paper states that corner cases not covered by tests are not verified (section 5, p. 2524). Inference: larger configurations than the shrunk ones are also outside the evidence.

Verus form. Inference: Verus can prove sequential Rust contracts and atomic invariants, but the paper says Verus reasons only under sequential consistency while VSync handles WMMs. A Verus-based product would therefore need either VSync integration for atomics or a separate verified wrapper around each atomic operation. Use `requires`/`ensures`, `invariant`, `decreases`, and tracked atomic invariants where supported; do not claim a Verus proof alone covers weak-memory executions.

Evidence and limits. Verification of each client completes within 10 minutes, and it uncovered a previously unknown bug in the backend's closed sibling tree: for the root node, which has no siblings, the metadata-shifting design assumed a sibling exists on one code path, causing out-of-bounds reads in the data area and a crash only when the data area contains specific values; a backend client exposed it in roughly ten seconds, reported as an access to uninitialized memory (section 5, p. 2524). Inference: this evidence has a denominator of bounded client executions, not all allocator executions.

## technique: modular verification by interface substitution

The paper verifies components independently: each of frontend, midend, and backend exports a malloc/free-style interface and, during verification, is treated as a conventional C library rather than an allocator. For example, the frontend obtains slabs via backend_malloc in production, but during verification uses the system allocator's standard malloc, which the verifier treats as a standard library with verification deliberately skipped (section 5, p. 2524). Inference: the steps are define a stable API, isolate each component, verify component-specific clients, then verify selected compositions; the Rust analogue is a trait or spec interface with an `external_body` only for a dependency whose behavior is separately trusted, while the function under verification remains verified. This avoids making the allocator's whole implementation one monolithic proof.

## technique: closed sibling tree and multi-step split

What it is. The backend maintains only ranges in the resolution-R size-class set `S(R) = { n × 2^m | m, n ∈ N, 1 ≤ n ≤ 2^R }` (Definition 1, p. 2523). A resolution-R closed sibling tree requires every node weight to be in S(R), every parent weight to equal the sum of its children, and every contiguous sibling sum to be in S(R) (Definition 2, p. 2523); a node's weight is its number of OS pages. This makes subdivision and coalescing produce only size-class sizes. The paper states the algorithm's postcondition as “the subtree is a resolution-R closed sibling tree; some node has weight Y” (Algorithm 1, p. 2523).

How to apply it.
1. Write source weight X as `n1 × 2^m1` with the largest valid `n1`, and target Y as `n2 × 2^m2` with the smallest valid `n2` (Algorithm 1, p. 2523).
2. If `m1 ≤ m2` and X ≠ Y, split directly into Y and X−Y; if `m1 > m2`, choose `Z = ceil(Y/2^m1) × 2^m1`, split X into Z and X−Z, and recurse on Z (Algorithm 1, p. 2523). Example: X = 64, Y = 6, R = 3 gives Z = 8, then 8 splits into 6 and 2, leaving a contiguous 56-page range (section 4.2.2, p. 2523).
3. On free, coalesce contiguous siblings under the same parent; once all children of a node are coalesced, the parent becomes eligible to merge with its own siblings (section 4.2.2, p. 2523).
4. Inference: prove that every split and coalesce preserves Definition 2.

Verus form. Inference: encode `S(R)` and the closed-tree condition as `spec fn`s over a sequence/map of nodes; use `invariant` on split/coalesce loops and `decreases` on the remaining subtree depth or weight. Prove postconditions with lemmas, and keep the address arithmetic in `usize` bounds proofs. The paper's atomics and VSync weak-memory checks do not transfer automatically.

## technique: ownership transfer with rollback

What it is. A range is co-owned by Nest (search structure) and Knit (tree). Since the two ownerships cannot be acquired or released atomically, operations follow a staged protocol with rollback (Fig. 11). `acq_self` acquires Nest ownership then Knit ownership; if Knit fails, it rolls back the Nest acquire and retries a bounded number of times at the same size, then falls back to a larger range. `rel` first releases Nest ownership; if that fails, it defers the range; if the later Knit release fails, it rolls back the Nest release and defers the range (section 4.2.3, p. 2523).

How to apply it.
1. Acquire Nest, then Knit; if Knit fails, undo Nest and retry a bounded number of times at the same size.
2. If retries fail, choose a larger range so the path remains non-blocking.
3. For sibling coalescing, acquire Knit then Nest; release Knit if Nest fails.
4. For release, release Nest first (defer on failure); on Knit failure, roll back the Nest release and put the range on the deferred list.
5. Drain deferred ranges in the asynchronous reclamation thread or synchronously when a `nest_acq` fails to find a suitable range; draining re-invokes place() on all deferred ranges (section 4.2.3, p. 2523).

Knit packs the states of all siblings under one parent into a single atomic variable and updates a range's state by compare-and-swap (section 4.2.3, p. 2523). Inference: in Rust, model the staged state transitions with an enum and prove rollback lemmas for every failure branch. Atomic compare-and-swap and memory ordering require a WMM-aware checker in addition to ordinary Verus invariants.

## technique: lifetime-based reclamation and non-blocking fallback

The two-buffer lifetime tracker emulates old and young generations in garbage collectors; memory neighboring long-lived ranges is reclaimed first, giving short-lived ranges time to be freed and coalesced with their neighbors (section 1, p. 2516). A range starts a countdown once it has no mergeable siblings; if a sibling is freed and coalesces with it before the timer expires, the countdown is reset (section 3.3, pp. 2520–2521). The reclamation thread drains slabs from destroyed threads, places deferred ranges, swaps the buffers, performs a futex wait with a 500ms timeout (possibly woken early by synchronous reclamation), then applies `madvise` to standby ranges and moves them to the unmapped Nest (section 4.2.4, pp. 2523–2524).

The non-blocking interface turns rare but catastrophic blocking into brief and far less harmful memory waste: each size class first consults a bounded concurrent bitmap, falls back to a locked list, and if acquiring the lock fails, an allocation obtains a larger range from another size class while a free pushes its range onto a concurrent list for later completion (section 3.4, p. 2521). Inference: the proof obligation is a termination bound plus a capacity invariant; a Verus loop should use an explicit `decreases` counter and prove that deferred memory is eventually drained under the scheduler assumptions. The paper gives no Verus code listing.

## techniques for the catalog
- bounded weak-memory checking: explore every weak-memory execution of bounded, specialized clients and check generic safety and termination properties
- interface-substitution verification: verify allocator components behind standard APIs with dependencies replaced by library abstractions
- closed sibling tree: maintain a size-class-closed range tree so every split and contiguous coalescing result is usable
- multi-step split: recursively choose valid intermediate weights to obtain a target class without invalid fragments
- ownership rollback: stage co-ownership acquisition and undo the first step on second-step failure
- lifetime reclamation: use a two-buffer tracker and reclaim neighbors of long-lived ranges first so short-lived neighbors can coalesce
- non-blocking fallback: bound retries and allocate a larger range when contention persists
