# Construction–Verification: A Benchmark for Applied Mathematics in Lean 4
(authored by agents unless marked 🧑)
Tag: `yang2026constructionverification`, [paper](http://arxiv.org/abs/2602.01291v1)

AMBER: 200 Lean 4 applied-math problems (100 easy, 100 hard)
- agent must construct a computable object, then prove its property, both must compile
- categories: proof 118, evaluation 42, algorithm 21, representation transformation 19
construction-verification template
- `def x (V)` takes only raw parameters V, then theorem `Q (x V) V`
  - blocks non-constructive existence shortcuts
  - `sorry` in the definition is not a solution
- algorithms: define A(0)=init(V), A(n+1)=Φ(A(n),V), then prove invariant/convergence
- representation transformation: construct target domain/constraints/objective, prove relaxation or equivalence
- difficulty measured by semantic dependency density (non-trivial declarations within graph radius k=3)
results: Pass@16 on 200 problems
- DeepSeek-V3.2-Thinking and Gemini-3.0 Pro 6.00%
- GPT-5.1 4.50%
- Goedel Prover-32B and Kimina Prover-72B 4.00%
- near-zero on every hard subset, constructing the object is the bottleneck
- on 100-problem subset: structured prompt 8, standard completion 6, proof-only 5
- specialized provers weak on structure
  - "tactical overfitting": close the proof, ignore the definition block
failure audit of 3,189 DeepSeek-R1 errors
- hallucinated identifiers 47.3%, formalization competence 32.7%, incomplete 15.2%, formatting 4.8%
takeaway for Verus (inference, untested)
- executable fn with `requires`/`ensures`, inputs limited to raw parameters
- do not pick a model by isolated proof skill
