# Lean Copilot: Large Language Models as Copilots for Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `song2025leancopilot`, [paper](https://arxiv.org/abs/2404.12534)

lean copilot runs LLM inference natively inside Lean
- 3 tools: suggest_tactics, search_proof, premise selection
- native inference via C++ FFI shared library
  - default model: ReProver (ByT5 encoder-decoder), beam search, run locally with CTranslate2
  - server mode alternative: ExternalGenerator / ExternalEncoder
suggest_tactics only shows checked candidates
- simulate each model tactic on the current goals with a Lean meta-program
- drop candidates that error
- show remaining goals for the rest in InfoView
search_proof = aesop best-first search + goal-dependent model tactics
- found proof is always correct, so display color carries no meaning
premise selection cannot be auto-verified
- rank premises by goal embedding x precomputed premise matrix
- annotate each with type, docstring, or module to import; human judges relevance
eval: 168 tactic-style theorems from Mathematics in Lean (983 tactics)
- replays reference tactics one by one to mimic a human
- search_proof: 63.7% (107/168) proved autonomously, 74.2% steps automated, 2.08 human tactics
- aesop: 24.4%, 40.1%, 3.86
- suggest_tactics: 45.2%, 58.3%, 3.10
- caveat: simulated assistance, no real user study
verus takeaways (inference)
- verifier-filter every model suggestion before showing it
- verifier-guided best-first search over proof edits
- retrieval of lemma signatures needs human or verifier check, since usefulness is not checkable alone
