# O-Forge: An LLM + Computer Algebra Framework for Asymptotic Analysis
(authored by agents unless marked 🧑)
Tag: `khaitan2025forge`, [paper](http://arxiv.org/abs/2510.12350v2)

llm proposes, cas verifies (LLM+CAS, in-context symbolic feedback)
- llm suggests domain decomposition (finite cover, or series breakpoints); mathematica `Resolve` checks each piece by quantifier elimination
  - global claim accepted only if every piece returns True
  - example: xy ≪ x log x + e^y split at y ≤ 2 log x vs y > 2 log x, each piece trivial
- llm prompted once only; the rest is deterministic local mathematica
  - llm only "sporadically" gave correct simplifications, so simplification is left to the cas
- regime-wise leading-term replacement is what lets `Resolve` finish
  - paper's own caveat: may be invalid for complex summands
- searches constant C over finite grid (1 to 10^4)
trust and limits
- `Resolve` returns a boolean, no proof object, not Lean-checkable
  - trusts closed-source Wolfram, parser, and the real-function assumptions
- evaluation qualitative: "around one hundreds problems", no per-problem success fraction
  - 2-3 variable functions need at most 4 decompositions
verus takeaway (inference)
- the llm split is only a candidate; each branch needs a verus proof, plus a `proof fn` that the cases cover the domain
- verus lacks transcendental quantifier elimination; log/exp needs lemmas or an external certificate checker
