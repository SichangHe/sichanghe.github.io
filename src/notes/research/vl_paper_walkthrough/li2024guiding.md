# Guiding Enumerative Program Synthesis with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2024guiding`, [paper](https://doi.org/10.3233/FAIA201017)

## problem and main result

The paper combines an LLM with enumerative Syntax-Guided Synthesis (SyGuS). It starts from the observation that “the best-performing synthesizers in the domain of formal synthesis with precise logical specifications are still based on enumerative algorithms.” (Abstract, p. 1). Its central result is that GPT-3.5 alone is weaker than formal solvers, while LLM guidance can improve an enumerator. The authors state: “our approach integrating the LLM into an enumerative synthesis algorithm shows significant performance gains over both the LLM and the enumerative synthesizer alone and the winning SyGuS competition tool.” (Abstract, p. 1).

A SyGuS problem consists of a first-order theory, grammar, formula, and target function; a solution is a grammar-valid function satisfying the formula (Definition 4, p. 3). CounterExample Guided Inductive Synthesis (CEGIS) alternates candidate generation and verification, adding a counterexample whenever a candidate fails (Background, p. 4). The paper evaluates bit-vector (BV), linear integer arithmetic (LIA), and invariant (INV) benchmarks.

## technique 1: a prompt library for stand-alone synthesis

When to use it: use this for a small number of direct LLM attempts before invoking search. The target is one function constrained by SMT-LIB syntax and logical requirements. The authors design “a library of prompts for program synthesis problems with logical specifications and a single target function to synthesize.” (Section 4.1, p. 6).

How to do it:

1. Rename benchmark variables and functions to generic names so the model cannot solve by memorized names (Section 4, p. 6).
2. Present the SMT-LIB constraints and ask for one function in a more common language, such as Lisp, rather than SMT-LIB directly (Section 4.1, p. 6).
3. Iterate through prompt variants until a candidate verifies or the prompt library is exhausted (Section 4.1, p. 6).
4. Extract the function, convert it to SMT-LIB, and run the format and semantic verifier (Section 4.1, pp. 6–7).

The maximum-of-three example asks for one Lisp-like `defun fn`, then converts the result into `(define-fun fn ...)` SMT-LIB (Prompt 1, Response 1, Prompt 3, Program 1, pp. 6–7). The prompt explicitly forbids built-ins, arrays, iterations, and extra functions (p. 6).

The paper reports two prompt choices on a subset of 50 benchmarks: Lisp improves benchmark resolution by 6% over Python, and both beat direct SMT-LIB prompting (Section 4.1, p. 6). It also reports an 8% increase in accurate solutions when an emotional prompt is added, compared with standard prompts (Section 4.1, p. 6). The paper does not provide raw solved counts or denominators beyond “a subset of 50 benchmarks” for the 6% result; the denominator for the 8% result is not stated.

For invariant synthesis, the authors first ask the LLM to explain the precondition, transition, and postcondition constraints, then use the interactive prompting strategy (Prompts for invariant synthesis, p. 7). For conversion, they ask the model to output only one correctly typed SMT-LIB function, then parse and format-check it (Lisp to SMT-LIB Converter, pp. 7–8).

Verus form (Inference): prompt an agent with the Rust function signature, `requires` and `ensures`, and relevant datatypes. Permit a simple intermediate representation, then translate it into Rust and run Verus. For loop invariants, ask first for a plain-language explanation, then require an explicit `invariant` clause in the Rust loop. The paper’s Lisp and SMT-LIB syntax do not carry over; Verus syntax and ownership constraints must be checked by Verus.

## technique 2: pCFG-synth, weighting the grammar from failed solutions

When to use it: use this when direct LLM candidates are wrong but plausibly near a valid program. The paper hypothesizes that “the correct solutions are most often in the vicinity of the incorrect solutions” (Introduction, p. 2).

How to do it:

1. Ask the LLM for several candidate programs with the prompt library.
2. Verify each candidate. Return immediately if one satisfies the formula (Algorithm 3, p. 11).
3. For failed candidates, compute each candidate’s left-most derivation in the SyGuS grammar.
4. Count each production-rule occurrence across all failed derivations: `w[ri]` is the sum of occurrences of rule `ri` (Equation 1, p. 9).
5. Convert the weighted CFG into a pCFG by dividing each rule weight by the number of rules applicable to its nonterminal (Section 5.1, p. 9).
6. Run CEGIS with a probabilistic top-down enumerator. Sample production rules according to pCFG probabilities, test complete programs against accumulated counterexamples, and restart after duplicates or depth limits (Algorithm 2, pp. 10–11).

The CEGIS verifier asks an SMT solver whether there exists an input violating the candidate, `∃x.¬φ[F ↦ f]`; a returned input is added to the counterexample set (Algorithm 1, p. 8). The probabilistic search uses a grammar tree and categorical sampling over outgoing production rules (Section 5.2, pp. 9–10).

The paper also implements weighted A* search. It assigns edge cost `−log2(P[α → β])`, maintains a priority queue, and expands the candidate with minimum path cost plus an admissible estimate for completing nonterminals (Section 5.3, pp. 11–12). It smooths zero probabilities with `γ = 0.4` so A* can still enumerate rules absent from failed LLM derivations (p. 13).

Verus form (Inference): treat a Verus function’s grammar as a restricted set of Rust expression templates or proof-step templates. Weight templates observed in failed agent candidates, then enumerate candidates while running Verus as the semantic verifier. Counterexamples become failing inputs or verifier diagnostics. This is an inference: Verus does not provide the SyGuS grammar, pCFG, or CEGIS algorithms described here.

## technique 3: iLLM-synth with an inline syntactic oracle

When to use it: use this when the enumerator can provide partial programs and counterexamples that make an LLM prompt more informative. The paper’s distinction is that pCFG-synth calls the LLM before enumeration, while iLLM-synth calls it during enumeration. It asks for helper functions rather than a complete solution. The authors describe “a novel approach to integrating an LLM into an enumerative synthesizer” (Introduction, p. 2).

How to do it:

1. Initialize every grammar-rule weight to 1 (Section 6.2, p. 14).
2. Start enumerating a partial program.
3. Every `n` iterations, send the partial program, the target constraints, and any counterexample to the LLM (Algorithm 6, p. 14; Section 6.3, p. 15).
4. Ask for helper functions that a student could use to complete the partial program (Section 6.1, p. 13).
5. Parse the response. Add well-typed helper functions as new production rules and add their derivation counts to rule weights (Algorithm 5, p. 13; Section 6.2, p. 14).
6. Discard helpers that reference undefined variables or produce the wrong type; assign each new rule the average current weight for relevant rules (Section 6.2, p. 14).
7. Rebuild the pCFG, or recompute A* heuristic values, and continue enumeration (Section 6.3, p. 15).
8. Verify complete candidates against all accumulated counterexamples and return a satisfying program (Algorithms 6 and 7, pp. 14–15).

The integrated prompt includes constraints and a partial function such as `(ite ?? ?? ??)` and asks for code only (Prompt 4, pp. 13–14). The search therefore supplies syntactic feedback, while the SMT verifier supplies semantic feedback.

Verus form (Inference): send the current Rust proof hole, local context, failed `assert` or `ensures`, and a counterexample trace to the agent. Treat returned lemmas or expressions as candidate grammar productions only after type checking. Add accepted proof templates to a weighted search and rerun Verus after each expansion. Keep the verifier as the semantic oracle; an agent suggestion is only syntactic guidance.

## evidence and limitations

Table 1 evaluates 609 benchmarks: BV 384, LIA 87, and INV 138. The stand-alone LLM solves 303, or 49.8%. The baseline enumerator solves 188.7 on average, or 31.0%; cvc5 solves 415, or 68.1%. LLM union A* pCFG-synth solves 488, or 80.1%; A* iLLM-synth solves 408.0, or 67.0%; LLM union e-pCFG-synth solves 436.7, or 71.7% (Table 1, p. 18). Nondeterministic methods marked with a diamond run three times and report averages; the table says the timeout is 600 seconds and that pCFG-synth timing excludes standalone LLM calls, while union timings include them (Table 1 caption and note, p. 18). Decimal benchmark counts are therefore averages, not fractions of a single run.

The authors find that iLLM-synth approaches cvc5 but performs worse than stand-alone methods on invariant benchmarks because those benefit from custom invariant prompts (Evaluation, pp. 16–17). They identify failures from complex constraints, syntactic mistakes, semantic mistakes, and uncommon operators (Failure Modes, p. 17). They also omit programming-by-example tracks because the LLM overfits examples with large `if-then-else` case splits, which gives poor guidance for other operators (Programming-by-example, p. 17).

The SMT solver and grammar checker are trusted for candidate verification. The LLM, prompt design, pCFG weights, search heuristics, and benchmark representativeness remain assumptions or external components. The authors warn that GPT-3.5 is nondeterministic and may be changed or deprecated, and that the SyGuS benchmark set may not represent problems in the wild (Threats to Validity, p. 18).

Inference: the threat to agent-written verified Rust is search bias. A plausible but wrong proof template can dominate weights and waste enumeration, while an omitted production can hide the correct proof. Verus’s acceptance check limits unsoundness, but cost and timeout can still leave an unproved function. Inference: VL should reuse the paper’s verifier-in-the-loop design, weighted candidates, and explicit counterexamples, then measure Rust-specific proof completion and timeouts. VL should not redo generic SyGuS baselines unless it needs a controlled comparison.

## techniques for the catalog

- prompt library: iterate structured prompts, intermediate languages, and format checks for direct formal synthesis
- invariant explanation prompting: ask the LLM to explain invariant constraints before proposing the invariant
- pCFG synthesis: derive production weights from failed LLM programs and guide CEGIS enumeration toward their grammar region
- weighted A* synthesis: search grammar derivations by negative log probability with a completion heuristic
- inline LLM oracle: query an LLM during enumeration with partial programs and counterexamples
- helper-function grammar updates: add well-typed LLM helpers as productions and update rule weights
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
