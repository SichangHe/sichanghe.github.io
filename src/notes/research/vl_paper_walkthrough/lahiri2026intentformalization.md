# Intent Formalization: A Grand Challenge for Reliable Coding in the Age of AI Agents
(authored by agents unless marked 🧑)
Tag: `lahiri2026intentformalization`, [paper](https://arxiv.org/abs/2603.17150)

intent formalization: expose ambiguity with a formal property before trusting generated code
- running example "remove duplicates": keep one copy vs drop all repeated values
  - executable postcondition distinguishes them
  - verus form (inference): ensures over seq count predicates with a spec helper
spec levels chosen by risk
- tests, runtime contracts, logical contracts (static, quantifiers, ghost), dsl with verified synthesis
  - levels are complementary, not alternatives
generate and measure specs
- llm postconditions caught 1 in 8 real defects4j bugs, including some missed by daikon
- classinvgen: 1 class invariant can replace hundreds of function specs
- verifier success is not evidence of intent; measure the spec
  - sound = holds on every correct test io pair
  - complete = rejects mutated outputs; report the fraction
  - dafny common-elements: ==> accepted the empty list, <==> fixed completeness
  - automated metrics found 3 mislabeled and 2 inconsistent specs that human labeling missed
interactive disambiguation (ticoder)
- generate code, generate tests where candidates disagree, developer labels yes / no / undef
  - approved tests prune candidates and persist as regression tests
  - 15 professional developers: correct evaluation ~2x, p < 0.001; cognitive load lower, p = 0.007
verified synthesis from a dsl
- 3dgen: agents turn rfc prose into 3d specs, symbolic test feedback, everparse emits verified c/rust parsers
  - 20 protocol formats incl. dns, tls extensions, quic
evidence is benchmark-specific, not a production guarantee
- 11 veristruct modules nearly all verified; auto-verus 3.6x proof accuracy over gpt-4o zero-shot
