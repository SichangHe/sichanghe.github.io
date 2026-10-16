# Lean Atlas: An Integrated Proof Environment for Scalable Human-AI Collaborative Formalization
(authored by agents unless marked 🧑)
Tag: `yanahama2026lean`, [paper](https://arxiv.org/abs/2604.16347)

Lean Atlas addresses a gap that remains after a proof assistant accepts code: logical validity of a proof term does not establish that the proposition or definitions express the intended mathematics. The paper calls a formalization “semantic hallucination” when it type-checks (and may have a completed proof) but is not semantically equivalent to the intended statement (Definition 1, p.4). Lean Atlas extracts project dependency graphs, classifies dependencies, visualizes them, and uses Lean Compass to identify the declarations a human should semantically inspect. The authors define “aligned Lean code” as code whose propositions and definitions have undergone human semantic verification (Abstract, p.1).

### identify semantic hallucination before trusting proof success

What it is: inspect the meaning of propositions and definitions separately from checking proof terms. The paper gives the concrete failure that omitting a type annotation in “3/2 = 1.5” makes Lean infer `Nat`, yielding `3 / 2 = 1`, which type-checks but changes the mathematics (§1, p.2).

When to use it: use this for every AI-generated specification, especially at domain boundaries and whenever overloaded notation, implicit assumptions, quantifiers, or scopes are involved. The paper lists five recurring patterns: “Definition mismatch,” “Missing or extra assumptions,” “Goal substitution,” “Quantifier and scope errors,” and “Type default semantics shift” (§3.1, pp.3–4).

How to do it (Inference: a review checklist derived from the paper’s definitions and human-review proposal): (1) write the intended natural-language statement; (2) inspect every formal proposition and definition for matching domains, assumptions, quantifiers, and types; (3) confirm that type defaults and overloaded operations mean what the source means; (4) only then rely on the type checker for proof-term correctness; (5) record the declaration as semantically verified. The paper assigns semantic verification to humans but does not prescribe this five-step checklist or an automated semantic equivalence checker.

Verus form (Inference): review `requires`, `ensures`, `invariant`, and data-type definitions against the intended Rust behavior before accepting a verified function. Inference: a Verus proof can certify a wrong postcondition just as Lean can certify `3 / 2 = 1`; a reviewer must check types, bounds, quantifier scope, and omitted assumptions. Mark aligned declarations in project metadata or a review manifest; this metadata does not affect Verus verification.

Evidence and limits: the paper reports prior work finding definition mismatch common and presents semantic hallucination as a general risk, but Lean Atlas does not measure detection accuracy. Its own evaluation measures reduction in candidate review nodes, not whether reviewers catch each error (§6.1, p.7). Human semantic judgment and the intended statement remain trusted.

### classify dependency edges by type and value

What it is: for each Lean constant, separate dependencies appearing in its type from those appearing only in its value. The paper defines: “A type dependency from constant A to constant B exists when B appears in the construction of A’s type” and a value dependency when B appears only in A’s value (§3.2, p.4). For theorem constants, type is the proposition and value is the proof term; for definitions, value is the implementation, which may contain computational content beyond the type signature.

How to do it: traverse every project constant’s type and value recursively; classify constants as theorem, definition, inductive, structure, abbreviation, or axiom; emit edges with source kind, dependency site, and target kind. The implementation creates eight edge kinds (Table 1, p.5): theorem/definition source × type/value site × theorem/definition target. Exclude Lean standard library and Mathlib from the project graph because the paper treats them as trusted base (§4, p.4).

When to use it: use the distinction to avoid asking humans to reread proof implementation dependencies that cannot alter a theorem’s proposition, while retaining definition implementations whose computational content can affect semantics. The asymmetry is the foundation of Compass (§5.1, p.5).

Verus form (Inference): construct a graph where a verified function’s specification dependencies (`requires`/`ensures` types and referenced definitions) are type-level edges, while proof-only `assert`/lemma code is value-level. Retain executable Rust definitions and trait implementations because they affect behavior; a Verus proof block that only establishes an already-reviewed postcondition can be deprioritized. This mapping is an inference: Verus does not expose Lean’s constant/value representation in the same way.

### Lean Compass pruning and reachability

What it is: given a target theorem set, prune only theorem proof-value edges, then compute transitive reachability. Algorithm 1 (p.6) states `ShouldTraverse`: return false when the source is a theorem and the edge site is value; otherwise return true. Aggregate backend kinds into theorem, definition (inductive/structure/abbreviation), and axiom; axioms are always included.

How to do it: (1) input graph `G=(V,E)` and target set `M`; (2) aggregate node kinds; (3) classify all eight edge kinds; (4) remove `thm_value_to_def` and `thm_value_to_thm`; (5) initialize a BFS queue with `M`; (6) traverse every remaining edge and add reachable nodes; (7) union all axiom nodes; (8) return the resulting review set. The pseudocode’s output is “the reachable node set R ∪ A (where A = axiom nodes)” (§5.2, p.5).

The authors’ soundness proof sketch (Proposition 4, §5.3, p.6) assumes every node in the output and the trusted base is semantically correct. It says, “All type dependencies (#1, #2, #5, #6) are retained, so dependency relationships necessary for semantic correctness verification are never lost” (§5.3, p.6). Compass does not claim pruned nodes are themselves correct; to verify one, include it in the target set and rerun (§5.3, p.6).

Verus form (Inference): make target functions or exported postconditions the roots. Traverse specification references and executable definitions; prune only proof-only dependencies after confirming that they cannot change the specification. Include external axioms, `external_body` declarations, and imported trusted code in the review set rather than silently pruning them. Use graph analysis to prioritize review; retain Verus verification as the final check.

### interactive graph review and metadata

What it is: the web viewer displays the transitive dependencies of selected targets and provides 12 independent filters combined by AND, including kind, confidence, sorry status, and edge kind (§4, p.4). Users attach confidence metadata concerning semantic correctness, proof progress, and definition progress to constants via Lean custom attributes. The paper says: “Users can update confidence through the viewer, enabling team-based verification tracking” (§4, p.5).

How to do it: run the Lean 4 backend integrated with Lake; export JSON; load it in the Next.js/React Flow viewer; select a main theorem; inspect its hierarchical cone; filter by edge/node metadata; update confidence as review proceeds (§4, pp.4–5). The visualization is an aid to human inspection, not a semantic decision procedure.

Verus form (Inference): export a Rust/Verus dependency graph with roots chosen by product claims; expose filters for specification status, executable definition status, trusted axioms, `external_body`, and verification failures. Require a human to mark semantic alignment; do not interpret an AI confidence field as evidence.

## evidence, trust, and limits

The evaluation uses six Lean 4 projects and reports node reduction, defined as `1 − (nodes after Compass / |review cone|)`; the authors explicitly call this “a proxy for the size of the semantic review candidate set, not as a direct measure of human review time” (§6.1, p.7). Proof-heavy projects reduce sharply: PrimeNumberTheoremAnd averages 99% (8 targets), Carleson 96.2% (9), and Brownian Motion 94.4% (5). Mixed PhysLib averages 69.0% (5 selected theorems), FLT’s six milestone subset 59.8%, and definition-heavy XMSS 27.3% (5 main theorems), as stated in the Conclusion (p.9). Table 2 gives denominators and per-theorem cones: Brownian Motion’s IsBrownian_brownian is 227 to 14, 93.8%; Carleson cones range 885–1963 nodes and reductions 88.1–99.7% (Table 2, p.8). These are graph counts, not percentages of bugs detected or time saved.

Trusted elements are the human interpretation of intended mathematics, Lean standard library and Mathlib, axiom declarations, graph extraction correctness, and the selected target set. The soundness claim is a conditional proof sketch, not a reported machine-checked theorem: if every node in `R ∪ A` and the trusted base is semantically correct, target propositions are semantically correct (§5.3, p.6). The selected main theorems must cover all intended claims; the paper says project-level coverage depends on that choice (Limitations, pp.9–10). Actual human review-time reduction was not measured, and confidence metadata remains manually annotated (Limitations, pp.9–10).

The work demonstrated here is dependency visualization and reduction of candidate semantic-review nodes in Lean.

## techniques for the catalog

- semantic hallucination review — compare AI formal propositions and definitions with intended statements after type checking
- type/value dependency graph — classify each dependency by whether it occurs in a declaration type or implementation value
- Compass pruning — remove theorem proof-value edges, retain all type and definition-value edges, then BFS from target theorems and include axioms
- interactive review cone — visualize and filter transitive project dependencies while recording human semantic status
- aligned-code standard — label declarations aligned only after human semantic verification plus proof-assistant checking
