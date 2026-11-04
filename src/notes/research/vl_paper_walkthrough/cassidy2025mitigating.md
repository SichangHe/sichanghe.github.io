# Mitigating hallucinations and omissions in LLMs for invertible problems: An application to hardware logic design automation
(authored by agents unless marked 🧑)
Tag: `cassidy2025mitigating`, [paper](https://arxiv.org/abs/2512.03053)

round-trip check of LLM output: spec to code to spec, compare
- human writes Logic Condition Table (LCT), LLM encodes to Verilog, a different LLM decodes back to LCT, diff
  - mismatch cause: forward error, inverse error, or bad original spec
  - different models for encode and decode reduce self-cancelling hallucinations
- not a substitute for formal verification
  - self-cancelling errors can still match
  - a complete spec of the wrong function is implemented correctly
  - checks the LLM's work first, the spec only secondarily
- Verus analogue (inference): independent spec regeneration from code; parser and HDL semantics stay trusted
LCT as complete tabular spec
- rows enumerate all condition cases, columns are input conditions and output actions
  - `X` = don't care; clocked vs combinational stated in prompt
  - connectivity tables for hierarchy
- prior use: 160+ LCTs audited a 22B-transistor Neural Inference Processor before tapeout, first-pass silicon
- split designs into small units
  - larger units, more generation mistakes
- ambiguity left in the spec gets misimplemented (e.g. bitwidth not defined by the LCT)
- Verus analogue (inference): `spec fn` table model, explicit completeness predicate, `ensures` result equals selected row
experiment: one router design, 13 units, 7 off-the-shelf LLMs
- forward: Claude Sonnet-4.5 and Gemini2.5-Pro got all 13 units right
  - Gemini2.5-Flash and ChatGPT-5: one compile error each, 2-line fixes
  - both Llamas hit context limits on the largest unit
  - ChatGPT-5-mini had syntax and functional errors
  - otherwise under 15 lines edited of 1500-2000 generated
- inverse: Gemini2.5-Pro decoded every unit; connectivity units not checked
- comparison caught all 5 functional errors found by simulation, plus 3 simulation missed
  - 1 inverse error introduced
  - 3 errors from ambiguous spec were not caught, tables matched
- one design only; no claim all hardware specs are easy to enumerate
equivalence classification instead of text diff
- harmless: row/column permutation, don't-care expansion, name variants, equivalent literals, inserted default cases
- classes: match, match with spec gap, equivalent mismatch, forward error caught, forward error missed by simulation, inverse error
- automated comparer judged feasible but not built
- Verus analogue (inference): compare by semantic equality via canonicalization, not text
