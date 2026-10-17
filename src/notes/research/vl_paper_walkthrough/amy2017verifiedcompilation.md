# Verified Compilation of Space-Efficient Reversible Circuits
(authored by agents unless marked 🧑)
Tag: `amy2017verifiedcompilation`, [paper](https://arxiv.org/abs/1603.01635)

## purpose and result

ReVerC is a verified compiler from the Revs language to circuits built from NOT, controlled-NOT, and Toffoli operations. Its target is space-efficient reversible and quantum compilation: temporary bits (ancillas) must be returned to zero so they can be reused. The paper states: “Circuits compiled with ReVerC are certified to preserve the semantics of the source Revs program, which we have for the first time formalized, and to reset or clean all ancillary (temporary) bits used so that they may be used later in other computations.” (Introduction, PDF p. 2).

The compiler has direct, eager-cleaning, and Boolean-expression (“crush”) modes. It is written and proved correct in F*. ReVerC’s core is approximately 2,000 lines and its proofs around 2,200 lines; verification took just over one person-month and used 11 unproven axioms about lookup tables and sets (Section 5, PDF p. 14).

## technique 1: a restricted reversible source language

Inference: when to use it: use Revs when circuit generation must be statically bounded and every operation can be compiled to a straight-line reversible circuit.

Steps and constraints from Section 3.1 (PDF pp. 5–7):

1. Write an imperative program over Boolean values and fixed-length bit arrays, with ML-style functions and `let`.
2. Use `clean t` only when `t` evaluates to zero; this frees its bit.
3. Express conditionals through the derived XOR/AND form and expand statically bounded loops into sequences of substituted bodies.
4. Keep control independent of run-time values. The paper says: “Note that Revs has no dynamic control – i.e. control dependent on run-time values.” (Section 3.1, PDF p. 5).
5. Use the operational semantics in which every Boolean value, including constants, is allocated at a store location. This gives explicit control over bit allocation and models registers as lists of locations.

The carry-ripple adder in Figure 4 is the paper’s example: it repeatedly assigns a carry bit, and ReVerC cleans the old carry so it can be reused (Section 3.1, PDF p. 6). The restriction to straight-line behavior is a target-architecture assumption, not a generic reversible-program property.

Inference: possible Verus form: represent bits as `bool` or bitvectors and make the source program’s static bounds explicit in Rust types or constants. A Verus `spec fn` can define the mathematical circuit function; executable code can manipulate a vector with `requires` bounds. Verus cannot execute an F# quotation compiler automatically; the Rust generator and its generated circuit need separate contracts.

## technique 2: compile Boolean expressions with ancilla allocation

Inference: when to use it: use this as the code-generation kernel for each Boolean expression assignment.

The paper’s `compile-BExp(B,i,ξ)` algorithm (Section 4.1, PDF p. 9) is:

1. For `B = 0`, emit no operation; for `B = 1`, emit `NOT i`.
2. For a variable `B = j`, emit `CNOT j i`.
3. For `B = B1 ⊕ B2`, recursively compile both expressions into the same target, using XOR associativity.
4. For `B = B1 ∧ B2`, pop a zero-valued ancilla `a1` and recursively compile `B1` into it; then pop `a2` and compile `B2` into it; finally emit `Toffoli a1 a2 i`.
5. Track the remaining zero-valued ancilla heap `ξ`; later cleanup returns reusable bits to it.

The semantic contract is that the result target becomes `i ⊕ B`, provided expression variables, target, and ancillas are disjoint and ancillas start at zero (Theorem 1, PDF p. 14). The paper says: “As a Boolean expression is already in the form of an irreversible classical circuit, the main job of the compiler is to allocate ancillas to store sub-expressions whenever necessary.” (Section 4.1, PDF p. 9).

Inference: possible Verus form: model a circuit as an immutable sequence or algebraic datatype of operations and define a `spec fn eval` over bit states. A `proof fn` can prove each recursive compiler case preserves `eval`; `requires` states disjointness and zero ancillas. The generated Rust allocator can use a vector/set with ownership, but no runtime `proof fn` may be called as a circuit operation.

Evidence: Theorem 1 is machine-checked. The table’s circuit counts include, for example, ReVerC eager carryRippleAdd 32 using 113 bits, 361 operations, and 90 Toffolis; the denominator is one generated benchmark circuit, not a mean. Section 6 (PDF p. 16) attributes higher costs to Toffoli operations, citing typical implementations with seven CNOTs per Toffoli and costs up to hundreds of times those of NOT and controlled-NOT operations in fault-tolerant architectures.

## technique 3: cleanup by restricted inverse

Inference: when to use it: use cleanup immediately after a temporary expression computation to return non-target ancillas to zero without changing the target.

Steps from Section 4.1 and Theorems 1–2 (PDF pp. 9, 14–15):

1. Require disjoint expression variables, target, and ancilla heap, with ancillas initially zero; compile `B` into circuit `C = compile-BExp(B,i,ξ)`.
2. Define `uncompute(C,A)` by reversing operations and deleting every operation whose target is in protected set `A`.
3. Invoke `C :: uncompute(C,{i})`; the target `i` retains `i ⊕ B`, while other bits are restored.
4. Push cleaned ancillas back into `ξ`.
5. Require that no protected bit is used as a control; this is the premise of Lemma 1.

The paper states: “The restricted inverse allows the temporary values of a reversible computation to be uncomputed without affecting any of the target bits.” (Section 4.1, PDF p. 9). Theorem 2 proves every `j ≠ i` is unchanged after the composition under the disjointness assumptions (PDF p. 15).

Inference: possible Verus form: define `spec fn uncompute` as reverse-and-filter and prove `eval(C :: uncompute(C,{i}),s)` restores all non-target bits when controls avoid `{i}`. Use a set predicate for protected targets and a recursive lemma over the circuit list. This proof is mathematical; the executable cleanup walks the stored circuit.

Evidence: Theorem 2 depends on Lemma 1 (restricted inverse) and Lemma 2: states agreeing on a set containing every control bit still agree on that set after the same circuit. Theorem 1 separately requires zero-valued ancillas and disjoint expression variables, target, and ancilla heap (Section 5.1, PDF pp. 14–15).

## technique 4: partial evaluation over interchangeable interpretations

Inference: when to use it: use one evaluator architecture to obtain an ordinary interpreter, a reversible circuit compiler, an eager-cleanup compiler, or a Boolean-expression representation.

Steps from Section 4.2 (PDF pp. 10–11):

1. Define an interpretation domain `D` with `assign : D × N × BExp → D` and `eval : D × N × State ⇀ B` (a partial function).
2. Reuse the Revs evaluator, replacing store updates with `assign` and location lookup with `eval`.
3. For the standard interpretation, assignments evaluate expressions immediately.
4. For the circuit interpretation, allocate an ancilla, compile the expression to `i ⊕ B`, append operations, and map the location to the new bit.
5. For eager cleanup, use the garbage-collected interpretation below; for crush mode, store Boolean expressions over free variables.
6. Prove a relation between two interpretations; Theorem 3 lifts preservation by each assignment to preservation for evaluation of every term.

The paper says: “This greatly simplifies the problem of verification (see Section 5).” (Section 4.2, PDF p. 11). Theorem 3’s premise is that related interpretation states remain related after every `assign`; its conclusion gives equal values and related final states for any evaluated term.

Inference: possible Verus form: represent each interpretation as a Rust ghost/spec datatype and prove a relation invariant. A generic `proof fn` over the relation can establish the evaluator theorem; executable interpretation dispatch remains ordinary Rust. This is a direct analogue of relational refinement proofs, not a Verus built-in.

## technique 5: eager cleanup expressions

Inference: when to use it: use eager mode when old values become dead during assignment and space should be reclaimed before the end of the program.

Steps from Section 4.3 (PDF pp. 12–13):

1. Extend the interpretation state with a partial cleanup map `κ` from active bits to Boolean expressions.
2. Maintain `s_after(i) ⊕ κ(i)(s_after) = s_initial(i)`, where `s_after = eval(C, s_initial)`.
3. On assignment to location `l`, allocate a new bit for the new expression. The prose says: “Both are effectively the same as in the circuit interpretation, except the assignment operator calls clean on the previous bit mapped to l.” (PDF p. 13). However, the displayed `assignGC` formula passes the newly allocated `i` to `clean`. Inference: the old-bit description captures the stated intent, but the formula is inconsistent with it; the implementation was not inspected to resolve this.
4. If a bit has a self-reference in its cleanup expression that Boolean simplification cannot eliminate, defer its cleanup until the end. Otherwise compile the cleanup expression into the bit and return it to the heap if it is an ancilla.
5. When bit `i` changes by XOR with `B`, substitute `i ⊕ B` for every occurrence of `i` in all cleanup expressions so their correctness relation remains true.
6. Run a final cleanup round for self-referential bits.

The paper says: “One way to keep the space usage from continually expanding as assignments are made is to clean the old bit as soon as possible and then reuse it, rather than wait until the end of the computation.” (Section 4.3, PDF p. 12).

Inference: possible Verus form: represent `κ` as a ghost map and state the cleanup equation as an invariant. Prove `clean` preserves the invariant and zeroes the selected bit under a no-self-reference precondition. Mutable circuit construction can be isolated behind a verified builder; the mathematical cleanup relation is the trusted specification.

Evidence: Table 1 shows eager ReVerC never uses more bits than default and reduces bits on 6 of the 13 benchmark rows; for carryRippleAdd 32 it uses 113 versus 128 bits. It is not uniformly best: Revs eager uses 109 bits for carryLookahead 32 versus ReVerC eager’s 146 (Table 1, PDF p. 17). These are exact rows, not averages.

## what is proved, measured, and trusted

The proved claims are circuit/interpreter equivalence, cleanup correctness, interpretation preservation, and ancilla reset. The conclusion qualifies certification: “The implementation of the interpreter may have subtle bugs, which ideally would be verified against a more straightforward adaptation of the semantics using a relational definition.” (Section 7, PDF pp. 17–18). The experiments compare ReVerC and Revs on 13 arithmetic/cryptographic benchmark rows, measuring bits, operations, and Toffolis under default/eager modes (Table 1, PDF p. 17). The paper reports Linux with 8 GB RAM (Section 6, PDF p. 16). Section 5 reports 11 unproven axioms about lookup tables and sets. Parameter-interference analysis is omitted and deferred to the extended version (Section 4.2, PDF p. 12); the paper also does not describe the initial interpretation values needed for the final equivalence argument (Section 5.2, PDF p. 16). Inference: this study cannot establish the correctness of those omitted details, F# quotation handling, or the F* toolchain from the paper alone.

## techniques for the catalog

- reversible source restriction — require statically bounded, straight-line Boolean programs with explicit cleanup
- ancilla-aware Boolean compilation — recursively compile XOR/AND expressions while allocating only zero-valued temporary bits
- restricted-inverse cleanup — reverse a circuit while protecting target bits to restore temporary values
- interpretation-parametric partial evaluation — prove compiler correctness by relating standard, circuit, and cleanup interpreters
- eager cleanup expressions — maintain per-bit inverse expressions and recycle dead ancillas during assignment
