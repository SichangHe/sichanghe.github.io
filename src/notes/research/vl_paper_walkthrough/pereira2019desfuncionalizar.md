# Desfuncionalizar para Provar
(authored by agents unless marked 🧑)
Tag: `pereira2019desfuncionalizar`, [paper](http://arxiv.org/abs/1905.08368v1)

## scope and result

This Portuguese paper studies defunctionalization as a way to verify higher-order programs with an existing first-order deductive verifier. Its abstract says: “Este artigo explora a ideia de utilizar a desfuncionalização como uma técnica de prova de programas de ordem superior.” Defunctionalization replaces function values with a first-order algebraic representation, then supplies an `apply` dispatcher. The motivation is explicit: “O seu interesse é portanto poder utilizar posteriormente uma ferramenta de prova de programas existente, sem ser necessário estender esta ferramenta com suporte para ordem superior.” The paper manually transforms and verifies three examples in Why3: a CPS tree-height function, a stateful distinct-elements traversal, and a small-step arithmetic interpreter.

The method requires knowing all functions that can occur as first-class values. The introduction states that limitation: “é necessário conhecer à priori todas as funções que serão utilizadas como valores de primeira classe.” The paper therefore presents a useful closed-world method for CPS-style programs rather than a universal treatment of dynamic higher-order code.

## technique 1: defunctionalize closures into a datatype and apply

what it is. For every function abstraction, create a constructor whose fields capture its free variables. Replace a function-typed argument by this algebraic datatype. Replace each function application by `apply`, which pattern-matches on the constructor and executes the corresponding body.

how to do it, using the tree-height example (Sections 2 and 3.1).

1. Start with the CPS program. `height_tree_cps` receives a continuation `k : int -> 'b`; the example uses three abstractions: the identity, a continuation after the left subtree, and a continuation after the right subtree.
2. Define a datatype with one constructor per abstraction: `Kid`, `Kleft (tree * 'a)`, and `Kright (kont * int)`. Store exactly the free variables used by each closure. The paper explains that “Os seus argumentos capturam as variáveis livres utilizadas em cada uma das duas funções.”
3. Change the CPS function's continuation type to `kont`. Construct `Kleft (r,k)` when descending into the left subtree and `Kright (k,hl)` after receiving the left height.
4. Define `apply (k,arg)` by cases. `Kid` returns `arg`; `Kleft` resumes the right subtree with `Kright`; `Kright` computes `1 + max hl hr` and applies the saved continuation.
5. Translate the logical contracts along with the program. The new `apply` contract is the postcondition represented by its datatype argument. Build a recursive `post` predicate that copies each closure's postcondition into the matching constructor branch.
6. Submit the first-order program and translated contracts to Why3. For this example, “todas as obrigações de prova geradas são automaticamente provadas por demonstradores SMT.”

Verus form. Inference: use an `enum` for the closure datatype and an executable or ghost dispatcher that matches on it; keep the captured data as fields. State the dispatcher contract with `requires` and `ensures`, and prove each match arm separately. Inference: if the dispatcher is proof-only, a `proof fn` can establish the postcondition and will be erased; if it executes, its Rust match must remain executable. Inference: Verus does not provide Why3's higher-order function values directly, so this representation is a practical way to make the proof first-order while preserving the original control flow.

## technique 2: translate effectful higher-order contracts with explicit state

The distinct-elements example traverses a tree, inserts values into a mutable set, and returns its cardinality. The paper extends function specifications with pre-state and post-state arguments: `pre f : τ1 -> state -> prop` and `post f : τ1 -> state -> state -> τ2 -> prop`. It defines `set_of_tree` as the logical set accumulator and specifies `n_distinct_elements` by `result = cardinal (set_of_tree t empty)`.

how to do it.

1. Identify every observable effect. Here the only effect is the reference `h` containing a finite set, so the logical state is `set 'a` (Section 3.2).
2. Give the higher-order loop a postcondition parameterized by the continuation's `post`, the set represented by the traversed tree, the old reference value, and the final reference value.
3. Use the verifier's old-state operator to describe the continuation's input state. The paper says, “Podemos recuperar este valor através da etiqueta old do Why3, que nos permite aceder ao valor contido numa referência no momento de entrada de uma função.”
4. Defunctionalize continuations to `Kid`, `Kleft`, and `Kright`, and define `post(k,arg,old,cur,result)` by cases. `Kleft` adds the right subtree's set to the old state; `Kright` preserves the old state.
5. Generate `apply` with `ensures { post k arg (old !h) !h () }`, then prove the transformed traversal and final cardinality.

Verus form. Inference: model the mutable set with the executable collection's mathematical view, and expose the pre-state with Verus's `old(...)` expression inside a postcondition or loop invariant. Use an `enum` continuation and a `post`-like `spec fn` over the enum and set views. Inference: the paper's Why3 `old` syntax cannot be copied into Verus; the semantic idea carries over, but the exact Rust collection model and ownership proof must be supplied.

## technique 3: prove termination after transformation

Defunctionalization introduces mutually recursive `height` and `apply`; functional correctness alone does not establish termination. The paper defines `var_tree` and `var_kont` measures, proves both nonnegative with lemmas, and annotates the two functions with variants `var_tree t + var_kont k` and `var_kont k` (Section 3.1). The measures account for remaining tree nodes and continuation constructors.

Verus form. Inference: use a `decreases` clause on mutually recursive functions with a tuple or natural-valued rank, and prove recursive calls reduce it. Inference: the datatype measure should count both the remaining input tree and the captured continuation, as in the paper; merely decreasing the tree argument is insufficient for `apply` calls.

## technique 4: defunctionalize function-valued evaluation contexts

The small-step interpreter represents a context as a function `exp -> exp`. Defunctionalization creates `CHole`, `CApp_left context exp`, and `CApp_right int context`. The generated `apply` reconstructs the expression. The paper introduces the auxiliary lemma `post_eval` to show that replacing two expressions with equal `eval` values inside the same context preserves the resulting value; it proves this lemma by induction on the context datatype. The paper's exact statement is: “Este lema exprime que para qualquer expressão arg1 e arg2 cuja a avaliação produz o mesmo valor, então as expressões obtidas pela composição de arg1 e arg2 com o mesmo contexto c devem-se avaliar no mesmo valor.”

how to do it. Define `is_redex` and require it before `head_reduction`; define `is_value` and require non-values before `decompose_term`; return a redex and context whose composition equals the original expression; iterate by decomposing, reducing the redex, applying the context, and recursing. Defunctionalize the context functions, translate `post`, and add `post_eval` so SMT can prove the evaluator's `result = eval e` contract.

Verus form. Inference: encode contexts as an `enum`, define a recursive `spec fn compose`, and state `eval(compose(c,e))` preservation as a lemma proved by structural induction. Use `requires` for `is_redex` and `ensures` for value preservation. Inference: this is a direct pattern for closure conversion in Rust verified with Verus, but recursive datatype lemmas may need explicit triggers and `assert` steps for SMT.

## evidence, trust, and limits

The evidence is three hand-transformed programs, all automatically verified by Why3's SMT provers. No runtime benchmark, number of examples beyond these three, or percentage of obligations is reported. The paper itself calls the work exploratory and says the examples were “desfuncionalizados (manualmente).” The transformed code, Why3, SMT solvers, the contracts, and the semantics of mutable state remain trusted components or assumptions. The approach does not solve open-world higher-order values, mixed closure result types without additional machinery, or automatic termination-contract translation. The paper notes that different abstraction types require separate `apply` functions for now and suggests generalized algebraic data types as future work.

Inference: for VeruLaw, the product threat is moderate for closure-heavy Rust APIs whose set of callback types is statically closed. Inference: a source-to-source pass could generate the enum, dispatcher, state-indexed contract, and proof obligations, but users would still need to prove ownership, termination, and semantic contracts. Inference: the paper's strongest reusable idea is to make higher-order behavior first-order before invoking Verus, while checking the transformation's semantic correspondence inside Verus rather than trusting a code generator.

## techniques for the catalog

- closure datatype conversion: replace each known function value with a constructor storing its free variables
- apply dispatcher: interpret closure constructors by a first-order pattern-matching function with a translated postcondition
- state-indexed effect contracts: represent pre-state and post-state explicitly when closures mutate shared state
- continuation termination measures: prove transformed mutual recursion terminates with measures over data and continuation datatypes
- context defunctionalization: encode evaluation contexts as a datatype and prove composition properties by structural induction
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
