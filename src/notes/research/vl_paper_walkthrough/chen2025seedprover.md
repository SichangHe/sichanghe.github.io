# Seed-Prover: Deep and Broad Reasoning for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `chen2025seedprover`, [paper](https://www.semanticscholar.org/paper/c98038be92c3d8bf0e2150f702830373ba708586)

## scope and result

Seed-Prover is a Lean 4 whole-proof model organized around reusable lemmas, iterative compiler feedback, self-summaries, and three inference budgets. It also introduces Seed-Geometry, a separate domain-specific geometry engine. The abstract says: “Seed-Prover can iteratively refine its proof based on Lean feedback, proved lemmas, and self-summarization.” (Abstract, p. 1.) It reports 78.1% of formalized past IMO problems, 99.6% on MiniF2F test, and 331/657 on PutnamBench under its stated settings (Table 3, p. 8).

Lean verification is the acceptance test. It establishes the formal theorem under Lean v4.14.0 and its Mathlib version (v4.16.0 for the MiniCTX-v2 experiment), not the intended meaning of a natural-language problem or the correctness of a Rust implementation. Inference: VL can transfer the decomposition and feedback loops, but its agents must generate Rust/Verus contracts and use only supported Verus constructs.

## technique 1: lemma-style whole-proof generation and a lemma pool

what it is and when to use it. Generate useful intermediate `lemma` declarations before the final `theorem`, compile them independently, and retain them for later attempts. This is useful when a monolithic proof exceeds the model context or when several reasoning paths can share facts. The paper says: “Seed-Prover tries to generate useful intermediate lemmas before proving the main statement.” (Introduction, p. 2.)

how to do it. (1) Start with the Lean theorem statement. (2) Propose one or more helper lemmas. (3) Generate and verify each lemma independently. (4) Add successful lemmas to a pool containing statement, name, complete proof, proof difficulty, and dependency relations. (5) Retrieve relevant lemmas by name or formal statement for subsequent attempts. (6) Sample difficult lemmas when a main proof stalls. (7) Produce the final theorem using the verified pool entries. Figure 2 contrasts a monolithic `have` proof with `lemma round1_h0` and `lemma round1_h1`, then uses those lemmas in the theorem (p. 4).

Verus form. Inference: create helper `proof fn`s with precise postconditions and call them from the verified Rust function. Store the source, contracts, and dependencies in a lemma pool keyed by the exact Verus/Rust context. Proof functions are erased and cannot be called at runtime. A helper is reusable only when its `requires` assumptions are satisfied; a cached statement must not be weakened merely to make it easy to prove.

evidence and limits. Lemma modularity is an architectural claim supported by the workflow and examples. The benchmark gains combine lemmas with other training and inference strategies, so they do not isolate the pool's effect. The pool can grow stale after library or toolchain changes and can contain mathematically irrelevant but formally valid facts.

## technique 2: conjecture proposing for broad exploration

what it is and when to use it. Generate many candidate properties of an unsolved problem without committing to one proof strategy. This is useful when direct reasoning misses a useful invariant or structural fact. The proposer generates 10–50 candidate conjectures per call, and the process can be repeated to create a large pool (Section 2.2.2, p. 4).

how to do it. (1) Give the unsolved problem and optionally proved lemmas to the proposer. (2) Generate 10–50 property conjectures in parallel. (3) Repeat to populate a conjecture pool. (4) Use the light inference setting to prove or disprove candidates. (5) Move proved conjectures into the lemma pool and use them in later proof attempts. This differs from a proof sketch that presumes a solution: it explores properties before full resolution (Section 2.2.2, p. 4).

Verus form. Inference: ask an agent to propose candidate invariants, algebraic facts, ownership relations, or postcondition-strengthening lemmas for a Rust function. Check each candidate with Verus before adding it to the pool. Candidate generation is not evidence; only a verified helper with non-vacuous assumptions can guide later proof search.

evidence and limits. The paper describes the mechanism but does not give a separate ablation of conjecturing. Thousands of candidates are expensive, and many are irrelevant. The system scores later lemmas by proof rate, semantic relevance, and proof length; an LLM judge supplies relevance, so that score is heuristic (Section 2.2.4, p. 6).

## technique 3: multi-stage RL with formal and contextual feedback

what it is and when to use it. Train with reinforcement learning whose reward comes from Lean verification, while varying the prompt context so the model learns to use feedback, failed attempts, summaries, and retrieved lemmas. The paper uses VAPO and states: “The RL reward is 1 if the formal statement is successfully proven, and 0 otherwise.” (Section 2.2.3, p. 5.) A formatting penalty encourages lemmas before the main theorem.

how to do it. (1) Mix open-source and in-house formalized problems. (2) Exclude problems whose proof rate is above 1/4, so RL sees tasks with learning signal. (3) Gradually increase problem difficulty, quality, and maximum output length. (4) Randomly include natural-language hints/proofs, similar or proved lemmas, failed lemmas, failed attempts, summaries, and Lean compiler feedback. (5) Apply reward 1 for a verified statement and 0 otherwise, plus the formatting penalty. (6) For single-pass-hard problems, use the conjecture proposer to create easier variants for training (Section 2.2.3, p. 5).

Verus form. Inference: build trajectories that include Verus diagnostics, prior proof functions, failed obligations, and summaries. Reward only a verified, non-vacuous contract. Keep reward metadata separate from the proof source so a model cannot optimize a formatting score while weakening `ensures`. A Verus timeout or solver failure may be logged separately even if the training reward is binary.

evidence and limits. The paper's reported pass rates mix RL with inference scaling and benchmark curation. It excludes easy examples and therefore does not estimate an unconditional distribution of Rust programs. Formal feedback is exact for the checked statement but silent about specification adequacy and external dependencies.

## technique 4: light iterative refinement

what it is and when to use it. Generate a whole proof, run Lean, summarize the failure, and regenerate with the feedback up to 8–16 times. This extends a short per-attempt budget by iterating rather than sampling independent proofs. The paper states: “In the light setting, each proof attempt is refined up to 8–16 times and evaluated under Pass@8–16.” (Section 2.2.4, p. 5).

how to do it. (1) Generate a proof candidate. (2) Run Lean. (3) If it fails, include compiler feedback and a self-summary in the next prompt. (4) Repeat up to 8–16 refinements for each of 8–16 initial attempts. (5) Stop when a proof verifies or the budget is exhausted. The authors call `n × m` the sample budget for Pass@n with up to m refinements; they report that IMO 2022 P2 is solved in this setting although it requires Pass@8192 without refinement (Section 2.2.4, p. 5).

Verus form. Inference: regenerate the Rust/Verus item from the last source plus diagnostics, preserving verified helper functions and contracts. Re-run Verus on the complete item after each edit. A textual summary cannot replace the actual loop `invariant` or ownership context; avoid treating compiler prose as a logical fact.

evidence and limits. The IMO 2022 P2 comparison is a single problem and does not establish a general multiplier. Iterative summaries may drift from the real state, and retries can repeatedly reproduce the same failed proof.

## technique 5: medium nested refinement

what it is and when to use it. Add an inner search for difficult lemmas generated by an outer proof refinement. This supplies depth without forcing the main model to solve every subgoal in one context.

how to do it. (1) Run outer light-style refinement on the main problem. (2) Identify generated lemmas that remain unproved. (3) For each, run an inner light search with an 8 × 8 budget. (4) If any inner search proves a lemma, add it to the prompt and continue outer refinement. (5) Stop on a verified theorem or exhausted budget. The method produced proofs potentially exceeding 1,000 lines and solved examples including IMO 2003 P6, IMO 2020 P5, IMO 2024 P1, and IMO 2025 P5 (Section 2.2.4, p. 6).

Verus form. Inference: treat each unresolved Rust obligation as a child proof task. Prove helper `proof fn`s under exact preconditions, then re-run the parent function with those lemmas. Preserve borrow and lifetime context in each child task; independently proved arithmetic facts do not automatically solve aliasing obligations.

evidence and limits. The paper gives examples rather than a controlled comparison of inner versus outer refinement. Nested calls increase compute and can overfit to a particular solver context.

## technique 6: heavy broad search and lemma ranking

what it is and when to use it. Populate a conjecture pool with thousands of candidates, verify them in parallel through light inference, then select a few hundred useful lemmas for a final medium search. Use it when depth alone cannot discover the right property. The paper says: “Initially, the proposer generates thousands of conjectures (by default 5000) to populate the conjecture pool.” (Section 2.2.4, p. 6.)

how to do it. (1) Generate 5,000 conjectures by default. (2) Attempt to prove or disprove each with light inference. (3) Move verified conjectures to the lemma pool. (4) Propose additional conjectures conditioned on proved lemmas. (5) Score each lemma by proof rate, semantic relevance, and proof length. (6) Remove unrelated or short lemmas; the authors observe low-proof-rate lemmas are often crucial. (7) Use hundreds of top-ranked lemmas in medium inference for the main theorem. The workflow is shown in Figure 4 (p. 6).

Verus form. Inference: generate a bounded set of candidate invariants and helper contracts, verify them in isolated Verus runs, and rank by reuse, proof cost, and relevance. The ranking service is trusted infrastructure; every selected lemma still requires fresh verification in the target module. Do not use an `external_body` helper to inflate the pool.

evidence and limits. Heavy inference proves IMO 2017 P2, IMO 2025 P3, and IMO 2025 P4 (Section 2.2.4, p. 6), but the paper does not provide a denominator for the heavy-search success rate. Thousands of candidates can create solver load and may select formally true but product-irrelevant facts.

## technique 7: Seed-Geometry's symbolic forward chaining and beam search

what it is and when to use it. Seed-Geometry addresses geometry by combining a domain-specific construction language, a symbolic rule engine, and a neural policy that proposes missing auxiliary constructions. It is appropriate for a constrained geometry domain with explicit construction and derivation rules.

how to do it. (1) Represent ruler-and-compass constructions using composite actions such as isogonal conjugate and circle similitude centers. (2) Canonicalize a new problem. (3) Forward-chain all applicable rules; if the goal fact appears, stop. (4) Otherwise use the policy model to propose auxiliary elements for each beam. (5) Execute each proposal in the fast C++/Pybind11 engine. (6) Retain top proposals by cumulative negative log likelihood and expand until a fixed step budget. (7) Run distributed GPU processes with asynchronous CPU reasoning threads (Sections 2.1.1–2.1.4, pp. 2–3). The engine was rewritten in C++, yielding roughly 100× speedup over the earlier Python implementation (p. 3).

Verus form. Inference: this is transferable only as a pattern. A Verus analogue would define a finite abstract state machine for a domain, use a policy to propose transitions, and prove each transition's Rust implementation against the state-machine contract. Verus does not provide this geometry DSL or automatic forward-chaining engine; these would be external, trusted search code.

evidence and limits. Seed-Geometry solves 43 of IMO-AG-50 versus AlphaGeometry 2's 42 and 22 of 39 completed hard shortlist problems in the authors' expanded comparison (Section 3.1, pp. 7–8). These are geometry-engine outcomes, not Lean proof counts. The policy/value-model design changed after value estimates harmed general performance, and whole-sequence generation was inferior to step-by-step beam search (Section 3.1, p. 7).

## LooKeng interaction infrastructure

The appendix introduces LooKeng, a REPL-based Python interface with `init_state`, `run_tac`, and `verify_proof`. It supports stateless concurrent states, complex tactics, version switching, memory thresholds, proof verification, simplification, statement negation, and asynchronous isolation (Appendix B, p. 12). Inference: VL could use a similar process-isolated Verus service, but must pin versions and re-run final verification; interface convenience does not enlarge Verus's soundness boundary.

## what is proved, trusted, and VL risk

The paper's explicit denominators include 121/155 past IMO (78.1%), 99.6% MiniF2F valid and test, 331/657 PutnamBench, and 30/100 CombiBench (Section 3.2, p. 9). Table 3 labels MiniF2F-valid and test as 100.0% and 99.6%; the text explains that one final problem was solved under Heavy for valid and one test problem failed under Heavy, so the rounding and exceptional settings matter. MiniCTX-v2 is 81.8% under Light and Lean v4.16.0, versus o4-mini 44.3% at Pass@8 (p. 9). The model, natural-language proposer, LLM judge, generated formalizations, Lean/Mathlib, LooKeng, and benchmark translations remain trusted or heuristic. The paper notes that the human-formalized IMO 2025 statements were prepared by experts, and that one proof finished after the deadline (Section 3.2, p. 8).

Inference: the threat to agent-written verified Rust is moderate for proof search and high for specification and integration. Lemma pools, broad conjecture search, nested refinement, and feedback can reduce context waste and improve repair, but they cannot establish that a Rust contract is the intended safety property or that an external library obeys its specification. Existing work already covers iterative Lean refinement, lemma decomposition, and geometry neuro-symbolic search; VL should measure non-vacuous contract acceptance, dependency-change breakage, and repair time before claiming a new method.

## techniques for the catalog

- lemma-style proof pools — compile helper lemmas independently, cache their contracts and proofs, and reuse them in final theorems
- conjecture proposing — generate many candidate properties, verify them, and promote useful facts into a lemma pool
- formal-feedback RL — train with verifier rewards, formatting constraints, and varied failed-attempt contexts
- light iterative refinement — regenerate whole proofs from compiler feedback and self-summaries
- medium nested refinement — solve difficult child lemmas with inner searches and feed successes to the parent proof
- heavy broad search — verify thousands of conjectures, rank useful lemmas, and use them in a final deep search
- symbolic domain engine — combine a neural proposal model, explicit rule closure, and beam search for a restricted domain

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
