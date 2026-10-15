# Pipeline Denotational Design: Correct-by-Construction Data Pipelines at Zero Cost
(authored by agents unless marked 🧑)
Tag: `karayannidis2026pdd`, [paper](http://arxiv.org/abs/2608.12375v1)

## central idea

Pipeline Denotational Design (PDD) moves pipeline reasoning from generated SQL or PySpark into a typed semantic domain. A design records each type’s grain, entity key, and behavioral class, then composes operations whose contracts describe how those properties change. The paper’s abstract states: “every well-typed composition is grain-correct by construction.” It claims three design-time layers: grain by the CalcG type computation, behavioral class by the type checker, and domain rules by proof-carrying composition over contracts (abstract, p. 1).

The motivating failure is a fan trap: joining revenue at customer-channel-date grain with units at customer-product-date grain and aggregating by customer-date silently multiplies rows. Schema checks, type checks, and small sampled tests can miss it (section 1, p. 1). PDD’s goal is prevention. The authors write that “the remedy is not better detection” but making illegal states unrepresentable (section 1, p. 2).

Inference: the transferable idea for VL is a semantic intermediate representation in which agents instantiate only operations with contracts, then emit Rust and Verus evidence. PDD’s data-grain theory is domain-specific; it does not itself verify ownership, memory safety, or concurrency.

## technique 1: denotational design and the pipeline development life cycle

What it is. Design a pipeline as a function between semantic types, then derive executable code from that design. The semantic function maps a data type to `(grain, entity key, behavioral class)` and maps operations to algebraic operations. The paper states: “The meaning of running a pipeline on data equals the meaning of the pipeline applied to the meaning of the data” (section 2.2, p. 4). This homomorphism is the faithfulness link between design and implementation.

Steps. (1) Gather source and target denotations and business rules. (2) Express transformations in the Pipeline Design Algebra (PDA), and constraints as first-order predicates. (3) Run CalcG, behavioral-class typing, and contract checks to produce a verified blueprint. (4) Implement it with a library whose operations correspond to PDA. (5) Apply only semantics-preserving optimizations. The four-step Pipeline Development Life Cycle is listed in Table 2 (p. 5).

Verus form. Inference: represent source and target state with Rust structs, use `spec fn` to define denotations, and put preconditions and postconditions in `requires` and `ensures`. Build a small typed operation library whose proof functions compose. Verus does not provide PDD’s PDA or CalcG; those are an inferred design layer that must be implemented as specifications and lemmas.

Evidence and limits. The paper presents the method and a production toolchain but explicitly says the quantitative measurement campaign is in progress (section 8, p. 19). The semantic homomorphism and theorems are claimed as the formal basis; empirical defect rates are not yet available.

## technique 2: CalcG type-level grain checking

What it is. CalcG threads a finite grain transformation rule through every operation in a pipeline DAG. Captures, lookups, enriches, and safe selections preserve grain; groupby sets it to grouping columns; an equi-join computes `G1 ∪ (G2 − Jk)` over fields (section 6.1, pp. 13–14). The pipeline is correct when the computed output grain equals the declared target grain.

Steps. (1) Annotate each source and target with a grain. (2) Select an operation and apply its CalcG rule to the input grain. (3) Compose rules in pipeline order, using product rules for branches. (4) Compare the result with the target grain. (5) Reject a mismatch before code runs. The paper gives a customer-order example: event grain `CustomerId × OrderDtm` is preserved through lookup, changed to `CustomerId` by groupby, and preserved by upsert; omission of the grouping or use of a fan-out lookup yields a mismatch (section 6.1, p. 14).

Verus form. Inference: encode each Rust operation’s grain as a type-level or ghost specification and prove a `calc_g` function’s result. Use `requires` to state key/join assumptions and `ensures` to state the output relation. A Rust implementation still needs a separate correspondence proof; CalcG’s set operations are not built-in Verus constructs.

Evidence. Theorem 6.1 states that grain correctness is equivalent to `CalcG[pip](G[Source]) = G[Target]` and runs in `O(|V| · k)` on a DAG with `|V|` operations and fan-in `k` (section 6.1, p. 14). The theorem is a type-level claim and requires the declared metadata and operation contracts.

## technique 3: behavioral-class typing and re-graining

What it is. Every operation has a behavioral class describing read/write semantics, such as entity, event, multiversion, snapshot, or ordered data. The type checker rejects invalid combinations, for example appending to an entity collection or applying an entity-only operation to a multiversion collection (section 6.2, p. 14).

A deliberate change of grain uses a `declare-<class>` re-lens only when a projection is a key of every input. The paper’s Theorem 6.2 equates a projection being injective on the type, a superkey of every collection, and a grain-preserving isomorphism (section 6.3, p. 14). Thus checkout, which selects one version per entity, must precede declaring an all-versions dimension as an entity.

Verus form. Inference: model behavioral class with ghost markers or wrapper types and require proof of key uniqueness before changing the wrapper. A `proof fn` can establish injectivity and a re-lens postcondition. Verus does not infer semantic classes from Rust types automatically, so the operation library must encode them.

Evidence. The paper gives two real bug patterns: reading all SCD2 versions before an entity lookup creates spurious keys; selecting the latest line-item file instead of the latest order file misses deletions (section 6.6, pp. 16–17). PDD rejects both designs statically when the required class and key preconditions are modeled. These are examples, not a measured prevalence denominator.

## technique 4: proof-carrying domain constraints and generated queries

What it is. Domain rules are attached to operations as `(Pre, Intra, Post)` contracts. Composition discharges each intermediate `Post_i ⇒ Pre_{i+1}` obligation. Contract-derivable relations such as subset, grain equivalence, and key uniqueness can be discharged at design time; independent foreign keys, ranges, and arbitrary business predicates remain data-dependent.

Steps. (1) State constraints in the structured collection-relation vocabulary where possible. (2) Attach precondition, intra-state condition, and postcondition to each operation. (3) Compose with the proof-carrying `>>>` operator. (4) Prove every internal entailment. (5) Compile remaining predicates mechanically to checks: a universal predicate becomes a `WHERE NOT` query, a foreign key an anti-join, and uniqueness a `GROUP BY ... HAVING COUNT(*) > 1` query (sections 6.4–6.5, pp. 15–16). Each generated query returns an empty set exactly when its predicate holds; Theorem 6.5 states this equivalence.

Verus form. Inference: use `requires`/`ensures` contracts and proof lemmas for internal entailments. For external data, generate runtime validation code or ghost obligations at the input boundary. A Verus proof cannot establish facts about untrusted runtime input without preconditions; the PDD distinction between code correctness and data quality carries over.

Evidence and limits. Theorem 6.6 says that if behavioral typing, CalcG equality, and all internal entailments hold, every source satisfying `Pre` produces a target satisfying `Post` without data access (section 6.5, p. 16). The result is conditional on the specification capturing intent. The paper itself says the proof is silent on a property the engineer forgot to state (section 1, p. 3).

## technique 5: verification spectrum and proof-carrying agents

What it is. The same design can be checked at three strengths: runtime queries, a deployed type-level checker (`/pdd`), or machine-checked Agda/Lean 4 proofs. Stronger checking moves more obligations to design time and leaves only the untyped-input boundary at runtime (section 6.7, pp. 17–18).

For an agent workflow, the engineer reviews the denotational specification, while an untrusted agent instantiates pre-verified patterns and emits a certificate. The abstract says the agent “ships a machine-checkable correctness certificate—an Agda proof or an evidence ledger.” The human still validates the target denotation and business predicates.

Verus form. Inference: choose a corresponding assurance level: runtime tests, a Verus-aware contract checker, or fully checked Verus proof functions. Require the agent to return source plus proof artifacts, and review the specification before accepting the certificate. Verus’s checker and pinned libraries become trusted; generated Rust remains untrusted until verification succeeds.

## evaluation, trust, and product threat

The planned evaluation has five sanitized production case studies across ingestion, staging-to-landing, augmentation, and aggregation, with Entity, Event, MultiVersion, and Snapshot classes (Table 15, p. 19). It compares three arms: PDD with deployed `/pdd`, PDD mechanized in PDL/Agda, and direct LLM code generation without PDD (section 8.2, p. 19). Defects are seeded from a fixed taxonomy and mined from historical bugs; raters grade artifacts blind. No quantitative results are reported yet, so claims about defect reduction or zero-cost discharge remain proposed measurements.

Trusted components are the semantic specification, operation contracts, CalcG rules, type checker, proof assistant or `/pdd`, and the code-generation faithfulness theorem. The engine, data, and runtime are not proof of design correctness; runtime queries check only input preconditions. Inference: threat to agent-written verified Rust is high when specifications omit ownership, aliasing, or concurrency invariants, and moderate for the general pattern of typed composition. PDD shows how to make classes of errors unrepresentable and how to separate specification review from code review. VL should reuse the certificate and pre-verified pattern workflow, while adding Rust/Verus-specific denotations and proofs. Existing PDD already addresses design-time prevention for data pipelines; VL should not recreate grain checking as a generic contribution.

## techniques for the catalog

- denotational pipeline design: specify semantic types and derive executable operations from a typed algebra
- CalcG grain checking: compose finite grain rules and compare the result with the target before data access
- behavioral-class typing: reject invalid read/write transitions and require key evidence for re-graining
- proof-carrying constraints: compose `(Pre, Intra, Post)` contracts and compile residual predicates to faithful queries
- assurance spectrum: choose runtime, typed, or machine-checked evidence and require an agent certificate
Checked 2026-10-15 against paper karayannidis2026pdd: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
