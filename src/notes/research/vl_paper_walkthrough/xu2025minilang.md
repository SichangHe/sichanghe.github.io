# A Minimalist Proof Language for Neural Theorem Proving over Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `xu2025minilang`, [paper](https://arxiv.org/abs/2507.18885v4)

## scope and result

This paper redesigns the proof language presented to neural theorem provers. It introduces Minilang, a ten-operation language that mirrors informal proof outlines, translates existing Isabelle/Isar proofs into it, and delegates leaf obligations to an automated prover. The abstract says Minilang has “only 10 proof operations, each with clear semantic distinctions.” A rule-based translator converts approximately 340,000 Isabelle proofs with approximately 85% success, and Minilang models improve pass@1 by up to 20/29 percentage points over Isar models (abstract, p. 1).

The main evaluation uses PISA after updating it to AFP version 2025-02-12 and removing unavailable goals, leaving 2,962 goals (Section 5.2.4, p. 20). With DeepSeek-Prover-Base v1.5, Minilang plus Sledgehammer* reaches 69.1% pass@1, 76.0% pass@4, and 79.2% pass@8; with Llemma it reaches 68.0%, 74.9%, and 78.9% (Table 2, p. 20). Pass@k is the proportion of benchmark goals with at least one verified proof among k samples (Section 5.2.8, pp. 20–21). These denominators are 2,962 PISA goals.

## technique 1: minimize proof-language operations around informal reasoning

What it is. Minilang retains declarative operations for splitting goals and common informal proof moves, plus one context command. Table 1 lists HAVE, CONSIDER (case or existential), RULE, CHOOSE, SIMPLIFY, CASE_SPLIT, INDUCT, END WITH, NEXT, and INTRO (Section 3.1, p. 6). The paper says its “high-level design does not incorporate a tactic system, instead delegating all proof obligations to ATPs” (Section 3, p. 5).

How to apply it. (1) Use INTRO to establish variables and hypotheses. (2) Use RULE to select a proof mode such as contradiction. (3) Use CONSIDER to split cases or bind an existential witness. (4) Use HAVE to state step-by-step intermediate propositions. (5) Use CHOOSE for an existential witness, SIMPLIFY for rewriting, and CASE_SPLIT or INDUCT for structural reasoning. (6) Close the current goal with END or NEXT, optionally naming relevant or avoided lemmas. These commands are semantic aliases; NEXT signals movement to a sibling for readability (Table 1, p. 6; Sections 3.3–3.4.1, pp. 10–11). The paper states: “END and NEXT are syntactic aliases of one another that are semantically equivalent.”

The paper's `sqrt2_not_rational` example uses `RULE proof_by_contradiction`, `CONSIDER` an existential representation, several `HAVE` facts, then closes subgoals with `END` (Figure 3, p. 7). The state machine is a tree: leaves are unproved goals, internal nodes carry contexts, and commands rewrite the leftmost leaf or non-leaf (Sections 3.2–3.3, pp. 6–10). The paper states: “The execution gets stuck at one of the commands because no corresponding transition rule can be found, indicating proof failure.” It also permits commands to finish while the proof remains unfinished (Section 3.2, p. 8).

Inference: a Verus outline language could use `intro`, `have`, `choose`, `case_split`, and `end`-like constructs that elaborate into `proof fn` code and `assert`/`assert forall` steps. This is a design inference; Verus syntax and semantics are not in the paper.

## technique 2: strengthen the automatic backend with hints and simplification

Sledgehammer* has three changes (Section 3.4, pp. 11–12). First, END/NEXT can annotate relevant and avoided lemmas. The refinement pass extracts these hints from tactic arguments and merges them into WITH/WITHOUT annotations, so models can learn to suggest them (Section 4.2.4, p. 17). Undefined references from model hallucinations are filtered before search (Section 3.4.1, pp. 11–12). Second, `auto` simplifies and decomposes goals before Sledgehammer; if it times out, `clarsimp` is used, and `fastforce` runs in parallel as another backend. Relevant/avoided lemmas are assigned simplifier roles using names and expression shapes (Section 3.4.2, pp. 11–12). Third, obtained proofs are cached by goal expression, accelerating replay of costly nondeterministic searches (Section 3.4.3, p. 12).

Evidence. Holding language fixed, upgrading from original Sledgehammer to Sledgehammer* improves all reported metrics by at least six percentage points (Section 5.3.1, p. 21). With DPSK-PB, Minilang/SH* is 69.1% pass@1 versus 59.9% Minilang/SH and 35.5% Minilang without ATP (Table 2, p. 20). Inference: a Verus backend could let the model suggest lemma names, run simplification or trigger controlled automation, filter unknown names, and cache successful proof fragments by normalized goal. Verus solver-context control must follow actual Verus constructs; the paper's Isabelle tactics do not transfer.

## technique 3: translate and normalize a large existing corpus

The translator has four stages (Section 4.2, p. 13). (1) Parse Isar into an AST. The implementation reuses Isabelle's lexer and emits a custom AST with 42 node kinds (Section 4.2.1, p. 14). (2) Elaborate syntax sugar and normalize equivalent proof idioms, reducing the AST to 15 node kinds (Section 4.2.2, p. 14). (3) Map the normalized AST into Minilang. (4) Refine remaining tactics by replacing them with Sledgehammer* calls (Section 4.2.4, p. 17).

Normalization is checked by Isabelle because near-equivalent idioms can diverge in corner cases; the paper says, “We therefore re-run Isabelle’s proof checker to ensure that the modified proofs remain valid, and discard any that fail.” (Section 4.2.2, p. 14). Refinement repeatedly absorbs `APPLY tactic END/NEXT` into END/NEXT with relevant and avoided lemma hints; common `auto`, `simp`, `cases`, and `induct` map directly to SIMPLIFY, CASE_SPLIT, or INDUCT (Section 4.2.4, p. 17). More than 95% of tactics are eliminated, leaving APPLY at 6.7% of translated commands (Section 4.2.4, p. 17). The implementation also retains two auxiliary commands for Isabelle attributes and bundle/module mechanisms, accounting for approximately 1.01% of translated code (Section 4.2.3, p. 16).

Evidence. The translator succeeds on 85.28% of approximately 340,000 proofs, producing approximately 290,000 usable proofs (Sections 4 and 5.1, pp. 12, 18). Success exceeds 70% for short-to-moderate declarative proofs with at most five subgoal declarations and remains above 50% at 15 subgoal declarations (Section 5.1, p. 18).

## technique 4: evaluate language design with controlled ablations

The authors fine-tune two 7B models under six conditions: two languages (Isar and Minilang) × three ATP settings (none, Sledgehammer, Sledgehammer*). The Isar conditions with ATP use Thor-style tactic replacement (Sections 5.2.1–5.2.3, p. 19). The paper states: “These ablation conditions differ only in their training corpus, proof language, and ATP backend; all other experimental settings remain identical across the conditions” (p. 20). Inference: this design separates the effects of the translated language/corpus and the ATP backend; it does not isolate surface syntax alone.

Inference: differences computed from Table 2 show both effects. With SH*, Minilang improves over Thor-style Isar by 4.7–8.0 percentage points across the models and metrics; with SH, the improvement is 12.6–16.0 points (Table 2, p. 20). These table values qualify the text’s rounded claim of “at least 5 percentage points” (Section 5.3.1, p. 21). Upgrading SH to SH* adds at least six points across the reported models and metrics (Section 5.3.1, p. 21). With DPSK-PB at pass@1, Minilang/SH* is 69.1%, Thor-style Isar/SH* 63.9%, Minilang/SH 59.9%, and Isar/no ATP 40.2% (Table 2, p. 20). The authors caution that without ATP, Minilang falls behind Isar because its leading-subgoal discipline requires precise state tracking (Section 5.3.1, p. 21).

## technique 5: parallel proof checking and contamination controls

The evaluation samples k proof attempts from the model, verifies each with Isabelle, and counts a goal as solved if any sample verifies (Section 5.2.8, pp. 20–21). A socket-based parallel Isabelle/ML REPL supports checking on a 3-node cluster with 36 Intel i7 CPU cores; Sledgehammer and Sledgehammer* have 30-second timeouts per invocation (Sections 5.2.8–5.2.9, p. 21). The authors state: “For fair comparison, we reset the local database before each model evaluation” (Section 5.2.8, p. 21). They argue that clearing these premise-goal databases underestimates real-world performance.

PISA is sampled from public AFP and may be contaminated. The paper attributes pretraining filtering to Llemma’s authors: “Llemma explicitly reports that they removed any proofs whose names appear in PISA from their pretraining data [9].” It adds: “However, DPSK-PB makes no such claim in their paper [10]; we cannot rule out the possibility of data leakage between PISA and DPSK-PB’s pretraining corpus” (Section 5.2.5, p. 20).

## what is proved, trusted, and measured

Theorem 1 states Minilang soundness if Isabelle simplifiers, cases, induct, and Sledgehammer* are sound (Section 3.5, p. 12). Theorem 2 states: “Given a Natural Deduction system ND, there exists an ATP such that any proposition provable by ND is provable by Minilang with respect to the ATP” (Section 3.5, p. 12). Measured results are translation success, pass@k, command distributions, and ablation differences. Inference: these conditional results do not establish completeness for the implemented Sledgehammer* backend or correctness of every implementation or model; the neural model remains a proof-script generator.

Inference: for agent-written verified Rust, a DSL can reduce syntactic search burden but may hide backend incompleteness and introduce translation bugs. Verus proof validity must still be checked by Verus, and the DSL's semantics must be reviewed against product requirements.

## techniques for the catalog

- minimalist proof DSL — represent high-level proof outlines with a small set of semantically distinct operations
- tree-state proof execution — model subgoals and inherited contexts as a transition system over proof trees
- hint-guided automation — provide relevant and avoided lemma hints, simplify goals, filter unknown references, and cache proofs
- checked AST translation — parse, elaborate, normalize, translate, and replay-check transformed proof scripts
- backend ablation — isolate proof-language gains from automation-backend gains with matched training conditions
- parallel pass@k checking — sample proof attempts, verify in parallel, and count a goal solved when one passes
