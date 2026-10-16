# Staged Specification Logic for Verifying Higher-Order Imperative Programs
(authored by agents unless marked 🧑)
Tag: `foo2024staged`, [paper](https://doi.org/10.1007/978-3-031-71162-6_26)

## scope and result

Foo, Song, and Chin introduce Higher-Order Staged Specification Logic (HSSL) for call-by-value higher-order programs with mutable references. The abstract states: “Multiple stages allow the behavior of unknown function-type parameters to be captured abstractly as uninterpreted relations; and can also model the repetitive behavior of each recursion as a separate stage.” (Abstract, p. 1). Their prototype, Heifer, normalizes staged formulas, generates first-order verification conditions, and discharges entailments with SMT (Sections 3–6, pp. 7–13).

Inference: the closest Verus analogue is a specification that records intermediate effects around a closure call, rather than only one pre/post pair. Verus has `requires`, `ensures`, `assert`, `proof fn`, and loop invariants, but the referenced Verus material does not define HSSL stages or uninterpreted higher-order relations. A translation therefore requires ghost state and explicit closure contracts; it is an inference, not a feature claim about current Verus.

## technique 1: staged specifications for unknown effectful calls

What it is. A staged formula is a sequence or disjunction of `req`, `ens`, and function stages. Each stage describes a concrete point in the execution trace, so an unknown function can be placed between effects before and after it. In the `hello` example, the paper writes five stages, including “Stage 3: unknown higher-order f call” (Section 2.1, p. 2).

When to use it. Use stages when a higher-order argument may mutate captured state or when callers need the ordering of effects around that call. A two-stage pre/post contract loses this temporal information.

How to apply it.
1. Introduce a relation for the unknown function call, with an explicit result variable (Section 2.1, p. 2).
2. Add a `req` stage for resources that must exist before the first effect, then an `ens` stage for each known update (Section 2.1, p. 2).
3. Place the unknown call as its own function stage between the surrounding effects (Section 2.1, p. 2).
4. Add post-call requirements and final `ens[res]` state, including the relation between the result and ghost values (Section 2.1, p. 2).
5. At a call site where the function is known, instantiate its staged relation and compact the resulting formula (Sections 2.1 and 3.2, pp. 2, 9–10).

Inference: in Verus, represent the closure's abstract effect with ghost variables and a proof-level relation, then state the concrete function's `requires`/`ensures`. A closure that mutates captured memory must expose the relevant permission or state invariant. HSSL's function-stage syntax cannot be copied into Verus.

Evidence and limits. The authors show `foldr` with a recursive staged predicate, allowing the call to unknown `f` directly in the recursive case (Section 2.2, pp. 3–4). They summarize three cases that ordinary Iris pre/post specifications cannot handle: mutation of the input list, a precondition involving a computed sum, and an exception path (Section 2.2, pp. 4–5). The logic models unknown functions conservatively; the paper says, “As mentioned before, f can modify x despite not having direct access to it via an argument” (Section 2.1, p. 3). Inference: this over-approximation can make client proofs weaker, and its soundness relies on the semantics of staged relations and heap separation.

## technique 2: biabduction-based normalization and compaction

What it is. Normalization rewrites a staged sequence into a compact disjunction of flows. It merges adjacent requirements and postconditions and uses biabduction to move a later requirement left across an earlier postcondition. The authors state: “Compaction is also useful for aligning staged formulae, allowing entailment proofs to be carried out stage by stage.” (Section 3.2, p. 9).

How to apply it.
1. Remove `emp` identities and stop after `ens false`, which denotes an unreachable or nonterminating path (Figure 6, p. 9).
2. Merge `req D1; req D2` into `req (D1 * D2)` and consecutive `ens` stages into one postcondition (Figure 6, p. 9).
3. For `ens D1; req D2`, solve a biabduction problem `DA * D1 ⊢ D2 * DF`; emit `req DA; ens DF` (Figure 6, p. 9).
4. Distribute sequencing over disjunctions and unfold non-recursive staged predicates until every flow has function stages followed by a final requirement/postcondition (Section 3.2, p. 10).
5. Use Theorem 1 to rely on semantic preservation of each rewrite (Section 3.2, p. 10).

Inference: Verus's ownership and separation reasoning can encode the frame and antiframe as ghost facts, but there is no Verus `biabduction` command in the referenced material. The practical replacement is to state the missing resources in `requires` and prove the frame facts with lemmas.

Evidence. Figure 7 moves `ens x ↦ 1 * y ↦ 2; req x ↦ a` to `req a=1; ens y ↦ 2`, then combines postconditions. The paper states: “Normalization is sound in the sense that it transforms staged formulae without changing their meaning.” (Section 3.2, p. 10). Inference: the theorem covers the logic's semantics, not the soundness of any Verus encoding.

## technique 3: forward rules and staged entailment

What it is. Heifer derives a program summary by forward rules analogous to strongest-postcondition reasoning, then proves summary subsumption against the user specification. The Call rule records an unknown call without immediately proving its precondition; entailment later unfolds a known specification (Section 4, pp. 10–12).

How to apply it.
1. Start with an empty staged history and apply `Val`, `Ref`, `Deref`, `Assign`, `If`, and `Let` rules to produce a summary (Figure 8, p. 11).
2. For a lambda, summarize its body from pure context and require the body summary to be subsumed by the annotation (Figure 8, p. 11).
3. For an unknown call, append a function stage with fresh result rather than guessing a precondition (Figure 8, p. 11).
4. Normalize the summary, unfold known predicates, and apply `EntReq` contravariantly to requirements and `EntEns` covariantly to postconditions (Section 5, p. 12).
5. Propagate residual separation frames through the entailment proof and use SMT for pure side conditions (Section 5, p. 12).

Inference: a Verus checker can use executable code plus ghost summaries and lemma proofs. `assert` and `ensures` correspond to local obligations, while `requires` and loop invariants carry the preconditions that HSSL delays. The staged entailment algorithm itself would be a separate verifier front end.

Evidence and assumptions. The paper says: “We prove soundness of these rules, which is to say that derived specifications faithfully overapproximate the programs they are derived from.” (Section 4, p. 12). Entailment soundness is Theorem 2 (Section 5, p. 12). Completeness is explicitly not established (Section 4, p. 12).

## evaluation and limits

Heifer verifies 13 small programs involving maps, folds, iterators, composition, closures, and counters. Table 1 reports 197 lines of code and 73 lines of specifications in total, with per-program verification times from 0.11 to 1.25 seconds; Why3 and external solvers account for the `TP` portion (Table 1, pp. 13–14). The authors compare Cameleer and Prusti, but many Prusti programs are marked incomparable because of missing `impl Trait` and ML-list support (Section 6, p. 14). Their reported average specification/code ratio for Heifer is 0.37, versus 2.49 for Cameleer and 0.73 for the selected Prusti artifact programs (Section 6, p. 14). These denominators are lines of user specifications divided by program lines in the listed benchmark suite, not proof effort for arbitrary Rust.

The trusted base includes the OCaml-to-CHC front end, Why3, Z3, the staged semantics, and user-provided pure predicates and lemmas. Inference: libraries, compiler behavior, and the correctness of the chosen specifications remain outside the stated theorems. The paper itself says the benchmarks “are meant to illustrate the style of specification and give a flavor of the potential for automation.” (Section 6, p. 13).

Inference: threat to agent-written verified Rust is moderate for closure-heavy APIs and mutable iterators. HSSL already solves temporal ordering and abstraction of unknown effects, so VL should not claim those as new without a Rust-specific encoding and evidence. The gap is a verified, usable translation into Verus ownership, closure traits, and executable Rust, plus proof maintenance under changing APIs.

## techniques for the catalog

- staged higher-order contracts: record requirements, updates, unknown calls, and final results as an ordered trace formula
- biabductive normalization: compact staged flows by merging compatible stages and inferring missing frames across requirements
- forward staged verification: summarize each expression with sound rules and prove summary subsumption by entailment
- recursive staged summarization: unfold recursion and re-summarize at call sites to recover compact client contracts
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
