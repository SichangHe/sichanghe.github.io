# Improving Symbolic Translation of Language Models for Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `thatikonda2026symbolic`, [paper](https://doi.org/10.48550/arxiv.2601.09446)

small LMs translate NL to Prover9 FOL, prover executes
- verifiable only for syntax and solver result, not that translation means the source sentence
- error taxonomy: parsing, NoneType, token, predicate (arity mismatch, subject-predicate conflict)
tool-filtered data synthesis
- GPT-4o makes passage-level FOL from 15,000 depth-5 ProofWriter records
- filter: format fix, Prover9 parse, solver label match
- 10,424 records kept
- manual check: 50 records / 1,018 statements, 22 errors (~2%), half minor
  - conditional on Prover9-confirmed outputs
- Verus form (inference): staged filter on requirement-to-contract output; adequacy still needs human review
structured SFT
- target = NL ∥ predicates ∥ FOL, LoRA 3 epochs
- models: Gemma-3-4B, Phi-4-mini, Qwen2.5-3B, Qwen3-4B
- eval: ProofWriter 600, ProntoQA 500 OOD, FOLIO 203, ProverQA 500 hard
- gains broad, but Phi-4-mini on ProverQA has a 12% error-rate increase
incremental inference
- stage 1 predicates only, stage 2 FOL conditioned on them
- limits cascading token errors, ~10% extra error reduction
- ProverQA Phi-4-mini coverage/usage/validity 46/46/53 to 62/62/76
- ProntoQA Qwen3 69/73/78 to 75/81/100
- Verus form (inference): fix vocabulary of predicates/invariants first, then contracts
arity verifier between stages
- Gemma-3-4B 3-shot checks arity and consistency, returns corrected predicates
- improves accuracy beyond incremental inference, gains vary by dataset and model
- cannot detect a wrong predicate meaning
- Verus form (inference): compiler is the final checker, independent of the proposer
limits
- ProofWriter has limited diversity, GPT-4o silver labels can be inconsistent
- OOD gains do not show contract-generation reliability
