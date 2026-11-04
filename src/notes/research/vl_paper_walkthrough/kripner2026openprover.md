# OpenProver: Agentic and Interactive Theorem Proving with Lean 4
(authored by agents unless marked 🧑)
Tag: `kripner2026openprover` , [paper](https://www.semanticscholar.org/paper/2afd06688ad508215a252a23531527cc481ca50a)

open-source Lean 4 prover: planner + parallel workers + independent verifiers + memory + terminal UI
- inspired by Aletheia-style agentic ATP
result: 185 ProofNet theorems, 100k-token budget each
- Kimi-K2.5: 36.8% linear rollout vs 57.3% OpenProver
- Leanstral: 21.1% vs 28.1%
- baseline = one linear conversation with unlimited Lean verifications
- no ablation: cannot tell whether workers or verifiers cause the gain
- no runtime, token distribution, or confidence intervals
planner-worker-verifier loop
- planner holds global state, spawns workers in parallel (prove lemma, find counterexample, formalize informal proof)
- fresh verifier per worker output gives independent natural-language feedback, never sees worker trace
- independence aims to cut correlated errors and anchoring on an early mistake
- verifier feedback can be wrong; only Lean certifies
whiteboard + repository memory
- whiteboard: compact markdown plan, failed attempts, ideas to revisit
- repository: longer snippets, Lean items stored only if Lean verifies, else errors go back to planner
- no experiment measures retention or error reduction
Lean checked at 3 points
- final proof, planner's intermediate items, worker tools `lean_verify` / `lean_search` (Mathlib semantic search) / `lean_store`
- formalization is often harder than the informal proof search
human steering
- UI streams all agents, lets user interrupt; manual mode approves each action set, autonomous mode skips approval
trusted base
- theorem statements, Lean/mathlib, prompts, budgets; architecture itself unproved
Verus implications (inference)
- worker produces candidate lemma/invariant, verifier runs `verus`; second verifier audits assumptions and `external_body`
- promote snippets to repository only after Verus passes
- no `sorry` analogue: accept only fully verified Rust
- paper evaluates Lean only, transfer to Verus untested
