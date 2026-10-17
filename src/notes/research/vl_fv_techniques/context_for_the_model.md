# Context for the model
(authored by agents unless marked 🧑)

## short version

- the model can only use what is in its prompt or what it can look up
  - every study treats this as a design choice, not a default
- what goes in: similar verified examples, lemma search, project symbols, a slice of the code, a syntax guide
- the evidence is mostly ablations that remove several things at once
  - I found no study that isolates "retrieval" from "everything around it" in Verus
- more context is not always better
  - three studies show extra context hurting
- nothing here is trusted; the verifier still decides
- related notes
  - [loop invariant synthesis](loop_invariant_synthesis.md)
  - [proof minimization](proof_minimization.md)
  - [LLMs for proof synthesis](../topic_studies/formal_verification_rust/llm_for_verification/proof_synthesis.md)
  - [LLMs for specifications](../topic_studies/formal_verification_rust/llm_for_verification/specifications.md)

## the problem

A model writing a spec or a proof guesses names, syntax and lemmas it cannot see.
Verus syntax is rare in training data.
A real project has thousands of lines, and most are irrelevant to one obligation.

Three failures come from a bad prompt.
- invented names: calls to lemmas or fields that do not exist
- wrong syntax for a low-resource verifier
- a prompt so long the model loses the point

The NL2Contract study reports the first one as the authors' observation.
The study's words: "The authors found that omitting this context makes LLMs hallucinate names that do not exist."
No count is given.
[study](../vl_paper_walkthrough/beyond_postconditions_20261012.md)

So the question is what to show the model, and when.

## how to do it in Verus

No study runs this on Verus end to end.
The steps below are my inference, assembled from the variants further down.
Each step names where it comes from.

1. pick a small unit
   - one function, one loop, or one failing obligation
   - AutoSpec splits at functions and loops; the VeriFast study splits per function
2. cut the project down to that unit
   - keep callee signatures with `requires` and `ensures`
   - drop callee proof bodies
   - VeruSAGE does this with `verus --log-all` and `unimplemented!()` plus `verifier::external_body` on dependencies
   - the isolated task trusts those dependency contracts, so re-verify the whole crate later
3. build an index once per crate
   - `spec fn` names, `proof fn` lemmas with their contracts, trait impls, visible types
   - add the `vstd` lemma names
   - the LSP study does this for Eiffel and feeds the result into prompts
4. fetch examples for the target
   - key on the code, not on the written spec (PropertyGPT)
   - or key on proof shape: views, ownership, solver mode (a recommendation in the [Verus systems study](../vl_paper_walkthrough/verus_practical_20261012.md), untested)
   - match the Verus version, and keep the file path of every example
5. write a short syntax guide into the prompt
   - `requires`/`ensures` placement, `invariant` after the loop header, `int` casts, `Seq` slicing
   - the Dafny study does this for Dafny
6. add a few verified examples
   - the studies use zero to ten; see the evidence for what that bought
7. give the agent a search tool for lemmas
   - return names and signatures, not bodies
   - keep one conversation so earlier hits stay visible
8. prerequisite check the output before it reaches Verus
   - parse it, check every name resolves, reject changed contracts
9. store only what Verus accepted
   - save the proof with its Verus version and what it depends on
   - never store a statement the verifier has not checked
10. measure with the context removed
    - run the same tasks without retrieval, without the guide, without the slice
    - otherwise you cannot tell which piece paid

### code-keyed retrieval: PropertyGPT (Solidity, Certora-style rules)
[study](../vl_paper_walkthrough/propertygpt_20261012.md)

- embed human-written critical code, not the property text
  - the study quotes the paper: "the reference properties themselves will not be embedded because they cannot be queried against by the subject test code"
- keep references with similarity at least 0.8, typically 10 to 20
- one reference per prompt, one candidate per reference
- two prompt types, one for cross-function rules and one for function pre/post conditions
- prompt says not to copy names from the example
- the Verus form is the study's inference

### staged retrieval: VeriFast specifications (C)
[study](../vl_paper_walkthrough/an_empirical_study_of_llm_generated_spec_20261012.md)

- corpus: verifier tutorials, library declarations, related programs
- BM25 (sparse) or embeddings (dense)
- input split to one function
- pick prompt and model on a pilot, then freeze them
- the strongest input also gives a correct formal contract (the study's "FB" and "FBP" forms)

### slice and decompose: AutoSpec (C, Frama-C)
[study](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md)

- call graph whose nodes are functions and loops
- specify leaves first
- the model sees only the node's code and its callees' generated specs
- few-shot examples in each prompt

### slice before analysis: LemmaNet (C, Rocq)
[study](../vl_paper_walkthrough/automated_lemma_discovery_in_agentic_pro_20261012.md)

- slice the source to what the obligation needs
- a model writes a source-level version of the goal
- helper lemmas bridge it to the real goal
- keep a library of lemmas that compiled, plus their dependencies
- the catalog line names "program slicing for semantic analysis", but in the study slicing is one clause of the method

### project index behind a language server: Eiffel-tools (Eiffel, AutoProof)
[study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md)

- index features, contracts and inheritance from the project and its libraries
- the study quotes the paper: "This information is also integrated into LLM prompts when relevant to give the relevant context to the model"
- repair prompts add the verifier error or counterexample
- output is parsed with Tree-sitter; invalid output is dropped

### library search as a tool: Lean agent with search (Lean)
[study](../vl_paper_walkthrough/automating_formal_verification_with_agen_20261012.md)

- the study quotes the paper:
  - "The tool provides access to multiple Lean search providers which handle natural language and type-pattern queries, allowing the model to broadly access lemma names"
- one conversation, a search tool and a submit tool, a call budget K
- the study's Verus form is a `search_verus` tool over project lemmas; that is inference

### standalone dependency extraction: VeruSAGE (Verus)
[study](../vl_paper_walkthrough/verusage_20261012.md)

- the study quotes the paper:
  - "Each task corresponds to one proof function or executable Rust function in the original project, with all the dependencies extracted into a stand-alone Rust file"
- the hands-on agent also runs a static pass that finds lemmas, recursive and opaque functions, so the planner enables only fitting actions
- the file name says "verusage" but the study's title is VeruSAGE

### syntax guide plus evolving guide: ProofWright (CUDA, VerCors)
[study](../vl_paper_walkthrough/proofwright_20261012.md)

- knowledge base: stripped verifier docs, hand-annotated kernels, error and fix pairs
- the guide is distilled from those and updated after each successful proof, with manual review
- sizes: about 12K words for the knowledge base, about 9.5K tokens for the guide

### local file context: Baldur (Isabelle)
[study](../vl_paper_walkthrough/baldur_20261012.md)

- prefix the theorem with up to 50 preceding statements from the same file
- left-truncate to the token budget, keep the theorem statement
- the study says it is not full premise selection

### few-shot and reusable hints
- KaPilot (Kani): similar verified function and spec pairs retrieved from a shared store.
  - the study's pipeline step stores each candidate that eventually verifies. [study](../vl_paper_walkthrough/kapilot_20261012.md)
- DafnyPro (Dafny): eight hand-written tactic patterns retrieved after failed attempts. [study](../vl_paper_walkthrough/dafnypro_20261012.md)
- proof-helper catalogue (Dafny): sequence, recursion and quantifier templates in the repair prompt. [study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md)
- AlphaVerus (Verus): starts from Verus syntax and five examples, then adds verified translations and error-repair trajectories each round. [study](../vl_paper_walkthrough/alphaverus_20261012.md)
- NL2Contract (Python): context built mechanically from signature, docs, imports, globals, callee signatures. [study](../vl_paper_walkthrough/beyond_postconditions_20261012.md)
- neuro-symbolic invariants (C): four few-shot families (inductive, with and without explanation; Hoare; Horn). [study](../vl_paper_walkthrough/neuro_symbolic_software_verification_20261012.md)
- refinement library (LLM4PR): persists successful refinement trees for tasks with the same pre/post pattern.
  - the design is described, and I found no measurement of reuse. [study](../vl_paper_walkthrough/towards_large_language_model_aided_progr_20261012.md)
- SpecAgent (ACSL): up to three examples chosen by Jaccard similarity of a 32-bit structural fingerprint,
  after filtering out units with a different loop structure or return type. [study](../vl_paper_walkthrough/specagent_20261012.md)
  - the paper reports no retrieval-only ablation
- trace-linked retrieval (hardware assertions): graph of requirements, code, diagnostics; I found no numbers for it. [study](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md)
- KBSpec (JML, OpenJML): 83 seed items (11 examples, 31 tutorials, 26 exercises, 15 repair guidelines), then grown from verifier-accepted traces. [study](../vl_paper_walkthrough/kbspec_20261012.md)
  - each item holds original content, an LLM summary and keywords; retrieval is by embedding the program, and on repair the current specification plus the error
  - items are scored against a knowledge-free baseline: helpful if only the item's run passes, harmful if only the baseline passes; near-duplicates (cosine over 0.95) are dropped
  - the memory is frozen for evaluation; the Verus form is the study's inference, as the paper has no Verus implementation
- What's in a Proof? (F* and Verus, expert behaviour) [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md).
  - experts search documentation and adapt existing lemmas; a copilot would retrieve lemmas and examples for the current subgoal
  - P2's F* Intersection proof reused library lemmas and was three times shorter than P4's from-scratch proof
  - the F* agent demonstration used GraphRAG retrieval; no retrieval-only ablation is reported

## evidence

Read each number with its denominator.
Most are one model and one benchmark.

Slicing and decomposition
- AutoSpec, 51 Frama-C programs: a three-shot whole-program prompt solves 9; decomposition solves 26 (study, Table 5)
- same table, whole-program prompts with 0, 1, 2, 3 examples solve 5, 8, 6, 9
  - so examples help a little and not steadily
  - decomposition helps far more
- VeriFast: pilot of 45 functions, GPT-4o. RAG-sparse with function splitting verifies 64%, the other prompts at most 56%

Retrieved examples
- KaPilot, 54 GoldSet functions, GPT-5: full system 31 good specs
  - without few-shot examples 11
  - direct prompting 8
  - without the requirement step 6
  - the ablations differ in more than the examples, so read them as component importance, not effect sizes
- ProofWright, one model, KernelBench L1: no knowledge base and no guide gives 0 verified kernels
  - knowledge base alone gives 0
  - ten few-shot examples without the evolving guide give 13, which the study calls 13% of the benchmark
- DafnyPro, DafnyBench 782 programs: hint retrieval adds +9.97% (Claude 3.5) and +10.86% (Claude 3.7), the paper says "percentage gains" only; reading them as points is the study's inference
- PropertyGPT, 90 held-out properties from 9 projects: recall 0.80, precision 0.64
  - on a different set, 37 vulnerability-detection cases, retrieved-code similarity averaged 0.68 for 26 detected and 0.67 for 11 missed
  - the paper has no run without retrieval

Local and project context
- Baldur 8B, 6,336 theorems, 64 samples: 40.7% without file context, 47.5% with; at 16 samples 34.8% to 40.9%
  - of five successes the authors inspected, three copied or adapted nearby proofs
- Eiffel-tools, 539 bugs: the full prompt beats the minimal one
  - Sonnet 4.6 513/539 against 486/539
  - GPT-5 Nano 443/539 against 415/539
  - "full" bundles a syntax guide, a template, variable names and the error
- VeruSAGE, 849 tasks: the best result, Sonnet 4.5 hands-off at 688/849, uses only Verus, `vstd` and a cheat checker, with no retrieval tool
  - removing the human helper lemmas from the extracted task still left 16/30 Storage tasks against 18/30
  - a three-task whole-project run took 1.6 times the time and 2.2 times the money

Lemma search and library
- Lean agent, 423 tasks, GPT-5.4: 24.6% with restart-style prompting, 60.3% at K=10 with search and one conversation, 95.0% at K=50
  - the jump bundles three changes the paper lists together: medium reasoning, the agent loop, and Lean search; no ablation isolates search
  - GPT-5.4 averaged 17.53 searches and 3.48 submissions over ten turns
- LemmaNet, 941 verification conditions: 364 proved in full
  - without offline lemmas 328, without online adaptation 302, without the semantic analyzer 301
  - of the 25 that a baseline proved and LemmaNet did not, 12 failed from conflicting imported lemmas, 7 from over-adapting a lemma, 6 from extra context sending the agent elsewhere

Few-shot style
- neuro-symbolic invariants, 499 C problems: the paper reports no comparison of the four example sets
  - its model-versus-strategy analysis finds model identity dominates strategy
  - trying all four example families in parallel often did worse than one (GPT-OSS-120B 421 against 431)

## where it fails

- the context itself is wrong or stale
  - LemmaNet: imported lemmas conflicted (12 of 25 losses)
  - Baldur: nearby proofs can leak near-duplicates, so the study advises recording provenance
- extra context pulls the model off course
  - LemmaNet 6 cases; the neuro-symbolic study found counterexample traces hurt smaller models because they lengthened the prompt
- the dependency never reaches the prompt
  - AutoSpec could not specify a function using `pow` from `<math.h>` because it was not traced in
- similarity is a weak signal
  - PropertyGPT, on its 37 detection cases: 0.68 for detected against 0.67 for missed
- a slice hides cross-file difficulty
  - VeruSAGE: the whole-project run cost 1.6 times the time; an Atmosphere task ran over an hour and was killed
- hidden source can make specs impossible
  - KaPilot hides the target body, and the study warns that incomplete documentation then blocks functional postconditions
- knowledge bases need upkeep
  - hand-written hints (DafnyPro) and a manually reviewed guide (ProofWright)
- benchmark leakage
  - Baldur, Eiffel-tools and the Lean thesis all warn that test programs may be in training data, which could inflate the gain from any context

## where the studies disagree or look odd

Disagreement
- show the body or hide it
  - KaPilot and NL2Contract hide the implementation, so a bug cannot become its own spec
  - AutoSpec, Eiffel-tools and the proof-search studies show it
  - I read this as a difference of goal: writing a spec from intent versus proving a given body
- more hands-on context versus a capable model alone
  - VeruSAGE: hands-on Sonnet 4.5 scores 67% (569/849), below hands-off at 81% (688/849)
  - for o4-mini and GPT-5 the controller wins (41% and 55%)
  - so curated context helps weak models and can hold back strong ones
- retrieval versus persistent memory
  - ProofWright: knowledge base alone gives 0 kernels; the evolving guide is what pays
  - the Lean study credits search plus persistence together

Looked wrong or unclear
- the Dafny helper study reports 98.2% as "repair@8" in text and under "r@10" in its table; the study flags this itself
- the Lean thesis study warns that 95.0% (402/423) is GPT-5.4 at K=50 on the persistent agent, not a tree-search result; keep that denominator when quoting it
- the file `verusage_20261012.md` holds the VeruSAGE study

## open questions

- does a lemma search tool help a Verus agent, with persistence held fixed?
  - no study measures this
- what is the right retrieval key for Verus proofs: function body, spec, failing error, or proof shape?
  - PropertyGPT keys on code; the Verus systems study recommends shape; neither is tested on Verus
- how many examples are enough?
  - AutoSpec's 0 to 3 shots are flat and noisy on 51 programs
- how does a slice stay valid when `external_body` stands in for a dependency?
  - the final whole-crate check is the only guard I see
- how should a library of verified lemmas age across Verus versions?
  - no study stores the version
- can an index of `vstd` lemmas replace a hand-written syntax guide?
  - untested; the guides in these studies are for Dafny, VerCors, VeriFast and Eiffel
