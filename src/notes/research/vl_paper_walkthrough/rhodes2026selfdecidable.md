# Not Self-Decidable: LLMs Cannot Draw the Boundary of What an Agent Verifier Can Check
(authored by agents unless marked 🧑)
Tag: `rhodes2026selfdecidable`, [paper](https://arxiv.org/abs/2610.04699)

## what the paper proves and measures
The paper studies runtime routing: for every predicate in an agent rule, decide whether executable code can settle it exactly or a judge must interpret it. It calls the ability to classify that *self-decidability*. The key claim is empirical: model agreement is high on clear endpoints but unreliable on regulatory predicates, and models can share the unsafe error of calling a judgment mechanically checkable. The paper states, “A verifier for an agent must know the limits of its own competence.” (Abstract, p. 1.)

The corpus has 832 predicates from six corpora, four models from three labs, four rubric variants and two perturbation instruments, about 22,000 calls (§5, p. 5). Calibration endpoints obtain κ 0.92–0.99, while regulatory text obtains κ 0.20–0.50 (§6, p. 5). The 231 regulatory predicates have 65% contested labels for EU AI Act and 52% for FINRA; agent rules have 33% (Table 3, p. 16). These are cross-model disagreement rates, not truth rates. Ground truth for regulation is an LLM proxy; a replication uses one human annotator on 53 FINRA rules (§C.2, pp. 14–15). The paper explicitly limits its agent corpus to 73 predicates from 20 rule families in one credit agent and 36 synthetic action records (§9, p. 9; §8.3, p. 8).

## technique: separate criterion type from instance verdict
What it is: classify a criterion as decidable only when a fixed, interpretation-free procedure over stated facts returns the exact answer; otherwise route it to judgment. A date comparison is decidable; “the disclosure is adequate” is judgment (§1, p. 1; §4.1, p. 4).

When to use it: before any runtime enforcement or escalation policy, because every predicate must be routed and over-claiming silently automates an unassessed judgment (§3, p. 3).

How to do it:
1. Decompose each external rule into predicates using a fixed schema (the paper’s protocol, §5, p. 5).
2. Ask each model for DECIDABLE or JUDGMENT at temperature 0 with no hedging (§5, p. 5).
3. Treat labels as routing candidates, not proof; disagreement means escalation under the conservative baseline (§8.1, p. 7).

Verus form (Inference): represent an admitted predicate as executable Rust plus a `requires`/`ensures` contract over attested record fields. Use `assert`, `assert_by`, and loop invariants only for proof obligations; do not encode a model label as a proof. A judgment predicate remains an external call or explicit runtime branch, outside the verified function’s contract.

Evidence and limits: single-model bias reverses by corpus. GPT-4o calls 1% of regulatory judgment predicates decidable but 71% of agent-rule judgment predicates; denominators are true-judgment predicates (78 and 24) (Figure 2, p. 5). This makes no model uniformly conservative. Inference: a Verus contract can prove the chosen check, but cannot prove that the natural-language requirement was correctly classified unless the requirement itself is formalized and linked to trusted fields.

## technique: COV ER corroborate-then-verify routing
What it is: use unanimous model agreement only to nominate predicates, then synthesize and execute a check that must pass independent gates. The paper summarizes the design: “Agreement across independent models only nominates a rule; admitting it requires a test the panel does not control.” (§1, p. 3).

How to do it step by step (Algorithm 1, Appendix A, p. 12):
1. Set auto-enforced set A and escalated set E empty.
2. Form U from predicates for which every panel model returns DECIDABLE.
3. For each nominated predicate, synthesize a bounded comparison, lookup, format, or count check over named slots.
4. Reject a check that reduces to an identity on one slot (G0 structure).
5. Compute the fraction of slots readable from attested fields (G1 groundedness).
6. Require sensitivity: some observed field intervention must change the check result (G2).
7. Require invariance under deterministic neutral rewording of records (G3).
8. Admit `(predicate, check)` only when thresholds pass; otherwise put the predicate in E for judging. Unattempted predicates also join E.

Verus form (Inference): make the action record a struct with ghost/spec views for attested fields; implement the synthesized check as a `spec fn` or verified executable function, with `requires` that attested slots exist and `ensures` describing the Boolean rule. Prove sensitivity as a separate lemma about two records and invariance as a lemma relating a rewording-preserving abstract record; Verus cannot prove semantic faithfulness of an extractor without a model of extraction. `old(...)` is available in postconditions when pre-state values matter; `invariant` is a loop annotation, not a call.

Evidence: unanimous agreement has 99.2% precision on gold synthetic data and 97.0% on regulatory text, but 82.9–83.0% on agent rules, where models err together (Table 1, p. 6). On 73 agent predicates and 36 synthetic records, tightening invariance gives 85.0% precision against a 67.1% base rate; on a seeded confirmation half, the gate admits 10 predicates at 90.0% precision with one false-decidable, versus unanimity’s 19 at 89.5% with two (§8.3, p. 8). It does not beat unanimity at comparable elimination: it removes 27.4% of judge calls versus 56.2% (§8.3, p. 8).

## technique: test and reject judge-agreement as certification
The paper synthesizes a check and accepts it when it agrees with a reference judge on held-out cases. At threshold τ=1 it admits 43/173 EU AI Act predicates at 79.1% precision (§8.2, p. 7). Agreement rises from 29.6% to 76.7% across calibration buckets, while true-decidable rates are 55.6%, 75.0%, 62.8%, 62.3%, and 79.1%; therefore this gate measures reproducibility with the judge, not checkability (§8.2, p. 7). “Agreement with an estimator cannot certify the absence of estimation.” (§8.2, p. 7.)

Verus form (Inference): a proof that a check matches a reference oracle can be expressed as a lemma over a finite test set, but it establishes only agreement with that oracle. It does not justify `ensures` for the real requirement unless the oracle and test-set coverage are trusted assumptions.

## technique: perturbation and specification ablations
The paper tests whether labels are stable under meaning-preserving paraphrases and deterministic template wrappers. Opus flips 33% of borderline labels versus 5% controls; GPT-4o flips 44% versus 7% under templates (Table 6, p. 18). A prescriptive rubric lowers contested EU AI Act rate by 30.9 percentage points and FINRA by 19.6, yet converted predicates are only 57.7% accurate versus 88.8% for unprompted consensus (§7, p. 6; Appendix D, p. 16). Swapping eight worked examples changes the resolved set (Jaccard 63.3%) and accuracy (58% versus 76%) (Appendix D, p. 16). Inference: Verus specifications need regression tests under semantics-preserving input changes, because proof stability does not establish requirement stability.

## what is trusted, what remains, and VL threat
The executable check, attested fields, record construction, rewording operator, extraction model, Verus verifier/solver, Rust compiler, external libraries, and natural-language-to-predicate decomposition remain trusted to varying degrees. The paper admits faithfulness is uncheckable by intervention alone: “One agent obligation carries three deontic clauses and its rule covers one.” (§8.3, p. 9.) Its synthetic gate is preliminary; the deployed corpus is one credit agent; regulatory labels are mostly proxy labels; and adversarial predicate authorship is out of scope (§9, p. 9; §E.4, p. 19).

Inference: threat to VL is high for routing and specification capture, not because Verus fails its proof obligations. An agent can produce a valid proof for a check that reads an agent-written field or omits a clause. COVER’s attested-field and fail-closed ideas are directly useful: auto-verification should require externally produced evidence, while unresolved predicates remain judged. The paper’s cost model makes the trade explicit: token cost is `N(1-q)cj`, while safety cost is `Nqf` times missed-determination loss (Appendix F, p. 20). What VL should not redo is a single-model “decidability classifier” or a judge-agreement certificate; this paper already shows why both are unsound.

## techniques for the catalog
- type routing: classify each predicate as fixed-checkable or judgment before enforcement
- corroborate-then-verify: use unanimous panel output only to prioritize synthesis, then gate the executable check
- attested-field grounding: reject checks that read agent-written evidence
- intervention gate: require structure, groundedness, sensitivity, and rewording invariance
- perturbation audit: re-probe labels under meaning-preserving paraphrases and templates
- dual-cost accounting: report automation coverage, false-decidable denominator, and recurring judge cost
Checked 2026-10-15 against paper rhodes2026selfdecidable: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
