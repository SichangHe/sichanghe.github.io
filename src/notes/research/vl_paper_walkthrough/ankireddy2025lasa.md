# LASA: Enhancing SoC Security Verification with LLM-Aided Property Generation
(authored by agents unless marked 🧑)
Tag: `ankireddy2025lasa`, [paper](http://arxiv.org/abs/2506.17865v1)

llm generates security properties and SVAs for SoC ip, fpv tool feedback refines prompts
- GPT-4o chosen over Gemini-1.5 and Llama-3.1
- Cadence JasperGold 2020.12 on CEP and OpenTitan ip
pipeline
- hierarchical context: summarize rtl/spec per module, rag over docs, json `<SPEC_FILE>`
  - input-token limit motivates decomposition
  - no rag ablation reported
- generate properties, screen for vacuity with 9 rules via llm prompt
  - paper's wording of the vacuity rule is inconsistent between §IV-C and Prompt 3
  - no classification error rate reported
- translate to SVAs, re-prompt on syntax errors using jasper output
  - some manual re-prompting needed
- coverage loop: threshold 80%, extra prompts for resets, boundaries, multi-cycle paths
  - 88% average coverage claimed, table gives no per-column average
  - submodule metrics fall below 80% (e.g. 71.78%)
results
- AES-192: 73 properties, 43 correct, 41 non-vacuous, 40/41 assertions correct
- DES3: 37, 31, 29, 27/29; GPS: 108, 98, 93, 90/93
- "correct" is the authors' judgment, no independent requirement check
bug finding on Hack@DAC'24 OpenTitan
- prompt adds microarchitectural events, threat model, assets
- 5 bugs found (e.g. hmac key leak via `reg_rdata_next`), no recall/precision, no repairs re-verified
- failed assertion may mean bad spec or real bug, needs inspection
limits
- llm struggles with complex tasks, incomplete or erroneous assertions
- high structural coverage does not prove requirement completeness
verus transfer (inference, untested)
- feed verifier diagnostics back for contract repair
- failed proof = code bug, weak proof, or wrong spec
