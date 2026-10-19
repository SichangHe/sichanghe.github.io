# LLMs Can’t Plan, But Can Help Planning in LLM-Modulo Frameworks
(authored by agents unless marked 🧑)
Tag: `kambhampati2024llmmodulo`, [paper](https://arxiv.org/abs/2402.01817v3)

## what the paper proves or measures

This position paper argues that autoregressive LLMs cannot plan or self-verify by themselves, but can propose candidates, translate formats, refine specifications, and help acquire models. Its abstract describes “a vision of LLM-Modulo Frameworks that combines the strengths of LLMs with external model-based verifiers in a tighter bi-directional interaction regime.” (Abstract, p.1). It reviews earlier experiments and proposes an architecture. Inference: these results do not establish a general impossibility theorem; applying this architecture to Verus requires adapting its planning roles to code and proof generation.

Table 1 reports PlanBench results with natural-language prompts. Its “Instances correct” entries for GPT-4o in Blocksworld are one-shot “170/600” and “(28.33%)”, and zero-shot “213/600” and “(35.5%)”; in deceptive Mystery BW they are one-shot “5/600” and “(0.83%)”, and zero-shot “0/600” and “(0%)” (Table 1, p.3). Most cells use 600 instances; Gemini Pro’s Mystery BW cells use 500. Separately, reviewing earlier work, the authors report: “On average, only about 12% of the plans that the best LLM (GPT-4) generates are actually executable without errors and goal-reaching.” (Section 2.1, p.2). Inference: neither result estimates failure rates for code or proof tasks.

## technique 1: generate–test–critique with hard and soft critics

what it is: have an LLM generate a candidate, run a bank of critics, feed their feedback back to the LLM, and return a candidate only after every hard correctness critic signs off. Hard critics check causal, timeline, resource, and unit-test constraints; soft critics assess style, preferences, or explainability.

when to use: Inference: use this when candidate generation is flexible and an external checker can assess correctness. A compiler or test suite checks only its particular properties; a proof checker checks encoded obligations. LLMs may assist with models or critic implementation, but their output needs validation before it supports a correctness guarantee.

how to do it:
1. let end users refine an incomplete problem specification with LLM assistance, then ask the LLM for a candidate
2. translate the candidate into each critic’s formal representation
3. run hard model-based critics and optional soft critics
4. collect failures and constructive alternatives
5. have a meta-controller turn feedback into the next prompt
6. repeat until all hard critics pass; then return the candidate to the user or executor

The paper states: “If at least all the hard critics sign off on the current candidate, then that is considered a valid solution to be returned to the end-user or the executor.” (Section 3.1, p.6). It also says critics may range from “No, try again” to detailed lists of everything wrong and may offer plan/subplan alternatives (Section 3.1, p.6).

Inference: for Verus, let an LLM propose Rust, contracts, and proof lemmas; run Verus as the hard critic and use compiler/tests as additional critics. Feed diagnostics into the next generation round. A soft LLM review can flag unclear specifications but cannot certify them. The soundness guarantee is conditional on Verus, the Rust compiler, and the specification model, just as the paper’s guarantee is conditional on its critic model.

evidence and limits: with VAL as external verifier, the paper reports that “LLM performance in Blocks World improves to 82% within 15 back prompting rounds, while in Logistics, it improves to 70%.” For Mystery BW it reports “about 10% accuracy” and says a returned plan “is thus guaranteed correct by its model.” (Section 4, p.8). Completeness depends on candidate generation (Section 3, p.6), so the framework does not guarantee finding a solution.

## technique 2: backprompt meta-controller

what it is: pool feedback from heterogeneous critics and compile it into the next prompt. The controller can select prompts round-robin, summarize them, or diversify prompts to explore different parts of the candidate space.

how to do it:
1. collect each hard and soft critic’s result for the current candidate
2. normalize conflicting or differently formatted feedback
3. choose round-robin, summarized, or diversified prompting
4. ask the LLM for a revised candidate
5. repeat the critic loop

The paper says: “The critiques from the various critics are pooled together by the Meta (Backprompt) Controller, which passes a processed version of them to the LLM as the next iterative prompt to elicit the next guess.” (Section 3.2, p.7). It explicitly warns that diversification may require domain-specific knowledge (Section 3.2, p.7).

Inference: for Verus, collect diagnostics, failing postconditions, compiler errors, and test failures; summarize them into a bounded repair prompt. Keep each diagnostic tied to the exact source revision. Prompt diversification can try alternate lemma or invariant hypotheses, but each candidate must be rechecked by Verus.

evidence and limits: Section 3.2 proposes controller choices without reporting a comparison of their effects.

## technique 3: LLM-assisted model and specification acquisition

what it is: use LLMs to suggest domain actions, preconditions, effects, constraints, and candidate critics; humans curate the model once per domain and refine incomplete problem specifications once per problem. The resulting formal model drives the hard verifier.

how to do it:
1. ask the LLM for domain actions, their preconditions, and their effects
2. have domain experts inspect and sign off on actions, preconditions, and effects
3. encode the accepted model for a hard critic or simulator
4. let end users refine underspecified goals and preferences with LLM assistance
5. run the generate–test loop against the curated model

The paper gives the concrete pattern: “The idea here is that the traditional domain model acquisition task (e.g. (Simpson et al., 2001)) is significantly made easier by having the LLMs help with ideas regarding various pieces of the domain model (e.g., actions, their preconditions and effects) and letting humans sign off/critique the resulting model.” (Section 3.3, p.7). It says humans are needed for “once per domain” and “once per problem” interactions, while automated verifiers manage the inner loop (Section 3.3, p.7).

Inference: for Verus, use the LLM to draft `requires`, `ensures`, data invariants, and abstract-state transitions, then require a human or specification review to confirm that they state the product requirement. Verus proofs establish the drafted contract, so contract review must precede proof acceptance. The model-acquisition workflow does not remove trusted assumptions about external libraries or hardware.

evidence and limits: model acquisition is an architectural role here, supported by cited work rather than an isolated quantitative experiment in this paper. In the travel case study, the authors report “6x of baselines” with a limit of 10 backprompting cycles and state: “One interesting observation about this domain is that we were able to use the LLM itself to enumerate the type of critics needed to validate the plan (with light human supervision).” (Section 4, p.8).

## technique 4: LLM reformulation and syntax-checked translation

what it is: translate a natural-language candidate into the specialized representation required by each symbolic critic, optionally placing a nested LLM-Modulo loop around the translation and syntax critics.

how to do it:
1. identify the specialized representation required by each critic
2. use a reformulator attached to that critic to translate the candidate
3. optionally use a nested LLM-Modulo loop to check the conversion’s syntax and request corrections
4. submit the translated candidate to the critic

The paper calls this the reformulator module and says: “These reformulator modules can be supported to a large extent by LLMs, given that one thing LLMs are very good at is format change across different syntactic representations.” (Section 3.1, p.7). It cautions that syntax conversion alone is a “severely limited role” (Section 3.1, p.7).

Inference: for Verus, ask an LLM to convert a natural-language requirement into Rust/Verus syntax, then run parsing, type checking, and verification. Preserve the original requirement for comparison with the encoded contract. Retain the accepted translation and model version to make later checks reproducible. This translation is not a proof; Verus checks the encoded obligations.

evidence and limits: in the travel study, the authors write: “Finally, LLMs reliably play the role of reformatter as well, converting free form travel plans into structured plans parseable by the critics for backprompts or plan evaluation.” (Section 4, p.8). No separate translation accuracy denominator is given. Inference: a valid parse can still encode the wrong requirement, so syntax critics cannot establish semantic adequacy.

## techniques for the catalog

- hard-critic generate–test loop — generate candidates, run sound model-based critics, and iterate until every correctness critic passes
- backprompt meta-controller — pool heterogeneous diagnostics and choose summarized or diversified prompts for the next candidate
- model/specification acquisition — use LLM suggestions with human curation to build the formal model and complete requirements
- syntax-checked reformulation — translate candidates into verifier representations and validate syntax before semantic checking
