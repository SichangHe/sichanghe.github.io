# Proving Theorems Recursively
(authored by agents unless marked 🧑)
Tag: `wang2024proving` , [paper](https://www.semanticscholar.org/paper/29d2bf6d4b0ce5cdd2cf0ad3103597ba5681f29f)

## result
POETRY (PrOvE Theorems Recursively) searches a proof sketch level by level. It replaces detailed intermediate proofs with Isabelle’s `sorry`, verifies the outline, then recursively proves each deferred conjecture. “This approach allows the theorem to be tackled incrementally by outlining the overall theorem at the first level and then solving the intermediate conjectures at deeper levels.” (abstract, p. 1)

Inference: this is a search-control technique, not a way to accept incomplete proofs. A final theorem is accepted only after all `sorry` placeholders are replaced by verified proofs. The approach is useful to VL when a Verus proof has a long hierarchy of invariants or helper lemmas.

## technique 1: extract level-specific proof sketches

method
1. Parse a complete Isabelle proof into `(proofStep, proofLevel)` pairs; Isabelle increments levels for `have`, `obtain`, and `show`, and decreases them for `by`, `qed`, and `done` (§2.1, p. 3).
2. Start at an index and retain steps whose level equals the current level (§3.1, p. 4).
3. When the next step is deeper, append the current conjecture plus `sorry`, recursively extract the deeper sketch, and continue (Algorithm 1, lines 10–16, p. 4).
4. Return the current sketch and all recursively extracted sketches (Algorithm 1, lines 17–20, p. 4).

The algorithm merges the placeholder into the preceding step, for example `have "x + 2 = 2x" sorry`. “Merging the sorry tactic is crucial to ensure that the language model generates proof steps at the current level and postpones higher-level proofs using the sorry tactic.” (§3.1, p. 4)

Verus form
Inference: identify helper `proof fn`s and assertions that introduce subgoals, then generate a parent proof outline whose unresolved child facts are represented in training metadata. Verus has no sound production equivalent of Isabelle `sorry` for a final proof; placeholders must be rejected before attestation. During search, a child record can carry the proposed `requires`/`ensures` fact, while the parent remains unaccepted until a concrete Verus proof establishes it. Use `assert` and lemma-style proof functions, not an `invariant(...)` call or runtime proof function.

## technique 2: recursive best-first search

state machine
Each search-tree node is a proof state and each edge a proof step. A `sorry` edge links the parent to the root of the next proof level. Nodes have OPEN, FAILED, PROVED, or HALF-PROVED status; HALF-PROVED means a complete sketch exists but deferred children remain (§3.2, p. 5). “Only after all the mid-conjectures or subgoals in the sorry edges from the HALF-PROVED node to the PROVED node are proved will the node be switched to a PROVED node.” (§3.2, p. 5)

steps
1. Run best-first search at the current level until a sketch with one or more sorry edges is found (§3.2, p. 5).
2. Pause that level and recursively search the next-level child roots (§3.2, p. 5).
3. If a child search fails, backpropagate failure and reopen the parent; the paper’s Figure 2 shows HALF-PROVED nodes becoming OPEN after a failed child (§3.2, pp. 5–6).
4. If every child is proved, backpropagate PROVED and emit the complete proof (§3.2, p. 5).

Inference: a Verus implementation can maintain a queue keyed by proof-state score and a dependency stack for helper lemmas. Child failure should invalidate parent candidates that rely on that child; successful child proofs can be cached by their exact specification and context. This preserves the paper’s search semantics while using Verus compiler checks instead of Isabelle proof levels.

## evidence and limits
The evaluation uses miniF2F (244 valid and 244 test problems) and the PISA test set, with pass@1: each theorem is attempted once (§4.1, pp. 6–7). Table 1 reports POETRY at 42.2% on both miniF2F-valid and miniF2F-test, versus 39.3% and 37.3% for the GPT-f baseline; on PISA, POETRY is 49.6% versus 48.9%. On PISA’s multi-level subset, POETRY is 13.6% versus 11.1% (§4.1, p. 7). These denominators are 244 problems per miniF2F split and the paper’s PISA test subsets; the percentages are pass@1, not sampled pass@k.

The recursive method finds longer proofs. On miniF2F, average found proof length rises from 1.47 to 2.13 and maximum from 3 to 18; on PISA, average rises from 1.62 to 2.09 and maximum from 10 to 26 (§4.3, p. 8). The abstract instead says the maximum rises “from 10 to 262” (abstract, p. 1), while the detailed analysis and Figure 3 say 26. Inference: this is an internal typographical inconsistency; the reproducible detailed value is 26.

The case study proves `n_mult_closed` in 71.2 seconds with two levels, while GPT-f reaches a 600-second timeout (§4.3, p. 8). The search still trusts Isabelle, the language model, proof-state parser, and timeout policy. A `sorry` sketch may contain a false conjecture; the paper explicitly notes that such a sketch can be “incorrect” until its deferred conjecture is proved (§1, p. 2). Distribution is mostly single-level in PISA, so the aggregate gain there is modest: the paper reports 0.7% overall and 2.5% on the multi-level subset (§4.2, p. 7).

Inference: threat to agent-written verified Rust is medium for long-proof search and low for soundness if placeholders are never accepted. VL should not redo recursive decomposition as a generic idea; it should test whether Verus helper-lemma hierarchies show the same multi-level benefit under repository-held-out projects and exact compile-time budgets.

## techniques for the catalog
- level-specific sketch extraction: retain current-level proof steps and replace deeper subproofs with explicit deferred children
- recursive best-first search: pause at a verified outline, solve child conjectures recursively, and backpropagate failure or success
- placeholder soundness gate: treat `sorry` as search metadata only and require every deferred fact to pass the target verifier

Checked 2026-10-15 against the paper by a Codex agent for proving_theorems_recursively_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
