# SmartPoC: Generating Executable and Validated PoCs for Smart Contract Bug Reports
(authored by agents unless marked 🧑)
Tag: `chen2025smartpoc`, [paper](https://arxiv.org/abs/2511.12993v3)

## scope and evidence

SmartPoC turns a static vulnerability finding into an executable proof-of-concept (PoC), repairs it until it runs, and then checks a bug-specific state change. The paper identifies three components: Bug-Context Extraction (BCE), the Generate-Repair-Execute engine (GRE-Engine), and Action-State Differential Verification (DV). Its abstract says, “SmartPoC first extracts a focused function-level slice from each report to reduce noise,” and “We further use differential verification as an oracle to confirm the exploitability of generated test cases.”

Inference: the transferable formal-verification idea is a constrained generator plus execution-grounded checks. These checks still involve LLM-generated instrumentation and an LLM semantic sanity check. A Verus proof generator could similarly separate generation from checking, but reproducing one exploit does not establish a contract invariant.

## technique: bug-context extraction (BCE)

What it is: construct a compact context around the reported functions instead of prompting with the whole contract. A finding has a location and vulnerability description. BCE recovers a canonical function list and expands the key functions through semantic and structural links.

When to use it: Inference: use it when reports are noisy, mention functions with spelling or naming variation, or omit setup needed to reach a bug. The paper's lexical scan of 373 FORGE audit projects found that 97.61% contained at least one of the four links (Section 3.2, p. 4): “We find that 97.61% of projects contain at least one of the four links, indicating that these patterns are prevalent in real codebases.” This measures pattern prevalence, not the frequency of slicing failures.

How to do it (Section 3.2):

1. Run Slither to recover a call graph and canonical function list.
2. Map a normalized finding location directly to functions; for heterogeneous reports, ask the LLM to select referenced functions from the recovered closed set. Validate these selections against the list and drop out-of-set symbols.
3. Use few-shot prompts to select semantic inverse operations, such as `deposit` before a reported `withdraw`, and state-coupled operations, such as `setFee` and `checkFee`, from the recovered function list.
4. Include call-graph edges among selected functions and their direct callees and callers. Recursively include reachable underscore-prefixed internal functions until reaching non-underscored implementations, preserving wrapper relationships such as `transfer` and `_transfer`.
5. Attach referenced modifiers, constructors and available initializer routines for the sliced functions' contracts, plus compiler version and remappings.
6. Deduplicate while preserving reachability order, then package the bug-context bundle.

Evidence (Section 3.2, p. 4): “We first include the call-graph edges among the selected functions, and then add their direct callees and callers.” Also: “Finally, we deduplicate the resulting function set while preserving reachability order, and package everything into a compact bug-context bundle for subsequent PoC generation.”

Verus form: Inference: build a dependency slice from the target Rust function through calls, trait implementations, preconditions, and state invariants. Supply the agent only the slice plus the relevant `requires`, `ensures`, and invariant lemmas. Closed-set selection can be represented by an enum or validated symbol list before generating proof code. Verus does not provide Slither's Solidity call graph, so extraction is an external preprocessing step.

Evidence and limits (Section 5.4, p. 10): BCE reduced average FORGE-Vul input length from 33.67k to 16.71k tokens, a 50.37% reduction, and SmartBugs-Vul from 5.29k to 4.72k, a 10.78% reduction. Inference: these measurements do not establish that every slice preserves all execution prerequisites.

## technique: deterministic pre-execution sanitization

What it is: normalize generated PoCs before executing them, fixing version and import mismatches and preventing the generated test from rewriting the target contract. This is the first GRE-Engine repair stage.

How to do it (Section 3.3):

1. Extract compiler version and library identifiers from the draft header.
2. Apply deterministic edits for compatible syntax and APIs.
3. Match the target project's canonical functions, remove conflicting or redundant redefinitions, and rewrite imports.
4. Execute only after the PoC is aligned with the original contract.

Evidence (Section 3.3, p. 5): “These deterministic fixes substantially reduce compilation failures and enforce that PoCs interact with the original contract code, mitigating non-faithful transformations.” Section 6 (p. 10) limits this claim: “We mitigate this risk through deterministic pre-execution sanitization, but subtle semantic deviations may still escape our checks.”

Verus form: Inference: run a deterministic preflight that rejects edits to verified modules, checks crate and Verus versions, and resolves imports before invoking the verifier. The equivalent soundness boundary is that generated code cannot replace the specification or the code whose behavior the proof is meant to establish.

Evidence and limits: removing pre-repair reduced generation rates to 41.01% (57/139) on SmartBugs-Vul and 34.81% (149/428) on FORGE-Vul (Table 4). These are generation-success rates under the stated DeepSeek-R1 configuration, not proof soundness rates.

## technique: post-execution debugger and bounded repair loop

What it is: execute the sanitized draft, collect compiler/runtime diagnostics, and regenerate with the latest draft and errors until execution succeeds or a retry budget is exhausted.

How to do it (Section 3.3):

1. Prompt the LLM with the vulnerability, extracted context, and a generation template.
2. Sanitize the draft deterministically.
3. Run it and record compilation or runtime errors.
4. Prompt with only the current PoC and current diagnostics, retaining conversational context for the intended exploit.
5. Repeat until execution succeeds or the attempt budget ends.

Evidence (Section 3.3 and Figure 6, p. 5): “We repeat this loop until the PoC executes, or until the attempt budget is exhausted.” The regeneration prompt is explicitly “Please fix the test code according to the log above and regenerate the complete test script.” Section 4.3 (p. 7) sets the default GRE-Engine retry budget to B=5, temperature to 0.3, and model to DeepSeek-R1-0528; execution uses Foundry forge 1.4.2-stable.

Verus form: Inference: feed verifier diagnostics into a bounded proof-repair loop while preserving the intended specification. Successful compilation alone establishes no proof; successful verification establishes the stated properties under the verifier's assumptions, which may still differ from the intended behavior.

Evidence: removing post-repair, described as one generation round with no feedback, reduced generation rates to 17.99% (25/139) and 14.25% (61/428) on SmartBugs-Vul and FORGE-Vul (Table 4).

## technique: action-state differential verification (DV)

What it is: use a concrete trigger and bug-relevant observable state, compare matched observations before and after the trigger, and accept only a report-consistent difference. The LLM selects actions and state queries from public ABIs, generates instrumentation, and sanity-checks observed changes against the finding.

How to do it (Section 3.4):

1. Give the finding, generated PoC, and public ABI to the LLM.
2. Have it select an action or short call sequence and observable state queries from public ABI functions and getters.
3. Use GRE-Engine to insert identical action and state-query operations before and after the critical trigger, with structured logs recording steps and values.
4. Execute, parse the logs, and compute pre/post deltas. If a state change occurs, ask an LLM whether it supports the reported vulnerability. Confirm only a vulnerability-relevant change under this check; otherwise mark the finding not validated under the oracle.

Evidence (Section 3.4, pp. 5–6): “By comparing the state before and after under matched controls, we determine whether the vulnerability produces a real, report-consistent effect.” The verification step explicitly says, “When a state change is observed, we further query an LLM to sanity-check whether the change constitutes evidence for the reported vulnerability.” Figure 7 (p. 5) snapshots `preAdmin`, triggers an unprotected initializer or upgrade, snapshots `postAdmin`, then checks `preAdmin != Attacker && postAdmin == Attacker`.

Verus form: Inference: encode the analogous property as a proof lemma over pre-state and post-state, with `requires` for the trigger preconditions and `ensures` for the forbidden state transition. For executable regression checks, use Rust tests that call the same action and inspect state, but treat the Verus proof—not the test—as the soundness oracle. `old(...)` in an `ensures` expression can relate post-state to pre-state; the paper itself does not discuss Verus.

Evidence and limits (Section 6, p. 10): “A potential threat to validity arises from our use of an LLM in the DV step to insert runtime checks, as errors in this instrumentation could affect exploitability judgments.” Inference: runtime evidence constrains the decision, but the action/state selection, instrumentation, and semantic sanity check remain potential sources of error.

## measurements, trust, and product threat

Section 5.2 (p. 7) reports benchmark recall of 84.17% (117/139) and 85.28% (365/428), with confirmation precision of 98.32% (117/119) and 98.65% (365/370) for SmartBugs-Vul and FORGE-Vul, respectively. These are distinct from the executable-PoC rates in Table 4: 98.56% (137/139) and 92.29% (395/428). Table 3's analyzer PPV/NPV values use manually audited samples; CCC's totals are 41/61 and 56/74.

For Latest-114, Table 2 and Section 5.3 (pp. 8–9) report 236 confirmations from 545 findings. Of 85 audited confirmations, 64 were judged true positives, giving PPV 75.29% (64/85). The corresponding audited rejections give NPV 97.35% (110/113). Section 5.3 states, “Because manual validation is costly, we adjudicate a randomly sampled subset.” Inference: the abstract's 64 bugs should therefore be read as the verified true positives in this sample, not as an exhaustive count of true positives among all 236 confirmations. The abstract's “average cost of $0.03” is clarified in Section 5.2 as API cost per validation with DeepSeek-R1, rather than cost per true positive.

Section 6 (p. 10) says, “DV is therefore execution-grounded rather than an LLM-as-a-judge mechanism.” Inference: that characterization needs qualification because Section 3.4 also specifies an LLM semantic sanity check. Trust still depends on the compiler/runtime, extracted interfaces, sanitizer, generated instrumentation, and interpretation of the finding. For VL, reuse context slicing, deterministic preflight, bounded repair, and explicit denominators; use runtime differential evidence for bug reproduction, and Verus verification for stated Rust properties. The paper does not evaluate Verus or VL.

## techniques for the catalog

- bug-context extraction — slice around key functions and expand semantic, structural, and initialization dependencies
- deterministic preflight — normalize versions/imports and prevent generated tests from replacing target behavior
- generate-repair-execute — regenerate from current diagnostics until execution succeeds or a budget ends
- action-state differential verification — compare matched pre/post observations and sanity-check the change against the finding with an LLM

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "When a state change is observed, we further query an LLM to sanity-check whether the change constitutes evidence for the reported vulnerability."): read the complete paper and study; checked quotations, numbers, section/page references, technique steps, tag and arXiv identifier; corrected BCE recursion, added DV's LLM semantic check, clarified sampled real-world counts and API cost, and marked extrapolations as inference; did not inspect implementation artifacts or reproduce experiments.
