# FormalJudge: A Neuro-Symbolic Paradigm for Agentic Oversight
(authored by agents unless marked 🧑)
Tag: `zhou2026formaljudge`, [paper](https://arxiv.org/abs/2602.11136)

## what the paper does

FormalJudge evaluates agent trajectories by translating high-level intent into atomic facts, compiling logical composition into Dafny, and checking it with Z3. The paper’s architecture confines LLM uncertainty to extraction and uses a deterministic proof step for composition: “This architecture confines probabilistic reasoning to atomic extraction while delegating all logical inference to the deterministic solver.” (Section 3.1, PDF p. 4) It evaluates VitaBench, Agent-SafetyBench, and Deceivers across seven agent models and reports an average 16.6 percentage-point improvement over LLM-as-a-Judge baselines (Introduction, PDF p. 2).

## technique 1: top-down atomic decomposition

Use this when a natural-language requirement contains several interacting constraints. Do the following:

1. Take user intent and the full trajectory
2. Decompose the intent into facts `F={f1,...,fn}`
3. Make each fact binary, directly grounded in observable evidence, and context-minimal
4. Ask an LLM only the resulting yes/no atomic questions

The paper defines each fact as `fi:(I,τ)→{0,1}` and requires facts to be “binary (answerable as yes/no), grounded (directly observable from trajectory evidence), and context-minimal (requiring only a relevant subset of τ).” (Section 3.2.1, PDF p. 4)

## technique 2: context-aware grounded extraction

First parse structured trajectory fields deterministically—JSON, numbers, labels—with `Edet`; then use the LLM only for facts that need semantic interpretation, with a context projection `Ck(I,τ)`. The paper’s equations are `Edet(fi,I,τ)=PARSE(fi,{ot})` and `Eθ(fi,I,τ)=LLMθ(fi,Ck(i)(I,τ))` (Section 3.2.2, PDF p. 4). This separation limits irrelevant context and makes extracted evidence auditable.

Inference: in a verified-Rust agent, deterministic extraction can produce ghost inputs or spec values, while an LLM proposes only semantic classifications; Verus can prove properties of the supplied values but cannot establish that a natural-language extraction is faithful.

## technique 3: layered dafny proof synthesis

Generate Dafny code with three layers: atomic constants for extracted facts, derived predicates combining facts, and safety predicates expressing requirements. For the paper’s trip example, budget is `ftotal ≤ flimit`; date safety is `¬fcontainsAllergen`-style logical composition; the final verdict is the conjunction of all predicates. Compile this code and let Z3 decide the resulting proof obligations. The paper says: “Formal verification feedback enables near-linear safety improvement through iterative refinement.” (Introduction, PDF p. 2)

Inference: Verus can play the proof role with `requires`, `ensures`, quantified predicates, and `assert`/lemma proofs, but Dafny syntax and its runtime model do not transfer. The LLM-to-spec compiler and trajectory parser remain trusted assumptions.

## technique 4: formal feedback refinement

Run an agent, evaluate its trajectory, and return the Dafny specification, concrete violated constraints, and explanations. Let the agent regenerate its response; repeat for three rounds. The paper compares natural-language, Python, and Dafny feedback. On Agent-SafetyBench, Claude-4.5-Opus reaches 99.8% after three rounds versus 70.7% initially; Qwen-7B improves from 30.8% to 49.4%, and Qwen-14B from 34.3% to 74.2% (Section 4.5, PDF p. 7; each percentage is accuracy over that model’s benchmark samples, with no sample denominator stated in the text). Baseline prompting reaches only 83.5% (few-shot) and 85.5% (CoT) for Claude at round three.

## evidence, trusted boundary, and limits

On Deceivers, each judge-agent configuration is evaluated on 200 deceptive and 200 non-deceptive trajectories (Section 4.4, PDF p. 7). Figure 5 reports FormalJudge at 91–96% across agent sizes, while LLM judges fall from 78–85% on 7B agents to 62–71% on 72B agents (Figure 5 caption, PDF p. 7). The paper attributes residual errors to LLM decomposition and semantic extraction, stating that formal verification “cannot resolve” the natural-language translation problem (Section 5, PDF p. 7).

Trusted components are the extracted facts, benchmark ground truth, Dafny compiler, Z3, trajectory parser, and the mapping from user intent to predicates.

## techniques for the catalog

- atomic intent decomposition — split composite requirements into binary, grounded, minimal-context facts
- deterministic plus semantic extraction — parse structured evidence first and call an LLM only for residual semantic facts
- layered Dafny/Z3 composition — compile facts, derived predicates, and safety predicates, then prove their composition
- proof-guided refinement — feed formal violations back to the agent for repeated correction
