# CV-Rules: Serializability Verification of Concurrency Control Protocols via Explicit Transaction Ordering
(authored by agents unless marked 🧑)
Tag: `hoshino2026cvrules`, [paper](http://arxiv.org/abs/2606.25409v1)

## result and trusted boundary
CV-Rules characterize multi-version serializability with an explicit transaction partial order and two local per-read obligations. C-rule requires each read source before its reader; V-rule requires every competing writer either before the source or after the reader. Theorem 11 proves equivalence with serializability; Theorem 17 proves equivalence with MVSG acyclicity (sections 3–4, pages 6–10). The paper states: “We prove that CV-rules, serializability, and MVSG acyclicity are all equivalent.”

The authors verify five abstract protocols—2PL, MVTO, SSN, Aria, and SnapChain—by constructing their orders and proving the two rules (section 5, pages 11–16). All theorem results except complexity bounds are mechanized in Lean with no additional axioms or admitted goals. The development has 11,153 lines in 105 modules, 227 definitions, and 506 lemmas (Table 1, page 17). The model omits operation ordering, abort handling, and real-time ordering (section 2.1, page 3; section 5, page 11). Thus soundness is for committed executions satisfying each protocol’s abstract constraints, not for a complete database implementation.

## technique 1: explicit-order serializability

what it is and when to use it
Use an ordered history `(h, ≺)` when a protocol naturally constructs a lock, timestamp, batch, or certification order. The order may be partial. This exposes protocol mechanisms directly instead of deriving a serial order from a dependency graph.

how to do it
1. Model a history by finite data items, transactions, operations, initialization writer `t0`, and a version function `vf(x,ti)` giving the source transaction for each read (Definition 1, page 3).
2. Define a strict partial order `≺` with `t0` minimal (Definition 7, page 5).
3. Check C-rule: `vf(x,ti)=tj` implies `tj ≺ ti` (Definition 8, page 5).
4. Check V-rule for each other writer `tk` of x: `tk ≺ tj` or `ti ≺ tk` (Definition 9, page 5).
5. Extend the partial order to a total order with Szpilrajn’s theorem. C-rule and V-rule survive extension; V-rule prevents any writer from interposing between source and reader, so the extended order reproduces `vf` (Theorem 11 proof sketch, pages 6–7).

The paper’s exact intuition is: “if ti reads x from tj, no other write to x can interpose between tj and ti in the serialization order.” It also states: “The order ≺ represents the intended serialization order.”

Verus form (inference)
Represent transactions and data items as finite ghost sets, `vf` as a specification map, and `≺` as a relation. State C/V obligations in `requires`/`ensures` on proof functions. Prove transitivity and order extension as separate `proof fn` lemmas. This is an inference because the paper is mechanized in Lean, not Verus.

## technique 2: decompose V-rule into endpoint comparability and no interposition

Under C-rule, V-rule is equivalent to two obligations (Theorem 13, page 7): every competing writer is comparable with both read endpoints, and no competing writer lies strictly between source and reader. This reduces proof case splits and matches protocol mechanisms. The authors use the decomposition for 2PL, MVTO, and SSN (section 6.2, page 17); Aria’s batch structure determines the disjunct directly.

Apply it by proving endpoint comparability from the protocol’s ordering primitive, then prove no interposition from version selection or certification. For MVTO, timestamps provide total comparability and selecting the greatest prior timestamp proves no interposition (section 5.2, pages 12–13). For 2PL, mutual exclusion orders competing locks and maximality of the source prevents interposition (section 5.1, page 12).

Verus form (inference)
Make the two obligations separate lemmas with explicit quantified triggers. This can keep solver contexts smaller than a single disjunctive V-rule. Use relation lemmas and finite-set quantification supported by Verus; do not assume totality when the protocol provides only a partial order.

## technique 3: recover hidden protocol orders

SSN originally gives certification conditions but no explicit serial order. The paper defines forward and backward dependency sets, `η(t)` as the maximum forward commit timestamp, and `π(t)` as the minimum backward timestamp or own timestamp. Certification is `η(t) < π(t)` (section 5.3, pages 13–14). It then constructs `ρ(t) = (π(t), -ct(t))` with lexicographic order; reversing commit timestamps breaks ties so backward anti-dependencies are ordered correctly. C-rule follows from `ct(tj) ≤ η(ti) < π(ti)`, and V-rule follows by contradiction on an alleged interposer (pages 14–15).

Aria’s hidden order combines batch order with dependency-based reordering. Earlier batches precede later ones; within a batch, RAW-dependent transactions move before predecessors, while others remain after them (section 5.4, pages 15–16). The proof shows Aria’s unique-write constraint is unnecessary for serializability in this version-function model.

Verus form (inference)
Encode SSN’s pair as a datatype with a lexicographic `spec fn` order and prove injectivity from commit-timestamp injectivity. Encode Aria batch and dependency relations as ghost state, then prove C/V by cases on batch position and dependency type.

## technique 4: bounded-width decision procedure

C-rule induces a partial order from reads-from edges. Define width as the largest antichain. For fixed width k, partition the order into at most k chains using Dilworth’s theorem. Search states are k-component chain-progress vectors; at each state, place an eligible next transaction and reject a placement that introduces a V-rule violation (Theorem 15, pages 8–9). The paper gives O(n^(k+1)|D|) time for fixed k, but says complexity bounds are informal and outside Lean mechanization (section 6.2, page 17).

Verus form (inference)
Implement the search as a terminating recursive proof function with a decreases measure equal to unplaced transactions. Prove soundness and completeness of reachable final states separately. Treat the asymptotic bound as documentation unless a complexity model is formalized.

## protocol evidence and limits

The five soundness theorems are abstract: 2PL derives order from lock conflicts; MVTO from timestamps; SSN from `ρ`; Aria from batches; SnapChain from per-item view chains (section 5, pages 11–16). SnapChain enforces V-rule by construction: each view-chain slot has one writer when it has readers, and slot order places competing writers before the source or after the reader (section 5.5, page 16).

The model intentionally excludes abort behavior and scheduling power. The paper warns that all five protocols are equivalent only at the version-function level and that performance depends on commit rate and workload, which are not modeled (section 3.5, page 9). These are material assumptions, not evidence of implementation correctness.

## threat and reuse for VL

Inference: CV-Rules offer VL a reusable proof architecture for concurrent verified Rust components: identify an explicit abstract order, then prove local obligations that connect each read or state observation to that order. Verus state machines can represent the abstract order while executable Rust maintains locks, timestamps, or queues.

Inference: the main product threat is specification mismatch. A proof can pass for the version-function abstraction while omitting aborts, operation order, memory ownership, or network failures. VL should state these omissions explicitly and connect each abstract relation to executable transitions with refinement lemmas.

## techniques for the catalog
- explicit transaction order — verify serializability by constructing a protocol order and checking C-rule and V-rule
- V-rule decomposition — split competing-writer reasoning into endpoint comparability and no interposition
- hidden-order recovery — derive logical timestamps or batch orders from certification mechanisms that lack an explicit serial order
- bounded-width search — decide serializability by exploring chain-progress vectors when C-rule width is fixed
- view-chain design — enforce V-rule structurally with per-item writer/reader slots
- Lean mechanization pattern — separate core definitions, generic order lemmas, protocol-specific constructions, and audited theorem instantiations
Checked 2026-10-15 against paper hoshino2026cvrules: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
