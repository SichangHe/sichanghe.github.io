# Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models
(authored by agents unless marked 🧑)
Tag: `cao2026synthesizing`, [paper](https://arxiv.org/abs/2605.24619)

## core technique

IC3Syn combines property-directed reachability with LLM proposals for TLA+ protocol invariants. The paper says: “IC3Syn combines a symbolic IC3 controller, which decomposes invariant synthesis into focused blocking tasks and an LLM which provides protocol-level reasoning that IC3 alone lacks for TLA+ specifications.” (abstract, p. 1) Directly asking for a complete invariant is brittle: “the clauses must satisfy initiation, consecution, and safety implication, and any gap in the conjunction invalidates the entire invariant.” (§1, p. 1)

Inference: For Verus, the transferable idea is to ask an LLM for a local lemma that blocks a concrete counterexample, while Verus checks the resulting proof obligations.

## applying IC3Syn

when to use it

The paper targets TLA+ transition systems described by `Init`, `Next`, and `Safety`. Search uses a configured finite instance; unbounded verification requires a subsequent TLAPS proof. Manually designed templates are unnecessary, but automatically extracted quantifier templates are part of the prompt: “Quantifier templates are extracted directly from the specification and deduplicated modulo variable renaming, providing the LLM with protocol-specific quantifier structure without requiring manual template design.” (§5.4, p. 7)

steps from the paper

1. Initialize the frame sequence as `F ← [{Init}, {Safety}]` and clause memory as empty. Later frames begin with `Safety` and are strengthened by admitted clauses. (§4.1, p. 4; Algorithm 1, §5.1, p. 6)
2. Use Apalache to find a state in the deepest frame with a one-step successor violating `Safety`. Search backward through predecessors in shallower frames. Reaching frame level zero reports an unsafe protocol; a predecessor-free bad state above zero triggers clause search. (§§4.1, 5.2, pp. 4, 6–7)
3. First try clauses retained in memory. If none is admissible, query the LLM with the full specification, the current batch of bad states, extracted quantifier templates, existing clauses, and prior verification feedback. The paper states: “The LLM module receives the full TLA+ specification along with the current batch of bad states, and proposes candidate blocking clauses expressed as quantified TLA+ predicates over protocol-level variables.” (§4.2, p. 6) Parse the JSON response, normalize clauses, repair common scoping mistakes, and syntax-check with SANY. (§5.4, p. 7)
4. Screen candidate clauses together against reachable states of the finite instance using TLC. Discard falsified clauses and return their counterexamples as feedback. Prefer candidates excluding more current bad states; break coverage ties in favor of shorter clauses. TLC screening alone does not admit a clause. Apalache checks `Init ⇒ c` and `F[k−1] ∧ c ∧ Next ⇒ c′`; admit successful clauses into frames one through the current level. Remove covered bad states from the worklist. (§§5.2–5.3, p. 7)
5. If blocking fails, retain the bad state and query for additional frontier bad states while excluding those already seen. After exhausting LLM-guided search, if no fresh frontier bad state exists, use the negation of all known bad states as the exact aggregate fallback blocker. The paper limits its completeness claim to the checked finite instance. (§4.1, p. 4)
6. Once the frontier is blocked, append a fresh frame and push clauses using `F[k] ∧ Next ⇒ c′`. A push failure triggers one opportunistic blocking attempt using memory and, if needed, at most one LLM query. If unsuccessful, move on; new admitted clauses trigger re-pushing. (§5.1, p. 6)
7. Stop when adjacent frames coincide and extract the shared frame formula as the candidate invariant. Unbounded verification is a subsequent step: “the invariants synthesized on finite instances are shown in TLAPS to be inductive for the full unbounded protocol, thereby establishing safety.” (abstract, p. 1) Integrating the agent-driven TLAPS work into a fully automated pipeline remains ongoing work. (§7.1, p. 11)

Verus form

Inference: Treat a Verus function's precondition as `Init`, its transition or loop body as `Next`, and its postcondition as `Safety`. Generate candidate loop invariants or supporting lemmas from failing assertions or available counterexamples, then check them with Verus. Bounded test harnesses could screen candidates heuristically; they would not replace proof. Reproducing IC3Syn's frame management and clause ranking would require an external synthesis driver. The paper neither implements nor evaluates this Verus adaptation.

## evidence and limits

The evaluation uses 29 distributed protocols, with a 600-second timeout per tool, extended to two hours for MLDR and `pyv-paxos-epr`. The default model is Claude Opus 4.6. (§6.1, p. 8; Table 1, p. 9) The paper reports: “For all 29 solved benchmarks, TLAPS confirms that the discovered invariants are inductive for unbounded protocol instances, thereby establishing the corresponding safety arguments.” (§6.2, p. 8)

IC3Syn solves all 29; Endive solves 24 of 28 shared benchmarks, and IC3PO solves 26 of 29. The direct-LLM ablation solves 23 of 29; Gemini 3 Flash within IC3Syn solves 27 of 29. MLDR takes 4,525 seconds and the complex Paxos variant takes 1,806 seconds; neither is solved by the four compared tools. (§§6.2–6.3, pp. 8–10; Table 1, p. 9) These are reported experimental results, not independently reproduced measurements.

The authors explicitly limit finite-instance validation: “the IC3 fixpoint on the checked instance does not automatically generalize to arbitrary parameter configurations.” (§7.2, p. 11) The MLDR output has 15 strengthening clauses, plus safety; automatic deletion with finite-instance inductiveness rechecks removes eight strengthening clauses before TLAPS proof development. The proof exceeds 3,000 lines and is primarily completed by LLM agents with minimal human intervention. (§7.1, pp. 10–11)

## what is proved and trusted

Inference: TLC screening establishes finite reachable-state validity, while Apalache's admission and push checks support the IC3 frame construction. Neither alone establishes the unbounded result. That result depends on the subsequent TLAPS obligations for the specified protocol. Confidence therefore depends on the model and verification tools, rather than the plausibility of LLM output. The paper reports proof completion; this study does not inspect proof artifacts or audit the implementation.

## techniques for the catalog

- IC3/LLM blocking synthesis: search backward from frontier bad states, reuse stored clauses, and request new clauses for unresolved states
- finite-instance clause screening and admission: use TLC to reject reachable-state counterexamples, then Apalache to check initiation and relative induction
- exact aggregate fallback: negate accumulated bad states after LLM-guided search fails and no fresh frontier bad state exists
- push-failure refinement: attempt one extra blocking step when a clause cannot move to the next frame
- unbounded induction handoff: prove the extracted invariant with TLAPS after finite-instance synthesis
