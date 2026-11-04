# Natural Synthesis: Outperforming Reactive Synthesis Tools with Large Reasoning Models
(authored by agents unless marked 🧑)
Tag: `schmitt2026natural`, [paper](http://arxiv.org/abs/2605.15131v1)

guess-and-check loop: large reasoning model (LRM) writes Verilog from a TLSF/LTL spec, sound model checker verifies, counterexample (CEX) feeds repair
- pipeline: Verilog -> AIGER (Yosys) -> nuXmv input (`aigtosmv`) -> nuXmv IC3, 32 GB, 600 s
- unrealizable specs: LRM emits an environment strategy showing unrealizability
- strip benchmark comments/names so the model gets no realizability hint
- decompose spec into sub-specs for cheaper checks and finer feedback
- eval on all 1,586 SYNTCOMP 2025 LTL specs, 2 CEX iterations
  - GPT-5.5 1,467, Gemini 3.1 Pro 1,355, vs ltlsynt 1,297, SemML 1,295
  - CEX feedback helps: Gemini 1,193 -> 1,355, GPT-5.5 1,392 -> 1,467
  - no reasoning tokens: GPT-5.5 drops to 123; more budget helps, log-linear, diminishing
- Verus analogue (inference): feed failing obligation + state assumptions, not just the error, back to the model
parameterized synthesis by bounded instantiation
- LRM emits a parameterized Verilog module; check each instance up to the largest competition value
  - parameterized verification is undecidable, so passing is bounded evidence, not proof
  - any failing instance gives a sound CEX for repair
- 57 parameterized specs: Gemini 35.0 -> 38.3 with CEX, GPT-5.5 35.7 either way
inspectable autoformalization
- compare NL -> TLSF -> Verilog against direct NL -> Verilog, on 57 hand-written NL descriptions
  - check each module against both autoformalized and ground-truth TLSF
  - autoformalized TLSF syntactically invalid after 3 tries: 12.7/57
  - Spot equivalence: 9.3 equivalent, 8.7 inequivalent, 26.3 timeout
  - direct route satisfies ground truth 31.7/57, autoformalized route 30.0/57
- Verus analogue (inference): proving code against a contract does not check the contract matches NL intent
  - so review the contract separately, dual-check against an independent spec
trust boundary
- checker proves only the supplied TLSF, not NL translation correctness
- trusted: LRM prompts, Yosys/AIGER translation, nuXmv, hand-written ground truth
- inequivalence to ground truth may be spec ambiguity rather than a wrong formalization
