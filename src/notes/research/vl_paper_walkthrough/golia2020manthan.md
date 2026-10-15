# Manthan: A Data Driven Approach for Boolean Function Synthesis
(authored by agents unless marked 🧑)

Tag: `golia2020manthan`, [paper](http://arxiv.org/abs/2005.06922v1)

## what the paper proves or measures

Manthan synthesizes Boolean Skolem functions for a specification `∃Y F(X,Y)`. A returned vector `Ψ(X)` must satisfy `∃Y F(X,Y) ≡ F(X,Ψ(X))`. The abstract says: “Manthan views functional synthesis as a classification problem, relying on advances in constrained sampling for data generation, and advances in automated reasoning for a novel proof-guided refinement and provable verification.” (Abstract, p. 1.) Its pipeline is Preprocess, LearnSkF, and Refine (Section 4, p. 6). The final SAT check is decisive: the error formula is unsatisfiable exactly when the candidate is a Skolem vector (Theorem 1, pp. 4, 8).

The evaluation uses 609 benchmarks, one CPU core per tool, a 7,200-second timeout, and a 4 GB-per-core memory limit on E5-2690 v3 nodes with 24 cores and 96 GB RAM (Section 6, p. 15). Manthan solves 356/609; the best competing tool, CADET, solves 280/609 (Table 1, p. 16). It solves 60 instances that none of the compared tools solve (Abstract, p. 1; Section 6.1, p. 16). These are benchmark counts, not a proof that learning always helps.

## technique 1: unate preprocessing

what it is: detect output variables whose constant value is already a valid Skolem function. A variable `yi` is positive unate when `F|yi=0 ∧ ¬F|yi=1` is unsatisfiable; it is negative unate when `F|yi=1 ∧ ¬F|yi=0` is unsatisfiable (Section 2, p. 4). Theorem 2 states that positive and negative unates can use constants 1 and 0.

when to use: run it before machine learning to remove easy outputs and simplify the specification.

how to do it (Algorithm 2, p. 10):
1. for each `yj`, SAT-check the positive-unate formula
2. if UNSAT, add `yj` to `U`, substitute `yj=1`, and set `ψj=1`
3. otherwise SAT-check the negative-unate formula
4. if UNSAT, add `yj` to `U`, substitute `yj=0`, and set `ψj=0`
5. pass the reduced formula and partial vector to learning

The paper's example finds `y3` positive unate because it appears only positively and sets `ψ3=1` (Section 5.1, p. 14).

Verus form (Inference: this is a transfer from SAT synthesis): represent a Boolean output and its specification as `spec fn`; prove a constant case with a `proof fn` whose `ensures` states the specification equivalence, then use that lemma before generating code. Verus does not provide the paper's SAT substitutions or symbolic Skolem-vector API, so a tool around Verus would perform this preprocessing externally and emit Rust contracts. Inference: the useful artifact for VL is the precomputed constant contract, not a runtime branch.

evidence and limits: in the full benchmark table, Preprocess solves 66 instances for both BiasGen and AdaBiasGen (Table 3, p. 18). Unateness is a sufficient syntactic/semantic condition; variables that are not unate still may have simple functions.

## technique 2: adaptive weighted constrained sampling

what it is: sample satisfying assignments of `F(X,Y)` while weighting output literals to make a compact classifier learnable. `X` is the feature set and `Y` is the label set, even though the relation may assign multiple valid labels to one `X` (Sections 1–2, pp. 2–4). The authors write: “we propose a novel idea of collecting samples with weighted sampling” (Section 4.2, p. 8).

when to use: use it when uniform satisfying assignments would hide a simple output rule or produce an imbalanced training set.

how to do it (Algorithm 3, p. 11):
1. generate 500 samples with `Bias(0.5,0.9)` and 500 with `Bias(0.5,0.1)`
2. for each `yj`, compute `mj = count(yj=1)/500` and `nj = count(yj=0)/500` on the first set
3. choose `qj=mj` when both ratios lie strictly between 0.35 and 0.65; otherwise choose `qj=0.9`
4. call `AdaBiasGen(F,0.5,q)` to obtain the training set

For `F=(x1∨x2∨y1)`, the paper explains why uniform sampling obscures the useful rule that `y1` is 0 except when `x1=x2=0` (Section 4.2, p. 8). In the implementation, sample count is selected from `|Y|`: 10,000 when `|Y|<1200`, 5,000 for `1200<|Y|≤4000`, and 1,000 above 4,000 (Section 6.3, p. 19).

Verus form (Inference): use an external synthesizer to generate candidate examples, then encode the learned relation as a Verus `spec fn` and verify it with `requires`/`ensures`. A Verus proof cannot treat sampled data as proof; it must retain a complete specification check analogous to the error formula. The paper's probability weights and sampler implementations do not carry over into Rust verification itself.

evidence and limits: AdaBiasGen solves 356/609 overall, versus 345/609 for BiasGen, 275/609 for QuickSampler, and 271/609 for CryptoMiniSat in the phase table (Table 3, p. 18). KUS and UniGen2 produced samples for only 14 and 49 benchmarks within their 3,600-second sampling timeout and were omitted (Section 6.2, p. 18). The authors call their adaptive scheme a proof of concept; sampling quality and hyperparameters remain empirical assumptions.

## technique 3: dependency-aware decision-tree candidates

what it is: learn one binary decision tree per output, then compile paths ending in label 1 into a Boolean formula. The feature set contains all `X` and only those `Y` variables that are not dependent on the current `yj`. A partial order prevents cyclic dependencies, and a linear extension `TotalOrder` determines substitution order (Sections 4.2 and 5, pp. 7, 9–12).

how to do it (Algorithm 4, p. 12):
1. start `featset` with `X`
2. add `yk` when `yj` is not in `dk`, the dependency set for `yk`
3. train an ID3 decision tree using Gini impurity and the sampled labels for `yj`
4. for each leaf labeled 1, turn the root-to-leaf path into a conjunction and disjoin it into `ψj`
5. update transitive dependency sets and continue through all outputs
6. find a valid linear extension of the dependency relation

The worked example learns `ψ1=(¬x1∧x2)∨x1` and `ψ2=x1` from the tree paths (Section 5.1, p. 14). The paper reports that candidate trees can underfit when shallow and that high dependencies can help Manthan solve instances competitors miss (Section 6.1, pp. 17–18).

Verus form (Inference): a Rust-side generator can emit a `spec fn` for each decision-tree formula and a `proof fn` stating its contract, while executable code remains separate. Dependency order can guide declaration and lemma order, but Verus's ownership and module rules replace the paper's `Y`-variable graph. Candidate acceptance still requires the complete final proof; a tree's training accuracy is not a Verus guarantee.

evidence and limits: Figure 6 and Section 6.3 show that increasing samples raises candidate-learning time without a comparable solved-count gain; too-high impurity decrease underfits and too-low values overfit (p. 19). This phase therefore supplies an approximate candidate, not correctness.

## technique 4: error-formula verification and counterexample refinement

what it is: verify a candidate vector with `E(X,Y,Y') = F(X,Y) ∧ ¬F(X,Y') ∧ (Y'↔Ψ)`. UNSAT proves the candidate; SAT returns counterexample `σ` for repair (Sections 2 and 4.3, pp. 4, 8).

how to do it (Algorithms 1 and 5, pp. 10, 13–14):
1. construct `E` and call SAT
2. if UNSAT, substitute dependent `ψi` functions until every result depends only on `X` and return
3. if SAT, use partial MaxSAT with `F(X,Y)∧(X↔σ[X])` hard and `(Y↔σ[Y'])` soft to localize output functions whose values should change
4. for each suspected `yk`, build `Gk` with the fixed counterexample inputs and later variables in `TotalOrder`
5. if `Gk` is UNSAT, extract an unsat core, conjoin its literals into repair `β`, and update `ψk` by `ψk∧¬β` or `ψk∨β` according to the required output
6. if `Gk` is SAT, add later outputs whose values differ in the model to the repair list
7. repeat the global error check until UNSAT

In the worked repair, `σ` exposes `ψ1=x1` as wrong; the unsat core returns `x2`, and the update makes `ψ1=x1∨x2`, after which `E` is UNSAT (Section 5.1, pp. 14–15). The paper emphasizes that MaxSAT keeps most current outputs unchanged while repairing a small set (Section 4.3, p. 8). The abstract reports: “On an extensive and rigorous evaluation over 609 benchmarks, we demonstrate that Manthan significantly improves upon the current state of the art, solving 356 benchmarks in comparison to 280, which is the most solved by a state of the art technique.” (Abstract, p. 1).

Verus form (Inference): this maps to a proof-producing outer loop: a tool proposes a Rust `spec fn` candidate, Verus checks its `requires`/`ensures`, and failed obligations provide counterexamples or diagnostics for an agent repair. Encode the error relation as a ghost `spec fn` and require an `ensures` equivalence; use `assert` and `proof fn` lemmas for unsat-core-like local facts. Verus does not expose MaxSAT unsat cores as a language construct, so this localization remains an external search heuristic. Never treat a sampled counterexample as complete evidence without rerunning Verus.

evidence and limits: removing MaxSAT localization drops solved instances to 204/609 (Section 6.5, p. 20), compared with 356/609 for full Manthan. Self-substitution is a fallback when a candidate exceeds a threshold of 10 refinements: 75 of 356 solved instances used it, and 51 of those needed substitution for one variable (Section 6.6, pp. 20–21). Table 4 gives five examples: refinements fall from 319 to 10 and time from 35.88 s to 19.22 s for `kenflashpo2-all-bit`; from 741 to 10 and 184.11 s to 115.07 s for `pdtpmssfeistel` (p. 22). Self-substitution can cause exponential formula growth, so the fallback is not universally safe.

## trusted boundary, contradictions, and product threat

The final error-formula check, SAT/MaxSAT/PicoSAT results, and Boolean-function representation are the paper's correctness boundary. Training samples, ID3 choices, impurity threshold 0.005, refinement threshold 10, and the unsat-core repair heuristic are search assumptions. The benchmark evidence uses 609 instances and the listed hardware/settings; it does not establish general performance. Table 1's “All Tools” count is 476/609, while individual tool counts are not additive because instances overlap (Table 1, p. 16).

Inference: VL should reuse candidate generation followed by an independent verifier check, counterexample-guided repair, dependency ordering, and a fallback for poorly learned functions. VL should not redo the already demonstrated 609-instance comparison or assume model-generated proof text is evidence. Inference: threat to agent-written verified Rust is moderate for candidate search but high for specification drift: a Verus proof of an incorrectly synthesized contract can pass while missing the intended behavior. The paper's final UNSAT-style check is the part that directly protects against approximate learning.

## techniques for the catalog

- unate preprocessing — replace positive/negative unate outputs with constants after SAT checks
- adaptive weighted sampling — bias satisfying assignments to expose compact output rules
- dependency-aware tree synthesis — learn binary trees in an acyclic output order and compile positive paths into Boolean functions
- error-formula verification — prove a candidate by checking UNSAT of a specification/candidate error relation
- MaxSAT fault localization — preserve most outputs while identifying the few functions to repair from a counterexample
- unsat-core repair — derive a literal conjunction from an infeasibility core and update the faulty candidate
- self-substitution fallback — replace poorly learned variables by recursive formula substitution after a refinement threshold

Checked 2026-10-15 against the paper by a Codex agent for manthan_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
