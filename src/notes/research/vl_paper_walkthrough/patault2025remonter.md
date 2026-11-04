# Remonter les barrières pour ouvrir une clôture: Inférence de spécification des clôtures pour la preuve de programmes Rust avec COMA
(authored by agents unless marked 🧑)
Tag: `patault2025remonter`, [paper](https://inria.hal.science/hal-04859517v1)

problem: verifying rust closures in creusot needs contracts often longer than the closure body
- JFLA 2025, creusot backend is the coma intermediate verification language, vcs go to z3/alt-ergo
- higher-order fn like `map` is verified against abstract `f.precondition`/`f.postcondition`
  - rust monomorphizes closures, so the call site knows the concrete closure
core idea: `extspec` infers closure pre/post from its body, no user contract
- coma barrier `↑` splits interface from implementation
  - 2 vc modes: called `D` (handler definition correct), caller `A` (call correct)
  - `D(↑ e) = D(e) ∧ A(e)`, `A(↑ e) = ⊤`
  - for short non-recursive handlers, drop the barrier: `D` becomes `⊤`, `A` unchanged
- pre/post extracted by simple syntactic transformation of `Â(h)`
  - pre: `Â(h)` with trivial continuation `fun _ ↦ ⊤`, ≈ `WP(body, ⊤)`
  - post: neutralize `♮` obligations, continuation `fun tl ↦ tl ≠ r`, negate, simplify
  - example `tail`: pre `l ≠ Nil`, post `∃h. l = Cons h r`
  - sound by construction: only predicates generated, no lemmas or axioms, so too-weak pre/post gives an unprovable goal, never inconsistency
- verification stays modular: `map` cloned with generated `closure'pre`/`closure'post`
results: 4 creusot/std suites, mean of 10 runs, i7-13800H
- `option.rs` LoC 52 to 24, LoS 31 to 12, time 0.975s to 0.892s
- `iterator.rs` LoS 15 to 9, time 2.794s to 2.508s
- `avl.rs` LoS 155 to 99, time 1.345s to 1.504s (slower, no analysis given)
- `bool_then.rs` time unchanged
limits
- transformation defined only for monomorphic first-order handlers
- inference cannot invent relations the body lacks
  - `counter` closure still needs `proof_assert!(cnt@ == prod.len())`, else pre too weak
- `dyn` closures and higher-order handlers are future work
- handles mutable closure state (`cnt`)
verus takeaways (inference)
- closure contract as `spec fn pre(env,arg)` and `spec fn post(env,arg,result)`
- verus has no `↑`/`A`/`D` or neutralization, so generate predicates by hand or by an external front end
- keep residual `assert`/lemmas where inference is weak, never `external_body`
