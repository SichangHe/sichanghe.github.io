# Verifying LLM-Generated Code in the Context of Software Verification with Ada/SPARK
(authored by agents unless marked 🧑)
Tag: `cramer2025llm`, [paper](http://arxiv.org/abs/2502.07728v1)

source: Cramer and McIntyre, arXiv:2502.07728v1 (11 Feb 2025), 13 pages, no appendix. Page numbers below are PDF pages.

## what the paper measures, and what it does not

The paper builds Marmaragan, a Python tool that asks GPT-4o to add proof annotations (loop invariants, loop variants, asserts) to an Ada/SPARK implementation file whose contracts already exist, and accepts an answer when the SPARK verifier GNATprove reports nothing. It measures how many of 71 benchmark cases get such an answer under five ways of splitting a budget of 12 LLM answers per case.

Terms the paper uses, needed below:

- pragma: an Ada statement that carries an annotation, for example `pragma Loop_Invariant (Result = Count * 2);`
- medium: GNATprove's message for a proof obligation it could not discharge. §2.2, p.3: “Mediums, on the other hand, result from proof obligations that could not be discharged, either because the statement being proved is false or due to missing annotations.”
- `.ads` file: the interface with pre- and postconditions; `.adb` file: the code plus `Assert`, `Loop_Invariant`, `Loop_Variant` pragmas (§2.2, p.3)

Nothing is proved about Marmaragan itself. The only correctness claim is the verifier's verdict on each output file. The headline 50.7% is 36/71, and 36 is the number of cases solved by at least one of five experiments, not by one configuration (see the part on numbers that do not add up).

## technique 1: annotation-only completion with an edit whitelist

What it is: the LLM receives the dependency files and the implementation file, and must return the whole implementation file with only proof annotations added. The specification (pre/postconditions) is fixed and not shown as editable.

When to use: the code and its contract are trusted or already reviewed, and only the proof hints inside bodies are missing. This is the cheapest of the annotation-writing tasks because the LLM cannot weaken the goal.

Steps:

1. Collect the project: specification file, implementation file, and dependencies (§3.1, p.4).
2. Fill one fixed prompt with `{dependencies}` and `{package_body}` (Listing 2, §3.4.2, p.5).
3. State the goal in verifier terms and whitelist the edits. Listing 2 ends (p.5–6): “You must not modify the code in any other way , except to add " for " loops and " if " statements that enclose only pragma statements .” The same rule is repeated in the system message (Listing 3, p.6), which is kept short because, per §3.4.2 (p.6), “the system message for OpenAI GPT models is capped at 512 characters”.
4. Do not tell the LLM which annotation kind is missing. §3.4.2, p.6: “Therefore, no direct specification is given as to which pragma statements to generate.”
5. Ask for the full file inside an `ada` code fence so it can be extracted (Listing 2, p.5); the paper names “post-processing of LLM output” (§3.1, p.4) and Stage 3 “output processing” (Figure 1 caption, p.5) without giving its rules.
6. Run GNATprove on the returned file; success is zero errors and zero mediums (§3.3, p.4; §4.2, p.7).

Why the whitelist allows `for` and `if`: Inference: in SPARK a quantified or case-split fact is often proved by a ghost loop or branch whose body is only assertions; the paper allows these but does not explain why.

Verus form. Inference: the paper is not about Verus. The same task in Verus is: keep the `fn` signature with its `requires` and `ensures` fixed, and let the agent add only `invariant` and `decreases` clauses on `while` loops, `assert(...)` statements, and `proof { ... }` blocks. The SPARK whitelist of annotation-only `for`/`if` maps to `proof { }` blocks, `assert forall ... by { }`, and calls to a `proof fn`, all of which are erased before execution. What changes: Verus erases proof code by construction, so the annotation-only rule is partly enforced by the mode system, whereas SPARK relies on the pragma form. What does not carry over: SPARK's split into `.ads` and `.adb` gives a file-level boundary between contract and proof; in Verus both sit in one file, so the fixed part must be protected by a diff check, not by file choice.

Evidence: all results in this study are for this technique combined with techniques 2–4; there is no run without it.

Where it fails or what it assumes: the paper describes no check that the returned file left the executable code and contracts untouched; the rule is only in the prompt. Inference: an answer that deletes a hard statement, or adds an assumption pragma, would also make GNATprove quiet and would be counted as solved. A VL pipeline needs a mechanical diff that rejects any change outside proof annotations and rejects `assume`, `admit()` and `#[verifier::external_body]`.

## technique 2: verifier failures pre-compiled into the first prompt

What it is: before the first LLM call, run the verifier on the incomplete file and paste each unproved obligation, with the source lines it points to, into the prompt.

When to use: always when the verifier is cheap relative to an LLM call; it tells the LLM where the missing annotation is without telling it what kind.

Steps (§3.4.3, p.6):

1. Run GNATprove on the project with annotations missing.
2. Extract every medium from the output.
3. For each, take its line number and copy that source line and the one after it. The paper: “In this case, formatting involves taking the line number and extracting the related line of code (and the one below) from the SPARK file.”
4. Append line plus message to the prompt (Figure 2, p.7 shows the format as an image; its text is not in the extracted paper text).

Verus form. Inference: run `verus` on the file, parse each error (failed postcondition, invariant not satisfied before loop or at end of loop body, assertion failed, possible arithmetic overflow), and attach the flagged source line and its successor. What changes: Verus reports both the failing `ensures` clause and the return point, so two locations per error are worth attaching. What does not carry over: GNATprove can attach counterexamples to mediums (§2.2, p.3); the Verus studies in this collection obtain counterexamples by other means (see the ExVerus study).

Evidence: none in isolation. The paper calls the feature optional (“by enabling the medium-in-prompt feature”, §3.4.3) and never says whether the reported experiments had it on, though both Listing 2 and Listing 3 mention mediums as given.

Limits: two lines of context is a fixed choice with no ablation. §4.2, p.7 warns that medium counts are not a progress measure: “These provide feedback about which statements lead to a failure in verification, but the total number of medium messages is not indicative of the closeness to a completed verification.”

## technique 3: n parallel samples per prompt (N-Solutions)

What it is: request n completions for the same prompt and verify each. §3.4.5, p.6: “N-Solutions determines the number of responses an LLM returns, per individual prompt.”

Steps: set n; send one prompt; receive n answers, which differ because of sampling temperature (§3.4.5; the temperature value is not given); run GNATprove on each; stop at the first that is clean. The stop rule is implied by the metric in §4.2, not stated as a step.

Verus form. Inference: unchanged; each candidate is a separate file verified by a separate `verus` process, so the n checks can run in parallel.

Evidence and limits: see technique 5; n alone (12 samples, no retry) solved 20/71.

## technique 4: retry with the failed attempt and its new mediums

What it is: when all samples of a round fail, reprompt with the failed answer and the mediums GNATprove produced for that answer.

Steps (§3.4.6, p.6, and Figure 1 Stage 5, p.5):

1. After a failed attempt, keep the LLM's incorrect file and the mediums from verifying it.
2. Reformat the prompt to include both. The paper: “The Retries mechanism works by providing the LLM with additional context in the form of the previous failed attempt and the medium messages generated by GNATprove in that attempt.”
3. Generate n new answers; repeat up to r times. Total answers are bounded by n(r + 1) (§5.2, p.8).

Not in the paper: which of the n failed answers of a round is carried into the retry prompt, or whether each sample has its own retry chain. Not in the paper: whether older attempts stay in the prompt; §3.4.6 only says each retry contains “more context than the last”.

Verus form. Inference: unchanged in shape. The repair prompt carries the previous Verus file and its error list. One addition is needed that SPARK does not need as much: Verus errors can be solver timeouts (resource-limit exceeded) and not only failed obligations, and a retry prompt should label them differently because the fix is different (split the proof, not strengthen an invariant).

Evidence: see technique 5.

## technique 5: choosing n against r under a fixed answer budget

What it is: an experimental design, and a default setting that follows from it. Fix the number of LLM answers per case, then vary how they are split between breadth (n) and repair depth (r).

Steps (§5.2, p.8): fix the budget at 12 answers per case; test (n, r) = (12, 0), (6, 1), (4, 2), (3, 3), (2, 5); the model is `gpt-4o-2024-05-13` (§5.1, p.8).

Evidence (Table 1, p.9; cases solved out of 71; percentages computed here from the fractions):

- n=12, r=0: 20/71 (28.2%)
- n=6, r=1: 24/71 (33.8%); rerun 26/71 (§5.5, p.9)
- n=4, r=2: 24/71 (33.8%); rerun 25/71 (§5.5, p.9)
- n=3, r=3: 20/71 (28.2%)
- n=2, r=5: 18/71 (25.4%)

The paper's reading (§6.2, p.10): “This suggests that a balance between initial solution attempts and correction opportunities is more effective than relying on either approach alone.”

Limits: each configuration was run once, two were run twice, and the rerun moved the count by 1 and 2 cases; the gap between best and worst is 6 cases. Inference: with run-to-run noise of about 2 and no statistical test, the data support only that one or two retries is not worse than none, and do not rank (6, 1) against (4, 2). The single cell that makes (6, 1) look best is 12 solved in the Last invariant one loop column against 6–7 for every other setting (Table 1). Figures 6 and 7 (p.10), which show success per retry step and per sample count, carry no numbers in the extracted text.

For VL. Inference: a starting split of the per-function budget is 4–6 samples with 1–2 verifier-feedback rounds; deep repair chains on a single sample (n=2, r=5) were the worst here.

## technique 6: zero-shot chain-of-thought preamble (a negative result)

What it is: replace the first sentence of the prompt with an instruction to explain the failure in prose before answering. Listing 4 (§3.4.4, p.6) begins: “Try to solve the following problem by first explaining in natural language what the underlying problem , leading to the medium , might be and how it could be solved .” Explanation and solution are produced in one answer.

Evidence (§5.6, p.9), with n = 6, r = 1: “In total, 25/71 programs were solved, equaling the average of the success rates from the original experiment and the verification run.” That is (24 + 26)/2 = 25: no measurable gain.

Limit. Inference: the base prompt (Listing 2) already opens with a request to solve the problem logically and step by step, so the comparison is between two step-by-step prompts, not between reasoning and no reasoning.

## technique 7: building an annotation-synthesis benchmark by removal

What it is: take programs that already verify, delete selected annotations, and keep a case only if the verifier now fails.

When to use: to measure an annotation writer per annotation kind and per amount of missing proof, with a guaranteed solution for every case.

Steps (§4.2–4.3, p.7–8):

1. Pick verified projects: 16 programs from three sources (5 from the Argu repository, 2 from the SPARK tutorial, 11 from spark-by-example; §4.1, p.7).
2. Define removal schemata, applied only to the implementation file:
   - All Pragmas: every `Loop_Invariant`, `Loop_Variant`, `Assert` removed; 14 cases
   - Last Invariant All Loops: the last `Loop_Invariant` of each loop removed; 12 cases
   - All Pragmas One Loop: every pragma of one loop removed, only for loops with two or more invariants; 16 cases
   - Last Invariant One Loop: the last `Loop_Invariant` of one loop removed; 22 cases
   - One Assert: one `Assert` removed; 7 cases
3. Apply a schema several times per program where it has several targets (§4.3, p.7).
4. Run the verifier on each stripped program and discard those that still pass. §4.3, p.7: “A program with removed pragmas is only included in the benchmark if GNATprove generates mediums for it, because otherwise it can be considered to be already fully verified, so that Marmaragan has no work to do on it.”
5. Score binary: clean verifier run or not. §4.2, p.7: “Thus, it is only possible to evaluate correctness by checking whether the program is completely free of errors and medium.”

Verus form. Inference: strip `invariant` clauses, `decreases` clauses, `assert` statements and `proof` blocks from verified Verus functions while keeping `requires`/`ensures`, rerun Verus, and keep the cases that fail. What changes: Verus needs `decreases` for termination of loops and recursive `spec fn`s, so a schema that removes only `decreases` is a separate case. What does not carry over: "last invariant of a loop" has no special meaning in Verus beyond textual order.

Evidence that difficulty tracks the schema (Table 2, p.10; solved by any of the five experiments / cases):

- One Assert: 7/7
- Last Invariant One Loop: 14/22
- Last Invariant All Loops: 6/12
- All Pragmas: 5/14
- All Pragmas One Loop: 4/16

Limits: 71 cases come from 16 programs, so cases are not independent; §8 (p.11) concedes that “validating its robustness and generalizability requires a larger dataset”. Inference: a returned annotation set need not match the removed one, so the benchmark measures whether the file verifies, not whether the human proof was recovered.

## technique 8: a post-cutoff source as a contamination control

What it is: include programs published after the model's training cutoff and report them separately. §4.1, p.7 says of Argu: “It was first published after the cutoff dates for the training of GPT-4 and GPT-4o, so that unlike for the other programs in the benchmark, we can be certain that it was not included in the training data of these LLMs.”

Evidence (§5.4, p.9): “Out of these 36 programs, 16 were solved.” That is 16/36 (44.4%) for Argu cases. Inference: the remaining cases are 20/35 (57.1%), computed here by subtraction from 36/71; the paper does not give this figure or compare the two.

Limit: the certainty rests on a footnote condition (p.9) that OpenAI's published cutoff is accurate. Inference: Argu is also by the paper's first author, so its proof style may be unusually regular.

## what is proved and what stays trusted

- Proved, per solved case: GNATprove discharges every obligation of the returned file, which covers the existing contracts and absence of run-time errors (§2.2, p.3).
- Trusted: GNATprove, Why3 and the automated provers behind it; the existing pre/postconditions, which the LLM does not write; and, because no check is described, that the returned file is the original code plus annotations only.
- Not addressed: writing specifications. §8, p.11: “One potential direction is enabling the generation of pre- and postconditions by the LLM itself.”

## numbers that do not add up, and loose wording

- The abstract's 50.7% reads as one tool's rate. It is 36/71 where 36 counts cases solved in any of five experiments (Figure 5 caption, p.10: “across all five experiments”), i.e. up to 60 answers per case. The best single configuration is 24/71 (33.8%), or 26/71 (36.6%) in its rerun.
- §6.2 (p.9) says raising n “generally led to improved success rates”, yet at a fixed budget the largest n (12) scored 20, below n=6 (24) and n=4 (24). The claim can only refer to Figure 6, where r is held constant and the budget is not.
- The benchmark is described as 16 programs, while two schemata list “16 programs total” and “22 programs total” (§4.3, p.8) and the total is 71; there the word program means benchmark case.
- Table 1 row sums and Table 2 column sums check out (20, 24, 24, 20, 18; 36 and 71).
- §2.3 (p.3) says GPT-4 and GPT-4o “are the basis of this thesis”, a leftover from the thesis the paper was cut from.
- §7 (p.11) states “We are not aware of any work that brings LLMs and formal software verification together in the same way as we have proposed in this paper.” Inference: by February 2025 LLM annotation writers for Dafny and Verus were already published, so this is a gap in the paper's related work, not evidence of novelty.

## what VL should not redo

Inference: the prompt-plus-retry loop is the baseline every later system contains; rebuilding it is not research. Two results are worth taking as defaults instead of re-measuring: a small number of feedback rounds beats none at equal budget, and a prose explain-first preamble added nothing. The removal-schema benchmark recipe is reusable as is for a Verus regression suite.

## threat to a product of agent-written verified Rust

Inference: low. The tool is a proof of concept on 71 cases from 16 small programs, fills in proof hints only, does not write specifications or code, and solves about a third of cases per configuration with a 2024 model. Its value to VL is as a lower bound: any VL agent should beat 24/71-style results on an equivalent Verus removal benchmark, and the missing output-integrity check is a concrete mistake to avoid.

## techniques for the catalog

- annotation-only completion with edit whitelist — give the LLM the fixed contract and code, allow only proof annotations and annotation-only control flow, and accept on a clean verifier run
- pre-compiled verifier failures in the prompt — run the verifier before the first LLM call and paste each unproved obligation with its source line and the next line
- n parallel samples — request n completions of one prompt and verify each independently
- retry with failed attempt and its diagnostics — reprompt with the rejected file and the verifier messages it produced, up to r rounds
- fixed-budget breadth/depth split — hold n(r+1) constant and compare splits; here 4–6 samples with 1–2 retries beat 12 samples and beat 2 samples with 5 retries
- explain-first preamble — ask for a prose diagnosis before the answer; measured as no gain over a prompt that already asks for step-by-step solving
- removal-schema benchmark — strip chosen annotation kinds from verified programs, keep only cases the verifier now rejects, and report per schema
- post-cutoff contamination control — include a source published after the model's training cutoff and report its solve rate separately
Checked 2026-10-13: audit record cramer2025llm; paper-study comparison complete; gate executed; experiments not rerun
