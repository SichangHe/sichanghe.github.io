# seL4: Formal verification of an OS kernel
(authored by agents unless marked 🧑)
Tag: `klein2009sel4`, [paper](https://doi.org/10.1145/1629575.1629596)

Link provenance: link from the fetch record; no DOI, arXiv URL, or publisher page for this paper appears in the paper text.

## scope and result

The paper reports a machine-checked refinement proof from an abstract kernel specification through an executable specification to the C implementation of an 8,700-line C and 600-line assembler microkernel. The authors state: “We present our experience in performing the formal, machine-checked verification of the seL4 microkernel from an abstract specification down to its C implementation.” (Abstract, p. 207). They define functional correctness as the implementation always following the high-level behavior, including safety properties: “Functional correctness means here that the implementation always strictly follows our high-level abstract specification of kernel behaviour.” (Abstract, p. 207)

The trust boundary is explicit. “We assume the correctness of the compiler, assembly code, boot code, management of caches, and the hardware; we prove everything else.” (Section 1, p. 207). The verification targets ARMv6; the x86 port was not proved (Section 2.1, p. 208). The proof omits correctness of about 1.2 kLOC of boot/initialisation code and relates kernel entry and exit points (Section 4.5, p. 214). The separately proved access-control model had not been connected to this refinement proof (Section 2.3, p. 209). Inference: a Verus port would need to state its assumptions about assembly, compilation, hardware, boot code, and cache/TLB effects explicitly.

## technique 1: prototype-led, refinement-layer design

What it is. The authors put a Haskell prototype between design and proof. The prototype is executable with a hardware simulator, then translated into Isabelle/HOL as an executable specification, and finally related to manually written C. “The central artefact is the Haskell prototype of the kernel.” (Section 2.2, p. 208). The design loop connects “Hardware Simulator” and “Haskell Prototype” to a “Formal Executable Spec” and a “High-Performance C Implementation” (Figure 1, p. 208).

When to use it. Inference: use this when a low-level implementation must be realistic and performant, while the proof team needs a compact executable model. The paper explains that direct theorem-prover programming would impose “a steep learning curve for the design team and a much less sophisticated tool chain for execution and simulation.” (Section 2.2, p. 209)

How to do it. (1) Design kernel algorithms in a restricted, terminating Haskell subset; the authors “make only restricted use of type classes” and “prove that all functions terminate.” (Section 2.2, p. 209). (2) Execute the model with a simulator that passes traps to the kernel model and updates user state. (Section 2.2, p. 208). (3) Translate the Haskell model into Isabelle/HOL. (4) Manually reimplement the model in C to avoid verifying a large Haskell runtime and to enable low-level optimization. (Section 2.2, p. 209). (5) Prove each refinement layer.

Verus form. Inference: write executable Rust for the prototype, pure `spec fn` models for abstract behavior, and proof functions connecting the implementation to the model. Use `requires`, `ensures`, and loop `invariant` clauses; keep proof-only code in `proof fn`s and use ownership to make mutable state explicit. Inference: a Rust adaptation could maintain explicit model and implementation layers and prove their correspondence. The paper uses the simulator for prototype execution, not as a layer in the refinement proof (Figures 1–2, pp. 208–209).

Evidence. The authors report that the first refinement consumed 8 person-years and the second less than 3 person-years (Section 5.2, p. 216). The project found that “the detour via Haskell did not increase the cost, but was in fact a significant net cost saver.” (Section 5.2, p. 216). Table 1 reports 4,900 Isabelle lines and about 75 invariants for the abstract layer; 5,700 Haskell lines, 13,000 Isabelle lines, and about 80 invariants for the executable layer; and 8,700 C lines, 15,000 Isabelle lines, and no additional invariants for the implementation layer. The two refinement proofs contain 110,000 and 55,000 lines, respectively (Table 1, p. 216). Including framework, libraries, and generated proofs, the total is 200,000 lines of Isabelle script (Section 5.2, p. 216).

Limits. The Haskell prototype is not the production kernel; manual translation creates a proof obligation. The paper says: “The translation is not correctness-critical because we seek assurance about the generated definitions and ultimately C, not the Haskell source, which only serves as an intermediate prototype.” (Section 2.3, p. 209). Inference: an analogous Rust workflow should prove correspondence to the generated formal model; correctness of the prototype translator is unnecessary for that theorem. Agreement with the original prototype is a separate question.

## technique 2: abstract-to-concrete refinement by forward simulation

What it is. Functional correctness is expressed as refinement between state machines. “A refinement proof establishes a correspondence between a high-level (abstract) and a low-level (concrete, or refined) representation of a system.” (Section 2.3, p. 209). The authors prove a general forward-simulation rule: for each concrete transition, a corresponding abstract transition exists and a relation between states is preserved (Section 4.5, p. 214).

How to do it. (1) Define an abstract state machine with user-visible operations and nondeterministic choices. (2) Define an executable specification that fixes data structures and algorithms. (3) Define the C semantics and machine interface. (4) State a relation `R` between concrete and abstract states. (5) For every concrete transition from a related state, show a corresponding abstract transition such that every concrete outcome has a related abstract outcome. (6) Compose layers using transitivity. The paper proves that the executable machine refines the abstract machine and that the C machine refines the executable machine; transitivity gives refinement from C to the abstract machine (Theorems 1–3). (Section 4.5, p. 214)

The abstract scheduler illustrates controlled nondeterminism: “Instead, the scheduler is modelled as a function picking any runnable thread that is active in the system or the idle thread.” (Section 4.1, p. 212). The executable layer makes that choice deterministic with priority queues and round-robin selection (Figure 4, p. 212).

Verus form. Inference: represent each layer as a Rust state struct, use `spec fn` for the abstraction relation, and prove a transition lemma whose `ensures` clause states that the relation holds after the operation. A Verus state-machine proof can encode allowed transitions and preserved invariants; nondeterministic abstract choices become existential postconditions or a specification that permits any valid result. Inference: prove explicit composition lemmas to connect the layer relations.

Evidence and limits. The proof covers all user behavior: “The fully non-deterministic model of the user means that our proof includes all possible user behaviours, be they benign, buggy, or malicious.” (Section 4.5, p. 214). It does not prove that the abstract specification expresses the desired policy: “the proof does not guarantee that the specification describes the behaviour the user expects.” (Section 4.5, p. 215).

## technique 3: invariant-centered kernel design

What it is. The proof is organized around invariants over memory, types, data structures, and algorithms. “There are four main categories of invariants in our proof: low-level memory invariants, typing invariants, data structure invariants, and algorithmic invariants.” (Section 4.5, p. 215). About 80% of the properties shown relate to invariant preservation (Section 3, p. 210), and the authors report “with the actual refinement statements between abstract and executable specification accounting for at most 20 % of the total effort for that stage.” (Section 4.5, p. 215)

How to apply it. (1) State memory invariants such as alignment, non-overlap, and absence of an object at address zero. (2) State typing invariants connecting capability slots to object types. (3) State list and pointer-structure invariants. (4) State algorithmic relationships, such as capability existence and thread states. (5) Prove each operation preserves all relevant invariants, re-establishing temporarily violated invariants before a system call returns and those needed at each interrupt point before that point (Sections 3.1, 3.3, and 4.5, pp. 210–211, 215). (6) Use the invariants to justify local checks for global safety. For deletion, the paper chains three facts: a live object has a capability; an untyped capability covering a sub-region of another capability is its descendant in the capability derivation tree; and a capability to an object covered by an untyped capability is its descendant. Thus, an untyped capability with no children covers only non-live objects with no capabilities to them. A further symmetry invariant connects references in both directions; together these facts ensure retyping cannot leave a reference that becomes unsafe. Deletion must preserve these invariants too (Section 4.5, p. 216).

Verus form. Inference: encode persistent facts as `spec fn` predicates over owned state and use `requires`/`ensures` on every mutator. Use ghost state for capability derivation and prove local lemmas that derive global non-dangling guarantees. Rust ownership can discharge aliasing obligations, but it does not establish the kernel’s semantic typing, capability-tree, or algorithmic invariants; those remain explicit proof predicates.

Evidence. The paper says, “We have proved over 150 invariants on the different specification levels, most are interrelated, many are complex.” and that they are proved preserved over all possible executions (Section 4.5, p. 216). The strengthened simulation proof also shows that the executable and concrete machines never fail, always have defined behavior, and that API calls terminate (Section 4.5, p. 215). Inference: these are strong product assurances only under the stated compiler, assembly, boot, hardware, and model assumptions.

## technique 4: simplify concurrency and hardware boundaries

The kernel uses an event-based execution model, a single kernel stack, mostly disabled interrupts, and polling at carefully placed interrupt points. “By design, we side-step addressing the verification complexity of yield by using an event-based kernel execution model,” (Section 3.3, p. 210; sentence continues on p. 211). Interrupt polling returns through the kernel/user boundary, records the pending event, handles it, and retries the interrupted event (Section 3.3, p. 211). Destruction stores progress in a zombie capability so preemption can resume safely (Section 3.3, p. 211).

## techniques for the catalog

- prototype-led refinement: use an executable intermediate model to align design, simulation, proof, and optimized implementation
- forward simulation: prove every concrete transition corresponds to an abstract transition under a preserved state relation
- invariant-centered design: classify and preserve memory, typing, data-structure, and algorithmic invariants
- verification-friendly concurrency: reduce proof state with event-based execution, controlled interrupt points, and explicit hardware models
