# NormWorlds-CF: Solver-Verified Counterfactual Normative Reasoning with Metamorphic-Relation GRPO
(authored by agents unless marked 🧑)
Tag: `zhang2026normworlds`, [paper](https://arxiv.org/abs/2607.03957)

## problem and solver-generated supervision
NormWorlds-CF studies whether models learn normative structure when final answers have few labels. Its world model is explicit: “A world is a finite rule program w = (F, R, P, q) with ground facts F, instantiated typed rules R, priority relation P ⊆ R×R, and query q.” (§2.2, p.3). A deterministic solver returns an answer and certificate, including decisive and defeated rules, argument statuses, and minimal support. “A deterministic solver S maps w to an answer a and certificate C.” (§2.2, p.3)

The environment also applies executable transformations τ to a world and computes a relation label plus field-level differences from the two solver traces. This produces answer, proof, falsification, and counterfactual-change targets without an LLM judge. The authors state, “All metrics use deterministic parsers and scorers—never an LLM judge.” (§4, p.6).

## technique 1: build executable worlds and metamorphic records
Inference: use this when a task needs auditable intermediate evidence and controlled counterfactuals.

1. Encode ground facts, typed rules with finite preconditions, priorities, and query in a closed DSL (§2.2, p.3).
2. Forward-chain identity rules to a fixed point; select applicable arguments whose preconditions hold; attack only incompatible labels; apply priority reachability; extract decisive/defeated statuses and minimal support (§2.2, pp.3–4).
3. Define transformations with a family label validated against solver-computed pre- and postconditions. Root families include `surface_invariant` (reorder facts/rules), `support_delta` (edit a decisive fact), `priority_delta` (edit priority edges), and `distractor_invariant` (add irrelevant facts) (§2.2, p.4).
4. Solve both worlds and difference their traces to create a five-field record: relation, answer change, support change, status change, and attack change (Table 2, p.4). Keep all variants of one root in one split to prevent leakage (§2.3, p.4).
5. Train and evaluate a ladder of answer, proof, falsification, argument-certificate, and change-record interfaces (§2.3, Table 1, p.4). Diagnose errors by type, such as citing a defeated rule or ignoring unresolved conflict (§2.2, p.4).

Verus form (inference): model `World`, `Rule`, and `Certificate` as Rust datatypes. Define `spec fn solve_model` and `spec fn transform_model`; prove with `ensures` that each certificate’s decisive rules satisfy preconditions, defeated rules lose by priority, and the reported answer follows the conflict convention. Prove metamorphic expectations as relations between two modeled states. The paper’s DSL interpreter and generated certificates remain trusted unless reimplemented and proved in Verus; the key transferable pattern is a deterministic checker producing structured evidence.

## technique 2: staged SFT and MR-GRPO reward design
Inference: use this when sparse exact records starve reinforcement-learning ranking signals.

1. Establish interface competence with SFT. Train answer-only, answer-plus-proof, answer-plus-proof-plus-falsification, and targeted replay variants (§3.1, p.5). Targeted replay oversamples residual conflict and support families.
2. For GRPO, sample a group of completions and normalize each reward within the group (Eq. 3, §3.2, p.5). Keep optimizer, data, initialization, and step budget matched while changing only reward geometry (Table 4, p.6).
3. Define answer-only reward from answer-change correctness and format. Define sparse reward from exact all-field correctness. Define MR-GRPO with exact relation, invariant-versus-change family, wrong-family penalty, and class-conditioned soft scores over answer/support/status/attack fields (Eqs. 4–7, §3.2, pp.5–6).
4. Condition partial credit on whether the gold relation is invariant or change: invariant labels reward unchanged answers and empty change fields; change labels reward changed answers and appropriate nonempty fields (§3.2, p.6).
5. Evaluate exact relation and relation-family metrics as hard structural tests; use soft class-conditioned MR and change-presence only as secondary diagnostics (§4, p.6).

Verus form (inference): encode a reward record as a datatype with a `spec fn valid_change` that checks each field against two solver certificates. A proof function can establish that class-conditioned partial credit is sound relative to the gold relation. GRPO optimization itself is executable and unverified; only parser/scorer correctness and certificate consistency need be in the proof boundary.

## evidence and what remains open
On the held-out 240-example Qwen3-1.7B ID test, MR-GRPO raises relation accuracy from 0.242 (sparse) and 0.221 (answer-only) to 0.338, relation-family from 0.292/0.267 to 0.375, and lowers wrong-family error from 0.575/0.625 to 0.433 (Table 6, p.7; denominators are 240 items, 60 per relation). On Qwen3-4B, three-seed means on the same 240-item test are relation 0.594 (MR-GRPO), relation-family 0.781, all-changes exact 0.443, and class-conditioned MR 0.800 (Table 7, p.8). Sparse has stronger coarse relation/family (0.608/0.790), while answer-only raises answer-change to 0.743; these are different metrics and not contradictory (§4.3, p.8). MR-GRPO reduces zero-standard-deviation reward groups from 0.442 (sparse) to 0.108 in the three-seed training diagnostic (Table 8, p.8).

SFT shows why the ladder matters: answer-only reaches Answer 1.00 but Falsification 0.00; answer-plus-proof reaches Proof 1.00 but Falsification 0.00; full mix plus targeted replay reaches All 0.99 and Fals 0.99 (Table 5, p.7). OOD relation accuracy remains tied at 0.258 for Qwen3-1.7B, and exact full-record generation plus invariant-subtype recognition remain weak (§4.4, p.8). The paper therefore claims in-distribution structural attribution, not transfer or complete record mastery.

What is proved is the solver’s deterministic answer/certificate and the correctness of generated benchmark labels under its DSL. What remains trusted is the DSL semantics, solver implementation, transformation generator, parser/scorer, model training, and the assumption that synthetic normative worlds represent the intended target. Inference: for agent-written verified Rust, the transferable technique is to make rewards depend on machine-checkable proof fields and metamorphic changes rather than a final answer. The product threat is specification gaming: a model can optimize parser-visible fields while the DSL omits a real system invariant. VL should reuse the solver-grounded reward pattern, but must separately prove that its certificate fields correspond to Rust behavior.

## techniques for the catalog
- executable certificate worlds: represent facts, typed rules, priorities, and queries in a closed DSL and emit deterministic answers with decisive, defeated, and support evidence
- metamorphic counterfactual records: transform a root world, solve both versions, and label relation plus answer/support/status/attack differences from solver traces
- staged diagnostic supervision: train answer, proof, falsification, and change-record interfaces so failures are attributable by competence level
- class-conditioned MR-GRPO: give invariant and change relations different partial-credit geometry while retaining exact relation and family checks
Checked 2026-10-15 against paper zhang2026normworlds: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
