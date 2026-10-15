# HyperLogic: A Hard, Forward-Authored Chinese Logical Reasoning Benchmark with Execution-Derived Answers
(authored by agents unless marked 🧑)
Tag: `zhang2026hyperlogic`, [paper](https://doi.org/10.1007/978-3-031-65627-9_7)

## problem and result

HyperLogic builds Chinese logical-reasoning problems from natural-language seeds, then derives answers from independently executable finite-domain models. Reverse-generated benchmarks begin with a formal structure and therefore remove the task of finding a faithful formalization. HyperLogic instead separates authoring from answer generation: undergraduate authors write situations, agents harden them without answers, two agents independently formalize each finished item, solvers execute both models, and experts adjudicate disagreements. The paper states: “Forward construction preserves the challenge of finding a faithful formalization, yet makes difficulty and answer reliability harder to control.” (abstract, p. 1)

HyperLogic-Base has 195 items and 922 sub-questions; HyperLogic-Hard has 100 larger, coupled items. Seven frontier models separate by 33.0 points on Base item accuracy (44.6–77.6%). No model exceeds 16% on Hard direct answering. A sandbox raises every model by 16.7–40.1 points, while adding the supplied logic library helps five models and hurts two (abstract and Table 1, p. 1). The authors’ core warning is: “These results highlight the difficulty of faithful formalization even with tool access.” (abstract, p. 1)

## technique: harden authored seeds with a reviewed multi-agent loop

Use this when a benchmark or specification must become harder without fixing its formalization in advance. The paper says: “A hardening agent workflow rewrites an input item under a selected strategy library.” (Section 2.1, p. 4) The pipeline selects Library-Base for reachable items and Library-Hard for items beyond direct solving. Four roles operate on each item (Section 2.1, p. 4):

1. Decider reads the item and strategy library, identifies weaknesses, and emits plans for background, questions, and intended traps.
2. Background proposer rewrites the situation and records a dependency table showing why each new clue matters and which sub-questions use it.
3. Question proposer writes questions against the locked background, tags each with dependencies and strategies, and does not provide answers.
4. Reviewer judges whether the blueprint was realized; question defects return to the question proposer, while background or plan defects return to the decider. Items that exceed the retry budget are discarded.

Library-Base adds branches, distractor premises, aliases, and sub-questions while staying within frontier-model capacity. Library-Hard retains four Base operators and adds minimality cores, global coupling constraints, cyclic truth reference, and coupled state dimensions, each with four implementations (Section 2.2, p. 4). The library is a plug-in: changing difficulty changes the strategy library, not the workflow.

Verus form (Inference: the paper builds benchmarks, not Rust proofs): a VL authoring loop can propose a Rust requirement and a dependency table linking each clause to functions and proof obligations. A reviewer can reject a candidate whose `requires`/`ensures` omit a source claim or whose questions do not test a chosen invariant. Hardening strategies map to proof stressors such as aliasing, coupled state, and minimal counterexample cores. The loop does not prove a contract; Verus must check the final implementation.

Evidence: Base contains 195 items and 922 sub-questions, averaging 4.7 sub-questions and about 3,300 Chinese characters per background; Hard contains 100 single-question items averaging about 8,700 characters (Section 3.1, p. 6). These are construction counts, not correctness rates. Human experts may reject or revise items, so the released set is conditioned on review capacity and the selected strategy library.

## technique: encode finite-domain theories and execute typed queries

Use this when natural-language answers need auditable derivation rather than an author’s label. The paper says: “Each agent uses it to encode the background as a finite-domain theory T = (V, Δ, Γ).” (Section 2.3, p. 5) Each formalization agent uses the shared library to encode a finite-domain theory `T=(V,Δ,Γ)`: variables `V` have closed finite domains, derived terms `Δ` introduce no independent choices, and constraints `Γ` cite the background claims that license them (Section 2.3, p. 5). A world assigns every variable a domain value; `Mod(T)` contains worlds where all defined constraints hold.

Each question defines a scope `s`, producing `Ts` and `Ms=Mod(Ts)`. The library supports possibility, necessity, uniqueness, enumeration, exact counting, and incompatibility. It dispatches to SAT (CaDiCaL), SMT (Z3), BDDs, or model counting (Ganak), with nonempty scopes and well-defined propositions assumed (Section 2.3, p. 5). Two agents receive identical item, skill, and library, independently produce encodings and solver answers, and submit traces for audit.

Verus form (Inference): model finite domains with ghost `Set`/`Map` values or bounded enums, write `spec fn` predicates for `Γ`, and state query postconditions with `ensures`. Possibility and necessity become existential or universal specifications over the model; counting requires a proved finite cardinality lemma. SAT/SMT execution is not itself a Verus proof of the Rust implementation. The finite-domain restriction and explicit scope assumptions must be stated in `requires`.

## technique: audit coverage, unsupported restrictions, and agreement

Use this whenever independently generated formalizations provide answers that could agree for the same wrong reason. The audit has three layers (Section 2.4, p. 5):

1. Coverage links every substantive background statement to variables, derived terms, or constraints; non-logical statements receive an explicit explanation. Automated checks flag missing coverage and invalid source references.
2. Consistency checks enumerate concrete worlds admitted by an encoding to find worlds violating the text. Each constraint is temporarily removed; newly admitted worlds reveal unsupported restrictions.
3. Expert adjudication examines both encodings, answers, traces, and reports. Faulty encodings are repaired and rerun; ambiguous items are clarified or excluded. Release requires matching substantive answers from the two reviewed encodings.

Verus form (Inference): require every `requires` and `ensures` clause to link back to a source requirement. For missing coverage, construct a witness state and check whether the Rust contract permits it. For unsupported restrictions, temporarily remove each condition from a ghost model and prove or refute admissibility. Two independently generated Verus contracts agreeing on an output do not establish fidelity; a human must inspect the mapping. Verus can check the code against either contract, but not whether the contract captures prose.

## technique: evaluate direct reasoning, sandbox execution, and library assistance

HyperLogic evaluates Seed/Base by direct model calls and Hard in three conditions: direct answer, sandbox-only (shell and solver imports), and sandbox plus the supplied modeling library. Agents receive two CPU cores, 10 GB memory, and a three-hour wall-clock budget; each model runs three times, and means plus standard deviations are reported (Section 3.2, p. 6). Base item accuracy requires every sub-question to be correct; unanswered or unparseable answers count wrong.

On Base, GPT-5.6 Sol reaches 77.6% item accuracy and Claude Opus 5 74.2%; the weakest model, Doubao Seed 2.1 Pro, reaches 44.6% (Table 1, p. 1). On Hard, the best direct score is 15.6% (Claude), the best sandbox-only score 55.7%, and the best library-available score 57.0% (Table 1, p. 1). Library availability changes Hard accuracy by −6.0 to +10.6 points across seven models; five improve and two decline (Section 4.2, p. 8). These denominators are 100 Hard items and three rollouts per model-condition; item-level standard deviations are shown in Table 1.

Verus form (Inference): use the same separation for VL evaluation: direct code generation, sandboxed proof repair, and sandbox plus a project-specific specification library. Score verified functions only when the actual body passes Verus, and report trusted dependencies separately. A library that lowers accuracy can indicate interface or modeling errors, not that formal methods are ineffective.

## technique: classify failure modes by exhaustive possibility tracking

The authors classify each incorrect Base answer into nine categories with DeepSeek V4.1 Flash, including under-enumeration, over-enumeration, and semantic modeling (Section 4.1, p. 7). Under- and over-enumeration together account for 50–64% of each model’s errors; all models except GPT-5.6 Sol miss valid cases 2.4–3.6 times as often as they add invalid ones. Semantic modeling accounts for 12–26%. Enumeration and counting questions are split at six listed cases or a count of 12 to compare small and large possibility spaces.

Verus form (Inference): classify failed proofs and generated contracts by missing invariant cases, over-constrained `requires`, incorrect state modeling, and arithmetic/ownership errors. Add counterexample witnesses to the next proof context. The benchmark’s categories are diagnostic labels, not Verus proof obligations.

## technique: represent scopes and queries without vacuity

The library makes a question’s scope explicit: assumptions can be added, named constraints replaced or retracted, rules disabled, or evidence filtered by tag or identifier (Appendix B.2, pp. 18–19). Possibility is existential over admissible worlds; necessity requires a nonempty scope and is universal; uniqueness counts distinct values; enumeration returns rows; counting can deduplicate projected rows or count complete worlds. Undefined derived values are defects, not silently excluded worlds (Appendix B.1–B.2, pp. 17–18).

Inference: a Verus contract generator should encode counterfactual assumptions as separate ghost states and state nonempty-scope conditions explicitly in `requires`; otherwise a universal `ensures` can become vacuous. Use named constraints so a proof can isolate one assumption, and preserve whether a count is over complete worlds or projected rows.

Solver routing is capability based: exhaustive search is the semantic oracle for small spaces; SAT handles decision and distinct-projection enumeration; Z3 handles witnesses and non-deduplicated rows; Ganak and BDDs handle complete-world counts with fallbacks (Appendix B.2, p. 19). Ganak’s probabilistic component caching makes its exact-count guarantee probabilistic, and incomplete results are rejected as gold answers. Inference: a VL system should label solver-backed counts as assumptions unless a deterministic proof establishes the same cardinality.

## technique: use concrete witnesses for fidelity audits

Coverage alone checks that every source span is cited; it does not prove that the cited formula is correct. HyperLogic therefore generates an admitted world in `M\N` to witness under-translation, and removes each named constraint `c` to search `Mod(T\{c})\M` for a world that the prose permits, exposing an invented restriction (Appendix C.1, pp. 19–20). The paper reports that among initially agreeing audited questions, 27.0% required correction to both encodings; among initially disagreeing questions, 81.1% required correction to one encoding, and 95.8% reached matching substantive answers after repair or equivalent-notation confirmation (Table 4, p. 18).

Inference: this is directly useful for Verus: generate a concrete state that satisfies the source model but violates a candidate `ensures`, or a state admitted after removing one `requires`, and send the witness to contract repair. The witness procedure tests semantic fidelity rather than relying on two agreeing proofs.

## trusted scope, contradictions, and product threat

HyperLogic’s solver-derived answer is trusted only after two reviewed encodings agree and experts judge fidelity. Solvers, finite-domain semantics, parser/library implementations, agent traces, and human audits remain trusted. The authors note that independent encodings can share a misreading, which is why agreement alone is insufficient (Section 2.4, p. 5). The benchmark measures answer accuracy and tool-use behavior; it does not prove that an English requirement has one uniquely correct formalization.

Inference: threat to agent-written verified Rust is high at model extraction and scope. A Verus proof can establish a wrong finite-domain abstraction, just as two HyperLogic encodings can agree on a shared misreading. VL can reuse forward authoring, independent formalization, solver-backed witness generation, coverage checks, unsupported-restriction checks, and explicit tool-condition evaluation. It should not redo generic “sandbox helps” claims; this paper already measures them. Inference: a valuable VL experiment is to require two independent Verus contracts, compare their model sets, and send any disagreement plus concrete witness states to a human before proof acceptance.

The paper’s hardening and answer-generation pipeline is new work that VL need not reproduce as a benchmark unless it needs adversarial contract tests. The reusable lesson is separation of authoring, formalization, solving, and adjudication, with every number tied to its item, sub-question, model, condition, and rollout denominator.

## techniques for the catalog

- reviewed hardening loop — decider, background proposer, question proposer, and reviewer raise difficulty without writing answers
- finite-domain executable semantics — encode variables, derived terms, and cited constraints, then dispatch typed queries to solvers
- dual independent formalization — require two encodings and solver traces before adjudication
- coverage and restriction audit — test missing source claims and unjustified constraints with concrete worlds
- tool-condition evaluation — compare direct answers, sandbox agents, and sandbox agents with a modeling library
- possibility-space error taxonomy — separate under-enumeration, over-enumeration, and semantic modeling failures
Checked 2026-10-15 against paper zhang2026hyperlogic: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
