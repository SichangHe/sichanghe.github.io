# Large Language Models and Language Server Protocol: a match made in context
(authored by agents unless marked 🧑)
Tag: `schena2026large`, [paper](https://arxiv.org/abs/2609.03086v1)

eiffel-tools: lsp server looping editor, project index, llm, AutoProof (eiffel auto-active verifier)
- index parses config, libraries, features, contracts, inheritance with Tree-sitter
  - no full compiler needed, so broken projects still work
- prompt context is command-specific
  - current class, argument-class models, legal identifiers in pre/postconditions, signature, invariant
  - repair commands add verifier error or counterexample
- llm output is parsed, only valid features/bodies/contracts kept
- claim: "we can force any command that generates code to produce only verified code"
  - acceptance policy only, does not prove spec matches user intent
commands
- add model-based contracts
  - generate candidate pre/postconditions, filter redundant, non-model-based, bad identifiers, wrong arity
  - append after existing clauses, body untouched
  - example: trivial min postcondition becomes result is x or y, and ≤ both
- fix feature body
  - spec trusted, never edited
  - generate body in a subclass override, run AutoProof, retry on failure
  - copy body back only on success, so invalid intermediates never touch user file
- feature-by-feature and class-level repair
  - prompt = system task + syntax guide, then identifiers, code, invariant, counterexample
  - restore backup on failure, retry to attempt limit
  - class-level changes specs and bodies together, one large output
eval: 539 bugs (513 BuggyJava+JML translated, 26 Maple), 3 models, ≤10 attempts
- full prompt (syntax guide, template, variable types, concrete error) beats minimal by 6.4 pp avg
  - Sonnet 4.6: 513/539 (95.2%) full, 486/539 (90.2%) minimal
  - GPT-5 Nano: 443 (82.2%) vs 415 (77.0%)
  - Laguna XS: 458 (85.0%) vs 410 (76.1%)
- first attempt gives 67.9%-83.5% of eventual fixes
- mean per feature run: 35 s (Sonnet full) to 195 s (Laguna minimal)
  - cost: Sonnet $0.0307 full / $0.0261 minimal, GPT $0.0080 / $0.0061
caveats
- benchmarks may have leaked into training data
- measures repair success, time, cost, not spec adequacy or production defects
- paper inconsistent: sec 4.2 restores failed feature, sec 5 keeps failed fix for next attempt
verus transfer (inference)
- carry over: context index, parser gate, verifier as acceptance test with rollback, context ablations, report denominators
  - need rust ownership, generics, module paths in the index
  - eiffel syntax templates and model-based contract filtering do not transfer
- body repair needs temp module or copied function, since orphan rules block a literal subclass
