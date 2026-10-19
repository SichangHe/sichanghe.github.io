# Imperative Quantum Programming with Ownership and Borrowing in Guppy
(authored by agents unless marked 🧑)
Tag: `koch2025imperative`, [paper](https://arxiv.org/abs/2510.13082)

## what the paper contributes

Koch et al. design an ownership and borrowing type system for imperative quantum programs and implement it in Guppy. The authors claim static enforcement of three safety properties: “qubits cannot be used after they are destructively measured or discarded”, multi-qubit operations require distinct qubits, and “it is impossible to implicitly discard or leak qubits” (section 1, p. 1). These are not formally proved here: the authors write, “we want to define a core language fragment of Guppy and formally prove the safety claims made in this abstract” (section 4.2, p. 5).

## technique: unique ownership with temporary borrowing

What it is. Each qubit has exactly one owner, the scope allowed to destructively measure or discard it. Non-destructive quantum operations borrow a qubit temporarily. Ownership prevents aliasing; borrowing permits ergonomic imperative calls without transferring destruction rights.

How to use it.

1. Allocate qubits in a function scope; the scope owns them. In the paper's `bell`, `q1, q2 = qubit(), qubit()` creates two owned qubits (section 2.1, p. 2).
2. Apply a quantum operation through a temporary borrow. `h(q1)` does not acquire ownership, so the owner can borrow `q1` again after the call (section 2.1, p. 2).
3. Reject overlapping borrows. `cx(q1, q1)` is rejected because “q1 already borrowed” (section 2.1, p. 2).
4. Transfer ownership explicitly by returning an owned qubit. `return q1, q2` transfers both to the caller, which may then measure them (section 2.1, p. 2).
5. Reject use after consumption. After `measure(q1)`, `h(q1)` is rejected as “q1 already consumed” (section 2.1, p. 3).

The borrow checker therefore distinguishes operations that consume qubits from operations that merely act on them. The paper's example uses Hadamard and controlled-X operations for the latter and destructive measurement for the former.

Verus form. Inference: represent a qubit by an owned proof token. Quantum operations would require exclusive temporary access, and destructive measurement would consume the token. An operation on multiple qubits would also require distinct identities. This is a proposed encoding, not an implementation or result reported in the paper.

Evidence and limits. The paper presents accepted and rejected examples; it reports no benchmark results or formal type-safety theorem. Inference: these examples alone do not establish correctness of hardware execution.

## technique: borrow by default and explicit ownership annotation

What it is. Function parameters of qubit type are borrowed by default. A function that consumes a caller's qubit must opt in with `@owned`.

Steps.

1. Declare `def foo(q: qubit)` for a non-consuming function. `h(q)` and `z(q)` are allowed, and reborrows expire before return (section 2.2, p. 3).
2. Reject `measure(q)` in such a function because the callee does not own `q` (section 2.2, p. 3).
3. Declare `def bar(q: qubit @owned) -> bool` when ownership transfer is intended; `return measure(q)` then consumes the argument (section 2.2, p. 3).
4. Mark consuming library signatures likewise: the paper gives `measure(q: qubit @owned) -> bool` (section 2.2, p. 3).

Verus form. Inference: encode borrowed and owned handles as distinct wrapper types, or as ghost capabilities with different predicates. A consuming function's contract should make the old capability unavailable in the post-state; a borrowed function should preserve it. This makes the lifetime promise visible at the API boundary.

The paper states, “borrows in our type system are not first-class” and “It is not possible to return a borrowed value or store it in a data structure” (section 2.2, p. 3). The authors explain that this avoids requiring Python users to handle explicit lifetime parameters.

## technique: reject qubit leaks with linear and affine checking

What it is. Owned qubits must be consumed exactly once or transferred; borrowed qubits may be left for their original owner. A scope ending with an unconsumed owned qubit is a compiler error.

Steps.

1. Track ownership field by field through a scope.
2. At scope exit, require every owned qubit to have been explicitly consumed or its ownership transferred.
3. Emit an error for `tmp = qubit()` when `tmp` is neither measured nor returned, as in `baz` (section 2.3, p. 4).
4. Repair by explicitly measuring `tmp` or returning it to the caller. The borrowed parameter `q` remains the caller's responsibility (section 2.3, p. 4).

Verus form. Inference: represent an owned qubit as a ghost token that must be consumed by exactly one proof function. A destructor-like proof obligation at the end of a verified scope can enforce that no token remains. This requires an explicit wrapper protocol because ordinary Rust drop behavior does not itself prove quantum deallocation intent.

## technique: field-wise dataflow ownership

The checker extends to arbitrary control flow and compound values. The paper states: “our linearity checking logic extends to arbitrary control flow (if, for, while, etc.) through dataflow analysis” (section 2.4, p. 4). Structs and collections are tracked field-wise: a qubit field can be measured or transferred while other fields remain valid, and a loop reborrows each array element temporarily (section 2.4, p. 4).

Verus form. Inference: attach ghost permissions to struct fields and prove loop invariants that preserve ownership of untouched fields while transferring the temporary borrow for the current element. Classical fields can remain ordinary copyable values.

## technique: translate imperative borrows into pure functional dataflow

What it is. Guppy compiles imperative programs to HUGR, a functional intermediate representation based on dataflow graphs. A side-effectful function that borrows a qubit is rewritten as a pure function that accepts and returns the qubit.

Steps.

1. Start with `foo_imperative(q) { h(q); z(q) }`.
2. Replace each borrowed quantum-operation call with an assignment returning the qubit: `q = h(q); q = z(q)`.
3. Return `q` explicitly, yielding `foo_pure(q) -> qubit` (section 3, p. 5).
4. Rely on unique borrows to justify that passing by value does not clone a qubit; borrowed qubits cannot be measured or stored, so their binding remains trackable (section 3, p. 5).

The paper does not yet prove translation soundness; it lists that proof as future work (section 4.2, p. 5). Inference: a Verus implementation would require a refinement relation between imperative execution and the generated functional dataflow, with lemmas showing that borrow expiration corresponds to returning the same logical qubit.

## what is proved, measured, and trusted

Proved: no formal theorem in this paper. Implemented: all presented ideas in Guppy, with examples of accepted and rejected programs. Measured: no runtime, corpus, or bug-detection denominator is reported. The paper leaves a core-language safety proof and translation proof for future work (section 4.2, p. 5). Inference: using the implementation requires trusting the checker and translation; executing its output also requires trusting the backend and hardware.

Inference: these ownership patterns could help prevent API misuse and resource leaks in agent-written verified Rust. Applying them would require faithful specifications of quantum operations and backend effects. A reusable lesson is to make destructive effects explicit in types and require owned resources to be consumed or transferred at scope boundaries.

## techniques for the catalog

- unique qubit ownership: give one scope destructive rights and permit temporary non-destructive borrows
- borrow-by-default APIs: require an explicit `@owned` annotation for consuming parameters
- linear and affine leak checking: require owned resources to be consumed or transferred while borrowed resources return to their owner
- field-wise dataflow: track ownership through branches, loops, structs, and arrays
- imperative-to-functional translation: replace unique borrowed side effects with explicit value threading into a functional IR
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In other words, while we enforce linear typing for owned qubits, we only use affine typing for borrowed ones."): checked the full study, quotations, ownership and borrowing steps, references, implementation claims, and proof limitations; corrected the opening quotation, used the paper’s arXiv identifier for the link, clarified exclusive borrowing and resource consumption, and marked conclusions as inferences; did not check Guppy source code, execute its examples, or validate the proposed Verus encodings.
