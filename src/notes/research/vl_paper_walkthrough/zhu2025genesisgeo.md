# GenesisGeo: Technical Report
(authored by agents unless marked 🧑)
Tag: `zhu2025genesisgeo`, [paper](https://arxiv.org/abs/2509.21896v2)

## result and representation
GenesisGeo builds synthetic Euclidean-geometry problems and trains a multimodal prover to propose auxiliary constructions. The dataset claim is explicit: “The dataset contains 1 million synthesized problems that require auxiliary constructions, generated with 50 CPU threads over 28 hours.” (§4.5, p.9). The supplied paper is arXiv:2509.21896v2, dated 22 February 2026 (p.1). The model uses Qwen3-VL-2B (§6, p.12).

The data format separates symbolic premises in `<problem>`, a diagram in `<img>`, proof-only constructions in `<aux>`, and a derivation in `<proof>` (§4.4, p.8). The authors state: “Each instance pairs a rendered diagram with formal construction DSL and predicate DSL descriptions, optional auxiliary constructions, and a complete DDAR proof trace.” (§4.5, p.9). DDAR combines a deductive database with algebraic reasoning (§3, p.4). Inference: the relevant connection to verified Rust is the separation between learned proposals and a checker that determines acceptance.

## technique 1: synthesize checked proof data
Inference: use this to create training data with machine-checkable derivations.

1. Sample a BASIC construction backbone in a domain-specific language (DSL) adapted from AlphaGeometry (§4.1, p.6). Grow it with two INTERSECT actions that determine a new point, or one OTHERS construction. Before committing a construction, check dependencies and numerical coordinate consistency (§4.1, p.7).
2. Run DDAR to compute deducible predicates. Remove trivial statements and goals reducible to simpler predicates; deduplicate equivalent `eqangle` and `eqratio` goals (§4.2, p.7; Table 3, p.8).
3. Trace backward from each goal through the parent predicates required by the applied rules, stopping at construction-derived facts. These leaves form the premise set. Put constructions needed by the proof but unnecessary to build the problem in `<aux>` (§4.3, p.8).
4. Remove candidate auxiliary points in reverse-topological order and rerun provability checks. Group problems with identical premises and auxiliary sets to check their different goals jointly. The authors report that this batching “accelerates the auxiliary revalidation process by approximately 5×” (§4.3, p.8).
5. Render from Cartesian coordinates using a construction-based renderer (§4.4, pp.8–9). Export `<problem>`, `<img>`, `<aux>`, and `<proof>`, including optional `<numerical_check>` facts. The paper describes these as “numerically obtained facts” (§4.4, p.8).

Inference: a possible Verus implementation would represent predicates and constructions as algebraic datatypes and check each proof step against prior facts and a formalized rule. A final proof obligation would establish that the goal follows from the premises. Soundness would depend on the formalized geometry rules and any numerical facts admitted as assumptions. The paper implements neither this Verus checker nor a proof of DDAR's implementation.

## technique 2: neuro-symbolic propose-and-verify
Inference: use this when a symbolic prover needs learned auxiliary-construction suggestions.

1. Continue pre-training on complete serialized records containing diagrams, formal problems, auxiliaries, and proof traces (§5.1, p.10). The authors explain: “During this stage, all components are serialized into a unified sequence and jointly modeled.”
2. Supervised fine-tune on the two tasks listed in §5.1 (pp.10–11): text-based auxiliary construction and vision-grounded auxiliary construction. Each predicts an `<aux>` block. Figure 4 and the experiments also call these proof-generation tasks; §6.2 mentions diagram understanding, but §5.1 does not specify a separate third supervised task.
3. At inference, let DDAR attempt the goal directly. If it fails, render the problem, ask the VLM for auxiliary constructions using the symbolic statement and diagram, incorporate candidates, and resume deduction (§5.2, p.11).
4. Once an auxiliary point is validated, fold it into `<problem>` and ask for the next auxiliary. The paper says this avoids accumulating auxiliaries beyond the training distribution. Use parallel beam search to retain the highest-scoring candidates (§5.2, p.11).
5. Accept when the symbolic engine derives the target: “Once the goal becomes deducible, the proof is accepted.” (§5.2, p.11). Evaluation imposes a 60-minute limit per problem (§6, p.12).

Inference: in verified Rust, construction functions could require geometric validity conditions and return a state with proved predicates. Search could remain ordinary code while a verified checker establishes the final goal. Proposal quality would affect search success; correctness would require sound rule semantics and justified premises, including any numerical assumptions.

## techniques for the catalog
- checked symbolic data synthesis: sample DSL constructions, compute DDAR closure, filter equivalent goals, minimize premises and auxiliaries, and export proof traces
- proof-trace multimodal training: continue pre-training on complete records, then fine-tune text-based and vision-grounded auxiliary prediction
- propose-and-verify search: let a VLM suggest auxiliary constructions, rerun symbolic deduction, fold validated points into the problem, and iterate with beam search
- batched auxiliary revalidation: group identical premise/auxiliary sets and check their goals jointly for the reported approximately 5× speedup
