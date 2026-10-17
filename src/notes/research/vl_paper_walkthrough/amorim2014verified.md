# A verified information-flow architecture
(authored by agents unless marked 🧑)
Tag: `amorim2014verified`, [paper](https://arxiv.org/abs/1509.06503)

## purpose and result

The supplied paper is the March 2016 extended version of the POPL 2014 work; the existing tag retains the original publication year. The authors write: “A preliminary abridged version of this work appeared in the proceedings of the POPL 2014 conference [8].” (Section 1, PDF p. 5). The arXiv link above uses the identifier printed on the paper’s title page. The paper formalizes a simplified SAFE architecture for dynamically enforcing information-flow control (IFC) in machine code. Every integer carries a label from a lattice; a generic concrete machine caches policy decisions and invokes a verified software fault handler on cache misses. The abstract machine satisfies termination-insensitive noninterference (TINI), and refinement transfers that result to the concrete machine: “Since deterministic TINI is preserved by refinement, we conclude that the concrete machine running the generated IFC fault handler also satisfies TINI.” (Section 1, PDF p. 5).

The basic model does not distinguish integers from pointers: “unlike the real SAFE machine, we make no distinction between raw integers and pointers (we re-introduce this distinction in Section 11).” (Section 3, PDF p. 7). Its concrete machine models hardware tag checks and kernel execution, with a one-entry rule cache in kernel memory. The authors give the Coq repository in Section 1, PDF p. 5: “Our Coq formalization is available at https://github.com/micro-policies/verified-ifc.”

## technique 1: abstract dynamic IFC machine

Inference: use this as the executable policy specification against which lower-level implementations are refined.

Steps from Section 3 (PDF pp. 7–9):

1. Choose an IFC lattice with partial order `≤`, join `∨`, and bottom `⊥`.
2. Label every integer and the program counter (PC) with a lattice element; represent an atom as `n @ L`.
3. Define machine state as data memory, stack, and labeled PC.
4. On `Add`, label the result with the join of operand labels.
5. On `Jump` and `Bnz`, join the tested/target label into the next PC label to track implicit flow.
6. On `Store`, join pointer, value, and PC labels and enforce the no-sensitive-upgrade condition `L1 ∨ Lpc ≤ L3` before writing a location labeled `L3`.
7. On `Output`, label the emitted value with its original label joined with the current PC label.
8. Use structured `Call`/`Ret` to restore the caller’s PC label and avoid unnecessary label creep.

The paper says: “The rule for Add joins (∨) the labels of the two operands to produce the label of the result, which ensures that the result is at least as classified as each of the operands.” (Section 3, PDF p. 7). It also states: “This check prevents memory locations labeled public from being overwritten when either the PC or the pointer through which the store happens has been influenced by secrets.” (Section 3, PDF p. 8).

Inference: a possible Verus adaptation would specify the machine state, label lattice, and instruction transitions, then prove that two executions with indistinguishable public inputs produce indistinguishable public outputs. A Rust implementation would additionally need contracts for integer width, memory layout, and pointer behavior. This adaptation is not implemented or evaluated in the paper.

Evidence: Theorem 10.5 (PDF p. 27) derives abstract TINI from Theorem 10.3’s unwinding conditions, which relate individual steps of two executions. Definition 10.2 compares filtered traces using the relation defined immediately above it: “This definition truncates the longer trace to the same length as the shorter and then demands that the remaining elements be pairwise identical.” (Section 10, PDF p. 25).

## technique 2: symbolic rule-table DSL

Inference: use a rule table to separate policy design from instruction execution. Another IFC policy needs its own abstract security proof and refinement proof.

Steps from Section 4 (PDF pp. 9–11):

1. Factor IFC checks out of instruction semantics into a judgment parameterized by a table `R`.
2. For every opcode, define a Boolean allow expression, a label expression for the next PC, and a label expression for the result.
3. Use DSL variables `LABpc`, `LAB1`, `LAB2`, `LAB3`, constant `BOT`, lattice join `⊔`, and flows-to `⊑`.
4. At each instruction step, evaluate the table rule on the current labels. If allow is false, block; otherwise assign the resulting labels.
5. Prove the selected table implements the abstract machine. This proof is independent of the code-generation infrastructure.

The paper says: “We define a small DSL for describing symbolic IFC rules and obtain actual monitors by interpreting this DSL (in this section) and by compiling it into machine instructions using verified structured code generators (in Section 6 and Section 7).” (Section 4, PDF p. 9). In Figure 4 (PDF p. 10), the `store` allow expression is `LAB1 ⊔ LABpc ⊑ LAB3`, the `add` result is `LAB1 ⊔ LAB2`, and the `output` result is `LAB1 ⊔ LABpc`.

Inference: a possible Verus adaptation would represent rules as an enum or immutable table, specify their evaluation, and verify an executable evaluator against that specification. Policy-specific lemmas would relate the evaluated rules to the abstract transition; a machine-code compiler would need a separate correctness proof.

Evidence: Lemma 9.2 proves the symbolic rule machine instantiated with `Rabs` refines the abstract machine. This isolates policy correctness from handler compilation.

## technique 3: generic rule cache and fault handler

Inference: use this architecture when hardware should cache decisions while software interprets a rich policy on cache misses.

Steps from Sections 5–7 (PDF pp. 11–19):

1. On dispatch, form a cache input tuple `(opcode, PC tag, argument tags)`.
2. If a cache entry matches, use its output tags to execute the instruction.
3. On a miss, copy the instruction’s input tags into the cache, reset its output tags, save the faulting PC and user privilege in a return frame, and enter the kernel handler at address 0.
4. `genComputeResults` compares the opcode against all opcodes and recursively evaluates the DSL rule.
5. `genStoreResults` writes result tags to the cache if allowed; otherwise it pushes false without changing the cache.
6. The final generated conditional returns to user mode to retry the faulting instruction on success or jumps to `-1` on policy violation. Kernel execution cannot emit output or consult the rule cache.
7. For the basic model, encode abstract labels as concrete tags through `Tag`/`Lab`, satisfying `Lab(Tag(L)) = L`, and provide verified generators for bottom, join, and flows-to.

The paper says: “Thus, the hardware is generic and the interpretation of policies (e.g., IFC, memory safety or control flow integrity [9, 35]) is programmed in software, with the results cached in hardware for common-case efficiency.” (Section 1, PDF p. 4). The top-level generator is `genFaultHandler R = genComputeResults R ++ genStoreResults ++ genIf [Ret] [Push (-1); Jump]` (Figure 10, PDF p. 17).

Inference: a possible Verus adaptation would verify Rust code generators against a specified instruction semantics and maintain cache consistency as an invariant. Applying the result to hardware would also require establishing that the hardware implements those semantics.

Evidence: Lemma 7.1 proves that an allowed symbolic rule produces the expected encoded tags and returns to user mode. Lemma 7.2 proves a disallowed rule halts at PC `-1`. The custom Hoare logic has self-contained and escaping-code triples; deterministic execution makes these total-correctness triples, which the paper says is essential for termination in the two lemmas (Section 7, PDF p. 18).

## technique 4: bidirectional refinement and TINI transfer

Inference: use refinement when a concrete implementation is too detailed for a direct security proof.

Steps from Sections 8–10 (PDF pp. 20–28):

1. Define state and event matching relations between abstract, symbolic, and concrete machines, including label-to-tag conversion.
2. Prove non-faulting concrete steps match one symbolic step (Lemma 9.5).
3. Prove a faulting concrete step followed by handler return preserves the match with the same symbolic state; the restarted instruction then matches a symbolic step (Lemma 9.6); a handler that does not return cannot emit output.
4. Compose symbolic-to-abstract and concrete-to-symbolic relations to obtain concrete-to-abstract refinement (Theorem 9.8).
5. Prove inverse refinement so every abstract behavior is represented by the concrete machine (Theorem 9.9), ruling out a concrete implementation that merely diverges.
6. Prove TINI for the abstract machine with state indistinguishability and unwinding conditions. Establish Theorem 10.6’s compatibility conditions for input matching, event observability, and event indistinguishability; transfer TINI to the concrete machine (Theorem 10.8).

The paper states: “In our deterministic setting, showing refinement in both directions guarantees that the concrete machine does not diverge or get stuck when handling a fault.” (Section 1, PDF p. 5). The TINI definition quantifies over indistinguishable initial inputs and executions and compares filtered output traces (Definition 10.2, PDF p. 25).

Inference: a possible Verus adaptation would encode matching relations for memory, stack, cache consistency, and tag representation, prove both trace directions, and separately establish TINI and the observation compatibility conditions. This would require a new formal development.

Evidence: Theorems 9.8 and 9.9 establish both trace directions; Theorem 10.8 (PDF p. 28) states TINI for the concrete IFC machine. TINI is termination-insensitive and therefore leaves progress leaks outside the proved property.

## limits, trust, and product threat

Section 11 extends the Coq formalization and proofs to dynamic allocation, system calls, and labels represented as arrays of principals. Allocation is built in: “It would be interesting to describe an implementation of the memory manager in a still-lower-level concrete machine with no built-in Alloc instruction, but we leave this as future work.” (Section 11.1, footnote 6, PDF p. 31). Label representations use a memory-dependent relation rather than the basic Tag/Lab functions. The handler preserves existing tag arrays: “each execution of the fault handler only allocates new frames, and never modifies the contents of existing ones, except for the cache frame (which tags never point into).” (Section 11.3, PDF p. 33).

The model omits concurrency, process scheduling, and interprocess communication: “the whole machine has a single, deterministic thread of control.” (Section 2, PDF p. 6). Its property excludes timing and termination leaks: “Our TINI property ignores both termination and timing: a program that diverges, fails, or takes varying amounts of time to run based on a sensitive input is considered secure.” (Section 12, PDF p. 35). External communication is idealized: “In the real SAFE machine, atoms being sent to the outside world need to be protected cryptographically; we are abstracting this away.” (Section 3, footnote 2, PDF p. 8). Inference: applying the verified model to a deployed system requires trust in Coq’s logic and proof checker and evidence that the implementation matches the modeled semantics.

Inference: for agent-written verified Rust, this architecture is relevant prior work for a product promising dynamic information-flow enforcement with generic policy interpretation; the paper does not establish the degree of product overlap. It gives VL a reusable decomposition: abstract policy, rule DSL, compiled monitor, refinement, and noninterference. It does not establish that ordinary Rust libraries, hardware, or OS behavior satisfy the abstract machine, and TINI does not cover termination or all side channels. VL should not redo a generic IFC monitor without addressing these stated boundaries.

## techniques for the catalog

- abstract dynamic IFC machine — label values, control flow, stores, and outputs with a lattice and enforce no-sensitive-upgrade
- symbolic rule DSL — separate policy expressions from instruction semantics and prove the selected table implements the abstract machine
- cached software monitor — compile rules into a verified fault handler while hardware caches common decisions
- bidirectional refinement — prove concrete and abstract traces match in both directions before transferring TINI
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This guarantees that traces of the abstract machine are also emitted by the concrete machine."): checked every quotation, number, section/page reference, technique step, and stated limitation against the complete supplied paper, including its bibliography; corrected three quotations and the Add quotation’s page, clarified cache faults and TINI transfer, marked adaptation advice as inference, and added model limits; did not check the Coq repository, actual hardware, or feasibility of the proposed Verus adaptations.
