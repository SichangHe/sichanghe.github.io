# LEAP: Supercharging LLMs for Formal Mathematics with Agentic Frameworks
(authored by agents unless marked 🧑)
Tag: `kung2026leap`, [paper](http://arxiv.org/abs/2606.03303v2)

LEAP = agentic Lean prover, a proof-search control loop not a new calculus
- pieces: informal planning, formal proof, compiler feedback, decomposition, graph memory
- also introduces Lean-IMO-Bench (60 problems, 30 Basic + 30 Advanced), evaluates Putnam 2025
- all numbers Lean-specific, orchestration ideas transfer to a Verus agent
direct attempt first, then blueprint decomposition
- direct: informal proof, translate to Lean, compile, LeanSearch retrieval
- on failure: informal blueprint, formal sketch, new lemma statements as AND-OR DAG nodes
  - `sorry` allowed only in newly proposed lemma statements, parent body sorry-free
  - open obligations are explicit, not silent holes
- Putnam 2025: direct Gemini-3.1-pro and Goedel-Prover-V2-32B 0/12 at Pass@128, LEAP 12/12 at rollout=2
  - agent-level gain, not attributable to decomposition alone
- Verus form (inference): direct proof first, then helper `proof fn`s as child lemmas, no `external_body` in parent
AND-OR DAG memoization
- OR node = goal, AND node = decomposition needing all children
- monotone refinement: keep dependency order while revising local attempts
- shared lemma nodes reused across branches, anticipatory lemmas allowed
- depth-first search with backtracking
- ablation tree vs DAG on 60 problems: Basic 73.3% to 83.3%, Advanced 40.0% to 56.7%
- Verus form (inference): cache keyed by spec and context, invalidate when specs or imports change
informal-formal interleaving
- every path goes through an informal sketch, only compiler-checked artifacts accepted
- informal skill does not give compilable proofs
  - Basic: Gemini 2.5 Pro NL proof Pass@1 55.2% vs Gemini 3.1 Pro formal Pass@128 20.0%
  - Advanced: 17.6% vs 3.3%
  - different models and graders
decomposition review by an LLM
- compiler checks well-typed, not useful: "Compiler verification checks whether a proof sketch is formally well-typed, but not whether its decomposition is useful."
- reviewer rejects subgoals that restate the parent, are cyclic, or are no simpler
- ablation on Putnam A5 only: without reviewer fails after 8 rollouts, with it 2 rollouts
  - cost: 3.0k LLM calls, 170 active DAG nodes, longest runtime
- Verus form (inference): reviewer is heuristic and untrusted, only `verus` establishes the property
compiler-feedback refinement
- 1 initial attempt + up to 20 revisions, scored Pass@1
- Lean-IMO-Bench Basic
  - Gemini-3.1-pro 20.0% to 36.6%
  - Goedel-Prover-V2-32B 10.0% to 6.6%
  - feedback benefit is model-dependent
benchmark construction
- Lean experts manually formalized and verified all 60 statements
- LEAP: Basic 83.3%, Advanced 56.7%, Algebra and Number Theory 100%, Geometry 16.7% / 12.5%
  - report per-category denominators
limits
- trusted: model, retrieval, reviewer, extraction code, DAG manager
- case studies (5000+ line Knuth Hamiltonian-decomposition proof, Erdős 457) are demos, no success rate
- no evidence on Rust memory safety, unsafe code, weak specs, malicious model output
- Verus trust escapes need an explicit policy, Lean `sorry` discipline does not transfer automatically
