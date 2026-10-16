# Finding and Analyzing Crash-Consistency Bugs in Persistent-Memory File Systems
(authored by agents unless marked 🧑)
Tag: `leblanc2022finding`, [paper](https://arxiv.org/abs/2204.06066)

## result and target problem

The paper studies crash consistency in persistent-memory (PM) file systems and introduces FLYTRAP. Its abstract states, “FLYTRAP discovered 18 new bugs across four PM file systems; the bugs have been confirmed by developers and many have been already fixed.” (p. 1). PM file systems issue processor stores directly to persistent media, at fine granularity, and commonly make every system call synchronous and durable. Existing block-layer tools therefore miss writes and crash points inside calls (§1, pp. 1–2).

Inference: for VeruLaw, the main lesson is a testing oracle and search strategy for crash-safe systems. FLYTRAP is dynamic bounded testing, not a proof. A verified Rust file system still needs a formal crash model and invariants; this paper identifies the states that testing must include.

## technique: intercept persistence at centralized functions

FLYTRAP avoids instruction-level instrumentation. The authors observed that the four systems use centralized persistence functions, such as a `memcpy` implementation with non-temporal stores. They use Kprobes to intercept those functions and record write I/O without modifying the file system (§1, p. 2). They reduce overhead by tracking only writes explicitly flushed or performed with non-temporal stores, because only those writes can provide crash-consistency guarantees (§1, p. 2).

Apply the method by identifying each target's persistence entry point, installing a probe that records the logical write, and treating each recorded call as one file-system-level write. Do not instrument every processor store unless necessary: the paper says, “Intercepting writes at the function level rather than the instruction level greatly reduces overhead.” (§1, p. 2). Inference: a Verus implementation can expose a single ghost event for each persistence primitive and prove that the concrete primitive's contract emits the event; the probe itself remains trusted test infrastructure.

## technique: enumerate crash states by subsets of in-flight writes

Given a workload, FLYTRAP snapshots the last known persistent state at each point and constructs crash states by choosing which in-flight writes have reached PM. The authors coalesce adjacent 8-byte stores from one intercepted operation where appropriate. They observe that writes to non-overlapping regions commute, so they test subsets rather than all write permutations (§1, p. 2). For `n` in-flight writes before a fence, the exhaustive space is `2^n − 1` non-empty subsets (§5.1.2, p. 11).

The practical search orders subsets by increasing size. Of the 11 bugs requiring a crash inside a system call, 10 were exposed by replaying one write onto the last durable state and one required two writes (§5.1.2, p. 11). The highest observed in-flight count was 20 in some PMFS `write()` calls; exhaustive checking would take about 30 hours. A cap of two replayed writes found every bug in the paper, while a cap of five covered all crash states for most tested calls (§5.1.2, p. 11).

Inference: a Verus crash model can represent a durable ghost map and a set of pending writes. A `proof fn` can enumerate or reason about subsets up to a bound, and an `invariant` can state which durable prefixes are valid after any crash. The subset heuristic is an exploration optimization, not a completeness theorem beyond the chosen cap.

## technique: recovery oracle and workload generation

For each generated workload and target file system, FLYTRAP simulates crashes at candidate points, mounts the target on the resulting PM image, and checks whether recovery satisfies the file-system consistency oracle (§1, p. 1). It requires no file-system modification and works with systems implementing POSIX (§1, p. 1). The workload front ends are complementary: modified ACE systematically enumerates small workloads, while modified Syzkaller generates longer random workloads guided by code coverage (§1, pp. 2–3).

ACE was changed for PM's synchronous calls by removing the need for `fsync()`. Syzkaller was restricted to file-system system calls and was instrumented to include recovery code in coverage (§1, p. 2; §3.4.2, pp. 7–8). The paper reports, “15 of the 18 bugs we found can be found using ACE with at most three operations” (§5.1.2, p. 11). Syzkaller found three bugs ACE missed, but all three were still short workloads (two sequence-2 and one sequence-3); ACE missed them because it omits cases such as unaligned writes for tractable exhaustive enumeration (§5.1.2, p. 11).

Inference: for verified Rust, define a recovery postcondition over a durable-state model and run generated operation sequences through the actual implementation, injecting crashes between persistence events and during calls. The oracle must encode the intended application-visible guarantee, such as atomic rename; a test pass cannot prove that the oracle is complete.

## technique: classify bug causes to guide verification

The study found 18 unique bugs across PMFS, NOVA, NOVA-Fortis, and WineFS. Twelve were already fixed; the two PMFS reports were not confirmed because PMFS is unmaintained (§1, p. 2). The observed bug classes are concrete verification targets:

- 11/18 required a crash in the middle of a system call, so end-of-call-only testing would miss them (§1, p. 2; §5.1.2, p. 11)
- 14/18 were logic mistakes rather than missing or duplicate flushes/fences (§1, p. 2)
- seven bugs involved rebuilding volatile in-DRAM state during mount recovery (§1, p. 2)
- six bugs came from in-place metadata updates (§1, p. 2)
- five NOVA-Fortis bugs came from added replication/checksum resilience features (§5.1.1, p. 10)

The concrete examples matter. NOVA rename removed a directory entry in place while journaling other metadata, so a crash could lose the file. PMFS truncate replay accessed a free-page list before recovery rebuilt it, causing a null dereference (§5.1.1, pp. 9–10). NOVA-Fortis could make a file inaccessible when checksum and replica updates were not atomic (§5.1.1, p. 10).

Inference: a Verus proof plan should make durable metadata, volatile indexes, recovery phases, and optimization shortcuts explicit state-machine components. Each in-place update needs an invariant relating the old and new durable representations; each recovery routine needs a precondition covering every partially persisted state. The bug counts identify priorities but do not measure the probability of future bugs.

## evidence, trust, and limits

FLYTRAP tested four open-source in-kernel PM systems and found 18 bugs. The paper's Table 2 lists 20 numbered entries because bugs 14–15 and 17–18 are shared reports across PMFS/WineFS; the abstract and prose consistently call these 18 unique bugs (§1, p. 2; Table 2, p. 9). The performance cost of fixes was measured on Intel Optane DC PM: journaling more metadata for two NOVA rename bugs made a microbenchmark 25% slower, while a Linux-kernel checkout benchmark had less than 1% overhead; replacing one in-place link-count update with logging made its microbenchmark 7% faster (§5.1.1, p. 10). These percentages have their stated benchmark denominators and are not general system-wide costs.

What is measured is bug discovery, workload/path coverage, and selected fix overhead. What remains trusted is the crash-state construction, persistence interception, recovery oracle, kernel probe behavior, and the assumption that the recorded centralized writes accurately represent PM ordering. The search is bounded; the authors describe FLYTRAP as “in principle, a bounded exhaustive testing ... tool” (§5.2, p. 12), not an unbounded verification method. They also found assumptions from block-based file systems do not carry over: PM needs mid-call crashes, fine-grained writes, and different workload patterns (§5.2, pp. 12–13).

Inference: the threat to a product generating agent-written verified Rust is high for storage and recovery components. The paper shows that logic and recovery errors dominate low-level persistence mistakes, so proving only flush placement is insufficient. VL should reuse the durable-state, crash-point, subset-replay, and recovery-oracle structure; it should not redo this empirical bug corpus as if it were a formal proof.

## techniques for the catalog

- function-level persistence interception — probe centralized PM write functions and record flushed or non-temporal writes
- subset crash-state enumeration — replay increasing-size subsets of in-flight writes onto a durable snapshot
- crash recovery oracle — remount each simulated crash image and check application-visible consistency
- small-workload systematic generation — use ACE to exhaustively explore short operation sequences
- coverage-guided workload fuzzing — use Syzkaller on file-system calls and recovery paths for diverse sequences
- mid-call crash testing — inject crashes inside synchronous system calls rather than only after fsync boundaries
- durable/volatile state classification — target in-place metadata, rebuilt DRAM state, and resilience features as separate proof obligations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
