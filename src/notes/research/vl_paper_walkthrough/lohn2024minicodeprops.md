# miniCodeProps: a Minimal Benchmark for Proving Code Properties
(authored by agents unless marked 🧑)
Tag: `lohn2024minicodeprops`, [paper](http://arxiv.org/abs/2406.11915v2)
source: Evan Lohn, Sean Welleck (Carnegie Mellon University), arXiv:2406.11915v2, 10 Oct 2024, 11 pages with a one-page appendix; code at https://github.com/cmu-l3/minicodeprops-eval

earlier note: `distributed_verification_review_b/deep_7_evaluation.md` has a short entry on this paper (201 statements, 86 easy and 115 medium or hard, pass@32, two refinement rounds). It places the pass@32 sentence on p.8; the sentence is in Section 4 on p.7. What follows adds the construction steps, the proof shapes, the termination-lemma pattern, the Table 1 mismatch and the Verus forms.

## what is measured and what stays trusted

The paper is a benchmark paper. It fixes the program and the property and asks a model for the proof only: “We present miniCodeProps, a benchmark of 201 program specifications in the Lean proof assistant, aimed at the subproblem of automatically generating a proof for a provided program and specification.” (Abstract, p.1)

Measured: how many of the 201 Lean 4 theorem statements three baselines prove, counted by the Lean checker accepting a proof (Table 3, p.8).

Nothing is proved about the benchmark itself. Trusted, as the paper states or leaves open:

- the Lean 4 kernel, called “the proof checker (in our case, the Lean 4 kernel)” (Section 4, p.7)
- the hand translation from Haskell to Lean; the paper reports no check that a translated function behaves as the Haskell original
- the property statements; the paper says so for the whole approach: “An automated version of ITP still requires a human in the loop to generate (or validate) the statement of the property to be proven, similar to the type of work these engineers perform while using SMT-based verification.” (Section 5, Societal context, p.8)

Inference: the paper does not say whether a submitted proof is scanned for `sorry` or added axioms; the benchmark statements themselves end in `by sorry` (Table 2, p.5), so a harness built on this format needs that scan.

## technique 1: a small proof-only benchmark cut from an existing problem set

what it is: take a public set of inductive problems, keep the program-like files, translate code and properties by hand into the target prover, and label three difficulty splits by what kind of proof each needs.

when to use: to find out where a prover stops on self-contained code, with a budget that allows many model calls per item. The paper's reason for the size: “We specifically make miniCodeProps fairly small, since evaluating theorem proving models requires many calls to the language model (e.g., in a tree search or through repeated sampling), and is hence time-consuming and prohibitively expensive for large datasets.” (Section 3, p.3)

how it is done:

1. pick the source: Tons of Inductive Problems (TIP), Haskell programs with properties (Section 3, p.3)
2. filter by subject: “Since our focus is programming, we filtered out files that contained primarily mathematical induction, then translated the remaining Haskell code into Lean 4.” (Section 3.1, p.3)
3. translate by hand: “We manually translated code from three files in TIP that contain a mix of function definitions, propositions describing the results of calling those functions, and termination lemmas used in the function definitions.” (Section 3, p.3)
4. write and prove the termination lemmas the recursive definitions need, then remove those proofs so the lemmas become tasks (Figure 2 caption, p.3; Section 3.3, p.7)
5. attach to each property its dependencies and metadata (Section 3.1, p.3; technique 2)
6. split by name: medley properties are `prop_n` for n from 1 to 86, sorting properties are the other theorems whose name starts with `prop`, the rest are termination lemmas (Section 3.2, Dataset format, p.4)

The three splits and what each tests (Section 3.2, p.4, and Table 1):

- medley, labelled easy: “Properties in the medley classification typically require a standard induction argument along with the application of 1-2 library theorems.” (Section 3.2, p.4)
- termination, labelled medium: 28 lemmas behind 4 termination proofs
- sorting, labelled hard: properties of 9 sorting algorithms (Section 3.3, p.6)

Verus form. Inference: the paper has no Verus experiment; it cites Verus only as the SMT-based alternative (Section 2, p.3). A Verus copy of this benchmark would give each task as a file with the `spec fn` definitions and one `proof fn` whose `requires` and `ensures` state the property and whose body is to be written. The split carries over: one-induction lemmas, decrease lemmas for recursive definitions, and sorting properties. What changes: Lean tactics do not exist in Verus, so a solution is a recursive `proof fn` with a `decreases` clause, `assert` steps and lemma calls. What does not carry over: the tactic-by-tactic mode (technique 6), because Verus has no proof state to step through.

evidence: the paper gives no measure of translation quality. Its support for the split is the result gap in Table 3 (technique 5).

limits: the authors state the scope themselves: “Clearly, performing well on this subset is only a proxy for the ability to perform well on all realistic code properties.” (Section 5, Scope, p.8) The difficulty labels come from the file a property sits in, not from measured proof length; a `score` field from 1 to 5 exists as a “difficulty heuristic” (Table 2, p.5) but the paper does not say how it is computed or use it in the results.

## technique 2: one self-contained record per property

what it is: each task is one JSON line that carries everything needed to state the property without opening the repository.

when to use: when the prover is a language model that must see the code the property is about, and when the same data has to serve both whole-proof and step-by-step provers.

how it is done (Table 2, p.5), one field each:

1. `full_name`: unique name, also the split key
2. `prop_defn`: the theorem text, ending in `by sorry`
3. `prop_loc`: file and line of the statement
4. `score`: integer 1 to 5
5. `deps`: text of all functions and lemmas the property needs, starting with `import Mathlib`
6. `proof_state`: the initial goal, for step-by-step provers
7. `file_locs`: the last line needed in each source file; appending each file up to that line before the property defines it in full

The baselines always pass `deps`, on the ground that the code under a property is typically needed to finish its proof (Section 4, p.7).

Verus form. Inference: `deps` becomes the `spec fn` and helper `proof fn` text the target mentions, with helper bodies included only for those already proved; `prop_defn` becomes the target `proof fn` signature with its `requires` and `ensures`; `proof_state` has no counterpart. `file_locs` works as is for a single crate file.

evidence: none measured; no run without `deps` is reported.

limits: the record holds only what the statement needs. Inference: a lemma that the proof needs but the statement does not mention is absent from `deps` unless it precedes the property in the listed files, which is what `file_locs` recovers.

## technique 3: proof shapes for recursive list functions

what it is: two worked proofs, written by GPT-4 and accepted by Lean, that show the moves most medley properties need. The paper calls them “bare minimum capabilities for a system aimed at automating theorem proving in the context of formally verified code” (Section 3.3, p.6).

shape A, induction on one list while keeping the other general (`prop_84`, p.5). The property: zipping `xs` with `ys ++ zs` equals zipping the first `length ys` elements of `xs` with `ys`, appended to zipping the rest of `xs` with `zs`. The steps, in the paper's words: “However, GPT4 demonstrates the main ideas of the proof: induct on ys, pair off the first elements of xs and ys, then apply the inductive hypothesis to what remains.” (Section 3.3, p.5) In the Lean text:

1. `induction ys generalizing xs`, so the hypothesis holds for every `xs`
2. base case: unfold `zip'`, `take`, `drop` with the simplifier
3. step case: `cases xs`; the empty case closes by unfolding
4. non-empty case: unfold once, then rewrite with the hypothesis

shape B, follow the function's own branch (`ins`, p.6). `ins n xs` inserts `n` before the first element it is less than; the property is that the length grows by one (the paper's heading, “Non-standard insertion increments length”; the statement itself is not printed). Steps: induct on `xs`; unfold `ins`; split on the `if`; the first branch closes directly; the second uses the hypothesis. The paper: “GPT4 demonstrates understanding of how to work with the ‘ins’ function via the ‘split_ifs’ tactic, and the usage of the inductive hypothesis only in the second branch where it is necessary.” (Section 3.3, p.6)

Verus form. Inference: shape A is a `proof fn` over `Seq` arguments with `decreases ys.len()`, whose body tests whether `ys` or `xs` is empty and otherwise calls itself on the tails; the call is made with the tail of `xs`, which is what `generalizing xs` buys in Lean. Shape B is a recursive `proof fn` whose body repeats the `if n < x` test of the `spec fn` and calls itself only in the else branch. Unfolding by `simp [zip']` has no direct counterpart: the solver unfolds a recursive `spec fn` a limited number of times, and `reveal_with_fuel` raises that number where one step is not enough.

evidence: these two proofs passed Lean. Over the split they come from, the best baseline proved 67 of 86 (Table 3, p.8).

limits: the paper notes the first proof has “several unnecessary definitions passed to the calls to the simplifier” (p.5). Both functions are a few lines long.

## technique 4: termination lemmas as separate proof tasks

what it is: when a recursive call is not on a structural part of the argument, state the size decrease as a lemma, bring the lemma into the definition, and name the measure. The benchmark then removes the lemma's proof and asks the model for it.

when to use: recursion through a helper, as in heapsort's `toList`, which recurses on the merge of the two children. The paper: “While Lean automatically infers the proof in simple cases, more complicated recursive calls require the user to explicitly prove termination.” (Section 3.2, p.4)

how it is done, from the heapsort listing (Section 3.3, p.6):

1. choose a measure: `numElem`, the number of elements in the heap
2. state the decrease: `numElem (hmerge p q) < numElem (MyHeap.node p x q)`, lemma `numElem_merge_branches_lt`
3. prove it: rewrite with a lemma that merging keeps the element count (`merge_elems`), state that a node has `1 + numElem p + numElem q` elements by `rfl`, finish with linear arithmetic
4. inside the recursive branch write `have _h := numElem_merge_branches_lt p q x` before the recursive call
5. end the definition with `termination_by hp => numElem hp`

Verus form. Inference: `toList` is a recursive `spec fn` with `decreases numElem(h)`. Verus must also show that the argument of the recursive call is smaller, and here that needs the fact of step 2, which is a `proof fn` with `ensures numElem(hmerge(p, q)) < numElem(node(p, x, q))`. The construct that hands such a lemma to the termination check of a `spec fn` is not among those recorded in the notes' Verus pages, so the last step is left open here. Steps 1 to 3 carry over as written; `linarith` is not needed because the solver does linear arithmetic by itself.

evidence: the lemmas are hard for the baselines. Termination lemmas are not reported alone; with sorting properties, the best result is 10 of 115 (ntp-ctx-1.3B, Table 3, p.8). On human cost: “As the vast majority of our function definitions are recursive, our benchmark includes 28 lemmas that support 4 termination proofs of nonstandard sorting algorithms from TIP.” (Section 3.2, p.4) and “Some of these lemmas took hours of human effort to prove.” (Section 3.3, p.7)

limits: the paper gives one lemma in full. It does not say which 4 functions the 28 lemmas serve.

## technique 5: a four-property specification of a sorting function

what it is: for each sorting algorithm, the same set of properties, shown for heapsort (Section 3.3, p.7):

1. `prop_HSortSorts`: `ordered (hsort xs)`
2. `prop_HSortCount`: `count x (hsort xs) == count x xs` for every `x`
3. `prop_HSortPermutes`: `isPermutation (hsort xs) xs`
4. `prop_HSortIsSort`: `hsort xs == isort xs`, equality with insertion sort as the reference

when to use: to state that an implementation sorts, with a redundant check against a simple reference implementation.

The paper's reading: “The properties above express the following intuitive properties: heapsort orders list elements, preserves the list size, returns a permutation of the original list, and returns the same result as insertion sort.” (Section 3.3, p.7)

Verus form. Inference: `ordered` and `count` are recursive `spec fn`s over `Seq<nat>`; the executable sort gets `ensures ordered(r)` and `forall|x: nat| count(x, r) == count(x, xs)`; property 4 becomes an `ensures` that the result equals a `spec fn` insertion sort. Property 4 implies 1 to 3 once the reference is proved to have them, so one proof about the short reference pays for every other sort.

evidence: with the termination lemmas, at most 10 of 115 proved (Table 3, p.8). Appendix A (p.11) prints a failed GPT-4 proof of the ordering property; besides unused lemma arguments left as placeholders, “It also attempts the invalid operation of induction generalizing the inductive type ‘MyHeap’.” (Appendix A, p.11)

limits: the definitions of `ordered`, `count` and `isPermutation` are not printed. Inference: the paper glosses the count property as preserving list size, but as written it preserves the count of each element, which is stronger.

## technique 6: three baseline provers, with many-to-one refinement

what it is: two standard ways to run a model as a prover, plus one repair step.

how each is done (Section 4, p.7):

- whole proof, GPT-4o. Prompt holds `deps` and the property. “We measure pass@32, meaning that we generate 32 proof candidates (with default generation parameters), and consider a property to be successful when at least one of them passes the verifier.” (Section 4, p.7)
- step by step, ntp-ctx-1.3B, a 1.3B-parameter DeepSeek-Coder model fine-tuned on Mathlib examples of context, proof state and next tactic. The model sees `deps`, the property and the tactics so far; best-first search picks what to extend. “Each suggestion is then given as input to the Lean 4 kernel, and the resulting proof state is used to prompt the model for the next tactic.” (Section 4, p.7) Search settings are those of the miniCTX paper and are not restated.
- refinement, GPT-4o, run only when all 32 candidates fail:
  1. put all 32 failed proofs in one prompt: “We provide all 32 candidate proofs in a prompt, and ask the model to learn from the failed attempts and generate a new proof.” (Section 4, p.7)
  2. sample k = 16 new proofs; that is one round
  3. repeat for T = 2 rounds, feeding in only the previous round's proofs

Verus form. Inference: whole-proof sampling and many-to-one refinement carry over with Verus as the checker and the `proof fn` body as the output. The paper's prompt holds failed proofs; it does not say whether the checker's error messages are included.

evidence (Table 3, p.8; all 201 properties, each cell checked against its fraction):

- GPT-4o pass@32: 65/86 easy (75.6%), 5/115 medium and hard (4.34% in the table; 5/115 is 4.348%), 70/201 overall (34.8%)
- GPT-4o with refinement: 67/86 (77.9%), 8/115 (6.96%), 75/201 (37.3%)
- ntp-ctx-1.3B: 62/86 (72.1%), 10/115 (8.69% in the table; 10/115 is 8.696%), 72/201 (35.8%)

The small model matches the large one: “Furthermore, the small ntp-ctx-1.3B model trained on Mathlib shows comparable, or better, performance than GPT-4o.” (Section 5, p.8)

limits: refinement draws up to 32 + 16 + 16 = 64 samples against 32 for plain sampling, so the Table 3 rows differ in budget. The equal-budget check is reported without numbers: “In a small scale experiment we confirmed that this outperformed sampling 64 candidates without refinement.” (Section 4, p.7) One run per setting; no variance.

## contradictions and numbers that do not add up

- Table 1 (p.4) counts 21 + 84 + 5 = 110 medley properties, 3 + 22 + 0 + 3 = 28 termination properties and 63 sorting properties, total 201. Table 3 (p.8) and the naming rule (p.4) give 86 medley and 115 for termination plus sorting. 28 + 63 = 91, not 115; the gap of 24 equals 110 − 86. Inference: 24 properties that Table 1 counts by subject as medley are named outside `prop_1` to `prop_86` and so fall in the hard column of Table 3; the paper does not explain it.
- Function counts agree: 26 + 10 medley and 3 + 49 + 2 + 5 others give 95, the stated number of TIP functions (Section 3.2, p.4).
- The model is GPT-4o in Section 4, GPT-4 in the introduction and Section 3.3, and GPT4 in the Table 3 caption.
- Table 3 groups medium and hard in one column, so the abstract's claim about each cannot be checked separately.
- Inference: 63 sorting properties over 9 algorithms is 7 each, while the listing shows 4 for heapsort and says the properties “are repeated for each sorting algorithm” (p.7); the other three per algorithm are not shown.

## what is already done, and the threat to agent-written verified Rust

Done, and not worth redoing: a Lean translation of the TIP list, tree and sorting problems with termination lemmas, public, with an evaluation harness for both proving modes.

Inference: for VL this is a low threat and a useful warning. The paper builds no product and targets Lean. Its result is that in 2024 a general model with 32 to 64 samples proved about three quarters of one-induction lemmas and under a tenth of termination and sorting lemmas over code of a few dozen lines. Verus discharges with its solver the arithmetic that Lean needs tactics for, so these rates do not transfer; the split between easy and hard may. The pieces to reuse are the record format, the split by proof kind, and termination lemmas as their own task class, since an agent writing recursive `spec fn`s meets them first.

## techniques for the catalog

- proof-only micro benchmark — cut self-contained program properties from an existing inductive problem set, translate by hand, and split by the kind of proof needed
- self-contained task record — ship each property with the full text of its dependencies, its initial goal and the file prefixes that define it
- induction with the other argument generalized — induct on one list, case-split the other, unfold once and apply the hypothesis to the tails
- branch-following induction — repeat the function's own conditional in the proof and use the hypothesis only in the recursive branch
- termination lemma as a task — state the decrease of a size measure across a helper call as a lemma, cite it inside the definition, and treat its proof as a separate obligation
- four-property sort specification — ordered, per-element count preserved, permutation, and equality with a reference insertion sort
- many-to-one refinement — show the model all failed candidate proofs at once and sample a new batch, for two rounds
- pass@k with a checker — count a property solved when any of k sampled whole proofs is accepted
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
