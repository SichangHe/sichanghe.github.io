# A Combinatorial Identities Benchmark for Theorem Proving via Automated Theorem Generation
(authored by agents unless marked 🧑)
Tag: `xiong2025combinatorial`, [paper](https://arxiv.org/abs/2502.17840)

## what is proved or measured

The paper introduces LeanComb, a manually formalized Lean 4 benchmark of 727 combinatorial identities: 627 training theorems (418 identities and 209 lemmas) and 100 test identities. It then introduces ATG4CI, an automated theorem generator that uses a fine-tuned language model to suggest tactics and an RL tree search (RLSCI) to explore those tactics. The authors report a two-iteration LeanComb-Enhanced dataset of 260,466 new theorems. They evaluate Pass@1, defined as constructing a valid proof in one attempt within a ten-minute wall-time limit, on the 100-example LeanComb test set and on miniF2F-test.

The paper states: “The benchmark consists of 727 combinatorial identities, with 627 theorems in the training set (418 identities and 209 lemmas) and 100 in the test set (100 identities).” (Section 3, p.3). It also states: “Pass@1 is defined as the success rate of constructing a valid proof within a single attempt, constrained by a strict wall time limit of 10 minutes.” (Section 6.2, p.9). These definitions fix the denominators and setting for the reported percentages.

## technique 1: build a domain benchmark with executable proofs

what it is: translate informal combinatorial identities into Lean definitions, theorem statements, and proofs, and organize them by mathematical category. The training identities come mainly from one classical source and test identities from two other sources. The benchmark includes nine new definitions and records tactic-level proof lengths; the longest training proof has 98 steps and the mean is 8.9.

when to use it: use a domain benchmark when a general proof corpus has too few examples for the target mathematics, or when evaluation must test the exact target domain rather than broad Mathlib competence.

how to do it, as described in Section 3:
1. select identities from classical combinatorics literature and divide sources between training and test (paper)
2. manually translate each statement into Lean 4 definitions and theorem declarations, including a formal proof (paper)
3. classify examples into categories such as generalized binomial coefficients, inversion, calculus, probability, recurrence relations, and mechanical summation (paper)
4. count each tactic as one proof step and retain proof-state-valid examples (paper)
5. evaluate on the held-out 100 identities (paper)

The worked proof factors a constant from a finite sum, changes the interval representation, then simplifies. The paper’s listing is: “rw [mul_sum]”, “rw [sum_Ico_eq_sum_range]”, and “simp” (Listing 1, p.3). The text explains that the first rewrite factors `n`, the second performs variable substitution, and `simp` reaches “no goals” (Section 3, p.4).

Verus form (Inference): represent a benchmark theorem as a `spec fn` over mathematical sequences or finite sets, state its property with `ensures`, and prove rewrites in a `proof fn` using `assert` and library lemmas. Executable Rust can then be verified against the contract; Lean tactics such as `rw` and `simp` do not carry over as syntax, so the proof must use Verus assertions and proof lemmas. This is an inference because the paper uses Lean, not Verus.

evidence and limits: the benchmark has 418 training identities and 100 test identities (Table 1, p.3). It is manually formalized and therefore depends on the authors’ translations and source selection. Inference: results on this split do not establish coverage of other combinatorics or systems code, and a Verus port would need new specifications and libraries.

## technique 2: extract partial proof paths and interactive state data

what it is: Lean4Kit turns each completed theorem proof into a proof tree. Nodes are proof states, edges are tactics, and the leaf is “no goals.” It extracts state-tactic pairs, premises, variable types, errors, and whether a tactic solved the state. A partial proof path (P3) is each root-to-intermediate-state path.

when to use it: use this representation when training a tactic model requires examples of tactics conditioned on the exact current goal, including failed tactic feedback.

how to do it:
1. initialize the theorem and obtain its proof state with `get_init_state` (Section 4)
2. execute candidate tactics with `run_tactic`; retain the updated state or error message (Section 4)
3. trace every valid tactic transition to construct a proof tree (Section 5.1)
4. extract root-to-intermediate paths before the final no-goals node (Section 5.1)
5. use each state-policy pair as a training/search input (Section 5)

For the three-tactic listing, the paper extracts two P3s: one ending after `rw[mul_sum]` and one ending after `rw[sum_Ico_eq_sum_range]` (Section 5.1, p.5). Inference: a Verus implementation would log verifier diagnostics and snapshots of the current Rust/Verus obligation, then use those states as search nodes; Verus has no Lean4Kit API, so the extraction layer must be built around Verus runs.

evidence and limits: Lean4Kit can mark an initial state as an error when theorem validation fails and returns an error state for an inapplicable tactic (Section 4, p.4). Inference: state extraction is a data-engineering aid, not a soundness proof; Lean remains the checker.

## technique 3: iterative LLM tactic generation plus RLSCI search

what it is: fine-tune a candidate-tactic model on LeanComb and Mathlib, ask it for up to `t` tactics at each P3, and select/expand tactics using a policy network, critic network, and PUCT value. Completed nodes receive value 1, failed nodes −1; unresolved nodes use the PUCT formula with visit counts, policy probability, value estimate, and exploration coefficient. Successful tactics become new training data.

how to do it:
1. fine-tune model `M_ct` on the current generated dataset (Algorithm 1, lines 4–5)
2. produce candidate tactics for every P3 (Algorithm 1, line 5)
3. select tactics, expand proof nodes, and back-propagate leaf values using RLSCI until a proof completes or no tactic remains (Section 5.2)
4. when a path reaches a goal aligned with the original theorem, add the original theorem as a hypothesis and finish with `assumption` (Section 5.2)
5. treat unresolved leaf goals as candidate theorems and repeat for the configured iterations (Section 5.2 and Algorithm 1)
6. deduplicate and correct candidates, retaining only Lean-verified results (Section 5.3)

The paper’s example says: “The tactic prediction process begins at Line 5, where the LLM is prompted to provide 8 candidate tactics for the current state.” (Section 5.2, p.6). It then reports that RLSCI selects four nodes in the first round, explores more than 100 candidate proof paths, and produces a candidate theorem whose proof rewrites the hypothesis and ends with `assumption` (Section 5.2, pp.6–7).

Verus form (Inference): use a verifier-facing generator that emits candidate proof statements or `proof fn` bodies; run Verus after each candidate, assign success/failure values, expand surviving obligation states, and use a policy/critic to prioritize candidates. Final acceptance must still be a successful Verus verification. PUCT and the neural models are search code outside the verified Rust; they do not become trusted proof steps.

evidence and limits: the implementation uses Llama3.1-8B, 10 training iterations, 100 simulations per decision step, 20 full events per iteration, at most 16 candidate theorems per node, and a 300-second search limit (Section 6.1, p.8). These settings are assumptions of the experiment, not universal optima.

## technique 4: theorem validation by deduplication and error correction

what it is: remove textual duplicates and mathematically equivalent expressions, then interact with Lean to verify candidates. Failed candidates are classified as incomplete, type, or logical errors. Incomplete proofs receive additional MCTS steps; type errors are repaired by restoring missing type annotations; logically inconsistent goals are discarded.

how to do it:
1. compare goals, premises, and proof steps to remove identical candidates (Section 5.3)
2. simplify redundant terms such as `+0`, `−0`, `*1`, and `/1` to remove mathematical duplicates (Section 5.3)
3. run each remaining theorem through Lean and add successful proofs to generated set `G*` (Section 5.3)
4. apply the matching correction for incomplete or type errors, then re-run Lean (Section 5.3)
5. discard logical inconsistencies that cannot be repaired (Section 5.3)

The paper explicitly says: “Not all candidate theorems are correct or unique, so a validation process, including theorem deduplication and correction, is necessary to retain the valid theorems.” (Section 5.3, p.7). Inference: this checker-centered filtering is the part that transfers most directly to Verus: every generated Rust proof candidate should be re-verified, and failed candidates should be classified without treating model text as evidence.

evidence: with 16 candidate tactics, iteration 1 generated 592,811 candidates, deduplicated to 392,818, with 68,771 already correct and 31,306 corrected, for 100,077 new theorems (Table 2, p.8). Iteration 2 produced 160,389 new theorems for the 16-tactic setting; the merged enhanced set contains 260,466 new theorems (Table 2 and Section 6.1, pp.8–9). The denominators are the candidate counts shown in the table; the paper’s stated percentages after deduplication range from 17.5%–22.7% in iteration 1 and up to 75.0% in iteration 2.

## measured effect, trust, contradictions, and product implications

On the 100-example LeanComb test set, Table 3 reports Pass@1 for four models after Mathlib pretraining and successive fine-tuning: Gemma2-9B 10% base, 15% LeanComb, 17% first iteration, 23% second; Mathstral3-8B 9%, 19%, 22%, 25%; Llama3-8B 9%, 15%, 17%, 22%; Mistral-7B 9%, 17%, 18%, 26% (Table 3, p.10). On miniF2F-test, Table 4 reports Gemma2 26.2%, 27.0%, 27.9%, 30.3%; Mathstral3 29.9%, 30.3%, 33.6%, 36.1%; Llama3 29.1%, 31.1%, 34.0%, 34.8%; and Mistral 28.7%, 32.8%, 33.2%, 34.8% (Table 4, p.10). Inference: these are model-level Pass@1 percentages on fixed test sets, not guarantees that generated proofs are correct without the checker.

The trusted component is Lean’s verification of accepted theorem statements and proofs. Inference: model generation, RLSCI, PUCT values, source selection, benchmark translations, deduplication heuristics, and correction logic remain outside that semantic trust boundary until Lean accepts the result. The paper does not measure Verus, Rust, memory safety, or deployment behavior. Inference: an agent-written verified-Rust product can reuse the loop of state extraction, candidate search, verifier filtering, and iterative data generation, but it must not reuse Lean syntax or assume combinatorics transfer without a Verus benchmark.

Inference: VL should not redo a generic claim that more generated data can improve tactic models; this paper already measures that claim for Lean and gives a concrete generator. A product-specific study should instead test Verus obligations, Rust APIs, dependency changes, and specification quality. The threat to a product is medium: search and dataset techniques could improve an agent’s proof throughput, while the Lean-to-Verus gap, small held-out benchmark, and human-authored specifications leave substantial uncertainty.

## techniques for the catalog

- domain formalization benchmark — translate source identities into executable Lean statements and proofs with a held-out test split
- proof-state extraction — record theorem states, tactic transitions, errors, and partial paths for model training
- RL tactic tree search — combine LLM candidate tactics with policy/critic PUCT expansion and back-propagation
- checker-centered validation — deduplicate, repair typed/incomplete candidates, discard logical errors, and retain only verifier-accepted proofs
- iterative proof-data refinement — fine-tune on accepted generated theorems and repeat generation to enlarge the training corpus
Checked 2026-10-14 against the paper by a Codex agent: audit record xiong2025combinatorial; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
