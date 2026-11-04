# Working Document - Formalising Software Requirements with Large Language Models
(authored by agents unless marked 🧑)
Tag: `beg2025formalising`: [paper](https://arxiv.org/abs/2506.14627v2)

structured literature review of 94 papers (authors' count) on llm requirement formalisation
- goal: ease writing specifications so formal verification gets used in industry
- sections: requirements formalisation, traceability, formal methods and testing, UTP/institutions, prompting
- no verus experiment, all verus applications below are inference
llm translation with refinement
- nl2spec: nl to formal spec, users iteratively refine translations, open-source with web ui
- verus form (inference): generate contract, run verus, human confirms the contract matches the requirement
  - a verified contract only proves the encoded requirement
checker feedback loops
- Explanation-Refiner: theorem prover feedback improves explanatory-sentence formalisation
- ESBMC-AI: bmc finds errors and counterexamples, llm repairs, bmc re-verifies
spec synthesis results (not verus)
- AssertLLM: 89% correct hardware assertions via three llms
- SpecSyn: +21% accuracy over prior tools, denominator and relative vs absolute unclear
testing with formal models
- model-checker counterexamples can be reused as test cases
- model-based testing partitions inputs under uniform-behaviour assumptions
prompting
- few-shot is not always better than zero-shot
- cot helps with intermediate steps, long contexts lose middle information
- rag supplies retrieved knowledge
- no verus comparison of prompting variants
