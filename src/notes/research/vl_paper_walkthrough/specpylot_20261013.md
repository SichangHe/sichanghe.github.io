# SpecPylot: Python Specification Generation using Large Language Models
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number, page and section reference, quotation, step list and Listing 1 against the text and per-page layout, and the Verus forms; changed 4 statements that were unmarked inference or assumed the Claude refinement pass count; could not check the claims about Verus witnesses and test generation or the ExVerus and AutoVerus comparisons.

source: Ayon and Ahmed, arXiv:2604.16560v1 (17 Apr 2026), FSE Companion '26 tool demo, 5 pages, no appendix. Section 8 points to a Zenodo package and a video, which this study does not cover.

## what the paper does, in one paragraph

SpecPylot takes a Python file with no contracts, asks an LLM to add icontract `@require` and `@ensure` decorators, and runs CrossHair (a symbolic executor backed by a solver) on the result. If CrossHair finds an input that breaks a contract, the LLM is asked again with that input, and may change only the contracts. Nothing is proved. The paper says so itself: “When CrossHair reports a PASSED result, this should not be interpreted as a proof of correctness.” (Section 6, p.4). What is measured is how often the final contracts survive CrossHair's bounded search on 20 small programs, with two models.

## technique 1: one wrapper per answer, with a bounded format retry

what it is: the LLM must return the whole annotated program inside one wrapper, and the tool checks the wrapper and the syntax before any verifier run.

when to use: at the start of any pipeline where an LLM returns code that a verifier will read. It keeps formatting failures out of the count of verifier failures.

steps (Section 3.1, p.2):
1. render the request from prompt templates and the target program
2. the model returns “a single, well-formed wrapper containing contract-annotated code”
3. validate the wrapper and “basic syntactic well-formedness”
4. on a malformed answer, retry: “If the output does not conform, SpecPylot retries a bounded number of times with explicit formatting repair instructions before proceeding.” (Section 3.1, p.2)

The paper's example of the output shape is Listing 1 (p.3), the `Absolute.absolute` method: one `@require` restricting `num` to an `int`, and three `@ensure` lines, the last being `(num >= 0 and result == num) or (num < 0 and result == -num)`.

Verus form. Inference: the same contract is a `requires` and `ensures` clause on an exec `fn`, and Listing 1 becomes `fn absolute(num: i64) -> (result: i64) requires num > i64::MIN ensures result >= 0, (num >= 0 && result == num) || (num < 0 && result == -num)`. Two things change. The `isinstance` lines disappear because Rust types already say it. A new precondition appears that the Python version does not need: Python integers do not overflow, while `-num` on `i64::MIN` does, and Verus rejects the body without `num > i64::MIN`. The format check carries over as a parse step (does the answer contain exactly one `verus!` block that the Rust parser accepts) run before Verus.

evidence: none separately. The paper gives no count of format retries.

limits: the prompt templates are not printed in the paper, so the retry wording cannot be copied from it.

## technique 2: three verifier outcomes, not two

what it is: every CrossHair run is put into one of three classes, and the middle class is kept apart from success.

when to use: whenever the checker can stop early. A two-way pass or fail label would count a timed-out search as a pass or as a wrong contract, and both are false.

steps (Section 3.2, p.3):
1. run `crosshair check` with icontract analysis on the annotated code
2. label the run PASSED “when no counterexample is found and the analysis is exhaustive under the configured limits”
3. label it REFUTED when CrossHair gives a counterexample for at least one contract
4. label it INCONCLUSIVE when there is no counterexample but CrossHair “cannot exhaustively explore the relevant paths under the limits”

The limits are settable one by one: “Timeouts and exploration limits can be configured independently for checking and coverage, including overall timeout, per-condition timeout, per-path timeout, and the maximum number of uninteresting iterations.” (Section 5.1, p.4)

Verus form. Inference: Verus also has three outcomes for a function: verified, a reported failed obligation, and a solver give-up (time or resource limit). The mapping is not one to one. A Verus `verified` is a proof for all inputs under the trusted base, so it is stronger than PASSED. A Verus failed obligation is weaker than REFUTED, because it means the solver could not prove the clause, which happens both when the contract is false and when a true contract lacks an `invariant` or an `assert`. So in Verus the class that needs care is the failure, which has to be split into "contract wrong" and "proof missing"; SpecPylot has no such split because CrossHair gives a concrete witness.

evidence (Section 4.1, p.3, Figure 2): 20 programs, one run per model as far as the paper says. “Using Anthropic’s Claude Sonnet 4.5 with SpecPylot, we achieved a pass rate of 80% (16/20) and an inconclusive rate of 20% (4/20).” For GPT-4o the paper gives 75% (15/20) passed and 25% (5/20) inconclusive. Both pairs sum to 20, so (inference) no program ended REFUTED with either model. The inconclusive programs are named: `add_loop`, `binary_search`, `mysqrt`, `digit_root` for both models and `calculator` for GPT-4o only.

limits: the label PASSED depends on the budgets. The paper: “In our experience, programs with deep loops or complex branching quickly stress symbolic execution and lead to timeouts, which makes results sensitive to the configured budgets.” (Section 6, p.4). The budget values used in the evaluation are not given.

## technique 3: counterexample refinement that may touch only the contracts

what it is: a repair loop fed by the concrete failing call, with a rule about when it may run and a rule about what it may edit.

when to use: when the code is taken as the ground truth and the contracts are the thing being inferred. Inference: this is the opposite of the VL setting, where the contract is the ground truth and the code and proof are what get repaired; the loop fits VL only for the sub-task of describing existing, trusted code.

steps (Section 3.3, p.3):
1. enter only from a REFUTED run
2. check the gate, three conditions together: “Concretely, a refutation qualifies for refinement only when a concrete counterexample is reported, the check run does not time out, and the refutation is produced within the refinement time budget.”
3. build a second request holding the current annotated code and “a compact evidence bundle extracted from CrossHair (for example, the failing call and diagnostic context)”
4. the model answers: “The LLM revises only the contracts, and SpecPylot re-runs CrossHair on the revised code.”
5. stop when the run “becomes PASSED, becomes INCONCLUSIVE, or reaches the maximum refinement rounds”

The demo command line in Section 5 (p.4) uses `--refine 2`, two rounds at most.

What the paper leaves out. It does not say that the tool compares the function bodies before and after a refinement, so "only the contracts" may be a prompt instruction and nothing more. It also does not say in which direction a contract is revised. A REFUTED postcondition can be made true by weakening it, or by narrowing the precondition until the failing input is excluded; both end in PASSED and both can leave a contract that says little.

Verus form. Inference: three changes are needed.
- no witness by default: a failed `ensures` in Verus names the clause and the location and does not print input values, so step 3's evidence bundle has to be made some other way. The filed ExVerus study describes one way (an LLM-written Z3 query over source variables). Another is to run the exec function on generated inputs and evaluate the contract there, which only works for contracts that can be executed.
- the edit rule must be mechanical: after each round, strip `requires`, `ensures`, `invariant`, `decreases` and proof blocks from both versions and require the remaining Rust to be equal.
- direction of repair must be fixed: when the task is to verify code against a given contract, the `requires` and `ensures` are frozen and the loop edits `invariant` clauses, `assert` statements and `proof fn` lemmas instead. A loop allowed to rewrite `ensures` until Verus accepts will converge on `ensures true`.

evidence (Section 4.2, p.4): refinement ran on few programs. With both models it ran on `binary_search.py` and `calculator.py`; with GPT-4o also on `gcd.py` and `is_all_unique.py`; with Claude also on `divide.py`. “GPT consistently required a single refinement pass, whereas Claude required two passes for divide.py, resulting in slightly higher refinement effort in that case.” Inference: GPT-4o made 4 passes (4 programs, one each); Claude made at least 4 (divide twice, plus binary_search and calculator), and exactly 4 only if those two took one pass each, which the paper does not say. There is no run with refinement switched off, so the paper does not show how many of the 16 and 15 passes are owed to the loop. Reading the two lists together: `binary_search` was refined and still ended INCONCLUSIVE with both models, and `calculator` was refined with both and ended INCONCLUSIVE only with GPT-4o.

limits: the paper's own words are that LLM contracts “can be incomplete, overly strong, or simply unhelpful” (Section 6, p.4). No measure of contract strength is reported: no mutation score, no comparison with reference contracts, no human rating.

## technique 4: path counts as a report on an unfinished search

what it is: for each inconclusive run, report how many paths the symbolic executor confirmed and how many it could not decide.

when to use: to tell a nearly complete search from one that barely started, when reporting results that are not proofs.

steps: the paper gives no procedure beyond reading CrossHair's output. Figure 3 (p.3) plots the average count of CONFIRMED and UNKNOWN paths over the inconclusive cases of each model, with error bars for the standard error of the mean.

evidence: “For contracts generated by Claude Sonnet 4.5, CrossHair explored on average 91 CONFIRMED paths and 11.2 UNKNOWN paths; for GPT-4o, the averages were 42 CONFIRMED paths and 4.8 UNKNOWN paths.” (Section 4.1, p.3). The averages are over 4 programs for Claude and 5 for GPT-4o.

Verus form. Inference: there is no path count in Verus, since it checks a function against its contract in one or a few solver queries. The nearest report for an unfinished Verus job is per function: which functions verified, which failed and on which clause, and which hit the limit. The cause of the paper's inconclusive cases, loops, is handled in Verus by a different means: an `invariant` plus a `decreases` clause replaces the unrolling of iterations, so a loop does not by itself make the search unbounded.

## technique 5: tests and logs from the final contracts

what it is: after the loop, run `crosshair cover` on the final annotated code to get inputs that reach different branches, written as pytest stubs, and store everything about the run.

steps (Section 3.4, p.3): enable the option; the tool emits the stubs; “Each run stores the final annotated program and a structured summary of outcomes, including verification status, refutation evidence when present, and refinement traces.” With logging on, prompts, raw model outputs, intermediate code versions and CrossHair's stdout and stderr are kept too.

Verus form. Inference: Verus has no test generator. The stored record carries over unchanged and is worth more there, because a Verus failure cannot be replayed from a witness: keep each intermediate file and the verifier's full error text per round.

evidence: none. The paper reports no number about the generated tests.

## what is measured and what stays trusted

Measured: pass and inconclusive rates on 20 programs for two models (above); cost. “On average, Claude Sonnet 4.5 uses 5,480 tokens per issue, and GPT-4o uses 4,756 tokens per issue; both models converge quickly, requiring 1.02 refinement iterations on average.” (Section 4.2, p.4). The total API cost over the 20 programs is $1.09 for Claude Sonnet 4.5 and $0.80 for GPT-4o.

Trusted: CrossHair and its solver; the type annotations (the paper: “CrossHair performs noticeably better when types are precise, while imprecise annotations can restrict the explored inputs or cause internal errors.”, Section 6, p.4); the translation of 16 benchmark programs from Java to Python, done by the authors with no stated check; and, above all, that a contract which passes says something useful about the program.

The benchmark (Section 4, p.3): 16 programs picked at random from SpecGenBench across four control-flow categories (branched, single-loop, multi-path loop, nested loop) and translated from Java to Python, plus four sequential Python programs, 20 in total.

## numbers that do not add up

- Section 4.2 gives two different averages a few sentences apart: 1.2 total LLM iterations per run, and 1.02 refinement iterations. Inference: the first fits the named cases if one generation per program plus 4 refinement passes over 20 programs is 1.2 calls per program (the Claude count of 4 is assumed, see technique 3). The second fits nothing I can reconstruct from the paper.
- Section 3.2 defines PASSED as an exhaustive analysis under the limits, and Section 6 says PASSED means only that no counterexample was found within the limits. The first reads as bounded-complete, the second as a failed bug search.
- Figure 3's bar label for Claude is 91.5 confirmed paths; the text says 91.
- Section 4.2 describes a plot (“Each point summarizes the average per-issue cost in two dimensions”) that the paper does not contain. It has three figures and none is a scatter plot of runtime against tokens. No runtime number is given at all, though the section says GPT-4o is faster.
- The abstract's phrase is “most programs”; the support is 16/20 and 15/20, one run each, on programs of textbook size.

## what was already done, and threat to VL

Already done, so not worth rebuilding: the propose, check, refine loop for contracts with a verifier in the middle. The paper itself places its loop after SpecGen (JML) and AutoReSpec (Java, same authors), and the filed studies of AutoVerus and ExVerus cover the Verus side with far larger evaluations. Inference (the paper does not claim novelty for these): what this paper adds to that line is small and specific: the refinement gate of Section 3.3 (do not spend an LLM call on a timeout), the three-way label, and the path-count report.

Threat. Inference: low. The tool gives no proof, works on single Python functions of a few lines, and reports no contract-quality measure, so it does not compete with agent-written Rust that Verus has verified. Its weak point is also a warning for VL: a pipeline scored by checker acceptance alone rewards weak contracts, and the paper's 80% says nothing about whether the 16 contracts are as strong as Listing 1.

## techniques for the catalog

- wrapper-and-syntax check before the verifier — require one well-formed code wrapper per LLM answer and retry a bounded number of times with format repair instructions, so format failures are not counted as verification failures
- three-way outcome label — record PASSED, REFUTED and INCONCLUSIVE separately so that a search cut off by its budget is never reported as success or as a wrong contract
- gated counterexample refinement — spend a repair call only when the checker returned a concrete counterexample, did not time out, and answered within the time budget
- contract-only repair — on refutation give the model the annotated code plus the failing call and allow edits to contracts alone, leaving the program text fixed
- explored-path report — for each unfinished run report the counts of confirmed and undecided paths to show how far the bounded search got
- cover-driven test stubs and run record — generate branch-covering inputs from the final contracts as test stubs and store prompts, raw outputs, intermediate code and checker output for every round
