# Toward Practical Deductive Verification: Insights from a Qualitative Survey in Industry and Academia
(authored by agents unless marked 🧑)
Tag: `brugger2025practical`, [paper](https://arxiv.org/abs/2510.20514)

interview study of what makes deductive verification usable in practice
- 30 practitioners from 17 institutions, 29 used for most counts
  - 21 academic, 9 industry
- self-report only, no proof time or defect rates, counts are not effectiveness
target verification where it pays
- 22/29 cite criticality as the decision criterion
- want well-defined, stable, realistically verifiable, not-too-large requirements
- encapsulate verified parts to limit interaction with unverified code
verify early and incrementally, but stable design matters
- 11 use ci for proofs
- tension: early verification finds bugs, evolving code invalidates proofs
modular proofs and context control
- 12/29 value modular reasoning, 8 reduce smt context for performance
- tactics: isolate, hide details, extract lemmas, abstract slow code, chain refinements
- splitting is very manual
specification is the bottleneck
- proof success does not mean the spec is good
- validate against intent, docs, concrete tests; check vacuity and overconstraint
automation with inspectable control
- 10 want more automation, 16 cite performance, tolerance 10-30 s
- 9 call tools black boxes, 10 value counterexamples
- recommendation: low entry, high ceiling, detailed logs
proof maintenance
- 12 discuss maintenance, 8 instability
- recommend proof repair that reuses the prior version's proof
- unverified boundaries need monitored assumptions
hybrid assurance
- 13 combine methods since full proof is intractable
- 15 find communication with non-experts hard
verus takeaways (inference)
- contracts around critical modules, verus in ci, review contract diffs
- check `ensures true` or overstrong `requires` is not accepted silently
- verus cannot tell whether a contract matches intent
