# Inferring multiple helper Dafny assertions with LLMs
(authored by agents unless marked 🧑)
Tag: `silva2025inferring`, [paper](https://arxiv.org/abs/2511.00125)

Audit: audited 2026-10-13 against the paper; checked every number and fraction in Tables 1-8 and Table 5 overlaps, the cost arithmetic, the percentages, the page and section references, the prompts, the removal procedure, the failure counts, the quotations and the Verus forms; changed 3 slips: the worked example misplaced the condition inside its own by block, at most 4 positions for at most 4 generated assertions, and the insertion script said to add only assert statements, which the paper does not state.

source: Álvaro Silva, Alexandra Mendes, Ruben Martins (INESC TEC / University of Porto; Carnegie Mellon), arXiv:2511.00125v1, 31 Oct 2025, 21 pages, no appendix. The tool is DAISY (Dafny Assertion Inference SYstem). It builds on Laurel (Mugnier et al., the paper's reference 25). Section and page references below were located in the PDF text; the printed page number equals the PDF page.

Earlier coverage in the notes: research/distributed_verification_review_b/deep_12_second_pass_intent_eval.md has one section on this paper. It records the inputs (verified DafnyBench programs with helper assertions removed, contracts kept), the default of at most two insertion sites with ten candidates each, the hybrid row of Table 3, the dataset sizes 241, 235 and 30, the combined multiple-assertion figure 84/265, and the point that only removals that make verification fail are kept. It has no procedure for any technique, no error-to-position table, no retrieval formula, no position-validity metric, no per-type or failure analysis, and no Verus form. Those are what follows.

## the task and the pipeline on the paper's example

A program verified before; some helper assertions are now gone; the verifier fails. Find where to put new assertions and what they should say. Helper assertions are defined in §1 (p.1) as assertions or lemma calls that guide the verifier without affecting program behaviour.

The example (§2, pp.2-3). `FindRange(q, key)` returns the half-open range of a sorted sequence where elements equal `key`, with three quantified postconditions. A client calls it on `[1,2,2,5,10,10,10,23]` with key 10 and asserts `i == 4 && j == 7` with an `assert ... by { }` block whose body holds `assert q[0] <= q[1] <= q[2] <= q[3] < 10;`. With two helper assertions removed the verifier cannot prove it.

1. localization returns `[5, 6]`: insert after lines 5 and 6. A template with two placeholders is produced
2. inference returns ten candidate pairs for the two placeholders
3. one pair verifies: `assert 10 in q[i..j];` before the block and `assert (j == |q| || q[j] > 10);` inside it

The removed human-written pair was different (`assert q[4] == q[5] == q[6] == 10;` and `assert 10 < q[7];`, both inside the block). The paper checks necessity of the new pair: “Commenting out either added assertion causes verification to fail again, confirming that both are necessary.” (§2, p.3)

Why two stages and not one prompt. The authors first asked the model to insert all missing assertions into the whole program, and it sometimes changed unrelated code (§3, pp.3-4). “To address this issue, and inspired by Laurel [25], we separated the task into two tasks: fault localization and inference.” (§3, p.4)

## what is measured, what is trusted

Measured: the share of 506 failing Dafny programs that verify again after DAISY's insertions, for several localization and retrieval variants, all with GPT-4.1, Dafny (a fork of v4.10), Z3 v4.15.2, and a 300-second verification limit (§5.1, p.8). No statistical test is reported anywhere.

Trusted: Dafny and Z3; the unchanged specifications; and the insertion script, which the paper describes only as processing the response by extracting and parsing the returned JSON. Because the model returns JSON lists of assertions that a script inserts at marked lines, it cannot edit signatures, `requires`, `ensures` or invariants. Inference: that is a structural guarantee stronger than a prompt instruction, and it is the paper's real answer to the unreliable one-prompt approach; the paper does not state whether returned strings are checked to be single `assert` statements, so an `assume` smuggled into a candidate is not ruled out by anything written.

## technique 1: line-numbered LLM localization that returns one or two positions

What it is. A prompt that shows the failing method with a number before every line, then the verifier's error message, and asks for a JSON list of one or two line numbers after which an assertion should go (§3.1, pp.4-5). The paper calls it Llm_fl, and LlmEx_fl when retrieved examples are added.

When to use. When more than one assertion may be missing, or the fix is not adjacent to the reported error. The heuristic alternative “can return only one position” (§3.1, p.5).

Steps (§3.1, pp.4-5):
1. prefix each line of the method with its line number
2. state the task and output format, from the paper's prompt:

```
Your task : return 1 or 2 line numbers after which a missing helper assertion should be
 inserted to fix the program as json .
- [3] : one assertion after line 3
- [3 , 4] : assertions after lines 3 and 4
```

3. state where insertion is forbidden: outside the method body, in signatures, in `requires`, in `ensures`, in loop invariants
4. give a small worked example showing which answers are valid and what the method looks like after insertion
5. append the numbered target method, then the verifier error message
6. for the example-augmented variant, add retrieved examples chosen as in technique 3
7. parse the JSON; for each returned line, insert a placeholder comment after it

The cap of two is a choice made from data: without the cap the model generated at most 4 assertions and results were similar (§5.2, p.10). “Since we observed that verification often requires only adding a few additional assertions and the number of missing assertions is unknown a priori, we use by default the version that caps generation at 2 assertions.” (§5.2, p.10)

Verus form. Inference: the prompt transfers with the body of one Rust function inside `verus!`, line-numbered, followed by the Verus diagnostic. The forbidden zones become the function header (`requires`, `ensures`, `decreases`) and the loop header clauses (`invariant`, `decreases`). Legal positions are statement boundaries inside the body and inside `proof { }` blocks; a position inside an exec expression chain is not legal for an `assert(...)`. One change: a helper fact in executable Verus code may need to sit inside a `proof { }` block when it calls a lemma, so the insertion script has to wrap lemma calls, while a bare `assert(...)` can stand alone. One thing that does not carry over: the prompt forbids touching loop invariants, and in Verus a failing proof inside or after a loop is far more often a missing `invariant` clause than a missing `assert`, because a Verus loop body sees only what its invariants state. A Verus version needs a third kind of position, the loop's invariant list, which this paper excludes by construction.

Evidence (GPT-4.1; programs verified after insertion).
- with no examples in the inference prompt (Table 6, p.12): Llm_fl 160/506 (31.6%); LlmEx_fl 177/506 (35.0%); the Laurel heuristic 152/506 (30.0%); the extended heuristic 163/506 (32.2%); true positions 208/506 (41.1%)
- with the best retrieval (Table 3, p.9): LlmEx_fl 124/241 with one assertion missing, 70/235 with two, 7/30 with all, 201/506 overall (39.7%)
- on the hard half of the two-missing set, where both removed assertions are individually necessary (172 programs): LlmEx_fl 17 (9.9%), extended heuristic 8 (4.7%) (Table 4, p.10). LlmEx_fl returned a single position for 86 of those 172 and still fixed 8; where it returned two it fixed 9 (§5.2, p.10)
- position quality on the one-missing set: a valid position in 70% of cases for LlmEx_fl and 73% for the extended heuristic (§5.3, p.11)

Limits. The model was not given definitions of called functions, lemmas or types; the paper counts 9 unsolved one-missing cases to this: “Since we did not provide definitions of auxiliary functions, lemmas, or types in the prompt, some GrTru_fl assertions could not be inferred.” (§6, p.15)

## technique 2: error-message heuristics, extended, and run beside the LLM

What it is. A rule table from verifier error type to one insertion point (Table 1, p.5). B means before the reported line l (insert at l − 1); E means at the end of the enclosing block.

The table:
- Assertion, Related, LHSValue, Calc, Constructed: B (from Laurel)
- Postcondition, AssertBy, Forall: E (from Laurel)
- LoopInvariants: E (added by DAISY)
- TimeOut, SubsetConstraints, ElementNotInDomain: B (added by DAISY)

The paper names the types and does not define each one; the reading of the names is left to Dafny's error categories.

Steps (§3.1, p.5; §5.2, pp.10-11):
1. read the error type and reported line from the verifier's diagnostic
2. look up B or E and compute the single insertion point
3. run the inference stage on that position
4. independently run the LLM localization of technique 1 and its inference
5. accept the program if either run produces a verifying candidate (the hybrid the paper writes as LlmEx_fl // Laurel_fl+, described as using both localization results in parallel)

What the extension bought. The original heuristic returned no position for about 20% of the one-missing cases, mainly loop-invariant errors; the extended one for about 7% (§5.3, p.11).

Why run both. They fail on different programs (Table 5, p.11). On the one-missing set, the heuristic alone found a valid position in 40 cases where the LLM did not, the LLM alone in 33, both in 136. In verified programs over all 506: 36 only by the heuristic, 52 only by the LLM, 149 by both, union 237. The paper's example of a heuristic miss: a test calls `rawsort(a)` and then asserts the sorted contents; the heuristic puts the placeholder just before the failing assertion, the LLM puts it before the call, which is where a fact about the input array is needed (§5.2, p.11).

Verus form. Inference: the same table over Verus's failure kinds. A failed `assert(...)` or a failed `requires` at a call site: insert before that statement. A failed `ensures`: insert at the end of the function body, or before the `return` the diagnostic points at. A loop `invariant` that fails at the end of the body: insert at the end of the loop body; one that fails on entry: insert before the loop. A resource-limit failure: insert before the reported statement, though splitting the proof is the more usual Verus remedy and no single assertion may help. A failing `decreases` has no counterpart in the paper's table.

Evidence (Table 3, p.9; GPT-4.1; best retrieval). Hybrid: 153/241 (the paper prints 63.4%; the fraction is 63.49%), 76/235 (32.3%), 8/30 (26.7%), 237/506 (46.8%). Extended heuristic alone: 125/241 (51.9%), 54/235 (23.0%), 6/30 (20.0%), 185/506 (36.6%). True positions: 160/241 (66.4%), 85/235 (36.2%), 10/30 (33.3%), 255/506 (50.4%). The abstract's 31.7% for multiple missing assertions is (76 + 8)/(235 + 30).

A caution about the comparison. Inference: the hybrid is a union of two complete runs, so it submits up to twice as many candidates to the verifier as either single method or the true-position run. Part of its gain may be the extra samples and not the complementary positions; the paper has no control that gives a single method twenty candidates.

## technique 3: ten candidates per position in one call, with examples retrieved by code and error similarity

What it is. One prompt returns, for every placeholder, a JSON array of exactly ten candidate assertions (§3.2, p.6). Examples of solved cases are retrieved by a weighted sum of two cosine similarities.

Steps (§3.2, p.6):
1. mark each localized line in the method with the placeholder comment
2. prompt, from the paper:

```
Locations needing assertions are marked . For each location , return a JSON array of exactly 10
 valid Dafny assertions that could fix the error at that point .
Output : a list of JSON arrays , one per location . No explanations or markdown .
```

3. follow the preamble with the whole method and additional context
4. for retrieval, precompute for every dataset entry two embeddings with jina-embeddings-v2-base-code: one of the filtered error message, one of the full method body
5. embed the failing program's error and code; score each entry as α · sim_error + (1 − α) · sim_code
6. take the top 3, excluding entries from the same function, method or lemma: “We then retrieve the top k = 3 matches, excluding examples from the same functions, methods or lemmas, to prevent data leakage.” (§3.2, p.6)
7. each example shows the failing method, the verifier output, and the assertions that restore verification
8. parse the JSON, insert candidates, verify. With two positions the paper tests each candidate pair and also each member alone with the other position left blank (§7, p.16)

Step 8's reason: “Testing only the complete pair (A0, A1) could result in the entire combination being marked invalid due to a single incorrect position.” (§7, p.16) The paper does not give the number of verifier calls per program this implies, nor how the ten candidates of one position are paired with the ten of the other; §2 speaks of ten candidate pairs.

Verus form. Inference: candidates are `assert(...)` statements, `assert(...) by { ... }` blocks, or calls to lemma `proof fn`s, since §1 counts lemma calls as helper assertions. The retrieval corpus has to be built first: verified Verus functions with one proof line removed, the resulting diagnostic, and the removed line. Excluding entries from the same function is necessary and for a Verus corpus not sufficient, because sibling functions in one module often share the same lemma; excluding by file is the stricter rule and is not in the paper. The returned strings also need a scan that rejects `assume` and `admit()`, since a candidate is inserted verbatim.

Evidence (Table 7, p.14; GPT-4.1; true positions, so retrieval is isolated; programs verified of 241 / 235 / 30 / 506).
- no examples: 124, 79, 5; 208 (41.1%)
- random examples: 124, 75, 5; 204 (40.3%)
- TF-IDF: 158, 79, 10; 247 (48.8%)
- code embedding only (α = 0): 164, 82, 8; 254 (50.2%)
- α = 0.25: 151, 75, 8; 234 (46.2%)
- α = 0.5: 160, 85, 10; 255 (50.4%)
- α = 0.75: 157, 86, 9; 252 (49.8%)
- error embedding only (α = 1): 150, 83, 8; 241 (47.6%)

Readings. Random examples do nothing: “The NoEx_in and Random_in baselines perform almost identically, indicating that irrelevant examples provide no benefit.” (§5.4, p.13) Relevant examples matter most when one assertion is missing (124 to 164 of 241) and when all are (5 to 10 of 30), and hardly with two missing (79 to 86 of 235); the paper's explanation is that surviving assertions in the code already act as examples. Inference: the mixed score is not shown to beat plain code embedding. The chosen α = 0.5 wins by one program of 506 over α = 0, and α = 0.25 is worse than both neighbours, which looks like noise of at least 20 programs between settings; no repeated runs are reported.

Cost (§5.1, p.8). Whole study about $70 (about 20M input and 4M output tokens at $2 and $8 per million, which is $72). For the best configuration on all 506 programs the paper gives 3.6M input and 0.30M output tokens, “costing approximately $8.84”, and 1.33¢ per example. These three do not agree: the token counts at the stated prices give $9.60, and $8.84 over 506 programs is 1.75¢ each.

## technique 4: building a repair benchmark by assertion removal, keeping only real failures

Steps (§4, pp.6-7), starting from DafnyBench's 782 verifying programs, applied to every function, method and lemma:
1. one missing (w/o-1): remove each assertion alone; keep the case only if verification now fails. “If removal caused verification to fail, we added both the missing assertion and the corresponding program to the w/o-1 dataset.” (§4, p.7)
2. two missing (w/o-2): remove every unique pair; drop a pair when exactly one member is in w/o-1, since it is as hard as that single case; keep pairs where both are in w/o-1 and pairs where neither is
3. all missing (w/o-all): remove every assertion; keep only cases with at least three removed and a failing verifier
4. record with each case the removed assertions and the verifier error
5. during generation, precompute for each single-assertion case every line where re-inserting the removed assertion is a syntax error, is valid but does not verify, or verifies (§5.1, p.8); this feeds technique 5

Result: 241, 235 and 30 cases. The two-missing set splits into 172 pairs where both are individually necessary and 63 where neither is (Table 4, p.10). The all-missing cases have 3 to 10 assertions removed, 5 on average (§5.2, p.10).

Why so few all-missing cases: about 25% of assertions are test-like checks, and removing them leaves nothing to fail (§4, p.7).

Why the filter in step 1 matters, in the paper's comparison with DafnyBench's own 68% infill figure: “Whereas Loughridge et al. included all cases, we restricted our evaluation to cases where removing an assertion produced a genuine verification failure, which excluded easier cases containing only loop invariants or trivial assertions that do not aiding the verification, resulting in a more challenging benchmark.” (§8, p.18)

Verus form. Inference: the same three removal modes over `assert(...)`, `assert(...) by { }` and lemma-call statements in verified Verus code, keeping only removals after which Verus reports an error. Two Verus additions suggest themselves and are not in the paper: a fourth mode removing loop `invariant` clauses, and a rerun of each kept case to drop those that fail only through solver instability.

A subtlety the split exposes. Table 4 shows the two halves of the two-missing set are different tasks: on the 63 neither-necessary pairs every method scores 73% to 89%, on the 172 both-necessary pairs 4.7% to 19.1%. The headline 32.3% for two missing is a mix of the two, and 56 of the hybrid's 76 successes come from the easy 63.

## technique 5: judging a predicted position by re-inserting the true assertion there

What it is. A way to score localization separately from inference. Each predicted position gets one of three labels by inserting the ground-truth assertion at it (§5.1, p.8): invalid (syntax error), partial (syntactically fine, verification fails), valid (verification succeeds). A fourth outcome, no position, is used in §5.3.

Why not distance in lines. The same assertion often verifies at many lines: the paper finds assertions with more than 25 valid insertion points and valid points spread over 40 or more lines (Figures 2 and 3, p.9). “These findings underscore that line-distance to the ground truth is an unreliable metric, whereas our validity-based evaluation offers a more accurate measure of success.” (§5.1, p.8)

Steps:
1. for every one-missing case, try the removed assertion at every candidate line and store the label (done once, at dataset build time)
2. look up the label of each method's predicted position
3. report the share of valid, partial, invalid and no-position per method
4. condition repair success on the label

Evidence (§5.3, pp.11-12; one-missing set, 241 cases; GPT-4.1). Among each method's successful fixes, 88% (extended heuristic), 80% (Llm_fl) and 90% (LlmEx_fl) were at valid positions. Success given a valid position against success given a partial one: 51% against 24%, 51% against 25%, 56% against 18%. “Across methods, a valid classification nearly doubles the likelihood of success relative to a partial one, indicating that position quality is a strong predictor of verification outcomes.” (§5.3, p.12)

Limits the paper states. The label is about the original assertion only; a different assertion can verify at a partial position, and does in 10% to 20% of successes above. Insertion is always at the start of a line, which makes even the true position invalid in 3.8% of cases (§5.3, pp.11-12; §7 rounds this to about 4%). And the true position is not an upper bound: on the 63 neither-necessary pairs the hybrid (56) and LlmEx_fl (53) beat the true-position run (52) (Table 4, p.10).

Verus form. Inference: transfers directly; legal lines are statement boundaries in the body and in `proof { }` blocks. It gives a cheap regression test for a localization prompt that needs no model call for the inference stage.

## technique 6: a four-way assertion taxonomy and what it predicts

The classes (§4, p.7), for the 241 single removed assertions (Table 2, p.7): INDEX, about index properties of sequences, sets or arrays, 69 (28.6%); TEST, resembling unit tests, often in Main, 33 (13.7%); MULTI, spanning several lines, often with `by`, 12 (5.0%); OTHER, 127 (52.7%).

Success by class (Table 8, p.15; best retrieval; GPT-4.1):
- TEST: LlmEx_fl 23/33 (70%), true positions 28/33 (85%), extended heuristic 21/33 (64%)
- INDEX: 38/69 (55%), 52/69 (75%), 41/69 (59%)
- OTHER: 60/127 (47%), 79/127 (62%), 61/127 (48%)
- MULTI: 3/12 (25%), 1/12 (8%), 2/12 (17%)

The rows sum to the Table 3 totals for the one-missing set (124, 160, 125). The MULTI row has 12 cases, so its ordering of methods carries no weight.

The workflow the paper proposes from this (§5.5, p.14): first have a model draft test-like assertions as an executable specification; then run the verifier and use this paper's method to infer the helper assertions that make those tests verify. It is a proposal; no experiment runs it.

Verus form. Inference: the TEST class is a function whose body builds concrete inputs, calls the verified function, and asserts the concrete result. In Verus such tests fail for a characteristic reason, the solver needing help to evaluate a quantified `ensures` or a recursive `spec fn` at concrete values, and the helper assertions are instantiations at the concrete indices, exactly the kind in the paper's `FindRange` example.

## what still fails, and the fixes the paper suggests

From a manual reading of the roughly 80 one-missing cases no method solved (§6, pp.15-16). Even with true positions 33.6% of the one-missing set stays unsolved (81 of 241). Counted categories:
- 13 cases: sequence slicing and concatenation facts such as `assert r == r[..k] + r[k..];`; the model produced multiset reasoning or ill-typed variants. Suggested fix: templates for sequence equalities, or more examples of the kind
- 9 cases: multi-step `by` assertions. “For this class of problems, approaches that attempt to generate complete auxiliary lemmas may prove more reliable.” (§6, p.15)
- 9 cases: missing definitions of called functions, lemmas or types in the prompt
- 4 cases: right assertion, missing `by reveal` of a named assumption
- 4 cases: asserting whole-array equality where per-element facts were needed
- 3 cases: missing standard conversions between sequences, arrays and multisets
- 3 cases: the needed assertion already existed elsewhere in the code. “In another 3 cases, the solution corresponded to an assertion already present elsewhere in the code, which the model did not attempt to reuse.” (§6, p.15)
- near misses, no count: an algebraic identity with one wrong constant (a 2 where a 3 was needed); suggested fix: a small algebraic simplifier or verifier-aided rewriting

The counted categories total 45 of about 80; the rest are not classified.

Verus form. Inference: each has a direct Verus twin, which makes this list a ready checklist for a Verus candidate generator. Slicing facts are facts about `subrange` and concatenation that need extensional sequence equality. Named-assumption reveals are `reveal` of an `opaque` `spec fn`. Whole-array against per-element is `assert forall|i| ... by { }` against a single equality. The reuse case suggests a model-free candidate source: every `assert` and lemma call already in the function, tried at the localized position before any model is asked. The near-miss case is where `assert(...) by (nonlinear_arith)` on the intended identity lets the solver do the algebra.

## inconsistencies

- §5.2 (p.9) says the extended heuristic verifies 7 programs in the all-missing set; Table 3 and §5.2 on p.10 say 6
- §5.2 (p.9) says LlmEx_fl achieved the highest accuracy, “correctly predicting 39.7% of assertions”; the 39.7% is programs verified (201/506), and the paper stresses that verified programs often use different assertions from the originals
- the RQ3 summary (p.13) calls the embedding and hybrid results identical and the difference not statistically significant; they are 254 and 255, and no test is reported
- the cost figures of §5.1 disagree with each other, as computed under technique 3
- rounding: 153/241 is printed 63.4% and is 63.49%; 20/172 is printed 11.7% and is 11.63%; 33/172 is printed 19.1% and is 19.19%; 57/235 is printed 24.4% and is 24.26%
- the baseline called Laurel in the abstract's 51.9% is the authors' extended heuristic combined with the authors' own retrieval, not the published Laurel system, whose retrieval was not reimplemented (§5.4, p.13)

## what is already done, and how much it threatens

Done: the two-stage shape with a script doing the insertion; the extended error-to-position table; position validity as a metric; the removal benchmark with the real-failure filter; the finding that fewer assertions than the original often suffice (“This indicates that there are multiple ways to verify the programs and that successful verification can often be achieved with fewer assertions than in the original program.”, §5.2, p.9).

Not done: loop invariants (excluded from insertion); lemma generation; any language other than Dafny, though the authors assert transfer: “Although our experiments center on Dafny, the methods are language-agnostic and naturally extend to other SMT-based verification tools that rely on assertions [1, 2, 12, 18, 33, 35].” (§1, p.2) No iteration either: each program gets one localization and one batch of candidates, with no second round using the new error.

For a product built on agents writing verified Rust. Inference: low threat. The setting is the easiest slice of proof work (the specification, code and all but one or two proof lines are given and known to be completable), one model, no agent loop, and the best configuration still leaves 36.5% of single-assertion cases and 68.3% of multi-assertion cases unsolved. Its value is as components: a cheap first repair step costing on the order of a cent per failing function, and an evaluation method for localization.

## techniques for the catalog

- two-stage assertion repair: separate where to insert from what to insert, and let a script do the insertion so the model cannot edit anything else
- line-numbered localization prompt: show the failing method with numbered lines plus the verifier error and ask for a JSON list of at most two lines after which to insert, with forbidden zones spelled out
- error-type insertion table: map each verifier error type to insert-before-the-reported-line or insert-at-end-of-enclosing-block, covering loop-invariant, timeout, subset-constraint and domain errors as well
- parallel hybrid localization: run the heuristic position and the LLM position as two independent repairs and accept either, since they succeed on different programs
- ten candidates per placeholder: ask for a JSON array of exactly ten candidate assertions per marked position in one call and verify them by script
- partial-combination testing: when two positions are proposed, also verify each candidate alone with the other position left empty
- dual-embedding example retrieval: rank solved examples by a weighted sum of error-message similarity and code similarity, take the top three, and exclude examples from the same function
- failure-filtered removal benchmark: delete one, two or all assertions from verified programs and keep only variants that the verifier then rejects, dropping pairs equivalent to a single removal
- position-validity metric: label a predicted insertion point by whether the original assertion verifies there, instead of by line distance
- assertion taxonomy: classify helper assertions as index, test-like, multi-line or other to see which the model can infer and to target prompts
- test-first specification workflow: draft test-like assertions as an executable specification, then infer the helper assertions needed to make them verify
- reuse-before-generate candidates: try assertions already present elsewhere in the function at the localized position before asking a model, a fix the failure analysis points to
