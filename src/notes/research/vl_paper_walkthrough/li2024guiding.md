# Guiding Enumerative Program Synthesis with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2024guiding`, [paper](https://arxiv.org/html/2403.03997)

## problem and main result

The paper combines an LLM with enumerative Syntax-Guided Synthesis (SyGuS). It starts from the observation that “the best-performing synthesizers in the domain of formal synthesis with precise logical specifications are still based on enumerative algorithms.” (Abstract, p. 1). Its central result is that GPT-3.5 alone is weaker than formal solvers, while LLM guidance can improve an enumerator. The authors state: “our approach integrating the LLM into an enumerative synthesis algorithm shows significant performance gains over both the LLM and the enumerative synthesizer alone and the winning SyGuS competition tool.” (Abstract, p. 1).

A SyGuS problem consists of a first-order theory, grammar, formula, and target function; a solution is a grammar-valid function satisfying the formula (Definition 4, p. 3). CounterExample Guided Inductive Synthesis (CEGIS) alternates candidate generation and verification, adding a counterexample whenever a candidate fails (Background, p. 4). The paper evaluates bit-vector (BV), linear integer arithmetic (LIA), and invariant (INV) benchmarks.

## technique 1: a prompt library for stand-alone synthesis

Inference: use this for a small number of direct LLM attempts before invoking search. The target is one function constrained by SMT-LIB syntax and logical requirements. The authors design “a library of prompts for program synthesis problems with logical specifications and a single target function to synthesize.” (Section 4.1, p. 6).

How to do it:

1. Rename benchmark variables and functions to generic names to avoid solutions based solely on those names (Section 4, p. 6).
2. Present the SMT-LIB constraints and ask for one function in a more common language, such as Lisp, rather than SMT-LIB directly (Section 4.1, p. 6).
3. Iterate through prompt variants until a candidate verifies or the prompt library is exhausted (Section 4.1, p. 6).
4. Extract the function, convert it to SMT-LIB, and run the format and semantic verifier (Section 4.1, pp. 6–7).

The maximum-of-three example asks for one Lisp-like `defun fn`, then converts the result into `(define-fun fn ...)` SMT-LIB (Prompt 1, Response 1, Prompt 3, Program 1, pp. 6–7). The prompt explicitly forbids built-ins, arrays, iterations, and extra functions (p. 6).

On a subset of 50 benchmarks, the paper reports that Lisp improves benchmark resolution by 6% over Python, and both beat direct SMT-LIB prompting (Section 4.1, p. 6). It also reports an 8% increase in accurate solutions when an emotional prompt is added, compared with standard prompts (Section 4.1, p. 6). The paper does not provide raw solved counts or denominators beyond “a subset of 50 benchmarks” for the 6% result; the denominator for the 8% result is not stated.

For invariant synthesis, the authors first ask the LLM to explain the precondition, transition, and postcondition constraints, then use the interactive prompting strategy (Prompts for invariant synthesis, p. 7). For conversion, they ask the model to output only one correctly typed SMT-LIB function, then parse and format-check it (Lisp to SMT-LIB Converter, p. 7).

Inference: Verus form: prompt an agent with the Rust function signature, `requires` and `ensures`, and relevant datatypes. Permit a simple intermediate representation, then translate it into Rust and run Verus. For loop invariants, ask first for a plain-language explanation, then require an explicit `invariant` clause in the Rust loop. The paper’s Lisp and SMT-LIB syntax do not carry over; Verus syntax and ownership constraints must be checked by Verus.

## technique 2: pCFG-synth, weighting the grammar from failed solutions

Inference: use this when direct LLM candidates are wrong but plausibly near a valid program. The paper hypothesizes that “the correct solutions are most often in the vicinity of the incorrect solutions” (Introduction, p. 2).

How to do it:

1. Ask the LLM for several candidate programs with the prompt library.
2. Verify each candidate. Return immediately if one satisfies the formula (Algorithm 3, p. 11).
3. For failed candidates, compute each candidate’s left-most derivation in the SyGuS grammar.
4. Count each production-rule occurrence across all failed derivations: `w[ri]` is the sum of occurrences of rule `ri` (Equation 1, p. 9).
5. Build the pCFG from these weights. Section 5.1, p. 9 prints `P[α → β] = w[α → β] / |π[α]|`, where the denominator is the number of applicable rules. Inference: this formula does not generally normalize occurrence counts into probabilities, despite the claim on p. 10 that outgoing weights sum to 1; the paper leaves this inconsistent.
6. Run CEGIS with a probabilistic top-down enumerator. Sample production rules, test complete programs against accumulated counterexamples, and discard repeated complete programs. At the maximum depth, complete the program using terminal-only productions (Algorithm 2 and Section 5.2, pp. 10–11).

The CEGIS verifier asks an SMT solver whether there exists an input violating the candidate, `∃x.¬φ[F ↦ f]`; a returned input is added to the counterexample set (Algorithm 1, p. 8). The probabilistic search uses a grammar tree and categorical sampling over outgoing production rules (Section 5.2, pp. 9–10).

The paper also implements weighted A* search. It assigns edge cost `−log2(P[α → β])`, maintains a priority queue, and expands the candidate with minimum path cost plus a completion estimate derived from upper bounds on nonterminal derivation probabilities (Section 5.3, pp. 11–12). It smooths rule weights with `γ = 0.4` so A* can still enumerate rules absent from failed LLM derivations (p. 13).

Inference: Verus form: treat a Verus function’s grammar as a restricted set of Rust expression templates or proof-step templates. Weight templates observed in failed agent candidates, then enumerate candidates while running Verus as the semantic verifier. Verifier diagnostics could guide retries; obtaining concrete counterexample inputs would require additional support. These Rust adaptations are not evaluated in the paper.

## technique 3: iLLM-synth with an inline syntactic oracle

Inference: use this when the enumerator can provide partial programs and counterexamples that make an LLM prompt more informative. The paper’s distinction is that pCFG-synth calls the LLM before enumeration, while iLLM-synth calls it during enumeration. It asks for helper functions rather than a complete solution. The authors describe “a novel approach to integrating an LLM into an enumerative synthesizer” (Introduction, p. 2).

How to do it:

1. Initialize every grammar-rule weight to 1 (Section 6.2, p. 14).
2. Start enumerating a partial program.
3. Every `n` iterations, send the partial program and target constraints to the LLM. If this prompting fails to solve the problem, later prompts also include the most recent failed candidate and its counterexample (Section 6.1, p. 13; Algorithms 6 and 7, pp. 14–15).
4. Ask for helper functions that a student could use to complete the partial program (Section 6.1, p. 13).
5. Parse the response. Add well-typed helper functions as new production rules and add their derivation counts to rule weights (Algorithm 5, p. 13; Section 6.2, p. 14).
6. Discard malformed helpers, such as those referencing undefined variables. Add each helper only at nonterminals matching its return type; assign each new rule the average current weight for that nonterminal’s rules (Section 6.2, p. 14).
7. Rebuild the pCFG and, for A*, recompute the `h` values used by the completion heuristic; continue enumeration (Algorithms 6 and 7 and Section 6.3, pp. 14–15).
8. Return complete candidates that pass accumulated counterexamples to the outer CEGIS verifier. Return a solution only after full SMT verification; otherwise add the new counterexample and continue (Algorithm 1, p. 8; Algorithms 6 and 7, pp. 14–15).

The integrated prompt includes constraints and a partial function such as `(ite ?? ?? ??)` and asks for code only (Prompt 4, pp. 13–14). The LLM supplies syntactic feedback to the search, while the SMT verifier supplies semantic feedback (Section 9, p. 19).

Inference: Verus form: send the current Rust proof hole, local context, failed `assert` or `ensures`, and any available counterexample trace to the agent. Treat returned lemmas or expressions as candidate grammar productions only after type checking. Add accepted proof templates to a weighted search and rerun Verus after each expansion. Keep the verifier as the semantic oracle; an agent suggestion is only syntactic guidance.

## evidence and limitations

Table 1 evaluates 609 benchmarks: BV 384, LIA 87, and INV 138. The stand-alone LLM solves 303, or 49.8%. The baseline enumerator solves 188.7 on average, or 31.0%; cvc5 solves 415, or 68.1%. LLM union A* pCFG-synth solves 488, or 80.1%; A* iLLM-synth solves 408.0, or 67.0%; LLM union e-pCFG-synth solves 436.7, or 71.7% (Table 1, p. 18). Nondeterministic methods marked with a diamond run three times and report averages; the table says the timeout is 600 seconds and that pCFG-synth timing excludes standalone LLM calls, while union timings include them (Table 1 caption and note, p. 18). Decimal benchmark counts are therefore averages, not fractions of a single run.

The authors find that iLLM-synth approaches cvc5 but performs worse than stand-alone methods on invariant benchmarks. They attribute this tentatively to the custom invariant prompts used by the stand-alone LLM (Evaluation, pp. 16–17). They identify failures from complex constraints, syntactic mistakes, semantic mistakes, and uncommon operators (Failure Modes, p. 17). They also omit programming-by-example tracks because the LLM overfits examples with large `if-then-else` case splits, which gives poor guidance for other operators (Programming-by-example, p. 17).

Verification uses Z3 4.8.12 (64-bit); cvc5 1.1.0 is the baseline. The standalone LLM and pCFG experiments use GPT-3.5-turbo-16k at temperature 1.0, while iLLM-synth uses GPT-3.5-turbo, at temperature 1 for the probabilistic search and 0 for A* (Section 7, pp. 15–16). The authors warn that publicly available problems might have appeared in training data, GPT-3.5 responses may not be reproducible, the model may change or be deprecated, benchmarks may not represent problems in the wild, and hyperparameters were not tuned (Section 8, p. 18).

## techniques for the catalog

- prompt library: iterate structured prompts, intermediate languages, and format checks for direct formal synthesis
- invariant explanation prompting: ask the LLM to explain invariant constraints before proposing the invariant
- pCFG synthesis: derive production weights from failed LLM programs and guide CEGIS enumeration toward their grammar region
- weighted A* synthesis: search grammar derivations by negative log probability with a completion heuristic
- inline LLM oracle: query an LLM during enumeration with partial programs and counterexamples
- helper-function grammar updates: add well-typed LLM helpers as productions and update rule weights
