# Towards Faster Reasoners By Using Transparent Huge Pages
(authored by agents unless marked 🧑)
Tag: `fichte2020reasoners`, [paper](http://arxiv.org/abs/2004.14378v1)

## what the paper measures

Fichte, Manthey, Stecklina, and Schidler reduce address-translation overhead in memory-heavy automated reasoners by modifying glibc to advise Linux to use transparent huge pages (THP). The target workload is conflict-driven no-good/clause learning, especially unit propagation, whose clause and watch-list accesses are irregular. The abstract claims “an approach to reduce the runtime of AR tools by 10% on average and up to 20% for long running tasks.” (Abstract, p. 1) The experiments cover SAT, ASP, software and hardware model checking, MaxSAT, MUS, and SMT-related backends.

This is an engineering technique, not a new verification logic. The paper's evidence is benchmark runtime and sampled TLB misses. It does not prove that a solver returns the same answer under THP; semantic equivalence is assumed because only allocation and page backing change. The relevant trusted components are the Linux kernel's THP implementation, glibc patch, compiler/linker, and benchmark methodology.

## technique 1: identify TLB misses in unit propagation

what it is

Measure where address-translation misses occur before changing memory management. The authors focus on the two-watched-literal unit-propagation loop: unpredictable accesses to watch lists and clauses create a large working set.

when to use it

Use this diagnosis for a reasoner whose runtime and memory footprint are dominated by irregular pointer or clause accesses. It is less useful for small-footprint tools or workloads whose bottleneck is CPU computation rather than memory translation.

how to do it

1. Represent unit propagation with a pending literal list `P`, watch lists `L`, formula `F`, and assignment `τ`; process each watch list and either move a watch, extend the assignment, or trigger conflict analysis (Listing 1, p. 4).
2. Sample CPU performance counters for TLB misses with `perf` (footnote 3, p. 5).
3. Attribute misses to propagation phases and compare MiniSat and Glucose. The paper reports, “When running MiniSat [16], we observe that 90% of TLB misses occur in unit propagation; thereof, about 10% when moving clause to another (unpredictable) watch list and about 80% when accessing the first literal of the next watched clause.” (Section 3.1, p. 5)
4. Use the distribution to target page translation rather than rewriting solver data structures.

Verus form (inference)

Inference: this is a deployment and measurement technique around Verus's verifier, not a Verus proof construct. Profile verifier runs with OS performance counters, separate solver time from Rust execution, and only then enable THP for the verifier process. No Verus specification changes are required.

evidence and limits

The 90% figure is for MiniSat's sampled TLB misses; Glucose also has 90% in unit propagation, split into 5% binary propagation, 20% learned-clause minimisation, and the majority in larger-clause propagation (Section 3.1, p. 5). These are two solver observations, not a universal law for all reasoners.

## technique 2: align allocations and advise THP

what it is

Request 2 MiB transparent huge pages with Linux `madvise(MADV_HUGEPAGE)` and align every allocation to a 2 MiB boundary, increasing the reservation so the kernel can back it with whole huge pages.

when to use it

Use it on Linux workloads with large, long-lived allocations and irregular accesses. THP is opportunistic: Linux falls back to standard pages when huge pages are unavailable, and compaction/scanning can add overhead (Section 2.3, p. 3).

how to do it

1. Configure Linux THP as opt-in rather than globally forcing it; the paper notes that an application can mark eligible regions with `madvise` and the kernel then tries to allocate a large page on first access (Section 2.3, p. 3).
2. On each allocation, call `madvise` with the huge-page flag.
3. Round the start address to 2 MiB and enlarge the reservation. The paper states, “Then, we align all requested memory to 2M addresses and increase the size of the reservation accordingly, so that huge pages can actually be used.” (Section 4.1, p. 6)
4. Keep the fallback path for unavailable huge pages and measure both runtime and TLB misses.

Verus form (inference)

Inference: use this as a host configuration for the Verus/Z3 process. Verus code remains ordinary Rust with its existing `requires`, `ensures`, `invariant`, and `proof fn` constructs. The only relevant proof obligation is operational reproducibility: record the solver and kernel configuration when comparing verification times.

evidence and limits

THP reduces TLB entries because 2 MiB pages cover 512 times the bytes of 4 KiB pages, but the paper warns that compaction can affect reproducibility (Section 2.4, p. 3). It does not isolate the cost of alignment from the cost of THP advice.

## technique 3: patch glibc for transparent per-process activation

what it is

Put allocation advice and alignment inside a modified glibc so solver source code remains unchanged. Activate the feature with an environment variable for one process, avoiding global system changes.

how to do it

1. Patch glibc allocation functions to apply the alignment and `madvise` policy (Section 4.2, p. 6).
2. Gate the behavior on `GLIBC_THP_ALWAYS=1`; otherwise use ordinary allocation. The paper says, “The additional cost, compared to glibc, is a single if-statement.” (Section 4.2, p. 6)
3. Build the patched library in a Docker environment, statically link a solver against it, and run the solver with the flag enabled (Section 4.3, pp. 6–7).
4. Alternatively patch and dynamically link against a system glibc, but the authors prefer the container because replacing system glibc has side effects and needs superuser permissions (Section 4.3, p. 6).

Verus form (inference)

Inference: package the Verus toolchain and solver in a container with the patched allocator, then compare verifier runs with and without the environment flag. This affects performance only; it cannot establish functional correctness or solver soundness. Keep a normal glibc fallback for environments where static linking or THP is unavailable.

evidence and limits

The approach was implemented in glibc 2.23 and requires recompiling and linking the solver, but no solver source modifications (Section 4.2, p. 6). The paper's repository and precompiled tools are external artifacts; their integrity is outside the paper's formal trust argument.

## technique 4: benchmark speed and TLB effects with denominators

what it is

Compare identical solver instances with THP disabled (`n`) and enabled (`thp`), report solved-instance counts, hours, saved-runtime percentage, and TLB misses, and use a second machine for non-SAT reasoners.

how to do it

1. For SAT, use the listed solver versions and competition/tuning benchmarks; run on RHEL 7.4, two 12-core Xeon E5-2680v3 CPUs, one thread, 8 GB per instance, and a 900-second timeout (Section 5.2, p. 8).
2. In Table 2, count only instances solved by both configurations; compute `s = 100 − (tn/tthp × 100)` and `rtlb = TLBthp/TLBn × 100` (Table 2, p. 7).
3. For other reasoners, use the second environment (Core i5-2520M, Ubuntu 16.04/Linux 4.15, 5 GB, 900 seconds), and again show only instances also solved without THP (Section 5.3, p. 8).
4. Attribute differences to memory footprint where possible. Table 3 reports median footprints of 8.8 MB for CBMC, 28.8 MB for ASP, 123.3 MB for SAT, 164 MB for HWMC, and 298.1 MB for MUS (Section 5.3, p. 9).

Verus form (inference)

Inference: apply the same paired-run protocol to Verus verification suites, keeping source, model, timeout, solver version, CPU governor, and denominator fixed. Report proof-success counts and wall time separately; THP can speed solver calls but does not change the number of verified functions unless timeout limits do.

evidence, numbers, and inconsistency

Table 2's denominator is each solver's instances solved by both configurations: Glucose 189 instances (4.58 h non-THP, 3.72 h THP, 18.70% saved); Lingeling 177 (6.18 h, 5.91 h, 4.76%); Winner19 194 (7.46 h, 6.24 h, 16.67%); MergeSat 176 (7.31 h, 6.22 h, 14.53%); MiniSat 170 (7.26 h, 6.09 h, 15.97%). The associated TLB ratios range from 1% to 4.50% of the non-THP count (Table 2, p. 7). Table 3, with the same solved-without-THP denominator, reports MiniSat 8.17→7.03 h (13.99%), MergeSat 7.94→6.90 h (13.13%), clasp 3.66→3.29 h (10.18%), open-wbo 1.19→1.09 h (8.49%), muser2 4.18→3.97 h (5.16%), aigbmc 0.89→0.86 h (4.11%), and CBMC 0.23→0.22 h (2.76%) (Table 3, p. 9). The abstract says up to 20% for long tasks, while the conclusion says “Our experiments confirmed that an application save 25% runtime on certain instances and on average more than 10%.” (Section 6, p. 9); these summaries use different maxima/averages and are not reconciled.

## what remains trusted and what VL should do

The measurements support a systems optimisation for memory-intensive reasoners; they do not prove that THP is beneficial on every Verus workload. Inference: VL should first profile solver TLB misses and memory footprints, then test a per-process THP-enabled verifier container. Existing work supplies allocator-level optimisation, so VL should not spend effort rewriting solver algorithms before measuring the same bottleneck. Inference: the product threat is operational—THP can vary with kernel memory pressure, page availability, and compaction, making verification latency less predictable; it does not weaken the logical proof if the solver and kernel remain correct.

## techniques for the catalog

- TLB-guided profiling — sample solver TLB misses and identify unit propagation or other memory phases that dominate translation overhead
- aligned transparent huge pages — advise 2 MiB THP and align allocations so Linux can back regions with whole huge pages
- patched glibc activation — hide allocation changes in glibc and enable them per process with `GLIBC_THP_ALWAYS=1`
- paired benchmark accounting — compare identical solved-instance denominators and report runtime, TLB counts, memory footprint, and timeout settings

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
