# Human–LLM Deliberation as Interactive Proof: Conditions for Verifiability Without Transparency
(authored by agents unless marked 🧑)
Tag: `zhang2026deliberation`, [paper](https://arxiv.org/abs/2609.24895)

## scope and central claim

The paper models a fixed claim as an interaction between an LLM prover and a resource-bounded human verifier. The verifier asks challenges, checks supplied evidence, and accepts or rejects within a finite horizon T. The LLM’s private state is hidden. The paper’s central guarantee is conditional: if every relevant history has a justified bound on false passes and human execution errors, a certificate process gives anytime-valid soundness; completeness additionally needs reliable honest responses and enough evidence before timeout (abstract, p. 1; §§3–4, pp. 6–17).

The scope is formal claims with a usable truth condition. “Statements whose truth value is ambiguous, contested, or undecidable with respect to the chosen axioms are outside the model.” (§3.1, p. 7) The authors emphasize that empirical simulations do not validate human assumptions: “These simulations examine dialogue behavior and answer selection, without validating the human-verifier assumptions or the theoretical certification guarantees.” (§6, p. 26)

## technique 1: finite-horizon challenge–response protocol

What it is. The protocol fixes statement s, prover strategy Q, verifier information i, challenge space, decision function, and maximum rounds T. A malformed or over-length response causes immediate Reject; failure to decide by T also causes Reject (§3.3, pp. 8–10).

How to do it.

1. Initialize local verifier state from s, i, and verifier randomness. The prover returns an initial response y_s = Q(<s>, θ) (§3.3, p. 9).
2. Require a first challenge. Sample x1 from the admissible challenge policy and receive y1; set the history h1 (§3.3, p. 9).
3. Execute the prescribed check, update local state, and run U. U returns Accept, Reject, or Challenge (§3.2–3.3, pp. 8–10).
4. If Challenge and m<T, select another admissible challenge and append the response. If Challenge at m=T, output Reject (§3.3, p. 9).
5. Return the terminal verdict and the final transcript. Clarification and diagnostic rounds share the same T budget (§3.3, p. 9).

The running schedule example fixes a claim that no speaker or room conflicts exist, records and comparison rules, and asks the model for records and time comparisons. One overlapping pair is enough to reject, but passing checks only supplies bounded evidence about the whole schedule (§3.4, p. 11).

Verus form. Inference: use a fixed Verus claim such as a function contract, then let the model answer bounded requests for a loop invariant, counterexample trace, or supporting lemma. Keep the claim unchanged across rounds. Each check should be executable or independently inspectable; the final acceptance decision should still require Verus verification of the code and specification.

Evidence and limits. The paper states “Whether people can reliably perform the proposed checks remains untested.” (§8, p. 31). Inference: human attention, challenge quality, and execution correctness are parameters that must be measured or justified for a real task.

## technique 2: diagnostic checks with a false-pass bound

What it is. Build a complete finite list of constraints that exactly covers a claim, then sample checks. In the schedule example, the verifier builds a list of J > 1 constraints: each session’s availability requirements and the non-overlap requirement for every pair sharing a speaker or room (§3.5, p. 11). If the claim is false, at least one constraint fails; uniform sampling with replacement gives each round an ideal false-pass probability of at most q = 1 − 1/J (§3.5, pp. 11–12).

How to do it. Construct the list before dialogue (it is fixed, not selected from the prover’s answers), make records available to the verifier, sample a constraint uniformly with replacement and independently of the preceding history, and require the response to cite the fixed records and satisfy the selected comparison. Follow-up questions may guide attention but do not automatically preserve the same bound (§3.5, p. 11). A false claim can be adaptively defended, so the bound must hold at every reachable history and against every adaptive prover.

Verus form. Inference: derive a finite set of indexed obligations from a Rust API: each public precondition, state transition, and postcondition becomes a checkable item. Sample or schedule checks only when the detection probability is justified. A Verus `ensures` clause can provide a local checker, but the coverage argument connecting sampled obligations to the whole contract is an additional proof.

Evidence and limits. A detection rate averaged over tasks or participants is insufficient for the theorem; the bound must be conditional after every relevant history (§8, p. 30). The paper says constructing such checks “remains a task-specific requirement” (§1, p. 2) and that the theorems “do not provide a general method for obtaining them from free-form dialogue” (§8, p. 30).

## technique 3: sequential certificate and anytime-valid soundness

What it is. Let c_m lower-bound the probability that the human executes round m correctly, and q_m upper-bound the ideal false-pass probability under correct execution. Define qbar_m = 1 − c_m(1 − q_m). Start M0=1. On a passed diagnostic check update M_m = M_{m−1}/qbar_m; a failed check sets M_m=0 and rejects. Accept when M_m >= 1/delta (§4.1, pp. 14–16).

How to do it.

1. Fix delta, T, and the deterministic bounds c_m before execution; the diagnostic bound q_m is chosen before round m from the observable history F_{m−1}. Bounds must be valid for every covered history (§4, p. 13; §4.1, p. 14).
2. On each diagnostic round distinguish adequate response A_m, correct execution E_m, and observed Pass_m (§4, p. 13). Clarification rounds leave M_m unchanged (§4.1, p. 15).
3. Use qbar_m as the implemented false-pass bound; on a passed diagnostic check multiply M_m by 1/qbar_m (§4.1, p. 15).
4. Reject immediately on a failed diagnostic check; reject at T if the threshold has not been reached (§4.1, p. 15).
5. Apply Ville’s inequality to the nonnegative supermartingale M_m. Theorem 1 states that for every false statement and adaptive prover, Pr(ever crossing 1/delta) <= delta (§4.2, p. 16).

The paper’s exact words state the guarantee: “One threshold, fixed before interaction, controls the probability of ever accepting a false statement across the full horizon.” (§4.2, p. 16)

Verus form. Inference: represent M_m and the threshold in an external audit script or a Verus ghost state machine. Verus can prove arithmetic updates and invariants if qbar_m and the check semantics are specified; it cannot by itself establish a human execution probability or a model’s adaptive false-pass bound. Keep certificate bookkeeping separate from executable product behavior.

Evidence and limits. Soundness uses execution reliability, false-statement validity, and the certificate rule (items 1, 2 and 4 of Assumption 1); it does not require adequate responses from the prover (§4.1, p. 16). The bounds are assumptions, and the theorem is conditional on them (§4.1, pp. 14–16). Inference: incorrectly specifying q_m or c_m invalidates the claimed error level.

## technique 4: finite-horizon completeness

What it is. For a true claim, a_m lower-bounds the probability of an adequate honest response. If adequate responses and correct checks occur through K rounds and the evidence reaches the threshold, Theorem 2 gives Pr(Accept) >= product from m=1 to K of a_m c_m (§4.3, p. 17).

How to do it. Specify a response-reliable honest prover, c_m, a_m, and K<=T. Require that an all-adequate, correctly executed path accumulates sum of −log(qbar_m) >= log(1/delta). Multiply conditional probabilities; no independence between rounds is required (§4.3, p. 17). Include timeout and failed checks in the rejection probability.

Verus form. Inference: treat each model answer and human check as an explicit assumption in a reliability ledger. Verus can prove that, under those assumptions, a bounded protocol reaches a declared state; probability estimates and honesty assumptions remain outside ordinary functional verification.

The paper’s completeness condition is narrower than correctness of the claim: it concerns a specified honest prover and verifier implementation, not arbitrary model behavior.

## technique 5: anchored adaptive challenges

What it is. Adaptive follow-ups are useful but may have no known detection bound. Reserve probability lambda_m for a reference check with detection probability at least rho_m against every adaptive prover. Then q_m = 1 − lambda_m rho_m and qbar_m = 1 − c_m lambda_m rho_m (§4, p. 18; Appendix D).

How to do it. Choose lambda_m before each round from prior observable history. With probability lambda_m run the reference check; otherwise ask an adaptive follow-up. Prove the bound for the mixture policy as a whole. In the schedule example, uniform sampling gives rho_m=1/J while follow-ups investigate suspicious entries (§4, p. 18; §7.2, p. 29).

Verus form. Inference: use a Verus state machine whose transition records whether a reference obligation or adaptive question was selected. Prove that the reference branch remains available and that its evidence update is accounted for. Do not claim soundness for arbitrary follow-ups unless their combined policy has a proved bound.

## technique 6: certifiable effective region under fixed budgets

What it is. For fixed-length protocols, R_n = product qbar_i bounds false acceptance and C_n = product a_i c_i bounds true acceptance. Lengths n satisfying R_n <= delta and C_n >= 1−gamma form the certifiable effective region (§5, pp. 19–20).

How to do it. Fix challenge rules and bounds before execution. Find K_delta, the first n with R_n<=delta. Choose n only when C_n>=1−gamma as well. Proposition 2 says that if the region is nonempty it is an integer interval with n_min = K_delta: R_n and C_n are both nonincreasing, so {n : R_n <= delta} is a suffix starting at K_delta and {n : C_n >= 1−gamma} is a prefix (§5, pp. 20–21). More checks tighten the false-acceptance bound but can weaken the true-acceptance bound (§5, p. 19). A more conservative additive condition (Corollary 2) uses (1−q) times the sum of c_i >= log(1/delta), together with C_n>=1−gamma (§5, p. 21).

Verus form. Inference: encode the round budget, threshold, and reliability assumptions as ghost state and prove interval or monotonicity lemmas. The product bounds are a planning model; they do not measure the actual cost of proving a Rust contract.

The paper’s worked example uses T=14, q=.20, delta=.10, gamma=.20, a_i=1, and c_i=0.985−0.001(i−1); its additive sufficient region is lengths 3 through 11 (Figure 2, p. 22). The example is illustrative, not an empirical human study.

## technique 7: compare local decomposition with a global check

What it is. Proposition 3 compares a decomposed sequence of local checks with a global checker under common review, computation, and communication budgets. The result is conditional on independently justified diagnostic, response, and execution bounds for each implementation (§5.2, pp. 22–25; Proposition 3, p. 24).

How to do it. Hold claim, records, tools, and budgets fixed. Model cognitive load lambda_i and expertise-dependent execution reliability c_i. Compare the product of local c_i and a_i with global bounds. A local design is certified when its R_n and C_n meet both targets; a global design can fail certification even if its algorithm is exact when human execution is less reliable (§5.2, pp. 23–25). In the paper’s matrix-product example (Table 1, p. 25; Appendix E.3, pp. 47–48) the exact global checker (q_os = 0, assumed load 0.20) has false-accept bound 0.061875 against delta = 0.05 and is not certified, while five Freivalds checks have bounds 0.032602 and 0.911219 and are certified; with the assumed global load lowered to 0.10 the global check also meets both targets.

Verus form. Inference: compare proving one monolithic contract with proving indexed local invariants and composing them through a ghost state machine. Measure proof effort separately from the mathematical guarantee. A smaller local proof does not establish the global postcondition without a composition lemma.

The authors explicitly caution that this establishes a difference in what supplied bounds certify, “rather than an ordering of actual error rates or an advantage over all one-shot review methods.” (§8, p. 31)

## empirical technique: ANC as a selective signal

The simulations use Prover–Verifier Deliberation. A prover LLM gives an answer and checkable subclaims; a verifier LLM accepts, rejects, or challenges. Accept + No Change (ANC) means acceptance without an answer change. On 198 GPQA Diamond questions, Sonnet/Haiku ANC accuracy is 93.5% (108) versus 51.1% (90), gap +42.4 percentage points, with bootstrap 95% CI [+31.0,+53.5]; GPT-5.4/GPT-5.4-mini gap is +34.8 [+25.5, +44.3]; Gemini 3.1 Pro/Flash-Lite gap is +6.6 [−0.1, +13.7], an interval including zero (Table 2, p. 26). On 513 HLE multiple-choice questions, the Sonnet/Haiku ANC gap is −7.1 [−13.9, +0.1], an interval that includes zero, while GPT-5.5/Gemini 3.1 Pro is +27.9 [+19.6, +36.3] (Table 4, p. 28). In the stress tests (Sonnet 4.6 prover told to defend a wrong option, Haiku 4.5 verifier, T = 12), deliberately wrong defenses were accepted 12/198 (6.1%) in the naive test and 18/198 (9.1%) in the strategic test; every accepted case kept the wrong answer (Table 3, p. 27; §6.3, p. 27). The paper says these rates “are not estimates of the single-round q parameter in Section 5” (§6.3, p. 27); they measure answer-selection behavior, not the formal q or c bounds.

## techniques for the catalog

- finite-horizon deliberation — fix a claim, require challenge–response rounds, and conservatively reject at timeout
- bounded diagnostic sampling — derive a false-pass bound from a complete constraint list or reference check
- sequential certificate — multiply evidence by inverse implemented false-pass bounds and accept at a fixed threshold
- anytime-valid soundness — use a nonnegative supermartingale and Ville’s inequality against adaptive provers
- finite-horizon completeness — multiply honest-response and correct-execution lower bounds through a threshold-reaching prefix
- anchored adaptive review — reserve probability for justified reference checks while allowing adaptive follow-ups
- certifiable effective region — choose review lengths whose soundness and completeness products meet both targets
- local-versus-global comparison — compare decomposed and monolithic checks under common budgets and explicit reliability bounds
- ANC selective evaluation — measure whether unchanged accepted answers are more accurate, without treating the statistic as a theorem
