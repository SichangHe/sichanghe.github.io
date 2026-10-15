# Retrieval-Augmented TLAPS Proof Generation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `zhou2025retrieval`, [paper](https://doi.org/10.48550/arxiv.2501.03073)

## method: decompose before proving

The paper targets TLAPS proofs for TLA+ obligations. Its central observation is that manually developed proofs proceed top-down: a complex obligation is split into smaller obligations, which are easier to verify. The authors write: “Our observations revealed two key insights: First, LLMs demonstrate better reasoning capabilities when handling simpler, focused proof obligations, suggesting that the proof obligation decomposition could enhance the effectiveness of LLM-based proof generation.” (Sec. 3, p. 5). The system therefore has two phases: sub-proof obligation generation and simple proof generation.

Inference: use this method when the target theorem has a hierarchical proof structure and a prover can check that sub-obligations imply the original goal. Inference: do not use decomposition as an unverified prompt trick; the implication check is essential.

Steps from Sec. 3.1 (pp. 5–6). (1) Input goal `G` and associated TLA+ definitions. (2) Ask an LLM to turn obligation `Obl` into a set `{Obl1, Obl2, ...}`. (3) Ask TLAPS to verify that the conjunction of all generated obligations implies `Obl` (the Obligation Decomposition Check). (4) For every accepted `Obli`, generate a proof `Prfi`. (5) Ask TLAPS to check each `Prfi` against `Obli`. (6) If decomposition fails, generate another decomposition. (7) If a sub-proof cannot be proved, decompose that sub-proof further. (8) Generate multiple candidates in parallel; stop when a complete proof is found or a decomposition-attempt limit is reached. The paper explicitly says the system “does not attempt to falsify proof obligations or generate counterexamples”; TLC handles those tasks in practice (Sec. 3.1, p. 6).

The paper's worked example is `Even(x+x)`. The first decomposition creates `<1>1` proving `x+x = 2*x` and `<1>2` proving `Even(2*x)`. TLAPS first checks `QED BY <1>1, <1>2 DEF Even`, then the components are proved (Sec. 3.1, pp. 6–7). This example shows why checking implication before generating detailed proofs prevents a structurally invalid plan.

Verus form. Inference: represent `G` as a Verus `ensures` postcondition and make each `Obli` a lemma or `assert` sufficient to establish it. A decomposition lemma can state that the conjunction of intermediate facts implies the target; verify that lemma with Verus before asking a model to prove each sub-obligation. Use `proof fn` and `ensures` declarations, not a runtime call to a proof function. Inference: recursively split a difficult postcondition into local lemmas or loop invariants, then run Verus after every generated lemma. TLA+/TLAPS syntax, `QED`, and `BY` commands do not carry over.

## method: sentence-level retrieval of verified proof statements

The authors observed that LLMs often emit syntactically invalid TLAPS. Their remedy is retrieval-augmented generation from verified TLA+ Examples proofs. The database stores each text segment between two TLAPS step numbers as one proof statement. The paper explains: “A proof statement refers to the text between two step numbers in a TLAPS proof script, representing a single logical step or assertion.” (Sec. 3.3, p. 10). Sentence-level records let retrieval match a target obligation to a proof pattern of similar granularity.

Build the database as follows. (1) Collect verified TLAPS specifications from the TLA+ Examples repository. (2) Parse each proof and split text between numbered steps. (3) Embed every statement with a pretrained embedding function `f`. (4) Embed target obligation `Obl`. (5) Compute cosine similarity `vObl·vQi/(||vObl|| ||vQi||)`. (6) Keep the top-k statements as `Rk`. (7) Prompt an LLM with the target, definitions, and `Rk`. (8) Require a structured response containing `proof_strategy`, `proof`, and `verification_considerations`. (9) Generate multiple candidates in parallel and retain only candidates TLAPS verifies. These are Sec. 3.3 (pp. 10–11) and Figure 7.

The prompt requires four reasoning actions: analyze logical structure, identify reference patterns, adapt them, and ensure TLAPS syntax. It requires outputs to be syntactically valid, logically sound, and as simple as possible (Fig. 7, p. 11). The reference database excludes every proof in the evaluation set, preventing direct leakage (Sec. 4.1, p. 12).

Verus form. Inference: store verified Verus lemma bodies or proof blocks as retrieval units, preserving the smallest unit that still has a meaningful precondition/postcondition. Embed the target verification obligation together with type and trait context; retrieve top-k verified blocks; ask the model to adapt them; run `verus` on every candidate. Inference: retrieval must include the relevant `spec fn` and datatype declarations, because a textually similar lemma with different trait bounds can be unusable. Do not call retrieved `proof fn`s at runtime.

## method: staged prover heuristic

Before using an LLM, the implementation tries native automation. For each sub-obligation it first invokes `OBVIOUS`; if that fails, it invokes `BY AllProvers`, which combines TLAPS SMT solvers and Isabelle automation. Only then does it call the LLM (Sec. 3.3, p. 11). This ordering reserves model budget for obligations that native tactics cannot solve. Inference: in Verus, first try ordinary `assert`, `assert ... by (compute)`, `bit_vector`, arithmetic automation, and available trigger/SMT guidance; invoke a model only after deterministic checks fail. The exact Verus tactic names must match the installed verifier, so the heuristic is a policy rather than a claim that TLAPS commands exist in Verus.

## evaluation and evidence

The evaluation uses three obligations from the official TLAPS examples: the Boyer–Moore Majority Vote safety property with an inductive invariant, an intermediate obligation `Init => cnt <= OccurrencesBefore(cand, i)`, and a simple arithmetic property (Sec. 4.1, p. 12). The proof database excludes evaluation proofs. Compared methods are TLAPS `BY SMT` and `BY Isa`, direct GPT-4o/o1-mini/o1, GPT-4o with chain/tree-of-thought prompting, and the proposed GPT-4o decomposition plus RAG using `nomic-embed-text-v1.5` and ChromaDB (Sec. 4.1, p. 12).

For the main Majority Vote obligation, every method failed: native automation timed out despite a 10-minute allowance, and each LLM had ten attempts with no valid proof. The proposed method also failed all ten decomposition attempts because no decomposition passed the Obligation Decomposition Check (Sec. 4.2, pp. 13–14). For the intermediate obligation, the proposed method succeeded in all three independent attempts (3/3), with every decomposition passing its check; generated decompositions reached four levels deep (Sec. 4.2, pp. 14–15). For the arithmetic property, native TLAPS proved it directly in under one second, while the proposed method generated a verified proof in about one minute (Sec. 4.2, p. 14). The reported two-minute intermediate runtime and one-minute arithmetic runtime are per successful run, not success percentages.

The intermediate proof is valid but verbose and expands unnecessary definitions; other LLM proofs remained invalid even after manual syntax correction (Sec. 4.2, p. 15). The authors hypothesize that scarce TLAPS-specific training data is the main LLM limitation (Sec. 4.2, p. 15). The experiment is only three obligations, so it does not establish broad success rates.

## what is trusted and implications for VL

TLAPS mechanically checks both decomposition implication and each generated proof. The embedding model, LLM, retrieval database, and decomposition strategy are untrusted proposal mechanisms; the prover is the acceptance boundary. The evaluation does not test counterexample generation, and the main safety theorem remains unsolved.

Inference: the threat to a product of agent-written verified Rust is high for complex proofs if the agent lacks decomposition and retrieval support; this paper solved only 3/3 intermediate trials and 1 arithmetic case while solving 0/10 attempts on the main property. Inference: the lower-risk design is to make Verus check every decomposition lemma and generated proof, with a hard attempt limit and explicit failure. Inference: existing work already establishes decomposition-check/retrieval architecture for TLAPS; VL should measure it on larger Verus crates and include negative/timeout cases rather than reusing this three-obligation result.

## techniques for the catalog

- checked obligation decomposition: split a goal and verify that sub-obligations jointly imply it before proving them
- sentence-level proof retrieval: embed numbered verified proof statements and retrieve top-k analogues
- staged automation: try native provers first, then retrieval-guided LLM generation
- recursive decomposition with bounded retries: decompose failed sub-obligations until success or an explicit limit
- verifier-gated candidates: retain generated proofs only after TLAPS mechanically verifies every step

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
