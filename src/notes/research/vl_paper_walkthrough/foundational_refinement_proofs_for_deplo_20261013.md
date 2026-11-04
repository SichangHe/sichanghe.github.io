# Foundational Refinement Proofs for Deployed Bytecode, at the Price of Tokens
(authored by agents unless marked 🧑)
Tag: `lazaropoulos2026foundational`, [paper](https://arxiv.org/abs/2607.26306v1)

question: can llm agents build kernel-checked refinement proofs for deployed evm bytecode
- eqivm: lean framework with executable evm semantics, sol− spec language, refinement relation
  - bytecode from any compiler or handwritten asm, proof relates deployed bytes to readable spec
  - guarantee per message call: agree on account state and return bytes, or both reject unmatched entry, or out of gas
  - external calls use evm call semantics, so unknown callee code is covered
- llm is proof producer, not trusted: "Because proofs are validated by the kernel, the LLM agent, tactics, macros, and the proof combinators are not trusted for soundness"
technique 1: executable low-level semantics plus spec language
- sol− shares the flat evm storage map, so no state conversion
  - "a specification language, not an implementation language": no code generated
- per-contract config: storage layout, deployment scheme, selector facts, sol− contract
- verus analogue (inference): model of concrete rust api plus ghost spec, linked by `ensures`
  - spec must still mention concrete representation if abstraction boundaries are unproved
- model extends EVMYulLean (99.99% of official conformance suite)
  - conformance supports correspondence, not full model correctness
technique 2: compositional reach-invariant library
- cursor (pc, stack, memory, return data, world) plus invariant "gas exhausted or reach cursor after n steps"
  - proof is forward symbolic execution one opcode at a time
  - intermediate states stay existentially hidden, lemmas chain by transitivity
- opcode combinators: push1, jumpi (branch by concrete condition), sstore, return
- loops need prover-supplied abstraction, invariant, variant
- generic prologue/guard/selector-ladder proved once, abi decoders once per contract
- verus analogue: `invariant` + `decreases`, ghost summary state, small step lemmas chained into `ensures`
- cost (table 1): proof lines 1,522 (Pausable) to 29,911 (BlindAuction)
  - ERC20: 35 source lines, 2,708-byte runtime, 7,172 proof lines, 260 s check
  - UniswapV2Pair unfinished: 103,247 lines, 817 s
  - overhead vs bytecode size, not a universal ratio
technique 3: refinement for all entry points and unknown code
- theorem quantifies over every state, calldata, gas
- calls to unknown code interpreted by the same Θ on both sides
- benchmark: MakerDAO contracts, WETH9, Nouns auction house, solc 0.5.16 / 0.6.12 / 0.8.23
  - 19 complete, Clipper 26/29 and Auction 18/20 functions when stopped
- found semantic mismatch: dynamic-array copy wraps byte count outside UInt256 in evm, not in sol−
  - fix: explicit well-formed-storage hypothesis, not a proof for oversized arrays
- verus caveat: unknown rust/ffi code is a larger trust boundary than modeled evm calls
technique 4: agent proof development with telemetry and human escalation
- agent gets bytecode, sol− spec, top-level theorem, reusable library
- roughly half of completed contracts from goal prompt alone, rest a handful of mostly administrative inputs
  - table 2: prompts = 1 for only 6 of 16 completed rows, "roughly half" is generous
- escalate on spec mismatch, unmodeled semantic case, build/resource problem
  - Flipper, Auction: spec corrections authorized
  - Clipper, Cure: well-formed-storage hypothesis added
  - Cure first used trusted non-aliasing axioms, removed in two follow-up sessions
  - do not silently add axioms
- Vat (largest): 69.2M fresh, 1,735.5M cached, 5.6M output tokens
  - 100 h 44 min active, 84,382 lean lines, about $1,380 at gpt-5.5 prices, cache reads dominate
- Cat most supervised: 16 mid-proof inputs over 64 h
- Clipper, Auction still running at 81 and 94 h, no fundamental obstacle claimed, Auction stalled on build time
- Opus 4.8 used more time and tokens than gpt-5.5 on similar benchmarks
- caveats: subscription pricing so approximate, End exhausted memory until swap raised, exploratory examples not systematically monitored
- verus form: log diagnostics, tokens, time; human approval for spec changes and new `external_body`
trusted base
- lean kernel, standard axioms, evm model, refinement relation, conformance suite, lean compiler, test runners
- keccak opaque, selector facts trusted per contract
- `native_decide` adds evaluator axioms (decoding, gas/memory checks, jump-table membership)
- relation permits vacuous out-of-gas equivalence, no gas bound, termination separate
- sol− omits parts of gas and substate, no abi function-pointer or fixed-point types
catalog entries
- post hoc bytecode refinement without trusting compiler provenance
- compositional reach invariants with gas exhaustion in one invariant
- unknown-code call coupling on both sides
- agentic certificate production: fill reusable obligations, replay in kernel, log cost and human intervention
