# ProofCompass: Enhancing Specialized Provers with LLM Guidance
(authored by agents unless marked 🧑)
Tag: `wischermann2025proofcompass`, [paper](https://arxiv.org/abs/2507.14335v1)

general LLM guides a specialized prover (DeepSeek-Prover-v1.5-RL, DSP) with no training
- Lean REPL checks every proof; fail on error, `sorry`, or 20 s timeout
- guidance channel 1: summarized natural-language proof placed as a comment in DSP's CoT prompt
- guidance channel 2: lemmas mined from DSP's failed attempts
  - extract unique `have` statements, syntax-check, LLM selects at most k justified by the informal proof
  - mining from DSP output beats LLM-written lemmas, which were syntactically unlike DSP's and harder for it to use
prove the main theorem assuming selected lemmas, then discharge lemmas
- lemmas get earlier lemmas as hypotheses; assemble and verify the final proof
- every DSP call, lemma or main, counts against one attempt budget
results on miniF2F-test (488 problems)
- DSP: 50.0% at 32 attempts, 54.9% at 3200
- ProofCompass: 52.5% at 32, 55.3% at 128
  - 25x fewer DSP attempts, not 25x less time or cost
  - time crossover at about 46 attempts
- ablation: lemmas only 53.3% at 128, informal proof only 52.9%; both channels help
- guide LLMs are Gemini 2.0 Flash (Thinking) variants
limits
- needs a prover that accepts CoT prefixes; small attempt budget
- Lean only; verus transfer is untested
takeaways for verus
- seed a prover with an LLM prose plan
- mine failed drafts for candidate `assert`s / `proof fn`s, filter, recheck each with Verus
- prove main goal conditionally on lemmas, then discharge lemmas in dependency order
