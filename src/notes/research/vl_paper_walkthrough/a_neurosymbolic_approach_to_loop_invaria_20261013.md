# A Neurosymbolic Approach to Loop Invariant Generation via Weakest Precondition Reasoning
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number in Tables 1 to 4 and Figures 3 to 5 (Figure 5 bars read from the rendered page), page and listing references, Algorithms 2 and 3 step by step, the quotations and the Verus forms; changed a swapped pair of counts (run 4 is 51 preservation and 53 exit), the ordinal of a stated difference (third, not fourth), an ablation credit (the neural module as a whole, not chaining alone), an unsupported statement about JML integers, a claim that the authors wrote the hard set, a typed split that has two fix lists and not three, and marked three statements as inference; one Verus claim about unmodified values was checked against the AutoVerus paper's description of loop isolation and reworded.

source: King, Koutavas, Kovács; arXiv:2512.15816v1, 17 Dec 2025; 24 pages; Appendix A (p.18 to 24) holds all nine prompts. Page numbers are the paper's own, which equal the PDF's.

## the claim in one paragraph

NeuroInv finds loop invariants for a Java method whose JML precondition and postcondition are given. It has an LLM walk the method backwards from the postcondition, computing weakest preconditions (WP) of straight-line code and proposing an invariant per loop, with the LLM itself checking the two Hoare-logic implications that an invariant owes; then OpenJML checks the annotated method, and its error output drives repair. With o4-mini, the paper reports 99.5% average success over 5 runs of 150 programs (Table 2, p.10). Only the last step is checked by a tool. §4.2, p.14 to 15: “In other words, there are currently no strong guarantees about what these links produce; for example, the weakest preconditions produced by the loop-free link type (Fig. 2) are not formally verified in any capacity – we assume that if the final loop invariant(s) for a given program are correct, then the constituent WPs are likely correct also.”

Trusted: OpenJML 21-0.11 with Z3 4.13.4 (§3.1.3, p.9), and the given pre- and postconditions, which no step may change. The paper states its focus is partial correctness. §1.1, p.2: “Here, we focus on partial correctness.”

## the three obligations everything hangs on

For a loop with guard B, body C, invariant I and required condition Q after the loop (§1.1, p.3):
- initialisation (Definition 3): the condition before the code implies the WP of that code
- preservation (Definition 5): I and B imply WP(C, I)
- exit (Definition 6): I and not-B imply Q

And one composition rule (Definition 4, p.3): WP(C1; C2, Q) = WP(C1, WP(C2, Q)). p.3: “A core rule of the calculus states that the WPs of sequential commands are composed in a backward manner: for a sequence of commands C1 ; C2 , the WP of C2 (with respect to an overall postcondition Q) serves as the immediate postcondition of C1 (Definition 4).”

## technique 1: segment the program with marker comments

What it is: before any reasoning, split the method into loops and loop-free stretches and tag each with open and close comments, so later prompts can name a segment by index and a script can cut it out.

Steps (§2.1.1, p.5):
1. wrap the N-th loop-free stretch in `// code N open` and `// code N close`
2. wrap the N-th while loop in `// while N open` and `// while N close`
3. pass the whole tagged program in every later prompt, plus the index of the segment in question (Listings 2 to 6, p.18 to 22)

p.5: “This segmentation enables systematic processing: the marker comments allow for the programmatic extraction of the desired code segments.”

When to use: methods with several loops in sequence. The paper handles sequential loops only; its third stated difference from related work is “automatic handling of (sequentially composed) multi-loop programs” (§5.2, p.16). Inference: nested loops are not mentioned anywhere, and Algorithm 2 treats a loop body as loop-free code when it computes WP(loopBody, invariant), so a nested loop has no defined treatment.

Verus form (inference): the same comments work in a Rust function body. Nothing in Verus is needed for this step.

## technique 2: backward chaining of WPs and invariants

What it is: a chain with two kinds of link. A loop-free link turns a postcondition into the WP of a stretch of code. A loop link turns the postcondition of a loop into an invariant. Each link's output is the postcondition for the segment before it.

When to use: the postcondition of the method is known and the loops are separated by code that changes the state, so the condition each loop must establish is not the method postcondition itself.

Steps (Algorithm 2, p.6):
1. set currentPost to the method's JML postcondition (lines 5 to 6)
2. if code follows the last loop, replace currentPost by the LLM-computed WP of that code (lines 8 to 10)
3. take loops last to first (line 11)
4. the loop's required exit condition, loopPost, is currentPost (line 15)
5. ask the LLM for an invariant given the loop and loopPost (line 16)
6. validate and refine it (technique 3; lines 18 to 28); if the limit is reached, stop with an error (lines 29 to 31)
7. the accepted invariant becomes currentPost (line 33)
8. if code precedes this loop, replace currentPost by its LLM-computed WP (lines 34 to 37)
9. after the first loop, ask the LLM whether the method precondition implies currentPost; the algorithm marks this check non-blocking and does not use its result (line 41)

The WP prompt (Listing 2, p.18 to 19) gives the LLM three rules and asks it to simplify: assignment by substitution, sequence by composition, and for conditionals “( B = > WP ( S1 , R )) AND ( NOT B = > WP ( S2 , R ))”. Its worked example, p.19: for `x = x + 1;` with postcondition `x > 5` the WP is `x + 1 > 5`, simplified to `x > 4`.

The invariant prompt (Listing 3, p.19 to 20) asks for “the weakest possible loop invariant” that holds initially, is preserved, and with the negated guard gives the loop postcondition, and lists what a good one usually has: bounds on loop variables, relations between variables, quantified array properties, and progress measures.

Verus form (inference; the paper is about Java and JML):
- the method postcondition is the function's `ensures`; the precondition is its `requires`; each accepted I becomes clauses of that loop's `invariant`
- the WP of a loop-free stretch need not be trusted to the LLM: write the claimed condition as an `assert` just before the stretch and the old currentPost as an `assert` just after it; Verus then checks the stretch against both. This is the earlier verifier involvement the paper leaves to future work (§4.2, p.15).
- what does not carry over: the benchmark programs are Java and the paper says nothing about integer overflow. In Verus, arithmetic on machine integers raises overflow obligations, so the WP of `x = x + 1` over `u32` also needs a bound on `x`. The LLM rules in Listing 2 do not produce that.
- Verus asks for termination of loops through `decreases`; the paper's method produces no termination measure, and its repair prompt only allows adjusting one when it already exists (Listing 9, p.23).

Evidence for the neural module as a whole, that is, backward chaining plus the self-check of technique 3 (the paper has no ablation that separates them): the neural-only variant NeuroInv* against a single zero-shot prompt (Table 2, p.10; 150 programs, 5 runs, 750 evaluations, o4-mini): 84.7% against 66.4% average success. On the 10 hard programs (Table 4, p.14; 50 evaluations): 40% against 14%.

Where it fails: there is no backtracking. When the precondition check of step 9 fails, nothing revisits the earlier invariants (Inference: such a failure means an earlier invariant did not hold on entry, that is, was too strong or wrong). §3.2.3, p.12: “At this stage though, it is simply too little, too late – the current implementation of the neural module has no effective recourse to backtrack along its reasoning process at this point – hence, the feedback provided by OpenJML and the symbolic module is essential here for generating the correct loop invariants.” The paper found 5 of the 150 programs that the neural module never solved in 5 runs, each time because the invariant did not hold before the loop (§3.2.3, p.12).

## technique 3: LLM self-check of preservation and exit, with typed refinement

What it is: before any tool runs, the LLM is asked to judge the two implications separately, under a rule that it may use only the invariant and the guard; a failure names what is missing, and a refinement prompt with guidance specific to the failed implication produces the next candidate.

Steps (Algorithm 2 lines 18 to 28, p.6; loop link steps a to e, p.6):
1. ask the LLM for WP(loopBody, I) with the Listing 2 prompt (line 19)
2. ask whether I and B imply that WP (line 20; Listing 4, p.20 to 21)
3. ask whether I and not-B imply loopPost (line 21; Listing 5, p.21 to 22)
4. if both hold, accept I (lines 22 to 24)
5. otherwise refine I from the failed implication and its stated reason (line 26; Listing 6, p.22), and go back to step 1
6. at most MAX_REFINEMENT = 5 attempts per loop (§3.1.3, p.9)

The rule that makes the self-check useful (Listing 4, p.20 to 21, and again in Listing 5): “If you need external facts ( like preconditions ) to complete the proof , the implication ** does NOT hold ** - the invariant is insufficient and must be strengthened .” The instructions add (p.21): “3. Do NOT use preconditions , even if variables are unmodified”.

Refinement guidance differs by failure:
- preservation failed (Listing 7, p.22 to 23): add facts from preconditions about unmodified variables or arrays, facts about variables the body modifies, relations kept across iterations, bounds; the prompt also says to keep the invariant holding before the first iteration
- exit failed (Listing 8, p.23): add what has been accomplished when the loop exits, relations the postcondition needs, quantified properties over the full range; the example given is to copy a precondition about a never-modified array into the invariant

One implementation fact that affects the statistics, §3.2.2, p.11: “Note that an Implication 1 failure precludes the possibility of an Implication 2 failure being recorded – this is a by-product of the current implementation.”

Verus form (inference):
- the self-sufficiency rule is close to how a Verus `while` loop is checked: facts wanted inside or after the loop must be stated in its `invariant`. The paper's rule also demands copying precondition facts about unmodified values into the invariant; Verus needs the same by default (loop isolation, which `#[verifier::loop_isolation(false)]` turns off, per the AutoVerus paper, §5). The two refinement lists above are usable as a checklist for a failing Verus loop.
- the two implications need not be judged by the LLM. Verus reports separately that an invariant does not hold on entry, that it is not preserved at the end of the body, and that a later `assert` or the `ensures` fails; the last of these corresponds to the exit implication. Using those three reports as the typed failure gives technique 3 with a sound checker, at the cost of one Verus run per attempt.
- for existential invariants the prompt prescribes a ghost witness (Listing 3, p.20): introduce and initialise a ghost variable before the loop, update it with a JML set annotation at the end of the body, and state the invariant with it. In Verus the same move is a variable holding the witness index, updated in the body, with the invariant stated about that variable in place of an `exists`.

Evidence (standard benchmark, 150 programs, 5 runs):
- average refinement attempts per program: 0.59 (Table 2, p.10). The per-run totals in Figure 5 (p.13) are 86, 92, 83, 104, 77, which sum to 442 over 750 evaluations, 0.589; the figures agree.
- share of programs needing any refinement, per run: 37.3%, 40.0%, 38.0%, 41.3%, 40.0% (Figure 4, p.12)
- preservation against exit failures per run: 43/43, 50/42, 43/40, 51/53, 39/38 (Figure 5, p.13, bar labels read from the rendered figure: orange preservation, blue exit); Inference: with the recording rule quoted above, exit failures are undercounted whenever both failed
- hard benchmark: 2.9 refinement attempts per program (Table 4, p.14), and §3.3, p.14, says 94% of failures happened when the per-loop refinement limit was reached; the paper gives no count behind the 94%

Where it fails: the judge is the model that wrote the candidate. NeuroInv* reaches 84.7% on the standard set (Table 2, p.10). Inference: the missing 15.3% of evaluations are of two kinds that the paper does not count apart, namely runs that hit the refinement limit and runs where the LLM accepted both implications and OpenJML then rejected the result; so 15.3% is an upper bound on the false-accept rate of the LLM's implication check, per program evaluation.

## technique 4: verifier error output as repair input, with the contract locked

What it is: translate the invariants into JML, run OpenJML, and on failure hand its raw output and the program to the LLM, which may change only loop invariants and loop variants.

Steps (Algorithm 3, p.7; §2.2, p.7):
1. LLM converts the invariants to JML annotations in the method (line 2)
2. run OpenJML (line 4); if verified, return (lines 5 to 6)
3. otherwise LLM repairs the invariants from the OpenJML output (line 8) and converts again (line 9)
4. at most MAX_REPAIR = 5 attempts per program (§3.1.3, p.9); then error (line 11)

The repair prompt's scope (Listing 9, p.23): “- You MUST NOT modify method preconditions , postconditions , assignable clauses , or any other JML specifications outside of the loop .” and “- You MUST NOT modify the Java code .”

Why the lock matters is shown by the baseline. SpecGen was built to write whole specifications and rewrote the given contract; §3.1.2, p.9: “In our setting, we regard such cases as failures in the statistics reported in Section 3.2, this is because we can no longer guarantee that the verified pre- and postconditions are equivalent to the originals.” The paper says this happened for about 68% of standard-benchmark programs (p.9).

Verus form (inference): run Verus, pass its error text and the file to the model, and accept a reply only if the function signature, `requires`, `ensures` and executable statements are unchanged and only `invariant` and `decreases` clauses differ. The paper enforces the lock by prompt; it does not describe a mechanical diff check. A diff check is not in the paper.

Evidence: adding this module to the neural one raises average success from 84.7% to 99.5% on the standard set (Table 2, p.10) and from 40% to 62% on the hard set (Table 4, p.14). Average repair attempts per program: 0.24 standard, 0.54 hard. Pass@3 and pass@5 for the full system are both 1 on the standard set (Table 2).

Where it fails: the paper calls what OpenJML returns counterexamples, but the prompt receives the tool's output text as a whole (Listing 9, p.24, field `openjml_output`); no step parses concrete values or checks them. Inference: this is error-message-guided repair; whether concrete counterexample values help is not isolated by any experiment here.

## what the comparison does and does not show

- no ablation runs the symbolic module alone, that is, a zero-shot invariant followed by up to 5 OpenJML-guided repairs. Inference: the 99.5% therefore does not show that WP chaining is needed once verifier feedback is available; it shows chaining beats one zero-shot prompt (84.7% against 66.4%) and that feedback added to chaining reaches 99.5%.
- the zero-shot baseline gets one call; NeuroInv gets several LLM calls per loop plus up to 5 repairs. Cost, tokens and time are not reported.
- one model only (o4-mini), which §4.1, p.14, lists as a threat
- the standard set is small programs: 62 of 150 are single-loop integer programs from Code2Inv with no arrays (Table 1, p.8)
- the 10 hard programs were created by the authors and deliberately designed to stress-test the methods (§3.1.1, p.8; §3.3, p.13)

## numbers that do not agree inside the paper

- zero-shot success: 66.4% in Table 2 and in the text (p.10, p.11), 64.40±3.11 in Figure 3 (p.11). The other three bars match the table (28.53, 84.67, 99.47).
- loops in the hard set: the abstract says “an average of 7 loops each” (p.1); Table 3 (p.13) lists 2, 3, 4, 5, 4, 4, 8, 8, 10, 12, which sum to 60, an average of 6.
- total refinements: §3.2.2, p.11, gives a maximum of 102; Figures 4 and 5 show 104 for run 4.
- 99.5% of 750 is not a whole number; Figure 3's 99.47% is 746 of 750, so 4 failed evaluations in 5 runs.

## already done, and what is left open

Done here, so not worth redoing: a prompt set for WP-guided invariant derivation (Appendix A, complete), and a measurement that an LLM checking its own implications, with no tool, ends with a verifying result in 84.7% of evaluations on small programs and 40% on the hard ones.

Left open by the paper's own account (§4.2, p.14 to 15): checking each link with a verifier as it is produced, and backtracking when the precondition check fails. p.15: “Alleviating the fragility of these links by incorporating a verifier earlier in the invariant generation process will allow for potential errors to become localised; we leave this intervention to future work.”

## threat to a product of agent-written verified Rust

Inference: small. This is a method for one sub-task (invariants for given contracts) on single Java methods of at most 152 lines (Table 3), with one model and no cost figures. It does not write code or contracts. Its value to VL is as a recipe: a fixed order for attacking a multi-loop function (last loop first), a typed failure split (preservation, exit) with a different fix list for each, plus an entry check at the end, and the reminder that a repair loop must be barred from touching the contract, since the baseline that was not barred changed it in about two thirds of programs.

## techniques for the catalog

- marker-comment segmentation: tag each loop and each loop-free stretch with indexed open and close comments so prompts and scripts address one segment at a time
- backward WP chaining: start from the postcondition, process loops last to first, and let each accepted invariant, pushed back through the code before the loop, become the condition the previous loop must establish
- self-sufficient invariant rule: judge preservation and exit using only the invariant and the guard, and treat any need for a precondition fact as a failed invariant to be strengthened
- typed refinement guidance: on a preservation failure add facts about modified variables and kept relations, on an exit failure add what the loop has accomplished and full-range quantified facts
- ghost witness for existential invariants: keep a variable holding the witness, update it in the body, and state the invariant about that variable
- contract-locked repair: feed verifier output back to the model while allowing edits only to loop invariants and variants
- contract-change counts as failure: when scoring any tool that may rewrite specifications, count a verified result with altered pre- or postconditions as a failure
- non-blocking precondition check: test at the end whether the precondition implies the first derived condition, as a signal that an earlier invariant is too strong
