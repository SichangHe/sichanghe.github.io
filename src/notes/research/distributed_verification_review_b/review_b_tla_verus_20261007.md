TLA-Verus: temporal proof generation with agents
(authored by agents unless marked 🧑)

closest related work

- [TLA-Verus: Generating and Solving Temporal Proof Obligations with LLM Agents](https://openreview.net/forum?id=ncFIZuIUyK)
  - Kseniia Strelbytska, Balázs Szilágyi, Anna Mészáros, Ferenc Huszár
  - NeurIPS 2026 VERICODEGEN workshop poster
  - official forum published September 30, 2026
  - [primary PDF](https://openreview.net/pdf?id=ncFIZuIUyK), full body and appendices inspected
  - forum metadata identifies authors; PDF remains anonymous
  - AI-generated program-chair review excluded as evidence
- translates existing TLA+ models into Verus temporal proof tasks
  - algorithmic TranSpec translator infers types, termination measures and quantifier triggers
  - alternative translator uses an LLM writer and LLM reviewer
  - builds on Anvil's temporal logic library
- implementation correspondence remains future work
  - section 2.2, p.3: “Connecting implementations to the specifications via refinement proofs is left for future work”
  - inference: a checked model proof does not yet establish executable Rust behavior

reported results and populations

- 16,459 model/property pairs attempted in both translation pipelines
  - section 3.3 and Table 3, pp.5–6
- algorithmic side: 5,160 usable translations and 3,094 completed proofs
  - Table 3 and Appendix D.1.3, pp.6 and16
  - Table 9: 304 liveness proofs among those 3,094
- agentic side: 12,352 usable translations and 492 proofs in a selected 500-task sample
  - section 3.3 and section 4.1, pp.5–7
  - sample contains pairs already proved algorithmically
  - inference: 492/500 is conditional success, not success over all inputs
- evaluation: 40 paired tasks, ten per property category
  - section 3.3, p.6
  - categories: safety, type preservation, invariance, liveness
  - Appendix D.3: 32 models from24 public repositories
  - some safety cases retain training-contamination flags
    - Appendix D.2–3, p.17
    - strict filtering left only six safety tasks
- Table 6 reports 40/40 solved by strongest two models in each encoding
  - p.9; Opus-5 and GPT-5.6-sol-pro
  - inference: this small selected set already has limited discrimination at the top

proof controls and semantic limits

- proof-generation pipeline uses a long-running prover and fresh-context reviewer
  - section 3.2, pp.4–5
  - scripts under a separate Unix account control merging
  - Appendix B: commit-specific checks, signed verdict records and restricted transport
- mechanical checks freeze the original task and reject new proof escape hatches
  - Appendix A, p.13
  - structural comparison covers declarations, contracts, specification bodies and executable bodies
  - new assumptions, admissions, axioms and unchecked bodies are rejected
  - inference: these checks preserve the translated task, not a proved source-to-translation relation
- model evaluation uses a simpler feedback loop than the generation pipeline
  - section 3.4, pp.6–7
  - models fill only proof region3
  - task regions1–2 are reattached by the harness
  - three samples per task, at most ten verification attempts per sample
  - Verus0.2026.04.19.6f7d4de and Rust1.95.0 pinned
    - Appendix E, p.19
- translation faithfulness is reviewed, not formally established in this paper
  - section 3.1.2, p.4: reviewer LLM checks faithfulness
  - Appendix D.2, p.17 checks source assumptions, property polarity and vocabulary
  - vocabulary comparison is recorded but does not filter tasks
  - section6, p.9 acknowledges difficulty deciding whether added assumptions are justified
- safety can hold because the model cannot progress
  - Appendix C.2, pp.14–15: Raft-style model's simultaneous exact message assignments conflict
  - reviewer rejects a purported reachable counterexample
  - prover then establishes agreement and exposes lack of useful progress
  - inference: include reachability and progress checks alongside safety

reproducibility limits

- dataset and pipeline are not released
  - Appendix D.3, pp.17–18; checklist item5, p.27
- uncertainty is not quantified
  - checklist item7, p.27: “runs were not repeated”
  - no fixed random seed or error bars
- inference: use the architecture now; independent benchmark reproduction awaits artifacts
- inference: evaluate three separate obligations
  - source model matches the human's intent
  - translated model preserves source behavior and assumptions
  - checked proof establishes the requested property
- PDF saved in the paper collection
  - metadata and SHA-256 in `lit_b/tla_verus_manifest.json`
