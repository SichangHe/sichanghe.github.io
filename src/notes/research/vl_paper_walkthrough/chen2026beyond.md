# Beyond Basic Specifications? A Systematic Study of Logical Constructs in LLM-based Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026beyond`, [paper](https://arxiv.org/abs/2602.00715)

llm specification generation for c (acsl) with higher-level logical constructs
- guess-verify-refine loop: llm proposes specs, verifier checks, failures fixed using feedback
  - deletion: drop failing specs
    - weaker final specs, loses useful imprecise info
  - modification: llm repairs specs from diagnostics
    - more verified programs, more runtime (repeated generation)
- 4 prompt-constrained construct sets
  - CB basic: requires, ensures, assigns, loop invariants, behavior
  - CV verifiable: + predicate, logic, lemma (proved by tool)
  - CA axiom: + predicate, logic, axiom (assumed true)
  - CF full: CV + CA
benchmark and setup
- 49 cleaned frama-c-problems programs, 5 runs each
- 6 models: GPT-3.5-Turbo, GPT-4o, GPT-5, Gemini-2.5-Pro, Qwen2.5-Coder-32B, Llama-3.1-70B
  - GPT-3.5-Turbo excluded from comparison for construct non-compliance
results
- avg verified programs (NVP), 5 models
  - deletion: CB 31.8, CV 34.6, CA 33.4, CF 37
  - modification: CB 37.4, CV 39, CA 38.8, CF 39.4
  - CF verifies 16.35% more than CB under deletion, 5.35% under modification
- logical constructs raise capability but add instability
  - NSVP (verified in >=2 of 5 runs) drops most for axioms under deletion
    - NSVP falls vs NVP by 19.76% for CA under deletion
  - axioms are assumed true, can invalidate the whole verification
limits
- only 49 programs
- verifier success does not mean spec matches intended requirement
- verus transfer is inference, not evaluated
  - verus has no assigns; frame properties need other encodings
takeaways for verus agents
- report stable success (>=2 of 5 runs) and verifier calls, not one lucky pass
- document assumptions as trusted base if axiom-like constructs are allowed
