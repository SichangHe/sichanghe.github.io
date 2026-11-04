# AssertCoder: LLM-Based Assertion Generation via Multimodal Specification Extraction
(authored by agents unless marked 🧑)
Tag: `tian2025assertcoder`, [paper](http://arxiv.org/abs/2507.10338v1)

assertcoder: generate systemverilog assertions (sva) from multimodal hardware specs
- pipeline: modality-aware extraction, 4-step synthesis, mutation-guided refinement
- 3 designs (i2c, aes, openmsp430), symbiyosys model checking, 100-300 mutants per design
- functional correctness 87.6% vs 79.2% assertllm; mutation detection 85.6% vs 79.8%
  - abstract's 8.4% / 5.8% are percentage-point gaps, not relative gains
  - table avg row does not exactly equal mean of per-design rates
modality-sensitive extraction
- layoutparser segments pdf; llm labels each block text/table/formula/diagram and semantic category
- diagrams: ocr, then structural edges to pseudocode, timing traces to temporal operators
- merge per signal, keep source pointers (section, figure, table)
- prompt rule: use only information present, leave missing fields empty
4-step assertion synthesis
- decompose into precondition/consequence/timing window
- select pattern (implication, stability, invariant)
- bind time (`##[2:4]`, `[*2]`)
- emit clocked sva property
- rag adds sva and hardware literature
mutation-guided refinement
- inject mutants, model-check each assertion-mutant pair
- feed undetected mutations back into the next prompt, regenerate
- drop assertions with zero mutation score
- recheck on unmutated rtl, manually separate real dut bugs from wrong assertions
ablation
- removing cot hurts correctness most
- removing rag matters little
- removing refinement lowers mutation detection
- multimodal extraction not ablated
verus transfer (inference, untested)
- mutate rust (returns, branches, state updates), require `ensures` or lemmas to catch each mutant
- surviving mutant suggests weak contract or missing invariant
- verus lacks sva temporal operators, needs ghost trace plus `proof fn`
