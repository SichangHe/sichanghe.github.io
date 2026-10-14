# A Learning Method for Symbolic Systems Using Large Language Models
(authored by agents unless marked 🧑)
Tag: `fang2026learning`, [paper](https://doi.org/10.48550/arxiv.2605.08694)
## scope

This paper presents LLM2Ltac, which uses an LLM offline to mine reusable symbolic tactics from existing Rocq proofs, validates them, and adds them to CoqHammer. The paper’s central distinction is that the LLM is not a runtime end-to-end prover: “LLM2Ltac asks an LLM to identify latent proof strategies and formalize them into reusable tactics” (Abstract, PDF p. 1). The resulting tactics run inside the symbolic prover without an LLM call during proof search.

The paper states: “We design a testing methodology that ensures mined tactics are generalizable to new proof goals outside the mining dataset.” (Contribution, PDF p. 2) The paper also states: “The prover uses these tactics to convert complex theorems into simpler goals until they can be automatically solved.” (Section 3, PDF p. 3)

The workflow has three stages: tactic mining, validity and generalization testing, and tactic integration (Section 3, PDF p. 3). Mining uses 11,725 Rocq standard-library theorems. Generalization uses 6,462 C-CoRN theorems and 93,424 proof-script positions. Prover evaluation uses 6,199 theorems from CompCert, Coq-Art, Ext-Lib, and Vfa. The abstract reports that mined tactics improve CoqHammer by 23.87% and increase the number proved by a Claude Code agent by 9.90%.

Inference: for VeruLaw, the transferable idea is an offline library of verified proof procedures mined from successful Verus proofs, reducing repeated agent reasoning and runtime model cost.

## technique 1: per-tactic proof analysis and strategy generalization

For every theorem proof, the LLM analyzes each tactic separately, explaining its semantic meaning and its effect on the current proof goal. The authors explicitly analyze per tactic because whole-proof summaries omit steps whose effects seem less apparent (Section 3.1, PDF p. 4). Definitions and types used by tactic parameters are supplied to improve analysis.

A second prompt abstracts these local explanations into general proof strategies. The paper’s example identifies structural induction for recursive data, simplification followed by congruence, and a combination pattern such as `induction <variable>; simpl; <auto-solver>`. The output is natural language first; this is intended to expose reusable reasoning beyond the source lemma.

Verus form. Inference: collect successful Verus proof blocks, split them into individual `assert`, lemma calls, induction-like recursion, and invariant steps, then ask an LLM to explain each step and propose a parameterized strategy. Keep the explanation separate from executable proof code. Verus does not have Rocq’s Ltac language, so the paper’s exact tactic representation does not carry over; a VL representation might be a proof-macro template or an agent skill that emits ordinary Verus constructs.

## technique 2: autoformalization into reusable tactics

The LLM translates each natural-language strategy into Ltac, with Rocq documentation and examples in the prompt. Autoformalization is only translation; correctness and generalizability are not assumed and are tested later (Sections 3.1 and 4.1, PDF pp. 4–5). A parser decomposes the resulting tactic into individual definitions, required headers, and type definitions. Each tactic is wrapped in a Rocq plugin exposing a named interface, so proof scripts can load it without repeatedly editing dependencies.

The paper gives `structural_induction_recursive` as a mined tactic. It pattern-matches goals quantified over positive numbers, naturals, lists, or other inductive types, then applies induction, simplification, and congruence. Another example, `apply_constructor_auto_217`, matches a relational goal, tries `permA_swap`, and then uses `intuition; auto` (Section 5.1, PDF pp. 6–7).

Verus form. Inference: generate a constrained, parameterized recipe that can expand into supported Verus syntax such as `assert`, `assert forall`, lemma calls, `broadcast proof`, and loop invariants. Compile the expansion as a proof function or macro before storage. Inference: do not represent a runtime call to a proof function; the artifact must remain a verifier-checked proof construct. The paper provides no Verus macro language, so this is a design inference.

## technique 3: validity and generalization testing

Validity testing compiles every mined tactic in Rocq. If compilation fails, the LLM receives the tactic and error and repairs it; tactics still failing after a fixed repair budget are discarded (Section 3.2 and 4.2, PDF pp. 4–5). The paper states: “a valid tactic is correct by construction in the Rocq system, and would never result in a incorrect proof” (Section 3.2, PDF p. 4). This means kernel type checking is the hard correctness gate.

Generalization testing evaluates a tactic outside the mining corpus. The system parses it into an independent plugin, inserts it after every original tactic except the final goal-closing tactic in validation proofs, and retains it only when it produces a new proof state without errors. A no-op tactic is discarded. The source theorem is recorded for later retrieval (Section 3.2, PDF p. 4).

The paper’s acceptance threshold in one experiment is a generalization pass rate in `[10%, 100%)`; tactics below 10% are filtered. This is an empirical usefulness threshold, not a logical soundness criterion.

Verus form. Inference: compile each generated proof recipe in a small crate, then insert it at many proof-state positions across held-out Verus theorems. Retain only recipes that change the state and leave all resulting obligations well formed. Record both compile success and held-out application rate. Verus verification is the validity gate; the held-out threshold is only a retrieval-quality filter.

## technique 4: theorem-indexed retrieval and And-Or search

Direct text retrieval over tactic code is weak because Ltac has little descriptive text. LLM2Ltac indexes each tactic by its source theorem, whose statement supplies richer vocabulary. For a new goal, BM25 retrieves the most similar source theorems; the associated mined tactics become candidates (Sections 2 and 3.3, PDF pp. 3–4).

The integration algorithm alternates the existing symbolic prover and retrieved tactics. Each goal is an Or-node: any successful tactic can solve it. A tactic application is an And-node: all resulting subgoals must be proved. The queue first tries the ATP; if it does not solve the goal, it retrieves `k` source theorems, applies each tactic, and enqueues every subgoal (Algorithm 1, Section 4.3, PDF p. 6). For the paper’s `LTree_bisimilar_label` example, CoqHammer cannot solve the theorem directly, but the retrieved induction tactic transforms it into goals CoqHammer can solve.

Verus form. Inference: index reusable Verus recipes by the theorem or function shapes from which they were mined, retrieve by normalized goal/specification text, and combine recipe application with the existing Verus prover. Model proof search as an Or-node over candidate recipes and an And-node over every resulting obligation. The paper’s BM25 and queue are implementation choices; a Verus index may need type and invariant features in addition to text.

## evidence and ablations

Table 3 evaluates 6,199 theorems with a 20-second CoqHammer timeout. Baseline CoqHammer proves 1,592. GPT-5.2 mined tactics raise this to 1,950, a 22.49% increase; DeepSeek-V3.2 raises it to 1,972, a 23.87% increase. Denominators are all 6,199 theorems, with per-project counts: CompCert 4,840, Ext-Lib 187, Coq-Art 842, and Vfa 330 (Table 3, PDF p. 8).

Table 4 samples 50 theorems per benchmark, 200 total, for Claude Code. The base agent proves 71/200, the agent with CoqHammer 101/200, and the agent with LLM2Ltac 111/200, a 9.90% increase over 101. Token consumption falls from 38,346,691 to 34,317,809, a 10.51% reduction (Table 4, PDF p. 8).

The ablation table starts with 35,408 mined tactics, 13,174 valid tactics, and 2,025 generalizable tactics at the `[10%,100%)` threshold. Removing natural-language analysis yields 23,256 mined, 6,371 valid, and 576 generalizable tactics, decreases of 34.31%, 51.64%, and 71.56%. Removing natural-language generalization yields 38,003 mined, 4,415 valid, and 231 generalizable tactics; valid and generalizable counts fall 66.49% and 88.59% (Table 6, PDF p. 9). These denominators are tactic counts, not theorem counts.

Without generalization filtering, CoqHammer plus all mined tactics proves 1,708/6,199, versus 1,972/6,199 with filtering, a 13.39% difference (Table 7, PDF p. 9). This supports filtering as a retrieval-noise control.

## trusted boundary, assumptions, and threat to VL

The Rocq kernel is the final correctness authority; the LLM’s analysis, strategy abstraction, autoformalization, BM25 retrieval, and threshold are not trusted for soundness. The method assumes the source proof corpus contains useful reusable patterns and that held-out theorem applications represent future goals. Results are on Rocq and Ltac; no Verus experiment is reported.

Inference: VL should not redo runtime LLM proof search for every repeated pattern. An offline mining pipeline could turn successful verified Rust proofs into checked, reusable recipes. The primary threat is overfitting or retrieval noise: a recipe can compile and be logically sound yet be irrelevant, wasting proof search. A secondary threat is corpus bias: patterns mined from existing agent proofs may preserve their specification mistakes. Verus kernel checking protects proof soundness, not specification adequacy.

Inference: because Verus has no Ltac analogue in the cited paper, the first VL implementation should store recipes as ordinary proof-function templates and test them against held-out obligations, rather than inventing unsupported Verus syntax.

## techniques for the catalog

- per-tactic strategy mining — explain each proof step, abstract reusable strategies in natural language, and formalize them later
- checked autoformalization — translate strategies into symbolic proof procedures and reject anything the prover cannot compile
- held-out generalization testing — insert each candidate into many external proof states, retain only non-no-op applications above a measured threshold
- theorem-indexed retrieval — retrieve source theorems with BM25 and use their associated tactics to overcome sparse tactic text
- And-Or tactic search — alternate ATP solving with candidate tactic application, requiring every generated subgoal to close
Checked 2026-10-13: audit record fang2026learning; paper-study comparison complete; gate executed; experiments not rerun
