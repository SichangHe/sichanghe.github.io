# Formally Solving Answer-Construction Problems in Lean
(authored by agents unless marked 🧑)
Tag: `sun2025formallysolving`, [paper](http://arxiv.org/abs/2505.18492v6)

answer construction differs from theorem proving
- theorem proving gets the target statement, answer construction must synthesize the witness and prove it
  - shapes: ∀X. P(X) → Q(X) vs ∃Ψ. ∀X. P(X) → Q(X, Ψ(X))
- lean accepts circular witnesses, e.g. `sInf Property` where a numeral is required
  - proof compiling does not enforce answer format
ECP: enumerate-conjecture-prove pipeline
- general LLM does bounded search and conjectures the answer, prover LLM proves it, admissibility checker sits between
  - default: GPT-5.4 + Goedel-Prover-V2-32B, lean 120s timeout
- results: 18/75 MathArena, 17/346 PutnamBench at Pass@32
  - denominators are answer-construction subsets only
  - cost: 110.6 USD vs 341.2 USD for GPT-5.4 baseline on MathArena, 13/75
typed preprocessing: formalize the task and label an admissible vocabulary A
- formalization checked by lean compile + manual equivalence inspection
- A labeled by heuristics
  - numerals for AIME, arithmetic expressions for HMMT/Apex, university-level constants for Putnam
  - coverage check vs ground truth: 75/75 MathArena, 301/346 PutnamBench auto, 45 fixed manually
  - heuristics rely on implicit knowledge of answer format, so no guarantee for new tasks
structural admissibility check: UsedConstants(Ψ) ⊆ A
- recursively collect constants of the elaborated expression, ignore compiler-introduced type formers and instances
- run before the prover is called
- naive compile-only metric massively overcounts
  - MathArena GPT-5.4: 13 real + 19 spurious
  - PutnamBench GPT-5.4: 8 real + 134 spurious
- verus analogue: spec-gaming check, the verifier accepting is not enough, constrain what the witness may use
bounded enumeration then conjecture
- LLM writes python to search small cases, then generalizes to an explicit answer in `<<<>>>`
- compile + admissibility errors feed the next round
  - limits: 10 enumerate, 5 conjecture, 2 ECP rounds
- ablation: no enumeration loses 10 tasks (MathArena), 13 (Putnam)
- fails on combinatorial explosion, proposal generator not completeness
proof automation, repair, disproof
- try `native_decide`, `simp`, `aesop`, `ring`, `norm_num`, then prover-LLM repair with error messages
- also prove ¬T_Ψ; if it succeeds, blacklist Ψ and reconstruct
  - verus analogue: timeout is not a disproof
- ablations
  - no automation: MathArena 18 to 11
  - smaller prover: Putnam 17 to 7
  - no repair: MathArena 18 to 16, Putnam 17 to 16
certified equivalence: prove Ψ = Ψ_ground_truth in lean
- stronger than string match or LLM judge
trust boundary
- lean + admissibility check are trusted, LLMs and enumeration are untrusted proposers
- proof acceptance does not show formalization matches informal task
