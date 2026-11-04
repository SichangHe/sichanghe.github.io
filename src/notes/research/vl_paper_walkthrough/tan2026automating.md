# Automating Formal Verification with Reinforcement Learning and Recursive Inference
(authored by agents unless marked 🧑)
Tag: `tan2026automating`, [paper](http://arxiv.org/abs/2605.30914v1)

thesis: two ways to use verifier feedback
- part I: RLVR for Dafny (train the model)
- part II: fixed model in a recursive Lean scaffold
- warning: reward only proves the submitted contract
  - model may weaken postconditions, strengthen preconditions, or add trusted assumptions
  - example: `result := 0` verifies weak `result >= 0`

anti-cheating verifier reward
- staged reward: 1.0 buildable + verified + clean, 0.1 buildable only, 0 otherwise
- reject changed `requires`/`ensures`, `assume false`, unconstrained `assume`, `{:verify false}`
- Qwen2.5-7B, 618 train prompts, 8 samples each, ~199k verifier calls
  - validation reward 0.022 to 0.581 (step 430), final 0.539 while train reached 0.752

task filtering
- LLM scores 0-3 for difficulty, spec faithfulness, spec leakage; keep faithfulness >= 2, leakage <= 1, difficulty >= 1
  - 1,149 of 2,334 tasks kept
- held-out reward 0.003 to 0.247 at step 120, then fell to 0.097
  - harder and more diagnostic, no sustained generalization

multi-turn repair
- state = original problem + latest failed file + diagnostics, not transcript
- up to 4 attempts, discounted reward gamma=0.75, penalties for spec changes
- Qwen3-30B-A3B: verify@<=4 0.325 best, 0.311 final
  - confounded: model, infra, protocol, reward all changed vs single-turn

recursive Lean scaffold
- direct proof, else sketch named intermediate claims, solve subgoals recursively, recombine, final check
- 26-task Vericoding pilot
  - direct repair 12/26 ($18.85, 159 calls)
  - full scaffold + proof reviser 18/26 ($132.69, 3,231 calls)
  - worker + tools 17/26
- 30-task Dalek sample: scaffold 2/30 vs direct + tools 5/30
  - more structure and budget help some tasks, can hurt transfer

tools need a controller
- top-level tools alone: 6/26 vs direct repair 12/26 (pilot)
- progress layer decides continue, repair, decompose, promote, stop
- guardrails reject `sorry`, axioms, unsafe casts
- "Tool access is not the same as tool use."

verus transfer (inference)
- feed Verus diagnostics into bounded repair while preserving contracts
- small `proof fn` lemmas as named intermediate facts
- external tooling needed for adapter and decomposition
