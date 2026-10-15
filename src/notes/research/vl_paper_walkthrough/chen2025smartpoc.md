# SmartPoC: Generating Executable and Validated PoCs for Smart Contract Bug Reports
(authored by agents unless marked 🧑)
Tag: `chen2025smartpoc`, [paper](http://arxiv.org/abs/2511.12993v3)

## scope and evidence

SmartPoC turns a static vulnerability finding into an executable proof-of-concept (PoC), repairs it until it runs, and then checks a bug-specific state change. The paper identifies three components: Bug-Context Extraction (BCE), the Generate-Repair-Execute engine (GRE-Engine), and Action-State Differential Verification (DV). Its abstract says, “SmartPoC first extracts a focused function-level slice from each report to reduce noise,” and “We further use differential verification as an oracle to confirm the exploitability of generated test cases.”

Inference: the transferable formal-verification idea is a constrained generator plus an independent, auditable oracle. A Verus proof generator can use the same separation, but runtime exploitability is weaker evidence than a verified contract invariant.

## technique: bug-context extraction (BCE)

What it is: construct a compact context around the reported functions instead of prompting with the whole contract. A finding has a location and vulnerability description. BCE recovers a canonical function list and expands the key functions through semantic and structural links.

When to use it: use it when reports are noisy, mention functions with spelling or naming variation, or omit setup needed to reach a bug. The paper's lexical scan of 373 FORGE audit projects found that 97.61% contained at least one of the four links, so local-only slicing often loses execution prerequisites.

How to do it (Section 3.2):

1. Run Slither to recover a call graph and canonical function list.
2. Map a normalized finding location directly to functions; for heterogeneous reports, ask the LLM to select referenced functions from the recovered closed set.
3. Add semantic inverse operations, such as `deposit` before a reported `withdraw`, and state-coupled operations, such as `setFee` and `checkFee`.
4. Add structural links: modifiers that gate authorization, and wrapper callers/callees such as `transfer` and `_transfer`.
5. Recursively include direct callers/callees, underscore-prefixed implementations, referenced modifiers, constructors, initializer routines, compiler version, and remappings.
6. Deduplicate while preserving reachability order, then package the bug-context bundle.

Evidence: the authors state, “We first include the call-graph edges among the selected functions, and then add their direct callees and callers.” They also state, “Finally, we deduplicate the resulting function set while preserving reachability order, and package everything into a compact bug-context bundle for subsequent PoC generation.”

Verus form: Inference: build a dependency slice from the target Rust function through calls, trait implementations, preconditions, and state invariants. Supply the agent only the slice plus the relevant `requires`, `ensures`, and invariant lemmas. Closed-set selection can be represented by an enum or validated symbol list before generating proof code. Verus does not provide Slither's Solidity call graph, so extraction is an external preprocessing step.

Evidence and limits: BCE reduced average FORGE-Vul prompt length from 33.67k to 16.71k tokens, a 50.37% reduction, and SmartBugs-Vul from 5.29k to 4.72k, a 10.78% reduction. The paper does not claim that the slice is complete for every contract; omitted dynamic dependencies can still cause failures.

## technique: deterministic pre-execution sanitization

What it is: normalize generated PoCs before executing them, fixing version and import mismatches and preventing the generated test from rewriting the target contract. This is the first GRE-Engine repair stage.

How to do it (Section 3.3):

1. Extract compiler version and library identifiers from the draft header.
2. Apply deterministic edits for compatible syntax and APIs.
3. Match the target project's canonical functions, remove conflicting or redundant redefinitions, and rewrite imports.
4. Execute only after the PoC is aligned with the original contract.

Evidence: “These deterministic fixes substantially reduce compilation failures and enforce that PoCs interact with the original contract code, mitigating non-faithful transformations.”

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

Evidence: “We repeat this loop until the PoC executes, or until the attempt budget is exhausted.” The regeneration prompt is explicitly “Please fix the test code according to the log above and regenerate the complete test script.”

Verus form: Inference: feed verifier diagnostics into a bounded proof-repair loop. Preserve the current Rust proof and error output, but require approval for any contract change. A successful compile proves only the current specification; it does not show that the specification captures the intended behavior.

Evidence: removing post-repair, described as one generation round with no feedback, reduced generation rates to 17.99% (25/139) and 14.25% (61/428) on SmartBugs-Vul and FORGE-Vul (Table 4).

## technique: action-state differential verification (DV)

What it is: use a concrete trigger and a bug-relevant observable state, snapshot state before and after the trigger, and accept only a report-consistent difference. The LLM selects actions and state queries from public ABIs, but a simple comparison rule makes the final decision auditable.

How to do it (Section 3.4):

1. Give the finding, generated PoC, and public ABI to the LLM.
2. Have it select one action or short call sequence and one observable state.
3. Insert identical action and state-query operations before and after the critical trigger.
4. Execute and compare the snapshots; return the PoC and differential evidence only when the change matches the vulnerability semantics.

Evidence: “By comparing the state before and after under matched controls, we determine whether the vulnerability produces a real, report-consistent effect.” Figure 7's proxy example snapshots `preAdmin`, triggers an unprotected initializer or upgrade, snapshots `postAdmin`, then checks `preAdmin != Attacker && postAdmin == Attacker`.

Verus form: Inference: encode the analogous property as a proof lemma over pre-state and post-state, with `requires` for the trigger preconditions and `ensures` for the forbidden state transition. For executable regression checks, use Rust tests that call the same action and inspect state, but treat the Verus proof—not the test—as the soundness oracle. `old(...)` in an `ensures` expression can relate post-state to pre-state; the paper itself does not discuss Verus.

Evidence and limits: DV is execution-grounded, but its LLM-selected action/state can be incomplete or wrong. The authors explicitly warn that “errors in this instrumentation could affect exploitability judgments,” while saying the final judgment uses concrete runtime evidence.

## measurements, trust, and product threat

On ground-truth benchmarks, the abstract reports confirmation precision 98.32% and 98.65% and recall 84.17% and 85.28%; the body gives the denominators: recall is 117/139 for SmartBugs-Vul and 365/428 for FORGE-Vul. On Latest-114, the paper says SmartPoC confirms 64 bugs from 545 audit findings at average cost $0.03; its evaluation also reports 236 of 545 static-tool findings and audited precision 75.29%, so the two counts refer to different subsets and should not be conflated. Table 1's expert PPV values are 98.32% on SmartBugs-Vul and 98.65% on FORGE-Vul; Table 3's manually adjudicated analyzer PPV/NPV values use sampled denominators, such as total PPV 41/61 and NPV 56/74 for CCC.

The authors conclude that DV is not an LLM-as-judge mechanism: “the final judgment is based on concrete runtime evidence.” Trusted components remain the target compiler/runtime, public ABI extraction, deterministic sanitizer, LLM-generated instrumentation, and the manually chosen vulnerability semantics. Inference: threat to agent-written verified Rust is medium when DV is used as a bug-finding feedback oracle, but high if runtime differential evidence is treated as a substitute for a complete Verus specification. VL should reuse context slicing, deterministic preflight, bounded repair, and explicit denominators. VL should not redo a runtime-only oracle as proof of a Rust invariant.

## techniques for the catalog

- bug-context extraction — slice around key functions and expand semantic, structural, and initialization dependencies
- deterministic preflight — normalize versions/imports and prevent generated tests from replacing target behavior
- generate-repair-execute — regenerate from current diagnostics until execution succeeds or a budget ends
- action-state differential verification — compare matched pre/post state around a trigger using a bug-specific oracle
Checked 2026-10-15 against paper chen2025smartpoc: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
