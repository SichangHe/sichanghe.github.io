# VERGE: Formal Refinement and Guidance Engine for Verifiable LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `singh2026refinement`, [paper](http://arxiv.org/abs/2601.20055v2)

## scope and contribution

The paper presents VERGE, a neuro-symbolic loop for answers whose claims can be decomposed and checked. Its abstract says the system “decomposes LLM outputs into atomic claims, autoformalizes them into first-order logic, and verifies their logical consistency using automated theorem proving” (Abstract, p. 1). It combines three ideas: semantic-equivalence consensus over multiple formalizations, semantic routing to either SMT or an LLM ensemble, and Minimal Correction Sets (MCS) that identify claims to revise (Abstract, p. 1; §1, pp. 1–2). The authors explicitly restrict formal guarantees to logical and mathematical claims and use consensus for commonsense or vague claims (§1, p. 2).

## technique: entity extraction, decomposition, and semantic routing

Use this when an answer mixes arithmetic, logical, temporal, probabilistic, commonsense, or vague claims. The method first extracts typed entities from context and query, then generates an answer. It decomposes the answer into atomic claims and classifies each claim into Mathematical, Logical, Temporal, Probabilistic, Commonsense, or Vague (§3, pp. 3–4). The paper gives the pipeline as “(1) entity extraction, (2) generation, (3) decomposition, (4) formalization & verification, and (5) refinement” (§3, p. 3). The classifier chooses the type with maximum model probability (Eq. 2, §3.2, p. 3). Route Mathematical, Logical, and Temporal claims to SMT; route Probabilistic, Commonsense, and Vague claims to soft verification; use Hybrid if routing is uncertain or SMT errors (§3.4, p. 4).

Step by step: extract constants such as Felix or Process A and their sorts; obtain an initial answer with zero-shot prompting; split it into atomic claims; classify each claim; build formulas only for formal types; send other claims to an ensemble; retain the type and confidence for scoring. The motivation is the paper's warning that vague predicates lack binary truth values and that forcing them into rigid logic causes “false formalization” (§3.2, p. 3).

Inference: In Verus, the analogous design is to separate claims into `spec fn` predicates that Verus can encode and explicit review/measurement for claims outside the supported Rust/specification fragment. Use `requires`, `ensures`, and `assert` for formal claims, and preserve the route/type as metadata in the proof-generation pipeline. This is an analogy; VERGE does not use Verus.

Evidence: the paper reports routing F1 scores of 0.93 for SMT and 0.95 for Soft, with only 1 of 32 soft claims misrouted to SMT (§4.3, p. 7). The denominator is the 32-claim routing evaluation; the model and benchmark composition are the paper's routing test, not a general accuracy guarantee.

## technique: consensus autoformalization and SMT verification

Use this when a claim is mathematical, logical, or temporal and can be expressed in QF_UF or QF_LIA. Generate K = 3 candidate SMT-LIB2 formulas from the same claim and extracted vocabulary. Compare candidates by proving bidirectional entailment, not by string similarity: the paper defines equivalence as “UNSAT (ΣE ∧ ¬(ϕa ↔ ϕb ))” (§3.3, p. 4). Build an equivalence graph, accept a formalization only when the largest equivalence clique is at least `ceil(K/2)`, and use round-trip SMT-to-language translation as a sanity check (§3.3, p. 4). If consensus or confidence is low, ask the model for a corrected formula constrained to strengthen the old formula; check that `φnew ∧ ¬φ` is unsatisfiable (§3.3, p. 4).

For each accepted claim, query Z3 twice. Contradictory means `SAT(φC ∧ φci) = False`; entailed means `SAT(φC ∧ ¬φci) = False`; possible means the first query is satisfiable but the second is not false; timeout/error is Unknown (§3.4, p. 5). The paper's example extracts typed constants from “All humans above age 18 are adults” and declares them as uninterpreted constants before generating formulas (§3.3, p. 4).

Inference: In Verus, make the generated predicate a `spec fn`, put context assumptions in `requires`, and prove entailment with `ensures` plus `assert`/lemmas. Verus's SMT backend can discharge arithmetic and logical obligations, but its Rust types and supported specifications replace SMT-LIB2 declarations. A generated claim that cannot be represented should remain outside the proof rather than be silently encoded as an unconstrained Boolean.

Evidence: VERGE uses Z3 4.12.2 (§Appendix C.2, p. 18) and reports an average convergence uplift of 18.7% over single-pass approaches (Abstract, p. 1). Table 1 evaluates six benchmarks with GPT-OSS-120B; the paper reports HLE improving from 14.2% CoT to 30.5% with VERGE (§4, p. 6). These percentages have the benchmark-problem denominator and model settings in the cited table/sentence; they are not proof coverage.

## technique: MCS-guided iterative repair and scoring

Use MCS when joint claims are inconsistent and a binary UNSAT result does not tell the model what to change. Given claim clauses, compute a set S whose removal makes the context satisfiable while every proper subset does not (§3.4, p. 5). The algorithm sorts valid claims by confidence, grows a maximal satisfiable subset, records each rejected claim in the MCS, and formats the result as feedback (Algorithm 1, Appendix A, pp. 14–15). Feedback contains individual errors, unsat cores/MCS, joint conflicts, and low-confidence formalization alerts; the next answer is generated from the prior answer plus this feedback (§3.4, p. 5). Stop when aggregate score is at least 0.75 and joint satisfiability holds, or when score change is below 0.01 (§3.5, p. 5).

Scores are 1.0 for Entailed, 0.9 Supported, 0.7 Possible, and 0 Contradictory/other; the final mean is multiplied by a variance penalty bounded below by 0.5 (Eq. 5–6, §3.5, p. 5). The paper's Figure 1 walks from an unsupported “Felix also barks” claim to the verified answer that Felix is a mammal and barking is unknown (Figure 1, p. 1).

Inference: In Verus proof repair, map failed `assert`/postcondition obligations to atomic claims, use solver diagnostics to select a minimal set of assumptions or lemmas to revise, then rerun verification. Do not treat an MCS as a proof: it identifies a repair candidate, while Verus must still verify the resulting Rust/specification. A proof function is erased at runtime and cannot itself be used as runtime evidence.

Evidence: removing MCS causes measurable drops in the paper's ablation (Table 3, §4.2, pp. 6–7); the paper also reports that ProofWriter is an exception where PoT reaches 98.4% versus VERGE's 89.9% (§4, p. 6). The authors explain this as overhead from decomposition/routing on synthetic deductive tasks, not as a contradiction of the other benchmark results.

## trust, limits, and product threat

The solver proves only the translated formulas. The paper warns that SMT can verify a “semantically incorrect SMT code” when translation is wrong (§6, p. 9), and that commonsense claims lack mathematical guarantees (§6, p. 9). Greedy MCS is polynomial-time and order-dependent; exact MCS is computationally intractable (Appendix B, pp. 15–16). The system adds latency: the paper reports over two seconds for standard chain-of-thought versus the VERGE loop (§6, p. 9). Its experiments use GPT-OSS models, six benchmarks, and a maximum of three iterations (§4, p. 6).

Inference: For a product that emits agent-written verified Rust, VERGE is a substantial process threat and opportunity: it can localize contradictory generated specifications before Verus proof repair, but it cannot establish that a natural-language requirement was translated faithfully or that an SMT abstraction matches Rust behavior. The product should keep the natural-language claim, generated predicate, solver result, and Verus proof as separate evidence layers. Existing VERGE work means VL should not redo generic MCS feedback for arbitrary LLM claims; a novel contribution would need Rust/Verus-specific translation and measured soundness.

## techniques for the catalog

- semantic routing — classify atomic claims and send formal types to SMT while using ensemble checks for vague or commonsense claims
- consensus autoformalization — generate three SMT formulas and accept only a solver-proven majority equivalence
- MCS repair — compute a minimal clause-removal set from UNSAT feedback and feed the named claims back into iterative generation
- variance-aware acceptance — combine claim scores, joint satisfiability, and a standard-deviation penalty before stopping

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
