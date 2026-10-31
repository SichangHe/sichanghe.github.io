# Neuro-Symbolic Proof Generation for Scaling Systems Software Verification
(authored by agents unless marked 🧑)
Tag: `he2026neuro`, [paper](http://arxiv.org/abs/2603.19715v2)

source: Baoding He, Zenan Li, Wei Sun, Xiaoxing Ma, Yuan Yao, Taolue Chen, Zhendong Su (Nanjing University, ETH Zurich, Birkbeck), arXiv:2603.19715v2, 7 May 2026; 18 pages, no appendix; pages 15 to 18 are references

earlier notes: distributed_verification_review_b/deep_5_llm_agents.md has one paragraph on this paper (headline rates, 2,167 proofs, 36.2% line coverage, 120-minute budget, the 71.1% figure being a simulation), and topic_studies/formal_verification_rust/llm_for_verification/c_and_systems_proofs.md has a six-line entry. Neither gives the search algorithm, the repair rules, the hyperparameters, the failure analysis or the arithmetic problems below.

## what is proved and what is measured

The system completes Isabelle/HOL proofs of theorems whose statements already exist in the seL4 proof corpus. Every step it emits is executed by Isabelle, so a returned proof script is checked by the prover; the language model, the repair rules, the counterexample finders and the ranking are search aids whose mistakes cost time, not soundness. The abstract's one-sentence description: “The framework performs a best-first tree search over proof states, repeatedly querying an LLM for the next candidate proof step.” (Abstract, p.1)

What is measured: the share of held-out seL4 theorems for which a complete proof is found, against two LLM baselines (Selene, FVEL) and two symbolic ones (Isabelle's automatic methods, Sledgehammer); the share of original proof lines those theorems account for; transfer to four other benchmarks; and ablations.

What stays trusted: Isabelle's kernel, and, for the steps Sledgehammer contributes, the reconstruction of solver results into Isabelle steps, which Isabelle also checks. The theorem statements are taken as given. Inference: this is proof completion against human-written statements in a mature library, so it says nothing about writing specifications, and all evaluated theorems had a known human proof.

## technique 1: training on state and step pairs obtained by replay

what it is: instead of training a model on (theorem, whole proof), replay each existing proof in the prover, record the proof state before every step, and train on (state, next step).

when to use: when the proof corpus is small and procedural, so that the script text alone does not show what each step did. The paper's argument for why whole-proof training fails on seL4 is that the meaning of a tactic script lives in the prover's intermediate states (Section 2, p.4).

how it is done:
1. take the training split of proofs (Section 4.2 "Dataset", p.7: the FVELER training set, 26,081 theorems)
2. replay: “Each proof is decomposed into individual proof steps and replayed in the ITP, allowing us to record the intermediate proof state preceding every step.” (Section 3.1.1, p.5)
3. this multiplies the data: “For example, a five-step proof yields five distinct training instances, which are subsequently used for fine-tuning.” (Section 1, p.2) The seL4 training set gave 181,887 pairs, about seven per theorem (Section 4.2, p.7)
4. format each pair with the instruction template of Section 3.1.1 (p.5): an instruction line asking for the next proof step given an Isabelle proof state, the state as input, the step as response
5. fine-tune a small model with all parameters trainable: Qwen3-1.7B and Mistral-7B, Llama-Factory, effective batch size 16, 3 epochs, learning rate 1e-5 with cosine decay and warmup ratio 0.1, bfloat16 (Section 4.2 "Training", p.7 to 8)
6. predict one step at a time, from the current state only, with no proof history. The stated reason for one step: “This is because, although multi-step prediction is possible in principle, the complexity of real proofs and the limited amount of available data make such predictions considerably more challenging; empirically, one-step prediction yields more reliable results.” (Section 3.1.1, p.5)

Verus form (Inference: the paper is about Isabelle). Verus has no tactic script and no printed goal after each step, so the pair must be redefined. A workable definition: state = the function with its `requires`, `ensures` and the proof annotations so far, plus the verifier's error for the first failing obligation; step = one added annotation (one `invariant` clause, one `assert(...)`, one call of a `proof fn`, one `reveal`). Pairs can be mined from verified Verus code by deleting annotations from the end and recording the error that reappears. What does not carry over: in Isabelle each step transforms the goal deterministically and the new goal is shown; in Verus an added `assert` either makes the SMT query pass or not, and a failed query reports which obligation failed, not a simplified remaining goal. So the state is much less informative per step.

evidence: Table 4 (p.11), tree search without Sledgehammer: the two base models before fine-tuning reach 0.0% (Mistral-7B) and 0.1% (Qwen3-1.7B); after fine-tuning 59.8% and 57.1%. The table does not state its denominator.

where it fails or what it assumes: a corpus of finished proofs in the same library must exist. The fine-tuned model still names facts that do not exist: undefined facts are 3,263,494 of 5,427,419 rejected steps, 60.1%, in the failed validation runs (Table 5, p.13).

## technique 2: best-first search over proof states with a length-normalized score

what it is: a tree whose nodes are proof states; at each iteration the highest-scoring unexplored nodes are expanded by asking the model for many candidate steps and running each in the prover.

how it is done, following Algorithm 1 (p.5):
1. make the initial proof state the root (line 1)
2. each iteration, pick the highest-scoring unexplored node (line 3). Setting: “In each search iteration, at most five proof states are selected; for each proof state, the model is prompted to generate 128 candidate proof steps.” (Section 4.2 "Proving", p.8)
3. sample candidates at temperature 1.0, top-p 0.95, at most 2,048 tokens, with the model's internal thinking disabled (Section 4.2, p.8)
4. execute each candidate in Isabelle; put it in a success list or a failure list together with its log probability (lines 6 to 11)
5. pass the failure list to the revision procedure of technique 3 and execute what it returns (lines 12 to 14)
6. for each resulting state: if it has no subgoals, return the proof script (lines 16 to 17); if the checker finds it a duplicate or finds a counterexample, drop it (lines 18 to 19); otherwise score it and insert it in the tree (lines 20 to 21)
7. the score of a state reached by L−1 steps is the sum of the steps' log probabilities divided by L to the power α (Section 3.2.2, p.6): “The normalization term Lα mitigates the inherent bias against longer proof sequences, with the exponent α specifying the degree of mitigation [18], which we set to 1 by default.” (Section 3.2.2, p.6)
8. stop with failure after the iteration limit (line 22), then try technique 5. The value of the iteration limit is not given in Section 4.2; Section 5.2 (p.13) speaks of failed runs exhausting a 128-attempt budget.

The same fine-tuned model produces the steps and, through its log probabilities, the ranking; there is no separate value model.

Verus form (Inference). Nodes become partial proof texts for one function; an expansion asks the model for many single-annotation edits and runs Verus on each. A node is finished when Verus reports no errors for the function. The scoring formula carries over unchanged because it needs only token log probabilities, which requires a model that exposes them; hosted chat models often do not. A sub-score Verus offers that Isabelle does not: the count of obligations still failing in the function, which could break ties.

evidence: Table 1 (p.8), proof success rate in percent on the validation, test and test-hard splits and in total. Mistral-7B: 79.8, 89.0, 69.8, total 77.6. Qwen3-1.7B: 73.6, 74.9, 61.1, total 70.4. Sledgehammer: 40.5, 39.5, 40.9, total 40.3. Isabelle's automatic methods: 4.9, 6.7, 6.1, total 5.9. FVEL as rerun: 8.9, 9.5, 4.5, total 7.8. Selene as rerun: 6.1, 7.0, 3.3, total 5.6. All methods had a 120-minute limit per theorem. In counts: “This accounts for 77.6% of all still valid theorems across the three evaluated sets, 37.3 percentage points higher than the best baseline, Sledgehammer.” (Section 4.3.1, p.8), the count being 2,167 proofs (788 validation, 811 test, 568 test-hard); Qwen3-1.7B proved 1,965, Sledgehammer 1,124, FVEL 219, Auto 164, Selene 156. By proof length: “Although the success rate naturally decreases as proof length increases, it remains around 20% even for the 393 theorems whose proofs exceed 10 lines.” (Section 4.3.1, p.8)

Ablation with a hosted model, Table 3 (p.11), on 200 randomly sampled theorems: DeepSeek alone 5.5%; with tree search 12.5%; with retrieval and tree search 33.0%; with Sledgehammer added 52.0%; the paper's system 70.0%. Which fine-tuned model the 70.0% row uses is not stated.

where it fails: long proofs. The limitations section says: “The current tree-search procedure adopts one-step prediction and bounded search, making it challenging to uncover deeper reasoning chains.” (Section 7, p.14) Of 451 failed runs on test and test-hard, Table 6 (p.13) puts 109 at maximum depth 11 to 30, 181 at 31 to 60 and 145 above 60; only 17 stopped at depth 10 or less. So most failures are deep searches that ran out of budget, not early dead ends. Cost with a hosted model: “Due to budget constraints (running tree search costs approximately $4.1 per theorem on average when using the DeepSeek or GPT-4o APIs), we randomly sample 200 theorems from the benchmark and use the DeepSeek API to propose proof steps.” (Section 4.3.4, p.11)

## technique 3: rule-based revision of rejected steps

what it is: a rejected step is not thrown away. Its parts (the tactic, the cited premises) are recombined by fixed rules into new candidate steps, which are then executed.

when to use: when the model's failed outputs are near misses: the right lemma with the wrong tactic, or the right tactic with a lemma name that does not exist.

how it is done (Section 3.1.2, p.5 to 6, and Algorithm 2, p.6): “After examining all proposed steps for a given proof state, we systematically transform the failed ones in two ways: (1) tactic repair: we extract the premises referenced by misused tactics and recombine them with a curated set of frequently used tactics; and (2) premise repair: we search the proof context for similar premises and substitute them where appropriate.” (Section 3.1.2, p.5)
1. beforehand, build a tactic set and a premise set from the training corpus (Algorithm 2, lines 2 to 3)
2. tactic repair, for a step whose error concerns the tactic: extract the premises the step cites, and pair them with each tactic of the set (lines 5 to 7). The set is cut down, for example to the 12 most frequently used tactics (Section 3.1.2, p.6)
3. premise repair, for a step that fails with an undefined-fact error: keep the tactic, and replace each unknown name by similar existing ones (lines 8 to 11): “Concretely, we compare the undefined fact with all candidate premises using edit distance and select the closest matches (e.g., the top three).” (Section 3.1.2, p.6)
4. keep the candidate pool for premise repair small: use MePo, the relevance filter inside Sledgehammer, to pre-select the 128 facts most related to the current subgoal (Section 3.1.2, p.6)
5. execute every revised step in the prover and add those that succeed to the success list (Algorithm 1, lines 12 to 14)

The paper's own example of a near miss: the model names the relevant definition cap_swap_def but pairs it with an inapplicable tactic, or proposes the right tactic wp with the premise hoare_seq_ext, which does not exist in the library (Section 3.1.2, p.5; Figure 1, p.3).

Verus form (Inference). The commonest counterpart of an undefined fact in Verus is a call to a library `proof fn` that does not exist or has a different name or argument list. Premise repair carries over directly: on an unresolved-name error, compute edit distance from the bad name to the names of `proof fn` items in scope (the project and vstd), substitute the nearest three, and rerun Verus. Tactic repair has a weaker counterpart: keep the asserted fact and vary how it is discharged, trying plain `assert(...)`, `assert(...) by (nonlinear_arith)`, `assert(...) by (bit_vector)`, and `assert(...) by { ... }` with a call of the lemma inside. The menu of twelve tactics has no equivalent; Verus has a handful of proof modes.

evidence: “In particular, for the most challenging 77 theorems where the model initially proposed no valid steps and therefore failed immediately, the revision procedure is highly effective, enabling 24.7% of these theorems to be proved.” (Section 4.3.4, p.11) 24.7% of 77 is 19 theorems. For 220 theorems where under 5% of proposed steps were valid, 11.8% (26 theorems) were proved with revision. The paper gives no overall success rate with revision switched off.

where it fails: the paper calls the rules rigid: they “are imperfect and may introduce misleading candidates” (Section 7, p.14). Revision multiplies the number of prover calls per node, and prover calls are the bottleneck.

## technique 4: filtering states by counterexample search and by equivalence

what it is: before a new proof state enters the tree, try to refute it and try to show it equals a state already present; drop it in either case.

when to use: when steps can turn a provable goal into an unprovable one (for instance by over-generalizing or by dropping a hypothesis), and when many different steps lead to the same state.

how it is done (Section 3.2.1, p.6):
1. run two counterexample finders on each new state. The paper describes them: “QuickCheck performs random property-based testing on executable parts of the proof state, whereas Nitpick translates higher-order formulas into finite relational models and searches for counterexamples using Kodkod, which is a SAT-based first-order relational model finder.” (Section 3.2.1, p.6)
2. discard a state for which either tool finds a counterexample (Algorithm 1, lines 18 to 19)
3. detect duplicates: “Additionally, we adapt the tool SolveDirect [28] to detect potentially duplicate proof states.” (Section 3.2.1, p.6) Two states are each stated as a theorem and the tool is applied in both directions; if each is solved directly from the other they are treated as equivalent
4. rank what remains by the score of technique 2

Verus form (Inference). A Verus proof state is not a formula one can hand to a model finder, but a candidate intermediate fact is. Before spending a Verus run on a proposed `assert(P)` or `invariant` clause, evaluate P on concrete values: on inputs from test executions for an invariant over executable variables, or through a hand-translated solver query as the ExVerus study in this collection describes. A candidate with a counterexample that satisfies the `requires` is dropped. Duplicate detection reduces to comparing normalized annotation sets, or to asking Verus whether each of two candidate assertions follows from the other. What does not carry over: QuickCheck and Nitpick are built into Isabelle and run on any goal; Verus has no built-in counterexample generator for `spec fn` terms.

evidence: one worked example, the seL4 theorem sofl_test about signed machine-word addition, for which the model proposed 8,445 candidate steps in total: “Nevertheless, our filtering reveals that 44.2% of these steps lead to duplicate proof states, and 52.3% of the remaining states are unprovable due to existing counterexamples.” (Section 3.2.1, p.6) Across the evaluation the detector found on average 1.3 counterexamples per theorem, and 11.1 per search trace among traces that had any; the paper adds that this saves search effort “although it does not directly increase the overall success rate.” (Section 4.3.4, p.11)

A second use the paper found: the finder exposes broken benchmark items. 23 of the 241 failed validation theorems (9.5%) had a search node with a real counterexample: “These cases suggest that the extracted obligation is unprovable in the active context, typically because an essential assumption is dropped when proof states are sliced from the original seL4 scripts to form the benchmark; we treat them as benchmark-side issues rather than framework failures.” (Section 5.2, p.13)

limits: by the paper's own statement the filter does not raise the success rate; its benefit is budget. No timing for the two finders is reported.

## technique 5: the hammer as a last step on the best partial states

what it is: Sledgehammer, which sends a goal with selected premises to SMT and first-order provers and rebuilds an Isabelle proof from their answer, is called only after the search has failed, and on the search's best intermediate states rather than on the original theorem.

why this placement: “Because invoking the hammer at every search step is prohibitively expensive, we only call it when tree search fails.” (Section 3.3, p.7) The search often cannot finish but reduces the goal to something the hammer can close.

how it is done: “Specifically, upon search failure, we rank all proof states in the currently expanded tree, select a small subset with the highest scores, and pass them to Sledgehammer for a final attempt at solving the goal.” (Section 3.3, p.7) Settings (Section 4.2, p.8): the 16 highest-scoring states; default premise selection, taking the 2,048 most relevant premises with MeSh; back-end solvers Z3, CVC5, E, SPASS and Vampire; 60 seconds.

Verus form (Inference). In Verus the SMT solver runs on every obligation by default, so the hammer is always on and there is no separate last step. The transferable idea is the reverse: when the default solver call fails on a goal, the cheap automation has already been tried, and the search should spend its effort on reducing the goal (case splits, intermediate `assert`s, lemma calls) until the default call succeeds. A closer analogue is switching proof mode for a residual arithmetic fact, `by (nonlinear_arith)` or `by (bit_vector)`, only after the plain attempt fails.

evidence: comparing Table 1 with Table 4, the Mistral-7B system reaches 77.6% with the hammer and 59.8% in the hammer-free search, and Qwen3-1.7B 70.4% and 57.1%. Inference: if the two tables share a denominator, which Table 4 does not state, the final hammer step accounts for about 18 and 13 percentage points. Case study C1 (Section 5.1, p.12): for the lemma same_object_as_commute the search chose a case split on one argument followed by simplification, and Sledgehammer closed each remaining constructor case with a one-line call. Case study C2: a 29-step proof of hv_inv_ex built with no hammer call, in place of the one-line composite tactic in seL4.

where it fails: on what the search leaves behind when it fails. “Sledgehammer was invoked on all 241 validation failures that still had a residual goal but closed none of them, indicating that the remaining goals lie outside the reach of off-the-shelf SMT/superposition.” (Section 5.2, p.13)

## technique 6: a prover interface built for search

what it is: a Python-facing Isabelle REPL, built on scala-isabelle and Py4J, that executes single steps, returns the full state, and exposes Sledgehammer, Nitpick and QuickCheck (Section 4.1, p.7).

what it must provide, from Section 4.1 (p.7):
1. step-by-step execution with extraction of variables and assumptions of goals, dependencies of proved theorems, and facts chosen by Sledgehammer
2. state handling: “It allows users to safely impose strict time limits on Isabelle processes, as well as to clone, restore, and switch between different proof states.” (Section 4.1, p.7)
3. caching across theories, because in seL4's CRefine theory one step takes over a minute: “To address this, we implement a caching mechanism that avoids redundant execution of unrelated theorems and proofs, significantly reducing unnecessary recomputation.” (Section 4.1, p.7)

Verus form (Inference). The equivalent requirements for a Verus search harness: verify one function at a time rather than the crate, apply a time limit per run, and keep each node's source text so that a node can be restored. Cloning a prover state has no counterpart because each Verus run starts from source.

evidence: none separate; the REPL is the substrate of every result.

## failure analysis worth reusing

Section 5.2 classifies 7.77 million logged step attempts from the 241 failed validation theorems: 30.1% advance or duplicate the state and 69.8% raise an error. Of the errors (Table 5, p.13; 5,427,419 in all): undefined fact 3,263,494 (60.1%), tactic inapplicable 976,398 (17.9%), multi-line or other 423,982 (7.8%), unknown variable 161,842 (2.9%), outer syntax error 153,037 (2.8%), type unification 110,717 (2.0%), tactic timeout 102,099 (1.8%), and six smaller categories. The paper's summary: “Together, these two patterns explain 79% of rejected tactics: the model most often cites premises absent from the active context, and otherwise produces well-formed tactics that do not fit the current goal shape.” (Section 5.2, p.12)

Inference: the lesson for a Verus agent is that grounding lemma names in what exists (by retrieval, or by constraining generation to names in scope) attacks the largest single source of wasted verifier calls.

## where the paper's arithmetic disagrees with itself

- successes plus failures exceed the stated share. Section 4.3.1 gives 2,167 proofs as 77.6% of the still valid theorems, which implies about 2,792 theorems. Section 5.2 says: “Across the three evaluation splits, 692 theorems remain unsolved (validation: 241, test: 199, test-hard: 252).” (p.12) 2,167 + 692 = 2,859, and 2,167/2,859 = 75.8%. Per split, successes over successes-plus-failures are 788/1,029 = 76.6%, 811/1,010 = 80.3% and 568/820 = 69.3%, against Table 1's 79.8, 89.0 and 69.8. The number of still valid theorems is never stated; the original split sizes are 1,115, 1,077 and 852.
- Table 1's per-split rates do not combine to its total: the counts 788, 811 and 568 at rates 79.8%, 89.0% and 69.8% imply about 987, 911 and 814 theorems, 2,712 in all, and 2,167/2,712 = 79.9%, not 77.6%.
- time. The method comparison says: “The time limit for all methods is set to 120 minutes, as we observed no noticeable improvement when increasing it further.” (Section 4.3.1, p.8) Yet: “We also record the time consumption of our framework as a reference; the average time to generate a successful proof is 139.1 minutes.” (Section 4.3.2, p.9) and 80.8% of theorems are proved within 2 hours, so about a fifth of the successful proofs took longer than the stated limit.
- the 71.1% effort saving. It is a simulation in which a prefix of the human proof is supplied, not a measurement with people. Inference: putting the ten completion rates printed in Figure 5 (77.61 at prefix 0% rising to 86.03 at 90%, as read from the figure's extracted labels) into the formula printed for η gives about 6.2 percentage points, and the complementary sum with weights one minus the prefix ratio gives about 79.8; neither is 71.1. The text also glosses 71.1% as “roughly two-thirds”.
- Table 6's rows (11, 6, 109, 181, 145) sum to 452; its total row says 451.
- Section 5.2 says the errors fall into 12 categories and that each remaining category is under 3%; Table 5 lists 13, and its multi-line or other category is 7.8%. Table 5's caption calls 60.1% “nearly two-thirds”.
- Table 1's improvement for Qwen3-1.7B in the total column is printed as 30.0; 70.4 − 40.3 is 30.1.
- Table 2 (p.9) gives 6,235 proof lines, 36.2% coverage, for the paper's system without saying which model; Sledgehammer is 2,581 lines, 15.0%. The text calls this more than a one-fold improvement; the ratio is 2.4.
- generalization. Figure 7's bar values cannot be assigned to methods from the extracted text. The text gives one figure: on X86 Semantics (86 theorems) a success rate 32.5% higher than the baselines, which matches 65.1 against 32.6 among the printed values, a difference in percentage points; and an average relative improvement of 36.9% on the other three benchmarks, which the paper calls hammer-friendly.

## what was already done, and threat

Already done, so not to be rebuilt as research: step-level fine-tuning from replayed proofs; best-first search with length-normalized cumulative log probability (the paper takes the normalization from its reference [18], BFS-Prover); edit-distance repair of hallucinated lemma names; counterexample pruning of intermediate goals; hammer-on-leaves. The paper also places itself against code-verification provers: “However, these approaches remain limited to textbook-scale problems and do not address the challenges of real-world system-level verification projects such as seL4.” (Section 6.2, p.13)

Inference: threat to a product of agent-written verified Rust is indirect and moderate. The paper does not write code or specifications and works in Isabelle. What it shows is that a 7-billion-parameter model fine-tuned on one project's proofs, wrapped in search and symbolic repair, beats a hosted frontier-class model in the same harness (70.0% against 52.0% on 200 theorems, Table 3) at far lower cost per theorem. A competitor with a large private corpus of Verus proofs could apply the same recipe. The dependence on an existing corpus of about 26,000 proved theorems in the target library is the barrier, and Verus has no public corpus of that size.

## techniques for the catalog

- state and step pairs by replay: replay each existing proof in the prover, record the state before every step, and fine-tune a small model to predict the next step from the state alone
- best-first proof-state search with length-normalized log probability: expand the highest-scoring states, score a state by the sum of its steps' log probabilities divided by path length to the power α
- tactic repair: take the premises cited in a rejected step and recombine them with a short list of the corpus's most frequent tactics
- premise repair by edit distance: on an undefined-fact error, substitute the nearest existing fact names among a relevance-filtered set of 128
- counterexample filtering of proof states: run a random tester and a finite model finder on each new state and drop refuted states
- duplicate-state detection by mutual direct solving: treat two states as the same when each is solved directly from the other
- hammer on the best partial states: after search fails, give the 16 highest-scoring intermediate states to the automated prover for 60 seconds each
- counterexamples as benchmark audit: a real counterexample at a search node marks a benchmark item whose extraction dropped an assumption
- rejected-step error census: classify every rejected step by prover error to find where the budget goes; here 60.1% were nonexistent facts
- search-ready prover interface: per-step execution with time limits, state clone and restore, and caching that skips unrelated theories
