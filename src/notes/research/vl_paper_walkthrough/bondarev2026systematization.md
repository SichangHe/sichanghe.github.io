# Systematization of Knowledge: Formal Verification of Consensus Protocols
(authored by agents unless marked 🧑)
Tag: `bondarev2026systematization` , [paper](http://arxiv.org/abs/2608.21935v1)

## scope and maturity scale

The abstract says this SoK analyzes “over 20 verified consensus protocols” across crash-fault-tolerant, Byzantine, proof-of-stake, and DAG families (p. 1). Its conclusion instead says “mapping over thirty protocols” (§7, p. 17); the paper does not reconcile these counts. It organizes verification by property, method, and abstraction. The introduction claims “A verification maturity scale from informal reasoning to machine-checked code proofs, enabling assessment of verification depth.” (§1, p. 2), but the paper does not enumerate maturity levels. The abstract identifies three recurring gaps: liveness, specification–implementation disconnect, and scalability. It states, “Formal verification is increasingly critical for blockchain consensus protocols, where subtle bugs can cause irreversible financial loss and network failure.” (p. 1)

The authors report “only ≈ 30% of surveyed works addressing liveness” (§5, p. 15), but give neither an exact numerator nor an exact denominator for this estimate. Inference: the Protocol–Property–Method matrix summarizes cited results rather than proving their soundness, and a verified abstract model does not establish production-code correctness. For a Verus-based Rust project, the implementation and its assumptions would need to be connected to the protocol model.

## technique 1: inductive deductive verification

Use this for unbounded safety or parameterized guarantees when a finite state bound is insufficient. Translate the algorithm or implementation into Rocq, Isabelle/HOL, Agda, TLAPS, Ivy, or a solver-backed framework. Define state invariants, refinement relations, and proof obligations; prove that every protocol step preserves each invariant (§3.1). The paper summarizes the style: “The proof proceeds by reasoning about the evolution of the global protocol state using a large collection of inductive invariants.”

The Raft/Verdi example proves state-machine safety and connects it to linearizable replication of extracted code, while Velisarios models Byzantine behavior. The Casper family separates safety and non-triviality; Stellar uses Ivy for safety and some liveness with Isabelle/HOL proving model soundness. Reusable TLA+/TLAPS components for DAG protocols show that libraries can reduce repeated proof effort (§3.1).

Inference: a workflow based on this proof style is:

1. Choose a state-machine abstraction and state the safety or refinement property.
2. Define an invariant strong enough to imply the target property.
3. Prove initialization and preservation for every transition.
4. Establish how any extracted executable implements the verified model.
5. Record assumptions such as fault thresholds, synchrony, and fixed configuration.

Inference: a corresponding Verus workflow would encode states and transitions in Rust and prove preservation with explicit assumptions and lemmas. The consensus invariant and the connection between the model and the implementation would require separate justification; this survey does not evaluate Verus.

The survey reports that deductive proofs are labor-intensive, liveness is difficult, and protocol evolution can require extensive proof revision. It also warns that Chained HotStuff's formalization leaves liveness and reconfiguration outside its model (§3.1). These are limitations of the cited results, not evidence that the underlying protocols are incorrect.

## technique 2: explicit-state and symbolic model checking

Use explicit-state checking for early bug finding and concrete counterexamples. Model the protocol as a finite transition system, express safety or liveness in temporal logic, and enumerate reachable states with TLC, PAT, or SPIN (§3.3). TLC found a Tendermint Fastsync termination counterexample during refinement. In the Ceph case study, TLC reproduced a known bug; symmetry reduction and bounded constants mitigated state growth. The survey reports: “Despite these optimizations, verification for 4 monitors required processing 206 million states and took approximately 11 minutes, with exponential growth observed beyond this point.” (§3.3, p. 10) It attributes the 24-hour timeout for complex liveness checks to Tendermint Fastsync (§3.3, p. 10). Its broader estimate is that explicit checkers exhaust resources beyond 4–10 nodes (§5, p. 15).

Use symbolic bounded model checking when explicit enumeration explodes. Encode bounded executions in SMT and let Apalache or another checker search formulas. The paper reports Apalache finding Tendermint errors in 10 minutes where TLC did not terminate, and BMC scaling to approximately 10 processes versus 3–4 for explicit checkers (§3.3). Inference: a bounded result applies to the chosen model and bounds; it does not establish an unbounded theorem.

Inference: a workflow combining these methods is:

1. Define a finite or bounded transition model and temporal property.
2. Select explicit enumeration for shallow counterexamples or symbolic SMT encoding for larger bounded spaces.
3. Run the checker and preserve the concrete trace for diagnosis.
4. Reduce state growth with symmetry, bounded constants, nondeterministic timeout events, or a domain abstraction.
5. Turn a discovered bug into a corrected model and rerun; use deductive invariants when an unbounded guarantee is required.

Inference: a Verus workflow can use bounded Rust tests or executable specifications to generate traces before proving inductive invariants. A successful bounded run cannot replace a Verus proof. The paper's explicit warning is, “However, bounded checks do not constitute full proofs, and probabilistic liveness remains out of reach.” (§3.3, p. 12)

## technique 3: timed, threshold, and communication abstractions

Use timed automata when timeout progression and message delay are part of the property. Yoo et al.'s SCP model parameterizes maximum timer values and clock gaps so UPPAAL can check timeout-sensitive safety and liveness in finite time (§4, p. 13). The survey says they introduced these abstractions “while preserving timeout-dependent logic under different quorum configurations.” Safety-only analyses may abstract timeouts as nondeterministic events, but liveness needs faithful delay and expiration relationships.

Use threshold automata and ByMC for symmetric, round-based Byzantine protocols. Represent global state with counters over local control locations; guard transitions with quorum thresholds such as receiving at least `N-F` messages. The Red Belly result verifies safety and liveness for arbitrary `N ≥ 3F + 1` (§3.3, p. 11); the abstraction avoids enumerating individual identities. The survey describes the structural limit: “TA are most natural for symmetric, threshold-driven, round-based protocols, and become less natural for consensus designs with dynamic committees or highly asymmetric control flow.” (§4, p. 14) Constructing faithful abstractions also requires substantial manual modeling.

Use the Heard-Of model when round-based communication can be represented by `HO(p,r)`, the set of processes from which process `p` receives in round `r`. This raises verification to communication patterns and supports cutoff reasoning, but is less natural for dynamic committees, threshold certificates, and DAG ordering (§4.1).

Inference: Verus can encode a threshold or Heard-Of abstraction as ghost state and prove that concrete message handlers refine abstract transitions. Quantified invariants and explicit fault assumptions must be written as Verus specifications; importing a threshold proof without proving refinement would leave the implementation gap.

## technique 4: state-management abstraction for dynamic stake

Use a static universe of validator addresses and derive active committees from blockchain state instead of modeling process creation and destruction. The AleoBFT ACL2 model records bonding and unbonding in blocks, applies a fixed lookback delay, and derives the current committee and stake distribution from the chain prefix (§4.2). The proof then targets invariants over the state-to-validator-set mapping. The survey explicitly states “the assumption that each derived committee contains less than one-third faulty stake.” (§4.2, p. 15)

Inference: an application workflow is to fix the address universe, record membership changes in blocks, apply the protocol's lookback rule, derive committee and stake, and prove transition invariants over that mapping. Inference: a Verus state machine could represent this derivation in ghost state and prove that executable transitions respect it, while explicitly assuming the committee fault bound. A separate argument would need to connect the abstraction to networking and storage code.

## what the survey says remains undone

Liveness assumptions depend on the protocol and execution model. The survey names “timeouts, message delivery, scheduler fairness, and, in some cases, randomization” (§2.2, p. 4), rather than requiring all of these in every proof. It claims, “No existing tool handles dynamic stake, liveness, and economic incentives in a unified manner.” (§5, p. 15) This is the authors' assessment, not an independently checked claim about every tool. Symbolic BMC scales only marginally further than the explicit checkers discussed above (§5). Most verified models target abstract TLA+ or Rocq specifications that diverge from production Go/Rust code; the authors write, “verified theorems do not guarantee implementation correctness, and protocol upgrades quickly invalidate verification artifacts.”

## techniques for the catalog

- inductive transition invariants — prove initialization and preservation of state, refinement, and safety properties
- explicit-state model checking — enumerate bounded executions with TLC, PAT, or SPIN to obtain concrete counterexamples
- symbolic bounded checking — encode bounded protocol behavior in SMT with Apalache or related tools
- timed automata abstraction — model timeout and delay parameters for timeout-sensitive safety and liveness
- threshold automata — replace identities with counters and quorum guards for parameterized Byzantine proofs
- Heard-Of communication abstraction — reason about per-round received-process sets instead of low-level message schedules
- dynamic-stake state derivation — derive committees from a static address universe and blockchain lookback state
- hybrid verification — combine automated transition-system checking with interactive proof obligations
