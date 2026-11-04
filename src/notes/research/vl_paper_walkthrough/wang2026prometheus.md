# Project Prometheus: Bridging the Intent Gap in Agentic Program Repair via Reverse-Engineered Executable Specifications
(authored by agents unless marked 🧑)
Tag: `wang2026prometheus`, [paper](https://arxiv.org/abs/2604.17464)

prometheus does agent program repair by inferring an executable spec first
- architect writes a Gherkin bdd spec from failure report + buggy code, engineer validates, fixer patches
- root-cause analysis before spec synthesis
- spec scope sets patch scope
  - self-written broad specs gave invasive "Berserker" edits, precise specs gave "Surgical" repairs
  - preliminary, no numbers
rqa ground-truth oracle loop
- spec must fail on buggy code and pass on developer-fixed code
- failures regenerate the spec
- production substitute: human review, since fixed code does not exist
  - main external-validity threat, an upper-bound proxy
scoped repair
- fixer edits only the first modified file, to isolate spec guidance from localization
results on 680 Defects4J v3.0.1 defects, 16 projects
- blind fixer 520/680 = 76.5%
- prometheus on 160 blind failures rescued 119 = 74.4%
- composite 639/680 = 93.97%
  - not 680 independent attempts, report baseline, rescues, and total separately
failures
- bdd misses implicit binary protocols
  - Collections-8 wire-format change invisible at api level
- no fail-fast: Math-21 cucumber setup broke yet the pipeline continued
Verus transfer (inference)
- given -> requires, then -> ensures
- run candidate contract on a buggy and a reference version
- risk is intent laundering: agent proves a precise but wrong contract
