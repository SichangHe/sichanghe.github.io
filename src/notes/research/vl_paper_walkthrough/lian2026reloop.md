# ReLoop: Structured Modeling and Behavioral Verification for Reliable LLM-Based Optimization
(authored by agents unless marked 🧑)
Tag: `lian2026reloop`, [paper](http://arxiv.org/abs/2602.15983v5)

problem: LLM optimization code runs and returns a feasible solution while encoding the wrong problem
- feasibility-correctness gap reaches 90 points on compositional problems
- a diagnostic pipeline, not proof of semantic equivalence
four-stage structured generation: understand, formalize M=(I,P,V,C,f), synthesize Gurobi code, self-verify completeness
- decide variable types (continuous/integer/binary) from context to avoid accidental relaxation
- keep parameter names via data["key"] so perturbation can change them
- RetailOpt-190, Claude CoT: +8.5 points (20 fixed, 4 regressed), 95% CI [1.6, 16.8]
  - DeepSeek execution falls 91.1% -> 53.2% under CoT (notation breaks syntax), so L1 recovery is needed
L1 execution verification is the only blocking layer
- parse, run, check solver status; regenerate on FATAL with diagnostics
  - infeasible: IIS conflicting constraints; unbounded: variables on the ray
- execution after L1: DeepSeek 53.2 -> 97.4%, Claude 93.7 -> 99.5%
L2 perturbation tests (advisory, solver as oracle, no ground truth)
- CPT perturbs capacity x0.001, demand x100; OPT perturbs cost/revenue
- r = |z' - z*|/|z*|: r < 5% WARNING, 5 to 30% INFO, > 30% or infeasible PASS
  - asymmetric thresholds favor under-detection over over-repair
- MAMO-ComplexLP: Claude +4.4 (11 fixed, 2 regressed), DeepSeek +2.0 (4 fixed, 0 regressed)
- injected omissions: 238/240 detected (99.2%); intact-code false positives 64/240 (26.7%)
  - misses when a parameter also appears in a budget constraint
  - cannot detect coefficient-magnitude errors or wrong constraints reusing the same parameters
diagnosis-guided repair with guards
- repair only WARNINGs, log INFO as do-not-fix
- block dangerous imports and data reassignment
- roll back if solver status worsens or objective shifts > 4%
  - cannot see unobserved semantic regressions
Verus takeaways
- Verus run as the blocking layer, perturbation-style tests as advisory
- record solver version, seed, perturbation, status for reproducibility
