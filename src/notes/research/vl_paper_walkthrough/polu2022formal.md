# Formal Mathematics Statement Curriculum Learning
(authored by agents unless marked 🧑)
Tag: `polu2022formal`, [paper](http://arxiv.org/abs/2202.01344v1)

## scope and result

Polu et al. study expert iteration for Lean theorem proving. Expert iteration interleaves proof search with training on proofs found by the current model. The paper targets miniF2F, which “consists of 244 validation and 244 test formalized statements of mathematical problems from various competitions” (Section 1.1, p. 2). It tests whether auxiliary formal statements of varied difficulty, supplied without proofs, can stand in for the unsupervised curriculum that the authors say self-play provides in games (Section 1, p. 1). Its abstract states: “We show that at same compute budget, expert iteration, by which we mean proof search interleaved with learning, dramatically outperforms proof search only.” (Abstract, p. 1)

The key result is that a model can learn progressively harder statements without ground-truth proofs for those statements. The authors report that expert iteration on their full curriculum (mathlib-train, synthetic inequalities, and manually formalized statements) reaches a 47.3% pass rate on miniF2F-valid and 36.6% on miniF2F-test, both using a = 64 attempts (Section 6.3, p. 7; Table 2, p. 8). The denominators are the benchmark statements of each split, not a probability that an arbitrary theorem is proved. The paper also reports that a full expert iteration to train θ9full “required about 2000 A100 days of compute” and that one full proof search takes “about 0.1 A100 hour of compute” on average when properly parallelised (Section 7.1, p. 8).

Inference: for VL, the transferable design is a verified-data feedback loop: generate Rust/Verus proof attempts, keep accepted traces and informative failures, fine-tune or rank the next attempts, and expose a staged curriculum of statements. Lean tactics and proof states do not transfer directly to Verus ownership and solver obligations.

## technique: lean-gym proof-search interface

Inference: when to use it: use a persistent interactive environment when a search worker must apply many candidate proof actions to a formal state and retrieve the resulting state without restarting the prover.

The paper introduces lean-gym because, in the PACT setup, search was programmed in Lean, which makes it difficult to alter the search procedure and couples search to the Lean runtime, causing challenges when scaling to many parallel workers (Section 3.1, p. 2). Its API has two operations (Appendix B, p. 11):

1. `init-search` takes a declaration name and returns an initial tactic state, a fresh search identifier, and a tactic-state identifier, while setting the run-time environment at that declaration.
2. `run_tac` takes a search identifier, tactic-state identifier, and tactic string, applies the tactic, and returns a new tactic state and identifier.

The paper says, “Using lean-gym is virtually equivalent to opening a Lean editor at a specific theorem, deleting its proof and interacting with Lean to reconstruct it.” (Appendix B, p. 11) The REPL communicates over standard input/output, so a Python wrapper can be only a few dozen lines. The environment is stateful: distributed workers must track which instance belongs to each proof search. The authors report scaling to thousands of cores and thousands of concurrent searches, while noting that the blocking REPL prevents inner-proof search parallelization (Appendix B, p. 12).

Verus form: Inference: implement a worker service that accepts a Rust/Verus source snapshot plus a candidate proof edit, invokes Verus, and returns diagnostics and the resulting obligation summary. Preserve one source/dependency context per search identifier; do not mix module imports, solver settings, or generated files between branches. Inference: unlike Lean's tactic-state API, Verus often rechecks a source unit rather than exposing a stable mutable tactic state, so an adapter may need to regenerate a temporary crate for each candidate.

## technique: proofstep and proofsize objectives

The model is a 36-layer decoder-only transformer with 774 million trainable parameters. Pre-training uses 300 billion CommonCrawl tokens and 72 billion WebMath tokens (Sections 4.1–4.2, p. 3). The proofstep objective generates a tactic (PROOFSTEP) given a Lean tactic state (GOAL), conditioned on the current declaration name: `DECL <DECLARATION> GOAL <GOAL> PROOFSTEP <PROOFSTEP>` (Section 4.3.1, p. 3). The paper calls the declaration name “a weak proxy signal” for information not shown to the model (imports, open declarations, notations, instances, and the like) and notes that lean-gym errors if a tactic uses a theorem or definition not available in the environment of the current declaration.

The proofsize objective predicts one token for a bucket representing expected proof length: `DECL <DECLARATION> GOAL <GOAL> PROOFSIZE <PROOFSIZE_BUCKET_TOKEN>` (Section 4.3.2, p. 3). There are 11 buckets (0 to 10): infinite proof size goes to bucket 0, proof sizes over 20 to bucket 1, and sizes below 20 are linearly projected onto buckets 2 to 10, with 10 the bucket for the shortest proofs; the buckets are mapped to tokens `A` through `K`. To value a goal, the search samples the bucket token, records the logits for each bucket, and takes a weighted average v(g) = (1/#B) Σ p_b(g)·b, so a model that puts all mass on bucket 0 gives v = 0 and on bucket 10 gives v = 1. The paper prefers this to the outcome objective of Polu & Sutskever (2020) because “(i) it achieves better performance compared to the outcome objective (see table 1), and (ii) it prioritizes goals that potentially lead to shorter proofs during proof search”, and prefers a token to a separate value head to keep the architecture simple (Section 4.3.2, p. 3). In Table 1 the gap is small: θ1 with the outcome objective gets 55.6% pass@1 and 65.9% pass@8 on mathlib-valid versus 56.3% and 66.3%, and 28.3% and 34.7% on miniF2F-valid versus 28.5% and 35.5% (p. 4).

Verus form: Inference: encode the current Rust function signature, `requires` facts, `ensures` goal, loop invariants, and visible module context as the search state. Predict either a proof action (for example, a lemma invocation or `assert`) or a coarse bucket for expected verification effort. Inference: proof length in Verus should be measured alongside verifier time and solver calls because a short script can be expensive or unstable. Keep the final `requires`/`ensures` contract explicit; a value estimate must never be treated as evidence of correctness.

## technique: bootstrap an initial dual-objective model

Bootstrapping proceeds as follows (Section 4.4, pp. 3–4):

1. start with a WebMath-pretrained model and fine-tune it on the mathlib tactic dataset and `mix1` proof artifacts to obtain θ0, using validation splits only for early stopping
2. for each of 25,000 `mathlib-train` statements, run one cumulative-log-probability priority proof search with 512 expansions and 8 tactic samples per expansion
3. collect successful searches S0 and construct D0 from the initial tactic dataset, deduplicated proofsteps from S0, and deduplicated goal/proofsize tuples from full searches
4. the full searches in S0 include goals that were visited but remain unproved; these serve as negative examples for the proofsize objective (labelled with infinite proof size, per Section 4.3.2), whereas failed whole searches are not in S0 (minimum-proof-size deduplication for positive goals is stated for the iterated loop in Section 4.5)
5. fine-tune θ0 for exactly one epoch on D0, with no validation-based early stopping, to obtain θ1

Table 1 compares θ0 and θ1 under the same 512-expansion, 8-sample setup. On mathlib-valid, θ0 has 46.7% pass@1 and 57.5% pass@8, while θ1 has 56.3% and 66.3%; on miniF2F-valid, θ0 has 28.4% and 33.6%, while θ1 has 28.5% and 35.5% (Table 1, p. 4). The paper says the small θ0-to-θ1 gap on miniF2F-valid demonstrates “that training a value function on proofs sampled from mathlib-train has limited transfer to miniF2F-valid”. Inference: the proofsize objective helps search on in-distribution mathlib statements but does not by itself fix distribution shift.

## technique: expert iteration with global deduplication

Use expert iteration when a formal statement set can provide repeated proof-search data. The paper defines inputs as a statement set `S_t`, an attempt-count function `a`, a base model θ0, and the bootstrapped θ1 (Section 4.5, p. 4). Each iteration k is:

1. run `a(s)` best-first proof searches for each statement in `S_t` using θk, with 512 expansions and 8 tactic samples per expansion
2. filter successful searches Sk
3. extract proofsteps and proofsize tuples from all successful searches through iteration k
4. globally deduplicate proofsteps and proofsize tuples across iterations; keep the minimum proof size for each positive goal and label visited unproved goals with infinite proof size
5. concatenate the initial tactic dataset with the accumulated deduplicated data
6. fine-tune θ0 for exactly one epoch on that dataset to obtain θk+1

The paper says, “This global deduplication is somewhat equivalent for each statement to growing a unique proof tree by aggregating all the proof searches that have been run for it across iterations.” (Section 4.5, p. 4) The paper says global deduplication was important “to maintain the stability of the expert iteration procedure” but reports no ablation of it. Failed proof searches are excluded from S0 because they “would contain only negative examples and no proofstep objective data” (Section 4.4, p. 4); unproved goals inside otherwise successful searches remain useful negatives for the value function. Inference: for Verus, retain the complete source, diagnostics, solver configuration, and dependency snapshot for each accepted or failed attempt so deduplication does not merge semantically different obligations.

On mathlib-train, eight iterations improve pass@1 on mathlib-valid from 56.3% for θ1 to 62.6% for θ9; miniF2F-valid improves later in the run, showing some out-of-distribution transfer (Section 4.6, p. 5). With a = 16 evaluation attempts per iteration, the cumulative pass rate at iteration k “can be seen as a noisy ensembled pass@16k (multiple models (θk), no averaging)” (p. 5), not pass@16 from one fixed model. The number of proved mathlib-train statements goes from 17390 (67.8%) at iteration 1 to 19476 (76.0%) at iteration 9, while the average proof length goes from 4.8 to 4.0 (Section 4.6, p. 5). The paper gives the training set size as 25k; the percentages imply a denominator near 25.6k (Inference: arithmetic from the reported counts, the paper does not state it). Figure 2 compares the loop with a sample-only loop that skips retraining, and the paper says the scaling exponent of expert iteration is “substantially higher” than that of scaling test-time compute alone (p. 5).

## technique: synthetic difficulty curriculum

When ground-truth proofs are unavailable, generate formal statements with controlled difficulty. The paper's `synth-ineq` generator has two parameters: ND controls the depth of inequality composition, and NS controls the complexity of the input expressions (Section 5.1, p. 6; Appendix D calls this obfuscation). It creates 5,600 statements: 100 for each combination of 0 ≤ NS ≤ 7 and 0 ≤ ND ≤ 6. It separately generates 100 low-difficulty statements with ND = 1 and NS = 5 and manually proves them for `synth-ineq-train`.

The full generator is specified in Appendix D (pp. 12–13):

1. initialize signed seed expressions from strictly positive variables and known-sign integers
2. for NS rounds, compose expressions with operations such as logarithm, reciprocal logarithm, square root, addition, subtraction, multiplication, division, exponentiation, maximum, and minimum, retaining deduced sign constraints
3. instantiate known inequalities including AM-GM, trivial inequality, Cauchy–Schwarz, Bernoulli, Young, and Hölder using sign-compatible expressions
4. compose inequalities ND times using listed mathlib composition theorems such as `mul_le_mul`, `add_le_add`, `div_le_div`, and `mul_le_mul_of_nonneg`; one third of the time the current inequality is instead transformed by a single-argument theorem such as `neg_le_neg` or `inv_le_inv`
5. simplify generated statements so they parse in Lean and run Lean's `simp` tactic

The authors run expert iteration on the union of mathlib-train and synth-ineq with a = 1, with θ0 and θ1 also trained on synth-ineq-train, pooling results by ND over 0 ≤ NS ≤ 7 (Section 5.2, p. 6). The paper says expert iteration “is capable of closing 6 problems of difficulty ND = 6 without having been provided with any seed ground-truth proof for this difficulty level”, while the sample-only loop is “stuck at 0 for ND = 6” (Section 5.2, p. 6; Figure 3). Inference: the seed proofs exist only at ND = 1, NS = 5, so this is evidence of climbing a difficulty gradient from a small easy seed, on 6 problems out of 800 at ND = 6 (100 per NS value over 8 NS values).

Verus form: Inference: generate parameterized Rust specifications whose proof difficulty is controlled by invariant depth, aliasing structure, or composed data-structure operations. Begin with small manually verified seeds, increase one difficulty parameter at a time, and record exact statement denominators and verified rates. Inference: synthetic contracts must be checked for meaningful semantics; a model that learns generator artifacts does not demonstrate product-relevant verification.

## technique: manually curated transfer curriculum

To shift from generic mathlib statements toward contest-style miniF2F problems, the authors manually formalize 327 statements: 302 examples/exercises from Lehoczky and Rusczyk textbooks and 25 problems from the MATH dataset. The set is verified, “based on problem provenance and manual inspection of statements”, to have an empty intersection with miniF2F-{test,valid} (Section 6.1, p. 7). They set the training statement set to the union of mathlib-train, synth-ineq, and this curriculum, with one attempt per mathlib/synthetic statement and eight attempts per curriculum statement (Section 6.2, p. 7).

At the end of the expert iteration, 100 of the 327 curriculum statements are closed, which the authors read as “suggesting a lack of density in our manually formalized set of statement” (Section 6.2, p. 7). Table 2 (p. 8) reports θ9full at 33.6% pass@1, 41.2% pass@8, and 47.3% pass@64 on miniF2F-valid; on miniF2F-test it reports 29.6%, 34.5%, and 36.6%. The table's denominator is the corresponding miniF2F split, and each pass@k is success if any of k attempts proves a statement. The paper also reports that the miniF2F results include 26 AMC12 problems, 6 AIME problems, and 2 problems adapted from the IMOs (Section 6.3, p. 7).

The comparison matters: θ9mathlib, trained without the manually curated curriculum, reaches 31.3%, 38.3%, and 44.1% on miniF2F-valid and 27.2%, 33.0%, and 35.2% on miniF2F-test for pass@1, pass@8, and pass@64. The full curriculum therefore improves the reported miniF2F rates at the same table settings, but deploys more training statements and compute. The Figure 4 caption (p. 7) gives 25k + 5.6k + 8 ∗ 327 ≈ 33.2k attempts per iteration for the full loop, versus 25k for the mathlib-only loop and about 50k for a mathlib-only loop with a = 2, which the authors also plot; Table 2 itself has no a = 2 row. Inference: the Table 2 comparison is therefore against a smaller-compute baseline, and the equal-compute comparison is only in Figure 4.

## evidence, limits, and trusted components

Inference: the formal checker is Lean and its loaded libraries (the paper says formal mathematics “has an automated way of determining whether a trajectory (i.e. a proof) is successful (i.e. formally correct)”, Section 1, p. 1). Search, model probabilities, curricula, deduplication, and proof-size predictions are heuristic training components. The paper's experiments measure pass rates, proof lengths, statement closure, and compute; model-size experiments are mentioned but “not reported in this paper” (Section 7.1, p. 8). Nothing in the paper shows that expert iteration is complete or that it transfers to Rust. The authors explicitly report a limitation: “their current main limitation lies in their inability (under our proposed search procedure) to chain more than 2 or 3 non-trivial steps of mathematical reasoning” (Section 7.2, p. 8). They also say the cuts the models generate are “often shallow” and that “proofs requiring many of such reasoning steps remain beyond our current compute horizon”.

Inference: the corresponding VL failure mode is a verifier search that finds short local repairs but cannot chain ownership, invariant, and abstraction lemmas across a long Rust proof. A curriculum should therefore measure proof depth, repair latency, solver stability, and dependency changes, not only pass@k.

Inference: Verus form uses `requires`, `ensures`, `proof fn`, `assert`, and loop `invariant` declarations. The generated proof is accepted only after Verus checks it; model scores, negative labels, and proofsize buckets are untrusted guidance. External-library contracts, Rust compilation, the specification, and the operating environment remain trusted assumptions.

Inference: threat to an agent-written verified-Rust product is high for training and search cost. The paper demonstrates that verified traces can improve a prover and that curated statements can bridge distribution shift, but its 2000 A100-day run and remaining long-chain failures indicate that this is an expensive accelerator, not autonomous end-to-end verification.

## what VL should not redo

Inference: the paper already compares expert iteration against sample-only scaling (Figure 2, Figure 3), proofsize against outcome objectives (Table 1), and a full curriculum against a mathlib-only curriculum (Figure 4, Table 2) on Lean and miniF2F; it reports global deduplication as a finding without an ablation. VL should not repeat those comparisons without Rust-specific measurements. A new experiment should test whether accepted Verus proof traces remain useful after ownership-model changes, library upgrades, and altered contracts, and should report verification time and repair effort with each denominator.

## techniques for the catalog

- persistent proof-search REPL: expose initialization and tactic-application operations over a stateful formal environment for distributed workers
- proofstep objective: condition next-action generation on declaration context and current formal goal state
- proofsize value objective: predict discretized proof-length buckets and use their weighted value to guide search
- bootstrapped dual-objective training: build a value dataset from successful and visited failed searches, then fine-tune a base model
- deduplicated expert iteration: aggregate verified traces across rounds, retain minimum proof sizes, and retrain on accumulated data
- synthetic difficulty curriculum: generate statements with independent depth and obfuscation controls, then train from easy to hard
- curated transfer curriculum: add manually formalized statements that match the target distribution while checking split disjointness
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "And despite their pass@1 being higher, it is often the case that for a fixed amount of compute, sampling more attempts from a smaller model leads to a better final performance."): I read the whole paper text (arXiv 2202.01344v1, pages 1-13 including appendices) and the whole study, and checked every quotation, number, section and page reference, the lean-gym API, the objectives, the bootstrap and expert-iteration steps, the synthetic generator, the curriculum counts, Table 1 and Table 2 values, and the compute figures; I changed page numbers (Table 1 is p. 4, Table 2 is p. 8, Sections 4.1-4.3 p. 3, 4.5 p. 4, 4.6 p. 5, 5.x p. 6, 6.x p. 7, Appendix B p. 11-12, Appendix D pp. 12-13), moved the 2000 A100-day figure to Section 7.1, fixed the global-deduplication quote (it ends with the words across iterations), the pass@16k wording, the ∧ operator (exponentiation, not conjunction), the implied mathlib-train denominator (about 25.6k, not 25,000), the Section 5.2 attribution, and the claims that the paper compares or measures global deduplication and model size (it does neither); I marked my own conclusions "Inference:". I did not check the figures visually (Figures 1-4 values are only read from captions and text), the cited external works, the PDF page numbers beyond the pdftotext page split, or any Verus transfer claim, which are my inferences and not tested.
