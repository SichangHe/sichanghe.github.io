# Grounding AI Agents in Contracts: An Empirical Evaluation of Spec-Driven Test Generation
(authored by agents unless marked 🧑)
Tag: `tufano2026contracts`, [paper](https://doi.org/10.1145/3842652.3843195)

claim: extracting a semi-formal contract before writing tests makes agent-written tests find more bugs
- Spec-Driven Agent, two phases
  - extract S = <D, Pre, Post, Sug> per public and private API
  - mark each condition Tested/Untested, write a targeted test for each Untested one
- setup
  - 90 Google production bugs (C++, Java, Python, Go), single-file fixes, Gemini 3 Flash, 5 runs per bug
  - greenfield: existing tests removed, agent blind to bug description, commit, diff
  - detection = suite passes fixed code and fails reverse-patched buggy code
results (k=5, same model and harness as baseline)
- bug detection 63.2% vs 53.4% (57 vs 48 unique bugs), McNemar p=0.0352
- branch coverage 48.9% vs 46.4% (p=0.0034); line coverage 74.4% vs 74.8% (not significant)
- test pass@5 98.9% for both, so gain is not just compilable code
- cost: tokens +38.0% total (336.7M vs 243.9M), +16.2% per unique bug
- LLM judge (Gemini 3.1 Pro) prefers spec-driven suites in 77.8% of cases, 56.7% vs human suites
  - judge outputs, not proof
where it fails
- ContractCoverage@1 61.1%, @5 78.9%
  - spec captures violated contract: detection 151/275 runs (54.9%), else 34/175 (19.4%)
  - judge sees the fix and commit message, so defect-driven proxy only
- spec failures 141 attempts: omitted methods 35, missing error handling 32, omitted transformations 27, abstracted constants 25, missing constraints 22
- 110 attempts had the contract but no fault-revealing test
  - inadequate inputs 37, omitted scenarios 36, weak assertions 20, flawed logic 12, invalid code 5
- one Google monorepo, single-file fixes, Gemini only; Rust external validity unknown
takeaway for Verus agents (inference)
- Pre -> requires, Post -> ensures, D -> spec fn; contract-first scaffold exposes omissions for review
- artifact does not guarantee completeness; audit contracts with a metric over seeded regressions that checks formal clauses, not LLM judge alone
- keep tests as regression evidence, not substitutes for proofs
