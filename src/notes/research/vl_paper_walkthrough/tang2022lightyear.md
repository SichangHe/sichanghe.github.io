# LIGHTYEAR: Using Modularity to Scale BGP Control Plane Verification
(authored by agents unless marked 🧑)
Tag: `tang2022lightyear`, [paper](http://arxiv.org/abs/2204.09635v2)

## result and scope

Lightyear verifies BGP control-plane properties by reducing global claims to local checks on routers and edges. The abstract states: “We present a modular approach to control plane verification, where end-to-end network properties are verified via a set of purely local checks on individual nodes and edges.” The authors formalize the BGP model, prove the reduction sound, implement it in C# with Zen and Z3, and evaluate a cloud WAN and synthetic networks.

Inference: the transferable idea for Verus is assume-guarantee decomposition: expose a local invariant at each component, prove each transition preserves it, and prove the local invariant at the target implies the global property. Lightyear’s BGP traces and SMT implementation are outside Verus. The paper is evidence for a modular proof architecture, not a Rust evaluation.

## technique 1: safety verification with local invariants

Inputs are a network configuration, an end-to-end safety property `(location, route predicate)`, and one invariant per location. External edges are unconstrained: any route may arrive from an external neighbor. For each edge A → B the tool generates Import, Export, and Originate checks (Section 4.2); the import check is skipped when B is external, and the export and originate checks are skipped when A is external. Import assumes a route is in the edge invariant `I_{A→B}` and proves the imported route is rejected or in `I_B`. Export assumes a route is in `I_A` and proves the exported route is rejected or in `I_{A→B}`. Originate has no assumption: every originated route must be in `I_{A→B}`. A final check shows the target invariant is a subset of the end-to-end property (`I_ℓ ⊆ P`). The paper says the checks are done with an SMT solver.

The paper’s statement of the generated checks is precise: “Given the network configuration, network property (ℓ, P), and network invariants I, Lightyear generates the following local checks for each edge A → B in the network topology, which validate each location’s network invariant using assume-guarantee reasoning.”

Steps from Sections 2.1 and 4 (pp. 3–8; the numbered list is this study's reconstruction):

1. choose the target location and route predicate `P`
2. define one local invariant `I_l` for every router and edge, with `I` equal to all routes on edges leaving external routers
3. generate the Import, Export, and Originate obligations above
4. solve each obligation with SMT, retaining a concrete route counterexample for failures
5. check `I_l ⊆ P` at the target
6. conclude the property for every valid trace when all obligations pass

The soundness theorem states that if all checks pass and `I_ℓ ⊆ P`, then for every valid trace, a route selected at router ℓ, or forwarded or received on edge ℓ, satisfies `P` (Section 4.3 and Appendix B). Appendix B adds: “Note that our reasoning does not depend on BGP converging as traces can be infinite.” Section 4.5 adds that for safety properties the guarantee holds under arbitrary node and link failures, because the trace model over-approximates.

Verus form. Inference: model a component’s state and route predicate with a ghost datatype and `spec fn`; give each import/export operation `requires` and `ensures` clauses saying that an invariant-preserving input yields an invariant-preserving output or rejection. Use `proof fn`s to compose edge lemmas and show the target predicate. Verus can verify the Rust policy code, but the global composition and trace model must be written explicitly.

## technique 2: ghost attributes for expressive properties

Some global properties need information not present in a route’s operational fields. Lightyear allows ghost attributes that are updated by import, export, and originate functions but do not affect routing. In the example, `FromISP1` records whether a route came from ISP1; filters set it true, false, or leave it unchanged. This supports a no-transit proof using a community tag. The paper says: “To increase Lightyear’s expressiveness, users can define ghost attributes, which conceptually extend each route with additional fields.”

Section 4.4 defines a ghost attribute by “specifying the set of values that the attribute can take, along with updates to the Import, Export, and Originate functions”. In the `FromISP1` example the import filter on ISP1 → R1 sets it true, the import filters on ISP2 → R2 and Customer → R3 set it false, other filters leave it unchanged, and originated routes have it false. Inference: the general steps are to pick a value set, give originated routes an initial value, specify an update at every filter, put the ghost field in the local invariants, and prove the real global predicate from those invariants. The authors note ghost attributes “do not affect the description of Lightyear or proof of its correctness above, as they do not depend on the specific set of attributes that are in a route.”

Verus form. Inference: add a ghost field to a proof-only route model or a tracked state machine, update it in proof code alongside executable route transformations, and prove correspondence between ghost state and observed route metadata. Do not let ghost state silently alter runtime behavior. The Verus guide’s proof-oriented state-machine constructs are the relevant analogue; BGP-specific functions remain application code.

## technique 3: liveness by path constraints and no interference

Liveness is harder because a good route must be allowed through every hop and must not lose selection to a competing route. Lightyear takes four inputs: configuration, a target liveness property, a topological path, and a good-route constraint `C_i` at each path location. It generates propagation checks for each location on the path (for each `i < n`, a good route at `ℓ_i` must be exported or imported without rejection into `C_{i+1}`) and a no-interference safety check at each router on the path. The first constraint `C_1` is assumed to hold; “in practice it is usually an edge coming from an external router, in which case it is not possible to prove.” The final constraint must imply the target property (`C_n ⊆ P`).

Steps from Sections 2.2 and 5 (pp. 5–8; the numbered list is this study's reconstruction):

1. choose a source-to-target path of routers and edges
2. define `C_i`, the set of good routes at every location on the path
3. assume a route satisfying `C_1` is received at the first location
4. check each import/export on the path maps `C_i` to `C_{i+1}` and does not reject a good route
5. for each router `ℓ_i` on the path, prove as a safety property that any route whose prefix is a prefix of some route in `C_i` satisfies `C_i` (no interference); this uses the safety machinery with its own invariants
6. prove `C_n ⊆ P` at the destination
7. conclude that a route satisfying `P` is eventually selected at the target router or forwarded on the target edge, provided there are no link failures along the path

The authors explicitly limit the theorem: “Notably, the correctness only depends on there being no link failures along the given path, so the property holds even if there are failures elsewhere.”

The paper's theorem also requires that the first-location assumption actually occurs (a recv of a `C_1` route in the trace). Failures elsewhere do not matter.

Verus form. Inference: represent each path hop as a transition with a contract preserving a good-route predicate; prove a no-interference lemma that selected alternatives satisfy the same predicate. A temporal or eventuality argument needs an explicit finite progress model and ranking measure; Verus does not infer BGP convergence from local postconditions. External-source assumptions must be written as `requires` conditions and counted as trusted.

## technique 4: counterexample-guided invariant refinement

When a local check fails, Lightyear returns “a counterexample consisting of a specific route map and a concrete input route that leads to a violation” (Section 6.1). The authors write that they would “inspect the counterexamples and discuss with operators, either determining that the bugs are real errors or identifying special cases that led to refined local invariants and (sometimes) refined end-to-end property specifications.” In the cloud deployment they determined intended behavior by inspecting configurations and talking with operators. They report that “writing multiple simpler properties, with associated simpler local constraints, was not only easier to write and debug but also was usually faster to run”, compared with one combined property.

Verus form. Inference: treat failed proof obligations as witnesses for missing preconditions or invariants, then strengthen the specification and add a regression test. A counterexample from a solver is diagnostic evidence; it does not by itself show that the revised invariant captures the real product requirement.

## evidence, scale, and trust

The cloud WAN contained “hundreds of routers and tens of thousands of peering sessions.” The tool verified 11 kinds of “bad” routes never accepted from peers (Internet peering policies) and a safety and a liveness property for reused IP addresses (Section 6.1, pp. 8–10). In the peering use case it identified 11 actual configuration errors, for example “a handful had ad-hoc policies that filtered AS paths differently”; the paper says “All of the findings were latent bugs that did not have an immediate impact” and “all identified errors are prioritized for fixing by network engineers.” In the reused-IP use case it found one violation, a router using a community not in the metadata file, which operators acknowledged as a bug. Timing: the maximum time to sequentially run all local checks for any single property was 15 minutes across all devices; running four properties across all of the hundreds of edge routers sequentially took 16 minutes. The paper reports no per-check counts or timings for the WAN. The authors write that parallelizing is possible but only “in the future”.

For synthetic BGP full-mesh networks (each router has one eBGP external neighbor and iBGP sessions to all other routers, so N² edges for N routers; a no-transit property), the paper reports that “Minesweeper does not terminate within two hours when run on a network of size 40, while Lightyear verifies a network of size 100 in 5.5 minutes.” For this comparison the authors built a separate Lightyear implementation on Minesweeper’s parser and constraint generation, not the C#/Zen tool used on the WAN. The comparison is one workload with simple prefix and community filters; it is not a universal complexity bound. The claimed asymptotic advantage is structural: the number of checks is “linear in the network size (number of nodes and edges)”, so in this full mesh it grows with the N² edges, while the paper says prior joint approaches “scale at least quadratically, if not exponentially.”

The WAN implementation is written in C#. It parses router configurations to extract BGP policy and import/export route maps; users write local invariants as C# functions using the Zen library, which translates them to SMT formulas solved by Z3. Inference: the trusted elements include the parser, Zen translation, Z3, the BGP model in Section 3 (a variant of the Bagpipe semantics, with only some real BGP attributes), user invariants, and external-route assumptions; the paper does not list them. The paper’s proofs are on paper, not machine-checked, as far as the text shows. Inference: for agent-written verified Rust, modular checks can localize failures and contain proof cost, but the largest threat is a wrong or incomplete invariant that still composes successfully. Product safety claims also depend on unmodeled protocol, hardware, and deployment behavior.

## techniques for the catalog

- assume-guarantee safety checks — prove each import, export, and originate operation maps a source invariant to a destination invariant
- ghost attributes — add proof-only route fields that record provenance or roles for richer properties
- path-based liveness — specify a good-route predicate at each hop and prove propagation along a chosen path
- no-interference checks — prove competing routes with the same prefix also satisfy the good-route predicate
- counterexample-guided refinement — use concrete failed local checks to repair invariants and configuration
- modular scaling — keep each solver obligation local to one filter, so the number of checks is linear in edges and each check can run independently

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "We used Lightyear to modularly verify properties of the wide-area network (WAN) of a major cloud provider, containing hundreds of routers and tens of thousands of peering sessions."): I read the whole paper (14 pages with appendices A to C) and the whole study, and checked every quotation, number, section and page reference, the safety and liveness check definitions, the ghost-attribute description, the WAN results and the synthetic comparison. I changed: the Originate check (no assumption) and the skipped checks for external nodes; the theorem scope (location ℓ only); the liveness input description (C_1 assumed, usually an external edge; propagation per location; no-interference at routers; the occurrence assumption); page ranges (Sections 2.1 and 4 are pp. 3-8, Sections 2.2 and 5 are pp. 5-8); the false claim that the tool parses C# policies (it parses router configurations and invariants are C# functions via Zen); the error count (11 in the peering use case, plus one more in the reused-IP use case); the synthetic comparison (separate implementation on Minesweeper's parser, N² edges); removed the word "finite" for ghost-attribute domains; marked trusted-base and Verus mappings as Inference. I did not check the Verus mappings against the Verus documentation, the reference list, or figure data beyond the quoted text. The tag year 2022 is the arXiv posting year; the venue is ACM SIGCOMM 2023, and the tag is kept so the file name stays valid. Link: arXiv id from the paper text; DOI https://doi.org/10.1145/3603269.3604842.
