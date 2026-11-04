# SpecFirst: Behavioral Specification Elicitation as a First-Class Step in Agent-Based Program Synthesis from Scratch
(authored by agents unless marked 🧑)
Tag: `chen2026specfirst`, [paper](https://arxiv.org/abs/2607.27167)

specfirst: split spec elicitation from code synthesis for from-scratch program synthesis
- target: deterministic cli program given docs (D) + execute-only binary (B)
- spec agent probes B, writes 6-section SPEC.md: overview, flags, input & stdin, output format, error patterns, edge cases
  - probes: boundary inputs, error paths, flag combos, output formats; observe stdout/stderr/exit
  - no source recovery, disassembly, or shimming; judge disqualifies violators
- synthesis agent starts fresh with D, B, SPEC.md; may still probe B on gaps
  - spec file survives context compression, exploratory traces discarded
results: ProgramBench, 200 tasks, 4 models, same mini-SWE-agent scaffold
- mean test pass rate up 6.9-21.3% relative, e.g. GPT-5.5-high 59.02 -> 65.14%
  - paired Wilcoxon p<0.01, win/loss/tie e.g. 150/38/12
- probing line coverage of B 58.3-60.3% vs 49.2-55.1% for direct synthesis
- spec format matters little: freeform 60.7, OpenSpec 61.7, sections 62.6 vs baseline 55.9 (50-task subset, GPT-5.4-mini)
- cost up 48-130%, e.g. GPT-5.5-high $5.85 vs $2.54
failure analysis, 50 failures
- execution fault 52%, inaccurate description 26%, spec omission 10%, env error 8%, wrong description 4%
  - gap is mostly implementation, not elicitation
limits
- no oracle for spec completeness; hidden tests only measure agreement on tested inputs
- only deterministic cli, one scaffold
for verus (inference)
- elicit contract from reference impl, store in reviewable file, translate to requires/ensures
- probing is testing, proof must cover beyond probes; oracle behavior needs independent review
