# ATLAS: AI-Assisted Threat-to-Assertion Learning for System-on-Chip Security Verification
(authored by agents unless marked 🧑)
Tag: `tashdid2026atlas`, [paper](http://arxiv.org/abs/2603.01170v2)

llm pipeline from CWE vulnerability knowledge to SystemVerilog assertions and JasperGold scripts for SoC RTL
- evaluated on OpenTitan designs from HACK@DAC 2018, 2019, 2021
- detects 39 of 48 CWEs, correct property for 33 of those 39 (84.6%)
  - paper says "more than 82%"
- hardware RTL only, no Rust or Verus
standardized threat template
- fields: adversary, assets, attack surface, vulnerability, threat
- separates vulnerability (weakness) from threat (exploit), which many threat models confuse
- assets matched by keyword patterns like `keys_*`, `boot_*`, `debug_*`
threat-model database (TMDB)
- few human-written examples seed GPT-5 to expand CWE/CVE/CAPEC entries, humans review each
- retrieve records by keywords of assets found in the RTL
- ablation: llm-only detects 6/20, 3/11, 4/17 CWEs, with TMDB 17/20, 11/11, 11/17
- precision of suggested CWEs not reported
three-context property generation
- inputs: design documents, RTL AST (Yosys or PyVerilog/Slang), llm security summary
  - RTL plus threat model alone gives out-of-scope, under-constrained or misleading assertions
- intersect asset summary, document attack surface, and AST paths
- add non-vacuity covers so antecedents are exercised
bounded verification loop
- run JasperGold, get proof, counterexample or inconclusive
- ≤ 3 iterations per bug, unresolved cases go to manual review
- failing property proves an exploit only if the harness exercises that path
main failure: missing explicit functional contracts
- docs omitting latch/mask or reset behavior caused missed detections
- proof holds only under supplied assumptions, not that the property is the intended requirement
Verus takeaways (inference)
- documents → contract, AST → control flow, summary → sensitive state, then generate `requires`/`ensures`/`invariant`
- keep the proof-or-counterexample refinement loop with a cap
