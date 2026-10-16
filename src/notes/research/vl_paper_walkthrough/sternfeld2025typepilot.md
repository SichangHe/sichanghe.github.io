# TypePilot: Leveraging the Scala Type System for Secure LLM-generated Code
(authored by agents unless marked 🧑)

Tag: `sternfeld2025typepilot`, [paper](https://doi.org/10.26615/978-954-452-101-1-011)

## what the paper does

Sternfeld, Kucharavy, and Dolamic introduce TypePilot, a three-stage agentic workflow for LLM-generated Scala. One model generates code, a second describes vulnerabilities, and a third revises the code using Scala's type system. They evaluate Stainless verification tasks and general input-constraint and injection tasks. The abstract says the “type-focused agentic pipeline substantially mitigates input validation and injection vulnerabilities” (abstract, p.95), while the conclusion says the Stainless experiments did not yield consistently compilable code and the broader Scala setting was therefore emphasized (sec.6, p.102).

Models include Qwen-2.5-Coder-32B, CodeLlama-70B, DeepSeek-Coder-33B, and conversational models (sec.3.1, p.96). General tests cover Fibonacci, factorial, sublists, matrix operations, HTML, Bash, and URL redirects (Table 1, p.97). Results are manual checkmarks, crosses, and partial marks rather than a statistical benchmark. For input constraints, Qwen-2.5-Coder with TypePilot passes all listed checks in Table 2; CodeLlama remains vulnerable in several cases (sec.4.2.1, p.99). For injection, baseline generations are “virtually all” vulnerable, while TypePilot is robust in almost all settings (sec.4.2.2, p.99).

## technique: generate, diagnose, and revise with a three-agent pipeline

What it is: separate implementation generation, vulnerability analysis, and remediation. Figure 1 and Figure 4 show the flow (sec.3.3, pp.97–98).

When to use it: use this when one-shot code generation routinely misses edge cases or injection boundaries and the target language has type features that can encode constraints.

How to do it:

1. Prompt a first LLM with the task and request code delimited as Scala (sec.3.3, p.98)
2. Give the task and generated code to a second LLM; request vulnerability descriptions only, with no replacement code (sec.3.3, p.98)
3. Give task, original code, and vulnerability list to a third LLM; request a revised implementation using ADTs, refined types, traits, and sealed traits (sec.3.3, p.98)
4. Compile or manually inspect the result against the test cases (secs.3.2–4.2, pp.96–101)
5. Compare baseline, robust-prompting, TypePilot, and Self-Planning outputs (sec.4.4, p.102)

Verus form: Inference: use an analogous generator–diagnoser–repair loop for Rust/Verus, but make Verus compile and verification the acceptance gate. The paper's vulnerability descriptions are not proofs; every repaired contract and implementation still needs Verus checking.

Evidence and limits: TypePilot outperforms Self-Planning on both input constraints and injection in the reported comparisons (sec.4.4, p.102). The tasks are simple and the paper says real codebases require future scaling work (sec.5, p.102).

Quote: “After prompting a first LLM to generate the initial code, we ask a second LLM to detect the vulnerabilities in this code.” (sec.3.3, p.98)

## technique: use Stainless as a formal-verification target

What it is: ask the model to generate Scala in Stainless's verification-oriented subset with explicit conditions and proofs. Stainless attempts to prove user-stated safety properties (sec.3.2, p.96).

How to do it:

1. Prompt with two Stainless examples: maximum of two values and list size (sec.3.2, p.96)
2. Request verifiable code and its conditions for Fibonacci, factorial, and sublist tasks (sec.3.2, p.96)
3. Run Stainless and inspect compilation/proof failures (sec.3.2, p.96; sec.4.1, p.99)
4. Reject outputs using unavailable full-Scala methods or bypass annotations; the paper notes `List.sliding`, `println`, and `@library` misuse (sec.4.1, pp.99–100)

Verus form: Inference: provide few-shot Verus examples containing executable functions, `requires`, `ensures`, and proof blocks, then run Verus after generation. Stainless's subset and annotations do not carry over; use only constructs documented in the Verus library.

Evidence and limits: none of the models consistently generated Stainless code that compiled (sec.4.1, p.99). The authors therefore shift to general Scala tests. This is a negative result about model/framework fit, not proof that Stainless is unsound.

Quote: “In general, we see that none of the models is capable of consistently generating Stainless code that correctly compiles.” (sec.4.1, p.99)

## technique: encode domain invariants in types

What it is: replace unconstrained primitive parameters with types whose constructors enforce valid values, and make failure explicit in return types. The paper's example defines a sealed `Age`, `ValidAge`, and `Age.apply` returning `Option[Age]`, then accepts `List[Age]` and returns `Option[Double]` (sec.4.2.3, pp.100–101).

When to use it: use smart constructors and sealed ADTs when invalid ranges, empty inputs, or representation variants should be impossible or explicit at API boundaries.

How to do it:

1. Define a sealed trait carrying the logical value (sec.4.2.3, p.100)
2. Define a valid case class, such as `ValidAge(value: Int)` (sec.4.2.3, p.100)
3. Implement a smart constructor that returns `Some` only for values in the allowed range and `None` otherwise (sec.4.2.3, p.100)
4. Accept the validated type in downstream functions and return `Option` when no result exists, such as for an empty list (sec.4.2.3, p.100)
5. Use the resulting type signatures as static constraints during composition (sec.4.2.3, pp.100–101)

Verus form: Inference: represent the same invariant with a Rust struct whose constructor requires the range and establishes a `spec fn` predicate; use `Option` for absence and `requires`/`ensures` to preserve validity. Verus's type invariants and proof functions need explicit syntax; Scala sealed traits are not Verus constructs.

Evidence and limits: TypePilot's generated average-age code rejects ages outside 0–120 and returns `None` for an empty list (Fig.5, p.101). The authors say this “transforms what would otherwise be runtime checks and ad hoc validations into statically enforced contracts” (sec.4.2.3, p.101). The checks are manual and do not prove all behavior.

Quote: “By prompting LLMs to leverage features such as sealed traits, smart constructors, and refined return types, we enable the generation of programs that encode correctness directly into their type signatures.” (sec.4.2.3, p.100)

## technique: evaluate security by explicit edge-case matrices

What it is: test normal behavior and named vulnerability cases separately, recording ✓, ✗, or ∼ for each model and setting (Tables 2–3, pp.98–99).

How to do it:

1. Define ordinary correctness cases and edge cases such as negative ages, empty matrices, rectangular kernels, and even-sized kernels (Table 2, p.98)
2. Define injection cases for HTML greetings/comments, Bash search/ping, and URL redirects (Table 3, pp.97–99)
3. Run baseline, robust prompting, and TypePilot for each model (sec.3.3, pp.97–98)
4. Mark output correctness/compilation and vulnerability resistance independently (Tables 2–3, pp.98–99)
5. Average secure-output fractions across the three LLMs for vulnerability categories (sec.4.3, p.101)

Verus form: Inference: apply the same matrix to generated Rust: ordinary tests, boundary inputs, and adversarial strings, plus a clean Verus proof run. Separate runtime test outcomes from contract verification.

Evidence and limits: baseline code often works for regular inputs but fails negative or empty cases; TypePilot improves these checks (sec.4.2.1, p.99). The paper gives no sample size beyond the listed cases and no confidence intervals, so percentages should not be generalized.

## trust, limits, and product implication

Stainless, Scala's compiler/type checker, manual vulnerability labels, and the authors' interpretation of generated code are trusted. The paper does not establish that type-guided generation proves functional correctness; its Stainless stage mostly failed to compile. Inference: for agent-written Verus Rust, TypePilot's strongest transferable lesson is staged diagnosis plus invariant-carrying APIs, but Verus verification must replace manual checkmarks and Scala's type system cannot substitute for complete contracts. Threat is reduced for input-range and injection classes when constructors and contracts are independently checked; residual risk includes incomplete vulnerability lists, wrong invariants, unsupported libraries, and model-specific failures.

## techniques for the catalog

- staged generation and diagnosis — generate code, have a separate model list vulnerabilities, then repair
- Stainless-targeted prompting — use verification examples and explicit conditions for a restricted proof language
- invariant-carrying types — encode valid ranges and absence with smart constructors, ADTs, and option results
- edge-case security matrices — score normal behavior and each vulnerability separately across models
- verifier gate inference — treat framework compilation/proof as acceptance and manual labels as evidence only

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
