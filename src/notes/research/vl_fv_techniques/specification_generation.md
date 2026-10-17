# Specification generation
(authored by agents unless marked 🧑)

## short version

- the specification comes from somewhere other than the human: documents, comments, tests, or the code itself
  - a model drafts `requires` and `ensures`, a tool derives some mechanically, or both
- the verifier only checks that code and contract agree
  - it does not check that the contract says what was meant
  - that check has its own page: [specification quality checks](specification_quality_checks.md)
- fourteen studies cover it, in C, Dafny, Move, Eiffel, Solidity, Python and SystemVerilog
  - none targets Verus
  - every Verus step below is my inference, not a study's
- the ideas that recur
  - choose the source of intent first, and decide whether the model may see the implementation
  - go callees first, loops as their own nodes
  - validate each round before keeping a clause
  - revise contract and proof together when the proof fails
- related: [loop invariant synthesis](loop_invariant_synthesis.md), [proof decomposition](proof_decomposition.md),
  [context for the model](context_for_the_model.md), [verifier feedback repair](verifier_feedback_repair.md),
  [anti-cheating prerequisite checks](anti_cheating_prerequisites.md)
- wider note: [specifications in the formal verification of Rust topic study](../topic_studies/formal_verification_rust/llm_for_verification/specifications.md)

## the problem

Verus needs a `requires` and `ensures` on every function, and an `invariant` on every loop.
Writing them is slow, and an agent that writes the code will also write a contract that its own code satisfies.
That contract can be weak, wrong, or a description of the bug.

So the question is where the contract's content comes from.
There are four sources in the studies.

- documents: safety sections, docstrings, requirements text
- tests: concrete inputs with expected outputs
- code: the body, the callers, the bytecode
- the model's own guess, filtered by the verifier

## how to do it in Verus

No study gives a Verus pipeline. This order is my inference from the studies; each step names its source.

1. pick the source of intent, and write down what the model may see
   - documents or docstrings only: implementation-blind, so a bug cannot leak into the contract
   - code allowed: the contract may describe the bug
   - [KaPilot study](../vl_paper_walkthrough/kapilot_20261012.md), technique 3
2. extract requirements as short atomic sentences, each with a source tag
   - one property per sentence, no duplicates, no contradictions, each variable mapped to a parameter or the return value
   - KaPilot checks six rules and loops up to three times on feedback
   - [KaPilot study](../vl_paper_walkthrough/kapilot_20261012.md), technique 1
3. after steps 5 to 7 have given the loop invariants, derive the routine part mechanically, if you have a tool for it
   - abort conditions, frames, and the postcondition that control flow already fixes
   - the Move study does this with weakest preconditions, and runs it after invariant synthesis
   - Verus has no such tool in the studies
   - [Move study](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md), technique 1
4. build a graph of functions and loops, and order it callees first
   - a loop is a node with its own invariant
   - [AutoSpec study](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md), technique 1
5. at each node, ask the model for a list of candidate clauses, not one answer
   - give it only that node's code and the already-kept contracts of its callees
6. run Verus and keep a clause only if it compiles and is satisfiable
   - AutoSpec delays satisfiability checks for an inner loop until the outer loop supplies context
   - reject `assume`, `admit` and `external_body` additions, or label them; the studies warn of this, none implements it for Verus
7. test adequacy separately: does the target assertion now verify?
   - a satisfiable clause can still be too weak
   - if not, revisit the node, up to a fixed bound; AutoSpec's default is five rounds
8. when a proof fails, ask which side is wrong, the contract or the proof
   - revise the contract, the lemma, or the code, and recheck the dependents
   - [assurance cases study](../vl_paper_walkthrough/assurance_cases_20261012.md), technique 1
9. combine across candidates
   - if you sampled several, take the weakest usable `requires` and the strongest usable `ensures`, then reverify
   - [KaPilot study](../vl_paper_walkthrough/kapilot_20261012.md), technique 6
10. delete clauses one at a time, replaying the proof, to keep the contract small
    - see [proof minimization](proof_minimization.md)

Two cautions on the order.
Step 3 runs late on purpose: the Move paper found that running weakest preconditions before invariant synthesis gave vacuous specifications.
Step 6 is a filter, not a judgment: a clause that survives can still say the wrong thing.

## variants by paper

### documentation-derived requirements, implementation-blind

[KaPilot study](../vl_paper_walkthrough/kapilot_20261012.md), Kani, unsafe Rust.
Five agents: harness, safety requirements, contract generation, precheck, verify.
The contract writer never sees the target body.
The paper's words: "We exclude the source code of the target function, because we believe that the actual implementation would interfere with LLMs’ understanding of safety properties."

- it also appends `#[kani::ensures(|_| false)]` to catch a contract whose assumptions are unreachable
  - if that false postcondition still verifies, the `requires` is contradictory
- the study notes that dropping the source "can make functional postconditions impossible when documentation is incomplete"
  - that sentence is the study's, not the paper's
- Verus form is the study's inference; Kani memory predicates have no one-to-one Verus equivalent

### natural language in the docstring to pre and postconditions

[Beyond Postconditions study](../vl_paper_walkthrough/beyond_postconditions_20261012.md), NL2Contract, Python.
The model sees signature, docstring and context, not the reference body, and writes both a precondition and a postcondition.
Postcondition-only inference gives false alarms on inputs the docstring excludes.

- soundness check in one verifier call: conjoin the trusted precondition into the postcondition, then verify the reference
  - the paper's words: "By this construction, we can check soundness within a single verifier call."
- a model-written contract is accepted only if it passes that check
- the study maps `Pre` to `requires` and `Post` to `ensures`; that mapping is its inference

### tests as the source of intent

[Dafny test-oracle study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md).
Keep the test calls with their `assert`s, strip every annotation, and have the model write contracts.
The contract is accepted only if all test assertions prove.
The paper says static tests act by "validating specifications at compile time rather than implementations at run time" (quoted in the study).

- negative tests marked `//@invalid` are uncommented one at a time and must fail to prove
  - a negative test that proves exposes a weak precondition or an overly strong postcondition
- the generate, check, repair, minimize loop reaches 108 of 110 programs; see evidence

[ProofRover study](../vl_paper_walkthrough/assured_automatic_programming_via_large__20261012.md) also treats a trusted test as a fact the repair must keep, to block `ensures true`.

### the model's loop invariants, then weakest preconditions

[Move study](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md), Move Prover.
The model first supplies the loop invariants and high-level properties that weakest-precondition analysis cannot derive.
Then the analysis runs on a reference-free, contract-instrumented form, cutting loops at their headers.
The paper's words: "The WP analysis provides a sound, mechanical baseline for inference."

- the model also simplifies the raw output into a compact contract
- the paper gives examples and no denominator

### loop-aware call graph and hierarchical rounds

[AutoSpec study](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md), C and Frama-C.
Nodes are functions and loops; generation runs from leaves up; each node is revisited until the target assertion proves or a bound is hit.
[SpecSyn study](../vl_paper_walkthrough/specsyn_20261012.md) adds a dependency graph with strongly connected components kept together, one annotation site at a time, and a planning sketch.
SpecSyn also feeds surviving mutants back: a contract that still verifies on a mutant is missing something.

### typed state machine and a frozen invariant layer

[OSVBench study](../vl_paper_walkthrough/osvbench_20261012.md), Hyperkernel.
The model writes a state-machine transition inside a small typed syntax; the safety invariants are fixed and not the model's to change.
Acceptance means the verifier gives the same results as an oracle specification across all kernel implementations in the task.
The paper's words: "If both state-machine specifications produce the same verification results for all kernel implementations, the generated one is considered correct."

- the study maps this to a ghost transition function and a frozen protocol invariant in Verus; that is its inference

### intermediate property language

[PropertyGPT study](../vl_paper_walkthrough/propertygpt_20261012.md), Solidity.
The model writes in a small grammar of invariants, pre/post triples and rules, which a compiler checks.
Retrieval of similar audited code and its human-written property gives a one-shot example.
Compile errors go back to the model.
The paper's words: "even when the compiler does not report any errors, it does not mean that the generated property is fully correct".
A static check rejects a rule that never calls the target function.

### contract and proof co-evolution

[Assurance cases study](../vl_paper_walkthrough/assurance_cases_20261012.md), VST in Rocq.
The paper's words: "A usable, provable pair is therefore the outcome of an iterative co-evolution, not of a single synthesis pass."
Its example: weak `list_push` postconditions returned an arbitrary list, so `list_length`'s precondition could not be established.
Stronger postconditions fixed the callee, not the caller.

[ProofRover study](../vl_paper_walkthrough/assured_automatic_programming_via_large__20261012.md), Dafny.
The paper's words: "repair the code and its specification such that the verification of the repaired program against the repaired specification succeeds."
It splits verification conditions into hard facts (passing parts and trusted annotations) and soft facts (failing parts), and asks the model for patches that keep the hard ones.

### evolving knowledge base for JML

[KBSpec study](../vl_paper_walkthrough/kbspec_20261012.md), OpenJML, Java.
Retrieve documentation and past verified traces as advice while generating and repairing a specification.
The verifier still decides; the study says "retrieved text is advice, not evidence."
Details are on [context for the model](context_for_the_model.md).

### planned, retrieved, repaired and critiqued: SpecAgent (ACSL, Frama-C)

[SpecAgent study](../vl_paper_walkthrough/specagent_20261012.md).
A Planning Agent lists targets, intended meaning, dependencies and order before any contract is written.
Retrieval takes up to three structurally similar examples from 184 tutorial units, ranked by Jaccard similarity of a 32-bit fingerprint.
Edits are limited to annotations, never code.
The paper's words: "the agent is only allowed to add or modify ACSL annotations, without permission to modify any code implementation itself."
A Critique Agent after proof success answers accept, improve (local) or replan (dependency).
The Verus form is the study's inference, and the study says the C and Frama-C context does not transfer.

### other sources, briefly

- [VeriFast study](../vl_paper_walkthrough/an_empirical_study_of_llm_generated_spec_20261012.md): how much formal input helps, natural language versus formal behavior; see evidence
- [Teaching Code LLMs study](../vl_paper_walkthrough/teaching_code_llms_to_reason_with_interm_20261012.md):
  executable assertions at internal checkpoints, kept only if they hold on correct runs and reject mutants
- [Knowledge graphs study](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md): SystemVerilog assertions; adds properties for behavior that formal coverage shows is unexercised
- [Eiffel and language server study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md):
  the model adds `require` and `ensure` clauses; names and call arities are checked before insertion
- [Agentic proving study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md): guided multi-interpretation synthesis (Lean 4, CLEVER)
  - prompts add examples, formal tests and a policy for behaviour outside the valid domain; the last asks for up to four defensible specifications
  - Verus use is the study's inference: ask for a few candidate contracts where prose is ambiguous, check each with Verus and tests, then have a person choose

## evidence

Every number is the paper's, through its study, and uses the paper's own denominator.
None are Verus numbers, and the settings differ, so I do not compare across lines.

- KaPilot, 54 functions with expert ground truth, Kani
  - good, bad, failed: GPT-5 31, 17, 6; Claude-Sonnet-4 34, 16, 4; DeepSeek 28, 15, 11
  - "good" means Kani passes and the precondition is no stronger and the postcondition no weaker than ground truth
  - against an adapted AutoSpec on GPT-5: 31 good versus 17, 6 failed versus 14
  - removing the requirement agent: 6 good of 54; direct prompting: 8 of 54
  - 70 further functions have no ground truth: 50, 48 and 48 pass, with no quality label
- NL2Contract, 164 Python tasks
  - sound at one sample: 66.7% to 81.1%, against 11.5% to 13.4% for postcondition-only
  - 10.4% to 12.4% of its samples still violate the reference precondition
  - complete over the mutant set: 12.9% to 29.9% of contracts, against 2.8% to 4.8%
- AutoSpec, Frama-C
  - 51 programs: 9 solved by a three-shot whole-program prompt, 26 with decomposition, 31 with iteration
  - 199 of 251 over five benchmarks; the 79% is not a rate on the 6-function X509 slice
  - gpt-3.5-turbo is the main model
- SpecSyn, 50 files and 1,365 target assertions
  - GPT-5 precision 96.68%, recall 75.91%; recall is measured against hand-written reference contracts
  - without decomposition 85.29% and 63.25%; without refinement 94.63% and 70.57%
  - the abstract says 1,071 of 1,365; Table 3's seven entries sum to 1,027 proved and 1,372 targets, per the audited study
  - on Contiki the baseline Preguss proves 103 and SpecSyn 73
  - 3.62 hours per file against 1.42 for Preguss
- OSVBench, 245 tasks
  - best model 55.10% at one sample (135 of 245); zero-shot 0% for all models
  - one repair round fixes 14.67% of GPT-4o's wrong specifications, a second 1.56%
- PropertyGPT, 90 held-out properties from 9 projects
  - recall 0.80, precision 0.64, F1 0.71
  - compile repair: 321 of 370 candidates compile, against 234 of 370 without repair
- Dafny with tests, 110 programs
  - two models in parallel with repair: 108 of 110 within ten attempts; direct multimodel prompting 57.3% by five
  - 106 of 110 generated contracts are logically equivalent to the manual ones; four are not, three with weak preconditions
- ProofRover, Dafny
  - 60 program and specification pairs that disagree: 37% aligned on average (22.2 of 60)
  - 253 pairs whose tests disagreed: 30% against 27.3% for naive repair
- assurance cases, VST: 299 functions in six benchmarks pass with no admitted obligation
  - that is memory safety and leak freedom under the contracts, not functional correctness
- VeriFast, 303 functions, 2,727 outputs: 855 verify (31.4%)
  - given formal behavior 39.9% (363 of 909), natural language only 24.6% (224 of 909)
  - 246 outputs (9.0%) changed the source; contracts weakened in 116 (4%) and strengthened in 146 (5%)
- Knowledge graphs: the abstract says formal coverage 78.5% to 99.4% over seven hardware designs, but Table II's range is 82.98 to 99.41
  - there is no run without the graph, so the table does not show the graph's effect
- KBSpec, 699 FormalBench-Base Java programs, OpenJML: pass rate 73.96% (GPT-5.2), 47.35% (GPT-5-mini), 62.66% (Claude-Sonnet-5), against SpecGen's 41.63%, 28.18%, 47.93%
  - C@All (mutant completeness, zero if nothing passes) 38.51%, 30.92%, 39.46%; C@Pass is lower than SpecGen on all three backends
  - on SpecGenBench (120 programs) KBSpec has higher pass rate and C@All on all three. [study](../vl_paper_walkthrough/kbspec_20261012.md)

## where studies disagree

- should the model see the code?
  - KaPilot withholds it on purpose; NL2Contract also withholds the reference body
  - AutoSpec and SpecSyn work from the code
  - the NL2Contract study says AutoSpec and SpecGen "are described as refining contracts to buggy implementations, which prevents bug detection"; that is the study's reading of the paper
  - the SpecSyn study: "Recovering a property from buggy code can faithfully describe the bug"
  - nobody measures the two choices on one benchmark, so I cannot say which is better
- how much iteration helps
  - AutoSpec: decomposition gives the big gain (9 to 26 of 51) and iteration a smaller one (to 31)
  - OSVBench: a second repair round gives 1.56%
  - the two use different tasks and models

## where it fails

- CLEVER, 161 entries ([study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md)): guidance cut generated-specification issues from 10 to 2 in one comparison
  - the multi-specification run made 290 candidates (2.76 per problem); only 15 proved isomorphic to references, across 11 entries; 66 entries got ISSUE in at least one attempt
  - the study's reading: prompting cannot repair ambiguous intent or a defective reference
- SpecAgent, 811 targets, DeepSeek: 604 discharged (74.5%); Atomthreads only 109 of 239 ([study](../vl_paper_walkthrough/specagent_20261012.md))
  - generation alone gave recall 80.93%; adding planning gave 83.99% for DeepSeek and lowered GPT-5 from 72.14% to 71.51%
  - the authors say the ablations are not independent causal effects
  - no retrieval-only ablation is reported
- the verifier accepts a wrong contract
  - the VeriFast study counts contracts weakened or strengthened by the model: 116 and 146 of 2,727 outputs
  - ProofRover uses a trusted test to block `ensures true`
- documents are incomplete or wrong
  - KaPilot needs the Safety section to be complete and cross-references to resolve
  - NL2Contract found a docstring saying `<` where the code guarantees `<=`; deciding which is right was left to a human
- missing context, not missing skill
  - AutoSpec's `pow` case failed because the library function was never traced into the prompt
- a failed proof of a mutant is not a counterexample
  - SpecSyn counts unproved mutants as rejected; a timeout counts the same
- sparse or untrusted tests
  - ProofRover and Dafny test oracles both depend on tests that cover the intended behavior
- the target is itself supplied
  - SpecSyn fills supporting contracts around given target assertions; it does not recover the top-level requirement
- the success rate on real loops and heap code is low
  - VeriFast: loops 11.4% and concurrency 12.3% of outputs verify
- proof success is relative to assumptions
  - the assurance-cases study: contracts, external specifications and human review linking to requirements stay trusted
- a memory can teach weakening
  - KBSpec's Table 7 lists weakening postconditions as a repair strategy in 33.0-51.2% of learned repair items
  - its pass rate rises while C@Pass falls below SpecGen's; the study's inference is that item credit counts verifier success, not strength. [study](../vl_paper_walkthrough/kbspec_20261012.md)

## problems I saw in the studies

- SpecSyn: the study reports Table 3 totals that disagree with their columns (1,071 versus 1,027 proved; 1,365 versus 1,372 targets)
- Dafny test oracles: the study reports that the paper calls 98.2% both repair@8 and r@10
- the Knowledge graphs abstract's 78.5% lower bound appears nowhere in its Table II

## open questions

- does an implementation-blind contract beat a code-aware one on the same Verus tasks?
- can Verus's verification conditions give the hard and soft split ProofRover gets from Boogie? Verus does not expose partitions the same way
- how well does a weakest-precondition baseline carry to Rust, where the borrow checker and `old` do part of the work?
- what is a good stopping rule for the node revisits? The studies use fixed bounds, from two to five, with no tuning argument
- how much of a contract can be recovered from documents alone for non-memory properties, such as functional correctness?
- who decides when documents and code disagree? Two studies leave that to a human
