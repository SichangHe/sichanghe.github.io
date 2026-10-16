# A verified information-flow architecture
(authored by agents unless marked 🧑)
Tag: `amorim2014verified`, [paper](https://arxiv.org/abs/1509.06503)

## purpose and result

The supplied paper is the March 2016 extended version of the POPL 2014 work (Section 1, PDF p. 5); the existing tag retains the original publication year. It formalizes a simplified SAFE architecture for dynamically enforcing information-flow control (IFC) in machine code. Every integer carries a label from a lattice; a generic concrete machine caches policy decisions and invokes a verified software fault handler on cache misses. The paper’s abstract machine proves termination-insensitive noninterference (TINI), and refinement transfers that result to the concrete machine. The authors summarize the goal as: “Our second contribution is a machine-checked proof that this simplified SAFE system is correct and secure, in the sense that user code running on the concrete machine equipped with the IFC fault handler behaves the same way as on the abstract machine and enjoys the standard noninterference property that ‘high inputs do not influence low outputs.’” (Section 1, PDF p. 5).

The model is deliberately simplified: integer values and pointers are not initially distinguished, and the concrete hardware is represented by a generic tagged rule cache. The formalization is in Coq and is available at the project repository named in Section 1.

## technique 1: abstract dynamic IFC machine

When to use it: use this as the executable policy specification against which lower-level implementations are refined.

Steps from Section 3 (PDF pp. 7–9):

1. Choose an IFC lattice with partial order `≤`, join `∨`, and bottom `⊥`.
2. Label every integer and the program counter (PC) with a lattice element; represent an atom as `n @ L`.
3. Define machine state as data memory, stack, and labeled PC.
4. On `Add`, label the result with the join of operand labels.
5. On `Jump` and `Bnz`, join the tested/target label into the next PC label to track implicit flow.
6. On `Store`, join pointer, value, and PC labels and enforce the no-sensitive-upgrade condition `L1 ∨ Lpc ≤ L3` before writing a location labeled `L3`.
7. On `Output`, label the emitted value with its original label joined with the current PC label.
8. Use structured `Call`/`Ret` to restore the caller’s PC label and avoid unnecessary label creep.

The paper says: “The rule for Add joins (∨) the labels of the two operands to produce the label of the result, which ensures that the result is at least as classified as each of the operands.” (Section 3, PDF p. 8). It also states: “This check prevents memory locations labeled public from being overwritten when either the PC or the pointer through which the store happens has been influenced by secrets.” (Section 3, PDF p. 8).

Verus form (Inference): model the machine state as a Verus state machine; make the label lattice and join operations `spec fn`s, and state each instruction transition with `requires` for policy checks and `ensures` for labels and memory. Prove a two-run low-equivalence invariant for TINI. The paper’s machine is an abstract semantics; Rust implementation details such as integer width, memory layout, and unsafe pointer behavior require additional contracts.

Evidence: The paper proves TINI for the abstract machine in Theorem 10.5 using unwinding conditions (Theorem 10.3). The property is termination-insensitive: traces are truncated to the common length, so termination differences are not observed (Definition 10.2, PDF p. 25).

## technique 2: symbolic rule-table DSL

When to use it: use a rule table to separate policy design from the CPU and to support policies other than the paper’s built-in IFC.

Steps from Section 4 (PDF pp. 9–11):

1. Factor IFC checks out of instruction semantics into a judgment parameterized by a table `R`.
2. For every opcode, define a Boolean allow expression, a label expression for the next PC, and a label expression for the result.
3. Use DSL variables `LABpc`, `LAB1`, `LAB2`, `LAB3`, constant `BOT`, lattice join `⊔`, and flows-to `⊑`.
4. At each instruction step, evaluate the table rule on the current labels. If allow is false, block; otherwise assign the resulting labels.
5. Prove the selected table implements the abstract machine. This proof is independent of the code-generation infrastructure.

The paper says: “We define a small DSL for describing symbolic IFC rules and obtain actual monitors by interpreting this DSL (in this section) and by compiling it into machine instructions using verified structured code generators.” (Section 4, PDF p. 9). The abstract rule table `Rabs` gives `store LAB1 ⊔ LABpc ⊑ LAB3`, `add` result `LAB1 ⊔ LAB2`, and `output` result `LAB1 ⊔ LABpc` (Figure 4, PDF p. 10).

Verus form (Inference): represent policy rules as an enum or immutable table and write a verified evaluator `spec fn eval_rule`. An executable evaluator can be verified against it with `ensures`; policy-specific lemmas prove that `eval_rule(Rabs)` equals the abstract transition. Verus does not compile a DSL to machine code automatically, so that compiler is a separate proof obligation.

Evidence: Lemma 9.2 proves the symbolic rule machine instantiated with `Rabs` refines the abstract machine. This isolates policy correctness from handler compilation.

## technique 3: generic rule cache and fault handler

When to use it: use this architecture when hardware should remain policy-generic while software interprets a rich policy on cache misses.

Steps from Sections 5–7 (PDF pp. 11–19):

1. On dispatch, form a cache input tuple `(opcode, PC tag, argument tags)`.
2. If a cache entry matches, use its output tags to execute the instruction.
3. On a miss, enter kernel mode and run generated fault-handler code.
4. `genComputeResults` compares the opcode against all opcodes and recursively evaluates the DSL rule.
5. `genStoreResults` writes result tags to the cache if allowed; otherwise it pushes false without changing the cache.
6. The final generated conditional returns to user mode on success or jumps to `-1` on policy violation.
7. Encode abstract labels as concrete tags through `Tag`/`Lab` and provide verified generators for bottom, join, and flows-to.

The paper says: “The hardware is generic and the interpretation of policies (e.g., IFC, memory safety or control flow integrity [9, 35]) is programmed in software, with the results cached in hardware for common-case efficiency.” (Section 1, PDF p. 4). The top-level generator is explicitly `genFaultHandler R = genComputeResults R ++ genStoreResults ++ genIf [Ret] [Push (-1); Jump]` (Figure 10, PDF p. 17).

Verus form (Inference): model the cache as ghost state plus executable entries, and prove cache consistency as an invariant. Verify each Rust generator function against a symbolic instruction-sequence specification. A `proof fn` can establish the generated code’s semantics; it must be erased and never called at runtime. Hardware cache behavior remains an assumption unless modeled and verified.

Evidence: Lemma 7.1 proves that an allowed symbolic rule produces the expected encoded tags and returns to user mode. Lemma 7.2 proves a disallowed rule halts at PC `-1`. The custom Hoare logic has self-contained and escaping-code triples; deterministic execution makes these total-correctness triples, which the paper says is essential for termination in the two lemmas (Section 7, PDF p. 18).

## technique 4: bidirectional refinement and TINI transfer

When to use it: use refinement when a concrete implementation is too detailed for direct security proof.

Steps from Sections 8–10 (PDF pp. 20–28):

1. Define state and event matching relations between abstract, symbolic, and concrete machines, including label-to-tag conversion.
2. Prove non-faulting concrete steps match one symbolic step (Lemma 9.5).
3. Prove a faulting concrete step followed by handler return preserves the match with the same symbolic state; the restarted instruction then matches a symbolic step (Lemma 9.6); a handler that does not return cannot emit output.
4. Compose symbolic-to-abstract and concrete-to-symbolic relations to obtain concrete-to-abstract refinement (Theorem 9.8).
5. Prove inverse refinement so every abstract behavior is represented by the concrete machine (Theorem 9.9), ruling out a concrete implementation that merely diverges.
6. Prove TINI for the abstract machine with state indistinguishability and unwinding conditions; use preservation under deterministic refinement to conclude concrete TINI (Theorem 10.8).

The paper states: “In our deterministic setting, showing refinement in both directions guarantees that the concrete machine does not diverge or get stuck when handling a fault.” (Section 1, PDF p. 5). The TINI definition quantifies over indistinguishable initial inputs and executions and compares filtered output traces (Definition 10.2, PDF p. 25).

Verus form (Inference): use two state-machine proofs: one forward simulation from concrete to abstract and one backward/inverse simulation. The simulation relation should include memory, stack, cache consistency, and tag decoding. Then prove low-equivalence preservation as a separate lemma. Verus supports transition-system invariants, but its relation must be encoded explicitly; the paper’s Coq generic-machine definitions do not transfer syntactically.

Evidence: Theorems 9.8 and 9.9 establish both trace directions; Theorem 10.8 (PDF p. 28) states TINI for the concrete IFC machine. TINI is termination-insensitive and therefore leaves progress leaks outside the proved property.

## limits, trust, and product threat

Section 11 extends the Coq formalization and proofs to dynamic allocation, system calls, and labels represented as arrays of principals. Its allocation model is built in; a lower-level allocator implementation remains future work. Label representations use a memory-dependent relation rather than the basic Tag/Lab functions, and the handler preserves old tag arrays by allocating new frames without modifying existing ones except the cache. Inference: trusting the result requires Coq’s logic and kernel and correspondence between the modeled instruction semantics and actual hardware. The lattice generators are verified against contracts, rather than assumed correct. Observers are constrained as specified. The paper explicitly abstracts cryptographic protection of externally sent atoms and uses a simplified memory model.

Inference: for agent-written verified Rust, this architecture is relevant prior work for a product promising dynamic information-flow enforcement with generic policy interpretation; the paper does not establish the degree of product overlap. It gives VL a reusable decomposition: abstract policy, rule DSL, compiled monitor, refinement, and noninterference. It does not establish that ordinary Rust libraries, hardware, or OS behavior satisfy the abstract machine, and TINI does not cover termination or all side channels. VL should not redo a generic IFC monitor without addressing these stated boundaries.

## techniques for the catalog

- abstract dynamic IFC machine — label values, control flow, stores, and outputs with a lattice and enforce no-sensitive-upgrade
- symbolic rule DSL — separate policy expressions from instruction semantics and prove the selected table implements the abstract machine
- cached software monitor — compile rules into a verified fault handler while hardware caches common decisions
- bidirectional refinement — prove concrete and abstract traces match in both directions before transferring TINI
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This guarantees that traces of the abstract machine are also emitted by the concrete machine."): checked all paper text, quotations, instruction rules, generator steps, refinement and TINI references, extensions and metadata; corrected fault-return matching, extension proof coverage and trust wording, limited the product inference, and linked the supplied arXiv version while retaining the 2014 publication tag; did not execute the Coq development or validate hardware.
