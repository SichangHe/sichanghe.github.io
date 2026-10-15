# Verified Security for the Morello Capability-enhanced Prototype Arm Architecture
(authored by agents unless marked 🧑)
Tag: `bauereiss2022morello`, [paper](https://doi.org/10.1007/978-3-030-99336-8_7)

## verified architecture pipeline
The paper mechanizes a security theorem for the full sequential Morello ISA. The source is Arm’s executable ASL specification, translated to Sail and then to Isabelle/HOL; Isla generates tests, and a C emulator and Arm ACK tests provide validation. The authors describe “a mechanised proof of capability monotonicity for the full sequential Morello ISA specification (including all instructions, system registers, capability compression, etc.), with large parts of the proof automatically generated” (Introduction, p. 175). The ISA source is 62,000 lines and becomes 210,000 lines of Isabelle; the proof is factored through a narrow CHERI abstraction over monadic intra-instruction semantics (Introduction, p. 175).

Inference: the same architecture applies to verified Rust systems: define an executable reference semantics, translate or re-express it in Verus-friendly datatypes, and prove a small abstraction theorem that every concrete instruction preserves the abstract security relation. Translation correctness is a separate trusted or verified boundary; it does not follow from the downstream proof.

## technique 1: abstract capability monotonicity
Use this when a machine or kernel must guarantee that execution cannot create authority. Define capability reachability, capability invariants, instruction-fetch and instruction-execute traces, and a transition between states. Prove each instruction’s intra-instruction property: any capability it writes is derivable from capabilities supplied to that instruction, except for explicitly modeled domain-transition mechanisms. Then lift the local property to arbitrary alternating fetch/decode/execute traces. The theorem’s assumptions are exact: “1. all traces tfi and te i satisfy the architecture-specific assumptions, 2. the capabilities in s satisfy the architecture-specific capability invariants, 3. none of the fetch and execute traces tfi and te i raise an ISA exception, 4. the address translation mapping stays invariant along t, and 5. unsealed versions of the invoked sealed capabilities in t are reachable in s” (Sec. 4.5, p. 190). The conclusion is that reachable capabilities in the final state are a subset of those initially reachable.

Inference: in Verus, define a ghost `Set<Capability>` or finite sequence of reachable capabilities, a `spec fn` for derivation, and per-instruction `ensures` stating subset preservation. A loop over instructions carries the subset relation as an `invariant`. Exceptions and domain transitions need explicit branches that weaken or reset the invariant. Verus cannot assume capability non-forgeability unless the representation and constructors enforce it; unsafe raw pointers or `external_body` would defeat the guarantee.

## technique 2: abstraction factoring for scale
The full ISA is too large for a direct monolithic proof. Define generic CHERI predicates for capability tags, sealing, bounds, permissions, and derivation. Prove reusable lemmas over the abstract instruction semantics, then instantiate each Morello instruction and system-register operation. Generate much of the Isabelle proof from the Sail model while keeping the abstraction and monotonicity theorem manually structured. This reduces repeated reasoning and makes the proof maintainable as the architecture evolves.

Evidence is concrete: “The proof consists of around 37 000 generated lines, 8 600 manually written lines, as well as 8 900 lines for the abstract model, monotonicity proof, and proof tools.” It executed in 7 hours 20 minutes CPU time, 3 hours 23 minutes elapsed with parallelism, and 18 GB peak memory (Sec. 5.3, p. 194). Inference: for VL, generated proof obligations should be paired with a small manually reviewed abstraction layer; generated Rust or proof text alone is not a security argument.

## technique 3: model-based ISA test generation and cross-model validation
Use model-based testing to find specification and implementation mismatches that deductive proofs of the model cannot expose. Generate instruction sequences from the Sail model with Isla, run them against the C emulator and hardware/QEMU, and compare outcomes; validate against Arm’s internal test suite. The paper states that its generator “generates instruction-sequence tests that give good specification coverage, used in early testing of the Morello implementation and in Morello QEMU development, and we use Arm’s internal test suite to validate our model” (Introduction, p. 175). The method complements, rather than replaces, the Isabelle theorem.

Inference: a Verus project can generate bounded traces from the verified specification and differential-test the executable Rust implementation. Tests do not prove all traces, and the paper’s coverage claim has no single percentage denominator; therefore it should not be reported as exhaustive.

## bugs, trust, and product threat
The workflow found specification defects, including a top-byte normalization bug in `CapSetBounds`, a missing unsealed check in `BranchToCapability`, and missing capability checks in `DC ZVA` (Sec. 5.4, pp. 194–195). These are evidence that formalization and proof can expose design bugs before deployment. Trusted elements include ASL-to-Sail and Sail-to-Isabelle translation, the Isabelle and SMT kernels, assumptions about address translation and exceptions, and any hardware behavior outside the model. The paper explicitly limits scope: the proof is for the ISA’s sequential semantics and does not itself verify operating systems, peripherals, or concurrent hardware.

Inference: this is a high threat area for agent-written verified Rust when unsafe interfaces, authority-bearing handles, or translation layers sit outside the proof. VL should borrow the narrow-abstraction pattern, explicit assumption list, and differential test generation. It should not claim end-to-end capability security from a local subset theorem.

## techniques for the catalog
- capability monotonicity — prove every instruction preserves subset reachability of capabilities under explicit trace and invariant assumptions
- abstraction factoring — isolate generic CHERI properties and instantiate them across a generated full-ISA model
- model-based ISA testing — generate instruction sequences from the formal model and compare emulator, QEMU, hardware, and reference outcomes

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
