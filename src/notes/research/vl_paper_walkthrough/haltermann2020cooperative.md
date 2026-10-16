# Cooperative Verification via Collective Invariant Generation
(authored by agents unless marked 🧑)
Tag: `haltermann2020cooperative`, [paper](http://arxiv.org/abs/2008.04551v1)

## purpose

CoVerCIG lets a master verifier outsource loop-invariant generation to independent helper tools and inject the results back into the master's analysis. The abstract states: “Our framework named CoVerCIG allows a master verification tool to delegate the task of invariant generation to one or several specialized helper invariant generators.” (Abstract, PDF p. 1.) The goal is black-box reuse: helpers run unchanged, while mappers and adapters translate tasks and results.

The paper works with GNU C control-flow automata (CFAs), integer states, and reach-safety properties. A correctness witness is the exchange format. Helpers that already emit witnesses pass through an adapter; a helper such as SeaHorn that returns only a Boolean answer needs an invariant-extraction adapter. The master controls timing, can restart, and may inject witnesses into a running analysis.

## technique 1: master-helper architecture and witness injection

when to use it

Use this when a verifier is incomplete on loops but specialized invariant generators can analyze the same program. It is appropriate for safety properties where an inductive invariant can establish non-reachability.

steps

1. Choose a master analysis, such as k-induction or predicate abstraction, and expose a hook for invariant injection.
2. For every helper, implement a mapper from the CFA and property to the helper's input format.
3. Run the master alone for a configurable `timerM`; then send mapped tasks to helpers in parallel. The default experiment uses 50 seconds for the master and a 300-second helper timeout (Section 5.2, PDF p. 8).
4. Convert helper invariants to standardized correctness witnesses. If a helper emits LLVM-level predicates, map variables and basic blocks back to C locations and build a witness (Example 4.1, PDF p. 7).
5. Validate each witness, inject its invariants into the master's predicate or induction state, and continue or restart according to configuration.
6. Stop after the first valid invariant or wait for several helpers, depending on `terminateAfterFirstInv` and `restartMaster`.

The framework is explicitly decoupled: “The helpers run in parallel as black boxes without cooperation.” (Section 1, PDF p. 2.) Inference: a Verus service could treat independent lemma generators as helpers, serialize candidate `invariant` clauses, and have Verus validate them before adding them to a proof. Verus's verifier is the master; the paper's C witness format and adapters do not carry over directly.

## technique 2: translating helper invariants safely

SeaHorn illustrates the hard case. It solves constrained Horn clauses over LLVM IR and returns no witness. The adapter reads debug information, resolves three-address-code temporaries, identifies the loop basic block, maps the invariant to the C loop head, and emits a correctness witness (Section 4.2, Example 4.1, PDF pp. 6–7). The example invariant is `v1 − v4 − v3 = 0`, corresponding to `n − x − y = 0`.

The paper's validity argument is conditional: an incorrectly translated invariant may reduce performance, but “may however influence the performance only negatively” (Section 5.4, PDF p. 11). This assumes the master validates witnesses before using them. Inference: VL should retain generated Verus lemmas as untrusted suggestions until the compiler checks them; a translation bug must be unable to bypass Verus's proof obligations. A Rust mapping would preserve source spans or stable symbolic names rather than rely on LLVM debug metadata.

## technique 3: combining complementary generators

The helpers use different algorithms: SeaHorn uses constrained Horn clauses and Spacer; UltimateAutomizer uses predicate abstraction, automata, and path-based refinement; VeriAbs is a portfolio of four sequential techniques including fuzzing, array abstraction with bounded model checking, explicit-state model checking, and fixed compositions (Section 4.2, PDF pp. 7–8). Run them in parallel when their strengths cover different loops, but account for shared CPU and timeout costs.

The study evaluates 342 SV-COMP 2020 tasks: loop tasks plus 55 randomly selected tasks from ProductLines, Recursive, Sequentialized, ECA, Floats, and Heap (Section 5.2, PDF p. 8). Runs use three identical eight-core Intel Xeon E5-2695 v4 virtual machines, 16 GB memory, 15 minutes CPU time on eight cores, and 15 GB memory (same section). With k-induction as master, standalone solves 146 tasks correctly; helpers increase totals to 148 (SeaHorn), 158 (UltimateAutomizer), and 163 (VeriAbs). Predicate abstraction rises from 116 to 122, 132, and 125 respectively (Table 3, PDF p. 9). The authors summarize increases of 12% and 14% for the two masters, denominators 146 and 116 (Section 5.3, PDF p. 10).

Two helpers can help predicate abstraction: UltimateAutomizer plus VeriAbs reaches 136 tasks, a 17% increase over its 116-task standalone denominator (Table 6 and Section 5.3, PDF p. 11). All three together solve only 129 predicate-abstraction tasks and 154 k-induction tasks, showing that parallelism and CPU sharing can hurt. Waiting for all helpers also generally fails to pay off. The best master request time is 50 seconds for k-induction; predicate abstraction is insensitive across 50, 100, and 200 seconds (Table 5, PDF p. 10).

## Verus application and limits (inference)

Inference: implement a coordinator that asks multiple agents for loop invariants, stores each proposal as a proof item, invokes Verus validation, and injects only validated facts into the next proof attempt. Use `invariant` clauses and `assert`/lemma proof functions in the Verus form documented by the project. The paper's witness validation protects against bad helper output, but does not prove that the property or C-to-Rust translation is correct. Verus's solver context, ownership model, and source-level contracts differ from CFA witnesses; adapters must preserve semantics, not merely syntax.

## what is proved, trusted, and missing

The evidence is empirical, not a theorem about all programs. It establishes that this implementation improved solved-task counts on the specified 342-task sample under the stated machines and limits. Trust includes CPAchecker, master and helper correctness, adapter and mapper code, SV-COMP benchmark labels, and the external solver. The paper notes helper CPU accounting for SeaHorn is externally measured and rounded, yielding a lower bound for correctly solved tasks (Section 5.4, PDF p. 11). It also notes that tasks were random samples plus loop benchmarks, so results “may not completely carry over to arbitrary real-world programs.” (Section 5.4, PDF p. 11.)

For VL, the product threat is moderate but concrete: agents may produce mutually inconsistent invariants, and an orchestration layer may waste resources or inject a malformed lemma. CoVerCIG already demonstrates black-box collective invariant generation; VL should not redo that architecture as a novelty. A useful adaptation is measuring whether independent LLM proposals improve Verus proof completion, proof time, and repair rate on Rust upgrades, with validated proposals and explicit denominators.

## techniques for the catalog

- master-helper invariant delegation — let a master verifier request loop invariants from unchanged specialized tools
- correctness-witness exchange — serialize, validate, and inject helper invariants through a standard witness format
- source-aware invariant adaptation — map IR variables and blocks back to source locations before witness construction
- parallel complementary portfolios — combine generators with different algorithms while measuring CPU sharing and timeout effects
- timed restart and injection — choose when to request help and whether to restart or augment a running analysis
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
