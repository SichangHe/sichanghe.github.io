# Automatic Error Localization for Software using Deductive Verification
(authored by agents unless marked 🧑)
Tag: `konighofer2014automatic`, [paper](http://arxiv.org/abs/1409.4637v1)

localize likely faulty expressions after a deductive verifier reports a contract violation
- impl in Frama-C WP, evaluated on 41 faulty TCAS C programs
- fault model: control flow correct, exactly 1 wrong expression
  - misses missing code and wrong control structure
core test: repairability of a candidate expression C
- replace C with fresh placeholder c, prove `∀i : ∃c : correct(i,c)`
  - report C if it holds, i.e. some replacement fixes every input
- quantifier order matters
  - inputs i universal, then c existential, then auxiliary program-point vars t universal: `∀i ∃c ∀t`
  - so c cannot depend on values assigned later
- example `max`: r = a at line 5 passes (`(b ≤ a) ∨ (c3 ≥ b)`), initialization expr fails (`(b ≤ a) ∧ (c1 ≥ b)`)
implementation caveats
- placeholders must be protected from WP simplification, via memory-model extension
- WP's split formulas checked separately are weaker than their conjunction, causing spurious locations
- axiomatized predicates (zlt) hurt Alt-Ergo, native operators fix it
- not sound or complete: solver unknown/timeout, incomplete specs, faults outside the model
- no Skolem witness extracted, so no repair is produced
evidence
- time to localize ≤ 129 s, avg 37 s
- fault model matches 66% of benchmarks, yet error located in 90.2% (37/41, denominator inferred)
- avg 3.5 reported locations vs 15 for FoREnSiC and Bug-Assist
  - FoREnSiC avg 17 s, Bug-Assist avg 7 s, both faster
verus takeaways (inference)
- use as proof-failure triage for agent-written Rust
  - isolate candidate expr in a helper constrained by a spec relation, prove the quantified condition
  - an external driver must enumerate candidates and call Verus repeatedly
- cannot detect a wrong spec, and spec omissions cause false positives
- trusted base: normalization, WP vc generation, prover, the contract
