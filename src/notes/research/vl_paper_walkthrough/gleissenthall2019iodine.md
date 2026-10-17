# IODINE: Verifying Constant-Time Execution of Hardware
(authored by agents unless marked 🧑)
Tag: `gleissenthall2019iodine`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/von-gleissenthall)

## scope and result

IODINE verifies clock-precise constant-time behavior of synchronous Verilog hardware. Its input is a circuit, source and sink annotations, and usage assumptions. When verification succeeds, it outputs invariants proving that all executions satisfying the assumptions have the same sequence of source-influence sets at each sink. A failed verification can indicate timing variability or insufficient proof predicates (Sections 5–6.1, pp. 1420–1421). The introduction describes proofs under usage assumptions, rather than unconditional guarantees (paper p. 1411). The tool evaluated seven open-source designs, verified five, and found two timing violations: an FPU division unit and an RSA modular-exponentiation module (Table 1, paper p. 1422).

The scope matters. IODINE assumes “a single, fixed-rate clock” and an attacker with a cycle-precise timer (Section 2.1, p. 1413). It does not claim that information-flow safety alone implies constant time; its property is the sequence of source-influence sets observed at outputs. It also requires user-provided assumptions, so an erroneous assumption can cause the tool to mark a variable-time circuit constant-time (Section 7, pp. 1423–1424).

## technique 1: influence-set constant-time semantics

Definition. Each value carries the set of clock cycles whose source inputs influenced its computation. The paper says: “The influence set of a value contains all cycles t, such that an input (i.e., a source value) at t was used in its computation.” (Section 1, p. 1412). A design is constant-time when all executions satisfying the usage assumptions produce the same influence-set sequence for each sink (Section 1, p. 1412).

How to apply the definition. (1) Choose source and sink registers; a wire needs an auxiliary register (Section 3.2, p. 1417). (2) State initial and persistent usage assumptions. (3) Begin with empty influence sets. At each new cycle, clear wires' influence sets and set each source's influence set to the singleton containing that cycle. (4) Propagate influence sets through data and control dependencies, respecting blocking updates, deferred nonblocking updates, and continuous assignments; retain a register's influence set until an assignment changes it. (5) Require corresponding sinks to have equal influence sets at every cycle in every pair of executions satisfying the assumptions (Sections 2.1 and 3–4, pp. 1414–1419). These are the definition's obligations; the implementation checks the equivalent liveness property below.

Verus form. Inference: represent influence sets as mathematical sets of cycle numbers and define hardware transitions as a specification relation. Model expression influences as unions and include the effects of control dependencies, source updates, and assignment scheduling. Proof functions would establish the relation between these sets and the modeled execution. This is a proposed encoding; IODINE does not implement or evaluate it.

The definition presumes synchronous single-clock circuits, and the paper leaves multiple clocks for future work (Section 7, p. 1423).

## technique 2: liveness reduction and relational proof

IODINE avoids directly comparing arbitrary influence sets. It fixes a start cycle t and marks values influenced by that start as t-live. The paper says: “This allows us to reduce the problem of checking equality of influence sets, to checking the equivalence of membership, for their elements.” (Section 1, p. 1412). It defines liveness equivalence when, for any two executions and any t, t-live values reach sinks in the same way (Section 1, p. 1412).

Procedure. (1) Check race freedom; a detected race produces a witness. For a race-free circuit, merge left and right copies of each process in lockstep into a per-process product (Section 2.3, pp. 1416–1417; Section 5, p. 1420). (2) Begin with all liveness bits dead. At the start of an arbitrary cycle t, mark sources live and other variables dead. At other cycle starts, reset sources and wires to dead. (3) Propagate one-bit liveness through data and control dependencies, using disjunction and the assignment scheduling rules. (4) Assert equality of corresponding sinks' liveness at every cycle, for all choices of t and all pairs of executions satisfying the assumptions. (5) Generate Horn constraints for reachable product states satisfying those assumptions and constraints for liveness equivalence. Solve the reachability constraints and check whether that solution satisfies the liveness constraints (Section 5, p. 1420). The paper summarizes the reduction: “Reducing constant-time execution to the standard problem of checking assertion validity allows us to rely on off-the-shelf, mature verification technology, which explains IODINE’s effectiveness.” (Section 1, p. 1412).

The equivalence proof is a formal result in the paper: it proves liveness equivalence equivalent to the original influence-set constant-time definition (Section 4.3, paper pp. 1419–1420). The solver, Liquid Fixpoint, computes the strongest solution expressible using its predicate set. Base predicates compare corresponding values and liveness bits across runs; users can supply additional predicates (Section 5, p. 1420). The implementation uses liquid-fixpoint wrapping Z3 (Section 6.1, p. 1421).

Verus form. Inference: use a product state containing left and right circuit states. An inductive invariant would imply equal sink liveness after every cycle, with auxiliary facts as needed; preconditions would record usage assumptions. The circuit transition and invariant would need explicit encodings.

## technique 3: assumptions, flushing, and hints

A proof is conditional. Users annotate equal initial registers with `init(xL = xR)` and values that remain equal with `□(xL = xR)` (Section 6.2, p. 1422). The paper explains that these assumptions “specify that the initial state of an input variable x is equal in any pair of runs” and can remove effects from previous executions (Section 6.2, p. 1422). The authors report: “In all cases, we start with no assumptions and add the assumptions incrementally by manually investigating the constant-time “violation” flagged by IODINE.” (Section 6.2, p. 1422).

For the FPU benchmark, the authors supplied fewer than five user hints: predicates tracking extra equalities between liveness bits within the same run when two runs take different branches but still have equal timing (Section 6.2, p. 1422). Assumption discovery is partly manual. The authors warn that erroneous assumptions may falsely mark a variable-time circuit constant-time (Section 7, paper pp. 1423–1424).

Verus form. Inference: expose assumptions as explicit preconditions and prove the constant-time postcondition only under them. Keep assumptions in a named specification object so callers cannot silently omit or strengthen them. A proof should distinguish equal data, equal control decisions, and flushed state; conflating them changes the security claim.

## technique 4: handling concurrency and diverging control flow

IODINE models Verilog processes as concurrent but synchronized by one clock. Its liveness analysis can accept different control-flow paths when those paths produce equal sink liveness. In the MIPS example, the authors state that after adding an assumption that both runs execute the same instruction sequence, IODINE proves constant time despite pipeline stalls (Section 6.3, p. 1423). For the constant-time FPU, the paper reports that the tool can infer equal influence sets even when the executions take different branches (Section 6.3, p. 1423).

Inference: to apply this approach in Verus, identify shared pipeline state, model each process's updates and Verilog assignment scheduling, state justified usage assumptions, and prove a relational invariant after each clock tick. Investigate a failed proof before strengthening assumptions: insufficient predicates can prevent verification, as the FPU's need for hints illustrates (Sections 5–6, pp. 1420–1422).

## evidence, trusted base, and failures

The evaluation table covers 5,067 lines of Verilog, 94 initial-state assumptions and 33 persistent (`always`) assumptions, 127 in total excluding sources and sinks across seven designs. Check times are 0.705–12.013 seconds per benchmark, totaling 21.163 seconds on an Intel Core i7 with 16 GB RAM (Table 1, paper p. 1422). The table lists MIPS 434 lines/1.329 s, RISC-V 745/1.787 s, SHA-256 651/2.739 s, FPU 1,182/12.013 s, ALU 913/1.595 s, FPU2 272/0.705 s, and RSA 870/1.061 s. The two failures are substantive: FPU division takes a fast path for special operands, and RSA Montgomery multiplication depends on secret exponent bits (Section 6.2, p. 1422).

The trusted computing base includes the IODINE implementation and Z3: “The IODINE implementation and Z3 SMT solver [29] are part of our trusted computing base.” (Section 6.1, p. 1421). The authors test the Verilog-to-Vinter translation against Verilog, the Vinter-to-Horn translation against the semantics, and generated invariants against both Vinter and Verilog (Section 6.1, p. 1421). These tests do not eliminate implementation trust. The evaluated designs span 272–1,182 lines (Table 1); larger processors with advanced memory hierarchies, out-of-order execution, and transient execution were not evaluated (Section 7, p. 1424).

Inference: a proof about Rust's functional behavior alone would not establish hardware timing independence. IODINE suggests a two-run proof pattern for timing, conditional on an explicit hardware model and usage assumptions. Its results do not validate a Rust encoding or compiler lowering. Multiple clocks, validation of user assumptions, and evaluation of larger processors remain future work in this paper (Section 7, pp. 1423–1424).

## techniques for the catalog

- influence-set semantics — define timing by the source-cycle sets reaching each sink
- liveness reduction — reduce equality of influence sets to a two-run liveness assertion
- assumption and flush annotations — state equal initial state, persistent equalities, and usage conditions explicitly
- relational concurrent verification — compare synchronized executions even when control paths diverge
- translation and SMT checking — compile annotated Verilog to Horn constraints, infer invariants, and check sink liveness equality
