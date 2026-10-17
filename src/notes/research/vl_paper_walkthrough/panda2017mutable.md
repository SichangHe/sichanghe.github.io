# Verifying Reachability in Networks with Mutable Datapaths
(authored by agents unless marked 🧑)
Tag: `panda2017mutable`, [paper](https://www.usenix.org/conference/nsdi17/technical-sessions/presentation/panda-mutable-datapaths)

## scope
VMN checks isolation invariants in networks containing stateful middleboxes whose forwarding changes with packet history. Its central abstraction is a forwarding model plus abstract packet-class oracles, followed by reduction to a network slice and an SMT decision procedure. The paper says, “With this approach, we do not need a new model for every middlebox, only one per middlebox type.” (section 1, PDF p. 3; printed p. 700). The paper link above appears on the PDF's cover page.

## technique: oracle-based middlebox modeling
Inference: use this model when packet classification is complex or implementation-specific but forwarding consequences are specifiable. A model is loop-free and consists of guarded rules that inspect packet headers, configuration, state, and oracle results. Oracles have specified input and output types; outputs need not be Boolean. Each rule ends with `forward(...)`; classification such as `malicious(p)` is modeled as an uninterpreted function. The firewall example first drops packets from tainted sources, then ACL-blocked packets, then records a malicious source and drops, otherwise forwards (Listing 1, section 2.1, PDF pp. 3–4; Appendix B, PDF p. 18).

Steps: (1) define configuration inputs; (2) declare state using sets, lists, or maps; (3) declare oracles with input and output types; (4) write guarded forwarding rules; (5) supply a model for each middlebox instance. VMN checks invariants under worst-case oracle behavior (section 4.1, PDF p. 8). The paper says, “We limit our modeling language to not support looping (e.g., for, while, etc.) and only support branching through partial functions (Lines 5–7).” (section 2.1, PDF p. 3).

Inference: Verus can represent the forwarding model as a pure function over packet and ghost state, with `requires`/`ensures` for rule effects and a specification-level oracle. A proof can show policy consequences under all oracle results, but it does not verify the opaque classifier or the actual middlebox binary.

## technique: flow-parallel and origin-agnostic slicing
A slice is a subnetwork closed under forwarding and state. An invariant evaluable on a slice holds there if and only if it holds in the full network. Appendix C also requires the slice's packet set to include all network packets whose source and destination belong to the slice. Flow-parallel middleboxes keep distinct flows from affecting each other. For these middleboxes, close the smallest subnetwork on which the invariant is evaluable under forwarding by including all middleboxes on paths between its hosts. Origin-agnostic middleboxes may share state, but their behavior is independent of the sequence of transitions leading to the current state. With only origin-agnostic or flow-parallel middleboxes, a forwarding-closed subnetwork containing one host from each policy-equivalence class is a slice. The paper states, “A slice is a subnetwork that is closed under state.” (section 3.2, PDF p. 7; Appendix C, PDF p. 20).

Steps: (1) identify the packets and state referenced by the invariant; (2) find the smallest subnetwork on which it is evaluable; (3) for origin-agnostic middleboxes, include a host from each policy-equivalence class; (4) close the resulting subnetwork under forwarding; (5) establish state closure; (6) check the invariant on that slice. Appendix C relates full-network states to slice states by projection and establishes a bisimulation (PDF p. 20). Size independence relies on path lengths not growing with network size and, for origin-agnostic slicing, on the number of policy-equivalence classes not growing (section 3.2, PDF pp. 7–8).

Inference: encode the slice projection as a ghost map and prove transition correspondence in Verus. The paper uses mathematical bisimulation and Z3 rather than Verus.

## technique: symmetry reduction
The paper defines two invariants as symmetric if one holds in the network if and only if the other holds. It uses slice isomorphism to determine symmetry and reduce the number of invariants checked. The paper says, “Symmetry can be determined by comparing the smallest slices in which each invariant can be evaluated, and seeing if the graphs are isomorphic up to the type and configuration of individual middleboxes.” (section 3.3, PDF p. 8).

Steps: compare the smallest slices for the invariants; identify symmetry using graph isomorphism with middlebox types and configurations; reduce the invariants requiring verification. Inference: a Verus implementation could group slices using graph canonicalization, check a representative, and prove that each mapping preserves the corresponding invariant. The paper does not specify a canonicalization algorithm.

## technique: first-order SMT decision procedure
VMN translates each middlebox model, network transfer function, and end host into first-order formulas. It conjoins the slice model with the negation of the invariant and asks Z3 for satisfiability. Unsatisfiable means the invariant holds; a satisfying assignment is a counterexample. The paper says, “VMN checks invariants by invoking Z3 to check whether the conjunction of the slice model and invariants is satisfiable.” (section 4.2, PDF pp. 8–9).

Steps: (1) create formulas for middlebox instances; (2) compile the network transfer function into a formula; (3) add end-host formulas; (4) negate the desired invariant; (5) call Z3 on the conjunction; (6) report unsatisfiable as proved, extract a violating example from a satisfying assignment, or report unknown on timeout. Appendix B models packet events in discrete timesteps, allowing all orders consistent with causality and no packet reordering on the same link (PDF p. 18). Appendix D (PDF pp. 20–21) argues for expressing restricted models in EPR-F, an extension of a decidable fragment of first-order logic: middleboxes must be passive, send finitely many responses per input, and have loop-free processing pipelines. Explicit closure axioms would be required to guarantee Z3 termination; generating them is left to future work. The implementation is reported to terminate on qualifying networks without these axioms.

Inference: a Verus adaptation could express transition relations using `spec fn` predicates and prove invariant-preservation lemmas. Importing VMN's solver result would additionally require trust in its translation and solver, or a checked certificate; the paper does not provide a Verus integration.

## evidence, trust, and limits
The evaluation uses Z3 4.4.2, reports results from 100 runs of each experiment, and measures verification on a single core (section 5, PDF p. 9). Section 5.1 models a datacenter with 1,000 end hosts, stateful firewalls, load balancers, and IDPSs. VMN identifies the introduced firewall-rule, backup-firewall, and failure-routing violations; the flow-parallel models allow slice size to be independent of policy complexity and network size (PDF pp. 9–10). With caches added, slice size depends on policy complexity; checking one data-isolation invariant with 100 policy-equivalence classes takes less than four minutes on average (section 5.2, PDF p. 10). The ISP evaluation uses three subnet policy classes, hence three representative slices, and one experiment fixes 75 subnets while varying peering points (section 5.3.3, PDF p. 12).

VMN cannot find middlebox implementation bugs, including classifier and flow-lookup bugs (section 2.2, PDF p. 5). The introduction cites EXPSPACE-completeness for reachability with mutable datapaths, while Appendix D says unrestricted mutable networks are Turing complete and verification is undecidable (PDF pp. 3, 20). VMN rejects networks with forwarding loops, and Z3 timeouts can leave invariants unresolved (sections 3.1 and 4.2, PDF pp. 6, 8–9). Inference: trusted components include middlebox models, any oracle constraints, topology/configuration inputs, the logical translation, Z3, and correspondence between models and deployed devices.

## techniques for the catalog
- oracle middlebox model: specify guarded forwarding while abstracting complex packet classification
- flow-parallel slicing: close a smallest endpoint subnetwork under forwarding and per-flow state
- origin-agnostic slicing: close under forwarding and include a host per policy-equivalence class when middleboxes are origin-agnostic or flow-parallel
- symmetry reduction: verify one representative among isomorphic invariant slices
- SMT reachability: negate invariants and use satisfiability plus counterexamples to decide violations
