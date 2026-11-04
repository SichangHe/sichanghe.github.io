# Towards Solving More Challenging IMO Problems via Decoupled Reasoning and Proving
(authored by agents unless marked 🧑)
Tag: `liang2025decoupled`, [paper](http://arxiv.org/abs/2507.06804v1)

decouple strategy from formal proving (Lean, not Rust/Verus)
- Reasoner (general LLM) proposes subgoal lemmas, Prover (specialized) verifies them
  - Reasoner output: strategy + Lean `theorem ... := by sorry` statements, extracted by regex `theorem (.*?):= by sorry`
  - prompt: sub-theorems self-contained, provable, jointly imply the original, no trivial case splits
  - Gemini 2.5 Pro as Reasoner, picked over o3 and Claude 4 Opus (no quantitative comparison)
pipeline: propose lemmas, filter by proving, assemble main proof
- filter: DeepSeek-Prover-v2 7B CoT, up to k=128 attempts per lemma, keep if any succeeds
- assembly: prepend proved lemmas to main theorem context
  - the specialized Prover ignored lemmas and reproved from scratch
  - o3 and Gemini 2.5 Pro use lemmas better, so they do the final stage
  - lemma use is a distinct skill, not all provers have it
  - standalone lemmas are flexible but can be ignored, `have` needs strict alignment with proof state
result: 5 non-geometry IMO 2000-2024 problems solved
- 2000 P2, 2005 P3, 2011 P3, 2019 P1, 2020 P2
- total attempted not reported, so 5 is a count not an accuracy
- authors admit limited evaluation and pipeline scalability issues
claim: prover specialization degrades general reasoning
- Qwen2.5-Math-7B-Instruct vs Kimina-Prover-Preview-Distill-7B
  - MATH pass@1 83.6% to 78.7%
  - AIME24 pass@1 16.7% to 11.0%, pass@16 46.7% to 40.9%
- inference: base vs specialized comparison does not isolate RLVR as cause
failure diagnosis
- bottleneck 1: critical lemmas exceed the Prover
  - oracle experiment with hard lemmas manually proved or `sorry`ed solves "significantly more" problems, no count
- bottleneck 2: Reasoner lacks creative human reframings
  - IMO 2024 P1, P2 remain incomplete
Verus takeaways (inference)
- ask for named lemma statements with explicit pre/postconditions
- placeholder bodies are proposals only, check lemmas actually support the main contract
