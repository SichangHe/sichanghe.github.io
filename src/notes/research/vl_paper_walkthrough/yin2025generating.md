# Generating Millions Of Lean Theorems With Proofs By Exploring State Transition Graphs
(authored by agents unless marked 🧑)
Tag: `yin2025generating`, [paper](http://arxiv.org/abs/2503.04772v1)

## what the paper builds and measures

LeanNavigator turns existing Mathlib4 proofs into many new theorem/proof pairs by exploring the graph of Lean proof states. A node is a state (hypotheses plus goal); an edge is a tactic; a path to `ProofFinished` is a proof. The abstract reports 4.7 million generated theorems and 1 billion tokens. The paper's dataset-size comparison is 4.7M theorems/1B tokens for LeanNavigator versus 112K/57M for ReProver (Table 2, p. 11). These are generated artifacts, not 4.7 million independently authored mathematical results.

The system uses LeanDojo to apply tactics and Lean itself to validate each transition. Inference: Lean's kernel and Mathlib are the semantic trust boundary; the state embedder, FAISS retrieval, tactic-template substitutions, and breadth-first controller are search machinery. A theorem is accepted only if its stored path reaches a `ProofFinished` state. Inference: the method does not prove that a generated statement is useful for a product specification, and its model-training gains do not transfer automatically to Verus.

## technique: state-transition graph exploration

what it is: treat every reachable Lean state as a theorem whose proof is a path from that state to a finished node. The paper explains: “If there is a path from a new state to a ‘Proof Finished’ node in the state graph, this new state can be considered as a new theorem, with a proof corresponding to the sequence of tactics on the path.” (Section 3.1, p. 6.) If multiple paths reach completion, retain the shortest path, breaking ties by total tactic-string length (Section 3.4, p. 10). The abstract states: “By leveraging an interactive Lean client and an efficient method for proof step generation, LeanNavigator efficiently produces new theorems with corresponding proofs.” (Abstract, p. 1.)

steps:
1. enter the source theorem in an interactive Lean client and record its initial state (Algorithm 1, p. 10)
2. put the state in a priority queue and repeatedly pop the next state
3. embed the state, retrieve nearby tactic templates, instantiate placeholders with variables and hypotheses, and try each resulting tactic
4. apply each candidate with LeanDojo; discard errors and record `(current state, tactic, proof prefix)` for valid successors
5. enqueue unseen non-finished states; treat every `ProofFinished` successor as a terminal node
6. after the computation limit, select states at distance at most eight tactics from a finished node and emit each as a theorem with its shortest proof (Algorithm 1; Section 3.4)

The per-theorem limit is 30 minutes or 200,000 state transitions; emitted proofs contain at most eight tactics (Section 3.4, p. 10). In the 121-theorem MIL comparison with two minutes per theorem, LeanNavigator reaches 2,035.45 states per theorem versus ReProver's 21.69 (Table 1, p. 11). The denominator is 121 randomly selected MIL theorems, and the setting is a two-minute budget.

Verus form (Inference): represent a Rust/Verus verification state as source plus current diagnostics and proof context. Edges are candidate edits or `proof fn`/`assert` additions; invoke Verus to accept only edits that compile and advance the obligation. A finished node is a clean Verus verification. Store shortest verified edit paths as training examples, but include crate and dependency identity. Verus's `requires`, `ensures`, `invariant`, `assert`, and `proof fn` constructs replace Lean tactics; this mapping is an inference because the paper uses Lean only.

## technique: tactic templates and embedding retrieval

what it is: normalize tactics by replacing variable and hypothesis names with placeholders, embed templates and states with GPTNeo-350M, and retrieve candidates through a FAISS nearest-neighbor index. The paper gives the normalized example `rw [mul comm {var0} {var1}]` (Section 3.3, p. 9). Contrastive training pairs each state with one correct and one randomly selected incorrect tactic; the state embedding is trained to be closer to the correct one. The index returns 100 nearest templates, then variable/hypothesis combinations are enumerated and capped at 200 candidate tactics (Section 3.3, pp. 9–10). The paper states: “We place the embeddings of all tactic templates into a FAISS index [19], which enables nearest neighbor search based on embedding similarity.” (Section 3.3, p. 10.)

Inference: when to use: use templates when raw tactic strings sparsely repeat because names vary and direct generation is expensive. Retrieval is useful when the candidate library is much larger than can be exhaustively tried. The authors note Mathlib has more than 200 built-in tactics and hundreds of thousands of theorem-as-tactic possibilities (Section 3.3, p. 8).

Verus form (Inference): normalize verified Rust proof snippets by replacing local identifiers while preserving types, trait bounds, and crate paths; embed current diagnostics and retrieve compatible snippets. Instantiate only substitutions that type-check, then run Verus. Unlike Lean tactic templates, Rust ownership and borrow lifetimes make alpha-renaming insufficient; compatibility checks must include types and dependencies.

Inference: limits: embedding similarity can retrieve a syntactically close but semantically wrong lemma. Inference: retrieval must never be an acceptance predicate; Verus must check every instantiated candidate. The paper's 0.12-second average tactic application (Section 3.4, p. 9) is Lean-specific and cannot estimate Verus compile/SMT cost.

## technique: train a prover on generated states

The authors train flan-t5 base (350M parameters) and small (80M) on the generated pairs. At evaluation, each state receives ten model attempts; the first attempt yielding a valid tactic to a new state is followed (Section 4.3, p. 12). On MIL, the base model solves 39/117 versus ReProver 30/117; on MiniF2F it solves 104/493 versus 99/493 (Table 3, p. 12). These denominators are benchmark theorem counts, and success means reaching a completed proof under the ten-try policy.

Inference: a Verus analogue would train on verified proof-state/edit pairs and evaluate project-wise holdouts, not random lines from the same crate. The paper reports 28 days and 24 parallel processes to process all Mathlib4 (Section 4.2, p. 11); generation cost and library version are part of the reproducibility boundary.

## implications for VL

Already done: state-graph theorem synthesis, template normalization, embedding retrieval, bounded BFS, shortest-proof selection, and large-corpus training. Inference: VL should adapt the data-generation loop only after measuring whether Verus states are stable enough to deduplicate and whether short proof paths correlate with maintainability. Inference: threat to agent-written verified Rust is moderate. A large verified corpus can improve tactic suggestions, but it can also encode weak specifications or stale dependency assumptions; final Verus checking and specification review remain necessary.

## techniques for the catalog

- state-transition theorem synthesis — treat reachable proof states as new theorems and retain paths to a finished checker state
- tactic-template retrieval — normalize identifiers, embed templates, retrieve nearest candidates, and instantiate bounded substitutions
- bounded graph exploration — use priority-queue search with time and transition caps, then emit states within a fixed distance of completion
- verified-corpus training — train a tactic predictor on checker-accepted state/proof pairs and evaluate with bounded retries
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
