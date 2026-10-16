# LLMs and Fuzzing in Tandem: A New Approach to Automatically Generating Weakest Preconditions
(authored by agents unless marked 🧑)
Tag: `king2025llmsfuzzing`, [paper](http://arxiv.org/abs/2507.05272v2)

## problem and result
A weakest precondition (WP) is the largest set of initial states from which every terminating execution reaches a desired postcondition. The paper uses an LLM to generate candidate Java WPs and Fuzzing Guidance (FG) to refine them with execution feedback. The abstract defines the goal: “FG utilises fuzz testing for approximately checking the validity and weakness of candidate WPs, this information is then fed back to the LLM as a means of context refinement.” (Abstract, PDF p. 1.) The method targets deterministic array programs with loops, exceptions for postcondition failure, and a successful return value of 0 (§2.1, PDF p. 3).

FG has two tests. Validity-fuzzing searches for an input satisfying the candidate WP that nevertheless causes an error; weakness-fuzzing searches for an input rejected by the candidate WP that executes successfully. A failure is placed into a repair prompt, and the LLM repairs or replaces the WP. The paper emphasizes that “The outputs derived from the individual validity- and weakness-fuzzing phases ... are combined with their respective repair prompts ... in an effort to steer the LLM towards generating higher-quality candidate WPs.” (§2.4, PDF p. 4.)

The evaluation has four sets: 20 existential, 36 universal, 8 sorting, and 6 search programs (§4.1, PDF p. 7), five generation iterations per configuration, up to ten validity-fuzzing attempts per FG cycle, and 10 seconds per fuzzing invocation (§4.2, PDF p. 8). GPT-4o, GPT-4o-FG, O4-mini, and O4-mini-FG are compared (Table 1, PDF p. 8).

## technique 1: initial WP generation and explicit code contract

what it is and when to use it

Prompt an LLM with the complete deterministic Java method and postcondition, asking for a `precondition` method that returns a Boolean. Use this as a zero-shot baseline or as the first candidate in FG. The prompt requires that the original `foo` method remain unchanged and asks for a one-line pseudo-code comment describing the precondition (Figure 2, PDF p. 3).

how to do it

1. Provide the Java method, its array inputs, loop structure, and exception-producing postcondition.
2. Ask for a complete program containing unchanged `foo` and a `precondition` method with matching arguments.
3. Require `false` when the precondition is not satisfied and `true` otherwise; allow loops in the checker.
4. Parse the returned program and run it on generated inputs.

The sorting example initially generated nonzero equal lengths for `a` and `b` and required `c.length >= a.length`; validity fuzzing found a concrete failing input. After repair, the LLM added sortedness of `a`; weakness fuzzing then showed that the `c` length condition was unnecessary. The final candidate required only equal, nonzero `a`/`b` lengths and sorted `a` (Figures 6–9, PDF pp. 5–7).

Verus form

Inference: In Verus, the human should state the intended precondition as a `requires` clause and postcondition as `ensures`, with a ghost/specification function for array predicates. An LLM may propose a candidate, but Verus proof obligations must establish that the executable function satisfies the fixed contract. A Boolean runtime checker is not itself a proof of weakestness; weakestness requires an explicit logical relation or independent counterexample search.

Evidence and limits

Correctness in the paper is semantic equivalence to manually derived ground-truth WPs, judged manually (§4.2, PDF p. 7). This is a benchmark oracle, not a proof-producing checker. Unknown external method behavior is a risk: the example calls `sort` without giving the LLM a contract (§3.6, PDF p. 7). The authors suggest adding pre/postconditions for such methods when robust compositional reasoning is needed.

## technique 2: validity-fuzzing and repair-validity prompting

what it is and when to use it

Validity-fuzzing tests the implication “candidate WP ⇒ successful execution.” The paper states, “A candidate WP is valid if all initial program states which satisfy the WP wind up satisfying the program’s postcondition after it is executed.” (§2.2.1, PDF p. 3.) Use it after every initial or weakness repair to catch regressions.

how to do it

1. Generate pseudo-random initial arrays that satisfy the candidate `precondition`.
2. Execute `foo` on each input with JQF fuzzing (§2.2, PDF p. 3).
3. If an exception or postcondition failure appears, record the input and classify the WP as invalid; otherwise call it likely-valid.
4. Put the program, candidate, and failing inputs into the repair-validity prompt (Figure 3, PDF p. 4).
5. Ask the LLM to analyze why the candidate admits those inputs and return a corrected complete Java program.
6. Repeat for up to ten validity-fuzzing attempts per cycle; continue to weakness testing only after validity evidence succeeds (§4.2, PDF p. 8).

Verus form

Inference: A Verus workflow can generate concrete states satisfying a proposed `requires`, execute the Rust function in a test harness, and feed failures to an LLM. This is only a falsification loop; the final `requires`/`ensures` proof must still be checked by Verus. For mutable arrays, the harness must preserve ownership and avoid treating test execution as a proof of all states.

Evidence and limits

GPT-4o-FG averaged 16.6/20 correct existential WPs (83.00%) versus 11/20 (55.00%) for GPT-4o; on universal it reached 33/36 (91.67%) versus 26.2/36 (72.78%); sorting 5.4/8 (67.50%) versus 2.8/8 (35.00%); search 5.8/6 (96.67%) versus 4.2/6 (70.00%) (Table 1, PDF p. 8). Each average is over five iterations; percentages use the benchmark-set denominator. Fuzzing can miss rare invalid states, so “likely-valid” is deliberately weaker than proof.

## technique 3: weakness-fuzzing and repair-weakness prompting

what it is and when to use it

Weakness-fuzzing tests maximality. A candidate is weakest if every input that successfully satisfies the postcondition is accepted by the candidate. Use it after validity-fuzzing has found no counterexample.

how to do it

1. Generate pseudo-random inputs that do not satisfy the candidate WP.
2. Execute `foo`; if it succeeds, the candidate is too strong.
3. Include the successful input in the repair-weakness prompt (Figure 4, PDF p. 4).
4. Ask the LLM to remove unnecessary restrictions or replace the WP.
5. Run validity-fuzzing again because weakness repair can make a candidate invalid. The sorting example explicitly performs this cycle: a `c.length` restriction is removed, validity then regresses, and the LLM restores only the required sortedness condition (§3.3–3.4, PDF pp. 6–7).

Verus form

Inference: For Verus, weakness is a specification-level property: prove that any state satisfying the implementation’s success condition also satisfies the proposed precondition, or compare it with a reference predicate. Random tests can suggest missing cases but cannot establish universal weakestness. Keep this distinction explicit in product reports.

Evidence and limits

O4-mini-FG achieved 20/20 existential, 36/36 universal, 8/8 sorting, and 6/6 search correct WPs across the five iterations (Table 1, PDF p. 8). Its FG usage averaged 1.4, 1.2, 0.2, and 0.6 programs per iteration respectively; these are counts of programs where FG was employed, not total fuzz cases. GPT-4o-FG needed more FG interactions (averages 6.0, 7.8, 4.6, 1.8), showing model-dependent cost. A candidate passing both fuzz phases can still be wrong on an untested state or due to an unspecified method contract.

## technique 4: repeated FG cycles and trust boundary

what it is and when to use it

An FG cycle contains up to X validity-fuzzing/repair iterations followed by one weakness-fuzzing/repair iteration; multiple cycles may be run (§2.4, PDF p. 4). Use repeated cycles when repairs oscillate or when a newly weakened candidate fails validity.

how to do it

1. Set a maximum validity-repair count X and fuzzing time budget.
2. Generate or repair a candidate with validity feedback until it appears likely-valid.
3. Apply exactly one weakness-fuzzing/repair step.
4. Re-enter validity testing; stop when both tests produce no counterexample or the cycle budget is exhausted.
5. Manually compare the final candidate with ground truth for evaluation (§4.2, PDF p. 7).

Inference: In Verus, replace the final manual comparison with proof of the intended contract and retain fuzzing as a bug-finding aid. The LLM, JQF, Java runtime, unspecified library contracts, and the manually derived ground truth remain trusted or semi-trusted components; fuzzing feedback does not make them proof kernels.

## what is proved, what stays trusted, and product threat

The paper measures semantic equivalence to manually derived WPs, stability over k=5 runs, and FG usage/success. It does not prove that fuzzing is exhaustive, that an LLM’s repair is weakest, or that unspecified `sort` behavior matches the intended contract. Inference: For VeruLaw, the reusable pattern is generate–execute–repair–recheck, with Verus as the final proof gate. The main threat is accepting a specification that is merely valid on sampled states or stronger than required; a product should report denominators, fuzz budgets, counterexamples, and proof status separately. Existing work already supplies the FG loop and benchmark methodology; VL should adapt its feedback boundary to Rust/Verus rather than claim random testing establishes formal weakestness.

## techniques for the catalog

- initial contract generation — prompt an LLM to emit a Boolean precondition checker alongside unchanged program code
- validity-fuzzing — execute randomly generated states satisfying a candidate and feed failures to a repair prompt
- weakness-fuzzing — search states rejected by a candidate that nevertheless execute successfully, then remove unnecessary conditions
- iterated fuzzing guidance — alternate bounded validity repair with weakness repair and retest after every change

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
