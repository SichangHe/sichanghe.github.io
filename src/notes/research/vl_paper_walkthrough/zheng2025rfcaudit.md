# RFCAUDIT: AI Agent for Auditing Protocol Implementations Against RFC Specifications
(authored by agents unless marked 🧑)
Tag: `zheng2025rfcaudit`, [paper](https://www.semanticscholar.org/paper/ce195b1cd241fdc80bcd9133518acaf9dbb41baa)

## scope and result

Zheng et al. present RFCAUDIT, a two-agent system for finding functional inconsistencies between network-protocol code and RFC prose. An indexing agent builds hierarchical natural-language summaries of functions, files, directories, and repositories. A detection agent localizes code for each RFC property, retrieves callers/callees on demand, compares code with the property, and self-critiques suspected bugs. The abstract claims, “We introduce a multi-agent design that summarizes code functionalities as semantic indexes and leverages them for demand-driven code retrieval, facilitating functional bug detection with high precision.” (Abstract, p. 1)

The method addresses non-crashing semantic bugs that fuzzing and low-level static analysis often miss. Its evaluation covers six protocol implementations from FRRouting and lwIP, 131 RFC properties, and 83 bug reports. It reports 68 true positives among 83 reports (81.9% precision), 47 unique bugs (40 new, 7 previously reported), and 20 of the 47 confirmed or fixed by developers (Tables I–II, pp. 6–7). These are report and bug denominators, not proof rates.

The authors frame the system as “the first LLM agent for detecting functional bugs in network protocol implementations.” (Section I, p. 2)

## technique: bottom-up semantic indexing

What it is: summarize code from functions upward so RFC prose can be mapped to implementation regions (Section III-A, pp. 3–4). The index is produced once and can be incrementally updated when code changes.

How to apply it:

1. Prompt an LLM for a one- or two-sentence summary of each function (Figure 4, p. 4)
2. Aggregate function summaries within each file and prompt a file-level description
3. Aggregate file summaries into directory descriptions, then directory descriptions into a repository summary (Section III-A, pp. 3–4)
4. Preserve the hierarchy so a detector can navigate from an RFC section to likely files and functions (Figure 4)

The Babel example summarizes `route_lost`, `find_best_route`, and `send_update_resend`, allowing the detector to reach related code in a different file. The paper reports an average Phase 1 cost of $1.89 per repository using Claude 3.5 Sonnet, 287K input and 66K output tokens, and 42 minutes (Table V, p. 10). Inference: for VL, a similar index can summarize Rust modules, trait implementations, state-machine transitions, and proof lemmas before asking an agent to align a natural-language requirement with code.

Verus form: Inference: keep the index outside the proof kernel as retrieval metadata. The verified artifact should still contain explicit `requires`, `ensures`, invariants, and `proof fn` lemmas. An index may select candidate functions, but only Verus checking can establish that the selected contracts cover all relevant callers and callees. Index summaries are therefore a navigation aid, not evidence of correctness.

## technique: retrieval-guided detection with self-critique

What it is: walk a finite-state audit workflow—localize, detect, retrieve if context is insufficient, then validate a suspected bug (Sections II-B and III-B, pp. 3–5). The detection agent can invoke `Query(name)`, `Query_Callee(call)`, and `Query_Caller(fun)`.

How to apply it:

1. Segment the RFC and extract mandatory semantic properties from each subsection (Section III-B, p. 4)
2. Traverse the semantic index top-down to select relevant directories, files, and functions (Localization, p. 4)
3. Ask whether the available code satisfies the property; return yes, no with a bug explanation, or unknown when context is insufficient (Detection, Figure 6b, p. 5)
4. If unknown, retrieve a definition, callee, or caller and repeat the comparison (Retrieval, Figure 6c, p. 5)
5. Ask a self-critic to review the RFC, retrieved code, and reasoning chain; retain only confirmed violations (Validation, Figure 6d, p. 5)

In the motivating Babel case, retrieval reveals that only feasible routes are searched and that fallback code omits a sequence-number request required by RFC 8966. The authors state, “When a potential functional bug is found, the detection agent examines the reasoning chain that produces the reported bug via self-criticism (Validation).” (Section III-B, p. 4) Self-critique reduces false positives from 63.9% to 18.1%, a 71.7% reduction (Section III-B, p. 5). Removing retrieval drops precision from 81.9% to 47.1% and discovered bugs from 47 to 36 (Table VI, p. 10). Removing semantic indexing drops precision to 51.4% and bugs to 26 (Table VI, p. 10).

Verus form: Inference: use retrieval to propose candidate proof obligations and counterexample contexts, then express the resulting requirement as a Verus contract or lemma. A self-critic can reject an obligation whose precondition is not established by callers, but it cannot replace the verifier. The closest Verus analogue is a proof review loop that retrieves neighboring transition functions until all state changes needed for an invariant are present.

## evidence, trust, and limits

RFCAUDIT's retrieval study samples 30 RFC subsections (five per protocol) covering 131 properties. Localization retrieves 102 of 143 ground-truth functions (71.3% recall); after retrieval, function recall is 136/143 = 95.1%, type recall 7/9 = 77.8%, and macro recall 6/8 = 75.0% (Table III, p. 8). The full analysis averages 1,123K input and 90K output tokens, costs $5.03, and takes 81 minutes per protocol (Table V, p. 10). The reported 81.9% precision is 68 true positives divided by 83 reports (Table II, p. 7). The 20 confirmed/fixed count has denominator 47 unique bugs, not 83 reports.

Trusted elements include the RFC interpretation, semantic summaries, retrieval tools, LLM reasoning, and human classification of true and false positives. The authors identify RFC misinterpretation, code misinterpretation, incomplete context, and intentional implementation choices as false-positive causes (Section IV-B3, p. 8). Inference: a VL product faces a medium threat from using this technique as an oracle: it can find missing specifications and likely proof obligations, but agent-generated summaries can omit a state transition and produce a plausible false alarm. Formal Verus proofs, plus explicit coverage of callers and state-machine transitions, are needed before accepting a repair.

Existing formal model checking already proves properties when engineers provide precise models; RFCAUDIT targets the informal-specification gap. VL should reuse its staged retrieval and validation workflow for RFCs or design documents rather than redo a generic LLM bug detector.

## techniques for the catalog

- hierarchical semantic indexing — summarize functions, files, directories, and repositories bottom-up for code localization
- demand-driven retrieval — fetch definitions, callees, and callers only when current context is insufficient
- staged conformance detection — localize, compare with the specification, retrieve, and validate in a finite-state workflow
- self-critique validation — review the full reasoning chain to filter false positives
- recall-first context collection — prefer retrieving extra relevant code over missing a function needed to establish a property

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
