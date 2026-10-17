# Remonter les barrières pour ouvrir une clôture: Inférence de spécification des clôtures pour la preuve de programmes Rust avec COMA
(authored by agents unless marked 🧑)
Tag: `patault2025remonter`, [paper](https://inria.hal.science/hal-04859517v1)

Page numbers below count the abstract-and-introduction page as p.1 (the PDF has an extra HAL cover page before it; PDF page = p. + 1). The paper has no printed page numbers. The paper is a JFLA 2025 article of 9 pages plus references.

## problem and result

Patault, Golfouse, and Denis remove a recurring burden in deductive verification of Rust closures: a short closure often needs a longer, redundant contract. The abstract says closures must be "accompagnées de spécifications souvent plus longues que leur corps" (abstract, p.1). They use the Coma intermediate verification language as Creusot's backend and extend Coma "avec la capacité de réifier les préconditions et postconditions des définitions comme symboles indépendants" (§1, p.2), so that a closure's precondition and postcondition can be generated from its body and used by modular callers. The abstract states, “Dans ce travail, nous présentons un mécanisme d’inférence de spécification des clôtures pour la vérification formelle de programmes Rust.” (abstract, p.1)

Creusot translates each Rust function into an independent Coma module, generates verification conditions (VCs), and sends them to Z3 or Alt-Ergo (§2, p.2). A higher-order function such as `map` is verified against abstract `f.precondition` and `f.postcondition`; at a call, Creusot knows the concrete closure (Rust monomorphizes closures) and instantiates those predicates (§2, pp.2–3). The proposed `extspec` annotation derives these predicates without a user-written closure contract, keeping modular verification of `map` and `iter_add` while the Rust source stays short (§2, p.3; §4, p.8).

## technique: Coma abstraction barriers and dual VC modes

What it is: Coma marks an abstraction boundary with the opaque barrier `↑`. The paper defines two VC modes: called mode `D` "détermine la correction d’une définition de handler", and caller mode `A` "détermine la correction d’un appel à un handler" (§3, p.4). The barrier rules are `D(↑ e) ≜ D(e) ∧ A(e)` and `A(↑ e) ≜ ⊤` (§3, p.4). Assertion rules: `D({φ} e) ≜ φ → D(e)` and `A({φ} e) ≜ φ ∧ A(e)` (§3, p.5). In the paper's words, the barrier "sépare explicitement le code faisant partie de l’interface et le code tenant purement de l’implémentation" (§3, p.5). So assertions before the barrier become obligations at the call site (mode `A`), and code under the barrier is proved once, for all parameter values, in mode `D` (§3, pp.4–5).

When to use it: the paper's `tail` example puts the body under `↑`. It then observes that `D̂(tail)` is trivial because "la spécification répète précisément ce que calcule le programme", a problem that "apparait souvent sur des fonctions courtes, en particulier lorsque l’on doit donner une spécification à une clôture" (§3, p.5). For such a handler, Coma lets one "omettre complètement l’ajout d’une barrière dans un handler non récursif" (§3, p.5). The barrier-free `tail` is operationally equivalent but expands its VC into the caller's contract; `Â(tail)` is unchanged and `D̂(tail)` becomes `⊤` (§3, p.6). Inference: keep a barrier for recursive or reusable handlers whose body should stay hidden from callers; the paper only demonstrates the barrier-free case on short non-recursive handlers.

How to apply it:
1. Translate a Rust function or closure into a Coma handler with explicit continuation parameters (§2–§3, pp.2–4)
2. Put interface assertions before `↑` and implementation under it (§3, pp.4–5)
3. Compute caller predicate `Â(h) = λ(x : τ)⋆. λ(g : ⌈π⌉)⋆. A(h_body)`: a lambda over term parameters and continuation predicates (§3, p.5)
4. Compute called predicate `D̂(h) = ∀(x : τ)⋆. ∀(g : ⌈π⌉)⋆. D(h_body)`: universal over the same parameters (§3, p.5)
5. Total correctness is the conjunction of `A` and `D`; with a barrier, callers see only the `A` side (§3, pp.4–5)

Verus form: Inference: model the closure contract as a `spec fn` over captured environment and argument, and prove a wrapper's `requires`/`ensures` against that predicate. Verus has no Coma `↑`, `A`, or `D` modes; use a verified function boundary for modularity and separate proof lemmas for implementation facts. Keep closure captures in an explicit struct or function argument when Verus cannot reason about a closure trait object.

Evidence and limits: the formal transformation `Â`/`D̂` is defined only for monomorphic, first-order handlers, meaning handlers whose continuation parameters have no continuation parameters (§3, p.5, with footnote 3). Footnote 3 gives the reason: "Ces deux contraintes sont nécessaires pour que la transformation du type des continuations en prédicats WhyML soit possible." The paper refers to Paskevich et al. [PPF25] for Coma's full formal semantics and VC calculus (§3, p.3). The authors explicitly state, “Ce mécanisme d’extraction se généralise naturellement aux handlers ayant plusieurs continuations.” (§3, p.6) They list "l’inférence de spécification pour des handlers d’ordre supérieur dans Coma" and "les clôtures dyn dans Creusot" as future work (§6, p.9).

## technique: extract preconditions and postconditions syntactically

What it is: from the caller-mode predicate `Â(h)`, "des prédicats correspondants aux pré- et postconditions peuvent être calculés par une simple transformation syntaxique" (§3, p.6). The precondition is `Â(h)` applied to the arguments with the trivial continuation `fun _ ↦ ⊤`. The postcondition applies a neutralization `♮` whose effect is "retirer les obligations de preuves propres à la formule à laquelle elle est appliquée", then passes a continuation VC `fun tl ↦ tl ≠ r`, negates the whole formula, and simplifies (§3, p.6). For `tail`, the extracted predicates are `tail'pre(l) = l ≠ Nil` and `tail'post(l,r) = ∃h. l = Cons h r` (§3, p.6). The paper says the precondition corresponds "moralement" to a weakest-precondition computation `WP(h_body, ⊤)`, and the postcondition to a strongest-postcondition computation `SP(h_body, WP(h_body, ⊤))` (§3, p.6).

How to apply it:
1. Generate `Â(h)` by applying caller mode to the handler (§3, p.5)
2. Precondition: `λℓ. Â(h) ℓ (fun _ ↦ ⊤)`, then simplify (§3, p.6)
3. Apply neutralization `♮` to `Â(h)` to remove proof obligations, keeping the continuation call (§3, p.6)
4. Postcondition: negate `Â♮(h) ℓ (fun tl ↦ tl ≠ r)`; the negation turns the implication into a conjunction and the continuation equality instantiates the existential quantifier (§3, p.6)
5. The results are named predicates `h'pre` and `h'post` (§3, p.6; `tail'pre`, `tail'post`)
6. Put `[@coma:extspec]` on the handler definition to activate the generation (§3, p.6; §4, p.8)

Verus form: Inference: write a `spec fn closure_pre(env,arg) -> bool` and `spec fn closure_post(env,arg,result) -> bool`, then prove the closure body with `requires closure_pre(...)` and `ensures closure_post(...)`. Verus's `old(...)` can relate pre-state captures in postconditions, but it does not implement Coma's neutralization transform; the generated predicates must be stated by hand or generated by an external front end. The paper does not discuss Verus.

Evidence: for `tail`, the derivation ends at `∃h. l = Cons h r` after a final step marked `≈` (§3, p.6). Inference: this says the result is the tail of a nonempty input. The authors note that generation “ne peut pas introduire d’incohérence logique, mais seulement mener à un but non prouvable.” (§3, p.7) Their reason: "seuls des prédicats sont générés et non des lemmes ou des axiomes qui introduiraient des informations en contexte." (§3, p.7) Inference: so extraction cannot add an unsupported theorem, but a predicate that is too weak can leave a caller's obligation unprovable.

## technique: preserve modular higher-order verification without closure annotations

What it is: in the Coma translation, remove the barrier and assertions of the closure handler (§4, p.7, "lignes 13 à 15"), annotate the handler with `[@coma:extspec]`, and define `precondition` and `postcondition` as `closure'pre f x` and `closure'post f x result` (§4, p.8). Creusot still clones `map` into the `Iter_Add` module with `f'pre`/`f'post` instantiated by those predicates, which "correspond à la monomorphisation de la fonction en Rust, et permet comme promis une vérification modulaire" (§4, p.7). The paper says `iter_add` "tenant initialement sur 5 lignes peut se réduire à la simple ligne `map(i, |x: i32| x + y).sum()` et reste autant vérifié", and that the result is one Coma module instead of two (§4, p.8). The paper states that the generated VCs for `precondition` and `postcondition` "sont alors équivalentes à la version explicite" (§4, p.8).

How to apply it:
1. Keep the generic higher-order function (`map`) specified against abstract closure predicates (§2, p.3, Figure 1)
2. Remove the `requires`/`ensures` attributes from the concrete closure (§1, p.2; §4, p.8)
3. Translate the closure as a Coma handler without barrier, annotated `[@coma:extspec]` (§4, p.8)
4. Alias the generated `closure'pre` and `closure'post` to `precondition` and `postcondition` in the specialized module (§4, p.8)
5. Clone `map` with those predicates and verify `iter_add`; `map` stays verified independently (§4, pp.7–8)

Verus form: Inference: a Verus implementation can expose a generic function contract over a closure-like trait only if the supported Rust subset permits that trait and its captured state. Otherwise, create a verified function object with explicit `spec fn` contract fields. The proof remains modular if the generic function requires the closure precondition for every input and ensures the closure postcondition for every output.

Evidence and limits: §5 (p.8) takes programs "extraits de la suite de tests de Creusot et de la bibliothèque standard de Rust", compares lines of specification with and without `extspec`, and times verification on an Intel Core i7-13800H "jusqu’à 5,2GHz, 14 cœurs et 32 Go de RAM". Line counts come after `rustfmt`. Times come from `hyperfine` and Why3's `replay` command (§5, p.8), and are the mean of 10 runs (Table 1 caption, p.8). Columns are LoC (lines of code), LoS (lines of specification and assertions), number of functions to verify, mean time in seconds, and standard deviation in seconds. The four suites are a `bool::then` program, tests of the `Option` API, a use of `map`, and balanced binary search trees (§5, p.8).

| program | LoC | LoS | # functions | time (s) | std dev (s) |
|---|---|---|---|---|---|
| bool_then.rs | 24 | 10 | 1 | 0.835 | 0.022 |
| bool_then.rs+extspec | 18 | 8 | 1 | 0.837 | 0.016 |
| option.rs | 52 | 31 | 11 | 0.975 | 0.032 |
| option.rs+extspec | 24 | 12 | 1 | 0.892 | 0.020 |
| iterator.rs | 42 | 15 | 9 | 2.794 | 0.043 |
| iterator.rs+extspec | 24 | 9 | 4 | 2.508 | 0.025 |
| avl.rs | 105 | 155 | 6 | 1.345 | 0.030 |
| avl.rs+extspec | 101 | 99 | 4 | 1.504 | 0.071 |

The paper's comment on the table: for the search trees, "les fonctions rotate_left et rotate_right auraient une spécification très longue, répétant en grande partie leur définition" without inference (§5, p.9). Inference: time falls for `option.rs` and `iterator.rs`, is unchanged within one standard deviation for `bool_then.rs`, and rises for `avl.rs` (1.345 to 1.504 s); the paper gives no analysis of these timing differences and the tables do not report per-run data.

## technique: retain explicit assertions where inference is too weak

What it is: extraction does not remove every assertion. The paper says "iterator.rs+extspec contient encore deux assertions, en raison de deux fonctions distinctes" (§5, p.9). In the first, "la spécification manuelle est nécessaire pour guider les prouveurs afin qu’ils puissent déduire l’égalité entre deux séquences", and the same specification is present without inference. In the second, from the function `counter`, the closure given to `map_inv` contains `proof_assert!(cnt@ == prod.len());`. `map_inv` is `map` with an extra parameter `prod`, "la séquence des éléments déjà parcourus" (§5, p.9). The paper says this assertion "lie les valeurs de cnt et la longueur de la séquence prod, ce qui est nécessaire pour prouver la postcondition de la fonction. Sans cette assertion, l’inférence extspec produirait une précondition trop faible." (§5, p.9)

How to apply it (Inference: the paper shows this by one example, not as a procedure):
1. Run extraction and inspect the VCs that still fail
2. Add a local assertion that states the missing relation, such as `cnt@ == prod.len()` in `counter` (§5, p.9)
3. Re-run the caller proof; drop the assertion if it is not needed
4. Treat the assertion as proof help inside the closure body, while the generated predicates remain the closure interface

Verus form: Inference: use `assert(cnt@ == prod.len())` or a dedicated `lemma` at the corresponding loop/closure point, with a `requires` clause that justifies the relation. Do not mark the closure `external_body`; that would erase the implementation evidence.

Evidence and limits: the abstract says the design "est capable de gérer l’état mutable interne d’une clôture" (abstract, p.1); `counter` mutates `cnt` inside the closure (§5, p.9). The evaluation has four program suites (§5, p.8), and §6 lists `dyn` closures as future work (p.9). Inference: extraction from the body alone cannot supply a relation that the body does not state, such as the link between `cnt` and the iterator's history; the paper shows this for one case only.

## what is proved, trusted, and relevant to VL

Paper claims: "Nous avons mis au point une méthode permettant de vérifier des programmes utilisant des clôtures dont nous omettons la spécification, et nous l’avons vérifiée expérimentalement." (§6, p.9) Measured: line counts and ten-run verification times on four suites (Table 1). The paper's soundness remark is only that generation adds predicates, not lemmas or axioms (§3, p.7). Related work: Prusti also verifies Rust closures that capture their environment, but has "pas de mécanisme d’inférence de spécification" and closures must be annotated; bi-abduction infers properties of imperative programs, mainly in separation logic, while Coma, being first order, allows "un mécanisme moins complexe" (§6, p.9).

Inference: the trusted base is Creusot's Rust-to-Coma translation, Coma VC generation, Why3, Z3/Alt-Ergo, Rust semantics, and the benchmark specifications; the paper does not list a trusted base. The paper contains no proof of the inference implementation in a foundational calculus (formal Coma definitions are in [PPF25]) and does not mention Verus.

Inference: the risk to agent-generated verified Rust is moderate. Closure-heavy generated code can be shorter and easier to maintain if contracts are inferred, but an inferred predicate can be too weak and still requires targeted assertions. The direct transfer to Verus is limited because Verus lacks Coma's extraction backend; VL would need a front-end transformation or explicit contract generation. VL should not redo these four benchmarks; it should reuse the distinction between modular closure interfaces, inferred predicates, and residual assertions, and measure both annotation reduction and proof time with run counts and standard deviations.

## techniques for the catalog

- closure specification extraction: derive preconditions and postconditions from a closure body through Coma VC formulas
- abstraction barriers: separate caller-facing contracts from implementation obligations with `A` and `D` modes
- modular higher-order verification: monomorphize generic functions against generated closure predicates
- residual proof assertions: add targeted assertions when inference yields a weak predicate
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Ce problème apparait souvent sur des fonctions courtes, en particulier lorsque l’on doit donner une spécification à une clôture."): I read the whole paper text (abstract through references) and the whole study, and checked every quotation, the Table 1 numbers and hardware, the Coma rules and extraction steps, and the section and page references. I changed the page references (the old ones were mostly off by one or two pages; they now count the abstract page as p.1), reworded the barrier and extraction descriptions to match §3 exactly, marked the paper-absent procedure and trust-base statements as Inference, added the "# functions" column and the table, corrected the claim about the weak precondition, and replaced the link by the HAL page printed in the paper. I did not check the Verus-side claims (`old(...)`, trait limits) against Verus documentation, the cited works [PPF25], [DJ23] and the Zenodo artifact, or the benchmark numbers by rerunning anything.
