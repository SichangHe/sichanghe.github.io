# VeriCHERI: Exhaustive Formal Security Verification of CHERI at the RTL
(authored by agents unless marked 🧑)
Tag: `duqueanton2024vericheri`, [paper](http://arxiv.org/abs/2407.18679v1)

## security objective

VeriCHERI verifies a concrete CHERI processor's RTL directly against confidentiality and integrity objectives, instead of translating properties from an ISA model. The authors' central claim is: “Fully covering these objectives, VeriCHERI uses as few as four unbounded properties to exhaustively prove or disprove any vulnerability.” (abstract, p. 1) The design is modeled as a finite-state machine with processor state P and memory M. For an attacker task, memory is partitioned into public Mpub and protected Mprot according to capabilities.

Inference: for VeruLaw, the transferable lesson is to define a global security or safety objective at the implementation boundary, then derive a small set of exhaustive properties and prove the assumptions that make those properties sufficient. The paper is hardware RTL/SVA work, so any Rust/Verus form below is an adaptation.

## technique 1: non-interference objectives

What it is. Confidentiality is a 2-safety non-interference property: two executions with equal public memory and processor state must keep equal public observations despite differing protected memory. Integrity reverses the direction: equal protected memory must remain equal despite differences in public state. The paper gives CTL forms (Eq. 1–2) using two primed/unprimed design instances.

When to use it. Use this pair when the threat is information flow across a protected/public partition and a concrete implementation may have microarchitectural state absent from an abstract specification.

How to do it.

1. Model all state-holding RTL elements, including registers, buffers, caches, and memories, as Z=P∪M (Section 3.1).
2. Select Mpub and Mprot for an attacker task from capability permissions and bounds.
3. Instantiate two copies of the processor.
4. For confidentiality, constrain Mpub and P equal initially and require they remain equal; for integrity, constrain Mprot equal and require it remain equal (Eq. 1–2, Section 3.1).
5. Treat any violation as an implementation security vulnerability.

The paper states: “No protected information should ever become accessible to the attacker task.” (Section 3.1, p. 3) It also warns that ISA-level proofs do not cover hardware timing behavior: “Furthermore, certain classes of vulnerabilities are not captured by the ISA model due to missing information, such as side channels based on timing.” (Section 2.2, p. 2)

Verus form. Inference: represent two executions as ghost state records and prove a relational lemma: equal public projections imply equal future public projections; prove the integrity relation similarly. Use `requires` for partition equality and `ensures` for the post-state relation. Verus's ordinary function proofs are not a hardware temporal model; the transition function and observation projection must be explicitly defined.

Limits. Inference: 2-safety compares two traces and requires a faithful threat model; it does not by itself capture timing leakage unless timing is an observable state or output.

## technique 2: symbolic protected address and one-safety properties

What it is. Explicitly enumerating every Mprot/Mpub partition is unscalable. VeriCHERI replaces locations with an unconstrained symbolic address and defines `cheri_protected(symbolic_addr)` to constrain every capability-holding register and buffer so that address is inaccessible. Confidentiality and integrity then become one-safety interval properties over a single design:

- assume `cheri_protected(symbolic_addr)` at time t; prove a read at t never uses that address
- assume the same macro; prove a write at t never uses that address

The paper says: “Our key idea to overcome these challenges is the following: Instead of modeling Mpub and Mprot explicitly by using state variables for memory locations, we model memory locations implicitly by their unique addresses.” (Section 3.2, p. 4)

How to do it.

1. Introduce a symbolic address unconstrained by the RTL model.
2. Define `cheri_protected` as constraints over all accessible capability registers, pipeline buffers, and capability memory-port signals.
3. Prove the read-mem-access implication and write-mem-access implication for one cycle (Figure 1, Section 3.2).
4. Use interval properties for finite windows; the symbolic start state permits unbounded proofs without reset unrolling.
5. Refine the macro whenever a counterexample is caused by an omitted capability holder.

Verus form. Inference: quantify a ghost protected address and define a predicate over capability values and memory requests. Prove that each transition preserves the property that a request address differs from the protected address under the predicate. This is a proof of a modelled Rust memory interface, not a substitute for proving the actual processor.

Evidence. A one-safety proof eliminates the need to compare two designs for direct illegal accesses. The case study found 40 capability locations while refining the macro, including 31 general-purpose registers, seven control registers, PCC, and one writeback buffer (Section 5.1).

## technique 3: weak capability monotonicity invariant

What it is. The protection predicate must remain true after every transition. The paper states weak monotonicity as Mprot^(t+1) ⊆ Mprot^t and describes a violation as a transition moving locations from Mprot to Mpub (Section 3.3); Inference: the stated inclusion direction and that description read as opposite ways round, so take the paper's formula with care. The paper formulates this as an interval property that assumes cheri_protected(symbolic_addr) at time t and proves it at t + 1 (Figure 2, Section 3.3).

How to do it.

1. Define the protected predicate for every capability register or microarchitectural buffer.
2. Prove an induction base showing the state space constrained by the predicate is reachable from reset (Section 3.3; the paper omits this base property for space).
3. Prove the induction step as the one-cycle interval property.
4. If a counterexample identifies a missing holder or invalid capability transition, add the corresponding constraint and repeat.
5. Re-run integrity/confidentiality properties with the updated predicate.

The paper explains the interpretation: “state transitions never add to the set Mprot.” (Section 3.3, p. 5) Inference: a Verus implementation should prove an invariant over the state transition with `invariant` clauses in a loop or induction lemma; `invariant` is a specification construct, not a function call.

Limits. The paper calls this invariant weaker than CHERI's capability monotonicity (which forbids individual capabilities from gaining rights) but sufficient for its property formulation (Section 3.3). The registers and buffers it names must be re-determined for another processor, though the constraints themselves can be reused (Section 5.2). A false counterexample may come from an unreachable symbolic starting state.

## technique 4: UPEC-CHERI for timing and transient leakage

What it is. UPEC (Unique Program Execution Checking) checks whether protected data can propagate into attacker-visible architectural state through microarchitectural behavior, including Meltdown-style transient execution. It builds a miter of two design instances, equalizes public inputs and initial state, and allows only protected data to differ. It distinguishes propagation to microarchitectural buffers (P-alert) from leakage to architectural state (L-alert).

How to do it.

1. Partition processor state into architectural Parch and microarchitectural Pμ-arch (Section 3.4).
2. Instantiate two processors with equal public state and equal symbolic protected-address assumptions.
3. Require architectural state equality after a finite k-cycle window (Eq. 5 and Figure 3).
4. Use an inductive interval proof over that window.
5. If a confidentiality one-safety counterexample shows a protected access, run UPEC-CHERI to determine whether the access leaves an attacker-visible difference.

The paper states: “UPEC verifies security using a 2-safety property running on a miter model.” (Section 3.4, p. 5) It also says a timing channel exists when discarded protected data leaves a microarchitectural footprint whose timing affects later operations (Section 3.4).

Verus form. Inference: encode two ghost machine states and prove equality of architectural projections after k transitions under equal public inputs. A Rust proof must define what timing and architectural observation mean; a mathematical state relation alone does not capture physical cache timing.

## technique 5: iterative verification flow and reusable invariants

The flow starts with one-safety integrity, refines `cheri_protected` on false counterexamples, proves monotonicity, and repeats until integrity holds. It then checks confidentiality (data and instruction interfaces), and uses UPEC-CHERI for any confidentiality counterexample. A true counterexample is one reachable under current capabilities; a false one indicates an incomplete macro. The flow diagram's decision sequence is described in Section 4.

Unbounded interval checking may start from unreachable states. The authors therefore formulate auxiliary invariants, prove them by induction, and use them to exclude those states. Two reusable invariants are weak capability monotonicity and representability constraints for compressed capabilities. The paper reports: “Both invariants are formulated in SVA and are published open-source [18].” (Section 5.2, p. 7)

Verus form. Inference: make the refinement loop a proof-development process, with each macro extension accompanied by a lemma that the added constraint describes all reachable capability holders. Encode reusable invariants as parameterized predicates over register/buffer collections.

## evidence, assumptions, and failures

The CHERIoT Ibex case study used OneSpin 360 DV on an Intel i9-13900K with 128 GB RAM. Table 1 reports integrity failures under one minute and 4.3–4.7 GB, then a holding proof at seven minutes and 4.8 GB. Monotonicity required nine failing iterations (≤1 minute, 4–5 GB) and iteration 10 held in 15 minutes and 6.2 GB. Data confidentiality held in seven minutes and 7.3 GB; instruction confidentiality failed in under one minute and 4.8 GB. UPEC-CHERI first failed in 31 minutes and 3.7 GB and held after a fix in 18 minutes and 6.3 GB (Table 1).

The flow found two functional bugs before the confidentiality checks (the paper's third bug is the timing channel below): a protection-enable pin documented active-low but implemented active-high, and a capability store whose bounds check covered only the first memory access, not the second (address of the first plus 4); the development team independently found and fixed this one during the experiments. UPEC found a Meltdown-style timing channel in which two fetched-data bits affected exception timing and a performance-counter offset; the authors applied a conservative fix that prevents all illegally fetched instructions from entering the core, after which UPEC-CHERI holds; the development team confirmed the report (Section 5.1). Manual effort was about two person months, and individual property runtimes ranged from a few seconds to 31 minutes (Sections 5.1 and 5.3). The paper concludes that the case study detected three security bugs including that timing vulnerability (Conclusion, p. 8).

The authors' claim is that, once all properties hold, the design is free of violations of the stated security objective (Section 4). Inference: what stays trusted is the RTL model, SVA/property checker, capability macro's completeness, threat assumptions (single core, trusted context switching), and the mapping from abstract security objective to product policy. Inference: this is strong evidence for the modeled threat, not a proof of all software behavior or physical side channels outside modeled state.

Inference: threat to agent-written verified Rust is high for memory isolation and moderate for timing. A product can adopt symbolic protected resources, relational non-interference, invariant refinement, and a separate transient-observation checker. It must define the observation boundary and prove that every capability-like holder is included; Verus proofs alone cannot guarantee hardware timing behavior.

## techniques for the catalog

- non-interference objectives — derive confidentiality and integrity as relational properties over public and protected state
- symbolic protected resource — replace explicit protected sets with an unconstrained address/resource and a protection predicate
- one-safety interval checking — prove no illegal access to the protected symbolic resource in a finite transition interval
- weak capability monotonicity — inductively preserve the protection predicate across transitions
- UPEC miter checking — compare two executions to detect transient and timing leakage into architectural state
- iterative invariant refinement — classify counterexamples, add missing holder constraints, and repeat until all properties hold
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In interval property checking (IPC), the property checker can fast-forward to any starting state violating the property without the need to unroll from reset."): I read the whole paper text and the whole study; checked every quotation word for word, the Table 1 numbers, the 40 capability locations, the flow steps, and section and page references; changed one misquoted word ("In addition" to "Furthermore"), the page numbers (the paper has 9 pages, the study cited pages up to 11), the wrong 'cannot shrink' reading of the weak monotonicity inclusion (now flagged as unclear in the paper), the Figure 2 reference (Section 3.3), the claim that the invariant is weak (the paper calls it sufficient), the bug descriptions (second bug detail, independent discovery, confirmation), and added manual effort and runtime figures; marked own conclusions as Inference; did not check the cited external works, the Verus adaptations beyond marking them Inference, or the public GitHub invariants.
