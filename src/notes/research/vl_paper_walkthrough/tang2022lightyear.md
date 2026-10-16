# LIGHTYEAR: Using Modularity to Scale BGP Control Plane Verification
(authored by agents unless marked 🧑)
Tag: `tang2022lightyear`, [paper](http://arxiv.org/abs/2204.09635v2)

## result and scope

Lightyear verifies BGP control-plane properties by reducing global claims to local checks on routers and edges. The abstract states: “We present a modular approach to control plane verification, where end-to-end network properties are verified via a set of purely local checks on individual nodes and edges.” The authors formalize the BGP model, prove the reduction sound, implement it in C# with Zen and Z3, and evaluate a cloud WAN and synthetic networks.

Inference: the transferable idea for Verus is assume-guarantee decomposition: expose a local invariant at each component, prove each transition preserves it, and prove the local invariant at the target implies the global property. Lightyear’s BGP traces and SMT implementation are outside Verus. The paper is evidence for a modular proof architecture, not a Rust evaluation.

## technique 1: safety verification with local invariants

Inputs are a network configuration, an end-to-end safety property `(location, route predicate)`, and one invariant per location. External edges are unconstrained: any route may arrive from an external neighbor. The tool generates Import, Export, and Originate checks for every edge. Each check assumes the invariant at the source and proves that the transformed route is rejected or satisfies the destination invariant. It then proves the target invariant implies the end-to-end property.

The paper’s statement of the generated checks is precise: “Given the network configuration, network property (ℓ, P), and network invariants I, Lightyear generates the following local checks for each edge A → B in the network topology, which validate each location’s network invariant using assume-guarantee reasoning.”

Steps from Sections 2.1 and 4 (pp. 3–6):

1. choose the target location and route predicate `P`
2. define one local invariant `I_l` for every router and edge, leaving external input invariants unconstrained
3. generate Import, Export, and Originate obligations that map source invariants into destination invariants or rejection
4. solve each obligation with SMT, retaining a concrete route counterexample for failures
5. check `I_l ⊆ P` at the target
6. conclude the property for every valid trace when all obligations pass

The soundness theorem states that if all checks pass and the target invariant implies `P`, then every route selected or forwarded in every valid trace satisfies `P` (Section 4.3 and Appendix B).

Verus form. Inference: model a component’s state and route predicate with a ghost datatype and `spec fn`; give each import/export operation `requires` and `ensures` clauses saying that an invariant-preserving input yields an invariant-preserving output or rejection. Use `proof fn`s to compose edge lemmas and show the target predicate. Verus can verify the Rust policy code, but the global composition and trace model must be written explicitly.

## technique 2: ghost attributes for expressive properties

Some global properties need information not present in a route’s operational fields. Lightyear allows ghost attributes that are updated by import, export, and originate functions but do not affect routing. In the example, `FromISP1` records whether a route came from ISP1; filters set it true, false, or leave it unchanged. This supports a no-transit proof using a community tag. The paper says: “To increase Lightyear’s expressiveness, users can define ghost attributes, which conceptually extend each route with additional fields.”

Steps: choose a finite attribute domain; specify its initial value for originated routes; specify updates at every filter; include the ghost field in local invariants; prove the real global predicate from those invariants. The authors note ghost attributes “do not affect the description of Lightyear or proof of its correctness above, as they do not depend on the specific set of attributes that are in a route.”

Verus form. Inference: add a ghost field to a proof-only route model or a tracked state machine, update it in proof code alongside executable route transformations, and prove correspondence between ghost state and observed route metadata. Do not let ghost state silently alter runtime behavior. The Verus guide’s proof-oriented state-machine constructs are the relevant analogue; BGP-specific functions remain application code.

## technique 3: liveness by path constraints and no interference

Liveness is harder because a good route must be allowed through every hop and must not lose selection to a competing route. Lightyear takes four inputs: configuration, a target liveness property, a topological path, and a good-route constraint `C_i` at each path location. It generates propagation checks for each edge on the path and no-interference safety checks at each router. The first path constraint is an assumption about an external neighbor; the final constraint must imply the target property.

Steps from Sections 2.2 and 5 (pp. 4–7):

1. choose a source-to-target path of routers and edges
2. define `C_i`, the set of good routes at every location
3. assume the source neighbor supplies a route satisfying `C_1`
4. check each import/export on the path preserves `C_i` and does not reject a good route
5. for each router, prove any accepted route with the same prefix also satisfies the corresponding `C_i` (no interference)
6. prove `C_n ⊆ P` at the destination
7. conclude eventual delivery when there are no link failures on the specified path

The authors explicitly limit the theorem: “Notably, the correctness only depends on there being no link failures along the given path, so the property holds even if there are failures elsewhere.”

Verus form. Inference: represent each path hop as a transition with a contract preserving a good-route predicate; prove a no-interference lemma that selected alternatives satisfy the same predicate. A temporal or eventuality argument needs an explicit finite progress model and ranking measure; Verus does not infer BGP convergence from local postconditions. External-source assumptions must be written as `requires` conditions and counted as trusted.

## technique 4: counterexample-guided invariant refinement

When a local check fails, Lightyear returns a concrete route and route map. Operators decide whether this is a configuration bug or an omitted special case, then refine the invariant or property and rerun. In the cloud deployment, the authors say they wrote initial constraints from configuration and operator discussions, used failures to refine them, and found actual bugs. They also found that several simpler properties with simpler constraints were easier to debug and usually faster for the solver than one combined property.

Verus form. Inference: treat failed proof obligations as witnesses for missing preconditions or invariants, then strengthen the specification and add a regression test. A counterexample from a solver is diagnostic evidence; it does not by itself show that the revised invariant captures the real product requirement.

## evidence, scale, and trust

The cloud WAN contained “hundreds of routers and tens of thousands of peering sessions.” The tool verified 11 kinds of bad Internet routes and safety and liveness properties for reused IP addresses. It identified 11 actual configuration errors; the text says these were latent bugs and that all identified errors were prioritized for fixing. Running all local checks for one property took at most 15 minutes sequentially across the network; four properties across all hundreds of edge routers took 16 minutes. These denominators are properties and edge-router runs, respectively, not individual checks.

For synthetic full-mesh networks, the paper reports that Minesweeper did not terminate within two hours at 40 routers, while Lightyear verified 100 routers in 5.5 minutes. This compares the paper’s particular implementations, parser, constraints, hardware, and no-transit workload; it is not a universal complexity bound. The claimed asymptotic advantage is structural: the number of local checks is linear in nodes and edges, while monolithic approaches can be quadratic or exponential.

The implementation parses C# policies, translates them through Zen to SMT, and invokes Z3. Trusted elements include the parser, model extraction, Zen translation, Z3, the BGP abstraction, user invariants, and external-route assumptions. Inference: for agent-written verified Rust, modular checks can localize failures and contain proof cost, but the largest threat is a wrong or incomplete invariant that still composes successfully. Product safety claims also depend on unmodeled protocol, hardware, and deployment behavior.

## techniques for the catalog

- assume-guarantee safety checks — prove each import, export, and originate operation maps a source invariant to a destination invariant
- ghost attributes — add proof-only route fields that record provenance or roles for richer properties
- path-based liveness — specify a good-route predicate at each hop and prove propagation along a chosen path
- no-interference checks — prove competing routes with the same prefix also satisfy the good-route predicate
- counterexample-guided refinement — use concrete failed local checks to repair invariants and configuration
- modular scaling — keep each solver obligation local so checks grow linearly and can run independently

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
