# TypePilot: Leveraging the Scala Type System for Secure LLM-generated Code
(authored by agents unless marked 🧑)

Tag: `sternfeld2025typepilot`, [paper](https://doi.org/10.26615/978-954-452-101-1-011)

## what the paper does

Sternfeld, Kucharavy, and Dolamic introduce TypePilot, a three-stage workflow for LLM-generated Scala. Separate instances generate code, describe its vulnerabilities, and revise it using Scala's type system (sec.3.3, pp.97–98). The abstract says the “type-focused agentic pipeline substantially mitigates input validation and injection vulnerabilities” (p.95). The Stainless experiments instead find that no model consistently generates compilable code (sec.4.1, p.99).

Section 3.1 lists Qwen2.5-Coder-32B-Instruct, DeepSeek-Coder-33B-Instruct, CodeLlama-70B-Instruct-hf, Meta-Llama-3-70B, DeepSeek-R1-Distill-Llama-70B, and Qwen3-32B (p.96). Tables 2–3 report the three coding models. Table 1 lists Fibonacci, factorial, and sublists for Stainless; Fibonacci, factorial, matrix multiplication, and convolution for general input constraints; and HTML, Bash, and URL tasks for injection (p.97). Table 2 instead reports average age, Fibonacci, multiplication, and convolution (p.98). The paper does not explain the factorial/average-age discrepancy.

Results are manual evaluations. Qwen-2.5-Coder with TypePilot passes every Table 2 check, while CodeLlama retains several failures (sec.4.2.1, p.100). For injection, the authors say baseline code is “virtually all” vulnerable and TypePilot produces robust code in almost all settings (sec.4.2.2, p.100). Table 3 still records a compilation/correctness failure for DeepSeek's TypePilot HTML greeting, partial correctness for CodeLlama's HTML comments, and partial injection resistance for Qwen's URL redirect (p.99).

## technique: generate, diagnose, and revise with a three-agent pipeline

What it is: separate implementation generation, vulnerability analysis, and remediation. Figures 1 and 4 show the flow (pp.97–98).

How to do it, following Figure 4 (p.98):

1. Give a first LLM instance the task and request Scala code
2. Give a second instance the task and generated code; request vulnerability descriptions without code
3. Give a third instance the task, original code, and vulnerability list; request a revision using Scala features such as ADTs, refined types, traits, and sealed traits

The robust-prompting comparison directly requests safe code using the type system; the baseline uses TypePilot's initial-generation prompt (sec.3.3, pp.97–98). Self-Planning first produces a plan and then implements it, with explicit security instructions. TypePilot performs better on both input constraints and injection in the reported comparison (secs.3.4 and 4.4, pp.99, 101–102).

Verus form: Inference: use an analogous generation, diagnosis, and repair loop for Rust/Verus, with compilation and verification as prerequisite checks. Vulnerability descriptions do not establish that contracts or implementations are correct. This transfer was not evaluated in the paper.

Evidence and limits: “After prompting a first LLM to generate the initial code, we ask a second LLM to detect the vulnerabilities in this code.” (sec.3.3, p.98). Section 5 identifies context management and dependency reasoning across files and modules as scaling challenges. Object metadata and lightweight symbolic reasoning or type inference are proposed future work, not evaluated components (pp.102).

## technique: use Stainless as a formal-verification target

What it is: request Scala in Stainless's restricted subset, with explicit properties and the logical structure needed for verification (sec.3.2, p.96).

How the paper tries it (sec.3.2, p.96):

1. Use zero-shot and two-shot prompting
2. In the two-shot setting, provide examples for the maximum of two values and list size
3. Request code and conditions for Fibonacci, factorial, and sublist tasks, accounting for invalid inputs and overflow (pp.96–97)
4. Inspect generated code for failures; Section 4.1 reports unavailable Scala operations such as `List.sliding` and `println`, plus syntax errors (p.99)

Evidence and limits: “In general, we see that none of the models is capable of consistently generating Stainless code that correctly compiles.” (sec.4.1, p.99). The authors hypothesize insufficient Stainless training data. They also mention an example avoiding verification through `@library` annotations in Appendix B; that appendix is absent from the supplied paper. The paper does not report successful proof rates.

Verus form: Inference: provide examples using Verus contracts and proofs, then run Verus on generated output. Check that properties are actually verified rather than assumed or excluded. The paper's Stainless results do not establish effectiveness for Verus.

## technique: encode domain invariants in types

What it is: use domain types and explicit failure results instead of unconstrained primitive interfaces. The authors write: “By prompting LLMs to leverage features such as sealed traits, smart constructors, and refined return types, we enable the generation of programs that encode correctness directly into their type signatures.” (sec.4.2.3, p.100).

Figure 5 displays these changes (p.100):

1. Define a sealed `Age` trait with an integer value
2. Define `final case class ValidAge(value: Int) extends Age`
3. Define `Age.apply` returning `Some(ValidAge(value))` for values from 0 through 120, otherwise `None`
4. Change the average function's input from `List[Int]` to `List[Age]` and its declared result from `Double` to `Option[Double]`
5. Return `None` for an empty list and accumulate ages with a `Long` sum for nonempty input

Evidence and limits: the authors say the design “transforms what would otherwise be runtime checks and ad hoc validations into statically enforced contracts” (sec.4.2.3, p.101). Inference: Figure 5 does not establish that guarantee. Its public `ValidAge` constructor permits bypassing `Age.apply`, and the nonempty branch ends after binding `(sum, count)` without returning an average. The figure therefore does not supply a complete, compilable implementation of its declared result. The 0–120 check belongs to `Age.apply`, not to every construction of `Age`.

Verus form: Inference: put the range property in an explicit predicate and prove that constructors and consuming functions preserve it. Use `Option` for absence. Encapsulation and verified contracts must prevent unchecked construction; merely introducing a wrapper type is insufficient.

## technique: evaluate security by explicit edge-case matrices

What it is: inspect ordinary behavior and named vulnerability cases separately. Tables 2–3 show manual results across baseline, robust prompting, and TypePilot (pp.98–99).

How the evaluation works:

1. Check regular inputs and cases including negative ages or Fibonacci inputs, large Fibonacci inputs, empty or mismatched matrices, and rectangular or even-sized kernels (Table 2, p.98)
2. Check HTML greetings/comments, Bash file search/host ping, and URL redirects (Table 3, p.99)
3. Record correctness/compilation separately from injection resistance in Table 3; `∼` denotes partial robustness in the injection discussion (sec.4.2.2, p.100)
4. Categorize observed vulnerabilities as shape violations, null dereferences, boundary violations, HTML injection, Bash injection, and path traversal; average secure-output fractions across the three LLMs (sec.4.3, p.101)

Evidence and limits: the paper does not specify repeated-generation counts or confidence intervals. Inference: the listed manual checks support conclusions about these outputs, not estimated reliability across arbitrary tasks. Attention analysis is attributed to Appendix D, which is absent from the supplied paper (sec.4.3, p.101).

Verus form: Inference: retain ordinary and adversarial tests alongside verification, and report them separately. A proof establishes specified properties; the test matrix can expose missing specifications.

## trust, limits, and product implication

The paper evaluates simple tasks and calls for testing larger codebases and use by engineers in active development (sec.6, p.102). Its general Scala results rely on manual inspection, rather than successful Stainless verification. The DOI above appears on p.95.

Inference: the transferable ideas are staged vulnerability diagnosis and explicit domain constraints. For agent-written Verus code, these are candidate generation strategies, not evidence that the resulting program is verified. Verification still depends on adequate contracts, checked constructors, and an appropriate trusted library boundary.

## techniques for the catalog

- staged generation and diagnosis — generate code, describe vulnerabilities in a separate instance, then revise using types
- Stainless-targeted prompting — test zero-shot and two-shot generation for a restricted verification language; record the compilation failures
- domain types and explicit absence — use constrained constructors and option results; check that construction cannot bypass validation
- edge-case security matrices — inspect ordinary behavior and named vulnerabilities separately across models
- verification prerequisite checks — Inference: require compilation and proofs when transferring the workflow to Verus

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In general, we see that none of the models is capable of consistently generating Stainless code that correctly compiles."): checked the complete supplied paper text, quotations, task/model lists, numbers, section/page references, workflow steps, and DOI; corrected task scope and page references, separated recommendations from reported methods, and qualified the incomplete average-age example; did not rerun experiments, inspect the external repository, or check appendices B–D, which are absent from the supplied paper.
