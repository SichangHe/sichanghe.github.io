# Towards Neural Synthesis for SMT-Assisted Proof-Oriented Programming
(authored by agents unless marked 🧑)
Tag: `chakraborty2024neural`, [paper](https://arxiv.org/abs/2405.01787)

source: Chakraborty, Ebner, Bhat, Fakhoury, Fatima, Lahiri, Swamy (Microsoft Research); arXiv:2405.01787v3 (4 Sep 2024), 14 pages with Appendix A and B. Page numbers below are PDF pages.

## measured and trusted

The paper turns eight open-source F* projects into 32,054 synthesis problems. Each problem gives a model the type of one top-level definition and asks for a body that F* accepts. In F* the type is the specification and Z3 discharges the proof obligations, so, Inference: this is the closest published analogue of asking a model to fill in a Verus function body, or a Verus lemma body, under a given contract.

Measured: verify@k, the percentage of problems for which at least one of k sampled definitions passes the checking harness. Table II (p.6) reports percentages only; Table I (p.4) gives the test set sizes, 5,965 intra-project definitions and 1,769 cross-project definitions.

Trusted: F*, Z3, and the harness. The specification is trusted to mean what the user wants, and the paper says so for two of its three problem classes: "However, in other cases, specifications may only be partial and, although type-correct, a solution may still be subject to inspection to confirm if it matches a user’s under-specified intent." (Section VII, p.10)

Out of scope by the authors' own statement: "That said, our approach focuses on synthesizing program and proof fragments given their specifications: finding the right modular decomposition to prove a program correct, with the right specifications and auxiliary lemmas, is not yet within the scope of the techniques we explore." (Section I, p.2)

## technique 1: a harness that rechecks one definition in exactly its original scope

What it is. Tooling that restarts the verifier in the state it had just before a chosen definition, then checks a candidate replacement for that definition alone. It is what makes 32K problems out of 2,060 files.

When to use it. Inference: when building a benchmark or a training loop from an existing verified code base, where each candidate must be judged quickly and without rebuilding the project.

Steps, from Section III (p.3-4):
1. Build all projects with one version of F* and Z3, keeping the build artifact (the `.checked` file) of every source file.
2. For every top-level element record its dependencies and the compiler settings used to verify it (Fig. 1, p.4, shows `z3rlimit` and `z3seed` among the stored settings).
3. To check a candidate, load the file's `.checked` artifact only up to the definition in question, so that the scope is exactly what the original definition saw.
4. Open namespaces in the original order so that names resolve as they did.
5. Make sure the candidate cannot refer to the original definition, either by name or implicitly through Z3.
6. Reject candidates that use `admit ()` or `assume`.
7. Run the harness on the original definitions first and keep only those that recheck.

Step 7 loses a tenth of the data: "We use the type-checking harness to identify those top-level definitions whose proofs can be checked in isolation, finding that 90% of them meet this criterion." (Section III, p.3) The paper attributes the losses to sensitivity to small changes in SMT search heuristics.

The paper's warning about steps 5 and 6: "Challenges (b) and (c) are hard to notice during development because they only result in false positives, i.e., the checker incorrectly claiming that a solution is correct." (Section III, p.4)

After deduplication and removal of auto-generated code, data type definitions and all proofs that are fully automated by SMT, 32,054 definitions remain (Section III, p.4).

Verus form. Inference: a Verus harness would take a verified crate, blank the body of one function while keeping its signature with `requires`, `ensures` and `decreases`, insert the candidate body, and verify that function with every other function's contract taken as given. The two false-positive traps carry over directly. Trap (b) becomes: the candidate must not call the original function, and a `proof fn` must not be proved by calling a later lemma that itself depends on it. Trap (c) becomes: reject `assume`, and reject `external_body` added to the function. Dropping problems that Z3 solves with an empty body also carries over: an empty `proof fn` body that verifies is no test of a model. Inference: the 10% of definitions that fail to recheck is a measured rate of proof instability under replay in F*; a Verus corpus would need the same filter, and its rate is unknown.

Where it fails. The paper does not say how implicit use through Z3 is prevented beyond the partial load. Inference: partial loading works because F* checks a file top to bottom; a Rust module has no such order, so the Verus harness must compute the dependency cut itself.

## technique 2: a three-way taxonomy of problems by how much the type pins down

What it is. Every problem is labelled by its goal type (Section III, p.4):
- simply typed: types such as `int → int`, including non-dependent refinements such as `nat → nat` and polymorphic types; many bodies fit.
- proof: the type is a proposition, such as the `Lemma (ensures ...)` type of `append_count` (Section II, p.3); all well-typed terms are semantically equal.
- dependently typed: everything else, such as `sort` returning a list that is sorted and a permutation of the input; a full specification, but several different programs can satisfy it.

When to use it. Inference: for reporting results of any verified-code generator, because one overall number hides which kind of obligation was met.

Verus form. Inference: simply typed corresponds to a Rust function with no `requires` or `ensures`; proof corresponds to a `proof fn`; dependently typed corresponds to an executable function or a `spec fn` user with a functional `ensures`. The F* class boundary is decided by the type alone, and the Verus one can be decided by the function mode and whether a contract is present.

Evidence that the classes differ in difficulty (Fig. 3, p.7, verify@10; the assignment of bars to models is read from bar position and legend order, and it reproduces GPT-4's 36.38 in Table II as the weighted mean of its three intra-project bars). Fine-tuned StarCoder, intra-project: simply typed 61.46% of 1,248, dependently typed 41.21% of 3,111, proof 35.74% of 1,606. Cross-project: 50.34% of 149, 32.01% of 1,431, 25.93% of 189. Prompted GPT-4, intra-project: 54.01%, 34.20%, 26.90%; cross-project: 44.30%, 27.67%, 22.22%.

## technique 3: split by dependency closure, plus two held-out projects

Steps, from Section III (p.4):
1. Put each source file in exactly one of four sets: training, validation, intra-project test, cross-project test.
2. Take the first three from six projects (F*, Karamel, EverParse, HACL*, Merkle-tree, Steel).
3. Make training dependency-closed. "The training set is closed under the dependence relation, i.e., a file in the training set also has all its dependencies in the same set."
4. Let intra-project test files depend on files of any set.
5. Put two whole projects (EverQuic-Crypto, miTLS-F*) in the cross-project test set.

Sizes (Table I, p.4): train 22,779 definitions in 1,216 files; validation 1,541 in 72; intra-project test 5,965 in 306; cross-project test 1,769 in 126.

Why. Inference: the closure means no training file was written with knowledge of a test file, and the test files sit at the leaves of the dependency graph, which is where new code is normally added.

Verus form. Inference: carries over unchanged, with crates and modules in place of projects and files.

Where it fails. Clones survive file-level separation: the authors found 343 definitions in the intra-project test set and 7 in the cross-project test set that have the same body as a training definition under a different name (Section VII, p.10). Inference: 343 of 5,965 is 5.8% of the intra-project test set; the paper does not report results with the clones removed.

## technique 4: retrieve related examples by embedding the goal type

What it is. Find training definitions whose types are close to the goal type and show the model each one's type together with its body.

Steps, from Section IV (p.5):
1. Embed every training type with `text-embedding-ada-002`.
2. Embed the goal type ti and rank training types tx by cosine similarity.
3. Add pairs (tx, dx) to the prompt in descending similarity until the related-example budget of 400 tokens is full (budget from Section V-A, p.6).

The stated reason: "Our intuition is that if two examples’ types are very close, there will be similarities between their definitions." (Section IV, p.5) An off-the-shelf embedding is used because there is no ground truth for which example helps.

Revision in Appendix B (p.14): "Rather than restricting related examples to only be fetched from the training data, for a given synthesis problem, we search for examples from all files that do not depend on the file of the current problem—this dependence information is available in metadata present in the dataset."

Verus form. Inference: the key to embed is the signature with `requires` and `ensures`; the value is the verified body. The Appendix B pool is the right one for an agent working in a crate: every verified function the current file does not feed into.

Evidence (Table III, p.8, fine-tuned Phi-2, verify@10). Dropping related examples lowers intra-project from 31.10 to 25.92 and raises cross-project from 20.97 to 21.82. The authors conjecture that the cross-project training pool holds little to no helpful examples, so related examples from the same project help the model most; they do not test this. With the revised pool on dataset v2 (Table VIII, p.14), the V1-trained fine-tuned StarCoder reaches 56.07 intra-project and 58.13 cross-project at verify@10, and prompted GPT-3.5 reaches 36.59 and 41.63.

Identifier overlap (Fig. 6, p.10): the share of the ground truth's identifiers that appear in a prompt part is higher for verified problems than for failed ones, with Cohen's d of 0.84 for related examples, 0.34 for file context and 0.28 for selected premises.

Limits. Inference: v2 changes the retrieval pool, the dataset and the class mix at once, so Table VIII does not isolate the effect of the new pool. The authors themselves explain the higher cross-project numbers by the class mix and by shorter examples (Appendix B, p.14).

## technique 5: premise selection with a fine-tuned embedding, names only

What it is. A small embedding model ranks in-scope definitions by how likely the body will use them. Only the short names go in the prompt.

Steps, from Section IV (p.5):
1. For each training definition g, positives p1..pn are the definitions whose name occurs in g's body but not in its type.
2. Negatives q1..qn are sampled from definitions in scope whose name occurs in neither.
3. Fine-tune `all-MiniLM-L6-v2` with a mean-square loss that pushes the dot product of e(g) with each positive toward 1 and with each negative toward 0.
4. At inference rank in-scope premises by cosine distance to the goal type and fill a 300 token budget with names.

On using names only: "For each of the selected premises, we only use the short name of that premise in the prompt." (Section IV, p.5) The authors observed that adding types or bodies hurt, and conjecture that fewer premises then fit.

Evidence, which is mostly negative (Table III, p.8, fine-tuned Phi-2, verify@10). Removing the selected premises changes intra-project from 31.10 to 31.15 and cross-project from 20.97 to 20.35. Replacing them with the premises the ground truth really uses gives 35.84 and 23.74, and cuts identifier-not-found errors from 30,108 to 22,149 (Section V-C, p.9). Retrieval quality (Table V, p.10): fine-tuning raises intra-project MAP of `all-MiniLM-L6-v2` from 0.15 to 0.32 but cross-project MAP only from 0.16 to 0.18. "However, the training does not generalize well and fine-tuning only barely improves performance on the cross-project set." (Section VI-D, p.10)

Verus form. Inference: positives are the `proof fn` lemmas and `spec fn` definitions a verified body calls or mentions; the goal is the signature. What the result says for Verus is that a learned selector at MAP 0.32 is not worth a prompt section, while a perfect list of lemma names is worth 4.7 points of verify@10 intra-project (31.10 to 35.84) and 2.8 cross-project (20.97 to 23.74). A cheaper source of a near-ideal list is the set of lemmas called by the retrieved related examples, which the paper does not test.

## technique 6: prompt assembly with fixed budgets and labelled parts

Steps, from Sections IV (p.5) and V-A (p.6):
1. Parts in order (Fig. 1, p.4): goal type; opened and instantiated modules; file context; premise names; related examples; instructions that end with the prefix of the definition, for example the opening `let rec appendList`.
2. Budgets: 500 tokens file context, 400 related examples, 300 premises, 500 generated definition.
3. File context is filled from the definition nearest above the goal backwards.
4. Each part is introduced by a short natural-language description.

Evidence for the file context (Table III, p.8): without it verify@10 falls from 31.10 to 21.89 intra-project and from 20.97 to 10.97 cross-project. The paper's example is `FStar.OrdSet.where`, where the file context defines `ordset a f` as an ordered list (Section V-C, p.9).

Evidence for the formatting (Table VI, p.10, fine-tuned Phi-2, verify@10): natural-language labels 31.10 intra and 20.97 cross; parts wrapped in tags such as `<context>` 30.76 and 19.45; plain concatenation with a separator token 10.54 and 12.21.

Evidence for larger budgets (Table IV, p.9, 100 randomly sampled problems, counts out of 100): GPT-3.5 solves 29 with 2,048 tokens and 35 with 16,000; GPT-4 solves 37 and 50; fine-tuned StarCoder solves 45 with 2,048.

Verus form. Inference: file context is the part of the Rust module above the function, nearest first, plus the `use` lines. The instruction to start with a fixed prefix corresponds to handing the model the function signature and asking only for the body.

## technique 7: fine-tune a small model on prompt-to-definition pairs and sample k times, without repair

Steps, from Section IV (p.5):
1. Build the prompt of technique 6 for every training definition; the target is the ground-truth definition.
2. Fine-tune with low-rank adaptation and quantization: Phi-2 (2.7B) for 10K steps, Orca-2 (7B) for 5K, StarCoder (15.5B) for 2K; keep the checkpoint with the lowest validation loss.
3. At test time sample k definitions with temperature sampling and check each with the harness.

There is no feedback loop: "Note, we do not feedback type-checking results to the LLM for repair, an enhancement we are considering for the future." (Section IV, p.5)

Evidence (Table II, p.6, verify@1 / @5 / @10, intra-project then cross-project):
- prompted GPT-3.5: 13.51 / 25.20 / 29.81, then 6.67 / 14.41 / 18.54
- prompted GPT-4: 19.41 / 31.90 / 36.38, then 13.00 / 23.57 / 28.49
- prompted StarCoder: 1.89 / 7.14 / 12.27, then 0.73 / 3.79 / 6.90
- fine-tuned Phi-2: 17.28 / 27.75 / 31.10, then 8.59 / 16.62 / 20.97
- fine-tuned Orca-2: 14.90 / 26.02 / 30.61, then 7.74 / 14.92 / 18.37
- fine-tuned StarCoder: 27.95 / 39.50 / 43.98, then 16.73 / 27.64 / 32.90

Verus form. Inference: the recipe needs tens of thousands of verified definitions with a per-definition checker. The paper trains on 22,779. No public Verus corpus of that size is known to this study, so for Verus the prompting columns are the relevant ones, and they show that retrieval plus file context already gives GPT-4 36% intra-project without any training.

## technique 8: combine models, cheap ones first

What it is. Count a problem solved if any of n models solves it within k samples each (verify@nk).

Evidence (Table II, p.6, the columns marked @10): the three fine-tuned models together 48.52 intra and 37.20 cross (30 samples); the five prompted models together 45.47 and 36.18 (50 samples); all eight 55.34 and 45.56 (80 samples). On the cross-project set, Fig. 2 (p.6) and its text give 137 problems solved only by the prompted GPT models and 165 solved only by the fine-tuned small models.

The paper's operational reading: "The combined verify@nk results suggest that one could use one or more cheaper, fine-tuned models for synthesis at first, falling back to the larger models only when the smaller models fail." (Section V-A, p.6)

Verus form. Inference: this is an ordering of generators in front of one verifier and needs nothing language-specific.

## technique 9: three-way error triage to find what to fix next

Steps, from Section V-B (p.7-8): sort every failed candidate into syntax error (F* cannot parse it), identifier not found (parsed, but a name does not resolve), or semantic error (parsed and resolved, but the checker cannot verify it against the goal type, which includes type errors and Z3 failures).

Finding (Fig. 4 and text, p.7-8): for prompted small models most errors are syntax errors; for GPT-3.5 the largest class is syntax; for GPT-4 and for all fine-tuned models the largest class is identifier not found. The example is a StarCoder output that calls a lemma that does not exist where it looks for it: "While seemingly syntactically correct, this definition uses the symbol lemma_eq_intro, which is not in scope." (Section V-B, p.8)

Verus form. Inference: the same three bins fall out of the toolchain's stages: the Rust parser, name resolution and type checking by rustc, then Verus verification failures. The finding predicts that for a model that knows the syntax, invented lemma and function names are the first failure to remove, by constraining generation to names in scope or by a cheap resolve-only check before the SMT run.

## numbers that do not add up

- The introduction says LLMs "can automate somewhere between a third and a half of proofs" (Section I, p.2). In Fig. 3 the best single model on the proof class reaches 35.74% intra-project and 25.93% cross-project at verify@10. Over all classes, a half is reached only by the combined 80-sample figure (55.34 intra, 45.56 cross) or on dataset v2.
- Result 1 (p.7) says fine-tuned Phi-2 beats GPT-3.5 by up to 5%. From Table II at verify@10 the relative gaps are 31.10/29.81 = 4.3% intra-project and 20.97/18.54 = 13.1% cross-project. The stated up to 21% for StarCoder over GPT-4 matches 43.98/36.38 intra-project.
- Result 3 (p.9) says performance drops by up to 29.6% without context. That is the intra-project relative drop (31.10 to 21.89). The cross-project drop in the same table is 20.97 to 10.97, which is 47.7%. The stated 16.55% for related examples is 16.66% from 31.10 and 25.92.
- Appendix B (p.14) says the v2 intra-project class holds 33.5% simply typed definitions. Table VII gives 1,536 of 5,097, which is 30.1%. The cross-project figure of 44.3% matches 7,282 of 16,442.
- Table VII lists 2 projects for the v2 cross-project set, which holds 16,442 definitions in 1,179 files, while Appendix A says v2 adds four new projects. The paper does not say which projects make up that set.
- Table VIII has no GPT-4 row values (printed as xx.xx); the authors say the run was not completed.
- The abstract says the performance of fine-tuned small models compares favorably with large models. Table IV, on 100 problems, shows GPT-4 with a 16,000 token prompt at 50 against fine-tuned StarCoder at 45.

## techniques for the catalog

- isolated definition recheck: reload the verifier state up to one definition and check a replacement body there, with the original definition unreachable.
- escape-hatch rejection: refuse candidates that contain admit or assume, since they pass the checker without proving anything.
- recheckable-fragment filter: replay every ground-truth proof through the harness and keep only those that still verify.
- SMT-trivial problem removal: drop problems whose proof the solver finds with no hints, so the benchmark tests the generator.
- goal-type taxonomy: report results separately for simply typed, dependently typed and proof goals.
- dependency-closed training split: put a file in training only together with all its dependencies, and hold out whole projects as a second test set.
- type-similarity example retrieval: embed the goal type, and show the model the types and bodies of the nearest already verified definitions.
- non-dependent retrieval pool: retrieve examples from every file that does not depend on the current file.
- contrastive premise selector: fine-tune an embedding so a goal is close to names used in its body and orthogonal to sampled unused names in scope.
- names-only premises: list selected premises by short name to fit more of them in the budget.
- ideal-premise roofline: rerun with the ground truth's own premises to measure how much a perfect selector could add.
- budgeted labelled prompt: give each prompt part a fixed token budget and a one-line natural-language label, filling file context nearest-first.
- definition-prefix instruction: end the prompt with the opening tokens of the definition to be written.
- verify@k sampling: sample k candidates at temperature and accept if the verifier passes any.
- small-model-first cascade: try cheap fine-tuned models first and fall back to a large model on failure.
- three-bin error triage: classify failures as syntax, unresolved identifier or semantic to choose the next fix.
- identifier-overlap diagnostic: measure how many ground-truth identifiers each prompt part contains and compare verified with failed problems.
