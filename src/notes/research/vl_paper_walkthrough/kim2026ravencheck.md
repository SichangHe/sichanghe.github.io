# Ravencheck: Effectively-Propositional Reasoning for Rust
(authored by agents unless marked 🧑)
Tag: `kim2026ravencheck`, [paper](https://doi.org/10.1145/3814987.3814991)

## purpose and design

Ravencheck targets a specific failure mode of SMT-based verification: expressive quantified logic can make proof outcomes unpredictable. Its design keeps a useful fragment of higher-order specifications while encoding verification conditions into Extended Effectively Propositional (EEPR) first-order logic. The paper's claim is exact: “Ravencheck allows Rust code composed of higher-order functions and algebraic data types to be verified against quantified specifications — also written in Rust – while guaranteeing that the verification conditions remain within the Extended Effectively Propositional (EEPR) fragment of first-order logic.” (Section 1, p. 9.)

The tool has one Rust source containing executable definitions, specifications, and axioms. A verification projection contains functions marked for verification, specifications, and axioms; an execution projection retains executable code and removes verification-only constructs. The red verification code is lowered to a Call-By-Push-Value (CBPV) intermediate representation, partially evaluated, relationally abstracted, and sent to Z3 or CVC5. The green execution code goes through the normal Rust toolchain (Figure 2, p. 10). This is a single-language workflow, not a separate model that must be synchronized manually.

Inference: A Verus user can borrow the architectural separation, but Ravencheck's EEPR guarantee and attributes are not Verus features. Verus uses Rust-like executable/specification/proof code and automated solvers, yet its supported logic and proof stability differ. Treat this paper as a design alternative and a source of techniques, not as evidence that Verus queries are decidable.

## technique 1: functional interface over mutable implementation

Use Rust ownership to present an in-place update as a pure functional specification. In the paper's `HashSet` example, `insert` mutates a set and returns it. Ownership prevents the old reference from being used after the call, so the verifier may reason as if the old and new sets were distinct values. The authors write: “Rust’s ownership type system prevents s1 from being used in the continuation of the call to insert, letting us soundly pretend that s1 and s2 are distinct sets and insert is a pure function.” (Section 1, p. 9.)

Inference: to apply this pattern in another setting (these steps are our reading of the example, not a procedure the paper states):

1. Keep the runtime function's unique mutable argument and in-place update.
2. Expose a specification-level function whose result is a fresh abstract state.
3. Ensure ownership prevents aliases from observing the old state after the call.
4. State axioms or postconditions relating reads from the abstract result to the update.

The example uses `Heap = Vec<Val>`, uninterpreted `get` and `set`, and an `ax_heap` axiom: reading the updated position returns the new value, while another position returns its old value (Figure 3, p. 10). The `swap` function is defined from `get` and `set`, and `swap_commute` verifies observational equality at every index `k` when the two index pairs are disjoint (Figures 5–6, p. 11).

Inference: In Verus, model mutable containers with a ghost/spec sequence or map and prove that the executable update preserves the abstraction relation. Ownership can justify the abstraction only where the API really prevents old aliases. A contract marked `external_body` would enlarge the trusted base; it is not a substitute for this relation proof.

## technique 2: declare, define, assume, and verify in one Rust module

Use Ravencheck's attributes to control the verification projection. `#[ravencheck::module]` causes a generated test module to invoke the engine during `cargo test`. `#[declare]` introduces an uninterpreted type or function to the solver; its executable body may mutate but its specification interface must be pure. `#[assume]` adds axioms, including explicit universal or existential quantifiers. `#[define]` marks interpreted helper functions whose bodies are inlined. `#[verify]` marks a property to prove (Section 2.1, pp. 10–11).

Axiom discipline is essential. The paper assumes all heap vectors are long enough for pointer indices, and marks `get` total. The authors also say that `set` and `add` "must be partial, because their inputs and outputs share the same types" (Section 2.3, p. 12), while `#[total]` can force the solver to treat a function like `get` as total. Inference: these are proof assumptions, not runtime checks. Higher-order function inputs cannot be quantified by `forall`/`exists` terms, so in the `filter` example `f`, `s1` and `s2` are universally quantified at the top level in the attribute `#[assume(filter(f, s1) => s2)]`, and the body is the quantified relation `member(e,s2) == (member(e,s1) && f(e))` (Figure 7, p. 11).

Inference: Verus's corresponding constructs are executable functions, `spec fn`, `requires`, `ensures`, loop `invariant`, and proof functions or lemmas. The exact Ravencheck attributes do not carry over. The product risk is the same: an `assume`-style axiom can make a proof pass while leaving an unproved implementation boundary.

## technique 3: recursive functions with inductive annotations

Mark a recursive definition and separately state an inductive property. Ravencheck encodes recursive functions as uninterpreted functions, then checks annotations against the body by induction. In the Peano example, `add` is marked `#[recursive]`; `factor_s_right` is annotated with `#[forall_inductive(a: Nat, b: Nat)]` and asserts `S(add(a,b)) == add(a,S(b))` (Figures 8–9, p. 11). The paper says the unrolling of `add` on terms of the form `Z` and `S(...)`, together with the inductive hypothesis, is sufficient for the solver to discharge the obligation (Section 2.2, pp. 11-12).

The paper notes that `factor_s_right` in Figure 9 would not type-check in rustc, because `Nat::S` is applied directly to a `Nat` rather than a `Box<Nat>`, but propositions marked `#[annotate]` are not passed to the compiler. Ravencheck also does not distinguish `Box<T>` from `T` and treats calls to `Box::new` and `clone` as identity operations (Section 2.2, p. 12). Inference: this lets a proof term use a simpler shape than executable Rust, which marks a boundary between the verification and execution projections.

Inference: In Verus, write recursive `spec fn` definitions and prove properties with `proof fn` lemmas, using induction and `decreases` where required. Keep executable recursive functions separately specified if they run at runtime. Do not call a proof function as runtime code.

## technique 4: manual quantifier instantiation for relational abstraction

Relational abstraction replaces problematic function symbols with relations to remain in EEPR, but it is incomplete. Under the paper's partial-function semantics, the solver may falsify a condition by assuming that `#[declare]` functions are undefined for inputs that do not appear within the condition itself, so an axiom instance containing a term that may be undefined "short-circuits to true" and constrains nothing (Section 2.3, p. 12). The paper says: “To address this, the user can add trivial statements like let _ = add(S(b),a); to the verification condition, which forces the solver to recognize that add(S(b), a) is defined.” (Section 2.3, p. 12.)

Inference: apply the repair when a valid property is rejected (these steps are our reading of Section 2.3 and Figure 10, not a procedure the paper states; Figure 10 also adds `let _ = Nat::S(add(b,a));`):

1. Identify the function application whose defining axiom or relation is not being instantiated.
2. Add a dead `let` binding for that exact application.
3. Re-run verification; the application is now present and its relation constrains the solver.

The paper calls this quantifier instantiation, says many problems can be solved without it, and says it was "only required for a small fraction of benchmarks in one of the three case studies conducted in [17]", where [17] is a separate OOPSLA 2026 paper by Lewchenko et al., not this one (Section 2.3, p. 12). The claim has no count or denominator, so it should not be reported as a rate.

## technique 5: CBPV, partial evaluation, and relational abstraction

Ravencheck's encoding pipeline has three phases (Section 3, p. 12). First, lower the Rust AST to a CBPV-based IR, rejecting unsupported logical syntax such as mutation statements and method calls. Second, partially evaluate the IR: inline `#[define]` functions and nested `let` bindings into A-normal form, leaving calls only on variables and constants. Third, replace each uninterpreted function call by an implication that quantifies the function's output and assumes it is related to the input by an uninterpreted relation symbol; the paper motivates this by sort cycles, since `get` and `set` have an argument type equal to the return type. Figure 13 shows `R_set(h,x,v)` and `R_get(h0,x)` relations replacing `set` and `get` calls (Section 3, pp. 12–13).

The abstracted formulas are checked by off-the-shelf SMT solvers (Section 1, p. 9), and the execution projection is compiled by the standard Rust toolchain. Inference: this lets the solver reason about a pure formula while the runtime program remains imperative.

## technique 6: verify heap algorithms as pure state transitions

The linked-list reversal case study models a heap as a boxed pointer array and defines `set_next` as a declared function whose runtime body mutates one cell. The `Heap` type is a unique `Box` reference to a heap-allocated array; the paper says Rust's borrow-checker ensures the old heap reference is not reused and that the Rust compiler will inline the `set_next` call. The specification uses a `reach(x,y,h)` relation and `for_root` to quantify a terminal root only for acyclic inputs (Figure 14, p. 13).

Because the Rust compiler rarely performs automatic tail-call optimization, the developer does not define `reverse` recursively but defines the loop components `init`, `cond`, `step`, and `finish`. Ravencheck assembles them into a recursive function used for verification and its tail-call optimization (a loop) passed to the Rust toolchain. The paper states: “This allows the verified code to achieve runtime performance indistinguishable from unsafe imperative code.” (Section 4, p. 13.) That is a qualitative claim for the case study, with no measured timing denominator.

## techniques for the catalog

- ownership-backed functional abstraction: use unique ownership to expose in-place mutation as a pure state transition
- projection attributes: separate executable code from declarations, axioms, definitions, and verification properties in one Rust module
- inductive recursive specifications: encode recursive functions and verify annotated equations by induction
- manual quantifier instantiation: add a dead binding for a missing function application to trigger a relational axiom
- EEPR encoding pipeline: lower to CBPV, partially evaluate, then replace function symbols with relations
- pure heap state machine: verify recursive heap behavior while compiling an equivalent tail-call-optimized loop
