# &inator: Correct, Precise C-to-Rust Interface Translation
(authored by agents unless marked 🧑)
Tag: `chen2026inator`, [paper](http://arxiv.org/abs/2604.17261v2)

## central method and boundaries
&inator chooses Rust interface types for a whole C program by translating it to an LLVM-like source language, generating SMT constraints, and solving them with Z3. The paper states: “&inator performs the following steps as shown in Fig. 3: (1) Convert the C program to &inator’s source language (§4). (2) Generate SMT constraints on the inferred Rust types that ensure type correctness, semantic equivalence, and precision (§6–§10). (3) Run an off-the-shelf SMT solver to solve the constraints, yielding correct, precise Rust types.” (Section 3.3, p. 6). Inference: this is interface synthesis, not proof that translated function bodies satisfy a Verus contract.

The paper also states: “The conversion inserts a drop of 𝑣 at the start of the immediate postdominator of the nearest common ancestor in the postdominator tree of all basic blocks where 𝑣 is live.” (Section 4, p. 8). The input is whole-program. The authors say: “&inator requires whole-program analysis to perform correct and precise interface translation” (Section 3.1, p. 6). It does not support multithreaded programs or libraries without a client test suite, and has partial or no support for function pointers, polymorphic pointers, unions, variadic functions, and ternary operators (Sections 3.1–3.2, p. 6). Dynamic `RefCell` borrow conflicts and possible `Rc` cycles can remain, and inferred interfaces may not admit a panic-free or leak-free implementation (Section 3.2, p. 6).

## technique: C/LLVM conversion and typed intermediate language
Use this when C source is to be translated incrementally and a precise intermediate representation is available. The compiler pass first applies LLVM `mem2reg`, then converts LLVM IR to a source language that is one-to-one with LLVM IR but adds precise source types, explicit drops, and type labels (Section 4, pp. 7–8; Section 11.1, p. 18). Its grammar includes `alloca`, loads, stores, pointer-field aliases, pointer arithmetic, calls, SSA phi, use, branches, returns, and drops (Figure 4, p. 7). Type labels identify each source fragment and non-nested rvalue so the solver can choose types independently (Section 4, p. 8).

The conversion inserts `drop(v)` at the immediate postdominator of the nearest common ancestor of all blocks where `v` is live; if that ancestor is the exit, the drop is inserted there (Section 4, p. 8). This makes C lifetime effects explicit for later copy/move and borrow constraints.

Verus form (Inference): use the translated ownership shape as a starting API design, then express semantic behavior with `requires` and `ensures` on executable functions and mathematical relations in `spec fn`. The C-to-IR conversion itself would be trusted preprocessing unless independently verified. A Verus proof cannot treat an SMT-synthesized type as evidence that the body preserves C behavior.

## technique: infer Rust type fragments
The solver assigns each source type label a fragment from `unknown`, primitives, structs with lifetimes, `ghost`, `Box`, `Rc`, `shared`, or `mut`, with `Cell` and slice qualifiers (Section 5, pp. 8–10; Figure 6). These map to concrete Rust forms such as `Box<T>`, `Rc<T>`, `&'a T`, `&'a mut T`, `Ref<T>`, `RefMut<T>`, and optional variants (Table 2, p. 9). The `ghost` fragment removes unnecessary pointer indirection by using the referent type itself. Pointer nullability is deliberately left to a later `Option` choice, so all pointer fragments may conservatively be wrapped in `Option` (Section 5, p. 9).

The running linked-list example chooses owned and borrowed fragments, `RcCell` for an interior-mutable recursive field, and lifetimes for references (Figure 7, p. 10). This provides a concrete pattern: infer pointer ownership first, then determine interior mutability, slices, and lifetimes from constraints.

## technique: type-consistency constraints
Generate constraints in four groups: type consistency, semantic preservation, borrow checking, and precision (Section 6, p. 10). Type-parity constraints require each primitive or struct fragment to match its Rust counterpart and each C pointer to map to an allowed Rust pointer fragment (Section 7.1, p. 11). Struct-consistency constraints require every lifetime used in a field to be declared by the struct (Section 7.2, p. 11).

For recursive structs, assign an integer rank and require a struct rank to exceed the rank of any directly contained struct. A recursive field without indirection creates `StructRank(Node) > StructRank(Node)`, which is unsatisfiable; `Rc` or another pointer indirection makes the struct finite (Section 7.3, p. 11). Array constraints add slice qualifiers when pointer arithmetic or indexed access proves array use; mutability and ownership constraints select `Cell`, `RefCell`, or mutable fragments when writes require them (Sections 7.4–7.9, pp. 11–13).

Inference: in Verus, these constraints correspond to Rust type checking plus proof obligations about shape and ownership. Verus's borrow checker handles ordinary Rust references, while proof invariants must separately state semantic properties of recursive data.

## technique: semantic-preservation constraints
C copies and moves differ from Rust. &inator therefore constrains pointer transformations so that a move cannot invalidate a live path, and nondestructive transformations preserve paths used later (Section 8, pp. 13–14). For a pointer-typed expression, the solver checks whether its source path remains valid unless the pointer dies. The paper's example requires a list variable that is used again to transform nondestructively into a shared reference (Section 8.2, p. 14).

Inference: for a Verus translation, these constraints identify where ownership changes must be reflected in `requires`, `ensures`, and ghost models of aliasing. They do not prove value-level equivalence unless the translated body is verified against a C semantic specification.

## technique: NLL-style lifetime, loan, and conflict constraints
&inator models Rust non-lexical lifetimes. A lifetime variable is a set of program points where a reference or struct containing it is live or aliased; loans are pairs `(lifetime,path)` (Section 9, pp. 14–15). It generates constraints for liveness, subtyping, reborrowing, function lifetime parameters, and call-site propagation (Section 9.1, pp. 15–16). In-scope loans are computed by data-flow: control-flow merges union the facts, while each instruction kills dead lifetimes and assigned paths and generates loans for borrows (Section 9.2, p. 16).

Borrow conflicts are rejected when an in-scope loan overlaps a mutable borrow, move, assignment, or drop. The paper distinguishes borrowing rvalues, moving rvalues, assignments requiring interior mutability, and variable drops that must not leave derived loans live (Section 9.3, pp. 16–18). For example, dropping an owning `n` while a loan derived from `*n` remains live forces the recursive field to be owning rather than borrowed (Section 9.3.4, p. 18).

Verus form (Inference): rely on Rust's borrow checker for these lifetime facts, then use Verus `tracked` permissions and proof lemmas for semantic resources that the compiler cannot see. Do not encode `modifies` as a Verus construct; state frame behavior through `ensures` and ghost state.

## technique: optimize for precise interfaces
After correctness constraints, &inator minimizes, in descending priority, the number of `Cell` qualifiers, cumulative pointer-transformation cost, run-time cost, and array qualifiers (Section 10, pp. 18–19). The cost ordering makes `Rc` more expensive than `Box`, `ghost`, `mut`, and `shared`, and favors the least-permissive type when several satisfy correctness. This often removes redundant indirection while retaining required interior mutability.

Inference: VL could use a similar lexicographic objective to select simpler verified APIs, but the objective is a design preference, not a functional proof.

## evidence and limits
The authors manually validated correctness and precision for six non-scalability programs: the 41-line running example, ulidgen, leftpad, amp, nandc, and rbtree. Every one received a correct and precise interface by their manual assessment (Table 3, p. 20). Three larger scalability programs were not manually checked: carrays (618 C lines, 1,799 source instructions), jccc (1,394 lines, 1,983 instructions), and tisp (3,656 lines, 2,908 instructions) (Table 3, p. 20). Z3 solving times range from 0.6 s for the running example to 1,100 s for rbtree, 17,000 s for jccc, and 25,000 s for tisp; each timing is the average of five runs on dedicated Xeon Platinum 8268 sockets with LLVM 17.0.6 and Z3 4.13.3 (Sections 11.2–11.3, pp. 19–20, Table 3).

The constraints, solver, LLVM conversion, C source assumptions, and manual translation judgments remain trusted. Unsupported C features and whole-program dependence limit deployment. Inference: the product threat to agent-written verified Rust is moderate and indirect. &inator can reduce unsafe C-to-Rust interface ambiguity, but it does not establish Verus specifications, solver proofs, or correctness of external libraries.

## what VL should not redo
The paper already provides constraint families for type parity, recursive layout, arrays, mutability, ownership, copy/move semantics, non-destructive pointer transformations, NLL lifetimes, in-scope loans, borrowing conflicts, and precision optimization, plus six manually validated benchmarks. New VL work should test how these inferred interfaces compose with Verus contracts and whether proof obligations expose the paper's remaining dynamic-borrow and leak risks.

## techniques for the catalog
- LLVM-to-source conversion — lower whole-program C to a typed IR with explicit drops, pointer paths, and labels
- Rust fragment inference — choose ownership, borrowing, mutability, lifetime, slice, and interior-mutation fragments with SMT
- type consistency constraints — enforce parity, finite recursive layout, arrays, mutability, ownership, and external-function rules
- semantic preservation constraints — prevent C-to-Rust copy, move, and pointer transformations from invalidating live paths
- NLL loan analysis — solve lifetimes, subtyping, reborrowing, in-scope loans, and conflict conditions by data flow
- precision optimization — minimize cell qualifiers and pointer/runtime costs after satisfying correctness
Checked 2026-10-15 against paper chen2026inator: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
