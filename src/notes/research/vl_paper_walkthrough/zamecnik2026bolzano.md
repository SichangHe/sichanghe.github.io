# Bolzano: From Expert-Guided Proof Search to Automated Open-Problem Solving
(authored by agents unless marked 🧑)
Tag: `zamecnik2026bolzano`, [paper](http://arxiv.org/abs/2610.09769v2)

## scope and result

Bolzano is an orchestration layer for mathematical research. Its unit of work is an extracted, self-contained open problem. A run repeatedly launches parallel prover agents, one verifier agent, and a summarizer while carrying three Markdown research documents between rounds. The paper reports eight manually guided problems whose proofs domain experts checked, then four unattended collections totaling 3,800 attempts. Table 1 reports 1,600 arXiv problems (90 solved), 420 STOC 2026 problems (4 solved), 900 earlier-conference problems (40 solved), and 880 workshop problems (80 solved): 214 solved in total, with 485 flagged promising.

The authors stress that “Bolzano is an open-source orchestration layer around LLMs.” They also state, “A run marked completed has finished its allocated rounds; this status does not mean the problem has been solved.” These are operationally important distinctions for a verification workflow: completion is a budget event, and the verifier is a critic rather than a proof checker.

## technique: persistent research state

What it is. Each problem carries `notes.md` (insights, failed approaches, conjectures and simplified proofs), `proofs.md` (candidate proofs), `output.md` (the current outcome), and earlier round summaries. This state lets later rounds refine an argument instead of restarting.

When to use it. Use persistent state when a proof requires several attempts, when failed counterexamples are valuable, or when context limits make replaying every prior response impractical.

How to do it. (1) Build a self-contained task from the source paper, including definitions, assumptions and related work. (2) Initialize the three documents. (3) Give every prover the task and the same current documents. (4) Ask provers to explore strategies, examples, counterexamples, special cases and gaps. (5) Give all responses plus the shared state to a verifier. (6) Apply only the verifier’s structured append/replace updates to the documents. (7) Have a summarizer record progress and remaining questions, then schedule another round while budget remains. The paper says, “Within the automated loop, only this verifier stage updates the shared documents; provers propose material but do not overwrite the common state.”

Verus form. Inference: represent the research-state transition as a Rust data structure with a `requires` clause requiring a valid schema and a `ensures` clause stating that only verifier-authorized append/replace operations change state. A `proof fn` can show that an update preserves document invariants; a loop over rounds can use `invariant` to preserve those invariants. Prover text and verifier decisions remain executable strings and are not mathematical evidence until translated into specifications and proved. Verus cannot prove an LLM’s natural-language argument merely because the state transition is proved.

Evidence and limits. The architecture was used in all reported experiments, but agents had no web search, code execution, filesystem access or tools. The verifier was another LLM. The paper warns: “An accepted but incorrect lemma may propagate through persistent memory, and later agents may repeat it with increasing confidence.” Thus state persistence improves continuity while also persisting mistakes.

## technique: extraction, screening and audit

What it is. A separate LLM workflow reads paper collections, identifies explicit open problems, checks whether the source already resolves them, searches the literature, and assembles a self-contained task. Postprocessing then identifies substantive claims and compares them with the source question’s hypotheses, quantifiers and conventions.

How to do it. (1) Extract candidate questions, conjectures and definitions. (2) Exclude candidates already resolved by the source or literature. (3) Store the source paper with each task. (4) After a run, inspect proofs, counterexamples, algorithms and bounds rather than the run status. (5) Deduplicate packages with a registry. (6) Rewrite promising outputs as mathematical notes. (7) Audit two conditions: source support under the intended reading and substantial proof correctness. Record completeness, scope limitations, severity, fixability and review priority. A failed or unresolved condition is negative.

Evidence. STOC 2026 produced four results that source authors confirmed: a one-pass planted-biclique algorithm, a monotone-rank separation, a convex quartic with an irrational-only zero sublevel set, and biased-CAT circuit-depth lower bounds. The authors note that for the last two, source authors reviewed only the main idea, not the full proof. Counts outside STOC are estimates partly informed by LLM assessments; only the four STOC results were carefully checked and author-verified.

Verus form. Inference: encode extracted problem assumptions as `requires` and the claimed result as `ensures`; prove the algorithm or finite combinatorial claim with executable Rust plus `proof fn`s. Keep source extraction, novelty checks and human review outside the trusted Verus theorem unless their outputs are themselves formalized. A Verus proof of a mis-extracted statement does not establish progress on the source problem.

## techniques for the catalog

- persistent research state — carry notes, candidate proofs, outcomes and summaries across parallel exploration rounds, with verifier-only updates
- self-contained open-problem extraction — check source status and literature, then package definitions, assumptions and question before proof search
- verifier-gated orchestration — critique all prover outputs and apply structured append/replace updates through one gate
- source-and-proof audit — separately test source support, proof correctness, scope, completeness and novelty before human review
