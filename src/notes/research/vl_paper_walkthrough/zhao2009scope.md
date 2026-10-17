# Scope Logic: Extending Hoare Logic for Pointer Program Verification
(authored by agents unless marked 🧑)
Tag: `zhao2009scope`, [paper](http://arxiv.org/abs/0912.4184v1)

## scope and contribution

Zhao and Li extend Hoare logic for pointer programs by modeling typed memory access, recursively defined abstract values, and the set of memory units on which each abstract value depends. The abstract states: “The basic idea is that a virtual value keeps unmodified as long as no memory unit in its scope is over-written.” The logic is based on an extension of the Logic for Partial Functions (LPF), whose terms can express undefinedness and recursive functions. It adds pointer, array, and record program types; symbols for dereferencing and taking field or array addresses; data-retrieve functions (DRFs); memory-scope functions (MSFs); and proof rules for assignment and allocation.

Inference: The paper's core engineering idea is to make frame reasoning syntactic: derive a footprint for every abstract query, then require an assignment target to be outside that footprint before reusing the query's value. This is relevant to Verus APIs for linked structures, although the paper does not use Rust or Verus.

## technique 1: model typed pointer memory and layouts in the logic

What it is. Extend LPF with three program type constructors: `P(t)` for pointers, `ARR(t,c)` for arrays, and `REC((n1,t1) × … × (nk,tk))` for records (section 2.1, PDF page 4). Use `nil` constants, a partial dereference function `∗ : Ptr → Ptr ∪ integer ∪ boolean`, and address functions for array elements and record fields. The paper says: “An application of this function symbol models a memory unit access.” for dereference and “These function symbols model the memory layout of array types.” for array addresses (section 2.1, page 4).

How to apply it.
1. Declare the program's pointer, array, and record types using the three constructors (section 2.1).
2. Interpret a program variable `v` as the address `&v`; use `∗(&v)` for its stored scalar or pointer value (section 2.1).
3. Use `&e[i]` for an array element address and `&e → n` for a record-field address; dereference those addresses to obtain values (section 2.1).
4. Define `Block(r)` recursively: empty for `nil`, singleton for scalar/pointer cells, and the union of field or element blocks for records and arrays (section 2.2, PDF page 5).
5. Discharge layout facts with the paper's rules: `MEM-ACC` for a valid dereference, `MEM-BLK` for disjoint-or-contained blocks, `PVAR-1/2` for declared variables, and record/array layout rules (section 2.2).

Verus form. Inference: A Verus model can use Rust structs and enums for record and pointer shapes, with `spec fn` descriptions of reachable nodes and a `view`-style mathematical representation. Executable dereferences require Rust ownership and borrow checks; proof code can state that a pointer is non-null before accessing it with `requires`. The paper's `∗`, `&→`, and `&[]` are semantic functions, not Verus syntax. Inference: Verus's ownership discipline supplies part of the alias control that Scope Logic states as LPF premises, but unsafe raw-pointer code would still need explicit validity and separation lemmas.

Evidence and limits. The paper defines rules and then uses them in a running example and a binary-search-tree appendix; it gives no benchmark denominator or timing. The memory model assumes the specified type/layout rules hold. Inference: the approach requires a closed account of which pointer cells are in each block and does not by itself prove a C/Rust compiler's concrete layout.

## technique 2: derive memory scopes from data-retrieve functions

What it is. A DRF recursively retrieves an abstract value from concrete pointer-linked data. For each DRF `f`, derive an MSF `M(f)` that returns the set of memory units read while evaluating `f`. The paper defines memory-scope forms structurally (section 3, PDF pages 7–8):

- a variable has scope `∅`
- `f(e1,…,en)` has the union of operand scopes and `M(f)(e1,…,en)`
- functions on basic or abstract types (for example `+`, `<`, `∈`) and the symbols `&→n`, `&[]`, `&v`, and `nil` have empty scope
- dereference has `M(∗)(x) = x`
- a conditional has `M(e0) ∪ (e0 ? M(e1) : M(e2))`

The paper's exact construction rule is: “Given a DRF f defined as f (x1 , . . . , xn ) , e, the memory scope function M(f ) of f is defined as M(f )(x1 , . . . , xn ) = M(e)” (section 3, page 8).

How to apply it.
1. Define the DRF in LPF with conditionals whose guards are not recursively defined from that DRF (section 3).
2. Traverse its body and replace each dereference by the addressed pointer; union scopes through applications and conditionals according to the three clauses above (section 3).
3. Emit `M(f)` using the `SCOPE-FUNC` rule (section 3, page 8).
4. Check that the MSF is defined (not ⊥) at the concrete arguments, because Lemma 1 and Theorem 1 assume this (section 3).
5. Reuse the DRF value after a command only when the command does not overwrite a memory unit in `M(f)` at those arguments.

The paper proves this dependency property as Lemma 1 and Theorem 1. Its summary states: “When an abstract value is retrieved by applying f to a set of arguments, applying the MSF of f to same arguments results in a set of memory units accessed during the retrievement. As long as no memory unit in this set is modified during program executions, applying f to same arguments results in same abstract value” (section 9, PDF pages 20–21).

Verus form. Inference: Define a `spec fn` view for the abstract value and a companion `spec fn` footprint returning a set of addresses or node identities. A `proof fn` can establish a frame lemma: if a write address is outside the footprint and the write preserves validity, the view is unchanged. Verus's `requires`/`ensures` can express the pre/post relation; the footprint computation itself is ghost/spec code. Inference: exact set and pointer representations depend on the Verus API used, so the paper's LPF formulas do not carry over textually.

Evidence and limits. The proof of Lemma 1 (PDF pages 8–10) has three steps: induction on term length for terms with no function defined in `P` (base case: a variable or constant; induction cases: function application, `∗e1`, conditional), then induction on rank and length when no defined function is recursive, then the general recursive case through finite approximations `f0, f1, …` whose least upper bound is `f`. The theorem requires two structures to conform to the same definitions and to agree on every memory unit in the scope. Inference: a hidden alias, an undefined dereference, or a DRF whose guard violates the recursive-definition restriction invalidates the frame argument.

## technique 3: assignment rule that prevents aliasing from invalidating facts

What it is. Replace the ordinary assignment rule with `ASSIGN-ST`. For assignment `∗e1 := e2`, the precondition substitutes `e2` for an abstract variable `x`; the rule requires that the target is non-null, the target expression does not itself depend on the target cell, and the target is outside every top-level term's post-substitution scope. The rule is printed in section 6.2 (PDF page 14):

```
P, q[e2 /x] ⊢ e1 ≠ nil ∧ e1 ∉ M(e1 ) ∧ e2 : t
P, q[e2 /x] ⊢ e1 ∉ M(e)[e2 /x] for each top-level term e of q
ASSIGN-ST
P ⊢ q[e2 /x]{∗e1 := e2 }q[∗e1 /x]
```

How to apply it.
1. Choose the formula `q` whose abstract facts should survive the assignment (section 6.2).
2. Substitute the right-hand expression `e2` for the sole free variable `x` in `q` to form the precondition (section 6.2).
3. Prove `e1 ≠ nil`, `e1 ∉ M(e1)`, and that `e2` has the static target type (section 6.2).
4. For every top-level term `e` in `q`, prove `e1 ∉ M(e)[e2/x]` (section 6.2).
5. Conclude the postcondition by replacing `x` with the post-assignment dereference `∗e1` (section 6.2).

The paper's soundness argument (a brief proof, section 6.2) uses two structures `A` and `A′` for the states before and after the assignment; they differ only in the interpretations of `∗` and of the symbols defined in `P`, and `∗` changes only at the assigned cell. Lemma 1 and Theorem 1 then show that each top-level term of `q` keeps its value. The abstract describes the rule only as: “the proof rule of assignment statements in Hoare’s logic is modified to deal with pointers.”

Verus form. Inference: Express the assignment contract with `requires` proving the target is valid and outside the footprint, then `ensures` relating the post-state view to the old abstract value and the new cell. A Verus proof can use a snapshot/spec value in the precondition and a frame lemma after the write; no runtime `proof fn` is needed. Verus has no direct LPF substitution notation, so substitution is represented by explicit function arguments and contracts. Inference: mutable borrows may make some alias premises automatic for safe references, while raw pointers require explicit ghost state and validity proofs.

Evidence and limits. The rule is justified by the paper's state-based proof, not by an experimental success rate. It assumes `q` has one free variable, bounded variables differ from `x`, and conditional guards permit a memory-scope form (section 6.2). Inference: the paper's own rule therefore does not cover arbitrary formulas or all pointer expressions without preprocessing.

## technique 4: allocation rule and freshness properties

What it is. `ALLOC-ST` specifies `∗e = alloc(t)`. Allocation evaluates `e`, creates an unused block, stores its reference, and initializes pointer cells in the new block to `nil`. The postcondition adds `InHeap(∗e)`, `Unique(e)`, `PtrInit(∗e)`, and `∗e ≠ nil` (section 6.3, PDF page 15).

How to apply it.
1. Prove the allocation target is non-null and does not depend on a cell that allocation will change: `e ≠ nil ∧ e ∉ M(e)` (section 6.3).
2. Prove `e` is outside every top-level term's scope in the current formula `q` (section 6.3).
3. Apply the rule to obtain the postcondition containing freshness (`Unique`), heap separation (`InHeap`), pointer initialization (`PtrInit`), and non-nullness (section 6.3).
4. Use those predicates in later assignments and DRF frame proofs.

The paper defines `Unique(x)` as requiring that the block referred by the reference stored in `x` is disjoint from the blocks referred by the references stored in every other non-nil pointer cell `y`, `InHeap(p)` as disjointness from program-variable blocks, and `PtrInit(p)` as requiring pointer cells in the block to contain `nil` (section 6.3). It explains the soundness: “Because the allocated memory block is unused, it can not be accessed by any pointers stored somewhere before this memory allocation.”

Verus form. Inference: A Verus allocator wrapper can return a fresh node together with a ghost uniqueness fact and a postcondition that all pointer fields are null. A `proof fn` can establish disjointness from an abstract heap set; executable allocation remains ordinary Rust allocation. Inference: proving freshness for raw addresses requires a project-specific allocation model, because the paper's abstract blocks are not Rust allocator semantics.

Evidence and limits. The paper gives only an informal soundness argument for this rule (section 6.3: “Similarly to the soundness reasoning for the rule ASSIGN-ST, we can conclude that q still holds after the allocation statement if it holds before.”). The rule is used in the binary-search-tree insertion of Appendix A, not in the running example of section 7. There is no allocation benchmark or probability. Inference: reuse after deallocation, allocator reuse, and foreign allocators are outside the stated rule unless modeled as additional transitions.

## technique 5: verify virtual variables by pragmatic meanings

What it is. Treat a connected pointer structure as a “virtual variable” whose abstract value is a DRF result and whose shape is described by boolean DRFs. For a group of concrete writes, first prove the effect on the abstract value, then reason about the group as one abstract assignment. Section 8 recommends auxiliary DRFs that avoid modified cells and a relation between the main DRF, auxiliary DRFs, and modified fields.

The paper's example relation is: `P, isHBST(x), y ∈ NodeSet(x) ⊢ Map(x) = MapP(x, y)†{y → K 7→ y → D}` (section 8, PDF page 20). The text says: “Understanding and verifying the pragmatic meanings of small statement groups first, then we can verify code with larger size step by step.”

How to apply it.
1. Choose the main DRF for the abstract structure and boolean DRFs for structural invariants (section 8).
2. Define auxiliary DRFs whose scopes avoid the cells modified by the statement group (section 8).
3. Prove algebraic relations connecting the main and auxiliary DRFs to the fields being written (section 8).
4. Prove the auxiliary DRFs remain unchanged using the MSF frame property (section 8).
5. Derive the main DRF's new value and record the group as an abstract assignment (section 8).

Verus form. Inference: Package the structure's `view` and invariants in a proof-oriented type, then prove one lemma per small mutator sequence. Keep auxiliary views as ghost/spec functions and expose only the abstract postcondition to callers. Inference: this can reduce proof duplication in Verus, but the paper gives no Rust implementation or maintenance measurement.

Evidence and limits. The method is a heuristic section, not a quantified evaluation. It assumes useful auxiliary DRFs can be found and their relations proved. Inference: structures with difficult global invariants or writes that touch every reachable node may gain little from this decomposition.

## what is proved, trusted, and not established

The paper proves Lemma 1 and Theorem 1 (the memory-scope frame property), gives a brief soundness proof for `ASSIGN-ST` and an informal soundness argument for `ALLOC-ST`, and demonstrates a verified running example (section 7). Appendix A sketches the proof for binary-search-tree insertion, and Appendix B is, in the paper's words, “just a sketch, many details are omitted” for a simplified Schorr–Waite algorithm. It reports no number of verified programs, runtime, success percentage, or denominator. Trusted components are LPF semantics, the interpretation of memory symbols and layout rules, the DRF definitions, and the proof of each rule's premises. Inference: a Verus deployment adds trust in Verus translation, Z3, Rust compilation, and any external contracts; the paper's soundness does not cover those components.

Inference: VL should reuse the MSF/frame pattern for linked data structures and the virtual-variable abstraction. VL should avoid rebuilding a generic pointer logic without comparing proof effort and alias coverage against Verus's ownership-based reasoning. The paper's future-work list explicitly includes function calls, function pointers, classes/objects, and generics (section 9), so those features were not solved here.

## threat to agent-written verified Rust

Inference: The threat is moderate for agents generating verified linked-list, tree, and graph APIs: a finite footprint function plus frame lemmas can let generated code preserve abstract views across local writes. The threat is lower for open-world aliasing, unsafe pointer arithmetic, deallocation/reuse, and layouts supplied by foreign code, because Scope Logic assumes its abstract memory rules and requires premises the agent may fail to establish. Inference: an agent should expose the footprint and freshness facts in each API contract and refuse to claim a preserved view when the write target lies in the computed scope.

## techniques for the catalog

- typed pointer memory model — extend LPF with pointer, array, record, dereference, and layout symbols plus block rules
- memory-scope derivation — syntactically derive an MSF footprint from each recursive data-retrieve function
- alias-aware assignment rule — preserve formulas only when the write target is valid and outside all substituted memory scopes
- fresh-allocation rule — specify new blocks with uniqueness, heap separation, null pointer initialization, and non-nullness
- virtual-variable reasoning — verify small pointer-statement groups through auxiliary DRFs before treating them as abstract assignments

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Because the allocated memory block is unused, it can not be accessed by any pointers stored somewhere before this memory allocation."): I read the whole paper text (sections 1-9 and Appendices A and B) and the whole study, and compared every quotation, rule, definition, section reference and PDF page number (29-page PDF) with the paper. I changed: two misquoted sentences in technique 1, one misquoted sentence in technique 5, the abstract quote's capitalization, PDF page numbers throughout (several were off by 1 to 3 pages), the description of the empty-scope symbols, the description of the proof of Lemma 1, the description of the soundness argument for ASSIGN-ST, the wording of Unique, the claim that ALLOC-ST was used in the running example (it is in Appendix A), the claim that all rules and both appendices are proved (ALLOC-ST is informal, Appendices A and B are sketches), and one sentence about other Verus notes that the paper cannot support. I did not check: the Verus-form paragraphs and the threat assessment, which are marked Inference and are not claims of the paper; the correctness of the paper's proofs; the figures' formulas beyond those the study cites; the link from the paper text was used as is (arXiv:0912.4184v1).
