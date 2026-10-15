# LLMs Can’t Plan, But Can Help Planning in LLM-Modulo Frameworks
(authored by agents unless marked 🧑)
Tag: `kambhampati2024llmmodulo`, [paper](https://www.semanticscholar.org/paper/b156004675ad3aa5e39a56928afc530aec191044)

## what the paper proves or measures

This position paper argues that autoregressive LLMs cannot reliably plan or self-verify in autonomous mode, but can propose candidates, translate formats, refine specifications, and help acquire models when an external verifier checks the result. Its abstract describes “a vision of LLM-Modulo Frameworks that combines the strengths of LLMs with external model-based verifiers in a tighter bi-directional interaction regime.” (Abstract, p.1). The claim is about planning experiments and architecture; applying it to Verus is an inference.

The paper’s evidence includes a PlanBench-style table with 600 instances per domain/model cell. In Blocksworld, GPT-4o one-shot gets 170/600 (28.33%) and zero-shot 213/600 (35.5%); in deceptive Mystery Blocksworld, GPT-4o gets 5/600 (0.83%) one-shot and 0/600 zero-shot (Table 1, p.2). The authors report that only “about 12% of the plans that the best LLM (GPT-4) generates are actually executable without errors and goal-reaching” on their broader benchmark (Section 2.1, p.2). These denominators and domains matter: the numbers are not a general failure rate for all code or proof tasks.

## technique 1: generate–test–critique with hard and soft critics

what it is: have an LLM generate a candidate, run a bank of critics, feed their feedback back to the LLM, and return a candidate only after every hard correctness critic signs off. Hard critics check causal, timeline, resource, and unit-test constraints; soft critics assess style, preferences, or explainability.

when to use: use this when candidate generation is flexible but correctness can be operationalized by a simulator, model checker, compiler, test suite, or theorem prover. Keep hard critics independent and sound relative to their model; use LLMs only as soft critics or as generators of suggestions.

how to do it:
1. give the incomplete problem specification to the LLM and ask for a candidate
2. translate the candidate into each critic’s formal representation
3. run hard model-based critics and optional soft critics
4. collect failures and constructive alternatives
5. have a meta-controller turn feedback into the next prompt
6. repeat until all hard critics pass; then return the candidate to the user or executor

The paper states: “If at least all the hard critics sign off on the current candidate, then that is considered a valid solution to be returned to the end-user or the executor.” (Section 3.1, p.6). It also says critics may range from “No, try again” to detailed lists of everything wrong and may offer plan/subplan alternatives (Section 3.1, p.6).

Verus form (Inference): let an LLM propose Rust, contracts, and proof lemmas; run Verus as the hard critic and use compiler/tests as additional critics. Feed diagnostics into the next generation round. A soft LLM review can flag unclear specifications but cannot certify them. The soundness guarantee is conditional on Verus, the Rust compiler, and the specification model, just as the paper’s guarantee is conditional on its critic model.

evidence and limits: with VAL as external verifier, the paper reports Blocksworld performance improving to 82% within 15 backprompting rounds and Logistics to 70%; obfuscated Mystery Blocksworld reaches about 10% (Section 4, p.8). A plan that passes VAL is guaranteed correct only relative to VAL’s model. Completeness depends on the LLM generating all relevant candidates (Section 3.1, p.6), so hard critics do not guarantee finding a solution.

## technique 2: backprompt meta-controller

what it is: pool feedback from heterogeneous critics and compile it into the next prompt. The controller can select prompts round-robin, summarize them, or diversify prompts to explore different parts of the candidate space.

how to do it:
1. collect each hard and soft critic’s result for the current candidate
2. normalize conflicting or differently formatted feedback
3. choose round-robin, summarized, or diversified prompting
4. ask the LLM for a revised candidate
5. repeat the critic loop and retain the feedback trace

The paper says: “The critiques from the various critics are pooled together by the Meta (Backprompt) Controller, which passes a processed version of them to the LLM as the next iterative prompt to elicit the next guess.” (Section 3.2, p.7). It explicitly warns that diversification may require domain-specific knowledge (Section 3.2, p.7).

Verus form (Inference): collect Verus diagnostics, failing postconditions, compiler errors, and test failures; summarize them into a bounded repair prompt. Keep each diagnostic tied to the exact source revision. Prompt diversification can try alternate lemma or invariant hypotheses, but each candidate must be rechecked by Verus.

evidence and limits: the reported 82% and 70% rates use up to 15 rounds and the cited planning benchmark; they do not isolate the controller’s policy from the verifier or the base model. A summary can omit a critical error, so the controller is untrusted search logic. Inference: VL should preserve raw diagnostics alongside summaries to avoid losing proof obligations.

## technique 3: LLM-assisted model and specification acquisition

what it is: use LLMs to suggest domain actions, preconditions, effects, constraints, and candidate critics; humans curate the model once per domain and refine incomplete problem specifications once per problem. The resulting formal model drives the hard verifier.

how to do it:
1. ask the LLM to enumerate domain entities and possible transition rules
2. have domain experts inspect and sign off on actions, preconditions, and effects
3. encode the accepted model for a hard critic or simulator
4. let end users refine underspecified goals and preferences with LLM assistance
5. run the generate–test loop against the curated model

The paper gives the concrete pattern: “the traditional domain model acquisition task … is significantly made easier by having the LLMs help with ideas regarding various pieces of the domain model … and letting humans sign off/critique the resulting model.” (Section 3.3, p.7). It says humans are needed for “once per domain” and “once per problem” interactions, while automated verifiers manage the inner loop (Section 3.3, p.7).

Verus form (Inference): use the LLM to draft `requires`, `ensures`, data invariants, and abstract-state transitions, then require a human or specification review to confirm that they state the product requirement. Verus proofs establish the drafted contract, so contract review must precede proof acceptance. The model-acquisition workflow does not remove trusted assumptions about external libraries or hardware.

evidence and limits: this is an architectural proposal, not an isolated quantitative experiment. The paper’s travel benchmark used hard budget critics and common-sense attraction critics and found “6x of baselines” with at most 10 backprompting cycles (Section 4, p.8), but the excerpt gives no denominator or baseline values for that multiplier. It reports that an LLM itself enumerated needed critics with light human supervision (Section 4, p.8). Inference: in VL, a human-approved specification is still a principal trusted input.

## technique 4: LLM reformulation and syntax-checked translation

what it is: translate a natural-language candidate into the specialized representation required by each symbolic critic, optionally placing a nested LLM-Modulo loop around the translation and syntax critics.

how to do it:
1. define each critic’s input grammar (PDDL, timeline, causal links, or a Verus/Rust file)
2. ask the LLM to convert the candidate into that grammar
3. run syntax critics before semantic critics
4. if syntax fails, backprompt only the reformulator; if semantics fails, backprompt the candidate generator
5. retain the accepted translation with the candidate and model version

The paper calls this the reformulator module and says: “These reformulator modules can be supported to a large extent by LLMs, given that one thing LLMs are very good at is format change across different syntactic representations.” (Section 3.1, p.7). It cautions that syntax conversion alone is a “severely limited role” (Section 3.1, p.7).

Verus form (Inference): ask an LLM to convert a natural-language requirement into Rust/Verus syntax, then run parsing, type checking, and Verus verification as separate critics. Preserve the original requirement so a syntactically valid contract cannot silently change meaning. This translation is not a proof; only Verus establishes the encoded obligations.

evidence and limits: in the travel study, the authors report reliable reformatting into structured plans parseable by critics (Section 4, p.8), but no separate translation accuracy denominator is given. A valid parse can still encode the wrong requirement, so syntax critics cannot establish semantic adequacy.

## paper evidence, trust assumptions, and VL relevance

The paper’s formal guarantees are conditional: a returned plan is sound relative to all hard critics and their models, while completeness depends on candidate generation. LLM guesses, summaries, reformulations, soft critics, and model-acquisition suggestions are untrusted. Inference: for agent-written verified Rust, Verus is the hard critic and the trusted boundary for the encoded specification; requirements, model abstraction, external APIs, and the compiler remain outside the paper’s guarantee. The paper’s autonomous-mode failures support avoiding LLM self-verification, while its backprompt results support repeated verifier-guided repair. VL should reuse bidirectional diagnostic loops and hard/soft critic separation; it should not treat an LLM’s self-critique or a passing syntax check as a proof.

## techniques for the catalog

- hard-critic generate–test loop — generate candidates, run sound model-based critics, and iterate until every correctness critic passes
- backprompt meta-controller — pool heterogeneous diagnostics and choose summarized or diversified prompts for the next candidate
- model/specification acquisition — use LLM suggestions with human curation to build the formal model and complete requirements
- syntax-checked reformulation — translate candidates into verifier representations and validate syntax before semantic checking

Checked 2026-10-15 against the paper by a Codex agent for llms_can_t_plan_but_can_help_planning_in_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
