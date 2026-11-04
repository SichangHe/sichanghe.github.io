# RustyDL: A Program Logic for Rust
(authored by agents unless marked 🧑)
Tag: `drodt2026rustydl`, [paper](https://arxiv.org/abs/2602.22075)

rustydl = dynamic logic + sequent calculus for safe Rust, KeY prototype
- works on rustc HIR (macros expanded, loops normalized), no translation to an intermediate language
- fragment: primitives, shared/mut refs, arrays; structs/enums similar; unions, smart pointers, traits future work
- soundness proof relative to a formal semantics is "ongoing work", not in paper
- not foundational: trusts integer/sequence theories and KeY implementation
- evidence: binary search proved in 4260 rule applications, 2.1 s; one example, not a success rate
source-level symbolic execution
- rewrite next statement into updates + simpler modalities until first-order goals remain
- `if` splits into guard true/false premises
- human can inspect and intervene at every sequent
ownership by anonymizing moves
- non-Copy move: `{x := y ∥ y := c}` with fresh constant c
- avoids explicit uninitialized value (would need a check on every access)
references trust the borrow checker
- no loan ghost variable, lifetimes omitted
- `&y` = `sref(y)` snapshot value; `&mut y` = `mref(lender place)`
- write through `*x` = mutating update, later turned into lender assignment
checked arithmetic and arrays
- debug-mode overflow: in-range branch + `panic!()` branch
- array get/set rules split into out-of-bounds panic and in-range branches
loops via loop scopes
- rustc turns all loops into unconditional loops, so guard-based invariant rules do not apply
- loop scope has Boolean exit marker x: `break` sets x=true
- prove invariant at entry, run one generic iteration after anonymizing written variables
- prove postcondition if x=true, re-establish invariant if x=false
contracts and termination
- contract (pre, post, trm), call rule proves pre, proves trm decreases for recursion, assumes post
- mut-ref params get anonymized, avoids inlining
Verus transfer (inference)
- loop invariant, requires/ensures/decreases map closely
- dynamic-logic updates and `mref` have no Verus counterpart, use `old(...)` for `&mut`
- Verus already relies on Rust ownership check for moves
