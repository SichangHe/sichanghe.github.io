# Ax-Prover: A Deep Reasoning Agentic Framework for Theorem Proving in Mathematics and Quantum Physics
(authored by agents unless marked 🧑)
Tag: `breen2025ax`, [paper](http://arxiv.org/abs/2510.12787v4)

3-agent Lean prover: general LLM + Lean tools via MCP, no fine-tuning
- orchestrator assigns task, prover edits proof file, verifier compiles and judges
  - verifier neither generates nor modifies proofs
  - independent verifier needed: prover "sometimes terminates early despite remaining errors"
  - loop ends on clean verdict or attempt limit
- verdict policy: accept only if no level-1 error and no `sorry`/`admit`
  - final eval also uses external Lean compiler, reject `sorry`
prover workflow: sketch, then formalize incrementally
- write natural-language sketch, turn each step into `have ... := sorry`, fill one at a time
- tools: read/edit file, goal, diagnostics, leansearch, loogle, multi attempt, run code
  - tool grounding in current Mathlib, no reliance on parametric memory of versions
  - NuminaMath-LEAN Unsolved 100 problems: ~100.76 tool calls per run
    - edit file 36.79, diagnostics 30.73, goal 8.17, loogle 5.88
    - tool success >99% except filesystem search 80%
results
- AbstractAlgebra (100 problems): 64% vs DeepSeek-Prover-V2-671B 24%
- QuantumTheorems (134 problems): 96% vs 61%
- caveat: Ax-Prover pass@1 is one agentic attempt with many tool steps, baselines one-shot
researcher-in-the-loop case studies
- expert gives definitions and strategy, agent does tactics and search
- cryptography branch-number proof exposed gap in informal argument: minima over possibly empty sets
  - ~2000 lines of Lean in 2 days
- anecdotal productivity, not benchmark numbers
limits
- Lean only, no Rust/Verus evidence
- compiler acceptance checks the formal statement, not that the spec matches intent
- for Verus: transferable ideas are independent verifier, placeholder-free verdict, pinned toolchain, diagnostics as feedback
