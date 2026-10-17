# Proof Automation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `lu2024proofautomation`, [paper](https://doi.org/10.1145/3691620.3695521)

## problem and method

The paper (ASE 2024, printed pages 1509–1520) studies why language models produce invalid Coq proof scripts and presents PALM, a generate-then-repair pipeline. Its abstract reports: “By analyzing 520 proof generation errors made by GPT-3.5, we found that GPT-3.5 often identified the correct high-level structure of a proof, but struggled to get the lower-level details correct.” (abstract, p. 1509). PALM retrieves premises, prompts an LLM for a script, executes each tactic in Coq, applies a repair when a tactic fails, and invokes backtracking when repair fails (section 4.1, Algorithm 1, p. 1512). The abstract calls this “a novel generate-then-repair approach that first prompts an LLM to generate an initial proof and then leverages targeted symbolic methods to iteratively repair low-level problems.” (abstract, p. 1509)

Inference: for VeruLaw, the central transferable pattern is to let an agent propose proof structure while a trusted checker supplies error states and a repair loop edits only the failing step. The paper is about Coq and does not establish that the same repair rules work for Verus.

## formative error analysis

Inference: use the error taxonomy to decide which repairs to automate. The authors ran GPT-3.5 on 579 theorems from the Verdi project, sampled one proof script per theorem, recorded the first Coq error, and manually categorized the 520 collected errors (section 3, p. 1511). Table 1 gives the complete denominator: wrong theorem application 258/520 (49.6%), invalid reference 79/520 (15.2%), incorrect rewrite 61/520 (11.7%), redundant introductions 56/520 (10.8%), tactic misuse 44/520 (8.5%), bullet misuse 19/520 (3.7%), and miscellaneous 3/520 (0.6%) (section 3, p. 1511).

The paper gives concrete failure modes: `apply H` requires the conclusion of `H` to match the goal; `rewrite Heq` fails when its left-hand side matches no subterm of the goal; `intros` can reuse a name already in the local context or have nothing to introduce; `destruct` and `induction` require arguments of inductive type; and a bullet misuse either proceeds to the next goal before the current one is solved or uses the wrong bullet (section 3, pp. 1511–1512). The authors' conclusion is: “while LLMs often generate proof scripts with the right high-level structure, they often struggle with accurately addressing the sorts of low-level details that hammers excel at.” (section 3, p. 1512).

Inference: the same taxonomy can label Verus failures, but Verus diagnostics and constructs differ. A Verus implementation should collect the failing assertion, context, and verifier message, then map only verified diagnostics to repairs; it should not assume Coq tactic names or bullet syntax.

## technique: retrieval-augmented proof generation

Inference: use this when the environment contains too many lemmas to place in one prompt. PALM predicts relevant premises with TF-IDF and k nearest neighbors (KNN), initially ranks them by TF-IDF score, then reranks them with BM25 by text similarity to the theorem statement (section 4.2, p. 1513). The prompt combines instructions, two example theorems with human-written proofs, the retrieved premises, and the theorem to prove; the LLM returns a complete script (section 4.3, p. 1513). Algorithm 1's sequence is: `RetrievePremises`, `BuildPrompt`, `LM.query`, execute each tactic, call `Repair` on an error, and if repair fails call `Backtracking`, returning failure if it finds no proof (section 4.1, p. 1512).

Inference: in Verus, retrieve nearby `lemma`/`proof fn` declarations, `spec fn` definitions, and relevant `requires`/`ensures` patterns; generate a proof body; run Verus; and feed the exact failed obligation back to repair. Verus lemmas must use valid Verus syntax and be called in proof contexts, while executable functions retain their runtime behavior.

## technique: targeted symbolic repairs

PALM has four repair mechanisms, chosen from the error message, the failing tactic, and the current proof state (section 4.1, p. 1512; section 4.4, p. 1514).

1. Reference replacement collects the theorems selected by retrieval and the local hypotheses, ranks them with BM25 by name similarity to the undefined name, and substitutes each candidate and re-executes the tactic until it succeeds. The paper's example replaces nonexistent `in_remove_all` with `in_remove_all_preserve` (section 4.4, p. 1514).
2. Renaming appends an apostrophe when `intros` reuses a name (`intros H` becomes `intros H’`); if nothing can be moved to the local context, it drops the `intros` (section 4.4, p. 1514).
3. Bullet transformation replaces a wrong bullet with the one Coq expects; if the proof tries to move on while goals remain unsolved, PALM delegates to backtracking (section 4.4, p. 1514).
4. Premise augmentation applies to wrong theorem application, wrong rewriting, or tactic misuse: PALM runs CoqHammer's `qsimpl` with the misused theorem as argument; `qsimpl` “uses sophisticated heuristics to identify which theorems can be applied and simplifies the current goal accordingly” (section 4.4, p. 1514). The paper's example runs `qsimpl use: Zlt_le_succ` after `apply Zlt_le_succ` fails (section 4.4, p. 1514).

Inference: Verus analogues are name replacement among in-scope lemmas, fresh binder renaming, and adding a candidate lemma or assertion followed by re-verification. This paper establishes no Verus equivalent of Coq bullets or `qsimpl`; `assert`, `assert forall`, `calc`, and `proof fn` calls are the available constructs documented in the Verus notes.

## technique: backtrack proof structure

Inference: use this when a local repair cannot solve a subgoal created by a high-level tactic. Algorithm 2 asks CoqHammer to solve the unsolved goal; if it fails, it undoes the last tactic and tries again. When the last tactic is a bullet, it identifies the tactic that produced that subgoal, discards that tactic and all its subgoals, and continues; the loop ends when CoqHammer succeeds or no tactics remain (section 4.5, pp. 1514–1515). The paper's rationale: “when reasoning by induction, if the base case is proven but the inductive case fails, the entire induction attempt has failed, and we need to try a different proof strategy instead of induction.” (section 4.5, p. 1514)

Inference: for Verus, the analogue is to snapshot the generated proof at lemma/assertion boundaries, undo the most recent proof step when the verifier still reports an obligation, and ask the checker about an alternative lemma or invariant. This needs a Verus-specific search controller; CoqHammer itself cannot prove Verus obligations.

## evidence and limits

The benchmark is 10,842 theorems from the CoqGym test set (13,137 theorems from 27 projects), excluding Verdi theorems and keeping those compatible with all Coq versions the baselines need; PALM is implemented for Coq 8.10–8.12 (section 5.2, p. 1515). The abstract reports that PALM is “successfully proving 76.6% to 180.4% more theorems.” (abstract, p. 1509), relative to DSP and Passport respectively (section 5.3.1, p. 1516). Table 2 reports GPT-3.5 alone 402/10,842 (3.7%) and GPT-3.5+PALM 4,377 (40.4%); GPT-4o alone 689 (6.4%) and +PALM 4,614 (42.6%); Llama-3-70b-Instruct alone 386 (3.6%) and +PALM 4,155 (38.3%); Llama-3-8b-Instruct alone 7 (0.1%) and +PALM 3,433 (31.7%); baselines Passport 1,561 (14.4%), Proverbot9001 1,849 (17.1%), DSP 2,478 (22.9%) (Table 2, p. 1516). PALM proves 1,270 theorems that none of the other approaches proves (section 5.3.1, p. 1516). PALM using all four LLMs proves 5,210 theorems in total (section 5.3.2, p. 1516).

Ablation Table 3 gives PALM 4,377 (40.4%); disabling reference replacement 4,249 (39.2%), renaming 4,175 (38.5%), bullet transformation 4,225 (39.0%), premise augmentation 4,094 (37.8%), backtracking 702 (6.5%), and premise retrieval 4,147 (38.2%) (section 5.3.3, Table 3, p. 1517). The paper calls backtracking “essential to proving many theorems” (section 5.3.3, p. 1517); this is a Coq benchmark result.

Runtime is a trade-off: successful proofs average 32.89 seconds (Passport 3.1, Proverbot9001 4.7, DSP 8.2), with 1.96 CoqHammer invocations per proof and a 10-second timeout per invocation; over all theorems PALM averages 105.6 seconds (section 5.3.4, p. 1517). Among 100 sampled theorems PALM fails to prove, premises not retrieved account for 58 (58%), premises retrieved but not used 14 (14%), and tactics not used 39 (39%); one theorem can fail for several reasons, so the counts exceed 100 (section 5.4, Table 4, p. 1517). The authors “only run each of our experiments once” (section 6.1, p. 1518), and state that if the LLM “generates a completely wrong initial proof, PALM struggles to fix it” (section 6.2, p. 1518).

Inference: the trusted result is Coq's kernel acceptance of each completed script. The LLM, TF-IDF/KNN/BM25 retrieval, repair rules, CoqHammer, timeout policy, and selected Coq versions are parts of the search procedure and benchmark setup, not of the trust base. The paper does not evaluate Verus, whether specifications are correct, or whether proofs survive library changes.

Inference: VL should not redo a generic “generate then repair” claim without Verus benchmarks and denominators. A useful new experiment is to compare Verus repair policies on the same failed obligations, record checker acceptance and repair cost, and test whether proofs survive dependency and specification changes.

## techniques for the catalog

- error taxonomy — classify checker failures by wrong applications, references, rewrites, introductions, tactic misuse, and structure
- premise retrieval — select relevant lemmas with TF-IDF/KNN and rerank with BM25 before prompting a proof generator
- targeted repair — replace names, rename binders, fix structure markers, and augment premises based on diagnostics
- proof backtracking — undo failed high-level steps and search alternative proof structure with a symbolic prover
- generate-then-repair evaluation — report successes, ablations, denominators, overlapping failure categories, and runtime settings
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, when CoqHammer fails to solve a goal, it is clear that PALM needs to backtrack to an earlier point in the proof to see if it can be solved instead."): what I checked: every quotation, number, section and page reference, and technique step against the full paper text; what I changed: replaced all page references with the printed pages 1509–1520, added BM25 reranking to retrieval, corrected bullet transformation (unsolved-goal case goes to backtracking), corrected the benchmark description (not just Coq 8.10–8.12 compatibility), corrected "all four LLMs together" to PALM with all four LLMs, renamed failure causes to the paper's terms, added baseline and LLM-alone numbers and the run-once and initial-proof limits, removed the unsupported claim that missing-premise failures show checker-approved proofs omit premises, marked advice as Inference; what I did not check: figures shown only as images (Figures 4, 9, 10, 11, 12), the Verus statements in Inference paragraphs, and the link beyond matching the DOI printed in the paper.
