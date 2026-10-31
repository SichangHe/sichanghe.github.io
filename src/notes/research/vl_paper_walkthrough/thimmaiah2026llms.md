# LLMs Lean on Priors, Not Programming Language Semantics
(authored by agents unless marked 🧑)
Tag: `thimmaiah2026llms`, [paper](https://arxiv.org/abs/2510.03415v3)

## scope and result

The paper introduces PLSemanticsBench to test whether language models execute programs by applying supplied formal rules or by relying on familiar symbol meanings. It formalizes a small C-like language C⋆ in two semantics: fine-grained small-step structural operational semantics (S) and coarser K semantics. The benchmark has Human-Written, LLM-Translated, and Fuzzer-Generated splits. The paper states: “Formal semantics (Pierce, 2002) offers a uniquely controlled setting for studying this question.” (section 1, p. 1). It tests four hypotheses: composing rules to a final state (H1), selecting rules when the state does not change (H2), sustaining rule use over long traces (H3), and following rules after semantic shifts (H4).

The authors report a robustness failure. The abstract states: “Across 11 frontier LLMs, strong final-state accuracy under standard semantics (up to 90%) drops sharply—by as much as 40–60% points—under semantic mutations and increasing structural complexity.” Its parenthetical is inconsistent with Table 4, which reports several standard-semantics scores of 100%. The abstract also states: “Only a handful of models achieve non-zero long-horizon conditioning accuracy, and even the best systems reach just 35%.” Table 6 supports that trace result. These percentages measure model/task accuracy over the full relevant dataset, with malformed predictions contributing no correct matches. They do not count formally verified programs; the interpreters supply execution ground truth.

## technique 1: define executable formal semantics and traces

What it is. Represent a program configuration as a statement or expression paired with a store, then define transition rules. Section 2 illustrates expression transitions ⟨e,σ⟩ →E ⟨e′,σ⟩ and statement transitions ⟨s,σ⟩ →S ⟨s′,σ′⟩. The complete C⋆ formalization also includes a loop-control stack χ (Appendix B.2, pp. 15–20). Definition 2.1 gives execution as a pair of final state and trace; Definition 2.2 sequences statement executions compositionally. Each statement-step can require an ordered list of rules; its resulting store is paired with each rule in that list.

When to use it. Inference: Use this when testing exact operational behavior, especially when state mutation, loops, or nested control flow make a final-state-only oracle insufficient.

How to do it. (1) Specify the grammar (illustrative language: section 2, Fig. 1a, p. 2; complete C⋆ grammar: Appendix B.1, Fig. 5, p. 15). (2) Define inference rules with premises and side conditions above the line and conclusions below it (section 2, p. 2). (3) Implement an execution engine: the authors use the K-framework for K experiments and a custom ANTLR4-based interpreter for S (section 3, p. 4). (4) Record ordered rule applications and the resulting stores according to Definition 2.1. (5) For C⋆, stop at an empty statement list, halt, or ERROR (Appendix B.2, p. 16). Use the final state and ordered trace as ground truth.

The paper’s example reduces a sum of literal values to their sum (Fig. 1b, p. 2). Inference: A Verus adaptation could specify the transition relation and prove that an executable interpreter implements it. This would require a separate Rust/Verus implementation and proof; the paper supplies neither.

Evidence. The authors state: “We validate correctness by executing the programs with K-framework and verifying outputs against the test oracles.” (section 3.1, p. 4). This checks the adapted programs against public tests. Inference: Using those executions as ground truth trusts the engines and test oracles; agreement on public tests does not establish interpreter correctness for every program.

## technique 2: semantic mutation as a distribution-shift test

What it is. Preserve rule structure but alter the mapping from symbols to meanings. KeywordSwap exchanges meanings of selected operators (for example, plus and minus), while KeywordObf replaces standard operators and keywords with unfamiliar Caucasian-Albanian characters. The paper explains: “Because KeywordSwap preserves surface syntax while altering operational meaning, correct reasoning requires conditioning on the explicit transition rules rather than defaulting to pretraining-derived interpretations of common symbols.” (section 3.2, p. 5).

When to use it.

How to do it. (1) Start with standard C⋆ semantics and programs. (2) For KeywordSwap, exchange the meanings of selected operators while preserving program syntax (Table 3, p. 5). (3) For KeywordObf, consistently replace operators and keywords in both the program and formalization, preserving their standard behavior under the new symbols. (4) Execute each program under its corresponding formalization to obtain the oracle (Fig. 2, p. 3). (5) Supply that program and formalization to the model, then compare its final state, rule list, or trace with the oracle.

Evidence. Table 4 (p. 7) reports Human-Written PredState accuracy for DS-Qwen 32B of 93% standard versus 21% swap under K, and 95% versus 3% under S: drops of 72 and 92 percentage points. GPT-5-mini drops from 99% to 79% under K and 100% to 79% under S. Gemini-2.5-pro is more robust: 100% to 97% under K and 99% to 98% under S. Thus the effect varies substantially by model and formalization. These differences are percentage points, not relative error rates. Appendix F (p. 31) tests a tokenization explanation only for GPT-4o-mini, with and without CoT, on Human-Written PredState. Replacing rare characters with symbols verified to occupy one GPT-4o-mini token leaves accuracy low in all four settings (Table 11). Inference: That ablation supports the authors’ explanation for the tested model; it does not establish the same result for every tokenizer or model. A Verus adaptation would need its own specification and correctness checks.

## technique 3: isolate local rule selection (PredRule)

What it is. PredRule isolates rule selection from intermediate store updates. It asks for the ordered semantic rules used to execute a statement given its initial state. The store may change at the terminal statement-step (section 5.2, p. 8). The authors also transform sampled statements to avoid intermediate store changes (Appendix G.3.1, p. 38).

How to do it. (1) Sample statements and their preceding states from Human-Written programs. Keep declarations, assignments, and halt unchanged; replace while bodies and both if-else bodies with halt. For break, capture its closest enclosing loop and remove preceding statements from its body (Table 18 and Appendix G.3.1, p. 38). (2) Supply the resulting program, initial store and control stack, and formal rules (Appendix E.3.2, pp. 24–26). (3) Ask for the complete ordered rule list. (4) Count an item correct only when the list exactly matches the oracle. The numerator sums matches among well-formed predictions D′, but the denominator is the full dataset |D| (section 5.2, p. 8). (5) Repeat under standard, swap, and obf semantics.

Evidence. The authors state: “Across PredRule (Table 4, right-side), most systems exhibit strongly negative ∆is, implying that even when state evolution is removed, local rule selection remains dominated by symbol priors rather than formal definitions.” (section 5.2, p. 8). Here ∆is is shifted-semantics accuracy minus standard-semantics accuracy within the same formalization (section 5, p. 6). Inference: For Verus, testing model-generated proof steps against renamed APIs could probe dependence on familiar names. Such a diagnostic would not itself establish proof correctness.

## technique 4: long-horizon trace generation (PredTrace)

What it is. PredTrace asks for the complete sequence of semantic rules and intermediate states, rather than only a final store. Ground truth is the trace JPKτΨ from Definition 2.2.

How to do it. (1) Use Human-Written programs with an empty initial variable state. (2) Execute each under S or K to obtain the rule/state trace. (3) Prompt the model for the full ordered trace. (4) Require exact trace equality. As in PredRule, the denominator is the full dataset |D|, although only well-formed predictions D′ can contribute correct matches (section 5.3, p. 8). (5) Compare standard, swap, and obf conditions.

Evidence. The authors state: “PredTrace sharply exposes the fragility of long-horizon rule conditioning: only four models achieve non-zero accuracy at all, and even these remain far from reliable.” (section 5.3, p. 9). Table 6 (p. 8) displays only those models on the Human-Written split. K accuracy percentages for QwQ 32B are 18 standard, 16 swap, and 15 obf; Gemini-2.5-pro scores 25, 25, and 25. Under S, Gemini-2.5-pro scores 32, 35, and 35, the table’s maximum.

## what is proved, trusted, and left unresolved

The paper defines execution and evaluates predictions against executions from K and the ANTLR4-based interpreter. It provides no mechanized correctness proof for those engines and no Rust/Verus evaluation.

## techniques for the catalog

- executable small-step semantics: define configuration transition rules, an interpreter, and rule/state traces as ground truth
- semantic mutation testing: exchange familiar operators’ meanings, or replace program and rule symbols consistently with unfamiliar symbols
- state-free rule selection: evaluate exact rule lists with no store changes before the terminal statement-step
- long-horizon trace scoring: require exact sequences of rules and intermediate states over loops and branches
