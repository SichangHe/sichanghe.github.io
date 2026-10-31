# How to judge an agent's spec and proof for a vague request
(authored by agents unless marked 🧑)

## What this is

A person says, in a few vague sentences, what they want guaranteed. An agent works out the details and hands back a precise spec, a proof, usually some code, and logs. You get that bundle and must decide whether it gives the person what they asked for. Follow this text and nothing else. You end with exactly one verdict: valid, agent-checked, invalid, or unknown.

A proof checker only tells you the proof matches the statement it was given. It does not tell you the statement is what the person meant. Most checks below are about that gap, plus the ways an agent can fake a pass.

The checks come from the literature review and from audits of earlier results in this project. The sources are in [agent_evaluation_procedure_sources_20261012.md](agent_evaluation_procedure_sources_20261012.md), keyed by check id. You do not need that file to follow the procedure.

What the five labels tell a reader who must decide whether to trust the result:
- valid: every claim holds as the person's words say, with no limit to list. You can rely on it as stated.
- agent-checked: every claim holds as the person's words say, with no limit to list, but only one agent checked it, with no independent second reader. You can rely on it as far as you trust one careful agent.
- agent-checked-limited: every claim holds, but only under listed limits (assumptions the agent added, a narrower reading it stated, a missing tie to the code). Read the limits before relying on it. When a result is both limited and checked by one agent only, it gets this label, and "single reader" is listed among its limits: the limits say more about what you can rely on than the number of readers does.
- invalid: at least one claim is not guaranteed as the person asked, or a cheat or defect was found. It does not mean the agent lied: an honest, checkable result that proves only part of the request is invalid too. Do not rely on the result as a whole; the per-claim labels show which claims you can still use.
- unknown: you could not tell, and the hand-back says what would settle it.

Three choices the rule makes, which the human may want to change:
- A claim backed only by examples or small-size model checking is `unknown`, not `invalid`.
- A claim with no statement at all is `invalid`, not `unknown`. A missing statement is the result's fault.
- Nobody but you looked at the result: the best it can get is `agent-checked`, or `agent-checked-limited` if it also has limits.

## Words used

Request and parts
- request: the person's vague text, as given.
- claim: one guarantee in the request that can be true or false of a run of the system. Example: "no accepted increment is applied twice".
- result: everything you were handed. report: the result's own summary of what it did. If there is no report file, treat prose in the result that says "proved" or "verified" as the report.
- task author: whoever set the task for the agent. A task author may leave you extra material: frozen statements (theorems or contracts the agent was not allowed to change), a hidden packet (tests, bad versions, a reference model), or an allow list (trusted items that are accepted).

Systems words
- node: one machine or process. state: a snapshot of everything. step: a move from one state to the next. A step is enabled in a state when it can happen there. A step that changes nothing is a stutter. run: an endless list of states joined by steps.
- model: the agent's formal description of the system: its state, its steps, and what the world can do to it (lose messages, crash nodes). guard: the condition that must hold for a step to happen.
- leader, term, quorum: in leader election, a leader is the node others follow, a term is one numbered round of voting, and a quorum is a group of nodes big enough (usually a majority) that any two groups share a node. stale read: an answer based on state older than a write that was already acknowledged.

Proof words
- safety: nothing bad ever happens. liveness: something good eventually happens. "leads-to" means: whenever A happens, B happens later.
- fairness: a promise that a step which stays possible does get taken. Weak fairness: a step enabled all the time is eventually taken. Strong fairness: a step enabled again and again is eventually taken.
- assumption: something a theorem takes for granted (fairness, network behavior, no more crashes after some time, clients going quiet). Every premise of a theorem counts as an assumption.
- spec: the formal statements written for the claims. A precondition says what must hold before a function runs; a postcondition says what it guarantees after; an invariant is something that stays true in every state; a lemma is a helper theorem.
- theorem: any statement a checker checked: a proof function, an `ensures` on a function, or a property in a model checker.
- verifier: the tool that checks proofs (Verus, Dafny, Lean, Coq, TLAPS). model checker: a tool that tries every run of a small version of the model (TLC for TLA+). A run of TLC reads a `.cfg` file that sets constants (such as the node count).
- trusted item: something used without proof (`assume`, `admit`, `sorry`, axiom, `external_body`, `assume_specification`, and the like).
- vacuous: true only because its "if" part can never happen. witness: one concrete run that shows something can happen.
- mutant: a copy of the model or code with one small deliberate change. A survivor is a mutant the proof still accepts.
- loop run (lasso): a finite start followed by a loop that repeats forever. It shows a run that never makes progress.
- measure: a number (or ordering) that shrinks at every step until the goal is reached, so progress cannot go on forever.
- symmetry and state constraints: model checker settings that skip equivalent runs or cut runs off. They can hide a failing run.
- tie: a checked statement that the code does what the model does, step by step. observation map: the written correspondence between code fields and events and model variables and steps.
- syntax tree: the parsed form of a source file. Comparing trees shows real changes and ignores spacing.
- receipt: the list of file hashes (`sha256sum`) of what you checked.

Verdict words
- condition: a limit on, or doubt about, the result that does not break it, written as one plain sentence. A false report line is a condition.
- grade of a claim against its theorem: same; same with a condition (weaker than the strongest natural reading of the claim, but equal to a weaker natural reading that the result states; M2 decides this); stronger (implies the claim and more); weaker (allows a run the claim forbids, and M2 does not excuse it); different (neither); missing (no theorem).
- evidence level of a claim:
  - 0: no theorem, test or model check exists for it.
  - 1: something exists, but nothing you ran supports it (examples, tests, or a theorem you could not run).
  - 2: you model checked it at stated small sizes.
  - 3: proved about the model for any size: R2 passed, K3 shows no trusted item in the claim's chain, and M1 grade is same or stronger.
  - 4: level 3, and tied to the code (T1, T2 and T3 pass; for a liveness claim also T4 pass).
  - T1 to T4 only set the level. They never make a claim invalid by themselves. If one of them fails or has nothing, the level stays 3 and you write a condition. The one exception is a report that says the code is verified or live when the check shows it is not: T1 (comments only) and T4 (report says live) fail then.
- required level: 4 if the request asks for something that runs (service, program, implementation, code), otherwise 3. The task author's word wins.

## How to work

1. Make a new empty folder for your own files, call it `W`, and work only there. Copy the result into `$W/copy` and work only on the copy. `cp -rL` follows links. `ROOT` is the folder that holds `verify.sh`; `dk` mounts it. If the result has several, set `ROOT` to the one the report names.
```
RES=<absolute path of the result>
W=<absolute path of a new empty folder>
mkdir -p "$W/copy" && cp -rL "$RES"/. "$W/copy/"
ROOT=$(dirname "$(find "$W/copy" -name verify.sh | head -1)"); [ -f "$ROOT/verify.sh" ] || ROOT="$W/copy"
dk() { docker run --rm --network none --cpus 4 --memory 16g --user "$(id -u):$(id -g)" -v "$ROOT:/work" -w /work vd-bench "$@"; }
```
2. Keep one file, `evaluation.md`. For every check write one line: id, outcome, evidence (file:line quote, command and exit code, or log lines). Put logs in `$W`.
3. Do the steps in order. Each step uses only what earlier steps produced.
4. Judge the statements and the runs, not what the result says about itself. List the report lines the files contradict (K8).
5. Early stop. Right after Step 1, do K1 and K2 (reading only). If either fails, the verdict is `invalid`: write it, mark every other check "not run", and stop.

Outcomes of a check:
- pass: you established it, with evidence.
- fail: you found a concrete defect and can show it (a quoted line, a failing run, or an edit that should break things but verifies).
- cannot tell: you could not establish it (tool missing, timeout, too unclear or too big to read). A timeout is never a pass and never a fail.
- n/a: the thing the check works on does not exist (no theorem, no model, no code, nothing frozen). M1 or K1 has already counted that against the result. n/a never changes a verdict.

Tags:
- [G] about the whole result. Fail makes the result invalid. Cannot tell makes it unknown.
- [C] about one claim; run it once per claim. Fail makes that claim invalid. Cannot tell makes it unknown.
- [cond] never fails. If it finds something, write a condition and attach it to the claim or the result. If it cannot get its input (for example the agent's prompt), write the condition "X unknown".
Any check can also add conditions.

A pass or fail without evidence is a cannot tell (E2). A missing premise is evidence if you quote the whole premise list.

## Step 1. Set up (S1 to S6 are tasks, not checks; S2 can end the evaluation)

S1. List the file names only (`ls -R "$W/copy"`). Then list what you were given: request, spec, model, code, proof, scripts, logs, reports, the agent's prompt and files, and which model and harness ran (run directory names have been wrong before). The request sits in the agent's prompt file or in the report. The README names the prompt file (for example under `vague_bench/prompts/`); if you cannot find it, write "agent input unknown". Open only that prompt file to read the request (S2), and write down any hints it contains (a design, an earlier failure, a banned file) for K9. Open everything else after S2. Mark each present or absent. Do not stop for an absent item; the checks below record its absence.

S2. Find the request text. If it sits in the same file as the agent's spec, read only the request lines first; if you saw more, write "S2 and S3 contaminated". Write the claim list: one claim per sentence of the request unless a sentence has independent parts. Quote each claim, number it C1, C2, and so on. For each phrase with more than one reasonable reading ("majority", "keep making progress", "one leader at a time"), list the readings, strongest first, and mark which are natural: a reading a systems researcher would take from those words with no extra information. A reading that starts from a state the client cannot cause (for example "the increment is already on a healthy disk") is not natural. Record where the request text came from (human or agent). If you cannot confirm a human wrote it, add the condition "request text not confirmed as human-written". If the request has no guarantee you can state, the verdict is `unknown`: say why and stop.

S3. Write examples from the request alone. For each claim: at least two runs or calls that must be allowed, and two that must be forbidden (draw from Appendix B). A forbidden example must break the claim and stay inside the faults the request allows. Losing a disk is not allowed unless the request says so; write that assumption down. If the task author left a hidden packet, use it too.

S4. Take the receipt and tool versions.
```
(cd "$W/copy" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$W/receipt.txt"
dk verus --version; docker --version
```
A log counts as yours only if you made it from these files. A log from the result's own run is a lead on where to look. It never gives a pass.

S5. Find a verifier. Run `which verus tlc dafny lean coqc tlapm`. This project's Docker image `vd-bench` holds Verus at `/opt/verus/verus` and TLC at `/opt/tla/tlc`; the `dk` function above runs inside it. If the result uses another tool that you cannot find, every check that needs it is cannot tell, and you still run all the reading checks.
```
dk verus --crate-type=lib <file>.rs
dk /opt/tla/tlc -config M.cfg M.tla
```

S6. Decide the task type: vague request only; request plus a design or spec handed over; or translation of an existing spec. This changes what the verdict means (K9).

### K1. Enough model to state the claims [G]
Look at: the model and spec files.
Do: find (a) per-node state, (b) messages or a network, (c) a step relation, (d) runs as endless sequences of states, (e) at least one named theorem per claim. A single struct with a vector, or a model that exists only as prose, fails. Quote file:line for each.
Pass: (a) to (e) found. Fail: any missing. (Code is checked in Step 7.)

### K2. Proof switch-offs [G]
Look at: source and script files only, not reports.
Do: grep for the words in Appendix A for the tool in use.
```
grep -rnE --exclude='*.md' --exclude='*.txt' --exclude-dir=target \
  'assume|admit|sorry|Admitted|oops|native_decide|OMITTED|verify *false|requires +false|ensures +true|no-verify|SPARK_Mode|pragma +Assume' "$W/copy"
```
This one pattern covers the tools in Appendix A. A TLA+ `ASSUME` of a constant is normal; judge each hit. A line that only searches for these words (such as a check script's own `grep` for `assume`) is not a hit.
Pass: no match, or each match is on the task author's allow list, or it only wraps printing or other input/output and sits in no claim's chain of definitions (then list it under K3).
Fail: any other match that silences a proof, empties a statement, or removes code from checking.

### K3. Trusted items [G, cond]
Look at: every trusted item (axioms, `assume_specification`, `external_body`, `external_fn_specification`, `unsafe`, `opens_invariants`, imported library axioms).
Do: find them with
```
grep -rnE --exclude='*.md' --exclude='*.txt' --exclude-dir=target \
  'external_body|assume_specification|external_fn_specification|verifier::external|axiom|Axiom|AXIOM|Parameter|Hypothesis|axiomatization|implemented_by|unsafe|opens_invariants|extern|trusted' "$W/copy"
```
and write each as `file:line | what it takes for granted, in one sentence`. Name each imported library and its version (for the Verus library, use the Verus version from S4), and say its axioms were not checked (they usually are not). Report the item count next to the proof size: the total `wc -l` of the proof-language source files (for example the `.rs` files that hold the model, spec and proofs), leaving out tests, scripts and the code that only runs.
Pass with a condition: every item is about the outside world, a library, or printing, and none states or helps state a claim. Condition: the list.
Fail: an item states or helps state a claim, contradicts another assumption, or assumes what the request asked to prove.
n/a: no trusted items and no proof.

### K4. What the verify script really checks [G]
Look at: `verify.sh` or the build file.
Do: confirm that it (a) runs the verifier on every file that holds a claim, (b) exits nonzero when the verifier fails (no missing `set -e` or `pipefail`, no `|| true`), (c) does not narrow the check (`--no-verify`, a one-function filter, a skipped module; flags that change only warnings or solver triggers, such as `--triggers-mode silent`, are fine), (d) actually tries the verifier. A script that looks for a program that is not installed and exits tells you nothing.
Pass: (a) to (d) hold. Fail: any of (a) to (d) does not.
Condition: the script lacks the strict switch (Appendix A, "strict mode"). R2 then runs it strictly itself.

### K5. Statements the task author froze [C]
Look at: frozen theorem statements, public contracts, trusted libraries.
Do: diff them against the result's (text diff, or compare syntax trees with proofs removed). Look for a weaker conclusion, an added assumption, a changed signature, a proof left as `sorry`.
Pass: identical. Fail: any change or added premise. n/a: nothing frozen.

### K6. Empty or leaking definitions [C]
Look at: every definition a claim's theorem uses.
Do: look for bodies that are just `true` or `false`; postconditions that state only a side fact (a length grew, a value is not negative); postconditions that name a helper computing the answer. Mechanical screens help (vacuous theorems, unsound axioms, `-> bool { true }`).
```
grep -rnE --include='*.rs' -- '-> *bool *\{ *true *\}' "$W/copy"
```
Pass: none in any claim's chain. Fail: a claim relies on one. A typing predicate that is `true` because the language's types already carry the typing is a note, not a fail. n/a: no theorem exists.

### K7. Unused parts [cond]
Look at: every definition, lemma, theorem, and every cross-check or test directory the result says it supplies.
Do: for each, `grep` for its name in the claim theorems. List unused ones. Also list supplied directories or files that are empty.
Condition: one for each unused item or empty cross-check that the report presents as protecting a claim.

### K8. Report against files [cond]
Look at: each report sentence that says "verified", "proved", "same as", "passes", "end to end", or gives a count.
Do: check it against your findings. Write each contradicted sentence as a condition. If the result ships a hash file (for example `outputs.sha256`), recompute it and list files that differ; a report edited after hashing is a condition.

### K9. What the agent was handed [cond]
Look at: the agent's prompt and workspace files (S1).
Do: if the task was to work out the details from a vague request, check that the agent was not given a design, an invariant list, or an earlier agent's spec file it could edit. Check for reference answers in the workspace. You cannot check what the agent saw in training; write that in the hand-back as "not checked".
Condition when handed: "the task handed over the design, so this shows spec and proof skill, not discovery from a vague request". Condition when the prompt is absent: "agent input unknown".

### R1. The verifier itself rejects bad input [G; pass or cannot tell only]
Do: in the same environment, check three small files from Appendix C: a false postcondition, a hidden "assume false" helper, and a tiny correct file. Use the strict flags in Appendix A. These flags are fixed by this text, not taken from the result.
Pass: the first two are rejected, the third accepted.
Cannot tell: otherwise. Do not trust any pass from this setup; R2 is cannot tell.

### R2. Clean rerun, three times [G]
Do: run the result's own script three times without changes, save the logs, then once more in strict mode if K4 found no strict switch (copy the verifier line from the script and add the switch).
```
for i in 1 2 3; do dk bash verify.sh > "$W/run$i.log" 2>&1; echo "run$i exit=$?"; done
```
If the script itself starts Docker, run `bash verify.sh` on the host instead. Quote the last lines of each log.
The success line depends on the tool (Appendix A, "success line").
Pass: all runs exit 0 with the success line and the same counts; the count equals the report's (otherwise add a condition).
Fail: run 1 or the strict run exits nonzero with a verifier error in the result's code. Quote it.
Cannot tell: no verifier, timeout, out of memory, Docker error, or the three runs differ (an unstable proof; report it). You may retry once with a longer time limit; say so.

### M1. Claim to theorem, graded [C]
Do: find the theorem and every definition it uses. Write the theorem in plain English from the code, ignoring comments, names and the report. Compare with the claim in both directions: does the theorem imply the claim, and does the claim imply the theorem? Give the grade. Quote file:line.
Grade against the strongest natural reading of the claim (S2). If the theorem is weaker, do not fail it yet: M2 decides whether the weaker reading is excused. The grade you write in the hand-back is the one after M2.
Pass: same, same with a condition, or stronger. Fail: still weaker after M2, different or missing. A weaker natural reading that the result states is never a fail; it is graded "same with a condition".
Cannot tell: claim or theorem too unclear to compare; say what is unclear.

### M2. Readings the result chose [C]
Look at: each theorem M1 found weaker than the strongest natural reading, and each phrase S2 marked as having more than one reading.
Do: find which reading the theorem uses, and whether the result states that choice in its own spec or report.
Pass (grade stays same or stronger): the strongest natural reading, or stronger.
Pass with a condition (grade becomes "same with a condition"): a weaker natural reading that the result states. Condition: say which reading and what it leaves out.
Also pass with a condition: the strongest natural reading is impossible to meet together with the other claims (M5, M10). Write the clash, ask the person, and treat the result's stated reading as the weaker one.
Fail (grade stays weaker): a reading that is not natural for the words, or a weaker reading the result does not state.
Test cases from this project: "keep making progress" read as "a leader exists" (fail: not natural). "One leader at a time" proved per term only (weaker natural reading: pass with a condition if stated, otherwise fail). "A majority of non-crashed nodes" read as a majority of all nodes (pass with a condition if stated and the stronger reading cannot be met safely, otherwise fail).

### M3. Not narrowed [C]
Look at: theorem signatures, constants, config files, initial states.
Do: look for fixed node counts (`n == 2`), fixed schedules, one initial state where many are possible, finite sets or finite lists where the claim says "any", and premises that contain the conclusion. In TLA+ read the constants in each `.cfg`.
Pass: sizes are free (any n), or the request itself fixes them. Fail: narrowed without support in the request.
n/a: no model.

### M4. Temporal words mean what they should [C]
Look at: the definitions of always, eventually, leads-to, and fairness that the theorems use.
Do: check that runs are endless sequences (not a list that stops), "eventually" means "at some later point", and the end of a finite list does not make "always" true by accident.
Pass: standard meaning over endless runs. Fail: finite lists, bounded time, or a changed meaning where the claim says eventually.
n/a: the claim is not about time.

### M5. Is the request satisfiable [C]
Do: ask whether the claim as written is known to be impossible. Known limits: agreement among nodes that can crash, with a fully asynchronous network and no timing assumption, cannot be guaranteed to finish; availability and consistency together cannot hold while the network is split. If the claim is impossible, any "proof" with no added assumption is a warning sign.
Pass: not impossible; or the result says so and gives an argument or counterexample you checked (add the condition "the request needs a change").
Fail: impossible as written, yet "proved" with no extra assumption. Quote the flaw or the hidden assumption.
Cannot tell: you cannot decide.

### M6. Four-way examples [C]
Do: turn each S3 example into a small checked test in the same language (a call with given inputs, or a short run fed to the theorem). If you cannot, walk through it by hand with quotes. Count four things: valid results accepted, bad results rejected, valid inputs allowed (a call the spec should permit is not blocked by its precondition), invalid inputs excluded.
Pass: every valid example accepted and every bad one rejected.
Fail: a bad example accepted (spec too weak) or a valid one rejected (too strong).
Cannot tell: the example cannot be expressed and the walk-through is unclear. n/a: the result has no callable surface for it.
Report the four counts. If you could not get a count, write "unknown" for it. Unknown counts do not block a pass; the pass rests on the first two.

### M7. Pins the answer, not a side fact [C]
Do: for each function contract and claim theorem, try to invent three wrong results that still satisfy it (a step applied twice; an empty result; a lost item). If the system is nondeterministic by design, the contract may allow many answers; then ask only whether any allowed answer breaks the claim.
Pass: you cannot break the claim in three tries. Fail: you can.

### M8. A caller can use it [C]
Do: write two or three things a client needs from the claim (for example "after an increment is acknowledged, no later answer forgets it"). Try to derive each from the public theorems alone, not from internals.
Pass: derivable. Fail: not derivable.

### M9. The "if" part can happen [C]
Look at: every claim of the form "if A then eventually B", and every assumption.
Do: get one run that takes at least one step that is not a stutter in which A happens and all assumptions hold together. The result may ship one; check it. Otherwise make one. In TLA+, tell TLC to check an invariant that A never holds; its counterexample is your witness. In Verus, write a short proof that builds a run and shows A.
Pass: such a run exists. Fail: A cannot happen, or the assumptions contradict each other (quote the clash).
Cannot tell: no verifier. n/a: no model.

### M10. The claims fit together [G; pass or cannot tell only]
Do: check that one run satisfies every claim's premise and conclusion together (reuse M9 witnesses). Note claims that follow from others, requirements the request seems to need that the list lacks, and the smallest group of claims that clash.
Pass: yes. Cannot tell: two claims clash, and the clash stays under the result's own stated readings. (If it goes away under a weaker natural reading the result states, that is the M2 case, not a cannot tell.) That is for the person to settle: write the clash and ask. If the result already pointed it out and handled it, that is a pass.
n/a: no model.

### M11. The faults the request names are in the model [C]
Look at: the faults the claim names or implies (Appendix D).
Do: for each, find the model step that does it (quote). The model must contain every run the real fault could cause. A partition modeled as "messages can stay undelivered as long as the world likes" is fine. Also check step size: if the request implies an operation made of several writes, the model must be able to stop between them.
Pass: each named fault found. Fail: a named fault is missing (so a claim like "safe during partitions" says nothing), or a multi-write operation is one atomic step.
Condition: a fault from Appendix D that the request did not name is absent.

### W1. Wrong versions are rejected [C]
Do, in two parts. First, targeted: for each wrong behavior from S3 and Appendix B that breaks this claim and stays inside the request's faults, make it as a small edit on a copy of the model or code. Second, bulk: make at least 20 mutants of the model (or all plausible ones if fewer) spread over every step, using the kinds in Appendix E. This mutates the model, not only the code. Include one mutant where all the helpful steps are replaced by do-nothing steps. Rerun the verifier on each. Write `edit | result | item that failed`.
Sort the bulk results: killed; survived but equivalent (the change adds no run that matters to any claim: say why in a line; if you cannot, count it as uncovered); survived and uncovered (it changes behavior and no theorem notices); survived and breaks a claim; did not compile (leave out); timed out (leave out and count).
A claim depends on every definition and lemma its theorem calls, directly or through others. A helper that no claim theorem calls does not protect the claim: if an edit is rejected only there, count the mutant as survived and add a condition. This includes a witness or example lemma. If an edit is rejected only in a witness, count it as a survivor with the condition "part X is constrained only by the witness" (name X).
Pass: every targeted edit makes a theorem or lemma that the claim depends on fail, and no survivor breaks the claim.
Fail: a targeted edit verifies, or a survivor breaks the claim, or the do-nothing mutant still verifies for a liveness claim (an assumption builds the conclusion in).
Condition: one for each uncovered survivor (name the part no theorem constrains). Deleting a step the claim needs and still verifying counts as uncovered.
Cannot tell: a targeted edit times out, or more than half the bulk mutants time out. A timeout is not a rejection; an edit that does not compile is not a rejection either: redo it.
n/a: the behavior cannot be represented (no such state or step); that already shows a missing model piece in M11.
Report the counts.

### W2. Good behavior is still possible [C]
Do: for each valid example from S3, show the model has a run that does it.
Pass: every one has a run. Fail: a needed behavior is impossible (the model is too narrow).
Cannot tell: an example cannot be built. n/a: no model.

### W3. A known real bug [C]
Do: if you know a real bug for this kind of system, reproduce it as an edit and check the spec rejects it. Liveness bugs are known for PBFT, Casper FFG, early Tendermint and FaB; also a leader that is deposed again and again by competing timeouts (Appendix B).
Pass: rejected. Fail: accepted. n/a: you know no bug for this kind of system, or it cannot be expressed in the model.

### L1. Assumption sheet [task, not a check; do it before L2]
For every "eventually" claim list every assumption and every other premise of its theorem: `name | file:line | plain sentence | who: request, justified from outside, or agent added`. Quote the request words for "request". Include premises like "clients are quiet" and "no node times out while the group agrees". For each, write whether the conclusion would follow if it held and the protocol did nothing.

### L2. An assumption builds in the conclusion [C]
Do: use the do-nothing mutant from W1 on the liveness theorem. An assumption gives the conclusion if, with that assumption added and the other steps replaced by do-nothing, the conclusion or any part of it still holds. Read each assumption with the L1 note.
Pass: the theorem breaks and no assumption already gives the conclusion. Fail: it still verifies, or an assumption gives the conclusion.
Cannot tell: no verifier. n/a: no liveness theorem.

### L3. An assumption removes required runs [C]
Do: for each assumption, ask whether it forbids a run the request says must be handled. Allowed: "faults eventually stop", or whatever the request says ("if the network eventually behaves"). Not allowed: "no node ever restarts", "clients act in a convenient pattern".
Pass: none removed. Fail: a required run is removed.
Condition: a stability assumption the request did not give, such as "clients go quiet".

### L4. Safety does not lean on liveness assumptions [C]
Do: read the premises of each safety theorem. Quote the full premise list.
Pass: no fairness, no "eventually", no timing or quiet-client premise. Fail: any of those. n/a: no theorem.

### L5. Could a real system provide it [cond]
Do: for each assumption the agent added, ask whether a real scheduler, network or timer could make it true using only what a process can see and control. Example from this project: "a node times out only when no message in the group is on the way". No node can see that.
Condition: one for each assumption that is not realizable.

### L6. Drop each assumption [C]
Do: for each fairness or network assumption, copy the model, delete or weaken it in the theorem, and rerun.
Pass: the verifier now fails.
If it still verifies: try to build a run that meets the remaining assumptions and never reaches the goal. If you can, fail (the proof or the definitions are broken). If you cannot, write "assumption not needed" and pass.
If there are no assumptions to drop: try to build an idle-forever run (after the trigger nothing more happens). If the model allows it and the theorem claims liveness, fail.
Cannot tell: no verifier and no run could be built. n/a: no liveness theorem.

### L7. Right fairness on the right step [C]
Do: for each fairness item, name the step. If the model states fairness on messages ("a message in flight is eventually delivered"), name the step that handles the message. Show it can become enabled: check its guard as a TLC invariant that the guard never holds (the counterexample is a state where it is enabled), or write a short Verus lemma. Then ask: after that state, can another step make it impossible before it fires? If yes, weak fairness is not enough. Also ask whether the fairness is of a kind a real system could give, since fairness assumptions can quietly lead to false conclusions.
Pass: right step, right kind, reachable. Fail: fairness on a step that is never enabled, or the wrong kind for how the step becomes enabled.

### L8. The progress argument has all its parts [C]
Skip (write pass) when the liveness proof is machine-checked, R2 passed, and no trusted item sits in the claim's chain.
Otherwise find in the argument: (a) the good event; (b) why some step stays possible until it happens; (c) what forces that step (fairness); (d) why it ends: a number that drops, a pair of numbers compared in order, or an acyclic chain of causes.
Pass: all four found in the argument, not only in comments. Fail: a link is missing and you cannot supply it. Cannot tell: too large to read.

### L9. Look for a run that never finishes, and check the bounds [C]
Do: with a TLA+ model, run TLC on small sizes (two or three nodes) with the claim as the property and the theorem's fairness. A violation prints a start plus a loop. Check that the loop meets every assumption (is any fair step enabled all through the loop but never taken?) and is a real run, not an artifact of the bound. For other languages use another model checker (Apalache, Ivy, Quint, Stateright). If no model checker for the model's language is available, write n/a and rely on L2 and L6; do not build a loop by hand unless the result ships a measure. An n/a here caps the level at 3 and is not a cannot tell.
```
dk /opt/tla/tlc -config M.cfg M.tla -deadlock
```
(`-deadlock` stops TLC from reporting a state with no next step as an error.) Write down every bound: nodes, messages, depth, symmetry, state constraints. Rerun with one more node, a bigger cap, and without symmetry and constraints.
Pass: no loop at the sizes tried, and the same answer at the larger bounds. This is evidence level 2; write the sizes.
Fail: a loop that meets every assumption, or the answer changes with the bounds.
Cannot tell: a model checker exists but the larger run is too big, or you ran out of time. n/a: no model checker for the model's language.

### L10. Eventually what, for whom, how long [C]
Do: for each liveness claim write: what event; for whom; must it stay true; must it happen within a time. Compare to the theorem (eventually once, eventually always, within T).
Pass: the theorem is at least as strong on each. Fail: weaker on any: it happens once but the claim says it stays; it is eventual but the claim says "within T"; it is "a leader exists" but the claim says progress.

## Step 7. Is the code the model

If there is no code, write "n/a, no code" for T1 to T8. If the request asks for something that runs and there is none, every claim stops at level 3 (the verdict rule makes that a condition).

### T1. What ties the code to the model [C]
Do: list every code entry point (public functions, the main loop). For each, find a checked statement that it does one model step. Then find whether a checked statement says the whole program is a run of the model.
Pass: every operation tied and the whole-run statement exists ("whole-run proof"). Pass with a condition: every operation tied and the driver is unchecked ("per-step proof": condition "per-operation tie only").
Fail: the report says the code follows the model, but the ties exist only as comments or prose ("comments only"). This is the only T1 fail.
Condition: no tie at all ("none") and the report does not claim one. The claim stops at level 3.

### T2. The map from code state to model state [C, cond]
Do: write the map `code field or event -> model variable or step`, including what is saved on disk and what clients see. It must be a checked function or lemma, not prose. Every model variable the claim mentions must have a code counterpart.
Pass: checked, complete for the claim. Level 3 and a condition: a mentioned variable is not mapped, or the map is only prose. Say which variable.

### T3. Every step in both directions [C, cond]
Do: list the model's steps and the code's functions that change state. Each model step the claim needs, and that the world does not do (not loss, not crash), must have a code function. Each code function that changes state must be a model step or a stutter.
Pass: both directions match. Level 3 and a condition: code does something the model lacks, or a needed model step has no code. Name the step or function.

### T4. Fairness reaches the code [C]
Look at: each liveness claim, when the required level is 4.
Do: find a checked statement that the program's loop or scheduler takes each fair step often enough (a retry loop, a poll).
Pass: it exists. Condition: it does not, and the report says liveness is model-only (the claim stops at level 3). Fail: it does not, and the report says the code is live.

### T5. Run the code [C]
Do: build and run it with the result's build command (`cargo` is in the image). Try three normal calls and three faulty ones (a repeated message, a restart in the middle, a dropped message). If it follows a standard protocol, test it against an independent implementation.
Pass: outputs match the claim. Fail: wrong output or a crash. Cannot tell: it does not build or run here. n/a: nothing runnable and no build command.

### T6. Questions answered from the spec, then from the code [C]
Do: write five questions about tricky cases (for example "the same increment arrives twice after a restart; what is the value?"). Answer them from the theorem statements alone. Then answer them from the code (run or read it). Compare.
Pass: all agree. Fail: any disagreement, or the spec is silent where the request implies an answer.

### T7. Check a recorded trace against the model [C]
Do: run the code, log each operation and the visible state, map to model states with T2, and check every step is allowed by the model's step relation (TLC trace checking, or a small script).
Pass: accepted. Fail: a step the model forbids. n/a: no way to log, or no checker for the model language. This is finite evidence, not proof.

### T8. Where verified code meets unverified code [G, cond]
Look at: the driver, parsers, serializers, sockets, files, clocks, library calls, `unsafe`, integer overflow, and public fields or other ways unverified code can reach state the contracts assume is protected.
Do: list each place and its stated contract. Check where the guarantee is actually decided.
Condition: one for each unverified place, with its contract.
Fail: the guarantee a claim depends on is decided in unverified code (for example duplicates are filtered in the driver, not in the verified function).

### E1. A second reader [C, cond]
Do, in two parts. First, give a fresh agent that has not seen the request only the theorem and its definitions, and ask for a plain English statement of what it guarantees; compare with the claim. Second, give it your claim list, grade lines and quoted evidence, and ask it to refute your three weakest grades and any pass on M1, M2, L2 and T1. If you can compare formulas with a tool, you may also have it write the formal statement again from its English and compare.
Pass: the English matches the claim and it could not refute you. Fail: it shows a difference that matters or a defect you accept; fix the grade and redo the verdict.
Without a second agent: do the English statement yourself before rereading the claim, and add the condition "single reader". This never makes the result unknown; by itself it makes the best label `agent-checked` (see the verdict).

### E2. Your own evidence [G]
Do: reread `evaluation.md`. Every fail needs a reproduction (a quote, a failing run, or an edit that should break things but verifies). Every pass needs evidence that is not a comment, a name or the report. Change anything else to cannot tell.
Pass: all lines have evidence. Cannot tell: you cannot fix a line.

## The verdict

Work out each claim's label first. The first rule that matches wins.
1. invalid if: its grade (after M1 and M2) is weaker, different or missing; or any [C] check failed for it; or its evidence level is 0.
2. unknown if: any [C] check is cannot tell for it; or its evidence level is 1 or 2.
3. agent-checked-limited if: its level is 3 and the required level is 4; or any condition other than "single reader" is attached to it (a grade of "same with a condition" always brings one).
4. agent-checked if: E1 ran without a second agent.
5. valid.

Then the result's label. The first rule that matches wins. The result gets the worst claim label, unless a result-level check says worse.
1. invalid if: any [G] check failed, or any claim is invalid.
2. unknown if: any [G] check is cannot tell, or any claim is unknown.
3. agent-checked-limited if: any claim is agent-checked-limited, or any condition other than "single reader" exists at result level.
4. agent-checked if: E1 ran without a second agent.
5. valid.

Cases the rule already covers:
- No model or only a prose design: K1 fails, so invalid.
- No statement for a claim: grade missing, so that claim and the result are invalid.
- No verifier on your side: R2 is cannot tell, so unknown, unless a reading check already shows invalid.
- Request with no stateable guarantee: unknown (S2). Two claims that clash: unknown (M10).

## What to hand back

Write `evaluation.md` with:
1. The verdict line: `verdict: valid | agent-checked | agent-checked-limited | unknown | invalid`, followed by the count, for example `3 of 5 claims valid, agent-checked, or agent-checked-limited`.
2. For each claim: the request words, the theorem (file:line), the grade, the evidence level, the label, and its conditions. Claim labels come first, then the result label.
3. The conditions, and the unknowns with what would settle each.
4. Every fail with its reproduction.
5. Numbers: how many theorems verify against how many claims graded same or stronger (two different numbers); M6's four counts; W1's mutant counts; trusted items and proof size; wall-clock minutes (from your first command to writing the hand-back, including reading this text, minus any pause you know of; if you cannot tell, write "unknown") and number of tool calls; questions the agent asked the person, if you have its transcript.
6. For the person: one plain sentence per claim saying what the theorem guarantees. Only the person can say whether that is what they meant.
7. Checks marked "not run", and anything not checked (such as training contamination).

Not covered, because they belong to whoever designs the task or compares agents: an unsatisfiable task given on purpose; held-out protocol families; comparing agents on equal budgets with repeats; asking the agent to change a requirement later; scoring the agent's clarifying questions.

## Appendix A. Per tool: switch-offs, trusted facts, strict mode, success line

Grep these in K2 (switch-offs) and K3 (trusted facts). Entries marked untested were not run here.

- Verus (tested). Switch-offs: `assume(`, `admit(`, `requires false`, `ensures true` in place of a real postcondition, `--no-verify`. Trusted: `external_body`, `assume_specification`, `external_fn_specification`, `#[verifier::external`, `axiom`, `opens_invariants`. Strict mode: `--no-cheating` (without it `assume` and `admit` are accepted). Success line: `N verified, 0 errors`.
- Dafny (untested). Switch-offs: `assume`, `{:verify false}`. Trusted: `{:axiom}`, `{:extern}`, bodiless methods. Success line: `N verified, 0 errors`.
- Coq (untested). Switch-offs: `Admitted`, `admit`. Trusted: `Axiom`, `Parameter`, `Hypothesis`. Audit command: `Print Assumptions <theorem>` must say "Closed under the global context". Success: `coqc` exit 0.
- Lean (untested). Switch-offs: `sorry`, `native_decide`. Trusted: `axiom`, `implemented_by`, `unsafe`. Audit command: `#print axioms <theorem>` must list only the standard axioms and no `sorryAx`. Success: exit 0 with no `sorry` warning.
- Isabelle (untested). Switch-offs: `sorry`, `oops`. Trusted: `axiomatization`.
- TLAPS (untested). Switch-offs: `OMITTED`, `PROOF OMITTED`. Trusted: `AXIOM`, `ASSUME` on facts that are not constants. Success: all obligations proved.
- Ivy (untested). Trusted: `axiom`, `trusted` isolates, unchecked isolates.
- TLC (tested here). Success line: `Model checking completed. No error has been found.` A pass at small sizes is evidence level 2.
- Names for any tool: a verify script that ignores errors; a flag that checks fewer functions; a changed checker or timeout wrapper; a stale receipt; a notation or instance trick that changes what a goal means; code moved to a file the script skips; `SPARK_Mode => Off`; `pragma Assume`.

## Appendix B. Wrong behaviors to try (S3, W1, T6)

- do nothing at all (no-op); always say no, or always say yes
- apply the same request twice (duplicate id)
- lose an accepted item after restart (disk wiped, or write not saved)
- restart a node that is already up; a down node receives messages
- forge or send an acknowledgement before the item is saved
- stale read: answer from old state after a newer write was acknowledged
- two leaders (or two winners) in one term; leader elected but a second candidate also wins
- two workers complete the same job
- a vote counted twice, or a count taken from the caller instead of from votes received
- favor one requester forever so another never gets served (starvation)
- crash between two writes that must go together
- liveness: no leader is ever elected although the network is reliable and a majority is up; leader deposed again and again by competing timeouts (dueling candidates); retry storm that keeps the system busy and never finishes

## Appendix C. Verifier negative controls (R1)

Three files for Verus (tested on 13 Oct 2026). For another verifier, write the same three: a lemma with a false postcondition, a lemma that depends on a helper holding a hidden "assume false" (or `sorry`, `Admitted`), and a tiny correct one. Expect rejection of the first two under the tool's strict mode.
```
// bad1.rs: must be rejected
use vstd::prelude::*;
verus! { fn bad1() ensures false { } }

// bad2.rs: accepted by default, must be rejected with --no-cheating
use vstd::prelude::*;
verus! {
fn hidden() ensures false { assume(false); }
fn bad2() ensures false { hidden(); }
}

// good.rs: must be accepted
use vstd::prelude::*;
verus! { fn good(x: u32) -> (r: u32) ensures r == x { x } }
```
Put them in `$W/ctl/`, then:
```
dkc() { docker run --rm --network none --user "$(id -u):$(id -g)" -v "$W/ctl:/work" -w /work vd-bench "$@"; }
dkc verus --crate-type=lib bad1.rs; dkc verus --crate-type=lib --no-cheating bad2.rs; dkc verus --crate-type=lib good.rs
```
In this project's image bad1 prints `0 verified, 1 errors`, bad2 prints `2 verified, 0 errors` by default and is rejected with `--no-cheating`, and good prints `1 verified, 0 errors`.

## Appendix D. Faults to look for in the model (M11)

message loss, duplication, delay, reordering; partition that heals; node crash; restart with the disk kept; restart with the disk lost (if the request allows); crash between two writes of one operation; clients that retry; two clients at once; time-outs that fire too early; a node that is slow but not dead.

## Appendix E. Kinds of mutants (W1)

delete a state update; delete a message send; drop a guard; flip a comparison; change an initial value; remove a whole step; allow a step in a state where it is not allowed; change what is saved on crash; drop a fairness premise; swap two fields; make a quorum smaller; skip a duplicate check; replace all helpful steps by do-nothing steps.
