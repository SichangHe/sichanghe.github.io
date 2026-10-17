# Can ChatGPT support software verification?
(authored by agents unless marked 🧑)
Tag: `janen2023chatgpt`, [paper](https://arxiv.org/abs/2311.02433)

Audit: audited 2026-10-13 against the paper; checked every Table 1 cell and column sum, all counts and fractions, page and figure references, quotations, the prompt in Appendix A, and the Verus sketch of Figure 1; changed: a section reference for step 1, the placeholder name, one general claim about the checker taken from a single case, one unmarked inference on timeouts, and the procedure of the no-invariant run marked as the study's reading; the Verus statements on shifts and bit_vector in technique 5 are left unchecked.

source: Janßen, Richter, Wehrheim (Oldenburg), arXiv:2311.02433v2 (v2 dated 14 Oct 2025); 8 pages of text, references, Appendix A (pp.13-14) with the full prompt

## measured, and trusted

Nothing is proved. One experiment is reported: GPT-3.5 proposes one loop invariant per program for 106 single-loop C programs; Frama-C decides which proposals are invariants; Frama-C and CPAchecker are then run with them. The headline (§3, p.6): “We find that ChatGPT can generate valid loop invariants for 75 out of 106 tasks (as validated by Frama-C).”

Trusted: Frama-C WP as the judge of validity, and the two verifiers' answers. The judge is one-sided, as footnote 6 (p.4) says: “Note that a negative answer of Frama-C does not necessarily mean that the candidate invariant is invalid.” So 75 is a lower bound on valid proposals, and no proposal is ever shown wrong.

The paper is short and early (model snapshot June 2023). Its value for a reader today is the evaluation protocol, which separates an invariant being true from an invariant being of use, and a few observations on what a model does when asked for an invariant.

## technique 1: ask for the invariant as an infilling at a marked place, with a fixed last line

What it is. The program is given whole, with a placeholder comment where the invariant belongs; the model must fill the placeholder and end its answer in a fixed, machine-readable form.

When to use. When an LLM's answer must be put back into a source file by a script, at one known location.

How it is done (§2, p.3; §3, p.4; Appendix A, pp.13-14).
1. Remove existing invariant annotations from the program (§3, p.4).
2. Insert `//@ loop invariant [invariant];` on the line before the loop (Figure 1 shows the placeholder as `[mask]`, the Appendix prompt as `[invariant]`).
3. Send one prompt, the same for every task. Its text (Figure 5, p.14): “Compute a loop invariant for the annotated loop including [invariant] in the following C code.” followed by: “Please use the format of ACSL annotations and always end your response with //@ loop invariant X ; where X is the computed invariant.”
4. Sample several answers. The setup (§3, p.4): “During our evaluation, we set the sampling temperature of ChatGPT to 0.2 and sample up to k (k = 5) completions per task.”
5. Extract the invariant from each answer with a regular expression (Appendix A, p.13).

The paper's example (Figure 1, p.2): for `unsigned int x=n, y=0; while (x>0) { x--; y++; } assert(y==n);` the model returns `x+y==n`.

The authors report that the prompt form was found by trial (§2, p.3): “We arrived at this form of stating the task after several experiments with different prompts.” The other prompts and their results are not given.

Verus form. Inference: the placeholder goes in the loop header, where Verus takes its `invariant` clauses. The paper's Figure 1 becomes:

```rust
verus! {
// sketch, not machine-checked
fn func(n: u32) {
    let mut x: u32 = n;
    let mut y: u32 = 0;
    while x > 0
        invariant
            x + y == n,   // the infilled clause
        decreases x,
    {
        x = x - 1;
        y = y + 1;
    }
    assert(y == n);
}
}
```

What changes: Verus also wants a `decreases` clause for the loop, and it checks that `y + 1` does not overflow, which here follows from the same invariant and the loop condition; a C verifier checking only the assertion needs neither. So in Verus one infilling often has to carry bounds as well as the functional fact. What does not carry over: nothing in the prompt shape is specific to ACSL.

Evidence. The model returned a candidate for all 106 of 106 tasks (§3, p.6). No rate of unparseable answers is reported.

Where it fails. One loop per program only; the benchmark was filtered to such programs (§3, p.4). The model is told nothing about the checker (§4, p.7); in one reported case (Figure 2) this gave a candidate the checker could not process (technique 5).

## technique 2: judge each candidate in two separate steps, valid then useful

What it is. Two definitions and a test for each. The definitions (§2, p.2): “A valid loop invariant is an invariant that (1) holds true before the first loop execution and (2) after each loop iteration.” and “A useful loop invariant is a valid loop invariant that is also useful for proving the given program correct.” The operational meaning of useful (§3, p.5): “Useful here means that the verifier cannot complete the verification task without the invariant.”

When to use. To evaluate any generator of invariants or other proof hints; and inside a repair loop, to tell a wrong hint from a true but idle one.

How it is done (§3, pp.4-5).
1. For each candidate separately, annotate the program with that one candidate and run the validity checker with a short limit. The paper's rule: “We count loop invariants as validated only if Frama-C WP can validate them within 10s.”
2. Keep the candidates that pass. A task counts as having a valid invariant if at least one passes.
3. Join the survivors (technique 3) and annotate the program with the result.
4. Run the verifier on the annotated program, and also on the program with no invariant (Inference: the paper defines useful this way but does not describe the no-invariant run separately). Limit 900 s, 24 cores, 128 GB.
5. Count the invariant as useful when the first run verifies and the second does not.
6. Keep the verifier from finding the invariant itself, or step 5 measures nothing. For CPAchecker the authors run k-induction without loop unrolling and say why in footnote 1 (p.2): “In case of CPAchecker, we restrict CPAchecker’s own invariant generation facilities as to be able to see the plain effect of the generated invariant.”
7. Run the same steps 3 to 5 with the benchmark's human-written invariant, for comparison.

The paper's illustration of the gap between the two notions (§2, p.3), for the Figure 1 program: “The invariants x <= n and y >= 0 also represent valid loop invariants but they are not useful for proving the program correct.”

Verus form. Inference: Verus does both steps in one run and reports them apart. A candidate that is not valid shows up as an invariant failing before the loop or at the end of the loop body; a candidate set that is valid but not useful shows up as a failing `assert` or `ensures` after the loop while every invariant holds. Step 4's run without the invariant is still worth doing in Verus as a minimization step: delete one `invariant` clause, rerun, and keep the deletion if the function still verifies. Step 6 needs no action, because Verus infers no loop invariants. What does not carry over: the 22-against-36 contrast between a deductive verifier and a model checker; Verus sits on the Frama-C side, where every verified task needed its invariant.

Evidence (Table 1, p.5; GPT-3.5 June 2023 snapshot, temperature 0.2, up to 5 samples; SV-COMP Loops tasks with existing ACSL annotations, one loop, and valid assertions).
- valid: at least one validated candidate for 75 of 106 tasks.
- Frama-C: 22 tasks verified with the model's invariant and 28 with the human one; in both columns every verified task is also counted useful (22 and 28), so Frama-C verified none of them unaided.
- CPAchecker k-induction: 36 tasks verified with the model's invariant, of which 15 useful; 40 with the human one, of which 19 useful. So 21 of the 36 verify without any invariant.
- Per subcategory the spread is wide. loop-zilu: 18 of 22 validated, 10 verified by Frama-C. loops-crafted-1: 17 of 21 validated, 0 verified by Frama-C, and 0 with the human invariant either.
- All column sums in Table 1 match their totals (recomputed).

Where it fails.
- Inference: the checker's 10 s timeout can turn slow proofs into rejections (footnote 6 says only that a negative answer need not mean invalid), and in the Figure 2 case a type conversion error turned a sensible candidate into a rejection (technique 5). Of the tasks without a validated candidate the authors judged about a third to have a sensible one (§3, p.6): “In total, we found by manual inspection that 10 out of 31 invariant candidates not validated by Frama-C are meaningful.” The 31 is 106 − 75, a count of tasks, although the sentence calls them candidates.
- Valid is far from enough. With Frama-C, 75 tasks had a valid invariant and 22 were verified: 53 of 75 valid invariants did not lead to a proof. The human invariants did little better, 28. The paper does not analyze those 53.
- The usefulness runs were made only on tasks that had a validated candidate (§3, p.5, the sentence beginning “On the right side of the table”), so the human-invariant columns appear to be out of 75, not 106, though the caption of Table 1 says 106; the paper does not state the denominator of those columns.

## technique 3: conjoin every candidate that validated on its own

What it is. All individually validated candidates for a loop are joined with `&&` into one invariant before the usefulness run.

How it is done (§3, p.5): “If multiple invariants are validated per task, we conjunct them to a single invariant and annotate the task with the conjuncted invariant.” The justification is footnote 7: “The logical conjunction of two valid invariants is again a valid invariant.”

When to use. When several samples each give a true but partial fact.

Verus form. Inference: list each surviving candidate as its own `invariant` clause; clauses in one loop header are conjoined. What changes: the paper validates candidates one at a time, which rejects any clause that is preserved only with the help of another. The paper meets exactly this in Figure 3 (§3, p.6): “Note that, while this seems to be a case where the copy assertion heuristics is effective, Frama-C does not validate the invariant candidate k >= 0 alone.” and “The conjunction with j<=n && k>=n-j is important to validate the invariant.” There the model happened to return the whole conjunction in one sample. For separate samples, the fix is to put all candidates in the header together, run Verus, remove the clauses reported as failing, and repeat until none fails; that procedure is not in the paper.

Evidence. None separate; it is part of the pipeline behind Table 1.

Where it fails. Inference: beyond the mutual-dependence case above, a long conjunction of idle clauses costs solver time; the paper does not measure it.

## technique 4: copy the assertion after the loop as the first invariant candidate

What it is. A pattern the authors found by reading the model's answers, not one they asked for (§3, p.6): “Here, ChatGPT proposes an invariant that is equivalent to a condition found in a nearby assertion.”

When to use. As a cheap first candidate, before any reasoning about the loop.

How it is done. The paper gives no procedure; it observes the behavior. Inference: take the condition of the `assert` that follows the loop, or the function's postcondition, and propose it unchanged as an invariant; then validate it (technique 2).

Verus form. Inference: propose each `ensures` clause of the function, and each `assert` after the loop, as an `invariant` clause, with the result variable replaced by the loop's accumulator where they differ. It validates only when the property already holds at loop entry, which is the limit of the heuristic.

Evidence (§3, p.6; manual inspection by the authors): “The heuristic is applied in 30 out of 106 tasks and 23 of the resulting invariants are validated.” Of the useful invariants, the heuristic accounts for 11 of 22 for Frama-C and 5 of 15 for k-induction.

Where it fails. In Figure 1 the assertion is `y == n`, which is false at loop entry when `n > 0`; the invariant needed is `x + y == n`. 7 of the 30 copied assertions were not validated.

## technique 5: return the checker's error to the model (shown once, by hand)

What it is. When the checker rejects a candidate, send the checker's message back and ask again. The paper did not build this; it reports one manual trial and proposes the design.

How it is done.
1. The case (Figure 2, p.6): `x = 0, y = 1; while (x < 6) { x++; y *= 2; } assert(y % 3 != 0);`. The model proposed `x <= 6 && y == pow(2, x)`.
2. Frama-C rejected it for a reason unrelated to its truth (footnote 9, p.6): “Frama-C reports an invalid conversion from integer type to a floating point type due to the pow operator and thereby fails.”
3. The authors sent that error back. The result (§4, p.7): “For example, if we report the implicit conversion error back to ChatGPT, it generates a new invariant candidate (y == 1 « x) for our example in Figure 2 that is validated by our validator.”
4. The proposed general design (Figure 4 and §4, pp.7-8): an inner loop in which the model proposes, the validator answers valid or not valid with feedback, and the model refines; an outer loop in which the verifier answers useful or not useful in the same way.

The human invariant for the same program avoids the operator by listing the states: `(x==0 && y==1) || (x==1 && y==2) || ...` (Figure 2).

When to use. Whenever a candidate is rejected for syntax or typing in the specification language, as distinct from being false.

Verus form. Inference: the Verus loop is the same, with Verus's error text returned. The Figure 2 trap has a Verus counterpart: a power or shift in an invariant. A shift such as `1 << x` on machine integers is not handled by the default arithmetic reasoning and needs `assert(...) by (bit_vector)` for each step; a recursive `spec fn` for powers of two with a `decreases` clause needs unfolding with `reveal_with_fuel` to get from `x == 6` to `y == 64`. The human's enumeration of the seven states needs neither, and is the form most likely to verify unaided for a loop with a small constant bound.

Evidence. One program. The paper states the open question itself (§4, p.8): “The key challenge is now to determine which feedback is needed from (c) the validator or (d) the software verifier to effectively guide the language model to valid and useful invariants.”

Where it fails. Not evaluated. Figure 4's outer loop needs a verifier that can say why an invariant was not useful; the paper does not say how.

## technique 6: one annotation language, translated per verifier

What it is. The model writes invariants in one language (ACSL); a converter turns the annotated program into what another verifier accepts.

How it is done (§2, p.3): “To also allow for interaction in this case, we employ ACSL2Witness [10] to convert the ACSL annotated program to a correctness witness which CPAchecker is then able to use in its verification.”

When to use. To check one generated invariant with two independent tools, or to reuse invariants across tools.

Verus form. Inference: no converter between Verus invariants and other verifiers' formats is named in the paper or in this collection's Verus note; the idea applies only if one is written. The paper lists the obstacle (§4, p.8): “All of them implement their own custom way to communicate invariants.”

Evidence. The k-induction columns of Table 1 exist because of it; the model's invariant beat the human one for k-induction in loop-zilu (11 verified against 10).

## inconsistencies in the paper

- §3 (p.6) says the model produced useful invariants “for 22 out of 28 tasks in the case of Frama-C and for 15 out of 19 tasks in the case of CPAchecker’s k-induction”. The 28 and 19 are the human-invariant counts, not supersets: in loop-zilu the model's column exceeds the human's for k-induction (11 against 10 verified, 6 against 5 useful). So these are ratios of two counts, not success rates.
- The number of samples is k in one sentence and n in the next (§3, p.4: “one of the n generated invariants”); n is not defined.
- §3 (p.6), on Figure 3, says the model proposed `j >= 0` and `k >= 0` conjoined with the human invariant; the human invariant is printed as `j <= n <= k + j` and the model's as `j <= n && k >= n - j`, the same fact in another form.

## already done; VL need not redo

- The 2023 question of whether a general chat model can write invariants a verifier accepts, without training: yes, for 75 of 106 small single-loop C programs.
- The valid-versus-useful split as an evaluation protocol.
- Not done here: any feedback loop (only proposed), programs with more than one loop, preconditions or postconditions, any language other than C.

## threat to VL

Inference: none as a system. It has no repair loop, one old model, and toy programs. Its lasting content is a warning that applies to any agent that writes Verus invariants: on these tasks most valid invariants (53 of 75 with Frama-C) did not yield a proof, so a pipeline that scores itself by invariants accepted will overstate progress.

## techniques for the catalog

- invariant infilling prompt — mark the loop with a placeholder annotation, ask for the invariant in the target annotation language, and require a fixed last line that a regular expression can extract
- valid-then-useful check — first test each candidate alone for being an invariant under a short limit, then test whether the verifier proves the program with it and fails without it
- disable the verifier's own inference when measuring — restrict the verifier so that a proof can be attributed to the supplied invariant
- conjoin validated candidates — join all individually validated invariants for a loop into one, since a conjunction of invariants is an invariant
- copy-assertion candidate — propose the condition asserted after the loop as the first invariant candidate; in the paper it was valid for 23 of the 30 tasks where the model did so
- checker error feedback — return the validator's rejection message to the model and resample; shown on one program, proposed as an inner loop with the validator and an outer loop with the verifier
- annotation translation between verifiers — write invariants once in a common language and convert them into another verifier's witness format to check them twice
