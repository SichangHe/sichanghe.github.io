# Rethinking Fine-Tuning when Scaling Test-Time Compute: Limiting Confidence Improves Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `chen2025rethinking`, [paper](https://www.semanticscholar.org/paper/603b0144faf69fb3216b843667b6f27050cccf0e)

## scope and main result

Chen, Raventós, Cheng, Ganguli, and Druckmann study supervised fine-tuning (SFT) for pass@N: sample N independent completions and accept one if an oracle verifier accepts it. They report that cross-entropy (CE) training can improve pass@1 while reducing pass@N for large N. The abstract states: “We show, surprisingly, that training with cross-entropy (CE) loss can be misaligned with pass@N in that pass@N accuracy decreases with longer training.” (Abstract, PDF p. 1.) Their explanation is overconfidence: CE concentrates probability on a few answers, while large-N search benefits from probability spread over alternatives.

The paper proposes direct confidence optimization (DCO). For one prompt and completion, it multiplies the CE gradient by a factor F(N,p̂(y|x)); for N>1, F decreases as confidence rises and reaches zero around 1/N. The paper summarizes the design as: “We propose a loss function that directly optimizes the pass@N coverage metric, demonstrating consistent improvement over the CE loss objective and achieving superior accuracy frontiers on MATH and MiniF2F (Sections 5.1 to 5.3).” (Introduction, PDF p. 2.)

## technique 1: measure the training/test mismatch with pass@N

what it is and when to use it. Define a verifier V(x,y) that returns one for a correct completion and zero otherwise. For a test set D, measure the probability that at least one of N independently sampled completions is accepted. The authors give the metric as “the probability that at least one of N is correct” (Problem setup, §3, PDF p. 3). Use this when deployment will spend a known sample budget and can automatically check candidates (for example, a compiler, unit tests, or a proof assistant).

how the paper does it. They fine-tune Llama-3-8B-base on 12,000 MATH problems and test on the remaining 500, using direct answers; they avoid the instruction model because of possible MATH leakage (Section 4.1, PDF p. 3). They evaluate after successive epochs at N=1, 16, 256, and 4k. Their finding is that pass@1 rises monotonically, whereas for N≥256 it decreases with additional epochs (Table 1, PDF p. 4). They explain the special case of one problem algebraically: C^N=1−(1−C^1)^N, so increasing C^1 increases every C^N; the failure appears when averaging heterogeneous problems (Section 4.2, PDF pp. 4–5).

evidence and limits. The denominator is the 500-problem MATH test set, with independent sampled completions; the model is Llama-3-8B-base fine-tuned on 12,000 training problems. The authors also report that the pattern holds for Llama-3-70B-base (Section 4.1). Pass@N requires an efficient, trusted verifier; the paper says its strategy “requires a verifier, restricting its applicability to problems where verification is feasible.” (Limitations, §6, PDF p. 10.)

Verus form. Inference: for Verus proof generation, use the Verus verifier as V and sample candidate Rust/proof continuations, running Verus on each candidate. Inference: record pass@N over a fixed benchmark and fixed N, while retaining pass@1 so that a higher single-sample rate is not mistaken for better search coverage. Verus itself does not provide the stochastic sampler; the Rust-side harness and candidate generation remain external.

## technique 2: direct confidence optimization (DCO)

what it is and when to use it. For a training pair (x,y), start with the CE objective and multiply the gradient by the pass@N-derived regularizer. The paper defines the confidence as p̂(y|x), derives F(N,p̂(y|x)), and uses an effective training budget N′. For N=1, F=1 and DCO is CE; for N>1, F falls with p̂ and stops reinforcing already-high confidence. Use DCO when a known pass@N verifier will be used at inference and diversity among valid candidates matters.

how it is done. (1) Choose N′ to match the intended inference budget. (2) For every batch pair, compute p̂(y|x) under the current autoregressive model. (3) Compute the paper’s F(N′,p̂) from Equation (4). (4) Apply the resulting weighted CE gradient and continue SFT. (5) Evaluate the resulting checkpoint over a range of pass@N values; no N′ is optimal for every N, so the paper traces a Pareto frontier by taking the best model for each test N (Figure 2a, PDF p. 6). The paper reports that F “decreases with p̂(y|x) and drops to zero around 1/N” (Figure 2 caption, PDF p. 6).

evidence and limits. On direct-answer MATH, DCO models improve the CE curve over a broad N range and produce a Pareto frontier (Figure 2a). The exact percentage depends on N′ and epoch; the paper presents curves rather than one universal gain. The method assumes an oracle verifier and a fixed sampling policy, and the authors leave best-of-N and non-mathematical coding tasks for future work (Limitations, PDF p. 10). Inference: a Verus deployment should report the verifier version, candidate timeout, and denominator for every pass@N number because these determine the measured coverage.

Verus form. Inference: implement the model-side objective in the training code, not as a Verus proof obligation. A generated candidate can be checked with `verus`; proof-only lemmas and executable Rust remain ordinary Verus constructs, while DCO changes only sampling-model parameters. Inference: keep the DCO training script and the Verus checker in separate trust boundaries; DCO cannot prove that a specification is the right one.

## technique 3: step-wise DCO for proof trees

what it is and when to use it. In interactive theorem proving, each tactic y[i] is checked before producing the next proof state x[i+1]. The paper first applies whole-proof DCO by replacing p̂(y|x) with the product of tactic probabilities over a successful k-step proof. It then proposes DCOstep, applying F(N_eff,p̂(y[i]|x[i])) independently at each step. N_eff acts as an approximate branching factor: small values favor narrow, deeper trees; large values favor wider, shorter trees.

how it is done. (1) Fine-tune a tactic model on LeanDojo proof states. (2) At each state, compute the selected tactic’s confidence. (3) Apply the Equation (4) regularizer with N_eff. (4) Sample tactic trees at test time, rejecting invalid tactics and stopping at success, timeout, or maximal depth. (5) Try several N_eff values and optionally ensemble their candidate sets. The proof-search protocol and stopping cases are specified in §5.3 (PDF p. 7). The authors explain the tradeoff: “Thus small N_eff limits the exploration at test time to a tree with small branching factor, but allows longer proofs with larger numbers of steps k to have higher sampling probability.” (Section 5.3, PDF p. 8).

evidence and limits. On MiniF2F with pass@4k, CE (N_eff=1) succeeds on 37.4%, whole-proof DCO on 38.7%, and DCOstep reaches 39.0% (N_eff=4) or 39.5% (N_eff=8). On Mathlib, the corresponding entries are 55.6%, 56.4%, and 56.5% (Table 2, PDF p. 8); each denominator is the named benchmark’s test set and the metric is proof success under 4,000 samples. An ensemble of all N_eff values reaches 62.2% on Mathlib and 43.6% on MiniF2F using 5×4k samples, compared with a CE model at 20k samples reaching 57.0% and 39.5% respectively (Table 2). The model, training data, and test budget are therefore part of every number. Inference: these results do not establish that DCO improves arbitrary proof assistants or that five models are cost-effective under a fixed wall-clock budget.

Verus form. Inference: represent each sampled Verus tactic or proof edit as a candidate state transition, invoke Verus after a complete candidate (or after a tool-supported intermediate check), and retain only candidates that verify. Inference: use a bounded search driver outside the verified Rust, while verified code exposes contracts and loop invariants in the usual Verus style. Do not model the neural confidence as a Verus `spec fn` unless it is genuinely part of the program specification; it is training metadata, not a runtime proof.

## technique 4: approximate DCO for chain-of-thought

what it is and when to use it. With a reasoning trace c, the final-answer probability is p̂(y|x)=Σ_c p̂(y,c|x), which is intractable to sum exactly. DCOa estimates this marginal with Monte Carlo samples and feeds the estimate into F. Use it when correctness is judged by the final answer while many traces can reach that answer.

how it is done and evidence. Sample traces, estimate the probability of each final answer, calculate F from the estimate, and train as in DCO. In CoT MATH experiments, DCOa with N′=64 has lower pass@1 than CE but higher pass@16 and pass@64; at epoch 5 the reported values are 7.8±0.1, 42.8±0.5, and 64.3±0.6 versus CE’s 9.9±0.1, 40.9±0.4, and 60.9±0.6 (Table 3, PDF p. 9). The ± values are standard errors over the reported evaluation runs. GRPO has stronger pass@1 but falls to 35.4±0.3 at pass@64 at epoch 5, illustrating overconfidence (Table 3).

Verus form. Inference: DCOa can train a generator of alternative Verus proof traces, but only the final Verus check establishes acceptance. Monte Carlo estimates and GRPO rewards stay outside the trusted Verus proof; the checker, specification, external libraries, and compiler remain trusted assumptions.

## technique 5: expert iteration with DCOstep

what it is and when to use it. Repeatedly train on model-generated successful proofs rather than only the initial LeanDojo data, while retaining the step-wise DCO branching parameter. Use this when verified proof trajectories can be harvested after each search round.

how it is done. (1) Train DCOstep on LeanDojo. (2) Search for successful proofs and collect the verified trajectories. (3) Add those trajectories in expert iteration 1 and retrain/evaluate. (4) Compare N_eff values and an ensemble under each pass budget. Appendix C.6 reports this protocol and Table 6.

evidence and limits. On the LeanDojo random test set, expert iteration 0 ensemble reaches pass@4k 62.15%; after iteration 1 it reaches 64.8%. The table’s CE baseline (N_eff=1) is 55.55% at iteration 0 and 58.55% at iteration 1; each percentage uses the same named random test set and pass budget. Inference: this gain is specific to LeanDojo and the paper’s harvesting procedure; it does not establish that generated Verus proofs improve without contamination or specification review.

Verus form. Inference: harvest only complete candidates that Verus verifies, version their dependencies, and retrain a generator on proof-state/repair traces. Keep human review for contracts and external assumptions; a passing candidate is not automatically a safe training label.

## what is proved, measured, and trusted

The paper proves analytic lemmas about the relation between confidence and pass@N under calibration assumptions, and measures benchmark coverage and proof success. Its formal theorem statements are mathematical claims about the sampling model, not proofs that any generated program is safe. The experiments trust the benchmark labels, the MATH and LeanDojo data, the verifier or proof assistant, the sampling independence assumption, and the reported model implementations. The paper notes that an error in Theorem 4.2 was corrected in the revised version (Acknowledgments, PDF p. 10), so theorem version and appendix matter.

Inference: the direct threat to VeruLaw is operational rather than a soundness break. DCO can increase the number of verifier-accepted candidates found under a fixed search budget, but it does not validate specifications, model the environment, or eliminate gaps in external-body assumptions. Existing Verus systems already provide the final checking component; this paper’s contribution is how a generator allocates probability before that check. VeruLaw should not redo the paper’s CE-versus-pass@N diagnostic or its basic branching-factor sweep unless its target workload differs materially; it should measure those quantities on its own proof corpus and verifier budget.

## techniques for the catalog

- verifier-aligned pass@N: sample N candidates and measure whether an executable verifier accepts at least one
- direct confidence optimization: multiply CE updates by a factor that suppresses confidence near 1/N
- step-wise DCO: regularize each proof-step confidence so N_eff controls proof-tree branching
- approximate DCO: estimate final-answer confidence by Monte Carlo marginalization over reasoning traces
- expert iteration: retrain DCOstep on verifier-accepted proof trajectories

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
