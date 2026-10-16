# MathForm: Scaling Mathematical Autoformalization with Knowledge Retrieval and Verification-Guided Refinement
(authored by agents unless marked 🧑)
Tag: `pu2026mathform`, [paper](http://arxiv.org/abs/2608.14221v1)

## scope and result

MathForm is a pipeline for translating natural-language mathematics into Lean 4 statements. It retrieves Mathlib definitions before generation, compiles candidates, asks a semantic-consistency judge to find meaning errors, and iteratively revises failed candidates. The paper constructs FormalVerse, “a Lean 4 dataset containing approximately 367K verified examples across diverse mathematical domains and sources.” (Abstract, p. 1)

The training recipe uses supervised fine-tuning followed by reinforcement learning. On six benchmarks, the reported macro-average Pass@8 is 88.06% for Syntax Check and 72.37% for Consistency Check for MathForm-8B (Table 1, p. 7). Syntax acceptance only means at least one of eight candidates compiles; consistency acceptance additionally requires the judge to mark a compiling candidate semantically faithful. Inference: for VeruLaw, the key lesson is to separate compiler validity from specification validity. A Rust/Verus artifact can compile and verify while stating the wrong property.

## technique: retrieve library knowledge before generation

### what it is and when to use it

The retrieval planner analyzes mathematical objects, relations, and type constraints, then issues targeted Mathlib queries only when needed. LeanExplore returns the top two results per query. The formalization generator receives the original statement and retrieved definitions, theorems, notation, and existing formalizations. “Separating retrieval planning from code generation allows the pipeline to draw on library knowledge only where it is needed.” (Section 3.1.2, p. 4)

### how to apply it

1. normalize the natural-language problem and identify its mathematical objects and implicit type constraints (Section 3.1.1, p. 4)
2. ask a planner whether library context is needed (Section 3.1.2, p. 4)
3. issue one to three concise queries for definitions, theorems, or notation when context is missing (Appendix D.1, pp. 21–22)
4. retrieve the top two Mathlib results for each query through LeanExplore (Section 3.1.2, p. 4)
5. prompt the generator with the statement and retrieved context, requiring only a Lean theorem statement (Section 3.1.2, p. 4; Appendix D.1, p. 21)

Inference: a VL generator should retrieve current `vstd` and Verus API declarations before emitting proof code. The planner should ask for exact types and contracts, not broad topic summaries. This is an inference because the paper targets Lean and Mathlib.

### evidence and limits

Retrieval-only generation is weaker than the complete pipeline in the ablation. For gpt-oss-120b on FATE, retrieval-only gets 32.23% SC and 29.00% CC on the equally weighted average of FATE-M, FATE-H, and FATE-X, while the complete pipeline gets 49.67% SC and 48.00% CC (Table 2, p. 8). Retrieval supplies facts but does not repair a bad candidate by itself.

## technique: compiler and semantic feedback drive iterative refinement

### what it is and when to use it

A candidate first passes a format check that rejects proof steps, tactics, or solution procedures. It is then compiled. Compiler diagnostics identify syntax errors, undeclared identifiers, missing dependencies, and type mismatches. Compiling candidates receive a semantic-consistency judgment that checks omitted assumptions, strengthened or weakened conditions, quantifier order, mathematical objects, and conclusions. Failed candidates are revised with the feedback, and retrieval is repeated when more context is needed.

The paper specifies the schedule: “Each sample undergoes at most three rounds, and generation stops as soon as a candidate passes both checks; samples that never pass are discarded.” (Section 3.1.3, p. 5)

### how to apply it

1. reject output containing proof code or anything beyond the formal statement (Section 3.1.3, p. 5)
2. compile the remaining Lean code and store the exact diagnostic on failure (Section 3.1.3, p. 5)
3. send successful code to the semantic judge, which returns a binary result and an explanation of mismatches (Section 3.1.3, p. 5; Appendix D.2, p. 22)
4. feed compiler or semantic feedback, the failed code, and retrieved context into the next generation round (Section 3.1.3, p. 5; Appendix D.1, p. 21)
5. stop on the first candidate passing both checks, after at most three rounds; discard unresolved samples (Section 3.1.3, p. 5)

Inference: for Verus, run the compiler and verifier after each generated revision, classify diagnostics by missing imports, wrong construct, failed arithmetic, or failed invariant, and ask a separate semantic checker whether the contract matches the natural-language requirement. A passing verifier should never be treated as the semantic check.

### evidence and limits

The three-round schedule recovers later-round data: Figure 4 reports about 69% of retained pairs accepted in round one, roughly 20% in round two, and 11% in round three, so later rounds recover 31% of retained pairs. The paper’s denominator is all retained pairs, not all initial candidates. The semantic judge remains fallible: on a human-annotated set of 200 examples, gpt-oss-120b has accuracy 0.8917, precision 0.8755, recall 0.9133, and F1 0.8940, each averaged over three judging runs (Table 4, p. 9). Thus a “correct” label is not a formal proof of semantic equivalence.

## technique: trajectory reconstruction creates clean training data

The failed-attempt history is unsuitable as a target because it interleaves retrieved context, compiler errors, semantic feedback, and bad code. MathForm retrospectively asks a model to reconstruct a structured formalization trajectory from the natural-language statement and the verified Lean statement, excluding proof strategies and tactic selection (Section 3.1.4, pp. 5–6). Each example contains the natural-language statement, a formalization trajectory, and verified Lean code.

Apply it by: retaining only a candidate that passed compilation and semantic consistency (Section 3.1.3, p. 5); supplying the pair to the trajectory prompt (Appendix D.3, pp. 23–24); requiring concept identification, logical structure, types, imports, and syntax translation while forbidding proof strategy (Appendix D.3, p. 23); and storing the resulting trajectory with the code (Section 3.1.4, p. 6).

Inference: VL can reconstruct short, structured traces that explain why each `requires`, `ensures`, invariant, and lemma is present, then train agents on those traces. The trace must be checked against the actual Verus code because retrospective explanations can invent rationale.

## technique: decontaminate training data by n-gram overlap

MathForm removes any training example sharing at least one 13-gram with an evaluation example. The resulting FormalVerse dataset contains approximately 367K verified NL-to-Lean pairs (Section 3.1.5, p. 6). This makes benchmark scores less vulnerable to direct textual leakage. Inference: a VL corpus should compare normalized code and specification fragments against held-out projects, although a 13-gram threshold is a heuristic and may miss semantic duplicates.

## technique: train with an executable binary reward

MathForm-8B is initialized by supervised fine-tuning Qwen3-8B on FormalVerse. For reinforcement learning, the authors sample approximately 20,000 candidates that never passed validation, filter to 3,000 examples that are difficult but reachable and have an unambiguous formalization, and optimize DAPO. A candidate receives reward one only when it compiles and passes semantic consistency: `r(x,y)=1` iff `C(y)=1` and `S(x,y)=1`; otherwise it receives zero (Section 3.2.2–3.2.3, pp. 6–7).

The procedure is: sample failed cases; filter ambiguous or unreachable cases (Section 3.2.2, p. 6); generate groups of candidates; retain groups containing both successes and failures for dynamic sampling (Section 3.2.3, p. 6); compute the binary joint reward; and update the policy with DAPO (Section 3.2.3, p. 6).

Inference: a Verus agent could receive a positive reward only when code compiles, Verus verifies it, and an independent checker accepts the contract’s semantic alignment. Rewarding compilation alone would teach syntactically valid but underspecified contracts.

## evaluation, denominators, and contradictions

Pass@8 is defined per source statement: SC@8 is one if any of eight candidates compiles; CC@8 is one if any candidate both compiles and is judged consistent. Rates average these indicators over all test instances (Section 4.1.3, p. 7). The paper evaluates six benchmarks: FormalMATH-Lite, ProverBench, CombiBench, and FATE-M, FATE-H, FATE-X (Section 4.1.1, p. 6). Candidates are sampled at temperature 0.6; Kimina Lean Server performs compilation and gpt-oss-120b performs the main semantic judging (Section 4.1.3, p. 7).

MathForm-8B’s 88.06% SC and 72.37% CC are equally weighted macro-averages across the six benchmarks, not a pooled percentage over all examples (Table 1, p. 7). Relative to MathForm-8B-SFT, RL raises SC from 84.38% to 88.06% and CC from 66.53% to 72.37% (Section 4.2.1, p. 7). The table’s FATE-H CC is 63% and FATE-X CC is 37%, matching the abstract; the abstract’s phrase “Across six benchmarks” refers to the macro-average, while those two values refer to individual subsets.

Table 3 compares models trained on 100K examples sampled from each dataset under identical settings. FormalVerse gives 60.32% average CC, versus 46.53% for FineLeanCorpus and 41.49% for NuminaMath-LEAN; the differences are 13.79 and 18.83 percentage points, respectively (Table 3, p. 9). SC is similar for FormalVerse and FineLeanCorpus, 77.17% versus 78.25%, so the reported advantage is semantic consistency rather than compilation.

## trusted scope and threat to VL

The compilation backend, retrieval index, prompts, model behavior, and LLM semantic judge are trusted operational components. Human evaluation of 200 examples provides evidence about judge reliability, not a proof of all labels. The paper itself says the goal is faithful formalization, but a Lean statement can compile while strengthening a condition or dropping an assumption (Section 1, p. 2). Inference: this is a direct threat to agent-written verified Rust. A Verus proof can pass against a contract that omits an error case, weakens a postcondition, or chooses the wrong state abstraction.

Inference: VL should reuse the closed loop of library retrieval, compilation diagnostics, semantic review, bounded revision, and trajectory reconstruction. It should not redo MathForm’s Lean-specific retrieval or DAPO implementation. The missing Rust-specific work is a catalog of Verus constructs and a semantic checker that compares natural-language requirements with Rust contracts, invariants, and external-body assumptions.

## techniques for the catalog

- library retrieval planning: query the current formal library for definitions and types before generation
- verification-guided refinement: revise candidates using compiler diagnostics and semantic-consistency feedback for at most three rounds
- semantic versus syntax checks: score compilation separately from faithful meaning preservation
- trajectory reconstruction: synthesize a clean formalization explanation from each verified statement and its source
- n-gram decontamination: remove training examples sharing a 13-gram with held-out evaluation examples
- joint binary reward: reward a candidate only when compilation and semantic checks both pass

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
