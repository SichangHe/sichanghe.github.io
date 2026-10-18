# Proving Theorems using Incremental Learning and Hindsight Experience Replay
(authored by agents unless marked 🧑)
Tag: `aygun2021proving`, [paper](https://arxiv.org/abs/2112.10664)

## scope and result
This paper trains domain-specific first-order-logic provers from unproved conjectures. Its base is a simple given-clause saturation search, augmented by a learned clause-scoring network. The paper's abstract states: “To address the sparsity and the initial lack of training data as well as the lack of a natural curriculum, we adapt hindsight experience replay to theorem proving” (abstract, p. 1). The experiments use 1,116 conjectures in 20 TPTP domains without equality, run for seven days, and compare a basic prover, incremental learning without HER, incremental learning with HER, and E.

## technique 1: given-clause search with a learned cost queue

### paper procedure
Input clauses are axioms plus negated conjecture clauses. At each iteration, select a candidate, generate its factors and resolvents with active clauses, insert the candidate into the active set, and remove clauses by forward/backward subsumption and tautology deletion. Reaching the empty clause returns a refutation; exhausting candidates returns “saturated” (section 2.1, p. 3). The implementation has three priority queues: age, increasing `tree_size`, and learned cost. The paper says: “The learned-cost queue allows us to integrate machine learning into the search algorithm, as detailed below” (section 2.1, p. 3). Actors choose a queue with average frequencies age 1/13, weight 3/13, learned cost 9/13 (Appendix D, p. 16).

### Verus form
Inference: use this as a scheduling layer for candidate Verus proof steps. Keep the proof obligation in a Verus function with `requires` and `ensures`; generate candidate `assert` chains, `proof fn` calls, and loop `invariant` clauses; score which candidate to try next. Verus does not use first-order resolution clauses as its source language, so factoring, resolution, and empty-clause refutation do not carry over. A candidate is accepted only after Verus verifies the complete function.

## technique 2: hindsight experience replay (HER) for proof search

### what it is and when to use it
Ordinary supervised clause guidance learns only from successful proofs: clauses on a found proof are positive and other generated clauses are negative. This stalls when no initial conjecture is solved. HER converts intermediate clauses from unsuccessful attempts into auxiliary goals. For a generated non-input clause D, the system treats D as a hindsight goal and trains on a refutation of the original clauses plus negated D. The paper explains: “This generates a very large number of examples, allowing us to effectively train the neural network, even with only a few conjectures at hand” (section 2.2, p. 4).

### paper procedure
1. Run the base search on an input conjecture and collect generated clauses (section 2.3 and Algorithm 1, pp. 4–5)
2. Remove input clauses; every remaining clause is eligible as a hindsight goal (Algorithm 2, p. 6). The number of examples drawn per attempt is set from an estimate of how many the learners can consume per second (section 2.3, p. 6)
3. Group goals by `tree_size`; for each size, draw `ceil(target_num_examples × w_size)` examples, with the heavy-tail weight `w_size = 1/ln(size+e) − 1/ln(size+e+1)`, which favours small clauses while keeping some large ones (Algorithm 2, p. 6; Appendix C, p. 15)
4. For each sampled goal, sample an ancestor as a positive example and a non-ancestor hindsight clause as a negative example (Algorithm 2, p. 6)
5. Add examples to a replay buffer; learners uniformly sample batches and minimize cross-entropy (Algorithm 1, p. 5)

The original HER uses only a final state, but this paper uses all intermediate clauses (footnote 3, p. 4), producing more data.

### Verus form
Inference: for a Verus obligation that is too hard to close, record intermediate proof states such as asserted facts or partially instantiated quantified lemmas, then create auxiliary subgoals from those states. Train a ranker on successful and unsuccessful proof attempts. The auxiliary state is a search target, not a new specification: the original `ensures` remains authoritative. Verus has no `resolution` or `subsumption` construct, so the adaptation is a learned ordering of proof attempts, checked by Verus after each candidate.

## technique 3: incremental distributed learning and budget scheduling

The system begins with a random clause-scoring network and no proof data. A manager repeatedly samples conjectures and a uniform budgeted scheduler gives attempts budgets 3, 6, 12, …, 3072 seconds, with restarts, “using no more than one hour” (section 2.3, p. 5). Algorithm 1 launches ten learners and 1,000 actors; actors run search, sample examples, and place them in the shared buffer. Learners train continuously. Once a conjecture is proved, its scheduler continues so shorter proofs can be found (section 2.3, p. 5).

Inference: a VL implementation could run many candidate Verus proof attempts in parallel, allocating short budgets first and retrying with longer budgets. Preserve the original contract and record each verified result; a timeout is an unknown result, not a failed proof. The paper's parallel actor/learner counts are engineering choices, not a guarantee for Rust verification throughput.

## technique 4: graph and spectral representation of clauses

The clause-scoring input includes the candidate clause x, hindsight goal g, and negated conjecture clauses. Each clause is represented as a directed acyclic graph with clause, literal, atomic-term, variable-term, and variable nodes. Node features encode source graph, node type, literal polarity, hashed symbol identity, and hashed argument slot (section 2.4, pp. 6–7). A Transformer encoder receives up to 128 nodes, with spectral positional features from the Laplacian eigenvectors of the clause graph, keeping the first 64 dimensions (low-frequency components); the root embedding is projected to one logit estimating whether x will reach g (section 2.4, p. 7).

Inference: represent a Verus proof state as a graph of goal, hypotheses, quantified terms, and candidate lemma applications, then learn a next-step score. This is a proposed transfer, not a paper result. Verus proof syntax and ownership facts need a representation that preserves their semantics; hashed symbols alone do not prove type or borrow correctness.

## evidence, boundaries, and numbers

Across the 20 domains, IL w/HER proves 949 of 1,116 conjectures; the basic prover proves 490, IL without HER 753, E at one hour 935, and E at seven days 972 (Table 1, p. 8). The paper reports 1.94 times as many problems as the basic prover, 14 more than E at one hour, and 23 fewer than E at seven days (section 3, p. 9). IL without HER fails on 198 (20.9%) of the conjectures that IL w/HER proves (section 3, p. 9). Of 941 conjectures proved by both systems, the learned system's shortest proof is shorter for 921 (97.9%), E's is shorter for 9 (0.956%), and 11 are tied (section 3, p. 9). The paper also reports that E generates clauses 25.6 times faster (section 3, p. 9). These denominators and settings matter: the comparison is first-order logic without equality, 20 selected domains, and seven-day training/search conditions.

The paper's soundness comes from resolution and factoring, which its primer says are sound and sufficient for refutation completeness (Appendix A, p. 15). The neural score is trusted only as a heuristic; the proof calculus remains the formal evidence. Inference: in VL, the corresponding evidence is a successful Verus check, while the model, replay buffer, scheduler, and graph encoder remain untrusted search machinery. External specifications, solver behavior, Rust compiler, and generated code remain outside what this paper measures.

## what VL should reuse and avoid repeating

Inference: reuse the bootstrapping idea when there are few verified examples: every partial proof attempt can supply auxiliary ranking data even when the target contract is not yet proved. Reuse budgeted restarts and continued search for shorter proofs. Do not claim that HER itself verifies Rust; its experiments are FOL clause guidance. The paper's only ablation is IL with versus without HER (section 3, p. 9); it does not isolate the contribution of heavy-tail sampling, the learned queue weights, the spectral encoding, or the distributed setup.

## techniques for the catalog

- given-clause learned queue: combine age, clause size, and a learned score to choose the next clause in saturation search
- hindsight proof replay: turn every intermediate generated clause into an auxiliary goal with ancestor positives and non-ancestor negatives
- incremental budget scheduling: retry conjectures with increasing time budgets while learners update from a shared replay buffer
- graph spectral clause encoding: encode clause graphs with typed nodes and Laplacian features for Transformer scoring

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Hash vectors are randomly sampled uniformly on the 64 dimensional unit hyper-sphere, using the name of the predicate, function or constant (and the argument position for slots) as seed."): read the whole paper text (main text and Appendices A-D) and checked every quotation, the Table 1 and section 3 numbers, the Algorithm 1/2/3 steps, the hyperparameters cited, and page references; changed the link to the arXiv page given in the paper text (arXiv:2112.10664), corrected page references (section 2.1 is on p. 3, soundness statement on p. 15, Algorithm 2 is printed on p. 6 not in Appendix B), rewrote the sampling step to match Algorithm 2, replaced an unsupported time-budget claim with the paper's wording, and replaced an overclaim about what the paper establishes; did not check the PDF layout visually, the supplementary material, or the cited related work, and the Verus-form paragraphs are inferences not tested.
