# From Verification Failures to Reusable Guidance for Coding Agents
(authored by agents unless marked 🧑)
Tag: `zhai2026verification`, [paper](https://arxiv.org/abs/2609.39022v3)

Audit: audited 2026-10-13 against the paper; checked numbers against Tables 1 to 3, quotations, pages, technique steps and Verus forms; corrected page references, an invented first step and failure categories in technique 2, the audit inputs in technique 3, a three-claims framing the paper does not state, the missing model and attempt count of the historical comparison, and unmarked inference.

## central method and evidence

Zhai et al. separate formalization (choosing the semantics and predicates), verification (establishing the implication under the declared assumptions), and validation (assessing whether those definitions capture the intended behavior) (§2.1, p.2). Their target is partial functional correctness, written as an implication from initial predicate, terminating execution, and final predicate (§2.1, p.2). The paper warns: “When an agent produces its own specification, proof success is useful only in combination with evidence about that specification.” (§2.1, p.2). The practical contribution is a versioned kit of executable semantics, proof procedures, applicability conditions, examples, and audits, with failure diagnoses converted into reusable procedures.

The HumanEval campaign contains 164 Python tasks. At a common historical Stage 2 endpoint, supplied semantics plus the kit has 97 PASS, 67 CONCERNS, and 0 FAIL (164/164 legitimate when PASS and CONCERNS are combined), whereas the agent-authored/no-kit arm has 23 PASS, 41 CONCERNS, and 100 FAIL (Table 1, p.4). These arms evolved resources and are not a controlled ablation. The revised artifact set has 164/164 final AI-audit PASS verdicts after two targeted repairs; that endpoint is separate from the historical arm comparison (§4, p.4).

A 12-pair audit challenge tests defects that successful proofs miss. All 24 K claims prove; completed audits detect 12/12 seeded defects and accept 12/12 clean packages, each with a 95% Wilson interval of 75.8–100% (§4, p.5). Inference: the defects are seeded and the pairs author-reviewed and scoped, so this is audit evidence, not a general defect-detection rate.

## technique 1: retain executable semantics and separate proof from adequacy

When to use it: use this architecture when an agent writes both a formal specification and proof. It prevents a checker from silently becoming the definition of intended behavior.

Steps from §2 (pp.2–3):

1. Define a program P, operational semantics S, initial predicate φ, and final predicate ψ. State the exact terminating-execution implication to be proved (§2.1).
2. Implement S as executable K configuration cells and rewrite rules. A reachability claim starts from a symbolic initial configuration and targets a final configuration (§2.2).
3. Use K's symbolic execution and constraints to reason about loops; use the same semantics for concrete tests (§2.2).
4. Keep source program, translation, specification, proof extensions, tests, and independent audit evidence as separate artifacts (§2.1).
5. Validate input coverage, semantic correspondence, and whether proof extensions justify the claim. Return a failure to the responsible stage (§3.2).

The paper's loop example starts with `n=N≥0`, `s=0`, repeatedly adds n to s and decrements n, and uses a summary `S + M(M+1)/2`. After one step the arithmetic obligation is `(S+M) + (M−1)M/2 = S + M(M+1)/2` (§2.2, p.3). K handles the transition; Z3 or Lean handles the domain lemma. The paper says: “Keeping these obligations separate makes a failed proof easier to diagnose.” (§2.2, p.3).

Verus form: Inference: model the Rust execution with executable code and write `requires`/`ensures` for the initial and final predicates. Keep mathematical lemmas in Verus proof functions and keep tests independent of the proof. Inference: treat the linked Rust implementation, Verus translation, solver, erasure, dependencies, and environment as trust-boundary artifacts; a passing proof does not validate the requirement.

## technique 2: convert a diagnosed failure into a procedure

When to use it: use this for recurring proof failures or semantic mismatches so later agents receive actionable guidance rather than generic encouragement.

Procedure:

1. Inspect the failure and diagnose its cause (§3.1, p.3).
2. Write a procedure with applicability conditions (§3.1).
3. Attach a checking example and preserve the failed claim, repaired claim, and evidence in versioned resources (§3.1).
4. If a semantic discrepancy is found, revise the executable rule and add conformance tests. If a recurring proof failure is found, write a proof procedure (§3.1).
5. Classify proof extensions as mathematical definitions, derived lemmas, operational bridges, or trusted primitives. A bridge requires a machine-checked connection theorem over its full matched state and control context (§3.1).

The `below_zero` example directs an agent to compare residual computation, variable bindings, framed state, and proposed invariant; a proof-only replacement loop creates a separate equivalence obligation (§3.1, p.3). The `split_words` repair changed a predicate recognizing four of CPython's 29 whitespace code points to one covering all 29, pinned CPython and Unicode versions, and checked every code point plus boundaries and affected consumers (§3.1, p.3). The paper says the example records the instruction's provenance and checking procedure, and that its effect on later tasks is unmeasured (§3.1, p.4).

Verus form: Inference: store each repaired Verus lemma or invariant with the failing proof obligation, applicability, a minimal Rust example, and a replay command. Treat an “operational bridge” as a lemma relating the abstraction to the actual Rust state; never replace execution with an unchecked `assume`.

## technique 3: audit specification adequacy after proof replay

When to use it: use an independent audit when a proof only establishes the encoded claim and the agent also chose the claim.

Audit steps:

1. Give the Stage 2 auditor the canonical implementation as behavioral evidence; the packages retain implementations, claims, source lemmas where present, and final audits (§4, pp.4–5).
2. Check that the specification covers required inputs and behavior, rather than restricting to an easy domain (§2.1).
3. Check that each proof extension is justified and that bridges have correspondence theorems (§3.1–3.2).
4. Use negative controls, such as a rejected false postcondition, and inspect assumptions that checker evidence can reproduce (§3.1–3.2).
5. Record PASS, CONCERNS, or FAIL (Table 1); the steps list is assembled from §2.1, §3.1, §3.2 and §4 and is not one procedure the paper numbers.

In the 12-pair challenge, every proof passed, but the audit still found the seeded defects. One defect used a local rule to bypass an incorrect body and fabricate its specified result (§4, p.5). This demonstrates why proof replay and adequacy audit are distinct evidence.

Verus form: Inference: run a fresh reviewer over Rust source, Verus contracts, proof functions, and tests; require a domain-coverage check and inspect any `assume`, `external_body`, or trusted external contract. Mark audit findings separately from solver success.

## technique 4: evaluate guidance under changed semantics with coverage checks

KleverBench contains 31 programs under ordinary, renamed, and swapped semantics, 93 program–semantics configurations (§5.1, p.5). Acceptance requires a claim containing the supplied program, the prescribed final-state form, no forbidden proof rules, coverage of required inputs, and a successful K proof (§5.1).

The frozen comparison gives each swapped-semantics program one attempt with complete rules, generic advice, or the fixed kit of scope, invariant-derivation, circularity, residual, and non-vacuity procedures (§5.2, p.5). With GPT-5.6 Luna, acceptance is 15/31 rules, 15/31 generic, and 19/31 kit; with DeepSeek-V4.1-Flash it is 17/31, 18/31, and 16/31 (Table 2, p.6). Every paired 95% bootstrap interval includes zero (Table 2). Inference: the study does not establish a universal kit advantage.

The larger historical comparison (GPT-5.6 Luna, four attempts per configuration) has 372 attempts per arm. Bare accepts 270/372 = 72.6%; kit accepts 312/372 = 83.9%. Solved within four attempts is 84/93 = 90.3% bare and 91/93 = 97.8% kit (Table 3, p.6). Under swapped semantics, acceptance rises from 73/124 to 92/124; the paper notes that coverage checks reject claims that exclude required inputs even when those restricted claims prove (§5.3, p.7). It also says load and instruction compliance could explain part of the gain (§5.3, p.7).

Verus form: Inference: test guidance on renamed and behavior-swapped Rust APIs or libraries, while keeping input-domain checks independent of the verifier. Report all attempts and solved-within-budget denominators; do not infer causal improvement from uncontrolled historical comparisons.

## what stays trusted and threat to VL

Inference: the trusted elements include K rewrite rules, source-to-semantics translation, solver integration, Lean kernel and permitted axioms, the supplied mathematical vocabulary, and human review of selected repairs. The paper explicitly says that “The mathematical vocabulary supplied by the benchmark is trusted for this experiment.” (§5.1, p.5). HumanEval and KleverBench use different scopes, budgets, models, and evolving artifacts; the authors caution that frozen kit comparisons have wide intervals and mixed outcomes.

Inference: the threat to a product that asks agents to write verified Rust is high when agents can choose specifications or abstraction bridges. A proof can pass while the contract omits required behavior, the input domain is narrowed, or a helper rule fabricates results. VL should retain executable semantics where feasible, require coverage and adequacy audits, version repair guidance with applicability and evidence, and report proof and audit results separately.

## techniques for the catalog

- executable semantics boundary — define and test operational rules separately from specifications and proofs
- failure-to-procedure curation — turn diagnosed failures into versioned guidance with applicability, examples, and replay evidence
- post-proof adequacy audit — inspect intent coverage, assumptions, bridges, and negative controls after all formal claims prove
- changed-semantics evaluation — test guidance under renamed and swapped operators with independent input-coverage checks
