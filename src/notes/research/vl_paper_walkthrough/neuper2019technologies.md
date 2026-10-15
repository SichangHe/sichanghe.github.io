# Technologies for “Complete, Transparent & Interactive Models of Math” in Education
(authored by agents unless marked 🧑)
Tag: `neuper2019technologies`, [paper](https://www.semanticscholar.org/paper/f992242d5563acd1b40961709345ec4da5bfc9bd)

## scope and evidence

Neuper surveys a proof-assistant-based educational architecture built around typed terms, formal specifications, calculational proofs, authoring programs, and interactive next-step guidance. The paper's central design is a “complete, transparent and interactive model of mathematics” (Abstract, p. 77). It uses Isabelle and the ISAC prototype as technical examples. This is a technology and research-position paper, not a controlled classroom evaluation; many effects are posed as questions for future educational research.

Inference: The formal-verification value for VL is the separation between executable algorithms, explicit specifications, proof steps, and interaction, plus the idea of exposing machine-checked justifications at different levels.

## technique 1: typed terms with linked definitions

What it is. The term layer contains propositions, predicates, and algebraic expressions. Terms are typed using simple typed lambda calculus, and definitions are reachable from displayed syntax. The paper states: “Definitions are reachable by mouse-click (as well as types mentioned above)” (Section 2.1, p. 78). Isabelle/jEdit links an operator to its definition and theorem context, while colours distinguish constants and variable binding (p. 78).

When to use it. Use linked definitions when users must inspect the exact semantic object behind a proof obligation or code-level expression. It reduces the gap between a surface term and the trusted library definition.

How to apply it.
1. Assign each term a logical type and resolve overloaded operators in a theory context (Section 2.1, p. 78).
2. Store definition and theorem references in the parsed syntax tree.
3. Render terms with mathematical notation while retaining clickable source links (p. 79).
4. On a click, show the definition, type, or theorem used by simplification.

Verus form. Inference: expose Rust/Verus `spec fn` definitions and contract clauses as navigable source links in VL. Preserve whether a symbol is executable or specification-only. Verus does not provide this educational UI; the links are a product layer over its source and diagnostics.

Evidence and limits. The evidence is the existing Isabelle/jEdit implementation and screenshots, not a user study. The paper notes that all knowledge cannot fit in local memory and suggests a linked database/cloud service (p. 79). Inference: a VL browser should pin exact library revisions so a link cannot silently change meaning.

## technique 2: formal specification as an explicit problem object

What it is. A specification separates Given inputs, Where preconditions, Find outputs, and Relate postconditions. The bending-line example has fields for beam length L, load q0, solvability conditions, output y, and boundary relations (Section 3, pp. 81–82). The paper says: “A formal specification describes a problem most exactly” (Section 3.1, p. 81), and correctness is checked by substituting a solution into the postcondition.

When to use it. Use explicit specifications before choosing an algorithm, especially when several methods solve the same class of problem or when users need to distinguish what is required from how it is computed.

How to apply it.
1. Define typed Given fields and a Where predicate (Section 3, p. 81).
2. Define Find outputs and a Relate postcondition over inputs and outputs.
3. Associate one or more named methods with the specification (p. 81).
4. Check a candidate solution by substitution and automated proving of Relate (Section 3.1, p. 81).
5. Organize specifications into refinement trees; match a problem against increasingly constrained preconditions (p. 82).
6. Compose subproblems as a directed acyclic graph by matching outputs to inputs (p. 82).

Verus form. Inference: map Given/Where/Find/Relate to Rust function parameters, `requires`, return values, and `ensures`. A method entry can point to an executable `fn` plus proof lemmas. The specification object must retain the exact Verus contract and versioned dependencies.

Evidence and limits. The paper reports a prototype and screenshots, but no denominator-based correctness or usability measurement. Some panels are explicitly a design idea rather than an implemented feature (p. 82). Inference: specification matching can guide agents, but does not prove that a chosen specification captures the product requirement.

## technique 3: calculational, stepwise proof language

What it is. The proof layer presents a solution as a sequence of readable transformations, with subproblems and justifications. The paper's bending-line calculation uses numbered steps and methods such as solving boundary equations (Section 4, pp. 84–86). It explains: “Entering a method marks the transition from modelling / specifying a problem to step-wise constructing a solution of the problem” (Section 4.1, p. 85).

When to use it. Use calculational proof steps when a user or agent needs an auditable path from a specification to a result, rather than only a final solver success flag.

How to apply it.
1. Select a specification and method whose guards satisfy the current context (Section 4.1, pp. 84–85).
2. Enter a term or tactic as the next step.
3. Extend the logical context with facts produced by the step, including side conditions (p. 88).
4. Generate intermediate derivations for simplification or rewriting and hide them until requested (Section 6.1, p. 90).
5. Check each step in the proof assistant and retain its justification.

Verus form. Inference: represent each step as a proof function or lemma with `requires` and `ensures`; show the chain of postconditions explicitly in generated explanations. Keep proof-only functions erased from executable Rust. Verus's syntax and automation differ from Isabelle/Isar, so the UI must render Verus constructs accurately.

Evidence and limits. The paper relies on Isabelle's natural-deduction foundation and an ISAC prototype. It raises open questions about showing dozens of simplifier rewrites and elementary natural-deduction reasoning (Section 4.2, pp. 86–87). No measured proof-comprehension result is reported.

## technique 4: purely functional, guarded authoring programs

What it is. Authors implement mathematical methods in a functional programming layer. Programs have no side effects, require termination proofs in Isabelle's logic, and update a logical context when tactics encounter side conditions. A subproblem call carries a theory, specification key, method key, and formal arguments (Section 5, pp. 88–89). The paper states: “Algorithms are programmed similar to computer algebra with essential differences in the logical background.” (Section 5, p. 88).

When to use it. Use pure, guarded methods for reusable verified transformations whose interaction policy should remain separate from mathematical computation.

How to apply it.
1. Declare typed method arguments and a guard matching the specification's preconditions (Section 5, pp. 88–89).
2. Implement the method as a pure function/tactic sequence.
3. Represent subproblems by theory, specification, method, and argument references (p. 89).
4. Prove termination where the host logic requires it; record any explicitly partial functions as trusted exceptions (p. 88).
5. Keep interaction and user-model rules in a separate layer (p. 89).

Verus form. Inference: write executable pure Rust methods with `requires`/`ensures`, and separate UI interaction from proof code. Verus can verify termination and functional contracts for supported loops, but a product must not silently treat an `external_body` or unproved partial function as verified.

Evidence and limits. The paper says prototype generality led to bypassing some termination proofs with `partial_functions` (p. 88), so this portion is trusted rather than proved. Inference: VL should label such methods as assumptions and avoid using them as evidence of end-to-end verification.

## technique 5: Lucas-Interpretation next-step guidance

What it is. Lucas-Interpretation combines computation and deduction across all four language layers. It can determine a next calculation step and prove a user's input against the current context. The paper states: “Lucas-Interpretation can determine a next step in problem solving.” (Section 6.1, p. 90).

How to apply it.
1. Run the method program on the current specification and logical context (Section 6.1, pp. 89–90).
2. If the user requests help, return the next algorithmic step; a dialog module may instead request more user activity based on a user model (p. 90).
3. If the user enters a tactic, find the corresponding tactic in the program (p. 90).
4. If the user enters a term, invoke an automated prover to derive it from the current context (p. 90).
5. Insert the generated derivation as intermediate proof steps, hidden until requested (p. 90).

The paper's current prototype “only uses a simplifier and, nevertheless, shows good results.” (Section 6.1, p. 90). This is a qualitative report with no stated task count or success denominator.

Verus form. Inference: a VL assistant can synthesize the next proof hint from failed Verus obligations, candidate lemmas, and the current invariant. It must distinguish a suggested step from a Verus-checked step; only the latter supports a correctness claim. Verus proof functions and `assert`/`assert forall`-style facts can serve as the checked backend, with explanations generated from the proof trace.

Assumptions and limits. The paper's next-step interpreter is domain-specific and depends on a user model and dialog rules (pp. 90–91). It does not establish that suggestions are pedagogically effective or complete. Inference: agent-written hints can mislead if the UI presents them as proof certificates before rechecking.

## what is proved, trusted, and already done

The paper describes formal specifications, proof-assistant checking, pure functional authoring, and an interactive prototype. It does not report a controlled educational evaluation, a count of verified examples, or a measured reduction in proof errors. Trusted components include Isabelle's kernel, tactic implementations, the specification/method libraries, prototype interaction code, and any partial functions without termination proofs. The paper explicitly notes that some UI panels are not yet implemented (p. 82).

Already done: linked semantic definitions, typed mathematical terms, specification refinement and subproblem composition, calculational proof presentation, guarded functional methods, and next-step guidance. VL should not redo these as unexplored concepts. Inference: VL's opportunity is a Verus-specific implementation that keeps executable Rust, `spec fn`s, proof functions, and generated explanations connected and versioned.

Threat to agent-written verified Rust. Inference: medium to high for user-facing trust. The architecture can make proof obligations and definitions visible, but a polished next-step explanation can still hide untrusted assumptions or a weak specification. The product should label which steps Verus checked, which solver facts were assumed, and which external code remains trusted.

## techniques for the catalog

- linked typed terms — render mathematical syntax while exposing definitions, types, and theorem contexts
- explicit Given/Where/Find/Relate specifications — separate inputs, preconditions, outputs, and postconditions before method choice
- specification refinement trees — match problems to increasingly constrained formal specifications and compose subproblems by typed input/output edges
- calculational proof steps — present verified transformations and intermediate justifications at user-selectable detail
- guarded pure authoring programs — implement reusable methods with typed arguments, preconditions, and side-condition context updates
- separation of mathematics and interaction — keep functional algorithms independent from dialogue and user-model logic
- Lucas-Interpretation next-step guidance — execute a method to suggest the next step and prove user-entered terms against the current context
- transparent proof provenance — preserve links from each displayed step to the prover derivation and trusted kernel

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
