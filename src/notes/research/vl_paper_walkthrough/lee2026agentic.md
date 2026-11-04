# Agentic Proof and Property-Based Testing via Property-Templates in Data-Intensive Computing
(authored by agents unless marked 🧑)
Tag: `lee2026agentic`, [paper](https://arxiv.org/abs/2607.09072)

DualVeri: agent fills typed holes of property templates for Spark properties
- each candidate is proved in a Lean 4 model and tested with PBT on real PySpark
- 4 families: higher-order expr rewrite (HOE), UDF rewrite, aggregation decomposition (AggDecomp), operator subsumption (Subsump)
  - many candidates type-check yet are false, e.g. global mean ≠ mean of per-partition means
proof template = local law + pre-proved lift
- agent proves only the instance-specific local law, lift is proved once per family
  - avg 546 lines of Lean per template
- 400 candidates, 243 in scope of the Lean model
  - 136 successes with templates vs 90 without, avg 1.6x
  - significant only for HOE (28 vs 17) and UDF (54 vs 21), where the template supplies the per-operator lift
  - AggDecomp 6 vs 5, Subsump 48 vs 47, not significant
- hallucinated proofs (compile, wrong claim) fall 17 → 7
  - lake build certifies the proof, not that the definitions encode the intended property
PBT template = fixed generator/compare architecture, agent fills only holes
- faithful tests 96.8% vs 92.8% no template vs 82.5% generators only
  - not better in every family: AggDecomp 98 vs 100, Subsump 94 vs 97
- cost per attempt up to 5.7x lower (avg 3.8x)
- remaining failures are hallucinated PySpark API calls
cross-validation of proof vs test is a model-gap detector
- 130/400 have both proof and faithful passing PBT, the strongest evidence
- 1 proof contradicted by PBT: Lean total List has no null, PySpark nullable arrays break the equality
- 251 passing tests without proof: 107 outside model, 138 proof budget exhausted
Verus takeaways (inference)
- state the lift as a reusable lemma, keep the collection model Rust-specific
- fixed Rust test harness with only strategy holes, compare against spec fn
- test counterexample to a proved property means unsound proof or model-implementation gap
