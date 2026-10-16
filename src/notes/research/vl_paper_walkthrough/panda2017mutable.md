# Verifying Reachability in Networks with Mutable Datapaths
(authored by agents unless marked 🧑)
Tag: `panda2017mutable`, [paper](https://www.usenix.org/conference/nsdi17/technical-sessions/presentation/panda-mutable-datapaths)

## scope
VMN verifies reachability and isolation in networks containing stateful middleboxes whose forwarding changes with packet history. Its central abstraction is a middlebox model plus abstract packet-class oracles, followed by reduction to a small network slice and an SMT decision procedure. The paper says, “With this approach, we do not need a new model for every middlebox, only one per middlebox type.” (section 1, PDF p. 3; printed p. 700).

## technique: oracle-based middlebox modeling
Use this model when packet classification is complex or implementation-specific but forwarding consequences are specifiable. A model is loop-free and consists of guarded rules that inspect packet headers, configuration, state sets/maps, and abstract Boolean oracles. Each rule ends with `forward(...)`; classification such as `malicious(p)` is intentionally uninterpreted. The firewall example first drops packets from tainted sources, then ACL-blocked packets, then records a malicious source and drops, otherwise forwards (Listing 1, section 2.1, PDF pp. 3–4).

Steps: (1) define configuration (ACLs, address maps, policy classes); (2) declare state (sets, lists, maps); (3) declare oracles for opaque classification; (4) write ordered guarded forwarding rules; (5) instantiate models for every middlebox type; (6) document each oracle's worst-case meaning. The paper says, “We limit our modeling language to not support looping (e.g., for, while, etc.) and only support branching through partial functions.” (section 2.1, PDF p. 3).

Inference: Verus can represent the forwarding model as a pure function over packet and ghost state, with `requires`/`ensures` for rule effects and a specification-level oracle. A proof can show policy consequences under all oracle results, but it does not verify the opaque classifier or the actual middlebox binary.

## technique: flow-parallel and origin-agnostic slicing
A slice is a subnetwork closed under forwarding and state, with an invariant evaluable inside it iff evaluable in the full network. Flow-parallel middleboxes keep each flow's state independent; therefore choose the smallest subnetwork containing the invariant's endpoints and close it under forwarding. Origin-agnostic middleboxes may share state, but their behavior depends on current state rather than transition history; include one representative endpoint from each policy-equivalence class. The paper states, “A slice is a subnetwork that is closed under state.” (section 3.2, PDF p. 7).

Steps: (1) express the invariant's packet/data class; (2) find the smallest subnetwork containing referenced nodes; (3) add nodes needed for forwarding closure; (4) for shared-state middleboxes, add one host per policy class; (5) prove the slice is closed under state; (6) check only that slice. The paper's formal argument uses a surjection/bisimulation between full-network and slice states (Appendix C, PDF p. 20).

Inference: encode the slice projection as a ghost map and prove transition simulation in Verus. This is an inference; the paper uses mathematical bisimulation and Z3 rather than Verus.

## technique: symmetry reduction
Define two invariants as symmetric when their smallest slices are isomorphic up to middlebox type and configuration. Verify one representative per symmetry class. This reduces the number of checks as a network grows. The paper says, “Symmetry can be determined by comparing the smallest slices in which each invariant can be evaluated, and seeing if the graphs are isomorphic up to the type and configuration of individual middleboxes.” (section 3.3, PDF p. 8).

Steps: derive each invariant's smallest slice; canonicalize its graph and middlebox labels; group isomorphic slices; check one invariant per group; transfer the result by the isomorphism. Inference: Verus needs a representation of graph isomorphism and a proof that the invariant is preserved under the mapping; this is useful only when policy equivalence is explicit.

## technique: first-order SMT decision procedure
VMN translates each middlebox model, network transfer function, and end host into first-order formulas. It conjoins the slice model with the negation of the invariant and asks Z3 for satisfiability. Unsatisfiable means the invariant holds; a satisfying assignment is a counterexample. The paper says, “VMN checks invariants by invoking Z3 to check whether the conjunction of the slice model and invariants is satisfiable.” (section 4.2, PDF pp. 8–9).

Steps: (1) create formulas for middlebox instances; (2) compile network links and packet events; (3) encode end hosts and temporal state; (4) negate the desired invariant; (5) call Z3; (6) report unsatisfiable as proved or extract the satisfying assignment as a violating execution. Appendix D (PDF pp. 20–21) argues for expressing restricted models in EPR-F: middleboxes must be passive, send finitely many responses per input, and have loop-free processing pipelines. Explicit closure axioms would be required to guarantee Z3 termination; generating them is left to future work. The implementation is reported to terminate on qualifying examples without these axioms.

Inference: Verus can prove the same finite-state transition lemmas directly, but it cannot claim Z3's satisfiability result without trusting the solver or importing a certificate. Use `spec fn` predicates and proof lemmas for invariants; keep solver output as external evidence.

## evidence, trust, and limits
The evaluation models a datacenter with 1,000 end hosts, stateful firewalls, load balancers, and IDPSs; each experiment reports 100 runs (section 5.1, PDF pp. 9–10). For 1,000 policy-equivalence classes, Figure 3 reports total verification times reaching hundreds of seconds; for these flow-parallel models, individual slice size is independent of both policy complexity and network size. One ISP experiment fixes the topology at 75 subnets but only three policy classes, so three representative slices suffice (section 5.3.3, PDF p. 12). Z3 version 4.4.2 is used; timeouts return `unknown`, so termination is not a logical guarantee for arbitrary formulas (section 4.2, PDF pp. 8–9).

The paper explicitly cannot find bugs inside classifier code, because oracles abstract it away, and mutable datapaths are EXPSPACE-complete in general (sections 1–2, PDF pp. 2–5). Inference: trusted components include hand-written middlebox models, oracle assumptions, topology/configuration input, the logical translation, Z3, and the model-to-deployment correspondence. Inference: threat to agent-written verified Rust is high for mis-modeled stateful devices and oracle classification; it is moderate for forwarding and slice proofs if models are complete.

## what VL should reuse
Inference: reuse oracle boundaries, slice closure proofs, policy-equivalence classes, symmetry, and counterexample-producing satisfiability checks. Existing static datapath checkers do not cover mutable state; VL should not redo their snapshot algorithms. Inference: verified Rust should pair a machine-checked slice simulation with explicit trusted-oracle declarations and reject deployment when a required oracle assumption is missing.

## techniques for the catalog
- oracle middlebox model: specify guarded forwarding while abstracting complex packet classification
- flow-parallel slicing: close a smallest endpoint subnetwork under forwarding and per-flow state
- origin-agnostic slicing: add representatives of each policy class for shared state
- symmetry reduction: verify one representative among isomorphic invariant slices
- SMT reachability: negate invariants and use satisfiability plus counterexamples to decide violations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Figure 9: (a) shows the pipeline at each peering point for an ISP; (b) distribution of time to verify each invariant given this pipeline when the ISP peers with other networks at 5 locations; (c) average time to verify each invariant when the ISP has 75 subnets."): checked the whole paper including appendices, quotes, model and slicing steps, solver limits, benchmarks and references; corrected truncated quotes, page and section references, whole-network timing, and the unsupported claim that closure axioms are generated; marked trust and reuse conclusions as inference and linked the printed publisher URL; did not reproduce experiments or verify model-to-binary correspondence.
