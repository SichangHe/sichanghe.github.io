# Towards Neuro-symbolic Causal Rule Synthesis, Verification, and Evaluation Grounded in Legal and Safety Principles
(authored by agents unless marked 🧑)
Tag: `rehan2026towards`, [paper](http://arxiv.org/abs/2604.28087v2)

## purpose and architecture

This paper adds a synthesis-and-verification meta-level to an existing neuro-symbolic causal framework for self-adaptive systems. The abstract describes the core sequence: “The synthesis pipeline employs large language models (LLMs) to: (1) decompose goals into candidate causes, (2) consolidate semantics to remove redundancies, (3) translate them into candidate first-order rules, and (4) compose necessary and sufficient causal sets.” A separate engine then performs “(1) syntax and schema validation, (2) logical consistency analysis, and (3) safety and invariant checks before integrating verified rules into the knowledge base” (abstract, p. 1).

The lower framework combines Symbolic Abduction Trees (SAT) in first-order logic, a structural causal model (SCM), and a deep-reinforcement-learning (DRL) policy (section 4.1, p. 4). The meta-loop receives human natural-language goals and principles, synthesizes candidate rules, verifies them, and feeds only accepted rules back into the knowledge base. The authors state: “Only rules that satisfy all verification stages are promoted to a verified theory and committed to the knowledge repository” (section 4.2, p. 5).

Inference: VL can borrow the admission boundary, but the paper’s FOL predicates and DRL/SCM components do not prove Rust memory safety or concurrent behavior. They are a rule-governance pattern that can sit before Verus proof generation.

## technique 1: goal decomposition into candidate causes

What it is. Given a high-level effect such as “respond correctly to a sudden obstacle on the road,” ask an LLM to enumerate concrete conditions, behaviors, or properties that could explain or realize it (section 4.2, pp. 5–6). The prompt is constrained by a curated legal and safety theory to limit hallucinated or irrelevant causes.

When to use it. Use decomposition when a requirement is too broad to verify directly. It creates smaller, traceable obligations linked to one goal.

Steps from the paper. (1) Detect a drift or anomaly in the adaptive system. (2) Present the human goal and governing principles in natural language. (3) Ask the LLM for candidate causes. (4) Keep each cause tied to the effect and constrained by the supplied domain rules. The paper’s driving example treats emergency braking as a possible cause of correctly responding to an obstacle (section 4.2, p. 6).

Verus form. Inference: represent each cause as a Rust predicate or a `spec fn` over state, then make the high-level goal an `ensures` clause that names the required predicates. A generated cause remains untrusted until a Verus proof function establishes it from preconditions. The decomposition prompt and FOL notation do not carry over.

Evidence and limits. In the proof of concept, each scenario starts with eight generated causes. Scenario 1 is reduced to four unique causes; Scenario 2 to six (section 5.3, pp. 7–8). The model is GPT-4o Mini, and the setup is only two illustrative autonomous-driving scenarios (sections 5.1 and 5.3, pp. 7–8). Inference: this is qualitative evidence of traceability, not a general accuracy rate.

## technique 2: semantic consolidation and traceability

What it is. Reprocess candidate causes to merge overlapping or semantically equivalent statements. The paper’s example combines “Driver maintains control of the vehicle” and “Driver is aware of surrounding traffic” into “Driver maintains control of the vehicle and is aware of surrounding traffic” (section 4.2, p. 6).

How to apply it. (1) Feed the candidate list to the model with a fixed grammar and ontology. (2) Identify duplicate meanings. (3) Merge them while preserving the original goal link. (4) Record a mapping from every consolidated cause to its source causes. (5) Pass only unique causes to symbolic translation. The authors use natural-language reasoning for this stage because they report stronger LLM performance than with FOL forms, while retaining FOL forms for verification (section 4.2, p. 6).

Verus form. Inference: consolidate duplicate Rust predicates or contract clauses before writing proofs. Preserve a traceability record in comments or generated metadata; Verus checks the resulting contracts, not the provenance record. Do not assume semantic equivalence from text alone: prove that two predicates imply the same postcondition or have a human review the merge.

Evidence and limits. Scenario 1’s eight causes become four; Scenario 2’s eight become six (section 5.3, pp. 7–8). The paper warns that outputs are sensitive to prompt formulation and dependent on coverage of the predefined rules (section 6, p. 9).

## technique 3: symbolic translation under a grammar

What it is. Translate each unique natural-language cause into a first-order predicate using a predefined grammar, allowed operators, and ontology. The model also supplies a short explanation of the chosen predicates and operators (section 4.2, p. 6).

Steps. (1) Define valid predicates and variables for the domain. (2) Specify allowed comparison and logical operators. (3) Prompt the LLM to map each cause to one structured FOL rule. (4) Require an explanation of the mapping. (5) Reject syntax outside the grammar. The paper illustrates rules such as a universally quantified no-collision condition from safe longitudinal distances and no lane change (section 5.3.3, p. 8).

Verus form. Inference: map each cause to a `spec fn` or boolean state relation and use `requires`/`ensures` in a proof function. The grammar should be enforced by a parser before Verus is invoked. FOL quantifier syntax and Z3-specific encodings cannot be copied directly; the Verus checker must establish the Rust-level relation.

Evidence and limits. The engine performs syntax and schema checks, including that predicates and variables match valid system entities (section 4.2, p. 6). The paper does not report parser rejection counts or translation accuracy denominators. Inference: explanations aid audit but are not proof evidence.

## technique 4: minimal necessary and sufficient cause search

What it is. Evaluate which causes are necessary alone, necessary only in combinations, or sufficient in combinations. The algorithm has three explicit searches (section 4.3, pp. 6–7).

Individual necessity: test each cause independently and record whether removing it violates the legal or safety conditions. Subset necessity: start with the full cause set, remove one cause or subset, and test whether the effect remains feasible. Record a minimal necessary subset when no smaller subset preserves the same result. Skip supersets containing an already identified minimal necessary subset and cache prior evaluations. Minimal sufficiency: test single causes first, add causes until the effect occurs, then repeat across relevant combinations. Skip supersets of known sufficient subsets because sufficiency is preserved under addition. Combine all minimal sufficient subsets into a necessary-and-sufficient representation.

Verus form. Inference: encode each candidate as a boolean predicate over a state and prove implication lemmas for necessity (`goal` implies cause) and sufficiency (causes imply `goal`). Exhaustive subset enumeration is a harness strategy outside Verus; cache results and generate proof obligations for each retained minimal set. The paper’s “necessary” and “sufficient” judgments are logical checks against its curated theory, not statistical causality.

Evidence. Scenario 1 yields four minimal necessary sets and one minimal sufficient set; Scenario 2 yields three minimal necessary sets and two minimal sufficient sets (section 5.3, pp. 7–8). The authors emphasize that a cause can be non-necessary alone yet necessary within a combination (section 6, p. 9). No runtime success rate is reported.

## technique 5: layered rule verification and commit

What it is. The Rule Verification Engine gates integration through three layers. First, syntax/schema validation checks grammar, ontology grounding, and semantic well-formedness. Second, logical consistency checks candidate rules against the existing FOL knowledge base for contradictions. Third, safety and invariant verification checks required properties. Automated reasoning performs satisfiability and entailment checks (section 4.2, p. 6).

Steps. (1) Parse and schema-check the generated rule. (2) Ground every symbol against known entities. (3) Check consistency with the current theory. (4) Check safety and invariants with an automated solver. (5) Commit only passing rules to the verified theory and feed them back into the adaptive loop. The paper names Z3 as an example solver (section 4.2, p. 6).

Verus form. Inference: run `verus` on generated Rust contracts and proof functions after syntactic parsing. Use `requires`, `ensures`, `invariant` clauses in loops, and `assert`/lemmas where needed; do not treat a proof function as runtime code. Commit only code that verifies against a pinned Verus toolchain and library. Z3 satisfiability alone does not establish Rust behavior or memory safety.

Trusted evidence and failure modes

The trusted base includes the curated German traffic regulations, physics and safety principles, symbolic grammar, the FOL engine/solver, and the human goals. The paper explicitly says, “All reasoning carried out by the LLM is grounded in these curated laws, which serve as the primary reference for evaluating causes” (section 5.2, p. 7). GPT-4o Mini is the sole model in the proof of concept (section 5.1, p. 7). The authors acknowledge black-box model reasoning, incomplete regulations, and prompt sensitivity (section 6, p. 9). They also state that the experiment is not intended to verify causality statistically, but to demonstrate structured abductive and deductive reasoning (section 5, p. 7).

Inference: threat to agent-written verified Rust is moderate. The verify-before-admit loop directly addresses specification drift and rule contradictions, but the demonstrated domain is two driving scenarios with no Verus code, concurrency, memory model, or adversarial evaluation. VL should reuse the layered gate and traceability, while treating generated contracts as candidates until Verus proves them. Existing work already supplies a concrete necessity/sufficiency search and rule admission design; VL should not redo those abstractions without measuring Rust-specific failure modes.

## techniques for the catalog

- goal-to-cause decomposition: split a natural-language safety goal into constrained, traceable candidate causes
- semantic consolidation: merge duplicate causes while retaining provenance to the originating goal
- grammar-bound translation: map causes to machine-checkable predicates under an explicit symbol grammar
- minimal-set search: enumerate and cache minimal necessary and sufficient cause combinations
- verify-before-admit: gate new rules on syntax, consistency, safety, and invariant checks before committing them
Checked 2026-10-15 against paper rehan2026towards: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
