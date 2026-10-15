# Systematization of Knowledge: Formal Verification of Consensus Protocols
(authored by agents unless marked 🧑)
Tag: `bondarev2026systematization` , [paper](http://arxiv.org/abs/2608.21935v1)

Inference: the human's research notes already contain an earlier survey entry for this paper; this study adds the paper's step-by-step abstraction and tool-selection procedures, implementation-boundary analysis, and the concrete limits and denominators reported in its full text.

## scope and maturity scale

This SoK analyzes more than 20 verified consensus protocols across crash-fault-tolerant, Byzantine, proof-of-stake, and DAG families. It organizes each protocol by property, method, and abstraction and proposes a maturity scale from informal reasoning to machine-checked code proofs. The abstract identifies three recurring gaps: liveness, specification–implementation disconnect, and scalability. The paper states, “Formal verification is increasingly critical for blockchain consensus protocols, where subtle bugs can cause irreversible financial loss and network failure.”

A reader should separate three claims. First, the matrix is a survey of what cited works report; it is not a new soundness proof. Second, percentages such as “≈ 30%” of surveyed works addressing liveness have the survey corpus as their denominator, not all consensus literature (§5). Third, a verified abstract model is not automatically a verified production implementation. Inference: this distinction is directly relevant to VL, whose goal is Rust verified with Verus. A Verus proof establishes the written contract over the modeled code and assumptions; it does not close an unmodeled protocol or deployment boundary.

## technique 1: inductive deductive verification

Use this for unbounded safety or parameterized guarantees when a finite state bound is insufficient. Translate the algorithm or implementation into Rocq, Isabelle/HOL, Agda, TLAPS, Ivy, or a solver-backed framework. Define state invariants, refinement relations, and proof obligations; prove that every protocol step preserves each invariant (§3.1). The paper summarizes the style: “The proof proceeds by reasoning about the evolution of the global protocol state using a large collection of inductive invariants.”

The Raft/Verdi example proves state-machine safety and connects it to linearizable replication of extracted code, while Velisarios models Byzantine behavior. The Casper family separates safety and non-triviality; Stellar uses Ivy for safety and some liveness with Isabelle/HOL proving model soundness. Reusable TLA+/TLAPS components for DAG protocols show that libraries can reduce repeated proof effort (§3.1).

Steps to apply:
1. Choose a state-machine abstraction and state the safety or refinement property.
2. Define an invariant strong enough to imply the target property.
3. Prove initialization and preservation for every transition.
4. If code is extracted, establish the refinement from model transitions to executable operations.
5. Record assumptions such as fault thresholds, synchrony, and fixed configuration.

Inference: in Verus, encode state and transition functions in Rust, state `requires` assumptions and `ensures` postconditions, and use `proof fn` lemmas plus loop invariants to prove transition preservation. Verus does not automatically supply the consensus invariant or the model-to-implementation refinement; those are the agent's proof obligations.

The survey reports that deductive proofs are labor-intensive, liveness is difficult, and protocol evolution can require extensive proof revision. It also warns that Chained HotStuff's formalization leaves liveness and reconfiguration outside its model (§3.1). These are limitations of the cited results, not evidence that the underlying protocols are incorrect.

## technique 2: explicit-state and symbolic model checking

Use explicit-state checking for early bug finding and concrete counterexamples. Model the protocol as a finite transition system, express safety or liveness in temporal logic, and enumerate reachable states with TLC, PAT, or SPIN (§3.3). TLC found a Tendermint Fastsync termination counterexample during refinement; in a Ceph case study, symmetry reduction and bounded constants reproduced a known bug, but four monitors still required 206 million states and about 11 minutes. The paper reports that complex liveness checks timed out after 24 hours and that explicit verification usually stops around four to ten nodes.

Use symbolic bounded model checking when explicit enumeration explodes. Encode bounded executions in SMT and let Apalache or another checker search formulas. The paper reports Apalache finding Tendermint errors in 10 minutes where TLC did not terminate, and BMC scaling to approximately 10 processes versus 3–4 for explicit checkers (§3.3). Bounded results are not unbounded proofs: node, round, and timer limits remain assumptions.

Steps:
1. Define a finite or bounded transition model and temporal property.
2. Select explicit enumeration for shallow counterexamples or symbolic SMT encoding for larger bounded spaces.
3. Run the checker and preserve the concrete trace for diagnosis.
4. Reduce state growth with symmetry, bounded constants, nondeterministic timeout events, or a domain abstraction.
5. Turn a discovered bug into a corrected model and rerun; use deductive invariants when an unbounded guarantee is required.

Inference: a Verus workflow can use bounded Rust tests or executable specifications to generate traces before proving inductive invariants. A successful bounded run cannot replace a Verus proof. The paper's explicit warning is, “bounded checks do not constitute full proofs, and probabilistic liveness remains out of reach.”

## technique 3: timed, threshold, and communication abstractions

Use timed automata when timeout progression and message delay are part of the property. UPPAAL parameterizes maximum timer values and clock gaps so timeout-sensitive safety and liveness can be checked in finite time (§4). Safety-only analyses may abstract timeouts as nondeterministic events, but liveness needs faithful delay and expiration relationships.

Use threshold automata and ByMC for symmetric, round-based Byzantine protocols. Represent global state with counters over local control locations; guard transitions with quorum thresholds such as receiving at least `N-F` messages. The Red Belly result verifies safety and liveness for arbitrary `N ≥ 3F + 1`; the abstraction avoids enumerating individual identities. Its limitation is structural: dynamic committees and asymmetric or DAG control flow fit poorly and require substantial manual modeling (§4).

Use the Heard-Of model when round-based communication can be represented by `HO(p,r)`, the set of processes from which process `p` receives in round `r`. This raises verification to communication patterns and supports cutoff reasoning, but is less natural for dynamic committees, threshold certificates, and DAG ordering (§4.1).

Inference: Verus can encode a threshold or Heard-Of abstraction as ghost state and prove that concrete message handlers refine abstract transitions. Quantified invariants and explicit fault assumptions must be written as Verus specifications; importing a threshold proof without proving refinement would leave the implementation gap.

## technique 4: state-management abstraction for dynamic stake

Use a static universe of validator addresses and derive active committees from blockchain state instead of modeling process creation and destruction. The AleoBFT ACL2 model records bonding and unbonding in blocks, applies a fixed lookback delay, and derives the current committee and stake distribution from the chain prefix (§4.2). The proof then targets invariants over the state-to-validator-set mapping while assuming each derived committee has less than one-third faulty stake.

Steps are: fix the address universe; record membership changes in blocks; apply the protocol's lookback rule; derive committee and stake; prove transition invariants over the derived mapping. Inference: a Verus state machine can keep a ghost map from chain prefixes to validator sets and prove each executable block transition preserves the mapping and fault bound. This is an abstraction technique, so a separate refinement argument must connect it to networking and storage code.

## what the survey says remains undone

The SoK reports that only approximately 30% of surveyed works address liveness. Liveness depends on partial synchrony, timeout progression, scheduler fairness, and randomization; no surveyed tool handles dynamic stake, liveness, and economic incentives in one framework (§5). Explicit checkers typically exhaust resources beyond 4–10 nodes, and symbolic BMC scales only marginally further. Most verified models target abstract TLA+ or Rocq specifications that diverge from production Go/Rust code; the authors write, “verified theorems do not guarantee implementation correctness, and protocol upgrades quickly invalidate verification artifacts.”

Inference: VL should reuse the survey's property–method matrix and its separation of safety, liveness, economic, and implementation claims. Work already covered includes generic Raft/HotStuff safety proofs, explicit-state bug finding, threshold automata, and timer abstractions. A product-specific gap is a measured refinement pipeline from Verus Rust implementation to consensus-level properties, including upgrade stability and liveness assumptions. Threat to a verified-Rust product is high when agents silently verify an abstract model instead of linked code, moderate for proof-maintenance cost, and low for the soundness of a checked invariant under explicit assumptions.

## techniques for the catalog

- inductive transition invariants — prove initialization and preservation of state, refinement, and safety properties
- explicit-state model checking — enumerate bounded executions with TLC, PAT, or SPIN to obtain concrete counterexamples
- symbolic bounded checking — encode bounded protocol behavior in SMT with Apalache or related tools
- timed automata abstraction — model timeout and delay parameters for timeout-sensitive safety and liveness
- threshold automata — replace identities with counters and quorum guards for parameterized Byzantine proofs
- Heard-Of communication abstraction — reason about per-round received-process sets instead of low-level message schedules
- dynamic-stake state derivation — derive committees from a static address universe and blockchain lookback state
- hybrid verification — combine automated transition-system checking with interactive proof obligations

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
