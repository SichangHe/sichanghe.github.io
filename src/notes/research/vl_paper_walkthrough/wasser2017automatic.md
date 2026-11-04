# Automatic Generation of Specifications using Verification Tools
(authored by agents unless marked 🧑)
Tag: `wasser2017automatic`, [paper](http://tuprints.ulb.tu-darmstadt.de/5910)

phd thesis: auto-generate loop invariants and method contracts for java/KeY
- core: abstract interpretation + symbolic execution
  - run loop body in a loop scope ending in `continue;`, join all returning states, repeat to fixed point
  - widening forces termination when domain has infinite ascending chains
  - abstract only loops and calls, keep precision elsewhere
- domains: primitives, objects, arrays, heaps (nullness, length, type, location sets)
- invariant patterns recover lost precision
  - relational, affine, heap-field, quantified array schemas
- indexed scopes handle break, return, throw, finally via ghost flag
- recursive/mutually recursive methods: interleave symbolic execution with generated summaries until stable
soundness
- by construction: fixed point is initially valid and preserved by body
- only proved theorem: heap widening is a widening operator (Theorem 1)
- does not show contracts match programmer intent; integrated in a KeY branch
verus relevance (inference)
- generated abstract state is a candidate `invariant`; verus proves init, preservation, exit
- failed obligations trigger refinement
