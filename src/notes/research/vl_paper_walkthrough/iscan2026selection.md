# Selection Without Signal, Recovery Through Expression: A Measurement Study of Post-Hoc Falsification Operators for Frozen Small Code Models
(authored by agents unless marked 🧑)
Tag: `iscan2026selection`, [paper](https://www.semanticscholar.org/paper/efe578335322ebaad83eec452786628c3a217175)

## scope and result

The paper studies whether a frozen small code model can be improved after generation, without changing model weights. Its setup samples a shared pool of eight programs at temperature 0.8, then applies post-hoc selection, verification, repair, elimination, conditioning, or compute allocation using only the prompt, public tests, and pool. The hidden tests are used only for evaluation. The paper’s central result is narrow: “Across twenty-six distinct operators spanning the standard families—selection, verification, repair, counterexample search, version-space elimination, portfolios, sound vetoes, and generation conditioning—none improves held-out accuracy over BoN at matched compute.” (Introduction, p. 4). BoN is the first candidate passing public tests.

The study evaluates Qwen2.5-Coder-1.5B/0.5B and DeepSeek-Coder-1.3B on a local benchmark, Substrate-W, HumanEval+ (164 tasks), and MBPP+ (370 retained tasks after eight determinism/serialization exclusions). It reports two orthogonal survivors: M1, robust extraction plus public-test signature alignment, and ACE, adaptive consensus early stopping. M1 improves DeepSeek-Coder-1.3B by 12 HumanEval+ tasks (29 to 41, one-sided exact McNemar p=2.4×10^-4) and 33 MBPP+ tasks (128 to 161, p=1.2×10^-10), with zero observed harm. ACE saves 19.1% of full-budget sampling at threshold τ=4 on an 80-task Qwen2.5-Coder-1.5B local cell, with b10=0 and reported Hoeffding–Bentkus p=0.0165; its 63.9% saving at τ=1 has b10=2 and is not a do-no-harm result (Results, pp. 18–20).

## formal experimental contract

A task is a prompt, visible tests, and hidden tests. The paper defines `pass(c,S)` as execution of candidate `c` against every test in set `S`; public passing is `pass(c,Tpub)=1`, while hidden passing is the measured correctness outcome. Candidate pools are reproducible because each sample uses an id-derived SHA256 seed. An operator is leakage-free when it is a function of `(π,Tpub,P)` only, and matched-compute when it makes no more generator calls than BoN. The paper states: “A post-hoc operator is a map A : (π, Tpub , P ) 7→ ĉ returning one program ĉ to deploy (an element of P , or a program rewritten from P ); it is leakage-free when it is a function of (π, Tpub , P ) alone, never reading Thid or a reference solution, and matched-compute when it issues the same number of generator calls as the baseline.” (Section 2, p. 7).

Step by step, the evaluation is: (1) generate one byte-for-byte shared pool per task; (2) run each operator over that same pool; (3) deploy one output; (4) run hidden tests on both operator and BoN outputs; (5) count paired discordances. Harm is `b10=#{BoN passes,A fails}` and gain is `b01=#{A passes,BoN fails}`. The predeclared bar is `b10=0`; a one-sided exact McNemar test reaches p<0.05 at `b01≥5`, while the stricter net floor is six.

“The do-no-harm bar drives every claim, so its statistical reach must be fixed up front.” (Section 2, p. 7).

“The paper’s question is whether any such operator—however it selects, verifies, repairs, eliminates, or conditions generation—returns a hidden-correct program more often than the trivial first-passer baseline.” (Section 2, p. 7).

The paper proves a finite-sample limitation rather than treating zero observed harm as a universal guarantee. If zero harms occur in `n` independent trials, the exact one-sided upper confidence bound is `1−δ^(1/n)`. To certify harm rate ≤α, `n≥ceil(log δ/log(1−α))`; for α=.05, δ=.10, n≥45 (Proposition 1, p. 7). Therefore the paper treats zero-harm results on ≤32-task sets as suggestive, not certified. This denominator matters: the bound is about independent evaluated tasks, not candidates or generated samples.

## selection and consensus techniques

### execution-fingerprint consensus (MBR-Exec)

For every candidate, execute a deterministic probe bank of at most 24 public arguments and type-aware mutations. Encode each probe result as a bounded fingerprint (`repr[:200]`, typed error, `NOFUNC`, `NOCODE`, or `TIMEOUT`). For each probe, find the plurality fingerprint; among public-passers, choose the candidate agreeing with the plurality on the largest fraction of probes. The paper’s equation is `argmax_i (1/|Π|) Σ_j 1[fp_i(j)=maj_j]` (Section 2.1, p. 9). Use this when candidates all pass visible tests but differ on behavior; it is a leakage-free execution analogue of minimum Bayes risk. The measured verdict is a tie with BoN at k=8; no hidden-test gain is shown.

Inference: in Verus, a Rust implementation can represent probe outputs as an enum and specify a pure fingerprint function over modeled inputs. A `spec fn` can define agreement and a `proof fn` can prove that a selected index maximizes a finite score, while executable code performs the probes. The proof establishes selection according to the modeled probes, not that the probes characterize hidden behavior. External execution, Python harnesses, and hidden tests remain outside that proof unless modeled and connected by contracts.

### embedding medoid and behavioral rerank

CEMS embeds each public-passing source into R^1536 and chooses the candidate minimizing total cosine distance. BTR instead minimizes total Hamming distance between execution fingerprints; a severity-weighted form gives more weight to probes with less plurality agreement. These are deterministic pool-selection rules, useful when centrality is expected to correlate with correctness. The paper reports null outcomes (Table 8, p. 28): CEMS 40/50 versus 39/50 with p=1.00, and BTR 40/50 with a ceiling bound.

Inference: Verus can verify arithmetic properties of a finite medoid implementation if vector dimensions and denominator nonzero conditions are specified. The embedding model, floating-point behavior, and semantic relation between centrality and hidden correctness would be trusted assumptions, so this is an algorithm proof rather than a correctness proof for generated code.

### verisimilitude and sound metamorphic selection

VRS computes a Popperian truthlikeness score from counts of severe probes passed and failed: `Vs=(CtT−CtF)/(CtT+CtF)`, with `Ct(S)=|S|/(|S|+1)`, then chooses the maximum. It is appropriate when probe severity is intended to distinguish candidates; the study finds it ceiling-limited.

Metamorphic selection declares relations that should hold for a task family: determinism, idempotence, sortedness, length, multiset preservation, membership, permutation, and inverse consistency. Execute candidates on generated inputs; refute a candidate only when it cleanly violates a relation. Crashes/timeouts are treated as non-violations, and a construction gate requires a known-bad candidate to fail hidden tests and violate a relation while a known-good candidate satisfies all relations. This is a sound-veto design: it aims to avoid eliminating correct programs. On Substrate-W it gained zero; approximately 83% (10/12) of hidden failures were invisible to the relations (Results, p. 16).

Inference: a Verus version would encode each relation as a `spec fn` over mathematical sequences and prove that a candidate implementation preserves it with `ensures`. A generated-input harness is still an empirical falsifier, not a proof over all inputs; universal guarantees require quantified specifications and loop invariants. The paper’s “sound” claim is relative to the declared relation library and construction gate, not to the program’s full specification.

### learned and latent verifiers

LCV fits a logistic model from a 1536-dimensional code embedding to hidden correctness, using balanced classes and per-task GroupKFold so a task cannot occur in both training and test. At deployment it reranks public-passers by the score. XFV uses eight execution features: consensus agreements, error and timeout fractions, distance to behavioral medoid, diversity, and severity statistics; it standardizes features on training folds and tests against label permutation. LEA abstains when mean pairwise embedding dispersion exceeds a threshold fitted to abstention targets; otherwise it returns the medoid. These techniques are applicable when a held-out correctness signal exists during training, but they do not satisfy leakage-free deployment if hidden labels or reference-derived features leak into fitting. The paper reports LCV AUC .444 (below chance), XFV AUC .60 with permutation p=.114, and LEA net-negative despite AUC .738 because it falsely abstained on 24% (Table 8, p. 28).

Inference: Verus can verify feature calculation and threshold decisions for bounded arrays, but a proof that a learned score predicts hidden correctness requires a formal statistical model and trusted training data. Treat the classifier and feature extractor as trusted components unless their training and inference semantics are separately specified.

## repair and counterexample techniques

Self-debug executes a candidate, feeds the error trace back to the model, and asks for one repair round. The prompt branches by status: public-passing/hidden-failing candidates receive an edge-case repair request; public-failing candidates receive a basic-failure request. The matched-compute comparison charges the repair generation against the same budget. It is useful when an executable failure trace identifies a local defect, but the paper finds it compute-confounded with b10=13 against matched BoN.

BRR replaces a fixed repair strategy with a LinUCB contextual bandit over four arms (regenerate, error-trace, edge-case, refute-revise). Each arm maintains `A_a` and `b_a`, initializes `A_a` to identity and `b_a` to zero, computes `θ_a=A_a^-1b_a`, selects `argmax θ_a^T x+α sqrt(x^T A_a^-1x)` with α=1, and updates with hidden-pass reward in counterfactual replay. Use it when repair-arm choice depends on a fixed context; the reported router score (0.379) was below the best fixed arm (0.482).

CEGIS-R builds a pseudo-oracle from the public-passer ensemble. A probe is a counterexample when the target crashes while a clean plurality agrees, or when it disagrees with a plurality whose voter confidence is at least .6. The method injects a concrete `f(x)=A, want B` contrast and regenerates up to two rounds. SERA compares regeneration conditioned on a severe counterexample against generic re-ask and confirmation placebo; its load-bearing contrast is `pass(severe)>pass(placebo)`. CEGIS-R scored 14/20 versus REFv3 16/20; SERA’s severe and placebo rates were both .675 (Table 8, p. 28).

Inference: the Verus analogue is counterexample-guided lemma or implementation repair: turn a failing concrete execution into a postcondition or assertion, then strengthen the Rust function’s `requires`/`ensures` and loop invariants. Verus does not execute a language-model repair loop inside a proof, so the model-generated revision remains an external proposal that must compile and verify.

Prompt normalization inserts public-test signatures and examples before drawing one sample; it improved one-sample performance by three tasks but was much weaker than BoN@8. Thinking-iteration equalizes visible-thinking and no-thinking compute using a measured latency ratio and finite-pool hypergeometric pass@k; it was negative (−.015 on Qwen3-0.6B and −.31 on Qwen3-1.7B, b10=2). These results warn that a repair or reasoning intervention must be compared at equal generation budget.

## elimination, veto, conditioning, and allocation

PAVER treats public-passers as a version space. Delete a candidate if it has a metamorphic refutation or crash; a full policy also deletes disagreement with a strict majority. Measure false-refutation rate (hidden-correct candidates eliminated) and probe entropy. Its apparent +2-task gain had FRR=.28 (47/170 hidden-correct visible-passers eliminated) and survived only with fallback, so the paper classifies it as falsified (Results, p. 15).

SCRC keeps the largest fingerprint cluster as an anchor and vetoes it only after a sound metamorphic violation plus a clean alternative cluster. It uses the Hoeffding–Bentkus bound on losses where the anchor was correct, vetoed, and the alternative was wrong. The veto never fired and had Δ=0 on three substrates (Table 8, p. 28). PRAXIS uses a family-matched algorithmic schema with a wrong-family placebo; MNEMON prepends a verified same-family exemplar and compares unrelated-family and no-code scaffolds; POLYGEN samples diverse decoding profiles and chooses the modal public-probe cluster; WAVE-RL-F and FREQ-RL use wavelet energies/entropy over code or machine-space sequences; FREQ-RL v2 uses behavior deviations on auto-generated inputs. All are judged by held-out or grouped AUC and deployment discordances. The wavelet hidden-correctness AUC was .479 (ΔAUC −.004, p=.60), frequency AUC .354 (gate stopped), and the behavior differential reached AUC .798 but deployed Δ=0 because its signal agreed with the consensus pick.

SCARF reallocates a fixed total budget toward tasks with the largest estimated marginal pass gain, while enforcing the invariant Σ_i n_i=b·M. ACE+ locks easy tasks after consensus and reinvests freed samples up to k=16 on unresolved tasks using a difficulty score. The paper finds ACE+ Δ=.0038, approximately .3 of 80 tasks, equal to a uniform placebo; no coverage-backed accuracy gain appears.

## M1 expression-layer recovery

M1 is the strongest reusable procedure in the paper because it fixes harness loss rather than semantic selection. Apply standard extraction to every candidate. If any extracted candidate passes public tests, return the ordinary BoN first-passer unchanged. Otherwise derive the most-called bare function identifier from public assertions, robustly extract a single function from each raw candidate (tolerating prose and malformed fences), rename that function to the public name while preserving attribute access, and return the first recovered public-passer; otherwise use the unchanged BoN fallback. It adds no generation and fires only when standard extraction found no public-passer, which explains the observed b10=0 by construction (Algorithm 1, p. 14).

The evidence uses task denominators and model cells. On HumanEval+ (n=164), DeepSeek-Coder-1.3B rises 29→41, b01=12, b10=0, p=2.4×10^-4. On MBPP+ (n=370), it rises 128→161, b01=33, b10=0, p=1.2×10^-10. Qwen gains are +1 to +4 and nonsignificant. The independent harness checks held on all three cells: every gain lacked a standard public-passer, re-extraction passed public and hidden tests, the body occurred in raw output, and the name was invariant under hidden-test/reference poisoning (Results, p. 18).

Inference: in Verus, preserve this separation. Keep extraction and signature alignment in an unverified boundary that produces a Rust artifact; then verify the artifact with ordinary function contracts, `requires`, `ensures`, loop `invariant`s, and proof functions. The proof cannot establish that a parser found the intended function unless parser behavior itself is modeled. A safe architecture can nevertheless make the boundary explicit and reject artifacts that fail compilation or verification.

## ACE adaptive consensus early stop

ACE samples incrementally, grades public passers, clusters them by execution fingerprint, and tracks the two largest clusters `m1≥m2`. It stops if the current cluster is mathematically locked (`m1−m2>k−n`) or if `m1≥τ` and `m1>m2`; it returns the embedding medoid of the modal cluster. If no stop occurs, it returns the full-budget modal-cluster medoid, or BoN if no candidate passes (Algorithm 2, p. 14). Compute saving is `1−mean(n)/k`.

The operating point is an evaluation-set choice and has no τ-grid correction. On Qwen2.5-Coder-1.5B × local benchmark (n=80), τ=4 gives mean compute 6.48/8, 19.1% saving, pass rate .6125, b10=b01=0, and HB p=.0165. τ=1 gives 2.89/8, 63.9% saving, but b10=2. On Qwen2.5-Coder-0.5B (n=50), the zero-harm point is τ=5 and 2.25% saving; on Substrate-W n=32, Proposition 1 prevents a distribution-free certificate; on DeepSeek the saving is only about 7–12% because visible passers arrive late (Table 5, p. 20).

Inference: a Verus implementation can prove bounded state-machine facts for the sampler—cluster counts, threshold monotonicity, and that returned indices belong to the sampled pool—using integer arithmetic and loop invariants. It cannot by itself prove the empirical harm rate or the validity of Hoeffding–Bentkus assumptions. The statistical certificate remains trusted mathematics plus an independently checked execution log.

## what is proved, measured, and trusted

The paper proves Proposition 1 and gives a conditional consensus-trap lemma under a majority-symmetry assumption. It measures exact paired hidden-test outcomes, classifier AUC, false-refutation rates, candidate coverage, compute savings, and benchmark counts. The strongest evidence is externally replicated M1 and selection results on two benchmarks and three model cells. The paper explicitly limits scope: it evaluates hidden unit-test correctness, not code quality, abstention usefulness, hardware portability, or all possible operators; Ollama outputs may vary across hardware.

Trusted components include the hidden-test oracle, canonical solutions, sandbox isolation, model serving, extractor implementation, probe-bank soundness, classifier training data, and the mapping from benchmark tests to real product requirements. Inference: for VL, a Verus proof would reduce risk for the selected Rust algorithm and its stated contracts but would not validate the natural-language requirement, generated test adequacy, model output extraction, external libraries, or deployment environment. The paper’s own mechanism suggests a product priority: measure candidate coverage and repair extraction before adding semantic rerankers.

Inference: threat to an agent-written verified-Rust product is moderate at the workflow boundary and low for the specific semantic-selection claim. M1 directly motivates a robust Rust extraction/normalization gate before proof attempts. ACE could reduce verifier or generation cost only after measuring a local, independently calibrated harm budget. The 26 semantic operators’ null results warn against assuming that execution agreement, self-repair, or an LLM judge can recover correctness from a pool that contains no correct candidate or no leakage-free discriminating signal. The paper does not test Verus, so transfer to VL remains an inference.

## techniques for the catalog

- leakage-free matched-compute pool evaluation — generate one reproducible candidate pool, expose only prompt/public tests to each operator, and compare paired hidden-test outcomes against first-public-passer BoN
- exact do-no-harm McNemar accounting — record `b10` harm and `b01` gain per task and require a predeclared zero-harm/effect floor
- finite-sample do-no-harm bound — require `n≥ceil(log δ/log(1−α))` before treating zero observed harms as a distribution-free population certificate
- execution-fingerprint consensus — execute deterministic probes, form per-probe pluralities, and select the public-passer with greatest agreement
- sound metamorphic veto — refute only clean violations of declared sound relations and retain candidates when probes crash or time out
- grouped learned verifier — train embedding or execution-feature classifiers with per-task separation and permutation checks, then rerank public-passers
- counterexample-guided repair — derive concrete disagreements from a candidate ensemble and regenerate with an explicit input/output counterexample
- version-space elimination — delete candidates refuted by sound probes, measure false-refutation rate, and fall back when no survivor remains
- conformal sound veto — override a modal cluster only after a sound violation and quantify veto harm with a Learn-then-Test bound
- M1 expression recovery — robustly extract a single function, align its name to public assertions, and retry only when standard extraction found no public passer
- ACE consensus early stop — stop sampling once fingerprint-cluster thresholds decide the modal candidate and report saving against full-budget consensus
- coverage-wall diagnostic — increase k on held-out hard tasks and distinguish missing correct candidates from selector failures before claiming post-hoc improvement

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
