# Euclid-MCP: A Model Context Protocol Server for Deterministic Logical Reasoning via Prolog
(authored by agents unless marked 🧑)
Tag: `bogliolo2026euclid`, [paper](https://doi.org/10.1109/TNNLS.2024.3420218)

## what the paper builds
Euclid-MCP puts an LLM in front of a deterministic Prolog engine. The model translates natural-language policy questions into Euclid-IR facts, rules, and queries; the server checks and lowers that representation to SWI-Prolog; Prolog returns substitutions and proof trees; and the model explains the result. The paper states: “Euclid-MCP follows a hybrid cognitive architecture in which an LLM describes the world in terms of facts and rules, while a deterministic inference engine performs the actual deduction.” (Section 3.1, p. 7)

The representation is deliberately small: ground facts, Horn-clause rules, conjunction, closed-world negation, arithmetic, wildcards, queries, and an optional version directive. A variable is written `$x`; `mortal($x) IF human($x)` is lowered to `mortal(X) :- human(X).` A query such as `? ancestor(tom, $who)` asks for bindings. `NOT` means negation as failure, so it succeeds when the subgoal cannot be proven. OR, cut, lists, dynamic predicates, modules, strings, and advanced Prolog are excluded. The paper says, “Euclid-IR targets Horn-clause logic — the core of Prolog without advanced features.” (Section 3.2.2, p. 10)

Inference: for verified Rust, this is a useful separation between an untrusted translator and a small trusted decision kernel. The kernel should own the rule semantics and proof object; an LLM may propose a specification but must not be the authority that declares it proved.

## technique 1: lower a constrained logical IR to a deterministic backend

When to use: use an engine-agnostic IR when clients need a readable policy language but the execution engine may change, or when generated code must be auditable and sandboxed.

Steps from the paper:

1. Write facts, rules, and a query in Euclid-IR. Facts are ground atoms such as `parent(tom, bob)`; rules use `IF`, and conjunction uses `AND` (Section 3.2.1, pp. 8–10).
2. Parse and normalize the input, checking syntax and allowed constructs in the MCP server (Section 3.1, p. 7).
3. Map every fact directly to a Prolog fact and every rule to a Prolog clause. The paper's example is `mortal(X) :- human(X).` and `ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).` (Section 3.3, p. 11).
4. Capitalize Euclid-IR variables (`$x` becomes `X`), map `IF` to `:-`, `AND` to `,`, `NOT` to `\+`, and `?` to a top-level goal (Section 3.3, p. 11).
5. Sanitize predicates and reject dangerous built-ins such as file I/O and network access; cap input at 500 KB and bound execution by a 30-second timeout (Section 3.3, p. 11).
6. Write a temporary `.pl` file, invoke `swipl` as a subprocess, parse structured JSON containing solutions and proof trees, and remove the temporary file (Section 3.5, p. 13).

Verus form (Inference): represent the parsed IR with Rust enums and verify a pure lowering function. Use `spec fn` for the semantic relation between an IR clause and its lowered clause, `ensures` on executable lowering functions, and `assert`/`assert forall` in proof functions to show that each permitted constructor maps once. Keep subprocess invocation and parsing behind an `external_body` boundary only for the backend adapter; verify the parser, sanitizer, size bound, and mapping around that boundary. Verus has no Prolog execution model, so semantic equivalence to SWI-Prolog remains an assumption unless the backend is modeled.

Evidence: the implementation invokes SWI-Prolog externally and returns proof trees (Section 3.5, p. 13). In the small benchmark, all three conditions (Llama 3.1 8B, Qwen3 Coder 480B, and 8B+Euclid) answered 5/5 tasks; average times were 4,772 ms, 2,180 ms, and 2,542 ms, with 254 input/46 output tokens for the augmented system (Table 2, p. 22). In the 1,000-user, 1,053-fact RBAC benchmark, LLM-only systems scored 2/5 each, while 8B+Euclid scored 5/5, averaged 963 ms, and emitted 421/12 input/output tokens (Table 3, p. 23). These denominators and settings matter: the result is five questions, synthetic RBAC, and the listed models.

Failure and assumptions: closed-world negation is not general classical negation; Horn clauses cannot express disjunction or complex data structures; the current backend is SWI-Prolog; and the paper only reports scaling to about 4,000 facts, warning that 100,000+ facts may need indexing, tabling, or Datalog (Section 5.5, p. 24). The paper does not prove that the LLM's translation captures the intended policy. Inference: that translation gap is the main threat when an agent writes verified Rust—the verifier can prove a faithfully encoded but wrong policy.

## technique 2: run a validate–translate–inspect–repair loop

When to use: use the loop when an LLM must author or maintain a rule base and needs machine feedback instead of free-form self-critique.

The paper gives six steps: “1. Validate: The LLM calls check_kb to verify the knowledge base is well-formed before reasoning. 2. Translate: The LLM generates a Euclid-IR knowledge base (facts + rules + query). 3. Run: The LLM invokes reason to obtain answers with proof trees. 4. Inspect: If the result is unexpected, the LLM calls diagnose to understand why a query succeeds or fails. 5. Repair: Based on the diagnosis, the LLM may refine the knowledge base (e.g., add missing rules, correct mis-encoded conditions) and re-run the query. 6. Explore: The LLM uses what_if to test hypothetical modifications before applying them.” (Section 3.4, p. 12)

The four tools have distinct contracts. `check_kb` reports validity, syntax errors, undefined predicates, circular rules, duplicates, and counts. `reason` returns bindings plus fact/rule/and proof-tree nodes. `diagnose` supports `why`, `why_not`, and `what_needs`; for example, it can report that a missing `mortal` rule explains a failed query. `what_if` applies `+` and `-` modifications and returns before/after counts, solutions, and a delta (Section 3.4, pp. 12–13).

Verus form (Inference): make each loop stage a typed state transition (`UncheckedKb -> CheckedKb -> QueryResult -> Diagnosis -> RepairedKb`) and prove that a later stage consumes only the required earlier state. Use `requires`/`ensures` on transition functions and a loop invariant over the repair iteration's bounded step count. A proof tree can be an inductive enum whose nodes carry the rule or fact used; verify that every reported successful binding has a tree accepted by the checker. The LLM's choice of repair is outside the trusted proof and must be treated as a new candidate.

Evidence: the security use case defines ten canonical queries plus three diagnostics and three what-if scenarios (Table 1, p. 21). For separation-of-duties, the small KB yields 2 violating users and the large KB yields 11 (Section 4.2.3, p. 16); the denominator is the respective KB, about 30 users/50 resources/578 facts versus 200/300/3,872. For the promotion scenario, replacing `has_role(eng_0002, intern)` by `has_role(eng_0002, senior_dev)` changes `deploy_code` from failure to success (Section 4.5.1, p. 19).

Failure and assumptions: diagnosis explains consequences of the encoded rules, not whether those rules match organizational intent. The paper reports no false-positive/false-negative study for translation or diagnosis. Inference: a Verus workflow should require human or separately checked contracts for policy intent before accepting a repaired rule set.

## technique 3: deterministic policy checks, proof explanations, and counterfactuals

When to use: use this pattern for RBAC, compliance, temporal hygiene, threshold checks, and resource audits where exact answers and an audit trail matter.

Encode policy layers as standards, policies, and data. The paper's AWS-flavored model has CIS controls and IAM risks, role inheritance and environment levels, then users and resources; its larger variant has about 200 users, 300 resources, and 3,872 facts (Section 4.1, p. 15). Queries cover single-hop permission, multi-hop deployment, clearance versus classification, stale access over 90 days, excessive permissions over 15, separation-of-duties, and unencrypted production resources (Sections 4.2–4.3, pp. 15–17). For each result, return a derivation tree. For a negative result, ask `why_not`; for a remediation, ask `what_needs`; for design changes, run `what_if` before committing facts.

Verus form (Inference): encode role inheritance and policy predicates as `spec fn`s over immutable maps/sets, and prove lemmas about transitive inheritance, clearance ordering, and violation predicates. A runtime checker can return a certificate struct whose fields are the matched facts and rule identifiers; a Verus proof function can establish that certificate validity implies the policy predicate. Counterfactuals become pure map updates followed by the same spec query. Do not use Prolog's negation-as-failure semantics as if it were a Verus theorem; model an explicit finite universe and absence predicate.

Evidence and limits: the paper's large RBAC benchmark has 1,000 synthetic users, seven roles, 17 base permissions, 20 direct grants, and 1,053 facts; Euclid answers all five questions correctly while each LLM-only condition answers 2/5 (Table 3, p. 23). The paper reports median query latencies under one second for tested queries up to roughly 1,000 facts (Section 5.6, p. 24), but its use-case large KB is about 3,872 facts and its own limitation says scaling beyond roughly 10,000 facts is untested (Section 5.5, p. 24). Inference: the demonstrated design is credible for bounded policy kernels, but a product must measure its own rule count and worst-case proof depth.

## what is proved, measured, and trusted

The paper measures exact query answers, latency, token counts, and benchmark accuracy for the stated synthetic tasks. It demonstrates executable proof trees and deterministic outputs, but it does not provide a mechanized proof of Euclid-IR semantics, sanitizer completeness, SWI-Prolog correctness, or LLM translation fidelity. The trusted base therefore includes the parser, lowering code, SWI-Prolog, the encoded facts/rules, and the benchmark ground truth. Inference: for agent-written verified Rust, the strongest reusable idea is to shrink this base by verifying IR parsing, policy predicates, and certificate checking in Verus, while clearly labeling the LLM and backend adapters as assumptions.

## what VL should reuse and what it should not redo

Inference: VL should reuse the typed-state loop, explicit proof/certificate objects, bounded and sanitized execution, and counterfactual map-update testing. It should not redo a generic LLM-vs-engine RBAC demonstration unless it changes the language, verifier, or threat model; this paper already reports 5/5 versus 2/5 on its five-question large benchmark. The remaining product threat is specification integrity: a verifier can establish implementation correctness while an agent silently omits a requirement or encodes the wrong closed-world assumption.

## techniques for the catalog

- constrained Horn-clause IR — encode facts, rules, queries, conjunction, arithmetic, and bounded negation in a backend-neutral syntax and lower it deterministically
- safe deterministic lowering — map IR constructors to Prolog clauses while sanitizing built-ins, capping input, and enforcing a timeout
- validate–translate–inspect–repair — use typed validation, execution, proof-tree diagnosis, repair, and what-if exploration as a feedback loop
- proof-tree explanations — return bindings together with fact/rule derivations for why and why-not audit questions
- policy counterfactuals — apply explicit additions/removals to a knowledge base and compare deterministic before/after results
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
