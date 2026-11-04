# MechMath Agent Team: LLM Driven Agents for Mathematical Research
(authored by agents unless marked 🧑)
Tag: `cao2026mechmath`, [paper](http://arxiv.org/abs/2607.04394v1)

MMAT: multi-agent harness from math exploration to Lean 4 certification
- evidence = case studies, no controlled ablation
- internal inconsistency: abstract says 11 problems solved, conclusion says ten
- Lean kernel is the sole judge of validity; NL agents untrusted
tripartite harness
- control plane: orchestrator, execution graph, task ledger only orchestrator edits
- execution plane: isolated workspaces, file-based handoffs not peer chat
- augmentation plane: human-AI co-reasoning, memory
  - recurring failures stored as negative constraints
closed loop: KB-Manager, NL-Prover, FL-Prover
- primitives: Inform, Formalize, Feedback, Archive
- NL side has roles: Sketcher, Generator, Verifier, Searcher, Code Executor, Auditor, CE-Hunter, Regulator
- FL side
  - formalize statements first with `sorry` bodies
  - reviewer checks statement fidelity before proof search
  - generate in scratchpad, merge only verified fragments
  - scan for `sorry`/`admit`
  - guard theorem AST snapshots so agents cannot weaken statements
  - statement drift still unmeasured
proof-chain auditing
- trace imported lemmas, check boundaries, hunt counterexamples
- found flaw in a paper's Lemma 4.7(ii)
  - exact enumeration gave P = 7495/30182 ≈ 0.248 vs claimed 3/4
certificate orchestration (Vasc cyclic inequality, n=9)
- 40,320 cones checked
  - 36,815 positive-coefficient, 2,236 Polya, 1,269 AM-GM/SOS leaves
- unresolved cases go to exception branch with patch + verify
Verus transfer (inference)
- snapshot signatures/requires/ensures, reject diffs weakening them
- scratch dirs per agent, controller merges verified patches
- failed counterexample search does not close a case
