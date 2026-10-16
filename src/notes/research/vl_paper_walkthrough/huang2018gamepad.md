# GamePad: A Learning Environment for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `huang2018gamepad`, [paper](https://arxiv.org/abs/1806.00608)

## what the paper builds

GamePad is an instrumented Coq environment for turning interactive proofs into machine-learning data and actions. The paper states: “We introduce a system called GamePad1 that exposes parts of the Coq ITP to enable machine learning tasks and explore a few use cases.” (section 1, page 2). A proof state is a goal plus a typed context; tactics transition it, possibly into several child states, and a completed proof is a tree whose leaves are trivially true goals. This game view is the common substrate for all techniques below.

## technique: trusted proof-trace extraction

Use this when training on existing interactive proofs and you need every intermediate state, rather than only the final script.

1. patch the Ltac interpreter in Coq 8.6.1 to log intermediate states. The paper says: “We obtain the proof trace by implementing a patch to Coq (version 8.6.1) that instruments the Coq Ltac interpreter to log the intermediate proof states.” (section 3, page 3)
2. preserve the checker: the patch also supports SSReflect but does not modify the kernel proof checker. Exact evidence: “Importantly, the patch does not touch the Coq proof checker, and hence, does not affect the critical part of the system that verifies the correctness of proofs.” (section 3, page 3)
3. record both granularities: split sequenced tactics at `;` into primitive steps while retaining the script-level step ending at `.`. This exposes the fine state sequence and its mapping to the human script (section 3, page 3).
4. export each trace as Python structures for terms, contexts, states, steps and trees; use the thin `coqtop` wrapper to parse states and send tactics (section 3, page 3).

Inference: in Verus, an analogous extractor should observe verifier inputs and generated proof obligations at a wrapper boundary, while leaving the Verus verifier binary and its kernel-equivalent checking path unchanged. Rust syntax, ownership facts and `requires`/`ensures` clauses replace Coq terms; the trace must retain obligation splitting and source-level proof-step boundaries. This is an engineering transfer, not a claim made by the paper.

Evidence is architectural rather than an accuracy result: the trace representation includes “all the proof states encountered in a proof, the steps taken, and expression abstract syntax trees (ASTs).” (section 1, page 2). Trust remains in Coq's checker; the instrumented logger and Python parser are outside that checker and therefore must be treated as data-pipeline code.

## technique: position evaluation

Use this as a difficulty signal for search ordering, curriculum construction, or progress feedback. Define a predictor (P_T:PS\rightarrow\{1,\ldots,K\}) for a fixed tactic policy, with labels equal to binned proof-tree sizes below each state (section 4, page 4). Steps are: collect human state/tree pairs; bin remaining tree size; train supervised examples ((s_n,d_n)); predict the bin for a new state. The paper explicitly notes that all child states must be considered when an action branches (section 4, page 4).

Inference: a Verus version can classify an obligation as near, medium or far using remaining proof commands or subobligation counts, then prioritize generated Rust edits. It should treat branch obligations conjunctively, because solving one branch does not discharge the others. This inference is not evaluated in the paper.

## technique: tactic and argument prediction

Use this to choose the next proof action from a structured state. Define (T:PS\rightarrow\mathcal T), train on state/action pairs from human traces, and choose a granularity (primitive tactic or compound script step). For argument prediction, the paper distinguishes local-context terms, global lemmas, and newly created terms; its baseline predicts local-term presence with a two-way classifier, upweights the positive cross-entropy class, and subsamples negatives (section 7.1, page 8). It groups tactics with the same mathematical operation (for example `reflexivity` and `done`) before the 23-way classifier (section 7.1, page 8).

Inference: Verus action labels could be lemma names, trigger choices, `assert` facts, or structural proof commands; local terms correspond to variables and hypotheses, while newly created terms correspond to conjectured intermediate assertions. A model must emit compilable Rust/Verus syntax and the verifier remains the acceptance oracle. The paper does not claim this mapping.

## technique: structured AST embeddings and scaling

Use this when states contain thousands of syntax nodes and raw strings lose structure. Embed each term/type, then traverse context in order because later types depend on earlier entries, and feed the sequence plus goal through another RNN (section 5, page 6). To scale, memoize an expression/subtree embedding whenever it repeats in one state; gradients accumulate through the shared computation graph. Batch identical operations dynamically across inputs. The paper reports: “The first optimization involves embedding sharing” and “The second optimization involves dynamic batching” (section 7, page 8). Table 1 gives approximate GRU-128 position-evaluation training speedups over baseline: embedding sharing 10× CPU, dynamic batching 10× CPU, both 130× CPU and 190× GPU; the denominator is the unoptimized baseline, and the table labels CPU/GPU settings (table 1, page 8).

Inference: Verus obligation ASTs can use hash-consed expression embeddings and dynamic batching across obligations, but ownership-region and quantified-trigger semantics must be encoded explicitly; syntactic similarity alone is insufficient. This is a transfer hypothesis.

## technique: end-to-end learned rewriting

Use this for a domain where a deterministic generator can provide demonstrations. The paper's algebraic task proves (\forall b\in G,X=b), with left/right identity rewrite rules. Generate proofs deterministically, extract traces, train a predictor whose class is (AST preorder position, identity law), then query the current Coq state through the lightweight API, translate the pair into a tactic, and apply it greedily (section 6.2, pages 6–7). The authors state: “We implement end-to-end proof synthesis by combining a tactic prediction model that is trained offline with GamePad’s lightweight interaction module.” (section 6.2, page 6)

Evaluation used 400 training theorems and 50 distinct length-10 test expressions; each proof has nine steps. Greedy prediction completed 14/50 proofs. Supplying one deterministic fallback step whenever a prediction failed completed 50/50, averaging one failed step per proof (section 6.2, page 7). The same test-set tactic accuracy was 95%, showing that per-step accuracy did not imply complete-proof success. The denominator and setting are explicit: 50 generated test expressions, nine steps each, and a greedy policy; the fallback result mixes learned and deterministic steps.

Inference: for Verus, the loop can propose a lemma/assertion edit, run `cargo-verus`, parse resulting obligations, and repeat, with deterministic templates as fallback. Backtracking is required for non-greedy choices; the paper explicitly says its generator did not produce proofs requiring backtracking (section 6.1, page 6).

## real-world evidence and limits

The Feit–Thompson corpus contains 1,602 lemmas and 83,478 proof states, split by lemma 8:1:1 into train/validation/test, with proof-state counts kept similar (section 7, page 7). Splitting by lemma avoids leakage from correlated states in one proof. Contexts average 60 terms and 4,000 kernel-level AST nodes (1,000 mid-level). Table 2 reports test accuracy percentages: TreeLSTM 68.44 position (kernel), 66.30 position (mid), 60.63 tactic (kernel), 60.55 tactic (mid); GRU is 65.30, 65.74, 58.23 and 57.70 respectively; argument recall is validation recall at minimum 10% precision (table 2, page 8). Models used batches of 32, hidden size 128, Adam learning rate 0.001 and TreeLSTM dropout 0.1 (section 7.1, page 8).

The paper leaves argument synthesis for `have` as future work and notes that generated terms have potentially infinite choice. It also warns that its distributions differ from program-verification corpora. Inference: agent-written verified Rust faces this harder open-ended synthesis problem and state explosion; GamePad supplies data plumbing and ranking ideas, not a complete verifier or soundness argument. What remains trusted is the underlying proof checker; learned predictors can only propose actions and cannot establish correctness.

## techniques for the catalog

- proof-trace instrumentation — patch an interactive prover's interpreter to export every state and action while leaving its checker untouched
- position evaluation — classify remaining proof-tree size to estimate difficulty and guide search
- tactic and argument prediction — learn the next action and select context terms from structured proof states
- AST embedding with sharing and batching — encode typed syntax and memoize repeated subtrees for scalable learning
- interactive learned rewriting — execute predicted (location, rule) actions through a prover API with deterministic fallback
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
