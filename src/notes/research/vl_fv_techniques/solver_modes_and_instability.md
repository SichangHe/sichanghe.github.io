# Solver modes and instability: matching the proof mode to the obligation, and coping with a slow solver
(authored by agents unless marked 🧑)

## the problem

An SMT solver is a heuristic.
The same true fact can be proved in 10 ms, in 10 minutes, or not at all.
Which one you get depends on the theory the fact lives in,
on what else sits in the context,
and on harmless things like declaration order.

Three questions follow.
Which proof mode fits this obligation?
How do I tell a hard query from an unstable one?
What do I do when it times out?

Triggers and quantifier instantiation are a large cause of slowness.
They have their own page,
[triggers and quantifiers](triggers_and_quantifiers.md),
and I do not cover them here.

The studies give Verus syntax only in the Verus papers.
Where I map a Lean, Dafny, Move or C idea onto Verus, I say it is my inference.

## how to do it in Verus

This is merged from the variants below.
The order of steps is mine.

1. Name the fragment of the failing obligation.
Is it machine-word bit tricks, a polynomial or product, a ring equality with modulus,
a fact about a concrete table, or ordinary linear arithmetic with quantifiers?
Only the first four need a special mode.

2. Pick the mode by that shape.
[Verus practical](../vl_paper_walkthrough/verus_practical_20261012.md) lists four.
   - `integer_ring`: ring and congruence equalities, including modular ones
   - `nonlinear_arith`: nonlinear heuristics in an isolated query
   - `bit_vector`: machine-word identities, checked as bit-vectors
   - proof by computation: an interpreter simplifies what is statically computable, then SMT gets the rest

3. Give the special query only what it needs.
The study says `nonlinear_arith` runs "without implicit context",
so you repeat the premises explicitly.
For `bit_vector`, the result comes back as an integer-level fact,
but you still prove the bounds and overflow facts yourself.
The words about premises are the study's reading of the paper.

4. Prefer a library lemma when one exists.
[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md)
says to use `vstd::arithmetic` lemmas "when a library theorem is easier than a solver".
Those are the study's words.

5. Keep integer and bit-vector reasoning apart.
The Verus study says "uncontrolled mixing of integer and bitvector reasoning leads to fragile proofs".
Those are the study's words about the paper.
Prove the bit fact in a `bit_vector` assertion.
Then use the result in the integer proof through its stated range.

6. If a mode does not close it, cut the obligation.
Prove a smaller fact at the failing point, then use it.
See [proof decomposition](proof_decomposition.md).
[Schwarz](../vl_paper_walkthrough/schwarz_20261012.md)
does this with 10 to 20 second local timeouts.
A quick timeout tells you the context, the theory, or a missing lemma is wrong.
Extend a timeout only for an obligation that is hard in itself.

7. On a timeout, escalate in a fixed order, and never weaken the contract.
Strengthen the invariants.
Add spec helper functions.
Add lemmas.
Only then write an explicit proof script.
This order is from the Move study (next section).
The Verus mapping to `lemma` functions, `reveal` and `broadcast` is the study's, and unchecked in Verus.

8. If the proof passes but only barely, measure it.
Make equivalent versions of the query and look at the spread of their run times.
Keep the version that is fastest and steadiest.
(This is the instability technique, below.)

9. If only a part is left that SMT cannot do, hand it to an interactive prover.
This needs a Verus-to-Lean or Verus-to-Rocq bridge.
No study shows one for Verus.
Treat step 9 as inference from WybeCoder.

## variants by paper

### choosing a mode by the shape of the obligation

[Verus practical](../vl_paper_walkthrough/verus_practical_20261012.md)
is the only study from the Verus authors.
It says the design is to "organize proof obligations so they play to different automation strategies".
That phrase is the study's paraphrase of §1, not a quotation of the paper.
It says Verus "aggressively prunes the context sent to the SMT solver to eliminate imported but unreachable definitions".
That is a paper quotation, given by the study.
The study also lists the four modes above and the EPR mode for a restricted first-order fragment.
EPR (a decidable fragment) is used for IronKV's delegation map.
Its cost can exceed its gain:
about 25 default proof lines versus about 100 lines with the EPR abstraction, in a small lock example.

[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md)
makes solver choice an action for an agent.
Its planner picks among actions including nonlinear arithmetic, bit-vector and integer-ring.
The accept rule depends on the action.
A nonlinear action is kept only if total errors strictly fall.
A case split may raise total errors if the targeted error goes away.
The study's example is `assert(...) by(bit_vector)` around `1u64 << max_width`.

[Schwarz](../vl_paper_walkthrough/schwarz_20261012.md)
is for C, Rocq and Rust/Verus suites, not Verus alone.
Its theory policies say to use ghost prefix summaries for array aggregates,
mathematical integers for value-level induction,
and bit-vectors only for truncation, wraparound and layout.
The paper warns "Encoding every scalar obligation as BitVec preserves C integer semantics, but BitVec performs poorly on complex arithmetic."
The study notes that globally swapping machine integers for mathematical ones can be unsound.

The three studies agree that a special mode is a tool for one fragment, not a default.
They differ in what chooses the mode.
In Verus practical a human picks it.
In VeruSAGE a planner agent picks it from the error.
In Schwarz a policy picks it from the dominant theory.

### a timeout is a proof-engineering problem

[Combining mechanical and agentic specification inference for Move](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md)
gives the escalation order in step 7.
Its example: for `pow`, the agent adds a monotonicity lemma over unbounded numbers and calls it with a trigger.
The paper says "The lemma is required for the aborts_if condition."
It also forbids weakening to get quiet.
The authors call that trading "a real property for the appearance of progress."
The prover is the Move Prover with Boogie, not Verus.

[Verus practical](../vl_paper_walkthrough/verus_practical_20261012.md)
adds an agent recommendation (the study's, not the paper's):
"Diagnose excessive instantiation before increasing timeouts."

[VerifyThisBench](../vl_paper_walkthrough/verifythisbench_20261012.md)
says a timeout is a measurement outcome,
not a verdict on correctness:
"A one-minute timeout means the attempt exceeded the measurement budget; it is not evidence of incorrectness."
These are the study's words.
Several studies agree a timeout must map to "unknown", not to "false" or "accepted":
[Lemur](../vl_paper_walkthrough/lemur_20261012.md),
[neuro-symbolic invariant checking](../vl_paper_walkthrough/neuro_symbolic_software_verification_20261012.md),
and [Schwarz](../vl_paper_walkthrough/schwarz_20261012.md).

### proof by computation

The only study with this is [Verus practical](../vl_paper_walkthrough/verus_practical_20261012.md).
It says the mode was motivated by a hard-coded CRC lookup table
whose derivation was hard to prove by directing SMT by hand.
The page-table case study invokes bit-vector, nonlinear and computation modes
62, 39 and 11 times.
I found no agent paper that uses computation mode.

### combining an SMT solver with an interactive prover

[WybeCoder](../vl_paper_walkthrough/wybecoder_20261012.md)
lowers an imperative program to verification conditions.
CVC5 discharges routine ones,
and Lean agents repair the rest.
The paper says "This approach allows users to revert to manual proofs in Lean or Rocq when automated solvers reach their limits."
The study says explicitly that the Verus mapping is its inference:
the paper targets Lean/Velvet, not Verus.
Its limits section says it does not address Rust.
Its Heapsort run used CVC5 with `auto.smt.trust true`, which adds to what you must trust.

### cooperating backends

[Lemur](../vl_paper_walkthrough/lemur_20261012.md)
uses a language model for the high-level predicate and a sound backend for the check.
Backends are ESBMC (k-induction) and UAutomizer (predicate abstraction), with a 30-second timeout per call.
The study says the Verus form is an analogy:
"BMC itself is not a Verus feature".
The paper admits "k-induction is not complete; there are properties that are not k-inductive for any k".

### measuring instability across equivalent queries

[SMT instability](../vl_paper_walkthrough/smt_instability_20261012.md)
is the main source.
It separates instability from difficulty:
a query can be slow for every variant and still be stable.
The study sums up the paper's method in these steps (the paper does not number them):
1. make mutants that mean the same thing by permuting source structure
2. run each under a fixed solver and timeout
3. compute the coefficient of variation (CV), the standard deviation of run time divided by the mean
4. compare CV across query sets of different baseline difficulty
5. report a bootstrap confidence interval, and when timeouts leave runtime data missing, fall back to success-rate z-tests

The paper uses bounded model checking, symbolic execution and SMT-Comp queries, with cvc5 and Z3.
The study says only assertion shuffling is used as the mutation.

The mitigation is proposed, not implemented.
The paper's closing advice, as quoted in the study:
"future work should consider mitigating instability by optimizing query structure for runtime".
The study gives one result: with 0.95 confidence, restructuring a hard BMC query could cut Z3 run time by up to 38% on average.
It gives no search procedure.
The Verus form (benchmark equivalent declaration, trigger and lemma forms, and store CV beside wall time) is the study's inference.
The paper tests none of it.

[ProofWright](../vl_paper_walkthrough/proofwright_20261012.md)
also reports instability, from VerCors on CUDA kernels.
The study's Figure 6 reading: verifier instability is 17% of the 100 level-1 problems, mostly (15%) from non-affine indexing.
This is a different phenomenon: a verifier failing on hard index patterns,
not a spread across equivalent queries.
I would not merge the two numbers.

### spending machines on it

[Proof sharding (ProofSaX)](../vl_paper_walkthrough/synthesizing_proofs_using_proof_sharding_20261012.md)
sends candidate checks to many prover instances with round-robin scheduling.
One ring-election search took over six hours on one 20-core node and under 25 minutes on ten nodes.
It targets Dafny and Z3.
The study says the Verus adaptations are its inference.

[Verifying the Rust standard library](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md)
is about Kani, a model checker, not Verus.
Compilation became the bottleneck at 16,748 harnesses.
Parallelism, caching, ordering and stubbing gave a reported 3.97x speedup.
The study warns that a stub is a trust boundary and must be counted in the evidence.

## the evidence, with denominators

Solver-mode choice:
- Schwarz ablation, 1,475 tasks: removing the theory policies gives 1301/1475 (88.2%), against 1367/1475 (92.7%) with them
  - removing policies and local lemmas gives 1081/1475 (73.3%)
  - the study says the policy gain is smaller on short arithmetic tasks near solver saturation
  - the suite mixes C, Rocq and Rust/Verus, so this is not a Verus number
- local lemmas alone: 1146/1475 (77.7%) without them, the same 1367/1475 with them
- VeruSAGE: hands-on planner reaches 41% (348/849) for o4-mini and 55% (467/849) for GPT-5
  - this is the whole controller, not the solver actions alone
  - hands-on Sonnet 4.5 gets 67% (569/849) against 81% hands-off, so a controller can hurt a strong model
- Verus practical page table: 62, 39 and 11 uses of the three modes
  - it is a usage count and shows no gain from picking a mode

Instability:
- the study says the authors "find significant instability in all three domains" over 60,000 query forms
  - in most categories the proportion of unstable queries is small; Table 1 ranges from 0.00 to 0.29, highest for Z3 on hard BMC queries (0.29, CV 0.61)
  - instability rises with average runtime (t = 10.5, df = 263, p < .001); whether difficulty causes it is not tested
  - no Verus workload and no end-to-end proof counts
- slowness numbers from the [tunable automation study](../vl_paper_walkthrough/tunable_automation_in_automated_program__20261012.md)
  - with ambient collection facts, about 2% of functions took twice their original time
  - worst cases rose 19.1x (34 ms to 669 ms, Splinter) and 12.4x (3508 ms to 43563 ms, Anvil)
  - these come from quantifier context, so they belong to the triggers page too

Timeouts as a share of failures:
- Schwarz: 13/1000 SV-COMP tasks "primarily time out"; most residual failures are coverage gaps
- VerifyThisBench: compile errors dominate, and the study says timeout rates stay relatively stable across prompt settings

Parallel search:
- ProofSaX ring election: over six hours on 1 node, under 25 minutes on 10 nodes; one case only

## where it fails

- No study measures instability on Verus proofs.
  The instability paper uses cvc5 and Z3 on BMC, symbolic execution and SMT-Comp queries.
- CV is sensitive to heavy tails and to timeouts, per the study.
  A high CV does not point to the axiom or trigger at fault.
- Only assertion shuffling is used as a mutation (a limit the study states from the paper).
  Other mutations may behave differently (the study's inference).
- Special modes are trusted components, per the Verus study.
  A bit-vector proof does not prove the surrounding integer bounds.
- A special mode can be worse than none.
  The EPR example cost 100 lines against 25.
- A timeout fix that weakens the contract hides the problem.
  The Move study forbids it.
- A solver-friendly lemma can still state the wrong property.
  Schwarz says dischargeable is necessary for progress, not evidence of intent.
- Interactive fallback is untested on Rust.
  WybeCoder's limits say it does not handle Rust memory models.
- Parallelism helps search, not a single hard query.
  ProofSaX and the Kani study both parallelize many independent checks.

## where the studies disagree or look wrong

- Lemur's study cites the k-induction incompleteness quote to Appendix A page 12 in one place and page 13 in another.
  I quote it without a page.
- The two instability numbers: the ProofWright study corrected 15% to 17% for verifier instability, of which 15% is non-affine indexing.
- Lemur's study also notes a count mismatch (47 instances in a caption, 12 of 26 in prose, 25 in the table).
  I use none of those counts.
- The two meanings of "instability" above (spread across equivalent queries versus failure on hard patterns) differ.
  Do not add them up.

## open questions

- How unstable are real Verus proofs under reordering of declarations, with Z3 at a fixed version?
  No study measures this.
- Which of the four Verus modes pays off for an agent, per call?
  Only usage counts exist.
- Does a model pick the right mode from the error text alone?
  VeruSAGE gives actions but no per-action ablation in the study.
- What timeout should an agent use?
  The studies use 10 to 20 seconds (Schwarz), 30 seconds (Lemur) and one minute (VerifyThisBench).
  They do not compare.
- Can the CV of a proof's mutants be a cheap CI check, run only for proofs that finished near the limit?
  This is my idea, with no study behind it.
- What would a Verus-to-Lean fallback for residual goals look like, and what does it add to the trusted base?
