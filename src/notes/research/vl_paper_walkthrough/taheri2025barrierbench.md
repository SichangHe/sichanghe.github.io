# BarrierBench: Evaluating Large Language Models for Safety Verification in Dynamical Systems
(authored by agents unless marked 🧑)
Tag: `taheri2025barrierbench`, [paper](https://arxiv.org/abs/2511.09363v2)

LLM agents synthesize barrier certificates for dynamical-system safety, checked by SMT
- barrier B: <=0 on initial set, >0 on unsafe set, Lie derivative <0 on B=0 (continuous) or nonincreasing across transitions (discrete)
  - existence of B implies safety; safety itself is undecidable in general, so a certificate is a sufficient check
- BarrierBench: 100 systems, 1D-8D, linear/nonlinear, continuous/discrete, 68 controlled (barrier + controller co-synthesis)
- Claude Sonnet 4 full framework 90/100; ChatGPT-4o 46/100; single-prompt baselines 41 and 17
  - 10 unsolved: complex nonlinear, solver timeouts
retrieval-guided synthesis
- filter database of verified systems by dimension, time domain, linearity, topology; LLM ranks by structural similarity
- retrieved example is a few-shot pattern, not copied; synthesis makes new coefficients
- of 90 solved: 49 first attempt, 63 within first main iteration
  - first-attempt gain over baseline not isolated to retrieval
two-stage verification with refinement
- stage 1: 5,000 samples (30% initial, 30% unsafe, 40% space) reject candidates cheaply
- stage 2: Z3 / cvc5 / Yices check negated conditions unsat; retry with a bigger timeout or another solver
- feedback = violated conditions + counterexamples
  - refinements 1-2 retune coefficients, 3-4 change structure
  - K=5 iterations x R=4 refinements; refinements added 14 + 13 successes
- best partial solution is returned on exhaustion, not a certificate
- symbolic conversions / Taylor approximations are not error-bounded, so guarantee depends on faithful encoding
for Verus (inference)
- sampling is a debugging heuristic only; acceptance requires a verified proof obligation
- real-valued model and barrier theorem would need their own formalization
