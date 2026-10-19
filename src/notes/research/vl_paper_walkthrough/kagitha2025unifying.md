# Unifying Inference-Time Planning Language Generation
(authored by agents unless marked 🧑)
Tag: `kagitha2025unifying`, [paper](https://arxiv.org/abs/2505.14763)

## what the paper does

The paper studies LLMs that produce a formal planning representation, which a symbolic planner then solves. Its central claim is that intermediate representations (IRs) and revision make this pipeline more reliable than asking an LLM to emit a plan directly. The paper states: “A line of work in planning uses LLM not to generate a plan, but to generate a formal representation in some planning language, which can be input into a symbolic solver to deterministically find a plan.” (abstract, p. 1). The abstract says it evaluates “more than a dozen pipelines”; section 5.1 specifies “4 LLMs and 12 pipelines” for Figure 2. The four domains are BlocksWorld, Logistics, CoinCollector, and Sokoban (section 4, p. 4).

The input is a textual domain description, a textual problem description, and a ground-truth action header. The output is a sequence of grounded actions. A valid sequence must be executable from the initial state and reach the goal under the ground-truth PDDL. The domain file has types, predicates, and action parameters, preconditions, and effects; the problem file has objects, the initial state, and a goal formula (section 2, pp. 2–3). Inference: This separates model generation from symbolic checking. The planner searches the generated PDDL; VAL checks the resulting plan against the ground-truth PDDL (section 4, p. 4). Acceptance by the planner alone does not establish fidelity to the intended task.

## technique: formalize, then solve

what it is

The Level 1 recipe maps input directly to PDDL and sends the result to a symbolic solver: `I → PDDL ; L`. Level 0 instead maps `I → L` and is the LLM-as-planner baseline. The paper’s Figure 1 shows a BlocksWorld description converted into a domain file and problem file, then solved into actions such as `unstack(red, blue)` and `stack(blue, red)` (section 2, p. 2).

when to use it

Inference: Use this when the target behavior can be expressed as typed predicates and action preconditions/effects, and a mature solver can search the resulting state space. The paper says, “We use the dual-bfws-ffparser planner (Muise, 2016) to solve for the plan and VAL (Howey et al., 2004) to validate the plan against the ground-truth PDDL.” (section 4, p. 4).

how to do it

1. Extract entity types, predicates, actions, and action semantics from the domain description (section 2, p. 2).
2. Write a PDDL domain with typed parameters, conjunctive preconditions, and add/delete effects (section 2, pp. 2–3).
3. Write a PDDL problem with named objects, initial relational facts, and a Boolean goal formula (section 2, p. 2).
4. Invoke the symbolic planner on the generated files (section 4, p. 4).
5. Validate the returned plan against ground-truth PDDL; plan accuracy requires both a found plan and a correct validation result (section 4, p. 4).

The paper defines the metric precisely: “Syntactic accuracy is the percentage where no syntax error are returned by the planning solver.Plan accuracy is the percentage where a plan is not only found by the solver but also correct based on validation.” (section 4, p. 4). The missing space after “solver.” is present in the extracted text.

Verus form

Inference: The analogous Verus workflow is to have the model emit Rust plus `requires` and `ensures`, then run Verus to prove the specification. A verified Rust function can represent an action; predicates become state fields or pure/specification functions; preconditions become `requires`; postconditions become `ensures`. The planner’s search over action sequences does not carry over: Verus proves a supplied function’s contracts rather than finding a plan. A separate trusted search procedure would need to construct and execute a sequence of verified calls.

what evidence shows it works

The evaluation has four environments, each with 100 tuples of domain description, problem description, ground-truth domain, and problem files (section 4, p. 4). It tests four open-source models—QwQ-32B, Qwen3-32B, gpt-oss-120b, and GLM-4.5-Air-FP8—at temperature 0.4, with one H100 GPU, and reports the mean of three runs with standard-deviation error bars (section 4, p. 5). The best Level 3 pipeline has the highest plan accuracy in 6 of 8 model-domain combinations shown for BlocksWorld and Logistics (section 5.1, p. 5). This is 6/8 combinations, not 6/8 individual examples. The paper does not give one aggregate numerator and denominator for all 400 instances in the prose.

what fails or is assumed

The input includes an action header so that “the eventual plan is grounded to an existing ontology and can be evaluated fairly” (section 2, p. 2). Inference: The solver, validator, and ground-truth PDDL must be trusted for the reported validation to be meaningful. Direct generation can produce semantically wrong but syntactically valid PDDL. Grammar constraints address syntax but not semantics. The paper explicitly says constrained decoding “may degrade semantics” (section 3, p. 4). Inference: A Verus proof similarly does not establish that the specification captures the intended behavior; the specification and any external model remain trusted assumptions.

## technique: syntax-aligned intermediate representations

what it is

The paper inserts an IR between the natural-language input and PDDL. Its framework defines Level 2 as `I → IR → PDDL ; L` and Level 3 as `I → IR → IR → PDDL ; L` (section 3, p. 3). It evaluates four IR types: natural language, a Python simulator (PySim), PyPDDL (a Python wrapper with a fixed PDDL-oriented structure), and PDDL for revision (section 5.2, p. 7). PyPDDL is transpiled to PDDL either deterministically with Py2PDDL or by an LLM (Table 1, p. 5).

when to use it

Inference: Use a syntax-aligned IR when direct low-resource formal-language generation is difficult but the model is stronger at a high-resource language. The paper’s rationale is that PDDL is low-resource and rigid, whereas a Python wrapper can preserve structural similarity while using ordinary programming-language generation (section 3, p. 3).

how to do it

1. Prompt the model to describe the domain and problem in the chosen IR (section 3, p. 3).
2. For PySim, require executable Python that simulates the domain and returns a plan (section 3, p. 3).
3. For PyPDDL, provide the wrapper documentation and a domain-agnostic example in the prompt (section 3, p. 3).
4. Transpile PyPDDL to PDDL either with Py2PDDL or an LLM; use an LLM for the other IR conversions (section 3, pp. 3–4; Table 1, p. 5).
5. Solve and validate the resulting PDDL as above (section 4, p. 4).

The evaluated table includes Level 2 `PyPDDL → PDDL`, `PySim → PDDL`, `NL → PDDL`, a one-revision `PDDL → PDDL`, and multi-stage pipelines such as `NL → PyPDDL → PDDL` (Table 1, p. 5).

Verus form

Inference: A Verus-oriented IR could be a typed Rust skeleton containing state structs, action functions, and contract placeholders, followed by a second generation pass that fills proofs. The transpiler would be a deterministic Rust-to-Verus template step, not an LLM claim about Verus syntax. Inference: The IR should preserve names and types so that generated `requires`, `ensures`, `assert`, and `proof` blocks refer to declarations that actually exist. Python execution cannot substitute for Verus proof checking.

what evidence shows it works

The paper reports that a Level 2 pipeline with one additional IR outperforms the LLM-as-planner and Level 1 pipelines in all 8 of 8 model-domain cases discussed (section 5.1, p. 7). Its strongest result is not that every IR helps: natural language as an IR hurts performance (the paper says “hurts performance”) in the paper’s comparison, while PyPDDL and PDDL revision are more effective (section 5.2, pp. 7–8). Deterministic Py2PDDL transpilation is a negative result: for QwQ-32B on BlocksWorld, its reported accuracy is 16% versus 68% for LLM-based transpilation (section 5.2, p. 8). These are reported accuracies for QwQ-32B on BlocksWorld, whose dataset has 100 instances; section 4 specifies three-run means. The prose does not give raw success counts for this comparison.

what fails or is assumed

The IR must retain the semantics of the original domain. The paper’s qualitative example shows errors such as a missing `clear` predicate and an object lookup that should have been `b["b2"]` (Figure 3, p. 7). Deterministic transpilation can fail when generated Python uses an unexpected representation: the paper says generated PyPDDL “tends to not follow non-trivial way of representing different PDDL components” (section 5.2, p. 8). Inference: For Verus, an IR that changes a map, ownership pattern, or state representation can make proof obligations harder even when the Rust compiles.

## technique: solver-feedback revision

what it is

A revision module asks the LLM to regenerate PDDL after seeing the planner’s validity result and syntax-error messages. The notation is `PDDL →FB PDDL`; the paper also tests revision without solver feedback (section 3, p. 4). For IR revision, the paper instead relies on the LLM without solver feedback: “not all IRs can work with a formal solver” (section 3, p. 4).

when to use it

Inference: Use feedback when a generated formal object is close enough that an error report identifies a repair. The paper’s best pipelines frequently contain PyPDDL revision or PDDL revision with feedback (section 5.1, p. 5).

how to do it

1. Generate an initial PDDL domain and problem (section 3, p. 4).
2. Invoke the planner and collect validity and syntax-error output (section 3, p. 4).
3. Include that feedback in a revision prompt and regenerate the PDDL (section 3, p. 4).
4. Use one revision at Level 2 or two revisions at Level 3 (Table 1, p. 5).
5. Solve and validate the final artifact (section 4, p. 4).

Verus form

Inference: The corresponding loop generates Verus code, runs Verus, extracts a failed verification condition or diagnostic, and asks the model to revise the proof or contract. The final artifact must be checked by Verus after every revision. Inference: Diagnostics can guide repair but cannot justify weakening a contract; a revision that removes a meaningful `ensures` clause would change the claim rather than prove it.

what evidence shows it works

The paper reports that IR and revision by solver feedback are “the keys ingredients of a successful LLM-as-formalizer pipeline” (section 1, p. 1). In the 8 BlocksWorld/Logistics model-domain combinations, a Level 3 pipeline with three IRs has the highest plan accuracy in 6/8 combinations (section 5.1, p. 5). Without solver feedback, PDDL revision loses its advantage (section 5.2, p. 7). The complexity experiment uses two LLMs and four methods: direct planning, direct PDDL, PyPDDL → PDDL, and PDDL → PDDL. It creates BlocksWorld buckets from 10 to 50 blocks, increment 10, with 10 problems per bucket (Figure 4 and section 5.3, p. 8). Direct PDDL loses “no more than 20% plan accuracy” as entity count rises from 10 to 50. All tested formalizer pipelines are more robust than direct planning, but Level 2 pipelines degrade more severely than direct PDDL as entity count increases (section 5.3, p. 8).

what fails or is assumed

Inference: Each solver-feedback revision adds an LLM call and solver invocation. Solver feedback can identify problems with the generated files; it does not establish that the ground-truth domain expresses the intended task. Inference: Verus diagnostics can be similarly incomplete as guidance when the error comes from a wrong abstraction or missing invariant.

## technique: grammar-guided decoding

what it is

The paper translates the PDDL 3.1 BNF into a LALR(1)-compatible EBNF grammar and constrains decoding so output is syntactically valid (section 3, p. 4). This is a decoding-time check rather than a semantic verifier.

when to use it

Inference: Use it when malformed syntax is a dominant failure mode and a parser grammar is available. The paper treats it as a drop-in replacement for standard PDDL decoding (section 5.1, p. 7).

how to do it

1. Obtain the PDDL 3.1 BNF (section 3, p. 4).
2. Convert it to a LALR(1)-compatible EBNF grammar (section 3, p. 4).
3. Constrain token decoding with that grammar (section 3, p. 4).
4. Run the planner and semantic validator after generation (section 4, p. 4).

Verus form

Inference: A Verus implementation could constrain generation to a Rust/Verus grammar, then run the compiler and Verus. Grammar constraints would prevent malformed delimiters and keywords but would not establish ownership, termination, or contract validity. Verus constructs must follow the repository’s accepted syntax; the grammar is only a front-end filter.

what evidence shows it works

The paper reports 4 models, 4 domains, three-run means, and compares grammar-guided PDDL with ordinary PDDL (section 4, p. 5). Section 5.1 reports “38% for PDDL-grammar” versus “36% for PDDL-base” on BlocksWorld and reports zero performance on Logistics (p. 7). It does not identify the model or aggregation behind these prose values, or state that PDDL-base is also zero on Logistics. The paper calls constrained decoding “an hit or miss behaviour” and defers comprehensive evaluation (section 5.1, p. 7).

what fails or is assumed

Inference: Grammar constraints alone cannot establish correct action semantics or goal achievement. The paper warns that syntactic correctness may degrade semantics (section 3, p. 4).

## what is proved, measured, and trusted

The planner supplies syntax errors and searches for a plan in the generated instance; VAL checks that plan against ground-truth PDDL (section 4, p. 4). The study measures syntactic accuracy, validated plan accuracy, model-domain comparisons, and degradation with more entities. Inference: The LLM and IRs are fallible generators; successful validation depends on the ground-truth PDDL and the correctness of the solver and validator. Inference: For agent-written verified Rust, this means a model can be placed before a deterministic checker, but the checker’s specification and build configuration remain part of the trusted computing base.

The paper’s scope is planning, not Rust or Verus. Inference: Its results do not establish that an LLM can produce Verus proofs. The direct transferable lesson is pipeline architecture: generate a typed formal artifact, check it with a deterministic verifier, feed diagnostics back, and preserve a second independent validation step.

## contradictions, missing denominators, and product threat

Section 4 specifies 100 instances per domain and three-run means. The 6/8 result counts model-domain combinations, and the 16% versus 68% result compares QwQ-32B transpilation methods on BlocksWorld. Raw success counts are not given in the prose. The abstract’s “more than a dozen pipelines” differs from section 5.1’s “12 pipelines”; the study does not resolve that discrepancy. The complexity discussion says direct PDDL loses “no more than 20% plan accuracy” (section 5.3, p. 8), without specifying relative percent versus percentage points. Section 7 also limits the findings to “moderately templated descriptions” and at most three IRs (p. 9).

Inference: The threat to a product that lets agents write verified Rust is material at the generation boundary. An agent may emit a syntactically valid but semantically wrong contract, and iterative diagnostics can reinforce a wrong specification. The threat is reduced when compilation, Verus verification, and independent tests or reference models all reject the artifact, but this paper supplies no Verus-specific evidence.

## techniques for the catalog

- formalize then solve: generate a typed formal model and use a symbolic solver plus an independent validator to find and check an executable result
- syntax-aligned IR: generate a high-resource, structurally similar intermediate program, then transpile it to the target formal language
- solver-feedback revision: regenerate the formal artifact using planner diagnostics, repeating one or two times
- grammar-guided decoding: constrain generation with a formal grammar to remove syntax errors, then perform semantic checking separately
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Stage one converts natural language to a structured prose specification using nl_instruction; stage two calls only_pddl_instruction to emit PDDL from the summary plus original descriptions."): checked the full text, quotations, numbers, technique steps, section/page references, and arXiv identifier; inspected PDF page 7 to resolve two-column reading order; corrected planner attribution, quotations, pipeline-call wording, IR revision feedback, section references, unsupported Logistics baseline claim, and denominator discussion; marked recommendations and Verus analogies as Inference; did not reproduce experiments, inspect code, or verify the Verus analogies.
