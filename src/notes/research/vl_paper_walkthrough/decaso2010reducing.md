# Reducing the Number of Annotations in a Verification-oriented Imperative Language
(authored by agents unless marked 🧑)
Tag: `decaso2010reducing`, [paper](http://arxiv.org/abs/1011.3407v1)

## what the paper proves and measures
De Caso, Garbervetsky, and Gorín introduce Pest, a small non-recursive while-style language whose syntax and semantics are designed around verification. The abstract states: “In this work we present Pest, a simple experimental, while-style, multiprocedural, imperative programming language which was conceived with verifiability as one of its main goals.” The paper's soundness theorem says that a program satisfying Pest's static semantics executes normally and meets its procedure postcondition (Sec. 3.2, pp. 7–8). The contribution is a language design and prototype report, not a benchmark with a numeric success denominator. Experience is qualitative: first-year students used BudaPest to verify sorting and search implementations that they previously proved by hand (Sec. 6, p. 13).

Pest has booleans, integers, and integer arrays; variables are monomorphic and inferred from use; assignments copy values, and procedure arguments are copy-in/copy-out, are variables only, and are syntactically enforced to be distinct (Sec. 2, pp. 3–4). The paper says this gives “a strict control over aliasing” and uses the absence of aliasing in the strengthening technique (Sec. 4.2, p. 9). Inference: the language restrictions are a deliberate tradeoff; they do not directly carry to arbitrary Rust with aliasing, traits, unsafe code, and concurrency.

## technique 1: assertion-carrying language and checked operational semantics

What it is. Pest makes preconditions (`:?`), postconditions (`:!`), loop invariants (`:?!`), and variants (`:#`) part of the language. Assertions are executable semantics: “a computation gets stuck whenever one of these fails” (Sec. 3, p. 5). A while rule checks the invariant before the guard, requires a positive variant when the guard is true, and requires the variant to decrease after the body (Fig. 4, p. 6). Procedure calls check the callee precondition before the body and postcondition after it.

How to apply it.
1. Put the intended contract next to each procedure and loop.
2. Define `safe(e)` conditions for expressions; for example array indexing requires `0≤i<|a|` and division requires a nonzero denominator (Sec. 3.2, p. 6; the paper's example is `safe(a[i] / y)`).
3. At loop entry and every iteration, check the invariant, and require the variant to be positive and to decrease (Fig. 4). Statically, the while rule also requires `safe(inv)`, `safe(var)` and `safe(g)` (Fig. 5, p. 7).
4. On each call, bind actuals to formals, check the precondition, execute the body, then check the postcondition (Fig. 4).
5. Compile away assertions that static verification proves; otherwise retain them as runtime checks (Sec. 2, pp. 3–4).

Verus form (Inference). Express the procedure and loop obligations with `requires`, `ensures`, and a loop `invariant`; use a decreasing `decreases` clause for termination. Verus proves the obligations statically and erases proof code, but it does not interpret failed specifications as a runtime stuck state unless the executable code adds checks.

Evidence and limits. Theorem 1 is stated on p. 8; the paper gives only a one-line proof sketch (“a longish yet straightforward induction on the length of a derivation”) and defers the proof to the technical report [8]. The static semantics relies on the entailment relation |=, which the paper calls “undecidable in the general case”, and verification uses a computable approximation (Sec. 3, p. 5). Inference: the theorem is therefore conditional on the soundness of that approximation and on the contract matching the intended behavior; the paper does not claim compiler or runtime correctness.

## technique 2: infer procedure postconditions and preconditions

What it is. Pest specializes Hoare-style static rules into calculi. `post(s,p)` computes a strongest postcondition from statement `s` and predicate `p`; `pre(s,q)` uses weakest-precondition reasoning to compute a precondition from desired postcondition `q`, while loops use the supplied invariant (Sec. 4.1, pp. 8–9). The assignment rule is `post(v←e,p)=∃v′(p[v↦v′] ∧ v=e[v↦v′])`; the if rule existentially closes branch locals; the while rule returns `inv ∧ ¬g` after proving preservation and decrease (Fig. 6, p. 8).

How to apply it.
1. Supply loop invariants and variants; the paper says the inference rules use the provided invariant for `while` sentences.
2. Compute `P = pre(s,true)` to obtain a condition guaranteeing normal execution.
3. Add symbolic initial equalities `pi=pi@pre` and compute `Q = post(s,P ∧ p1=p1@pre ∧ ... ∧ pk=pk@pre)` for the procedure postcondition (Sec. 4.1, p. 9). The paper says that if the contracts of its Figures 1 and 2 are omitted, this procedure infers logically equivalent ones, and leaves the check to the reader.
4. If the result contains unbounded quantifiers, keep it as a proof-only fact; the paper says it cannot literally be inserted as a runtime assertion, but the compiler may omit its check because it is correct by construction (Sec. 4.1, p. 9).

Verus form (Inference). Write `spec fn`s for inferred predicates and prove `ensures` with `proof fn` lemmas. Verus uses mathematical values in specifications, so an inferred unbounded quantifier is proof-only; connect it to bounded runtime loops with explicit invariants. Do not call proof functions at runtime.

## technique 3: strengthen invariants from unmodified variables

What it is. Given an entry predicate `p`, Pest adds facts about variables that the statement cannot modify. It computes `modVars(s)`, existentially closes `p` over those potentially modified variables, and conjoins the result with the loop invariant: `I = inv ∧ Cl∃ modVars(s)(p)` (Sec. 4.2, pp. 9–10). With no aliasing, the complement of `modVars` is a sound approximation of unmodified variables. The paper's illustration is: if `j` has value `e` before a loop and the body does not update `j`, then `j = e` can be added to the invariant (Sec. 4.2, p. 9). The paper gives no worked example of this technique on `arrayMax`; Fig. 7 (p. 10) only compares the `arrayMax` loop invariant with its postcondition, which Sec. 5.1 uses for the `for` construct.

How to apply it.
1. Compute the variables potentially modified by each loop body (`modVars`, defined in [8]).
2. Existentially hide those variables from the incoming predicate.
3. Conjoin the remaining facts with the declared invariant.
4. Translate sequences left to right, using the strengthened first statement's postcondition as the next statement's entry predicate; translate branches under their guards (Sec. 4.2).
5. Existentially remove locals from a procedure's final postcondition.

Verus form (Inference). Use ownership and `requires`/`ensures` to identify unchanged fields, then prove equalities or frame lemmas for them. Encode frame facts as explicit postconditions and invariants.

## technique 4: macro-expand a `for` loop into a verified invariant

What it is. A Pascal-style `for i from l to h do s od` carries an implicit invariant and variant. Pest expands it to `i←l; while i<h :?! l≤i≤h ∧ Qf[h↦i] :# h−i do s; i←i+1 od`, where `Qf` is the loop's postcondition (Sec. 5.1, pp. 10–11). The precondition calculus can infer `Qf` from the enclosing procedure postcondition, recursively handling nested `for`s. The paper says the guessed invariant “will have to be statically verified”. The `easyArrayMax` example therefore removes loop annotations while retaining its contract (Fig. 3, p. 5).

How to apply it.
1. Write the desired postcondition of the iteration.
2. Infer or provide `Qf` at the loop boundary.
3. Expand to an index initialization, bounded while loop, body, and increment.
4. Statically verify that `l≤i≤h ∧ Qf[h↦i]` is preserved and `h−i` decreases.
5. Let the compiler erase the generated proof obligations when static checks pass.

Verus form (Inference). Write an ordinary Rust loop with an explicit `invariant` expressing the prefix property and a `decreases` measure such as `h-i`; a macro could generate this boilerplate, but Verus will still require the invariant in source or generated source.

## technique 5: declarative `map` iteration with a synthesized invariant

What it is. A `map s in A[..i..]` construct recognizes independent array-element updates. Pest expands it to a loop whose invariant says visited elements satisfy `posts[i↦k]`, unvisited elements equal `A@pre`, and `0≤i<|A|`; the variant is `|A|−i` (Sec. 5.2, pp. 11–12). The paper says: “It can easily be seen that the inferred invariant is always correct.” It adds that the compiler “doesn’t even need to statically verify them” (p. 12).

How to apply it.
1. Ensure the body modifies only array `A`, accesses it only at index `i`, and has `i` as a fresh variable (`modVars(s) ∖ locals(s) = {A}`).
2. Define the element update body `s` and its postcondition `post(s,0≤i<|A|)`.
3. Expand over indices from zero to `|A|`.
4. Use the synthesized visited/unvisited invariant and decreasing length variant.
5. Optionally strengthen the generated invariant with the unmodified-variable technique (Sec. 5.2, p. 12).

Verus form (Inference). Encode the visited-prefix and untouched-suffix facts as a loop invariant over `A`; prove index bounds and element-wise update lemmas. Rust slices and mutable borrows make the paper's global array notation more restrictive, so the loop must be structured to satisfy borrow checking.

## technique 6: split verification conditions and run SMT solvers in parallel

What it is. BudaPest translates Pest into an assume/assert intermediate language and discharges verification conditions one by one with CVC3, Yices, and Z3. The tool splits conditions so provers can work in parallel and can detect failing conditions early, because “once a subformula fails there is no need to continue with the rest of the subformulas” (Sec. 6, p. 13). The paper gives no timing or accuracy figures for the tool.

Verus form (Inference). Keep independent proof obligations in separate `assert` blocks or lemmas so the SMT backend can solve them locally; solver parallelism is an implementation concern outside Verus source. A failed sub-obligation identifies the missing invariant or lemma.

## what remains trusted and product threat
Pest's theorem is relative to its operational/static semantics, entailment relation, compiler translation, SMT solvers, and the restrictions that make its alias analysis sound. The paper's student experience is reported in a few sentences and gives no number of students, programs, or success rate. Inference: it is not a controlled user study. Inference: agent-written verified Rust can borrow the contract-inference, frame-strengthening, and generated-loop patterns, but automatic omission of invariants is unsafe without checking ownership, mutation, and arithmetic assumptions. Existing work on Hoare calculi, weakest preconditions, invariant inference, and language-integrated verification means, by inference, that VL should focus on Rust/Verus-specific generators and measured proof effort rather than recreate Pest wholesale.

## techniques for the catalog
- assertion-carrying semantics — make contracts, loop invariants, variants, and runtime assertion behavior part of the language definition
- contract inference — derive procedure preconditions and postconditions with specialized strongest/weakest predicate calculi
- frame-based annotation strengthening — propagate facts about variables outside a statement's modification set
- verified `for` expansion — synthesize a bounded loop invariant and decreasing variant from the iteration postcondition
- declarative map iteration — generate array prefix/suffix invariants for independent element updates
- parallel verification conditions — split obligations and combine early-failing results from multiple SMT solvers
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Observe also that an assertion with unbounded quantification cannot be checked at runtime; nevertheless, the inferred postconditions are correct by construction and the compiler can omit its associated runtime checks."): I read the paper text from first line to last and checked every quotation, section/page reference, rule and figure description, and the technique steps against it; I changed the page reference for safe(e) to p. 6, replaced the unsupported Fig. 7 claim for technique 3, the "including calls", "local alias", "first prototype" and Verus `modifies` claims, and the claim that Theorem 1's proof is given (the paper defers it to [8]), and I added paper-sourced quotations and marked my own conclusions as Inference; the link is the arXiv id printed on the paper's first page; I did not check the cited technical report [8], the BudaPest tool or website, or the PDF figures beyond the text extraction, and the Verus mappings are unverified Inference.
