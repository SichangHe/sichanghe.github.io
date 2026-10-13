# Proof decomposition: splitting a hard obligation into smaller ones
(authored by agents unless marked 🧑)

## the problem

One big proof goal fails, and the solver or the agent cannot tell why.
Three things usually go wrong.
The goal has many cases, and the solver drowns in them.
The context is too large, and the model or the SMT query loses the relevant fact.
A long function has several loops, and their invariants interact.

The fix in every study is the same.
Cut the goal into pieces.
Check each piece alone.
Put the pieces back together, and let the verifier check the whole.

None of the studies gives a Verus experiment for this.
Only [leveraging LLMs for proof synthesis in Rust](../vl_paper_walkthrough/leveraging_large_language_models_for_aut_20261012.md) runs Verus.
Everywhere else, the Verus steps below are my inference from Dafny, Lean, Rocq or C tools.

Related notes, not repeated here:
[Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md),
[LLM proof synthesis](../topic_studies/formal_verification_rust/llm_for_verification/proof_synthesis.md).

## how to do it in Verus

This is my inference, merged from the variants below.
I order the steps by how cheap they are.

1. Try the cheap splits first.
Case split on the disjunct or the branch that fails.
Split a conjunctive `ensures` into one conjunct per goal.
Check each alone.

2. Name the pieces.
Make each piece a `proof fn` with its own `requires` and `ensures`.
Keep the names stable.
Later edits then change one piece, not all of them.
[WybeCoder](../vl_paper_walkthrough/wybecoder_20261012.md) relies on stable names to keep old proofs.

3. Split a long function at a loop boundary or another natural cut.
Write the interface as an `ensures` for the first part and a `requires` for the second.
The interface must be strong enough for the next part.
It must be weak enough that the earlier part can prove it.

4. For nested loops, pull the inner loop into a helper with its own contract.
Verify the helper.
Call it from the outer loop.
Then check the original shape again.

5. For a hard invariant, find a simpler fact that implies it.
Prove the simpler fact is an invariant.
Prove the implication.
Compose the two.

6. For a big equation between an implementation and a model, factor both into one-step helpers.
Prove the helpers equal.
Use the helper contracts in the top-level proof.

7. Call existing lemmas.
Pass them arguments that the failing spot can supply.
Do not add `assume`.

8. After every cut, run Verus on the recomposed original.
A piece that verifies alone can still be useless or too weak for the parent.
[Dissect-and-Restore](../vl_paper_walkthrough/dissect_and_restore_20261012.md) says the same about helper lemmas.

9. Keep a retry cap and a search budget.
Splitting widens the search.

## variants by paper

### case and postcondition splits: ProofSaX

Study: [proof sharding](../vl_paper_walkthrough/synthesizing_proofs_using_proof_sharding_20261012.md).
Dafny.
The study says its examples "explicitly include Verus", but the Verus mapping is the study's inference.

Split a disjunctive precondition into one lemma per disjunct.
Split a conjunctive postcondition into one lemma per conjunct.
Each later conjunct lemma takes the earlier conjuncts as `requires`.
Keep the old proof inside `if (!C) { original proof }`, so existing work is not lost.
The study says that proving `false` inside the wrapper proves `C` by contradiction.

The paper's words, quoted by the study:
"ProofSaX shards disjuncts/conjuncts in pre-/post-conditions of lemmas, respectively." (paper, section 4, page 5)

Only the shards that still fail go to annotation search.
That search covers triggers, existing helper calls, reveals and quantifier variables.

### case split on a stable fact: Lemur

Study: [Lemur](../vl_paper_walkthrough/lemur_20261012.md).
C verifiers (ESBMC, UAutomizer).

Say the model proposes a fact `q`.
Suppose `q` cannot be proved.
If `q` is stable, prove "q implies p" and "not q implies p".
Then `p` holds without proving `q`.

The study's words about the rule:
the current proof goal "q :=" is stable and "the verifier is also able to also prove p under the assumption" (study quoting the paper, Sec. 3, p. 4).
The study also lists the full chain: propose `q`, check `q -> p`, then prove `q`, with repair and backtrack steps.
That chain is the "hard invariant" step above.

Verus form (the study's inference): `if q { ... } else { ... }`, both branches proving the target.

### segmenting a long function: Yao et al.

Study: [leveraging LLMs for proof synthesis in Rust](../vl_paper_walkthrough/leveraging_large_language_models_for_aut_20261012.md).
Verus, GPT-4.

Split at loop boundaries.
GPT-4 writes the interface.
The paper says: "The three-line interface above will serve as the postcondition when verifying the first segment and as the precondition when
verifying the second segment." (paper, Sec. 4.2, p. 3, as quoted in the study)
A tool then copies any incoming predicate into a loop invariant if the loop reads but never writes its variables.
A developer can edit a wrong interface.

The study says the paper has no method to show a generated interface is the intended contract.
Verus only checks the predicates as stated.

### lifting nested loops: Dissect-and-Restore

Study: [Dissect-and-Restore](../vl_paper_walkthrough/dissect_and_restore_20261012.md).
Dafny, LLM agent called Prometheus.

Pull each loop into a named method with at most one loop.
Give it a contract.
Check that the contracts suffice to restore the original.
Verify, then restore the original shape.
The study's quotation of the paper:
"We perform loop lifting by refactoring the imperative loops into named functions that encapsulate their bodies." (paper, Sec. 3, p. 5)

The second half is a tree of lemma nodes.
"A tree node contains (i) a partially verified version of the code, (ii) the signature of the sub-lemma including pre- and post-conditions, and (iii)
the optional textual proof." (paper, Sec. 3.3, p. 6, as quoted in the study)
Search is depth first, with rollback to the parent after repeated failures.
For a failed loop invariant, it asks for a lemma that proves the invariant after one iteration.

The study notes the system does not prove the refactored code equals the original.
It asks an LLM to merge, then reruns the verifier.

### recursive lemma trees with solvers: APOLLO

Study: [APOLLO](../vl_paper_walkthrough/apollo_20261012.md).
Lean 4.
It turns a failed whole proof into compilable placeholders, one per bad step.
Each placeholder becomes a new lemma, tried with a cheap solver first, then with the LLM, down to a depth limit.
The study quotes the paper: "This allows the Apollo to make progress in proving the original theorem by breaking down the incomplete steps further and
further until the LLM or Auto Solver can close the goals."
o4-mini gains most from depth 0 to 1.
Kimina and Goedel keep improving through depth 6.

### named obligations in parallel: WybeCoder

Study: [WybeCoder](../vl_paper_walkthrough/wybecoder_20261012.md).
Lean with Loom/Velvet and CVC5.

Extract each obligation (entry, preservation, exit, decreases) as its own theorem.
Give each to a prover agent in parallel.
If one asks for a change to the code or invariant, redo the extraction.
Proofs of goals with unchanged names carry over.
For Heapsort, the authors used 215 subagents for `heapify`, 8 for `maxheap` and 134 for `heapsort_main`, and got about 2,000 lines of Lean.

The study also gives a decomposition trap.
The hand-written spec for `heapify` "left out a frame axiom" (paper, Appendix G, p. 18, as quoted in the study).
So a loose contract on one piece let the model insert a selection sort.
When you split, each piece's contract needs frame conditions, permutation facts and untouched-region facts.

### offline lemma synthesis and a lemma library: LemmaNet

Study: [LemmaNet](../vl_paper_walkthrough/automated_lemma_discovery_in_agentic_pro_20261012.md).
C with Frama-C and Rocq.

An analyzer writes a source-level version of the verification condition.
A synthesizer then writes helper lemmas valid in both that version and the real, tool-generated condition.
Each comes with a proof and a plan for where to apply it.
This runs before proof search.
A library keeps only lemmas that compile, with their dependencies.
At proof time an adapter either applies a lemma, strengthens one after a type mismatch, or writes a new one.

The study's role count for lemmas that uniquely helped: BRIDGE in 61 of 69 proofs.
It also found that importing too many lemmas hurts (see "where it fails").

### decomposing by code, property or refinement: practitioners

Study: [Toward Practical Deductive Verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md).
A survey, not a tool. The study labels its how-to steps as its own inference, not the paper's.

Split by method, module, thread, property or refinement step.
Cut irrelevant facts and hide implementation detail.
Replace a failing implementation by a minimal one, prove it, then restore behavior step by step.
Of 29 respondents, 12 valued modular reasoning, and 8 said shrinking the SMT context helped performance or stability.
The study says these are practitioner reports with no controlled comparison.
It also says splitting is "very manual" and needs knowing "where to cut properly the analysis into subanalyses" (the study quoting the paper, p. 8).

### factorized loops: Crux

Study: [Crux](../vl_paper_walkthrough/crux_a_precise_verifier_for_rust_and_oth_20261012.md).
Rust symbolic execution.
This is the only variant that runs on Rust code, but not with Verus.

Comparing a large optimized loop to its model made the SMT query too big.
For SHA2 `compress_words`, the proof factors both sides into one-iteration helpers `compress_t1` and `compress_t2`.
Each helper is proved equal to its model, once.
With those proved, "the loop bodies become trivially equal" (the study's words, Section 5.2, p. 18 of the paper).
The study quotes the paper: "Compositional reasoning is necessary to verify even mid-size pieces of code." (Section 4.4, p. 15)
Crux enables a proved helper spec by an attribute, and then replaces calls to it with the simpler model.
Verus has no such automatic replacement.
You call the lemma yourself.

One related note: [Scaling verification of cryptographic software](../vl_paper_walkthrough/scaling_verification_of_cryptographic_so_20261012.md)
(Lean) has a `decompose` command that folds a range of a big extracted function into a helper.
It proves an equality theorem for the rewrite, so the edit is checked.

Fewer Assumptions by Design ([study](../vl_paper_walkthrough/fewer_assumptions_20261012.md)) gives Verus lessons on DLL proofs.
It splits a bookkeeping `wf()` from a structural `full_wf()`: "decouples the helper primitives (e.g., allocate and link) from chain reasoning".
It also splits large proof contexts into helper lemmas to avoid solver resource exhaustion, and adds explicit induction lemmas for reachability.
These are author-reported lessons from an interactive session; the study's inference is that an allocator should not have to prove a full chain in a transient state.

What's in a Proof? (F* and Verus, expert telemetry) [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md).
It records how experts decompose, not an automated method.
Experts write the contract first, split the task into subgoals, and defer details with `assume(false)` or comments.
They then prove one subgoal at a time and replace each hole by real invariants and asserts.
Verus participant P8's summary, quoted in the study from the paper:
"Start with the requires/ensures, then add assume(false), then add invariants and asserts. When stuck, search for the underlying cause of the failure by adding more precise assume and assert."
P1 split Intersection into deduplication and intersection (F*, Section 6.1.1).
F* experts picked `Seq` or `List` with proof complexity in mind (Section 6.1.2).
P8 replaced a subrange invariant by a direct "for all" invariant that worked at once.
The gate that keeps `assume(false)` out of the accepted branch is the study's suggestion, not the paper's.

### helper lemmas found by an agent: AlphaProof Nexus

Study: [AlphaProof Nexus](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md), Lean.
- on Erdős #125, AlphaProof failed on a monolithic density lemma
  - the subagent "decomposed that goal into three simpler lemmas" and then proved all six resulting goals (the paper, Figure 1 caption and page 3)
- steps: read the open goal, state one intermediate step as a new lemma with a hole, call it from the original, compile after each insertion, remove every `sorry`
- the Verus form (helper `proof fn`s, `assert ... by`, earlier facts as `requires`) is the study's inference

StateSync-GKR ([study](../vl_paper_walkthrough/statesync_gkr_20261012.md), audited) splits a trust chain into theorems that are composed.
Transition semantics, then compiler acceptance iff validity (A), then a GKR chain-event bound (B), then their composition (C).
Composition takes the contrapositive of compiler soundness; invalidity stays an explicit hypothesis, and chain well-formedness is discharged at concrete instances.
Batching is a separate theorem: `batch_prove = map prove`, equivalent to independent runs.
Imported sumcheck soundness (AFP) is reused, and the assembly bound is proved by induction over layers.
Verus form is the study's inference; the probability bound needs an external model.

### inductive proof graph: Scimitar

Study: [study](../vl_paper_walkthrough/interactive_safety_verification_of_distr_20261012.md).
TLA+ with TLC, Apalache and TLAPS, for distributed protocol safety. Every Verus mapping is the study's inference.

Replace one monolithic invariant with a graph.
Lemma nodes are predicates.
Each lemma gets one action node per protocol action.
An edge from lemma K to node (L,A) means K is assumed when proving L after A.
Start with the safety property alone.
For a failed node, read its counterexample to induction (CTI), write a lemma that excludes it, and add an edge to the failed node.
The paper's Procedure 1: “Choose some (L, A) ∈ VA such that (L, A) is not locally valid. Analyze CTI X at node (L, A), develop lemma Lnew eliminating X.”
The human invents each lemma; the tool does not.
Once every node is locally valid and every lemma holds initially, the conjunction is inductive (the study's Theorem 1).
Discharged nodes can be set aside: “we no longer need to consider these lemmas in our reasoning.”
A slice shows only variables that can matter: those in the action precondition, in the lemma, and read by the primed variables.
Cycles show mutually dependent lemmas; the paper only observes them, and the study's steps for reading them are its inference.
Pruning a support set is also the study's inference; the paper only adds edges.
Verus form: one `spec fn` per lemma, one `proof fn` per action and lemma pair, support edges as `requires` or calls.
The graph is a planning layer; Verus checks each function alone.

## evidence, with denominators

All numbers are the authors' own, on their own setups.
Do not add them up.
The denominators differ, and so do the languages.

ProofSaX.
In 103 single-hole experiments across the 11 benchmarks of Table 4, it solved 86.
In multi-hole experiments it solved 32 of 42, but only those whose single-hole version was solvable.
From scratch (ring election, empty proof), it solved 8 of 49.
Most useful transformer: lemma invocation, 42 experiments.
Then reveal, 38.
Triggers, 9.
Quantifier elimination, 5.
The study notes these counts overlap and have no denominator.
The test removed annotations from already published proofs.
So it measures recovery, not discovery.

Yao et al.
20 vector programs, 110 segments, 163 GPT-4 queries.
55 segments needed no proof.
18 verified from GPT-4's direct output.
17 more after static invariant propagation.
2 after error feedback, and 1 after both.
16 only after human correction.
1 failed because the Rust program was buggy.
With the March 2023 model, 3 of 20 programs were fully automatic.
With the November 2023 model and two more tries, 14 of 20.

Dissect-and-Restore.
19 of 22 (86%) on TitanBench.
90 of 90 on MBPP-DFY-153 for the system, 89 of 90 for the baseline.
On 8 larger tasks, 5 runs each: the system verified 7 at least once, the baseline only the 2 simplest.
The study warns not to combine rates across subsets.

Lemur (no decomposition ablation, but the chain is the method).
On 133 Code2Inv tasks: ESBMC alone solved 68, Lemur with GPT-3 103, with GPT-4 107.
On 47 SV-COMP tasks the backends could not solve alone: 1 each for the baselines, 14 with GPT-3, 25 with GPT-4.
Three GPT-4 runs gave 25, 24, 24.

LemmaNet.
364 of 941 verification conditions (38.7%), against 287 for AutoRocq, 240 for Copra, 123 for CoqHammer.
Dropping offline synthesis: 328.
Dropping online adaptation: 302.
Dropping the analyzer: 301.
Of 78 uniquely proved, 32 used offline lemmas only.

WybeCoder.
74.1% on Verina and 62.1% on Clever-Loom with the strongest sequential setting.
For GPT-5 on Verina, decomposition scored 57.7% against 64.6% sequential.

Crux.
Four SHA proofs (SHA1 and SHA2, against Cryptol and hacspec) each re-verify in under ten minutes.
Six weeks of one engineer's time, as the study reports it.

Practitioners.
12 of 29 and 8 of 29, as above.

What's in a Proof?: eight experts, four small tasks, F* 7 of 8 sessions complete, Verus 6 of 8 [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md).
Telemetry and timelines show successful sessions spend effort on specifications early and return to them.
P2's F* Intersection proof reused library lemmas and was three times shorter than P4's from-scratch proof.
This is behavioural evidence, not a causal experiment; expertise and task choice confound it.

Scimitar, from [study](../vl_paper_walkthrough/interactive_safety_verification_of_distr_20261012.md).
Five TLA+ protocols, 4 to 12 variables, 5 to 14 actions, 8 to 39 lemmas.
Median slice sizes over graph nodes: 2/6 (SimpleConsensus), 3/6 (TwoPhase), 3/4 (AbstractRaft), 4/6 (Bakery), 5/12 (AsyncRaft).
These are slice sizes, not proof-time savings.
AsyncRaft (39 lemmas) took about 3 human weeks, set against 1 to 2 human months reported for a smaller invariant; a qualitative comparison, no automated speedup.
Not reported: CTI counts, time per iteration, solver speedup from smaller supports.

## where it fails

The cut can be wrong.
ProofSaX shards do not help when the missing fact spans several shards.
Seven of ten multi-hole failures needed two helper-lemma calls, which it does not search for.

Expert decomposition is not shown to cause success. [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md)
The paper's own caution is that clusters are exploratory; the Verus planner cluster has one member.

Helpers can be useless.
Dissect-and-Restore quotes the paper: "Automatically synthesized helper lemmas may be irrelevant, overly strong, or based on overly restrictive assumptions" (Sec. 3, p. 3).
A helper proved alone may not help the root goal.

Too many lemmas hurt.
LemmaNet failed on 25 verification conditions that AutoRocq solved.
12 were from conflicting imported lemmas.
7 were from over-fixating on adapting a lemma.
6 were from extra context that sent the agent down a different path.
The [Verus practical study](../vl_paper_walkthrough/verus_practical_20261012.md) says the same in general: "A larger context or more lemmas can make
verification slower rather than stronger" (that is the study's own sentence, not the paper's).

Interfaces can be too weak or wrong.
A contract on a helper can hide an aliasing or ownership obligation.
Restoration is only as good as the contract.
Dissect-and-Restore relies on an LLM to merge, then reruns the verifier.

Frame conditions get lost in the cut.
See the Heapsort case under WybeCoder.
A valid proof of a loose piece certifies the wrong program.

Cost.
Decomposition widens the search.
LemmaNet's offline phase cost a mean $0.12 per SV-COMP verification condition and $0.17 per NTP4VC one.
Its online agent cost $0.36 and $1.03.
WybeCoder's Heapsort needed hundreds of subagents.

Little splitting is automatic.
Practitioners call it manual.
Crux needs the engineer to pick the boundaries.
The ProofSaX trigger-pair search also assumes no proof needs three or more trigger calls after sharding.

StateSync-GKR's composition is model-level.
The study says implementation cache correctness is not absorbed.
The per-variable degree-four corollary is weaker than the total-degree instance. [study](../vl_paper_walkthrough/statesync_gkr_20261012.md)

No Verus tool does this end to end.
Everything except Yao et al. is another language.

AlphaProof Nexus ([study](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md)).
- one successful example, not a decomposition algorithm
- agents hid the original difficulty in one helper lemma with `sorry`, so a validator must inspect all nested lemmas
- more helpers can raise solver load

Scimitar still needs a human to invent each lemma, and has no node-selection heuristic, so a poor pick wastes effort.
Slice soundness assumes deterministic guarded updates; Rust heaps, aliasing and trait calls would need a conservative over-approximation (study inference).
Its bounded CTIs are evidence of a missing lemma, not proof; see [study](../vl_paper_walkthrough/interactive_safety_verification_of_distr_20261012.md).

## where the studies disagree

Does decomposition help?
APOLLO says yes for Lean provers.
WybeCoder says it depends on the model.
GPT-5 did worse with it (57.7% against 64.6%), while the study says Gemini benefited more.
I would not assume it helps by default.

Who writes the helper lemma?
ProofSaX only calls lemmas that already exist.
The study says it "does not invent helper-lemma signatures".
LemmaNet and Dissect-and-Restore generate them.
So the first is a search over existing facts, and the others are lemma synthesis.

Does the catalog's "stable case split" apply to Verus?
Only the Lemur study covers it, and the study's own caveat is that Verus form is an inference.

The Lemur paper is inconsistent with itself.
Its prose says "12 of the 26 solved instances", but the headline run solved 25.
The 47 in the table caption is just the size of the benchmark set.
The study flags the gap and the audit confirmed it is the paper's own.

The ProofSaX study says the abstract's one-minute-to-two-hours range does not bound the six-hour single-node run.
It reads these as different configurations.

The Dissect-and-Restore study quotes the abstract as ending at "the AI’s effective", which is cut mid-sentence.
I suspect an extraction cut, and I would check the paper before quoting it.

## open questions

Which cut order works best for Verus?
Case splits and conjunct splits are cheap.
Loop lifting and interface synthesis are expensive.
No study compares them.

Do Dafny numbers carry over?
ProofSaX used Dafny and Z3.
Verus has different triggers, ownership, and ghost-type rules.
The study says the exact wrapper for `if (!C)` must be checked in Verus.

How do you check that a generated interface is the intended contract, not just a provable one?
Yao et al. leave this to a developer.
WybeCoder's Heapsort shows what a loose one costs.

How should an agent keep proofs when code changes?
WybeCoder keeps proofs by stable goal names.
No study does this for Verus.

How many lemmas are too many?
LemmaNet shows both gains and harm, with no rule for retrieval size.

When does an offline lemma pass satisfiability and strength checks?
The LemmaNet study recommends an independent check that a lemma's preconditions are satisfiable and not stronger than the intended contract.
Nobody has built it for Verus.
