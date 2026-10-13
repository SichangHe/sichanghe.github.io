# Towards Large Language Model Aided Program Refinement
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and contribution
This paper presents LLM4PR, a staged way to use an LLM for program refinement while a theorem prover checks each refinement step. The input is a formal precondition and postcondition, not an unconstrained natural-language request. The model chooses a refinement law and writes a small program fragment; the framework generates the law's proviso and asks Coq or an automated theorem prover (ATP) to discharge it. A failed obligation is sent back as a counterexample or error for another attempt. The paper's abstract describes the intended guarantee: “verify that the generated code satisfies the conditions of refinement conditions, thus guaranteeing the correctness of the code” (abstract, p. 1). The guarantee is conditional on a correct initial specification and on proving all required obligations.

The contribution has three parts: the first-order specification language Lspec, a small While-like programming language Lpl, and a library of refinement laws represented so LLM output can be checked. GPT-4 is fine-tuned on Morgan-style refinement examples and the new languages. The authors evaluate 157 formalized HumanEval tasks and the corresponding EvalPlus tests.

## technique 1: restrict generation to a small refinement calculus

What it is. Instead of asking for complete code, represent a requirement as `variants : [precondition, postcondition]`. The framework transforms this specification with laws whose premises are logical entailments. The core laws strengthen a postcondition, weaken a precondition, split sequentially, assign an expression, branch on a guard, and iterate with an invariant and variant. The paper defines the relation explicitly: “For two formulae A and B, A entails B (A ⇛ B) means that in every state if A is true then B is true” (p. 4).

When to use it. Use this for sequential algorithms whose desired behavior can be stated as first-order formulas over variables and arrays. It is especially useful when direct code generation produces plausible but wrong boundary cases. The square-root example starts with the bound `x*x <= N < y*y` and termination condition `y <= x+e`, rather than trusting a generated loop.

How to do it.

1. write typed variables, constants, a precondition, and a postcondition in Lspec; the language includes Boolean connectives, quantifiers, arithmetic, and arrays
2. ask the model to choose one law and produce the corresponding fragment
3. compute the law's proviso automatically, such as `pre -> post[x := E]` for assignment
4. invoke Coq/ATP on that proviso
5. if it passes, replace the current specification with the law's child specification and continue; if it fails, return the diagnostic and try another fragment or law
6. save successful specification/code paths in a refinement library for retrieval

The authors deliberately keep Lpl close to While: assignments, sequencing, `if`, `while`, assertions, arrays, and procedures (Tables 1–3, pp. 6–7). This makes the model's output syntactically manageable, but it also means generated code must later be translated to the target language and its semantics.

Verus form (inference). Make a Rust/Verus variant of the same tree: each node contains executable Rust plus `requires` and `ensures`, and each edge is justified by a `proof fn` or lemma. Use `while` invariants and a decreasing integer variant for loops. Arrays and slices need explicit length and ownership conditions. The refinement-law premise becomes a Verus assertion/lemma checked before accepting the child node. Verus does not provide LLM4PR's law language; the law engine and translation to Rust are new trusted code.

Evidence and limits. Formal laws are mathematically justified in the paper, but the initial formal specification still needs a human check. The authors state that LLM4PR “still needs the user to verify the correctness of the transformation from informal description to formal specification” (p. 12). Thus it prevents code-level errors relative to a contract, not errors in the contract itself.

## technique 2: flexible laws for real-valued loops and traversals

What it is. The paper extends standard refinement rules to address two practical sources of failure: floating-point convergence and list traversal. Its Flexible Iteration Law keeps an invariant, requires `V < V0`, and adds `assert V != V0` to avoid a floating-point fixed point. Its Traverse Law introduces an index and preserves `P(l,i)` while advancing to `P(l,i+1)`.

When to use it. Use the flexible iteration rule for numerical loops where an integer variant is inappropriate or a floating-point update can stop changing due to precision. Use Traverse for recurrence over a list or array with a known interval.

How to do it for a float loop.

1. choose invariant `I`, guard `G`, and a real-valued distance/variant `V`
2. refine the specification into initialization of `I` followed by `while(G)`
3. require the body to preserve `I` and establish `V < V0`
4. insert `assert V != V0`, so a no-change update is rejected rather than treated as progress
5. prove that the guard eventually becomes false, or mark the result partial if termination is not proven

For traversal, initialize the index to `m`, establish `P(l,m)`, loop while `i < n`, prove `P(l,i)` implies the body establishes `P(l,i+1)`, then assign `i := i+1` (Lemma 8, p. 9). The square-root case in Figure 5 uses `while y > x+e`; the model chooses the midpoint and branches on whether its square is above `N` (p. 13).

Verus form (inference). State a loop invariant in the Rust `while` and prove an integer `decreases` measure where possible. For floating point, a specification over mathematical numbers says nothing about the IEEE float arithmetic that runs, so either verify a bounded fixed-point algorithm over integers/rationals or state and prove an explicit rounding model. The explicit “no unchanged update” assertion can be a checked precondition on the next state, but it does not by itself prove termination without a well-founded measure.

Evidence and limits. The authors explicitly leave an iteration partially correct when termination is not proved: “if a refinement lacks proof of the loop termination in the iterative law, we still consider it as partially correct” (p. 14). This is a limitation a VL catalog must record rather than silently treating every accepted path as total correctness.

## technique 3: active prompts and passive proof feedback

What it is. LLM4PR treats the model as a constrained choice-and-synthesis component. Each prompt contains the constraints written in Lspec for the current specification and the previous failure history, if any; the model then selects the law. The framework, rather than the model, constructs the next specification and checks the law premise. This separates proposing a code fragment from deciding whether it is a valid refinement.

When to use it. Use this feedback architecture when model output is useful but unreliable. It is particularly effective when a verifier emits a precise failed entailment or counterexample that can guide a local repair.

How to do it.

1. parse Lspec to an abstract syntax tree and extract pre/post formulas
2. present the model with those formulas and available laws
3. have it select a law and generate code
4. synthesize the proviso and Coq/ATP script automatically
5. on failure, attach the error/counterexample and retry for a bounded number of attempts
6. on repeated failure, backtrack to the last refinement node and try another law
7. on success, commit the code and child specification to the refinement tree

Table 4 gives the split of responsibility: GPT-4 supplies the assignment or guard and LLM4PR verifies the corresponding entailment or creates the child specification. The refinement tree is persisted as a procedure library, and retrieved procedures can be reused when a new task has the same precondition/postcondition pattern (pp. 10–12).

Verus form (inference). Build a loop around `cargo verus`: preserve every candidate, diagnostic, and repaired proof in a content-addressed refinement tree; accept a node only when Verus succeeds and the generated code compiles. Use diagnostics as search guidance, but do not let the model rewrite the specification after a failure without an explicit human or policy check. This is compatible with Rust's type checker, which can reject ownership errors before Verus, while Verus discharges semantic obligations.

Evidence and limits. The framework is sound only relative to Coq/ATP, the law implementation, and the initial specification. The authors' own limitation says “the capability of LLM4PR largely depends on the capabilities of LLMs and ATPs” (p. 14); users may need to select laws or build proofs manually.

## technique 4: specification-driven square-root refinement

The paper's worked example is an algorithm recipe. Start with `N >= 0`, `e > 0`, and `x*x <= N < y*y / y <= x+e`. Sequentially split it into initialization and iteration. Assign `x=0`, `y=N+1`, and verify the assignment premise. Then preserve `x*x <= N < y*y` while `y > x+e`; compute the midpoint; if its square is above `N`, assign it to `y`, otherwise assign it to `x`. Each branch has a separately generated entailment check (Figure 5, p. 13).

This decomposition rules out the motivating upper-bound bug (`y = N` is wrong for `N<1`), because the postcondition requires `N < y*y`, as the paper says for Figure 5. The paper omits the termination check from Figure 5, so the other motivating failure, a floating-point fixed point, is addressed by the Flexible Iteration Law rather than shown in this example. The study's inference: this illustrates a reusable rule: put boundary conditions in the postcondition first, then force every assignment to establish them. A Verus implementation would use a mathematical square-root specification, explicit nonzero and range conditions, a loop invariant for the bracket, and a proven decreasing bracket width. The paper does not prove the floating-point Python implementation itself, so the Rust mapping is an inference.

## evidence, denominators, and trust

On 157 formalized HumanEval examples, LLM4PR passed 150/157 HumanEval cases and 150/157 EvalPlus cases. GPT-4 with natural language plus formal specifications passed 148/157 and 142/157; plain GPT-4 passed 145/164 and 128/164; Llama3 passed 125/164 and 116/164; GPT-3.5 passed 126/164 and 116/164; Claude-3 passed 136/164 and 126/164 (Table 5, p. 14). The 164 baseline denominator differs from the 157 LLM4PR denominator which fits the paper's statement that 7 examples could not be transformed to formal specifications (the study's reading; the paper does not tie the two numbers together). EvalPlus has more than 80 times as many tests per example, so the equal 150/157 result is robustness evidence under that test suite, not a proof of arbitrary inputs.

Proved: each accepted refinement edge satisfies its formal law in Coq/ATP; the final program is checked against the resulting pre/post conditions. Measured: benchmark pass counts and a qualitative square-root walkthrough. Trusted: the informal-to-Lspec formalization, the law definitions and their implementation, language semantics, Coq/ATPs, fine-tuning data, and any unproved loop termination. A test pass is not the correctness guarantee; the proof obligations are.

## what VL should reuse and threat to the product

VL should reuse small law steps, explicit provisos, bounded backtracking, and a persistent refinement tree. The strongest design lesson is to force the agent to produce a contract-preserving local transformation, then have Verus check it before proceeding. VL should not copy the paper's assumption that a formal input is already correct, nor its treatment of unproved termination as “partially correct” without a visible status.

Threat assessment (inference): LLM4PR threatens systems that let an agent jump directly from a natural-language requirement to Rust and inspect only tests. It offers a practical defense for systems that can require a formal contract, but the contract-writing and source-to-Lspec translation remain attack surfaces. Its 150/157 result is encouraging yet narrow: the language is small, most tasks are sequential, and no result establishes that the generated Rust translation preserves the checked semantics.

## techniques for the catalog

- law-guided generation: make the model choose a small refinement law and check its logical proviso before accepting code
- flexible termination rule: require invariant preservation, decreasing progress, and a no-fixed-point assertion for real-valued loops
- traversal refinement: express list recurrence as an indexed invariant and prove one-step preservation before incrementing
- active/passive verifier loop: synthesize prompts from the current specification and feed Coq/ATP failures back into bounded search
- refinement-tree reuse: persist successful specification/code paths and retrieve them for later tasks with matching contracts

Audited 2026-10-12 against the paper: checked Table 5 counts and denominators, quotations and page numbers, Definitions and Lemmas 1-8, Table 4, Figure 5, the evaluation setup, and the Verus forms. Changed: the Specification Formalization quotation page 11 to 12; table pages 5-7 to 6-7; Lemma 8 page; a Verus claim about mathematical reals reworded (whether Verus has a real-number type was not checked); the prompt contents restated as in the paper; the square-root paragraph no longer says Figure 5 handles the Newton fixed point (termination check omitted there) and its reusable rule is marked as inference; the 164 versus 157 explanation marked as the study's reading.
