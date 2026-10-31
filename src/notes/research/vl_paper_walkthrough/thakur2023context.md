# An In-Context Learning Agent for Formal Theorem-Proving
(authored by agents unless marked 🧑)
Tag: `thakur2023context`, [paper](http://arxiv.org/abs/2310.04353v5)
source: Thakur, Tsoukalas, Wen, Xin, Chaudhuri (UT Austin), COLM 2024, arXiv:2310.04353v5 (8 Aug 2024); 27 pages, appendix A.1 to A.5 included. The system is called COPRA.

## what is measured and what stays trusted

COPRA is a search procedure around an unmodified general-purpose LLM (GPT-4-turbo). It proves Lean 3 and Coq theorems one tactic at a time, with no training on proof data. Nothing is proved about COPRA itself: the paper measures how many benchmark theorems it closes under a query budget.

- measured, Lean: miniF2F-test, 244 theorems (Section 4, p.5)
- measured, Coq: 118 CompCert theorems. “Due to budgetary constraints, our evaluation for CompCert uses 118 of the 501 theorems used in the original evaluation of PROVERBOT 9001.” (Section 4, p.5). All 98 theorems that PROVERBOT9001 had proved are among the 118; the other 20 are a random sample (same paragraph)
- trusted: the proof assistant, which checks every tactic. Inference: the LLM, the retriever and the search are untrusted, since a wrong tactic only yields an error state. The theorem statement is an input and is not questioned
- not ruled out: test-set leakage. “Naturally, we cannot be certain that COPRA does not benefit from such leakage.” (Appendix A.1.4, p.16)

The formal setting (Section 2, p.3) is what the techniques below operate on. A state is a set of obligations, each a pair of goal and hypotheses, or an error state carrying a message. A tactic maps a state to a new state through a transition function T. The empty obligation set is QED. Errors are absorbing: “Error states (O, w) satisfy the property that T ((O, w), a) = (O, w) for all a.” (Section 2, p.3)

## technique 1: LLM-directed depth-first search with one step per query

what it is: “The COPRA agent solves the theorem-proving problem via a GPT-4-directed depth-first search over tactic sequences.” (Section 3, p.4). The model never writes a whole proof. It proposes the next tactic; the proof assistant executes it; the result decides whether to go deeper, retry, or pop.

when to use: the checker can run one step and return the new state or an error, and whole-proof generation fails often. The paper's few-shot baseline, which must write the whole proof in one response, is the motivating case (Figure 2-(c), p.3).

how it is done, from Figure 3 (p.4), with the figure's line numbers:
1. line 1: push the current state O on the stack `st`
2. line 2: retrieve lemmas and definitions for O (technique 5)
3. lines 3 to 5: up to t times, build a prompt from the stack, the failure set of O, the retrieved items and the optional global context, then parse the LLM's answer into a tactic `a`
4. line 6: compute the new state O' = T(O, a)
5. lines 7 and 8: if O' is QED, stop with success
6. lines 9 and 10: if O' is an error state, or fails the progress check against a state on the stack (technique 3), add `a` to the failure set of O
7. line 11: otherwise recurse on O'
8. line 12: when the t tries are used up, pop the stack. “After issuing a few queries to the LLM, the agent backtracks.” (Section 3, p.4)

The paper does not give the value of t. The global budget is given: for most experiments, 60 LLM queries and 600 seconds per theorem, whichever is exhausted first, one response per query, temperature 0 (Appendix A.1.1, p.14).

The system prompt enforces the single step. Figure 13 (p.22) tells the model: “Multiple proof steps are more error prone, because you will not get a chance to see intermediate proof state descriptions.” The Coq prompt also closes the escape hatch: “The tactic `admit` is NOT a valid proof step, do NOT generate it.” (Figure 14, p.24). Yet Section 4 (p.6) defines an action as “exactly one action (a sequence of tactics)”, and the GPT-4 answer in Figure 18 (p.27) holds two tactics (`have h3 ...` then `linarith`). So one query may yield several tactics; the rule is one action per query.

Verus form. Inference: Verus has no tactic states, so the mapping is by analogy.
- state O: the source file plus the list of verification errors Verus reports for the target function
- tactic `a`: one proof edit, for example one `assert(...)`, one call to a `proof fn`, one added clause under `invariant`, or one `decreases` clause
- T: run Verus on the edited file
- QED: zero errors, with no `assume(false)` and no `admit()` in the function
- error state: the edit does not parse or type-check, or Verus reports a failure it did not report before
- the stack is the sequence of edited files from the original to the current one; popping restores the previous file
- what does not carry over: Lean shows the remaining goal after each tactic, while Verus shows only which assertion, postcondition or invariant failed. The hypotheses of an obligation are not printed, so the prompt must carry the function text instead of a goal-and-hypothesis list

evidence: miniF2F-test, 244 theorems, GPT-4, temperature 0, 60 queries, 600 s (Table 1, p.7).
- COPRA without retrieval: 26.63%. Inference: 65 of 244 (65/244 = 26.64%)
- few-shot GPT-4 (whole proof in one response), 1 attempt of 1 query: 13.52%. Inference: 33 of 244
- few-shot GPT-4 at temperature 0.7, with as many attempts as COPRA used queries on that theorem: 15.98%. Inference: 39 of 244
- COPRA without backtracking: 24.59%. Inference: 60 of 244. “We find that backtracking is useful when proofs are longer or more complex, as COPRA is more likely to make mistakes which require amending.” (Section 4, p.8)
- Coq, 118 theorems, 60 queries: COPRA with retrieval proves 57; the few-shot baselines with GPT-4 and GPT-3.5 prove 36 and 10 (Section 4, p.9)

Inference: backtracking adds 5 theorems of 244 (60 to 65), far less than stepwise execution with feedback adds over few-shot whole-proof generation (33 to 60). The paper reports no variance and each configuration is run once.

where it fails or what it assumes:
- the model must follow the output format. With GPT-3.5 the same search reaches 9.02% and with CodeLlama 5.73% at 500 queries (Table 1, p.7). “Also, it is unclear whether a GPT-4-scale model is truly essential for our task.” (Section 6, p.10)
- a query takes 13.34 s on average for COPRA with GPT-4, against 0.48 s for REPROVER on GPU without retrieval (Table 3, p.15)
- Section 4 (p.8) says IMO problems and theorems needing induction are hard for both COPRA and REPROVER

## technique 2: failure dictionary shown to the model

what it is: a map `Bad` from a state to the tactics already found useless there. Its entry for the current state is placed in every prompt, so the model is told what not to repeat.

when to use: any retry loop at temperature 0, where the same prompt gives the same wrong answer.

how it is done:
1. keep `Bad(O)`, initially empty, for every state (Figure 3 caption, p.4)
2. after a tactic errors or fails the progress check, add it to `Bad(O)` (Figure 3, lines 9 and 10)
3. print the set under the keyword `[INCORRECT STEPS]`, one `[STEP]` per tactic (Figure 13, item 4, p.22)
4. print the last tactic under `[LAST STEP]` with either `[SUCCESS]` or `[ERROR MESSAGE]` and the checker's text (Figure 13, item 5, p.22)
5. tell the model that regenerating a listed step “will cause backtracking and early termination of your proof search” (Figure 13, item 4), and likewise for repeating a failed last step (item 5)

The paper's worked case is Figure 18 (p.27): for the goal `n = 70` the prompt shows four incorrect steps (with an elision marker among them), the last step's error is “invalid type ascription”, and GPT-4's next answer is the one the paper presents as correct (the proof is in Figure 7).

Verus form. Inference: key the dictionary by the hash of the file text, and store each rejected edit with the first line of its Verus error. In the prompt, list them under one heading above the current function. Nothing in the idea depends on tactics.

evidence: the paper has no ablation that removes only the dictionary. Its indirect evidence is speed of failure: “The use of a failure dictionary (see Section 3) enables fast failure (see Table 3) which helps in using more strategies along with COPRA within the 60 queries cap and 10-minute timeout.” (Appendix A.1.1, p.14). Table 2 (p.15) gives 28.23 queries on average for a failed COPRA run without retrieval, under the cap of 60.

where it fails: the dictionary is exact-match on tactic text. Inference: a model can restate a failed step with different spacing or an equivalent lemma and evade it; the paper does not discuss this.

## technique 3: symbolic progress check against the stack

what it is: a partial order on states saying one state is at least as hard as another. A tactic whose result is at least as hard as a state already on the stack is rejected, although the proof assistant accepted it.

when to use: search over steps that can undo each other or add nothing, such as rewriting back and forth.

how it is done (Section 3, “Progress Checks”, p.4):
1. for non-error states O1 and O2, define O1 ⊒ O2 to hold when every obligation (g, h) in O2 has an obligation in O1 with the same goal and a subset of the hypotheses
2. after executing a tactic, compare the new state O' with every state O'' on the stack
3. if O' ⊒ O'' for some O'', treat the tactic like an error: add it to `Bad(O)` and do not recurse (Figure 3, lines 9 and 10)

“Intuitively, O1 ⊒ O2 if for every obligation in O2 , there is a stronger obligation in O1 .” (Section 3, p.4). The check comes from Sanchez-Stern et al. (2020), the PROVERBOT9001 paper.

Verus form. Inference: Verus does not print hypotheses, so only the goal half of the order carries over. Take the set of failing obligations (file line plus kind: assertion, postcondition, invariant at loop entry, invariant at loop end). Reject an edit when its failing set contains the failing set of some earlier file on the stack. This is weaker than the paper's check and can reject an edit that added a useful fact without yet closing anything; a looser variant rejects only on equality of the two sets.

evidence: none in isolation. The paper states the purpose, not a measurement: “Using our progress check, COPRA avoids cyclic tactic sequences that would cause nontermination.” (Section 3, p.4)

where it fails: the authors limit the claim themselves, saying the definition only removes the cases where goals match exactly and one hypothesis set contains the other (Section 3, p.4). A state that is harder in any other sense passes.

## technique 4: grammar-based prompt serialization with format repair

what it is: a fixed textual protocol in both directions. The agent prompt is generated from a context-free grammar; the answer must match a second grammar; a parser repairs or re-requests malformed answers.

how it is done:
1. system prompt: the rules and the answer grammar (Section 3, p.4; Figures 13 and 14)
2. agent prompt, as the system prompt describes it (Figure 13, p.22): `[GOALS]`, then per goal `[GOAL] i` and `[HYPOTHESES] i` with one `[HYPOTHESIS]` per line, optional `[DEFINITIONS] i` and `[THEOREMS] i`, then `[STEPS]` (the tactics that led here), optional `[INCORRECT STEPS]`, optional `[LAST STEP]` with `[ERROR MESSAGE]` or `[SUCCESS]`. The worked prompt in Figure 18 (p.27) shows goal, hypotheses, `[THEOREMS]`, `[INCORRECT STEPS]`, `[LAST STEP]`, `[ERROR MESSAGE]` and `[END]`, and shows no `[STEPS]` or `[DEFINITIONS]` block
3. trim the prompt so that the most relevant parts fit the context window (Section 3, p.4); the paper does not give the trimming rule
4. answer: `[RUN TACTIC]`, the tactic, `[END]` (Figure 13, p.22)
5. parse truncated answers too. “The grammar carefully incorporates cases when the response is incomplete because of the LLM’s token limits.” (Section 3, p.5)
6. on a format error, send `[ERROR]` with the offending text (Figure 13, item 6, p.22); PARSE TACTIC communicates with the LLM “multiple times until these errors are resolved” (Section 3, p.5)

After the first state the prompt holds the current goals, not the original theorem (Appendix A.1.4, p.16).

Verus form. Inference: the same keywords work with `[GOALS]` replaced by the Verus error list and the function text. The answer grammar should be one edit: a line anchor and the text to insert.

evidence: prompt size, Table 5 (p.23): miniF2F averages 322.61 tokens per prompt (maximum 1828); with retrieval 824.21; with retrieval and informal proof 955.20; CompCert with retrieval 3219.79 on average with a maximum of 116574. The weak-model result is attributed to this protocol: “We note that the use of GPT-4 seems essential, as weaker models like GPT-3.5 or CodeLlama have a reduced ability to generate responses following the specified output format.” (Section 4, p.7)

where it fails: the protocol is a filter on model quality as much as a technique. Inference: the CompCert maximum of 116574 tokens shows the trimming did not bound every prompt.

## technique 5: lexical lemma retrieval into the prompt

what it is: BM25 search for lemmas relevant to the current state, listed under `[THEOREMS]` with name and statement.

when to use: the proof needs library facts whose exact names the model misremembers.

how it is done (Section 4, p.6):
1. choose the database: mathlib for Lean; for Coq, the CompCert training split that accompanies the test theorems
2. at each state, run BM25 with the state as the query (Figure 3, line 2). The paper does not say which text forms the query or how many results are kept
3. print each hit as `[THEOREM] name : statement` (Figure 18, p.27)
4. warn the model to use a listed theorem only if it applies (Figure 13, item 2, p.22)

The paper's example is `mathd_numbertheory_100` (Figure 7, p.9): BM25 returned `pnat.gcd_mul_lcm` (listed first under `[THEOREMS]` in Figure 18), and the proof that worked rewrites with `nat.gcd_mul_lcm`. “It is important to note that just retrieving the correct lemma is not sufficient, but knowing how to use it correctly is equally important.” (Figure 7 caption, p.9). Inference: the retrieved lemma is over positive naturals (N+) and the goal is over naturals. Three of the four failed steps shown, and the failed last step, use the retrieved `pnat.` name (Figure 18).

Verus form. Inference: index the signatures of `vstd` lemmas (name, `requires`, `ensures`) and of the project's own `proof fn` items, query with the failing assertion's text, and list the hits. A hit is used by calling the lemma inside a `proof { ... }` block or by `broadcast use` where the lemma is a broadcast one.

evidence: Table 1 (p.7), miniF2F-test, 244 theorems, 60 queries: 26.63% without retrieval, 29.09% with it. Inference: 65 and 71 of 244, so retrieval adds 6 theorems. The 29.09% row is a staged run (technique 7), so it contains every theorem the first stage proved. “Retrieval reduces the tendency of the model to hallucinate the lemma names and provides the model with existing lemma definitions it otherwise may not have known.” (Section 4, p.8)

where it fails: “While extra lemmas are often useful, the addition of extra information from retrieval may also be misleading because the retriever can find lemmas that are not relevant to proving the goal, so the best performance is acquired by using the different capabilities in the manner we describe.” (Appendix A.1.1, p.14). Retrieval also costs queries: 37.88 on average per theorem against 21.73 without it (Table 2, p.15).

## technique 6: generated informal proof as global context

what it is: before the search, a separate few-shot call asks the same LLM for a natural-language proof of the informal statement; that text is put in every prompt of the search.

how it is done (Section 4, p.6; Appendix A.1.1, p.14):
1. take the informal statement that miniF2F supplies
2. generate an informal proof with a fixed few-shot prompt
3. add it to the global context χ, which Figure 3 passes to every prompt

when not to use it: the authors exclude it for Coq because CompCert has no informal statements, and say of sketch-based provers: “Moreover, the requirement for informal proofs in these approaches prohibits their application in the software verification domain, where the notion of informal proof is not well-defined.” (Section 5, p.10)

Verus form. Inference: for verified Rust the nearest input is a prose argument for why the loop invariant holds or why the postcondition follows, written before the search. The paper gives no evidence for that use.

evidence: Table 1 (p.7): 29.09% to 29.92% at 60 queries and 600 s. Inference: 71 to 73 of 244, 2 theorems. With 100 queries and 1200 s: 30.74%; Table 4 (p.17) confirms that count as 75.

where it fails: Appendix A.1.1 (p.14) says an informal proof can lengthen the formal one, for example by suggesting several rewrites where `linarith` suffices. Appendix A.1.5 (p.17) adds that informal proofs move the task towards autoformalization, since the LLM has likely seen natural-language proofs of these problems.

## technique 7: cheap-first staging under one budget

what it is: run the cheapest configuration first and spend the rest of the same budget on richer ones only for unsolved theorems.

how it is done: “Therefore, we first try to find the proof without retrieval, then with retrieval, and finally with informal proofs (if available) only when we fail with retrieval.” (Appendix A.1.1, p.14). The 60 queries and the 10 minutes are shared across the stages (same paragraph). A stage ends early when its search backtracks out of all options (Section 4, p.6).

Verus form. Inference: carries over unchanged; order the stages by prompt length.

evidence: the paper gives no per-stage solved counts beyond the three Table 1 rows, so the cost saving is not quantified.

## technique 8: pass@k-with-n-queries

what it is: a metric that fixes both the number of independent attempts k and the number of model queries n per attempt. “Here, we measure the number of correct proofs that a prover can generate given k attempts, each with a budget of n queries from the LLM or neural model.” (Section 4, p.6)

how to apply: report k × n and the wall-clock limit beside every success rate, as Table 1 does: COPRA 1 × 60 (600 s); REPROVER 1 × 3751; LLEMMA 1 × 3200.

evidence that it tracks time: on proofs that succeed, REPROVER with retrieval averages 122.62 queries and 301.20 s; COPRA with retrieval averages 7.38 queries and 117.85 s (Tables 2 and 3, p.15). Inference: 16.6 times fewer queries and 2.6 times less time, which the paper rounds to 16x and almost 3x (Section 4, p.7).

limits: PROVERBOT9001 is not compared on time because it has no timeout-based search (Appendix A.1.2, p.15). Inference: with retrieval, a COPRA run that fails takes 678.51 s on average (Table 3), above the stated 600 s limit; the paper does not explain this.

## technique 9: leakage audit by comparing found proofs with published ones

what it is: classify each proof the agent found by whether the benchmark repository holds a proof of that theorem and how the two differ.

how it is done (Appendix A.1.4, p.16; Table 4, p.17):
1. split the 244 theorems: 80 have a proof in the repository, 164 have only `sorry`
2. bin the 80 by shape: single-tactic `linarith` (11), `norm_num` (12), `nlinarith` (2); two tactics (16); longer or complex (39)
3. for each found proof, record exact match, first-tactic match, or distinct

results, COPRA with GPT-4, retrieval and informal proofs, 75 proofs: 22 exact matches, of which 17 are single-tactic and 5 are two-tactic and none is among the 39 long ones; 19 are for theorems with no published proof; 53 of 75 (70.67%) are distinct or have no published counterpart; 53 of 58 (91.37%) once the 17 exact single-tactic matches are set aside.

Verus form. Inference: the audit applies to any agent evaluated on public Verus benchmarks: diff the produced proof annotations against the repository's reference proofs and report the exact-match share.

limits: Inference: a distinct proof text does not show the model had not seen the theorem; the audit bounds copying, not familiarity.

## where COPRA's text and tables disagree

- Section 4 (p.9) and Appendix A.1.4 (p.16) say 91.93%; Table 4 (p.17) prints 53 / 58 and 91.37%. 53/58 = 91.38%, so the text's figure is wrong
- Table 4's caption names COPRA with GPT-4, retrieval and informal proofs, a name two Table 1 rows share. Inference: its total of 75 proofs matches 30.74% of 244, the 100-query, 1200 s row; the 60-query row at 29.92% would be 73
- Appendix A.1.4 (p.16) cites Table 2 for the CodeLlama gain of “about 5%”; Table 2 has no CodeLlama row. The numbers are in Table 1 (0.0% few-shot, 5.73% with COPRA), and that COPRA row used 500 queries, not 60
- the abstract claims COPRA beats REPROVER on pass@1. Inference: on 244 theorems the margins are a handful of problems. COPRA without retrieval at 26.63% is 65; REPROVER without retrieval at 22.13% is 54 and with retrieval at 25.00% is 61; LLEMMA-7b at 26.23% is 64, one theorem below COPRA without retrieval
- on Coq, 98 of the 118 theorems were chosen because PROVERBOT9001 proves them (the paper says “For fairness”), and COPRA proves 57 within 60 queries. Inference: the set is therefore not a random sample and says little about the 501-theorem set. The text claims only that COPRA “slightly outperforms” PROVERBOT9001 at the same number of queries (Section 4, p.9); Figure 16 (p.25) is a plot with no printed numbers, in which, read by eye, COPRA is ahead at every query count and the curves are about 57 and 54 at 60
- Section 4 (p.6) writes “Learn experiments” where Lean is meant

## how much COPRA threatens agent-written verified Rust

Inference: low as a competitor, high as a commodity. COPRA targets Lean 3 and Coq, proves 75 of 244 competition problems at best, and its only software-verification evidence is 57 of 118 CompCert lemmas, 98 of which were selected because PROVERBOT9001 proves them. It writes no specifications and no code. Its loop is simple enough that any competitor can reimplement it (not checked against the released code), so a product cannot be defended by it.

## techniques for the catalog

- stepwise LLM depth-first proof search: ask the model for one proof action, execute it in the checker, recurse on success and pop after a fixed number of failed tries
- failure dictionary in the prompt: store per state the actions that errored or made no progress and list them to the model as steps not to regenerate
- stack progress check: reject an accepted step when the resulting obligations are at least as hard as those of a state already on the search stack
- grammar-bound prompt protocol: serialize goals, hypotheses, past steps, failed steps and the last error under fixed keywords, and re-ask until the answer parses as one action
- single-action rule with no admit: forbid whole proofs and placeholder tactics in the system prompt so that every step is checked before the next is written
- BM25 lemma retrieval per state: search a lemma library with the current state and print name and statement of the hits in the prompt
- informal proof as global context: generate a prose proof once and include it in every search prompt, where an informal statement exists
- cheap-first staged ensemble: run the shortest-prompt configuration first and spend the remaining shared budget on retrieval and hints only for unsolved goals
- pass@k-with-n-queries: report attempts times model queries with the time limit beside each success rate
- proof-overlap leakage audit: compare each found proof with the published one by exact match, first step and shape, and report the share that is not a copy
