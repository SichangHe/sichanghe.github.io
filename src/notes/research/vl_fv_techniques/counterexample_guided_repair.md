# Counterexample-guided repair of proofs and specifications
(authored by agents unless marked 🧑)

Plain diagnostic repair, where the verifier's error message drives the fix, is on its own page: [verifier feedback repair](verifier_feedback_repair.md). This page is about the next
step. We get a concrete violating state, decide whether the program can really reach it, and pick the repair from that.

## the problem

A failed Verus proof says that an assertion might not hold. It does not say why. Three different causes look the same:
- the claim is false. Some real execution breaks it.
- the claim is true but not inductive. The invariant is too weak to carry the proof, so the solver starts from a state the program never reaches.
- the spec is wrong or empty, so the proof means nothing.

The repair differs for each. A concrete state tells them apart. If a real run reaches it, weaken or replace the claim. If no real run reaches it, strengthen the claim. That one fork is
the core of this technique.

## how to do it in Verus

None of the studies runs this loop with Verus's own solver output, except ExVerus. The other steps are my inference from tools for C, Rust, Dafny and Solidity. I mark them.

1. Get the failing obligation: the Verus error, the failing assertion or invariant, and the relevant `requires`, `invariant` and `ensures`.
2. Get concrete violating states. [ExVerus](../vl_paper_walkthrough/exverus_20261012.md) has an LLM translate the obligation into a short Z3Py query over source variables, then solves
   for several assignments. The study says it does this to "bypass Verus’s lowered SMT model (SSA snapshots and quantifiers)". This is the study's wording, not the paper's.
3. Check whether each state is real. For an invariant error, ExVerus is the one that does this in Verus. It pulls the loop into its own function, turns the invariants into assertions
   before and after one iteration, and injects each state at entry. A state counts as a start failure only if the start assertion fails. It counts as an end failure only if the start
   holds and the end fails. No LLM is involved in this check.
4. Triage. Is the claim factually wrong, or right but too weak?
5. Choose the mutation. Wrong claim: replace or relax it. Right but too weak: strengthen it, or add a missing assertion.
6. Generate several candidate edits. Rank them by how many validated states each one blocks. A candidate blocks a state when that state no longer breaks the updated invariant. Re-run
   Verus on the best. Verus is the only judge of the final proof.
7. Stop after a fixed budget. ExVerus allows ten repair rounds.

Two extra uses of the same idea, both inference for Verus:
- Vacuity probe on a spec. Append `ensures false` (or an equivalent unreachable-state assertion) to a temporary copy. If Verus still accepts it, the `requires` are contradictory and the
  spec is empty. See KaPilot below.
- Disprove a spec. If you suspect no implementation can satisfy it, prove the opposite as a separate `proof fn`. See WybeCoder below.

## variants by paper

ExVerus, source-level counterexamples with triage. [study](../vl_paper_walkthrough/exverus_20261012.md)
- This is the only study that repairs Verus proofs this way.
- It names the parts: source-level SMT counterexample synthesis, loop-based counterexample validation, triage-directed mutation, blocked-counterexample ranking.
- The triage fork is the study's own: "choose strengthen-based mutator for correct-but-non-inductive invariants or missing assertions" and "choose replace-based mutator for factually
  wrong invariants".

KaPilot, counterexample feedback plus a vacuity test, on Kani contracts. [study](../vl_paper_walkthrough/kapilot_20261012.md)
- It sorts Kani results into syntax errors, counterexample failures and vacuous successes. On a failure it sends the model the counterexample, the passing and failing harnesses, and a
  repair rule for that failure type.
- Vacuity test, in the study's words: appends `#[kani::ensures(|_| false)]`. "If the original contract verifies but the appended false postcondition also verifies, the assumptions were
  unreachable and the contract is vacuous."
- Verus form is inference, per the study: "Add a deliberately impossible postcondition or an equivalent reachability assertion in a temporary verification harness, run Verus, and
  require the temporary check to fail."

VerIbmc, ESBMC as an oracle for invariants. [study](../vl_paper_walkthrough/neuro_symbolic_software_verification_20261012.md)
- ESBMC answers provable, disprovable or unknown for each candidate predicate. A timeout or parse error is unknown, never acceptance. The study's rule: "A timeout or parse error is
  unknown, never acceptance."
- On a failed candidate it decomposes the formula into sub-formulas and tests each one (in the study's example the split is into two conjuncts). It keeps the provable atoms and records
  the disprovable ones. This is counterexample-guided in a coarse way: the checker's verdict per atom replaces the trace.
- It tried raw traces and dropped them. The study says: "Counterexample traces were tried but generally harmed smaller models because they lengthened context."

Crux, symbolic unit tests. [study](../vl_paper_walkthrough/crux_a_precise_verifier_for_rust_and_oth_20261012.md)
- Use a symbolic test as a cheap first check before a proof. Symbolic inputs, `crucible_assume!` for preconditions, `crucible_assert!` for the property. The solver either finds no
  assignment, which means the bounded property holds, or returns a concrete counterexample.
- The study says Verus has no such command: "Verus does not provide Crux's `Symbolic` trait or `cargo crux-test` counterexample search."

Kani, bounded proof harnesses. [study](../vl_paper_walkthrough/kani_20261012.md), also [Kani note](../topic_studies/formal_verification_rust/rust_verifiers/kani.md)
- `kani::any` for inputs, `kani::assume` for preconditions, `assert!` for the property, `#[kani::unwind(k)]` on loops. A satisfiable formula is a concrete failing run. The study
  suggests replaying it "with Kani’s concrete playback support or as an ordinary Rust test".
- Two honesty rules: a passing assertion with a failing unwinding assertion is "inconclusive, not a proof", and `assume(false)` makes a proof vacuously true.
- For Verus this is a pre-filter. Finding a bug in seconds is cheaper than failing to prove a false claim. That use is my inference.

PropertyGPT, BMC after a failed proof. [study](../vl_paper_walkthrough/propertygpt_20261012.md)
- If the strongest-postcondition check fails, it runs bounded model checking to find a concrete counterexample, then has a person investigate before calling it a vulnerability. Depth is
  capped at three, with up to five loop iterations.
- The decision about reachability is left to a human here.

WybeCoder, disproving an unsatisfiable spec. [study](../vl_paper_walkthrough/wybecoder_20261012.md)
- When a contract may be contradictory, the agent may either implement it or prove "some input satisfies the precondition while no output satisfies the postcondition". The agent is not
  told which case applies.
- The study says that in Verus this can be a separate `proof fn`. Report disproofs separately from implementations.
- On Verina, per the study, GPT-5 was "notably successful on 347/384" of the cases in 32-turn evaluations. The paper does not define the 384.

AxDafny, optional counterexamples in the feedback. [study](../vl_paper_walkthrough/axdafny_20261012.md)
- Dafny's verifier feeds back unmet conditions, locations "and optional concrete counterexamples". The study's own audit note says the paper only says the flag can be enabled, with no
  ablation, so this is not evidence that counterexamples help.

Knowledge graph and practitioner survey, supporting roles.
- [Knowledge graphs](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md) keeps counterexamples as nodes linked to the exact property and design location, and runs
  counterexample repair as its own loop, separate from syntax repair and coverage. This is a hardware assertion setting, not Rust.
- [Practitioner survey](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md) reports that "ten valued counterexamples" and that fifteen found communication with
  non-experts difficult, and the study says concrete counterexamples help. Interview counts, not an experiment.

## evidence, with denominators

ExVerus (numbers are from the audited study; I did not check them against the paper).
- Ten counterexamples solved 106/187 InvariantInjectBench tasks, one counterexample 100/187. A gain of six tasks.
- Mutants that block at least one validated counterexample verified in 158/245 (64.49%). Mutants that block none verified in 32/83 (38.55%). Repaired tasks: 41/51 (80.39%) against 9/21
  (42.86%). The paper says blocking "strongly correlates with success"; that these are correlations, not causal, is the study's inference.
- Ablation: mutation plus validation raised DeepSeek VerusBench success from 64.4% to 71.9%, and ObfsBench from 65.4% to 81.6%. The paper gives no denominators there, per the study.
- Cost, DeepSeek-V3.1 only: $0.04 per task against AutoVerus at $0.17, and 720.3s against 2989.1s. With GPT-4o, Table 3 gives $0.42 against $0.69 and 250.0s against 233.9s, so ExVerus
  is cheaper but not faster there.
- VerusBench uses 146 tasks, after four of 150 could not be verified with the current Verus toolchain.
- The paper's text says ExVerus is above 73% and AutoVerus below 40% on obfuscation strategies, but the study says the paper's Table 2 conflicts with that (65.2% for ExVerus, 77.3% for
  AutoVerus). I do not use the claim.

Kani.
- Eleven bugs missed by testing and fuzzing across four production codebases. One survived 16,777,216 fuzz runs and Kani found it in 20 seconds. These are bug counts, not a detection rate.

VerIbmc.
- 111 of 499 effective problems were solved by baseline ESBMC with no invariant. Headline 431/499 includes integer-relaxed successes. Run-to-run variation: GPT-OSS-120B 428 to 431.

KaPilot, Crux, PropertyGPT: the studies give no measured benefit for the counterexample step by itself.

## where it fails

- Counterexamples can be spurious. ExVerus says so and validates only invariant errors. Assertion errors may lack a well-defined counterexample, for instance a missing trigger. Other
  error classes are left to future work.
- Generation can fail. The study quotes the paper: "counterexample generation is not guaranteed to succeed". The LLM can hallucinate constraints, quantifiers are incomplete, and
  concretizing variables relaxes the query.
- Blocking sampled states is a ranking signal. A mutant can block every sample and still be wrong.
- ExVerus reuses AutoVerus for the first proof, so it does not help with writing the spec or the first annotations.
- Bounded tools prove only up to their bound. Kani's GCD harness needs `unwind(94)`, and the full-range formula "did not finish within one hour", so a sound bound can still be unusable.
- Vacuity is a trap in both directions. An `assume(false)` or a contradictory `requires` makes any proof pass. Bound checks do not catch a wrong spec that is satisfiable.
- Trace text can hurt. VerIbmc found raw traces harmed smaller models.
- No study measures whether the reachable-or-spurious fork beats giving the model the state without a verdict.

## where studies disagree

- Number of counterexamples. ExVerus gets a small gain from ten over one (106 vs 100 of 187). VerIbmc found traces harmful for small models. The settings differ (Verus with one LLM, C
  with small local models), so these do not contradict each other, but they point opposite ways on how much trace to show.
- Who decides reachability. ExVerus automates it for invariants with a Verus run. PropertyGPT leaves it to a person.

## possible errors in the studies

- The audit log corrected the ExVerus 41/51 figure (the paper's own error), the DeepSeek-only cost claim and the table references. This page now follows the corrected study.

## open questions

- Does Verus expose a counterexample model that is good enough to skip the LLM-written Z3Py step?
- Can the loop-isolation check be extended to assertion errors and postcondition errors, which ExVerus does not validate?
- How many sampled states are needed before a mutant that blocks all of them is trustworthy?
- Does a vacuity probe with `ensures false` behave the same in Verus as in Kani? The KaPilot study says Kani's interpolation behavior is tool-specific.
- Should a cheap Kani or Crux-style symbolic test run before any Verus proof attempt, to tell a false claim from a hard proof? No study tests this.
