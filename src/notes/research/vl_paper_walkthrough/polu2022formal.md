# Formal Mathematics Statement Curriculum Learning
(authored by agents unless marked 🧑)
Tag: `polu2022formal`, [paper](http://arxiv.org/abs/2202.01344v1)

## scope and result

Polu et al. study expert iteration for Lean theorem proving. Expert iteration interleaves proof search with training on proofs found by the current model. The paper targets miniF2F, whose benchmark has 244 validation and 244 test statements, and asks whether auxiliary formal statements of varied difficulty can replace game-style self-play curricula. Its abstract states: “We show that at same compute budget, expert iteration, by which we mean proof search interleaved with learning, dramatically outperforms proof search only.” (Abstract, p. 1)

The key result is that a model can learn progressively harder statements without ground-truth proofs for those statements. The authors report that manually curated curriculum training reaches 47.3% pass@64 on miniF2F-valid and 36.6% on miniF2F-test (Table 2, p. 7). These denominators are benchmark statements evaluated with 64 or 8 attempts, not a probability that an arbitrary theorem is proved. The paper also reports 2000 A100-days for one full 774-million-parameter training run and about 0.1 A100-hour for one parallelized proof search (Section 6.3, p. 7).

Inference: for VL, the transferable design is a verified-data feedback loop: generate Rust/Verus proof attempts, keep accepted traces and informative failures, fine-tune or rank the next attempts, and expose a staged curriculum of statements. Lean tactics and proof states do not transfer directly to Verus ownership and solver obligations.

## technique: lean-gym proof-search interface

Inference: when to use it: use a persistent interactive environment when a search worker must apply many candidate proof actions to a formal state and retrieve the resulting state without restarting the prover.

The paper introduces lean-gym because programming the search procedure inside Lean made cluster-wide parallel I/O difficult. Its API has two operations (Appendix B, p. 12):

1. `init-search` takes a declaration name and returns an initial tactic state, a fresh search identifier, and a tactic-state identifier, while setting the run-time environment at that declaration.
2. `run_tac` takes a search identifier, tactic-state identifier, and tactic string, applies the tactic, and returns a new tactic state and identifier.

The paper says, “Using lean-gym is virtually equivalent to opening a Lean editor at a specific theorem, deleting its proof and interacting with Lean to reconstruct it.” (Appendix B, p. 12) The REPL communicates over standard input/output, so a Python wrapper can be only a few dozen lines. The environment is stateful: distributed workers must track which instance belongs to each proof search. The authors report scaling to thousands of cores and thousands of concurrent searches, while noting that the blocking REPL prevents inner-proof parallelization (Appendix B, p. 12).

Verus form: Inference: implement a worker service that accepts a Rust/Verus source snapshot plus a candidate proof edit, invokes Verus, and returns diagnostics and the resulting obligation summary. Preserve one source/dependency context per search identifier; do not mix module imports, solver settings, or generated files between branches. Inference: unlike Lean's tactic-state API, Verus often rechecks a source unit rather than exposing a stable mutable tactic state, so an adapter may need to regenerate a temporary crate for each candidate.

## technique: proofstep and proofsize objectives

The model is a 36-layer decoder-only transformer with 774 million trainable parameters. Pre-training uses 300 billion CommonCrawl tokens and 72 billion WebMath tokens (Sections 4.1–4.2, p. 2). The proofstep objective conditions on the declaration, current goal state, and a generated tactic: `DECL <DECLARATION> GOAL <GOAL> PROOFSTEP <PROOFSTEP>` (Section 4.3.1, p. 2). The declaration name is a weak proxy for hidden imports, notation, instances, and library position; Lean rejects tactics that refer to unavailable declarations.

The proofsize objective predicts one token for a bucket representing expected proof length: `DECL <DECLARATION> GOAL <GOAL> PROOFSIZE <PROOFSIZE_BUCKET_TOKEN>` (Section 4.3.2, p. 2). Eleven buckets represent infinite or over-20 proof sizes and linearly projected sizes below 20; buckets are mapped to tokens `A` through `K`. The value of a goal is a weighted average of bucket probabilities. A shortest-proof bucket receives value 1 and the infinite bucket receives value 0. The paper chooses this token objective because it improves performance over an outcome objective and biases search toward shorter proofs without adding a separate value head (Section 4.3.2, p. 2).

Verus form: Inference: encode the current Rust function signature, `requires` facts, `ensures` goal, loop invariants, and visible module context as the search state. Predict either a proof action (for example, a lemma invocation or `assert`) or a coarse bucket for expected verification effort. Inference: proof length in Verus should be measured alongside verifier time and solver calls because a short script can be expensive or unstable. Keep the final `requires`/`ensures` contract explicit; a value estimate must never be treated as evidence of correctness.

## technique: bootstrap an initial dual-objective model

Bootstrapping proceeds as follows (Section 4.4, pp. 2–3):

1. start with a WebMath-pretrained model and fine-tune it on the mathlib tactic dataset and `mix1` proof artifacts to obtain θ0, using validation splits only for early stopping
2. for each of 25,000 `mathlib-train` statements, run one cumulative-log-probability priority proof search with 512 expansions and 8 tactic samples per expansion
3. collect successful searches S0 and construct D0 from the initial tactic dataset, deduplicated proofsteps from S0, and deduplicated goal/proofsize tuples from full searches
4. include visited but unproved goals as negative proofsize examples labelled infinite, while retaining minimum proof sizes for positive goals
5. fine-tune θ0 for exactly one epoch on D0 to obtain θ1

Table 1 compares θ0 and θ1 under the same 512-expansion, 8-sample setup. On mathlib-valid, θ0 has 46.7% pass@1 and 57.5% pass@8, while θ1 has 56.3% and 66.3%; on miniF2F-valid, θ0 has 28.4% and 33.6%, while θ1 has 28.5% and 35.5% (Table 1, p. 3). The paper says training a value function on mathlib proofs has limited transfer to miniF2F-valid; the proofsize objective improves search guidance but does not solve distribution shift.

## technique: expert iteration with global deduplication

Use expert iteration when a formal statement set can provide repeated proof-search data. The paper defines inputs as a statement set `S_t`, an attempt-count function `a`, a base model θ0, and the bootstrapped θ1 (Section 4.5, p. 3). Each iteration k is:

1. run `a(s)` best-first proof searches for each statement in `S_t` using θk, with 512 expansions and 8 tactic samples per expansion
2. filter successful searches Sk
3. extract proofsteps and proofsize tuples from all successful searches through iteration k
4. globally deduplicate proofsteps and proofsize tuples across iterations; keep the minimum proof size for each positive goal and label visited unproved goals with infinite proof size
5. concatenate the initial tactic dataset with the accumulated deduplicated data
6. fine-tune θ0 for exactly one epoch on that dataset to obtain θk+1

The paper says, “This global deduplication is somewhat equivalent for each statement to growing a unique proof tree by aggregating all the proof searches that have been run for it.” (Section 4.5, p. 3) Failed proof searches are excluded from S0 because they contain only negative proofstep data; unproved goals inside otherwise complete searches remain useful negatives for the value function. Inference: for Verus, retain the complete source, diagnostics, solver configuration, and dependency snapshot for each accepted or failed attempt so deduplication does not merge semantically different obligations.

On mathlib-train, eight iterations improve pass@1 on mathlib-valid from 56.3% for θ1 to 62.6% for θ9; miniF2F-valid improves later in the run, showing some out-of-distribution transfer (Section 4.6, p. 4). With 16 attempts per statement for cumulative evaluation, the cumulative rate is a noisy ensemble over models θk rather than pass@16 from one fixed model. At iteration 9, proved mathlib-train statements rise from 17,390 (67.8%) to 19,476 (76.0%), while average proof length falls from 4.8 to 4.0 (Section 4.6, p. 4). These denominators are the 25,000 statements in mathlib-train.

## technique: synthetic difficulty curriculum

When ground-truth proofs are unavailable, generate formal statements with controlled difficulty. The paper's `synth-ineq` generator has two parameters: ND controls the depth of inequality composition, and NS controls input-expression complexity or obfuscation (Section 5.1, p. 5). It creates 5,600 statements: 100 for each combination of 0 ≤ NS ≤ 7 and 0 ≤ ND ≤ 6. It separately generates 100 low-difficulty statements with ND = 1 and NS = 5 and manually proves them for `synth-ineq-train`.

The full generator is specified in Appendix D (pp. 13–14):

1. initialize signed seed expressions from strictly positive variables and known-sign integers
2. for NS rounds, compose expressions with operations such as logarithm, reciprocal logarithm, square root, addition, subtraction, multiplication, division, conjunction, maximum, and minimum, retaining deduced sign constraints
3. instantiate known inequalities including AM-GM, trivial inequality, Cauchy–Schwarz, Bernoulli, Young, and Hölder using sign-compatible expressions
4. compose inequalities ND times using listed mathlib composition theorems such as `mul_le_mul`, `add_le_add`, `div_le_div`, and `mul_le_mul_of_nonneg`
5. simplify generated statements so they parse in Lean and run Lean's `simp` tactic

The authors run expert iteration on `mathlib-train ∪ synth-ineq`, pooling results by ND over all NS values. At difficulty ND = 6, expert iteration closes six problems, while a sample-only loop remains at zero. The paper describes this as evidence that training on easier generated statements can reach a harder curriculum without seed proofs at the hard level (Section 5.1, p. 5; Figure 3).

Verus form: Inference: generate parameterized Rust specifications whose proof difficulty is controlled by invariant depth, aliasing structure, or composed data-structure operations. Begin with small manually verified seeds, increase one difficulty parameter at a time, and record exact statement denominators and verified rates. Inference: synthetic contracts must be checked for meaningful semantics; a model that learns generator artifacts does not demonstrate product-relevant verification.

## technique: manually curated transfer curriculum

To shift from generic mathlib statements toward contest-style miniF2F problems, the authors manually formalize 327 statements: 302 examples/exercises from Lehoczky and Rusczyk textbooks and 25 problems from the MATH dataset. The set is verified to have empty intersection with miniF2F-valid and miniF2F-test (Section 6.1, p. 6). They set the training statement set to the union of mathlib-train, synth-ineq, and this curriculum, with one attempt per mathlib/synthetic statement and eight attempts per curriculum statement (Section 6.2, p. 6).

At the end of training, 100 of the 327 curriculum statements are closed. Table 2 reports θ9full at 33.6% pass@1, 41.2% pass@8, and 47.3% pass@64 on miniF2F-valid; on miniF2F-test it reports 29.6%, 34.5%, and 36.6%. The table's denominator is the corresponding miniF2F split, and each pass@k is success if any of k attempts proves a statement. The paper also reports 26 AMC12, 6 AIME, and 2 IMO-adapted statements among solved examples (Section 6.3, p. 7).

The comparison matters: θ9mathlib, trained without the manually curated curriculum, reaches 31.3%, 38.3%, and 44.1% on miniF2F-valid and 27.2%, 33.0%, and 35.2% on miniF2F-test for pass@1, pass@8, and pass@64. The full curriculum therefore improves the reported miniF2F rates at the same table settings, but deploys more training statements and compute. Figure 4 notes approximately 33.2k attempts per full iteration versus about 50k for a mathlib-only adjusted comparison with a = 2; this makes the compute comparison a measured setup rather than a universal efficiency claim.

## evidence, limits, and trusted components

The formal checker is Lean and its loaded libraries. Search, model probabilities, curricula, deduplication, and proof-size predictions are heuristic training components. The paper's experiments measure pass rates, proof lengths, statement closure, model size, and compute; they do not prove that expert iteration is complete or that it transfers to Rust. The authors explicitly report a limitation: “their current main limitation lies in their inability (under our proposed search procedure) to chain more than 2 or 3 non-trivial steps of mathematical reasoning.” (Section 7.2, p. 8) They also say generated cuts are often shallow and that challenging olympiad proofs remain beyond the available compute horizon.

Inference: the corresponding VL failure mode is a verifier search that finds short local repairs but cannot chain ownership, invariant, and abstraction lemmas across a long Rust proof. A curriculum should therefore measure proof depth, repair latency, solver stability, and dependency changes, not only pass@k.

Inference: Verus form uses `requires`, `ensures`, `proof fn`, `assert`, and loop `invariant` declarations. The generated proof is accepted only after Verus checks it; model scores, negative labels, and proofsize buckets are untrusted guidance. External-library contracts, Rust compilation, the specification, and the operating environment remain trusted assumptions.

Inference: threat to an agent-written verified-Rust product is high for training and search cost. The paper demonstrates that verified traces can improve a prover and that curated statements can bridge distribution shift, but its 2000 A100-day run and remaining long-chain failures indicate that this is an expensive accelerator, not autonomous end-to-end verification.

## what VL should not redo

The paper already compares expert iteration against sample-only scaling, proofsize against outcome objectives, global deduplication, synthetic difficulty control, and manually curated transfer on Lean and miniF2F. VL should not repeat those comparisons without Rust-specific measurements. A new experiment should test whether accepted Verus proof traces remain useful after ownership-model changes, library upgrades, and altered contracts, and should report verification time and repair effort with each denominator.

## techniques for the catalog

- persistent proof-search REPL: expose initialization and tactic-application operations over a stateful formal environment for distributed workers
- proofstep objective: condition next-action generation on declaration context and current formal goal state
- proofsize value objective: predict discretized proof-length buckets and use their weighted value to guide search
- bootstrapped dual-objective training: build a value dataset from successful and visited failed searches, then fine-tune a base model
- deduplicated expert iteration: aggregate verified traces across rounds, retain minimum proof sizes, and retrain on accumulated data
- synthetic difficulty curriculum: generate statements with independent depth and obfuscation controls, then train from easy to hard
- curated transfer curriculum: add manually formalized statements that match the target distribution while checking split disjointness
Checked 2026-10-14: audit record polu2022formal; paper-study comparison complete; gate executed; experiments not rerun
