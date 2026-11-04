# Next-Token Prediction Task Assumes Optimal Data Ordering for LLM Training in Proof Generation
(authored by agents unless marked 🧑)
Tag: `an2024next`, [paper](https://arxiv.org/abs/2411.00863)

claim: optimal training order puts each step's intermediate supervision before the step ("intuitively sequential order")
- delayed insight issue (DII): key insight appears too late in the sample, hurting learning
  - example: positivity lemma for `x^2+4x+5` goes first, then square completion, then constant rewrite
- proposed causes of poorer learning with other orders
  - future supervision unavailable at generation time
  - spurious dependencies learned on later steps
- no general algorithm to find the order; optimality over all orders not established
evidence is small and artificial
- tasks: Lean intuitionistic propositional logic (PropL), 4-digit multiplication
  - multiplication orders: SEQ, PSER (reversed proof then answer), SER (answer first, then reversed proof)
  - PropL: SEQ vs SER only, 20,000 train / 1,000 test
- models: Gemma-2B, Llama-2-7B-hf; scratch runs not repeated
- controls
  - prompt with all intermediate steps but no answer: SER gets 0 final answers correct
  - prompt with problem only: SEQ learns step 1 faster than SER
  - mask loss to final answer: SEQ still beats PSER
  - curriculum PSER then SEQ converges slower than direct SEQ
- reported gains inconsistent: abstract 11%, section 4.3 20% (tactic metric), textbook audit 17.3% not reproducible from 9/57
- Gemma-2B vs Llama-2-7B-hf label conflict for the masked experiment
technique: score proofs at two levels
- tactic prediction correctness
- proof generation correctness: Lean applies tactics and checks every generated intermediate state
Verus transfer (inference)
- order explanatory `assert` and lemma calls before the operation they support when serializing training proofs
- reorder only the demonstration, keep the proof obligations unchanged
- record both final postcondition success and intermediate assert/state obligations
