# The Fusion of Large Language Models and Formal Methods for Trustworthy AI Agents: A Roadmap
(authored by agents unless marked 🧑)
Tag: `zhang2024fusion`, [paper](https://arxiv.org/abs/2412.06512)

position paper: roadmap for LLM + formal methods, no aggregate evaluation, a PAT agent prototype
- two directions: FMs for LLMs (solvers, tests, monitors) and LLMs for FMs (formalize, prove, model-check)
- authors call the integration methodology preliminary
LLMs for FMs: proposals
- solver-mediated reasoning: NL -> SMT constraints -> solver -> NL
  - failure modes: verbose formulas, wrong/inconsistent formulas, invalid syntax
  - controls: multi-LLM debate, generated tests (fuzz, mutation), self-correction from critics/solver errors
  - Z3 meeting example: first code omitted negative constraints, self-correction added them
  - solver success alone does not show the NL was formalized faithfully
- outline-and-tool autoformalization: LLM proof outline, CAS fills symbolic gaps, iterate
  - motivated by an Isabelle induction step where the LLM mis-simplified 2*(n+2)-(n+1) to 2*n+3
- semantic premise selection: LLM writes NL description per lemma, retrieve by meaning not syntax
  - cited: transformer premise selector improved Sledgehammer miniF2F by 13% (relative/absolute unstated)
- intention-aware retrieval-augmented proof agents: each step carries an explicit intention, dynamic retrieval of definitions/lemmas, repair from errors
- NL -> Coq 4-step workflow: understand, formalize, construct proof, verify + feedback
  - user must still check NL/Coq consistency
- model-checking loop (PAT): planning LLM, code-completion LLM, model checker, automated prompt engineer feeds counterexamples back
  - car-key example: unsafe `leavekey` transition fixed after PAT error trace
  - single qualitative example, no counts
- refinement calculus with backtracking: LLM picks refinement laws, generates code, ATP discharges proof obligations
  - after repeated failures backtrack to last refinement and pick another law
  - architecture only, no results
  - cannot fix a wrong initial formalization
FMs for LLMs: proposals
- factual metamorphic testing: fact triples + logic rules (negation, symmetry, inverse, transitivity) generate Q&A, compare parsed answer graphs to ground truth
- runtime monitoring: check traces against temporal properties, between testing and verification
  - only observed traces, no universal guarantee, no algorithm given
Verus-relevant inferences
- keep the LLM outside the trusted base, accept only verifier-checked output
- Isabelle/Coq/Z3 Python syntax does not carry over to Verus
