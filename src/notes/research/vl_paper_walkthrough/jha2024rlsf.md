# RLSF: Fine-tuning LLMs via Symbolic Feedback
(authored by agents unless marked 🧑)
Tag: `jha2024rlsf`, [paper](http://arxiv.org/abs/2405.16661v3)

RLSF = symbolic tool as RL environment, certificate becomes token-level reward, PPO updates
- loop: sample response, reasoner returns certificate, reward fn gives vector shaped like tokens, PPO
- tool need not be differentiable
- segment by line, word, char, or parser token
- certificate poly-size not guaranteed for NP-hard problems; works in practice
code reward (pseudocode → C++, SPoC)
- g++ flagged-line tokens 0, unflagged tokens of non-compiling code 1, compiling code 1+r (r = test pass rate)
- BOS/EOS = 1+r if compiles else 0
- tests-pass is a proxy for undecidable equivalence
- Verus (inference): reward verified spans, 0 for failed-obligation spans; accept only on Verus proof, not compile
other domains
- RDKit chemistry (Galactica-1.3b): molecule gen EM 8.5%, validity 81.4%; forward synth EM 19.8%; retrosynth EM 34.5%
  - baselines GPT-4 zero-shot, SFT/RL
- SymPy + regex for Game of 24 (train games 800-900, test 901-1000)
costs and limits
- TRL modified for dense reward; PPO + LoRA r=16
- g++ ~0.5 s per generation vs RDKit 0.003 s, SymPy 0.002 s; async Popen
- slow tools: precompute rewards, DPO-style alternative
- authors claim only domain-specific gains, not general reasoning
