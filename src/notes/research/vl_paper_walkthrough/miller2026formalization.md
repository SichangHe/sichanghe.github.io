# A Formalization of the Mean-Field Derivation of the Vlasov Equation
(authored by agents unless marked 🧑)
Tag: `miller2026formalization`, [paper](http://arxiv.org/abs/2607.08986v2)

## what the paper proves and measures

The paper formalizes Dobrushin's smooth-interaction derivation of the nonlinear Vlasov equation in Lean 4. Its certified results cover global well-posedness, uniqueness in the Lagrangian class, Dobrushin stability, the mean-field limit from empirical Newtonian measures, and a short-window superposition principle turning weak solutions into Lagrangian ones (Abstract and Section 1.3, pp. 1–5). The authors define a formalization game: “The game is won when the development compiles, contains no sorry, and a machine check shows the target theorems rest on Lean’s foundational axioms alone.” (Abstract, p. 1).

The win condition is compile success with no reachable `sorry` and `#print axioms` exactly `[propext, Classical.choice, Quot.sound]` (Definition 2.1, pp. 8–9). This is relative to statements as written; it does not establish that definitions express the intended mathematics. The authors caught a weak-solution definition whose C∞ test class silently collapsed to the zero function, leaving a vacuous theorem despite a green build (Section 3.1, pp. 13–14). A second deliverable is a self-contained optimal-transport layer satisfying four checks: no reverse dependency edges, standalone compilation against Mathlib alone, zero linter warnings, and reachability/non-redundancy (Definition 2.2, pp. 8–9).

The extracted layer contains 49 of 299 declarations (about one sixth), behind a 22-declaration interface and zero reverse edges; 16 linters report zero warnings, with seven disclosed `nolint` annotations (Section 3.5, pp. 17–18). The main development used 362 commits, took about a week for the well-posedness/stability results and about a month including superposition, and cost a $200-per-month subscription (Section 4.2, p. 19). These are observations of one project, not rates established by an experiment. The Lean kernel checks proof terms, while theorem statements, definitions, imported Mathlib, model output, and human judgments remain trusted.

## technique 1: lock definitions and theorem signatures before proving

what it is: create target declarations with proofs left as `sorry`, compile the interfaces, and inspect every definition at atom level before attempting proofs. The paper calls this an “API-lock” and says: “The dominant strategy is to lock the object scaffolding — the definitions and the target signatures — before proving anything.” (Section 2.2.1, p. 9).

when to use it: use this for research formalization where a wrong predicate or regularity class can contaminate every downstream theorem.

how to apply it:
1. translate each source theorem into a Lean signature with explicit domains, moments, regularity, and solution notions (Sections 1.3 and 2.2.1, pp. 5, 9)
2. leave proof bodies as temporary gaps and compile the declarations (Section 2.2.1, p. 9)
3. inspect exact binders and overloaded notation rather than relying on prose summaries (Section 2.2.1, p. 9)
4. correct definitions before decomposition and remove the temporary gaps only as proof obligations are discharged (Section 2.2.1, p. 9)

Verus form: Inference: first write exact Rust data types, `spec fn` predicates, and function contracts, then compile a skeleton with proof bodies to be filled. Verify that `requires` and `ensures` refer to the intended state and that ghost fields cannot make a predicate vacuous. Verus has no Lean `#print axioms`; use the verifier output and source inspection as the acceptance checks.

evidence and limits: the collapsed test class was caught by a human read and a 30-second type check, after the build had remained green (Section 3.1, pp. 13–14). This demonstrates why a clean compile cannot substitute for semantic definition review.

## technique 2: run a three-phase game with a living strategy file

what it is: organize work into early definitional scoping, mid-game decomposition steering, and end-game library-gap triage (Section 2.2, pp. 9–11). Lessons from failures are added to a standing instruction file in four series: Lean idioms, process discipline, mathematical structure, and bridging architecture (Section 2.3, pp. 11–12). The paper states: “The standing instruction file records the mathematician’s accumulated strategic experience in a form the agent can consult.” (Section 2.3, p. 12).

when to use it: use this when a long proof repeatedly encounters the same failure modes and the human needs to amortize decisions across many agent turns.

how to apply it:
1. early: lock definitions and target signatures, with no proof work yet (Section 2.2.1, p. 9)
2. middle: split oversized goals into named lemmas, choosing cuts that the library can support; record successful and failed decompositions (Section 2.2.2, pp. 10–11)
3. end: classify each remaining gap as phantom, buildable standard mathematics, or an honestly deferred cited theorem (Section 2.2.3, p. 11)
4. encode each recurring failure and its fix in the standing file, grouped by the four series (Section 2.3, pp. 11–12)
5. commit each unit and retain the history so the proof state and strategy evolution are reconstructable (Section 2.2.3, p. 11)

Verus form: Inference: maintain project instructions covering Verus idioms, contract discipline, data-structure invariants, and library boundaries. A decomposer may propose helper `proof fn`s, but a human or independent checker chooses the mathematical cut. Keep a commit and verifier log per unit.

evidence and limits: the project reports 362 commits and a sorry front peaking at 24 before returning to zero (Section 2.2.3, pp. 11–12). The strategy taxonomy was earned on one project and may be incomplete (Section 4.4, p. 20).

## technique 3: define and certify a clean axiom footprint

what it is: require both compilation and an exact foundational axiom set. `#print axioms` traces all axioms reachable from each target, catching a renamed `sorry` or bespoke axiom that a build check misses (Definition 2.1, pp. 8–9). The paper says: “The win condition is ‘compiles and the foundations are clean,’ not ‘compiles.’” (Section 2.1, p. 8).

when to use it: use this whenever generated proofs or imported libraries might hide untrusted axioms.

how to apply it:
1. list the distinguished target declarations Θ (Definition 2.1, p. 8)
2. build successfully and check that no declaration reachable from Θ contains `sorry` (Definition 2.1, p. 8)
3. run `#print axioms` for every target and compare with the allowed foundational list (Definition 2.1, p. 8)
4. rerun the footprint after every structural change, and reject cached checks from failed builds (Section 4.1, pp. 18–19)

Verus form: Inference: treat a successful Verus verification run as necessary but record all `external_body`, native calls, trusted axioms, and imported specifications separately. A product should fail closed when a proof obligation is bypassed and should preserve the exact verifier configuration.

evidence and limits: all target theorems in the reported build have the stated Lean footprint (Sections 2.1 and 3.5, pp. 8, 17–18). The authors explicitly say the footprint cannot detect that a statement is vacuous or otherwise unintended (Section 2.1, p. 8).

## technique 4: build a reusable layer from the dependency graph

what it is: extract general mathematics used by the target, check declaration-level isolation and interface width, compile it as a standalone Mathlib-only package, run linters, and verify reachability and non-redundancy (Definition 2.2 and Section 3.5, pp. 8–9, 17–18). The layer contains dual and coupling forms of Wasserstein-1, Kantorovich–Rubinstein duality, finite transport duality, and coupling gluing inequalities (Table 1, p. 9).

when to use it: use this after a successful project to turn general lemmas into an upstreamable library contribution.

how to apply it:
1. compute the declaration dependency graph and cut a general-mathematics subset reachable from target theorems (Section 3.5, p. 17)
2. count reverse edges and expose only a narrow interface (Section 3.5, pp. 17–18)
3. package the subset with imports restricted to Mathlib and compile independently (Definition 2.2, p. 8)
4. run the environment linter suite and remove unused arguments or disclose justified annotations (Section 3.5, p. 18)
5. search for duplicates and ensure every retained declaration is reachable from a target (Definition 2.2, p. 8)

Verus form: Inference: extract generic sequence, map, set, and invariant lemmas from a product repository into modules with no application-specific imports. Expose a small Rust module interface and run Verus on the package independently. Reuse is a dependency property, not a claim that a model can safely copy proof text.

evidence and limits: the layer passed all four checks, with 49/299 declarations, 22 interface declarations, zero reverse edges, standalone build exit 0, and 16 linters with zero warnings (Section 3.5, pp. 17–18). Non-redundancy is based on library search and cannot prove semantic equivalence of differently stated theorems (Section 3.5, p. 18).

## technique 5: represent Wasserstein distance in dual and coupling forms

what it is: define Wasserstein-1 through a supremum over Lipschitz test functions and through an infimum over couplings, then prove Kantorovich–Rubinstein equality. The coupling triangle inequality glues measures; finite duality uses Farkas separation, compactness, and a c-transform (Section 3.2, pp. 14–15). The paper reports that the coupling form avoided an unavailable attainment theorem.

when to use it: use two equivalent representations when one form matches the source estimate and the other matches the available library.

how to apply it:
1. define the dual metric and the primal coupling cost (Section 3.2, p. 14)
2. prove coupling gluing and marginal preservation (Section 3.2, pp. 14–15)
3. build finite duality using geometric separation, compactness, and a c-transform (Section 3.2, p. 15)
4. prove equality and use the coupling form in Dobrushin's estimate; rewrite to the dual form only at the theorem boundary (Section 3.3, pp. 15–16)

Verus form: Inference: encode equivalent representations as separate specification functions and prove conversion lemmas. Verus is not a measure-theory library, so this technique transfers as representation management; the analytic lemmas would need a trusted or separately verified library.

evidence and limits: the duality layer is part of the 49-declaration reusable core (Table 1 and Section 3.5, pp. 9, 17). A Polish-space completeness theorem was deferred off the certified target path (Sections 2.2.3 and 4.4, pp. 11, 20).

## technique 6: steer estimates toward the source formulation and isolate regularity costs

what it is: prove Dobrushin stability by fixing any initial coupling, pushing it through characteristic flows, bounding the flow gap with Grönwall, and taking an infimum; this avoids requiring an optimal coupling (Section 3.3, pp. 15–16). For superposition, strengthen the potential from C1,1 (`AssW`) to C2 (`AssW2`) so the flow is C1 in its initial point; prove the variational equation with a fundamental matrix and Picard iteration (Section 3.4, pp. 16–17).

when to use it: use a source's original estimate when a more elegant equivalent statement demands missing library facts. Track exactly which theorem consumes each regularity assumption.

how to apply it:
1. choose a coupling π of the initial data, with no optimality assumption (Section 3.3, p. 15)
2. push π through the two characteristic flows and define the time-dependent coupling cost Qt (Section 3.3, p. 15)
3. bound force mismatch and trajectory difference, then apply Grönwall to obtain Qt ≤ Q0 exp(2 max(1,L)t) (Section 3.3, pp. 15–16)
4. take the infimum over π and use the duality bridge to recover the stated Wasserstein distance (Section 3.3, p. 16)
5. for superposition, require C2, construct the fundamental matrix by Picard iteration, and differentiate the flow in its initial point (Section 3.4, pp. 16–17)

Verus form: Inference: use ghost couplings or relational invariants to compare two executions, and prove a recurrence with an arithmetic bound. Encode stronger regularity or aliasing assumptions only on the theorem that consumes them. Verus can check the recurrence and state invariants but does not supply the measure-theoretic constructions.

evidence and limits: the paper reports well-posedness at arbitrary Lipschitz constant L and mean-field convergence whenever initial empirical measures converge (Section 3.3, pp. 15–16). Superposition requires the additional `AssW2` and a shortness condition `L · T² < 1` (Section 3.4 and Appendix A, pp. 16, 22–23). These are theorem hypotheses, not measurements of a deployed system.

## techniques for the catalog

- API-lock definition scoping — compile target signatures with gaps and audit every definition before proving
- three-phase strategy file — separate scoping, decomposition, and library triage while recording lessons
- axiom-footprint gate — require no reachable gaps and an exact foundational axiom set
- reusable-layer extraction — isolate general declarations, standalone-build them, lint them, and audit dependencies
- dual/primal metric bridge — maintain equivalent distance representations and choose the form the proof supports
- coupling and regularity steering — use source-compatible estimates and add regularity only where a theorem needs it
