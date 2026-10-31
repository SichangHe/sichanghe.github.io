# On Verifiable Legal Reasoning: A Multi-Agent Framework with Formalized Knowledge Representations
(authored by agents unless marked 🧑)
Tag: `sadowski2025verifiable`, [paper](https://arxiv.org/abs/2509.00710)

The paper presents SOLAR, a two-stage architecture for turning statute text into an inspectable ontology and then applying it to cases. Its central claim is empirical and narrow: on the 96-case SARA numeric tax benchmark, foundational models using the precomputed representation reached 76.4% average accuracy versus 18.8% zero-shot for non-reasoning models. The authors explicitly call this a “proof-of-concept” (Section 1, p. 2), so the result does not establish general legal reasoning.

## technique: statute-specific T Box and ABox

What it is. The T Box is reusable terminological knowledge for one statute: classes C, properties P, and first-order rules R. The ABox contains individuals and facts extracted from one query. The paper defines the rule example as “isDeductible(expense) ← isBusinessExpense(expense) ∧ isOrdinaryAndNecessary(expense)” (Section 3.1, p. 4). It deliberately uses granular properties and explicit rules instead of one opaque high-level predicate.

When to use it. Inference: use this split when many cases share a stable vocabulary and rules, and when facts and derived conclusions must be inspected separately. It is a poor fit when the law is highly defeasible or changes too often. The paper supports part of this: its ontology “deliberately avoids exhaustive formalization (e.g. of defeasible reasoning)” (Section 3.1, p. 4).

How to do it. First list statutory concepts as classes. Next type unary, object, and datatype properties. Then encode conditional rules. For a query, create individuals and assertions, combine T Box and ABox, and derive A′ where the combined knowledge base entails an assertion. The paper writes the knowledge base as `KB = TBox ∪ ABox` and, after inference, as the expanded `KB' = TBox ∪ ABox ∪ A′` (Section 3.1, p. 4).

Verus form. Inference: represent the executable case facts with Rust structs and pure functions, and state each rule as `requires`/`ensures` on a `fn`; use `spec fn` for mathematical predicates and `proof fn` lemmas for rule composition. A Verus proof cannot make an LLM-extracted vocabulary correct by itself; the extracted T Box remains a specification input that must be reviewed.

Evidence and limits. The SARA set has 96 cases (Section 5, p. 8). The ontology was generated once by o1 and reused for all stage-II experiments (Section 6, p. 9), which, as the authors intend, isolates application from ontology construction (Section 5.2, pp. 8–9; Section 6, p. 9). Inference: this leaves stage I unmeasured and trusted; the paper itself lists the lack of metrics for T Box quality as a gap (Section 8, p. 12). The authors report that the single-domain focus and the 96-case dataset limit generalization (Section 7, p. 12).

## technique: multi-agent knowledge acquisition with validation loop

What it is. Parallel concept and rule agents propose C/P and R. An integration agent resolves terminology, a validation agent checks internal consistency, and a code-generation agent emits a Python T Box interpreter. Training examples are then passed through the whole application pipeline; a judge classifies failures and routes feedback to integration or code generation. The method is stated directly: “A validation agent then verifies the T Box’s internal consistency, creating a refinement loop with the integration agent until validation passes” (Section 4.1, p. 5).

Steps. (1) Extract concepts and relations in parallel. (2) Extract conditional rules in first-order form. (3) Integrate and standardize. (4) Validate and repeat integration until validation passes. (5) Generate an interpreter accepting an ABox. (6) Run training samples; route each failure to ontology or implementation repair. Steps 1–6 are the paper’s Section 4.1 procedure.

Verus form. Inference: replace the interpreter with verified Rust and give it a contract from ABox facts to the claimed numeric result. Keep extraction and integration outside the trusted executable; import their output as reviewed constants or generated Rust specifications. Use `assert` and proof lemmas to discharge each rule, rather than treating a runtime proof function as executable code.

Evidence. The authors report that the loop continues “until all training samples are correctly processed” (Section 4.1, p. 5), but they give no count of iterations or independent ontology-quality metric. Inference: training success is evidence for this artifact, not proof that the extracted ontology is complete.

## technique: query-to-ABox, SMT inference, and generated calculation

What it is. A fact-extraction agent maps natural-language case facts onto C and P. An SMT-based symbolic agent applies R and emits A′. An answer agent supplies A and A′ to the precomputed interpreter. The paper states: “The resulting ABox is processed by a symbolic inference agent that employs an SMT solver to apply the rules (R) from the T Box to the facts (A)” (Section 4.2, p. 6).

Steps. Parse the query with the T Box vocabulary; create typed individuals and assertions; solve the rules; append entailed facts; call the interpreter; return calculation and explanation. In the Alice example, the solver derives `isSurvivingSpouse(Alice)` from the deceased-spouse and dependent-household assertions, then the interpreter calculates $62,000.42 (Section 4.3, p. 7).

Verus form. Inference: make fact extraction produce a Rust ABox value, use a verified pure rule evaluator, and prove that each returned fact follows from the input predicates. The arithmetic interpreter can be a verified Rust function with explicit contracts for deductions, brackets, and rounding. SMT is not a Verus construct; its result must be represented by proved lemmas or a trusted external specification.

Evidence. At 10% tolerance, the paper reports SOLAR averages of 76.4% for non-reasoning models and 82.3% for reasoning models (Section 6.1, p. 10; Table 1 lists the per-model values); Claude 3.7 and LLaMA 4 could not complete the structured-output pipeline (Table 1, p. 10). On the same 10% tolerance, non-reasoning models averaged 18.8% zero-shot and 58.3% with Chain-of-Code, so most of the gain over zero-shot is shared with code generation alone; for the two reasoning models SOLAR scored below Chain-of-Code (87.5% vs 93.8% for o4-mini, 77.1% vs 96.9% for Gemini 2.5 Flash) (Section 6.1, p. 10). The paper also reports about 4,000 tokens per query versus about 8,000 zero-shot and about 8,500 Chain-of-Code, but latency rises to 12.8 seconds versus 1.5 and 7.1 seconds (Section 6, p. 9). For symbolic inference it uses the SMT solver in NLTK (Section 5.2, p. 8).

## what is proved, measured, and trusted

Inference: the symbolic solver provides logically entailed facts only relative to the supplied T Box and ABox, and the Python interpreter, prompts, model outputs, ontology completeness, and 10%-tolerance benchmark remain trusted or measured components. The paper's error analysis found missing vocabulary for itemized deductions, omitted spouse relations, and incorrect filing-status precedence (Section 6.2, pp. 10–11). Inference: these failures show that a consistent solver cannot repair an incomplete ontology or an incorrect interpreter.

## techniques for the catalog

- T Box/ABox separation — store reusable statute vocabulary and rules separately from case facts, then derive explicit assertions
- 
- multi-agent ontology refinement — extract concepts and rules, integrate them, validate, and route sample failures back to the responsible artifact
- 
- SMT-backed query application — map text to an ABox, infer entailed facts with a solver, and run a deterministic interpreter
