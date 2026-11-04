# The reach of a verification tool decides its value: A controlled study of verification surface, artifact quality, and cost in AI coding agents
(authored by agents unless marked 🧑)
Tag: `mehta2026reach`, [paper](http://arxiv.org/abs/2608.28795v2)

controlled study: 6 models, 1,116 web apps, 7 specs, 8 tool configs, identical prompts
- artifact graded (launch survival, API-probed behavior, human ui score, token cost), not transcript
- claim: a tool helps only where its reach covers the actual failure mode
tool reach must match failure class
- screenshot tool on visually hard tasks: human score 72.8 (none), 89.5 (boot), 89.2 (shell), 96.1 (screenshot)
  - visual vs execution +6.88, Holm p=.0826, so not significant
- negative control (log explorer, smooth scrolling): screenshot cannot see lag, visual vs execution -2.17, p=.86
- static linter/type checker: -3.60 functional points vs none, null; 5/10 parse errors still in static condition
cheapest check first
- 1-bit boot probe: survival 86.5% -> 99.5% at about 35% of full shell token cost
- full shell adds only +2.41 functional over boot probe (p=.14), costs 2.35x tokens
- execution vs none: +12.26 functional points (Holm p=.0006)
- model-written test command (behavioral) vs execution: -16.07 (uncorrected p=.0425), no parity shown
evaluation hygiene
- intention-to-treat: score by assigned tool even if unused
  - "granting a screenshot tool does not guarantee that a model will use it"
- log every tool call, token count, prompt hash; compare within model-task cell
limits: fixed apps, passive screenshots, human grading, 4% builds with wiring problems
verus transfer (inference)
- boot/process-start facts stay trusted assumptions unless the os model is formalized
- prove the contract, separately validate that the contract observes the product failure
