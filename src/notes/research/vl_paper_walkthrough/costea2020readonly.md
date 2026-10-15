# Concise Read-Only Specifications for Better Synthesis of Programs with Pointers
(authored by agents unless marked 🧑)
Tag: `costea2020readonly`, [paper](https://doi.org/10.1007/978-3-030-44914-8_6)

## problem and contribution

The paper studies deductive synthesis of heap programs from Synthetic Separation Logic (SSL) specifications. A weak specification can permit a correct but strange implementation: its linked-list copy example swaps tails between the source and copy because the postcondition preserves shape and values but does not forbid mutation of the original list. The authors’ central mechanism is a symbolic read-only borrow, a permission variable attached to a heaplet. Their abstract says, “we explore the use of annotations for restricting memory access permissions in program synthesis, and show that they can make specifications much stronger while remaining surprisingly concise.” (Abstract, p. 141.) They implement the mechanism in ROBoSuSLik, an enhanced SuSLik, and formally present BoSSL, an SSL variant with read-only borrows.

A normal SSL goal is a Hoare-style triple `{P} c {Q}`. Synthesis applies proof-search rules such as Frame, UnifyHeaps, Write, Call, Alloc, and Free; unsuccessful derivations backtrack. The paper’s motivation is that an all-mutable specification allows Write to repair an unfortunate UnifyHeaps substitution by mutating a location that the user intended to preserve. A read-only annotation makes that branch impossible, so search backtracks earlier and explores a semantically appropriate branch.

## technique 1: attach read-only borrows to constrain synthesis

what it is: annotate each relevant points-to or block assertion with a permission value. `M` permits mutation; a symbolic borrow (such as `a`, `b`, or `c`) is treated as read-only by the callee unless its pure context constrains it to `M`. The borrow is a first-class logical value, so callers instantiate it with their own permission and recover that permission after the call.

when to use: use a borrow when a synthesized procedure must observe a heap fragment while preserving its contents, links, or allocation block. Use separate borrows when different fields have different policies. Do not annotate data that the procedure must update.

how to do it:

1. Write the ordinary pre/postcondition and identify heaplets that must not be written or deallocated (Sections 1.1–1.3, pp. 142–145).
2. Give each such heaplet a symbolic permission parameter. In the paper’s `pick` example, the mutable `x` cell remains `M`, while the `y` cell is annotated by borrow `a` (specification (7), p. 149).
3. Ensure the synthesis rules only emit writes to `M` heaplets. In the `pick` example, choosing `z = 239` would require writing the `RO` `y` cell, so WriteRO cannot fire; search backtracks and chooses `z = 30`, producing `*x = 30` (Section 2.2, pp. 146–147).
4. For a call, unify the caller heap with the callee’s precondition and substitute the caller permission for the borrow. The paper’s call uses `[u/x, v/y, M/a]`; the postcondition substitution restores `v`’s original `M` permission (Section 2.3, p. 149).
5. Keep permissions well formed: predicate accessibility variables must be bound by predicate parameters, and existential variables in a postcondition may not have permission sort (Definitions 2–3, pp. 154–155).

The paper states the semantic effect precisely: “the callee must behave correctly for any valuation of a and b, which leaves it no choice but to treat the corresponding heap fragments as read-only” (Section 1.3, p. 144). It also states the preservation result: “Starting from an abstract state where a spatial heap has a read-only permission, under no circumstance can this permission be strengthened to M:” (Section 3.3, p. 154), followed by Corollary 1, No Permission Strengthening.

verus form (inference): represent the same policy with Rust ownership and explicit proof contracts. A mutable executable method takes `&mut` for data it may change; read-only data is borrowed as `&` and its unchanged value can be stated in `ensures`. For a list-preserving helper, a Verus-shaped contract is:

```rust
fn inspect(xs: &Vec<i32>)
    ensures old(xs) == *xs,
{
    // executable reads only
}
```

Inference: the paper’s symbolic permission variable has no direct Verus syntax. Verus’s borrow checker enforces aliasing for executable references, while a proof contract states the mathematical property that the value is unchanged. Inference: if the code uses raw pointers or a ghost heap model, the read-only condition must be expressed with a `spec fn` abstraction and proved by lemmas; the paper’s SSL rules do not carry over as Rust code. Verus `proof fn` bodies are erased and cannot perform runtime mutation.

evidence: the formal result is Theorem 1, “RO Heaps Do Not Change,” which says every location in the read-only set remains allocated and has the same value after execution (Section 3.3, p. 154). Corollary 2, “Borrows Always Return,” says a heaplet retains its permission after a call that requires read-only permission, unless a mutable block may be deallocated (Section 3.3, p. 155). In the synthesis evaluation, the `lcopy` benchmark’s read-only version produces an AST of 32 nodes versus 35 for mutable specifications and performs 9 versus 14 backtracks (Table 1, p. 157). For `tcopy-val`, read-only synthesis takes 1.4 seconds versus 5.3, with 10 versus 1,222 backtracks and 82 versus 2,673 rules (Table 1, p. 157); denominators are one run averaged under the setup’s three runs, and the table reports the per-benchmark averages.

where it fails or assumes: BoSSL’s permissions are indivisible, so it does not support flexible aliasing in which two aliases each retain read-only access (Section 5, p. 161–162). The authors also identify precondition strengthening as a limitation and discuss extending the system with a read-only modality. Their concurrency discussion says the current work studies sequential synthesis; sharing a read-only borrow across concurrent components is not provided by this mechanism (Section 5, pp. 162–163). Inference: the Verus contract above assumes the reference lifetime and Rust aliasing rules are already valid; it does not prove that an arbitrary raw-pointer implementation preserves a source list.

## technique 2: borrow-polymorphic inductive predicates

what it is: parameterize an inductive heap predicate by permission variables for each structural component. The paper changes a list predicate from `ls(x,S)` to `ls(x,S,a,b,c)`: `a` controls the block and deallocation permission, `b` controls the payload pointer, and `c` controls the next-pointer field. The same parameters are passed to the recursive predicate, imposing a uniform policy down the list (Section 2.4, pp. 149–150).

how to do it:

1. Start with an inductive predicate describing shape and logical contents, such as a null-terminated list (Section 2.4, p. 149).
2. Add a permission parameter for every component whose access must be independently controlled. The paper’s predicate has three parameters for block, payload, and link (Section 2.4, pp. 149–150).
3. Pass those parameters unchanged to recursive predicate instances, so every node receives the same policy.
4. Instantiate the parameters at each use site. In `reset`, `ls(x,S,d,M,e)` to `ls(x,O,d,M,e)` makes the links and block read-only while permitting payload replacement with zero (specification (10), p. 150).
5. For a caller with stronger permissions, instantiate the callee’s borrows with `M`; the call substitution `[y/x, M/d, M/e]` borrows and then restores those permissions (Section 2.4, p. 150).

The paper explains the guarantee: “As the first and the third borrow parameters are instantiated with read-only borrows (d and e), the desired function is not going to be able to change the structural pointers or deallocate parts of the list.” (Section 2.4, p. 150.) It contrasts this with plain SSL, where a specification could admit deallocation or arbitrary length changes.

verus form (inference): define a ghost or spec representation of a list and pass an abstract permission policy as a type or predicate parameter. A Verus proof can state that a recursive function preserves the sequence and links while changing payloads, using `requires`, `ensures`, `invariant`, and recursive `proof fn` lemmas. Inference: Verus does not support permission-valued inductive predicates with BoSSL’s substitution semantics; Rust references and explicit ghost predicates encode the policy, and mutable versus shared borrows determine executable access. A list node’s shape-preservation lemma would need to be proved for each recursive case.

evidence and limits: the `reset` example demonstrates stronger guarantees without adding a separate length predicate: read-only shape implies unchanged length, and read-only payload implies unchanged values and ordering (Section 4.3, p. 158). The formal soundness theorem covers read-only locations in the model, but the implementation supports richer integers and sets than the core formal language, whose only pure relation is equality (Section 3, p. 151). Inference: this gap means the implementation’s arithmetic and set extensions are trusted through the tool implementation and experiments rather than covered by the core theorem as written.

## technique 3: fail-fast proof search through annotation-aware rules

what it is: modify only the synthesis rules that can change memory. The paper presents three new BoSSL rules: Write, Alloc, and Free. Write requires a mutable points-to annotation; Alloc creates mutable heaplets and can lead to an unsolvable goal if the postcondition demands read-only allocation; Free requires a mutable block. Read operations and Call need no separate rule because permission substitution handles borrowing and return (Section 3.1, pp. 151–153).

how to do it:

1. During Write, require the source and target points-to heaplets to be annotated `M`; reject a write whose target is a borrow or `RO` (Figure 4, p. 152).
2. During Alloc, allocate a block with the postcondition’s permission and continue synthesis; if that permission is read-only in a way that prevents required updates, the resulting goal fails (Section 3.1, p. 152).
3. During Free, require the block assertion and all its cells to have `M`, then emit `free(x)` (Figure 4, p. 152).
4. During Call, unify only substitutions whose domain is existential variables; disallow a substitution of a caller’s borrow into `M`, which would strengthen permission (Section 3.1, pp. 152–153).
5. Let ordinary SSL Frame, UnifyHeaps, and read rules continue unchanged; the permission checks prune only unsafe branches (Sections 2.2 and 3.1, pp. 147 and 152).

verus form (inference): use executable `&mut` methods for writes and `&` methods for reads, then prove frame-like preservation with `ensures` clauses. Inference: Verus does not expose a synthesis rule queue, so fail-fast branch pruning belongs in a generator layered above Verus; Verus itself rejects a candidate when its borrow checker or proof obligations fail. A generator may use the Verus diagnostic as the branch-failure signal, but that generator is not part of the proof.

evidence: the authors modified less than 100 lines of SuSLik to implement ROBoSuSLik and kept it backward-compatible by treating old specifications as all-`M` (Section 4, p. 155). In the robustness experiment, four synthesis problems, three specification variants, and 42 perturbations produce up to 1,008 runs; timeout-filtered boxplots show read-only search firing fewer rules in all cases. For `lcopy`, both tools have 126 data points; for `tcopy`, read-only has 126 and mutable 108 after timeouts; for `tcopy-ptr`, read-only has 90 and mutable 84 (Figures 6–7, pp. 160–161). The paper reports 102 read-only timeouts versus 132 mutable timeouts over the attempted runs (Section 4.4, p. 161). These denominators are attempted configurations after the authors’ matched-timeout filtering, not all possible 126 runs for every case.

where it fails or assumes: the search results depend on unification and rule-order heuristics. The paper tested six unification orders and six rule-priority orders plus the default, but it does not prove that every possible heuristic benefits. Inference: fail-fast annotations can make synthesis incomplete when a useful implementation genuinely needs mutation that the specification accidentally marks read-only; well-formedness and accurate permission intent are therefore prerequisites.

## evaluation, trusted components, and implications

The evaluation compares RO and Mut modes on singly linked lists, sorted lists, and binary trees, excluding binary-search-tree benchmarks. Each tool times out after two minutes; each benchmark is run three times and synthesis time is averaged, while robustness uses 42 perturbed strategies (Section 4.1, pp. 155–156). Table 1 measures AST size, time, backtracks, rules, and stronger guarantees. The strongest speedup in the table is `tcopy-ptr-val`: 1.3 seconds and 89 rules for RO versus 5.8 seconds and 2,679 rules for Mut, a 4.5× time ratio and 30× rule ratio (Table 1, p. 157). The paper’s “Stronger Guarant.” column is a manual comparison of specification guarantees, not an independently measured semantic coverage metric (Section 4.3, p. 158).

BoSSL formally proves validity and read-only preservation under its heap model, but the proof trusts the model, the operational semantics, the implementation of ROBoSuSLik, the SMT solver used during synthesis, and the translation from generated derivations to executable code. Inference: Verus would move the final proof check to Verus’s verifier, but the same separation remains between generated candidate code and the contract’s adequacy. Inference: the paper’s main product lesson for agent-written verified Rust is to encode non-mutation requirements early, because they both strengthen the contract and reduce search; VL should not redo a generic linked-list example, but should test whether explicit immutable views and ghost shape predicates reduce Verus proof repair on its own data structures. Inference: the paper does not establish that read-only annotations alone protect against unsafe Rust aliasing, foreign code, or an incorrect abstraction predicate.

## techniques for the catalog

- symbolic read-only borrows — name heap permissions so callees can read but cannot write or deallocate borrowed fragments
- borrow-polymorphic predicates — parameterize recursive heap predicates by permissions for independently controlled fields and blocks
- permission-aware synthesis rules — require mutable permissions for Write, Alloc, and Free while preserving ordinary read and call rules
- fail-fast branch pruning — reject substitutions that would write a read-only heaplet, forcing synthesis toward a semantically intended derivation
- borrow-and-return call accounting — substitute caller permissions into callee borrows and recover them through the postcondition
Checked 2026-10-15 against paper costea2020readonly: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
