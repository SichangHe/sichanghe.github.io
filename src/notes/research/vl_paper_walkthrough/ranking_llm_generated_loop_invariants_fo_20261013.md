# Ranking LLM-Generated Loop Invariants for Program Verification
(authored by agents unless marked 🧑)
Tag: `chakraborty2023ranking`, [paper](https://arxiv.org/abs/2310.09342)

Audit: audited 2026-10-13 against the paper; rechecked every number of Tables 1 to 5 (and every V@K percentage against its fraction), the quotations, page and section references, the FiB-8 example and the listed inconsistencies; no wrong number or reference found; added Inference labels to seven unmarked statements (decidability limit, sources of training data, gpt-4 count, user-time gloss, sampling-cost claim, equivalence time-out, repeat share), widened-claim fixes for the training sources and for single-loop integer problems; the Verus FiB-8 code was not run and its mixed usize/u64 comparison in requires is unchecked.

source: Chakraborty, Lahiri, Fakhoury, Musuvathi, Lal, Rastogi, Senthilnathan, Sharma, Swamy (Microsoft Research), arXiv:2310.09342v3 (12 Feb 2024), 12 pages with appendices A to E. Code and data: https://github.com/microsoft/NeuralInvariantRanker

earlier notes: `topic_studies/formal_verification_rust/llm_for_verification/invariants_models_autoformalization.md` lists this paper as "opened abstract only"; `distributed_verification_db/leads_to_read.md` lists the title. Everything below is new to the notes.

## the question, the measurement, the trusted part

Setting: an LLM is asked many times for a loop invariant; each answer is checked by an SMT-based verifier; most answers are wrong. The paper asks whether a learned ranker can reorder the answers so that a correct one is checked early. The paper's claim: "Experimental results demonstrate that this re-ranking mechanism significantly improves the ranking of correct invariants among the generated candidates, leading to a notable reduction in the number of calls to a verifier." (Abstract, p.1)

Measured: for each problem that an LLM did solve within 10 minutes, the position of the first verified invariant in the list under seven orderings, and the share of problems whose verified invariant is within the first K (Table 1, p.4); wall-clock time (Table 2, p.8); the same after removing semantically duplicate candidates (Table 3, p.8).

Trusted: Z3 decides whether an invariant is correct. The ranker only changes the order of checking. Inference: a wrong ranker costs time and never soundness, because every reported invariant has still passed the three checks below.

## technique 1: the three-check definition of a sufficient inductive invariant, reduced to SMT

what it is: the standard correctness condition for a loop `while b do S` with precondition `pre` and postcondition `post`. An invariant i is acceptable when three Hoare triples hold (Equation (1), Section 3.1, p.2): `{pre} skip {i}`, `{i ∧ b} S {i}`, `{i ∧ ¬b} skip {post}`. The paper's gloss: "The conditions respectively denote that the loop invariant i holds on loop-entry, is preserved by an arbitrary iteration of the loop and implies the post condition on exit." (Section 3.1, p.2)

when to use it: as the oracle that labels every candidate invariant correct or wrong, and as the diagnosis of which of three ways a candidate fails.

steps (Section 3.1, p.2):
1. write the loop-free body S in the grammar of assignments, `skip`, sequencing and `if`
2. turn each triple `{ψ} S {ϕ}` into the formula `ψ ⟹ WP(S, ϕ)`, where WP (weakest precondition) is defined by structure: assignment substitutes the expression for the variable in ϕ; `skip` leaves ϕ; sequencing nests, `WP(S1; S2, ϕ) = WP(S1, WP(S2, ϕ))`; a conditional gives the conjunction of `b ⟹ WP(S1, ϕ)` and `¬b ⟹ WP(S2, ϕ)`
3. hand the three formulas to Z3. The paper: "One can use a predicate transformer called weakest precondition WP to convert the Hoare-triple to a decidable SMT formula that can be checked by Z3." (Section 3.1, p.2)

In the experiments the loop is not given as source code. Each problem is a SyGuS file with three SMT functions, `pre_fun`, `trans_fun` (a relation between current and primed next variables) and `post_fun`, and the candidate is the body of `inv_fun` over the same variables (Figure 4, Appendix C, p.10).

Verus form (inference; the paper does not use Verus): Verus performs the same three checks for every `while` loop that has an `invariant` clause, and reports them as distinct errors: invariant not satisfied before the loop, invariant not satisfied at the end of the loop body, and a failed `ensures` or `assert` after the loop. A candidate that passes the first two but not the third is true but too weak; one that fails the first is false at entry; one that fails only the second is not inductive. The paper's worked problem, FiB-8 (Figure 4, p.10: start `i = 0, a = 0, b = 0, n >= 0`; each step with `i < n` adds 1 to `i` and adds either (1, 2) or (2, 1) to `(a, b)`; goal `a + b = n + n + n` on exit), could be written as below. This code was not run through Verus.

```rust
fn fib8(n: u64, pick: &Vec<bool>) -> (r: (u64, u64))
    requires pick.len() == n, n < 1000,
    ensures r.0 + r.1 == 3 * n,
{
    let mut i: u64 = 0;
    let mut a: u64 = 0;
    let mut b: u64 = 0;
    while i < n
        invariant
            i <= n,
            a + b == 3 * i,          // the gpt-4 invariant of Figure 6
            pick.len() == n,
            n < 1000,
        decreases n - i,
    {
        if pick[i as usize] { a = a + 1; b = b + 2; } else { a = a + 2; b = b + 1; }
        i = i + 1;
    }
    (a, b)
}
```

What changes: the SyGuS problem has unbounded integers and a nondeterministic step; Rust needs an explicit source of the choice (`pick`), a bound against overflow, and a `decreases`. What does not carry over: in the paper one formula is the whole proof of the loop. A Verus loop usually needs several invariant clauses plus facts about ghost state, `Seq` views and triggers, so a single candidate is rarely right or wrong in isolation.

limits: Inference: the formulas are decidable only for the theories the solver handles; Table 4 (p.9) says 496 of 541 problems (91.68%) are linear integer arithmetic, 27 (4.99%) non-linear, 18 (3.33%) arrays with linear integers. 496 + 27 + 18 = 541.

## technique 2: zero-shot sampling until one invariant verifies

what it is: call a general LLM repeatedly with the problem and a fixed instruction, check each answer, stop at the first verified one or at a time limit.

steps (Section 5.1, p.4, and Appendix C, p.10):
1. prompt: the SyGuS problem text, then an instruction. The paper's prompt asks to "Synthesize a necessary and sufficient invariant", fixes the first line of the answer to the `define-fun inv_fun` header with the problem's variables, and asks for the invariant alone inside code tags with no explanation
2. no examples are given: "Our objective was to assess the capabilities of these language models out-of-the-box, and thus we employed a zero-shot prompting approach." (Section 5.1, p.4)
3. sample for at most 10 minutes per problem or until a verified invariant appears

evidence: the benchmark is 940 SyGuS problems collected by Padhi et al.; 541 fit a context of 4096 tokens (3584 prompt, 512 generation). Within the 10-minute limit the outcome was "solving 250 problems by gpt-3.5-turbo, and 188 problems for gpt-4" (Section 5.1, p.4). Inference: that is 250/541 = 46.2% and 188/541 = 34.8% of in-scope problems, and 26.6% and 20.0% of all 940. Inference: the lower gpt-4 count need not reflect quality, since the footnote says "Note that the rate limit for gpt-4 was an order lower than gpt-3.5 in our usage resulting in an order less samples." (p.4)

How many samples it takes: in generation order, the first verified invariant sits at mean position 189.78, median 62.00 for gpt-3.5-turbo (over 250 problems) and mean 39.20, median 9.00 for gpt-4 (over 188) (Table 1, LLM-ranks rows, p.4). For FiB-8 the paper reports that gpt-3.5-turbo produced its correct invariant "after 144 unsuccessful attempts" and gpt-4 "after 2 unsuccessful attempts" (Appendix C, p.10). The two correct answers differ in form: gpt-4 gave `(and (<= i n) (= (+ a b) (* i 3)))`; gpt-3.5-turbo gave a disjunction of that with a second case for `i > n` (Figures 5 and 6, p.10).

Verus form (inference): the same loop is the baseline every Verus proof agent already runs: sample `invariant` clauses, run Verus, stop on success. The number to carry over is the shape of the distribution, not its value: the median is far below the mean, so a few problems consume most verifier calls.

limits, stated by the paper: one sampling run per model, and "we observe unstable generation from the LLM" (Limitations, p.6).

## technique 3: iRank, a contrastive re-ranker over frozen embeddings

what it is: a small trained network that scores a (problem, candidate invariant) pair; candidates are checked in descending score. Constraint to satisfy: every verified invariant of a problem scores above every wrong one of that problem (Section 4, p.3).

when to use it: candidates are cheap to generate in bulk, each verifier call is costly, and there is a labelled history of verified and rejected candidates for similar problems.

training steps (Section 4, p.3; Appendix A.1, p.8; Table 5, p.9):
1. collect a dataset of triples: a problem p, a set of verified invariants, a set of wrong invariants. Each problem needs "at least one correct invariant and a set of incorrect invariants, all expressed in the SyGus format" (Appendix A.1, p.8). Sources (the paper says "such as"): "different generations from LLMs, and invariants generated by LoopInvGen" (Section 5.1, p.4)
2. embed the problem text and each invariant text with one frozen embedding model, `text-embedding-ada-002` (dimension 1536) or `davinci-similarity`
3. pass both embeddings through the same learnable non-linear map Ψ, a three-layer fully connected network whose hidden size equals the embedding dimension
4. score = absolute cosine similarity between the transformed problem vector and the transformed invariant vector; target 1 for a verified invariant, 0 for a wrong one. "We optimize the mean squared error loss to learn the parameters in Ψ." (Section 4, p.3)
5. hyperparameters (Table 5, p.9): Adam, 20 epochs, weight decay 0.001, maximum gradient norm 1.0, linear schedule, 500 warmup steps
6. to keep test problems out of training: "We divided the problems into five folds and trained 5 different rankers, one for each fold." (Section 5.1, p.4)

ranking steps (Appendix A.2, pp.8–9): embed the problem and all candidates with the same embedding model; transform with the trained Ψ; compute the similarity of each candidate to the problem; sort; then, per Section 5.1, "sequentially attempt to check invariants from a ranked list" (p.4).

A property the authors stress: the ranker "does not require a program verifier at the inference time", which matters "for scenarios where the verifier is semi-automated" (Section 2, p.2; the paper names Dafny and F* as examples). Inference: that is the setting where a person sits through each failed attempt; Section 3.2 (p.3) says an incorrect invariant "would take up valuable user time".

evidence, ranks and V@K (Table 1, p.4; V@K is the percentage of problems whose verified invariant is in the first K; denominators 250 for gpt-3.5-turbo, 188 for gpt-4, by inference from Section 5.1):
- gpt-3.5-turbo candidates, mean / median rank of the verified invariant, then V@1 / V@5 / V@10
  - generation order: 189.78 / 62.00; 5.2 / 11.6 / 18.4
  - expected under random order: 95.35 / 31.02; 8.0 / 19.2 / 25.2
  - TF-IDF text similarity: 103.45 / 24.00; 17.6 / 32.0 / 38.8
  - raw Ada embedding: 115.89 / 31.50; 11.2 / 21.6 / 30.0
  - raw Davinci embedding: 120.02 / 32.00; 10.4 / 20.8 / 33.6
  - iRank on Ada: 38.78 / 5.00; 28.0 / 51.2 / 60.8
  - iRank on Davinci: 34.48 / 4.00; 29.2 / 52.8 / 62.8
- gpt-4 candidates
  - generation order: 39.20 / 9.00; 17.6 / 40.4 / 51.6
  - expected under random order: 20.23 / 4.96; 31.9 / 52.1 / 65.4
  - TF-IDF: 24.16 / 3.00; 32.00 / 45.6 / 53.6
  - raw Ada: 20.69 / 5.50; 26.6 / 51.1 / 64.9
  - raw Davinci: 23.56 / 5.00; 27.7 / 52.1 / 63.3
  - iRank on Ada: 13.18 / 2.00; 44.7 / 74.4 / 81.4
  - iRank on Davinci: 11.96 / 2.00; 44.7 / 71.8 / 81.9
- inference, check of percentages against fractions: every gpt-3.5-turbo V@K value is a whole count over 250 (iRank on Davinci V@1 29.2% = 73/250). For gpt-4 most values match whole counts over 188 (44.7% = 84/188, 81.4% = 153/188), but the TF-IDF row does not: 32.00, 45.6 and 53.6 are whole counts over 250 (80, 114, 134) and not over 188 (nearest 60/188 = 31.9%, 86/188 = 45.7%, 101/188 = 53.7%); and 74.4% lies between 139/188 = 73.9% and 140/188 = 74.5%
- training is what helps, not the embeddings: "LLM-based embeddings standalone may not serve well for reranking verified invariants." (Section 5.2, p.5) Raw-embedding ranking and random order do not differ with statistical significance, and neither do the two embedding models (p-value > 0.1, Section 5.2, p.5)
- headline: with Davinci embeddings on gpt-3.5-turbo candidates, "With the contrastive training in iRank, the median rank is brought down to 4, showing a significant improvement." (Section 5.2, p.5)

evidence, wall-clock (Table 2, p.8; seconds per problem as mean / median, total = embedding + ranking + verification; 24-core AMD Epyc 7V13, 220 GB RAM):
- gpt-3.5-turbo candidates: generation order 7.33 / 2.23; expected random 3.67 / 1.12; TF-IDF 3.88 / 1.00; iRank on Ada 2.98 / 0.97; iRank on Davinci 10.93 / 3.68
- gpt-4 candidates: generation order 1.61 / 0.24; expected random 0.83 / 0.19; TF-IDF 0.81 / 0.12; iRank on Ada 0.71 / 0.16; iRank on Davinci 2.80 / 0.72
- so iRank on Davinci embeddings is slower in total than doing nothing, for both models, because embedding costs 9.17 s mean (gpt-3.5-turbo candidates) against a verification saving from 7.33 s to 1.28 s. The paper says so: "In contrast, the Davinci embedding in iRank is more expensive than the reduction in the verification time, resulting in a worse wall clock time performance than the LLM ranks." (Appendix B, p.9)
- inference: against a random shuffle, which needs no model, iRank on Ada saves 0.69 s mean on gpt-3.5-turbo candidates (3.67 to 2.98) and 0.12 s on gpt-4 candidates (0.83 to 0.71). A check here is cheap: 7.33 s mean verification over a mean of 189.78 candidates is about 0.04 s per candidate

Verus form (inference):
- problem text = the Verus function with its `requires`, `ensures` and loop, invariants removed; candidate text = one proposed set of `invariant` clauses
- labels come free from an agent's own logs: every Verus run on a candidate is a positive or a negative example; the paper's dataset has exactly that shape
- the economics differ in the direction that favours ranking: a Verus run takes seconds, not 0.04 s, so embedding cost is small relative to one saved call. That is a property of Verus, not a result of the paper
- what does not carry over: the paper ranks complete, standalone invariants for single-loop, mostly integer problems of one benchmark family, trains and tests on that family (five folds), and Table 4 (p.9) reports problems of at most 9 functions and 90 variables. Whether a ranker trained on such data orders Verus invariants over `Seq`, `Map` and ghost state is untested
- what does not carry over, second: an agent that reads the verifier's error and repairs the candidate uses information the ranker ignores. The paper's pipeline has no repair step; candidates are independent samples

where it fails or what it assumes:
- it assumes verifier calls dominate cost: "In this paper, we assumed the cost of calling LLMs is negligible compared to the cost of calling the verifier for checking an invariant." (Limitations, p.6) Inference: ranking needs the whole candidate list first, so all LLM sampling cost is paid before any check
- evaluation is only on problems where a verified invariant exists in the list (250 and 188). Inference: on a problem the LLM never solves, ranking saves nothing and the embedding cost is pure loss; the tables say nothing about the other 291 and 353 in-scope problems
- the paper declines a comparison with dedicated invariant synthesizers: "The goal of this paper is not to establish SOTA for loop invariant synthesis." (Limitations, p.6)
- individual failures exist: for the fourth example in Figure 8, "iRank could not make the correct invariant as the closest to the problem" (Appendix E, p.11)

## technique 4: cheap orderings to try before training anything

what it is: three orderings that need no training, used in the paper as baselines (Section 5.1, p.4): generation order; a random permutation; TF-IDF similarity, where "We use the textual similarity between the problem description and the candidate invariants for ranking."

how the random baseline is computed (Appendix D, p.10): shuffle the list many times and average the metrics; exact expectation over all permutations is too costly, so "we set the number of permutations to be 100 for estimating the expected rank metrics."

evidence (Table 1, p.4): generation order is the worst ordering measured. A random shuffle halves the mean rank for both models (189.78 to 95.35; 39.20 to 20.23). TF-IDF gives a better median than random for both (24.00 vs 31.02; 3.00 vs 4.96) and more than doubles V@1 on gpt-3.5-turbo candidates (17.6% vs 8.0%), with ranking time of 0.05 s mean (Table 2, p.8). The paper's results text does not discuss the TF-IDF rows.

Inference on why generation order is worst: the list ends at the first verified invariant by construction (sampling stops there), so in generation order the verified invariant is always last and its rank equals the list length; any shuffle moves it to the middle on average. That is consistent with expected mean ranks being about half the generation-order mean ranks (95.35 vs 189.78; 20.23 vs 39.20). The paper does not state this. If it holds, the comparison with generation order overstates what ranking gains in a live loop, where checking interleaves with sampling; the comparison with expected random order is the fair one.

Verus form (inference): before building a ranker, sort candidate `invariant` sets by word overlap with the function's `ensures` and loop condition, and remove duplicates. Cost is negligible and needs no data.

## technique 5: semantic de-duplication of candidates with one solver call per pair

what it is: remove candidates that are logically equivalent to an earlier candidate, so that the verifier never checks the same predicate twice in different syntax.

steps (Appendix B, pp.9–10):
1. two candidates over the same variables are equivalent when, for all values of the variables, one holds exactly when the other does
2. "For comparing equivalence of two candidate invariants, we make one call to the z3." (p.10)
3. each new candidate is compared with all earlier ones, which the paper counts as Θ(n²) Z3 calls

evidence (Table 3, p.8; "Original" vs "Deduplicated"):
- gpt-3.5-turbo candidates, expected random order: mean rank 95.35 to 65.24, median 31.02 to 24.07, V@10 25.2 to 31.2
- gpt-3.5-turbo candidates, iRank on Ada: mean 38.78 to 18.79, median 5.00 to 4.00, V@1 28.0 to 28.4, V@10 60.8 to 65.6
- second model, expected random order: mean 20.23 to 13.99, median 4.96 to 4.89, V@10 65.4 to 72.8; iRank on Ada: mean 13.18 to 8.73, median 2.00 to 2.00, V@1 44.7 to 46.8, V@10 81.4 to 86.7
- inference: the drop in expected mean rank from 95.35 to 65.24 suggests that on average roughly a third of the gpt-3.5-turbo candidates before the verified one were semantic repeats
- the ranker still helps on unique candidates: "Interestingly, even in the list of candidates where all candidates are semantically unique, iRank improves the rank of the correct invariant, resulting in higher V @K." (Appendix B, p.10)

Verus form (inference): write the two candidates as `spec fn` bodies returning `bool` over the loop's variables and ask Verus to prove a `proof fn` whose `ensures` states that the two return equal values for all arguments; success means duplicate. One Verus run per pair is expensive, so in practice a syntactic normal form (sorted conjuncts, canonical comparison direction) should remove most repeats first; that shortcut is not in the paper. Equivalence must be judged without the loop's context, as the paper does; two invariants that differ only on unreachable states are not merged.

limits: the quadratic number of equivalence calls can exceed the checks saved; the paper gives no timing for de-duplication. Inference: an equivalence query can itself time out for non-linear candidates.

## inconsistencies inside the paper

- Table 1(b) TF-IDF row has V@K values that are whole counts over 250, the gpt-3.5-turbo denominator, not over 188 (detailed under technique 3)
- Table 3(b) is captioned "Invariants generated by gpt-4-turbo" while its "Original" rows repeat Table 1(b), which is captioned gpt-4, and no gpt-4-turbo run is described
- embedding dimension of `davinci-similarity`: 12288 in Table 5 (p.9), 12188 in Appendix B (p.9)
- Appendix B reasons that Ada "is a smaller model compared to davinci-similarity", "thus requiring significantly longer time to embed an input sequence" (p.9); Table 2 shows the opposite direction for time (Ada 1.29 s mean, Davinci 9.17 s on gpt-3.5-turbo candidates), so the sentence's "thus" attaches to the wrong model
- the limitation sentence compares a thing with itself: "In the case where call to LLM is much more expensive than LLM, iRank will reduce the number of Z3 calls, but may not contribute to actual cost savings." (Limitations, p.6)
- similarity is "absolute cosine similarity" in Section 4 (p.3), "cosine similarity" in Appendix A.2 (p.9), and "Similarity (Dot Products)" in Figure 1 (p.3)
- Section 5.2 says raw embeddings are "slightly worse than expected ranks" (p.5). That holds for mean rank; for gpt-3.5-turbo candidates Table 1(a) shows raw embeddings ahead of expected random order on V@1, V@5 and V@10 (11.2 / 21.6 / 30.0 for Ada against 8.0 / 19.2 / 25.2)
- "Number of Z3 calls" is defined as the third metric (Section 5.1, p.4) but appears only as a plot (Figure 2, p.5); no table gives its values, and the paper does not say how many Z3 calls one candidate check makes
- Table 4 (p.9) labels six operator shares as "of all operators"; conjunctions 43%, disjunctions 20% and negations 37% already sum to 100%, and addition/subtraction 43%, multiplication/division 3.1% and comparison 88.5% are listed under the same label

## already done here, so not to redo

- a learned re-ranker for LLM invariant candidates on SyGuS integer-loop problems, with code and data released: done
- the finding that off-the-shelf text embeddings, untrained, rank no better than a random shuffle: done, with a significance test
- not done: any language with heap, sequences or ghost state; any interleaving of ranking with sampling or with repair from verifier feedback; any comparison with symbolic invariant generators; any measurement on unsolved problems

## how much this threatens a product of agent-written verified Rust

Inference: none directly. The paper does not write code, contracts or full proofs; it reorders candidate invariants for single integer loops given as SMT formulas, using 2023 models. Its use to VL is as three low-cost habits (shuffle or TF-IDF-sort candidates, de-duplicate them, log every verifier verdict as labelled data) and as a caution that a ranker pays only when a verifier call costs much more than an embedding call.

## techniques for the catalog

- three-check invariant oracle: accept a loop invariant only when it holds at entry, is preserved by one iteration under the loop condition, and with the negated condition implies the postcondition
- weakest-precondition reduction: turn each loop-free Hoare triple into one implication by substitution for assignment, nesting for sequence and a guarded conjunction for conditionals, then ask the solver
- zero-shot invariant sampling with a fixed answer header: give the problem, fix the first line of the answer to the invariant's signature, and sample until one candidate verifies or time runs out
- contrastive candidate ranker (iRank): train a three-layer map over frozen embeddings so verified invariants score near 1 and rejected ones near 0 against their problem, then check candidates in score order
- per-fold ranker training: split problems into five folds and rank each problem with the model that never saw it
- shuffle-before-check baseline: a random permutation of sampled candidates halves the mean rank of the verified one relative to generation order
- TF-IDF candidate ordering: sort candidates by textual similarity to the problem, an untrained ordering that beat random order on median rank in both settings
- semantic candidate de-duplication: drop a candidate when one solver call proves it equivalent to an earlier candidate for all variable values
- verdict logging for ranker data: keep every verified and every rejected candidate per problem as the positive and negative sets a ranker needs
