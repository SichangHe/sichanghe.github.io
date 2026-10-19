# Cogentic: Multi-Agent Orchestration for Automated Proof Discovery
(authored by agents unless marked 🧑)
Tag: `cai2026cogentic`, [paper](https://arxiv.org/abs/2609.40324)

## system and claim
Cogentic is a harness for open mathematical and theoretical-computer-science problems. Its core claim is an iterative prove–verify loop, parallel exploration, adversarial checking, and a persistent ledger. The abstract states: "Cogentic addresses these challenges through an iterative prove–verify loop in which an orchestrator allocates a population of independent provers across distinct proof directions, subjects their output to adversarial verification by several specialized components, and promotes confirmed intermediate results into a persistent verified ledger that later rounds build on." (abstract, p.1)

The system starts from a problem statement; literature reviewers retrieve background, and proof rounds continue until a candidate clears verification or the budget ends (Section 2, pp.2–3). The authors report O(100) Gemini calls for most problems and O(1000) for the hardest (Section 1, p.1). They report five results across online learning, auction theory, and mechanism design, subsequently checked by domain experts (Section 3, p.5). Section 4 states: "As noted, Cogentic produces natural language proofs which are verified by experts." (p.10)

## technique: round-based multi-agent allocation
What it is: an orchestrator partitions prover slots among distinct directions such as a bound, construction, counterexample, repair, or finalization. Each prover receives a selective briefing made by an independent summarizer rather than the entire history (Section 2.1). The paper says, "A round produces a batch of candidate proofs, puts them through verification, and writes into the record and the verified ledger that the next round starts from." (Section 2, p.3).

How to apply:
1. Store the problem statement, literature, prior attempts, verifier verdicts, ledger, and standing instructions in a shared workspace (Section 2).
2. Have the orchestrator choose the number of provers and assign each a specific claim or repair direction (Section 2.1).
3. Spawn one summarizer per prover; each reads attempts and verdicts, selects informative context, and writes a targeted briefing (Section 2.1).
4. Run provers independently and in parallel; let each choose its own next proof step within its direction (Section 2.1).
5. Verify each draft alone and then verify all drafts together; accept only when both checks pass (Section 2.2).
6. Write attempts, objections, and surviving lemmas into the record and ledger, then begin another round (Sections 2 and 2.3).

Inference: for Verus, a Rust/Verus orchestrator can assign agents to distinct contract obligations, counterexamples, or invariant repairs. Briefings should include prior failed proof attempts and checked lemmas. Parallel text generation does not itself prove anything; each candidate must compile and verify under Verus before entering a trusted ledger.

## technique: adversarial dual verification
What it is: one verifier checks each proof independently, while a second reads the whole batch to find shared blind spots and compare proofs. Both start from the assumption that every step and citation is wrong until justified. The paper states, "A draft is accepted only when it passes both verifiers." (Section 2.2, p.4).

Steps: send each draft to an isolated verifier; then send the complete round to a cross-draft verifier; require explicit justification of every mathematical step and citation; reject or return objections for repair. The authors report subsequent domain-expert verification of every proof (Section 3, p.5).

Inference: for Verus, verify candidate code and separately review specifications and shared assumptions across candidates. Verification of encoded contracts does not establish that those contracts match the intended problem.

## technique: verified ledger and dead-end record
What it is: maintain two cross-round artifacts. The record stores attempts grouped by intended result, method, and failed objection. The ledger stores intermediate lemmas that verifiers accepted in isolation. An auditor extracts a lemma from an otherwise rejected proof, rewrites it as self-contained, and verifies it again. The paper explains: "Verifiers often confirm individual lemmas inside proofs they otherwise reject." (Section 2.3, p.4)

Steps: after every round, collect failed attempts and reasons; identify useful fragments; rewrite each fragment as a standalone lemma; verify it independently; add surviving lemmas to the ledger; record verified counterexamples as excluded directions so later rounds do not repeat them (Section 2.3).

Inference: for Verus, ledger entries should be compilable Verus `proof fn` lemmas with explicit `requires` and `ensures`, stored with the exact crate and dependency versions. A counterexample can be a Rust test/model witness, but it is evidence against a conjecture only under the stated assumptions. Do not mark prose summaries as verified.

## technique: process-level adaptation
An advisor reviews all verification logs and recommends instruction and allocation changes: recurring errors, gaps, and verifier blind spots. It advises the orchestrator on prover allocation and the instructions for subsequent provers and verifiers (Section 2.4, pp.4–5). Crucially, "neither the advisor nor the orchestrator is permitted a mathematical opinion: they cannot speculate on what the answer is likely to be, recommend a technique, or declare a direction promising or dead." (Section 2.4, p.5). Inference: this separation may keep process agents from steering mathematical conclusions without proof.

Inference: for Verus, use a process agent to detect repeated diagnostics and adjust prompts, timeout, or reviewer allocation; prohibit it from asserting theorem truth. Human or machine proof obligations must remain the authority.

## technique: consolidation and final audit
When a candidate passes, exploration may continue for a stronger proof. A comparator selects the strongest verified proof; a formal writer expands it into a self-contained manuscript; a final verifier compares the compiled manuscript with the accepted proof (Section 2.5). The output includes theorem statements, lemmas, notation, and background so an expert unfamiliar with the run can check it.

Inference: for Verus, keep the final module tied to the accepted version, verify it with Verus, and check that the written explanation matches its contracts.

## techniques for the catalog
- round-based direction allocation — assign independent agents to claims, counterexamples, and repairs with selective briefings
- adversarial dual verification — accept a draft only after isolated and cross-draft criticism
- verified ledger — extract, rewrite, and reverify useful lemmas while recording dead ends
- process-level adaptation — use log trends to tune instructions and allocation without mathematical opinions
- final consolidation audit — expand the accepted proof and verify the final manuscript against it
