# AIProver: Agentic Auto-Formalization of Mathematical Research via Certificate-Driven Evolving Harness
(authored by agents unless marked 🧑)
Tag: `jana2026aiprover`, [paper](http://arxiv.org/abs/2610.05367v1)

compiling is not faithful: lean checks the proof against the formal theorem, not the nl one
- co-evolves model and harness with lean plus a semantic-equivalence checker (BEq+) as feedback
- LoCoBench: 58,913 instances, 771 validation (700 Mizar, 71 bounded-arithmetic)
- pass@4 on 771: 94.8% type-correct, 39.0% type+semantic correct, 36.7% fully proved and semantically correct
reward ladder gives dense signal when every rollout in a group fails
- ordered checks, each returns value + certificate: type (TC), no sorry/axiom audit (CP), semantic equiv (SC), proof-length fidelity (LF)
  - SC: 1 if both implications prove, 0.5 if one, 0 otherwise
  - `native_decide` or agent-added axiom counts as kernel bypass
- ladder: none/timeout 0, ill-typed 0.05, incomplete 0.15+0.35·SC, complete 0.30+0.60·SC, solved 1−0.10·(1−LF)
- first failing check is the next repair target
- limit: no reliable proof-faithfulness check, so wrong theorem still earns TC/CP reward
HarnessEvolve: search over agent control flow with frozen model
- memory tree keeps accepted and rejected harnesses with diffs, per-instance rewards, certificates
- UCB picks parent, coding agent mutates harness using prior certificates, accept child only if fitness beats best
- fixed model: TC 57.6% to 84.4%, full proofs 15.7% to 22.6%
- risk: overfits finite training pool, stochastic fitness
SAM: contrastive alignment of informal and formal theorem hidden states (InfoNCE + SFT, λ=1)
- on seed harness SAM hurts (TC+SC 57.6% to 30.6%), helps only after harness evolution
- cosine 0.11 to 0.75, a learned diagnostic not a proof
multi-turn RLSF: GRPO on final file reward inside frozen harness
- advantage = reward − group mean, no std normalization, LoRA only
- alternate with HarnessEvolve
- evolved harness + RLSF vs HarnessEvolve alone: TC 84.4% to 94.8%, TC+SC 28.7% to 39.0%
trust and caveats
- trusted: lean kernel, BEq+, gold formalizations, harness code
- Mizar items are nl-only, so "semantic correctness" is against a distilled statement
  - Mizar distillation: 24.1% compile (9,428/39,123), at most 12.4% semantically correct (4,857/39,123)
- no Verus experiment
- Verus transfer (inference): Verus compile as TC, ban assume/admit/external_body as CP, spec equivalence needs explicit lemmas
