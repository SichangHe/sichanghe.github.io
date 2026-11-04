# Can LLMs Write Correct TLA+ Specifications? Evaluating Natural-Language-to-TLA+ Generation
(authored by agents unless marked 🧑)
Tag: `bisharat2026can`, [paper](https://arxiv.org/abs/2606.05792)

nl comments to TLA+ spec generation, 25 open-weight + 5 proprietary models
- benchmark: 205 specs from 98 projects, 26 usable test items
- 2,600 open-weight runs, 4 strategies x 650, one run per model-spec pair
- grading: SANY parse, then TLC on finite instance
  - tlc bounded to finite states, larger-parameter errors undetected
results are low, rates are strategy averages over models
- few-shot has best sany, 173/650 (26.6%)
- progressive prompting is the only open-weight strategy with tlc passes, 56/650 (8.6%)
  - 3 few-shot examples + messages on module, variables, operators, temporal properties
  - paper does not evaluate global consistency check it recommends
- half-completion and fill-in-middle get 0 tlc passes, sany 12.2% and 14.2%
  - these expose reference code, yet still fail
- gpt-5 few-shot: sany 26/26, tlc 7/26 (26.9%)
model size does not predict success
- deepseek r1:8b gets 14/26 progressive tlc, r1:70b gets 0
- code-specialized models do worse than general ones
- paper's size claims partly contradict its own tables
hallucination taxonomy
- unicode operators, cross-language syntax, `<think>` leakage, length miscalibration, missing `====` terminator or duplicate `MODULE`
- proposed fixes unevaluated: grammar-constrained decoding, normalization, retrieval
take for verus
- report parse, verify, infra failures separately with denominators
- parse + finite model check does not show the spec matches the requirement
  - verus proof checks the written spec only
- staged generation (structure, state, contracts, lemmas) is an unvalidated adaptation
