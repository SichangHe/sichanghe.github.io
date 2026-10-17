# Can LLM Aid in Solving Constraints with Inductive Definitions?
(authored by agents unless marked 🧑)
Tag: `feng2026llm`, [paper](https://arxiv.org/abs/2603.03668)

Audit: audited 2026-10-13 against the paper; checked all numbers in Tables 1-5, the sums, algorithm steps, both prompt templates, appendices A-E, page references and quotations; changed trust claim to marked inference, prompt-pool order and conjecture limit wording, quant-ind configurations, filter scope, unsupported cvc5 remark, benchmark age; Verus code and fuel remark checked only against the Verus paper.

source: Weizhi Feng, Shidong Shen, Jiaxiang Liu, Taolue Chen, Fu Song, Zhilin Wu, arXiv:2603.03668v2 (12 Mar 2026), 26 pages with appendices A–E. The tool is called LLM4Ind. Page numbers are the PDF's running page numbers.

## the problem, the result, the trust

The problem: a solver is given axioms `A` (recursive function definitions over algebraic data types such as `Nat`, `List`, `Tree`) and a universally quantified property `P`, and must show `A → P` with no person in the loop. Solvers that have built-in induction still fail when the inductive step needs a fact that is neither an axiom nor the induction hypothesis. The paper's statement of what is then needed: “Namely, to prove A → P where A and P are the premise and the conclusion, respectively, we may introduce a set of auxiliary lemmas {Li }i∈I such that A → Li holds for each i ∈ I, and A ∧ i∈I Li → P holds.” (Section 1, p.3; the conjunction sign is lost in the PDF text). The running example is commutativity of `mult` on unary naturals (Listing 1.1, p.2), which cvc5 does not prove in 1200 s (Appendix A, p.22).

The result (Table 1, p.13; default LLM Qwen3-235B-instruct, backend cvc5, 1200 s per task): LLM4Ind solves 525 of 706 tasks; cvc5 alone 293; Vampire 343; Racer 40 of the 168 tasks it can read.

What is trusted (Inference from Algorithms 1 and 2; the paper has no trust discussion): the answers "unsat" of cvc5 (or Vampire) at every node of the proof tree, including the solver's own built-in induction. The paper describes no proof object or independent check. The LLM is not trusted; a conjecture counts only when the solver proves it from `A`. The paper's vocabulary keeps this visible: an LLM output is a conjecture; conjectures are useful if `P` follows from `A` and them; a conjecture is a lemma if it follows from `A`; useful conjectures that are all lemmas are auxiliary lemmas (Section 2.3, p.6).

## technique 1: sort what the model returns into three kinds, and handle each differently

what it is: a taxonomy of LLM-proposed lemmas, from the authors' trial with a two-sentence prompt (Listing 1.2, p.6).

when to use: before designing any filter; each kind needs a different check.

the three kinds (Section 3.1, p.7), each with the paper's example for `mult` commutativity:
1. incorrect: the conjecture contradicts the axioms, e.g. `∀x. plus(x, zero) = zero`. The danger is that it makes the goal provable for the wrong reason: “Namely, an LLM-generated conjecture L contradicts the axiom A, making the premise A ∧ L false.” (p.7)
2. correct but useless: true, and the goal still does not go through, e.g. associativity and commutativity of `plus`, or a copy of the goal itself
3. useful but unproved: the goal follows from it, and it needs its own proof, e.g. `∀x, y. mult(x, succ(y)) = plus(mult(x, y), x)`; of this one the paper says “This conjecture cannot be directly proved via SMT solving using cvc5, and thus requires further verification with additional auxiliary lemmas.” (p.7)

Verus form (Inference: the paper has no Verus; it only cites Verus as a verifier that needs user help). Kind 1 is a `proof fn` whose `ensures` is false; assumed with `admit()` it lets any caller verify. Kind 2 is a `proof fn` that verifies while the caller still fails. Kind 3 is a `proof fn` that makes the caller verify when its body is `admit()` and whose own body fails. The same three checks apply.

evidence: none in numbers; the paper gives no frequencies of the three kinds.

## technique 2: the recursive query, filter, validate loop

what it is: a bounded proof-tree search. At each node the solver first tries alone; if it fails, the LLM proposes a small set of conjectures; cheap checks drop bad sets; the solver checks that the set suffices; then each conjecture becomes a new node.

when to use: any goal for which a solver gives up and a lemma might help, with a solver call cheap enough to make dozens per goal.

how it is done (Section 3.2; Algorithm 1, p.8; Algorithm 2, p.9):
1. preprocess: split the input SMT-LIB file into data type definitions, function definitions and the goal, and label each part with a comment, “to help LLMs’ understanding and reasoning” (p.8; end of a sentence)
2. `ProveRun(P, d)`: run `initialCheck(P)`, the solver alone, 60 s; if it proves `P`, return True (Algorithm 1 line 3)
3. if `d ≥ max_depth` (3 by default), return False (line 5)
4. for each prompt in the prompt pool (two prompts, technique 4 and 5), and for `i` from 1 to `max_iter_number` (3): call `Prove(P, prompt)` (lines 6–8)
5. inside `Prove`: `C ← LLMQuery(P, prompt)` (Algorithm 2 line 2); the templates recommend at most 3 conjectures ("at most 3 is recommended", Appendix E)
6. inside `Prove`: if any single conjecture in `C` is rejected by `isFiltered` (technique 3), drop the whole set and return (False, ∅) (lines 3–5)
7. inside `Prove`: `Verify(P, C)`: ask the solver whether `{A, ¬P} ∪ C` is unsatisfiable, 60 s; if yes return (True, C), else (False, ∅) (lines 6–8)
8. back in `ProveRun`: if `Prove` succeeded, call `ProveRun(subgoal, d + 1)` on every conjecture in `C`, in parallel (at most 4 threads); if all return True, return True; otherwise try the next query (lines 9–16)
9. when all prompts and iterations are spent, return False (line 17)

The bound on the tree, in the paper's words: “The recursive execution of ProveRun forms a proof tree whose depth and width are bounded by the configurable parameters max_depth and max_iter_number ×|prompt_pool|, where max_depth bounds the depth of recursive calls, max_iter_number bounds the number of queries to LLMs for each prompt, and prompt_pool comprises the designated prompts.” (p.8)

Budgets used (Experimental Setup, p.12): 1200 s wall time per task; 60 s for the initial check and for each `Verify`; “The filtering checking (Algorithm 2, line 4) is given 1 second per conjecture.”; top_p 0.9 and temperature 0.9.

Three properties of the loop that the listing shows and the prose does not stress (Inference from Algorithms 1 and 2):
- a failed sub-goal throws away the whole conjecture set of that query, including siblings already proved; nothing is cached across queries
- sufficiency (step 7) is checked before truth (step 8), so the expensive recursive proofs are spent only on sets that would finish the parent
- the loops are nested as prompt, then iteration, so each prompt is tried three times before the next; the paper does not state the order of the prompt pool, so that strategy 1 comes first is an assumption; the first set that works wins, and no ranking among sets exists

Verus form (Inference; a sketch, not run through Verus). `A` is a set of recursive `spec fn`s with `decreases` over a Rust `enum`; `P` is the `ensures` of a `proof fn`; a conjecture is a helper `proof fn`. The loop maps as follows:

```rust
pub enum Nat { Zero, Succ(Box<Nat>) }

spec fn plus(x: Nat, y: Nat) -> Nat
    decreases x,
{
    match x {
        Nat::Zero => y,
        Nat::Succ(n) => Nat::Succ(Box::new(plus(*n, y))),
    }
}

// a conjecture, first checked for usefulness with its body assumed
proof fn lemma_plus_succ(x: Nat, y: Nat)
    ensures plus(x, Nat::Succ(Box::new(y))) == Nat::Succ(Box::new(plus(x, y))),
{
    admit();
}
```

- step 2 is running Verus on the goal `proof fn` as written
- step 7 is running Verus on the goal with the helper called in its body and the helper's own body `admit()`
- step 8 is replacing each `admit()` by a real proof and running Verus on the helper; if that fails, recurse with a helper for the helper
- the final state must contain no `admit()`

What changes: cvc5 here runs with built-in induction (`--quant-ind` is in two of the three cvc5 configurations and in the cvc4 one, Appendix C, p.23), so a sub-goal with no body can be "directly proved". Verus does not apply induction by itself. Each helper needs an induction skeleton written out: a `decreases` clause, a `match` on the induction variable, and a recursive call to the helper on the smaller value in the recursive case. So in Verus step 2 almost never succeeds for an inductive goal, and the model must supply the skeleton as well as the statement; this skeleton step is not in the paper. Also not carried over: Verus unfolds a recursive `spec fn` only to a small depth by default, so a step the paper's solver takes from an axiom may need `reveal_with_fuel` or an explicit `assert` of the unfolded form.

evidence: Table 1 (p.13), Qwen, cvc5 backend, tasks solved under 1200 s, by benchmark, LLM4Ind against cvc5 against Vampire:
- StandardDT (241 tasks): 212, 150, 160
- StandardDTLIA (168): 134, 76, 58; Racer 40
- AutoProofBM (141): 65, 34, 3
- IndBen (156): 114, 34, 122
- total (706): 525, 293, 343

Under 360 s: LLM4Ind 492, cvc5 293, Vampire 337. Average time over solved tasks, 1200 s limit: LLM4Ind 97.30 s, cvc5 3.38 s, Vampire 19.39 s. Cost: “For reference, a full run of LLM4Ind over all benchmarks consumed approximately 11.5M tokens using Qwen, corresponding to an estimated cost of about $4.” (Section 4.1, p.13) Inference: that is about 0.6 cents per task.

limits: 181 of 706 tasks stay unsolved with the default model, and AutoProofBM stays under half (65/141). On IndBen Vampire alone beats the default configuration (122 against 114), which the paper states (p.13). The paper has no analysis of the unsolved tasks, and no count of how deep the trees went or how many tasks needed any lemma beyond depth 1.

## technique 3: a one-second filter that tests consistency instead of validity

what it is: three cheap rejections applied to every conjecture before the costly sufficiency check.

how it is done (Section 3.2, "The isFiltered function", p.9): reject conjecture `c` if
1. it does not parse (the solver's parser decides)
2. it is syntactically identical to the goal `P`
3. the solver shows within 1 s that `A ∧ c` is unsatisfiable, i.e. `c` contradicts the definitions

Why consistency and not validity, the reusable idea: testing whether `c` is true means refuting `A ∧ ¬c`, which has an existential after negation; testing whether `c` is contradictory means refuting `A ∧ c`, which has universals only. The paper: “We check the inconsistency of A and c instead of the invalidity of A → c (equivalently, the satisfiability of A ∧ ¬c) because: A ∧ c usually contains only the universal quantifier ∀ while A ∧ ¬c contains both the universal quantifier ∀ and existential quantifier ∃, thus A ∧ c is easier to be checked; moreover the unsatisfiability of A ∧ c entails the satisfiability of A ∧ ¬c, thus c cannot be a lemma under the axiom A.” (p.9–10)

Inference: besides parse errors and copies of the goal, this filter removes only kind-1 conjectures that the solver can refute fast. A false conjecture that is merely not contradicted in 1 s passes, and is caught later because its own proof fails. Rule 2 matters for soundness of the search, not of the result: a copy of the goal trivially passes step 7 and would recurse on the same problem.

Verus form (Inference; a sketch, not run through Verus): state the conjecture as a `requires` and ask for `false`. If this verifies, the conjecture contradicts the definitions and is dropped.

```rust
proof fn refute_candidate()
    requires forall|x: Nat| plus(x, Nat::Zero) == Nat::Zero,
    ensures false,
{
    assert(plus(Nat::Succ(Box::new(Nat::Zero)), Nat::Zero) == Nat::Zero);
}
```

What changes: Z3 under Verus instantiates a `forall` only on a matching trigger term, so the bare check with an empty body will often not find the contradiction; a small ground instance must be put in the body, as the `assert` above does, and that instance must be chosen (by enumeration of small values, or by the model). The paper does not say how cvc5 finds such contradictions; all its cvc5 configurations use `--full-saturate-quant` (Appendix C, p.23). A short `rlimit` plays the part of the 1 s limit.

evidence (Table 3, p.14; Qwen, three runs R1–R3 each): with the filter 525, 520, 517 tasks solved (average 520.7); without it 511, 512, 518 (average 513.7). Tokens per full run: 11.50M, 12.08M, 11.57M with (average 11.72M); 13.37M, 11.75M, 12.49M without (average 12.54M). Average time over solved tasks: 107.59 s with, 107.37 s without.

limits: the gain is 7 tasks of 706 on average, and the best run without the filter (518) beats the worst run with it (517). Overall time is not lower with the filter. The paper's own exception: “In detail, while the filter can reduce the solving time on the three benchmarks (i.e., StandardDTLIA, AutoProofBM and IndBen), StandardDT remains an exception.” (Section 4.2, p.14) Inference: the filter is worth having because it is nearly free, not because the evidence for it is strong.

## technique 4: prompt strategy 1, equational reasoning that emits the stuck step

what it is: a prompt that makes the model do the inductive step by hand as a chain of rewrites, label each rewrite with its justification, and output as a conjecture exactly the rewrite it cannot justify.

when to use: the goal is an equation `f(x, ys) = g(x, ys)` with `f` defined by recursion on `x`.

how it is done (Section 3.3, p.10; template in Listing 1.4, Appendix E, p.25). The prompt has three parts, task description, chain of thought, output format. The chain of thought tells the model to:
1. identify the proof goal and list relevant axioms
2. assume the solver already knows the induction scheme
3. decide whether the base case needs a lemma, then set up the inductive case
4. rewrite the left-hand side step by step, annotating each step with the axiom or hypothesis used
5. where a step cannot be derived, write it down as a conjecture marked "unknown conjecture"

The output rules of the template: at most 3 conjectures recommended; none identical to the property; each in SMT-LIB on one line.

The paper's worked example (Example 1, p.10), inductive case of `mult(x, y) = mult(y, x)`:
- `mult(succ(x'), y)` equals `plus(mult(x', y), y)` by the axiom of `mult`
- which equals `plus(mult(y, x'), y)` by the induction hypothesis
- which should equal `mult(y, succ(x'))`: no premise gives this, so it is emitted as `∀x, y. plus(mult(y, x), y) = mult(y, succ(x))`

That conjecture is sufficient and not directly provable: “Though this conjecture suffices to prove the property, it cannot be directly proved via SMT solving (e.g., cvc5 with 1200s time limit).” (p.10) So it becomes a sub-goal, the same strategy is applied to it, and the second-level conjecture is equation (2) of the paper, `plus(plus(mult(y, x), x), succ(y)) = plus(plus(mult(y, x), y), succ(x))`.

Verus form (Inference): the same chain is a `calc!` block inside the recursive case of a `proof fn`: each line is one rewrite, the braces after it hold the justification (nothing for a definition unfolding, a recursive call for the induction hypothesis). The line whose justification the model cannot write is the helper lemma to state. This gives a concrete prompt rule for a Verus agent: write the `calc!`, find the step that fails to verify, and turn that single step, with its variables generalized, into a `proof fn`. The paper's template can be reused with "SMTLIB2 file" replaced by the Verus file and the output format replaced by a `proof fn` signature.

evidence: see technique 5; the two strategies are only evaluated together.

## technique 5: prompt strategy 2, generalize a shared term and bridge back

what it is: a prompt with a list of moves for when step-by-step rewriting gets nowhere: add basic facts, strengthen the goal, replace a term that occurs on both sides by a fresh variable, and add a lemma that connects the simplified goal to the original.

when to use: after strategy 1 fails on a goal or sub-goal (the paper's Example 2 does this; it does not state the order of the prompt pool).

how it is done (Section 3.3, p.11; template in Listing 1.5, Appendix E, p.26). The prompt tells the model to:
1. generate basic axioms that help simplify the goal
2. strengthen the goal: find `Q` with `A ⇒ Q` and `Q ⇒ P`, both easier than `A ⇒ P`
3. find a common term on both sides of the goal and replace it with a fresh variable, giving a simpler goal `P'`
4. if there is no common term, rewrite terms with the function definitions until there is one
5. if `P'` is not enough for `P`, generate bridging lemmas between them

First example (Example 2, p.11): in equation (2) the term `mult(y, x)` occurs on both sides; replacing it by `t` gives `∀t, x, y. plus(plus(t, x), succ(y)) = plus(plus(t, y), succ(x))`, a statement about `plus` only. “This simplified sub-goal can be directly proved via SMT solving, thus we can complete the overall proof of the property.” (p.11)

Second example (Appendix B, p.22–23): the goal is `leq(plus(x, x), plus(plus(x, plus(x, x)), x))`. The model returns two conjectures: (3) `leq(plus(x, x), plus(x, plus(x, x)))`, the goal with the outer `+ x` removed, and (4) `leq(a, b) → leq(a, plus(b, c))`, monotonicity, which is the bridge. Instantiating (4) with `a = plus(x, x)`, `b = plus(x, plus(x, x))`, `c = x` and applying it to (3) gives the goal. Of the two, the first needed a further lemma and the second was proved directly.

Verus form (Inference): step 3 is the standard move of stating a helper `proof fn` over a fresh parameter in place of a compound expression, then calling it with that expression as the argument. It fits Verus well because the helper no longer mentions the harder function at all (`mult` disappears in the first example), so its proof needs the unfolding of fewer `spec fn`s. Step 5's bridge is a `proof fn` with a `requires` (here `leq(a, b)`) and an `ensures`.

evidence for the two prompts together (Table 2, p.13; tasks solved of 706, LLM4Ind against the naive prompt of Listing 1.2 inside the same loop): Qwen 525 against 379; DeepSeek-v3.2 521 against 365; Gemini 2.5 flash 514 against 371; GPT-5 552 against 450. Fairness of the comparison: “For fairness, the naive prompt is invoked up to 6 times, matching the others (2 prompts×3 times/prompt).” (Section 4.2, p.14)

Inference from Tables 1 and 2: with Qwen, the loop with the naive prompt already adds 86 tasks over cvc5 alone (379 against 293), and the two designed prompts add a further 146. With GPT-5 the naive prompt reaches 450, which is 71 of those 146 tasks gained by the stronger model alone; the designed prompts still add 102 for GPT-5.

limits: no ablation separates strategy 1 from strategy 2, or reports which strategy produced the winning set. The strategies assume equational goals; the paper does not say what share of the 706 goals are equations.

## technique 6: run the unaided solver as a portfolio first

what it is: before any LLM call, try several solver configurations in parallel.

how it is done (Experimental Setup, p.12; Appendix C, p.23): four threads, one each for cvc5 with `--full-saturate-quant`; cvc5 with that plus `--quant-ind` and `--conjecture-gen`; cvc5 with those plus `--no-e-matching`; and cvc4 with `--quant-ind --quant-cf --conjecture-gen --full-saturate-quant`. The same portfolio is the cvc5 baseline and the backend. The first 60 s of every task go to this step: “In our setup, we first attempt to solve each instance by the SMT solver with a 60s time limit; only if it is not solved within 60s do we query the LLM.” (Appendix D, p.24)

Verus form (Inference): try the plain proof first, and call the model only when Verus fails. The portfolio itself does not carry over, since Verus fixes its solver options; its nearest counterpart is trying a body with `by (nonlinear_arith)` or another solver mode for the one failing `assert`.

evidence: cvc5's count is identical under 360 s and 1200 s (293), and its average solved time is 3.38 s (Table 1). Inference: what the solver can do alone it does at once, so a short first attempt loses nothing.

## robustness measurements

- sampling temperature (Table 4, p.15; Qwen, three runs each, total solved of 706): T = 0.1: 520, 515, 521; T = 0.5: 514, 516, 519; T = 0.9: 525, 520, 517; T = 1.3: 527, 518, 522. The paper's reading: “The range is at most 9 (e.g., 518–527 for T = 1.3), and the std remains below 5 in all cases, indicating low variance across runs.” (Section 4.3, p.15)
- other backend (Table 5, p.15; Vampire in place of cvc5, called LLM4Ind-V, under 1200 s): 453 of 706 in total; by benchmark 214, 80, 19, 140. It beats Vampire alone on all four (160, 58, 3, 122). On AutoProofBM it stays below cvc5 alone (19 against 34), which the paper attributes to input support: “For AutoProofBM, 119 (out of 141) proof tasks involve ADT symbols defined in the SMTLIB2 standard.” (p.15), symbols which Vampire does not support
- an indirect comparison with the AutoProof tool: “As an indirect comparison using the results reported in [44], AutoProof solved 161 tasks while LLM4Ind solved 180 tasks using their benchmarks.” (Section 4.1, p.13) The paper does not say how many tasks "their benchmarks" has; Inference: it cannot be AutoProofBM alone, which has 141 tasks and on which LLM4Ind solves 65.

Inference: the single-run differences between models in Table 2 (514 to 525 for three of the four) are within the run-to-run spread of Table 4 (ranges of 5 to 9), so only GPT-5's 552 is clearly different.

## numbers that do not add up

- Table 1 and Table 5, cvc5 column: 150 + 76 + 34 + 34 = 294, the Total row says 293. The text's “232 more tasks than cvc5” uses 293 (525 − 293).
- Table 2, Gemini column: 206 + 119 + 68 + 126 = 519, the Total row says 514.
- the headline is stated two ways: the abstract (p.1) says “solving considerably more (around 25%) proof tasks”, the introduction (p.4) says “achieves (at least 25%) higher success rate than these solvers” (both are parts of sentences). In points of the 706 tasks the gain is 25.8 over Vampire (182/706) and 32.9 over cvc5 (232/706); as a ratio it is 53% more tasks than Vampire and 79% more than cvc5. "At least 25%" holds only for the totals: on IndBen Vampire solves more than LLM4Ind with the default model.
- Section 4.3 (p.14) says LLM4Ind “consistently improves cvc5, Vampire and Racer, regardless of the LLM model used” (part of a sentence). In Table 2, on IndBen, Qwen (114) and DeepSeek (121) are below Vampire's 122 of Table 1; the claim holds for totals.
- Section 3.1 lists `∀x. mult(x, zero) = zero` among conjectures that “provide no assistance in proving P” (p.7). Inference: that equation is exactly the base case of the induction on `x` in the paper's own verification conditions (equation (1), p.2); it is useless only in the sense that the solver's built-in induction already proves it.
- IndBen is cited as [16] in the benchmark list (p.12), while the sentence that introduces the four benchmarks (p.11) cites [40,44,26,10,22], which omits [16].

## done here, and left open

Done here, for solver-level goals over small data types: sufficiency-before-truth ordering, recursive sub-goaling to depth 3, a consistency filter, two prompt templates printed in full (Appendix E), measurements over four LLMs, four temperatures and two solvers, at about $4 per 706 tasks. Inference: VL can take the loop, the taxonomy and the two templates as given and need not re-derive them.

Open (Inference): every goal here is a closed first-order statement about pure recursive functions, 706 of them from benchmark suites whose sources date from 1996 to 2013 (CLAM, IsaPlanner, HipSpec; references 21, 11, 7) and likely in the models' training data; the paper does not discuss this. Nothing is said about lemmas that need a precondition found from program context, about loop invariants, or about goals where the definitions themselves must be chosen. The paper's related-work section places itself apart from verifier-assisting work: “These approaches primarily aim to enhance user productivity or guide interactive proof search, rather than enable fully automated reasoning.” (Section 5, p.17)

## threat to VL's product

Inference: low as a competitor, useful as a component. LLM4Ind proves benchmark lemmas for SMT and first-order solvers; it writes no code and no specification. If a solver with built-in induction and this loop were placed under a Rust verifier, part of the lemma-writing work that a Verus agent does today for recursive `spec fn`s would move into the solver; the paper does not attempt that, and Verus's solver does not do induction.

## techniques for the catalog

- three-kind conjecture taxonomy: classify each proposed lemma as contradicting the definitions, true but insufficient, or sufficient but unproved, and apply a different check to each
- sufficiency before truth: first check that the goal follows with the proposed lemmas assumed, and only then spend effort proving each lemma
- recursive sub-goal tree with fixed budgets: treat every sufficient lemma as a new goal, to depth 3, with 2 prompts times 3 queries per node and all siblings required to succeed
- consistency filter: in one second ask the solver whether definitions plus the conjecture are contradictory, which needs only universal quantifiers, instead of asking whether the conjecture is valid
- goal-copy rejection: drop any conjecture syntactically identical to the goal so the search cannot recurse on itself
- stuck-step extraction by equational reasoning: make the model rewrite the inductive case step by step with a justification per step, and emit the one unjustified step as the conjecture
- common-term generalization with a bridge lemma: replace a term occurring on both sides by a fresh variable to get a simpler goal, and add a monotonicity-style lemma linking it back when needed
- labelled problem file: split the input into data types, function definitions and goal, each under a comment, before showing it to the model
- solver-first portfolio: give the unaided solver, in several configurations in parallel, the first 60 seconds before any model call
