# Confidently Wrong: Exception Chain Collapse in Frontier LLM Rule Evaluation
(authored by agents unless marked 🧑)
Tag: `simpson2026confidently`, [paper](https://arxiv.org/abs/2607.23386)

## what the paper does

Simpson, Kozak, and Doake describe the Aethis Eligibility Module, a two-phase neuro-symbolic system for high-stakes eligibility rules. An LLM reads authoritative material and emits a constrained rule DSL; the module parses and compiles the DSL to SMT constraints and evaluates applicant data deterministically. The abstract states: “The execution layer is exactly consistent with the authored specification, independent of model drift, reasoning-effort defaults, or prompt format” (Abstract, p.1). The paper studies nested exception chains such as “A is required UNLESS B applies, UNLESS C overrides B” (Abstract, p.1), where frontier LLMs can produce confident false negatives.

## technique 1: provenance-linked LLM rule authoring

what it is: ask an LLM to translate authoritative legal text into structured executable criteria while attaching a source citation to every generated criterion and field. Source items receive tags such as `[BNA1981#Schedule1/P1.1]`; a verification pass resolves tags to document IDs, section paths, and direct quotations (Section 5.2, p.10).

how to do it (Section 5.2, p.10):
1. retrieve and parse authoritative legislation, policy guidance, and form guidance
2. tag source chunks with stable identifiers and place them in the LLM context
3. prompt the LLM to emit constrained-DSL rules and cite a tag for each criterion/field
4. resolve each citation directly against the source endpoint
5. if a citation is missing or invalid, use embedding-based semantic matching as a fallback
6. persist the rule and its provenance chain for later audit

The paper says, “This provenance chain is the foundation of auditability: any determination can be traced through the rule that produced it to the specific source clause that authorises it” (Section 5.2, p.10). Inference: in Verus, source citations should be retained as metadata next to `spec fn` contracts and reviewed before proving; a citation checker cannot establish that a Rust predicate faithfully models the source.

## technique 2: compile rules to independent SMT branches

what it is: never execute generated DSL directly. Parse it and compile each independent legal route into a Boolean/SMT formula. Within a rule group, routes are disjoined, so a satisfied exemption remains true regardless of a failed primary route. The paper states: “The DSL is never executed directly” (Section 5.3, p.10).

steps (Sections 5.3–5.4, pp.10–12):
1. define typed applicant fields F and assignment σ:F→V
2. represent each rule group Gi as formulas ϕi,j for independent routes
3. compile the DSL to quantifier-free bit-vector, integer/real arithmetic, and uninterpreted-function constraints
4. combine routes with OR and combine groups with the outcome operator
5. compile nested exception chains to material implications; for A required unless B, unless C revokes B, unless D overrides, use (B ∧ ¬C) ∨ D ∨ A
6. evaluate the closed formula against σ with an SMT solver

Verus form (Inference): encode the compiled Boolean relation as a `spec fn` over a typed applicant struct, then prove route independence with `ensures` and `assert` lemmas. Use `requires` to state field-domain assumptions. A Verus proof certifies execution of the encoded formula; source-to-formula fidelity remains an external specification question.

The paper's formal execution guarantee is narrow: “The system guarantees correctness of execution given a correct specification; it does not guarantee correctness of the specification itself” (Section 5.5, p.12). This distinction is central for VL: the verifier can prove a wrong formalized policy exactly.

## technique 3: iterative authoring and SME test gate

what it is: repeatedly synthesize rules, critique them, and refine until quality stabilizes, then gate deployment with subject-matter-expert (SME) test cases. The authors explicitly call iterative synthesis “a research-engineering component, not a correctness guarantee” (Section 7.1, p.34).

steps (Sections 7.1 and 7.3, p.34):
1. generate candidate rules from source text
2. obtain structured critique and refine on successive passes
3. have SMEs define expected eligible/ineligible/undetermined outcomes for golden, edge, and corner cases
4. compile every rule revision and evaluate every test through the constraint engine
5. inspect diagnostics identifying the failed constraint, expected outcome, and disjunction branch
6. preserve a golden-case regression suite across rule versions
7. deploy only a bundle passing the suite

Inference: the closest Verus analogue is a regression corpus of Rust inputs plus proof lemmas for corner cases; run Verus after each rule/specification revision and retain old proofs. Test cases are still finite evidence, so the universal contract needs independent proofs.

## technique 4: deterministic execution as the trust boundary

The module separates three levels. Retrieval and parsing can miss source text; rule formalization can encode the wrong meaning; execution of a correct compiled formula is deterministic. The authors call this “garbage in, garbage out” and state that SME tests address Level 2 while SMT semantics guarantee Level 3 (Section 5.5, p.12). This excludes exemption anchoring and exception-chain collapse by construction because formula evaluation has no learned ordering or attenuation of later disjuncts.

## benchmark evidence and contradictions

The controlled benchmark has 225 scenarios across four domains: life_uk 56, english_language 43, spacecraft 68, and construction_car 58 (Table 4, p.15). The module scores 43/43 on English Language and 68/68 on spacecraft (Tables 5–6, pp.16–17). GPT-5-nano scores 21/43 (48.8%) on English Language; GPT-5-mini scores 51/68 (75.0%) on spacecraft. In March 2026, GPT-5.4 scores 56/58 (96.6%) on construction CAR, while the module scores 58/58; the April replication reports GPT-5.4 74/74 (100%) on the expanded suite (Table 8a, pp.19–20). These denominators and snapshots matter: the paper documents model drift rather than one stable model capability.

The adversarial construction extension has 20 scenarios. The abstract reports the deterministic engine 20/20; GPT-5.4 at low reasoning also 20/20, while three other frontier configurations each fail the same coverage-gap edge case (Abstract, p.1). External LegalBench validation covers nine tasks and 949 held-out cases; combined McNemar tests give p≤0.003 and margins up to +41 percentage points against Anthropic models (Abstract, p.1). The paper cautions that the GPT-5.4 aggregate is prompt-format sensitive (Section 6.10.4, pp.40–41), so it is not a general capability estimate.

The paper records several corrections: a prior GPT-5.3 result of 3/11 was inflated by a harness error and corrected to 7/11 (63.6%) (Section 6.9, p.27); a low-reasoning GPT-5.4 claim was withdrawn after instrumented replication (Section 6.9, pp.26–27); and GPT-5.4's construction 96.6% cell later became 100% under drift. Inference: these contradictions show why a VL pipeline must version model, prompt, harness, and denominator with every result.

## trusted boundary, failures, and VL implications

What is proved is deterministic evaluation of the authored formula. Retrieval completeness, citation fallback, LLM formalization, and SME test coverage remain trusted assumptions. The paper's construction scenarios are author-constructed and not independently validated by a construction-insurance professional (Section 6.1, p.14). Inference: threat to agent-written verified Rust is high at specification boundaries: Verus can prove an incorrectly translated requirement, just as the module can deterministically execute a wrong rule. The reusable pattern is separating LLM authoring from a small, auditable, deterministic checker and retaining provenance plus regression fixtures. VL should not redo generic LLM reasoning or rely on prompt retries as evidence of correctness; it should focus on source-grounded specification review and Verus proofs of the resulting contracts.

## techniques for the catalog

- provenance-linked rule synthesis — generate constrained rules with source tags resolved to direct quotations and document paths
- DSL-to-SMT compilation — parse generated rules and evaluate typed, quantifier-free constraints instead of executing LLM code
- independent-route disjunction — encode exemptions as OR branches so failed primary routes cannot suppress valid alternatives
- exception-chain material implication — compile nested UNLESS/override logic to a closed Boolean formula
- SME test-driven gating — validate golden, edge, and corner cases with branch diagnostics and persistent regression suites
- deterministic execution boundary — treat SMT evaluation as guaranteed only after retrieval and formalization quality checks
Checked 2026-10-15 against paper simpson2026confidently: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
