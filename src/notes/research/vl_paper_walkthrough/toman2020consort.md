# ConSORT: Context- and Flow-Sensitive Ownership Refinement Types for Imperative Programs
(authored by agents unless marked 🧑)
Tag: `toman2020consort`, [paper](https://arxiv.org/abs/2002.07770)
## scope and prior notes

ConSORT (Toman, Ren, Suenaga, Igarashi, and Kobayashi, 2020) is a type system for safety verification of imperative programs with mutable references, aliasing, and evolving invariants. A prior walkthrough in the notes studies *Borrowable Fractional Ownership Types for Verification*, which builds on ConSORT together with RustHorn lifetimes. This study supplies the base ConSORT mechanisms that the prior walkthrough assumes: fractional ownership, strong updates, alias annotations, context-polymorphic function summaries, and the inference pipeline.

The paper's central problem is that mutation changes a cell's invariant while aliases may still refer to it. Allocation-site alias summaries lose precision: updating one object can require weakening every object allocated at that site. ConSORT instead tracks permission on each program reference. A reference with ownership 1 is the unique writable view; aliases with ownership 0 may exist but carry only the trivial value refinement. This makes a destructive update local and sound.

## technique 1: fractional ownership for sound strong updates

What it is. A reference type is `τ ref r`, where `r` is a rational ownership in `[0,1]`. Ownership 1 permits reading and writing. Ownership 0 permits reading but allows a mutable alias elsewhere, so its refinement must be `⊤`. A fraction strictly between 0 and 1 permits read-only sharing while excluding mutable aliases. Ownership is flow-sensitive: the type of a pointer can change after each binding, assignment, alias assertion, or function call.

The authors state the motivation precisely: “Fractional ownership types provide flow-sensitive and precise aliasing information for reference variables.” (Abstract, p. 1.) They also state the safety mechanism: “ConSORT ensures that only the trivial refinement ⊤ is used in reference types with ownership 0, i.e., mutably-aliased references.” (Section 1, p. 3.)

When to use it. Use this technique when a program mutates through a pointer while other names may alias the same cell, and when each object can have a different invariant. It is especially useful for data structures with per-object state, in-place updates, or repeated allocation at one syntactic site.

How to apply it in ConSORT.

1. Give a fresh cell ownership 1. `mkref y` receives `τ ref 1`, where `τ` describes the initial value (Section 3.2, Fig. 7)
2. Split ownership when creating an alias. Choose `τ1` and `τ2` such that the old type is `τ1 + τ2`; the two aliases receive the parts (Section 3.2, pp. 11–12)
3. Keep ownership 1 on the reference used for mutation. The assignment rule requires the left-hand reference to have ownership 1 (Section 3.2, p. 13)
4. Permit only `⊤` refinements on any ownership-0 alias. This makes a later write compatible with every such alias (the ownership well-formedness condition, Section 3.1, p. 10)
5. Strongly update the writable reference's refinement after assignment. In Example 3, writing 4 changes `y : {ν : int | ν = 5} ref 1` to `y : {ν : int | ν = 4} ref 1` (Section 3.2, pp. 13–14)
6. Reject a call that would duplicate full ownership. The paper says that replacing a call in Figure 2 with `loop(b,b)` makes the program ill-typed: "there is no way to divide b's ownership of 1 to into two ownerships of 1" (Section 1, p. 3)

The ownership arithmetic is linear. The paper says: “Ownerships behave linearly; they cannot be duplicated, only split when aliases are created.” (Section 1, p. 3.) The invariant is what permits a strong update without rewriting every alias's refinement: all aliases of a writable reference have ownership 0 and therefore contain no stale value claim.

Verus form (inference). Represent an owned mutable resource with a ghost permission predicate or token parameterized by the object identity and its mathematical state. A mutating proof function should require the full token and return the updated token; a shared read predicate can carry a fractional share but must not authorize mutation. Use Rust's ownership and borrowing for ordinary references, and expose split/merge lemmas for custom shared containers. This is an encoding in a Verus library, not a direct `ref r` type: the paper's rational permission arithmetic is not a Verus surface construct in the referenced Verus notes.

Evidence and limits. The formal soundness theorem states that a well-typed program cannot reach `AssertFail` (Section 3.4, Theorem 1, p. 17). The appendix's machine-state consistency relation Cons requires the summed ownership of every heap address to be at most 1 (Appendix A, Fig. 12, p. 33), and the preservation proof shows each transition keeps it so (Appendix C, pp. 50–58). The model requires ownership-0 nested references to have maximal (`⊤`) shape, rejects refinements that mention memory locations, and cannot express conditional or context-sensitive ownership (Section 3.1, p. 10; Section 4.3, p. 21). These restrictions reject some safe programs.

## technique 2: refinement splitting, destructive assignment, and must-alias shuffling

What it is. Integer refinements are predicates such as `{ν : int | ν = 5}`. The partial addition operator combines two views of one value: integer refinements are conjoined, and reference ownerships are added recursively. On alias creation, ConSORT distributes both permission and logical information. On assignment, it replaces the pointee refinement while preserving the reference shape. Explicit `alias(x = y)` and `alias(x = *y)` assertions let the checker redistribute permission and refinements after the program has established that two references are equal.

When to use it. Use ordinary splitting for `let x = y` and dereference bindings. Use assignment for a shape-preserving destructive update. Use an alias assertion when two live names must alternately hold the writable fraction or when a write has made the old type information stale and the names need to be resynchronized.

How to apply it.

1. For `let x = y`, select `τ1 + τ2` equal to `Γ(y)` and type the continuation with `y:τ1` and `x:τ2`, adding value equalities where the operands are integers (Section 3.2, Fig. 7)
2. For `let x = mkref y`, split `y` and give the new pointer ownership 1 (Section 3.2, Fig. 7)
3. For `let x = *y`, split the pointee type. If `y` has ownership 0, the remaining pointee type must be a maximal type; if the ownership is positive, the remaining pointee type is additionally strengthened with the equality between the contents and `x` (Section 3.2, Fig. 7 and p. 12)
4. For `y := x`, split `x`, require `y : τ' ref 1`, replace the pointee refinement with the assigned value's type, and require equal reference shape (Section 3.2, Fig. 8)
5. For `alias(x = y)`, trust the programmer's must-alias claim (the semantics checks it only at run time, rule R-AliasFail), choose new types whose sum is equivalent (`≈`) to the old two types, and continue with those new types (Section 3.2, Fig. 8 and p. 14; Section 2.2, p. 7)
6. For `alias(x = *y)`, apply the same redistribution to `x` and the pointer reached through `y` (Section 3.2, Fig. 8)

Example 4 demonstrates the intended pattern. After `y := 4`, `x` has only `⊤` and `y` owns the cell. `alias(x = y)` can then split ownership and give both names `{ν : int | ν = 4} ref 0.5`. Example 5 repeats this shuffle to alternate writes through `x` and `y` and finally establish `*x = 2` (Section 3.2, pp. 13–15).

Verus form (inference). Encode a mutable cell's abstract state in a ghost predicate indexed by an object identifier. A write lemma consumes a full permission predicate and establishes the new state predicate. An alias-shuffle lemma may split a share and prove that two handles denote one object, but its precondition must include a proved identity relation; an unchecked alias assertion would be an assumption outside the proof. State transitions should use `requires` and `ensures` on proof or executable functions as appropriate, while specification functions remain non-executable. The exact fraction and alias API must be designed for the container; ConSORT's typing judgments do not transfer as Rust syntax.

Evidence and limits. The type addition rules preserve the total ownership and combine refinements by conjunction; the paper says "the type addition operation cannot create or destroy ownership and refinement information, only combine or divide it between types" (Section 3.2, p. 12). Runtime semantics treat a false alias annotation as `AliasFail`; Theorem 1 explicitly permits a well-typed program to halt in `AliasFail` (Section 2.2, p. 7; Section 3.4, p. 17). Thus assertion safety is proved only under the alias annotations' truth. ConSORT also rejects refinements that refer to references, so it cannot generally express equality between two cell contents (Section 3.1, p. 10; Section 4.3, p. 21).

## technique 3: context-sensitive function summaries

What it is. A function type is universally quantified over a context variable and contains argument types, post-call argument types, and a return type. Refinements can query prefixes of the call-string context. The same function therefore has different logical summaries at different call sites without duplicating its body. A call substitutes the call label and caller context into the callee type; the function body is checked once under the abstract context variable.

When to use it. Use context queries when one function is called with arguments carrying different invariants, or when behavior depends on a bounded call history. This avoids weakly joining unrelated call sites and is useful for recursive wrappers and helper functions that read a pointer and return its refined value.

How to apply it.

1. Label every call site uniquely (Section 2.1, p. 5)
2. Add a context variable `λ` to the function type and write predicates such as `ℓ1 ⪯ λ ⇒ ν = 3` (Section 3.1, pp. 9–10)
3. Give the function output and return types the same context-dependent predicates as needed. Example 6 types `get` with a return refinement that is 3 at `ℓ1` and 5 at `ℓ2` (Section 3.3, p. 16)
4. At a call `f^ℓ`, substitute `ℓ : L` for `λ`, and substitute actual names for formal names (the `T-Call` rule, Fig. 10, p. 15)
5. For nested calls, prepend labels. Example 7 uses `ℓ3 ℓ1` and `ℓ3 ℓ2` to propagate two-call context (Section 3.3, pp. 16–17)
6. Check the body under the universally quantified context variable and instantiate the summary at each call (the `T-FunDef` and `T-Call` rules, Fig. 10)

The paper describes the purpose as follows: “ConSORT is also context-sensitive, and can use different summaries of function behavior at different points in the program.” (Section 1, p. 4.) Remark 1 says the scheme "corresponds to the standard CFA approach [50] without a priori call-string limiting" and that "The important feature of our type system is the inclusion of predicates over contexts, not the specific choice for these predicates" (Section 3.1, p. 10).

Verus form (inference). Give a helper function a contract whose postcondition is conditional on a ghost call-site or mode value, or expose separate lemmas for distinct abstract contexts. Pass the context value explicitly when a proof needs it; use `requires`/`ensures` to connect the value to the returned refinement. This is a modeling pattern for Verus contracts, not automatic context polymorphism: the verifier will not infer arbitrary call-string predicates from ordinary Rust calls without such ghost state and lemmas.

Evidence and limits. Function bodies are typed once under the quantified context variable, and Theorem 1 covers programs typed this way (Section 3.3, p. 16; Section 3.4, p. 17). The implementation bounds context-prefix length `k` a priori and encodes prefix queries with integer context variables (Section 4.1, pp. 18–19). The paper says ConSORT does not support context-sensitive ownership, so conditional mutation and aliasing remain imprecise (Section 4.3, p. 21).

## technique 4: fully automated constraint inference

What it is. The prototype first infers simple shapes (`int` or nested `ref`) and creates a refinement relation and ownership variable for every live variable at every program point. It then walks the program and emits ownership constraints, subtyping implications between refinement relations, and assertion constraints. Ownership well-formedness adds implications forcing a pointee refinement to `⊤` when its ownership is zero.

How to apply it.

1. Infer simple types and create templates `JτS Kx,n,p`, with fresh relation symbols for integer refinements and fresh ownership variables for references (Section 4.1, pp. 17–18)
2. Emit ownership well-formedness constraints: for a template `{ν : int | φ} ref r` the constraint `r = 0 ⟹ φ`, and for a nested template `(τ ref r') ref r` the constraint `r = 0 ⟹ r' = 0` (Section 4.1, p. 18)
3. Walk each expression and emit ownership constraints from the typing rules; the paper calls them "simple linear (in)equalities over ownership variables and constants", for example `r = 1` for the target of `x := y` (Section 4.1, p. 18)
4. Emit CHC subtyping constraints linking relation symbols across program points and assertion constraints `JΓpK ⇒ φ` for each assertion (Section 4.1, p. 18)
5. Encode bounded context prefixes with `k` integer context variables and shift them at calls (Section 4.1, pp. 18–19)
6. Solve ownership constraints with Z3, maximizing nonzero ownership variables; substitute the result into the CHCs (Section 4.1, p. 19)
7. Solve CHCs with Spacer, HoICE, or Eldarica, optionally in parallel and accepting the first result (Section 4.1, p. 19)

Verus form (inference). The analogous workflow is to let Verus/Z3 discharge arithmetic and invariant obligations after a developer supplies executable contracts, loop invariants, and helper lemmas. A tool could synthesize candidate predicates or ghost permissions outside Verus, then check the generated Rust proof with Verus. The paper's relation-symbol and CHC inference is not a Verus construct and should not be represented as executable proof code.

Evidence and limits. The authors report that ownership and subtyping constraints are polynomial in program size under assumptions about simple types, and says the ownership constraints "are non-linear but Z3 appears particularly well-engineered to quickly find solutions for the instances generated by ConSORT" (Section 4.1, p. 19). It also reports that "different solvers are better tuned to different problems" (p. 19). The prototype supports three CHC backends; different solvers perform better on different problems. Inference is incomplete because safe programs can be rejected, and the logic only needs a sound, potentially incomplete decision procedure (Section 4.3, pp. 20–21).

## technique 5: recursive types and arrays

What it is. The implementation extends the core calculus with restricted recursive reference types, dependent tuples, nulls, and integer arrays. Recursive types are unfolded once before ownership variables are assigned; repeated unfoldings copy ownership variables. Arrays carry ownership, a length refinement, and an indexed contents refinement; reads and writes instantiate the symbolic index with the concrete index.

When to use it. Use recursive types for unbounded linked structures such as sorted lists, and arrays for per-index integer invariants such as writing `i` at index `i`. Pointer arrays are excluded because index-wise ownership inference is substantially harder.

How to apply it. Infer the simple recursive shape, insert fold/unfold annotations, restrict recursive refinements to the allowed shape, and let the inference pass instantiate indexed predicates at each access (Section 4.2, pp. 19–20). For arrays, assign one ownership to the whole allocation and refine length and contents separately; do not assume the implementation supports arrays of pointers (Section 4.2, p. 20).

Verus form (inference). Encode a recursive data structure with a ghost mathematical sequence or set and prove fold/unfold lemmas connecting it to the Rust representation. For arrays, use a sequence model and loop invariants relating each index to its value; ownership of a slice or backing allocation must be supplied by the chosen Verus API. These are design inferences, not claims that ConSORT's inference algorithm exists in Verus.

Evidence and limits. The benchmark includes `Array-List`, `Sorted-List`, `Mut-List`, and `Array-Inv` (Section 5, pp. 21–22). The implementation does not detect null dereferences and makes its soundness guarantees modulo null-dereference freedom; pointer arrays are future work (Section 4.2, p. 20).

## evidence, trust, and product implications

Proved. Theorem 1 states: “If ⊢ ⟨D, e⟩, then ⟨∅, ∅, ·, e⟩ ̸−→∗D AssertFail.” (Section 3.4, p. 17.) The appendix proves progress and preservation through machine-state consistency, ownership accounting, type equivalence, and type-addition lemmas. The theorem also permits divergence, `AliasFail`, or a final value, so it does not prove termination or the truth of alias annotations.

Measured. The JayHorn-derived set contains 32 adapted safe and 26 adapted unsafe programs. ConSORT correctly classified 29/32 safe programs, timed out on 3/32, and classified 26/26 unsafe programs within 60 seconds. On the custom suite, it verified all 6/6 safe programs and rejected all 6/6 unsafe variants within 60 seconds. The hardware was 16 GB RAM and four 2 GHz Intel i5 CPUs; the run used Z3 4.8.4, HoICE 1.8.1, Eldarica 2.0.1, parallel backend, and a 60-second timeout (Section 5, pp. 21–23, Table 2). The 6/6 counts are my count of the six safe and six unsafe rows of Table 2. JayHorn (version 0.7) is reported with 24 correct, 5 timed out and 3 in the Imp. column on the 32 safe programs, and 19 correct and 7 in the Imp. column (Unknown) on the 26 unsafe ones; on the custom suite it timed out on every test except Shuffle and Shuffle-BUG (Table 2, p. 22; Section 5.1, p. 23). The comparison is not a matched runtime experiment: the authors "do not give a performance comparison with JayHorn given the many differences in target languages" and collected no runtime for the JayHorn suite (Section 5, p. 22). The paper calls these "preliminary experiments" (Section 5, p. 21).

Trusted or assumed. The chosen refinement logic and its decision procedures, the implementation that emits constraints, the solver results, the semantics of primitive operations supplied with sound types, and the truth of `alias` annotations remain outside the theorem's computational core. Null dereference freedom is assumed for the stated guarantees. Inference: the theorem proves the formal language's assertion safety, not the correctness of a translation from arbitrary Rust or C++.

Threat to a product of agent-written verified Rust (inference): medium. Native Rust borrowing prevents many ordinary alias errors, reducing the direct need for ConSORT. The residual risk is custom unsafe or interior-mutable code: an agent may assert pointer identity, forget to invalidate a stale ghost state, or encode a permission transfer whose precondition is only assumed. Product defenses should require proved alias predicates, explicit state-transition contracts, and negative tests for stale aliases. This risk judgment is an inference from the paper's trusted alias annotations, null-dereference assumption, and incomplete inference, not a result reported by the authors.

## techniques for the catalog

- fractional ownership strong updates — assign a writable ownership-1 view and force all mutable aliases to ownership 0 with `⊤` refinements
- refinement and permission splitting — use type addition to divide ownership and conjoin or discard value refinements across aliases
- destructive assignment — require ownership 1 and replace a pointee refinement while preserving reference shape
- must-alias shuffling — redistribute permissions and refinements after a proved alias assertion
- context-polymorphic summaries — specialize one function contract by bounded call-string predicates
- ownership and CHC inference — generate templates and constraints, solve ownership with Z3, then solve refinement CHCs
- recursive and indexed structures — infer restricted recursive types and per-index array refinements
- preservation soundness — prove assertion safety through progress, preservation, and machine-state ownership accounting
