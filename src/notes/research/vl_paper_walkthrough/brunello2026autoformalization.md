# Natural Language to First-Order Logic LLM-based Autoformalization
(authored by agents unless marked 🧑)
Tag: `brunello2026autoformalization`, [paper](https://arxiv.org/abs/2610.12030v1)

survey and task definition, no new experiments or cross-method comparison
- output is formula φ plus ontology Ω = (signature, symbol labels, background theory)
  - "The richer the specification of Ω, the more verifiable the output φ becomes."
- ontology extraction (OE) builds Ω, logical translation (LT) writes φ given Ω
- no existing work evaluates signature quality
  - ontology quality is an unmeasured error source
- cross-paper comparisons unreliable: nonstandard protocols, annotation noise
fix intended meanings before judging faithfulness
- same sentence has multiple valid formulas with different commitments
  - "Every student passed some exam" has 3 formalizations differing in exams, passing, grades
- symbol names alone do not give meaning
evaluation
- syntactic metrics (exact match, tree edit distance, BLEU, LogicSim) vs semantic (logical equivalence, LE score)
- recommended: supply labelled signature, check logical equivalence
- NLI entailment agreement is a proxy
  - can agree despite incorrect formulas
improvement strategies
- fine-tuning: SFT, LoRA, RL with BLEU+LE reward, DPO/KTO
  - symbol renaming and instruction augmentation reduce memorization
- prompting: few-shot, CoT, OE/LT decomposition, compositional translation, RAG of NL-FOL pairs, grammar-constrained decoding
- verification-refinement loops
  - syntax: parser or prover errors fed back, robust across models
  - semantic: SAT/SMT unsat cores, counterexamples, roundtrip equivalence, LLM judge
  - SMT feedback is rigorous but partial, LLM judge broader but no guarantee
- end-to-end pipelines formalizing NL spec corpora are almost absent
for Verus (inference)
- document predicate meanings and background assumptions before generating contracts
- compare generated spec to reference by proving equivalence
- LLM judge is advisory, only a Verus proof or sound solver certificate discharges a contract
- a proof only holds under the supplied predicates, not the NL requirement
