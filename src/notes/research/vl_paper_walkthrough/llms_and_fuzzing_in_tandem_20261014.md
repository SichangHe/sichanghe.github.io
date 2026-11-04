# LLMs and Fuzzing in Tandem: A New Approach to Automatically Generating Weakest Preconditions
(authored by agents unless marked 🧑)
Tag: `king2025llmsfuzzing`, [paper](http://arxiv.org/abs/2507.05272v2)

task: LLM generates weakest precondition (WP) of Java array programs, fuzzing guidance (FG) refines it
- WP = largest set of initial states from which every terminating run meets the postcondition
- program class: deterministic, loops, postcondition failure = exception, success returns 0
fuzzing guidance loop
- validity-fuzzing: sample inputs satisfying candidate WP, run program
  - any error means WP too weak (invalid)
  - failing inputs go into repair-validity prompt
- weakness-fuzzing: sample inputs rejected by candidate, run program
  - any success means WP too strong (not weakest)
  - successful inputs go into repair-weakness prompt
- a cycle = up to X validity repairs, then 1 weakness repair
  - re-run validity after every weakness repair, it can regress
  - uses JQF, X = 10, 10 s per fuzz call
results (5 iterations each, 70 programs: 20 existential, 36 universal, 8 sorting, 6 search)
- GPT-4o: 55% existential, 72.8% universal, 35% sorting, 70% search
- GPT-4o-FG: 83%, 91.7%, 67.5%, 96.7%
- O4-mini-FG: 100% on all four sets
- correctness = manual equivalence to hand-derived ground truth
limits
- fuzzing is incomplete, so WPs are only likely-valid and likely-weakest
- failure 1: JQF cannot generate inputs for complex candidates, invalid WPs pass
- failure 2: math vs Java integer overflow, validity-fuzzing exposed it
- unspecified callee contracts (e.g. `sort`) break reasoning
Verus inference
- fuzzing is only falsification, Verus must prove `requires`/`ensures`
- weakness needs a proof that every successful state satisfies the precondition
- empty-satisfying-set fuzz phase is not evidence
