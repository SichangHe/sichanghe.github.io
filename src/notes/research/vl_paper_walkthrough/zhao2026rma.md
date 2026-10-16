# RMA: Context-Orchestrated Research Math Agents
(authored by agents unless marked 🧑)
Tag: `zhao2026rma`, [paper](http://arxiv.org/abs/2605.22875v2)

Inference: RMA treats long proofs as persistent state-management problems. A typed research store records proof revisions, open issues, attempts, literature, concepts, meetings, insights, and evaluations; an orchestrator retrieves only task-relevant records, compiles a bounded context, invokes a local operation, and writes back a structured artifact. The paper’s central claim is that “Long-horizon mathematical reasoning fails less often because a model cannot produce a valid next step than because an agent fails to maintain and expose the right semantic state across many iterations” (Abstract, p. 1).

## technique: typed persistent research store

Inference: Represent proof development as a tuple of separately addressable records rather than one chat transcript. The paper defines the store as “𝒮 = (Π, ℐ, ℳ, ℒ, 𝒦, ℋ, ℰ), where Π contains proof artifacts and their revision history” (Sec. 3.1, p. 3); the other components hold issues, meetings, literature, concepts, insights, and evaluations. Initialize it from the problem, then append rather than overwrite attempts and links.

Inference: Apply it step by step: (1) create the current proof record, (2) create typed issue records for every unresolved obligation, (3) preserve failed repairs and their evidence, (4) attach literature and concept records, (5) append evaluation scores each round, and (6) retain raw history while consolidating current links. In Verus, the analogous implementation is an external proof-work database plus Rust modules whose checked contracts are immutable artifacts; this is an inference because RMA uses Lean and natural-language LaTeX, not Verus.

Inference: The trust boundary is explicit: the store records claims but does not prove them. Lean 4 kernel checking in the Formal Conjectures experiment is the evidence that accepted generated proof terms type-check; the paper reports 213 verified targets out of a fixed sample of 300 (Sec. 4, p. 5 and Appendix G, p. 23).

## technique: operation-specific bounded context

Inference: Do not pass the entire store to every call. Retrieve records linked to the current issue and operation, order them by priority, and remove whole records until a token budget is met. The paper specifies that `PrefixToBudget` “operates on C as a sequence of whole, addressable records, never on raw characters or tokens,” so “an operation never receives a lemma statement or proof fragment cut mid-sentence” (Sec. 3, p. 3).

Inference: Steps are (1) select the operation (critic, solver, literature, meeting, revision, evaluator), (2) retrieve the current proof and linked records, (3) add recent outputs for that operation, (4) concatenate in a fixed priority order, (5) drop lowest-priority complete records until budget B fits, (6) call the operation, and (7) write back its typed result. For VL, this maps to bounded Verus proof context: include the current function, relevant invariants, failed diagnostics, and only dependency lemmas. This is an inference.

Inference: Their ablation held backbone, prompts, tools, issue ranking, and a $100-per-problem ceiling fixed on a 30-problem held-out set. Full RMA scored 8.53 ± 0.15 versus 3.47 ± 0.21 for context dumping and 2.63 ± 0.25 for stateless memory (Table 3 and Sec. 4.2, pp. 7–8). Those are judge scores, not kernel success rates, and the context-dumping intervention changes request size as well as selection.

## technique: typed issue discovery and severity/dependency repair

Inference: Run complementary critics: LM gap enumeration, deterministic claim/dependency parsing, semantic completeness scoring, and fidelity analysis. Convert findings into issues with defect type, affected claim, required repair, and a correctness-critical flag. Rank deterministically by severity and downstream dependency impact. The paper says, “P0 denotes a defect that invalidates the main conclusion or leaves a necessary crux claim unsupported; P1 denotes a gap that blocks a required lemma or proof branch” (Sec. 3.1, p. 4).

Inference: Repair only the first b ranked issues per round. Give the solver the full current proof, selected issue, dependencies, related attempts, and applicable knowledge; request an anchored edit with exact text before and after the replacement. Apply it only when the anchor is unambiguous and no outside text changed; retry once, then use a gated full-document fallback. Re-run the full critic suite in the next round instead of trusting the patch. In Verus, this corresponds to compiling after each localized contract/lemma edit and routing compiler diagnostics back as issues; this is an inference.

Inference: Mark solved only when the semantic completeness gate passes and no correctness-critical issue remains. If a claim cannot be proved, reduction mode records the strongest complete partial result while leaving the obligation open (Sec. 3.2, p. 4). This is directly useful for VL because a passing local proof must not hide an unproved global invariant.

## technique: literature, meetings, and concept glossary

Inference: An optional literature operation stores each source with theorem/technique, assumptions, supported claims, applicability limits, and citation. A meeting operation then combines current proof, issues, attempts, and literature into a record, action plan, and strategic insights; revision applies the plan. A concept registry stores names, definitions, assumptions, notation, and sources to stabilize terminology. The paper says the meeting operation is “synthesizing a meeting record ρ, action plan a, and strategic insights ΔH” (Sec. 3.2, p. 4).

Inference: In a Verus workflow, the literature record can point to existing lemmas and the glossary can map Rust types to mathematical abstractions; this is an inference. The paper’s own no-web Formal Conjectures configuration disables literature retrieval, so the kernel result does not depend on external sources (Appendix G, p. 23).

## evidence, limits, and product threat

Inference: Human-expert evidence includes 42.5% solve rate on SOOHAK Challenge Hard over organizer-run three repetitions of 40 problems, 8/10 correct on First Proof B1, and 8/10 passes on First Proof B2 (Tables 1–2, pp. 5–6). The matched-budget generic iterative revision control used the same Claude Opus 4.8 and $1,850 across ten B2 problems, passing 4/10 versus RMA’s 8/10 (Table 4, p. 19). These denominators and protocols differ, so they should not be pooled.

Inference: The paper reports approximately $50,000 realized API charges across experiments, while per-call context limits are maxima rather than actual usage (Appendix G, p. 23). Lean kernel checking, pinned toolchains, and `#print axioms` audits are trusted evidence; LLM issue labels, natural-language completeness judgments, and the statement’s faithfulness remain assumptions. The authors explicitly state that the agent “may fill only the benchmark-designated proof body or proof hole; the proposition being proved and its assumptions are not rewritten or weakened” (Appendix G, p. 23), a safeguard VL should preserve.

Inference: The product risk from agent-written verified Rust is material but bounded. Persistent issue state and bounded retrieval address omission and context loss, but they do not establish that a Verus specification matches the intended product behavior. Human review of top-level contracts and trusted boundaries remains necessary.

## techniques for the catalog

- Inference: typed research store — preserve proofs, issues, attempts, literature, concepts, meetings, insights, and evaluations as linked records
- Inference: bounded operation-specific context — retrieve and prioritize whole records, then fit a fixed context budget without cutting proof fragments
- Inference: severity/dependency issue repair — rank correctness impact and downstream dependencies, apply anchored patches, and re-criticize globally
- Inference: coordinated revision — use literature, meetings, action plans, and a concept glossary to guide broader proof changes

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
