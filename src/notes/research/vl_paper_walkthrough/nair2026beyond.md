# Beyond Type-checking: Towards Holistic Evaluation of Formal Specification Generation
(authored by agents unless marked 🧑)
Tag: `nair2026beyond`, [paper](https://arxiv.org/abs/2610.10604)
## paper and focus

Nair, Vempaty, Liu, and Jagmohan evaluate formal specification generation (SpecGen) for Lean tasks. They study a central failure mode for Verus-like products: a proof can be correct relative to a contract that does not express the user's requirement. The paper assembles 350 tasks, evaluates four agent configurations, and combines formal validity, reference comparison, equivalence, and finite behavioral tests. Its abstract states: “A checked proof can therefore establish correctness against a specification that misrepresents the intended behaviour.” (Abstract, PDF p. 1.)

The datasets contain 189 VERINA tasks and 161 CLEVER tasks. The four configurations are a direct-prompted baseline, the VERINA pipeline, the CLEVER few-shot pipeline, and a LeanAide adapter, all using GPT-5.6 (Sol). The experiments are saved-run evaluations, not a new generation benchmark.

## technique 1: use four complementary evaluator families

What it is and when to use it. Evaluate each generated contract with independent signals answering different questions: formal validity, reference similarity, reference equivalence, and behavioral adequacy. Use this when type-checking or proof success could hide a wrong contract.

Steps in the paper. Give the SpecGen agent only its permitted requirement and prompt context. After generation, combine the candidate with evaluation-only artifacts: the Lean environment, reference specification, natural-language statement, and optional labeled examples. Parse and normalize the candidate, project comparable declarations, then run each evaluator independently. Store every result with its value or status, scope, denominator, runtime, and evidence status. Keep unavailable evidence distinct from a numeric failure. The paper says: “Each evaluator emits a scoped result before coverage-aware aggregation, so unavailable evidence remains distinct from metric failure.” (Figure 1 caption, PDF p. 2.)

Formal validity is a Lean type-check boolean. Reference similarity includes normalized exact match, signature F1, logical-atom F1, and generalized tree-edit similarity (GTED). Reference equivalence, BEq+, attempts both directions of a Lean implication proof. Behavioral adequacy uses positive-test recall `R+`, negative-test rejection `R−`, balanced accuracy, finite-suite pass@1, and required-input recall `Rreq`.

Verus form. Inference: use `verus` compilation and proof checking as formal validity, but report it separately from contract agreement. Inference: compare normalized Verus declarations structurally only as a diagnostic, and use a bidirectional equivalence lemma where two contracts can be expressed in the same state model. Inference: run positive and negative executable tests plus required-input tests; record unavailable model extraction or harness failures as unavailable, never as zero. Verus proof success alone answers whether the implementation satisfies the generated contract under its assumptions.

Evidence and limits. The paper emphasizes: “It does not establish agreement with either the reference or the natural-language requirement.” (Section 2.3, Formal validity, PDF p. 4.) BEq+ failure is inconclusive because proof search can fail even when contracts are equivalent. Finite behavioral scores establish behavior only on supplied examples and do not prove universal correctness.

## technique 2: measure input coverage separately from postcondition behavior

What it is and when to use it. A contract can accept all tested valid outputs and reject invalid outputs while excluding every required input through a false or overly restrictive precondition. Measure `Rreq` independently from `R+` and `R−`.

Steps. Define intended input/output pairs `T+`, unintended pairs `T−`, and required inputs `Dreq`. Compute `R+` as the fraction of `T+` admitted by the postcondition, `R−` as the fraction of `T−` rejected, and `Rreq` as the fraction of `Dreq` satisfying the precondition. Report finite pass@1 only when both `R+` and `R−` equal one. Use authored controls to calibrate each dimension. The paper's control requirement is an integer result `y > x`, with required inputs −1, 0, and 1; positive outputs are `x+1` and `x+2`, and negative outputs are `x` and `x−1`.

The key finding is explicit: “a specification achieves 100% positive test recall and negative test rejection while accepting 0% of required inputs.” (Abstract, PDF p. 1.) In Table 4, the `False` precondition with postcondition `y>x` has `R+ = 1`, `R− = 1`, and `Rreq = 0`; `x>0` gives `Rreq = 1/3`, with the same perfect postcondition scores. Each denominator is six labeled pairs for `R+`/`R−` and three required inputs for `Rreq`.

Verus form. Inference: generate a required-input set from the natural-language requirement and test whether each input satisfies `requires`. Evaluate postconditions on labeled positive and negative output pairs, and report all three rates. Inference: include boundary and empty-domain checks so an agent cannot obtain a perfect proof by writing `requires false`.

Evidence and limits. These controls show that the metrics respond to known defects; they do not measure how often model outputs have restrictive preconditions. The paper says: “These controls illustrate distinct feedback dimensions, not the prevalence of model errors.” (Figure 7 caption, PDF p. 19.)

## technique 3: make measurement coverage explicit

What it is and when to use it. Conditional metrics can compare different subsets of tasks and reverse rankings. Always report available counts and, when comparing systems, restrict to jointly measurable task IDs.

Steps. Run all four configurations on every task: 756 VERINA task–configuration records and 644 CLEVER records. Keep generation failures in candidate-production and type-check denominators. Compute GTED only where representation and dependencies permit, and show its count. For a controlled comparison, intersect task IDs with GTED measurements for every configuration. On VERINA this gives 32 tasks; on CLEVER, 85 tasks among three measurable configurations. Report both the full available-subset means and the intersection means, while stating that intersections are selected by metric availability.

The headline example is VERINA GTED: before restriction, means are 0.335 (115 tasks), 0.232 (150), 0.349 (46), and 0.243 (143) for VERINA, CLEVER, Prompted, and LeanAide. On the 32-task intersection, the means become 0.288, 0.345, 0.380, and 0.370, moving VERINA from second to fourth. The denominator is the jointly measurable 32 tasks, which are only 16.9% of the 189-task dataset.

Verus form. Inference: record the task ID, representation, verifier version, proof timeout, and whether each contract projection compiled. Compare agents on a common measurable subset only for diagnostic ranking; preserve full availability statistics so failed adapters are not hidden.

## technique 4: inspect extraction and equivalence failures instead of trusting scores

GTED builds operator trees after Lean elaboration and normalizes tree-edit distance to a similarity in [0,1]. The authors found extraction cases where GTED=1 compared fragments such as `List Int` or `Array Int`, not complete contracts; logical-atom extraction omits numeric literals and several Unicode comparison operators. Signature F1 can equal one when both feature multisets are empty. BEq+ uses kernel-checked bidirectional implications, but an unsuccessful search is classified as inconclusive.

The paper's evidence rule is: “An explicit harness error takes precedence over its number; unsupported cases and generation failures remain separate.” (Appendix B.2, PDF p. 17.) In Verus, inference: inspect the actual `requires`/`ensures` declarations selected by an extractor and reject scores derived from placeholders, missing imports, or helper declarations. A successful structural score is evidence about the representation produced by the evaluator, not a semantic proof.

## what the experiments show

On VERINA, type-check rates over all 189 tasks are 91.5% for both VERINA and CLEVER configurations (173/189), 85.2% for Prompted (161/189), and 95.8% for LeanAide (181/189). On CLEVER, rates are 90.1% (145/161) for CLEVER, 85.7% (138/161) Prompted, 68.9% (111/161) VERINA, and 83.9% (135/161) LeanAide. These are type-check signals, not intent correctness. Behavioral measurements exist only for VERINA in these runs. Historical VERINA finite-test passes are 0, 95, 29, and 61 for VERINA, CLEVER, Prompted, and LeanAide; 357 of 469 nonpasses (76.1%) carry explicit harness errors, so they cannot be interpreted as semantic failures.

The paper's authored controls establish the blind spot of postcondition-only evaluation. Its reference audit also found that all 350 upstream contracts compile in pinned native environments, while a common projection compiles 145/189 VERINA and 145/161 CLEVER tasks; export and projection differences include missing imports and helper-name mismatches. These facts limit cross-agent comparisons.

## trust, prior work, and VeruLaw threat

The framework trusts Lean kernels for type checks and equivalence proofs, reference contracts and labeled examples, extraction and normalization code, finite test oracles, and the four agent configurations. It does not establish that references match natural-language requirements, that finite tests are complete, or that metrics provide independent information. The authors identify VERINA, CLEVER, LeanEuclid, and VeriSpecGen as prior work; VL should not redo the basic observation that type-checking can miss intent. The paper's future work explicitly includes extending the system to Verus SpecGen.

Inference: an agent-written verified-Rust product faces a direct threat from weak `requires`, over-restrictive domains, and contracts that prove a convenient implementation rather than user intent. Adopt the four-family dashboard, especially required-input recall and negative-output rejection, before treating a proof as product evidence. Inference: Verus-specific work should preserve complete contracts across extraction, run kernel-checked equivalence where feasible, and publish unavailable evidence separately from zero scores.

## techniques for the catalog

- four-family SpecGen evaluation — combine formal validity, reference similarity, reference equivalence, and behavioral adequacy
- coverage-aware evidence records — attach scope, denominator, runtime, and availability to every metric
- required-input recall — score precondition coverage independently of positive and negative postcondition tests
- authored calibration controls — use known contracts to expose metric blind spots before evaluating models
- joint-measurability comparison — rank agents on task intersections with comparable evaluator evidence
- extraction and harness audit — inspect selected declarations and treat evaluator errors or placeholders as unresolved
Checked 2026-10-13: audit record nair2026beyond; paper-study comparison complete; gate executed; experiments not rerun
