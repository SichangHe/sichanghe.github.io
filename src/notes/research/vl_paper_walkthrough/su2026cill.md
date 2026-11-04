# CIll: CTI-Guided Invariant Generation via LLMs for Model Checking
(authored by agents unless marked 🧑)
Tag: `su2026cill`, [paper](https://arxiv.org/abs/2602.23389)

loop: LLM proposes helper invariants, model checker returns counterexamples to induction (CTIs)
- input: RTL + original assertion; design and assertion stay unmodified, no `assume`
- helper needs 3 properties
  - correct: truly an invariant
  - effective: rules out the CTI of another non-inductive assertion
  - inductive: self-proving, or strengthened by more helpers
- example: target `d1 = d2` not inductive, helper `r1 + r2 = r3 + r4` fixes it
- acceptance order (reusable)
  - 1 bounded falsification (parallel BMC at several bounds, shortest cex back to LLM)
    - BMC may miss a false helper within budget; caught later by inductiveness failure
  - 2 effectiveness: stored CTI becomes UNSAT under helpers
  - 3 inductive proof
- Verus analogue (inference): agent adds ghost predicates/invariants/lemmas, target postcondition fixed
  - bounded tests filter false predicates but prove nothing; Verus proof is the gate
staged automation before the LLM
- IC3 per assertion first; learned invariants strengthen helpers, no LLM round
- K-induction on IC3 timeout
  - proves more, gives longer CTIs, filters unreachable 1-induction CTIs
- local proof: prove each assertion assuming the others
  - shares pruning, gives clearer CTIs than one big conjunction
  - Verus analogue (inference): call proven lemmas; assumptions must be discharged, no `assume`/`external_body`
narrow tools instead of full traces
- trace minimization: UNSAT-core lifting makes irrelevant literals don't-care
- 2 MCP tools: `search_signals` (regex), `signal_values` (JSON)
- Verus analogue (inference): serve failing location and selected values, not full logs
invariant migration
- map variable names from a proved instruction, let the loop repair
  - `addi` from `add`, `slt` from `sub`, branches from `blt`
  - most runs converge in 10-30 min
- Verus analogue (inference): re-prove every adapted lemma, check changed preconditions
results (rIC3 + ChatGPT-5.2, RISCV-Formal)
- baselines solve 146/222; 76 left for CIll
- solves all PicoRV32 and NERV leftovers except M-extension (uses ALTOPS substitutes)
- fails SERV: bit-serial, ~100-cycle cex, original M-ext IC3 timeouts
- most runtime is LLM reasoning, not engines
  - `picorv32/bge` succeeds at 21,831 s
- trusted: RTL-to-BTOR (Yosys/Slang), rIC3, ALTOPS semantics, original checks
