# AssertGen: Enhancement of LLM-aided Assertion Generation through Cross-Layer Signal Bridging
(authored by agents unless marked 🧑)
Tag: `lyu2025assertgen`, [paper](http://arxiv.org/abs/2509.23674v1)

assertgen: llm writes systemverilog assertions from spec + rtl by bridging spec and rtl layers
- pipeline: cot verification objectives, cross-layer signal chain, objective-to-code map, constrained sva generation
incremental entity rag over the spec
- query "What is the description of {signal}?", extract target and external entities
- iterate until E_final = empty
objective-to-code traceability
- recursive cot traces a signal through module hierarchy (SC = s0..sn, each step semantically derived)
- map each objective to fsm/assign/register code; keep per-objective trace
constrained output
- bind signals as `module.signal`, fixed `assert property @(posedge ...)` format
results (5 designs, JasperGold, no post-processing)
- FPR 84.85% I2C, 76.92% ECG, 75.96% Pairing, 82.61% SHA3, 81.44% PicoRV32
  - timeouts over 5h counted as pass, which can inflate FPR
  - below AssertLLM on Pairing (75.96 vs 76.67)
- proof-core coverage 98.35, 23.55, 5.32, 60.79, 32.21%
- mutation detection 8-31%; Pairing excluded (over 120h)
  - objective-generation accuracy not isolated
verus transfer (inference)
- expand context over api contracts/requirements; map each contract clause to bodies and lemmas for coverage audit
- rerun verus on every candidate; generated text is no evidence until verifier accepts
