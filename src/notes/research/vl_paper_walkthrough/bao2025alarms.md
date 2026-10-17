# From Alarms to Real Bugs: Multi-target Multi-step Directed Greybox Fuzzing for Static Analysis Result Verification
(authored by agents unless marked 🧑)
Tag: `bao2025alarms`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/bao-andrew)

## problem and contribution

The paper presents Lyso, a directed greybox fuzzer for checking whether static-analysis alarms can be dynamically triggered. The paper's claim is that static analysis supplies both paths and relationships that ordinary directed fuzzers ignore. It says, “Effective verification of the true positives from false positives is crucial for improving the usability of static analysis tools and bolstering software security.” Lyso handles many alarms at once (inter-target directness) and several ordered milestones for each alarm (intra-target directness). The abstract reports “an average 12.17x speedup” against “eight state-of-the-art (directed) fuzzers” and eighteen new vulnerabilities in real programs (four programs, section 1); these numbers are experimental claims, not guarantees for Verus code. Inference (my arithmetic on the last row of Table 2): 12.17x is the unweighted mean of the seven per-fuzzer average ratios listed there (18.44, 23.74, 13.89, 2.43, 3.04, 7.04, 16.59), so it covers seven fuzzers; the eighth, Parmesan, appears only in appendix A.5 (Table 9) with raw times and no ratio.

The paper models a program as a graph and an alarm as a source-to-sink subpath. Its definition is explicit: “An alarm corresponds to a subpath πa ⊆ π.” The example TIF009 path (a CodeQL null pointer dereference alarm in Magma, simplified by the authors) contains allocation, function calls, branch conditions, setting a variable to null, and the null dereference sink (section 2.1; the alarm definition is on PDF p. 3 and the TIF009 listing on p. 4). This path representation is the input to all later techniques.

## technique: identify critical steps

What it is. Lyso reduces each alarm path to data-flow (DFG) and control-flow (CFG) milestones. DFG milestones are source, vulnerable operation, and sink. CFG milestones are selected call sites that influence reaching the sink. Table 1 gives patterns: integer overflow is allocation → integer assignment → memory access; use-after-free is allocation → free → use; null dereference is allocation → null assignment → dereference. The paper says, “Not all steps in an alarm contribute equally to guiding fuzzing toward the sink.”

When to use it. Use this preprocessing whenever a static analyzer provides a source/sink path or enough source, operation, and sink information to reconstruct one. For an alarm type absent from Table 1, the authors say generalized rules identify only source and sink (section 4.1, PDF p. 6). CFG calls are preferred to branch conditions, and at most five call sites nearest the sink are kept.

How to do it.

1. Obtain each alarm's source, vulnerable operation, sink, and promising path from CodeQL or another analyzer. The vulnerable operation is classified using CodeQL rules (section 4.1).
2. Add the source, operation, and sink as DFG steps. For TIF009 these are lines L3, L19, and L42 (section 4.1).
3. Find call sites that directly influence control flow toward the sink; select the five closest to the sink, or all available if fewer than five (section 4.1).
4. Preserve the ordered step sequence for runtime matching. The paper's TIF009 sequence is printed as “<L3, allocation (source)>” through “<L42, null pointer dereference (sink)>” (section 2.1).

Verus form (Inference: the paper is a C/C++ fuzzer, not a Verus verifier). Treat an alarm path as a specification over a Rust function: source is an input or allocation state, vulnerable operation is a state transition, and sink is the postcondition-relevant operation. Use `requires` for path preconditions and `ensures` for the safety result; use `assert` and proof functions to establish intermediate facts. Verus has no dynamic CFG-step tracker, so the ordered milestones would be represented by ghost state or a sequence in a proof function, while executable Rust remains unchanged. This checks logical reachability only when the modeled path is actually covered by the proof; it does not replace fuzzing of parser or environment behavior.

Evidence and limits. In the benchmark, the authors used five CFG and three DFG steps as their empirical default. Section 8.3 states, “In Lyso, five CFG steps and three DFG steps were empirically chosen as the optimal balance between providing effective guidance and minimizing overhead.” They also state that “incorporating more steps increases search overhead, potentially leading to diminishing returns” and that the ideal balance “may vary depending on the program complexity, the nature of the alarms, and the underlying static analysis tool.” The ablation in section 7.4 supports the default: Lyso beat Lyso-1 (sink only) by 1.92x and Lyso-15 (all steps, capped at 15) by 1.40x overall, but Lyso-1 was slightly better on OpenSSL, where all bugs are reached within 100 seconds. Lyso-dfg-2 (sink plus vulnerable operation) beat Lyso-cfg-2 (sink plus one call site) by 10.86%. The paper calls the optimal number of steps “an open research question”; it is an empirical choice, not a theorem.

## technique: identify interdependent alarms

What it is. Two alarms are interdependent when their DFG steps share a function. Lyso counts shared functions as the overlap metric. The paper deliberately compares coarse function context rather than every path node because “Fine-grained comparisons ... may fail to capture correlations due to minor variations” (section 4.1). Note the paper describes overlap two ways: section 4.1 quantifies it by counting shared functions across the DFG steps of two alarms, while Definition 1 (section 5.1) defines a seed's overlap as the number of interdependent alarms it covers.

How to do it. Extract each alarm's source, operation, and sink functions; compute the set intersection for every alarm pair; mark a pair interdependent if the intersection is nonempty; for a seed, count interdependent alarms for which at least one step was executed. This is the paper's Definition 1, “The overlap of a seed refers to the number of interdependent alarms covered for at least one step by the execution of the seed during fuzzing.”

Verus form (Inference). Group proof obligations sharing a helper function or state predicate, then prioritize lemmas that establish facts used by several obligations. A Rust/Verus implementation can use shared `spec fn` predicates and `ensures` clauses, but overlap is a planning metric external to the verifier; Verus will not discover groups automatically.

Evidence and limits. Section 3.1 (PDF p. 4) says the Magma analysis “reveals that 31% of true alarms are interdependent”; section 7.3 says Lyso identifies 31% of targets as interdependent (Figure 6a) and that 10 of 14 tiffcp targets form three interdependent groups. That denominator is Magma's true alarms (targets); it is not the fraction of all alarms or a Verus benchmark. Inference: the criterion cannot link alarms that share a root cause but no DFG-step function.

## technique: selective step instrumentation and static reachability

What it is. Lyso instruments only basic blocks that can reach critical steps. Algorithm 1 builds an interprocedural CFG (ICFG), performs reverse DFS from each alarm's final step to its first, unions the reachable blocks, assigns integer IDs, and inserts instrumentation at compilation. The paper says, “Lyso selectively instruments only those basic blocks associated with critical steps.”

How to do it.

1. Build the ICFG, including indirect calls through type-based analysis (sections 4.2–4.3).
2. For every alarm, run `reverse_dfs` from `[s1,…,sk]` and union the returned blocks (Algorithm 1).
3. Assign each reachable block a static integer ID and instrument the binary (section 4.2).
4. At runtime, record IDs and compare the execution trace with each alarm's ordered steps.
5. Precompute shortest distances for all basic-block pairs and store them in a hash map for O(1) lookup (section 4.3).

Verus form (Inference). There is no Verus binary instrumentation API in the cited Verus materials. Keep instrumentation in an unverified harness and expose only ghost observations to proofs; do not put `external_body` on the function being verified. A proof can reason about a finite state trace represented by a `Seq`, but the trace collector itself remains trusted.

Evidence and limits. Lyso was implemented on AFL v2.57b with approximately 5,000 added lines (section 6, PDF p. 10): 1,644 lines of C/C++ for the ICFG and indirect-call and reachability analysis on LLVM 11.0.0, 414 lines of C/C++ for code coverage instrumentation, 159 lines of C for step instrumentation and trace tracking, about 1,500 lines of C in afl-fuzz.c for seed selection and power scheduling, 694 lines of Python, 137 lines of C++ for distance calculation, and 530 lines of Python to convert static analysis reports into step sequences. Appendix A.4 reports that step instrumentation gives an average 2.86x speed improvement over full instrumentation, and that Lyso executes 2.52x more test cases than Titan and 19% more than FishFuzz, but SelectFuzz and AFLGo execute 1.37x and 1.12x more than Lyso because they have no trace tracking. Appendix A.2 notes that indirect calls lead to “incomplete CG edges and imprecise distance calculation”; Lyso uses type-based analysis against this. I found no soundness argument for the reachability inference in the paper.

## technique: overlap, depth, and distance seed metrics

What they are. Overlap counts interdependent alarms reached by a seed. Depth is “the maximum number of consecutive steps covered for any alarm by the execution of the seed during fuzzing.” Distance is the shortest precomputed CFG distance from the suffix trace after the last matched step to the next unexplored step (Definitions 1–3, section 5.1).

How to apply them. During each execution, match the trace against each alarm's ordered critical steps, record the last matched point, split the trace into prefix and suffix, and compute the minimum basic-block distance from the suffix to the next step. Because the coverage bitmap does not preserve order, Lyso replays the execution with recording delayed until the last matched point, so that only the suffix trace is stored in the bitmap (section 5.3.2). Store overlap and depth with the seed. In inter-target exploration, retain seeds that increase code or step coverage and favor overlap. In intra-target exploration, choose an alarm with few associated seeds, rank its seeds by depth then distance, and mutate the highest-ranked seeds (section 5.2.1).

Verus form (Inference). Depth and distance can guide generation of candidate inputs for a verified API, but they are not proof constructs. The corresponding proof structure is a sequence of lemmas establishing each state transition, with `assert` at each milestone and a final `ensures`; a failed milestone is a failed proof obligation rather than a fuzzing seed.

Evidence and limits. The implementation switches between inter-target and intra-target phases using a 10-minute window or when no seed is favored by code coverage (section 5.2); I found no sensitivity study of the 10-minute value. Inference: the distance assumes that static basic-block distance predicts useful input progress, and indirect calls and data-dependent behavior can violate that assumption. Appendix A.5 gives a case where this matters: Parmesan, which uses taint analysis, found PNG006 and XML003 two orders of magnitude faster than Lyso's random mutation (Table 9).

## technique: density power scheduling

What it is. For alarm A, seed density is the number of seeds covering a step of A divided by the number covering any alarm. The intra-target power schedule gives a seed power proportional to density times the total number of alarms, and the text says seeds of low-density alarms “should receive more mutations”. Inference: as printed, ρs = MA/MN grows with the number of seeds covering A, so the formula p̂(s) = ρs · N would give more energy to dense alarms, which seems opposite to the stated intent; I could not resolve this from the paper. The paper defines, “For a given alarm A, the density of a seed s is defined as the ratio of the total number of seeds whose execution paths cover at least one step associated with A ... to the total number of seeds whose execution paths cover at least one step associated with any alarm.”

How to do it. Maintain per-alarm seed counts; compute ρ for each seed; set `p̂(s) = ρs · N`; mutate each selected seed for that energy. The ordinary inter-target phase uses AFL's default schedule; density scheduling is used during intra-target exploitation (section 5.2.2).

Verus form (Inference). Use this only as an external workload policy for generating proof candidates. Ablation (section 7.4): Lyso beat Lyso-ss (power scheduling disabled) by 1.32x and Lyso-ps (seed scheduling disabled) by 4.34x, so the paper concludes seed scheduling matters more than power scheduling. It has no soundness effect. A verified build should prove the resulting candidate's properties independently, regardless of how many attempts the scheduler allocated.

## technique: two-phase fuzzing loop

Algorithm 2 repeatedly performs inter-target exploration, selects an alarm from a heat table, and performs intra-target exploration. Inter-target `cull_queue` keeps code-top and step-top seeds; intra-target `choose_alarm` favors alarms with fewer associated seeds, then `rank_queue` orders by depth and distance. Each seed is mutated, executed, and retained if `save_if_interesting` reports new code or step coverage (section 5.2). This is a reproducible control policy rather than a proof of bug absence.

## techniques for the catalog

- critical-step extraction: reduce static-analysis paths to source, vulnerable operation, sink, and selected control-flow call sites
- alarm interdependence: group alarms sharing DFG-step functions and reward seeds covering multiple groups
- selective instrumentation: reverse-search an ICFG from critical steps and instrument only reachable basic blocks
- multi-target metrics: rank seeds with overlap, consecutive-step depth, and distance to the next step
- density scheduling: per the paper's stated intent, allocate more mutation energy to alarms represented by fewer seeds (the printed formula may point the other way)
- two-phase exploration: alternate broad inter-target discovery with focused intra-target exploitation
