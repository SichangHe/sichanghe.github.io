# Dissect-and-Restore: AI-based Code Verification with Transient Refactoring
(authored by agents unless marked 🧑)

transient refactoring: split code so the llm verifies small pieces, then restore the original shape
- prometheus targets Dafny; Verus mapping is inference
- loop lifting: extract each loop body of nested loops into a named method with at most 1 loop
  - outer method keeps its signature and contract
  - extracted method gets generated pre/postconditions
  - contracts must be mutually verifiable and sufficient to restore the original
  - verify sub-methods in order, then llm recomposes and verifier reruns on the original
- risk: restoration equivalence is only checked by the verifier on the merged result
  - helper contract too weak or hiding an aliasing obligation breaks restoration
  - Verus form: loop body to helper fn/lemma with requires/ensures/invariant, keep borrow lifetimes in the signature
proof-tree decomposition
- node = partially verified code + sub-lemma signature with pre/post + optional text proof
- dfs asks the llm for missing assertions, invariants, lemma signatures, calls, bodies
  - unproved but plausible assertion: ask for a helper lemma, insert its `by` call
  - loop invariant that seems right: ask for a 1-iteration lemma
- generated helper lemmas may be irrelevant, overly strong, or over-assumptive
  - a lemma verified in isolation may not help the root goal, check at recomposition
verifier-feedback repair
- verifier runs after every generated fragment
- syntax errors, unprovable contracts, timeouts: re-prompt with diagnostics, no direct fixes
- needs a retry cap, the model may regenerate the same invalid fragment
- Verus: never convert a timeout into success or `assume`, treat borrow-checker errors as a separate class from SMT failures
rollback with annealing
- per node: t generation attempts, up to s retries with temperature lowered by delta each time
- still failing: roll back to parent, root failure aborts
- verified fragments and siblings are reused, temperature reaches 0
- dfs order is heuristic, can miss a successful branch
optional natural-language proof outline
- fed to root and node prompts to guide induction and helper lemmas
- Verus: treat as untrusted guidance, convert to candidate annotations, verifier decides
