# Verifying Functional Correctness Properties At the Level of Java Bytecode
(authored by agents unless marked 🧑)
Tag: `paganoni2024byteback`, [paper](http://arxiv.org/abs/2409.20071v1)

## problem and contribution
The paper presents BYTEBACK, a verifier that checks source-level functional contracts after compilation to Java bytecode. Its motivation is that source languages evolve faster than deductive verifiers. The paper states: “By targeting bytecode instead of source code, B YTE BACK seamlessly supports a wide variety of Java features that are desugared when automatically translated to bytecode by the compiler.” (Section 1, p. 2). The user writes contracts through BBlib in Java source; the compiler emits bytecode; Soot converts it to Grimp; BYTEBACK recovers specifications and lost typing information; it emits Boogie; Boogie and an SMT solver discharge the verification conditions.

The running example has `summary1`, using an array, ordinary `for`, and `if`, and `summary2`, using varargs, `var`, enhanced `for`, and a switch expression. Both have a precondition excluding array element 1, a nonnegative-result postcondition, and a nonnegative loop invariant. The compiler lowers both into bytecode, so the same bytecode-level pipeline handles features that the source verifiers in the paper's comparison table do not all support.

## technique: source contracts recovered from bytecode

What it is. BBlib is a Java library whose annotations and static calls survive compilation. `@Require("p")` and `@Ensure("q")` name predicate methods; `@Predicate` marks the predicate; `@Pure` marks logic-like helper methods. A postcondition predicate receives an extra `result` parameter when the method returns a value. The paper's concrete example defines `no_ones(int[] values)` with `not(contains(...))` and `nonnegative(int[] values, int result)` with `gte(result, 0)`. Its exact statement is: “Users add specifications to the Java source code by writing Java expressions that call these library methods; B YTE BACK then recovers the specifications by analyzing BBlib calls in bytecode format.” (Section 1, p. 2)

When to use it. Use this technique when the implementation language has syntactic features that the verifier cannot parse directly, but its compiler lowers those features into a stable IR. Contracts must be expressible in BBlib's supported pure and aggregable subset.

How to apply it.
1. Define the method's input and output predicates as static Java methods in the same class, with `@Predicate`; this is specified in Section 3.1 (p. 4).
2. Put `@Require("predicateName")` and `@Ensure("predicateName")` immediately before the target method; multiple requirements or ensures are conjoined (Section 3.1, p. 4).
3. Make predicate bodies pure, side-effect free, terminating in one return, and use `@Pure` helpers for recursive or reusable expressions (Section 3.1, pp. 4–5).
4. Compile the annotated source with `javac`, or another compiler producing Java bytecode (Section 3, p. 3).
5. Run BYTEBACK, which reads bytecode through Soot/Grimp and identifies calls and annotations that encode the predicates (Section 3, p. 3).
6. Inspect the generated Boogie verification result; a successful result establishes the encoded contracts under Boogie's modular procedure semantics.

Verus form. Inference: Keep the Rust implementation at source level and express the contract with `requires`, `ensures`, `assert`, and `invariant` in Verus; Rust's compiler lowering is not exposed as a stable Verus specification interface. Inference: A Rust analogue of the BBlib predicate is a `spec fn` (or a `#[verifier::spec]` function in the local Verus syntax) that is pure and terminating, while the executable function carries `requires`/`ensures`; use `old(...)` in an `ensures` clause for pre-state values. Inference: Unlike BBlib, Verus does not recover contracts from ordinary compiled machine code, so this exact source-contract-through-bytecode workflow does not carry over without a new Rust MIR/LLVM front end.

Evidence and limits. The paper reports 40 verified programs, including Java 8, Java 17 and Scala 3 examples (Section 4, pp. 12–13). All 40 rows in Table 4 report successful verification. The experiments were repeated five times and report the mean wall-clock time at the 95th percentile (Section 4.2, p. 13). The setup was Fedora 36, Intel i7-7600U at 2.8 GHz, Boogie 2.15.7.0, Z3 4.11.1.0, and Soot 4.3.0. Encoding averaged 3.1 seconds per example, with 0.28 seconds per example attributed to BYTEBACK after Soot initialization; Boogie verification averaged 1.42 seconds per example. Inference: The denominator for the “all verified” claim is the 40 programs in Table 4, not all Java programs.

## technique: aggregable specification expressions

What it is. BYTEBACK cannot see source syntax, so a predicate must compile into a straight-line expression that can be reconstructed. The paper defines an aggregable expression as pure, branch-free code using BBlib replacements for short-circuit Boolean and comparison operators. It says: “Aggregability further constrains what we are allowed to use in a predicate’s or pure function’s body.” (Section 3.1, p. 5). BBlib supplies `not`, `&`, `|`, `implies`, `lt`, `lte`, `eq`, `forall`, `exists`, and `conditional(c,t,e)`. Java `&&`, `||`, and ordinary comparisons are avoided because compilation may introduce branches.

When to use it. Use aggregable expressions for predicates, pure helpers, loop invariants, assertions, and assumptions that must be reconstructed from bytecode as one logical expression.

How to apply it.
1. Restrict the expression to side-effect-free operations (Section 3.1, p. 5).
2. Avoid loops and conditionals; replace a ternary-like choice with `conditional` (Section 3.1, p. 5).
3. Replace short-circuit `&&`/`||` and potentially branching `!` or comparisons with BBlib methods or eager operators (Section 3.1, pp. 5–6).
4. Use `Binding.T()` to create quantified variables, then `forall` or `exists`; the paper's `contains` predicate uses an existential index bounded by array length (Figure 3, p. 4).
5. Place `invariant(J)`, `assertion(E)`, or `assumption(E)` in executable code only when `J`/`E` are pure and aggregable (Section 3.1, p. 6).

Verus form. Inference: Use Verus `spec fn` bodies with logical `&&`, `||`, quantifiers, and conditional expressions because Verus verifies Rust source expressions directly; no BBlib replacement methods are needed. Inference: A loop invariant is written as `invariant(...)` on the loop, not as a runtime function call. Inference: Preserve the paper's semantic restriction—pure, terminating formulas—but replace the bytecode-aggregation restriction with Verus's specification language and triggers/solver guidance.

Evidence and limits. The paper's Table 1 enumerates the replacement operators, and Figure 3 gives the complete `contains` example. Inference: Aggregability is a deliberate completeness boundary: code that compiles to control-flow branches cannot be folded into a single predicate by BYTEBACK. This excludes some natural Java Boolean expressions and all exceptions from the current implementation; the paper explicitly notes that “B YTE BACK does not support all used features of Java (in particular, exceptions)” (Section 4.1, p. 12).

## technique: Grimp-to-Boogie heap and type reconstruction

What it is. BYTEBACK translates Soot's Grimp representation into Boogie and reconstructs expected types erased or generalized by bytecode. The heap is a polymorphic map `Heap = [Reference]⟨α⟩[Field α]α`; `read` and `update` model field access, while `array.read` and `array.update` model arrays (Section 3.2, pp. 6–9). Integer bytecode types map to mathematical `int`, floating types to `real`, booleans to `bool`, and references to `Reference`. Expected types are inferred from use sites: assignment targets, return signatures, or formal parameter types (Section 3.2, p. 8).

How to apply it.
1. Convert bytecode to Grimp with Soot (Section 3, p. 3).
2. Build aggregate expressions by putting straight-line SSA assignments into one expression through recursive substitution (Section 3.2, p. 7).
3. Translate `@Pure` methods to Boogie functions with a heap argument; translate other methods to procedures with `requires`, `ensures`, and an inferred frame (Section 3.2, pp. 7–8).
4. Translate fields and arrays through `read`/`update`; translate calls to Boogie procedures, saving call results in fresh variables because Boogie disallows procedure calls inside expressions (Section 3.2, pp. 9–10).
5. Translate bytecode `return`, `goto`, and `if` directly to Boogie control flow, and translate specification operators to assertions, assumptions, quantifiers, and conditional expressions (Tables 2–3, pp. 9–11).
6. Send the Boogie program to Boogie/Z3 and check all generated verification conditions.

Verus form. Inference: Rust references and ownership normally give Verus a typed heap model, so a direct translation of BYTEBACK's untyped `Reference` map is unnecessary. Inference: For unsafe pointer-heavy Rust, model memory with ghost state and explicit ownership predicates; use `requires`/`ensures` and `old(...)` to connect heap snapshots. Inference: Expected-type recovery corresponds to preserving Rust generic and reference types in the Verus source or an MIR front end; it is not a normal Verus annotation task.

Evidence and limits. The paper reports Boogie code about 1.8 times larger than bytecode and Kendall's τ = 0.46 between bytecode and Boogie sizes (Section 4.2, p. 14). The frame analysis is sound but imprecise: any heap write yields a whole-heap frame, and an unavailable callee is conservatively assumed to modify the heap (Section 3.1, p. 6). Inference: This conservatism can increase proof obligations and reject otherwise harmless pure helpers.

## what is proved, trusted, and already done

The proved claim is functional correctness of the 40 annotated methods relative to their BBlib contracts, under the generated Boogie model and solver. Trusted components include the Java/Scala compiler's bytecode lowering, Soot's Grimp construction, BYTEBACK's translation, Boogie's semantics, Z3, and the soundness of the heap/type abstractions. Inference: The experiments do not establish compiler correctness, translation correctness for every bytecode instruction, or coverage of arbitrary Java features. The paper says its experiments demonstrate a language-evolution advantage, not superiority to mature source verifiers; it explicitly limits framing and lacks exception support.

Inference: For VeruLaw, the product threat is moderate and architectural. An agent-written Verus Rust system could use a stable compiler IR to reduce front-end churn, but Verus proofs rely on source-level Rust semantics, ownership, and trusted verifier axioms. Rebuilding BYTEBACK's contract recovery, heap encoding, and IR translation would be a separate verifier project. Existing work already addresses the “verify after desugaring” idea for Java; VL should avoid claiming that IR targeting alone solves source-language evolution.

## techniques for the catalog

- bytecode-level contract verification: compile annotated source, recover contracts from an intermediate representation, encode them in Boogie, and discharge them with an SMT backend
- aggregable predicates: restrict specification expressions to pure straight-line forms and use explicit logical operators that survive compilation without branching
- IR heap and type reconstruction: infer expected expression types and encode fields, arrays, calls, control flow, and frames in a Boogie heap model
- conservative frame inference: mark a method empty-frame only when static analysis finds no heap writes, otherwise use a whole-heap frame

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
