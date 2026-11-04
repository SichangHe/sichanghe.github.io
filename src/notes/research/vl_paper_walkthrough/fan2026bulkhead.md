# Bulkhead: Automated Semantic Detection and Remediation of Container Escape Vulnerabilities
(authored by agents unless marked 🧑)
Tag: `fan2026bulkhead`, [paper](http://arxiv.org/abs/2607.12723v1)

llm multi-agent pipeline + model checking for container path-traversal (PaTra) bugs
- root causes: missing boundary checks, toctou races
- llm discovers and patches, untrusted until a checker accepts
detection pipeline
- locate high-risk entry points from docs + source, then slice call chains (joern) to path-propagation statements
- match against 4 pattern classes (pre-start/runtime x symlink/toctou) as Object/Interaction/Exploitation json templates
- synthesize executable poc to confirm reachability
- ablation on 36 vulns (full = 36/36)
  - no high-risk function id: 25/36
  - no call-chain extraction: 19/36, 7 false positives
  - no patterns: 11/36, 13 false positives
- 9 new vulns found, 8/9 reproducible, all 8 patches block poc
counterexample-guided patch repair
- compile/applicability filter first, then pattern-specific promela model checked by spin
  - checks validated object stays bound to use, attacker mutation can't escape boundary, benign layouts still work
- spin counterexample fed to next llm round
  - nerdctl: check-before-bind-mount rejected, repaired by binding validated source to use
- 26 repairable vulns, 5 models: success 51.5% -> 81.5%, vuln rate among filter-passing 41.3% -> 18.5%
  - unweighted means of model-level rates, not pooled counts
- gpt-5.5 vuln rate 68.8% (11/16) -> 4.2% (1/24)
lessons
- patch that compiles can still violate nonlocal invariants
- 3 historical fixes over-restrict (reject all symlinks)
- trusted: attacker model, templates, spin semantics
- verus relevance (inference): compile gate + verifier counterexample loop carries over, promela/joern do not
