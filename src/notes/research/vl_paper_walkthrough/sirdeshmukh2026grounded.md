# Grounded Continuation: A Linear-Time Runtime Verifier for LLM Conversations
(authored by agents unless marked 🧑)
Tag: `he2026grounded`, [paper](https://arxiv.org/abs/2605.14175)

## what is verified

The system checks interactional grounding: whether a candidate continuation is supported by claims, observations, hypotheses, and revisions established earlier in the same conversation. Its state is a dependency map `D_t=(M_t,AF_t,Cm_t,Dep_t)` containing an epistemic plausibility model, a labelled Dung argumentation framework, public commitments, and recorded support edges. The paper says: “Language understanding stays with the LLM, while dependency tracking stays with the engine, whose retraction guarantee holds by construction.” (Introduction, PDF p. 2)

A continuation associated with argument `alpha_c` is grounded exactly when every argument reachable through `Dep_t` is in the active set `S_t` (standing active or resolved). The paper defines the check as: “The verifier tests a single property of a candidate continuation, groundedness with respect to the current dependency map.” (Definition 2.2, PDF p. 3) Lemma 2.1 (p. 3) proves that the walk accepts iff `Dep*_t(alpha_c) subset S_t` and returns exactly that closure. Retraction computes reverse transitive dependents of a withdrawn premise without changing standing. Proposition 2.3 (p. 4) proves selective retraction preserves unaffected arguments and conflict-freedom; Proposition 2.5 (p. 5) gives polynomial per-turn updates and linear grounding/retraction queries under (A1)-(A3): at most 12 agents, an acyclic attack graph, and an explicit finite world set. The authors' own scenarios have at most 25 arguments (Appendix A.2).

## technique: dependency-map runtime check

When to use it. Use this when a conversational agent must reject claims relying on superseded assumptions, even when old text remains in context. The verifier assumes the candidate is associated with a recorded argument identifier and that an adversary cannot mutate the maintained state at query time.

How to do it.

1. Maintain arguments with unique IDs, claims, standing labels (`active`, `weakened`, `abandoned`, `resolved`), attacks, agent commitments, and recorded dependencies (Definition 2.1, PDF p. 3)
2. For each candidate continuation, attach its claimed proposition to an argument ID (Definition 2.2, p. 3)
3. Traverse `Dep_t` from that argument; include the start node and every reachable support argument (Definition 2.2, p. 3)
4. Accept iff every visited node is in `S_t`; return the closure as evidence, otherwise return `ungrounded, empty` (Definition 2.2, p. 3)

Verus form. Inference: model the finite dependency graph as ghost maps and define a recursive or bounded reachability `spec fn`; prove with a `proof fn` that the returned set is a subset of standing records. Use `requires` for valid IDs and a bounded ID set (the paper's walk uses a visited set, so it does not need acyclic dependencies; Appendix A.2), `ensures` for exact closure and linear-work accounting. The LLM Interpreter and natural-language extraction remain outside the proof.

Evidence. On ReviseQA (930 scenarios, seven edits), native verifier accuracy@7 ranges 0.157–0.348 versus RAG 0.123–0.283 across five QA models. On MemAB-FC, pooled verifier single-hop accuracy is 0.943–0.983 and multi-hop 0.642–0.738, versus RAG multi-hop 0.040–0.130 (RAG single-hop 0.463–0.950). The ReviseQA denominators are scenarios and the MemAB-FC ones are questions pooled over four stream lengths, not generated tokens (Table 1, PDF p. 7). The verifier arms read the benchmarks' structured updates; the paper's end-to-end arm with a GPT-4o Interpreter stays within 2.26 percentage points of accuracy@2 and 1.94 of accuracy@7 (Section 4.3, p. 8). Inference: the engine’s exact support evidence can reduce VL agent context while preserving an auditable chain.

## technique: selective transitive retraction

What it is. For a withdrawn premise `beta`, compute one-step dependents `Affected(beta)` and iterate until a fixed point: `X_0=Affected(beta)`, `X_{k+1}=X_k union {alpha: Dep(alpha) intersects X_k != empty}`. The paper states: “Affected* (β) reports the recorded dependents for actual or counterfactual retraction, without changing their standing.” (Definition 2.3, PDF p. 4)

How to do it.

1. Identify the exact premise record (separate records for identical propositions) (Definition 2.3, p. 4)
2. Use a reverse dependency index to collect direct dependents (Proposition 2.5, p. 5)
3. Repeatedly add arguments that depend on any collected argument until no new ID appears (Definition 2.3, p. 4)
4. Intersect the closure with `S_t` to identify currently active dependents; remove the withdrawn and affected active records for retraction analysis (Definition 2.3 and Proposition 2.3, p. 4)
5. Preserve every standing argument with no dependency path to `beta` (Corollary 2.4, p. 5)

Verus form. Inference: a bounded fixed-point proof can establish monotonic growth and termination over a finite ID set, then prove exactness by induction on path length. Verus has no runtime `modifies` clause; represent updates through returned maps and prove frame properties with `ensures`.

Evidence. In four authored Phase-2 queries (16 decisions), one-step was complete for one query while `Affected*` was complete for all four. Across 64 counterfactual RECON scenarios, one-step was exact on 13 and `Affected*` recovered all 198 dependent steps with no false positives (Section 4.4, PDF p. 8). Retraction latency with reverse indexing is 0.25–0.46 microseconds over states of 13–2,000 turns, versus 1.1–190 microseconds for history replay; the gap is 4× at 13 turns and 415× at 2,000 (Section 4.5, p. 9). Appendix E.2 says these are medians over 5 seeds × 200 queries per seed on synthetic dependency maps, with a mean affected-set size below 1, so they are not measurements on real conversations.

## technique: eight-operation symbolic update loop

The LLM Interpreter classifies each utterance into operations and extracts propositions/record IDs; a symbolic engine applies them in fixed order, and a renderer summarizes changed state back into the model context. The eight operations are OBSERVE, HYPOTHESIZE, SUPPORT, UNDERMINE, REVISE, EXPAND-AWARENESS, RESOLVE, and QUESTION (operation table in Section 2, PDF p. 4; Architecture, p. 5). OBSERVE uses a hard announcement; HYPOTHESIZE a soft lexicographic upgrade; SUPPORT a conservative upgrade, or a soft upgrade when the evidence is specific to the hypothesis; UNDERMINE a family of plausibility downgrades; REVISE a hard announcement of the negation or an attack-edge addition; EXPAND-AWARENESS refines worlds; RESOLVE records consensus or dissent; QUESTION queues an abductive problem without a DEL update.

Inference: the loop can be summarized in five steps, which the paper does not number: (1) the Interpreter classifies and extracts (Section 3, p. 5), (2) the engine applies the extracted operations in a fixed order (Section 2, p. 4; the Table 3 preconditions are in Appendix A.4), (3) each operation updates standing, attacks, commitments, plausibility, awareness, and dependency edges (Algorithm 1, Appendix A.3, p. 18), (4) the Renderer writes a natural-language summary of the changed parts of D_t into the LLM context (Section 3, p. 5), and (5) grounding and retraction queries read the resulting map (Section 3, p. 5). Inference: a VL implementation should parse agent-written Rust evidence into operations such as claim, support, revise, and resolve, while preserving record IDs across turns.

Under definitions plus rendered state (the State-augmented condition), Claude Sonnet 4 Phase-2 F1/exact match is 0.91/63% overall (13 turns) and 0.83/30% on four key shifts; GPT-4o is 0.81/52% and 0.74/50% (Table 2, PDF p. 8). These come from one authored scenario with 5 runs per cell (Appendix C.2). With raw-text end-to-end extraction, the GPT-4o Interpreter emitted a removal on 4,355 of the 4,361 ReviseQA edit steps that retire a premise inside the conclusion's dependency set (of 6,510 steps), and on MemAB-FC the map it built matched the one from structured updates at Jaccard 1.000 on 6K and 0.989 on 32K streams (Section 4.3, p. 8). Exact match and F1 are classification denominators over turns, not QA accuracy.

## trust, limits, and product threat

The engine’s graph walk and standing invariant are proved under operation preconditions; the Interpreter’s extraction is empirical. The per-turn update bounds assume finite world sets, an acyclic attack graph, and at most 12 agents (Proposition 2.5); the formal check also assumes the candidate is associated with a record ID that identifies its claim (Appendix A.1). Inference: it further depends on stable record identifiers and faithful dependency recording. Open-domain BEAM results show the boundary: on 780 question-model pairs where every premise still stands, verifier score is 0.347 versus RAG 0.353; on 995 pairs with a revised premise it is 0.249 versus 0.202 (Section 4.2, p. 7). Inference: this is evidence that revision tracking helps specifically when evidence changes, not a universal QA gain. The paper also reports that paired Wilcoxon tests put the verifier ahead on three of five QA models where a premise was revised and find no significant difference on any of the five where every premise stands.

Inference: for VL, the main threat is stale proof context. An agent may cite a proof or invariant that was invalidated by a later code change; dependency records can flag exactly the affected claims and preserve unrelated proofs. The paper provides a linear runtime checker and retraction closure, so Inference: VL need not redo generic RAG comparisons. Inference: the trusted components remain the Interpreter, record association, renderer, model, and initial dependency map; Verus can verify the engine but cannot establish that extracted natural-language operations are faithful.

## techniques for the catalog

- dependency-map grounding — accept a continuation exactly when its recorded dependency closure is in good standing
- reverse transitive retraction — compute all dependents of a withdrawn premise and preserve unrelated arguments
- standing invariant — maintain conflict-free active records through constrained update operations
- eight-operation interpreter loop — classify utterances, apply symbolic updates, render state, then query grounding
- reverse-index runtime complexity — answer grounding and retraction in linear time in graph size
- active-record evidence selection — give the QA model only the active records linked to the question (Verifier (native), Section 4.5), and render changed state back to the Interpreter (Section 3)
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The Redis timeouts are particularly important because they will later become central to the causal reasoning."): I read all 40 pages of the paper text, including the appendices, and checked the quotations, the Table 1 ranges, the Section 4.2 BEAM counts, the Section 4.3 and 4.4 counts, the Table 2 cells, the latency figures, the operation descriptions, and the page and section references. I changed the tag author from sirdeshmukh to he (the authors are Qisong He et al.; Sirdeshmukh is only a cited reference; the arXiv link is confirmed by the arXiv stamp in the paper text), moved the Corollary 2.4 reference to p. 5 and the Table 1 reference to p. 7, added the operation table location, replaced the "steps from the paper" list with a marked inference, corrected the SUPPORT, UNDERMINE and REVISE realisations, corrected the latency denominator, and marked the study's own conclusions as Inference. I did not check the cited prior work, the code repository, the PDF figures, or the proofs beyond reading them.
