# Recursive Data Structures in SPARK
(authored by agents unless marked 🧑)
Tag: `dross2020recursive`, [paper](https://doi.org/10.1007/978-3-030-53291-8_11)

## scope and result

Dross and Kanig extend SPARK, the deductive-verification subset and tool for Ada, with heap pointers while retaining an ownership discipline that prevents aliasing. The paper's target is pointer-based recursive structures such as linked lists and trees, especially loops whose iterator would otherwise take ownership of the structure through a move (Section 3, p. 182). The SPARK tool generates verification conditions with Why3's weakest-precondition calculus (Section 1, p. 179), and the extension avoids a memory model by encoding the connection between a borrower and the borrowed structure as a predicate (Abstract, p. 178; Section 4, p. 183).

The paper states: “This extension is based on an ownership policy inspired by Rust to enforce non-aliasing through a move semantics of assignment.” (Abstract, p. 178). It also states: “To avoid introducing a memory model and to stay in the first-order logic background of SPARK, the relation between the iterator and the underlying structure is encoded as a predicate which is maintained throughout the program control flow.” (Abstract, p. 178). Inference: the contribution is a combination of language restrictions, a local borrowing mechanism, a symbolic borrow relation, and optional pledges that expose facts about that relation to loop invariants.

## technique: ownership-preserving pointer model

What it is. SPARK supports only pool-specific (heap) access types, excluding general access types that could designate stack or global data. An assignment of an object containing a pointer is a move: the target gains ownership and the source loses it. The ownership rules "enforce a single writer/multiple readers policy" (Section 2, p. 180). The verification model treats an access value as a "maybe, or option" type (null or a value) plus an address used for pointer comparison, and a dereference generates a verification condition that the pointer is not null. Because of the ownership policy, "it is possible to reason about the program almost as if the pointer was replaced by the data it points to" (Section 2, p. 180), since effects of shared substructures "cannot be observed because of the ownership rules" (Section 2, p. 181).

The paper's example is:

```ada
Y : Int_Acc := X;   -- Ownership of the data designated by X is moved to Y
Y.all := Y.all + 1; -- The data can be read and modified through Y
Z := X.all;         -- Illegal: Reading or modifying X.all is not allowed
```

How to apply it. Declare an access type for a heap object, allocate through `new`, and transfer a pointer by assignment only when the source will no longer be used. Prove each dereference's non-null condition. Treat a transfer as consuming the source's ownership and giving it to the target. For a recursive list, declare an incomplete cell type, an access type to it, and then a record containing a `Next` field of that access type (Sections 2–3, pp. 179–181).

Evidence. The paper says: “The ownership system makes sure that the designated data is not accessed again through the source of the assignment.” (Section 2, p. 180). On all six examples, the authors showed that Ada runtime checks pass and that no uninitialized value is read, and they manually supplied functional properties (Section 6, p. 186). This is evidence for the implemented subset and examples, not a claim that arbitrary Ada pointer code is supported.

Verus form. Inference: represent the executable recursive node with ordinary Rust ownership, and state functional properties with `requires`, `ensures`, `invariant`, and `spec fn` constructs supported by Verus. A move of an owned `Box` or owned node invalidates the source, so the source-use error is checked by Rust's type system before Verus proves functional facts. A non-null dereference is represented by an owned value or a precondition; a nullable representation needs an explicit option case. The SPARK paper's Ada `Pledge` function and Ada access syntax do not carry over as Verus syntax. Do not model this with `modifies`, a `lemma` keyword, or a proof function called at run time; those are not Verus constructs in the local Verus reference.

## technique: local borrowing and reborrowing

What it is. A local borrower, declared with an anonymous access type, is initialized with a reference to a part of an existing structure. During the borrower's scope, the borrowed part is frozen: reading or modifying it directly is illegal. When the borrower goes out of scope, ownership returns automatically. SPARK restricts the borrower's initial value "to be the name of a part of an existing object", which lets the tool statically determine aliasing and "forbids for example borrowing one of two structures depending on a condition" (Section 4, p. 182).

The paper's example (Section 4, p. 182):

```ada
X := ...;                     -- X is initialized to the list {1,2,3,4}
declare
  Y : access List_Cell := X;  -- Y has an anonymous access type.
  -- Ownership of X is transferred to Y for the duration of its lifetime.
begin
  Y.Data := Y.Data + 1;       -- Y can be used to read or modify X
  pragma Assert (X.Data = 2); -- Illegal, during the lifetime of Y, X
                              -- cannot be read or modified directly
end;
pragma Assert (X.Data = 2);   -- Afterwards, the ownership returns to X
```

A reborrow changes the part of the object the borrower designates. The paper states: “In SPARK, the value assigned to the borrower in a reborrow should be rooted at the borrower. This means that reborrows only go deeper into the structure.” (Section 4, p. 183). Its example:

```ada
declare
  Y : access List_Cell := X;   --   Y is X
begin
  Y := Y.Next;                 --   This is a reborrow, Y is now X.Next
end;
```

How to apply it. Start a borrower scope from an existing owner; perform reads or updates through the borrower; optionally reborrow to a deeper `Next`; do not access the frozen owner in the scope; let scope exit restore ownership. This permits `Set_All_To_Zero` to walk a list with a loop: while `Y ≠ null`, set `Y.Data := 0`, then reborrow `Y := Y.Next` (Section 4, p. 183). The limit: “More complex traversals, involving stacks for example, cannot be written iteratively in SPARK.” (Section 4, p. 183).

Evidence. The six examples in Figure 1 are set all to zero, linear search, pointer-based maps, route shift, binary search, and red black trees. Their total lines of code range from 57 to 611; the red black trees example has 37 subprograms, 920 checks, 258 seconds with the default strategy, 152 seconds replaying proofs, and 16 seconds as the maximum time for a single verification condition (Figure 1, p. 186). Inference: the paper does not report which of these examples use borrowing, so these numbers are evidence for the extension as a whole, not for borrowing specifically.

Verus form. Inference: use a mutable borrow `&mut` for the temporary exclusive traversal and let Rust's borrow checker enforce that the owner is inaccessible during the borrow. For a list represented by `Box<Node>`, a loop can carry `&mut Node` and reassign it to a mutable reference to `next` while preserving the enclosing ownership. Add a loop `invariant` describing the processed prefix and remaining suffix; use `ensures` for the final list property. Verus has no counterpart to SPARK's anonymous access type or pledge marker, so the relationship between the original list and cursor must be expressed as an invariant over the data representation.

## technique: symbolic borrow relation

What it is. Through reborrows, a borrower can modify the structure "at an arbitrarily-deep position, which may not be statically-known" (Section 4, p. 183). When a borrower is declared, SPARK creates two objects: the borrower, treated as a stand-alone structure, and a predicate called the borrow relation. The paper defines it as encoding “the most precise relation between the borrower and the borrowed object which does not depend on the actual value designated by the borrower” (Section 4, p. 183). The tool computes it from the borrower's definition and updates it at each reborrow; modifications of the underlying structure do not change it (Section 4, p. 183).

The paper's worked relation starts as `new_x ≠ null ∧ new_x = new_y`; after `Y := Y.Next.Next` it records that the first two cells are non-null with data 1 and 2, and that `new_x.next.next = new_y` (Section 4, p. 184). The paper states: “At the end of the borrow, the borrowed object is reconstructed using both the borrow relation and the current value of the borrower.” (Section 4, pp. 183–184).

How to apply it. Define the owner-to-cursor relation as a predicate over the owner and cursor. Initialize it when opening a borrower; update it on every reborrow; leave it unchanged when only the designated data is mutated; use it to reconstruct the owner after the borrow. In a loop, the relation changes each iteration, so it must be described in the loop invariant (Section 5, p. 184).

Verus form. Inference: encode the relation as a `spec fn` over the list's mathematical sequence (or a ghost sequence) and the cursor index, then preserve it with a loop `invariant`. A mutable borrow does not itself provide a mathematical path fact, so the invariant must state the processed-prefix/remaining-suffix relationship explicitly. If the implementation uses recursive `Box` nodes, a ghost sequence or recursive view function is needed to connect heap nodes to that relation; this is an adaptation, not a claim made by the SPARK paper.

## technique: pledges for loop invariants

What it is. Following Prusti (Astrauskas et al.), a pledge is "an assertion associated with a borrower which is guaranteed to hold at the time when the borrow expires, no matter what may happen in between" (Section 5, p. 184). In SPARK a pledge must follow from the borrow relation. Because Ada has no pledge syntax, SPARK uses a ghost pledge function per access type with two parameters, the borrower and the assertion; “Note that a call to a pledge function isn’t really a call for the SPARK analyzer. It is simply a marker that the expression in argument is a pledge.” (Section 5, p. 184). SPARK then attempts to show the property is implied by the borrow relation rather than by the borrower's current value (Section 5, p. 185).

The paper's declaration (Section 5, p. 184):

```ada
function Pledge
  (L : access constant Cell; -- The borrower to which the pledge applies
   P : Boolean)              -- The property we want to assert in the pledge
     return Boolean
is (P) -- For execution, the function evaluates the property
with Ghost,
  Annotate ⇒ (GNATprove, Pledge); -- Identifies a pledge function for SPARK
```

After `Y := Y.Next.Next`, the paper marks `Pledge (Y, Y = X.Next.Next)` and `Pledge (Y, X.Data = 1 and X.Next.Data = 2)` as true, and `Pledge (Y, X.Next.Next.Data = 3)` as false, “though this is true at the current program point, as it is not guaranteed to hold at the end of the borrow” (Section 5, p. 185). Inference: this distinction keeps a loop invariant from relying on a fact that later borrower mutations can break.

How to apply it. In `Set_All_To_Zero`, the paper introduces a ghost variable `C` counting iterations, maintained by a first ordinary invariant `C = Length (Y)'Loop_Entry - Length (Y)`. Two pledge invariants follow: `Length (X) = Length (Y) + C`, and for every index `I` of `X`, `Nth (X, I) = (if I ≤ C then 0 else Nth (Y, I - C))`. The body sets `Y.Data := 0`, reborrows `Y := Y.Next`, and increments `C` (Section 5, p. 185). The paper notes “in general, it is not necessary to write a pledge to verify a program using a local borrower” because the tool tracks the borrow relation through successive reborrows; “Pledges need only be provided when the borrow relation itself cannot be tracked by the tool, for example because of a loop, like in our example.” (Section 5, p. 185).

Verus form. Inference: write the two end-of-borrow facts as ordinary `invariant` clauses that remain true across each loop iteration and as `ensures` at function exit. A Verus `spec fn` can define the sequence relation; a `proof fn` or `assert` can establish intermediate arithmetic facts, but it must execute only in erased proof code. There is no direct Verus equivalent of SPARK's pledge annotation, so the invariant must carry the guarantee explicitly.

## evidence, assumptions, and boundaries

The authors could not use pre-existing benchmarks “since SPARK codebases do not have pointers, and Ada codebases usually violate some SPARK rules”, so they mostly wrote new tests; the public SPARK testsuite “contains more than 150 tests mentioning access types, be they supported cases or not” (Section 6, p. 186). They wrote six examples, “none of them very big” (Section 6, p. 186). Figure 1 reports subprogram counts, total, specification and ghost lines, checks, and analysis times. The authors found the annotation effort to describe the borrow relations “though non-negligible, was acceptable” and state that “it uses the standard SPARK expressions, with no mentions of memory separation or permission” (Section 6, pp. 186–187).

The ownership policy excludes structures with cycles (e.g. doubly linked lists) or shared substructures (e.g. DAGs) (Section 3, p. 181). Borrower initialization must be the name of a part of an existing object (Section 4, p. 182), and traversals involving stacks cannot be written iteratively (Section 4, p. 183). The authors also report that limitations "mostly come from the ownership policy of SPARK" and that some data structures require switching to full Ada or changing the algorithm (Section 6, p. 186). Future work: function pointers for callbacks, pointers to constants with a more permissive ownership policy, and local borrowing of stack-allocated objects (Section 8, p. 188). Inference: the trusted base includes SPARK's legality checks, the Why3 weakest-precondition translation, the SMT solvers, and the Ada execution environment; the examples prove runtime checks, absence of uninitialized reads, and supplied functional properties, not the correctness of those tools or of unstated requirements.

## techniques for the catalog

- ownership move model — transfer pointer ownership on assignment and reject source access so SMT reasoning can ignore unobservable aliases
- local borrowing and reborrowing — lend a statically rooted region for a scope and move the cursor only deeper to iterate recursive structures
- borrow relation — maintain a predicate connecting owner and cursor so arbitrary-depth reborrows can reconstruct the owner
- pledges — expose end-of-borrow properties as ghost annotations that loop invariants may safely use
