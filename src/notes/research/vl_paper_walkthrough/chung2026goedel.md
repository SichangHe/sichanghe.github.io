# Goedel-Architect: Streamlining Formal Theorem Proving with Blueprint Generation and Refinement
(authored by agents unless marked 🧑)
Tag: `chung2026goedel`, [paper](https://arxiv.org/abs/2606.06468)
## contribution and relation to earlier notes
This paper introduces an agentic Lean 4 pipeline organized around a global dependency graph (“blueprint”) rather than recursive lemma decomposition. The method below is extracted from sections 2–4 and appendices A–C.

## blueprint generation
A blueprint is a typed, acyclic graph of definitions and lemmas ending in the target theorem. Generation receives the formal theorem statement and emits one Lean file; every lemma declares the nodes it may use, and the target remains the unique sink (section 2.1, p. 3). Structural checks precede Lean compilation; graph-validity checks follow successful compilation. Definitions have real bodies, while lemma and theorem bodies remain unproved as `:= by sorry_using [...]` (Appendix C.1, pp. 11–12). The system prompt requires each lemma to be nearly trivial from its parents and to split a step needing more than one or two new ideas (Appendix C.1, pp. 11–12).

How to apply it:
1. keep the original formal theorem signature as the graph's unique target (section 2.1)
2. add definitions and standalone, fully quantified lemmas in topological dependency order (Appendix C.1)
3. declare each lemma's allowed parents and leave its body as `sorry_using [parents]` during planning (Appendix C.1)
4. compile and validate the graph, rejecting cycles, missing metadata or dependencies, and nodes outside the target’s dependency closure (section 2.1; Appendix C.1)

The paper states: “A blueprint is a dependency graph of definitions and lemmas that builds up to the main theorem.” (Abstract, p. 1). It also says: “Each lemma node also declares which other nodes its proof is allowed to rely on; these declared dependencies become the edges of the graph, recorded and validated by the LeanArchitect Lean package (Zhu et al., 2026).” (section 2.1, p. 3).

Inference: for Verus, the graph can be a Rust module or manifest whose nodes are `spec fn` definitions and `proof fn` lemmas, with the final `ensures` theorem as sink. Verus has no `@[blueprint]` or `sorry_using`; planning artifacts must be converted into real proof functions before verification. The useful transferable constraint is small lemmas with explicit dependencies, while Lean syntax, Mathlib retrieval, and Lean's unique-sink checks do not carry over.

## parallel node proving
Each lemma is dispatched to a prover that sees only its statement and declared parent facts. Provers call the Lean compiler and Mathlib retrieval iteratively until closing the goal or exhausting a per-node budget (section 2.2, p. 3). A compiler-corroborated counterexample can register a proof of the negated statement. Inference: restricting each prover’s context reduces opportunities to use undeclared graph facts.

How to apply it:
1. send every currently open node, with only its declared parents, to an independent prover (section 2.2)
2. let the prover iterate compiler checks, goal-state feedback, and targeted Mathlib search (section 2.2; Appendix C.2)
3. record solved, unsolved, or formally negated status together with the trace and budget outcome (section 2.2)
4. preserve successful proofs for the next graph revision when signatures and parents remain unchanged (Figure 1, p. 2)

The authors report: “The prover sees only the lemma it is proving and the definitions and lemmas it declared as dependencies, not the rest of the graph.” (section 2.2, p. 3). Inference: a Verus implementation should give each proof agent a narrow slice of Rust and the specifications of explicitly named lemmas; this reduces context confusion but requires reliable extraction of dependency facts because Verus does not expose Lean's node-level API.

## global refinement from failures
After a proving pass, the refinement model reads the per-lemma statuses, diagnoses, and any disproofs, then rewrites the graph. It may decompose a hard lemma into helper lemmas, rewire dependencies, or repair/drop a false statement. Solved nodes retain their signatures and reusable proofs when signatures and parents remain unchanged; an upstream edit can reopen a dependent (Figure 1, p. 2). The loop repeats until all nodes solve or the iteration budget is exhausted (section 2.3, p. 3).

The paper's two diagnoses are operationally distinct. “STATEMENT WRONG” reports that the prover considers the lemma false, either with a formal disproof or without one; the remedy strengthens hypotheses, weakens the claim, or changes the formalization. “PROOF TOO HARD” means the claim is believed true but needs a helper-lemma decomposition (Figure 1, p. 2; sections 4.3–4.4, p. 7). Appendix B (p. 10) shows both: a false multiplicative-function lemma is repaired by adding `f(1)=1`, while a difficult polynomial lemma is decomposed into case lemmas and supporting degree and coefficient facts; every new node closes on the next pass.

How to apply it:
1. record a suspected false statement or a proof believed too hard, distinguishing a checked disproof from an unverified diagnosis (Figure 1; sections 4.3–4.4)
2. for a false statement, incorporate the counterexample's missing hypothesis or representation correction (Appendix B.1)
3. for a hard proof, replace the monolith with named helper lemmas corresponding to the suggested cases (Appendix B.2)
4. re-run the graph compiler and prover, carrying forward unchanged solved nodes (section 2.3)

Inference: in Verus, failed verification diagnostics could trigger the same split-or-repair loop, but a failed SMT proof would not establish falsity. A Verus implementation should distinguish suspected specification errors from checked counterexamples, as this pipeline distinguishes unverified diagnoses from formal disproofs.

## natural-language proof seeding
For difficult problems, an optional informal proof guides the initial graph. The proof is not Lean-aware; it supplies structural strategy, after which the same proving/refinement pipeline runs (section 2.1, p. 3). On nine problems left open without guidance, the guided runs closed all nine under comparable settings, while unguided repetitions had zero successes at the reported budget; the authors caution that more unguided compute might eventually succeed (section 4.2, pp. 6–7).

The paper reports: “With this guidance, all nine close.” (section 4.2, p. 6). Inference: for Verus, an informal Rust-proof plan can seed lemma decomposition, but every resulting lemma still needs machine-checked `requires`/`ensures`; natural language is a search hint, never evidence.

## measured evidence and limits
On MiniF2F-test, the default pipeline solved 242/244 problems, 99.2%, with one blueprint generation and up to eight refinements per problem (section 3.2, p. 4). On PutnamBench, it solved 508/672, 75.6%, with up to sixteen refinements; natural-language guidance at pass@4 reached 597/672, 88.8%, at $985.67 API cost, or about $1.65 per solved problem (section 3.2, pp. 4–5). The default Putnam run cost $294 total, $0.44 per question, with 672 as denominator. On a common random subset of 200 Putnam problems, direct inference solved 13/200 (6.5%), tool-integrated reasoning 109/200 (54.5%), and the pipeline 152/200 (76.0%) by iteration eight (section 4.1, p. 6). These are Lean benchmark results, not Rust or Verus results.

Inference: Lean acceptance supports correctness relative to the formal statements and proof-checking infrastructure; it does not establish that those statements match the intended informal mathematics. The prover and refinement models propose artifacts that are checked rather than serving as proof authorities. The method threatens VL mainly through proof-agent productivity and failure repair, not by replacing Verus's Rust semantics. VL should reuse explicit dependency graphs, parallel narrow-context proofs, counterexample-triggered contract repair, and helper-lemma decomposition. It should not claim the reported percentages transfer to Verus without a Verus benchmark with denominators, model settings, and compiler evidence.

## techniques for the catalog
- blueprint dependency graphs — plan a typed acyclic graph of small definitions and lemmas ending in one target theorem
- narrow-context parallel proving — prove each node using only declared parents with compiler and library feedback
- diagnosis-driven refinement — repair false statements from checked counterexamples and split hard lemmas into helpers
- proof reuse — preserve solved nodes across revisions when signatures and parents remain unchanged
- natural-language structural seeding — use an informal proof to guide initial decomposition while requiring formal proof afterward
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "A more common outcome is that a node simply runs out of budget: the prover can neither close the lemma nor disprove it within its turn and token limit."): checked the full study against all 13 pages, including quotations, numbers, references, technique steps, and the arXiv identifier; corrected a quotation, validation order, diagnosis references, proof-reuse conditions, the polynomial example, and trust claims, removed an unsupported local-notes claim, and marked transfer conclusions as inferences; did not reproduce experiments or independently validate Lean proofs or Verus adaptations.
