# Doc2Spec: Synthesizing Formal Programming Specifications from Natural Language via Grammar Induction
(authored by agents unless marked 🧑)
Tag: `xia2026doc2spec`, [paper](https://doi.org/10.1145/3798217)

## goal and evidence

Doc2Spec translates natural-language API rules into a domain-specific formal grammar and then into checkable specifications. Its key design is staged decomposition: locate code entities, extract rule clauses, induce predicates and sorts in a fixed grammar template, and formalize each rule. The paper says, “Because the intermediate results are explicit and structured, each step can also be checked deterministically, turning an unreliable one-shot translation into a sequence of verifiable steps.” (section 1, p. 2).

The evaluation covers three Solidity standards and three Rust standard-library files. Doc2Spec uses GPT-OSS-20B by default, retries tool-detected errors up to three times, runs each configuration three times, and reports mean precision and recall. The six-benchmark average is precision 0.73 and recall 0.78, versus 0.45/0.41 for grammar-in-one and 0.43/0.30 for spec-in-one (Table 1, p. 7; denominators are gold rules in the six documents). Two authors judge each rule; agreement is 87% with Cohen’s κ = 0.75 (section 5, p. 7).

Downstream symbolic execution checks 200 Ethereum contracts (181 ERC20, 12 ERC721, 7 ERC1155) and 20 Rust crates. It reports 142 real violations and 21 false alarms. These counts are code-site detections, not proof completeness. The abstract summarizes: “Moreover, its formalized rules enable symbolic-execution tools to uncover 142 previously unknown rule violations, confirming the rules’ correctness and practical usefulness.”

## technique 1: entity localization with deterministic regex checks

What it is. EntityLocalizer identifies API declarations, scopes, attributes, and attached documentation without assuming a domain grammar.

How to apply it. (1) Split each document into 80-line chunks (section 4.1, p. 4). (2) Ask an LLM to infer regular expressions for the first line of entity declarations. (3) Compile and apply those expressions with a Python tool. (4) Infer scope regexes first, including delimiters and names; track delimiter nesting to build each entity’s scope chain. (5) Validate each entity pattern against examples and all matches; ask an LLM to prune patterns whose matches are irrelevant. (6) Attach the natural-language block immediately preceding each declaration. (7) Extract kind, name, ordered parameters and types, returns, modifiers, visibility, scopes, and description.

The paper explains, “A Python tool then applies these regular expressions to the chunk, ensuring that matching entities are extracted consistently” (section 4.1, p. 4). Deterministic validation catches regex compilation failures and misses before later agents run. Inference: For Verus, apply the same stage to locate Rust functions, structs, traits, and `requires`/`ensures` comments before asking a model to write proof obligations. Regex output is only extraction evidence; it does not establish that an entity’s specification is complete.

## technique 2: verbatim clause extraction and scoring

What it is. NLRuleAgent separates candidate extraction from rule classification. The first pass copies every independently testable clause verbatim; a Python checker verifies substring fidelity; two scoring passes decide whether each clause is an actual rule.

How to apply it. (1) Give the agent an entity declaration and attached description. (2) Extract every candidate clause, splitting sentences with multiple requirements while retaining a condition with its consequence. (3) Exclude definitions, examples, rationale, summaries, and parameter descriptions. (4) Normalize source and candidate text (case, whitespace, quotes, dashes, backticks), then require each candidate to occur as a substring; discard altered, fabricated, duplicate, or contained clauses. (5) Score each remaining clause twice with a label `rᵢ` and confidence `cᵢ`. (6) Compute `score(s) = 1/(1 + exp(-Σ rᵢcᵢ / 2))` and retain scores above 0.5 (section 4.2, p. 6).

The paper states, “Finally, a Python tool computes a score using the following formula and treats a clause with a score greater than 0.5 as a rule” (section 4.2, p. 6). Inference: In VL, retain the exact comment sentence that motivates each Verus contract and reject model paraphrases before formalization. A substring check protects provenance, but a copied sentence can still be ambiguous or wrong; Verus must check the resulting contract against code.

## technique 3: fixed-template grammar induction

What it is. GrammarAgent instantiates a domain-agnostic EBNF skeleton with domain predicates, sorts, and modalities. The template fixes logical shape (`rule`, optional modality, formula, optional condition) while leaving vocabulary open.

How to apply it. (1) Start from the fixed grammar template in Fig. 2 (p. 6). (2) For each retained rule, split its text into independently falsifiable atoms and Boolean connectors. (3) Validate that formulas refer to the right atoms and all atoms are represented. (4) Name each atom with exactly one predicate and assign argument sorts; require consistent sorts for shared variables and declare every referenced sort. (5) Collect predicates and sorts into an EBNF grammar. (6) Reject predicate names that encode an entire concrete rule or value.

The paper warns, “Generating a predicate directly from a rule is unreliable, because a rule often combines multiple requirements and a condition.” (section 4.3, p. 6). Its example turns an ERC20 authorization sentence into `ThrowObligation()` and `AuthorizedCondition(Address, Address)`. Inference: For Verus, predicates can map to spec functions or ghost relations, while modalities can map to error versus warning policies. The induced grammar is a generation scaffold, not a soundness proof; every predicate definition and sort interpretation must still be reviewed or proved.

## technique 4: grammar-constrained formalization

What it is. FormalAgent fills the extracted logical structure with concrete predicate arguments and the target entity’s attributes, then a parser checks the resulting DSL statement.

How to apply it. (1) Supply the entity, declaration attributes, retained rule, atom formulas, predicates, sorts, and grammar. (2) Do not ask the model to re-derive Boolean structure; require it to insert predicates and the appropriate modality. (3) Instantiate predicate sorts with concrete arguments such as `_from` and `sender`. (4) Parse the statement with Lark and reject syntax outside the induced grammar. (5) Retry up to three times when a Python checker reports an error (section 5, p. 7).

The paper says, “The LLM does not re-derive the logical structure but fills in the extracted predicates and prefixes the appropriate modality.” (section 4.4, p. 7). Inference: A Verus backend could translate accepted DSL rules into `requires`, `ensures`, `invariant`, and spec-function calls, then invoke Verus as the semantic checker. The parser only proves grammar conformity; it cannot prove that a predicate faithfully means the natural-language rule.

## technique 5: downstream symbolic execution with ghost instrumentation

What it is. Use generated rules to instrument real code with ghost variables and assertions, then run a symbolic execution engine. Solidity uses SymGPT’s backend; Rust uses KLEE. Because predicates may refer to state without corresponding program variables, an LLM adds the needed ghost state and assertions first.

How to apply it. (1) Select implementations or clients of the APIs. (2) Pair each source file with generated rules. (3) Instrument code with ghost variables and assertions representing predicate observations. (4) Run symbolic execution and record concrete violating sites. (5) Count true positives and false alarms. (6) Compare with LLM-on-docs, LLM-on-rules, SymGPT, Semgrep, LockBud, Prusti, Rudra, MIRAI, and MirChecker baselines.

Evidence. The paper reports 142 true violations and 21 false alarms for Doc2Spec; on Rust it finds 24 violations with no false alarms, while six specialized tools together find 13 true positives and 90 false alarms (section 5.3, p. 9). The denominator for the 142/21 totals is all analyzed sites in 220 programs, not the six-document rule count. LLM-on-docs and LLM-on-rules produce 324 and 602 false alarms respectively. Inference: For VL, ghost state can expose API obligations around unsafe pointers or ownership, but generated instrumentation must be treated as a hypothesis until Verus proves its relation to real memory and control state.

## evaluation, trust, and failures

Ablation removes one agent at a time and replaces it with a one-shot prompt. Precision falls to 0.26, 0.12, 0.06, and 0.23 without EntityLocalizer, NLRuleAgent, GrammarAgent, and FormalAgent; recall falls to 0.13, 0.04, 0.05, and 0.07 (Fig. 3, p. 8). These denominators are the same six benchmark rule sets. Backbone variation gives precision 0.70–0.78 and recall 0.74–0.89.

Trusted components include LLM extraction, human gold labels, regex and parser tools, ghost instrumentation, symbolic executors, and the semantic interpretation of induced predicates. The paper’s formalized rules are not directly checked by the execution engine; instrumentation bridges that gap. The authors state, “The formalized rules cannot be checked directly: a symbolic execution engine needs to know when a violation occurs” (section 5.3, p. 9). Inference: Product threat to agent-written verified Rust is high at the specification boundary: a syntactically valid, parser-accepted rule can still omit a safety condition or assign the wrong sort. Verus reduces downstream implementation risk only after the generated rule has been translated into a complete contract and proved. Existing work already demonstrates staged grammar induction, verbatim provenance checks, and symbolic execution; VL should reuse these stages rather than rely on one-shot contract generation.

## techniques for the catalog

- entity localization: chunk documents, infer scope/entity regexes, validate matches, and extract declaration attributes
- verbatim rule extraction: copy candidate clauses, substring-check them, deduplicate, and score rulehood
- staged grammar induction: split rules into atoms, infer predicates and sorts, then build a fixed EBNF vocabulary
- parser-constrained formalization: fill extracted logical structure with typed arguments and reject invalid DSL syntax
- ghost-instrumented symbolic execution: add state observations and assertions before checking real API implementations
Checked 2026-10-15 against paper xia2026doc2spec: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
