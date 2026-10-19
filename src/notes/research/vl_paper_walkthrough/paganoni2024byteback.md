# Verifying Functional Correctness Properties At the Level of Java Bytecode
(authored by agents unless marked 🧑)
Tag: `paganoni2024byteback`, [paper](http://arxiv.org/abs/2409.20071v1)

## problem and contribution
The paper presents BYTEBACK, a verifier that checks source-level functional contracts after compilation to Java bytecode. Its motivation is the difficulty of keeping deductive verifiers current as source languages evolve. The paper states: “By targeting bytecode instead of source code, B YTE BACK seamlessly supports a wide variety of Java features that are desugared when automatically translated to bytecode by the compiler.” (Section 1, p. 1). The user writes contracts through BBlib in Java source; the compiler emits bytecode; Soot converts it to Grimp; BYTEBACK recovers specifications and lost typing information; it emits Boogie; Boogie and an SMT solver check the verification conditions (Section 3, Figure 2, pp. 3–4).

The running example has `summary1`, using an array, ordinary `for`, and `if`, and `summary2`, using varargs, `var`, enhanced `for`, and a switch expression. Both have a precondition excluding array element 1, a nonnegative-result postcondition, and a nonnegative loop invariant. The compiler lowers both into bytecode, so the same bytecode-level pipeline handles features that the source verifiers in the paper's comparison table do not all support.

## technique: source contracts recovered from bytecode

What it is. BBlib is a Java library whose annotations and static calls survive compilation. `@Require("p")` and `@Ensure("q")` name predicate methods; `@Predicate` marks the predicate; `@Pure` marks logic-like helper methods. A postcondition predicate receives an extra `result` parameter when the method returns a value. The paper's concrete example defines `no_ones(int[] values)` with `not(contains(...))` and `nonnegative(int[] values, int result)` with `gte(result, 0)`. Its exact statement is: “Users add specifications to the Java source code by writing Java expressions that call these library methods; B YTE BACK then recovers the specifications by analyzing BBlib calls in bytecode format.” (Section 1, p. 2)

When to use it. Inference: This technique is useful when a compiler lowers source features into a smaller intermediate representation (IR) supported by the verifier. Contracts must be expressible in BBlib's supported pure and aggregable subset.

How to apply it.
1. Define the method's input and output predicates in the same class, with `@Predicate` and matching input types. The paper specifies: “A predicate p is static iff m is, and its input signature types are the same as m’s”; a non-void postcondition also takes the returned value (Section 3.1, p. 4).
2. Put `@Require("predicateName")` and `@Ensure("predicateName")` immediately before the target method; multiple requirements or ensures are conjoined (Section 3.1, p. 4).
3. Make predicate bodies pure, side-effect free, terminating in one return, and use `@Pure` helpers for recursive or reusable expressions (Section 3.1, pp. 4–5).
4. Compile the annotated source with `javac`, or another compiler producing Java bytecode (Section 3, p. 3).
5. Run BYTEBACK, which reads bytecode through Soot/Grimp and identifies calls and annotations that encode the predicates (Section 3, p. 3).
6. Inspect the generated Boogie verification result. Inference: A successful result establishes the encoded contracts under the translation's model and Boogie's modular procedure semantics, rather than every detail of Java execution (Section 3.2, p. 9, footnote 5; Section 3.3, pp. 11–12).

Verus form. Inference: The transferable idea is to keep contracts near source code while verifying a simpler representation. Applying BYTEBACK's particular recovery pipeline to Rust would require a separate translation and a way to retain specifications. The paper does not study Verus or establish such a translation.

Evidence and limits. Table 4 contains 32 Java 8, four Java 17, and four Scala 3 programs. The success claim is in Section 4.2 (p. 14): “All the experiments in Tab. 4 verified successfully without errors.” The timing procedure is stated as: “To account for possible measurement noise, we repeated each experiment 5 times and report the mean of the wall-clock running times in the 95th percentile.” (Section 4.2, p. 13). The setup was Fedora 36, Intel i7-7600U at 2.8 GHz, Boogie 2.15.7.0, Z3 4.11.1.0, and Soot 4.3.0. The authors report 3.1 seconds per example for encoding, 0.28 seconds after deducting Soot's fixed initialization time, and 1.4 seconds for Boogie verification (p. 14); Table 4's average row gives 1.42 seconds for verification. These are reported figures, not recomputed averages. Encoding excludes source compilation and Boogie execution. Programs 4 and 36 enable Boogie's `/infer:j` to infer invariants for compiler-introduced array indices absent from the source (p. 14). Inference: These results establish success on the selected examples, not arbitrary Java programs.

## technique: aggregable specification expressions

What it is. BYTEBACK cannot see source syntax, so a predicate must compile into a straight-line expression that can be reconstructed. The paper defines an aggregable expression as pure, branch-free code using BBlib replacements for short-circuit Boolean and comparison operators. It says: “Aggregability further constrains what we are allowed to use in a predicate’s or pure function’s body.” (Section 3.1, p. 5). BBlib supplies `not`, `&`, `|`, `implies`, `lt`, `lte`, `eq`, `forall`, `exists`, and `conditional(c,t,e)`. Java `&&`, `||`, and ordinary comparisons are avoided because compilation may introduce branches.

When to use it. Use aggregable expressions for predicates, pure helpers, loop invariants, assertions, and assumptions that must be reconstructed from bytecode as one logical expression.

How to apply it.
1. Restrict the expression to side-effect-free operations (Section 3.1, p. 5).
2. Avoid loops and conditionals; replace a ternary-like choice with `conditional` (Section 3.1, p. 5).
3. Replace short-circuit `&&`/`||` and potentially branching `!` or comparisons with BBlib methods or eager operators (Section 3.1, pp. 5–6).
4. Use `Binding.T()` to create quantified variables, then `forall` or `exists`; the paper's `contains` predicate uses an existential index bounded by array length (Figure 3, p. 4).
5. Place `invariant(J)`, `assertion(E)`, or `assumption(E)` in executable code only when `J`/`E` are pure and aggregable (Section 3.1, p. 6).

Verus form. Inference: The reusable design lesson is that specification syntax must retain enough structure for the verifier to recover its meaning. BYTEBACK's particular operator replacements address Java bytecode compilation; this paper supplies no evidence that Verus needs the same restrictions.

Evidence and limits. Table 1 (p. 5) enumerates the replacement operators, and Figure 3 (p. 4) gives the `contains` example. The restriction applies to specification expressions, not all executable code: “Branching statements (conditionals, loops) are not allowed, since they introduce jumps in the bytecode that may be cumbersome or impossible to render as a single logic expression.” (Section 3.1, p. 5). Exception handling is a separate implementation limitation (Section 3.3, pp. 11–12).

## technique: Grimp-to-Boogie heap and type reconstruction

What it is. BYTEBACK translates Soot's Grimp representation into Boogie and reconstructs expected types erased or generalized by bytecode. The heap is a polymorphic map `Heap = [Reference]⟨α⟩[Field α]α`; `read` and `update` model field access, while `array.read` and `array.update` model arrays (Section 3.2, pp. 6–9). Integer bytecode types map to mathematical `int`, floating types to `real`, booleans to `bool`, and references to `Reference`. Expected types are inferred from use sites: assignment targets, return signatures, or formal parameter types (Section 3.2, p. 8).

How to apply it.
1. Convert bytecode to Grimp with Soot (Section 3, p. 3).
2. Build aggregate expressions from straight-line assignments in static single-assignment (SSA) form by recursively substituting each variable's unique definition (Section 3.2, pp. 6–7).
3. Translate `@Pure` methods to Boogie functions with a heap argument. Inline `@Predicate` aggregates into `requires` and `ensures`, allowing pre-state `old` expressions to occur directly in postconditions. Translate methods marked with neither annotation to procedures with an inferred frame (Section 3.2, pp. 7–8).
4. Translate fields through `read`/`update` and arrays through `array.read`/`array.update`. Translate supported calls to Boogie procedure calls, saving call results in fresh variables because Boogie disallows procedure calls inside expressions; pure function calls can remain expressions (Section 3.2, pp. 9–10).
5. Translate bytecode `return`, `goto`, and `if` directly to Boogie control flow, and translate specification operators to assertions, assumptions, quantifiers, and conditional expressions (Tables 2–3, pp. 9–11).
6. Identify loops by their head, backjump, and exit locations. Assert the aggregate invariant before entry and before the backjump; assume it at the start of the body and after exit (Figure 5, p. 11).
7. Send the Boogie program to Boogie/Z3 to check the generated verification conditions (Sections 3 and 4.2).

Verus form. Inference: A comparable Rust translation would need to preserve the types and memory facts required by its specifications. BYTEBACK illustrates how to recover some erased information, but its Java heap encoding does not establish a suitable Rust memory model.

Evidence and limits. The paper reports Boogie code about 1.8 times larger than bytecode and Kendall's τ = 0.46 between bytecode and Boogie sizes (Section 4.2, p. 14). The frame analysis recursively follows calls: any heap write yields a whole-heap frame, and an unavailable callee is conservatively assumed to modify the heap. The authors describe it as “sound but imprecise” (Section 3.1, pp. 5–6). A nonempty frame for a method marked `@Pure` or `@Predicate` produces a verification error; postconditions can explicitly preserve selected locations. Inference: Conservative treatment of an unavailable helper can therefore prevent verification of purity even if that helper does not actually modify memory.

## what is proved, trusted, and already done

The paper reports successful verification of 40 programs against their annotations. Inference: This is functional correctness relative to the generated model and contracts; confidence in source-level results depends on compiler lowering, Soot, BYTEBACK's translation, Boogie, and the solver. The experiments do not establish correctness of these components or coverage of arbitrary Java features.

The implementation omits exception handling and `invokedynamic`, treats strings as plain objects, and uses mathematical integers and reals. The paper states that the numeric encoding “entails that B YTE BACK may miss overflow and other numerical errors.” (Section 3.3, pp. 11–12). It also lacks advanced framing, ghost code, and flexible specification reuse through inheritance and modularity. Scala usability is limited because compiler-generated members cannot be directly annotated in Scala source (p. 12).

The authors caution: “We picked the features in Tab. 4’s examples specifically to demonstrate that it’s hard for source-level verifiers to keep up with the plethora of language features that are introduced over time—not to solve verification challenges.” (Section 4.1, p. 12). Inference: For VeruLaw, this is evidence for an architectural approach to language evolution, not an evaluated Rust implementation or a measured product advantage. Reusing it would require a separate contract-recovery and translation effort.

## techniques for the catalog

- bytecode-level contract verification: compile annotated source, recover contracts from an intermediate representation, encode them in Boogie, and discharge them with an SMT backend
- aggregable predicates: restrict specification expressions to pure straight-line forms and use explicit logical operators that survive compilation without branching
- IR heap and type reconstruction: infer expected expression types and encode fields, arrays, calls, control flow, and frames in a Boogie heap model
- conservative frame inference: mark a method empty-frame only when static analysis finds no heap writes, otherwise use a whole-heap frame

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "After analyzing the Grimp bytecode, B YTE BACK has collected all the information to generate Boogie code; to this end, a visitor pattern implementation creates a Boogie AST, and then dumps it into a Boogie file."): read the full paper text, including references; checked quotations, reported numbers, page and section references, technique steps, limitations, and the arXiv identifier on p. 1; corrected predicate staticness, translation steps, references, and experimental scope; separated aggregation restrictions from exception support and removed unsupported Verus claims; did not reproduce experiments, audit the implementation, or independently validate Verus behavior.
