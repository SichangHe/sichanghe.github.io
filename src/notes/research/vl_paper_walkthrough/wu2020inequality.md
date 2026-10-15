# INT: An Inequality Benchmark for Evaluating Generalization in Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wu2020inequality`, [paper](https://doi.org/10)

## what INT contributes

Wu, Jiang, Ba, and Grosse introduce INT, a synthetic benchmark and lightweight proof assistant for testing whether learning-assisted theorem provers generalize beyond their training distribution. The benchmark is built from ordered-field axioms and can generate theoretically unlimited equality and inequality theorems. The abstract says, “INT is based on a theorem generator, which provides theoretically infinite data and allows us to measure 6 different types of generalization.” (abstract, PDF p. 1.) The six dimensions are initial conditions, axiom orders, axiom combinations, number of unique axioms, proof length, and ordinary IID sampling (Sections 3.1 and 4.3, PDF pp. 3, 6–8).

The paper is not a Verus system and does not prove Rust programs. Inference: its transferable contribution is an evaluation method for a learned proof proposer: generate controlled out-of-distribution (OOD) theorem families, separate proposal architecture from proof checking, and use search at test time. The results expose a product risk: high IID success can hide severe OOD failure.

## technique 1: a small trusted proof assistant with two interfaces

What it is. A problem contains a goal and premises. The proof state stores the goal and proven facts. An action is an axiom plus argument positions; applying it adds conclusions or makes unproven assumptions the new goal. The assistant accepts a proof when the goal becomes empty or trivial (Section 3.2, PDF p. 3). It exposes a sequence interface analogous to Lean's rewrite tactic and a graph interface in which axiom arguments are chosen from computation-graph nodes (Figure 1 and Section 3.2, PDF p. 3).

How to apply it.

1. Initialize the proof state with the theorem goal and premises (Section 3.2, PDF p. 3).
2. At each step choose an axiom and arguments in the sequence or graph representation.
3. Apply the axiom as an implication from assumptions to conclusions; add conclusions already justified by proven facts.
4. Replace the goal with any unproven assumptions, and stop when the goal is trivial (Section 3.2, PDF p. 3).
5. Keep the core checker small. INT reports a trusted core of fewer than 200 lines (Section 3.2, PDF p. 3).

The authors benchmark 10,000 proof steps averaging 40 characters: HOL Light takes 7.96 ms per step and INT 1.28 ms, a 6.2× speedup (Section 3.2, PDF p. 3). The denominator is 10,000 steps in each assistant, not complete theorems. Inference: for VeruLaw, the analogous separation is a fast candidate-action environment plus Verus as the independent final checker. A Verus implementation would represent proof state as ghost data and require each transition to preserve a theorem contract; the paper's checker is not a Verus proof.

## technique 2: controllable theorem generation by morphing a core statement

What it is. INT avoids random axiom applications that often produce short, trivial proofs. Its generator starts from an initial identity and applies a chosen axiom order. For each axiom, `MORPH` returns a new core statement and premises, with an implication from the prior core, the axiom, and premises to the new core (Section 3.3, PDF p. 4). Algorithm 1 is:

1. choose axiom-order length `L` and sample an initial condition `C0`
2. initialize premises `P={C0}`
3. for each axiom `a_t`, compute `(C_t,P_t)=MORPH(a_t,C_{t-1})`
4. union `P_t` into P and return `C_L,P` (Algorithm 1, PDF p. 4)

The worked order `[AdditionAssociativity, AdditionCommutativity, EquivalenceImpliesDoubleInequality, FirstPrincipleOfInequality]` yields, in four steps, the theorem “Given d ≥ e, prove a + (b + c) + d ≥ b + a + c + e.” (worked example, PDF p. 4). The generated proof has exactly the chosen axiom-order length by construction (Section 3.3, PDF p. 4).

When to use it. Use production rules when a benchmark must vary proof structure independently of surface size and must provide a known proof for behavior cloning. Tune the initial-condition degree, axiom order, axiom combination, and proof length to create controlled OOD tests.

Verus form (inference). Generate Rust/Verus proof tasks by applying verified rewrite lemmas to a trivial specification, recording each lemma and its required premises. Each generated task should be checked by Verus before entering training. The generator itself can be an executable Rust tool with a spec function describing that each morph step preserves implication; this is an inference and is outside INT's implementation.

## technique 3: behavior-cloning baselines with sequence and graph models

What it is. The authors train four baselines: character-level Transformer, graph-isomorphism network (GIN), bidirectional TreeLSTM, and bag of words. The Transformer uses six encoder and six decoder layers, 512 embeddings, eight heads, 2048 feed-forward width, dropout 0.1, label smoothing 0.1, and a 2048-token batch cap (Section 4.2, PDF p. 5). The GIN uses six layers with 512-dimensional hidden states; graph representations sum node embeddings, then an MLP proposes axioms and autoregressively chooses arguments (Section 4.2, PDF p. 6).

How to apply it.

1. Generate online training theorems and their recorded proofs.
2. Train by behavior cloning on each action sequence; keep a fixed test set of 1,000 problems per distribution (Section 4.1, PDF p. 5).
3. Train 10 epochs on each batch of 1,000 and repeat for 1,500 iterations, producing 1.5 million generated problems (Section 4.1, PDF p. 5).
4. Use Adam, learning rate `10^-4`, one P100 or T4 GPU, and two random seeds; the paper selects the seed with higher validation success for test evaluation (Section 4.1, PDF p. 5).
5. Measure complete-proof success, not token-level accuracy.

The structural baselines matter: bag of words proves no more than 5% of test problems in Figure 3, while Transformer and GNN are strongest (Section 4.2, PDF p. 6). Inference: for VL, compare a text model against a graph/state model so architecture claims are not confused with interface constraints. A Verus-backed system must count only proofs that the verifier accepts.

## technique 4: six-dimensional generalization testing

The benchmark's key method is to change one generating dimension while holding others fixed.

IID. Train and test from the same distribution. The largest train-test gap is 2% (K3L7), and Transformers complete 15.3% more test proofs than GNNs on average (Section 4.3, PDF p. 6). This is a baseline, not evidence of OOD robustness.

Initial conditions. Train on degree-0 entities and test on degree-1 and degree-2 expressions. Transformer success drops 25.6% and 31.5% on average for degree 1 and 2; GNN's largest gap is 3% (Section 4.3, PDF p. 6). The degree is the number of arithmetic operators in the initial entity (Section 3.1, PDF p. 3).

Axiom orders. Train on 100, 500, 2,000, or 5,000 orders and test on 1,000 unseen orders. Table 1 reports Transformer test success of 10.0%, 62.8%, 87.9%, and 91.8%, respectively; GNN reports 21.1%, 53.6%, 70.4%, and 74.7% (Table 1, PDF p. 6). Each percentage is an average success rate over the paper's K/L settings, with 1,000 unseen test theorems per setting; the table's train/test columns are percentages, not counts.

Axiom combinations. Train on 25, 100, 200, or 300 combinations and test on 300 unseen combinations. With 25 combinations, Transformer and GNN test success are 29.3% and 47.5%; with 300 they are 91.3% and 71.9% (Table 1, PDF p. 6). The text reports a 66.8% versus 31.6% generalization gap at 25 combinations and says Transformers become 3.8–19.6 percentage points better once training has more than 100 combinations (Section 4.3, PDF p. 7). Inference: percentages are not directly comparable across dimensions because each uses a different generated distribution.

Number of axioms. Train at one K and test at K shifted by one. Transformer success drops 5.6% on average and GNN 5.1% (Section 4.3, PDF p. 7). Proof length. With K=3 and L in {3,5,7}, all agents decline as L grows. Agents trained on K3L3 lose 18.8% when L increases by one; K3L7 agents lose 5.7% (Section 4.3, PDF p. 7). These are percentage-point changes as described in prose; the paper does not provide denominators beyond the 1,000-problem test sets.

Verus form (inference). Build a VL benchmark with controlled changes in API shape, invariant complexity, lemma order, number of required lemmas, and proof length. Keep the Verus specification and checker fixed, and report success over a clearly stated number of tasks and model seeds. This prevents a model that memorizes common lemma sequences from being mistaken for a general proof agent.

## technique 5: MCTS at test time

What it is. INT adds Monte Carlo Tree Search to a GNN behavior-cloning policy. The full action space can reach 1.3 million actions, so MCTS branches only over 18 axioms; the policy proposes arguments. A value MLP is trained on 1,000 rollout episodes, and each tree uses 200 simulations (Section 4.4, PDF p. 8). The method follows AlphaZero-style upper-confidence bounds and visit-count action selection.

How to apply it.

1. Train a behavior-cloning policy and a value network on rollout states (Section 4.4, PDF p. 8).
2. At each proof state, expand only the finite axiom choices.
3. Ask the policy for arguments for each selected axiom.
4. Run 200 simulations, use the value network to score leaves, and choose by visit counts with an upper-confidence rule (Section 4.4, PDF p. 8).
5. Execute the selected action in the proof assistant and repeat until solved or the step limit is reached.

Table 2 reports averages over 1,000 test theorems. For agents trained on K3L7, search raises success from 69% to 90%; across K3L3, K3L5, and K3L7 evaluations, the corresponding average rises are 56→67%, 78→89%, and 69→90% (Table 2, PDF p. 8). For K3L7 evaluation, the K3L3 agent rises 25→40%, a relative increase of 60% (Section 4.4, PDF p. 8). Unsolved problems count as length 15, the episode step limit; therefore average proof lengths include this penalty (Table 2, PDF p. 8).

Inference: MCTS maps directly to a VL strategy that searches over lemma choices while an LLM proposes arguments, but every transition must be checked by Verus. Search improves completion but increases verifier calls and does not repair a wrong specification.

## what is proved, measured, and trusted

INT's trusted core has fewer than 200 lines, and the authors report a 6.2× simulation speedup against HOL Light for 10,000 isolated steps (Section 3.2, PDF p. 3). The generator supplies proofs by construction, but the neural agents are evaluated only on synthetic ordered-field algebra. The paper itself cautions that “proving theorems in INT is not an end in itself” and recommends using INT with real mathematical datasets (Conclusion, PDF p. 9). The trusted boundary includes the generator's production rules, axiomization, proof assistant core, model implementation, random seeds, and the policy for choosing the higher-validation seed. No result establishes soundness for Rust, Verus, concurrency, memory safety, or industrial specifications.

Inference: the product threat is medium for evaluation quality rather than direct implementation. A VL agent can score highly on IID theorem families while failing unseen invariant shapes, lemma combinations, or longer proofs. INT's controlled dimensions should be used as regression tests before claiming general formal-verification competence. VL should not redo INT's synthetic ordered-field generator or its Transformer/GNN baseline; it should adapt the six-axis methodology to verified Rust and report verifier-accepted proofs with denominators, model, and setting.

## techniques for the catalog

- lightweight proof-state environment — keep a small trusted checker with sequence and graph action interfaces
- morphing theorem generator — apply a chosen axiom order to a core statement and accumulate premises
- behavior-cloning proof policy — train sequence and graph models from recorded generated proofs
- six-axis OOD evaluation — vary initial condition, axiom order, combination, count, length, and IID distribution separately
- axiom-space MCTS — search a small axiom branch space while a policy proposes concrete arguments
- verifier-backed success accounting — count complete proofs and state denominators, step limits, and unsolved penalties
Checked 2026-10-15 against paper wu2020inequality: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
