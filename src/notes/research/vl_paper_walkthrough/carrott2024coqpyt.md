# CoqPyt: Proof Navigation in Python in the Era of LLMs
(authored by agents unless marked 🧑)
Tag: `carrott2024coqpyt`, [paper](https://arxiv.org/abs/2405.04282v1)

python client over Coq LSP for collecting proof data and editing proofs
- targets Coq 8.17-8.19; no downstream proving accuracy measured
step navigation
- `CoqFile.exec(n)` steps forward/backward; each step has text, AST, validity
- file context indexes terms defined up to the cursor, incl. notations
- limits
  - omits module types and section-local constructs
  - does not recursively fetch a term's own context
proof-aware extraction
- `ProofFile` tracks goals, open proofs, proof terms, proof steps
- each step records goals before it and the terms it uses
  - used terms differ from available terms
  - use goals + available terms as generation input, used terms/tactic as training target
transactional editing
- `add_step`, `delete_step`, batched `change_steps`, `change_proof`
- invalid edit reverts the file and raises `InvalidChangeException`
  - example: pop `Admitted`, append candidate tactics, catch exception, try next
- shown by demo only; no proof-search benchmark
scalability on CompCert
- runs on 193 of 259 files; 58 Coq errors, 6 OOM, 2 unknown crashes
- mean 609.6 steps, 6.6s load, 31.2s execute
- latency correlates with step count
  - execute PCC 0.72; add/delete step PCC 0.90-0.94
compared with Coq LSP and Coq Serapy
- Serapy does not collect terms used per step
transfer to Verus (inference)
- wrap verifier in a rollback buffer: apply candidate patch, keep only if Verus passes
- log source spans, spec names, diagnostics per edit
