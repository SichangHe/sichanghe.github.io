# Synthetic Programming Elicitation for Text-to-Code in Very Low-Resource Programming and Formal Languages
(authored by agents unless marked 🧑)
Tag: `mora2024synthetic`, [paper](https://arxiv.org/abs/2406.03636)

speac: llm writes a familiar parent language P, compiled through a child subset C to a very-low-resource target T
- eudoxus prototype: P = python, C = object-oriented python subset, T = uclid5
- out-of-C code is repaired by compiler techniques, not reprompted blindly
- parsable uclid5: 84.8% claimed in intro vs 9.1% gpt-3.5 fine-tuning, 12.1% gpt-4-turbo icl
  - table 1 gives 28/33 eudoxus gpt-3.5 vs 2/33 fine-tuned (≈6.1%), so intro fractions are inconsistent; trust table
  - 30/33 unique tasks parse with eudoxus vs 6/33 for all baselines combined
  - 33/52 parsed outputs score ≥4/5 semantically, single manual evaluator
choose P and C by eliciting the llm as a subject
- run direct-target prompts and imaginary-api prompts in candidate host languages, hand-code recurring structures
- none of 660 direct uclid5 attempts parsed (10 samples × 33 benchmarks × 2 llms)
- python oo classes mapped directly to uclid5 module parts, so C = abstract-class subset with a `next` method
- only 2 models, 33 tasks, 1 target language; no evidence another labeler picks the same P and C
repair via holes `??`
- parse error-tolerantly, prune non-C nodes, replace with holes
- max-smt picks the largest statically consistent subtree; nodes outside it become holes
  - soft clauses weighted by ast depth to edit near leaves, which gives up minimal-edit guarantee
- solver model fills static holes (e.g. `var x: ??` becomes `integer`), llm fills only residual holes
- budget of 5 llm calls per benchmark
- repair is cheaper than llm calls: 0.9s vs 7.2s (gpt-3.5), 1.8s vs 35.1s (gpt-4)
passing the compiler is not semantic correctness
- traffic-light example parses but declares input `pedestrian` as a controlled variable
- measure parse rate and semantic score separately, with parsed programs as the semantic denominator
verus takeaway (inference)
- parent = plain rust, child = wrapper api or grammar that compiles to requires/ensures/proof blocks
- verus acceptance of fixed contracts is the trust boundary; contract adequacy still needs review
- a hole-filled contract must not silently weaken the spec
