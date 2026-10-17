# GDPR-Bench-Android: A Benchmark for Evaluating Automated GDPR Compliance Detection in Android
(authored by agents unless marked 🧑)
Tag: `ran2025gdpr`, [paper](https://arxiv.org/abs/2511.00619)

## scope and contribution
The paper introduces a benchmark for detecting GDPR violations in Android source code. It contains 1,951 manually annotated violations from 15 repositories, covering 23 GDPR articles and file, module, and line granularities. The authors define two tasks: hierarchical violation localization and snippet-level multi-label classification. They compare eight LLMs with Formal-AST, retrieval-augmented generation (RAG), and a ReAct agent. The paper states: “We introduce GDPR-Bench-Android, the first comprehensive benchmark for evaluating diverse automated methods for GDPR compliance detection in Android applications.” (abstract, p. 1)

Inference: For VeruLaw (VL), the most reusable lesson is an evaluation and triage architecture: deterministic checks provide reproducible facts, retrieval supplies comparable examples, and an agent can navigate larger context before a proof-oriented checker decides. The benchmark is a detector benchmark, not a proof of program correctness or legal compliance.

## technique 1: construct a provenance-rich violation corpus

What it is. The dataset records repository, commit, violated article, source path and lines, code snippet, and an expert legal rationale. This makes every label traceable to a source snapshot. The schema is explicitly described as: “The foundational triad of fields (app_name, repo_url, and commit_id) provides indispensable provenance information.” (Section 4.2, p. 10)

When to use it. Use this technique when training or evaluating a checker whose result must be reproduced and audited. A label without a commit and line location cannot support later inspection or regression testing.

How it is done. The paper’s construction steps are:
1. Survey more than 50 open-source Android projects and select projects that use sensitive APIs and common Android stacks (Section 4.1, p. 8).
2. Search commit histories for keywords such as `getSharedPreferences`, `httpURLConnection`, `write`, `log`, `camera`, and `location` (Section 4.1, p. 9).
3. Narrow the search to 64 high-probability commits and inspect each flagged commit in complete repository context (Section 4.1, p. 9).
4. Have three graduate researchers assign article labels and record provenance, exact location, snippet, and legal rationale; a senior technology-and-law expert validates the final labels (Section 4.1, p. 9).
5. Independently blind-review each record, mediate disagreements, and serialize records as JSON (Section 4.1, p. 10).

Verus form. Inference: Represent each candidate as a Rust struct containing a commit identifier, path, span, snippet hash, article identifier, and rationale; use a `spec fn` to define that a record’s location and commit are nonempty, and `assert` or `ensures` to check serialization invariants. This preserves provenance but does not turn a legal annotation into a Verus theorem. A Verus proof can establish consistency of the record, while the legal judgment remains trusted input.

Evidence and limits. The corpus required “over 250 person-hours” (Section 4.1, p. 10) and has 1,951 records. It is heavily skewed: AhMyth-Android-RAT contributes 1,044 records (53.51% of 1,951), while AndroSpy contributes 174 (8.92%) (Section 4.3.1, p. 12). Static analysis misses runtime or external-context violations: “We do not perform run-time checks; therefore, a consent form present in a different, un-analyzed part of the codebase would not be captured.” (Section 4.1, pp. 9–10) Inference: VL should retain commit and source-span evidence for every generated proof obligation and report when required context is unavailable.

## technique 2: use deterministic AST rules as a transparent baseline

What it is. Formal-AST is described as a “multi-language analyzer that operates directly on Java and Kotlin source code” (Section 3.1, p. 7); it extracts facts into formal predicates, and evaluates more than 35 hand-written rules. The method is summarized as: “It first uses a multi-language parser to build an AST for the given code. It then traverses the AST to extract facts and populates a set of formal predicates.” (Section 6.1.1, p. 20)

When to use it. Use deterministic rules for stable, explainable checks such as detecting sensitive API use, missing consent predicates, or hardcoded insecure URLs. It is a baseline and a guardrail, not a complete semantic analyzer.

How it is done. The paper’s procedure is:
1. Parse the source into an AST (Section 6.1.1, p. 20).
2. Traverse the AST and populate facts such as `CollectsDataPredicate(DEVICE_ID_DATA)` (Section 6.1.1, p. 20).
3. Evaluate rules such as `CollectsDataPredicate AND NOT HasConsentPredicate → Violation(Article 6)` (Section 6.1.1, p. 20).
4. Determine violations from the rule evaluation; the paper says the rules are “derived from our dataset and GDPR text to determine violations” (Section 6.1.1, p. 20). The paper does not describe Formal-AST's output format beyond this.

Verus form. Inference: Encode facts as predicates over an immutable analysis state and express each rule as a `spec fn` or a proof lemma that derives a violation property from preconditions. Use `requires` for parser-state assumptions and `ensures` for the derived violation; keep runtime parsing separate from proof code. Do not use a `proof fn` at runtime or claim that the rule proves legal compliance beyond its encoded premises.

Evidence and limits. Formal-AST scored 9.79% Accuracy@1 at file level (Table 5, p. 22), 9.73% at module level (Table 6, p. 23), and 1.86% at line level (Table 7, p. 23). In Task 2 it scored 2.33% accuracy, 2.39% macro-precision, 0.71% macro-recall, and 0.95% macro-F1 (Table 8, p. 24). The paper does not state the number of test instances N behind the Accuracy@k figures, and its metric definition does not say how many articles C the macro averages cover; Task 2 has 887 snippet records (Section 5.4, p. 18). The paper explains the failure: “Its deterministic rules, designed for broader context, fail to fire on short code segments.” (Section 6.2.2, p. 24) Inference: the paper says Formal-AST parses Java and Kotlin, yet Table 3 (p. 15) shows .java and .kt files are only 27.78% (15.27% + 12.51%) of the snippets, with .js, .json, .cs and .php making up much of the rest; the paper does not explain how Formal-AST handled those files, which may partly explain its low scores. Inference: VL should use AST rules to generate proof obligations and reject obvious violations, while leaving context-sensitive reasoning to specifications and proofs.

## technique 3: derive hierarchical and multi-label benchmark tasks

What it is. The same 1,951 records are transformed into (a) 368 file-centric records with file, module, and line arrays and (b) 887 unique snippet records whose article labels are sets. This separates broad-context localization from isolated classification.

When to use it. Use hierarchical tests to reveal whether a system fails because it cannot navigate context or because it cannot classify a local pattern. Use multi-label tests when one operation can violate several independent policies.

How it is done. For Task 1, group records by `(repo_url, app_name, file_path)`, aggregate article labels at file level, infer module/class names, parse line spans, and emit one JSON object per file (Section 5.3, pp. 16–18). For Task 2, group by `code_snippet_path`, copy provenance fields, collect each `violated_article` into a set, sort the set, and emit `task2_dataset.json` (Section 5.4, pp. 18–19).

Verus form. Inference: Mirror this in a Rust verification corpus: one record for each module or file, plus one obligation per source span. Prove that grouping preserves every source record and that deduplication does not remove distinct article identifiers. A `spec fn` can define set inclusion; `ensures` can state that every input label occurs in the output set.

Evidence and limits. The source corpus has 1,951 records, Task 1 has 368 file records, and Task 2 has 887 snippet records (Figure 6, p. 16). The benchmark assumes relevant context is inside one file; the authors write: “This may not hold true for complex, inter-procedural violations that span multiple files or modules.” (Section 8, p. 28) Inference: VL evaluations should include cross-module specifications and avoid treating a single-file pass as a repository-wide guarantee.

## technique 4: retrieval-augmented checking

What it is. RAG builds a vector knowledge base from GDPR article definitions and all annotated violation pairs, retrieves similar material, and injects it into an LLM prompt. The paper says: “When analyzing a new code snippet, it first retrieves the most relevant documents ... and injects this context into the LLM’s prompt.” (Section 6.1.1, p. 20)

When to use it. Use retrieval when labels depend on domain rules or similar code examples and the base model’s internal knowledge is incomplete. Keep retrieved evidence attached to each decision so a reviewer can inspect it.

How it is done. Index article definitions and annotated code-violation pairs; retrieve nearest documents for a new snippet; place those documents in the model context; ask the model for article labels; score predictions using the benchmark metrics (Section 6.1.1, p. 20; metrics in Section 6.1.4, p. 21).

Verus form. Inference: Retrieval itself is not a proof. Treat retrieved text as untrusted input that selects candidate specifications; require a Verus proof over the actual Rust program before accepting a safety claim. Store retrieval identifiers in the obligation record and prove only that the selected rule was applied to the stated code facts.

Evidence and limits. RAG reached 56.87% line-level Accuracy@1 (Table 7, p. 23) and 7.10% macro-precision on Task 2 (Table 8, p. 24), the highest macro-precision in that table. The paper warns of “retrieval noise” when irrelevant or conflicting examples confuse the model (Section 6.3.2, p. 25). Inference: VL should measure retrieval precision and retain a fallback when evidence conflicts.

## technique 5: ReAct tool-using analysis

What it is. ReAct gives GPT-4o tools for article lookup, code search, and rule checking. The agent reasons, chooses a tool, observes its result, and repeats until a conclusion.

When to use it. Use this pattern for repository-scale analysis where a single prompt cannot inspect all files or where the agent must gather targeted evidence.

How it is done. Initialize the agent with the code and task; expose `gdpr_lookup(article_id)`, `code_search(keyword)`, and `rule_check(code_snippet)`; let the model alternate reasoning and tool calls; repeat until the agent “reaches a final conclusion” (Section 6.1.1, p. 20).

Verus form. Inference: Permit an agent to propose files, predicates, and proof obligations, but make the Verus verifier the acceptance boundary. Tool outputs should be immutable evidence records; a failed or unavailable tool call must remain an explicit unresolved obligation.

Evidence and limits. ReAct obtained 17.38% file-level Accuracy@1 and 17.13% module-level Accuracy@1 (Tables 5–6, pp. 22–23), and 50.84% line-level Accuracy@1 (Table 7, p. 23). The authors attribute the file- and module-level advantage to iterative tool use (Section 6.3.1, p. 25), but note that “its simple code_search tool may miss obfuscated API calls” (Section 6.3.2, p. 25). Inference: Tool coverage and adversarial tests are necessary before trusting an agent-generated proof plan.

## what is proved, trusted, and inconsistent

The paper measures detector rankings and classification scores; it does not prove that any Android program is GDPR compliant. Trusted components include expert labels, parser correctness, manually authored rules, retrieval embeddings, model APIs, and the assumption that file-local context is sufficient. The paper states that “Legal Ground Truth Is Not Legally Binding” (Section 8, p. 28), so labels are research annotations rather than legal verdicts.

The reported percentages generally match their stated denominators: 994 + 957 = 1,951 and 50.95% + 49.05% = 100%; 1,044 / 1,951 = 53.51%. One wording inconsistency is that the abstract calls Formal-AST “formal,” while the implementation is a manually crafted rule system; the distinction matters because deterministic rules do not establish semantic or legal completeness. Inference: The benchmark poses moderate product threat if VL treats detector labels as proof claims; the threat is lower when it uses the benchmark only to prioritize proof obligations and validates final claims in Verus.

## techniques for the catalog

- provenance-rich corpus: store commit, path, span, snippet, article label, and expert rationale for reproducible obligations
- deterministic AST rules: parse source, extract predicates, and evaluate explicit rules as a transparent baseline
- hierarchical and multi-label tasks: test file/module/line localization separately from complete snippet label sets
- retrieval-augmented checking: retrieve article definitions and similar labeled code before proposing a classification
- ReAct tool use: let an agent search code and rules iteratively, then require an independent verifier for acceptance
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our expanded dataset now includes 15 applications. As shown in Figure 4, the distribution of violations is heavily skewed."): read the whole paper text (arXiv v1, manuscript pages 1:1 to 1:30) and checked every quotation, number, table and section reference, page number and technique step in this study against it. Changed: the paper link (the DOI in the paper is a placeholder; arXiv link taken from the paper text), the page range of the run-time-checks quote, Formal-AST step 4 (the cited section did not describe it), table citations for Formal-AST and RAG numbers, the ReAct stopping description, and the RAG index contents; removed denominators the paper does not state; added an Inference about Formal-AST language coverage. Not checked: the figures (images), the external GitHub repository, and the cited works; the code-level Verus suggestions are the agent's own and were not tested.
