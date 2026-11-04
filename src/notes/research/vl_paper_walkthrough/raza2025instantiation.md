# Instantiation-based Formalization of Logical Reasoning Tasks using Language Models and Logical Solvers
(authored by agents unless marked 🧑)
Tag: `raza2025instantiation`, [paper](https://arxiv.org/abs/2501.16961)

semantic self-verification (SSV): check an llm-written formalization via llm-written concrete examples
- llm writes solver program P = Pinit + C1..CN + O1..OM, each constraint annotated with its nl sentence
  - Z3, 1-4 few-shot examples
- per constraint Ci, llm independently writes 1 positive Ip, 1 negative In
  - check Pinit + Ci + Ip is SAT and Pinit + Ci + In is UNSAT
  - also reject degenerate constraints (tautology, vacuous implication) and malformed P
- verified answer returned only if all checks pass, else best unverified answer, else direct llm inference
semantic repair
- first failing instantiation + code sent to llm to diagnose initial defs vs constraint vs instantiation
  - re-enters loop, MaxRepairs = 2, temperatures [0, 0.3, 0.4, 0.5]
- AR-LSAT ablation: repair +6.1% accuracy, temperature exploration +10.0%
  - repair stops helping beyond 3 attempts
results are selective, not universal
- GPT-4 coverage 21.7% (AR-LSAT) to 75.2% (ProofWriter), precision 94.0% to 98.7% on original labels
  - coverage = verified / all, precision = correct among verified
- GPT-3.5 coverage 0 on AR-LSAT and LogicalDeduction, wrong verified cases exist
  - program and examples can share the same error
- author-stated limit: concrete examples miss corner cases
- cost: median 152 s per task
trust
- Z3 checks examples, not whether the formalization matches the nl problem
verus transfer (inference)
- constraint = `spec fn`, examples = concrete asserts, but examples never prove a universal property
- accept only verus-verified candidates, cache only when spec and code unchanged
