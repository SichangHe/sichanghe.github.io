# LLMs Lean on Priors, Not Programming Language Semantics
(authored by agents unless marked 🧑)
Tag: `thimmaiah2026llms`, [paper](https://www.semanticscholar.org/paper/f50e105bc7e373d60cce40456c22770289159efe)

## scope and result

The paper introduces PLSemanticsBench to test whether language models execute programs by applying supplied formal rules or by relying on familiar symbol meanings. It formalizes a small C-like language C⋆ in two semantics: fine-grained small-step structural operational semantics (S) and coarser K semantics. The benchmark has Human-Written, LLM-Translated, and Fuzzer-Generated splits. The paper states: “Formal semantics (Pierce, 2002) offers a uniquely controlled setting for studying this question.” (section 1, p. 1). It tests four hypotheses: composing rules to a final state (H1), selecting rules when the state does not change (H2), sustaining rule use over long traces (H3), and following rules after semantic shifts (H4).

The central result is a robustness failure. The abstract reports “Across 11 frontier LLMs, strong final-state accuracy under standard semantics (up to 90%) drops sharply—by as much as 40–60% points—under semantic mutations and increasing structural complexity.” It also reports that “Only a handful of models achieve non-zero long-horizon conditioning accuracy, and even the best systems reach just 35%.” These percentages are model/task accuracies, not a count of verified programs; the denominator is the relevant benchmark split and semantic condition. The paper’s measurements therefore concern model behavior, while the formal interpreters and rules provide the ground truth.

## technique 1: define executable formal semantics and traces

What it is. Represent a program configuration as a statement or expression paired with a store, then define one-step inference rules. For S, expression transitions are ⟨e,σ⟩ →E ⟨e′,σ⟩ and statement transitions are ⟨s,σ⟩ →S ⟨s′,σ′⟩. A trace records the ordered rule names and intermediate stores. Definition 2.1 gives execution as a pair of final state and trace; Definition 2.2 sequences statement executions compositionally.

When to use it. Use this when a verifier or model must be tested against exact operational behavior, especially when state mutation, loops, or nested control flow make an end-state-only oracle insufficient.

How to do it. (1) Specify a grammar for statements, assignments, expressions, literals, and identifiers (section 1, Fig. 1a). (2) Define inference rules with premises and side conditions above the line and conclusions below it (section 2, p. 2). (3) Implement an execution engine: the authors use the K-framework for K experiments and a custom ANTLR4 interpreter for S (section 3, p. 4). (4) On each step, apply one rule, update the store when required, and append the rule and resulting state to the trace. (5) Stop at NOP and use the resulting state and ordered trace as ground truth.

The paper’s example adds with “⟨v1 + v2, σ⟩ →E v3” when v3 = v1 + v2 (Fig. 1b, p. 2). Inference: In Verus, the executable Rust function can update a `Map` or sequence representing the store, while a `spec fn` can describe one-step transition and a `proof fn` can establish that each implementation step refines it. Verus assertions, `requires`, `ensures`, and loop `invariant` clauses can connect the code to the transition relation; the paper’s inference-rule notation itself does not carry over as Rust syntax.

Evidence. The authors validate Human-Written programs by executing them with K and checking outputs against public test oracles (section 3.1, p. 4). This validates the benchmark oracle, not model correctness. Assumptions include a terminating C⋆ execution and faithful S/K engines. Inference: A nonterminating loop or an interpreter bug invalidates every downstream score for that program.

## technique 2: semantic mutation as a distribution-shift test

What it is. Keep program structure but alter the mapping from symbols to rules. KeywordSwap exchanges meanings (for example, plus and minus), while KeywordObf replaces standard symbols and keywords with unfamiliar Caucasian-Albanian characters. The paper says, “KeywordSwap swaps the semantic interpretations of selected syntactic operators in the standard semantics with their KeywordSwap counterparts” (section 3.2, p. 4). It explains that “Because KeywordSwap preserves surface syntax while altering operational meaning, correct reasoning requires conditioning on the explicit transition rules rather than defaulting to pretraining-derived” associations (section 3.2, p. 5). The final word is line-broken in the extracted text; the sentence continues “associations.”

When to use it. Apply this mutation when evaluating whether a code generator or verifier follows a supplied specification instead of memorized language conventions. It is useful for VL because a Rust API’s familiar operator or method name can conceal a changed contract.

How to do it. (1) Start with a standard rule set Ψstd. (2) Build a table mapping each selected operator or keyword to a swapped counterpart (Table 3, p. 5). (3) For KeywordObf, map the same semantics to novel single symbols. (4) Run the unchanged C⋆ program under the transformed rule set to produce a new oracle. (5) Prompt the model with the transformed program and rules, then compare its state, rule, or trace output with the oracle.

Evidence. On the Human-Written split, the paper reports that swap often causes 40–70 percentage-point losses even when standard accuracy is high (section 5.1, p. 7; Table 4 denominator is the Human-Written task set). It reports that GPT-5-mini and DS-Qwen 32B lose 20–70 points under swap, while obf causes more modest degradation. These are percentage-point differences in accuracy, not relative error rates. Limitations: KeywordObf can confound unfamiliar tokenization, so the authors rerun it with guaranteed single-token alternatives and find the failure pattern unchanged (Appendix F, p. 22). Inference: The same test can reveal whether an agent-written Verus proof silently assumes Rust operator semantics that conflict with a specification, but a Verus proof checker will reject an actually inconsistent contract rather than merely score a model response.

## technique 3: isolate local rule selection (PredRule)

What it is. PredRule removes state propagation as a confound. The dataset keeps statements whose state remains unchanged throughout execution, and asks for the ordered semantic rules used. The paper defines the invariant as the initial state remaining unchanged for every intermediate trace state except the terminal step (section 5.2, p. 8).

How to do it. (1) Select Human-Written executions satisfying that state-free invariant. (2) Give the model the statement and state plus the formal rules. (3) Ask for the ordered rule list. (4) Count an item correct only when the predicted list exactly equals the ground-truth list; the denominator is the subset of well-formed predictions D′, as specified in section 5.2. (5) Repeat under standard, swap, and obf semantics.

Evidence. The paper says, “Across PredRule (Table 4, right-side), most systems exhibit strongly negative Δis, implying that even when state evolution is removed, local rule selection remains dominated by symbol priors rather than formal definitions” (section 5.2, p. 8). It further reports that only a narrow subset maintains or improves accuracy under mutation. Inference: For Verus, this suggests testing generated proof steps against deliberately renamed or wrapper APIs to detect dependence on familiar names; the test does not replace the Verus checker and cannot establish semantic soundness by itself.

## technique 4: long-horizon trace generation (PredTrace)

What it is. PredTrace asks for the complete sequence of semantic rules and intermediate states, rather than only a final store. Ground truth is the trace JPKτΨ from Definition 2.2.

How to do it. (1) Use Human-Written programs with an empty initial variable state. (2) Execute each under S or K to obtain every rule and state. (3) Prompt the model for the full ordered trace. (4) Require exact trace equality; the paper defines accuracy over well-formed predictions D′ (section 5.3, p. 8). (5) Compare standard, swap, and obf conditions.

Evidence. “PredTrace sharply exposes the fragility of long-horizon rule conditioning: only four models achieve non-zero accuracy at all” (section 5.3, p. 9). Table 6 reports the Human-Written split and only models with non-zero scores; for example, K scores for QWQ 32B are 18 standard, 16 swap, and 15 obf, while Gemini-2.5-pro scores 25, 25, and 25. The denominator is the PredTrace examples in that split for each model/semantic condition, with only non-zero models displayed. Inference: A VL pipeline can use trace witnesses as a debugging artifact: each Rust mutation is paired with the rule and state it is meant to implement, then a Verus proof discharges the invariant connecting successive states. Long traces increase proof and model failure risk, so loop invariants and lemma facts should be checked incrementally.

## what is proved, trusted, and left unresolved

The paper proves definitions and computes ground-truth executions through K and ANTLR4; it does not prove that the eleven LLMs reason semantically, nor that benchmark programs cover Rust verification. Trusted components include the K-framework, the custom interpreter, grammar and mutation scripts, public test oracles, and exact-match scoring. The paper’s conclusion is: “Together, these results suggest that contemporary LLMs often rely on pretrained lexical associations rather than systematically conditioning on supplied formal rules.” (section 7, p. 10). Inference: This is a product threat for VL because a plausible proof plan or specification generated from familiar Rust idioms may be wrong under the actual contract; the threat is mitigated when Verus checks every `requires`, `ensures`, invariant, and proof function, but specification omission remains outside the checker’s guarantee. Existing work here already provides semantic-shift, state-free, and trace-level diagnostics; VL should not redo a generic benchmark without a Rust/Verus-specific oracle.

## techniques for the catalog

- executable small-step semantics: define configuration transition rules, an interpreter, and rule/state traces as ground truth
- semantic mutation testing: swap or obfuscate operator meanings while preserving program syntax to expose prior-driven reasoning
- state-free rule selection: evaluate exact local rule lists on executions whose store does not mutate
- long-horizon trace scoring: require exact sequences of rules and intermediate states over loops and branches

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
