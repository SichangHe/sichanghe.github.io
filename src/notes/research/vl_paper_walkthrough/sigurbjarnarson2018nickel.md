# Nickel: A Framework for Design and Verification of Information Flow Control Systems
(authored by agents unless marked 🧑)
Tag: `sigurbjarnarson2018nickel`, [paper](https://www.usenix.org/conference/osdi18/presentation/sigurbjarnarson)

Nickel: verify information-flow security of interface spec and C implementation via Z3
- developer gives policy, state-machine spec, invariants, observational equivalence, refinement relation
- counterexamples expose covert channels or inadequate proof inputs
- applied to NiStar (decentralized IFC kernel), NiKOS (isolating kernel), ARINC 653 interface
- scope: deterministic, sequential; excludes physical timing, concurrency, unmodeled init/glue code
workflow
- 1 policy as top-level spec
- 2 state machine and operation specs
- 3 state invariant and observational equivalence, check unwinding
- 4 implement
- 5 implementation invariant and data refinement, check refinement
- policy = domains, can-flow-to, state-dependent `dom` per action
  - trusted; must be audited against design intent
purged-trace noninterference
- remove actions not allowed to influence observer u, compare outputs of next action
  - changed output means covert channel
  - example: extra spawn changes another thread's returned ID
- Verus form (inference): ghost event logs, `spec fn` purge
unwinding theorem avoids reasoning over traces
- exists invariant I and per-domain equivalence ≈ satisfying 7 conditions
  - I invariant, ≈ equivalence, ≈ consistent with `dom` and can-flow-to
  - output consistency, local respect, weak step consistency
- invariant may include unreachable states; reachability is not first-order
refinement preserves security
- noninterference is not preserved by arbitrary refinement
- prove initial relation, step preservation, output equality, `dom` agreement between M1 (spec) and M2 (implementation)
  - then Theorem 2 transfers noninterference to M2
interface design rules
- flow checks before parameter validation so error codes leak nothing
- per-domain quotas or container hierarchy
- partition names by domain, avoid sequential global IDs
- expose nondeterminism as parameters or hide it below the interface
- fixed schedule or checked time-slice allocation for scheduler flows
- NiStar labels ⟨S,I,O⟩: flow L1→L2 iff `S1 − O1 ⊆ S2 ∪ O2` and `I2 − O2 ⊆ I1 ∪ O1`
evidence
- reproduced 3 known ARINC 653 channels: missing permission check, shared ID allocation, error-code leakage
- verification time (Z3 4.6.0, 4 cores): NiStar 72 min, NiKOS 7 s, ARINC 653 8 s
- effort: one author 6 weeks (NiStar spec/proof), 2 weeks (NiKOS), 1 week (ARINC); NiStar implementation ~6 months
- NiStar spec 714 lines, invariants 398, observational equivalence 127, refinement 139
limits
- trusted: policy, condition checker, Z3, refinement checker; Coq formalizes metatheory
- cannot find channels through resources absent from the interface
- Verus lesson (inference): passing proof can still miss timing, concurrency, hardware, or a wrong policy
