# Cobblestone: A Divide-and-Conquer Approach for Automating Formal Verification
(authored by agents unless marked 🧑)
Tag: `kasibatla2026cobblestone`, [paper](https://doi.org/10.1145/3744916.3773178)

Cobblestone: llm Coq proofs, sound because Coq checks everything
- CoqHammer + GPT-4 (gpt-4-0613, temp 1.0), depth ≤5, ≤5 invocations × 4 samples
- automatic: 48% CoqGym100, 38% Wigderson100, avg $1.25 and 14.7 min
- baselines: CoqHammer 30%/27%, chain-of-thought 25%/19%
hammer first, globally and on every unfinished subgoal
- recursive calls replace `admit` with `hammer`
whole-proof prompting
- prompt: current theorem, proof context, definitions, other proven theorems, optional reasoning
- 4 variants: with/without context × with/without chain-of-thought
fail-safe fault localization
- run prefix, on error replace failing tactic and rest with `admit`
- else recurse into each bullet subproof
- keeps correct prefixes and marks deepest failing subproofs
- limit: little progress when proof does not decompose the goal (43% of proofs have subproofs)
recursive divide and conquer
- one recursive call per deepest unfinished subgoal, splice successes into the parent
- most proofs found in one invocation (44/48 CoqGym, 31/38 Wigderson), recursion adds 4 and 7
oracles
- perfect premises and perfect decomposition together: 58% CoqGym100, 55% Wigderson100
- upper-bound style evidence, since information comes from human proofs
- 42 CoqGym and 45 Wigderson theorems still unsolved
Verus inferences (not tested in paper)
- try smt automation before llm, recurse on failed assertions/lemma calls
- needs a new parser to localize by source span
- accept only a full `verus` pass, remove any `assume`
