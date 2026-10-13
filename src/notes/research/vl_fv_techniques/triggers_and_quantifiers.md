# Triggers and quantifiers: making the solver use the facts you give it
(authored by agents unless marked 🧑)

## the problem

An SMT solver does not use a quantified fact just because the fact is in scope.
It instantiates the fact only when a term in the proof matches a pattern, called a trigger.
So a proof fails in two opposite ways.
The needed instance is never produced, so the proof is missing a fact.
Or too many instances are produced, so the proof is slow or times out.

[Tunable automation](../vl_paper_walkthrough/tunable_automation_in_automated_program__20261012.md)
states the tradeoff:
more instantiation removes manual hints, but the search space and response time can explode.
[ProofSaX](../vl_paper_walkthrough/synthesizing_proofs_using_proof_sharding_20261012.md)
says the missing piece of a nearly finished proof is usually small:
"triggers, helper-lemma calls, definition reveals, or case splits"
(this is the study's wording of the paper's claim, not a quotation).

Five tools control this, and the studies cover all five.
Choose triggers.
Publish lemmas as quantified facts (`broadcast`).
Instantiate a quantifier by hand.
Reveal a hidden definition.
Pull a witness out of an existential with `choose`.

Related notes, not repeated here:
[Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md),
[proof decomposition](proof_decomposition.md),
[proof minimization](proof_minimization.md),
[verifier feedback repair](verifier_feedback_repair.md).

## how to do it in Verus

Only some steps below are shown in a Verus experiment.
Tunable automation and VeruSAGE give real Verus code.
ProofSaX works on Dafny, so its Verus steps are the study's inference.
The ordering of the steps is my inference, merged from the variants.

1. Read the failure first.
Ask which of the two failures it is.
If a fact that should apply does not, you need an instance.
If the proof is slow or flaky, you have too many.
Do not raise the timeout before you know.
[Verus in practice](../vl_paper_walkthrough/verus_practical_20261012.md)
advises: "Diagnose excessive instantiation before increasing timeouts."
(that is the study's recommendation, not the paper's).

2. Write quantifiers so a trigger can fire.
Put `#[trigger]` on a term that contains every bound variable
and that will really appear at the place you need the fact.
The tunable automation example:
the trigger `is_even(s.index(i))` fails to instantiate for `s.index(3)` because that term is absent.
The trigger `s.index(i)` works.
Choose the term that is present when the lemma is needed, not the one that looks most specific.

3. Instantiate by hand when you cannot change the quantifier.
Mention the term yourself.
Write `assert forall|x| ... by { ... }`, or just `assert(P(c))` where `P` is the quantified fact and `c` the instance.
This is how ProofSaX invokes `HasAtMostOneBook(s,name)`.
ProofSaX gives the rule:
"Theorem provers only instantiate a quantifier whenever all expressions in the trigger set of this quantifier are mentioned in the program scope."

4. Expose the variable first when the quantifier hides it.
If the goal is `forall name. P(name)`, introduce `name` with `assert forall|name| ... by`.
For an existential hypothesis, take the witness.
VeruSAGE's Figure 7 does this in Verus:
`assert(exists|i: int| ...)`, then `let i = choose|i: int| ...`, then split the case `i == 0`.
The ProofSaX study calls this quantifier elimination.

5. Reuse a library lemma as a quantified fact.
Write `broadcast use some_lemma;` or `broadcast use some_group;`.
In the same Figure 7, that one line was the only necessary part of the proof.
To publish your own lemma, make it a `broadcast proof fn`, give it a trigger that mentions every quantified variable, and put related lemmas in a `broadcast group`.

6. Start broad, then trim.
While you look for a proof, import a whole group.
After it verifies, ask Verus which broadcast facts the solver likely used (from the UNSAT core).
Replace the group by those facts.
Scope can be a module, a `proof fn`, an `assert ... by` block or a `calc` proof.

7. Reveal a hidden definition last, and locally.
If the proof needs the body of a hidden `spec fn`, reveal it inside the one proof that needs it.
Revealing unrelated definitions hurts.
Whether a definition is hidden by `closed` or by an opaque attribute is a Verus detail I did not find in the studies.

8. Test stability (my inference; the instability paper tests no Verus proof).
Once it passes, check whether trivial reorderings of the same proof still pass.
See "variants" for the instability paper.

## variants by paper

Broadcast lemmas and groups:
[tunable automation](../vl_paper_walkthrough/tunable_automation_in_automated_program__20261012.md)
adds `broadcast proof fn`, `broadcast group` and `broadcast use` to Verus.
The paper says broadcast proofs "must adhere to trigger rules as if they are universally quantified."
Its IronKV example exports transitivity of a key order as `trans_lt_lt` with a group `group_key_cmp_properties`.
The workflow, in the paper's words:
"enables a workflow where the developer first imports a broad set of facts in context, and when the proof is successful, trims the set of quantified facts to those relevant to the proof".

Selective all-triggers:
the same paper tests `#![all_triggers]`, which selects every valid non-redundant trigger set.
In IronKV the authors removed manual triggers where they could and added 206 annotations on 261 quantifiers.
It was a win there and did not carry to the other projects (see evidence).

Trigger synthesis as search:
[ProofSaX](../vl_paper_walkthrough/synthesizing_proofs_using_proof_sharding_20261012.md)
runs on Dafny.
It extracts trigger patterns, generates the smallest terms that match them, and sends candidates to the prover in batches.
It tries all single triggers and all pairs, and builds a covering so every pair shares a batch.
It stops at a batch that proves the shard, otherwise it raises the term size.
The study says the pair-only limit is a completeness gap.
The same tool has a reveal transformer and a quantifier-elimination transformer, described in steps 4 and 7.
The reveal transformer keeps a reveal only if it changes the prover outcome.

Plan-then-act with quantifier actions:
[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md)
gives its planning agent action families that include `reveal_opaque`, `use_lemma`, `instantiate_forall` and `instantiate_exists`.
A static analysis finds lemmas, recursive functions and opaque functions first, and disables actions that cannot apply.
Its study says the action library maps to `reveal`, `broadcast use`, `assert forall` and `choose`.
That mapping is the study's inference.

Sealing a recursive definition:
[Corten](../vl_paper_walkthrough/corten_foundational_verification_of_rust_20261012.md)
marks a recursive weakest-precondition function opaque.
It exposes only one-step lemmas, so only the leading statement or the base case unfolds.
The study's Verus translation ("opaque lemmas and controlled unfolding of recursive predicates") is an inference.

Rewriting the quantifier itself:
[Move specification inference](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md)
has the agent replace unbounded quantifiers in weakest-precondition output by bounded forms and add triggers to the ones that remain.
For overflow, the agent adds a monotonicity lemma and calls it with a trigger.

Trigger anchors and recursive reachability:
[Fewer Assumptions by Design](../vl_paper_walkthrough/fewer_assumptions_20261012.md)
(Verus, DLL invariants; the lessons are the study's reading of §3.4, pp.110-113).
Quantified invariants need usable trigger anchors.
A syntactically valid but overly specific trigger may never instantiate at the needed proof site.
The study calls this a proof-search failure, not evidence the proposition is false.
For recursive reachability it keeps "both a fuel-bounded reachability predicate and an exact-count predicate".
It gives no counts for the trigger lessons alone.

Choosing a backend:
[Kani](../vl_paper_walkthrough/kani_20261012.md)
offers `kani::forall!` and `kani::exists!` over bounded ranges.
SAT backends expand the range, so the bounds must be compile-time and small.
Z3 and cvc5 take the formula, but instantiation can fail.
The paper's example: "Z3 cannot automatically instantiate the quantifier at d = result over nonlinear 64-bit bitvector remainder".
The authors weakened the postcondition to avoid it.

Measuring brittleness:
[SMT instability](../vl_paper_walkthrough/smt_instability_20261012.md)
generates equivalent mutants of a query and measures runtime spread by coefficient of variation (CV).
Its mutations only shuffle assertions, not declarations or triggers.
It proposes, but does not implement, restructuring a query for lower runtime.
Searching equivalent lemma and trigger layouts is the study's inference for Verus.

Context pruning by default:
[Verus in practice](../vl_paper_walkthrough/verus_practical_20261012.md)
says Verus prunes unreachable definitions and picks few triggers rather than broad ones.
[Linear ghost types](../vl_paper_walkthrough/verus_linear_20261012.md)
lists trigger selection, trigger profiling and hide/reveal as existing proof tools.
Neither gives a procedure.

## the evidence, with denominators

Broadcast facts, from tunable automation.
The authors translated 49 collection lemmas from Dafny into Verus broadcast groups.
That is 25 sequence, 2 map, 10 set and 12 multiset lemmas.
They imported all of them everywhere and counted assertions that were still needed after minimization.
Counts fell from 268 to 245 in IronKV, 1158 to 1130 in Splinter, 343 to 336 in Anvil, and 449 to 415 in CapybaraKV.
That is 8.6%, 2.4%, 2.0% and 7.6%.
The count of needed `assert`s is a proxy for automation, and the paper says so.

Cost of ambient facts.
About 2% of functions took twice their original verification time.
The worst slowdowns were 3x to 19x, for example 34 ms to 669 ms in Splinter, and 3508 ms to 43563 ms in Anvil.
Of failing functions, 78% still failed within twice the original time in an experiment that removed 20 sampled assertions per project.
In IronKV 98.20% of functions stayed within 2x with ambient facts.

All-triggers, from the same paper.
In IronKV minimized assertions went from 268 to 235, a drop of 33 (12.3%).
One proof broke.
97.22% of IronKV functions stayed within 2x.
It is one project.
The paper says pervasive use in the others "produced many failures", which the study attributes to a larger search and misguided matching loops (the study's explanation, not a measured cause).

Search over annotations, from ProofSaX (Dafny, not Verus).
The paper gives no denominator for these counts.
They overlap, since one experiment can use several transformers, so they are not shares.
Of the solved experiments, trigger synthesis helped solve 9, lemma invocation 42, reveal 38, sharding 6 and quantifier elimination 5.
These come from removing annotations from published proofs, so they measure recovery of known steps.
From-scratch success was 8 of 49.
The batch size 64 was best on one workload of 1,024 trigger invocations.
The authors call it "a merely empirically derived happy medium".
By these counts triggers were useful less often than lemma calls or reveals.

Quantifier tactics in Verus, from VeruSAGE.
The paper's Figure 7 is one worked case with a 17-line Sonnet proof, of which lines 5 to 20 were redundant.
Whole-system numbers (for example 569 of 849 for hands-on Sonnet 4.5) do not isolate these actions, so they are not evidence for them.

Instability, from the SMT instability paper.
It reports instability in all three domains over 60,000 query forms, with cvc5 and Z3.
The share of unstable query sets is 0.00 to 0.29 in Table 1, so most categories are mostly stable.
Instability grows with average runtime, which the study says does not show that difficulty causes it.

## where it fails

All-triggers does not scale.
Broad triggers cause excess instantiation and matching loops.
A trigger on every `.len()` is the paper's example of a lemma that should only fire when `.add()` appears.

Ambient broadcast facts are not free.
A few functions slow down by 12x to 19x.
Imports that help one proof can break the time of another.

A reveal or a trigger cannot supply a missing invariant or a missing definition.
The ProofSaX study says the reveal transformer "does not discover a missing definition or invariant".
That sentence is the study's.

Search has gaps.
ProofSaX only tries singles and pairs of triggers, and only terms up to a size bound.
It did not handle templates or set comprehensions.

Hidden definitions confuse weaker agents.
The VeruSAGE study says Sonnet often fails in NRKernel by demanding hidden bodies, rather than calling lemmas that expose the properties.

A trigger that is valid but too specific may never fire at the proof site where it is needed
([study](../vl_paper_walkthrough/fewer_assumptions_20261012.md)); the study treats this as a search failure, not a false property.

Solvers can still fail on arithmetic inside the quantifier.
The Kani example above is the case.

Missing triggers do not always give a counterexample.
The [ExVerus](../vl_paper_walkthrough/exverus_20261012.md) study says assertion errors from a missing trigger can lack a well-defined counterexample, so
[counterexample guided repair](counterexample_guided_repair.md)
does not help here.

## where the studies disagree or look wrong

Default trigger policy.
The Verus in practice study says Verus selects few triggers rather than broad ones.
Tunable automation shows that broadening them helped one project and broke others.
These fit together if the default is conservative, but the second paper is the only one with numbers.

Triggers matter less than lemmas in ProofSaX, yet tunable automation and Verus in practice treat trigger choice as central.
The first counts annotations in already finished Dafny proofs.
The others discuss Verus users writing new quantifiers.
I do not think they contradict, but I cannot test it from the studies.

Audit status.
All studies cited here are now audited.
The audit corrected the SMT instability study heavily: its mitigation procedure was invented, and the paper only proposes optimizing query structure.
I changed the page to match.
I used each quotation only after the checker found it in the linked study.

Wording.
The VeruSAGE audit changed "opaque" to "closed" for spec functions that hide their bodies.
I did not find in any study the Verus attribute that makes a definition revealable, so step 7 stays loose on purpose.

## open questions

- Does batching trigger candidates, as ProofSaX does, work with Verus, which reports only whether the whole query failed? I could not tell from the studies.
- Can an agent pick the smallest broadcast set from the UNSAT-core report, or does it need the whole group first?
- Which of the five tools should an agent try first? No study compares them on Verus tasks.
- Does CV on trigger and lemma permutations predict which Verus proofs break after a library upgrade? The instability paper does not test it on Verus.
- Is the 12.3% all-triggers gain in IronKV an exception, or does it show in other projects after careful selection?
