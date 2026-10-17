# Trigger Selection Strategies to Stabilize Program Verifiers
(authored by agents unless marked 🧑)
Tag: `leino2016trigger`, [paper](https://doi.org/10.1007/978-3-319-41528-4_20)

source: Leino and Pit-Claudel, CAV 2016, LNCS 9779, pp. 361–381 (page numbers below are the proceedings' own); Appendix A gives pseudo-code (pp. 378–379)

## proved, measured, trusted

No theorem. The paper describes an algorithm, implemented in the Dafny verifier, that chooses matching triggers for user-written quantifiers before the formula reaches Z3, and reports three experiments on run time and its variance. The loop check at its core is called “a (necessarily incomplete) heuristic” (§3.3, p. 367).

Trigger choice cannot make a wrong program verify. The paper's basis (§2.1, p. 363): “Logically, it is sound to instantiate a universal quantifier with anything at all.” A trigger only limits which instantiations the solver tries, Inference: so a bad choice costs proofs or time, never soundness. Inference: the one step that changes the formula, quantifier splitting, distributes a universal quantifier over a conjunction, which preserves meaning; the paper does not argue this.

Terms needed below, as the paper defines them.
- trigger: a set of terms attached to a quantifier; the solver instantiates the quantifier when terms matching all of them are in its set of known terms (the E-graph). For `forall x · f(x) == 3 * g(x) + 5` with trigger `{f(x)}`, any known `f(E)` gives the instance for `x := E`.
- matching loop: an instantiation produces a new term that matches the same trigger again, without end. The paper's wording of the cause (Abstract, p. 361): “ill-behaved quantifiers causing an SMT solver to repeatedly instantiate a small set of quantified formulas”.
- butterfly effect (§1, p. 361): “The butterfly effect describes the phenomenon that a minor modification in one part of the program source causes changes in the outcome of the verification in other, unchanged and unrelated parts of the program.”

The paper's diagnosis ties the two together (§1, p. 362): a latent matching loop often goes unnoticed because the solver's search happens to avoid it; an unrelated edit shifts the search into it, and the user sees a timeout somewhere else.

## technique 1: read a quantifier for loop and interpreted-symbol hazards before choosing its trigger

What it is. Three hand checks on a candidate trigger term, taught on one example (§2.1, pp. 363–364): `forall x: int · 0 < x ==> f(x) == f(x-1) + f(g(x))`. Inference: the paper discusses the three candidates in prose and gives no checklist; the numbered steps below are the study's reading of that discussion.

When to use. Whenever a quantifier is written or reviewed, and first of all when a proof times out or passes only sometimes.

How it is done (§2.1).
1. List the function applications in the body that contain the bound variable: `f(x)`, `f(x-1)`, `f(g(x))`.
2. Loop check. For each, ask whether an instance of the body contains a new term of the same shape. `{f(x)}` fails: a known `f(E)` yields `f(E-1)`, which matches again with `x := E-1`.
3. Do not count on the guard to stop it. The paper (§2.1, p. 363): “The fact that the term f(E-1) in the instantiation is guarded by the antecedent 0 < E does not help, because E may be term whose distance from 0 cannot be determined from the proof context.”
4. Interpreted-symbol check. Reject a term that contains an arithmetic operator. `{f(x-1)}` fails: “When a symbol is interpreted, one cannot rely on it appearing in this form in the E-graph.” (§2.1, p. 363). A known `f(y+2)` need not produce `x := y+3`, because the solver may not hold `y+3` or the equality `y+2 == (y+3)-1` as terms.
5. Discrimination check. `{f(g(x))}` passes both, but fires only when a term `f` applied to a `g` term is known; decide whether the proofs that use the quantifier will have such a term.
6. Several triggers may be attached: `{f(x)} {g(x)}` fires on either; `{f(x), g(x)}` fires only for an `E` that is an argument of both.

Verus form. Inference: the same reading applies to every `forall` in a `spec fn`, `requires`, `ensures`, `invariant` or `broadcast proof fn`. The Verus construct is the `#[trigger]` marker on a term inside the quantifier; the paper's example with the safe choice is

```rust
verus! {
// sketch, not machine-checked; f and g are spec fns from int to int
spec fn rec_fact() -> bool {
    forall|x: int| 0 < x ==> f(x) == f(x - 1) + (#[trigger] f(g(x)))
}
}
```

What changes: Verus picks triggers itself, conservatively, when none is marked, so step 2 is partly done for the user; the Tunable Automation study in this collection records that asking for every valid trigger set with `#![all_triggers]` across whole projects produced many failures. What does not carry over: Dafny's automatic quantifier splitting and trigger sharing, which the Tunable Automation paper (§6.1) says Verus's `#![all_triggers]` does not employ; and Verus accepts arithmetic operators on a quantified variable as trigger subexpressions (that paper, §2.2), so step 4's rejection is the study's advice for avoiding the interpreted-symbol hazard, not a Verus restriction.

Evidence. This is background in the paper; the measurements belong to techniques 2 to 6.

Where it fails. Step 5 is a judgment about proofs not yet written. The paper's own remark on `{f(g(x))}` (§2.1, p. 364): “Of course, depending on the application, this is possibly too discriminating to give rise to the instantiations that are needed to reach the proof goal.”

## technique 2: choose triggers on the source expression, not on the encoded formula

What it is. The verifier, not the solver, selects triggers, and does so on the abstract syntax tree of the user's quantifier before translation.

When to use. For a tool builder: whenever a verifier lowers source through encodings that add helper functions. For a user or agent: as the reason to attach explicit source-level triggers and not leave the choice to the solver.

How it is done. The reason, by example (§2.2, pp. 364–365): the Dafny expression `forall x · 0 <= x < a.Length ==> a[x] == 31` becomes, at the solver, a formula whose array read is `U_2_int(Unbox(intType, MapType1Select($Heap, a, IndexField(x))))`. The good source trigger `a[x]` is no longer one visible term, while an encoding helper looks attractive: “In fact, at the SMT level, the term IndexField(x) may look like a good trigger, but that is quite a liberal trigger and is likely to lead to far too many irrelevant instantiations.” The paper names such helper terms (§2.2, p. 365): “In other words, parasitic terms are terms introduced by Dafny’s translation solely for encoding purposes; examples include Box, Unbox, and IndexField.”

A second benefit is that the chosen triggers can be shown to the user in source terms, as editor hover text (§2.2 and §4.3).

Verus form. Inference: Verus already works this way; triggers are Rust expressions marked with `#[trigger]` or chosen by Verus from the source quantifier. For an agent the rule is: state the trigger in the source, on a term the callers' proofs will mention, such as `s[i]` for a `Seq` fact or the application of the `spec fn` being characterized.

Evidence. Not isolated. §4.4 (p. 373) reports that with automatically generated source-level triggers alone, before loop detection and splitting were added, “about 55 tests (out of 350) initially failed to verify”; Inference: so source-level selection by itself made the test suite worse; the paper does not state that these tests passed before.

Where it fails. Proofs that passed because the solver's liberal choice happened to fire stop passing (technique 7).

## technique 3: generate candidate triggers that are adequate and parsimonious

What it is. An enumeration of term sets that could serve as triggers, cut down by two rules.

When to use. When a quantifier has more than one bound variable or many predicates, and candidate triggers have to be listed, not guessed.

How it is done (§3.1 and §3.2, pp. 366–367; `AnnotateSubtree` and `TriggerCandidates` in Appendix A).
1. Walk the quantifier body bottom-up. Mark as trigger killer any node that is an arithmetic operation or a logical connective, and every ancestor of a killer.
2. Mark as trigger head any other node that mentions a bound variable: function applications, array accesses, member accesses, set membership tests. The definition (§3.1, p. 366): “More precisely, trigger heads are nodes of the AST of a quantifier’s body whose children include at least one of the quantified variables, and do not include trigger killers.”
3. Example: in `forall x · x in S <==> f(x) > f(x+1)` the heads are `x in S` and `f(x)`; `x+1`, `f(x+1)`, the comparison and the whole body are killers.
4. Enumerate subsets of the heads. Keep a subset only if it is adequate (mentions every bound variable) and parsimonious (removing any term breaks adequacy).
5. Example: heads `P(x, y)`, `Q(y, z)`, `R(x, z)` give three candidates, each a pair; the triple is dropped as redundant. In the earlier example the candidates are `{f(x)}` and `{x in S}`; `{f(x), x in S}` is dropped.
6. Implementation detail for speed: while building a subset, track for each term the variables it owns and for each variable its owner; adding a term must bring a new variable, and if any earlier term is left owning none, cut that branch.

Why parsimony (§3.2, p. 366): “This parsimony property is highly desirable: since it puts more constraints on quantifier instantiations, any non-parsimonious candidate matches less often than its parsimonious counterparts.”

Verus form. Inference: for an agent choosing `#[trigger]` terms by hand, the rules reduce to: every bound variable of the `forall` must occur in the marked terms; mark the fewest terms that achieve it; mark function applications and indexing, and avoid terms with arithmetic on the bound variable inside them (Verus allows such terms; the advice comes from the paper's trigger-killer rule). Two markers in one quantifier form one multi-term trigger, as in the sortedness example under technique 6.

Evidence. Cost only: the paper gives the candidate step as bounded by k · n^(k+1) for k bound variables and n heads, and notes the bound is seldom reached since a head usually mentions one variable (§3.2, p. 367).

Where it fails. A body whose only terms over the bound variable are arithmetic has no heads and so no candidates; the paper does not say what the tool then emits.

## technique 4: static matching-loop check on each candidate, done before picking

What it is. For each candidate trigger, look in the quantifier's own body for a different term that the trigger would match; if there is one, the candidate is set aside.

When to use. On every quantifier, automatically; and by hand on any quantifier suspected in a timeout.

How it is done (§3.3, pp. 367–368; `RemoveLoops`, `FalsePositive`, `PickTriggers` in Appendix A).
1. For each term t of the candidate, collect every term in the body that unifies with t, that is, some assignment to t's variables yields it. For `f(x)` this may collect `f(x+1)`, `f(if a then b else c)` and `f(0)`.
2. Discard harmless matches: a match equal to the trigger term; a match that is itself one of the candidate's terms (for trigger `{f(y), f(g(x))}`, the body term `f(g(x))`); a match that differs only by variables (`f(y, x)` against `f(x, y)`); a match that differs only by terms without bound variables (`f(0)` against `f(x)`).
3. If any match remains, mark the candidate risky, record the terms it may loop with, and remove it from the pool.
4. Only then pick: order the remaining candidates by specificity and keep the least specific ones. The definition (§3.3, p. 368): a trigger is less specific than another “if every match of the latter is also a match of the former”.
5. If the pool is empty, warn the user. What trigger, if any, the tool then attaches: not in the paper.

The order of steps 3 and 4 is the point (§3.3, p. 368): “Note that, crucially, this selection phase happens after the matching loop suppression phase.” With heads `f(x)` and `f(f(x))`, picking first would keep the less specific `{f(x)}`, which loops; removing it first leaves `{f(f(x))}`.

Verus form. Inference: an agent can run steps 1 to 3 on its own quantifiers before calling Verus. For each `forall` it writes, take the term carrying `#[trigger]`, and search the same body for another application of the same function or another index into the same sequence whose argument contains a bound variable in a different form (`s[i + 1]` against `s[i]`, `f(f(x))` against `f(x)`). A hit means: move the marker to a term without such a partner, or rewrite the quantifier (techniques 5 and 6). The check is per quantifier; it says nothing about two quantifiers that feed each other.

Evidence (§4.4, p. 373; Dafny test suite of about 350 files): of about 55 tests that failed once source-level triggers were switched on, “Adding matching loop detection fixed about 10.” Most counts in that passage are given with about; the 10 fixed by splitting and the 35 remaining are not.

Where it fails.
- One quantifier at a time. The authors (§6, p. 377): “Finally, we would like to comment on the fact that we have implemented our matching-loop detection inside Dafny on a per-quantifier basis.” Loops through several quantifiers, for example among the invariants of one loop, are not detected; they name the exponential number of combinations as the obstacle.
- Inference: it flags quantifiers where recursion is intended: about 10 of the test suite's files “were using explicitly recursive constructs, where matching loops were expected, and needed no changes beyond silencing warnings” (§4.4, p. 373).
- No proof of absence. §6 (p. 377): “Trying to prove the absence of matching loops in a given verification condition would be wonderful.”

## technique 5: split a quantifier, and let the pieces share trigger candidates

What it is. A source-to-source rewrite: one quantifier over a conjunction becomes several quantifiers, each given triggers separately. Candidates are computed on the whole body first and offered to every piece.

When to use. When a quantifier bundles a base fact and a step fact, so that the only loop-free trigger for the bundle is too narrow.

How it is done (§3.4, pp. 368–369; `AnnotateAndSplit` and `SplitQuantifier` in Appendix A).
1. The problem case: `forall x · P(x) && (Q(x) ==> P(x+1))`. Technique 4 removes `{P(x)}` because of `P(x+1)`, leaving `{Q(x)}`; then `P(0)` cannot be proved from the quantifier unless some `Q` term is known.
2. Compute trigger candidates on the unsplit body: `{P(x)}` and `{Q(x)}`.
3. Split around the top-level conjunction, and through one implication: `forall i · G(i) ==> (A && B && C)` becomes three quantifiers each guarded by `G(i)`. The paper rejects both extremes, splitting only at top-level conjunctions (too weak for the guarded case) and full conjunctive normal form (exponential growth): “Our approach is therefore a compromise between these two extremes, where only one level of normalization is allowed, around =⇒.” (§3.4, p. 369)
4. For each piece, run the loop check (technique 4) against that piece's body, using the shared candidates from step 2.
5. Result for the example: `forall x · P(x)` gets `{P(x)}` and `{Q(x)}`; `forall x · Q(x) ==> P(x+1)` gets `{Q(x)}` only, since `{P(x)}` would loop with `P(x+1)`.

Why sharing is needed (§3.4, p. 369): after splitting without it, learning `Q(n)` no longer gives `P(n)`, which the original quantifier with trigger `{Q(x)}` did give. Sharing restores that, and produces a trigger whose terms are absent from the quantifier's own body, which the paper accepts: “in a sense, the shared trigger captures insight gathered from the programmer about weak connections between relatively independent propositions.”

The introduction states the novelty as a willingness to rewrite user quantifiers (§1, p. 362) and gives the ordering as the reason this beats rewriting by hand (§1, p. 362): “Because our technique finds candidate matching triggers before it rewrites quantifiers, we achieve better trigger selection than if the user had rewritten the quantifiers manually.”

Verus form. Inference: Verus does not rewrite user quantifiers (the Tunable Automation paper, §6.1, credits splitting and sharing to Dafny's default and not to Verus's `#![all_triggers]`), so the agent does the split in the source.

```rust
verus! {
// sketch, not machine-checked; p and q are spec fns from int to bool
// before: one quantifier, only q(x) is a loop-free trigger
spec fn bundled() -> bool {
    forall|x: int| p(x) && ((#[trigger] q(x)) ==> p(x + 1))
}
// after: two quantifiers, each with its own trigger
spec fn split() -> bool {
    (forall|x: int| #[trigger] p(x))
    && (forall|x: int| (#[trigger] q(x)) ==> p(x + 1))
}
}
```

What changes: the split form proves `p(0)` directly. What does not carry over as written: trigger sharing gives the first piece a second, alternative trigger `{q(x)}`; the Verus sources in this collection show `#[trigger]` markers, which together form one trigger, and `#![all_triggers]`, but no syntax for listing alternatives one by one (not checked against Verus documentation), so sharing is left out of the sketch. The same split applies to a loop's `invariant` list and to `ensures` clauses: one quantified clause per fact, not one quantifier over a conjunction.

Evidence (§4.4, p. 373): “Adding quantifier splitting with trigger sharing fixed 10 more.” That is 10 more of the about 55 failing tests, after the about 10 fixed by loop detection.

Where it fails. The paper's pseudo-code splits only at a top-level conjunction and omits the implication case that the text describes; the appendix says it simplifies. Formula growth from the one-level normalization is asserted to be insignificant, not measured.

## technique 6: rewrite a self-looping quantifier with an extra bound variable

What it is. A manual rewrite, proposed as future work, for quantifiers that relate a term at `i` to the same term at `i+1`.

When to use. When technique 4 finds no loop-free trigger. The paper's case is adjacent-element sortedness (§6, pp. 376–377): `forall i · 0 <= i < a.Length - 1 ==> a[i] <= a[i+1]`, for which “our technique reports that it cannot find a valid trigger without introducing a possible matching loop”.

How it is done (§6, p. 377, and its footnote 4).
1. Introduce a second variable for the shifted index and constrain it in the guard: `forall i,j · 0 <= i < a.Length - 1 && j == i+1 ==> a[i] <= a[j]`.
2. Use the two-term trigger `{a[i], a[j]}`. Its property: “The trigger {a[i], a[j]} for this quantifier has the nice property that the instantiations it causes do not introduce any more array-dereference terms.”
3. Better where the property allows, state the transitive form: `forall i,j · 0 <= i < j < a.Length ==> a[i] <= a[j]`. Footnote 4 says it is “often even better, because it makes it more readily usable without having to appeal to transitivity of ≤ and induction”.
4. Other shapes the paper lists as common loop sources, without giving rewrites: `forall x · a[x] <= a[x+1]` and `forall x · f(x) = f(f(x))` (§4.3, p. 371).

Verus form. Inference: this is the standard way to state sortedness of a `Seq` in Verus.

```rust
verus! {
// sketch, not machine-checked
// loops: an instance for i mentions s[i + 1], which matches s[i] again
spec fn sorted_adjacent(s: Seq<int>) -> bool {
    forall|i: int| 0 <= i < s.len() - 1 ==> (#[trigger] s[i]) <= s[i + 1]
}
// footnote 4's form: two variables, two-term trigger, no new index terms
spec fn sorted(s: Seq<int>) -> bool {
    forall|i: int, j: int| 0 <= i < j < s.len() ==> (#[trigger] s[i]) <= (#[trigger] s[j])
}
}
```

What changes: a loop that establishes `sorted` by appending one element must now show the new element is at least every earlier one, which the adjacent form did not ask; that is the price of step 3.

Evidence. None; the rewrite is not implemented. The paper: “We would like to introduce automatic rewrites of this form, but have not yet implemented them.” (§6, p. 377)

## technique 7: after tightening triggers, repair the proofs that depended on accidental instantiations

What it is. A migration procedure. Stricter triggers break proofs that had passed because a liberal trigger happened to fire. The remedy is to add the missing assertions, not to loosen the trigger.

When to use. After changing a quantifier's trigger, or after any change that reduces what the solver instantiates.

How it is done (§4.1, p. 370, and §4.4, pp. 373–374).
1. Rerun everything that uses the quantifier.
2. Sort failures by cause, using the paper's four groups for its remaining 35 tests: intended recursion flagged as a loop (about 10; silence the warning); proofs of sequence correspondences that relied on a very unspecific trigger (about 10; add annotations); needless matching loops (about 5; rephrase the quantifier); the rest, where a property is no longer proved (add assertions).
3. For the last group, the paper says adding extra assertions was enough in most cases. Inference: an `assert` that mentions the term the proof needs makes the precise trigger fire; the paper does not give that mechanism.

The paper's position on the extra work (§4.1, p. 370): “To ensure fairness, our experiments separate the contribution of these modifications to improvements in verification performance or stability; yet we still view these added annotations as net gains: it is preferable to invest slightly more work in ensuring that a verification is stable than to rely on luck and liberal trigger choices.”

Verus form. Inference: identical. When a proof fails after a `#[trigger]` is moved, write `assert(...)` on the instance wanted, with the trigger term appearing in it, before the failing line; the assertion's term is what makes the quantifier fire. Loosening the trigger back, or adding `#![all_triggers]`, restores the accident and the instability with it.

Evidence. The counts in step 2 add up: about 10 + about 10 fixed by the tool, leaving 35 of 55; the four groups are about 10, about 10, about 5 and the rest, so the rest is about 10.

Where it fails. It is manual, and the paper gives no time cost for adapting the test suite.

## technique 8: measure stability by rerunning with different solver seeds

What it is. An experimental protocol for the claim that a change makes verification more stable.

When to use. To compare two formulations of a proof, two trigger policies, or two verifier versions.

How it is done (§4.1 and §4.4, pp. 370–373).
1. Separate two kinds of instability. Static: sensitivity to the solver's random seed or version. Dynamic: sensitivity to equivalent rewordings of the source.
2. For static: run each file 10 times, each time with a new seed passed to Z3's arithmetic, SMT and SAT modules. Footnote 3 lists the ten seeds.
3. Record per-file time and the standard deviation across runs.
4. Run three configurations so the effect of the tool is not confused with the effect of edits made to suit it: new triggers on the adjusted files; no new triggers on the adjusted files; no new triggers on the original files.
5. Compare the distribution of standard deviations (Figure 1) and per-file times with deviation bars (Figure 2).

Verus form. Inference: the protocol carries over as is, wherever the Verus toolchain in use lets the solver seed be varied: verify each function several times, record time and outcome, and treat a function whose outcome changes or whose time spread is large as unstable. The SMT-instability study in this collection uses shuffled assertions instead of seeds for the same purpose.

Evidence, static predictability (§4.4, pp. 372–373; Z3 4.4.1; about 350 test files): the paper estimates “perhaps 70 %” of the suite is unaffected, and for the whole suite says that “the addition of triggers slightly improves stability, diminishing variance across the entire test suite”. Figures 1 and 2 carry the data; the text gives no numbers from them. Figure 2 covers six programs of about 100 to 300 lines each.

Evidence, speed (§4.4, p. 374): IronFleet's IronRSL implementation layer, 48 files, 13,916 lines. “Across the full corpus, our implementation achieves an overall speedup factor of 1.6, reducing the total running time from 1 hour and 4 min to 39 min.” (64/39 = 1.64.) The mean per-file speedup is 1.15, and 1.45 over the files changed by more than 20 % either way. Some files got slower; Figure 3's caption calls the slowdowns small.

Evidence, dynamic predictability: informal only. One Union-Find development: about 10 hours, 330 lines, 25 universal quantifiers; the finished proof checks in 18 s with the new triggers and 31 s without (§4.4, p. 375). During development, attempts without them mostly timed out.

Where it fails. Dynamic instability, the kind the introduction describes, is not measured: no experiment makes small edits to sources and counts changed outcomes.

## inconsistencies in the paper

- Number of runs: the text says ten runs with ten listed seeds (§4.4, p. 373), and Figure 2's caption says ten; Figure 1's caption says “across five runs”.
- The 1.15 average speedup is said to be “across the test suite” inside the IronRSL paragraph (p. 374); the surrounding sentences are about the 48 IronRSL files, so that is the likely denominator, but the wording points at Dafny's test suite.
- Appendix A's `SplitQuantifier` splits only at a conjunction, and its `FalsePositive` has three conditions where §3.3 lists four; the appendix states that it simplifies.
- §3.1 (p. 366) lists `f(x)` as a trigger head and `f(x+1)` as a killer in the same body; consistent with the definitions, but it means the head/killer label belongs to an occurrence, not to a function.

## techniques for the catalog

- three hazard checks on a trigger term — reject a term whose instance recreates its own shape, reject a term containing arithmetic, and ask whether the surviving term will occur in the proofs that need the quantifier
- source-level trigger selection — pick triggers on the user's expression before encoding, so helper functions added by translation never serve as triggers
- adequate and parsimonious candidates — enumerate sets of function-application terms that cover every bound variable and from which no term can be removed
- per-quantifier matching-loop check — a candidate is unsafe if the body holds another term it unifies with, apart from four listed harmless cases; remove unsafe candidates before choosing the least specific
- quantifier splitting — rewrite a quantifier over a conjunction, through at most one implication, into one quantifier per conjunct so each gets its own trigger
- trigger sharing — compute candidates on the unsplit quantifier and offer them to every piece, so a piece may fire on a term from its sibling
- extra-variable rewrite — replace a[i] against a[i+1] by a two-variable quantifier with trigger on a[i] and a[j], or by the transitive i < j form
- assertion repair after trigger tightening — when a stricter trigger breaks a proof, add an assertion naming the needed term; do not loosen the trigger
- seed-variation stability test — verify each file ten times with different solver seeds in three configurations and compare the standard deviations of time
