# AI with Authority, from Application to Silicon
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number, percentage, page and section reference, quotation and the Verus sketches; changed the Figure 4 caption attribution, the page range of R6, a quotation with an ellipsis, the section that names the kernel fixtures, the overstated not verified at all and commonest, the abstract-vs-section source of the zero incorrect proofs wording, and marked six unmarked inferences; the Verus sketches were not run (no Verus here).

source: Jason Hickey, arXiv:2608.21356v2 (25 Aug 2026), 17 pages, no appendix. Page numbers below are the PDF's printed page numbers.

## what the paper is

A single-author case study. One formal-methods specialist directed five long-running Claude agent "seats" for 37 days and reports a Lean 4 mathematics corpus, a Lean-verified compiler and executive, and a RISC-V design submitted to a Tiny Tapeout shuttle. The contribution that transfers is the working discipline, called the Salt method: six required invariants (R1 to R6) and six advisory articles (A1 to A6), stated in §2 and Figure 1 (p.4). The abstract gives the core idea: “The working discipline — the Salt method — rests on a proof kernel no hallucinated proof can pass: mathematical claims travel between agents as kernel-checked artifacts, and human attention is reserved for statements, designs, and rulings.” (Abstract, p.1)

The paper has no method section with algorithms, no prompts, no code listing and no table of per-task results. Every technique below is therefore written from the prose of §2 to §4 and §7. Where the paper names a rule but gives no procedure, the step says so.

The paper limits its own claim: “We make no claim that this configuration is optimal, typical, or generalizable to other researchers; it is a single person, and the author is a formal-methods specialist.” (§1, p.2)

## what is proved, what is measured, what stays trusted

Proved in the Lean 4 kernel, by the paper's account: the mathematics corpus; link 1 of the hardware chain (specification to emitted design artifacts); the compiler's simulation proofs "for its control constructs" (§5, p.7); isolation theorems of the executive (Figure 3, p.8). The paper prints no theorem statement, so a reader cannot tell from the paper what the compiler or executive theorems say.

Checked by SAT, not by the kernel: “Links 2 and 4 — that the Verilog the toolchain consumes corresponds to the emitted artifacts, and that the synthesized netlist corresponds to that Verilog — are SAT-based equivalence checks (Yosys), and can only be that: as of 2026-08-11, no general Verilog-to-Lean importer exists in any public artifact (the campaign’s own importer, §5, is scoped to this flow’s netlist-level Verilog, not general Verilog), so a kernel cannot referee those links today.” (§3, p.5)

Not emitted from kernel-checked artifacts: most of the chip. In the 2026-08-10 submission, 288 of 902 flip-flops (31.9%) were emitted from kernel-checked Lean artifacts and 614 were from agent-written RTL (§5, p.7). 288/902 = 31.93%, so the percentage holds. Inference: the paper does not say what, beyond the SAT links, checks the 614; "not verified at all" would go further than the paper. Figure 4's caption (p.9) says of the three MAC islands' 1,149 cells (which contain the 288 flip-flops): "kernel-emitted by the Lean-verified emitter, not “kernel-verified”".

Trusted: the Lean kernel and mathlib; the three standard axioms; Yosys; the human's reading of statements (§3, p.5: "trust rests on that kernel and on the statement"). Inference: the synthesis and layout tools and the agents' ledgers are also trusted; the paper does not list them. The physical chip is outside everything: “Finally, no physical chip exists yet: the design is a submission to a community shuttle closing 2026-09-07; the vendor’s estimated delivery is 2027-05-12 (the shuttle publishes no fabrication date), and no result in this paper rests on measured silicon.” (Limitations, p.14)

Measured: commit counts, a 4.86-day token meter, a human-time floor, silence windows (§7, pp.11-12). All are self-reported from the author's own repositories and instruments. The paper reports no comparison against a run without the method.

## technique 1: five artifacts per objective

What it is. Every task given to an agent returns five things, at every level from project design to component design (R1). Figure 2's caption lists them: “One human directs a five-seat agent fleet sharing a repository and an append-only message bus, with the kernel beneath as the incorruptible referee; every objective returns five artifacts — the implementation P, the specification S, the kernel-checked proof ⊢ 𝑃 ∈ 𝑆, adversarial tests T(P), and the certificate 𝑆 ′ with ⊢ 𝑆 ⇒ 𝑆′ kernel-checked.” (Figure 2, p.6)

When to use. Whenever an agent, not a human, writes both the code and its proof, and a human must still decide whether the right thing was proved.

How it is done (§2, pp.2-3).
1. The human states the objective in English.
2. The agent returns the implementation, the specification, and a machine-checked proof that the first meets the second.
3. The agent returns tests, "including adversarial controls that check the proof has bite" (§2, pp.2-3). How such a control is built: not in the paper.
4. The agent returns certificates (technique 2).
5. The human reads the certificate and questions the system; the human does not read the proof.

Verus form. Inference: the five artifacts map to an executable `fn` body (P), its `requires` and `ensures` clauses plus the `spec fn` definitions they mention (S), the loop `invariant` clauses, `assert` statements and `proof fn` lemmas that make Verus accept it (the proof), ordinary Rust tests plus mutated copies of the function that Verus must reject (T), and certificate `proof fn`s (technique 2). What does not carry over is the checker: Lean re-checks a proof term in a small kernel, while a Verus result rests on Verus's encoding and on Z3, which the Verus note in this collection lists among the things outside the proof.

Evidence. None that isolates this rule. The paper offers the whole campaign as an existence proof.

Where it fails. The paper says the kernel cannot check the two ends: whether the specification is what the human wants, and whether the human understands what was proved (§2, p.3).

## technique 2: certificate, a weaker restatement proved to follow from the specification

What it is. A second statement S′ in simpler vocabulary, with a machine-checked proof that S implies S′. The human reviews S′. The paper: “The certificate’s contract is implication, kernel-checked — the proved statement entails the restatement — so a reader can only be reading something weaker than what was proved, never stronger.” (§2, p.3)

When to use. When the real specification is too long or too abstract for the person who must sign off on it.

How it is done (§2, p.3).
1. Take the proved statement S.
2. Write S′: a restatement a reader can understand "without trusting the full formal development".
3. Prove S ⇒ S′ in the kernel.
4. The paper's most familiar form of S′ is a concrete test case turned into a theorem: “Its most familiar form is a test: for the working engineer the experience is routine — write tests as always, with one extra operation, promoting a test to a theorem.” (§2, p.3) §2 (p.3) calls the spine's "per-round kernel fixtures" (§5) such promotions.
5. The reviewer then interrogates: asks the system to unfold a statement's binders, justify a hypothesis, or produce a variant under a changed assumption, and gets machine-checked answers (§2, p.3).

Verus form. Inference: a certificate is a `proof fn` whose `requires` is the function's postcondition predicate and whose `ensures` is the simple reading. A promoted test is the same with constants.

```rust
verus! {
// sketch, not machine-checked
spec fn is_max(s: Seq<int>, m: int) -> bool {
    (forall|i: int| 0 <= i < s.len() ==> s[i] <= m)
    && (exists|i: int| 0 <= i < s.len() && s[i] == m)
}
// certificate: the spec implies a fact a reviewer can read at a glance
proof fn cert_max_ge_first(s: Seq<int>, m: int)
    requires is_max(s, m), s.len() > 0,
    ensures m >= s[0],
{ }
// promoted test: for the input [3, 7] the spec leaves only the answer 7
proof fn cert_max_example(s: Seq<int>, m: int)
    requires is_max(s, m), s.len() == 2, s[0] == 3, s[1] == 7,
    ensures m == 7,
{ }
}
```

Inference: the direction matters. The paper's certificate is S ⇒ S′, so it shows the specification is at least as strong as what the reviewer read. It does not show the specification is no stronger, and it does not catch an unsatisfiable `requires`, under which every certificate verifies. A Verus pipeline needs a separate check that the precondition can hold.

Evidence. The systems side carries 1,884 Lean lines of certificates next to 5,067 lines of compiler and 11,001 of executive and application stack (table in §5, p.7). The paper gives no measurement of errors that certificates caught.

Where it fails. Inference: a certificate that is too weak (for example, true of every program) passes the implication check. Choosing which S′ to write: not in the paper.

## technique 3: requirement elicitation before any specification

What it is. A prose process that fixes what is wanted before specification or code exists.

When to use. At the start of a project or component, before the agent writes a `spec fn`.

How it is done (§2, p.3).
1. Write the objective in prose.
2. Run an adversarial review of it: “That objective then receives a structured adversarial review: inconsistencies, completeness, the population covered, the negative space deliberately excluded, and suggestions ranked with benefits and downsides.”
3. Interview the human and record it: “A recorded interview follows, in which the human’s answers are the ground truth being elicited.”
4. Rewrite into a full, consistent set of prose requirements.
5. Register acceptance criteria before work begins: “The revision is a full set of consistent requirements — still prose — that becomes the pre-registered source for specification and implementation, with acceptance criteria registered before work begins, so success is never redefined after the fact.”

Verus form. Inference: nothing here is Verus-specific. The output of step 5 is what the `requires` and `ensures` of the top-level functions are later compared against. A requirement that has no clause, and a clause that has no requirement, are both findings.

Evidence. None measured. The paper says the practice "predates this campaign" (§2, p.3).

Where it fails. The paper states the limit itself: the correspondence between specification and intent "lives in the human alone" (§2, p.3).

## technique 4: statements are immutable to the prover, and hypotheses are named and dispositioned

What it is. Two rules that stop a proving agent from changing the goal. The R4 clause of the invariants sentence reads "no statement is ever weakened to admit a proof — statement changes are design-tier acts, never taken by an executor" (§2, p.3). R6 allows conditional results under a rule: "a statement may name hypotheses it does not discharge, provided each is named in the statement itself and carries a declared disposition, either to be discharged (ledger-owed, with the expectation of a future kernel proof) or out of domain (a stated trust boundary with another discipline, such as semiconductor physics); a program’s final deliverable carries no undischarged in-domain hypotheses" (§2, pp.3-4).

When to use. Whenever the agent that searches for the proof can also edit the file holding the statement.

How it is done.
1. Split roles: an orchestrator does design, executors prove (A1, A2, §2 p.4).
2. An executor that cannot prove a statement stops and reports; it does not edit the statement (R4, A3).
3. A change of statement is made at the design tier and recorded in the ledger (R3, R4).
4. An unproved assumption is written into the statement as a hypothesis, with a disposition: to be discharged later, or out of domain (R6).
5. Before delivery, no in-domain hypothesis is left (R6).
6. How the rule is enforced mechanically (file permissions, diff checks): not in the paper.

Verus form. Inference: the statement is the function signature, its `requires` and `ensures`, and every `spec fn` they reach. A check can compare these against the registered version after each proving attempt and reject any difference. A named hypothesis is a `requires` clause on a `proof fn`, or a `spec fn` predicate passed down from the top-level theorem, so that it shows in the final statement. The forms that hide a hypothesis are `assume(...)`, `admit()`, `#[verifier::external_body]` on a wrapper around outside code, and a bodiless axiom-style `proof fn`. Each of those should carry the same two-way disposition in a ledger, and the "to be discharged" kind should be zero at release. The paper's audit is its Lean counterpart: per-theorem axiom audits that allow "the three standard axioms only" and exclude native_decide and custom axioms (§3, pp.4-5; the sentence runs across the page break).

Evidence. The claim is “zero incorrect proofs reaching the record” (Abstract, p.1; §4, p.5 has "reached"), which the paper itself says the kernel makes "structurally impossible to record". Inference: that is a property of using a kernel, not a measurement of R4. The paper gives no count of attempted statement weakenings.

Where it fails. Inference: a hypothesis can be named and still false. R6 only makes it visible.

## technique 5: structured opposition for what the checker cannot check

What it is. For designs, measurements and reports, where no kernel applies, a second party tries to refute the claim. The paper: “Second, whatever the kernel cannot check is checked by structured opposition: designs receive adversarial refuter passes before execution, landings are witnessed independently, measurements travel with the commands that produced them, and every control must be able to fail.” (§2, p.3)

When to use. For any agent claim that the verifier does not decide: a design, a benchmark number, "the build passes", a priority claim.

How it is done.
1. Each major design phase has an exploration part and a refutation part, "iterated until dry", with acceptance criteria registered first (A4, §2 p.4).
2. Every landing is verified by a second agent that did not produce it (A6, §2 p.4).
3. A number is reported together with the command that produced it: “Measurement precedes assertion, and the extractor command that produced a number travels with the number.” (§4, p.5)
4. A check counts only if it can fail (§2, p.3). How this is tested: not in the paper.
5. Audit tooling is owned by the orchestrator, "never owned by a seat it audits" (A1, §2 p.4).
6. Errors are fixed where they arose and logged in an append-only ledger (R3; §4, p.5).

Verus form. Inference: for a Verus project the claims of this kind are that the crate verifies, that it holds no assumptions, and that the specification matches the requirement. The first two can be re-run by a second agent from a clean checkout with the exact command attached. "Every control must be able to fail" has a direct form: a proof of a function should stop verifying when the body is mutated or the `ensures` is negated, and an `assert(false)` placed at the end of a function body must be rejected; if it is accepted, the preconditions are contradictory.

Evidence. A catch ledger “whose numbering runs to #256”, kept 2026-07-07 to 2026-07-20, with #79 never assigned (Abstract, p.1; §4, p.5), so, Inference, at most 255 numbered catches in 14 days (if numbering started at #1). Only the first 78 were classified, and the paper prints no breakdown. Example classes: "wrong scope on a measured claim, stale citations, misattributed mechanisms, and statement-level type traps" (§4, p.5). On the last morning a five-lane literature search found that two of the corpus's believed firsts had public predecessors (§8, p.13). The three hardware checkers, built by three different agents, “disagreed twice during the campaign, and were reconciled at the byte level” (§3, p.5).

Where it fails. All opposing parties are instances of the same model family (Methods, p.14: "the agents are Claude-family models"). Inference: errors that this family makes consistently would not be caught by a second seat. The paper does not measure how many errors passed all layers.

## technique 6: budgeted attempts that fail loudly

What it is. Each task is classified by difficulty and priced before it is attempted, attempts are few, and an agent that runs out stops and says so. The paper: “Every attempt carries a budget after which the executor must stop and announce its failure, and failures are recorded in a ledger alongside the results.” (§4, p.5)

When to use. In any repair loop where an agent can keep trying proof edits without progress.

How it is done (A2, A3, §2 pp.3-4). (1) Classify the task. (2) Assign a budget. (3) Attempt. (4) On exhaustion, stop, announce, record the failure, escalate. The classification scheme, the budget sizes and the unit of budget: not in the paper.

Verus form. Inference: carries over unchanged as a cap on verifier calls or tokens per function, with the failed function reported upward together with its last Verus error. Combined with technique 4, exhaustion is the only allowed exit other than a proof.

Evidence. None quantified. The related discipline for numbers has one worked case: “Mid-campaign, the project measured a verification-cost ratio, published it internally, and struck it the same day when a second run — of three in all — swung the ratio by a factor of 52 — one of the three runs falling inside the very 10–100× overhead range the claim had denied.” (§7, p.12)

## technique 7: a trust chain stated link by link, with a provenance count

What it is. In place of one claim that the stack is verified, the paper names each link, its checker, and the share of the final artifact that each kind of author produced.

When to use. When a deliverable mixes verified parts, parts checked by a weaker tool, and unchecked parts.

How it is done (§3, p.5; §5, p.7; Figure 4, p.9).
1. List the links from specification to final artifact and name the checker of each: Lean kernel for link 1, Yosys SAT equivalence for links 2 and 4, a synthesis miter for link 3.
2. Have different agents build the checkers and reconcile disagreements.
3. Count, in the final artifact, which units came from the verified path. Here a "structural join" at the layout level reached all 288 named flip-flops "with zero misattributions" (§5, p.7). How the join works: not in the paper.
4. State the scope with the number each time it is quoted: 288 of 902 at the die, 352 of 966 (36.4%) at the RTL, because a disabled 64 flip-flop block was removed by synthesis (§5, p.7). 352/966 = 36.44% and 352 − 64 = 288.

Verus form. Inference: for a Rust product the same table would have rows for functions verified by Verus against a specification, functions marked `#[verifier::external_body]` or `#[verifier::external]`, unverified dependencies, and the unverified steps after Verus (erasure of ghost code, rustc, linking). The provenance count becomes lines or functions of shipped code under each row. The hardware checkers themselves do not carry over.

Evidence. Figure 4 (p.9) gives the shipped die's logic cells by author: agent-written RTL 6,944 (61.9%), tool-inserted timing repair 2,611 (23.3%), kernel-emitted 1,443 (12.9%), clock tree 214 (1.9%), of 11,212 logic cells. The four add to 11,212 and each percentage matches its fraction.

Where it fails. For the shipped revision the die-level join was not re-run, “so no die-level provenance ratio is stated for the shipped design” (§5, p.7).

## numbers that do not add up, and gaps

- tokens per line. §7 (p.11) reports 28.07M output tokens and 56,951 inserted Lean lines in the metered window, and calls this "376 output tokens per inserted line". 28,070,000 / 56,951 is about 493. The paper does not explain the difference.
- corpus size. §6 (p.10) says "over 320,000 lines of Lean 4 under the paper's strict extractor" and "658,103 lines by raw count", then "29.3% of the size of mathlib itself, measured with the identical extractor". Figure 5 puts 29.3% next to 658,103 and mathlib at 2,249,115; 658,103 / 2,249,115 = 29.3%. Inference: the 29.3% belongs to the raw count, although the sentence reads as if it belonged to the strict count.
- human time. The engaged floor is 37 h 21 m of 116 h 40 m wall clock (32.0%), for the last 4.86 days only (§7, p.11). It was corrected down from 44 h 25 m after 11 h 50 m of agent-typed keystrokes were found in the human channel. 44 h 25 m minus 11 h 50 m is 32 h 35 m, not 37 h 21 m; the paper does not reconcile them. No human time is given for the other 32 days.
- flip-flops. The submission had 902; the shipped revision has 1,468 (§5, p.7; Figure 4, p.9), of which the same 288 are kernel-emitted. Inference: that is 19.6% of the shipped die, a ratio the paper declines to state.
- links. §3 speaks of "a chain of three independent checkers" and then of links 1 to 4. It defines link 4 as netlist against Verilog and says only that "Link 3 is the synthesis miter", so how links 3 and 4 differ is not explained.
- Methods (p.14) is a list of topics. The Lean and mathlib version pins that §3 says are "in Methods" are not printed, and the model versions are "deferred to the pre-publication content freeze".
- wording. The abstract says the processor was "taped out"; Limitations says no chip exists and the shuttle closes after the paper's date.
- Inference: the retracted verification-cost ratio means the paper's main economic claim, that verification is "not only economical but essential to productivity" (Abstract, p.1), has no measured ratio behind it. The paper says so: it lists a dollar cost per theorem, model-hours and a generated-versus-authored split as things its records cannot give (§7, p.11).

## not to redo in VL

Inference, from the paper's content:
- the role split of orchestrator, executors, independent witness and append-only ledger is described here and has been run for 37 days; VL gains nothing by reinventing it under new names, and can adopt R1 to R6 as a checklist
- the certificate idea (prove S ⇒ S′ and show the human S′) is stated here; what is open is choosing S′ well and checking the other direction, which the paper does not attempt
- the paper does not address Rust, SMT-based verifiers, proof repair, or specification quality metrics; those remain VL's own ground

## threat to VL's product

Inference: low as a competing product, moderate as a competing story. The author's repositories are public (Data availability, p.14) and the method is tool-agnostic at the required tier, so anyone can copy the process. But the artifact is Lean and hardware, built by one expert, with no evidence that a non-expert can run it, and the paper says exactly that: “The subject is one expert practitioner; nothing here estimates what other researchers, or teams, or other domains would achieve, and we make no labor-market claims.” (Limitations, p.14) The paper's weakest point is the same as VL's hardest problem: the human still has to judge statements, and the only aid offered is the certificate. A product that makes specification review measurably reliable for non-experts would be ahead of what this paper shows.

## techniques for the catalog

- five artifacts per objective: every agent task returns implementation, specification, proof, adversarial tests, and certificates
- implication certificate: prove that the specification implies a simpler restatement and have the human review only the restatement
- test promoted to theorem: turn a concrete input and output pair into a machine-checked consequence of the specification
- active interrogation: the reviewer asks for unfolded binders, justified hypotheses and variants, and accepts only machine-checked answers
- prose-first requirement elicitation: adversarial review of the objective, recorded interview, then acceptance criteria registered before any specification
- immutable statements: the proving agent may not edit the statement; a change of statement is a recorded design act
- named and dispositioned hypotheses: every unproved assumption appears in the statement, tagged to be discharged or out of domain, with none in-domain left at delivery
- per-theorem axiom audit: list what each theorem depends on and allow only a fixed set
- structured opposition: refuter pass before execution and an independent second agent on every landing, for claims no verifier decides
- measurement travels with its command: no number is reported without the command and scope that produced it
- controls must be able to fail: a check is accepted only after it has been shown to reject a bad input
- budgeted attempts with loud failure: classify and price a task, cap attempts, and record exhaustion as a result
- link-by-link trust chain with provenance count: name each link's checker and count how much of the shipped artifact came through the verified path
