# IODINE: Verifying Constant-Time Execution of Hardware
(authored by agents unless marked 🧑)
Tag: `gleissenthall2019iodine`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/von-gleissenthall)

## scope and result

IODINE verifies clock-precise constant-time behavior of synchronous Verilog hardware. Its input is a circuit, source and sink annotations, and usage assumptions. Its output is a proof that the time-relevant influence of source values at sinks is independent of operands and allowed concurrent interference. The introduction describes proofs under usage assumptions, rather than unconditional guarantees (paper p. 1411). The tool evaluated seven open-source designs, verified five, and found two timing violations: an FPU division unit and an RSA modular-exponentiation module (Table 1, paper p. 1422).

The scope matters. IODINE assumes “a single, fixed-rate clock” and an attacker with a cycle-precise timer (Section 2.1, p. 1413). It does not claim that information-flow safety alone implies constant time; its property is the sequence of source-influence sets observed at outputs. It also requires user-provided assumptions, so an unsound assumption can produce a false certificate.

## technique 1: influence-set constant-time semantics

Definition. Each value carries the set of clock cycles whose source inputs influenced its computation. The paper says: “The influence set of a value contains all cycles t, such that an input (i.e., a source value) at t was used in its computation” (Section 1, p. 1412). A design is constant-time when all executions satisfying the usage assumptions produce the same influence-set sequence for each sink (Section 1, p. 1412).

How to apply it. (1) Choose source registers, such as an FPU pipeline start (a wire needs an auxiliary register; Section 3.2, paper p. 1417). (2) Choose sink signals, such as the pipeline end. (3) Give each source value an abstract live-cycle tag. (4) Propagate tags through data and control dependencies, respecting immediate blocking updates, buffered nonblocking updates, and continuous assignments. (5) Compare the sequence of tags reaching each sink across two executions. (6) state usage assumptions for equal inputs, reset state, and permitted control flow. These steps follow the paper's definition and its source/sink specification, not a separate algorithm.

Verus form. Inference: encode a finite influence set as a mathematical set or bit vector in a Verus specification and define each hardware transition as a state relation. Prove that each transition's output tags equal the union of its input tags according to the Verilog assignment semantics. A `spec fn` can define the relation; executable Rust can simulate it, while proof functions establish preservation. This is an inference because IODINE's implementation targets Verilog and Haskell.

The limitation is state-space and clock model: the definition presumes synchronous single-clock circuits, and the paper leaves multiple clocks for future work (Section 7, p. 1423).

## technique 2: liveness reduction and relational proof

IODINE avoids directly comparing arbitrary influence sets. It fixes a start cycle t and marks values influenced by that start as t-live. The paper says: “This allows us to reduce the problem of checking equality of influence sets, to checking the equivalence of membership, for their elements” (Section 1, p. 1412). It defines liveness equivalence when, for any two executions and any t, t-live values reach sinks in the same way (Section 1, p. 1412).

Procedure. (1) Check race freedom; a detected race produces a witness. For a race-free circuit, merge left and right copies of each process in lockstep into a per-process product (Section 2.3, paper pp. 1415–1416; Section 5, paper p. 1420). (2) Mark the source value at cycle t live in both copies. (3) Propagate one-bit liveness through the same transition semantics as data. (4) Assert that corresponding sinks receive live values at the same cycles. (5) Discharge the assertion with standard safety verification. The paper summarizes the reduction: “Reducing constant-time execution to the standard problem of checking assertion validity allows us to rely on off-the-shelf, mature verification technology, which explains IODINE’s effectiveness” (Section 1, p. 1412).

The equivalence proof is a formal result in the paper: it proves liveness equivalence equivalent to the original influence-set constant-time definition (Section 4.3, paper pp. 1419–1420). The implementation generates Horn clauses and solves them with liquid-fixpoint wrapping Z3 (Section 6.1, p. 1421).

Verus form. Inference: this is a relational proof, so use a product state containing left and right circuit states and a relation preserving equal liveness at corresponding signals. A loop invariant can state sink liveness equality after every cycle; a `requires` clause records usage assumptions. Verus does not execute SMT Horn clauses as a hardware model, so the circuit transition and the invariant must be encoded explicitly.

## technique 3: assumptions, flushing, and hints

A proof is conditional. Users annotate equal initial registers with `init(xL = xR)` and values that remain equal with `□(xL = xR)` (Section 6.2, p. 1422). The paper explains that these assumptions “specify that the initial state of an input variable x is equal in any pair of runs” and can remove effects from previous executions (Section 6.2, p. 1422). It recommends starting with no assumptions, investigating a reported violation, and adding assumptions incrementally (Section 6.2, p. 1422).

For hard cases, the tool accepts fewer than five user hints in the FPU benchmark: predicates tracking extra equalities between liveness bits within the same run when two runs take different branches but still have equal timing (Section 6.2, p. 1422). Assumption discovery is partly manual. The authors warn that erroneous assumptions may falsely mark a variable-time circuit constant-time (Section 7, paper pp. 1423–1424).

Verus form. Inference: expose assumptions as explicit preconditions and prove the constant-time postcondition only under them. Keep assumptions in a named specification object so callers cannot silently omit or strengthen them. A proof should distinguish equal data, equal control decisions, and flushed state; conflating them changes the security claim.

## technique 4: handling concurrency and diverging control flow

IODINE models Verilog processes as concurrent but synchronized by one clock. Its liveness analysis can accept different control-flow paths when those paths produce equal sink liveness. In the MIPS example, the authors state that after adding an assumption that both runs execute the same instruction sequence, IODINE proves constant time despite pipeline stalls (Section 6.3, p. 1423). For the constant-time FPU, the paper reports that the tool can infer equal influence sets even when the executions take different branches (Section 6.3, p. 1423).

Application steps are: (1) identify shared pipeline state and branch outputs; (2) model each always block's register update; (3) add only usage assumptions justified by the software or hardware contract; (4) let the relational liveness assertion compare the two runs; and (5) investigate a reported violation before adding an assumption. An unsolved assertion may reflect an insufficient invariant rather than a real timing violation; the FPU needed user hints (Sections 5–6, paper pp. 1420–1422). Inference: a Verus model should use a transition function over a state struct and prove a relational invariant after each clock tick; concurrency is represented by simultaneous next-state computation rather than sequential mutation.

## evidence, trusted base, and failures

The evaluation table covers 5,067 lines of Verilog, 94 initial-state assumptions and 33 persistent (`always`) assumptions, 127 in total excluding sources and sinks across seven designs. Check times are 0.705–12.013 seconds per benchmark, totaling 21.163 seconds on an Intel Core i7 with 16 GB RAM (Table 1, paper p. 1422). The table lists MIPS 434 lines/1.329 s, RISC-V 745/1.787 s, SHA-256 651/2.739 s, FPU 1,182/12.013 s, ALU 913/1.595 s, FPU2 272/0.705 s, and RSA 870/1.061 s. The two failures are substantive: FPU division takes a fast path for special operands, and RSA Montgomery multiplication depends on secret exponent bits (Section 6.2, p. 1422).

The trusted computing base includes the IODINE implementation and Z3: “The IODINE implementation and Z3 SMT solver [29] are part of our trusted computing base” (Section 6.1, p. 1421). Translation validation tests compare Verilog-to-Vinter and Vinter-to-Horn translations, but they do not eliminate implementation trust. The evaluated designs are roughly 500–1,000 lines; modern processors with caches, out-of-order execution, and transient execution were not evaluated (Section 7, paper p. 1424).

Inference: the threat to agent-written verified Rust is substantial when code relies on hardware timing or secret-dependent scheduling. IODINE's relational specification suggests a reusable Verus pattern for two-run noninterference, but it does not verify Rust code, compiler lowering, caches, multiple clocks, or the assumptions supplied by users. Existing work on software constant time has already covered straight-line sequential code; VL should avoid redoing that narrow model and instead make hardware and execution assumptions explicit.

## techniques for the catalog

- influence-set semantics — define timing by the source-cycle sets reaching each sink
- liveness reduction — reduce equality of influence sets to a two-run liveness assertion
- assumption and flush annotations — state equal initial state, persistent equalities, and usage conditions explicitly
- relational concurrent verification — compare synchronized executions even when control paths diverge
- translation and SMT checking — compile annotated Verilog to Horn clauses and discharge generated invariants with an SMT solver

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "A program is constant time with respect to A, if all pairs of its traces that satisfy A are constant time."): checked the full paper, quotations, definitions, procedure, numerical results, and references; corrected verification count, race-freedom prerequisite, product construction, dependency semantics, MIPS example, assumption totals, quotations, page references, and paper link; did not check implementation code or rerun experiments.
