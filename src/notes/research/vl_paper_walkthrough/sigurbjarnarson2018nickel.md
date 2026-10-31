# Nickel: A Framework for Design and Verification of Information Flow Control Systems
(authored by agents unless marked 🧑)
Tag: `sigurbjarnarson2018nickel`, [paper](https://www.usenix.org/conference/osdi18/presentation/sigurbjarnarson)

## problem and result
Nickel verifies information-flow security at both an interface specification and a C implementation. Developers provide a policy, state-machine specification, state invariants, observational equivalence, and a data-refinement relation. Nickel reduces unwinding and refinement conditions to SMT constraints and invokes Z3; counterexamples expose covert channels or inadequate proof inputs. The paper’s abstract says: “Nickel is a framework that helps developers design and verify information flow control systems by systematically eliminating covert channels inherent in the interface, which can be exploited to circumvent the enforcement of information flow policies.” (Abstract, PDF p. 287)

The paper also says: “Nickel provides a formulation of noninterference amenable to automated verification, allowing developers to specify an intended policy of permitted information flows.” (Abstract, PDF p. 287) The systems are deterministic, sequential, and modeled through explicit interfaces. Nickel verifies NiStar, a decentralized information-flow-control kernel; NiKOS, a process-isolating kernel; and the ARINC 653 communication interface. Its guarantees exclude physical timing, sound, energy, concurrency, and unmodeled initialization/glue code (Sections 1, 3.5, and 4, PDF pp. 288, 293–294).

## workflow
The paper gives five developer steps (Section 4, PDF p. 294):
1. Write the intended information-flow policy as the top-level specification
2. Model the system as a state machine and specify every interface operation
3. Construct a state invariant and observational equivalence for the interface, then check unwinding conditions
4. Implement each operation
5. Construct an implementation invariant and data refinement between interface and implementation, then check refinement conditions

Policies consist of domains, a can-flow-to relation, and a state-dependent `dom` function that assigns each action to a domain. The paper’s ProcessDomain example permits scheduler-to-process, process-to-scheduler, and self flows, and maps `yield` to the scheduler (Section 4, PDF p. 294). The policy is trusted: the authors warn that developers must audit it against design intent (Section 4, PDF p. 294).

## technique: purged-trace noninterference
For two domains prohibited from communicating, construct an execution trace, remove actions not permitted to influence the observing domain, and compare the output of a retained action in the original and purged traces. A changed output indicates a covert channel (Section 2.1, PDF p. 289). The formal definition uses `sources(tr,u,s)` to identify domains permitted to influence u directly or through intermediate actions. `purge(tr,u,s)` returns all sub-traces that retain required actions and optionally remove other actions. For every trace, next action, and such purged trace, the next action must produce equal outputs after the original and purged traces (Section 3.2, PDF p. 291). Figure 1 demonstrates a sequential thread-ID channel: after one thread inserts an extra spawn, another thread observes a changed returned identifier (Section 2.1, PDF p. 289).

Inference: in Verus, the trace and purge functions could be ghost `spec fn`s over an explicit event log, with a theorem relating outputs of two logs. Verus cannot prove an omitted physical channel unless the specification models it.

## technique: unwinding with invariants and equivalence
Directly proving Definition 2 requires reasoning about all possible traces. The authors state: “The unwinding theorem obviates the need to reason about traces to prove noninterference; instead, it suffices to show that the unwinding conditions hold for each action.” (Section 3.3, PDF p. 292) Nickel instead supplies an unwinding theorem: if there exists a state invariant I and domain-indexed observational equivalence relation ≈ satisfying the seven conditions in Figure 6, then noninterference follows (Section 3.3, PDF pp. 291–292). The conditions are: I is invariant; ≈ is an equivalence relation; ≈ is consistent with `dom` and can-flow-to; output consistency; local respect; and weak step consistency (Figure 6, PDF p. 292).

Apply it step by step: (1) define I and prove it holds initially and is preserved by every action; (2) define which state pairs each domain cannot distinguish; (3) prove equivalence and policy consistency; (4) for states satisfying I that are equivalent for the action’s domain, prove equal outputs; (5) for a state satisfying I, prove an action whose domain cannot flow to u leaves the state equivalent for u; (6) for states satisfying I that are equivalent for both observer u and the action’s domain, prove the successor states equivalent for u. Nickel checks these first-order formulas with Z3 (Sections 3.3 and 4, PDF pp. 292, 294). The invariant may include unreachable states, which is intentional because reachability is not first-order expressible (Section 3.3, PDF p. 292).

The design intuition is concrete: outputs should depend only on objects the action’s domain can read; updates should depend only on old values and readable objects; newly created objects must not exceed the action’s authority; and if an object becomes newly readable after an action, the action’s domain must have been able to read it before (Section 3.3, PDF p. 292).

## technique: refinement-preserving implementation security
Noninterference is not generally preserved by arbitrary refinement. Nickel uses two systems with the same actions and outputs: M1 is the interface specification and M2 the implementation. Developers provide an implementation invariant I2 and relation ∝ between concrete and abstract states. They prove initial-state relation, step preservation, and output equality (Section 3.4, PDF p. 293). They also prove policy refinement: the `dom` assignment agrees for corresponding traces. The refinement theorem then transfers noninterference from M1 to M2 when M1 has unwinding inputs and M2 has the refinement inputs (Theorem 2, PDF p. 293).

Inference: a Verus version would represent M1/M2 states as ghost models and prove initialization, transition simulation, and output equality with `ensures`; this is a proposed adaptation, not a Verus implementation reported by the paper.

## interface design rules
The authors give interface design guidelines based on their experience verifying the three systems. Perform flow checks before detailed parameter validation so later error codes cannot reveal forbidden state. Limit shared resources with per-domain quotas or a hierarchy of containers. Partition resource names by domain, or avoid sequential global identifiers. Expose nondeterministic choices as parameters, specify the allocation algorithm, or hide the choice below the interface. Reduce flows to the scheduler with a fixed schedule or application-controlled time-slice allocation with runtime flow checks (Section 5, PDF pp. 295–296). Section 2 also catalogues statistical-information, external-device/service, and mutable-label channels (PDF pp. 288–289).

NiStar uses labels as secrecy, integrity, and ownership sets. Safe flow from L1 = ⟨S1,I1,O1⟩ to L2 = ⟨S2,I2,O2⟩ is defined by `(S1 − O1 ⊆ S2 ∪ O2) ∧ (I2 − O2 ⊆ I1 ∪ O1)` (Definition 3, PDF p. 296). This allows deliberate declassification and endorsement through ownership while preventing unauthorized flows.

## evidence and limits
Nickel reproduced three known ARINC 653 covert channels—missing permission checks, shared identifier allocation, and error-code leakage—and verification succeeded after fixes (Section 7, PDF p. 299). Figure 11 reports separate rows: policy lines are NiStar 26, NiKOS 14, ARINC 653 33; interface-specification lines are 714, 82, 240; interface invariants are 398, 63, 66; observational equivalence is 127, 56, 80; implementation invariants are 52, 7, and not applicable; and data-refinement inputs are 139, 30, and not applicable (Figure 11, PDF p. 299). Specification and verification took one author six weeks for NiStar, two weeks for NiKOS, and one week for ARINC 653; implementation of NiStar took roughly six months across several researchers (Section 8, PDF p. 299). Using Z3 4.6.0 on four cores, verification took 72 minutes, 7 seconds, and 8 seconds for NiStar, NiKOS, and ARINC 653 respectively (Section 8, PDF p. 300). Inference: these measurements do not establish verification costs for other systems.

For each injected covert-channel example, Nickel produced a counterexample; a round-robin scheduler experiment showed variable logical-time gaps, while verified NiStar’s gaps remained constant (Section 8, PDF p. 299). Trusted components include the policy, Nickel’s condition checker, Z3, and for implementation verification the refinement checker; Coq formalizes the metatheory (Section 4 and Figure 7, PDF p. 294). Initialization and glue code are unverified. Nickel does not support concurrent systems, requires deterministic interface specifications, uses a state-independent can-flow-to relation, and cannot uncover channels based on resources absent from the interface (Section 3.5, PDF p. 293).

Inference: for agent-written verified Rust, Nickel’s main product threat is specification omission: a passing proof can still miss timing, concurrency, hardware, or a wrong policy. Its reusable approach is to prove interface noninterference and then check data and policy refinement for the implementation.

## techniques for the catalog
- purged-trace noninterference: compare outputs before and after removing policy-disallowed actions from a trace
- unwinding verification: prove invariant, equivalence, policy consistency, output consistency, local respect, and weak step consistency per action
- refinement-preserving security: relate implementation states to interface states and prove step and output simulation
- counterexample-guided interface design: use SMT counterexamples to repair covert channels or insufficient invariants
- label-based flow policy: combine secrecy, integrity, and ownership labels with explicit safe-flow checks
