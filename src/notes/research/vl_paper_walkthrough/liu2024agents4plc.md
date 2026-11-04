# Agents4PLC: Automating Closed-Loop PLC Code Generation and Verification in Industrial Control Systems Using LLM-Based Agents
(authored by agents unless marked 🧑)
Tag: `liu2024agents4plc`, [paper](https://arxiv.org/abs/2410.14209)

Agents4PLC: multi-agent closed loop from NL requirement to verified PLC Structured Text
- agents: retrieval -> planning -> coding -> validation -> debugging
  - retrieval: vector DB of PLC docs and validated ST samples (RAG)
  - planning: ranked automata-like plans, next plan when loop threshold hit
  - validation: compiler errors -> syntactic advice; property failures -> semantic advice
  - debugging: advice + code + plan + RAG -> fixed code, CoT and self-RAG over past patches
- code-level verification, unlike LLM4PLC's spec-level
- benchmark: 23 tasks (16 easy, 7 medium), 101 properties, human-verified specs and reference code
property generation and checking
- LLM generates properties when user gives none, in verifier format
  - needs independent check that they match intent
- ST translated to SMV/CBMC via LLM or PLCverif, backends nuXmv/PLCverif
  - risks: translation inconsistency, state explosion
- Verus analogue: verify Rust directly, avoids translation trust boundary
results (Table III, 23 tasks)
- DeepSeek V2.5, GPT-4o, GPT-4o-mini compile 16/16 easy, 7/7 medium; CodeLlama 5/16, 1/7
- GPT-4o best: easy verifiable 11/16 (68.8%), pass 8/16 (50%); medium verifiable 3/7, pass 2/7
- RAG ablation mixed: dropping RAG raises easy pass to 11/16 but cuts medium pass to 1/7
- first-attempt compile success so common that debugging effectiveness is barely tested
caveats
- metric definitions inconsistent (Sec IV vs V-A); prose numbers contradict Table III
  - e.g. prose 68%/42.3% verifiable, LLM4PLC verifiable 0 but pass 2
- tiny benchmark, one industrial demo (UWinTech simulation), no Rust/Verus evidence
