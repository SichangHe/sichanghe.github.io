# Proving Theorems Recursively
(authored by agents unless marked 🧑)
Tag: `wang2024proving` , [paper](https://arxiv.org/abs/2405.14414v1)

## result
POETRY (PrOvE Theorems RecursivelY) searches a proof sketch level by level. It replaces detailed intermediate proofs with Isabelle’s `sorry`, verifies the outline, then recursively proves each deferred conjecture. “This approach allows the theorem to be tackled incrementally by outlining the overall theorem at the first level and then solving the intermediate conjectures at deeper levels.” (abstract, p. 1)

## technique 1: extract level-specific proof sketches

method
1. Parse a complete Isabelle proof into `(proofStep, proofLevel)` pairs; Isabelle increments levels for `have`, `obtain`, and `show`, and decreases them for `by`, `qed`, and `done` (§2.1, p. 3).
2. Start at an index and retain steps whose level equals the current level (§3.1, p. 4).
3. When the next step is deeper, append the current conjecture plus `sorry`, recursively extract the deeper sketch, and continue (Algorithm 1, lines 10–16, p. 4).
4. Return the current sketch and all recursively extracted sketches (Algorithm 1, lines 17–20, p. 4).

The extracted sketches are replayed through PISA to obtain proof states, then formatted as context and proof-state inputs with next-step outputs for fine-tuning (§3.1, p. 4). The algorithm merges the placeholder into the preceding step, for example `have "x + 2 = 2x" sorry`. “Merging the sorry tactic is crucial to ensure that the language model generates proof steps at the current level and postpones higher-level proofs using the sorry tactic.” (§3.1, p. 4)

Verus form
Inference: a Verus adaptation could represent unresolved helper facts as search metadata, generate a parent outline, and defer its acceptance until concrete child proofs establish those facts. This is a proposed adaptation, not an implementation or result reported by the paper.

## technique 2: recursive best-first search

state machine
Each search-tree node is a proof state and each edge a proof step. A `sorry` edge connects parent and child states at the current level and also attaches a next-level root for the skipped conjecture. That root has score 0 and is excluded from the current-level search. Nodes have OPEN, FAILED, PROVED, or HALF-PROVED status; HALF-PROVED means a complete sketch exists but deferred children remain (§3.2, p. 5). “Only after all the mid-conjectures or subgoals in the sorry edges from the HALF-PROVED node to the PROVED node are proved will the node be switched to a PROVED node.” (§3.2, p. 5)

steps
1. Run best-first search at the current level to find a sketch; ordinary best-first search ranks unexplored states by cumulative proof-step log probability (§2.2, p. 3; §3.2, p. 5).
2. If the sketch contains deferred conjectures, pause that level, select the last unproved `sorry` edge, and recursively search its attached next-level root (§A.1, p. 14).
3. If that search fails, update the affected HALF-PROVED nodes to OPEN and resume the paused search for another sketch (Figure 2(c)–(d), p. 5; §A.1, p. 14).
4. When all deferred conjectures on a successful path are proved, propagate PROVED to the root. A complete path without deferred conjectures can succeed directly (Figure 2(e)–(f), p. 5; §A.1, p. 14).

Inference: a Verus implementation can maintain a queue keyed by proof-state score and a dependency stack for helper lemmas. Child failure should invalidate parent candidates that rely on that child; successful child proofs can be cached by their exact specification and context. Such an adaptation would need validation with Verus; it is not tested here.

## evidence and limits
The evaluation uses miniF2F (244 valid and 244 test problems) and the PISA test set, with pass@1: each theorem is attempted once (§4.1, pp. 6–7). Table 1 reports POETRY at 42.2% on both miniF2F-valid and miniF2F-test, versus 39.3% and 37.3% for the GPT-f baseline; on PISA, POETRY is 49.6% versus 48.9%. On PISA’s multi-level subset, POETRY is 13.6% versus 11.1% (Table 1, p. 7). These are reported pass@1 results. The paper does not evaluate Verus or verified Rust projects.

The recursive method finds longer proofs. On miniF2F, average found proof length rises from 1.47 to 2.13 and maximum from 3 to 18; on PISA, average rises from 1.62 to 2.09 and maximum from 10 to 26 (§4.3, p. 8). The abstract also gives 26, followed by superscript footnote 2 linking to the code (p. 1); the extracted text joins them as 262. This is not a conflicting proof-length result.

The case study proves `n_mult_closed` in 71.2 seconds with two levels, while GPT-f reaches a 600-second timeout (Figure 4, p. 8; §4.3, p. 9). Its 11 steps become three sketches with maximum length four (§4.3, p. 9). A `sorry` sketch may contain a false conjecture; the paper explicitly notes that such a sketch can be “incorrect” until its deferred conjecture is proved (§1, p. 2). Distribution is mostly single-level in PISA, so the aggregate gain there is modest: the paper reports gains of 0.7 percentage points overall and 2.5 on the multi-level subset (§4.2, p. 7).

The search uses 32 candidates per expansion, beam-search decoding, at most 128 expansion steps, recursion depth at most 10, a 10-second proof-step timeout, a 600-second global timeout, and a 120-second local timeout below the first level (§A.2, pp. 14–15). The appendix also describes 600 seconds as five minutes (§A.1, p. 14), an arithmetic error; §A.2 repeats 600 seconds. The limits remain explicit: “Although this leads to consistent performance improvements, there is no theoretical guarantee that it will avoid the problem of infinite action space for each proof step generation and the problem of exponential search space with respect to the depth of the search tree.” (§6, p. 10)

## techniques for the catalog
- level-specific sketch extraction: retain current-level proof steps and replace deeper subproofs with explicit deferred children
- recursive best-first search: pause at a verified outline, solve child conjectures recursively, and backpropagate failure or success
- complete deferred proofs: require proofs of every conjecture skipped by `sorry` before marking the root PROVED
