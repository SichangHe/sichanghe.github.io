# AutoSOUP: Safety-Oriented Unit Proof Generation for Component-level Memory-Safety Verification
(authored by agents unless marked 🧑)
Tag: `amusuo2026autosoup`, [paper](http://arxiv.org/abs/2605.10712v1)

task: auto-build CBMC unit proofs (C harness) for embedded OS components
- a unit proof fixes scope (functions checked as real code), loop bounds, environment model
- result: gpt-5.3-codex, Zephyr/RIOT/Contiki-NG/FreeRTOS
  - 93% structurally valid on 57 targets with re-injected CVEs
  - exposed 40/60 CVEs (baselines: Seeker 25, CodexUP 17)
  - 20 confirmed new externally triggerable vulns
- guarantee is bounded + conditional on scope, bounds, assumptions
passing is not evidence, so 5 acceptance criteria
- structural validity: verifies the real entry point, not a copy
- conclusiveness within budget
- coverage of in-scope lines
- result validity: no spurious violations, no hidden feasible ones
- maintainability: small proof
- CodexUP (plain Codex agent): 31.6% valid; often "created simpler copies to verify"
- verified-property count must be read with coverage
  - unreached code counts as verified; CodexUP lower coverage gave more "verified" properties
- Verus analogue (inference)
  - scope = verified bodies; out of scope = `external_body`/`assume_specification`; environment = entry `requires` + trusted `ensures`
  - contradictory `requires` = vacuous pass; temporary `assert(false)` detects unreachable points
  - no unrolling bounds in Verus; invariants replace them (paper names invariant generation as future work)
architecture: llm-as-function-call
- deterministic code owns workflow; agent gets one bounded task per call
- agent tools: container terminal, cscope navigator, validation tool
- every change gated: compiles, hits target entry, no drop in coverage or verified/covered property count
- 15,463 lines Python + 1,230 lines prompts
- weak spot: caller-implication check is an LLM judgment with no mechanical validator
safety-oriented not fidelity-oriented choices
- permissive start: unconstrained primitives, valid allocated pointers; constrain only when a counterexample demands
- vs expert FreeRTOS proofs: AutoSOUP checks more code (107 vs 33 lines) at lower loop bound (2 vs 41) on prvCheckOptions
resource-aware scope widening
- start with entry file, widen file by file within time/memory/depth budget
- S1 (parent file) vs S2 (+adjacent files)
  - valid 93% vs 89.5%; cost $3.0 vs $5.9; CVEs exposed 40 vs 39
  - covered 86% of in-scope lines at S1, 35% at S2
- limits: whole-file granularity, static call graph misses indirect calls
property-guided refinement
- coverage-gap taxonomy: loop bound, build config, external-call side effects
- accept only if proof stays valid, target block covered, coverage not reduced
- minimum bound from region size, stride, guards; LLM estimate, only checked not to break proof
- CBMC misses struct-field overflow inside one allocated object (2 CVEs at S1, 4 at S2)
counterexample → precondition → caller validation
- backpropagate violated condition to input/callee model; accept if it suppresses violation without lowering metrics
- check at real call sites, three outcomes
  - violated but property holds: weaken precondition
  - holds everywhere: record as assumption
  - violated and triggers bug: report as feasible error
- costliest stage: 141.5 min, $2.6; verified properties 412.8/580.0 → 531.6/539.0
- appendix says all preconditions are added to environment, so reported violation still verifies under a known-false assumption
fix-reversion benchmark
- first 20 NVD CVEs per project with sink + fix commit, revert fix
- exposed = error at recorded sink with violable precondition
- Rust analogue (inference): revert known bound/overflow fixes, check agent contracts make Verus reject buggy version
trusted/unmeasured
- unwinding incomplete, LLM-judged assumptions, single-threaded only
- false-positive rate not measured
- paper numbers inconsistent: intro "38.7%/28.5% more" vs Table 2 25.0/38.4 points; S2 column sums to 59; 100 vs 84 random targets
- product threat (inference): cheap bounded memory-safety evidence on existing C, ~$3 and ~2h per component; not functional correctness
