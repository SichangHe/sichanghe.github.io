# Verified VCG and Verified Compiler for Dafny
(authored by agents unless marked 🧑)
Tag: `nezamabadi2025verifiedvcg`, [paper](https://www.semanticscholar.org/paper/c8f6e9d3bb4a2aa28985f7dd162c6cb7776d2256)

## purpose and scope
The paper builds foundationally verified components for a substantial Dafny subset. The target is a chain from Dafny source, through a verification-condition generator (VCG), to CakeML code. The formal development is in HOL4. The supported language includes mutually recursive methods, while loops, arrays, old-expressions, and explicit failure or timeout results (§1–2, pp. 1–4). The authors state: “neither the compiler nor the verifier is proved correct; in fact, soundness bugs have been found in both tools.”

The central technique is to define a functional big-step semantics first, then prove both the VCG and compiler against that same semantics. This avoids treating an implementation of Dafny or Boogie as an oracle. The paper's abstract says: “We present a functional big-step semantics for an imperative subset of Dafny and, based on this semantics, a verified verification condition generator (VCG) and a verified compiler for Dafny.”

## technique 1: executable big-step semantics as the reference

What it is and when to use it. Define expressions, statements, heaps, locals, termination clocks, and method results as total HOL4 functions or relations before proving tools correct. Use this when compiler and verifier must be compared with one unambiguous meaning, including ill-defined reads and nontermination. The result type explicitly distinguishes normal return, failure, and timeout (§2.1–2.4, pp. 3–6). The paper says: “Evaluating an expression can either return a value or fail due to the reasons above.”

How to apply it. (1) Represent values and heap locations in a typed semantic state. (2) Define expression evaluation, including `old` by evaluating against a saved heap. (3) Define statement evaluation with a clock so recursive calls and loops can time out. (4) Define method evaluation and mutually recursive calls. (5) Prove determinism and termination properties needed by later simulations. The paper's `While` semantics deliberately does not check loop invariants; invariants are VCG obligations, while the evaluator only executes the body and clock. Section 2.3 gives this split.

Verus form. Inference: model the executable Rust function directly, with `requires` and `ensures` contracts and a ghost/spec state for the abstract heap. Use `spec fn` for mathematical evaluation and `proof fn` lemmas for determinism or correspondence; use `old(...)` in postconditions when a pre-state value is needed. Verus does not provide Dafny's HOL4 datatype definitions automatically, so Rust data structures and failure/timeout enums must be represented explicitly. This is an inference because the paper targets Dafny and CakeML, not Verus.

Evidence and limits. The semantic model is the basis for every later theorem, but it covers only the stated subset: the authors note that objects are planned future work. Inference: a Verus product must separately model unsafe operations, libraries, and environmental behavior; proving a subset semantics does not prove the full language.

## technique 2: weakest-precondition VCG proved sound

What it is and when to use it. Build an eight-place inductive weakest-precondition relation (`stmt_wp`) that carries normal and exceptional outcomes, pre-state values, heap framing, and termination. Use it to turn a method body plus specification into verification conditions whose validity implies functional correctness and definedness. The paper introduces this as: “Define a weakest precondition (wp) calculus for the Dafny subset, prove its soundness, and use it to implement a verified VCG” (§1, p. 2).

How to apply it. (1) Give each assignment, sequence, conditional, loop, call, and array operation a wp rule. (2) Thread `locals_prev` and `heap_prev` so `old` expressions refer to the intended state. (3) For loops, require invariant initiation, preservation, and a decreases argument; the semantic evaluator's clock supplies total-correctness reasoning. (4) Generate a final conjunction of well-formedness and postcondition obligations. (5) Prove by induction on the statement that a valid wp implies the big-step result satisfies the postcondition. (6) Implement the VCG as a HOL4 function returning a result monad, and prove that generated conditions are equivalent to the inductive relation (§4–4.3, pp. 8–12). The paper states: “This is a total correctness result—the fact that evaluation terminates is implied by the correctness of the VCG and the soundness of the weakest precondition calculus.”

Verus form. Inference: write the Rust method with `requires`, `ensures`, loop `invariant` clauses, and `decreases` clauses; use ghost snapshots or `old(...)` for pre-state values. Verus's solver checks the resulting obligations rather than producing a HOL4 result monad, so the VCG implementation itself is not normally re-created inside the target program. A Verus proof must keep executable code separate from `spec fn` and `proof fn` facts.

Evidence and limits. The theorem is conditional on valid generated conditions and on the formalized subset. The paper reports that arrays and recursive methods are included, while object features are not. The external SMT solver used in ordinary Dafny is not the trusted basis here; the HOL4 proof checks the VCG's logic, but the final user proof still depends on the solver's answer being represented as a theorem or certificate in the surrounding workflow.

## technique 3: compiler correctness by forward simulation

What it is and when to use it. Compile each Dafny construct to CakeML while defining a relation between Dafny and CakeML states. Prove that every source evaluation step is simulated by target evaluation, preserving the source result. This is useful when verified source reasoning must transfer to generated executable code. The paper summarizes the key result: “This is a forward simulation result, which suffices to show that the (deterministic) semantics of Dafny programs are preserved in the output CakeML programs.” (§3.2, pp. 7–9).

How to apply it. (1) Translate variables to CakeML references and arrays to the selected heap representation. (2) Insert a return exception around method bodies because Dafny methods explicitly return. (3) Define a state-equivalence relation connecting Dafny locals/heaps with CakeML references/heaps. (4) Prove expression compilation preserves values and failures. (5) Prove statement compilation preserves state relation for sequencing, loops, calls, and returns. (6) Lift to a top-level method theorem and export CakeML code (§3). The paper's linear-search example and Figure 3 show the shape of generated CakeML code.

Verus form. Inference: keep the Rust implementation and an abstract state relation in a `spec fn`; prove each mutating helper with `ensures` that it preserves the relation. For a compiler, prove a relation between source AST interpretation and emitted Rust/CakeML behavior with recursive `proof fn` lemmas. Verus can verify the target Rust but does not by itself establish CakeML compiler correctness, so a separate verified compiler theorem remains trusted infrastructure.

## evidence, trust, and product implications

The formal evidence is HOL4 mechanization of the semantics, wp soundness, compiler simulation, and end-to-end examples such as linear search and the 91-function. The paper's conclusion calls the VCG and compiler “substantial” but reports a deliberately limited subset. Trusted parts include HOL4's kernel and definitions outside the formalized subset, the untrusted Dafny frontend that emits S-expressions, parsing and interface code, and CakeML's own trusted base. Inference: for agent-written verified Rust, this paper is a high threat to any claim that a passing verifier alone validates the compiler pipeline; it supports a design where a small kernel checks proof-producing artifacts and where source-to-binary simulation is explicit. Existing VL work should not redo a generic weakest-precondition tutorial; it should reuse the boundary analysis and test whether Verus's erasure and compiler steps have analogous theorems. The paper contains no measured deployment denominator for all Dafny programs, so broad coverage claims would be inference.

## techniques for the catalog
- reference big-step semantics: define executable source meaning, including failure and timeout, before proving tools
- verified weakest-precondition VCG: generate loop, framing, definedness, and postcondition obligations and prove them sound
- forward-simulation compiler proof: relate source and CakeML states and prove preservation through every compilation construct

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
