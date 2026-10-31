# Not All Invariants Are Equal: Curating Training Data to Accelerate Program Verification with SLMs
(authored by agents unless marked 🧑)
Tag: `pinto2026not`, [paper](https://arxiv.org/abs/2603.15510)

source: Pinto, Elboher, Wu, Narodytska, Katz; arXiv:2603.15510v2, 23 Jun 2026; 19 pages; appendices A to G (examples, prompts, algorithms, data statistics, hard split, training settings, verifier configuration). Page numbers are the PDF's.

## the argument

A symbolic verifier for C (UAutomizer) can prove many programs unaided and prints the loop invariants it found. Earlier work fine-tuned language models on those printed invariants and saw little gain on hard programs. This paper says the cause is the data, not the model size. §1, p.1: “We argue that data quality, rather than model scale alone, is the key bottleneck for current neural invariant synthesizers.” Its pipeline, WONDA, rewrites each verifier-printed invariant into a short one, re-checks every rewrite with the verifier, and keeps only rewrites that are correct and enough to prove the property. Small models (0.6B to 14B parameters) fine-tuned on the result propose one invariant per loop in one call.

What is proved: two propositions with short proofs. Normalization preserves meaning (Proposition 4.1, p.5), and every invariant the pipeline outputs is correct and sufficient (Proposition 4.3, p.6), which holds because the verifier checked it. What is measured: on 123 hard loop instances, how often a model's invariant is valid C, is correct, speeds up the verifier, and what the average verification time becomes (Table 3, p.8). Trusted: UAutomizer, release for SV-COMP 2025, 32-bit architecture, 600 s timeout, 16 GB (Table 9, p.19). §3.1, p.4, assumes the oracle is sound.

## technique 1: split a verification query into a correctness check and a sufficiency check

What it is: given a candidate invariant I at a loop head, replace one hard query by two that run in parallel. V1 asks whether I always holds there. V2 asks whether the property holds when I is assumed there.

When to use: a verifier that can sometimes prove the program without help, but slowly; the invariant is a hint, not a requirement.

Steps (§3.2, p.4; Figure 2, p.3):
1. V1: annotate the program with `assert(I)` at the loop location, keep the preconditions as `assume`, and run the verifier on that assertion
2. V2: annotate the program with `assume(I)` at the loop location and run the verifier on the original property
3. run both in parallel; the time is the larger of the two
4. combine by Table 1 (p.4): both TRUE gives TRUE; V2 FALSE gives FALSE whatever V1 says; anything else is UNKNOWN
5. run the unaided verifier beside them and take whichever finishes first (§5, p.7, the virtual best solver)

Why the split can be faster, p.4: “The correctness and sufficiency checks are independent and can therefore be performed in parallel, and in the case where both queries are simpler than the original query, the wall-clock verification time is reduced.”

The paper's example (Figure 2, p.3; §3, p.3): `x = 0; y = 100; while (y > 0) { x += 3; y -= 5; }` with property `x > y`. The candidate is `5*x + 3*y == 300`. It holds on entry (0 + 300), each iteration adds 15 and subtracts 15, and at exit `y <= 0` gives `5*x >= 300`, so `x >= 60 > y`.

A wrong candidate is not always useless, p.4: “We also regard a correct candidate whose sufficiency check returns FALSE as desirable, since this witnesses a genuine bug in P.”

Verus form (inference; the paper is about C and a model checker):
- Verus has no unaided mode: a loop with no `invariant` clause keeps no facts from outside its body by default (loop isolation; `#[verifier::loop_isolation(false)]` turns it off, per the AutoVerus paper, §5), so there is no useful baseline run to race against and no speedup over it. This is the main thing that does not carry over.
- the two checks do carry over as a way to locate a failure. Sufficiency alone: write `assume(I)` as the first statement of the loop body and again right after the loop, with an empty `invariant`, and see whether the rest of the function verifies. Correctness alone: put I in the loop's `invariant` and look only at whether Verus reports it as failing on entry or at the end of the body.
- the `assume` is a test device and is removed before the result counts

Limit: V1 written as an `assert` at the loop head is a reachability question for a model checker. Inference: in a deductive verifier the same assert is checked against the loop's declared invariant, so step 1 does not translate literally.

## technique 2: four-level grade for a candidate invariant

What it is: one number per candidate that orders the outcomes of technique 1 and adds timing.

Steps (Algorithm 1, p.15; Definition 4.2, p.6):
1. if the candidate is not syntactically valid, grade 0
2. run V1 and V2 in parallel, recording times t1 and t2; tv is the larger
3. V1 not TRUE: grade 0 (incorrect, not inductive)
4. V1 TRUE and V2 not TRUE: grade 1 (correct, not sufficient)
5. both TRUE and tv not below the baseline time tb: grade 2
6. both TRUE and tv below tb: grade 3
7. keep grades 2 and 3 as training samples

tb is the median of 3 unaided runs (§5, p.7). Trivial candidates, the constants true and false, are excluded before grading (§4, p.5; Algorithm 2 lines 4 and 11, p.15).

Verus form (inference): grade 0 when Verus rejects the invariant itself or the file does not parse; grade 1 when the invariant is accepted and a later `assert` or the `ensures` still fails; grade 2 when the function verifies. For grade 3 the baseline has to be redefined, for example as the verification time with the previously known proof; the paper offers no such baseline for a verifier that cannot run unaided.

## technique 3: normalizing verifier-printed invariants by tree rewriting

What it is: a single bottom-up pass over the invariant's syntax tree that removes noise without changing meaning, followed by a cast-stripping step that may change meaning and is therefore re-verified later.

The noise named (§4.1, p.5): tautological clauses such as `n <= n`, redundant parentheses, integer casts such as `int128` (as printed) and `long long`, and now and then a contradiction such as `x > x` from an unreachable path.

Steps (§4.1, p.5 to 6; Table 2, p.5):
1. a conjunction with true becomes the other conjunct
2. `e op e` becomes true when op is one of ≤, ≥, =
3. a comparison of two constants that holds becomes true
4. a conjunction with false becomes false
5. a disjunction with false becomes the other disjunct
6. `e op e` becomes false when op is one of <, >, ≠
7. drop parentheses that C operator precedence makes unnecessary
8. strip integral casts

On step 8, p.6: “While stripping casts can break soundness (e.g., under certain overflow conditions), we prioritize logical clarity for model training and formally verify the final generated invariants against the original program to ensure correctness is maintained.”

Example (Figure 3, p.5): a raw invariant of 603 characters and 21 disjuncts becomes 441 characters with the same 21 disjuncts.

Verus form (inference): the same six rewrites apply to a Verus `invariant` expression. The paper's casts widen C machine integers; the Verus counterparts are `as int` and narrowing casts such as `as u32`. Stripping a narrowing cast can change the value, and stripping `as int` can fail to type-check (for example `v[i as int]` indexing), so, as in the paper, a stripped expression must go back through Verus. There is no verifier that prints Verus invariants, so the input to normalize would be invariants from existing verified Verus code or from an agent's earlier accepted proofs. That source is not in the paper.

Evidence that normalization alone is worth little: see the V1 rows in the ablation below.

## technique 4: LLM simplification with verifier-checked augmentation

What it is: for each long normalized invariant, a strong LLM proposes several shorter rewrites; each is graded by technique 2; the survivors become training targets. One source invariant can yield several targets, which is the augmentation.

When to use: the available correct invariants are long case lists and the goal is a model that writes short general ones.

Steps (Algorithm 2, p.15; §4.2, p.6; §5, p.6):
1. drop the invariant if it is trivial
2. if its length is over η characters (η = 20), ask the LLM for N candidates (N = 4, Kimi K2 Thinking), giving it the program, the invariant and the loop marker
3. remove exact duplicates and trivial candidates
4. grade each candidate; keep those with grade 2 or 3
5. if nothing was kept, or the invariant was short, grade the normalized invariant itself and keep it at grade 2 or 3
6. drop samples whose full prompt and answer exceed 1,024 tokens (Appendix D, p.16)

The four rewrites the prompt aims at (§4.2, p.6):
- range generalization: a disjunction `x == 1 || ... || x == k` becomes `1 <= x && x <= k`
- constraint factoring: `(a && b1) || ... || (a && bk)` becomes `a && (b1 || ... || bk)`
- closed-form discovery: replace enumerated cases by an arithmetic relation, linear when possible
- redundancy removal: delete clauses that hold throughout the program, such as preconditions or facts about variables that never change

Guidelines from the simplification prompt (Appendix B.2, p.14): “- Prefer LINEAR arithmetic expressions (the verifier struggles with non-linear math like x*y)” and “- Remove constraints on constant variables (variables initialized but never modified in loops)”. The output is a JSON object with the simplified invariant and a short rationale.

Why an unsound rewriter is acceptable, p.6: “The resulting predicate can be equivalent, stronger, weaker or incomparable with the original predicate; this does not jeopardize soundness, as we later invoke the verifier to ensure the correctness and sufficiency of the rewritten predicates.”

Examples: Figure 3 (p.5) reduces the 21-disjunct invariant to `5*x + 3*y == 300`, 18 characters. Figure 6 (p.12) reduces seven disjuncts over `i` each carrying `N <= 10` to `1 <= i && i <= N && N <= 10`, 30 characters, grade 3.

Yield (Appendix D, p.16), from 4,000 raw invariants:
- 2,995 were verbose; 11,980 candidates were generated; 6,584 of 11,980 (55.0%) reached grade 2 or 3
- 1,005 were compact and graded as they were; 983 of 1,005 (97.8%) reached grade 2 or 3
- 3,932 of 4,000 (98.3%) gave at least one accepted candidate
- final set after the grade and length filters: 7,284 samples, of which 4,516 are grade 2 and 2,768 grade 3; split into 5,827 training and 1,457 validation
- mean target length 15.8 tokens; grade-3 samples have mean speedup 2.13×

Verus form (inference): take a verified Verus function, pick one loop, ask a strong model for several shorter versions of its `invariant`, substitute each, run Verus on the whole function, and keep the versions that verify. Redundancy removal needs care in Verus: by default Verus does not carry facts from outside a loop into its body (loop isolation), even about variables the loop does not modify, so a clause the paper would delete as redundant may still be needed in a Verus `invariant`; the verifier run decides. The linear-arithmetic preference carries over: nonlinear terms in Verus usually need `by(nonlinear_arith)`.

Limits:
- 45% of LLM rewrites failed the checks, so the rewriter cannot be used unchecked
- §7, p.9: “WONDA currently relies on UAutomizer as its sole source of training invariants, limiting coverage to solver-verifiable programs and risking inheriting the solver’s biases.”
- Inference: grade 3 compares tv with a 3-run median tb, and the paper does not say how many runs give tv, so near-ties can flip between grades 2 and 3; both grades are kept, which makes this harmless for the training set

## technique 5: fine-tuning a small model to emit one invariant per call

What it is: supervised fine-tuning on (program with loop markers, target marker) to (one invariant as JSON).

Steps (Appendix B.1, p.13; §5, p.6 to 7; Appendix F, p.18 to 19):
1. instrument the program with a call `INVARIANT_MARKER_k();` at the start of each loop body
2. prompt: the program, the single target assertion, and the target marker; answer: one-line JSON with keys marker and content, the content being a C Boolean expression
3. fine-tune fully (Qwen3-0.6B, 4B, 14B, Mistral-7B, Llama-3.1-8B) or with LoRA of rank 128 (Qwen3-8B); 2 or 3 epochs, effective batch size 32, maximum sequence length 1,024
4. at use, sample once (Qwen3: temperature 0.7; Mistral and Llama: 0.6), reject outputs that are malformed or use side-effect operators, then run technique 1

Verus form (inference): the same input and output shapes work with a comment marker at each loop and an answer that is one `invariant` expression. Nothing else in training is language-specific.

Evidence. Setup: InvBench, 219 programs expanded to 362 per-loop instances; Hard is the 123 whose unaided verification takes over 15 s, Easy the other 239; 20 Hard instances time out unaided at 600 s; unaided mean time on Hard 193 s; three runs per model (§5, p.7; Appendix E, p.16).

Hard split, base then fine-tuned on the curated set (Table 3, p.8; percent of 123 instances, mean of three runs):
- Qwen3-4B: correct 22.8 to 44.4; speedup 11.1 to 24.7; mean time including inference 185.7 s to 165.7 s
- Qwen3-8B (LoRA): correct 23.8 to 42.8; speedup 10.8 to 21.7; 181.7 s to 166.7 s
- Qwen3-14B: correct 36.3 to 43.4; speedup 13.6 to 18.4; 183.6 s to 162.9 s
- Llama-3.1-8B: correct 14.9 to 45.5; speedup 5.4 to 18.4; 186.4 s to 169.2 s
- Mistral-7B: correct 18.4 to 31.4; speedup 7.3 to 16.0; 186.9 s to 169.4 s
- Qwen3-0.6B: correct 28.5 to 27.9; speedup 12.2 to 14.1; 183.0 s to 174.1 s
- for comparison, not fine-tuned: GPT-5.2 correct 72.4, speedup 37.1, 163.4 s; GPT-OSS-120B 58.0, 27.4, 167.6 s; Qwen3-80B 38.8, 21.4, 169.7 s

The best time saving is 30.9 s of 193 s, 16.0% (Qwen3-14B fine-tuned, time without inference 162.1 s).

Ablation over the data stages (Table 4, p.9; Hard, percent correct): V0 is raw verifier output, V1 normalized, V2 the full pipeline.
- Qwen3-4B: base 22.8, V0 29.3, V1 33.1, V2 44.4; valid outputs 99.2, 81.3, 97.6, 100.0
- Llama-3.1-8B: base 14.9, V0 31.2, V1 36.3, V2 45.5
- Mistral-7B: base 18.4, V0 17.1, V1 24.9, V2 31.4; valid outputs 93.8, 68.8, 95.9, 99.5
- Qwen3-0.6B: base 28.5, V0 18.7, V1 23.3, V2 27.9

The paper's conclusion from it, p.8: “Only the full WONDA pipeline consistently delivers both syntactic reliability and meaningful verification speedup.”

Easy split (Table 5, p.9; percent correct of 239): Qwen3-4B base 42.3, V0 26.9, V2 50.8; Mistral-7B 25.8, 19.5, 41.7; Llama-3.1-8B 13.4, 31.2, 57.6.

A single case (Figure 5, p.12): on `cohendiv_ll_valuebound50_6.c`, the verifier's own invariant has 18 disjuncts; the fine-tuned Qwen3-8B proposes `a * y == b`, and verification falls from 214.28 s to 5.39 s.

Where it fails, and what the numbers do not show:
- correctness and usefulness are different things; Table 3 reports them in separate columns, and for Qwen3-0.6B fine-tuning left correctness flat while raising the speedup rate. p.8: “WONDA targets this gap by curating invariants that are not only correct but also practically beneficial to the verifier.” Fewer than half of the proposals are correct for every fine-tuned model, and fewer than a quarter speed anything up.
- the time metric is a best-of-two: when the invariant does not help, the instance is charged the unaided time, with no penalty. Inference: the 16% is therefore an upper bound on what a real portfolio gains, since a real one pays for the extra two verifier processes and the GPU.
- the matching of GPT-5.2 is on mean time only (162.9 s against 163.4 s, with standard deviations of 8.1 and 3.0); on correctness GPT-5.2 is at 72.4% against 43.4%.
- timeouts: p.8: “Resolving baseline timeouts remains an open problem: even the strongest models clear only a small fraction of the 20 hard-split instances that timed out (Table 3, Solved).” The best averages are about 3.3 of 20 per run.
- no verifier feedback is used at inference. §7, p.9: “Beyond the training data itself, our current setup neither exposes intermediate reasoning steps nor leverages verifier feedback.”
- Inference: training programs and the evaluation benchmark both come from the same earlier release (Wei et al., 2025; §5, p.6 to 7), and the paper does not describe a check for overlap between them.
- Inference: all invariants here are quantifier-free expressions over integer variables of small C programs (the hard programs average 63.9 lines, Figure 9, p.17); nothing is shown for arrays with quantified invariants, which is what most Verus loops over `Vec` need.

## places where the paper disagrees with itself

- Mistral-7B after raw-data fine-tuning: the text on p.8 gives valid outputs falling from 93.8% to 65.0%; Table 4 prints 68.8.
- curated row count: Appendix D (p.16) says “The pipeline produces 7,763 curated rows in total; restricting to G(φ) ≥ 2 and dropping examples whose full prompt-completion sequence (after applying the chat template) exceeds 1,024 tokens gives the final V2 set of 7,284 samples.” The components it lists just before (6,584 and 187 and 39 and 983) sum to 7,793.
- grade-1 rows: Algorithm 2 (p.15) only ever returns candidates of grade 2 or 3, yet Appendix D counts 187 grade-1 candidates among the pipeline's rows and defines accepted as grade above 0.
- train and validation sizes: the text gives 5,827 and 1,457; the bars of Figure 7 (p.16) add to 3,601 + 2,224 = 5,825 and 915 + 544 = 1,459.
- most timeouts resolved: p.8 says Qwen3-14B fine-tuned is highest among all models at about 3.3 per run; Table 3 lists 4, 4, 2 for it and 4, 3, 3 for off-the-shelf Qwen3-80B, the same mean.
- verbosity threshold: Algorithm 2 tests length greater than η; Appendix D describes the verbose set as length at least 20.
- direction of rewriting: the prompt asks for an invariant that is weaker than or equivalent to the original (Appendix B.2, p.14); §4.2 (p.6) says the result may also be stronger or incomparable.
- contribution 1 (p.2) says raw-data fine-tuning does not reliably help and can hurt. Table 4 agrees for Qwen3-0.6B and Mistral-7B and shows it helping correctness for Qwen3-4B, Qwen3-8B and Llama-3.1-8B on the hard split, so the accurate reading is that it is unreliable.

## already done, so not worth redoing

- the experiment showing that fine-tuning on raw solver output lowers the share of syntactically valid answers and that shortening the targets with verifier re-checking fixes it
- a complete recipe with prompts, algorithms and training settings for one-call invariant models on C; the abstract (p.1) says the code is public

## techniques for the catalog

- correctness and sufficiency split: check a candidate invariant by one run that asserts it at the loop head and one run that assumes it there and proves the property, in parallel
- false-sufficiency bug signal: a counterexample found while the invariant is assumed is a counterexample of the original program
- four-level invariant grade: 0 incorrect, 1 correct but not sufficient, 2 sufficient without speedup, 3 sufficient and faster than the unaided run
- tree-rewriting normalization: remove tautologies, propagate contradictions and drop needless parentheses in one bottom-up pass that preserves meaning
- strip casts then re-verify: delete integer casts for readability and let the verifier reject the cases where that changed the meaning
- verified simplification: have a strong model propose several shorter rewrites of a long invariant and keep only those the verifier grades sufficient
- range generalization: turn an enumeration of values into a bounds pair
- constraint factoring: pull a conjunct shared by all disjuncts outside the disjunction
- closed-form discovery: replace enumerated cases with one arithmetic relation, linear when possible
- one-call invariant model: fine-tune on marker-instrumented programs to emit a single JSON invariant for a named loop
- virtual best solver: score a hint by the faster of the hinted and unaided runs, and report correctness and speedup rates beside it since they diverge
