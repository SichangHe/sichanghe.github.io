# Synthesis Benchmarks for Automated Reasoning
(authored by agents unless marked 🧑)
Tag: `hajdu2025synthesis`, [paper](http://arxiv.org/abs/2507.19827v3)

## scope and result

This paper contributes a benchmark set for deductive program synthesis from first-order ∀∃ specifications. A problem asks for output functions that satisfy a formula for every input while avoiding designated uncomputable symbols. The dataset combines 37 prior benchmarks with 253 new problems, for 290 total; 140 are solved by at least one of cvc5, Synthesiz3, or Vampire under a one-minute limit (Sections 1 and 4, pp. 2, 6). “Our dataset is continuously growing and invites contributions from the communities of computer mathematics, automated reasoning, program verification, and others.” (Section 1, p. 2) Among the authors' stated motivations: “there is a lack of synthesis benchmarks requiring reasoning with theories, quantifiers and induction.” (Section 1, p. 2)

## technique 1: ∀∃ synthesis with uncomputable symbols

What it is. A benchmark is a pair consisting of a many-sorted first-order formula and a set of uncomputable symbols:
`<∀x₁∈S₁,...,xₙ∈Sₙ ∃y₁∈T₁,...,yₘ∈Tₘ . φ[x̄,ȳ], {u₁,...,uₖ}>` (Section 1, p. 2). A solution is a tuple of terms rᵢ[x̄] such that the universally instantiated formula is valid and no rᵢ contains any forbidden uⱼ. Background axioms and recursive definitions may be factored into a closed antecedent ψ (Section 1, p. 2).

When to use it. Use this form when the desired function must work for every input but may depend only on computable operations and explicitly supplied theory axioms. Inference: the uncomputable list prevents a synthesizer from cheating by returning a hidden oracle. The paper says the format “allows to use specifications in full FOL combined with various theories,” while SyGuS does not support uninterpreted function/predicate symbols inside FOL (Section 1, p. 2).

How to apply it. (1) Choose input sorts and output sorts. (2) Write φ with only x̄ and ȳ free, including theory predicates or recursive definitions. (3) List every symbol that the synthesized term must not call. (4) Optionally separate closed background axioms ψ. (5) Ask the reasoner for terms rᵢ[x̄]. (6) Check the universal formula after substitution and syntactically check that forbidden symbols do not occur (Section 1, p. 2). The paper's natural-number example asks for y with x₁+x₂≤y while forbidding `+`; the supplied solution is `if x₁≤x₂ then x₂·2 else x₁·2` (Section 1, pp. 2–3).

Verus form. Inference: represent the synthesized function as an executable Rust function with a `requires` clause for the input domain and an `ensures` clause expressing φ after substitution. Prove the postcondition with a `proof fn` or lemmas over the allowed operations. The “uncomputable symbol” restriction becomes an API or module boundary: do not expose the forbidden operation to the implementation, and review the generated body for calls outside the allowed set. Verus does not automatically enforce syntactic non-use unless the project structure or a separate checker does so.

## technique 2: SMT-LIB-SYNU benchmark format

What it is. The authors extend SMT-LIB 2.7 with `assert-synth`, `assert-claim`, and the `:uncomputable` option (Section 2, p. 3). `assert-synth` names input and output variables and the synthesis formula; `assert-claim` supplies auxiliary lemmas; `set-option :uncomputable` lists forbidden symbols.

How to apply it. (1) Declare theories, sorts, functions, and axioms in standard SMT-LIB. (2) Add an `assert-synth` command containing input variables, output variables, and φ. (3) Add `assert-claim` lemmas when a solver may use them as axioms or prove them as subgoals. (4) Mark uncomputable symbols with `set-option :uncomputable (u₁ ... uₙ)`. (5) Run each solver with its documented command and preserve the exact input file for reproduction (Section 2 and Section 4, pp. 3, 6).

Verus form.

## technique 3: SyGuS translation with uncomputable restrictions

What it is. Every benchmark is translated to SyGuS 2.1 by a Python script. Since SyGuS lacks declarations for uninterpreted functions, the translation replaces each declared or uncomputable symbol with a universally quantified variable, encodes assertions as assumptions, and passes computable uninterpreted symbols as extra function arguments. Uncomputable symbols are left out of the synthesized function's input list (Section 2, pp. 3–4).

How to apply it. (1) Replace each uninterpreted function or forbidden symbol by a higher-order universally quantified variable of the same sort. (2) Turn SMT-LIB assertions into SyGuS assumptions. (3) Add variables for computable uninterpreted symbols to synthesized-function signatures and to the constraint. (4) Omit uncomputable variables from those signatures. (5) For interpreted uncomputable symbols, restrict the SyGuS grammar to computable symbols only (Section 2, p. 4). (6) Inference (not from the paper): compare solver results against the original SMT-LIB-SYNU problem; translation changes the interface and must not silently change the specification.

Verus form.

## technique 4: benchmark categories that force induction

What it is. The dataset has 180 non-recursive and 110 recursive benchmarks. Non-recursive benchmarks are “sub-categorized similarly to SMT-LIB logics” with the prefix NR_ (Section 3.1, p. 4); the table (p. 6) lists NR_UF, NR_LIA, NR_LRA, NR_NIA, NR_NRA, NR_UFLIA, and NR_UFLRA. Recursive R_UFDT benchmarks use inductive datatypes such as natural numbers, lists, and binary trees; proving their specifications may require induction and synthesizing recursive programs (Section 3, p. 4).

How to apply it. (1) Select a theory category matching the target code. (2) For recursive problems, declare constructors and recursive definitions with pattern matching. (3) State the synthesis formula over the datatype. (4) Check whether the proof needs induction over the recursive argument. The paper's `nat-upper_bound_of_sum` defines recursive `add` and `mult`, defines `leq` through an existential witness, asks for an upper bound of `add x₁ x₂`, and marks `add` uncomputable (Section 3.2, p. 5). “We call benchmarks recursive if they contain recursively defined functions, as proving their specifications may require induction, leading to synthesizing recursive programs.” (Section 3, p. 4) Its list example defines `inlst` recursively and asks for the biggest element of a list, i.e. an element of the list that is at least every list member (Section 3.2, p. 5).

Verus form. Inference: encode `nat`, lists, and trees as Rust enums or existing datatypes, write recursive executable functions, and prove contracts with recursive `proof fn` lemmas and induction on the datatype. Use `decreases` clauses where required by Verus termination checking. The paper's synthesis problem can guide test generation, but Verus verifies a supplied function; it does not synthesize a recursive body from the formula.

## technique 5: assisted benchmarks and auxiliary lemmas

What it is. Some problems have `original` and `assisted` versions. Original files include only necessary axioms; assisted files add auxiliary `assert-claim` lemmas that the authors found useful for proving existence of a solution (Section 3, p. 4). Inference: this isolates the effect of proof guidance from the underlying specification.

How to apply it. (1) Run the original problem. (2) Run the assisted problem with the same solver limit. (3) Record whether the auxiliary claims are treated as axioms or proved as subgoals. (4) Attribute any improvement to proof guidance only when the specification and forbidden-symbol list are unchanged. (5) Inference (not from the paper): inspect the claims for soundness; a benchmark should not become easier by adding an inconsistent axiom.

Verus form. Inference: write auxiliary facts as separate `proof fn` lemmas with explicit `requires` and `ensures`. Keep them in the trusted proof source and require Verus to prove them; do not model them as unchecked axioms. This preserves the paper's distinction between original and assisted proof search while avoiding an unsound shortcut.

## evaluation evidence and limits

The evaluation used cvc5 1.2.1 (footnote 8 points to the cvc5 releases page), Synthesiz3's default configuration, and Vampire's synthesis-recursive branch, on an Apple M1 Pro with 32 GB memory and a one-minute limit per benchmark (Section 4, p. 6). Out of 290 benchmarks, cvc5 solved 80, Synthesiz3 90, and Vampire 73; the union (“Total Solved”) was 140, not the sum, because solvers overlap (Table, p. 6). Category denominators matter: NR_LIA had 60 total with 29/32/13 solved by cvc5/Synthesiz3/Vampire and 37 solved by at least one; R_UFDT had 110 total with 3/0/17 and 17 total solved. The authors write that the results “only depict the current capabilities of the respective synthesis tools” (Section 4, p. 6), citing the expected growth of the set and agile solver development. Inference: they are capabilities of these versions and settings, not lower bounds on mathematical difficulty.

Inference: trusted artifacts include each benchmark's axioms and datatype definitions, parser and translator correctness, solver soundness, timeout handling, and the assumption that a returned term satisfies the intended semantics. A solver “solved” count is not a formal proof of a Rust implementation until the generated term is translated and independently verified. The paper does not measure proof size, generated-code quality, or Verus compatibility.

## techniques for the catalog

- ∀∃ synthesis contract — specify a function by universally quantified inputs, existential outputs, and forbidden uncomputable symbols
- SMT-LIB-SYNU — encode synthesis goals, auxiliary claims, and uncomputable restrictions in a machine-readable extension
- SyGuS restriction translation — preserve uncomputable symbols by omitting them from synthesized-function inputs and restricting grammars
- inductive benchmark design — use recursive datatypes and definitions to force induction and recursive-program synthesis
- assisted proof variants — compare bare specifications with versions containing explicitly stated auxiliary lemmas
