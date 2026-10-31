# Finding and Analyzing Crash-Consistency Bugs in Persistent-Memory File Systems
(authored by agents unless marked 🧑)
Tag: `leblanc2022finding`, [paper](https://arxiv.org/abs/2204.06066)

## result and target problem

The paper studies crash consistency in persistent-memory (PM) file systems and introduces FLYTRAP. Its abstract states, “FLYTRAP discovered 18 new bugs across four PM file systems; the bugs have been confirmed by developers and many have been already fixed.” (p. 1). PM file systems issue processor stores directly to persistent media, at fine granularity, and commonly make every system call synchronous and durable. Existing block-layer tools therefore miss writes and crash points inside calls (§1, pp. 1–2).

## technique: intercept persistence at centralized functions

FLYTRAP avoids instruction-level instrumentation. The authors observed that the four systems use centralized persistence functions, such as a `memcpy` implementation with non-temporal stores. They use Kprobes to intercept those functions and record write I/O without modifying the file system (§1, p. 2). Every tested file system offered four such functions: non-temporal memcpy, non-temporal memset, cache line flush, and store fence; the file-system developer must annotate them for FLYTRAP, and the only code change is preventing the compiler from inlining them (§3.2, p. 5; §3.3, p. 6). They reduce overhead by tracking only writes explicitly flushed or performed with non-temporal stores, because only those writes can provide crash-consistency guarantees (§1, p. 2).

Apply the method by identifying each target's persistence entry point, installing a probe that records the logical write, and treating each recorded call as one file-system-level write. Do not instrument every processor store unless necessary: the paper says, “Intercepting writes at the function level rather than the instruction level greatly reduces overhead.” (§1, p. 2). Inference: a Verus implementation can expose a single ghost event for each persistence primitive and prove that the concrete primitive's contract emits the event; the probe itself remains trusted test infrastructure.

## technique: enumerate crash states by subsets of in-flight writes

Given a workload, FLYTRAP walks the write log, keeps writes not yet flushed in an in-flight vector, and constructs crash states by choosing which in-flight writes have reached PM (§3.3, p. 6). Because it sees a whole file-system-level write at once, it can coalesce individual 8-byte stores when appropriate. The paper observes that the order in which non-overlapping in-flight writes persist does not matter (writes to the same cache line stay ordered on x86), so it tests subsets rather than all permutations (§1, p. 2; §3.2, p. 5). For `n` in-flight writes before a fence, the paper states there are `2^n − 1` crash states (§3.3, p. 6; §5.1.2, p. 11).

The practical search enumerates crash states in increasing order of subset size (§5.1.2, pp. 11–12). Of the 11 bugs requiring a crash inside a system call, 10 were exposed by replaying one write onto the last known-persistent state and one required two writes (§5.1.2, p. 11). The highest observed in-flight count was 20 in some PMFS `write()` calls; exhaustive checking would take about 30 hours. A cap of two replayed writes is enough to find all bugs in the paper, while a cap of five is sufficient to check all crash states for most system calls (§5.1.2, p. 12). The Syzkaller runs used a cap of two (§4.1, p. 8).

Inference: a Verus crash model can represent a durable ghost map and a set of pending writes. A `proof fn` can enumerate or reason about subsets up to a bound, and an `invariant` can state which durable prefixes are valid after any crash. The subset heuristic is an exploration optimization, not a completeness theorem beyond the chosen cap.

## technique: recovery oracle and workload generation

For each generated workload and target file system, FLYTRAP simulates crashes at candidate points, mounts the target on the resulting PM image, and checks whether recovery satisfies the file-system consistency oracle (§1, p. 1). It needs no modification of the file-system implementation beyond the persistence-function annotations above and works with PM file systems implementing the POSIX interface (§1, p. 1; §3.3, p. 6). Its two workload front ends are called complementary (§5.2, p. 12): modified ACE systematically enumerates small workloads, while modified Syzkaller generates longer random workloads guided by code coverage (§1, pp. 2–3).

ACE was changed for PM's synchronous calls by removing the need for `fsync()`. Syzkaller was restricted to file-system system calls and was instrumented to include recovery code in coverage (§1, p. 2; §3.4.2, p. 7). The paper reports, “15 of the 18 bugs we found in PM file systems can be found using ACE with at most three operations” (§5.1.2, p. 11). Syzkaller found three bugs ACE missed, but all three were still short workloads (two sequence-2 and one sequence-3); ACE missed them because it omits cases such as unaligned writes for tractable exhaustive enumeration (§5.1.2, p. 11).

Inference: for verified Rust, define a recovery postcondition over a durable-state model and run generated operation sequences through the actual implementation, injecting crashes between persistence events and during calls. The oracle must encode the intended application-visible guarantee, such as atomic rename; a test pass cannot prove that the oracle is complete.

## technique: classify bug causes to guide verification

The study found 18 unique bugs across PMFS, NOVA, NOVA-Fortis, and WineFS. The paper says, “all except the two bugs in PMFS (which is not actively maintained) have been confirmed by their developers, and 12 have already been fixed” (§1, p. 2). The observed bug classes are concrete verification targets:

- 11/18 required a crash in the middle of a system call, so end-of-call-only testing would miss them (§1, p. 2; §5.1.2, p. 11)
- 14/18 were logic mistakes rather than missing or duplicate flushes/fences (§1, p. 2)
- seven bugs involved rebuilding volatile in-DRAM state during mount recovery (§1, p. 2; Table 3, p. 11; note §5.1.1, p. 10 says “8 of the 18 bugs”, so the paper's own count is inconsistent)
- six bugs came from in-place metadata updates (§1, p. 2; §5.1.1, p. 9)
- five bugs were attributed to NOVA-Fortis's added resilience features (replication and checksums) (§1, p. 2; §5.1.1, p. 11); Table 2 lists only four NOVA-Fortis bugs (9–12), and Table 3 counts bugs 2, 9–12

The concrete examples matter. NOVA rename removed a directory entry in place while journaling other metadata, so a crash could lose the file. PMFS truncate replay accessed a free-page list before recovery rebuilt it, causing a null pointer dereference (bug 13; §5.1.1, p. 10). NOVA-Fortis checksum validation could fail, rendering a file inaccessible, even though the file system was consistent and data intact, because data and metadata modifications were not atomic with checksum and replica updates (§5.1.1, p. 11).

Inference: a Verus proof plan should make durable metadata, volatile indexes, recovery phases, and optimization shortcuts explicit state-machine components. Each in-place update needs an invariant relating the old and new durable representations; each recovery routine needs a precondition covering every partially persisted state. The bug counts identify priorities but do not measure the probability of future bugs.

## evidence, trust, and limits

FLYTRAP tested four open-source in-kernel PM systems and found 18 bugs. The paper's Table 2 numbers 20 entries because the two bugs found in both PMFS and WineFS (rows “14 & 15” and “17 & 18”) are numbered once per file system; the paper counts 18 unique bugs and says “for a total of 20 bugs” when counting both (§1, p. 2; §4.3, p. 9; Table 2, p. 10). The per-system counts are 8 NOVA, 4 NOVA-Fortis, 2 PMFS, 2 WineFS, and 2 in both. The performance cost of fixes was measured on Intel Optane DC PM: journaling more metadata for two NOVA rename bugs made a microbenchmark 25% slower, while a Linux-kernel checkout benchmark had less than 1% overhead; replacing the in-place update in `link` (bug 6's fix) with extra logging made a link-creation microbenchmark 7% faster (§5.1.1, p. 10). These percentages are benchmark-specific, not general system-wide costs.

What is measured is bug discovery, time to find bugs for ACE versus Syzkaller (§4.2, p. 8), and selected fix overhead. The paper states its own limits (§3.5, p. 7): it does not explore all workloads or crash states, tracks only flushed writes (a never-flushed write is invisible), treats cache line flushes as atomic with respect to crashes, does not check concurrent workloads, assumes deterministic file-system operations, and requires centralized persistence functions. Inference: the results therefore also depend on the crash-state construction, kernel probe behavior, and recovery oracle being correct. The search is bounded; the authors describe FLYTRAP as “in principle, a bounded exhaustive testing ... tool” (§5.2, p. 12), not an unbounded verification method. They also report that most assumptions about file-system crash consistency do not carry across to PM, which requires exploring many more crash states, including crashes in the middle of system calls, and that fuzzing invalidated assumptions such as the significance of unaligned writes and per-CPU code paths (§5.2, p. 12).

## techniques for the catalog

- function-level persistence interception — probe centralized PM write functions and record flushed or non-temporal writes
- subset crash-state enumeration — replay increasing-size subsets of in-flight writes onto a durable snapshot
- crash recovery oracle — remount each simulated crash image and check application-visible consistency
- small-workload systematic generation — use ACE to exhaustively explore short operation sequences
- coverage-guided workload fuzzing — use Syzkaller on file-system calls and recovery paths for diverse sequences
- mid-call crash testing — inject crashes inside synchronous system calls rather than only after fsync boundaries
- durable/volatile state classification — target in-place metadata, rebuilt DRAM state, and resilience features as separate proof obligations
