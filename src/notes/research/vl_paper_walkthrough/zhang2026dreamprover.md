# DreamProver: Evolving Transferable Lemma Libraries via a Wake-Sleep Theorem-Proving Agent
(authored by agents unless marked 🧑)
Tag: `zhang2026dreamprover`, [paper](https://arxiv.org/abs/2604.26311)


## scope and result
DreamProver learns a persistent Lean lemma library through alternating wake and sleep phases. The abstract describes a wake-sleep program-induction framework for reusable lemmas and says that it abstracts, refines, and consolidates candidates (Abstract, p. 1). Its headline result is a 61% average gain over Hilbert across inequality, number-theory, and combinatorics domains, with claimed 50% shorter proofs and 48% lower token use (Section 1, p. 2).

Inference: the direct VL lesson is to make proof agents accumulate verified Rust/Verus lemmas and contracts, then compress and validate them instead of repeatedly rediscovering local facts.

## technique 1: wake-stage learnable theorem identification

Use this when a training theorem can be proved from the current library and may expose a higher-level reusable fact. The paper defines learnability operationally: “a theorem is learnable by the system if it can be directly proved by the set of currently learned lemmas” (Section 3.1, p. 4).

Steps from the paper:
1. Start with an empty lemma library and a training set (Section 3.1, p. 4).
2. Give the current library to an LLM and set maximum proof and error-correction attempts (Section 3.1, p. 4).
3. If direct prompting proves a theorem within that budget, collect it as learnable for the sleep phase (Section 3.1, p. 4).
4. Repeat in later wake phases with the updated library, so more theorems become directly solvable (Section 3.1, p. 4).

Verus form. Inference: pass a frozen module of approved `spec fn` predicates and `proof fn` lemmas into the proof-agent context. A theorem is learnable only after Verus accepts its body under the existing contracts. Record the lemma's usage count and the exact crate/dependency snapshot. The final artifact should retain ordinary Rust code plus `requires`, `ensures`, `assert`, and loop `invariant` declarations; the LLM's proof search is not itself evidence.

## technique 2: recursive intermediate-theorem discovery

When direct proving fails, DreamProver decomposes the target. “The decomposition process first generates a formal proof sketch, and then extracts intermediate theorems from the unproven parts of the sketch (i.e., intermediate goals marked by the sorry tactic)” (Section 3.1, p. 4). The system reassembles the sketch with extracted theorems and verifies the target, and an LLM checks the sketch in natural language (Section 3.1, p. 4).

Steps: prompt for a proof sketch; turn each unresolved `sorry` goal into a standalone theorem; insert those theorems back into the sketch; run the formal checker; use natural-language checking to filter bad decompositions; keep verified intermediate theorems for sleep (Section 3.1, p. 4). Inference: in Verus, replace `sorry` with explicit candidate `proof fn` obligations, and never put `external_body` on the function being verified. The decomposition agent may propose subcontracts, but each sublemma must compile and verify against the original function's fixed specification.

## technique 3: semantic clustering and lemma abstraction

DreamProver turns a large set of intermediate theorems into general lemmas. First annotate each theorem with a natural-language description containing subdomain, difficulty, and relevant proof theorems. Then embed descriptions with a sentence transformer, cluster by cosine similarity using K-Means, and choose the number of clusters by the elbow method (Section 3.2, pp. 4–5). Give each cluster and its descriptions to an LLM to propose candidate lemmas. Retain a candidate only when its maximum structural similarity to a cluster theorem exceeds a threshold. Structural similarity is computed by converting both statements to simplified first-order-logic expression trees and comparing the trees (Section 3.2, p. 5).

Verus form. Inference: normalize verified lemmas by their typed signatures and ghost/specification structure, cluster descriptions or syntax trees, and ask an agent for a generalized `spec fn` or `proof fn`. Preserve ownership and lifetime parameters; do not erase them as merely syntactic noise. Re-run Verus on the generalized lemma and on at least one original client proof before adding it to the library.

## technique 4: library update, forgetting, deduplication, and formal verification

The update has three ordered operations: “(1) forgetting previously unused lemmas, (2) storing new lemmas, and (3) formally verifying the new lemmas” (Section 3.2, p. 5). Least-recently-used counts remove low-use entries at capacity; empirically the library stays below 100 lemmas (Section 3.2, p. 5). Tree edit distance removes near-duplicate candidates, and each survivor is proved with the same direct prompting strategy as the wake stage (Section 3.2, p. 5).

Inference: use a bounded Verus lemma cache keyed by normalized signature and imported assumptions. Eviction must not remove a lemma still required by a checked client; retain dependency edges and reverify clients after eviction. Deduplication must compare types, contracts, ghost state, and proof obligations, not only token text. A candidate is accepted only after Verus proves it and at least one use site.

## technique 5: lightweight inference

At test time DreamProver first attempts direct prompting with the library. If that fails, it “falls back to a sketch-and-prove workflow” that generates a sketch and proves each subgoal with the library available at both stages (Section 3.3, p. 5). Inference: the analogous VL agent should first try a bounded direct proof repair, then generate subgoals with explicit contracts and solve each under the same imported Verus facts. Keep the checker on every subgoal and on the assembled function.

## evidence and limits

On well-represented domains, Table 1 reports DreamProver (GPT-5.3-Codex) solving 55/92 inequality problems (59.8%), 33/42 number-theory problems (78.6%), and 16/20 combinatorics problems (80.0%); the Gemini 3.1 Pro version reports 57/92 (62.0%), 36/42 (85.7%), and 17/20 (85.0%) respectively (Table 1, p. 6). Table 2 gives 93 lemma uses across inequality, 37 across number theory, and 23 across combinatorics; it reports 35, 29, and 19 distinct reused lemmas, and 71, 29, and 18 covered theorems respectively (Table 2, p. 8). The paper summarizes this as “58% of the lemmas generated from the training sets are reused on the test sets” and “71% of all successfully proved theorems” use them (Section 4.3, p. 8).

The ablation is informative: full DreamProver proves 104 problems across three inequality sets; removing library optimization gives 76, removing cluster evolving gives 53, no library gives 55, and retrieval-only LEGO-Prover gives 61 (Table 3, p. 8). For underrepresented domains, Table 4 uses plane-geometry subsets with denominators 10, 10, 20, 10, and 19, and FormalML-Hard with denominator 122; GPT-5.3-Codex DreamProver reaches 10/10, 10/10, 17/20, 7/10, 7/19, and 95/122 (Table 4, p. 9).

What is proved is each retained Lean lemma and each benchmark proof accepted by Lean. Trusted parts include LLM descriptions, embeddings, clustering, tree-similarity thresholds, prompts, benchmark construction, and the Lean environment. Inference: the study does not prove that semantic similarity predicts usefulness, that fewer than 100 lemmas is generally optimal, or that the library transfers to Verus ownership/concurrency. Its limitation says small-context models may struggle when multiple libraries must be included (Section 5, p. 9).

Inference: threat to VL is high for proof-search cost and reusable-lemma design, and low for final soundness when every generated lemma and client is checked by Verus. Existing VL work should not redo generic lemma caching; it should measure whether contract-aware, ownership-aware clustering and eviction improve proof maintenance under real crate revisions.

## techniques for the catalog

- wake learnability — collect training theorems directly provable from the current verified lemma library
- recursive decomposition — extract checker-validated intermediate goals when direct proving fails
- semantic lemma abstraction — cluster descriptions and synthesize generalized lemmas with structural validation
- bounded library maintenance — evict unused lemmas, deduplicate by tree distance, and formally verify survivors
- two-stage inference — try direct proving, then sketch-and-prove subgoals with the library
Checked 2026-10-15 against paper zhang2026dreamprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
