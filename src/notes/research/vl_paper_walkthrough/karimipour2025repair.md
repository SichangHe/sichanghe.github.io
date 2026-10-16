# LLM-Based Repair of Static Nullability Errors
(authored by agents unless marked 🧑)
Tag: `karimipour2025repair`, [paper](https://arxiv.org/abs/2507.20674)

## scope and central result

NullRepair repairs residual Java nullability-checker errors after annotation inference. The paper studies 1,119 residual errors in 12 real-world projects. Its abstract reports that NullRepair “resolves 63% of the 1,119 nullability errors that remain after applying a state-of-the-art annotation inference technique” (abstract, p. 1). The system combines a human-derived decision flowchart, static analysis, safe-usage retrieval, LLM decisions and patch generation, and iterative checker feedback.

The paper separates static correctness, dynamic correctness, and manual acceptability. It reports all unit tests passing in 10 of 12 projects, with at least 98% passing in the other two (abstract, p. 1). It also says: “LLM-generated patches are often ‘plausible but incorrect’” (§1, p. 2). Inference: the key lesson for VL is to treat a verifier error as a structured diagnosis problem and to validate semantics after the checker is quiet.

## technique 1: derive a decision flowchart from real errors

What it is. The authors manually analyze 200 residual errors after annotation inference, recording each decision, question, answer form, and action. They iteratively refine a flowchart until it covers all decisions and actions in those cases (§4, pp. 5–6).

How to do it. (1) Collect representative residual checker errors (§4, p. 5). (2) For each, record the triggering expression, program point, error type, message, and optional suggested annotation (§5, p. 6). (3) For every decision, write the question, expected answer form, and resulting action (§4, p. 5). (4) Add branches when a new error is not covered (§4, p. 5). (5) Run one NullRepair instance per error through the nodes, choosing an LLM query, static analysis, or code transformation at each node (§5, p. 6).

Verus form. Inference: build an error-classification state machine over Verus diagnostics: identify the failing expression, source location, obligation type, and available contract suggestion, then route to invariant strengthening, precondition repair, proof lemma, or implementation change. Keep each branch explicit in a machine-readable ledger. This is a workflow inference; the paper targets NullAway, not Verus.

Evidence and limits. The flowchart is grounded in 200 errors but three of the 12 evaluation benchmarks also supplied those errors, creating overfitting risk (§8, p. 18). On the nine untouched benchmarks, per-patch repair is 61.8% versus 62.2% overall, combined repair 63.4% versus 62.9%, and test-failure rate 0.26% versus 0.23% (§8, p. 18). These denominators are nine benchmarks versus all 12, not independent error-level replications.

## technique 2: apply null-safe heuristic rewrites first

What it is. NullRepair checks a table of safe patterns before asking an LLM. Examples include `x.equals(y)` → `Objects.equals(x, y)`, `x.hashCode()` → `Objects.hashCode(x)`, and `x.toString()` → `String.valueOf(x)` when `x` is nullable (Table 1, p. 7). For a nullable `x.deref()` in a nullable-returning method with safe call sites, it inserts an early `return null` (§5.1, p. 6).

How to do it. (1) Match the triggering expression and precondition (§5.1, p. 6). (2) Apply the corresponding rewrite immediately when matched (§5.1, p. 6). (3) Preserve non-null behavior and define explicit null behavior using the table's rule (§5.1, p. 6). (4) Run the checker again before proceeding to more expensive branches (§5, p. 6). The paper places these rewrites before LLM false-positive suppression because they have nearly no risk (§5.1, p. 7).

Verus form. Inference: encode the non-null branch and null branch directly in executable Rust, then prove the postcondition with `ensures`; use `requires` for any caller condition. For a nullable option, use `Option<T>` and pattern matching rather than unchecked dereference. The semantic-safety argument must be a Verus proof or an explicit trusted contract.

## technique 3: classify false positives with bounded-context LLM queries

What it is. NullRepair asks whether a checker report is a false positive, initially giving the model only the containing method. The model must answer Yes, No, or Unsure in structured XML; on Unsure it can request a related method, field declaration, or usage (§5.2, pp. 7–8; §5.5.1, p. 9). If the report is false, NullRepair inserts an explicit non-null cast without changing behavior (§5.2, p. 8).

How to do it. (1) Extract the method containing the report (§5.2, p. 7). (2) Ask whether the expression is guaranteed non-null at the error location (§5.2, p. 7). (3) Supply requested context only when the model returns Unsure (§5.2, p. 7). (4) If a guard or contract proves non-nullness, insert a cast and rerun the checker (§5.2, p. 8). (5) Keep the decision prompt separate from patch prompts; other flowchart decisions are static (§5.5.1, p. 9).

Verus form. Inference: ask an agent to classify whether a failed proof obligation is caused by a missing fact or by an overly weak model, but require the final proof to establish the fact with `assert`, `requires`, or a lemma. Never suppress a Verus obligation with an unchecked cast; if an external invariant is trusted, mark it as such and isolate the boundary.

Evidence and limits. On 75 manually reviewed cases, NullRepair classified 27/33 true positives and 33/42 false positives, yielding precision 75%, recall 82%, and F1 78% (§7.2, p. 17). These denominators are the 33 true-positive and 42 false-positive cases inferred from reviewer discussions, not all 1,119 errors.

## technique 4: propagate triggered errors and use safe usage regions

When adding `@Nullable` fixes one error but triggers others, NullRepair reruns the checker, feeds each new error into the flowchart, and maintains a working copy of rewritten regions (§5.3, p. 8). It limits attempts with a fixed budget because trigger chains can be infinite (§5.3, p. 8).

If simpler branches fail, the system partitions code into method bodies and field declarations with `usageRegions : Symbol → {Method or Field Declaration}` (§5.4, p. 8). It indexes whether each usage is safe or checker-triggering, retrieves safe examples, and places them in the patch prompt (§5.4, pp. 8–9). For a third-party expression, it finds the nearest project-declared receiver and retrieves that receiver's lifecycle usages instead of all global calls (§5.4, p. 9). In Figure 2, a safe `getMapView()` use returning `(-1,-1)` guides a coordinated null-check/default-value patch (§3, pp. 4–5).

Verus form. Inference: index each Rust symbol by functions, fields, and proof contexts, classifying uses by whether Verus discharges the relevant obligation. Feed only verified safe patterns to an agent; require it to produce a patch whose contracts are checked. A failed proof should trigger re-analysis of dependent callers and invariants, analogous to NullRepair's triggered-error loop.

## technique 5: validate structured prompts and iterate patches

Decision prompts are tuned from labeled examples, tested on at least 20 benchmark cases, and accepted only when responses match expected answers across that subset (§5.5.3, p. 9). Outputs use a fixed XML schema; malformed responses are retried with the parse error, up to five times per query (§5.5.3, p. 9). Each error has a maximum of 50 LLM queries (§5.5.3, p. 9). Patch prompts include the triggering expression, safe examples, and the enclosing method; responses are checked for syntactically valid Java before downstream analysis (§5.5.2, p. 9).

Verus form. Inference: require machine-parseable patch and proof outputs, rerun Verus after each edit, and bound retries. Syntax validation is weaker than proof validation; a Verus success is evidence only for the written contract.

## evidence, trust, and VL relevance

Table 2 reports 62% per-patch NullRepair success (696/1,119) and 63% combined resolution (704/1,119); SinglePrompt is 69% per-patch and 72% combined, while mini-SWE-agent is 76% and 78% (§7.2, Table 2, pp. 11–13). NullRepair's advantage is semantic: Table 3 has 35 failing tests out of 15,003 total (0.2%), with zero failures in 10 of 12 projects and 98% or more tests passing in the remaining two (§7.2, Table 3, p. 14). Manual review covers 225 patches from 75 shared error cases, at least two blinded reviewers each; 29/75 (39%) NullRepair patches are likely acceptable, 16/75 need work, and 30/75 are likely unacceptable (§7.2, pp. 14–16). The paper also reports 1.2 minutes, 15,000 tokens, and $0.05 per error (Table 4, p. 17).

Trusted elements include NullAway, annotation inference, JavaParser, LLM classifications, test suites, reviewer judgments, and the specification that existing tests represent semantics. The authors state: “Tests can show the presence but not the absence of errors” (§8, p. 18). Inference: VL should reuse staged diagnosis, safe-context retrieval, bounded repair, and post-repair semantic testing for Verus errors. The product threat is high for agent-written verified Rust if agents optimize only for a green verifier; NullRepair demonstrates that baselines can remove more checker errors while breaking behavior. The paper does not evaluate Verus, Rust, or formal proof soundness, so the threat magnitude is an inference.

## techniques for the catalog

- error-derived decision flowchart — refine repair branches from manually analyzed residual errors
- null-safe heuristic rewrites — apply preconditioned semantic-preserving transformations before LLM calls
- bounded false-positive classification — ask for Yes/No/Unsure with incremental context and explicit casts only after evidence
- safe usage-region retrieval — index symbol contexts and prompt patches with project-consistent safe examples
- triggered-error propagation — rerun the checker after each annotation and process newly exposed errors under a fixed budget
- structured prompt validation — enforce XML schemas, benchmark prompt decisions, bounded retries, and syntax checks
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
