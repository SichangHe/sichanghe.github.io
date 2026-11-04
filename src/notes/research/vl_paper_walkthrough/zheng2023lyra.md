# Lyra: Orchestrating Dual Correction in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zheng2023lyra`, [paper](https://arxiv.org/abs/2309.15806)

lyra = draft-sketch-prove (DSP) + two verifier-driven repairs, Isabelle + GPT-4 on miniF2F
- accepted only if no sorry/oops and Isabelle verifies the statement
tool correction (TC)
- when conjecture is right but tactic is wrong
- failed tactic that is `.` or starts with by/sledgehammer: try fixed list
  - by auto, arith, blast, simp, fastforce, force, eval, presburger, sos, linarith, auto simp: field_simps, sledgehammer
- keep first that verifies, else reject
conjecture correction (CC)
- append previous proof + prover errors to the initial prompt, end with `proof -`
- reset every K=5 attempts: regenerate fresh instead of refining a bad proof
  - 200 attempts = 40 patches of 1 initial + 4 refinements
- no paired (generation, error, refinement) training data needed
- verus analogue (inference): feed diagnostic + prior proof + requires/ensures, force full compilable function, periodic reset
  - spec changes are conjecture changes, review separately
results, % of 244 problems per split
- 100 attempts, gpt-4 informal proofs: valid 52.8, test 44.2
  - dsp w/ Minerva 540B: 42.6 / 38.9, different informal-proof source
- 200 attempts: gpt-4 informal 54.9 / 47.9; human informal 55.3 / 51.2
- ablation, 200 attempts, gpt-4 informal
  - TC only 55.3 / 45.0; CC only 48.3 / 40.9; both 54.9 / 47.9
  - TC alone beats TC+CC on valid
  - CC alone does not help, only with TC
    - paper: CC needs a stronger prover to fill formal gaps
  - TC adds test +4.1 pt without CC, +7.0 with CC
trust and limits
- statement fidelity to the natural-language problem not checked
- only Isabelle, only miniF2F (high-school competition problems)
