# seL4: Formal verification of an OS kernel
(authored by agents unless marked 🧑)
Tag: `klein2009sel4`, [paper](https://doi.org/10.1145/1629575.1629596)

## scope and result

The paper reports a machine-checked refinement proof from an abstract kernel specification through an executable specification to the C implementation of an 8,700-line C and 600-line assembler microkernel. The authors state: “We present our experience in performing the formal, machine-checked verification of the seL4 microkernel from an abstract specification down to its C implementation.” (Abstract, p. 207). They define functional correctness as the implementation always following the high-level behavior, including safety properties: “Functional correctness means here that the implementation always strictly follows our high-level abstract specification of kernel behaviour.” (Abstract, p. 207)

The trust boundary is explicit. “We assume the correctness of the compiler, assembly code, boot code, management of caches, and the hardware; we prove everything else.” (Section 1, p. 207). Inference: a Verus port would need explicit contracts for assembly, compiler behavior, hardware, boot code, and cache/TLB effects; proving Rust functions alone would leave the same assumptions.

## technique 1: prototype-led, refinement-layer design

What it is. The authors put a Haskell prototype between design and proof. The prototype is executable with a hardware simulator, then translated into Isabelle/HOL as an executable specification, and finally related to manually written C. “The central artefact is the Haskell prototype of the kernel.” (Section 2.2, p. 208). The design loop connects “Hardware Simulator” and “Haskell Prototype” to a “Formal Executable Spec” and a “High-Performance C Implementation” (Figure 1, p. 208).

When to use it. Use this when a low-level implementation must be realistic and performant, while the proof team needs a compact executable model. The paper explains that direct theorem-prover programming would impose “a steep learning curve for the design team and a much less sophisticated tool chain for execution and simulation.” (Section 2.2, p. 208)

How to do it. (1) Design kernel algorithms in a restricted, terminating Haskell subset; the authors “make only restricted use of type classes” and “prove that all functions terminate.” (Section 2.2, p. 208). (2) Execute the model with a simulator that passes traps to the kernel model and updates user state. (Section 2.2, p. 208). (3) Translate the Haskell model into Isabelle/HOL. (4) Manually reimplement the model in C to avoid verifying a large Haskell runtime and to enable low-level optimization. (Section 2.2, p. 209). (5) Prove each refinement layer.

Verus form. Inference: write executable Rust for the prototype, pure `spec fn` models for abstract behavior, and proof functions connecting the implementation to the model. Use `requires`, `ensures`, and loop `invariant` clauses; keep proof-only code in `proof fn`s and use ownership to make mutable state explicit. The Haskell-to-Isabelle translator has no direct Verus equivalent, so Rust would need manually maintained model and implementation layers. Inference: a simulator can be an `external_body` boundary only for behavior intentionally left trusted; the kernel proof should instead expose a modeled state machine and contracts for every simulator operation.

Evidence. The authors report that the first refinement consumed 8 person-years and the second less than 3 person-years (Section 5.2, p. 216). The project found that “the detour via Haskell did not increase the cost, but was in fact a significant net cost saver.” (Section 5.2, p. 216). Table 1 reports 5,700 Haskell/C lines and about 75,000 proof lines for the abstract layer, 13,000 Isabelle lines and about 55,000 proof lines for the executable layer, and 15,000 Isabelle lines for implementation. (Table 1, p. 215)

Limits. The Haskell prototype is not the production kernel; manual translation creates a proof obligation. The paper says the translation to the theorem prover “is not correctness-critical because we seek assurance about the generated definitions and ultimately C, not the Haskell source.” (Section 2.3, p. 209). Inference: this workflow still depends on the correctness of the translator and the manual correspondence between prototype and Rust implementation unless those are separately verified.

## technique 2: abstract-to-concrete refinement by forward simulation

What it is. Functional correctness is expressed as refinement between state machines. “A refinement proof establishes a correspondence between a high-level (abstract) and a low-level (concrete, or refined) representation of a system.” (Section 2.3, p. 209). The authors prove a general forward-simulation rule: for each concrete transition, a corresponding abstract transition exists and a relation between states is preserved (Section 4.5, p. 214).

How to do it. (1) Define an abstract state machine with user-visible operations and nondeterministic choices. (2) Define an executable specification that fixes data structures and algorithms. (3) Define the C semantics and machine interface. (4) State a relation `R` between concrete and abstract states. (5) For every concrete transition from a related state, show an abstract transition whose resulting state remains related. (6) Compose layers using transitivity. The paper names the instantiated results: “Theorem 1. ME refines MA.”, “Theorem 2. MC refines ME.”, and then “Theorem 3. MC refines MA.” (Section 4.5, p. 214)

The abstract scheduler illustrates controlled nondeterminism: “The scheduler is modelled as a function picking any runnable thread that is active in the system or the idle thread.” (Section 4.1, p. 211). The executable layer makes that choice deterministic with priority queues and round-robin selection (Figure 4, p. 212).

Verus form. Inference: represent each layer as a Rust state struct, use `spec fn` for the abstraction relation, and prove a transition lemma whose `ensures` clause states that the relation holds after the operation. A Verus state-machine proof can encode allowed transitions and preserved invariants; nondeterministic abstract choices become existential postconditions or a specification that permits any valid result. Do not write `invariant(...)` as a call; put loop invariants in the loop syntax. Inference: refinement transitivity must be proved with separate lemmas because Verus does not automatically compose arbitrary layer relations.

Evidence and limits. The proof covers all user behavior: “The fully non-deterministic model of the user means our proof includes all possible user behaviours, be they benign, buggy, or malicious.” (Section 4.5, p. 214). It does not prove that the abstract specification expresses the desired policy: “the proof does not guarantee that the specification describes the behaviour the user expects.” (Section 4.5, p. 215). Inference: VL must review specifications and security policies independently of solver success.

## technique 3: invariant-centered kernel design

What it is. The proof is organized around invariants over memory, types, data structures, and algorithms. “There are four main categories of invariants in our proof: low-level memory invariants, typing invariants, data structure invariants, and algorithmic invariants.” (Section 4.5, p. 215). About 80% of the properties shown relate to invariant preservation (Section 4.1, p. 209), and “the actual refinement statements between abstract and executable specification account for at most 20 % of the total effort for that stage.” (Section 4.5, p. 215)

How to apply it. (1) State memory invariants such as alignment, non-overlap, and absence of an object at address zero. (2) State typing invariants connecting capability slots to object types. (3) State list and pointer-structure invariants. (4) State algorithmic relationships, such as capability existence and thread states. (5) Prove each operation preserves all relevant invariants, including temporary violations that are re-established before a preemption point. (6) Use the invariants to justify local checks for global safety. For deletion, the paper chains three facts: a live object has a capability; a capability covering a sub-region is a descendant in the capability derivation tree; and a capability to an object covered by an untyped capability is its descendant (Section 4.5, p. 215).

Verus form. Inference: encode persistent facts as `spec fn` predicates over owned state and use `requires`/`ensures` on every mutator. Use ghost state for capability derivation and prove local lemmas that derive global non-dangling guarantees. Rust ownership can discharge aliasing obligations, but it does not establish the kernel’s semantic typing, capability-tree, or algorithmic invariants; those remain explicit proof predicates.

Evidence. The paper says, “We have proved over 150 invariants on the different specication levels” and that they are proved preserved over all possible executions (Section 4.5, p. 216). The strengthened simulation proof also shows that the executable and concrete machines never fail, always have defined behavior, and that API calls terminate (Section 4.5, p. 215). Inference: these are strong product assurances only under the stated compiler, assembly, boot, hardware, and model assumptions.

## technique 4: simplify concurrency and hardware boundaries

The kernel uses an event-based execution model, a single kernel stack, mostly disabled interrupts, and polling at carefully placed interrupt points. “By design, we side-step addressing the verification complexity of yield by using an event-based kernel execution model, with a single kernel stack, and a mostly atomic application programming interface.” (Section 3.3, p. 210). Interrupt polling returns through the kernel/user boundary, records the pending event, handles it, and retries the interrupted event (Section 3.4, p. 211). Destruction stores progress in a zombie capability so preemption can resume safely (Section 3.3, p. 210).

Inference: a Verus system should similarly isolate interrupt and device effects behind a state-machine interface, prove that each interrupt point preserves the preconditions of reachable handlers, and model only the hardware behavior needed by the property. The paper models interrupt masking and delivery but leaves cache and TLB effects to assumptions and testing: “Presently, we do not model the effects of certain direct hardware instructions because they are too far below the abstraction layer of C.” (Section 4.4, p. 213). This is a clear trusted boundary for a VL product.

## measured outcomes, gaps, and product threat

The optimized C IPC path measured 224 cycles per one-way IPC on an ARM1136JF-S, compared with 206 cycles for hand-crafted OKL4 assembly and 756 cycles for its unoptimized C path (Section 5.1, p. 216). The kernel had 16 defects found before formal verification and 144 found during verification; the latter led to 54 code changes (Section 5.2, p. 216). Adding interrupts, ARM page tables, and address spaces changed 12% of existing Haskell code, added 37%, and cost 1.5–2 person-years to reverify (Section 5.3, p. 217). These denominators and settings are the paper’s reported kernel and refinement stages.

Already done that VL should not redo: refinement proofs, invariant taxonomies, explicit hardware assumptions, and a prototype-to-C workflow are demonstrated for a complete microkernel. Inference: VL should reuse these patterns and focus on Rust/Verus-specific costs, specification review, dependency assumptions, and proof maintenance rather than claim the general method as new. Inference: the threat to agent-written verified Rust is high when agents change cross-cutting state or silently weaken specifications; it is lower for local changes whose contracts and invariants remain stable. The paper’s experience shows that small implementation changes are cheap, while cross-cutting features and capability changes can require months or years of re-verification.

## techniques for the catalog

- prototype-led refinement: use an executable intermediate model to align design, simulation, proof, and optimized implementation
- forward simulation: prove every concrete transition corresponds to an abstract transition under a preserved state relation
- invariant-centered design: classify and preserve memory, typing, data-structure, and algorithmic invariants
- verification-friendly concurrency: reduce proof state with event-based execution, controlled interrupt points, and explicit hardware models

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
