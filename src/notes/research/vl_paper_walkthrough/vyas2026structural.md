# Structural Certification for Reliable Physical Design with Language Models
(authored by agents unless marked 🧑)
Tag: `vyas2026structural`, [paper](https://www.semanticscholar.org/paper/066ba7994e9716a8f97b92f316551bd02bdd5420)

PHACT: model proposes, deterministic domain code certifies
- loop: parse goal, model proposes design and calls engine, engine evaluates equations
  - all constraints pass: certified
  - violation: report law, produced value, required value, correction; model retries
  - same physical reason fails across distinct attempts: impossible
  - outside engine competence: unknown
- certificates are about the engine's equations, not physical reality
structural contract against forged certificates
- "A checker that accepts a model-supplied value can be forged"
- bind goal-fixed quantities as read-only inputs
- expose only free design variables as writable
- derive the certified quantity inside the engine, never accept it from the model
  - no API argument to resubmit bound input or certified value
- example: verify chirp mass 50 M⊙ for 36 and 29 M⊙
  - answer-submitting validator: model quietly swaps masses to a pair with Mc = 50, engine certifies wrong system
  - structural engine derives Mc = 28.1 M⊙
- answer-submitting form is fine for design goals ("compute X"), forgeable for verification goals
three-valued decline
- impossible and unknown make certificates reliable by allowing abstention
- root-input correction: minimal input change crossing violated threshold
  - failed free variable: feed correction to next proposal
  - failed bound variable: refuse goal
  - structural feedback cut DNA mean iterations 2.50 (weak) to 1.70
evidence (5 domains, author-defined goals, closed-form engines, no external held-out set)
- Gemini 2.5 Flash certified 44/50 feasible (88%, CI 76-94%) vs bare model 26/50 (52%)
- 25 impossible goals: bare model 7 checker-passing hallucinations (28%), structural 0/25 for Gemini and Llama 3.3 70B
- zero forged certificates in 80 adversarial trials, observation not estimate
- Llama certified 33/50, often restated corrections without a new tool call (safe but less useful)
for Verus (inference)
- executable args carry only free variables, bound goal state in spec
  - `requires` fixes inputs, `ensures` Certified ==> spec equation holds
- `enum Verdict { Certified, Impossible, Unknown }`, correction generation outside proof obligation
- still needs arithmetic lemmas, precise numeric types, float or fixed-point handling
- proves the contract, not physics fidelity
