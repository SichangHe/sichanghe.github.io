# Verifying LLM-Generated Code in the Context of Software Verification with Ada/SPARK
(authored by agents unless marked 🧑)
Tag: `cramer2025llm`, [paper](http://arxiv.org/abs/2502.07728v1)

source: Marcos Cramer and Lucian McIntyre, arXiv:2502.07728v1, 11 Feb 2025, 13 PDF pages, no appendix. The identifier and date appear on p.1. Page references below count PDF pages.

## what the paper measures

Marmaragan asks an LLM to add proof annotations to existing Ada/SPARK programs. Its input includes specification files, implementation files and dependencies (§3.1, p.4). The main experiments use `gpt-4o-2024-05-13` (§5.1, p.8). Success means that GNATprove reports no errors or mediums, rather than no messages of any kind. The stated aim in §3.3 (p.4) is: “The resulting added annotations should lead to GNATprove running free of errors and mediums.”

Terms needed below:

- pragma: an Ada annotation statement; the paper discusses `Assert`, `Loop_Invariant` and `Loop_Variant` (§2.2, p.3)
- medium: a message about an unproved obligation. §2.2 (p.3): “Mediums, on the other hand, result from proof obligations that could not be discharged, either because the statement being proved is false or due to missing annotations.”
- specification file (`.ads`): interface, including preconditions and postconditions; implementation file (`.adb`): executable code and additional annotations (§2.2, p.3)

The evaluation has 71 cases obtained by removing annotations from existing programs. Table 1 (p.9) gives results for five configurations; each permits at most 12 generated answers per case. Table 2 and Figure 5 (p.10) give 36/71 solved across the five experiments, or 50.7%. Figure 5 explicitly says “across all five experiments”. The best initial configuration solves 24/71; a rerun solves 26/71 (§5.5, p.9). Thus the headline 50.7% is not the success rate of a single configuration.

## technique 1: annotation completion with a prompt restriction on edits

What it is: provide the specification, dependencies and implementation, then request the entire implementation with annotations added. The prompt asks the model to preserve functionality; the paper does not describe a separate check that it obeys this restriction.

Steps:

1. Collect the specification, implementation and dependencies (§3.1, p.4).
2. Insert them into the fixed prompt using `{dependencies}` and `{package_body}` (Listing 2, §3.4.2, p.5).
3. Request annotations and restrict other edits. Listing 2 (p.5) says: “You must not modify the code in any other way , except to add " for " loops and " if " statements that enclose only pragma statements .” Its continuation (p.6) says: “Do not modify the functionality in any way . Return the entire implementation file with the required additions .” Listing 3 (p.6) repeats the restriction in the system message.
4. Leave the annotation kind unspecified. §3.4.2 (p.6): “Therefore, no direct specification is given as to which pragma statements to generate.”
5. Request the complete implementation in an Ada code block (Listing 2, p.5). Figure 1 (p.5) includes output processing before the GNATprove run; §3.1 (p.4) mentions “post-processing of LLM output” without specifying its rules.
6. Run GNATprove and use absence of errors and mediums as the success criterion (§3.3, p.4; §4.2, p.7).

Evidence: this is the underlying completion task throughout the experiments, not a separately compared feature.

Inference: this task is useful when an implementation and its contract already exist and only proof annotations are missing. For a VL implementation, protect the original executable code and contracts with a mechanical comparison and reject additions that merely assume the desired result. The prompt restriction alone does not establish preservation of either code or proof obligations. The paper does not demonstrate an attack or an integrity check, so it cannot establish whether such outputs were accepted in the reported runs.

## technique 2: verifier failures included before generation

What it is: optionally run GNATprove on the incomplete program before the LLM call and add its unproved obligations to the prompt.

Steps (§3.4.3, p.6):

1. Enable the medium-in-prompt feature and run GNATprove on the project.
2. Extract and format the mediums.
3. Use each message's line number to extract the source line and its successor. The paper says: “In this case, formatting involves taking the line number and extracting the related line of code (and the one below) from the SPARK file.”
4. Append the code and medium message to the prompt. Figure 2 (p.7) provides an example image.

Evidence: the paper describes the feature as optional and gives no separate comparison with it disabled. Listings 2 and 3 refer to supplied mediums, but the experiment setup does not explicitly state the feature's setting.

Limit: the paper does not compare different amounts of source context. It also rejects medium count as a measure of progress. §4.2 (p.7): “These provide feedback about which statements lead to a failure in verification, but the total number of medium messages is not indicative of the closeness to a completed verification.”

Inference: the corresponding VL experiment would attach verifier diagnostics and the relevant source locations to the initial prompt, then compare against generation without these diagnostics. This paper supplies a procedure, not isolated evidence of its benefit.

## technique 3: n solutions per prompt

What it is: request several responses to the same prompt. §3.4.5 (p.6): “N-Solutions determines the number of responses an LLM returns, per individual prompt.” The examples are one response at n=1 and five at n=5. The continuation notes that sampling temperature usually makes them distinct; it gives no temperature value.

Steps: set n, request n responses for a prompt, and assess candidate outputs with GNATprove (§3.1, p.4; §3.4.5, p.6). The paper does not specify whether verifier runs execute in parallel or whether generation stops when one candidate verifies.

Evidence: n=12 with no retry solves 20/71 cases (Table 1, p.9). Comparisons with retries appear below.

Inference: multiple candidates are a reusable VL baseline. Parallel verification and early stopping are possible implementation choices, not documented steps of this paper's method.

## technique 4: retry with a failed attempt and its diagnostics

What it is: use a failed candidate and the verifier messages it produced as context for another generation attempt.

Steps (§3.4.6, p.6; Figure 1, p.5):

1. Set the retries parameter r above zero.
2. After a failed attempt, retain the candidate and GNATprove's medium messages. §3.4.6 says: “The Retries mechanism works by providing the LLM with additional context in the form of the previous failed attempt and the medium messages generated by GNATprove in that attempt.”
3. Reformat the prompt with this context and generate another attempt.
4. Permit up to r retries, each producing n responses. §5.2 (p.8) bounds generated answers by n(r+1).

Unspecified: which failed candidate is used when n exceeds one, whether candidates have separate retry chains, and whether all older attempts remain in the prompt. The description says that each additional attempt contains more context but does not define how that context accumulates.

Inference: VL can reuse the failed-file-plus-diagnostics repair prompt, while specifying candidate selection explicitly. The paper's results do not distinguish alternative selection policies.

## technique 5: splitting a fixed answer budget between samples and retries

What it is: hold the maximum number of generated answers per case constant and vary n and r. §5.2 (p.8) uses a maximum of 12 answers and tests (12,0), (6,1), (4,2), (3,3) and (2,5). This fixes answer count, not measured token usage, latency or monetary cost.

Evidence (Table 1, p.9; percentages below are calculated from the reported fractions):

- n=12, r=0: 20/71, 28.2%
- n=6, r=1: 24/71, 33.8%; rerun 26/71 (§5.5, p.9)
- n=4, r=2: 24/71, 33.8%; rerun 25/71 (§5.5, p.9)
- n=3, r=3: 20/71, 28.2%
- n=2, r=5: 18/71, 25.4%

The authors conclude (§6.2, p.10): “This suggests that a balance between initial solution attempts and correction opportunities is more effective than relying on either approach alone.” Figures 6 and 7 (p.10) examine sample count and retry count while keeping the other parameter constant.

Limits: only the two initially best configurations are reported as rerun. Their counts change by two and one cases. The paper gives no uncertainty estimates or statistical test. Inference: these observations motivate testing one or two feedback rounds, but do not establish a stable ranking or a statistically demonstrated advantage. They also do not compare retries against a policy that uses only retries and one initial sample, since n=1 was absent from the fixed-budget configurations.

Inference: for VL, 4–6 samples with 1–2 retries are candidate starting settings, not demonstrated defaults for another verifier or dataset.

## technique 6: explain the failure before returning annotations

What it is: replace the beginning of the base prompt with a request for an explanation. Listing 4 (§3.4.4, p.6) begins: “Try to solve the following problem by first explaining in natural language what the underlying problem , leading to the medium , might be and how it could be solved .” The explanation and implementation are produced in one response.

Evidence (§5.6, p.9): with n=6 and r=1, “In total, 25/71 programs were solved, equaling the average of the success rates from the original experiment and the verification run.” The original and rerun counts are 24 and 26.

Limit: Listing 2 (p.5) already requests logical, step-by-step solving. Inference: this comparison does not isolate reasoning versus no reasoning. One explain-first run matching the average of two base-prompt runs supplies no evidence of an improvement, but also does not prove equivalence.

## technique 7: construct annotation tasks by removing existing annotations

What it is: start with verified SPARK projects, remove selected annotations from implementation files, and retain a case only when GNATprove produces mediums.

Steps (§4.1–4.3, p.7–8):

1. Select existing verified projects. §4.1 reports 16 programs, but its source counts are inconsistent: five from Argu, two named tutorial programs (`linear_search` and `show_map`), and “the final 11 programs” from spark-by-example. Those listed counts sum to 18, not 16. The paper does not resolve the discrepancy.
2. Apply one of five removal schemata to `.adb` files only:
   - All Pragmas: remove every `Loop_Invariant`, `Loop_Variant` and `Assert`; 14 cases
   - Last Invariant All Loops: remove the last `Loop_Invariant` in every loop; 12 cases
   - All Pragmas One Loop: remove all pragmas in one loop, considering only loops with at least two invariant statements; 16 cases
   - Last Invariant One Loop: remove the last `Loop_Invariant` in one loop; 22 cases
   - One Assert: remove one `Assert`; 7 cases
3. Where a schema permits it, derive several cases from one program (§4.3, p.7).
4. Keep a stripped case only if GNATprove generates mediums. §4.3 (p.7): “A program with removed pragmas is only included in the benchmark if GNATprove generates mediums for it, because otherwise it can be considered to be already fully verified, so that Marmaragan has no work to do on it.”
5. Score success using a clean run. §4.2 (p.7): “Thus, it is only possible to evaluate correctness by checking whether the program is completely free of errors and medium.”

Evidence (Table 2, p.10; cases solved across the five experiments / cases available):

- One Assert: 7/7
- Last Invariant One Loop: 14/22
- Last Invariant All Loops: 6/12
- All Pragmas: 5/14
- All Pragmas One Loop: 4/16

The table totals are 36 solved and 71 cases. Inference: schema-specific performance helps identify which annotation tasks remain difficult, but these are different case sets, so the fractions do not isolate the causal effect of removing one kind of annotation. Cases derived from the same source program are also not independent programs. A verifying answer need not reproduce the removed annotations.

The authors acknowledge the dataset limit (§8, p.11): “Testing Marmaragan on a benchmark of 16 programs yielded initial results, but validating its robustness and generalizability requires a larger dataset.”

Inference: VL can use the same removal-and-recheck recipe with existing verified functions, preserve their contracts, and report performance separately by removal schema. This is a proposed application; this paper evaluates no Verus code.

## technique 8: report a source believed to be outside model training separately

What it is: include programs whose publication date is said to follow the model's training cutoff, then report their outcomes separately. §4.1 (p.7) claims of Argu: “It was first published after the cutoff dates for the training of GPT-4 and GPT-4o, so that unlike for the other programs in the benchmark, we can be certain that it was not included in the training data of these LLMs.”

Evidence: §5.4 (p.9) reports 36 Argu-derived cases and says: “Out of these 36 programs, 16 were solved.” This is 16/36, or 44.4%. Inference: subtracting these counts from the total yields 20/35, or 57.1%, for the other cases; the paper does not report that comparison.

Limit: the claim about training exclusion is conditional. The footnote to §5.4 (p.9) says: “If we take the statistics from Open AI’s website to be up-to-date, at the time of writing, and provided the information is reliable.” Training membership and cutoff accuracy were not independently checked in this study.

Inference: reporting this subset helps expose whether results depend entirely on publicly familiar examples, but the paper's timing argument cannot independently establish training membership.

## what verification establishes and what remains assumed

§2.2 (p.3) describes GNATprove's compatibility, flow and proof stages, with third-party theorem provers reached through Why3. It also describes verification of user assertions and absence of runtime errors. The experiments define success through GNATprove's output, rather than a proof about Marmaragan itself.

Inference: confidence in a solved case depends on the verifier stack, adequacy of the supplied specification and preservation of the original implementation and contracts. The study should not equate a clean returned file with an independently checked guarantee about the original file when no preservation check is described.

Specification generation remains future work. §8 (p.11): “One potential direction is enabling the generation of pre- and postconditions by the LLM itself.” Whole-program generation from a conversation is also future work in that section, not the evaluated task.

## interpretation limits and relevance to VL

The reported 36/71 combines the five initial configurations. Inference: their answer allowances total up to 60 per case, compared with 12 for any one configuration. The best initial result is 24/71 (33.8%), and the best reported rerun is 26/71 (36.6%). These counts should remain separate from the combined 50.7%.

The source-count inconsistency prevents reconstructing the stated 16-program selection from §4.1 alone. The five removal-schema counts and both result tables are arithmetically consistent. The paper sometimes calls derived cases programs, including schema sizes of 22 despite the stated 16 source programs.

Inference: the directly reusable ideas for VL are annotation completion under fixed contracts, diagnostics in generation and repair prompts, explicit sampling/retry budgets, and removal-based evaluation. Their effectiveness with Verus remains untested here. The small benchmark, uncertain training exclusion and limited reruns do not support a product-level competitiveness claim or a required success threshold for VL.

## techniques for the catalog

- annotation completion under fixed contracts: prompt for only annotations and annotation-only control flow, then assess the returned implementation with GNATprove
- verifier diagnostics before generation: optionally supply each medium with its source line and the following line
- n solutions per prompt: request multiple responses; the paper leaves verification scheduling unspecified
- retry with failed candidate and diagnostics: include the previous attempt and its GNATprove mediums; candidate selection is unspecified
- fixed answer budget: compare n(r+1)=12 configurations; (6,1) and (4,2) tie for the best initial result
- explain-first prompt: request a diagnosis and code in one response; its one reported run matches the mean of the two base-prompt runs
- removal-based benchmark: remove selected annotations from verified implementations and keep cases that produce mediums
- training-exclusion subset: report Argu cases separately, preserving the authors' condition on cutoff information

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For each benchmark, a separate schema for removing pragma statements from the programs was devised."): read the full paper text from first line to last; checked all study quotations, numbers, section and PDF-page references, and technique steps; corrected the success criterion and budget interpretation, flagged the source-count discrepancy, removed unsupported external claims, and marked proposed applications and conclusions as Inference; did not inspect the implementation, replicate experiments, verify model training membership, or check image-only details in the figures.
