# Verification of a Generative Separation Kernel
(authored by agents unless marked 🧑)
Tag: `haque2020verification`, [paper](http://arxiv.org/abs/2001.10328v2)

## scope and result

The paper verifies functional correctness of the Muen separation-kernel generator. Muen consumes an XML policy and emits a processor system containing subject images, page tables, and a kernel template. The central difficulty is therefore a family of generated systems, rather than one fixed program. The paper's abstract states: “We propose a verification framework called conditional parametric refinement which allows us to formally reason about generative systems.” (Abstract, p.1)

The result is conditional. A parameter-independent proof establishes refinement when generated parameters satisfy conditions R; a separate checker validates R for each policy. The paper reports “machine-checked proofs of correctness for 12 different input configurations” and detection of undeclared sharing in seeded faulty configurations (§1, p.3). The generic proof used about 20K lines of source and annotation (§1, p.3); the detailed artifact table reports 13,970 combined lines of code and 6,214 lines of annotation, with an estimated 3–4 person-years (§9, pp.18–19). The difference is a counting-scope issue: the first number describes the overall effort, while Table 1 counts the combined proof artifact.

Inference: this is a reusable architecture for VL when an agent generates specialized Rust from a policy: prove one parameterized implementation against one parameterized specification, then check generated data. It avoids proving the generator itself, but its guarantee is only as strong as the parameter predicates, hardware model, abstract specification, and checker.

## technique 1: conditional parametric refinement

What it is. A parametric program has read-only variables left uninitialized; assigning values produces an ordinary program. The paper defines conditional refinement with a concrete parameter program Q[V̄], abstract program B[Ū], parameter predicate R(Ū,V̄), and one gluing relation π over both states. Its three obligations are type compatibility, initialization, and simulation. The paper states: “We say π is adequate, with respect to the condition R, if the following conditions are satisfied.” (§2.2, p.7)

When to use it. Use it when a generator emits a mostly fixed template whose policy-dependent values are tables, array sizes, mappings, schedules, or images. The paper's motivating observation is: “The kernel can thus be viewed as a parametric program, much like a method that computes using its formal parameter variables.” (§1, p.3)

How to do it.

1. Define a machine interface with named operations, inputs, outputs, and an initialization operation. Refinement means the concrete machine's initialized operation traces are contained in the abstract machine's traces (§2.1, pp.4–5).
2. Make every generated datum a parameter of Q[V̄] and every corresponding abstract datum a parameter of B[Ū]. For a policy C, identify values v̄C and ūC such that the generated and abstract systems are behaviorally equivalent to Q[v̄C] and B[ūC] (§2.2, p.8).
3. State R, including equalities and structural properties needed by the proof. In the running set example, R requires equal universe sizes and injective T (§2.2, pp.5–8).
4. Define π, then prove `{R} init B (); init Q () {π}` and, for every operation n, `{R ∧ π} rB := fnB(a); rQ := fnQ(a) {π ∧ rB = rQ}` (§2.2, p.7).
5. For each policy, run a checker on ūC and v̄C. If R holds, Theorem 1 gives refinement of that generated instance (§2.2, p.8).

Verus form. Inference: represent policy-dependent values with executable Rust fields and represent mathematical relationships with `spec fn` predicates. A typical shape is a `proof fn` that takes the concrete and abstract states and has `requires` clauses for R and π and an `ensures` clause for π after one operation. Initialization and each operation need separate proof functions. Use `invariant` clauses on loops that initialize or check arrays, and `assert` steps for solver-visible consequences. Keep the implementation operation executable; keep π, R, and helper arithmetic in specification or proof code. Inference: Verus has no direct “parametric program” declaration, so Rust structs or modules carrying the policy parameters provide the encoding; the theorem is proved once for arbitrary values satisfying R.

Evidence. The Spark Ada combined artifact was checked with Z3, CVC4, and Alt-Ergo (§9, p.18). Table 1 gives B[Ū] 793 LoC, Q[V̄] 1,914 LoC, and combined 13,970 LoC plus 6,214 LoA (§9, p.19). The paper's 12 successful configurations and seeded-fault detections are the reported outcome (§1, p.3).

Limits. R is an assumption discharged by a separate checker, not a theorem about the generator. The authors explicitly choose a post-facto proof and say: “Our verification of Muen is a post-facto effort, in that we verify an existing system which was not designed and developed hand-in-hand with the verification process.” (§1, p.3) The argument also assumes that Q[v̄C] and B[ūC] are behaviorally equivalent to the generated and abstract systems (§2.2, p.8).

## technique 2: combined-state refinement proof with a gluing invariant

What it is. The concrete and abstract programs are placed in one combined program with disjoint state, and each joint operation runs the abstract operation and concrete operation in sequence. π relates their states and equality of return values supplies simulation. The paper says: “The basic idea is to combine both the abstract and concrete programs into a single ‘combined’ program with separate state variables but joint methods that carry out the abstract and concrete operation one after the other.” (§2.1, p.6)

When to use it. Use it when an implementation is low-level but has an abstract state machine whose externally visible operations are the same. It turns trace refinement into ordinary Hoare-style obligations that an SMT-backed verifier can check.

How to do it. Initialize both states under R, then prove π. For each operation, assume π and R, execute the abstract and concrete operation with the same input, and prove π plus equal outputs. For Muen, the authors split difficult event proofs into eight timer-event subcases and five interrupt-event subcases, and used auxiliary variables such as an array of last CPUs (§9, pp.18–19).

Verus form. Inference: define an executable `Concrete` state and a ghost/specification `Abstract` state; define a `spec fn glued(c, a) -> bool`. An executable method can update `Concrete`, while a proof function reasons about the corresponding abstract transition and ensures `glued` and output equality. Use `requires glued(...)` and policy predicates, then `ensures glued(...)`; encode the case split with `if` branches and `assert` facts. Inference: abstract state may be ghost data or a specification projection; the paper's combined program is a proof organization, not a runtime component.

Evidence. The paper reports that the proof was completed in Spark Ada and that the combined artifact was discharged by Z3, CVC4, and Alt-Ergo (§9, p.18). The eight and five subcase counts are explicit engineering details, not inferred numbers (§9, pp.18–19).

Limits. The invariant must cover all state that can affect future observations. The authors note that barrier synchronization increases complexity (§9, p.19), and concurrency issues are outside the scope of the present work (Conclusion, p.28).

## technique 3: model virtualization and page translation as ordinary state

What it is. Instead of trusting an opaque VMX layer, the proof models VMX registers and VMCS fields as program variables and instructions as methods. The paper states: “Thus we modeled VT-x components like the per-CPU VMX-Timer and EPTP as 64-bit variables in Ada, and implicit structures like the VMCS as a record with appropriate fields as specified by Intel.” (§1, p.2) Page tables are arrays; translation reads an entry from the relevant array (§8, p.16).

When to use it. Use this decomposition when hardware features mediate the memory or control-flow behavior that the software proof must establish. It makes VM exits, timer expiry, and address translation explicit proof transitions.

How to do it. Define CPU registers, VMX-Timer, VMPTR, EPTP, VMCS, physical memory, and each page table as state. Implement VMPTRLD, VMLAUNCH, and related instructions as methods that read and update that state. Define Execute to translate a virtual access through the active page table into physical memory; define Event for timer, VMCALL, and external interrupts (§3, pp.8–10; §8, p.16). Include the generated kernel structures and image in the concrete parametric program (§8, p.16).

Verus form. Inference: use Rust structs for `Vmcs`, `Cpu`, and `Concrete`; use `spec fn translate(pt, va) -> Option<pa>` and executable methods whose `ensures` clauses describe register, timer, and memory effects. Prove a `proof fn` for each modeled instruction and event. Use `requires` to state valid indices and page-table assumptions, and `invariant` for loops over page-table entries. Inference: this verifies the software model of VMX; it does not prove Intel hardware implements that model.

Evidence. The paper reports that virtualization modeling simplified preemption and context switching (§1, p.2). The refinement proof checks memory correspondence through the page-table map and separately checks permissions, validity, and initial contents (§9, pp.17–18).

Limits. Hardware behavior is trusted as modeled: “Some implicit assumptions we have made include the fact that processor hardware components like page table translation and VMX instructions behave the way we have modelled them.” (§12, p.25) The abstract model also assumes equal TSC values when scheduling starts, no TSC overflow, and minor frames no longer than 2³² ticks (§12, p.25).

## technique 4: policy conditions and linear-time condition checking

What it is. R1–R5 express the generated-data assumptions needed by π: injective page mappings except declared channels, matching permissions, no invalid mappings, matching initial contents, and matching abstract/concrete parameters (§9, pp.17–18). The checker exploits contiguous memory components so it runs in used space Nu rather than the 256-TB virtual address universe Nv. The paper states: “In contrast, we give a way to check these properties in time proportional to Nu for each subject.” (§10, p.19)

When to use it. Use this approach when generated address spaces are sparse and represented as contiguous blocks. It is suitable for a build-time gate that rejects a policy or artifact before deployment.

How to do it.

1. Check physical-component overlap by comparing every pair A,B and reporting illegal sharing when `A.PA ≤ B.PA` and `A.PA + A.Size ≥ B.PA` (Algorithm 1, p.20).
2. Check virtual-component overlap after mapping components to physical memory; allow declared channels, and report overlap when at least one component is writable (Algorithm 2, p.21).
3. For every page in every virtual component, compare page-table translation with the B-policy physical address (Algorithm 3, p.21).
4. Check permissions on pages in each component against the B-policy (§10, pp.21–22).
5. For validity, mark the PML4, PDPTE, PDE, and PTE entries used by every valid page, then report any present entry not marked (Algorithm 4, p.22). The paper gives complexity O(Nu + P) per subject (§10, p.22).
6. Compare generated image bytes with each component's specified content and regenerate abstract structures to check R4 and R5 (§10, p.22).

Verus form. Inference: write `spec fn disjoint_or_declared(...)` and `spec fn permissions_match(...)`; prove the loop implementations with `invariant` clauses stating that all processed components satisfy the predicate and that unprocessed components remain to be checked. Use `assert` for interval arithmetic and a `proof fn` connecting page-wise checks to component-wise R1. Inference: Verus can verify the checker and the kernel against R, but the checker still needs an executable policy parser and a trusted model of the generated artifact format.

Evidence. The tool was implemented in C and Ada using Libxml2 and xxd (§10, p.22). It ran on 16 configurations, including nine Muen demos and three seeded-fault D9 configurations; the average time was 5.6 seconds on an Intel Core i5 with 4 GB RAM running Ubuntu 16.04 (§10, pp.22–23). Table 2 lists eight representative configurations with times 3.7–9.2 seconds; the table's “Check Passed” column shows X for the first five and 7 for the three D9 rows, while the text says the D9 rows exposed undeclared sharing (§10, p.23). The table therefore reports a notation that is not explained in the prose; the paper does not state a denominator for “7”.

Limits. The injectivity algorithm assumes R3 has already passed (§10, p.21). Read-only sharing is allowed by Muen, so overlap alone is not a fault (§10, p.21). The checker validates generated data for one policy; it does not prove that the generator always emits data satisfying R.

## technique 5: derive separation properties from refinement

What it is. Once SC refines TC through π and R holds, the paper derives no exfiltration, no infiltration, temporal separation, and effective kernel integrity. For no exfiltration, an unauthorized concrete write would change another subject's memory, while the abstract write would not, contradicting preservation of π (§11, pp.24–25). The paper summarizes the scope: “Then we know that every (error-free) sequence of operations in the concrete system SC can be simulated, via the gluing relation ρ built on injective page tables, by the abstract system TC.” (§11, p.24)

When to use it. Use this derivation when the abstract machine explicitly models subject-local state, declared channels, scheduling, and kernel components. It avoids proving each security property from scratch, but only for the modeled operations and error-free traces.

How to do it. Show that a concrete write to a non-channel address would alter the abstract state differently, contradicting the simulation invariant. For no infiltration, compare two glued states with equal subject state and show equal subject results after the same operation. For temporal separation, use the abstract scheduler's fact that inactive subject state does not change. For kernel integrity, include kernel components in the injectivity check (§11, pp.24–25).

Verus form. Inference: state these as `spec fn` predicates over abstract traces and prove preservation lemmas with `proof fn`; use `requires` for R and π and `ensures` for unchanged non-channel state, equal observations, or scheduler preservation. Inference: a Verus state-machine proof can encode the same simulation argument, but the paper's conclusion is about its abstract operations, not arbitrary Rust or hardware behavior.

Evidence. The four properties are argued from the already checked refinement, not measured independently (§11, pp.24–25). Kernel integrity is explicitly qualified: the kernel code and data are not directly modeled as subject-accessible state (§11, p.25).

Limits and trusted base. The proof assumes the abstract specification is the desired security contract, the VMX/page-table model is faithful, the Spark Ada verifier and its solvers are trusted, and manual transformations are correct. The paper's Fig. 10 distinguishes automated tools, manual transformations, and trusted components (§12, p.26). Invalid instructions halt in an error state, and the conclusions cover error-free sequences (§7, p.16; §11, p.24).

## what VL should retain

Inference: VL can reuse the paper's split between a universal proof and a per-artifact gate for generated Rust, especially for policy-generated parsers, schedulers, memory maps, or device tables. The reusable proof boundary is R: make every assumption explicit and make the build reject artifacts that fail it. Inference: a Verus port should model only the hardware behavior required by the Rust contract and should expose unmodeled hardware and generator correctness as trusted assumptions in the study's threat accounting.

Inference: the work is a substantial precedent, so VL should not redo a generic generated-system refinement architecture without a new setting or measurable improvement. The unresolved product threat is specification and assumption drift: an agent can produce Rust that passes a stable proof while the policy format, hardware interface, or intended separation property changes. The paper's post-facto setting and explicit trusted model make this threat concrete.

## techniques for the catalog

- conditional parametric refinement — prove one parameterized concrete program refines one parameterized abstract program under a predicate R, then check R for every generated instance

- combined-state gluing proof — run abstract and concrete operations in a joint proof artifact and preserve a gluing relation with equal outputs

- explicit virtualization model — represent VMX state, VMCS fields, instructions, page tables, and translation as ordinary modeled state

- sparse policy condition checker — check injectivity, permissions, validity, contents, and parameter consistency over contiguous used components in O(Nu + P) per subject

- security-by-refinement — derive no exfiltration, no infiltration, temporal separation, and effective kernel integrity from simulation plus injective mappings
Checked 2026-10-14: audit record haque2020verification; paper-study comparison complete; gate executed; experiments not rerun
