# GenesisGeo: Technical Report
(authored by agents unless marked 🧑)
Tag: `zhu2025genesisgeo`, [paper](https://arxiv.org/abs/2509.21896)

## result and representation
GenesisGeo builds a million synthetic Euclidean-geometry problems. The authors describe the pipeline as follows: “We first sample a construction program in our DSL to instantiate a consistent geometric configuration.” (§4, p.6) They then state, “Once the goal becomes deducible, the proof is accepted.” (§5.2, p.11) whose proof traces are generated and checked by a symbolic deduction engine, then trains a multimodal prover to propose auxiliary constructions. The central data claim is concrete: “Each instance pairs a rendered diagram with formal construction DSL and predicate DSL descriptions, optional auxiliary constructions, and a complete DDAR proof trace.” (§4.5, p.9). The downstream model is GenesisGeo-2B, a Qwen3-VL-2B model trained on these records.

The formal representation separates a construction DSL, predicate DSL premises, an `<aux>` block for proof-only constructions, and a `<proof>` block. This separation is directly relevant to verified Rust: generated suggestions are candidates, while DDAR remains the acceptance checker.

## technique 1: synthesize checked proof data
Inference: use this to create training data with machine-checkable derivations rather than natural-language explanations.

1. Sample a BASIC construction backbone in the AlphaGeometry-style DSL (§4.1, p.6). Grow it by pairing two INTERSECT actions to define a point or by adding an OTHERS construction such as a foot, incenter, or excenter. Before committing each action, run dependency checks and numerical coordinate-consistency checks (§4.1, p.6).
2. Run the symbolic engine to compute a closure of deducible predicates (§4.2, p.7). Filter trivial statements and rewritable equivalents with predicate-specific rules; deduplicate equivalent `eqangle` and `eqratio` goals (§4.2, p.7 and Table 3).
3. For each retained goal, traceback the shortest proof DAG to collect only parent predicates that reach construction facts (§4.3, p.7). Serialize proof-required but problem-unnecessary points in `<aux>`.
4. Minimize auxiliaries by removing points in reverse-topological order and rerunning DDAR. The paper batches problems with identical premise and auxiliary sets, accelerating revalidation “by approximately 5×” (§4.3, p.8).
5. Render a diagram from Cartesian coordinates with a construction-based renderer so visual objects correspond to symbolic objects (§4.4, p.8). Export `<problem>`, `<img>`, `<aux>`, and `<proof>`, including optional numerical checks (§4.4, p.8).

Verus form (inference): represent each geometric predicate and construction as an algebraic datatype, and the proof trace as a sequence whose step contracts require prior referenced facts. A `spec fn` can define closure membership; proof functions can establish each rule application and a final `ensures` that the goal is derivable. The DDAR engine and renderer are external trusted components unless their rule semantics are reimplemented and proved in Verus. Verus can check trace consistency, but it does not infer geometry rules from pixels.

## technique 2: neuro-symbolic propose-and-verify
Inference: use this when a symbolic prover needs learned auxiliary-construction suggestions.

1. Continue-pretrain on complete serialized records containing image, formal problem, auxiliaries, and proof trace (§5.1, p.10). This aligns diagram tokens with predicate syntax and proof structure.
2. Supervised-fine-tune three tasks: text-only auxiliary construction, vision-grounded auxiliary construction, and proof generation (§5.1, pp.10–11). The full task mixture prevents the model from losing either symbolic planning or visual grounding.
3. At inference, let DDAR attempt the goal directly. If it fails, render the problem, ask the VLM for candidate auxiliaries, add validated candidates to the premise set, and rerun DDAR (§5.2, p.11).
4. Once a candidate is validated, fold it into `<problem>` and reprompt for the next point rather than accumulating all points in `<aux>` (§5.2, p.11). Use parallel beam search to retain several high-scoring candidates per iteration (§5.2, p.11).
5. Accept only when DDAR derives the target. A 60-minute per-problem limit and explicit search budgets bound evaluation (§6, p.11).

Verus form (inference): make each candidate auxiliary an executable Rust constructor with preconditions for geometric validity; a proof function checks the candidate against the current state and returns an updated state whose invariant includes all established predicates. Beam search can remain ordinary code, but acceptance must call a Verus-proved checker. The VLM’s score and image encoder remain trusted for proposal quality, not correctness.

## evidence, boundaries, and VL threat
GenesisGeo-1M contains 1,000,000 problems generated with 50 CPU threads in 28 hours (§4.5, p.9). GenesisGeo (Vision + Text) solves 29/30 IMO-30, 63/95 IMO-95, and 278/409 HAGeo-409 with search budget 32×512×4 (Table 4, p.12). On IMO-30 the symbolic engine solves 26/30 at Pass@8192; the model result is therefore a search-and-model figure, not a pure theorem-proving rate (§6.1, p.13). Ablations show all tasks 29/30 versus 27/30 pretraining-only and 28/30 text-only (Table 6, p.14); pretraining plus SFT gives 29/30 versus 27/30 for either alone (Table 7, p.14).

The proof evidence is the DDAR trace and successful re-derivation, not the VLM’s explanation. Trusted assumptions include the DSL semantics, DDAR implementation, coordinate realization, renderer alignment, training data generation, and benchmark support for each construction. Failure cases include chains deeper than the search depth, rare constructions, and early wrong branches (§6.1, p.13). Inference: for agent-written verified Rust, the strongest transferable idea is to train proposal models on proof traces while making a small deterministic checker the gate. The product threat is low for soundness if every generated artifact is checked, but high for completeness and compute: a model may fail to propose a needed auxiliary or exhaust a search budget. VL should not redo generic synthetic-proof generation without a domain-specific representation and measured trace checker.

## techniques for the catalog
- checked symbolic data synthesis: sample DSL constructions, compute DDAR closure, filter equivalent goals, minimize premises and auxiliaries, and export proof traces
- proof-trace multimodal training: continue-pretrain and multitask-finetune on aligned diagrams, predicates, auxiliaries, and checked proofs
- propose-and-verify search: let a VLM suggest auxiliary constructions, validate each with DDAR, fold accepted points into the problem, and iterate with beam search
- batched auxiliary revalidation: group identical premise/auxiliary sets and rerun proof checks jointly for approximately 5× faster validation
Checked 2026-10-15 against paper zhu2025genesisgeo: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
