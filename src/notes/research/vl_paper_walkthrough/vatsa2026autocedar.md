# AUTO CEDAR: An Agentic Framework for Verifier-Guided Access Control Policy Synthesis
(authored by agents unless marked 🧑)
Tag: `vatsa2026autocedar`, [paper](https://arxiv.org/abs/2607.03656)

cedar access-control policy synthesis from prose, verifier-guided
- llm proposes policies, but a human-reviewed semantic target is fixed before policy search
  - target: cedar schema Σ, boundary plan Π
    - floors F: access that must remain
    - ceilings C: access that must not be granted
    - liveness slices G: approved workflows that must remain possible
  - prose becomes source-linked atoms, each needs mechanical check + reviewer acceptance
  - target rejected before any llm policy call if admission fails
  - model cannot edit F, C, G, or approved obligations
synthesis sandwich (Theorem 1)
- P satisfies Π iff LΠ ⊆ sem(P) ⊆ UΠ and every G intersects sem(P)
  - LΠ: union of floors, UΠ: intersection of ceilings
- checked by cedar symcc (SMT), failed inclusion returns a concrete request witness
- guarantee is conditional: wrong atom approved means verifier checks the wrong boundary
typed repair loop (CEGIS-like)
- verifier records become typed repair packets
  - ceiling over-permission → tighten
  - floor failure → loosen
  - liveness failure → expand
  - parse/type error → local
- packet may compress evidence, not mutate Π or invent witnesses
- history of hashes and oscillation changes next packet, not the oracle
- stochastic llm can reintroduce old errors, so not monotone
results (CedarBench, 221 scenarios)
- GPT-5.5-low and Haiku 4.5 both converge 221/221
  - mean iterations 1.67 / 2.51, cost $0.0405 / $0.0185
- ablation on 100 scenarios
  - full signals 100/100, schema-only 85/100, native verifier feedback 94/100
- direct GPT-5.5 passes all properties on 176/221, Haiku on 3/221
- real cases matched 76/76 IBM, 68/68 CyberChair, 38/38 iTrust
verus transfer (inference)
- pin intent as immutable spec model outside agent authority
- typed verifier-error records with failure history to avoid oscillating invariants
- do not count external_body as repair evidence
- z3 models → concrete rust tests, supplementary to proofs
