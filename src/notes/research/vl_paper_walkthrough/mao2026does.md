# Does the Proof Prove It That Way? Faithful Formalization of Elements Proofs
(authored by agents unless marked 🧑)
Tag: `mao2026does`, [paper](http://arxiv.org/abs/2608.15432v1)
## problem and faithfulness conditions

The paper studies proof-level faithfulness: whether a formal proof follows the natural-language (NL) argument that motivates it. A Lean proof can compile while taking a different route, hiding gaps and making the formal artifact hard to inspect. The authors introduce Pistis, a two-stage map-and-fill pipeline, and OrderDecompose, an oracle-guided hierarchical search that preserves mapped proof structure while filling missing formal steps.

The paper states: “While automated proof search can produce a formal proof that compiles, the generated proof does not necessarily reflect how the natural-language argument arrives at its conclusion.” (abstract, PDF p. 1). It defines five necessary conditions in Table 1: Coverage, Atomicity, Atomic Faithfulness, Order, and Citation; Soundness is separate and checked by Lean (section 3.1, PDF p. 3). The conditions are necessary but not sufficient: “Complete faithfulness is, we argue, unattainable: since a formal proof must fill gaps the NL proof omits, a formalization mirroring the NL proof exactly would leave those gaps and hence be unsound.” (section 3.1, PDF p. 3).

Coverage requires NL segments to concatenate in source order. Atomicity requires one assertion per segment. Atomic Faithfulness requires each assertion and assumption to faithfully formalize its text. Order requires formal assertions to be a subsequence of the final proof. Citation requires every cited proposition to be available earlier. Soundness requires Lean compilation without sorry (Table 1, PDF p. 3).

## technique 1: map stage with explicit proof objects

What it is. Pistis first maps the NL proof into an ordered Lean skeleton with sorry bodies. Its output is a tuple containing formal steps, NL segments, assumptions, assertions, and mappings from text to formal claims (section 3.2, PDF pp. 3–4). The euclid_sentence tactic stores each source sentence and its claim type; structural sentences store no claim and map to True (Appendix A.1, PDF p. 10).

How to apply it. The implementation sequence is (Appendix A.2, PDF pp. 10–11):
1. Run faithful-split to split the source proof into ordered atomic assertions.
2. Run check_faithful.py --split to ensure the segments tile the source byte-for-byte, enforcing Coverage.
3. Run faithful-map to stamp a Lean placeholder for every segment.
4. Replace each placeholder True with the segment’s formal assertion and add @assumption tags for assumptions.
5. Recheck Coverage and Order; an oracle checks Atomicity and Atomic Faithfulness.
6. Save approved map objects with check_steps.py --save so filling cannot alter them.

The example uses euclid_sentence "1.6.1" "For if AB is unequal to AC then one of them is greater." (step1 : ...) := by sorry and tags the assumption “AB is unequal to AC” with its formal type (Figure 10, PDF p. 11). It introduces euclid_wts for a “what-to-show” sentence whose assertion is empty and whose formal claim is True (Appendix A.1, PDF p. 10).

Verus form. Inference: use a Rust/Verus source skeleton with one proof or specification item per NL sentence, storing source text in comments or ghost metadata and placing each claim in a proof fn or spec fn. Inference: preserve order and mapping with generated files and a checker that refuses edits to approved items. Verus does not provide Pistis’s euclid_sentence tactic; this is an external mapping layer. Inference: spec fn expresses pure claims, while proof fn discharges them using requires and ensures.

Evidence and limits. The pipeline was applied to 92 Elements propositions (48 Book I, 14 Book II, 30 Book III) (section 3.2 and section 4.1, PDF pp. 3 and 5). The map-stage oracle is human or LLM based, so mapping errors and interpretation of Atomic Faithfulness remain trusted (section 3.2, PDF p. 4; section 6, PDF p. 9).

## technique 2: OrderDecompose hierarchical fill search

What it is. OrderDecompose fills each mapped formal step in order and recursively decomposes an unproved goal into helper lemmas. Algorithm 1 first loops over subgoals, retries each until all checks pass, and then returns success. Its recursive Decomp tries direct SMT proof under a 30-second budget; if that fails, it asks an LLM for lemmas, keeps only lemmas that are sufficient and suppliable from the current context, and recursively proves each helper (Algorithm 1, PDF p. 4). The paper says: “When a direct SMT search fails, Decomp asks the LLM to propose intermediate lemmas h(j) → ω(j), keeps them only if they are sufficient (SF) to close ν and suppliable (SP) from the current context, and recurses on each.” (section 3.2, PDF p. 4).

How to apply it:
1. Attempt each mapped step in sequence, refusing to advance.
2. Try a direct SMT proof with current hypotheses and a 30-second budget.
3. If it fails, generate candidate helper implications.
4. Check Sufficiency (helpers plus context entail the target) and Suppliability (helper premises are available).
5. Recursively prove each helper, then prove the target.
6. Check Soundness, Citation, and unchanged map objects before advancing.

Hooks enforce the algorithm: the agent cannot write a later step before the latest checked step, and all builds go through scripts checking SF, SP, and provability (Appendix A.3, PDF p. 12). A concrete helper replaces a sorry at the absurdity step with euclid_apply (helper_1_6_step9 ...); the helper proves intermediate area facts and closes by linarith (Figure 11, PDF p. 12).

Verus form. Inference: encode each mapped goal as a separate proof fn, pass prior facts as requires, and create helper proof fns with intermediate postconditions. Inference: check helper sufficiency by proving the target under helper postconditions and check suppliability by proving each helper precondition from earlier facts. Inference: invariant is a loop annotation, not a callable function; helper proofs are erased and must not be called at run time.

Evidence. In the fill ablation over 15 propositions with three runs each, OrderDecompose achieved 15/15 success (100%) versus 6/15 (40%) for LLM-only, with total cost per success $15.6 versus $28.8 (Table 2, PDF p. 6). Pistis finished every run within about 3.5 hours while baseline runs hit a 12-hour cap (Figure 5, PDF p. 6). On cold compilation of Book I, Pistis compiled all 48 propositions in 13.3 minutes, compared with more than 7.3 hours for LeanEuclid, reported as over 33× faster (section 4.4, PDF p. 7). The measurements use Lean 4 v4.8.0-rc2, Z3 4.15.4, cvc5 1.3.4, and the stated cluster configurations (section 4.1, PDF p. 5).

Limits. OrderDecompose can return False because of LLM inability, a map-stage mistake, System E limitations, or a genuine Euclid/source error (section 3.2, PDF p. 4). It remains dependent on an LLM and map-stage oracle.

## technique 3: formal refutation of false steps

Pistis can refute a source proof. It checks either that an asserted step is false under hypotheses, ∃i, ∆ ∪ {α} ⊢ ¬formal(assert(si)), or that a step does not follow by finding a free-variable configuration satisfying α but violating the assertion (section 3.2, PDF p. 5; Appendix B.1, PDF p. 13). Either condition contradicts an accepted proof.

How to apply it. Split and formalize each assertion. For each step, attempt to prove its negation under all axioms and hypotheses. If that fails, search for a valuation satisfying hypotheses and falsifying the assertion. Mark the step refuted when either proof succeeds. In the paper’s example, a generated proof asserts that an angle is right; Pistis proves ¬ formal(assert(s3)), derives False, and rejects it (Figure 8, PDF p. 8).

Verus form. Inference: for a candidate Rust contract step, write a proof fn deriving the negation under the same requires; alternatively use a model-specific counterexample harness outside Verus to find inputs satisfying preconditions but violating the postcondition. Inference: runtime search is testing and cannot replace verification.

## technique 4: assumption-gap and citation-gap detection

Assumption gaps are checked between mapping and filling. Pistis materializes each formal assumption as a have and tries rfl, assumption, simp, linarith, nlinarith, and euclid_finish in that order; an unclosed assumption becomes a marked gap with a sorry placeholder (Appendix B.2, PDF p. 13). Across 92 proofs, 311 assumptions were materialized and 33 marked gaps: 11 in Book I, 5 in Book II, and 17 in Book III (Appendix B.2, PDF p. 13).

Citation gaps occur when a cited proposition is unavailable or incorrect. A @suppress_deps_check tag records a source-edition mistake or intentionally skipped proposition; seven tags were used in Book III (Appendix B.3, PDF p. 13). Generic gaps arise when OrderDecompose cannot close a step and the oracle confirms a genuine omission; they are marked @euclid_gap. The authors report 17 generic gaps in Book III and none in Book II (section 4.5, PDF p. 8; Appendix B.4, PDF p. 13).

Verus form. Inference: materialize every agent-introduced assumption as a separate lemma obligation and fail the build when it cannot be proved from current requires and earlier facts. Inference: represent citation dependencies as explicit lemma dependencies and reject forward references. Inference: retain a distinct gap marker for obligations deferred to review; never treat external_body as proof of the function being verified.

## techniques for the catalog

- Pistis map stage — split natural-language proofs into atomic ordered segments and map each segment to an explicit formal claim with assumptions and citations
- OrderDecompose — fill mapped goals in order using recursive helper decomposition constrained by sufficiency, suppliability, and soundness checks
- formal refutation — prove a step’s negation or find a satisfying counterexample configuration that violates its assertion
- assumption-gap detection — materialize assumptions and discharge them with a fixed tactic sequence, marking unclosed obligations
- citation-gap detection — enforce backward-only proposition dependencies and flag unavailable or incorrect cited results
- immutable proof structure — lock approved map objects and prevent agents from skipping ahead or rewriting prior steps
