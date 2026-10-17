# dafny-annotator: AI-Assisted Verification of Dafny Programs
(authored by agents unless marked 🧑)
Tag: `poesia2024dafnyannotator`, [paper](https://arxiv.org/abs/2411.15143)

source: Poesia, Loughridge, Amin, arXiv:2411.15143v1 (5 Nov 2024), 6 pages, no appendix. Code: https://github.com/metareflection/dafny-annotator

earlier notes: one-paragraph summaries exist in `topic_studies/formal_verification_rust/llm_for_verification/proof_synthesis.md` and `distributed_verification_review_b/deep_5_llm_agents.md` (greedy search, synthetic data, 15.7% to 50.6%, code and contracts fixed). They lack the search steps, the training-pair construction, the edit-graph editors, the full results table and its inconsistencies; this study adds those.

## what is measured and what stays trusted

The paper measures one thing: the share of 83 annotation-stripped DafnyBench test methods for which a small open-weights LLM, driven by a greedy search, finds annotations that make Dafny accept the method. Nothing is proved about the tool. The method's code and its `requires`/`ensures` are inputs and are never changed, so the specification is trusted as given. The paper says so in its conclusion: "dafny-annotator assumes that programs come with formal specifications, while a challenge for users is often in formally describing the desired behavior." (Section 5, p.5)

Inference: the soundness boundary is the Dafny verifier alone; the LLM, the insertion code and the synthetic data only affect how often a proof is found, not whether an accepted proof is valid.

Annotation here means one of three kinds: an assertion, a loop invariant, or a `decreases` clause (Figure 1 prompt, p.2). Helper lemmas are not generated: "Also, many of the DafnyBench programs already come with helpful lemmas, which dafny-annotator is often able to use in the annotations it produces." (Section 5, p.6)

## technique 1: location-free annotation proposal with exhaustive insertion and greedy keep

what it is: the LLM outputs only the text of one annotation; a program tries that text at every place where it parses, asks the verifier about each resulting program, and keeps the first placement the verifier accepts. The model never predicts a line number.

when to use it: a function has code and a contract, the verifier fails, and the missing hints are local (loop invariants, asserts, termination measures). Inference: it fits weak or cheap models, because the part the model would otherwise predict (where the hint goes) is handed to enumeration; the paper says only that this "has less to predict".

steps (Section 2.1, p.2):
1. proposal. "We prompt the LLM to generate 𝐾 candidate annotations." The prompt is the current program "up to the method we are annotating", with its existing annotations (the paper does not say whether the method's own body is included). The prompt shape (Figure 1, p.2) is an instruction line, then `Program:` and the source, then `Annotation:`; the model completes after `Annotation:`, e.g. `invariant 0 <= index <= a.Length` for a `maxArray` loop
2. insertion. For each candidate, build one program per syntactically valid site: a loop invariant is tried on each loop, an assertion after every statement. The paper: "We try these options in parallel for efficiency."
3. greedy selection. "We follow a greedy strategy by keeping the first annotation and program location that Dafny accepts." If no candidate is accepted anywhere, the program is left unchanged for this round
4. repeat steps 1 to 3 up to a maximum number of iterations, "stopping early if Dafny can prove the method's post-condition after adding an annotation."

What accepts means in step 3 is not spelled out in Section 2.1. Section 2.3 gives the working rule for the same operation in data generation: "In general, we keep any new annotations as long as they can be proved by Dafny, regardless of whether the new program is already fully verified." (p.4) Inference: the search uses the same rule, i.e. a candidate is kept when the annotation itself verifies (an invariant holds on entry and is preserved, an assert is proved), even though the postcondition still fails; otherwise no intermediate step could ever be kept.

Settings in the evaluation: at most 5 iterations (Section 3, p.5), 30 CPU cores to run Dafny calls in parallel (Section 3, p.5). The value of K is not given in the paper.

Verus form (inference; the paper is about Dafny only):
- the three annotation kinds map one to one: an `invariant` clause in a `while` header, an `assert(...)` statement, a `decreases` clause on a loop or a recursive function
- insertion sites: each loop header for `invariant` and `decreases`; after each statement of the function body for `assert`
- acceptance test for a kept candidate: rerun Verus and require that no reported error points at the new annotation (invariant not satisfied before the loop, invariant not preserved, assertion failed), while postcondition errors may remain. This needs error messages classified by kind and span; not in the paper
- stop when Verus reports no errors for the function
- shape of the result for the paper's `maxArray` example, written as Verus (not run through Verus here):

```rust
fn max_array(a: &Vec<i32>) -> (m: i32)
    requires a.len() >= 1,
    ensures
        forall|k: int| 0 <= k < a.len() ==> m >= a[k],
        exists|k: int| 0 <= k < a.len() && m == a[k],
{
    let mut best = a[0];
    let mut index: usize = 1;
    while index < a.len()
        invariant
            1 <= index <= a.len(),                              // candidate 1
            forall|k: int| 0 <= k < index ==> best >= a[k],     // candidate 2
            exists|k: int| 0 <= k < index && best == a[k],      // candidate 3
        decreases a.len() - index,
    {
        if a[index] > best { best = a[index]; }
        index = index + 1;
    }
    best
}
```

- what changes: Rust machine integers add overflow obligations that Dafny's `int` does not have, so bounds invariants are needed more often; quantified invariants may need a `#[trigger]`, which the model must then also produce
- what does not carry over: Verus proofs often need a `proof fn` with its own body and a call to it, or an `assert ... by` block; these are multi-line and not one-line insertions, so pure single-annotation search cannot reach them. The paper has the same gap for Dafny lemmas

evidence: Table 1 (p.4), caption: "Success rate of dafny-annotator in verifying a held-out set of 83 programs from DafnyBench, after annotations have been stripped." Base Llama 3.1 8B with this search and no fine-tuning: 15.7%. Base CodeLlama 7B: 6.0%. Inference: with 83 as denominator these are 13/83 and 5/83; the paper prints percentages only. There is no ablation of the search itself (no comparison with letting the model choose the location, with whole-proof generation, or with a non-greedy search), so the paper gives no evidence that exhaustive insertion beats alternatives; its only argument is "This makes the LLM's task easier, since it has less to predict." (Section 2.1, p.2)

where it fails or what it assumes:
- greedy and no backtracking: a kept annotation is never removed. Inference: a true but useless invariant is harmless to soundness but can slow the solver; a needed pair of annotations that only verify together (invariant A is inductive only given invariant B) cannot be found one at a time
- acceptance of a true-but-irrelevant annotation counts as progress in step 3, so the 5 iterations can be spent on trivia. Inference
- cost grows as K times the number of sites times verifier time per round. Inference
- contract and code must already be right; a wrong `ensures` cannot be detected

## technique 2: turn each verified program into one training pair per annotation by peeling annotations off

what it is: a way to get supervised examples for the proposer in technique 1 from any corpus of verified programs, matching exactly the input the search will show the model (a program missing some annotations) and the output it wants (one annotation, no location).

when to use it: there is a corpus of verified programs in the target language and a model small enough to fine-tune.

steps (Section 2.2, p.2):
1. take an annotated program p
2. remove its last annotation a (assertion, invariant or `decreases` clause), giving p−a. "The pair (𝑝 −𝑎 , 𝑎) thus becomes a training example."
3. "We repeat this procedure with program 𝑝 −𝑎 until there are no more annotations."
4. format each pair as the Figure 1 string and fine-tune with next-token prediction, with the loss masked on the prompt part, so that only the annotation tokens are trained: "This focuses training on the generation of the annotations conditioned on the program, rather than also training the model to predict the program tokens." (Section 2.2, p.3)

Fine-tuning setup (Section 3, p.5): LoRA with r = α = 128, 1500 gradient steps for every run regardless of training-set size, one NVIDIA A100 80GB GPU.

evidence (Table 1, p.4; 83 test programs; search of at most 5 iterations):
- Llama 3.1 8B fine-tuned on DafnyBench only: 15.7% with 25% of the 1000 training programs, 20.5% with 50%, 15.7% with 100%
- CodeLlama 7B fine-tuned on DafnyBench only: 20.5%, 28.9%, 39.8% for 25%, 50%, 100%
- so real-data fine-tuning alone gave Llama 3.1 8B nothing at 100% (same 15.7% as the base model) and gave CodeLlama 7B a rise from 6.0% to 39.8%

where it fails or what it assumes: removal order is fixed (last first), so the model only ever sees prefixes of the human annotation order; inference: at search time the program may hold annotations in an order no training example has. Inference: the pair has no location, so it cannot teach placement; peeling does not check that the annotation was needed, so redundant human annotations become training targets too.

## technique 3: edit graph for verifier-filtered synthetic programs (DafnySynth)

what it is: a growing graph whose nodes are typed pieces of content (root, idea, program) and whose edges record derivation. LLM-driven editors pick existing nodes and propose new ones; the verifier decides which program nodes are kept. The paper's premise: "Our method is based on the simple observation that large programs are written as a series of much smaller edits to existing programs." (Section 2.3, p.3)

when to use it: the target language has too few verified programs to train or prompt from, a strong general model can write plausible code in it, and a verifier can filter the output.

steps (Section 2.3, pp.3–4): "We initialize the graph with a single node, of type root, and empty content." Then run these editors in sequence, repeatedly:
1. Idea Proposer: from the root and the existing idea nodes, sample N new natural-language descriptions of a simple verified program, avoiding ideas already in the graph. Example idea from GPT-4o (Figure 2, p.3): a program that checks whether a number is a perfect square
2. Idea Implementer: sample idea nodes and have the LLM write a small complete program for each; the result is a program node. Keep rule, from the perfect-square example where the `ensures` was not yet provable: "Since it can prove all of the existing invariants, we thus keep this program in the graph, saving the feedback from the verifier." (p.4)
3. Annotator: sample program nodes that do not yet verify and have the LLM add annotations; keep any new annotation Dafny proves, whether or not the whole program now verifies. In Figure 2, GPT-4o added the invariant `result == (exists i: nat :: 0 <= i < k && i * i == n)` and a final `assert`, after which the method verified, and "removing either of the annotations makes it fail" (p.4)
4. Change Proposer: "Proposes and implements small patches to existing program nodes." The LLM rewrites or extends a program so that later programs build on earlier ones
5. harvest: take every annotation in every kept program as a training example by technique 2, after de-duplicating annotations that were merely carried across edits of the same program (p.4)

Run reported (Section 2.3, p.4): model gpt-4o-2024-08-06 in all editors; "we used $10 in OpenAI API credits"; output 699 compilable programs, of which 46 fully verified and the rest partially verified, meaning "all of the annotations are accepted by Dafny, though Dafny cannot prove all specifications". The annotation count: "Overall, DafnySynth contains 1107 annotations (678 invariants, 281 assertions, and 148 decreases clauses), of which 923 are syntactically unique" (p.4). 678 + 281 + 148 = 1107, consistent. Inference: 46/699 = 6.6% fully verified; 699 − 46 = 653 partially verified.

The key design choice is the keep rule: a program is useful as training data when its annotations are individually proved, even though its contract is not. Inference: a rule that kept only fully verified programs would have kept 46 of the 699; the paper reports no such comparison.

Verus form (inference): the editors carry over unchanged in role; the filter becomes Verus. A kept Verus program node would be one where Verus reports no failed `invariant` or `assert`, and failures are only unproved `ensures`. Things that change: (a) Verus must also pass Rust type and borrow checking before any proof obligation is checked, so the Idea Implementer's reject rate will include plain Rust errors; (b) a kept-but-unverified Verus program must not be mistaken for a verified one downstream, so each node needs its verifier output stored, as the paper does with "saving the feedback from the verifier"; (c) an annotation proved in a function whose contract is unproved is still a valid training target, but an `assume` or `#[verifier::external_body]` in the generated program would make annotations trivially provable, so generated programs containing them should be rejected. Point (c) is not in the paper; the paper does not say whether generated Dafny programs were screened for `assume`.

evidence (Table 1, p.4; 83 test programs; at most 5 search iterations):
- Llama 3.1 8B: DafnySynth only 27.7%; DB(25%) + DafnySynth 41.0%; DB(50%) + DafnySynth 43.4%; DB(100%) + DafnySynth 50.6%
- CodeLlama 7B: DafnySynth only 20.5%; DB(25%) + DafnySynth 31.3%; DB(50%) + DafnySynth 34.9%; DB(100%) + DafnySynth 39.8%
- the paper's reading: "Interestingly, for LLaMA 3.1 8B, using DafnySynth alone is better than using DafnyBench for training, while for CodeLlama, DafnySynth leads to the same improvement as training on 250 programs from DafnyBench." (Section 3, p.5)
- inference: 50.6% of 83 is 42 programs; 27.7% is 23

where it fails or what it assumes:
- the paper concedes limited novelty of content: "While this process arguably might not create fundamentally novel ideas for programs, the generated programs can still be useful given that they will be new programs in Dafny." (Section 2.3, p.4)
- the 699 programs are not independent: "though many are derived from one another, so they are not unique" (p.4)
- specifications of synthetic programs are written by the LLM and never checked for meaning; a vacuous `ensures` yields easy annotations. Inference
- Inference: the paper reports one DafnySynth dataset from one $10 spend and no measurement of how results scale with more synthetic data; it describes the work as an "initial exploration" (p.4)
- the benefit for CodeLlama 7B at full real data is zero: DB(100%) and DB(100%) + DafnySynth are both 39.8%

## observation the paper offers as a finding: code pre-training did not help

"We do not see gains from using CodeLlama compared to the base Llama 3.1 8B model, despite it having been trained with a focus on code." (Section 3, p.5) The paper's tentative explanation ("possibly accounts for this fact") is that verification annotations do not occur in mainstream languages. Inference for Verus: Rust skill and Verus proof skill should be measured separately when choosing a model; the paper's data is two models of different generations and sizes, so it cannot separate code focus from other differences.

## contradictions and numbers that do not add up

- best result: the abstract and Table 1 say 50.6%; the introduction says "Combining both training sets improves dafny-annotator's success rate to 50.7%" (Section 1, p.2). 42/83 = 50.6%
- the introduction reports "fine-tuning on a subset of DafnyBench boosts success rate to 20.5%" (Section 1, p.1). Table 1 shows that this is the 50% subsample for Llama 3.1 8B, and that the full training set gives 15.7%, equal to no fine-tuning. The introduction does not mention this
- the sentence that CodeLlama shows no gains over Llama 3.1 8B holds for the base models (6.0% vs 15.7%) and with DafnySynth added, but in Table 1 CodeLlama fine-tuned on DafnyBench alone is higher at every size: 20.5% vs 15.7%, 28.9% vs 20.5%, 39.8% vs 15.7%
- the paper says gains generally grow with the DafnyBench share, "a trend that only breaks when not using DafnySynth in combination with it when training LLaMa 3.1 8B" (Section 3, p.5). Inference: with 83 test items one program is 1.2 percentage points, the Llama 3.1 8B DafnyBench-only column moves 15.7, 20.5, 15.7, and no run is repeated with another seed, so differences of a few points in this table are within what a single run can move; the paper gives no variance
- unit mix: DafnyBench is "1326 standalone Dafny programs", yet the split is "a training set of 1000 Dafny methods, holding out the remaining 326 for test" (Section 3, p.4), and Table 1's caption says 83 programs. Programs and methods are used for the same items
- test-set selection: "Out of the 326 test methods, only 83 failed to verify after we removed the original annotations." (Section 3, p.4) So 243 of 326 (74.5%, inference from the two counts) needed no annotation at all. Inference: a success rate computed on all items, including ones that need no hints, is not comparable with these numbers

## techniques for the catalog

- location-free annotation proposal: the model emits only the annotation text and a harness tries it at every syntactically valid site, keeping the first placement the verifier accepts
- greedy annotation accumulation: keep any annotation the verifier proves even while the contract still fails, and loop until the contract verifies or the iteration budget ends
- annotation peeling for training pairs: remove annotations from a verified program last-first, emitting one (program without it, annotation) example per removal
- prompt-masked fine-tuning: train only on the annotation tokens, with the program part of each example excluded from the loss
- edit-graph synthetic corpus: typed nodes (root, idea, program) grown by idea, implementation, annotation and change editors, with the verifier as the filter
- partial-verification keep rule: retain generated programs whose annotations all verify though their postconditions do not, and store the verifier feedback with them
- hint-needed test filtering: strip annotations and evaluate only on items that then fail, since most items (243 of 326 here) verify with no hints
