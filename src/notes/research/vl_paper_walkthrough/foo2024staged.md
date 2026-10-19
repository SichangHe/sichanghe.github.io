# Staged Specification Logic for Verifying Higher-Order Imperative Programs
(authored by agents unless marked 🧑)
Tag: `foo2024staged`, [paper](https://arxiv.org/abs/2308.00988v2)

## scope and result

Foo, Song, and Chin introduce Higher-Order Staged Specification Logic (HSSL) for call-by-value higher-order programs with mutable references. The abstract states: “Multiple stages allow the behavior of unknown function-type parameters to be captured abstractly as uninterpreted relations; and can also model the repetitive behavior of each recursion as a separate stage.” (Abstract, p. 1). Their prototype, Heifer, normalizes staged formulas, generates first-order verification conditions, and discharges entailments with SMT (Sections 3–6, pp. 7–13).

Inference: a possible Verus adaptation would record intermediate effects around closure calls using ghost state and explicit contracts. This paper neither presents nor validates such an encoding; its implementation targets a subset of OCaml.

## technique 1: staged specifications for unknown effectful calls

What it is. A staged formula is a sequence or disjunction of `req`, `ens`, and function stages. Each stage asserts something about program state at a specific point, so an unknown function can be placed between effects before and after it. In the `hello` example, the paper writes five stages, including “Stage 3: unknown higher-order f call” (Section 2.1, p. 2).

When to use it. Use stages when a higher-order argument may mutate captured state or when callers need the ordering of effects around that call. The motivation is to defer abstraction of an unknown function until its behavior is known at a call site (Section 2.2, p. 3).

How to apply it.
1. Introduce a relation for the unknown function call, with an explicit result variable (Section 2.1, p. 2).
2. Add a `req` stage for resources that must exist before the first effect, then an `ens` stage for each known update (Section 2.1, p. 2).
3. Place the unknown call as its own function stage between the surrounding effects (Section 2.1, p. 2).
4. Add post-call requirements and final `ens[res]` state, including the relation between the result and ghost values (Section 2.1, p. 2).
5. At a call site where the function is known, instantiate its staged relation and compact the resulting formula (Sections 2.1 and 3.2, pp. 3, 9–10).

Inference: a Verus experiment could represent abstract effects with ghost variables and a logical relation, and expose the permissions needed for captured memory. Whether this preserves HSSL's semantics would require a separate argument.

Evidence and limits. The authors show `foldr` with a recursive staged predicate, allowing the call to unknown `f` directly in the recursive case (Section 2.2, pp. 3–4). They summarize three cases that the particular Iris specification in Section 1 cannot handle: mutation of referenced list elements, a precondition involving suffix sums, and an exception path (Section 2.2, pp. 4–5). The logic models unknown functions conservatively; the paper says, “As mentioned before, f can modify x despite not having direct access to it via an argument, as it could capture x from the environment of the caller of hello.” (Section 2.1, p. 3). Inference: this over-approximation can make client proofs weaker, and its soundness relies on the semantics of staged relations and heap separation.

## technique 2: biabduction-based normalization and compaction

What it is. Normalization rewrites a staged sequence into a compact disjunction of flows. It merges adjacent requirements and postconditions and uses biabduction to move a later requirement left across an earlier postcondition. The authors state: “Compaction is also useful for aligning staged formulae, allowing entailment proofs to be carried out stage by stage; we elaborate on this use in Section 5.” (Section 3.2, p. 9).

How to apply it.
1. Remove `emp` identities and stop after `ens false`, which denotes an unreachable or nonterminating path (Figure 6, p. 9).
2. Merge `req D1; req D2` into `req (D1 * D2)` and consecutive `ens` stages into one postcondition (Figure 6, p. 9).
3. For `ens D1; req D2`, solve a biabduction problem `DA * D1 ⊢ D2 * DF`; emit `req DA; ens DF` (Figure 6, p. 9). The presentation states: “The given rule assumes that D1 and D2 are disjoint” (Section 3.2, p. 10); Appendix D treats additional aliasing cases using intersection specifications (pp. 22–23).
4. Distribute sequencing over disjunctions. Each normalized flow consists of function stages, each preceded by a requirement/postcondition pair, then a final requirement/postcondition pair. Existential quantifiers bind intermediate values (Section 3.2, p. 10).
5. Use Theorem 1 to rely on semantic preservation of each rewrite (Section 3.2, p. 10).

Inference: a manual adaptation could make missing resources explicit in a function contract and prove preservation of the frame with lemmas. This is a proposed use of the normalization idea, not an evaluated Verus implementation.

Evidence. Figure 7 moves `ens x ↦ 1 * y ↦ 2; req x ↦ a` to `req a=1; ens y ↦ 2`, then combines postconditions. The paper states: “Normalization is sound in the sense that it transforms staged formulae without changing their meaning.” (Section 3.2, p. 10). Inference: the theorem covers the logic's semantics, not the soundness of any Verus encoding.

## technique 3: forward rules and staged entailment

What it is. Heifer derives a program summary by forward rules analogous to strongest-postcondition reasoning, then proves summary subsumption against the user specification. The Call rule records an unknown call without immediately proving its precondition; entailment later unfolds a known specification (Section 4, pp. 10–12).

How to apply it.
1. Start with an empty staged history and apply `Val`, `Ref`, `Deref`, `Assign`, `If`, and `Let` rules to produce a summary (Figure 8, p. 11).
2. For a lambda, summarize its body from pure context and require the body summary to be subsumed by the annotation (Figure 8, p. 11).
3. For an unknown call, append a function stage with fresh result rather than guessing a precondition (Figure 8, p. 11).
4. Normalize the summary, unfold known predicates, and apply `EntReq` contravariantly to requirements and `EntEns` covariantly to postconditions (Section 5, p. 12).
5. Propagate residual separation frames between requirement/postcondition stages. Across an unknown function stage, retain only pure information because the call may invalidate heap assumptions (Appendix G.1, p. 26). Reduce separation entailments to first-order implications for SMT using location matching and the `xpure` heap abstraction (Appendix G.1, p. 27).
6. For recursive staged predicates, supply a suitably generalized subsumption lemma, prove it inductively, and rewrite recursive calls with the induction hypothesis before further unfolding and compaction. Appendix H infers a suitable hypothesis for its `applyN` example heuristically, but says: “In general, it would have to be provided by the user as a lemma (for re-summarization).” (p. 28).

Inference: reproducing these rules in a Rust verifier would require an encoding of staged summaries and a procedure or lemmas for proving their subsumption. This paper does not establish that existing Verus contracts implement delayed precondition checking.

Evidence and assumptions. The paper says: “We prove soundness of these rules, which is to say that derived specifications faithfully overapproximate the programs they are derived from.” (Section 4, p. 12). Entailment soundness is Theorem 2 (Section 5, p. 13). The authors state: “However, completeness is yet to be established.” (Section 4, p. 12). Appendix I.8 also bounds new staged predicate definitions and unfoldings, returning failure when either bound is exceeded (p. 33).

## evaluation and limits

Heifer verifies 13 small programs involving maps, folds, iterators, composition, closures, and counters. Table 1 reports 197 lines of code and 73 lines of specifications in total, with per-program verification times from 0.11 to 1.25 seconds; `TP` measures time spent on external provers (Table 1, pp. 13–14). The authors compare Cameleer and Prusti, but many Prusti programs are marked incomparable because of missing `impl Trait` and ML-list support (Section 6, p. 14). Their reported average specification/code ratio for Heifer is 0.37, versus 2.49 for Cameleer and 0.73 for the selected Prusti artifact programs (Section 6, p. 14). The table totals are 73/197 for Heifer, 112/45 for Cameleer, and 27/37 for Prusti, covering different supported subsets. Inference: these ratios do not measure proof effort for arbitrary Rust.

The implementation description says: “Here, our prototype targets SMT encodings via Why3 [12].” and “As an optimization, it uses Z3 [9] directly for queries which do not require Why3’s added features.” (Section 6, p. 13). Its evaluation is explicitly limited: “As the focus of our work is to explore a new program logic and subsumption-based verification methodology (rather than to verify existing programs), the benchmarks are small in size, and are meant to illustrate the style of specification and give a flavor of the potential for automation.” (Section 6, p. 13).

Inference: HSSL is relevant prior work for ordering effects around unknown higher-order calls. A claim of novelty for VL in this area should distinguish its contribution from staged specifications. A usable, sound Rust/Verus encoding and evidence about proof maintenance would require additional work beyond this paper.

## techniques for the catalog

- staged higher-order contracts: record requirements, updates, unknown calls, and final results as an ordered trace formula
- biabductive normalization: compact staged flows by merging compatible stages and inferring missing frames across requirements
- forward staged verification: summarize each expression with sound rules and prove summary subsumption by entailment
- recursive staged summarization: unfold recursion and re-summarize at call sites to recover compact client contracts
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "As an optimization, it uses Z3 [9] directly for queries which do not require Why3’s added features."): read all 33 pages, including references and appendices; checked quotations, numbers, references, and technique steps; corrected the link to the arXiv identifier in the paper, Iris comparison scope, normalization form, heap-frame propagation, theorem page, and benchmark interpretation; removed unsupported CHC/trusted-base and Verus feature claims; did not independently validate proofs, run Heifer or benchmarks, or test the proposed Rust/Verus adaptations.
