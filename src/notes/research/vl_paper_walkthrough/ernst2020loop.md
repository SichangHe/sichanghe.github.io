# A Complete Approach to Loop Verification with Invariants and Summaries
(authored by agents unless marked 🧑)
Tag: `ernst2020loop`, [paper](https://arxiv.org/abs/2010.05812v3)

source: Gidon Ernst (LMU Munich), arXiv:2010.05812v3, 12 Oct 2021, 27 pages (main text pp.1-23, references start on p.23 and end on p.27, no appendix). The existing citation tag is retained; the version date is 2021. The arXiv identifier on p.1 supplies the paper link. The first-page footnote: “This article extends a conference version at VMCAI’22 with an evaluation (Sec. 8).” Page numbers are the PDF's. Formulas below are transcribed into ASCII: `s0` is the state at loop entry, `s` a state at the loop head, `s'` the state after one body execution, `sn` the state at loop exit, `t` the loop test, `B` the body, `P` and `Q` the pre- and postcondition around the loop.

## the idea in five lines

A loop invariant `I(s)` is pushed forwards over one iteration. A loop summary `R(s, sn)` relates a loop-head state to an exit state and is pushed backwards over one iteration. A loop contract pairs a safe inductive invariant with a correct summary (Definitions 4-6, pp.6-7). The examples often contrast work already done with work remaining (Section 7, p.18). Inference: this is not a restriction on what invariants may express. The abstract's statement: “As an alternative, loop contracts, which make explicit the premise and conclusion of the underlying induction proof, can sometimes capture correctness conditions more naturally.” (Abstract, p.1)

The paper proves that the two styles prove the same loops, gives formulas that turn one into the other, gives a Hoare rule for contracts, compares the two on maximum by elimination in Section 2 and six further algorithms in Section 7, and measures whether Horn-clause solvers can find contracts as well as they find invariants.

Its own summary of the result for tool builders: “The key take-away is that contracts offer a particular and useful way to think about the correctness of loops, that is conceptually different from invariants, but at the same time, the technical requirements for supporting this approach turn out to be superficial, and tool support is straight-forward.” (Section 1, p.2)

## technique 1: specify a loop by a precondition and a relational summary

what it is: instead of one predicate over the current state, give (a) a safe invariant `I` and (b) a relation `R(s, sn)` between the current values and the final values (the paper primes the final ones: `l'`, `r'`). “The latter is a relation between current unprimed values and primed final values of the program variables.” (Section 2, p.3)

when to use it: the paper's criteria, from the end of Section 7 (p.18) and the introduction (p.2):
- the property is about the final result and the work done so far hardly matters to it (searches): “Contracts reason about complete results of a computation, whereas invariants reason about partial intermediate results.” (Section 7, p.18)
- the specification function recurses in the opposite direction from the loop (technique 6)
- the data is split into three logical parts and a conventional invariant describes the discarded parts (binary search, maximum by elimination)
- writes to data structures can require additional frame conditions (technique 7)

how it is done (Definition 6 and the text after it, Section 4, pp.7-8; proof sketch on the example, Section 2, pp.3-4):
1. write the loop's own contract by generalizing the procedure's postcondition: replace the fixed bounds by the loop variables. For maximum by elimination (`l` rises, `r` falls, until `l == r`), procedure postcondition `a[res] = max(a[0..n])` becomes summary `a[l'] = max(a[l..r+1])`, with precondition `0 <= l <= r < n`
2. prove the exit case: `!t(sn) ==> R(sn, sn)`. A loop that stops at once is summarized by `R` reflexively. In the example: when `l == r`, `a[l] = max(a[l..l+1])`
3. prove the backward step: `t(s) && B(s, s') && R(s', sn) ==> R(s, sn)`. Assume the summary for the state after one iteration, prove it for the state before. In the example, branch `a[l] <= a[r]` gives next-iteration index `l_next = l+1` (not final index `l'`); from `a[ln] = max(a[l+1..r+1])` prove `a[ln] = max(a[l..r+1])` by unfolding `max` at the front and using `a[l] <= a[r] <= a[ln]` (Section 2, p.4)
4. if the body has `break`, prove for each one: `t(s) && B(s, sn↓) ==> R(s, sn)`, where `sn↓` is the state at the break (the condition marked ‡)
5. prove the use: `P(s0) && R(s0, sn) ==> Q(sn)`. Apply the summary to the entry state. In the example `l0 = 0`, `r0 = n-1`, `res = l'`
6. separately prove that `I` is an inductive invariant that excludes errors in the body: `P(s0) ==> I(s0)`; `I(s) && t(s) && B(s, s') ==> I(s')`; and the body cannot fail from a state with `I(s) && t(s)` (Definition 4, the condition marked †, Section 4, p.6)
7. optional strengthenings the paper allows: if the body has no `break`, add `!t(sn)` to the summary; and assume known invariants in steps 2 to 4. “Of course, it is possible to strengthen the conditions of Def. 6 by known inductive invariants, occurring as additional assumptions.” (Section 4, p.8)

Why the summary must be a relation and cannot check safety: “There is no safe counterpart for summaries, because they wrap up a loop execution after the fact when it would be too late to catch runtime errors.” (Section 4, p.8)

The paper relates contracts to recursion: “Loop contracts implicitly translate a loop into a tail-recursive procedure.” (Section 4, p.8). Inference: read the precondition as that procedure's `requires`, the summary as its `ensures`, and step 3 as the use of the recursive call's postcondition.

Inference: a verifier that supports only invariants could use the translation in technique 3. The paper does not discuss Verus; no Verus behavior or code has been checked here.

evidence that it is sound and complete: Theorems 3 and 4 and Corollary 1 (Section 4, p.8), mechanized: “Proofs: A mechanization in Isabelle/HOL [53] of the theory presented in Sects. 4 and 5 is available at https://zenodo.org/record/5509953.” (Section 1, p.2)

where it fails or what it assumes: partial correctness only; termination is not proved. “Nontermination, which is orthogonal to this paper, is reflected by the absence of successor states as usual.” (Section 3, p.5); `return` inside a loop is not formalized (technique 8); writes to arrays can require frame conditions.

## technique 2: split a loop proof into safe and correct, and give each to one annotation

what it is: validity of `{P} C {Q}` is split into two judgments (Definition 2, Section 3, p.5): safe means every outcome from `P` is a regular state (neither an error nor an uncaught break); correct means every execution that ends in a regular state satisfies `Q`. A loop catches its body's break outcomes (Definition 3, p.6). Valid is equivalent to safe plus correct (the paper's equation 5).

how to use it:
1. choose a safe inductive invariant as the loop precondition, such as index bounds and non-emptiness; it may also contain facts useful for correctness
2. put everything about the result into the summary
3. rely on Theorem 4 (Section 4, p.8): if `{P} W {Q}` is correct in the sense above, a summary exists that proves it, with no invariant at all. Corollary 1 then says a loop is valid if and only if a contract (safe invariant plus correct summary) exists

Completeness here is semantic existence, not guaranteed synthesis in a chosen assertion language: “the challenge in practice is to find closed-form solutions in a given background theory.” (Section 4, p.7)

The paper's analogy from the contribution list: variants capture the difference between partial and total correctness, and loop preconditions capture the absence of runtime errors in the body (Section 1, p.2).

## technique 3: turn a contract into an invariant (Proposition 1)

what it is: a formula that builds, from a contract `J, R`, an ordinary safe and correct invariant (Section 5, p.9, the paper's equation 6):

```
I(s) := exists s0. P(s0) && J(s) && (forall sn. R(s, sn) ==> R(s0, sn))
```

In words: the entry state satisfied `P`; the safe invariant holds now; and any final state that the summary allows from here is also allowed from the entry state. The third conjunct “predicts that the loop summary wrt. the remaining iterations between current state s and an arbitrary final state sn can be lifted to a summary of the whole execution beginning at s0” (Section 5, p.9).

when to use it: the verifier supports invariants, and the contract is the specification that comes to mind (Section 5, p.9). Expressing the translated formula and automating its proof remain separate concerns.

how it is done:
1. write the contract as in technique 1
2. instantiate equation 6, with ghost copies of the entry values standing for `s0`
3. simplify. The paper says of the raw result: “While technically correct, the constructions (6) and (7) produce rather large and unwieldy formulas.” (Section 5, p.10). For the functional case `y' = f(x)`, Proposition 3 gives the invariant `f(x) = f(x0)`; its surrounding discussion retains the safe precondition and uses the final-state correspondence with `f` (Section 5, p.10)
4. check the result on the examples the paper gives:
   - maximum by elimination: `0 <= l <= r < n && max(a[l..r+1]) = max(a[0..n])` (equation 8, p.10)
   - linear search: `x in a[i..n] <=> x in a[0..n]` (p.13)
   - binary search: `x in a[l..u+1] <=> x in a[0..n]` (p.14)
   - fast exponentiation: summary `r' = r * p^e`, invariant `r * p^e = x^n` (p.13)
   - phone number comparison: equation 11 (technique 6)

What the tool must add, according to the paper: “The only necessary extensions are adding contract annotations to loops and expressing relational predicates, e.g., with the widely-used old keyword or special naming conventions as in VeriFast [55].” (Section 5, p.9)

automation limit: the unsimplified formula can be cumbersome. “One might furthermore worry that the introduction of the universal quantifiers into invariant (6) hampers proof automation when R is a complex formula, indeed, Dafny would typically fails to infer appropriate triggers for it.” (Section 5, p.10).

## technique 4: turn an invariant into a contract (Proposition 2)

what it is: canonical summaries built from a safe and correct invariant `I` (Section 5, p.10, equation 7):

```
R(s, sn) := I(s) ==> !t(sn) && I(sn)     -- loops without break
R(s, sn) := I(s) ==> Q(sn)               -- all loops, also with break
```

In words: if we enter the remaining iterations in a state satisfying the invariant, the final state has whatever the invariant proof gave for it.

when to use it: a verifier or solver takes contracts and the user has an invariant; or one wants to show that supporting contracts loses nothing.

the paper's heuristic simplification example, starting from the invariant of the KIV team for maximum by elimination, `exists k. 0 <= l <= k <= r < n && a[k] = max(a[0..n])` (Section 5, pp.10-11):
1. choose the same witness `k` for both occurrences of `I` in equation 7
2. the paper prints `lemma 0 <= l <= k <= r < n =⇒ max (a[0..n]) = max (a[l..r + 1])` (p.11). Inference: this needs the other KIV conjunct, `a[k] = max(a[0..n])`; bounds alone do not imply the equality. With that conjunct, the subrange contains a whole-array maximum
3. use that the loop ends with `l' = k = r'`
4. result (equation 9): `0 <= l' = r' < n && a[l'] = max(a[l..r+1])`

The paper warns that this direction is the hard one and that the steps include heuristic weakening (Section 5, pp.10-11).

## technique 5: a Hoare rule for contracts, using specification statements

what it is: a syntactic proof rule that a verifier can implement directly (Section 6, pp.11-12). A specification statement `x : [P, Q]` asserts `P`, changes the variables `x` arbitrarily, and constrains the change by the relational `Q`. The rule `LoopContract` for `while t do B` with contract `I, R`, where `x` are the variables the body modifies and `xi`, `xn` are fresh logical variables, has three premises:

```
1.  { P } x : [I, R] { Q }
2.  { I && !t && x = xn } skip { R[x, x' := xn, x] }
3.  { I && t && x = xi } B ; x : [I, R] { R[x, x' := xi, x] }
```

how it is done:
1. replace the whole loop by the specification statement and prove the surrounding code with it (premise 1). This is where the contract is used
2. prove that a state with `I` and the test false satisfies `R` with both arguments equal to it (premise 2)
3. take a state with `I` and the test true, record it in `xi`, run the body once, then run the specification statement in place of the remaining iterations, and prove `R` from the recorded state to the state now reached (premise 3). The statement itself forces `I` to hold after the body, so invariant preservation is part of this premise

The paper on premise 3: “The third premise, in contrast to (10), embeds the inductive hypothesis directly into the program as specification statement x : [I, R] that summarizes the remaining iterations after executing B once.” (Section 6, p.12)

Not in the paper: a rendering of the specification statement as assert, havoc, assume. Inference: in a verifier's intermediate language, `x : [I, R]` is `assert I; old := x; havoc x; assume R(old, x)`, this represents the inductive hypothesis without a recursive call. The body `B` can still contain nested loops, so this does not by itself make every premise straight-line code.

where it stops: “We omit treatment of break for simplicity, see e.g. [37].” (Section 6, p.11). The rule is not among the results the paper lists as mechanized, which are Sections 4 and 5.

## technique 6: when the specification folds from the right and the loop runs from the left, specify the remaining suffix

what it is: a way to avoid a lemma about extending a recursive function at the wrong end.

the paper's example (Section 7, pp.14-16): `compare` decides whether two phone numbers are equal after dropping non-digit characters. Indices `i` and `j` move forward over arrays `a` (length `m`) and `b` (length `n`). The specification uses `filter(p, list)`, defined by recursion on the head of an algebraic list.

steps:
1. the paper's candidate invariant, about the prefixes: `filter(isdigit, a[0..i]) = filter(isdigit, b[0..j])`. The paper labels it problematic and discusses an additional unfolding lemma: “While correct, the approach has the significant drawback that we need a lemma that unfolds the recurrence of filter (p, a[0..k + 1]) at the end instead of the front like the definition, to accommodate the index increments, which in turn is provable by induction only after a further generalization of the lower index from 0 to a variable.” (Section 7, p.15)
2. write instead the summary about the suffixes: `r' <=> filter(isdigit, a[i..m]) = filter(isdigit, b[j..n])`. Each increment of `i` or `j` now removes the head of a list, which is how `filter` is defined
3. if the tool wants an invariant, take the one from Proposition 1 (equation 11, p.16): `filter(isdigit, a[0..m]) = filter(isdigit, b[0..n]) <=> filter(isdigit, a[i..m]) = filter(isdigit, b[j..n])`

When the trick matters most, in the paper's words: “When such functions are specific to the case study, or simply when higher order functions are not supported by the tool, the ability to base the loop specification on right-fold loop summaries is certainly a useful trick in the bag that deserves to be treated first class.” (Section 7, p.16)

## technique 7: add frame equations to summaries of loops that write

what it is: a summary relates the current state to the final state, so what earlier iterations wrote is not mentioned unless the summary says the remaining iterations leave it alone.

the paper's example, array copy (Section 7, pp.16-17): invariant `b[0..i] = a[0..i]`. The natural summary `b'[i..n] = a[i..n]` is not enough: “Summarizing the remaining loop iterations from s to the final state sn by summary R(s, sn ) does not automatically reflect the array modifications applied to get from s0 to s.” (Section 7, p.16)

steps:
1. write the summary for the part still to be processed: `b'[i..n] = a[i..n]`
2. add one equation per region already written, saying the final array equals the current one there: `b'[0..i] = b[0..i]`
3. for nested loops do this at both levels. Bubble sort (p.17), inner loop summary: `a'[0..j] = a[0..j]`, `a'[j..i]` is a permutation of `a[j..i]`, `a'[i..n] = a[i..n]`, `a'[i-1] = max(a'[j..i])`. Outer loop summary: `a'[0..i]` is a permutation of `a[0..i]`, `a'[i..n] = a[i..n]`, `sorted(a'[0..i])`
4. a gain the paper reports for bubble sort: with the contract there is no need to state that every prefix element is at most every suffix element; it follows from the outer loop's frame and the inner loop's summary (Section 7, p.18)

The paper's general limit: “In general, if correctness of the loop depends on unbounded work done so far, the immediate constraints from executing the body once are insufficient.” (Section 7, p.18)

## technique 8: obligations for break, and what cannot be assumed at exit

how it is done (Definitions 3, 4 and 6, Sections 3 and 4, pp.5-8):
1. model `break` as a third kind of body outcome, next to a regular state and an error
2. invariant style: prove `Q` at each break from `I(s) && t(s)`, in addition to proving it from `I(sn) && !t(sn)`
3. contract style: prove `R(s, sn)` at each break
4. a loop with breaks does not establish the negated test by default: “Note, Q(s) does not necessarily imply ¬t(s), i.e., we cannot take the negative loop test for granted if there are non-local exits of the loop by break.” (Section 4, p.6)
5. encode an early `return` as a flag plus `break`: “To avoid using return inside the loop (which we have not formalized in Sec. 4) we maintain a variable r that becomes true once the element is found, in which case we break out of the loop.” (Section 7, p.13). The fact `!r` then belongs to the loop precondition, since the loop head is reached only with the flag false

## technique 9: let a Horn-clause solver find the contract

what it is: the obligations of Definitions 4 and 6 are Horn clauses with unknown predicates `I` and `R`; a constrained-Horn-clause solver searches for interpretations (Section 4, p.6, and Section 8, pp.18-21).

setup (Section 8, p.19): a prototype, Korn, translates C programs to Horn clauses in both styles. “We focus on four categories from the SV-COMP benchmark repository, Arrays, Loops, Recursive, and ControlFlow, where 459 of a total of 925 benchmarks are currently supported by our translator.” Backends Z3 4.8.9 and Eldarica 2.0.4. “The hardware configuration is Intel Xeon E3-1230 with 3.40 GHz and 8 cores, limited to 1 core, 15 min, and 15 GB memory per individual task.”

numbers (Table 1, p.20; correct results out of the 459 supported tasks; the category counts add to the printed totals):
- Eldarica: 237 with invariants, 232 with contracts (Inference: 232/237 = 97.9%). Per category the only difference is Loops, 117 against 112 of 196
- Z3: 234 with invariants, 201 with contracts (Inference: 201/234 = 85.9%). Loops 105 against 75 of 196; Arrays 7 against 2 of 129; ControlFlow 31 against 33 of 39, the one cell where contracts solve more; Recursive 91 both, of 95
- for reference, official SV-COMP 2020 results on the same 459 tasks: CPA-seq 200, Ultimate Automizer 227, VeriAbs 398
- Arrays is where contracts were hoped to help; both solvers solve at most 7 of 129 there in either style, VeriAbs 122

The paper's reading: “Eldarica can deal quite well with contracts, and instantiate these even if we force the proof with these, missing out on 5 tasks wrt. invariants only, whereas Z3 performs worse with contracts.” (Section 8, p.20). Its limit on that reading: “Nevertheless, it should be clear that this evaluation is not a conclusive assessment of the general utility of loop contracts for proof automation.” (Section 8, p.21)

soundness of the prototype: “There are a few incorrect results per experimental setup (1 for Eldarica, and 2 resp. 3 for Z3), due to limitations of the implementation, such as assuming unbounded integers.” (Section 8, p.21)

Inference: an annotation-proposing agent could use generalized procedure postconditions as summary candidates, then apply technique 3. The paper names the same direction as future work: “A clear path to future work is to develop algorithms that synthesize loop summaries from procedure postconditions, similarly to Furia and Meyer [24] for invariants, but potentially exploiting their close correspondence.” (Section 10, p.23)

## proved, measured, trusted

- mechanization claim: “Proofs: A mechanization in Isabelle/HOL [53] of the theory presented in Sects. 4 and 5 is available at https://zenodo.org/record/5509953.” (Section 1, p.2). Those sections contain Theorems 1-4, Corollaries 1-2 and Propositions 1-3. The artifact was not inspected or rerun in this recheck
- the Hoare rule is in Section 6, outside the stated scope of that mechanization claim
- six algorithms are specified in Section 7, in addition to maximum by elimination in Section 2; the paper does not report tool checks of those listings
- measured: Table 1 and a quantile plot (Figure 4) of CPU time
- Inference: applying the measured results relies on the Korn translator and solver implementations; the paper reports some incorrect prototype results (Section 8, p.21)

## numbers and listings that do not agree

- the introduction says “The results, while promising, may reflect a bias towards invariants in existing tools: Performance of Eldarica 2.0.4 and Z3 4.8.9 with contracts is within 90% resp. 70% of that with invariants.” (Section 1, p.2). Inference: Table 1 gives solved-task ratios of 232/237 = 97.9% and 201/234 = 85.9%, which do not reproduce 90% and 70%. The introduction does not identify a metric that explains those percentages
- memory limit: the caption of Table 1 says 15 MB, the setup paragraph says 15 GB
- Z3 4.8.9 is cited as [42] in the setup paragraph and as [28] in the head of Table 1
- binary search listing (p.14): the loop test is `while(i < n)` and the precondition is `0 <= i <= n && !r`, but the program has no variable `i`; its variables are `l`, `u`, `m`, `r`. Inference: both lines were carried over from the linear search listing
- bubble sort (p.17): the outer loop is `for(int i = n; i > 1; i--)`, and its precondition is printed as `0 <= i < n`, which is false at entry where `i = n`. The outer invariant is printed as `max(a[0..i]) <= max(a[i..n])`. Inference: this does not express that every prefix element is at most every suffix element; replacing the second `max` by a minimum would express that stronger ordering when both ranges are nonempty. The author's intended correction is not established

## already done, which VL should not redo

- the theory: the paper reports soundness, completeness, constructive translations and an Isabelle/HOL mechanization of Sections 4 and 5; this recheck did not inspect or rerun that artifact
- contract-style loop specification exists in tools: the paper names VeriFast (Section 1, p.1) and credits Hehner, Hehner and Gravel, and Tuerk for the idea (Sections 1, 6 and 9)
- limits stated in the paper: synthesis of summaries from procedure postconditions is future work (p.23); a comprehensive treatment of framing is beyond scope (p.16); `return` inside loops is not formalized (p.13); many array tasks need quantified invariants that the solvers struggle to infer (pp.19,21). The evaluation nevertheless includes 129 array tasks

## threat to agent-written verified Rust

Inference: the useful transfer to agent-written verified Rust is a way to propose annotations: start with a summary of the remaining work and translate it into an invariant. The paper evaluates C verification, not Rust or language models. Its array results (at most 7 of 129 for either Korn backend/configuration, Table 1) limit what this experiment demonstrates about automatic array verification; they do not measure agent-written annotations.

## techniques for the catalog

- loop contract: specify a loop by a safe precondition plus a relation from any loop-head state to the exit state, proved by an exit case, a backward step, a break case and a use at entry.
- safe/correct split: use a safe inductive invariant as the loop precondition and put functional correctness in the summary; summaries alone are complete for correctness.
- invariant from contract (Proposition 1): the invariant says every final state the summary allows from here is allowed from the entry state; for functional summaries it simplifies to remaining-work value equals whole-work value.
- contract from invariant (Proposition 2): the canonical summary says that entering with the invariant yields the invariant and the negated test, or the postcondition, at exit.
- LoopContract rule: verify the body followed by a specification statement standing for the remaining iterations; prove loop exit and use of the whole contract separately.
- suffix specification for right-fold properties: when the specification function recurses from the front and the loop index moves forward, state the property over the remaining range to avoid an end-unfolding lemma.
- frame equations in summaries: for loops that write, add to the summary that the remaining iterations leave the already written region unchanged.
- break obligations: prove the postcondition or summary at each break; a loop with breaks does not establish the negated test by default; model early return as flag plus break.
- Horn-clause inference of contracts: encode both styles as constrained Horn clauses and let Eldarica or Z3 find the predicates; contracts solved 232 against 237 (Eldarica) and 201 against 234 (Z3) of 459 tasks.
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The examples are chosen not for their difficulty, but because they highlight specific aspects, advantages, and limitations of the respective approaches."): read all 27 pages; checked quotations, formulas, technique steps, counts, section/page references and scope of the claims; corrected the reference-page range, example count, incomplete KIV lemma, mechanization scope and unsupported Verus claims; did not inspect the linked mechanization or Korn implementation, reproduce experiments, or verify code in Verus.
