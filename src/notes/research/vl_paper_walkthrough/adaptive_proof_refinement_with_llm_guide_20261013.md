# Adaptive Proof Refinement with LLM-Guided Strategy Selection
(authored by agents unless marked 🧑)
Tag: `lu2025adaptive`, [paper](https://arxiv.org/abs/2510.25103)

Audit: audited 2026-10-13 against the paper; checked every number, fraction, page and table reference, quotation and technique step; changed the CoqHammer scope (not every non-Rango system uses it), the Section 4.8 note (RQ5 varies the iteration limit, so it is no contradiction), marked three unmarked inferences as Inference, and reworded one unclear admit() sentence; other numbers and quotations matched.

source: Lu, Zhou, Xie, Jia, Delaware, Zhang, arXiv:2510.25103v2 (9 Sep 2026), ASE '26, 13 pages, no appendix. The system is called Adapt. The prover is Rocq (formerly Coq), not Verus; every Verus form below is an inference.

## what is measured and what stays trusted

Adapt is a repair loop around a failed Rocq proof. After each failure an LLM picks one of three repair moves, the move is carried out, and Rocq checks the new proof. The paper measures how many theorems get a Rocq-accepted proof within 3 repair rounds; it proves nothing itself.

- measured: 651 of 1,720 CoqDev theorems (37.85%) and 484 of 1,171 CoqStoq theorems (41.33%), GPT-4o-2024-08-06, temperature 0, iteration limit 3 (Table 1, p.7; setup in Section 4.3, p.7)
- trusted: Rocq's checker, and CoqHammer, which Adapt, Self-Refine and Self-Refine+RAG are allowed to call (PALM uses it by design; Rango was not modified to use it). Section 4.3 (p.7): “We first invoke CoqHammer on the initial proof state, and once more when a tactic fails.”
- Inference: the theorem statements come from the repositories and are taken as given; the paper never asks whether a statement says the right thing, so specification quality is outside its scope.
- Inference: the LLM's choice of move, its lemma statements and its search keywords are all untrusted search; only the final Rocq check carries soundness.

## technique 1: capture the failure as four fields plus a working context

what it is: a fixed record of a failed proof attempt that every later step reads.

when to use: at the first failure of any proof attempt, before deciding how to repair.

steps (Section 3.2, p.4)
1. record the erroneous tactic, “the specific tactic that caused the error”
2. record the prover's error message
3. record the partial proof, the script before the failing tactic
4. record the stuck proof state: remaining goals plus local variables and hypotheses
5. build the working context: statements of the theorems and lemmas retrieved for the first attempt (TF-IDF and KNN, reranked with BM25, top K = 10; Section 3.1, p.3), and the proof script of one similar theorem
6. pick that similar theorem by BM25 on statement text, top score, no threshold: “We select the theorem with the highest similarity score and include its proof, without setting a minimum similarity threshold.” (Section 3.2, p.4)

why position matters, in the paper's words (Section 3.2, p.4): “For instance, a simple syntax error in a nearly completed proof could be fixed by regeneration, whereas a failure near the beginning could signal a more fundamental issue with the overall proof strategy.”

Verus form. Inference: Verus has no tactic state. The nearest record is: the failing obligation (which `assert`, `ensures` clause, `invariant` or `decreases` Verus reports), its source span, the error text, the function with its `requires` and `ensures`, and the proof text above the failing line. The working context becomes the signatures (`requires`/`ensures`) of nearby `proof fn` lemmas and `spec fn` definitions, plus one already-verified function with a similar signature and its full proof body. What does not carry over: the partial-proof-then-goal split; Verus reports which obligation failed, not what remains to be shown.

evidence: the paper has no ablation that removes only this record. The closest is Self-Refine (state, no working context) at 503 of 1,720 against Self-Refine+RAG (state plus working context) at 549 of 1,720 on CoqDev (Table 1, p.7).

limits: one similar proof only, “Due to the context window limit of the LLM” (Section 3.2, p.4). No similarity threshold; Inference: the example proof may therefore be unrelated.

## technique 2: an LLM picks the repair move each round

what it is: one LLM call that reads the record from technique 1 and returns exactly one of three labels with arguments.

when to use: Inference: when several repair moves exist and their costs differ. Section 5.1 (p.10) states the caveat: “This is because a good strategic choice does not guarantee a successful proof.”

steps (Section 3.3 and Figure 6, p.4)
1. give the LLM the theorem statement, the definitions in it, the four failure fields, the working-context lemmas and the similar proof
2. ask it to analyse why the attempt failed and whether the context is enough
3. require one of three output shapes:
   - `Lemma Discovery; [name_1, name_2 ...]`, names being existing lemmas to adapt, `[]` for none
   - `Context Enrichment; [keyword_1, keyword_2,...]`
   - `Regeneration`
4. run the chosen move, check with Rocq, and on failure loop with the new failure record and the updated working context (Section 3, p.3)
5. stop on success or at the iteration limit (3 in all experiments but one; Section 4.3, p.7)

The prompt's guidance for the third label is verbatim (Figure 6, p.4): “Directly regenerate the proof if the current context seems sufficient or the previous proof is unpromising.”

Verus form. Inference: the same call works unchanged, with the Verus record from technique 1 as input. The three labels map to: write a new `proof fn` helper; search the crate and `vstd` for existing lemmas and `spec fn` definitions; rewrite the proof body. Inference: Verus repair has moves Adapt lacks (strengthen an `invariant`, add a `#[trigger]`, add a `decreases` clause, `reveal` an `opaque` function), so a Verus decision-maker needs more labels. The authors allow for this (Section 3.3, p.4): “We do not claim that these three strategies are complete, as other useful refinement strategies may exist.”

evidence, all on CoqDev (1,720 theorems), GPT-4o, limit 3 (Table 5, p.9)
- LLM decision-maker: 651 (37.85%), 1.35 iterations, 16,348 input and 4,383 output tokens on average
- hand rules (technique 7): 647 (37.62%), 1.37 iterations, 24,244 / 6,109 tokens
- fixed order regeneration, enrichment, discovery: 613 (35.64%), 1.58 iterations
- random: 605 (35.17%), 1.61 iterations
- trained classifier: 595 (34.59%), 1.24 iterations, 9,801 / 3,157 tokens
- Inference: the LLM beats hand rules by 4 theorems of 1,720, with temperature 0 and one run; the paper gives no variance, so the success-rate gap over rules is not shown to be real. The measured gain over rules is token cost, not proofs.

where it fails (Section 4.9, p.9-10; 100 failed CoqDev theorems sampled and read by hand): 39% wrong move. In 25% the LLM never chose context enrichment though an existing lemma was needed; in 14% it never tried lemma discovery though a new lemma was needed. Figure 12a (p.10) shows a case where it chose regeneration in every round.

## technique 3: lemma discovery in two stages, each filtered by the checker

what it is: propose helper-lemma statements from the stuck state, keep only those the prover accepts as statements, then prove each one separately, and keep only the proved ones.

when to use: when the stuck goal needs a fact no available lemma states. The paper's example (Section 3.4, p.5): the state in Figure 3c has hypothesis `H : n + 1 <= m + 1`, induction hypothesis `IHn : forall m, n <= m -> leb n m = true`, and goal `leb (n + 1) (m + 1) = true`; the missing bridge is `(n + 1) <= (m + 1) -> n <= m`.

steps (Section 3.4 and Figure 7, p.5)
1. prompt with theorem statement, stuck proof state, definitions, and the existing lemmas in the working context; ask for new, non-trivial statements, each with a reason why it is correct and useful
2. check each statement alone with Rocq; “Any invalid statements are discarded.”
3. for each surviving statement, run the same proof generation as for the first attempt (Section 3.1)
4. add only proved lemmas to the working context
5. regenerate the main proof with the updated context, the old failure record, and an instruction to use the new lemmas

The design reason is stated (Section 3.4, p.5): “To address this, Adapt employs a two-stage process that decouples the generation of lemma statements from the generation of their proofs.”

Verus form. Inference: a helper lemma is a `proof fn` with `requires` and `ensures`. Stage 1: emit only the signature with body `admit()` and run Verus; a signature that fails type or mode checking is dropped. Stage 2: replace `admit()` with a generated body and verify that function alone. Step 5: call the lemma inside a `proof { }` block, or in `assert(...) by { ... }`, at the failing point. What changes: in Verus an unproved lemma left as `admit()` lets its callers verify anyway, so the filter in step 4 must be enforced by a scan for `admit` and `assume`. What does not carry over: Rocq's separation of `Lemma` statement from `Proof` script is syntactic; in Verus the stage-1 check also needs every `spec fn` the statement mentions to be in scope.

evidence: removing lemma discovery drops CoqDev from 651 to 590 of 1,720 (Table 3, p.8); the paper states the full system proves 10.34% more than that variant (651/590). Inference: CoqDev is built to need this; 23.2% of its human proofs use a declaration from the same commit (Section 4.1, p.6).

where it fails: 15% of the 100 sampled failures, where it “only proposed trivial lemmas or failed to prove the proposed lemmas” (Section 4.9, p.10). Figure 12b: the right statement `valt_dec` was proposed and not proved. Section 5.2 (p.10) says of the statements: “some are trivial, syntactically flawed, or unprovable.” Not in the paper: any check that a proposed lemma is used by, or even relevant to, the final proof.

## technique 4: adapt an existing lemma, reusing its proof

what it is: take a lemma that almost fits, and ask for a modified statement together with a modified proof.

when to use: an existing lemma has the right shape but the wrong direction or generality. The paper's case: `n_le_m_Sn_le_Sm` (`n <= m -> n + 1 <= m + 1`) does not apply in Figure 3c, its converse `Sn_le_Sm_n_le_m` does.

steps (Section 3.4 and Figure 8, p.5)
1. the decision-maker names the lemmas to adapt (technique 2, step 3)
2. for each, give the LLM the theorem, stuck state, definitions, working-context lemmas, and that lemma with its proof
3. ask for an analysis of how to adapt it, then the refined statement and proof together, reusing the original proof where possible
4. run statement and proof in Rocq; “Only those lemmas with both a well-formed statement and a correct proof are added to the working context.”

Both this and technique 3 run whenever lemma discovery is chosen (Section 3.4, p.5): “Adapt applies both mechanisms rather than choosing between the two.”

Verus form. Inference: copy a verified `proof fn`, change its `requires`/`ensures`, and edit the body; verify alone. Useful Verus variants of the paper's converse example: the same lemma over `Seq<T>` instead of a concrete type, or with a weaker `requires`.

evidence: none separate from technique 3; Table 3 ablates both together.

## technique 5: keyword search for more context, keywords chosen by the LLM

what it is: retrieval where the query is a short list of names the LLM extracts, not the whole proof state.

when to use: the needed lemma probably exists in the project or its libraries but was not retrieved.

steps (Section 3.5, p.5)
1. the decision-maker outputs keywords, such as names of definitions or lemmas in the stuck state, or names of lemmas used inside the similar proof that are missing from the working context
2. match keywords against the statements of available theorems and lemmas; Figure 6 (p.4) says “Lemmas with the listed keywords in the statements will be retrieved.”
3. add the hits to the working context
4. regenerate the proof as in technique 3 step 5, told to use the new context

why not the whole state (Section 3.5, p.6): for Figure 3c the state contains `nat` and `bool`, and “Including them in the query would lead the retrieval system to fetch broadly related but unhelpful lemmas about natural numbers or booleans, potentially missing a lemma n_le_m_Sn_le_Sm particularly relevant to the inequality in the current goal.”

Verus form. Inference: keywords are `spec fn` names and type names in the failing obligation; the search runs over `proof fn` signatures in the crate and in `vstd`. The retrieved lemma is then called explicitly, or enabled with `broadcast use` when it is a `broadcast proof fn`.

evidence, CoqDev, 1,720 theorems (Table 3, p.8): no enrichment 622 (36.16%); enrichment with the full stuck state as query 625 (36.34%); LLM keywords 651 (37.85%). Section 4.6 (p.8) adds that the full-state query “increases token consumption by 7.44%”.

where it fails: 17% of the 100 sampled failures had ineffective keywords (Section 4.9, p.10). Inference: matching is on names in statements, so a lemma about the same concept under another name is missed.

## technique 6: regeneration with the failure in view

what it is: a fresh LLM proof attempt that sees the previous failure record and working context. It is the fallback and the cheapest move.

steps (Section 3.6 and Figure 9, p.6): give theorem, the four failure fields, definitions, lemmas and similar proof; ask the model to analyse first, then “repair the proof if the error is simple, or generate a new proof if the prior proof is infeasible”.

Verus form. Inference: this is the plain repair loop that Verus tools already run; nothing new carries over.

evidence: regeneration alone (Adapt_base) proves 519 of 1,720 (30.17%) on CoqDev (Table 3, p.8).

## technique 7: hand rules as a decision-maker

what it is: three ordered checks with no LLM call (Section 4.7, p.9).

steps
1. if the similar proof uses lemmas absent from the working context, choose context enrichment
2. else if the proof state mentions definitions that appear in no working-context lemma, choose lemma discovery
3. else regenerate

The stated reason for rule 2 (Section 4.7, p.9): “A definition in the goal without corresponding lemmas indicates an absence of established properties and therefore requires lemma discovery.”

Verus form. Inference: rule 2 translates directly: a `spec fn` in the failing obligation that no in-scope `proof fn` mentions in its `ensures` signals a missing lemma. Rule 1 needs a similar verified function to compare against.

evidence: 647 of 1,720, against 651 for the LLM, at about 48% more input tokens (24,244 against 16,348; Table 5, p.9), because the rules pick lemma discovery too often (Section 4.7, p.9).

## technique 8: a benchmark from commit history with same-commit masking

what it is: CoqDev, tasks cut from the history of real projects so that lemmas written together with a proof are hidden.

when to use: when measuring a prover on tasks where it must invent helpers. The paper's objection to hiding only the target proof (Section 4.1, p.6): “In other words, this simple masking-in-the-middle evaluation setting provides the LLM with important information that may not exist when the proof was actually written.”

steps (Section 4.1, p.6)
1. take GitHub projects whose main language is Rocq as of February 20, 2025, newest first, that build from a Makefile or _CoqProject: 14 projects, 2,225 commits
2. diff each commit against its parent to find new or changed theorems
3. for each, hide its proof and every other theorem and lemma introduced in that commit, and everything from later commits
4. sample at most 200 theorems per project: 1,720 theorems; on average 60.34 same-commit lemmas and theorems hidden per task; human proofs average 16.1 tactics, median 7.0

Verus form. Inference: the recipe applies to a Verus repository unchanged: per commit, hide the body of each new `proof fn` or verified `fn` and every other `proof fn` added in that commit. It would measure whether an agent can invent the helper lemmas a human wrote alongside.

## contradictions and numbers that do not add up

- The abstract counts “five existing methods”; Section 4.2 (p.7) says two of the five were built by the authors: “we build two additional baselines, Self-Refine and Self-Refine+RAG”.
- All “% more” figures are relative counts, not percentage points: 11.26% is 484/435 on CoqStoq, 18.58% is 651/549 on CoqDev. In points the leads are 4.18 and 5.93.
- Adapt_base is described as regeneration only and proves 519; Self-Refine+RAG, which also only regenerates with an initialized working context, proves 549 (Tables 1 and 3). Section 4.6 compares Adapt_base only to Self-Refine (503). The 30-theorem gap between two near-identical designs is not explained. Inference: it bounds the noise or prompt sensitivity of these counts, which is larger than the 4-theorem lead over hand rules.
- Section 4.3 (p.7) sets the iteration limit to 3 in every experiment except RQ5; Section 4.8 (p.9, RQ5) varies it and speaks of “all 5 iterations”. The limits tried in RQ5 are not stated and Figure 11's values are not given as numbers.
- The baselines together prove 133 CoqDev theorems that Adapt misses, while Adapt alone proves 91 that no baseline does (Section 4.4, p.7).
- The best classifier reaches 82% accuracy at predicting the human's move (Table 4, p.9) yet does worse than random as a decision-maker (595 against 605). The paper blames features and scarce lemma-discovery data. Inference: accuracy on a label derived from one human tactic says little about which move helps an LLM prover.

## what is already done, and threat

Done, so VL need not redo it: the comparison of five ways to choose a repair move on one benchmark, and the finding that LLM keywords beat whole-state queries for lemma retrieval (651 against 625 of 1,720).

Inference on threat: low. This is a Rocq tactic-proof system with no specification writing, no Rust, and a 37.85% success rate on single theorems. What it does offer a competitor is a loop shape that is easy to copy onto Verus. The paper itself names AutoVerus as fixed-rule repair (Section 6, p.11): “AutoVerus [51] automates the verification of Rust programs using Verus [30] by refining LLM-generated proofs based on the specific error type.”

## techniques for the catalog

- four-field failure record — store failing tactic, error message, partial proof and stuck state, plus retrieved lemmas and one similar proof, as the input to every repair step
- LLM repair-move selection — one LLM call per round returns lemma discovery, context enrichment or regeneration with arguments
- two-stage lemma discovery — generate lemma statements, drop those the checker rejects, then prove each separately and keep only proved ones
- lemma adaptation — rewrite a nearly fitting existing lemma and its proof together for the stuck goal
- LLM-keyword context enrichment — retrieve lemmas whose statements contain names the LLM picks, not the whole proof state
- three-rule strategy selector — missing lemmas from the similar proof mean retrieve, definitions without lemmas mean discover, else regenerate
- same-commit masking benchmark — build tasks from commit diffs and hide every lemma introduced with the target proof
- sampled failure triage — read 100 failed tasks and split them into wrong move, failed execution of the right move, and failed proof generation
