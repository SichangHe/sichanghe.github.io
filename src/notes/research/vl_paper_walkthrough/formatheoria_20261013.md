# FormaTheoria: Constructing Large-Scale Lean Theories from Mathematical Literature $-$ Toward the Formalization of the Classification of Finite Simple Groups
(authored by agents unless marked 🧑)
Tag: `nie2026formatheoria`, [paper](https://arxiv.org/abs/2608.10894)

Audit: audited 2026-10-13 against the paper; checked every number, percentage, table, page and quotation, and the steps of algorithms 1 to 3; changed the Appendix B page range, the claim that all four root statements are independent, the 4.2x explanation, the whole-project reconciliation share, two unmarked inferences and a claim of little human input; Verus forms are unchecked against Verus sources.

source: Nie, Zhang, Tang, Testa, Yau, Li, Zhou (Tsinghua, Warwick), arXiv:2608.10894v1, 11 Aug 2026; 57 pages; appendix A (the four theorems) and appendix B (prompts) included. Pages are the printed ones.

The paper is about Lean 4 and group theory. It has no Verus. Every Verus form below is an inference, as is the reading of a source theorem as a requirement and a Lean statement as a specification.

## what is proved, and what stays trusted

Proved, in the sense that Lean's kernel accepts it: four theorems of finite-group theory (Feit–Thompson Odd Order, Glauberman's Z*, Brauer–Suzuki, Bender–Suzuki; Appendix A, pp.49–50), in a repository of “more than 994,000 lines of Lean in more than 850 files” (§5, p.24), built in about 7 months (Table 1, p.5) by LLM agents from 15 books and papers. The whole run consumed 64B tokens (§5.1.3, pp.29–30).

The paper separates two kinds of correctness, and this separation is the reason to read it: “Lean’s elaborator establishes well-typedness, not semantic fidelity.” (§1.1, p.6) The kernel proves that each proof matches its statement. Whether a statement says what the book says is checked by an LLM reviewer and, for the root theorems only, by comparison with a separately written statement: the LeanEval benchmark file for three, the authors' own statement for Bender–Suzuki (Appendix A, pp.49–50).

Trusted:

- Lean's kernel and its three standard axioms (`propext`, `Classical.choice`, `Quot.sound`; §5.6, p.40)
- Mathlib
- for three of four root theorems, the statement posed by the LeanEval benchmark; for Bender–Suzuki, the authors' own statement and their constructions of the groups it names (Appendix A, pp.49–50)
- for the roughly 30,000 intermediate declarations, the LLM reviewer. The paper says so: “These root-level checks do not assess the source-level justification of intermediate declarations.” (§5.6, p.40)

Inference: an intermediate statement that is wrong but provable and never contradicted downstream stays wrong. It cannot make a root theorem false, because the root statement is checked independently and the kernel replays the proof; it can make the library misleading for reuse.

Measured: three small ablations (§6), a retrospective count of repairs (§5.4), review rejections (§5.5), and a size comparison with the human Rocq proof of the Odd Order theorem (§5.6). The model used for the seven-month construction is not named; the ablations use `gpt-5.6-sol` at reasoning effort `max` in the Pi harness (§6, p.40).

## technique 1: candidate and approved states, with frozen statements

what it is: every formalized item is either `candidate` or `approved`. Approval freezes the statement. Agents working later may replace a proof but not change what was proved.

when to use: whenever many agents build on each other's results and one could make its own task easier by weakening something upstream.

how it is done (§2.1, p.11):

1. model an item's formalization as a tuple of type, term, context and state, the state being `candidate` or `approved`
2. apply the rule: “Once a formalization fs is approved, both the type and term of a definition are fixed.” and “For a theorem, the type is fixed, although its proof term may be replaced provided that the resulting code still elaborates.”
3. allow one exception: the reconciler (technique 6) may revise an approved statement when it is explicitly authorized for those declarations
4. a definition is approved as soon as translation passes review; a theorem only after its proof passes (Algorithm 1 lines 10–12 and 28–30, p.14)

Verus form (inference): the frozen part of a Verus function is its signature with `requires`, `ensures` and `decreases`; of a `spec fn`, its body as well, since the body is the definition. The body of an exec fn or `proof fn` is the replaceable proof term. This maps one to one.

evidence: none isolated; the rule is a design constraint, not an ablated component.

where it fails: freezing preserves errors too. The paper names the case: “Similarly, an [I N T1] error in the type of an already approved declaration cannot be repaired merely by replacing its proof term.” (§5.4, p.36)

## technique 2: statement immutability enforced by hashing, not by prompt

what it is: a mechanical check that no existing statement changed during an agent run.

when to use: always when an agent has write access to files that hold approved statements. The paper's reason: “A language-model agent may inadvertently modify an existing statement, and Lean’s metaprogramming facilities make source-level audits alone insufficient for reliably detecting such changes.” (§3.2, p.20)

how it is done (§3.2, p.20):

1. “Before P ROVE AGENT or R EFINE AGENT begins, the agent snapshots the current Lean repository and records a statement hash for every existing top-level Lean declaration.”
2. the hash uses kernel-level declaration information, not source text
3. at each stop point (a turn in which the model calls no tool) recompute and compare
4. on any difference reject, report the modified declarations, and resume the agent “with an explicit instruction to restore the affected statements and definitions”

Verus form (inference): hash, for every function, the signature and its `requires`/`ensures`/`decreases` clauses, and for every `spec fn` also the body. Source-text hashing has the weakness the paper names for Lean: Verus code lives inside the `verus!` macro and a project can define further macros, so text can stay equal while meaning changes. The counterpart of kernel-level information is the specification after macro expansion. Whether Verus exposes that in a stable form is not something the paper or the notes establish.

evidence: none isolated.

## technique 3: review-gated termination in a shared agent loop

what it is: one loop used by every agent role. The agent cannot finish; a reviewer supplied with the task decides.

how it is done (Algorithm 2 and §3.1, pp.15–16):

1. start the context with the task prompt p
2. each turn the model returns a response and a list of tool calls; if there are calls, run them and append the results
3. a turn with no tool calls is a stop point; parse the output o from the files the task contract names
4. run the review agent: `(v, d) ← R(p, o)`
5. on accept return o; on reject append the diagnostic d to the context and continue
6. tools are `read`, `edit`, `write`, `bash`, and a role can restrict them

“The framework terminates and returns the output only when R accepts it.” (§3.1, p.16)

Each role brings its own R. For the prover agent R is three mechanical checks (§3.2, p.19): the project elaborates; no existing statement or definition changed; on a claimed success the result depends on no axiom beyond Lean's fundamental ones. For the agent that only decomposes, the first check is dropped: “the Lean project is not required to elaborate at a R EFINE AGENT stop point”.

Verus form (inference): R for a proof-writing agent is: `verus` reports zero errors on the crate; the specification hashes of technique 2 are unchanged; and a scan finds no new `assume(`, `admit()`, `#[verifier::external_body]` or `assume_specification`. The last is the counterpart of the axiom check; Lean's `#print axioms` follows dependencies, so the Verus scan must cover every function the result calls, not only the edited file. For a decomposing agent, drop the first check and allow `admit()` only in the bodies of newly proposed helper lemmas.

evidence: for translation, 11 of 14 PF Part I sections were rejected at least once (technique 5). For proof agents no rejection counts are reported.

where it fails: Inference: the reviewer is the whole guarantee. The prover prompt adds its own list, which shows what the authors saw agents do: “Do not declare the task complete merely because a scratch example elaborates or one local theorem closes; satisfy the user’s full requested scope and integration boundary.” (Appendix B, p.55)

## technique 4: proof construction over a persistent graph of helper lemmas

what it is: a long proof is split across two agents and a directed acyclic graph kept on disk. One agent proves a single node; the other splits a node that proved too hard. Dead ends are kept as pruned nodes.

when to use: when a proof exceeds what one agent run can finish. The paper's scale: “The longest observed trajectory spanned 9.17 days, consumed 3.5 billion tokens, and underwent 606 context compactions.” (§5.1.3, p.30)

how it is done (Algorithm 3, p.18; §3.2, pp.17–19):

1. the graph starts as the target alone, state `proposed`; the active path is `[f]`
2. take the last node a of the path and run the prove agent on it
3. `Success`: mark a `proved`, pop it
4. `NotProvable(e)`: mark a `pruned`, pop it; if a is the root, return failure
5. `MissingDependency(s′)` or `Conflict(s′)`: return that status to the outer workflow (technique 7 or 6)
6. otherwise the status is `TooHard(e)`: the refine agent adds helper lemmas under a, extends the path, and picks the next active node
7. if the graph exceeds a size bound, return failure
8. loop until the root is proved

The two failure statuses are kept apart on purpose: `TooHard` means split; `NotProvable` means the agent does not see the node as a viable obligation, “for example, because it appears mathematically false or because the agent cannot identify a valid proof” (§3.2, p.19).

Why pruned nodes are stored: “In particular, pruned nodes help prevent P ROVE AGENT from repeatedly following the same unsuccessful decomposition.” (§3.2, p.18) And the graph is what survives summarization: “Whenever the model context is compacted, the current graph, active path, and active node are retained in the compacted context.” (§3.2, p.18)

The prompt (Appendix B, pp.51–55) adds working rules:

- before a new route write a 3–8 line sketch naming the reduction, the helpers, the dependencies and the highest-risk inference
- “Isolate the hard core as an explicit lemma with the weakest useful statement.”
- test doubtful steps before building on them: “If an informal source makes an unsupported jump, isolate the exact implication and try to falsify it under weaker assumptions.”
- keep a `state.md` with active target, progress, lessons and validation gate
- a probe file outside the repository for experiments; a `sorry` is allowed there only, and `sorryAx` in an axiom listing is to be treated “as unresolved proof debt”

Verus form (inference):

- a node is a `proof fn` with `requires` and `ensures`; a proposed node has `admit()` as its body, so the parent verifies against it at once; proved means the `admit()` is gone and `verus` passes; pruned nodes are deleted from the source and kept in the graph file with the reason
- the falsify-first rule has a cheap Verus form: test the candidate lemma's `ensures` as executable assertions on small inputs before proving it
- what does not carry over: Lean's probe loop with `trace_state` and `#check`; Verus prints no goal state, so the probe is a small file with the one failing assertion

evidence: the four theorems were completed this way. The dependency graph of the result (project declarations reachable from Bender–Suzuki): 30,298 nodes, 186,187 edges; “Of the 30,298 project declarations, 8,916 (29.4%) have depth zero, and the median depth is only two.” (§5.1.3, p.27) The root has depth 458; the 90th, 95th and 99th percentiles are 38, 169 and 378. No ablation removes the graph.

where it fails: Inference: the decomposition may inflate code. Against the human Rocq proof, the Lean development “has fewer declarations than the Rocq development in five sections, but eighty times as many in PF Part I Section 6” (§5.6, p.38), a spread the authors call consistent with many of the extra declarations being helper lemmas. The size bound in step 7 is not given a value.

## technique 5: independent semantic review of translated statements, with a learned checklist

what it is: after a statement is translated and elaborates, a second LLM with no memory of the translation compares it with the source and returns accept or reject with findings.

when to use: at the point a natural-language requirement becomes a formal statement; a wrong statement proves nothing about the requirement, however sound the checker.

how it is done (§3.3, pp.20–21; prompts p.56):

1. the translator gets the source item, the raw pages and the transcription; a theorem's proof is left as `sorry`
2. mechanical checks first: the project elaborates; no existing statement changed
3. the reviewer gets the source item, raw pages, transcription and the candidate, plus a checklist of recurrent errors
4. independence: “At each stop point, the R EVIEWAGENT is invoked with a fresh context.” and “It receives neither findings from previous reviews nor the internal reasoning trajectory of T RANSLATOR AGENT.”
5. on rejection the concrete findings go back to the translator
6. if the source is ambiguous the translator must return failure “rather than selecting an unsupported interpretation”
7. after a batch of runs and human interventions, a self-improve agent rewrites the checklist

The first, human-written checklist (§3.3, p.21): moving part of the conclusion into the assumptions; omitting conditions; confusing existential and universal quantification; using a library declaration whose meaning differs subtly; replacing a required typeclass assumption with a different or more general one.

The learned checklist (§6.3, pp.42–43) has five rules: recover inherited context; preserve canonical data; preserve complete structured data; do not strengthen for implementation convenience (“Conclusions of theorems should not appear in assumptions.”); audit bundled interfaces for hidden strengthening.

the paper's example of what review must catch (§5.3, p.32): Peterfalvi's (12.6) was translated with its conclusions packed inside a data structure that the theorem took as a hypothesis. “The resulting theorem therefore admitted a trivial proof but was unusable in downstream arguments, such as Peterfalvi’s (12.16) and (14.2), because constructing theorem_12_6_source_data already required establishing the intended conclusions.” It was found only when a later proof tried to use it.

Verus form (inference): the reviewer compares the requirement text with `requires` and `ensures`. Each checklist rule has a direct Verus reading:

- conclusion in assumptions: a `requires` clause, or a `spec fn` predicate named in it, that already implies the `ensures`. The function verifies trivially and no caller can meet the precondition
- hidden strengthening in bundled interfaces: a well-formedness `spec fn` reused in `requires` that demands more than the requirement states
- inherited context: assumptions set up earlier in a requirements document and not repeated at the clause being specified
- canonical data: a specification quantifying over an arbitrary function or map where the requirement means one particular, already defined one
- the (12.6) defect suggests a mechanical test the paper does not have: for each verified function, write one caller that establishes its `requires` from the requirement's stated inputs. If none can be written, the specification is vacuous

evidence:

- Table 8 (p.37), PF Part I, 14 sections: 16 rejections, 30 review rounds. “Only three sections were accepted on the first review; the other eleven, or 78.6%, were returned for revision at least once.” Seven were accepted in round two, three in round three, one in round four.
- Table 12 (p.42), pilot, 10 randomly sampled source items fixed across four runs, correctness judged by hand: no review 6/10 at 22,545,626 tokens; accept/reject only 7/10 at 36,060,479; decision with diagnostics 9/10 at 64,415,452; self-improved checklist 10/10 at 59,764,652.

where it fails:

- n = 10, one run per condition, manual judging; the paper calls it a pilot
- rejection counts do not show the reviewer is right: “The data establish the usefulness of review as an active quality gate, but not its semantic accuracy in isolation.” (§5.5, p.37)
- Inference from Tables 7 and 8 together: review misses what reconciliation later repairs. PF Part I Sections 10 and 13 had 0 and 1 review rejections and the two highest shares of declarations later modified by the reconciler (8.97% and 8.50%). The (12.6) defect is in Section 12, which had one rejection and still passed with the defect

## technique 6: constrained reconciliation of conflicting formalizations

what it is: when a new item cannot use an approved one, a dedicated agent compares both sources and both formalizations and makes the smallest source-supported repair, or gives up and escalates.

when to use: when two specifications written from different documents must compose and do not. The paper classifies causes (§2.2, pp.11–12):

- DEF1: the source statement is wrong; DEF2: the source proof is wrong
- MAL1: two sources define the same object equivalently but the formal definitions are not definitionally equal; MAL2: two sources use one name for different objects
- INT1: a translated theorem cannot be proved because the translation is wrong; INT2: a translated item cannot be applied downstream because it is wrong

The observable symptom is always INT1 or INT2; the cause is found by diagnosis.

how it is done (§3.4, pp.21–22; §4.2, p.24; prompt pp.56–57):

1. trigger: the prover returns `Conflict(s′)`, either because the formalization of s′ cannot be used in s, or because s looks unprovable and a downstream s′ invokes it
2. retrieve source pages and transcriptions for both items
3. permitted repairs: revise the current candidate; add a justified compatibility definition or lemma; replace the proof of an approved theorem keeping its statement; revise the statements of exactly the two items handed to it
4. two principles: “the repair should be local and minimal, avoiding unnecessary changes to the surrounding formalization; and” “all existing downstream uses of the affected formalizations must continue to elaborate.”
5. review: the project elaborates with downstream statements untouched; all changes lie within the authorized declarations
6. exclusivity: “At most one R ECONCILER AGENT may be active at any time.” All other processes pause until its changes are committed
7. if the sources do not support a repair, return failure for a human

Prompt patterns worth copying (p.57): “If the desired Lean theorem cannot be invoked due to mismatched type, first write down a separate bridge lemma deriving the desired property from the existing assumptions.” and “If the theorem statement asserts existence, try to make the statement constructive, i.e. write down the concrete construction in the statement.”

the paper's examples (§5.2, pp.30–32):

- MAL1, bridged automatically: one book defines a type I maximal subgroup with a condition on every complement, the other on some complement. The two are equivalent by the Schur–Zassenhaus theorem; the prover proved a bridge lemma
- MAL1, one direction only: one source requires a regular action, the other a transitive one. The prover derives transitivity from regularity and does not formalize the converse
- DEF1, repaired automatically: a lemma in Peterfalvi needs an oddness condition its statement omits; the condition holds where the lemma is applied, so the reconciler added it
- DEF1, escalated: a typographical error in a definition (one subgroup written for another) stalled the proof of a proposition until a person read the source proof
- DEF1, escalated after a counterexample: for a divisibility condition in Huppert's statement of Dickson's theorem, “The P ROVER procedure found counterexamples to this statement and escalated the issue for human investigation.”
- DEF2, fixed during proof: an index range off by one in a proof

Verus form (inference):

- MAL1 is two `spec fn` definitions of one notion from two requirement documents. The repair is a `proof fn` whose `ensures` states their equivalence (or the one implication that is true), called where the two meet. Neither definition is edited
- the constructive-statement pattern: replace an `ensures` with an existential over the result by one that names the witness through a `spec fn`, so callers can reason about which value they got
- exclusivity: a crate-wide lock while any specification is edited, since every dependent proof must be rechecked
- escalation: a counterexample to a specification, found by running it on small inputs, goes to a person and is not repaired by editing the specification until the proof passes

evidence (Table 6, p.34; Table 7, p.35; §5.4, p.33):

- 284 of 10,417 declarations in the listed source groups were modified by the reconciler, 2.7%
- 255 of the 284 are in PF Part I; Sections 9, 10 and 13 hold 219, which is 77.1%
- across the 14 PF Part I sections the modification share correlates with the count of dependency edges leaving the section (Pearson r = 0.861, Spearman ρ = 0.820, both p < 0.001) more than with section size (r = 0.607, p = 0.021)

where it fails or what it assumes:

- the counts are declarations touched, not conflicts, calls or success: “Finally, the aggregate does not measure the success rate or cost of reconciliation.” (§5.4, p.36)
- no evidence, no repair: “Reconciliation cannot manufacture mathematical evidence that is absent from the sources.” (§5.4, p.36)
- the list of automatic fixes is incomplete by the authors' account: “Because such automatically resolved issues are recorded only in execution logs and are not reported separately by the workflow, our retrospective review may not have recovered every instance.” (§5.2, p.30)
- Inference: 10,417 is the population of only those groups that had at least one modification. PF Part I Sections 1–5, with 0 modifications and 2,799 declarations (Table 7), are not in Table 6, and the Bender–Suzuki closure alone has 30,298 declarations. Table 6 does not say whether groups outside it had modifications, so the share over the whole project is not given; it is below 2.7% only if they had none

## technique 7: on-demand recursive dependency discovery

what it is: the workflow is not given the list of things to formalize. When translating or proving an item needs another item, it suspends, formalizes that one by calling itself, and resumes.

how it is done (Algorithm 1, p.14; §2.3, pp.12–13):

1. search agent retrieves the source; OCR agent transcribes; raw pages are kept beside the transcription
2. translator returns success, `MissingDependency(s′)` or failure
3. on a missing dependency: run the whole workflow on s′, then restart the translation of s
4. for a theorem, loop the prover; on `MissingDependency(s′)` formalize s′ and restart the proof; on `Conflict(s′)` call the reconciler and continue; on failure report to a human; on success approve
5. if formalizing a dependency fails, the workflow halts for a human

Verus form (inference): a missing dependency is a callee without a specification, or a mathematical fact with no lemma. The agent returns the name of what is missing; the orchestrator specifies and verifies that first, then restarts the caller.

evidence (§5.1.1, p.24; Table 2, p.25): 3 human-supplied sources (357 pages) grew to 15 sources (1,037 consulted pages); the 12 discovered sources account for 680 pages, 65.6%.

where it fails: restart cost is not measured. Inference: line 7 of Algorithm 1 restarts translation from the beginning after each dependency, so an item with k missing dependencies is translated k+1 times.

## technique 8: dependency-aware batch parallelism

how it is done (§4.2, pp.23–24):

1. group items into batches, typically one section of a book
2. start the workflow for all items of a batch at once
3. keep a table from item to its active invocation
4. on discovering a dependency, consult the table: “If the dependency is already being processed, the invocation does not launch a duplicate task.” It waits for that invocation
5. otherwise start the dependency through the ordinary recursion
6. reconciliation takes a global lock (technique 6)

Verus form (inference): unchanged; items are functions or modules. One Verus-specific cost: the paper's wall times include compilation, where a full rebuild takes more than 30 minutes (§6, p.40); a Verus crate has the same shape of cost, so parallel agents need separate build directories or module-level verification.

evidence (Table 10, p.41): proof of Glauberman's Z* theorem, statements supplied in advance, at most ten concurrent provers, context sharing on. Sequential: 51.4 h, 2,085,361,637 total tokens. Parallel: 12.3 h, 3,038,587,634 tokens. Wall time −76.1% (4.2×), tokens +45.7%. “Parallelization is therefore effective at converting additional inference capacity into shorter elapsed time, but it is not a token-saving mechanism.” (§6.1, p.41)

where it fails: one target, one run per condition. At most ten concurrent provers gave 4.2×, not 10×. The paper does not tie the 4.2× to the cap; it says only that “overall completion is governed more by the slowest active branches than by the sum of all branch durations” (§6.1, p.41).

## technique 9: section-level context sharing and compaction

how it is done (§4.1, p.23; §3.1, p.16):

1. items in the same section of a source are treated as related
2. “Accordingly, when Algorithm 2 is invoked for a source item, its initial context C0 is initialized from the most recent model context available for that section at the time of invocation.”
3. when the context passes a token threshold, replace its older part by a summary; “The compacted context preserves the task specification, output contract, established results, unresolved work, and references to persistent artifacts needed to continue the task.”

Verus form (inference): the unit is the module. What is worth carrying is the same kind of thing: which `vstd` lemmas exist and apply, which triggers and hints worked, the module's invariants.

evidence (Table 11, p.41): PF Part II, Chapter 4, Section 3, 21 theorems proved in sequence. No sharing (21 fresh sessions): 23.6 h, 520,807,040 tokens. Sharing (one session): 17.3 h, 426,810,415 tokens; total tokens −18.0%, output tokens −20.9%.

where it fails: one section, one run each. Inference: the sharing condition as run is one session that simply continues, which is not quite the mechanism of §4.1, where separate instances inherit a context.

## technique 10: root-statement check by an independent comparator, and a converse as sanity check

what it is: two ways to make a final theorem believable to a reader who will not read a million lines.

how it is done (§5.6, p.40; Appendix A, pp.49–51):

1. someone other than the prover writes the statement. For three theorems this is the LeanEval benchmark file (Theorem 3 is displayed with ht_mem left out, and adds the authors' one-line odd core); for Bender–Suzuki the statement is the authors' own, and only its Side 1 is in Mathlib vocabulary (Appendix A, pp.49–50)
2. the `comparator` tool “takes a statement written independently of the development, using only Mathlib constants, and verifies that the theorem proved here has the same type”
3. it then replays the proof through the kernel and checks that only the three permitted axioms are used
4. for a statement that must mention project-specific constructions (the groups named in Bender–Suzuki), state an equivalence whose other side is short and standard, and prove both directions: “The reverse implication from Side 2 to Side 1 therefore serves as a reader-facing sanity check on the formalization.”

Why compilation alone is not enough: “Lean accepts any file that compiles, and macros, custom tactics and new axioms give an author many tricks to compile something that does not prove what its name suggests.” (Appendix A, p.51)

Verus form (inference):

- keep the top-level specification of a deliverable in a file the agents cannot write, written by the customer or a separate party, and check that the delivered function's `requires`/`ensures` are the same after expansion
- the converse trick for specifications that rest on project-defined `spec fn`s: prove a lemma that links the complicated definition to a three-line predicate a reader can check by eye, in both directions where possible
- there is no Verus tool known to the notes that does what `comparator` does; this is a gap, not a carry-over

evidence: the four statements in Appendix A. For Brauer–Suzuki the authors note their proof does not use one benchmark hypothesis (`ht_mem`), so their theorem is the stronger.

## what the measurements say about cost and quality

- size against a human proof of the same theorem (Odd Order): Rocq 34 files and 40,549 lines; the root-specific Lean part 537 files and 626,021 lines, about 15 to 1 (§5.6, p.38). Per section the ratio runs from 0.2 to 34.9 (Table 9, p.39). The authors list four reasons lines are not comparable (libraries, proof language, generated structure, volume is not quality) and conclude: “These figures are not normalized measures of effort, readability, or quality, but they indicate that rapid construction does not by itself produce a concise and reusable library.” (§1.3, p.9)
- source length predicts little: across 46 sections, pages against local Lean lines has Pearson r = 0.47; two eight-page sections have 4,009 and 73,314 lines (§5.1.2, p.26)
- more than 10% of repository lines are outside the dependency closures of the Odd Order and Bender–Suzuki theorems (§5, p.24), that is, unused by either

## numbers that do not add up

- context sharing, wall time: the contributions (§1.2, p.7) and the text of §6.2 (p.41) say 26.5%; Table 11 says 26.7%; 23.6 h to 17.3 h is 26.7%.
- the Rocq development's definition of type I maximal subgroups is cited as “[42, Definition 8.1]” in §5.2 (p.30) and as [42, Definition 8.3] in §5.6 (p.38); §5.2 (p.31) uses Definition 8.3 for the clause with the typographical error.
- the reconciler's remit: §2.3 (p.14) and §3.4 (p.21) say it addresses MAL1 and MAL2; §2.2 (p.12) says it is introduced for INT1 and INT2 and that MAL1 is handled by a helper lemma; in §5.2 the MAL1 cases were resolved by the prover and a DEF1 case by the reconciler.
- token rate in §6.1: 3,038,587,634 tokens over 12.3 h is 247.0 million per hour; the text says 247.4 million (rounding of the hours would explain it).
- everything else checked holds: Table 6 row sums (284; 10,417), 219/284 = 77.1%, 242/5,246 = 4.6%, 13/1,626 = 0.8%, Table 7 shares, Table 8 total 16 and 30 rounds, Table 9 totals and the 52,971 and 1,386 remainders, Table 3 page and line sums, 357 + 680 = 1,037, graph ratios, Table 10 and 12 percentages.
- not reported at all: how many times a human was called, how many reconciler calls were made, the model used for the main construction, and the cost in money.

## what VL should not redo

Inference:

- inventing a completion rule: Algorithm 2 with a per-role reviewer is the same idea as the verification gate in SemaPLC, arrived at independently, and is specified well enough to copy
- showing that parallel agents trade tokens for time, or that a reviewer giving reasons beats one giving a verdict; both are measured here, if thinly
- a taxonomy of why a formal statement fails to match its source: DEF/MAL/INT covers the cases and comes with worked examples
- hoping statement review alone catches vacuous specifications: the (12.6) case passed review and was caught by a downstream use

What VL would have to build that this paper does not supply: a Verus counterpart of kernel-level statement hashing and of `comparator`.

## what a million agent-written Lean lines mean for VL

Inference: the paper is not a competitor; it formalizes mathematics in Lean. It is the strongest evidence in this batch that the approach VL sells works at scale: agents, a mechanical checker, frozen specifications and a reviewer produced about a million checked lines in about seven months; the paper does not report how much human intervention this took. Two things it shows cut against a naive product. First, the output is 15 times the size of the human proof and partly unused, so verified is not the same as maintainable. Second, the only parts with assurance beyond an LLM's opinion are the four root statements; a product whose specifications are written by the same agents that prove them has the intermediate-declaration level of assurance, not the root level. The same recipe is available to anyone with the token budget, which the paper puts at 64B tokens.

## techniques for the catalog

- candidate/approved states — an item's statement is frozen on approval; later agents may replace proofs but not statements
- statement-hash immutability check — snapshot a hash of every declaration's statement before an agent runs and reject any stop point where a hash differs
- review-gated agent loop — the loop returns only when a task-specific reviewer accepts; rejections are appended as diagnostics and the agent continues
- axiom-free success check — a claimed proof is accepted only if its dependency closure uses no axiom beyond the logic's standard ones
- prove/refine proof graph — one agent proves a single node, another splits nodes judged too hard, over a persistent graph with proposed, proved and pruned states
- pruned-node memory — failed decompositions stay in the graph so they are not retried after context compaction
- TooHard versus NotProvable — separate statuses for split-this and this-looks-false, the second leading to pruning or escalation
- falsify-before-prove — try to refute a doubtful implication in a smaller setting before stating it as a helper lemma
- fresh-context semantic review — a reviewer with no access to the translator's reasoning compares statement and source against a checklist
- self-improved review checklist — recurrent translation failures and human interventions are turned into new checklist rules
- conclusion-in-assumption check — reject statements whose hypotheses already contain the conclusion, which prove trivially and cannot be used
- bridge lemma for misaligned definitions — prove the equivalence or the one valid implication between two formal definitions of the same notion and edit neither
- constrained reconciliation — a single globally exclusive agent may edit only the two conflicting declarations, must keep all downstream uses elaborating, and otherwise escalates
- DEF/MAL/INT issue taxonomy — classify a failed integration as source defect, cross-source misalignment or incorrect translation before choosing a repair
- recursive dependency discovery — an agent returns the missing item, the workflow formalizes it first and restarts the interrupted task
- dependency-aware batch parallelism — run a section's items concurrently and make a worker wait when its dependency is already in progress
- section-level context sharing — start each task from the latest model context of the same source section
- independent root-statement comparison — check the proved theorem's type against a statement written by another party and replay the proof in the kernel
- converse as sanity check — prove the reverse direction of a classification so that a short readable predicate vouches for elaborate constructions
