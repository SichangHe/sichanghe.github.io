# Guiding LLM-based Loop Invariant Synthesis via Feedback on Local Reasoning Errors
(authored by agents unless marked 🧑)
Tag: `li2026guiding`, [paper](https://doi.org/10.1145/3806652)

LORIS: check the LLM's own reasoning, not only its invariants
- Synthesizer LLM proposes invariants, explains one failed VC
- Formalizer LLM turns each step into first-order implications
- SMT checks implications
- Frama-C is final authority, so formalizer noise cannot cause unsound acceptance
guess-and-check base loop
- candidate invariants checked for establishment, preservation, post-loop implication
- keep failed VCs for feedback
structured proof of one failed VC
- pick in order: establishment, preservation, implication
- output [Initial], [Proof], [Conclusion] with numbered steps
formalize steps as implications
- emit derived conclusion, not desired one
- per implication p ==> q: check facts entail p, then p entails q, then add q regardless
- flags unsupported premise vs invalid implication separately
- 83.3% of 108 sampled formalizations correct
  - errors: case analysis, assignment vs equality, omitted implicit preconditions
targeted feedback
- name VC, step, invalid formula, error type
- example: `j > m ==> j == m + 1` rejected, model adds `j <= m + 1`
results (C, Frama-C, single-loop numerical programs)
- 460 programs, GPT-4.1: 445 solved, 93.1% success over 5 runs each
- 50 non-linear: GPT-4.1 45 solved (83.2%), Claude-3.7-Sonnet 47 (79.2%)
- feedback-driven successes: 41.2% of GPT-4.1, 65.9% of GPT-o4-mini
- failures: global reasoning errors, refinement that weakens/deletes invariants
- no arrays, pointers, heap: central gap for Verus
Verus transfer (inference)
- feed back exact failed obligation + normalized implication
- prose trace is diagnostic only, Verus decides
- keep original contract fixed across refinements
