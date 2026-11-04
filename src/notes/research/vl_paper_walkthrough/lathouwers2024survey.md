# Survey of annotation generators for deductive verifiers
(authored by agents unless marked 🧑)
Tag: `lathouwers2024survey`, [paper](https://doi.org/10.1016/j.jss.2024.111972)

survey of spec inference tools for java deductive verification
- baseline: 3 OpenJML examples (counter, binary search, ArrayList) need 151 annotations (32, 16, 103)
- "Deductive verifiers require intensive user interaction in the form of writing precise specifications, thereby limiting their use in practice"
measured output vs 151-annotation baseline (Table 2)
- Daikon: 158 generated, 29 baseline (19%), 83 wrong (53%), 47 unnecessary
- EvoSpex: 25 generated, 8 baseline, 6 wrong, 11 unnecessary
- Strongarm: 60 generated, 23 baseline (15%), 0 wrong, 37 unnecessary
- GPT-4: 42 generated, 35 baseline (~24%), 6 wrong, 1 unnecessary
  - best on these examples, but invented a precondition, weak `remove` postcondition
  - renaming code changed output, it edited code, repeated "preserve code" gave `true` contracts
  - GPT-3.5 misplaced annotations
- Toradocu/Jdoctor: none on these examples
- table arithmetic is inconsistent (e.g. Daikon categories sum to 159)
dynamic techniques
- Daikon: instantiate invariants from a fixed grammar over observed executions
  - loop workaround: dummy call at loop head, matching pre/post become invariant
  - holds only for observed runs, e.g. wrongly inferred ArrayList size always 0
- DynaMate: EvoSuite tests + Daikon/Gin-Dyn candidates, ESC/Java proof attempts, new tests on failure
- other families: genetic postcondition synthesis, active learning, symbolic nonlinear inference, shape inference, Houdini filtering, strongest postcondition, doc-to-code translation, API usage mining
impact estimate
- taxonomy from 54 verified examples: behavioral specs 47-62% of annotations, proof assistance 9-22%, permissions 9-17%, functions 5-15%
- max-impact estimates (Table 3): Daikon 41-77%, EvoSpex 14-23%, Strongarm 16-31%, SLING/Houdini 37-64%, ChatGPT 0-100% (prompt can ask anything)
  - workload estimates, not universal bounds; 3 eval programs unrepresentative
gaps and ideal generator
- infer permissions, predicates, lemmas, proof assistance
- use docs, usage, similar programs, user answers as extra truth sources
- target intent not observed behavior; mostly correct, readable output
- support non-java verifiers
verus transfer (inference)
- llm can draft requires/ensures/invariant/decreases/proof blocks, but only Verus-checked output counts
  - request spec kinds explicitly, keep implementation unchanged
- dynamic traces only give candidates to prove
- rust types give some permissions for free, functional behavior still needs contracts
