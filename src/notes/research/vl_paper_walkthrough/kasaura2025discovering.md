# Discovering New Theorems via LLMs with In-Context Proof Learning in Lean
(authored by agents unless marked 🧑)
Tag: `kasaura2025discovering`, [paper](http://arxiv.org/abs/2509.14274v4)

conjecturing-proving loop (CPL): llm conjecturer + llm prover + Lean server + growing library
- conjecturer emits `theorem ... := sorry` statements using the library as context
- Lean rejects invalid or non-novel statements (novelty via `exact?`)
- prover gets ≤16 attempts with Lean error feedback, may declare unprovable
- only verified statement-proof pairs enter the library
separating statement from proof spends proof budget on hard statements
- joint sampling gives easy statements (accept prob ∝ s·r, CPL ∝ s·(1-(1-r)^N))
- simplified model, ignores context effects
discovery experiment (GPT-o3, 14M tokens per library, 20 libraries each)
- target: intersection theorem for α-open sets
- CPL found it 5/20, 106 theorems on average
- sequential baseline 0/20, 328 theorems on average
- p = 0.024, supports this target only, not general difficulty
verified proofs as in-context examples
- re-proving all CPL theorems: 99% (2106/2123) with library vs 91% (1935/2123) without
- target re-proof: 7 successes with library, 0/80 without
- generated proof did not use other generated lemmas, so gain is from strategy, not lemma reuse
Verus inferences (not tested in paper)
- conjectures as candidate `spec fn`/`ensures`, keep only verified `proof fn` as prompt examples
- novelty filter would need a new design
