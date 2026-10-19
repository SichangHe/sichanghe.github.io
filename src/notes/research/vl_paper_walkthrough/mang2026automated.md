# Automated Discovery of Test Oracles for Database Management Systems Using LLMs
(authored by agents unless marked 🧑)
Tag: `mang2026automated`, [paper](https://doi.org/10.1145/3802017)

## result and relevance

Argus automates discovery of database test oracles. It asks an LLM to propose equivalent SQL skeletons, formally checks equivalence with a SQL prover, instantiates verified placeholders with concrete snippets, and runs the resulting query pairs. The abstract reports: “Argus uses LLMs to generate pairs of these skeletons, with their equivalence formally proven using a SQL equivalence solver to ensure soundness.” (Abstract, p. 1). The framework found 41 previously unknown bugs across five DBMSs; 36 were logic bugs, 36 reports were confirmed, and 27 were fixed (Abstract, p. 1).

Inference: The transferable pattern for Verus is to let a model propose a high-level specification or proof transformation, require a sound checker to certify the transformation, and only then instantiate it into many concrete Rust verification tasks. The SQL prover is a trusted checker for SQL equivalence; in VL, Verus plays the analogous acceptance role for Rust contracts and proofs.

## technique 1: constrained abstract queries (CAQs)

what it is

A CAQ is a parameterized SQL template with typed placeholders. The paper defines it as “a SQL skeleton containing placeholders and their associated instantiation conditions, e.g., the placeholder must be filled by a Boolean column.” (Abstract, p. 1). A CAQ pair shares a schema and placeholder map. The formal grammar has `CAQ ::= (Query, PlaceholderMap)` and constraints of either `Expr(TableName : SQLDatatype)` or `Table(SQLTableDef)` (Fig. 2, p. 7). Expression placeholders stand for expressions with a source table and return type; table placeholders stand for tables or subqueries with an expected schema (Sec. 4, p. 7).

when to use it

Inference: Use CAQs when direct generation of complete test cases is too expensive or too unreliable. Check abstract pairs before reusing them in many concrete tests. Two CAQs form an equivalent pair when every valid instantiation returns the same result on every database conforming to their shared schema (Definition 4.2, p. 7).

how to do it

1. Generate a random schema with a grammar-based DBMS generator (Algorithm 1, lines 18–20, p. 8).
2. Add virtual columns and virtual tables to represent expression and table placeholders. Listing 3 shows a virtual `placeholder1 BOOLEAN` column and `vtable1` with a declared schema (Sec. 5.1, p. 9).
3. Generate a seed CAQ that is syntactically valid under this schema (Algorithm 1, line 20, p. 8).
4. Record constraints for each placeholder: source table, datatype, or expected table schema (Sec. 4, p. 7).
5. Later replace each placeholder with a concrete snippet satisfying its constraint and general constraints C (Definition 4.1, p. 7).

Verus form

Inference: Represent a reusable verification pattern as a Rust function skeleton whose holes have explicit types and contracts. An expression hole can correspond to a `spec fn` or a pure expression constrained by a type and `requires`; a table hole can correspond to a data-structure or iterator fragment constrained by an invariant. Use ordinary Verus `requires`, `ensures`, `assert`, `assert forall`, `invariant`, and proof functions from the existing Verus guidance. There is no direct Verus placeholder syntax, so the CAQ grammar is an inference for an external generator. Every filled skeleton must be checked by Verus after substitution.

what the evidence shows

The paper’s central guarantee is conditional: equivalent CAQs can produce many concrete equivalent query pairs when substitutions satisfy the recorded constraints. It provides a contradiction argument in Sec. 6.2 (p. 13) and a proof in Appendix B (pp. 29–31). The authors qualify its scope: “Note that, while these proofs do not cover all SQL features, especially for those new features in future SQL standards, we have not found any counterexamples in our experiments that violate the equivalence after instantiating expressions following these constraints.” (Appendix B, p. 31). The guarantee concerns semantic SQL equivalence under the stated conditions.

where it fails or assumes

The method requires both placeholder-specific type/schema constraints and general semantic constraints on substitutions (Definition 4.1, p. 7; Sec. 6.2, p. 13). The authors identify null behavior, empty results, outer joins, and nondeterminism as sources of semantic misalignment (Sec. 6.2, p. 13). Inference: A Verus hole likewise needs more than a Rust type: ownership, aliasing, arithmetic domains, and the exact contract must be preserved. A type-correct substitution can invalidate a proof obligation.

## technique 2: diversity-directed LLM generation with fail memory

what it is

`GenerateEqual` prompts an LLM with the seed CAQ, samples from an `Equal` set of previously proved variants, and samples from a `Fail` set of rejected variants. The paper says: “The Equal set promotes both correctness and diversity, while the Fail set provides examples of failures to avoid.” (Sec. 5.2, p. 9). Its objective is to generate a candidate equivalent to the seed while maximizing query-plan difference (Problem 5.1, p. 9).

how to do it

1. Initialize `Equal`, `Fail`, `FailCount`, and `Count` (Algorithm 1, lines 1–2, p. 8).
2. Ask the LLM for a candidate using the seed and sampled equal/fail examples (line 4).
3. Measure query-plan tree-edit distance and cluster successful CAQs with k-means; sample across clusters to keep prompts structurally diverse (Sec. 5.2, p. 9).
4. Send the candidate to formal equivalence checking and runtime execution (line 5).
5. Add a passing candidate to `Equal`, reset the fail count, and increase `StopThreshold`; add a failure to `Fail` and increment the fail count (lines 7–12).
6. Stop after the threshold or `MaxDepth` (lines 3 and 14–16).

Verus form

Inference: Maintain two corpora of Rust verification attempts: candidates whose Verus proof passes and candidates rejected by Verus, with diagnostics. Cluster successful attempts by syntax-tree or proof-obligation distance rather than SQL query-plan distance, then prompt the model with diverse passing patterns and representative failures. This is orchestration outside Verus; the checker remains the final filter.

what the evidence shows

In a six-hour comparison on Dolt v1.0.0, Argus-5,000 found 10 unique logic bugs while a human-designed baseline found 3; Argus-50 found 2 (Sec. 7.3, p. 19). For generation methods, clustering yielded average similarity 0.617 and 86 valid queries, compared with beam search’s 0.766 and 48 and naive generation’s 0.688 and 81 (Table 4, p. 21). Lower similarity means more diversity according to the table caption.

where it fails or assumes

The LLM can generate many inequivalent or syntactically invalid candidates. The loop therefore relies on a sound prover and a runtime check. Inference: Plan distance may not predict semantic coverage. For Verus, AST or proof-obligation distance can similarly miss semantically important variation; measure both accepted theorem families and failures by obligation type.

## technique 3: formal equivalence prerequisite check before concrete testing

what it is

Because LLM-generated CAQs are not guaranteed equivalent, Argus substitutes virtual entities and passes both concrete representations to a SQL prover. The paper states: “We leverage the prover as a sound verification tool and deliberately retain only those CAQ pairs that are formally verified.” (Sec. 5.3, p. 10). A candidate must also execute successfully on the target DBMS (Algorithm 1, line 5, p. 8).

how to do it

1. Replace every placeholder with its virtual column or table (Sec. 5.3, p. 10).
2. Ask the prover to establish `q ≡ q′` under the generated schema.
3. Execute `q′` on DBMS D to reject syntax/runtime failures (Algorithm 1, line 5).
4. Retain the pair only when both checks pass; otherwise place it in `Fail` (Algorithm 1, lines 7–12).
5. Instantiate retained pairs with richer snippets after the abstract proof. This two-stage design avoids requiring the prover to support every concrete SQL feature (Sec. 5.3, p. 10).

Verus form

Inference: Generate a Rust candidate, run Verus, and retain it only if Verus accepts the complete module. For transformations, verify a lemma or proof function that establishes the relation before generating concrete callers. Do not mark a runtime function `external_body` to bypass checking; use only constructs supported by Verus. Diagnostics may guide generation, but they are not evidence of a theorem.

what the evidence shows

When the prover was disabled and GPT-5 judged equivalence, all 20 collected DuckDB bug reports were false positives. Of 20 LLM-judged candidate pairs manually checked, 1 was inequivalent (Sec. 7.4, p. 20). By contrast, all 20 prover-accepted CAQ pairs and all 20 concrete instances sampled from them were manually found equivalent (Sec. 7.4, p. 20). The prover had conservative false negatives: 8 of 10 rejected pairs were manually equivalent, versus 5 of 10 for the LLM judge (Sec. 7.4, p. 20).

where it fails or assumes

The prover supports only a subset of SQL, causing false negatives; the authors explicitly use abstract queries first to reduce this limitation (Sec. 5.3, p. 10). Practical soundness depends on the prover implementation and the instantiation constraints. The authors report 10 bugs in SQLSolver and QED, all fixed during early development (Sec. 8, p. 22). Inference: Verus can reject true programs because automation is incomplete, but accepting a fully checked module supplies stronger evidence than an LLM judge. The specification itself remains trusted as the statement of intended behavior.

## technique 4: constraint-preserving snippet corpus and instantiation

what it is

Argus pre-generates reusable expression and table snippets with a hybrid LLM plus grammar-based method, validates their output types or schemas by execution, and recursively cross-combines compatible expressions (Sec. 6.1, pp. 10–12). Listing 5 demonstrates replacing a Boolean column in an integer expression with another compatible expression to form `bit_count(t.c1 + t.c1 > 100)` (p. 12).

how to do it

1. Create a default table containing all target DBMS datatypes (Sec. 6.1, p. 10).
2. Prompt the LLM with sampled official documentation features; generate expressions over the default table and table snippets for each source schema (Sec. 6.1, pp. 11–12).
3. Execute each snippet using `SELECT {GeneratedExpr} FROM t` or `SELECT * FROM {GeneratedTable}` and discard failures (Listing 4, p. 12).
4. Cross-combine snippets when replacement types match (Listing 5, p. 12).
5. For each CAQ expression placeholder, sample a matching datatype and rename referenced columns to compatible columns in the target table (Algorithm 2, lines 3–9, p. 11).
6. For table placeholders, sample a snippet with the expected output schema and matching source schema; choose direct table replacement, a CTE, or a view (Sec. 6.2, p. 12).
7. Exclude nondeterministic features using a regular expression. Require expressions to preserve null values on all-null rows and empty results on empty tables; validate types/schemas and null/empty behavior by execution (Sec. 6.2, p. 13).
8. Populate random tables and indices, execute both queries, and report a logic bug when results differ; report crashes separately (Algorithm 2, lines 17–23, p. 11; Sec. 6.3, p. 13).

Verus form

Inference: Build a corpus of contract-compatible Rust expressions, data structures, and lemma bodies. Check each snippet in a harness with the intended `requires`/`ensures`; instantiate only snippets whose types and proof obligations match. The SQL null and empty-result conditions map to explicit Rust preconditions and collection invariants, but the mapping is domain-specific. A final Verus run on each instantiated module is required.

what the evidence shows

Argus ran for three months on Dolt, DuckDB, MySQL, PostgreSQL, and TiDB using o4-mini with an Azure OpenAI service (Sec. 7, p. 14). The authors report 41 previously unknown bugs, including 36 logic bugs; 36 were confirmed and 27 fixed. Developers later identified 2 reports as duplicates of previously unfixed bugs; 3 remained pending (Table 2; Sec. 7.1, p. 14). Generating CAQ pairs cost about $3, instantiation about $1 per 1,000 tests, and a reusable 100,000-snippet corpus about $12 (Sec. 7.5, p. 21). These are the paper’s reported costs and denominators, not Verus measurements.

## what is proved, trusted, and left open

Argus retains abstract pairs accepted by the SQL prover and checks generated queries and snippets by execution (Sec. 5.3, p. 10; Sec. 6.1, p. 12). Instantiated equivalence depends on the semantic constraints in Sec. 6.2 (p. 13), with the proof-scope qualification in Appendix B (p. 31). Inference: These checks rely on the prover implementation and constraint validation; LLM output alone is not trusted evidence. Runtime tests can reveal disagreements but cannot establish absence of bugs. A Verus adaptation still trusts Verus and the user’s contract as the statement of intended behavior.

## what VL should not redo

Inference: VL can adapt Argus’s typed skeletons, equal/fail prompting, plan-diversity clustering, formal prerequisite checks, corpus reuse, runtime snippet validation, and bug-report packaging to Verus diagnostics and proof obligations. The SQL bug counts do not establish effectiveness for Rust verification.

## threat to agent-written verified Rust

Inference: The threat is low to formal soundness if every instantiated artifact is checked by Verus, and high to engineering throughput if the checker is incomplete or specifications are wrong. A model can generate a syntactically valid but semantically misleading contract, and a corpus can repeatedly encode that mistake. Independent specification review and pinned tool versions are therefore recommendations for a Verus adaptation.

## techniques for the catalog

- constrained abstract query — represent reusable typed skeletons with placeholders and explicit instantiation constraints
- equal/fail prompting — feed verified and rejected generations back to an LLM to improve correctness and diversity
- formal equivalence prerequisite check — retain LLM proposals only after a sound solver proves the abstract relation
- constraint-preserving instantiation — validate reusable snippets, enforce semantic side conditions, and fill verified skeletons
- two-stage oracle generation — prove simple abstractions first, then instantiate richer concrete cases
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To further investigate the issue of extremely high false positive rates, we generated 20 candidate CAQ pairs that the LLM judged as equivalent, and manually verified them."): checked the entire paper including appendices, quotations, numbers, section/page references, technique steps, tag and DOI; corrected the Dolt comparison and documentation page reference, clarified instantiation constraints and proof scope, distinguished inference from paper evidence, and qualified duplicate reports and prover trust; did not reproduce experiments, inspect implementation artifacts, or validate the proposed Verus adaptations.
