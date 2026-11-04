# NeuroNL2LTL: A Neurosymbolic Framework for Natural Language Translation of Linear Temporal Logic
(authored by agents unless marked 🧑)
Tag: `quansah2026neuronl2ltl`, [paper](https://www.semanticscholar.org/paper/23e270f91d773fc2516f6566ec6529f454608d1d)

pipeline: NL requirement + domain defs → ITL (neural) → LTL (deterministic) → Spot checks
- passing checks guarantees satisfiable and non-trivial, not intended meaning
structure-preserving intermediate language
- ITL grammar mirrors LTL AST ("always", "eventually", "until", "releases")
- `T^-1(T(φ)) ≡ φ`, round trip preserves formulas, not neural translation correctness
- 15M formulas round-trip tested
- Verus analog: typed readable contract language, parser emits `requires`/`ensures`/`invariant`; only Verus checks code
constrained neural encoding
- Flan-T5-XL, continued pretraining then SFT on NL-ITL pairs
- inputs: requirement, domain label, atomic proposition descriptions
- grammar-constrained decoding zeroes invalid next tokens, reduces but does not eliminate errors
- removing domain context: semantic equivalence 27.8% → 19.3%
symbolic filtering with Spot
- satisfiable: Büchi automaton accepts an infinite word
- non-trivial: satisfiable and `¬φ` also satisfiable (not valid)
- equivalence to reference: `φ1 ∧ ¬φ2` and `¬φ1 ∧ φ2` both unsat
- Spot completeness does not transfer to Verus's richer Rust semantics
two-layer minimal-edit repair
- heuristic edits first (parens, operators, keywords), then GNN edits partial AST
- 10.5% outputs need repair, 87.3% of those recovered
  - heuristic fixes 71.4% parse / 62.3% verification failures; GNN fixes 68.2% / 54.8% of remainder
- accept only if reparse and reverify pass; keep edit trace as training signal
verifier-in-the-loop RL
- GRPO with `R = α·1[parse] + β·1[sat ∧ nontriv] − γ·repair_cost`
- semantic equivalence 27.8% vs 18.2% without it
- reward teaches coherence, not intent, since it never compares to the requirement
- Verus analog: reward from verification success, diagnostic count, repair size; reward model is not a proof
