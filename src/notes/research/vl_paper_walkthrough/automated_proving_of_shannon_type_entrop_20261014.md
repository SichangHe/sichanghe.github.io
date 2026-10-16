# Automated Proving of Shannon-Type Entropy Inequalities via Fine-Tuned Language Models and Guided Tree Search
(authored by agents unless marked 🧑)
Tag: `wong2026automated`, [paper](http://arxiv.org/abs/2606.05729v1)

## problem, evidence, and trust

The paper trains 0.6B and 1.7B Qwen3 models to emit one atomic Shannon-type entropy inequality at a time, then searches over proof trees. The formal checker accepts a proof when repeated residual subtraction reaches zero. The authors state: “The proof succeeds if we reach Rt = 0.” (Section III-B, p. 3.) On a held-out final set of 60 inequalities with 10–15 random variables, the 0.6B model proves 51/60 (85.0%) with the selected tree search; GPT-5.5 zero-shot proves 1/60 (1.7%) and Psitip proves 20/60 (33.3%) (Table IV, p. 5). The denominators are the 60 final-test inequalities, while the 30-item easy and hard sets used for ablations have separate denominators.

Inference: the symbolic residual checker and entropy definitions are the acceptance boundary; model outputs, beam scoring, pruning, generated datasets, and test-set construction are trusted only as experiment machinery. Inference: a passing decomposition proves the encoded inequality, not that the chosen inequality is the intended property. The paper's LP baselines use a 300-second limit (Table IV caption, p. 5), so their comparison is time-bounded rather than a completeness claim.

## technique: reverse construction of atomic proof data

what it is: construct a guaranteed-valid target by sampling Shannon atoms and conditions, then expose the reverse sequence of atomic terms as supervised examples. A residual starts at `R0 = Itarget`; at each step an atom `Tt >= 0` is subtracted, `Rt+1 = Rt - Tt`, until zero. The authors explain: “Since our training framework is step-wise, each prompt corresponds to the current residual inequality, and the model is expected to output only one proof step at a time.” (Section III-A, p. 3.)

how to apply:
1. sample `n` in 3..9 and a number of atoms (Algorithm 1, p. 4)
2. generate atoms from `H(A)`, `H(A|B)`, `I(A;B)`, and `I(A;B|C)`
3. sample equality and inequality conditions with LP feasibility checking; split equality `C=0` into `C>=0` and `-C>=0` (Algorithm 1)
4. assign positive coefficients to atoms and conditions and nonzero coefficients to equalities; sum them into residual `R` (Algorithm 1)
5. select the candidate whose weighted negative residual coordinates are largest, format `(R, conditions)` as input and that atom as output, subtract it, and repeat until the candidate multiset is empty (Algorithm 1)

The resulting four datasets each contain approximately 389.5M tokens. Dataset A has 508,803 rows, 4096-token context, and 6.0% `n=9`; B is 4096-token and `n=9`-skewed; C and D use 8192 tokens (Section III-D, p. 4). LoRA rank is 64 and alpha is 128, with AdamW 8-bit (Section III-B, p. 4).

Verus form (Inference): generate verified Rust training pairs by taking a function contract and a known proof, selecting one local lemma or `assert` obligation, and recording the remaining obligation as context. Replace entropy atoms with Verus `proof fn` lemmas, `requires`, `ensures`, and `assert ... by`; accept a training step only after Verus checks it. Rust ownership and mutable borrows mean a residual cannot simply be a vector of coefficients, so this is a representation inference, not a claim from the paper.

Inference: limits: reverse construction guarantees validity only for generated algebraic combinations; it does not create realistic theorem distributions. The paper does not report duplicate removal or a project-wise holdout beyond its synthetic test regimes. Inference: VL would need crate- and API-level splits to avoid memorizing lemma text.

## technique: guided beam search with verifier-oriented pruning

what it is: at each residual, sample `K` candidate steps, compute each new residual, and retain a beam of size `B` through depth `D`. The score is the sum of absolute negative residual coefficients, `score(c) = sum_{i:ci<0}|ci| * 10^3`; smaller scores are preferred because they are closer to nonnegative. Candidates pass three filters: format validity, rejection of all-nonpositive residuals, and (for `n<=9`) LP false pruning. The paper says: “Each candidate step is independently verifiable as a Shannon-type entropy inequality.” (Section II, p. 3.)

steps:
1. format-filter only positive scalar multiples of the four permitted atom forms or known conditions (Section III-C, p. 4)
2. subtract each valid candidate and reject residuals whose coefficients are all nonpositive
3. for `n<=9`, run Shannon-type LP to reject impossible residuals; disable this when `n>=10` because all variables and conditions no longer fit the LP (Section III-C)
4. score survivors by negative-coefficient magnitude and keep the best beam states
5. stop on residual zero or at maximum depth; default search is beam 24, four rollouts, depth 20, while the selected hard-set policy is beam 32, six rollouts, depth 24 (Section IV-C, p. 5)

Verus form (Inference): make each candidate a complete Rust/Verus patch and run Verus before inserting it into the beam. Use diagnostic categories as pruning predicates, keep candidates whose verified `assert` or `proof fn` reduces the remaining postcondition obligations, and score by a measurable count of unresolved obligations. Verus `invariant` is a loop annotation, not a function call; the paper's residual arithmetic does not carry over directly.

evidence: on the 30-item hard set, beam 32/rollouts 6/depth 24 proves 16/30 (53.3%); beam 24/4/20 proves 9/30 (30.0%), and beam 64/6/24 proves 10/30 (33.3%) (Table III, p. 5). On the four-dataset ablation, Dataset A scores 9/30 (30%) hard and 12/15 (80%) long; Dataset D scores 8/30 (27%) hard and 9/15 (60%) long (Table II, p. 5). Random scoring drops the easy-set result from 25/30 (83.3%) to 7/30 (23.3%), and average successful tree size changes from 244.1 to 1100.3 (Section IV-G, p. 6). These denominators and settings are essential: the 83.3%/23.3% comparison is the 30-item easy set, not the 60-item final test.

limits: wider beams can add duplicate distractors and exhaust the budget; frontier LLMs produced 45–300 format-invalid proposals per run in five-example tests (Section IV-F, p. 6). LP pruning is unavailable at the larger `n` values. Inference: Verus compilation is more expensive than a vector subtraction, so caching verified patches and bounding SMT time would be necessary.

## implications for VL

Already done: atomic-step supervision, reverse proof-data construction, residual-distance scoring, format and semantic pruning, and controlled beam ablations. Inference: VL should test these ideas on verified Rust obligations rather than reimplement entropy arithmetic. Inference: threat to agent-written verified Rust is moderate. Beam search can find a checked proof, but a vacuous contract, an omitted invariant, or an unchecked external boundary remains outside the search score. Require a final clean Verus run and audit specifications and assumptions.

## techniques for the catalog

- reverse proof-data generation — build guaranteed-valid targets and train one atomic proof step against each residual
- residual-reduction search — subtract validated atoms until the residual is exactly zero
- guided beam scoring — rank branches by negative residual magnitude and retain a bounded beam
- format and feasibility pruning — reject malformed steps, impossible residuals, and LP-inconsistent branches before expansion
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
