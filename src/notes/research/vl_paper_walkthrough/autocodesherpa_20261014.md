# AutoCodeSherpa: Symbolic Explanations in AI Coding Agents
(authored by agents unless marked 🧑)
Tag: `kang2025symbolic`, [paper](https://arxiv.org/abs/2507.22414v2)

## what the paper defines and measures
AutoCodeSherpa turns a natural-language bug report and buggy repository into an executable symbolic explanation. The explanation is a triple: an input condition I, infection conditions F_L at program locations, and an output condition O. Definition 1 requires I to be a quantifier-free first-order formula over program inputs, all of which trigger the issue (Section 4, p. 7). O is a quantifier-free first-order terminal-state formula that holds only when the issue is triggered, and for which the partially-correct Hoare triple {I} P {O} holds. F_L is required to make both {I} C1 {F_L} and {¬I} C1 {¬F_L} hold at location L. The implementation checks sampled executions against these requirements; it does not deductively establish them for every input. The checked version is arXiv:2507.22414v2, dated 1 February 2026 (p. 1).

The construction is a multi-agent pipeline. The PBT agent derives I and O; a code-exploration agent finds suspicious functions; an infection-condition agent finds covered lines and synthesizes predicates. Runtime monitoring evaluates first-order predicates at selected lines. The paper explicitly limits itself to partial correctness: “As deciding program termination is beyond the scope of this paper, all Hoare triples in our work are partially correct” (Section 2.2, p. 3). Inference: for VL, partial correctness can describe behavior conditional on termination, but sampled AutoCodeSherpa checks establish neither universal partial correctness nor termination.

## technique 1: generalize a bug report into an executable input/output condition

When to use: use this to obtain a broad reproducer that characterizes all sampled inputs for a reported bug, then use it as a patch oracle.

Steps from the paper:

1. Generate several concrete reproducing inputs from the issue description, with actual and expected outputs (Section 5.1, p. 8). This deliberately moves from one example to a family.
2. Symbolize those examples into a PBT. The agent can read and edit files, execute commands, and run the PBT while searching for a general generator and assertion (Section 5.1, p. 8). Figure 1 illustrates Hypothesis generators, an `assume` precondition, a program call, and an assertion (Section 2.3, p. 4). For AutoCodeSherpa, O denotes the buggy outcome, implemented as an expected exception type; an assertion failure can represent that outcome (Section 4, p. 7).
3. Execute the candidate and require the specified failure. A single successful failing input only establishes existence, so continue to refinement (Section 5.1, p. 8).
4. Collect failing inputs and exceptions. If a failure is unrelated to the issue, strengthen I or O and return to symbolization; the prompt is enriched with the irrelevant case (Section 5.1, pp. 8–9).
5. Collect passing inputs, which satisfy I but do not produce O. Strengthen I with another `assume` or alter the generator, rerun, and repeat until every generated input reaches O (Section 5.1, p. 9). The authors avoid weakening O because that could reject a genuinely correct patch.

Inference: Verus form: encode the input domain as a `requires` clause or a predicate, and the expected result as `ensures`; use a `proof fn` to establish the contract for a deterministic Rust implementation. A sampled PBT provides test evidence; a successful Verus proof would establish the contract over its modeled domain, subject to its assumptions. The generator and `assume` do not carry over as proof: they become the specification's precondition. Rust types and explicit ownership may require changing Python object construction, but the semantic split into I and O remains.

The paper states, “The generated symbolic explanations are thus highly accurate, and would likely be sufficient for developers to trust AutoCodeSherpa’s results” (Section 7.1, p. 12). Evidence: RQ1–RQ3 use gpt-5-mini (Section 6, p. 11). Input/output conditions are accepted when their PBT fails on the buggy program and passes on the developer-fixed program; other cases are manually examined (Section 6, p. 10). On SWE-bench Verified's 500 issues, a PBT containing I and O was generated for 433/500 (86.6%); among those 433, I was correct for 371/433 (85.7%), O for 342/433 (79.0%), and both for 318/433 (73.4%) (Section 7.1, pp. 12–13, Figure 6). These denominators are issues with a generated PBT, not all 500. The smallest repository, requests (30 kLoC), had PBT accuracy 81.2%; astropy, 804 kLoC, had 81.8% (Section 7.1, p. 12). Section 7.1 attributes some errors to incomplete issue descriptions; Section 7.2 also identifies LLM hallucinations. Inference: these measurements do not establish universal correctness.

## technique 2: synthesize and refine infection predicates

When to use: use infection conditions to inspect internal states associated with a bug. Inference: they can also guide inspection of patch effects.

Steps from the paper:

1. Search the repository's abstract syntax tree using issue keywords; iteratively inspect results until suspicious functions are selected (Section 5.2, p. 9).
2. Select candidate lines inside those functions. Require every I-generated input to execute each line; revise the line set for up to five iterations when coverage fails (Section 5.2, p. 9).
3. Prompt an LLM to produce a quantifier-free first-order predicate at each covered location, with the explicit goal of accepting all bug-triggering inputs and excluding passing tests (Section 5.2, p. 9).
4. Test whether the predicate is too strong (false for an I input at a visit) or too weak (true for a non-I input at a visit). Feed failures and surrounding code back to the agent and retry up to five times per location (Section 5.2, pp. 9–10).
5. Keep predicates passing both checks and return all successful locations. The paper's SymPy example identifies lines 510 and 512 where a function argument is itself a function and an exception path incorrectly executes (Section 3, pp. 5–6).

Inference: Verus form: represent F_L as a state predicate and prove the two implications from Definition 1: I implies F_L after the preceding code, and not-I implies not-F_L. Assertions and helper-function contracts could express these obligations. A loop invariant may help when L lies inside a loop, but must account for repeated visits. Python object predicates would require an explicit Rust state model. These adaptations are proposals, not results evaluated in the paper.

Evidence: 1,001 infection predicates were generated for 289/433 issues with PBTs, an average of 3.46 per such issue; 798/1,001 (79.7%) were correct, where correctness means true on all F2P tests and false on all P2P tests (Section 7.1, pp. 12–13). Predicates were not generated for 144/433 (33.3%); Django's nested objects reduced generation, although 62% of its issues still obtained predicates (Section 7.1, p. 12). Inference: these benchmark test results do not prove the predicates for all executions.

## technique 3: execute explanations as patch validation

When to use: run the generated PBT after applying an agent patch to reject patches that still trigger the issue.

Steps: apply a candidate patch; run the explanation's PBT, which samples bug-triggering inputs and checks for the output failure; classify a patch that still fails as invalid (Section 7.2, pp. 12–13). The benchmark's F2P tests are withheld from agents and used for evaluation; P2P regression tests are available (Section 6, p. 10). Ground truth additionally requires passing both test sets and semantic equivalence to the developer patch, manually checked by two authors (Section 6, p. 11; Section 9, p. 17).

On the common set of 396 issues, AutoCodeSherpa had TP 132, TN 105, FP 140, FN 19. Thus precision was 132/(132+140)=48.5%, recall 132/(132+19)=87.4%, and false-positive rate 140/(105+140)=57.1% (Section 7.2, pp. 12–13, Table 1). TN was 105/245 incorrect patches, 123.4% higher than OpenHands's 47/245 and 262.0% higher than SpecRover's 29/245; the denominator is the 245 incorrect patches in this shared set. Table 2 (p. 13) lists 53 exception-only checks, 51 incomplete issue descriptions, and 36 developer patches extending beyond issue scope. Its printed percentages do not all match these counts out of 140. The discussion instead says, “Finally, for 38 issues, the patch correctly handles the reported issue (and is thus flagged as correct by the PBT), but the developer patch goes beyond the reported issue and makes additional changes to the program” (Section 7.2, p. 14). The paper does not reconcile 36 with 38. Inference: the qualitative failure causes are useful, but their exact proportions are unreliable.

Inference: Verus form: a candidate Rust patch can be checked against a `requires`/`ensures` contract and lemmas, which is stronger than sampled PBT when the model is faithful. Keep a separate executable regression test for behaviors outside the issue contract. A proof remains conditional on the specification and trusted external bodies, just as this PBT remains conditional on its input and output conditions.

## technique 4: supply symbolic explanations to another coding agent

AutoCodeSherpa converted complete explanations to a report and appended it to Agentless's bug report (Section 6, p. 11). Agentless generated ten patches per issue, and all ten were evaluated. With explanations, file top-1 localization was 78.2% versus 65.7% without; element top-1 was 42.6% versus 27.3% (Table 3, p. 14). Plausible means passing the developer-written reproducer test (Section 6, p. 11). Plausible patch rate rose from 29.2% to 47.0%, a 60.7% relative increase, and issues with at least one plausible patch rose from 43.6% to 57.8%, a 32.5% relative increase (Table 4, p. 15). In a 30-bug failure sample, 46.7% had explanations describing the cause without specifying a resolution (Section 7.3, p. 15). Inference: explaining a cause does not necessarily specify a repair.

## empirical limits and implications for VL

The authors write, “The PBT agent was allowed at most 50 requests to the LLM to limit time and cost” (Section 6, p. 11). The paper defines logical requirements and reports empirical accuracy; it provides no deductive proof that generated explanations satisfy those requirements for every execution. Section 9 (p. 17) cautions that results may not generalize beyond SWE-bench Verified, to other languages, or from Agentless to other repair techniques. The unhelpful Django case focused on a wrapper rather than the implementation containing the cause (Section 8, p. 17). Inference: evidence depends on generated tests, runtime monitoring, benchmark tests, manual patch judgments, and the Python execution environment; agreement with a wrapper state need not establish causation.

Inference: for VeruLaw, the reusable idea is a three-layer contract witness: precondition that triggers a behavior, ghost/state predicate locating the bad transition, and postcondition observing the failure. It could prioritize review of agent-written Rust and reject patches that violate a verified bug contract. Sampled symbolic explanations do not establish that a natural-language requirement is complete, that termination holds, or that unmodeled unsafe/foreign code satisfies assumptions. VL should reuse the explicit contracts and proof obligations, while treating generated predicates as hypotheses until Verus proves them.

## techniques for the catalog

- executable input/output conditions: generalize examples into a property-based contract and refine preconditions until all generated inputs satisfy the intended failure
- infection predicate synthesis: locate lines covered by all sampled bug-triggering inputs, synthesize state predicates, and reject predicates that are too strong or too weak
- executable patch validation: run the symbolic PBT against a candidate patch and classify surviving failures
- explanation-assisted repair: feed sampled and refined trigger/state/output evidence to a second coding agent for localization and patch generation
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Patches that pass the tests are then manually checked for semantic equivalence with the developer-written patch from the benchmark."): checked all paper text, quotations, numbers, section/page references, and technique steps; corrected the paper link, proof claims, output-condition description, validation references, and false-positive counts; marked adaptations and conclusions as inference; did not reproduce experiments, inspect implementation code, or validate Verus proposals.
