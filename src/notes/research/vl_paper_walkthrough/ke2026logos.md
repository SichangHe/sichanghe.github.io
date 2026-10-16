# Logos: Certified Order-Sensitive SQL Rewrites with Mechanized Semantics and LLM Guidance
(authored by agents unless marked 🧑)
Tag: `ke2026logos`, [paper](https://www.semanticscholar.org/paper/513b2356cc9a799751b6c96ce838f98e67b8696e)

## what the paper proves or measures
Logos is a proof-producing SQL rewrite verifier. FormalSQL gives typed, error-aware, order-sensitive semantics in Rocq; an LLM proof agent selects lemmas and constructs query-specific Rocq proofs; the Rocq kernel checks every certificate. The abstract says, “In Rocq, we mechanize a compositional logical semantics for a typed SQL core with order-sensitive operators, capturing all possible ordered lists and observable SQL failures in the supported fragment.” (Abstract, PDF p. 1). This matters because SQL leaves tie order unspecified and LIMIT can make tied permutations observably different.

The central semantic technique is to retain a set of legal ordered lists, retain errors as outcomes, and forget order only at a certified bag-closed boundary. The paper's running rewrite replaces `IN` with a join under a uniqueness constraint. With 21 matching users and `LIMIT 20` without `ORDER BY`, both queries admit the 21 possible 20-user subsets; selecting one engine order would be unsound (Section 2, pp. 2–3). Theorem 9 (bag-to-list lifting) proves that, for bag-closed outcomes, equal bags plus equal errors characterize ordered-outcome equivalence; Theorem 11 proves the running rewrite for every finite database satisfying the schema contract (Section 3.3–3.4, pp. 7–8).

Evaluation covers 389 query pairs: Logos solves 338/389 (86.9%), SQLSolver 249/389 (64.0%), QED 213/389 (54.8%), and Cosette 50/389 (12.9%) (Table 2, p. 9). On 104 order-sensitive pairs, Logos solves 76/104 (73.1%) and SQLSolver 43/104 (41.3%). Logos has four unsupported cases (4/389 = 1.0%) and 47 timeouts (12.1%). Runtime is the cost: median 3,632 seconds on solved cases, 396.3 hours cumulative for 338, versus SQLSolver's 1.70 hours for 249 solved cases (Section 5.3, p. 10). Of 332 cases entering agent proof search, 493.2/563.3 hours (87.6%) were model deliberation/orchestration and 70.1 hours (12.4%) Rocq compilation. These denominators, model (`gpt-5.6-sol`), 14,400-second case budget, and 16 GB limit are the paper's experimental setting.

## technique 1: set-valued, typed, error-aware SQL semantics

what it is and when to use it

Model a query as all legal ordered row lists plus observable failures, over finite typed databases. Use this when unspecified order, NULLs, aggregates, correlated subqueries, or runtime errors can affect equivalence. The paper defines the result domain as successful lists and errors and states, “Thus, a query denotes its complete relation of legal ordered lists and observable failures, rather than one execution selected by an engine.” (Section 3.2, p. 5).

how to do it

1. Define typed nullable values, ordered relation signatures, finite bags with multiplicities, finite lists, schemas, integrity contracts, and finite databases (Definitions 1–4, Section 3.1, pp. 3–4)
2. Represent SQL state as a database plus a stack of row/group bindings for correlated expressions (Definition 5, Section 3.2, p. 4)
3. Give each query constructor a big-step relation that can derive multiple ordered lists; propagate modeled errors and SQL three-valued predicates (Figure 3, Section 3.2, pp. 4–5)
4. Preserve all permutations admitted by unordered operators, preserve stable order through projection/filter, and enforce only declared sort keys in `OrderBy`; `Fetch` and `Offset` consume list positions (Section 3.2, pp. 5–6)
5. Define outcome equivalence over corresponding list rows and errors, then prove congruence lemmas for query, scalar, and predicate contexts (Section 3.3, p. 7)

Verus form

Inference: encode finite rows and lists with Rust datatypes and `spec fn` semantics; use `ensures` to state that an evaluator returns only well-typed outcomes and explicit error variants. Prove list permutation, multiplicity, and error-propagation lemmas with proof functions and `assert` steps. Verus can check these lemmas for a modeled fragment, but it does not supply Rocq's inductive logic or SQL dialect semantics automatically. Concrete database engines and PostgreSQL behavior remain trusted assumptions unless modeled.

evidence and limits

FormalSQL contains over 2,000 verified lemmas (Section 4, p. 8), and every equivalence result has a Rocq certificate. The supported fragment is finite and PostgreSQL-oriented; the authors warn SQLGlot dialect translation can introduce semantic differences (Section 5.4, p. 11). Inference: unsupported SQL features and incorrect type/error models can make a proof irrelevant to deployed engines.

## technique 2: bag closure and bag-to-list lifting

what it is and when to use it

Reuse efficient bag reasoning only when every permutation of each resulting bag is legal. The paper defines bag closure as: “O is bag closed ... when” every required ordering has an observationally equivalent list (Definition 8, Section 3.3, p. 7). This supplies a checkable boundary between order-insensitive algebra and order-sensitive operators.

how to do it

1. Prove a local bag equality for two subqueries, including multiplicity rather than set equality (Section 3.3, p. 7)
2. Prove both successful outcome sets are bag closed using closure certificates for the operators in that context (Theorem 10, Section 3.3, p. 7)
3. Compare modeled errors separately; do not discard failures when comparing successful bags (Theorem 9, p. 7)
4. Apply Theorem 9 to obtain ordered-list outcome equivalence, then use semantic congruence to place the equivalent child under `Fetch`, `Project`, or an enclosing correlated query (Section 3.3, pp. 7–8)
5. If closure fails, retain ordered-list semantics and do not authorize bag abstraction (Section 3.3, p. 7)

The running example proves both cores produce the same 21-row bag and are bag closed before `LIMIT 20`; Theorem 11 then gives equivalence for every contract-satisfying database (Section 3.4, pp. 7–8).

Verus form

Inference: define a `spec fn bag` and a predicate stating that every permutation is admitted; prove a `lemma` that equal bags plus equal errors imply list-outcome equivalence under that predicate. Use loop `invariant` annotations when iterating over rows to preserve multiplicity. This is a mathematical encoding; Verus does not know SQL's legal-order relation unless the developer supplies it.

evidence and limits

The theorem is conditional on inhabited outcomes, closure, matching signatures, and a sound FormalSQL model (Theorem 9, p. 7). A closure certificate is not a generic license to ignore order: Project and Filter preserve child order and need additional premises (Section 3.3, p. 7). Inference: an invalid closure proof is a specification bug that can certify an unsound rewrite.

## technique 3: lemma-library and LLM-guided proof synthesis

what it is and when to use it

Use a verified, SQL-specific lemma library to avoid reproving recurring structural facts, while an LLM assembles a proof for each query pair. The paper says, “Building on FormalSQL, we provide a library of verified lemmas covering general structural properties and common operator interactions.” (Introduction, p. 2). Use this when query pairs vary in feature combinations but share semantic patterns.

how to do it

1. Lower SQL through SQLGlot and Calcite, then a Rust frontend into FormalSQL's typed core (Section 4, p. 8)
2. Generate a Rocq task containing schema constraints, source/target queries, and an equivalence or non-equivalence goal (Section 4, p. 8)
3. Give the proof agent semantic indexes and the reusable lemma library; ask it to choose equivalence or construct a countermodel (Section 4, p. 8)
4. For equivalence, synthesize a Rocq proof; for non-equivalence, reify a fixed typed database and prove a mismatch against complete outcome relations, not one engine run (Introduction, pp. 2–3)
5. Submit each candidate module to the Rocq checker; iterate within three counterexample rounds and the per-case budget (Section 5.1, p. 9)

Of 243 equivalence certificates, 224/243 (92.2%) invoke Logos-specific lemmas and 58/243 (23.9%) use the bag-to-list bridge (Section 5.3, p. 10). Across 332 proof-search cases, 53,565 submissions contained 20,834,738 candidate Rocq lines; 50,841 did not compile (Section 5.3, p. 10).

Verus form

Inference: mirror the architecture with reusable Verus proof lemmas and a model proposing proof blocks, while `cargo verus` remains the checker. Keep the proof agent untrusted: only verifier-accepted code counts. Use `requires`, `ensures`, `assert`, and loop `invariant`; do not call proof functions at runtime. A lemma library's specifications become part of VL's trusted assumptions if their proofs or definitions are external.

evidence and limits

The 86.9% solved rate includes 47 timeouts; it measures definite results within 14,400 seconds, not complete decision power. The 87.6% agent-time share outside Rocq compilation identifies proof synthesis as the bottleneck. Model serving is nondeterministic, so individual runtime and timeout outcomes can vary (Section 5.4, p. 11).

## what remains trusted, contradictions, and product threat

Rocq kernel checking, FormalSQL definitions, SQLGlot/Calcite lowering, PostgreSQL-oriented behavior choices, schema contracts, and the proof agent's generated terms are the trust boundary; the agent itself is not trusted after checking. The paper's broad 86.9% coverage and 3,632-second median concern different axes: coverage is 338/389, while runtime is over solved cases. The 22.9-point improvement is 86.9% − 64.0%, consistent with those denominators. Inference: for agent-written verified Rust, Logos demonstrates a robust pattern—specialized semantics, reusable lemmas, untrusted synthesis, and kernel checking—but also a severe cost risk: proof search can dominate product CI. A Verus integration must control context and proof instability, and must connect abstract contracts to concrete database, parser, and runtime behavior.

## what VL should not redo

Logos already provides mechanized typed semantics, order-sensitive alternatives, bag-closure lifting, error-aware equivalence, LLM proof synthesis, and kernel-checked certificates. VL should not claim generic “LLM plus verifier” or lemma reuse as new without a different domain and evidence. Inference: a distinct contribution could adapt bag/list closure to Rust collection APIs or prove that generated Rust transformations preserve a formal state-machine semantics; this paper does not address Rust or Verus.

## techniques for the catalog

- complete outcome semantics — model all legal ordered lists and observable errors over typed finite inputs
- bag-closure lifting — use multiplicity equality only after proving every relevant ordering is admitted
- certified lemma-guided synthesis — let an LLM assemble query-specific proofs while a Rocq kernel checks each certificate
- proof-producing countermodels — certify non-equivalence with a fixed typed database against complete outcome relations

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
