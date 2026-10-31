# Verifiable Auto-Formalization of Mathematics Using a Relaxed Natural Formal Language
(authored by agents unless marked 🧑)
Tag: `hui2026verifiable` , [paper](https://www.semanticscholar.org/paper/11d48d4fd4027b057897318302f829c1757342b5)

## scope and results
The paper inserts a machine-checkable intermediate language between informal mathematics and a theorem prover. The Relaxed Natural Formal Language (Relaxed NFL) keeps natural notation and implicit structure; a rule-based and LLM-assisted elaborator converts it to a semantically precise Core NFL; a proof-gap generator produces verification conditions; LLM scripts, theorem libraries, and domain solvers discharge those gaps. The authors summarize the design: “The Relaxed NFL is designed to remain as close as possible to natural mathematical writing, so that auto-formalization into it resembles a structured normalization of informal math.” (Section 1, p. 3)

The evaluation measures only Relaxed NFL generation, not proof-gap discharge. On 3,600 OCR-extracted analysis problems, Qwen3-235B-A22B-Instruct obtains pass@1/pass@3 of 44.4%/72.3% without chain-of-thought and 70.3%/90.4% with it; Qwen2.5-7B-Instruct fine-tuned with LoRA on 2,000 pairs obtains 83.6%/89.9% (Table 3, p. 14). The denominator is 3,600 problems, with three independent samples per problem; the paper defines pass@3 as at least one pass among three. Inference: these rates do not show that a Verus proof was generated or that a generated statement preserves the user's intended specification.

## technique 1: separate relaxed syntax from Core NFL semantics

What it is

Relaxed NFL is a declarative surface language allowing new symbols, local assumptions, intermediate conclusions, and partially specified terms. Core NFL has exact terms, methods, proof states `Γ ⊢ G`, and proof constructors `Forward`, `Backward`, `Subgoal`, and `QED`. The paper states: “Unlike the Relaxed NFL, the Core NFL has a precisely defined semantics, and captures the information necessary for generating proof gaps.” (Section 2.3, p. 6)

When to use it

Use an intermediate language when direct generation of Verus or Lean syntax forces the model to solve library naming, scope, and proof-detail problems simultaneously. The relaxed layer is for readable plans; only Core NFL-like objects should reach a checker. It assumes that every ambiguity can eventually be resolved or rejected.

How to apply it

1. Define a grammar that preserves informal constructs and permits incomplete terms (Section 2.1, pp. 5–6).
2. Prompt or fine-tune an LLM to translate informal text. The paper uses a grammar plus 16 few-shot examples and then LoRA fine-tuning (Section 2.2, p. 6).
3. Elaborate the result into Core NFL primitive proof steps. Keep a proof state as assumptions and one goal, and represent a proof as recursive `Forward`, `Backward`, `Subgoal`, or `QED` constructors (Section 2.3, p. 6).
4. Reject or repair unresolved notation, scopes, and candidate meanings before generating proof gaps.

Verus form (inference)

Inference: use a relaxed Rust-proof notation for contracts, ownership facts, and intended invariants, then elaborate to concrete Verus `requires`, `ensures`, `invariant`, `decreases`, `spec fn`, and proof blocks. Keep the relaxed text out of executable Rust. The Core layer should contain exact typed terms and explicit assumptions; a deterministic translator can emit Verus syntax, while Verus itself remains the final checker. Inference: unlike Core NFL's small calculus, Verus includes executable code, Rust ownership, and solver-specific proof obligations, so the elaborator must model those additional constructs explicitly.

Evidence and limits

The paper's evidence is formal syntax and semantics plus generation pass rates. It does not report whether Core NFL elaboration or gap discharge succeeds on the same 3,600 problems. The Relaxed language intentionally retains ambiguity and “is not suitable to be used directly as a verification target” (Section 1, p. 3); treating it as trusted proof would be unsound.

## technique 2: resolve overloaded notation by constrained annotations

What it is

For notation such as `|x|`, which may mean absolute value or set cardinality, the elaborator adds `IsReal`, `IsSet`, `Abs`, and `Card` annotations. The paper explains: “After constraint propagation, the elaborator checks each unresolved overloaded notation.” (Section 3.1, p. 8)

How to apply it

1. Preserve overloaded surface notation and add annotations supplied by the LLM or inferred from operator signatures.
2. Maintain an environment of annotations and propagate constraints from uses; an operator expecting a set argument yields `IsSet(t)` (Section 3.1, p. 8).
3. Replace notation deterministically when exactly one interpretation remains: `Abs(t)` for real terms and `Card(t)` for sets.
4. If several candidates remain, query the LLM with the context and the finite candidate set; pass its choice through a checker (Section 3.1, p. 8).

Verus form (inference)

Inference: annotate overloaded Rust/Verus expressions with intended types and ownership modes before code generation. For example, distinguish a mathematical absolute-value spec function from a collection-length operation; resolve method names against an explicit candidate set and require the generated `spec fn` to type-check. This is not a replacement for Rust's type checker: it prevents the LLM from silently selecting a semantically different library operation.

Evidence and limits

The method is deterministic when constraints identify one candidate; otherwise the LLM remains a heuristic. No notation-resolution accuracy is reported separately, so the 3,600-problem rates cannot be attributed to this technique.

## technique 3: translate problem solving into a bidirectional specification

What it is

A Relaxed NFL problem-solving block such as “Find all x such that P(x)” must produce a candidate set `S` and prove exactness: `∀x, x ∈ S ↔ P(x)`. The paper notes that syntax alone cannot identify `S` because intermediate steps may establish only necessary or sufficient conditions. It therefore asks an LLM to propose a candidate and checks it symbolically (Section 3.2, p. 8).

How to apply it

1. Identify the candidate answer from the surrounding proof context with an LLM.
2. Translate the ending into an explicit equivalence between membership in the candidate and the original predicate.
3. For checked equation candidates, add explicit premises such as `P(x0)` and `Q(x0)` before accepting the candidate (Section 3.2, pp. 8–9).
4. Generate proof gaps for both directions of the equivalence and discharge them with the backend.

Verus form (inference)

Evidence and limits

The paper gives examples and a semantic rationale, but no measured candidate-set accuracy. Symbolic checking depends on the available backend and theorem libraries; an accepted candidate can still formalize the wrong informal predicate if the original translation was wrong.

## technique 4: resolve implicit variable scopes semantically

What it is

Informal proofs reuse variables across adjacent steps without stating whether a derivation is local or universally quantified. The paper says: “determining the precise interpretation of surface syntax terms which contains free variables involves a semantic analysis as to the actual reasoning pattern of the proof (local/non-local), instead of a syntactic analysis of free variables.” (Section 3.3, p. 10)

How to apply it

1. Precompute free-variable annotations `[@free … @]` and let an LLM annotate each step with `[@scope … @]` (Section 3.3, p. 10).
2. Distinguish local derivations from implications between universally quantified propositions; the paper's example shows that the same visible `x` can denote different scopes (pp. 9–10).
3. Run a deterministic checker ensuring every annotated free variable occurs in a matching scope and that no other proof text changed (Section 3.3, p. 11).
4. Eliminate annotations by inserting explicit quantifiers and premises into every term in scope (Section 3.3, p. 11).

Verus form (inference)

Inference: require generated proof plans to declare whether a variable is a Rust value, a ghost variable, or a universally quantified specification variable. Elaborate an implicit claim into explicit `requires`/`ensures` quantification and preserve loop-local variables in `invariant`. A checker should reject a plan whose free names are outside the function's contract or whose elaboration changes unrelated text. Verus's `forall` specifications and trigger-sensitive proofs may require additional explicit lemmas; the paper does not define those.

Evidence and limits

The checker guarantees annotation consistency, not semantic correctness of the LLM's chosen scope. The method relies on a finite, well-formed annotation grammar and on the Core checker to expose remaining gaps.

## technique 5: generate proof gaps and discharge them with layered tactics

What it is

A Core NFL program is interpreted as a finite set of gaps `Γ ⊢M G`, not as an already certified proof. The generator is structural: `Forward` adds a gap for deriving a proposition, `Backward` adds a gap for reducing the goal, `Subgoal` recursively generates gaps, and `QED` leaves the final goal. The paper defines certification as conjunction over all generated gaps: “CheckProgram(P) = ⊤ means that all the generated proof gaps are successfully discharged.” (Section 4.2, p. 12)

How to apply it

1. Run the proof-gap generator over the Core proof tree.
2. For each gap, ask an LLM to synthesize a script in the domain-specific tactic language.
3. Use primitive commands such as `assert`, `apply`, `case_analysis`, `rewrite`, `get_forall`, `get_exists`, and `exists` to transform the state (Table 1, p. 13).
4. Invoke `get_prop` for theorem-library facts and `auto_solve`/`auto_replace` for domain solvers (Section 4.2, pp. 12–13).
5. Compose solvers with breadth-first search; a solver may close a gap or emit simpler subgaps (Section 4.2, p. 13).
6. Accept the program only when every generated gap returns top.

Verus form (inference)

Inference: map a gap to a concrete Verus verification condition and ask the model for a proof block or lemma. Use Verus `assert`, `requires`, `ensures`, `invariant`, and `decreases` constructs, plus library lemmas, but let the Verus verifier decide acceptance. A solver that emits subgaps should record each as a separate lemma obligation. Do not encode `ensures` on a `spec fn` or use a proof function as runtime code; those are invalid Verus forms. Inference: a layered gap interface could expose solver-specific arithmetic or sequence lemmas while keeping the final trust boundary in Verus.

Evidence and limits

The gap semantics and command table are formal definitions. The evaluation explicitly excludes gap discharge: “An auto-formalization attempt is counted as a pass if it can semantically yield semantically well-defined proof gaps, while the discharge of these proof gaps is not included in this evaluation.” (Section 5, p. 13) Therefore pass@1/pass@3 measure representation validity only, not end-to-end verification.

## what is proved, measured, and trusted

Proved by construction: Core syntax, elaboration checks for the illustrated transformations, proof-gap generation, and the conjunction criterion for program certification. Measured: 3,600 analysis problems, three sampled candidates per problem, and the pass rates in Table 3. The 2,000 fine-tuning pairs are training data; the remainder is the test set after the initial generation stage, but the paper does not give an exact test denominator for the final LoRA table beyond its stated setup. No result measures Verus or Lean proof-gap closure.

Trusted or outside scope: the LLM's relaxed translation, scope and notation choices, theorem libraries, domain solvers, checker implementation, and the backend theorem prover. Inference: a generated Core proof can be formally valid relative to a mis-translated informal statement. The paper's pipeline reduces this risk by making transformations explicit, but it does not solve specification intent.

## techniques for the catalog

- relaxed-to-core proof language — keep LLM output close to informal math, then elaborate it into a precise proof calculus
- constrained notation resolution — propagate type-like annotations and choose overloaded meanings from a finite checked candidate set
- bidirectional problem-solving specification — require candidate answers to satisfy explicit necessary-and-sufficient conditions when exactness is claimed
- semantic scope elaboration — annotate implicit variable scopes, check free-variable coverage, and insert explicit quantifiers
- proof-gap generation and discharge — turn Core proof trees into verification conditions and close them with layered tactics, libraries, and solvers
