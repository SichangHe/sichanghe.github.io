# Formally Verified Code Synthesis for Structured Data Translation in a Medical Internet of Things
(authored by agents unless marked 🧑)
Tag: `samplawski2026formallyverified`, [paper](http://arxiv.org/abs/2606.20776v1)

pipeline evolves llm-generated json translators (device schema → hl7 fhir), pvs prover is the fitness oracle
- fitness is binary: 1 iff the pvs transform theorem is proven, else 0
- proven theorem is deterministically translated to c for miot deployment
- guarantee: translated output always satisfies the target schema
schema-constrained theorem synthesis
- pvs defines `input_compliant?`, `output_compliant?`, `transform`; theorem: compliant input → compliant output and `ensures`
- skeleton returns an empty dict, llm fills `transform`
- prompt includes a pvs reference and an example transform since the model barely knows the dsl
- caveat: schema is syntactic, clinical semantic alignment not evaluated
- verus form (inference): `requires input_compliant`, `ensures output_compliant && relation`; schema predicate must not be weakenable by the candidate
multi-island evolution (shinkaevolve)
- each iteration: pick parent + k inspirations, llm edits/rewrites/mutates, pvs scores, store in sql db, async workers
- mutation is untrusted search, verifier is the gate
adaptive model choice via thompson sampling
- models: o4-mini, gpt-5, gpt-5-mini, gpt-5-nano
- gpt-5 selected 33.7% yet made 53.5% of successes; nano 14.7% selected, 4.2% of successes
- bandit uses success only, ignores cost
pulse-oximeter case study, 10 runs, 2 islands x 20 generations
- first success at generation 5.0 ± 4.3 (range 1-14), 10.4 ± 9.9 min
- 37.4 ± 22.4% of generated programs succeed
- total cost $0.87 ± 0.18, wall time 42.7 ± 8.1 min
trust boundary
- no proof that the generated c preserves the pvs function for all json values
- translator and compiler stay trusted
