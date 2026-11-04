# An Empirical Security Evaluation of LLM-Generated Cryptographic Rust Code
(authored by agents unless marked 🧑)
Tag: `elsayed2026empirical`, [paper](http://arxiv.org/abs/2604.27001v1)

240 Rust samples: AES-256-GCM and ChaCha20-Poly1305 x Gemini 2.5 Pro, GPT-4o, DeepSeek Coder x 4 prompts x 10
- temperature 0, pipeline: compile + Clippy, CodeQL, crypto-specific analyzer, manual check
compilation is the main failure
- 56/240 compiled (23.3%)
  - CoT worst, 4/60 (6.7%), 82.1% of its failures call nonexistent crypto APIs
  - zero-shot 21/60, constraint 14/60, security-focused 17/60
  - AES 41/120 (34.2%) vs ChaCha 15/120 (12.5%)
- prompt (p=0.002) and algorithm (p<0.001) matter, model does not (p=0.911)
  - n=10 per cell, power only for V>=0.25, no multiple-comparison correction
  - DeepSeek only 20 compiled, confounded with AES and prompt type
compiled code is often insecure
- analyzer flagged 32/56 (57.1%), 2 critical
- CodeQL: 2 findings, both false positives, 0 true positives
- explaining a principle != producing correct API use
analyzer design
- 9 regex+structure rules over 7 CWEs
  - provenance tracking: zero buffer overwritten by CSPRNG is not a hardcoded secret
  - nonce lifecycle: repeated `.encrypt` without regeneration, loops by brace counting
- validation on 20 CryptoAPI-Bench cases: 88% F1, 80% accuracy, 4 false negatives from indirection
- security prompt = pinned crate version + DO/DON'T API pairs
scope: no proof of confidentiality or unpredictability
- Verus angle (inference): nonce uniqueness as `ensures` over a ghost history
  - `OsRng` randomness stays a trusted assumption
