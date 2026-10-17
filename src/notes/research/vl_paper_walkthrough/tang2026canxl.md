# A Formal Security Analysis of CAN XL
(authored by agents unless marked 🧑)
Tag: `tang2026canxl`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/tang-zhaozhou)

## Scope and result
The paper analyzes the CAN XL MAC sub-layer with a bit-precise nuXmv model. One stated contribution is: “We develop a bit-precise CAN XL formal model and release it to facilitate future research.” (Abstract, proceedings p. 2227 / PDF p. 2). The model covers all CAN generations (CC, FD, XL) and their interactions. The analysis finds that CAN XL inherits all known CAN CC MAC sub-layer vulnerabilities (Va–Vc) when error signalling is enabled, and introduces seven new standard vulnerabilities (V1–V7, Table 2, PDF p. 8). The authors validate every discovered vulnerability on two commercial controllers (PEAK-System PCAN-USB XL, Vector VN1641) and demonstrate two multi-stage attacks on a testbed (§7, PDF pp. 13–15). Inference: the result is a security analysis of a protocol standard, not a proof that any implementation is correct.

## Technique 1: specify security goals as CTL properties
What it is. Derive properties from the design goals of new CAN XL features and from properties that known CAN CC vulnerabilities compromise (§4.1, PDF pp. 5–6), then write them in Computation Tree Logic (CTL) in nuXmv syntax (Table 11, Appendix A, PDF p. 20). Examples: P1, a node in bus re-integration eventually leaves it; P4, a frame is accepted by all nodes or by none; P8, transmitters’ error frames let receivers detect errors; P9, a node does not encounter further errors when sending an error frame. P4 is `AG (n1.validate_frame -> AF n2.validate_frame)` and P9 is `AG !n1.increment_ec`. P7–P8 are verified for error signalling enabled only.

Inference: when to use it. Temporal properties fit a protocol with safety (“never”) and liveness (“eventually”) requirements over all bit-level executions. One property per requirement lets a counterexample name one violated requirement.

How it is done. (1) Take a requirement from the standard (P4 is “exactly outlined in the standard”) or derive one from a known attack (P5, P6, P9). (2) Add model state variables where needed: `validate_frame` is set when a node validates a frame per the standard’s validation rules; `increment_ec` is set when a node encounters an error while sending an error frame (Appendix A, PDF pp. 19–20). (3) Express the requirement in CTL; per Appendix A, P4 “states that whenever n1 validates a frame, n2 always eventually validates this frame”. Properties are defined symmetrically for the second node n2. (4) Verify each property with nuXmv on the relevant field models after reachable states are computed. (5) Analyze a violating counterexample manually to find the attacker actions (§4.4, PDF p. 8).

Evidence. The authors use BDD-based algorithms over the exhaustively computed reachable states (§4.4, PDF p. 8). Table 2 links each new vulnerability to the properties it violates (e.g., V5 violates P1 and P6). The proposed standard revision for V2 is modeled and “successfully verify P2 and P3” (§8, PDF p. 16). Inference: this is evidence for the modeled state space and assumptions only.

Verus form. Inference: represent the protocol as a Rust state machine with enums for fields and node states. Use `requires` for legal input bits and `ensures` for one-step transition contracts. Temporal claims such as P4 need a ghost transition system and induction over steps; Verus does not consume CTL. Keep the CTL property as the reference requirement and prove an inductive invariant that implies it.

Limits. A property is only as meaningful as its state variables and its translation from the standard. The paper says “we do not assume specific message schedules, payload semantics, or protocols at higher layers” (§4.3, PDF p. 6), so those layers are outside the claim.

## Technique 2: bit-precise finite-state model with attacker nondeterminism
What it is. Model each node’s MAC sub-layer as an FSM M = (S, I, O, S0, δ) synchronized to a clock whose period is one bit duration. Inputs/outputs are bits from/to the channel; states track transmit/receive status and current protocol field; S0 is idle (§4.3, PDF p. 6). All receivers behave identically and are modeled as one receiver; arbitration is decided by a winner and the contender with the closest priority; so two nodes suffice.

Inference: when to use it. A synchronous FSM fits when security depends on exact field boundaries, bit stuffing, arbitration, and error timing; nondeterminism fits when all messages and attacker actions must be covered.

How it is done. (1) Model the transitions of the state diagrams (Fig. 1, Fig. 3) at the bit level, with intermission returning to idle for unbounded message sequences. (2) Build two node variants: error signalling disabled and enabled. (3) In the enabled variant, initialize a node nondeterministically to a node type (Table 1) and to an error state it keeps; error state transitions are not modeled, because they occur only at frame boundaries. (4) Let nodes have a pending transmission at any time with a nondeterministic payload. (5) Model the physical layer as a channel combining all node and attacker outputs in SIC mode (0s override 1s). (6) Model an LL attacker (controls the link layer) that outputs 1 or 0 nondeterministically every cycle; it subsumes the HL attacker (higher layer only), and vulnerabilities are manually separated by attacker type afterward.

Evidence. Computing reachable states takes 4 min (error signalling disabled) and 13 min (enabled) on an Intel Core i7-12700H with 32GB RAM (§4.4, PDF p. 8).

Verus form. Inference: define a spec transition relation over a finite state enum and an executable `step` function, prove `step` refines the relation, and model attacker choices as ghost inputs. Encode SIC as a deterministic AND over all outputs. Unbounded temporal coverage needs an inductive invariant or an external model checker.

Limits. The attacker is remote code on a compromised ECU and must obey physical-layer rules (in SIC mode it can only change 1 to 0) (§4.2, PDF p. 6). The paper assumes nodes are synchronized to the bit stream and SIC mode; fast mode and physical-access attackers are not analyzed (§9, PDF p. 17).

## Technique 3: field-oriented decomposition and abstraction
What it is. Decompose the protocol FSM into per-field FSMs Mi with starting states S0,i and reachable ending states Fi, connected by Eq. 1: a field’s starting states equal the union of its immediate predecessors’ ending states (§4.3, PDF p. 7). The authors argue this makes the decomposition sound: any trace of a field extends backward to a full execution from the initial state. Concretely: (1) a precise model of the common arbitration field; per frame format, (2) an abstracted model of the variable-value control-to-CRC fields coded with bit stuffing and (3) a precise model of the fixed-format ACK-to-intermission fields; (4) precise models for special frames (e.g., error frames).

Inference: when to use it. Decompose when a monolithic model is intractable and the protocol processes fields sequentially.

How it is done. (1) Choose field boundaries. (2) Abstract CRC computation by choosing CRC field values nondeterministically, and let receivers nondeterministically choose whether to detect a CRC error where CRC checks occur; this over-approximates behaviors, may produce spurious counterexamples, and prevents proving CRC-algorithm-specific properties (§4.3, PDF p. 7). (3) Carry cross-field facts through extra state variables; for P5, a variable tracking whether transmitted and received bits differ is propagated across model boundaries using Algorithm 1 (Appendix A, PDF p. 20). (4) Verify each property on the relevant models: P2 on all models, P6 on the ACK-intermission models only (§4.4, PDF p. 8).

Evidence. A monolithic error-signalling-disabled model with precise CRC times out after one hour of reachable-state computation (§4.4, PDF p. 8). Inference: this one comparison removes decomposition and abstraction together, so it does not show which of the two is needed. Spurious counterexamples are ruled out by validating all vulnerabilities on hardware (§7.1). The authors state: “Human expertise is required to identify appropriate boundaries to decompose the protocol into separate FSMs.” (§9, PDF p. 17).

Verus form. Inference: use separate spec relations per field group and prove that boundary states match. Model CRC as an uninterpreted spec function only if the property does not depend on its arithmetic.

## Technique 4: reachable-state saturation and counterexample reconstruction
Algorithm 1 (PDF p. 7) computes the least fixpoint of Eq. 1. It starts arbitration at idle and other fields empty; for each field j it sets the starting states to the union of predecessors’ ending sets, then repeatedly checks `AF F[j]` and adds each counterexample’s last state to F[j] until no counterexample remains; it repeats over all fields until no F changes. Arbitration’s starting states include ACK-intermission ending states to model unbounded message exchange (§4.4, PDF p. 7).

Algorithm 2 (PDF p. 8) builds a full trace from a field-local counterexample σ. For each immediate predecessor field it checks `¬EF σ(0)`; a counterexample is prepended and the procedure recurses. At arbitration it checks `idle → ¬EF σ(0)`; if none is found, the violation needs several consecutive messages and the search continues through predecessors.

Then refine the attacker model: manually find the attacker actions in a counterexample, change the model so the attacker does not perform them, and verify again “until no more violations are found” (§4.4, PDF p. 8). The authors say Algorithm 1 could be reused for other protocols if modified to take initial states and field/phase order as inputs (§9, PDF p. 17).

Verus form. Inference: a verified explorer could maintain a finite set of abstract states with loop invariants that every inserted state is reachable and the set is closed under the transition relation. Reconstruction could carry a ghost predecessor map.

## What is proved, measured, and trusted
The formal evidence is exhaustive model checking of the decomposed models. Hardware validation (§7.1, PDF pp. 13–14): all vulnerabilities are triggered on PCAN-USB XL by the same attacker actions the analysis found; on VN1641 V1 and V2 need different actions because it deviates from the standard; the authors model VN1641’s deviations and find it still vulnerable to V1 and V2. The validation also exposed a PCAN XL implementation bug that PEAK-System fixed by firmware. Multi-stage attacks (§7.2, PDF pp. 14–15) use 4 ECUs simulated on VN1641 channels with 50 periodic messages and an STM32 LL attacker: ID mapping of all 50 periodic IDs in about 3 min (vs. about 9 min for an HL attacker on CAN CC in prior work), above 99.9% suppression in target node shutdown, and 100% success over 2000 attempts for interception, replacement, and mixed-network attacks.

Inference: trusted assumptions include nuXmv, the CTL encoding, soundness of the abstractions, synchronized bit timing, SIC mode, and the authors’ transcription of the standard. On fast mode the authors expect it “to only lessen the impact of V1.2” and state “All other vulnerabilities remain intact” (§9, PDF p. 17); this is a reasoned expectation, not a checked result.

## techniques for the catalog
- ctl security properties — express safety and liveness requirements over protocol states and check them exhaustively
- bit-precise attacker fsm — model every bus bit, node state, and nondeterministic attacker action
- field decomposition — split sequential protocol fields into FSMs joined by predecessor ending states, with CRC over-approximated nondeterministically
- reachable-state saturation — iteratively discover all ending states with `AF F` checks
- counterexample reconstruction — prepend predecessor-field traces until a complete idle-to-violation execution is obtained
- attacker refinement — exclude the manually identified action from a violating model and rerun to enumerate distinct attacks
