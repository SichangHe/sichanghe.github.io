# Technologies for “Complete, Transparent & Interactive Models of Math” in Education
(authored by agents unless marked 🧑)
Tag: `neuper2019technologies`, [paper](https://doi.org/10.4204/EPTCS.290.6)

## scope and evidence

Neuper surveys a theorem-proving-based architecture for educational mathematics software built around four formal language layers (terms, specifications, proofs, programs) plus interactive next-step guidance. The paper's central design is a “complete, transparent and interactive model of mathematics” (Abstract, p. 76). It uses Isabelle and the ISAC prototype as technical examples. This is a technology and research-position paper, not a controlled classroom evaluation: the abstract says the paper “cannot give a serious description of effects on educational practice”, and effects are posed as ?U (usability) and ?R (educational research) questions. The only field-test evidence is a mention that “early field tests were successful” with references to earlier reports (Section 1, p. 77; Section 7, p. 92).

Inference: The formal-verification value for VL is the separation between executable algorithms, explicit specifications, proof steps, and interaction, plus the idea of exposing machine-checked justifications at different levels.

## technique 1: typed terms with linked definitions

What it is. The term layer contains propositions, predicates, and algebraic expressions. Terms are typed using simple typed lambda calculus, and definitions are reachable from displayed syntax. The paper states: “Definitions are reachable by mouse-click (as well as types mentioned above)” (Section 2.1, p. 78). In Isabelle/jEdit (Fig. 1), a click on `int` leads to its definition, a click on `+` leads to the definition near algebraic structures such as `semigroup_add`, and a click on the theorem `distrib_left` used by the simplifier leads to the formula in the context of a semiring; colours distinguish constants, free variables, and bound variables (p. 78).

When to use it. Inference: use linked definitions when users must inspect the exact semantic object behind a proof obligation or code-level expression.

How to apply it. The paper shows the outcome (Fig. 1), not a procedure; the steps below are partly Inference.
1. Give each term a logical type (simple typed lambda calculus, Section 2.1, p. 78).
2. Inference: store definition and theorem references with each element of the parsed term.
3. Prospect, not implemented: render terms in two-dimensional mathematical notation while keeping the semantic links. The paper says Isabelle/jEdit presentation “is still fixed to lines” and calls for formula editors combining both; a feasibility study [17] “indicates, that development efforts to combine the two features are manageable” (p. 79).
4. On a click, show the definition, type, or theorem used by simplification (p. 78).

Verus form. Inference: expose Rust/Verus `spec fn` definitions and contract clauses as navigable source links in VL. Preserve whether a symbol is executable or specification-only. Verus does not provide this educational UI; the links are a product layer over its source and diagnostics.

Evidence and limits. The evidence is the existing Isabelle/jEdit implementation and screenshots, not a user study. The paper notes that not all definitions are reachable yet because not all of Isabelle's knowledge fits in memory (“The current Isabelle version requires 16GB RAM”), and plans a database referenced over networks, so such software “can only be available as a cloud service” (pp. 78–79). Inference: a VL browser should pin exact library revisions so a link cannot silently change meaning.

## technique 2: formal specification as an explicit problem object

What it is. A specification separates Given inputs, Where preconditions, Find outputs, and Relate (an essential part of the postcondition). The bending-line example (“Biegelinie”) has fields for beam length L, load q0, the condition that q0 is integrable on [0, L] and L > 0, output y, and boundary relations (Section 3, p. 81). The paper says: “A formal specification describes a problem most exactly” (Section 3.1, p. 81), and a solution is correct “if substitution into the post-condition evaluates to true by an (automated) prover” (p. 81).

When to use it. The paper's stated principle is to “first clarify, what the problem is, and then to consider how to solve the problem” (Section 3.2, p. 83). Inference: use explicit specifications before choosing an algorithm, especially when several methods solve the same class of problem.

How to apply it.
1. Define Given fields and a Where predicate (Section 3.1, p. 81).
2. Define Find outputs and a Relate postcondition over inputs and outputs.
3. Associate one or more Methods with the specification; the example names a method in line 11 (p. 81).
4. Check a candidate solution by substituting it into the postcondition and evaluating by an automated prover (p. 81).
5. Organize specifications into trees: an equation is matched with the specification without preconditions, then by breadth-first search down branches with tighter preconditions until the appropriate type of equation is found (pp. 81–82). The paper says only specifications for types of equations have been investigated so far [16] (Section 3.2, p. 83).
6. Prospect: compose subproblems as a directed acyclic graph by connecting outputs to inputs of specifications placed by drag and drop (Fig. 2, p. 82).

Verus form. Inference: map Given/Where/Find/Relate to Rust function parameters, `requires`, return values, and `ensures`. A method entry can point to an executable `fn` plus proof lemmas. The specification object must retain the exact Verus contract and versioned dependencies.

Evidence and limits. The paper reports a prototype and screenshots, but no denominator-based correctness or usability measurement. The Fig. 2 left panel is “faked, i.e. not yet existing” (p. 82), and the paper says Section 3 “mentioned more prospects than facts” (p. 83). Inference: specification matching can guide agents, but does not prove that a chosen specification captures the product requirement.

## technique 3: calculational, stepwise proof language

What it is. The proof layer presents a solution as a sequence of readable transformations with tactics that justify each step (“On the right there are tactics, which justify the respective step”, p. 85), plus sub-problems that can be collapsed or expanded (p. 84). The paper's bending-line calculation has 19 numbered lines and tactics such as `Take`, `Substitute`, and `Rewrite Set Inst` (Section 4, p. 84; Section 4.1, p. 85). It explains: “Entering a method marks the transition from modelling / specifying a problem to step-wise constructing a solution of the problem” (Section 4.1, p. 85). The format is called “structured derivation” [1], based on natural deduction, which ensures “correctness by construction” step by step (p. 85).

When to use it. Inference: use calculational proof steps when a user or agent needs an auditable path from a specification to a result, rather than only a final solver success flag.

How to apply it. The paper presents the format and the interactive construction (Section 6); the list is a condensed reading.
1. Select a specification and method from libraries; entering the method starts the solution phase (Section 4.1, p. 85).
2. Enter a term or tactic as the next step (Section 6.1, p. 90).
3. The interpreter updates a logical context at each tactic, for instance recording a side condition such as x ≠ 1 when meeting a term with a denominator x−1 (Section 5, p. 88).
4. Insert the derivation for an entered term as intermediate steps one level deeper, hidden until requested (Section 6.1, p. 90).
5. After the last step, check the result by substitution into the postcondition (Section 4.1, p. 85; Section 4.2, p. 86).

Verus form. Inference: represent each step as a proof function or lemma with `requires` and `ensures`; show the chain of postconditions explicitly in generated explanations. Keep proof-only functions erased from executable Rust. Verus's syntax and automation differ from Isabelle/Isar, so the UI must render Verus constructs accurately.

Evidence and limits. The paper relies on Isabelle's natural-deduction foundation and an ISAC prototype. It raises open questions about presenting “simplifications comprising many dozens of rewrites” and basic natural-deduction steps (Section 4.2, p. 86). It says “experiences show that structured derivations appear evident to students without going down to natural deduction” (p. 86), with no measurement reported.

## technique 4: purely functional, guarded authoring programs

What it is. Authors implement mathematical methods in a functional programming layer. Programs have no side effects, Isabelle's logic requires termination proofs, and each tactic updates a logical context. A SubProblem takes a theory, a specification key, a method key, and a list of formal arguments (Section 5, p. 88). The paper states: “Algorithms are programmed similar to computer algebra with essential differences in the logical background.” (Section 5, p. 88).

When to use it. Inference: use pure, guarded methods for reusable verified transformations whose interaction policy should remain separate from mathematical computation.

How to apply it.
1. Declare typed method arguments in the signature (the example program `biegelinie` takes five arguments, p. 88) and a guard with structure analogous to the specification's Model; the guard “prevents the program from being executed in case the pre-conditions are not fulfilled” (p. 89).
2. Implement the method as a purely functional program (p. 88).
3. Represent subproblems by theory, specification key, method key, and argument list (p. 88).
4. Termination: Isabelle's logic requires proofs; the prototype bypasses them with `partial_functions` (p. 88). Inference: record such methods as trusted exceptions.
5. Keep interaction out of the program: “mathematical algorithms are implemented in the program language under consideration such that user interaction needs not to be considered” (p. 89).

Verus form. Inference: write executable pure Rust methods with `requires`/`ensures`, and separate UI interaction from proof code. Verus can verify termination and functional contracts for supported loops, but a product must not silently treat an `external_body` or unproved partial function as verified.

Evidence and limits. The paper says “generality of most programs does not allow simple termination proofs; so this issue is bypassed by implementing partial_functions without proof” (p. 88), so this portion is trusted rather than proved. It also says prototyping “already started to shift programmes into Isabelle [22]” (p. 88). Inference: VL should label such methods as assumptions and avoid using them as evidence of end-to-end verification.

## technique 5: Lucas-Interpretation next-step guidance

What it is. Lucas-Interpretation combines computation and deduction (Section 6, p. 89) and involves all four language layers (Section 6.1, p. 89). It can determine a next calculation step and prove a user's input against the current context. The paper states: “Lucas-Interpretation can determine a next step in problem solving.” (Section 6.1, p. 89).

How to apply it.
1. The interpreter operates on the method program for the problem (Section 6.1, p. 89).
2. If the user requests help, return the next algorithmic step; the dialog module may instead reject the request and ask for more user activity based on a user model (p. 90).
3. If the user enters a tactic, search for the corresponding tactic in the program code (p. 90).
4. If the user enters a term, find an automated prover able to derive it from the current context in the calculation (p. 90).
5. Insert the generated derivation as intermediate steps one level deeper, hidden until requested (p. 90).

The paper says the present prototype “only uses a simplifier and, nevertheless, shows good results.” (Section 6.1, p. 90). This is a qualitative report with no stated task count or success denominator. For tactics, “Difficulties here only arise with partial equivalence of tactics or with algebra rules not contained in a rule set” (p. 90).

Verus form. Inference: a VL assistant can synthesize the next proof hint from failed Verus obligations, candidate lemmas, and the current invariant. It must distinguish a suggested step from a Verus-checked step; only the latter supports a correctness claim. Verus proof functions and `assert`/`assert forall`-style facts can serve as the checked backend, with explanations generated from the proof trace.

Assumptions and limits. The paper's next-step interpreter is domain-specific (“a specific class of engineering problems”, p. 90) and depends on a user model and dialogue rules still to be designed (Sections 4.1 and 6.2, pp. 85, 90–91). It does not establish that suggestions are pedagogically effective or complete. Inference: agent-written hints can mislead if the UI presents them as proof certificates before rechecking.

## what is proved, trusted, and already done

The paper describes formal specifications, proof-assistant foundations, pure functional authoring, and an interactive prototype. It does not report a controlled educational evaluation, a count of verified examples, or a measured reduction in proof errors. The paper names Isabelle's “trusted kernel” (p. 85, footnote 18) and states that partial functions are accepted without termination proof (p. 88). Inference: the trusted base also includes the tactic implementations, the specification and method libraries, and the prototype interaction code. The paper says the Fig. 2 specification-arranging panel is “not yet existing” (p. 82).

Paper-stated status (Section 7, p. 91–92: “A major part of the features has been implemented and demonstrated during prototyping (in the ISAC-project and others, references are given), other features are in a concrete stage of planning”). Implemented in prototypes or Isabelle/jEdit per the text: clickable definitions and types, a tree of specifications for types of equations, calculations with hidden sub-derivations, functional programs, and simplifier-based next-step guidance. Prospects: all definitions reachable via a network database, a two-dimensional formula editor with semantic links, drag-and-drop specification arrangement, and the dialogue-rule layer. Inference: VL's opportunity is a Verus-specific implementation that keeps executable Rust, `spec fn`s, proof functions, and generated explanations connected and versioned.

Threat to agent-written verified Rust. Inference: medium to high for user-facing trust. The architecture can make proof obligations and definitions visible, but a polished next-step explanation can still hide untrusted assumptions or a weak specification. The product should label which steps Verus checked, which solver facts were assumed, and which external code remains trusted.

## techniques for the catalog

- linked typed terms — render mathematical syntax while exposing definitions, types, and theorem contexts
- explicit Given/Where/Find/Relate specifications — separate inputs, preconditions, outputs, and postconditions before method choice
- specification refinement trees — match problems to increasingly constrained formal specifications and compose subproblems by typed input/output edges
- calculational proof steps — present verified transformations and intermediate justifications at user-selectable detail
- guarded pure authoring programs — implement reusable methods with typed arguments, preconditions, and side-condition context updates
- separation of mathematics and interaction — keep functional algorithms independent from dialogue and user-model logic
- Lucas-Interpretation next-step guidance — execute a method to suggest the next step and prove user-entered terms against the current context
- inspectable justifications at several levels — let users open sub-derivations and tactics behind each step, down to elementary steps where implemented (Section 4.2, p. 86)

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Proof assistants got their name, because they serve interactive proof construction, where a mathematician constructing a proof has justifications at different levels of abstraction in mind."): read the whole paper text (pp. 76–93 plus references) and the whole study; checked every quotation word for word, page and section references, the Given/Where/Find/Relate example, the guard and subproblem description, the Lucas-Interpretation steps, and the DOI link (from the paper header). Changed: Abstract page 76 not 77; Lucas-Interpretation quote page 89 not 90; page ranges for Sections 3 and 4; removed unsupported claims (overloaded-operator resolution, parse-tree link storage, per-step proof-assistant recheck, "some panels" unimplemented, "already done" for features the paper lists as prospects); labelled prospects and my own steps as Inference; reworded the last catalog item; replaced the semanticscholar link with the DOI. Not checked: the cited external works [1]-[32], the Isabelle or Verus claims in the Verus-form paragraphs (Inference only), and the Fig. 1, 2, 3 images beyond their captions and text.
