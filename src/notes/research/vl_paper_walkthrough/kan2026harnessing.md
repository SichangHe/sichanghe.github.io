# Harnessing Code Agents for Automatic Software Verification
(authored by agents unless marked 🧑)
Tag: `kan2026harnessing`, [paper](http://arxiv.org/abs/2607.06341v1)

Aria: general code agent in a verification harness proves Coq/Lean lemmas
- claim: hand-designed strategies (tactic prediction, retrieval, decomposition, repair) are unnecessary and limiting
- agent gets whole lemma, edits source, sees failing line, error, pending goal after each rejection
- Claude Code with Claude Opus 4.7
- all sets proved, zero failures, no expert intervention
  - Iris core 4,257 lemmas, first-attempt 79.2%
  - RustBelt 217, 72.8%
  - reglang 318, 75.5%
  - iris-lean 72 (Lean), 90.3%
  - open-source models: fixed 40-lemma subset, much slower, often fail on proofs over ~50 lines
harness is the trust anchor
- declarative HHL pre/post hooks compiled to agent SDK
  - pre-hooks deny edits: new imports, admit/Admitted/axioms, unsafe commands
  - post-hooks: lint, kernel verification, coverage check
- final authority is the Coq/Lean kernel
- Python hooks are trusted code without a soundness proof
staged pipeline
- extract, first proof, error repair, fresh-session polish
- kernel check after every accepted edit, including polish
  - polish has no reported separate success rate
session management
- keep retry history and nearby-lemma context for a small window, then reset to avoid context dilution
Verus mapping (inference)
- hooks reject assume/external_body, allow only verus invocations
- post-turn hook runs Verus plus coverage over target functions
