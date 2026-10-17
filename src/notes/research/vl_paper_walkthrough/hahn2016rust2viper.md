# Rust2Viper: Building a Static Verifier for Rust
(authored by agents unless marked 🧑)
Tag: `hahn2016rust2viper`, [paper](https://www.semanticscholar.org/paper/cd7109eba28fb08ccdbd2e5cbf2c9e69fd878255) (link from the fetch record; the paper text has no DOI or arXiv id)

## scope and result

Hahn's 2016 thesis builds Rust2Viper, a compiler plugin translating a supported Rust subset into Viper's Silver intermediate language. Silicon (symbolic execution) or Carbon (verification-condition generation) then checks functional specifications. Rust's ownership and borrow information is used to synthesize permission specifications, so users write functional contracts without manually writing most permission facts. The thesis's motivating list example uses `#[precond]`, `#[postcond]`, `#[pure_fn]`, recursion, and `old(...)` to specify behavior (paper §1.1, pp. 2–3).

The core contribution is explicit: “we presented rules to use information provided by Rust’s type system and borrow checker to generate permission-related specification automatically” (paper §7, p. 70). Inference: this is directly relevant to Verus because reducing ownership-proof boilerplate leaves agents more room to state and prove product properties.

## technique 1: translate ownership and types into permissions

What it is. Silver tracks fractional permissions to heap locations. Rust2Viper maps Rust structs to Silver objects, fields to locations, and each Rust type to a predicate bundling permissions for its fields. A predicate is unfolded to access fields and folded to restore the bundled capability (paper §3.2, pp. 16–20).

How to apply it (paper procedure).

1. Run the Rust compiler first, then traverse its high-level intermediate representation (HIR) in a compiler plugin; borrow information comes from a slightly modified borrow checker shipped with the tool (paper §5.1, pp. 64–65)
2. Emit a Silver field for each struct field (composite-typed fields become `Ref` fields); for enums add a domain with one `unique` function per variant plus a variant field (paper §3.2.1, pp. 16–17; §3.4, pp. 33–36)
3. Choose the permission amount with `perm`: `&mut T` or a mutable binding gives `write`; `&T` or an immutable binding gives some read permission (paper §3.1, p. 15)
4. Generate a predicate `valid__T` per type that packages the field permissions; before a field access `unfold` the predicates along the path `x0`, `x0.x1`, ..., and `fold` them in reverse order afterwards, once per unique sub-path (paper §3.2.1, pp. 17–19)
5. Translate a move in one of two ways: update the target to point at the moved object (used only when the target cannot be a function argument), or copy the fields (needed for a move into a mutable reference such as `*x = Bar { .. }`, because a Silver parameter cannot be reassigned). When a move changes mutability, `inhale` upgrades the moved instance to `write`. When a field is moved out of a struct, the struct's predicate is unfolded and not folded again (paper §3.2.2, pp. 19–20)
6. Add an extra permission parameter `rd` (with `none < rd < write`) to every method for read-only arguments, and pick `rd` with Silver's abstract read permissions (`fresh`/`constraining`) or a static fraction scheme (paper §3.2.3, p. 21; §3.3.4, pp. 31–33)
7. Verify the generated Silver with Silicon or Carbon (paper §2.1, p. 4)

Verus form. Inference: Verus's Rust ownership and borrow checker already provide the executable ownership discipline; use `requires`/`ensures` and proof functions for the functional facts that Rust2Viper encoded as Silver predicates. Inference: Silver's fractional permission syntax does not carry over directly, and a Verus proof should use only the constructs documented in the local Verus reference.

## technique 2: encode borrows with permission loss and magic wands

What it is. A borrow temporarily removes capabilities from the owner. For a field borrow, Rust2Viper unfolds the enclosing predicate, removes permissions while the borrow is alive, and restores them when the lifetime ends. The paper states: “Those permissions are regained when the lifetime of the borrow ends” (§3.3, p. 22).

The restoration mechanism is a magic wand. “The ‘borrowed-from’ structure can be explicitly encoded by a magic wand. Such a wand allows restoring the permissions removed temporarily by a borrow by giving up permissions to the borrowed content” (§3.3.1, p. 23). The thesis then limits where wands are actually emitted: for function-local borrows it uses `fold` statements instead, because Silicon and Carbon do not automatically track field updates made between packaging and applying a wand (§3.3.2, pp. 24–25).

How to apply it (paper procedure).

1. Identify borrower `x` and source `y` in a borrow `x = &y` (paper §3.3.2, p. 23)
2. Let `P_lhs` be the predicate instance describing the borrower's capability and `P_rhs` the source's top-level predicate (paper §3.3.2, p. 23)
3. The wand is `P_lhs -* P_rhs`; when a field was borrowed, the right side needs a `folding` expression for each predicate unfolded to reach the field (paper §3.3.2, p. 23; Listing 3.11, p. 24)
4. For a borrow of a field, keep the top-level predicate unfolded until the borrow expires. For a function-local borrow, restore it with `fold` statements and emit no wand. If a borrow is control-flow dependent, track with a boolean variable which borrows happened, so only unfolded predicates are folded (paper §3.3.2, pp. 23–27)
5. For a returned reference, the callee's postcondition carries the wand (for `borrow1`: `acc(valid__Bar(res), rd) --* acc(valid__Bar(r), rd)`), the caller gives up the borrowed arguments' permissions, and the caller applies the wand when the returned reference goes out of scope (paper §3.3.3, pp. 28–30). If a returned reference may be one of several arguments, the wand restores all of them (same section, p. 30)

Verus form. Inference: model the same lifetime relationship with Rust references and explicit `requires`/`ensures`; use a lemma to show that the owner regains the relevant invariant after the borrow-producing call. Inference: Verus does not use Silver's magic-wand operator as a source-level construct; the semantic idea (temporarily transfer access, then reestablish an invariant) remains useful.

## technique 3: loop handling with summarized restoration

What it is. Loops can create one borrow per iteration, so Rust2Viper creates and packages magic wands to restore permissions across iterations. The thesis says loops were “particularly challenging” (paper §3.5, p. 37). It summarizes the per-iteration wands instead of retaining an unbounded set.

How to apply it (paper procedure).

1. For every variable used in the loop, add a loop invariant with the predicate of its type: `write` if the variable is updated, read permission otherwise (paper §3.5, pp. 37–38). If a field was moved or borrowed before the loop, use the predicate of the remaining part instead (same section, pp. 38–39)
2. Detect variables whose borrow outlives the loop body (the borrow checker reports this for immutable borrows; for mutable traversal the thesis tracks aliases itself) (paper §3.5.2, pp. 42–43)
3. Per iteration the wand would be `P(tail_i) -* P(current_i)`, but these cannot be named in an invariant, so Rust2Viper summarizes the chain as the single wand `P(current) -* P(list)` and keeps it as a loop invariant. Each iteration applies the previous wand inside the `package` of the new one, using `applying` and `folding` (paper §3.5.2, pp. 40–41; Listing 3.29, p. 41)
4. After the loop apply `P(current) -* P(list)` to restore `P(list)` (paper §3.5.2, p. 41)
5. For a loop that traverses a structure mutably, assertions about the start of the structure go on the right side of the wand and the current element is read with `lhs(...)`; for immutable traversal the thesis uses `pre(...)` instead (paper §4.2.2, pp. 61–63)

Verus form. Inference: write an `invariant` clause describing the loop's data-structure invariant and ownership-relevant facts, then prove preservation each iteration. Do not write `invariant(...)` as a function call; it is a Verus annotation construct. Inference: the paper's wand summary is a conceptual guide for choosing the invariant, not a literal Verus encoding.

## technique 4: functional specifications over recursive data

Rust2Viper separates permission synthesis from user functional contracts. A function marked `#[pure_fn]` becomes a Silver function when its body translates to a single Silver expression, and can then be used in assertions (paper §3.7, pp. 45–47). The list example specifies length preservation and pointwise increment with `old(...)` (paper Listing 1.1, pp. 2–3). The user therefore states behavior, while the translator derives permissions from types and borrows. Contracts are strings in attributes (`#[precond]`, `#[postcond]`, `#[invariant]`, `static_assert!`) in a purpose-built assertion language with quantifiers, `old`, and a `matching` construct for enums (paper §4, pp. 54–57).

Verus form. Inference: define mathematical `spec fn` functions for observations such as list length and element lookup; use `ensures` to state length preservation and pointwise post-state behavior; prove recursive cases with lemmas. Inference: unlike executable Rust, a `spec fn` is specification-only and is not a run-time proof function.

## evidence, limits, and trust

The test suite contained about 100 cases, including Option-like types, recursive lists/trees, and examples from existing libraries (paper §6.1, p. 68). The supported subset included `if`, `loop`, `while`, `match`, structs, enums, arithmetic/Boolean expressions, field accesses, and calls; traits were unsupported and this was “an essential limitation” because traits are widespread (§6.1, p. 68). Complex loops with multiple references were also unsupported (same section). Type parameters, iterators and closures were also unsupported (§7.2.2, p. 71). Mutable-reference loop analysis handles only a single reference iterating one structure (§3.5.2, p. 43).

Table 6.1 reports five-run averages on Linux, Intel i5-4670S 3.10 GHz, 8 GB RAM. Rust2Viper-generated versus handwritten Silver times were: Silicon—cell 0.199 s vs 0.039 s (5.10×), counter 2.131 s vs 0.096 s (22.19×), list 0.693 s vs 0.222 s (3.12×); Carbon—cell 3.848 s vs 3.263 s (1.17×), counter 5.619 s vs 3.428 s (1.63×), list 5.992 s vs 4.922 s (1.20×) (paper Table 6.1, p. 69). The denominator is five consecutive runs per benchmark and backend. Generated code was slower in every case; the table does not measure proof effort or correctness coverage. “Speedup” in the table is handwritten over generated. The thesis attributes the gap to unfolding expressions and extra heap objects for integers (§6.2, p. 69). A separate comparison on 59 test cases found abstract read permissions faster than the static fraction scheme in 50 cases with Silicon but in only 24 with Carbon (Table 3.1, p. 33).

The thesis reports “about 20 new bugs in the existing tools” (§7, p. 70), but gives no denominator or bug taxonomy in the cited passage. Unsafe support was very limited: clients had to carry information required to verify unsafe blocks explicitly (§7.2.1, p. 71). The thesis states the assumption that generated contracts and ghost operations never cause verification errors, and treats such errors as Rust2Viper bugs (§5.3, p. 66). Inference: the trusted base includes the Rust compiler and its modified borrow checker, the Rust2Viper translation, Silver, Silicon/Carbon, and their solvers. I found no soundness theorem or proof for the translation in the paper.

Inference: VL should reuse the architecture lesson—derive ownership facts automatically and reserve human/agent annotations for functional properties—but should not assume trait-heavy production Rust is covered by this 2016 subset. Inference: the threat to agent-written verified Rust is high when translation support silently omits traits, complex loops, or unsafe assumptions; it is lower when the supported subset and generated verification conditions are checked explicitly.

## techniques for the catalog

- ownership-to-permission translation: derive heap permissions and predicates from Rust types, moves, and borrow information
- borrow restoration: remove capabilities during a borrow and restore them when its lifetime ends, with `fold` for function-local borrows and magic wands for returned references and loops
- loop wand summaries: summarize per-iteration borrow restoration in a finite loop invariant
- specification/permission separation: let users write functional contracts while the translator synthesizes permission facts
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In our encoding, we use magic wands to restore predicate instances after loops, because the wands follow nicely from our encoding of borrows."): I read the whole thesis text start to end and checked every quotation, page and section reference, the Table 6.1 numbers and the technique steps against it. I changed: the move step (two translation options, mutability upgrade with inhale), added the perm function and rd parameter steps; the borrow technique, because function-local borrows use fold and only returned references and loops use wands; the loop steps (type-based invariants, the P(current) -* P(list) summary wand, lhs and pre); the page of the borrowed-from quote (p. 23, not p. 22); added the 59-case Table 3.1 comparison, the unsupported features list, the paper's no-error assumption (§5.3), and rewrote the trusted-base sentence as an Inference. I did not check: the PDF figures, the reference list, or the Verus-form paragraphs, which are my own Inference and not paper claims; the tag line is unchanged and its Semantic Scholar link is from the fetch record because the paper text has no DOI or arXiv id.
