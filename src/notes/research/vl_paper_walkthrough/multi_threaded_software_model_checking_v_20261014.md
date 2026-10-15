# Multi-Threaded Software Model Checking via Parallel Trace Abstraction Refinement
(authored by agents unless marked 🧑)
Tag: `barth2025multithreaded`, [paper](http://arxiv.org/abs/2509.13699v2)

## scope and result

This paper parallelizes trace abstraction, an automata-based software model-checking algorithm for safety properties. Its implementation in Ultimate Automizer analyzes different syntactic paths in parallel, while a coordinator performs path selection and abstraction refinement. The paper’s headline claim is that “our approach analyzes different traces (syntactic program paths) that could violate the safety property in parallel” (abstract, p. 1).

The evaluation uses Ultimate Automizer 0.3.0-474959ed, four parallel configurations with 1, 2, 4, and 6 workers, the sequential SV-COMP configuration, and DSS. It runs all 14,560 sequential-C, `unreach-call` tasks from SV-COMP 2025: 11,158 property-adhering and 3,402 property-violating tasks (Section 4.1, p. 10). Runs have 8 CPU cores, 15 minutes, and 30 GB memory on an Intel Xeon E3-1230 v5 machine (Section 4.1, p. 10).

## technique 1: sequential trace abstraction and CEGAR

what it is and when to use it

A program automaton accepts syntactic traces that reach an error location. A trace is a sequence of assignments and assumptions over integer variables. The current abstraction automaton A contains paths whose semantic feasibility has not been checked (Sections 2.1–2.2, pp. 3–4). Use this method for safety properties expressible as unreachability of error locations.

how to do it

1. initialize A with the program automaton AP
2. if L(A) is empty, return SAFE
3. select a trace π from L(A), using breadth-first search
4. construct an SSA formula φπ for π and call an SMT solver
5. if φπ is SAT, return UNSAFE because π is a feasible error path
6. if φπ is UNSAT, derive interpolants and build an interpolant automaton Aπ accepting π and paths with the same infeasibility reason
7. refine by computing A := A \ Aπ and repeat (Algorithm 1, p. 4; Section 2.2, pp. 4–5)

The paper’s NotZero example illustrates formulas. For the else path `!(x > 0), !(x > −10), !(x != 0)`, it checks `¬(x0 > 0)∧¬(x0 > −10)∧¬(x0 ̸= 0)`; for the then path it checks `x0 > 0 ∧ x1 = −x0 ∧ ¬(x1 ̸= 0)` (Section 2.2, p. 5). An interpolant automaton stores assertions on states and removes related infeasible paths.

Verus form

Inference: represent the Rust safety condition as a `requires`/`ensures` contract and use a loop `invariant` for the abstraction’s inductive facts. Feasibility of a candidate path corresponds to a Verus proof obligation; an UNSAT result corresponds to proving the path condition impossible. Interpolant automata are not a native Verus construct, so an external CEGAR engine would synthesize lemmas or invariants that are then encoded as Verus proof functions. The model checker’s C/SSA semantics do not automatically transfer to Rust ownership, unsafe code, or library contracts.

Evidence and limits

Trace abstraction is sound when interpolant automata accept only semantically infeasible traces. The paper’s algorithm assumes an automaton representation of all syntactic error paths and an SMT solver able to decide each path formula. It reasons about safety, not functional postconditions or liveness.

## technique 2: coordinator-worker parallel refinement

what it is and when to use it

The authors observe that path feasibility checking and interpolant generation do not depend on the newest abstraction, while applying refinements does. “The update of the abstraction in line 8 aggregates the results of the different iterations and therefore, should not be done in parallel” (Section 3.1, p. 6). Use parallel refinement when those checks dominate runtime and the machine has multiple cores.

how to do it

1. initialize A=AP and an empty assigned-trace set Sπex
2. while idle workers and unassigned traces in L(A) exist, select a trace π, add it to Sπex, and submit `(π,A)` to a worker
3. each worker runs `checkSAT(φπ)`; on UNSAT it builds Aπ, and on SAT it publishes an empty-language automaton plus the SAT result
4. the coordinator waits for at least one result, then processes all available results
5. on SAT, return UNSAFE; on UNSAT, update A := A \ Aπ
6. stop with SAFE when L(A) becomes empty (Algorithms 2–3, pp. 6–7)

The coordinator is the only component that selects paths, checks termination, and mutates the global abstraction. The evaluation summarizes this trend as “Effectiveness typically increases when the number of workers increases” (Section 4.2, p. 11). Workers may use stale copies of A; this is sound because stale A accepts more paths, though it can cause unnecessary work (Section 3.1, p. 6). A fixed Java thread pool and `CompletionService` implement asynchronous submission and result retrieval without busy waiting (Section 3.4, pp. 9–10).

Verus form

Inference: this maps to parallel ghost execution of independent proof obligations, followed by a serialized update of a shared abstraction or lemma set. Rust threads would require ownership-safe channels or a Verus state-machine model; shared mutable proof state cannot be copied casually. Keep the coordinator’s global invariant in one proof context and merge worker-produced lemmas only after checking their preconditions. The paper’s stale-automaton argument is an inference about C trace sets, not a proof about arbitrary Rust heap states.

Evidence and limits

The paper explicitly accepts memory-expensive stale copies because sequential trace abstraction more often times out than runs out of memory (Section 3.1, p. 6). Parallelism can analyze redundant traces, and result order can change the abstraction and later search. Thus speed and even solved-task counts are scheduling-sensitive.

## technique 3: diverse trace selection

what it is and when to use it

Selecting merely distinct traces can still duplicate the same infeasibility reason. Algorithm 4 recursively searches A for a trace that diverges early from traces already assigned but not yet known infeasible (Section 3.3, pp. 8–9). Use it when workers are available and diversity may expose independent interpolants.

how to do it

1. start at q0 with empty prefix ε and relevant assigned set Sπex∩L(A)
2. if no relevant trace shares the prefix, return the shortest accepting continuation
3. list outgoing transitions and sort them by the number of previously selected continuations of the prefix plus that transition
4. dequeue the least-used transition first
5. skip a transition that recreates a selected trace; otherwise recurse on its successor and restricted relevant set
6. backtrack when no new trace is reachable; the algorithm returns a new trace whenever one exists outside the selected set (Algorithm 4, p. 8)

The implementation first uses breadth-first search in each dispatch phase to preserve comparability with sequential trace abstraction, then uses the diverse search. It limits this search to five seconds; a timeout is treated as failed non-emptiness search, which remains sound because that check is not used to determine the final result (Section 3.4, p. 10).

Verus form

Inference: use this as an external scheduler for independently generated proof obligations. A Verus proof can validate each selected obligation, but cannot by itself establish that a heuristic maximizes “different reasons.” Record the selected trace identity and coordinator state as ghost data if reproducibility matters.

## technique 4: measured parallel configurations

Effectiveness is reported in Table 1 as counts, not percentages. On all 14,560 tasks, SEQ-UA reports 1,128 correct alarms and 3,377 correct proofs; PAR-1-UA 1,140 and 3,695; PAR-2-UA 1,241 and 3,747; PAR-4-UA 1,243 and 3,860; PAR-6-UA 1,245 and 3,858. Incorrect alarms are 0 for SEQ, PAR-1, PAR-2, and PAR-4, and 1 for PAR-6; all five have 0 incorrect proofs (Table 1, p. 11). The denominator for each count is the 14,560-task benchmark, while solved subsets differ by configuration.

For commonly solved tasks, the response-time comparison contains 5,036 tasks for PAR-2, 5,178 for PAR-4, and 5,203 for PAR-6 (Section 4.3, p. 12). PAR-2 is faster on 2,369 of 4,787 commonly solved tasks (49%); PAR-4 on 2,002 of 4,760 (43%); PAR-6 on 1,619 of 4,735 (34%). The paper reports speedups greater than 3 for 67 tasks with PAR-2, greater than 5 for 42 with PAR-4, and greater than 7 for 31 with PAR-6 (Section 4.3, p. 13). These percentages use the stated commonly solved denominators, not all 14,560 tasks.

Against DSS, the comparison restricts to 1,395 tasks correctly solved by both PAR-6-UA and DSS. DSS is faster on 915 of 1,395 (66%), by 7.1 seconds median; the paper attributes about 4.7 seconds to PAR-6-UA startup overhead (Section 4.4, p. 14). PAR-6 solves many more tasks and has fewer incorrect reports in Table 1, but it is not faster on this restricted subset.

## what is proved, trusted, and risky for VL

The paper establishes the algorithmic soundness argument for stale abstractions and reports empirical effectiveness and wall time. It does not prove that its Java implementation is bug-free: the authors state that the sole incorrect PAR-6 alarm may come from reused Ultimate Automizer functionality. Threats include benchmark representativeness, resource limits, scheduling, and one observed incorrect result (Section 4.5, p. 15).

Inference: for VeruLaw, the directly reusable idea is coordinator-controlled parallel proof-obligation scheduling with serialized invariant updates. It could shorten verifier turnaround when agents produce many independent lemmas or path cases. The main threat is race-sensitive orchestration around shared proof state, plus stale assumptions about heap ownership and external libraries. VL should not redo generic C trace abstraction; existing Ultimate Automizer already implements it. A useful adaptation would measure verified Rust proof latency, repair success, and reproducibility under fixed worker schedules while checking every merged lemma in Verus.

## techniques for the catalog

- CEGAR trace abstraction: enumerate error traces, decide path feasibility with SMT, and remove infeasible languages using interpolant automata
- coordinator-worker refinement: run expensive feasibility/interpolant work in parallel and serialize abstraction subtraction
- stale-abstraction scheduling: permit older abstraction copies because they add redundant work but do not invalidate infeasibility results
- diverse trace search: recursively prioritize transitions with fewer previously selected continuations
- bounded non-emptiness search: cap heuristic trace search at five seconds while preserving sound final-result logic
- Verus adaptation: parallelize independent proof obligations, then merge checked lemmas through a coordinator-owned invariant

Checked 2026-10-15 against the paper by a Codex agent for multi_threaded_software_model_checking_v_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
