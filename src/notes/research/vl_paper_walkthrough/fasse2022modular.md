# Modular termination verification with a higher-order concurrent separation logic (Intermediate report)
(authored by agents unless marked 🧑)
Tag: `fasse2022modular`, [paper](http://arxiv.org/abs/2212.14126v1)

## scope and result

This report by Justus Fasse and Bart Jacobs extends Iris, a mechanized higher-order concurrent separation logic, from partial correctness to a method for proving safe termination of non-blocking programs. The paper's result is a meta-level termination argument plus an Iris safety proof. It does not present a Verus implementation, and the paper calls the work an intermediate report. Its central guarantee is conditional: a program must pass a conservative syntactic check, and its instrumented version must be proved safe in Iris. The paper states the goal precisely: “This preliminary report presents our approach for reasoning about total correctness of non-blocking programs.” (Section 1, p. 4)

The method adds a ghost-like stock of call permissions and explicit `Burn` commands to HeapLang. Each call consumes a permission; a `Burn` replaces one permission at level `cp` with a finite number at strictly lower level `cp0`. A well-founded multiset measure then rules out infinite executions. Iris proves that the instrumented code cannot get stuck and that its state interpretation agrees with the permission stock. An erasure argument is intended to transfer the result to the original program, but the report says that erasure is not yet implemented in Coq (Section 2, p. 8; Section 1.1, p. 6).

## technique 1: explicit call-permission instrumentation

what it is

Call permissions are a finite multiset in the operational state. The syntax adds `Burn(e1, cp, e2, cp0)`: evaluate `e2` to a non-negative integer `n`, consume one `cp`, create `n` copies of lower permission `cp0`, and then execute `e1`. A burn gets stuck if the count is invalid, `cp0` is not lower than `cp`, or the required `cp` is absent (Section 2.1, pp. 8–9). The permission levels may be natural numbers or any type with a well-founded order (Figure 2.1, p. 8).

when to use it

Use this when recursive calls or retries make a direct data-size variant unavailable, especially in non-blocking code. Levels follow the static module or call dependency order, so a module may make arbitrarily many calls to earlier modules while still decreasing the global permission multiset. The paper explains the purpose: “By choosing the names of the program's modules (functions/procedures/classes/. . . ) as levels, ordered by their order in the program text (or the module dependency graph), and requiring in a module's precondition a call permission qualified by that module's name, a module can always perform arbitrarily many calls into earlier modules (‘upcalls’).” (Section 1.1, pp. 5–6)

how to apply it

1. Choose a well-founded level for every recursive module or operation, following the call graph (Section 1.1, pp. 5–6).
2. Put an initial permission multiset in the program state and require the appropriate fragment in each function's precondition (Sections 2.1 and 3.1, pp. 8, 18).
3. Insert `Burn` immediately before each function application that could otherwise be unbounded. The report's conservative check requires every application to be syntactically preceded by a wrapping burn (Section 2.3, pp. 14–15).
4. For a retry or recursive call, burn a higher-level permission and create the lower-level permission needed by the call. The concurrent-stack code uses `CP_SUCCESS`, `CP_TRY`, and `CP_PUT` in this way (Figure 4.5, p. 26).
5. Prove in Iris that the executing thread owns the fragment being burned, so the operational side condition cannot fail (Lemma 3, Section 3.1.1, p. 19).

Verus form (Inference): represent permission levels and multisets as ghost state, with a `spec fn` for the well-founded measure and `requires` clauses carrying ownership or a permission token. A recursive Rust function can use a `decreases` clause over a mathematical multiset or lexicographic tuple; a `proof fn` can establish that a retry consumes one token and produces only lower-level tokens. Verus does not have HeapLang's operational `Burn` command or Iris cameras, so the executable code would keep ordinary recursive calls while ghost code proves the corresponding decrease. A Verus contract alone does not make a call finite if the decrease relation is omitted.

evidence and limits

The paper proves a language-level theorem, not an end-to-end Rust result: “Theorem 1 (No infinite executions). ∀ρ. enough_burns_cfg ρ =⇒ ¬(div ρ)” (Section 2.3.1, p. 16). The companion lemma says every step decreases the lexicographic size and preserves the syntactic check (Lemma 2, p. 17). The well-founded multiset order is adapted from Dershowitz and Manna, but “it is currently admitted in our development” (Section 2.3.1, p. 16), so that order remains trusted in this report. The erasure proof is also absent: “The erasure and related proofs is not yet implemented in the Coq development” (footnote, Section 2, p. 8). The check is conservative and rejects programs whose burns are sufficient semantically but not syntactically visible.

## technique 2: a lexicographic termination measure with syntactic checking

what it is

The checker `enough_burns_expr`, `enough_burns_val`, and `enough_burns_heap` recursively requires that every reachable function application is protected by a burn (Figures 2.7–2.10, pp. 14–15). The termination measure is a triple: the call-permission multiset, the number of unprotected applications, and a pseudo-size of the expression, ordered lexicographically (Figures 2.6, 2.7, and 2.11, pp. 13–16). A burn may increase the latter components only after strictly decreasing the permission multiset; consuming an unprotected-application allowance may increase pseudo-size; all other reductions decrease pseudo-size.

how to apply it

1. Define a structural pseudo-size for expressions; the paper counts compound syntax and gives `match` an extra two because it reduces to a function application (Figure 2.6, p. 13).
2. Define an over-approximation of unprotected applications that does not recurse into recursive function bodies (Figure 2.7, p. 14).
3. Check every thread expression and every function value stored in the heap with `enough_burns_cfg` (Figures 2.8–2.10, p. 15).
4. Prove preservation of the check under substitution and evaluation-context filling, then prove that each primitive, head, and program-level step decreases the triple (Section 2.3.1, pp. 14–17).

Verus form (Inference): encode the triple as a ghost `spec fn` returning a tuple or nested mathematical measure. Use a loop `invariant` to preserve the burn-protection predicate and a `decreases` clause for the lexicographic measure. Recursive syntax needs an inductive ghost datatype and `proof fn`s for substitution and context preservation. Verus's integer and sequence measures are usable, but the exact Dershowitz–Manna multiset relation must be defined and proved in the project; it is not a built-in Verus construct.

evidence and limits

The proof is explicitly conservative: “We currently overapproximate the property of a program having enough Burns by essentially requiring every function application to be syntactically preceded by a Burn.” (Section 2.3, p. 14). The current development cannot support a direct structural-decrease argument for the stack's recursive retry; Section 4 instead uses compensation. The outlook also identifies finite acyclic structures as a limitation because the present overapproximation cannot reason precisely about them (Section 6.3, pp. 30–31).

## technique 3: Iris state interpretation for permission resources

what it is

The physical permission multiset is tied to Iris ghost state through an authoritative multiset camera. The authoritative element is owned by the weakest-precondition state interpretation; thread fragments can be split and recombined. The paper gives the key rule: “Because we use ] as the underlying operation of the multiset camera, the multiset fragment(s) can be split and combined accordingly.” (Section 3.1, p. 18)

how to apply it

1. Instantiate the multiset-union camera with an `Auth` wrapper (Section 3.1, p. 18).
2. Put the authoritative multiset in the state interpretation so every logical step matches the physical state (p. 18).
3. Give a function a fragment for the permission it may burn; require a fragment for newly created lower-level permissions in the postcondition.
4. Apply the `Burn` weakest-precondition lemma: `0 ≤ n`, `cp0 < cp`, and ownership of `◦[cp]` imply the weakest precondition for `Burn e cp n cp0` (Lemma 3, p. 19).

Verus form (Inference): use ghost fields or a protocol state machine to track a multiset of permission tokens. A transition proof can require membership of the token being consumed and ensure the post-state contains exactly the lower-level tokens. `proof fn` lemmas can split and combine abstract sets or sequences. Verus ownership and ghost state can enforce exclusivity, but it does not expose Iris's camera algebra; the algebraic laws must be stated as `spec fn`s and proved.

evidence and limits

The authors report that weakest preconditions and adequacy are reused with “minor adaption to account for call permissions” (Section 3, p. 18). Atomic-block weakest preconditions are currently lifted directly with `wp_lift_atomic_step`; a dedicated supporting lemma is future work (Section 3.2, p. 19). Thus the logic integration is partial rather than a completed reusable library.

## technique 4: compensation for helping retries in a concurrent stack

what it is

The case study modifies a lock-free stack whose `push` retries after a failed CAS. A stack invariant records an authoritative `in_progress` multiset of each thread's observed head, a numeric upper bound `n`, and one `CP_TRY` token for each invalidated registration (Figure 4.3, p. 22). A successful modifier burns `CP_SUCCESS` to create enough `CP_TRY` permissions for all threads whose observations became stale. A retry first removes its registration and takes the corresponding token.

how to apply it

1. On entry to a stack operation, register the thread's current head in `in_progress` and increment the upper-bound location atomically (Figure 4.5, lines 10–15, p. 26).
2. On CAS success, atomically read the bound, burn `CP_SUCCESS` into that many `CP_TRY` tokens, update the head, and re-establish the invariant (lines 18–25, p. 26).
3. On CAS failure, remove the thread's registration using its receipt; this exposes one `CP_TRY` token that justifies the recursive retry (lines 26–37, p. 26).
4. Hide `CP_TRY` and `CP_SUCCESS` behind a wrapper that exposes only `STACK_OP` to clients (Figure 4.6, p. 27), then close the proof with Löb induction (Section 4, pp. 24–27).

Verus form (Inference): model `in_progress`, the head bound, and compensation tokens in a ghost state-machine invariant. The CAS operation should have a `requires`/`ensures` contract relating the concrete atomic update to the ghost transition; a `proof fn` can show that every invalidated registration receives a retry token. A recursive `push_inner` needs a `decreases` measure supplied by the token or global permission state. Verus can express the invariant and atomic refinement, but the paper's Iris receipt and mask machinery do not carry over directly.

evidence and limits

The paper says the original helping proof “could essentially be reused verbatim” for termination reasoning (Section 4, p. 20), but `pop` is admitted: “With the exception of pop, which is admitted.” (footnote, Section 4, p. 21). The stack proof therefore demonstrates a technique and a proof sketch, not complete verification of all operations. The approach handles non-blocking interference; the outlook states that termination under fair scheduling for blocking concurrency is not supported (Section 6.1, p. 30).

## what is proved, measured, and trusted

No runtime benchmark, paper-wide success rate, or denominator is reported. The evidence is mechanized Coq definitions and theorems, plus a concurrent-stack proof sketch. Trusted or unfinished components include Coq's admitted well-founded multiset theorem, the missing erasure proof, the admitted `pop`, the Iris/Coq kernel and tactics, and the correctness of the conservative syntactic checker implementation. Atomic-block adequacy is claimed as a straightforward adaptation, while the dedicated `AtomicBlock` weakest-precondition lemma is future work. The assumptions are non-blocking execution, a well-founded permission order, enough syntactic burns, and (for the stack) the compensation invariant and atomicity of the update that reads the interference bound.

## implications for VL

Inference: the technique is a useful design for agent-written verified Rust when termination failures arise from lock-free retries rather than shrinking data. VL could generate a ghost progress-token invariant and a `decreases` relation alongside the Rust operation, then require Verus to prove that each successful interference event creates the tokens needed by invalidated retries. The strongest product risk is conceptual: a syntactic burn check or a valid ghost measure can certify termination only under the stated model and contracts; it does not prove that the model captures scheduler fairness, hardware atomicity, or external code. The paper's admitted and unimplemented pieces mean VL should treat this as a proof pattern to encode and audit, not as a ready-made complete termination library.

## techniques for the catalog

- call-permission instrumentation — insert explicit burns that consume a permission at one well-founded level and create finitely many permissions at a lower level
- lexicographic burn checker — combine permission multisets, unprotected-call counts, and pseudo-size into a well-founded measure preserved by a syntactic check
- authoritative permission state — tie physical permission multisets to Iris weakest preconditions with an authoritative multiset camera and splittable fragments
- compensation for helping — register concurrent observations and mint retry permissions for every thread invalidated by a successful atomic update
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
