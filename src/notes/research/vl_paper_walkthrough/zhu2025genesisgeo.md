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

## evidence, boundaries, and VL threat
Table 4 (p.12) reports 29 solved IMO-30 problems, 63 IMO-95 problems, and 278 HAGeo-409 problems for GenesisGeo (Vision + Text), versus 28, 59, and 270 for GenesisGeo (Text). The model search budget is 32×512×4: batch size 32, beam size 512, proof depth 4 (§6, p.12). Although the benchmark name remains HAGeo-409, the authors state: “For a fair comparison across provers, we exclude five problems whose constructions are unsupported by AlphaGeometry, while keeping the original benchmark name.” (§6, p.12).

The symbolic engine with heuristic auxiliary sampling solves 26 IMO-30 problems at Pass@8192 (Table 4, p.12). Model-based tree-search budgets and heuristic-sampling budgets are explicitly different: “These two budgets are not directly comparable: Pass@K counts engine calls with heuristic sampling, while 32 × 512 × 4 controls the number of model-proposed expansions in a depth-4 tree search.” (§6, p.12). Inference: the model results measure the combined model, engine, and search procedure.

Table 6 (p.14) reports 29/63 solved on IMO-30/IMO-95 for all tasks, versus 28/59 for text-based proof generation, 27/57 for diagram-based proof generation, and 27/52 for the pre-trained backbone. Table 7 (p.14) reports 29/63 for pre-training plus SFT, versus 27/52 for pre-training only and 27/57 for SFT only. Inference: these comparisons support the authors' training choices within their reported evaluation.

The authors identify deeper construction chains, rare constructions, and early mistakes in search branches as failure cases (§6.1, p.13). They also report a two-auxiliary-point solution to IMO 2008 Problem 6 and say: “The correctness of the proof is confirmed by an IMO gold medalist.” (§6.1, p.13; formal construction and proof in Appendix A, pp.17–23). This study checks that report against the paper; it does not independently certify the proof.

Inference: for agent-written verified Rust, the transferable idea is to train proposal models on proof traces and require a sound checker to establish acceptance. A complete trace alone does not establish soundness if rule implementations or numerically supplied facts are wrong. Diagram alignment affects proposal usefulness, while the logical conclusion requires justified premises and sound deduction. The paper's demonstrated application is Euclidean geometry; transfer to Rust or Verus remains untested here. Its relevance to VL is therefore a candidate data-and-search design, with effectiveness dependent on a suitable representation and checker.

## techniques for the catalog
- checked symbolic data synthesis: sample DSL constructions, compute DDAR closure, filter equivalent goals, minimize premises and auxiliaries, and export proof traces
- proof-trace multimodal training: continue pre-training on complete records, then fine-tune text-based and vision-grounded auxiliary prediction
- propose-and-verify search: let a VLM suggest auxiliary constructions, rerun symbolic deduction, fold validated points into the problem, and iterate with beam search
- batched auxiliary revalidation: group identical premise/auxiliary sets and check their goals jointly for the reported approximately 5× speedup

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In our training corpus, about 90% of problems require only one auxiliary point, whereas difficult instances demand a deeper search to discover effective constructions."): checked all paper text, study quotations, numbers, section and page references, technique steps, and catalog entries; corrected training tasks, page references, benchmark exclusions, search-budget interpretation, and numerical-assumption boundaries, and marked transfer conclusions as Inference; did not reproduce experiments, inspect implementation or data, or independently prove the geometry or proposed Verus adaptation.
