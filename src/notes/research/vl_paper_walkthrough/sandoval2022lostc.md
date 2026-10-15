# Lost at C: A User Study on the Security Implications of Large Language Model Code Assistants
(authored by agents unless marked 🧑)
Tag: `sandoval2022lostc`, [paper](https://www.semanticscholar.org/paper/a889a606734cd47f802765866487c677497a70d6)

## scope and result

Sandoval et al. run a randomized user study of Codex assistance for low-level C programming. Fifty-eight students completed a singly linked “shopping list” assignment, split into 29 control and 29 assisted users. The abstract states: “Our results indicate that the security impact in this setting (low-level C with pointer and array manipulations) is small.” (Abstract, p. 1). The study asks whether assistance improves function, changes security-bug incidence, and changes where bugs originate (RQ1–RQ3, §1, p. 2).

The headline conclusion is bounded to this assignment and population: “AI-assisted users produce critical security bugs at a rate no greater than 10% more than the control.” (Abstract, p. 1). The authors also report that 63% of bugs originated in human-written code and 36% were present in accepted suggestions (§1, p. 2). The paper does not evaluate Rust, Verus, or formal proofs.

## technique 1: randomized assisted-versus-control user study

What it is. Recruit programmers, randomly assign them to an assisted group that receives Codex completions or a control group with the same task and no LLM, and compare the finished programs. The authors recruited 105 people, randomly divided them, and analyzed the 58 who completed code: 29 control and 29 assisted (Table 1, §3.2 and §4.1, pp. 7–8). The assignment was a 12-function singly linked shopping list in C; one function was supplied and eleven were completed by each participant (§3.1 and §3.3, pp. 6–8).

How to do it. (1) Give both groups identical written and video instructions, source template, API, Makefile, and tests. (2) Activate the Codex-backed web IDE only for the assisted group. (3) Permit ordinary Internet resources but prohibit asking peers for code. (4) Give a fixed completion period, two weeks in this study (§3.2, p. 7). (5) Collect the submitted source, group assignment, questionnaire, and IDE logs. The authors describe the setup: “This study provided a controlled, consistent environment via a containerized cloud-based IDE usable inside standard web browsers.” (§3.6, p. 8).

When to use it. Use this design when the question is how a human-plus-agent workflow changes code, rather than what an autonomous model emits. Random assignment gives a baseline for function and security outcomes, while logging allows suggestions and edits to be attributed.

Verus form. Inference: compare VL users or agents with and without lemma-generation assistance on the same pinned Verus tasks. Randomize task order and assistance condition, but keep the Verus binary, solver, dependencies, and specification frozen. Outcomes should include verified obligations, time, edits, specification changes, and independent recheck results. A human study is evidence about workflow behavior, not proof that generated Rust is secure.

Evidence and limits. The analyzed denominator is 58 completers, not the 105 recruits. The authors note that students were chosen as proxies and that their assignment and C language may limit generalization (§3.2, §5.2, pp. 7, 20). Inference: a Verus study needs experienced Rust users or a separate expertise analysis; C pointer bugs and Verus proof failures are different phenomena.

## technique 2: split-function functional testing with reference replacements

What it is. Measure functionality per API function rather than only running the whole program. The authors supplied 11 basic tests and wrote 43 expanded tests covering edge cases, invalid parameters, and post-call list state (§4.2, p. 9). Because one broken core function can make unrelated tests fail, they extract one submitted function at a time and replace every other API function with a known-good reference implementation.

How to do it. (1) Extract each API function and required helper/data-structure code. (2) Replace other API functions with reference implementations. (3) Compile the extracted unit; mark it non-compiling if compilation fails. (4) Run the 11 basic tests and 43 expanded tests. (5) Require code modification so the template's default `EXIT_FAILURE` does not count as an implementation. (6) Report four measures: percentage of functions implemented, percentage compiling, percentage passing basic tests, and percentage passing expanded tests (§4.2, pp. 9–10).

The paper reports that 19 of 58 submissions (32.8%) did not compile, including 9/30 (30%) in the assistant group and 10/28 (35.7%) in the control group (§4.2, p. 9). The assisted group had a small consistent advantage, and it submitted 280.9 average lines versus 247.5 for control, but comparisons were not significant at p<0.05 (§4.2, pp. 9–10). The denominator for these rates is the relevant submissions or functions, as stated in the text and figure caption.

Verus form. Inference: apply the same isolation idea to verification tasks by checking one function or lemma while replacing unrelated modules with pinned, trusted specifications. Run `verus` on the extracted function, then separately compile and test the complete crate. Preserve ownership, trait bounds, contracts, and ghost state at the extraction boundary. A passing isolated proof does not establish that the real module satisfies the same assumptions.

Where it fails. The authors warn that splitting can overestimate functionality when shared state is important and that unmodified stubs can spuriously pass tests (§4.2, p. 9). Inference: component isolation can hide cross-function aliasing, concurrency, and specification mismatch in a Verus crate; report both isolated and end-to-end results.

## technique 3: manual audit plus static and runtime analysis for security

What it is. Classify vulnerabilities using CWE and combine manual code review with tests and tool output. The authors considered CodeQL and fuzzing but rejected them as sole methods because false positives/negatives and deduplication made them unsuitable (§4.3, p. 10). Three authors read blinded submissions function by function, guided by compiler logs and basic/expanded tests, and annotated security-relevant bugs. The audit took 22 hours, or 66 person-hours, and produced 67 unique bug classes (§4.3, p. 10).

How to do it. (1) Review each function independently with the surrounding API contract. (2) Use compiler logs and functional tests to focus inspection. (3) Record each CWE instance and its source location. (4) Run static analysis and sanitizers when useful, but manually resolve false positives and classify bugs. (5) Use extended tests with NULL pointers, invalid indices, and boundary values. The paper's worked example finds NULL dereference (CWE-476), reliance on undefined behavior (CWE-758), and out-of-bounds write (CWE-787) in a function that passed basic tests (§4.2, pp. 9–10).

Verus form. Inference: make the equivalent audit a layered check: Verus contracts and invariants for memory safety and functional properties, Rust compiler checks, targeted tests, and manual review of `assume`, external specifications, unsafe code, and FFI. Record each finding using a stable taxonomy and source span. Verus proofs can establish only the stated predicates; they do not automatically prove that a contract captures the security requirement. A sanitizer or fuzzing run remains useful for executable paths outside the proved model.

Evidence and limits. Manual analysis is thorough but does not scale, as the authors state after the 66 person-hours. Their metric counts CWE instances, so one underlying defect can yield several downstream CWEs. Inference: VL should preserve both root cause and downstream effects and report the audit cost; a proof pass cannot be equated with zero CWE incidence without a checked mapping from the property to the vulnerability taxonomy.

## technique 4: non-inferiority security metric with explicit tolerance

What it is. Compare security-bug incidence per line of code and per function using a non-inferiority test. The null hypothesis says assisted code has more than δ% bugs than control; the alternative says it is less than δ% higher (§3.5, p. 8). The study chooses δ=10% and measures CWEs/LoC and average CWEs/function. The paper explains: “With δ = 10%, rejecting the null confirms that the bug incidence in the Codex assisted group is at worst 10% greater than the control group.” (§3.5, p. 8).

How to do it. (1) Count CWE instances per function and lines of code. (2) Compute CWEs/LoC over compiling functions and over functions passing unit tests. (3) Compute average CWEs/function with the paper's indicator for whether a function is present. (4) Run the non-inferiority test at δ=10%; report p-values and group denominators. (5) Repeat for all CWEs and severe CWEs (the MITRE Top-25 subset), and show per-function rates.

Results. Across compiling functions, control had 139 functions, 290 CWEs, and rate 2.09; assisted had 204 functions, 451 CWEs, and rate 2.21. For functions passing tests, control had 84 functions, 180 CWEs, rate 2.14; assisted had 124 functions, 278 CWEs, rate 2.24 (Table 3, p. 12). These are function-level denominators, not participant counts. The paper reports up to 22% lower rates for assisted code in some aggregate cases and concludes that severe-bug incidence was no more than 10% higher, but several per-function comparisons differ (§4.3.3–§4.3.6, pp. 11–14).

Verus form. Inference: define the unit as a verified function or proof obligation and count specification defects, failed independent rechecks, and security-relevant counterexamples per verified line or obligation. Choose δ before looking at results, record the exact numerator and denominator, and separate timeout/unknown from a counterexample. A Verus proof is binary for its contract; it does not directly yield a CWE rate, so the product needs a reviewed mapping from contract properties to the security metric.

Where it fails. The threshold is a subjective risk judgment; the authors explicitly say that a software-security community consensus is absent (§3.5, p. 8). The sample is small and several comparisons are not significant. Inference: a 10% threshold should not be treated as a universal safety guarantee for agent-written Rust.

## technique 5: provenance matching to locate bug origins

What it is. Attribute each final vulnerability to human code or an accepted LLM suggestion. The authors color final code using suggestion snapshots, matching suggestions in reverse chronological order first by exact string and then by normalized edit distance up to 50% (§4.4, p. 15). They ignore the provided template and inspect 564 vulnerabilities.

How to do it. (1) Save suggestion and document snapshots during the study. (2) For each final-code region, search the newest suggestion first. (3) Accept exact matches, then approximate matches within the stated 50% normalized edit distance. (4) Label each CWE as human, suggestion verbatim, or suggestion modified by the user. (5) For a repeated bug such as CWE-416 use-after-free, scan snapshots to find its first occurrence, count subsequent suggestions containing it, and count accepted instances (§4.4, pp. 15–16).

Evidence. Table 4 reports 60% of non-template lines as human-written, 16% Codex verbatim, and 18% approximate; bug attribution is 63% human, 16% Codex verbatim, and 20% approximate (rounding leaves one percentage point). The totals are 356 human-origin bugs and 36% LLM-origin bugs out of 564 (§4.4, p. 15). Inference: the source percentages use different denominators and should not be added as if they were the same partition; the paper's rounded categories explain the apparent one-point discrepancy.

Verus form. Inference: log every generated lemma, contract edit, invariant, and source patch with a content hash and source span. Match accepted proof text to final code exactly and approximately, but classify specification weakening separately from proof boilerplate. For each failed or later-invalidated proof, record whether the agent introduced the assumption or only repeated a human-provided one. Provenance does not prove correctness; it explains how defects enter a workflow.

## what is proved, measured, trusted, and already done

The study measures functionality, CWE incidence, and provenance under one two-week C assignment, with 58 completers and five manually audited autopilot answers. It does not prove the absence of vulnerabilities. Trusted elements include participant self-reporting, randomization, the cloud IDE logs and snapshots, test/reference code, manual CWE judgments, statistical tests, and the chosen 10% threshold. The authors caution that the task's unusual linked-list API and C language may affect results (§5.2, p. 20), and that snapshots every 60 seconds did not capture every keystroke (§5.2, p. 20).

Inference: VL should not redo a generic claim that LLMs can emit vulnerable code. The new product evidence needed is a Verus-specific study of specification quality, unsupported assumptions, proof maintenance, and independent replay. The threat to agent-written verified Rust is medium for implementation bugs when Verus checks memory and functional contracts, but high for wrong or weak specifications, external-body assumptions, FFI, and provenance that is not reviewed. The paper's own conclusion is deliberately narrow: “This is somewhat surprising given the existing published studies on how vulnerable code can be suggested by the LLMs.” (§6, p. 20).

## techniques for the catalog
- randomized assistant study — compare human or agent workflows with and without suggestions on the same frozen programming task
- split-function testing — isolate each API unit with known-good replacements and report compile and test denominators
- layered security audit — combine manual CWE review, static checks, runtime tests, and fuzzing while resolving tool errors
- non-inferiority metric — preselect a tolerance and test bug incidence per line or function with explicit denominators
- provenance matching — align final code with timestamped suggestions to classify how defects entered and spread

Checked 2026-10-15 against the paper by a Codex agent for lost_at_c_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
