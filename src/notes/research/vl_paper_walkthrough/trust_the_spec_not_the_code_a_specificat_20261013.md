# Trust the Spec, Not the Code - A Specification-First, AI-Assisted Case Study in Online Banking
(authored by agents unless marked 🧑)
Tag: `farchi2026trust`, [paper](https://arxiv.org/abs/2609.07365)

Audit: audited 2026-10-13 against the paper and its Appendix A; checked every number, page reference and quotation, the technique steps against Sections 3 to 7 and Appendix A.2 to A.4, and the Verus forms; corrected claims that the author read every proof and that a transcript backs the dropped-sections remark, the trusted list, the incomplete list of first-attempt defects, the scheduling-schema note, a disagreement bullet the paper does not support, and an overclaim that a mechanical checker would have rejected all four defects.

source: Eitan Farchi (IBM Research), arXiv:2609.07365v1 (7 Sep 2026), 34 pages; pages 12 to 34 are Appendix A, the working document with every prompt and reply; http://arxiv.org/abs/2609.07365v1

## the claim, and its size

One author, one chat assistant, one small problem: a money transfer between accounts, then the same with transfers scheduled for a later time. The author writes the requirement as prose with light mathematics in LaTeX, has the assistant review it, prove that total money is conserved, generate a Python simulation, propose what a run must exercise for the conservation check to count, and rewrite the operations as Z schemas. The code is never read. The paper reports no tool checking any proof: every proof in it is text written by the assistant, and the appendix records the author reading the proofs for the one-time and scheduled transfers (pp.13, 14, 22) but says nothing of the author reading the Z-level proof (pp.32-33). On the missing link between spec and code the paper is explicit: “We are explicit about the method’s limits: the proofs and runtime checks live at the specification level and do not establish that the generated code refines the specification—that step is delegated to the AI.” (Abstract, p.1). It places itself against verifiers in one sentence: “Beyond the immediate predecessor, the work sits alongside classical formal-methods practice [8, 9, 4, 1] and recent work on LLM-based code generation [3, 2]; it differs from automated program verifiers such as Dafny [5] in that we do not mechanically verify the generated code—we verify the specification and treat the code as regenerable output (see Section 9).” (§2, p.3)

So for someone building machine-checked Rust, the paper teaches nothing about proving code. What it does hold is a transcript of how a specification gets tightened by asking a model to prove things about it, including several places where that process let a defect through. Both are recorded below. The paper never mentions Verus or Rust, so each Verus form below is an inference of this study.

## proved, measured, trusted

- proved, in prose drafted by the assistant: Lemma 1, a single transfer leaves the sum of balances unchanged (§4, p.5); Theorem 1, the sum is constant over every configuration reachable by the four operation schemas, given as a proof sketch (§7, p.8) with the assistant's fuller text in Appendix A (pp.32-33)
- measured: generated program sizes of 106 lines (one-time transfer, §4, p.4) and 265 lines (scheduled transfers, §5, p.6; the paper's "about 2.5×" matches 265/106 = 2.5); a coverage figure of 100% over five obligations, reported by generated code about its own run (§6, p.7)
- trusted (§9): that the Python does what the specification says; that the coverage instrumentation measures what it claims; the author's reading of simulation logs. Inference: also that the assistant's proofs are right, since no checker is reported. On the last of the three §9 items: “Runtime assertions raise confidence but detect violations only on exercised paths (hence the coverage model of Section 6), and coverage itself is argued informally rather than measured by an independent tool.” (§9, p.9)
- the model is unidentified: “The work was carried out with ChatGPT used as an agent during the first quarter of 2026; the exact underlying model version is not known to us, as it was not surfaced by the interface and may have changed over the period.” (§9, p.10)

## technique 1: the six-step loop

what it is: a fixed order of work in which the specification, not the code, is what the human reads.

when to use: the paper applies it to a state-changing service with one global quantity that every operation should preserve.

how it is done, the paper's own list (§3, pp.3-4):
1. the assistant reviews the specification and flags ambiguities and inconsistencies before any code exists
2. the human resolves each ambiguity and decides what is fixed and what is left to the assistant
3. prove the invariant by induction over operations
4. turn the invariant into a check asserted while the simulation runs
5. fix the interface in Z as precise contracts
6. generate the code and do not inspect it

what actually happened differs from the list: “This case study was in fact conducted code-first: the natural math specification, proof, and runtime assertion came first (Sections 4–6), and the Z formalization was added afterward as a separate pass (Section 7) that tightened and re-verified the contracts.” (§3, p.4)

Verus form. Inference: with Verus, steps 3, 4 and 6 collapse. The invariant is an `ensures` clause, the proof is discharged by the verifier against the code itself, the run-time check is unnecessary for a proved property, and not reading the code is justified by the proof instead of by a log. Steps 1, 2 and 5 stay human work, with step 5 written as `requires` and `ensures` on Rust signatures in place of Z.

evidence: one author, two variants of one problem, no control. The paper: “This is a case study, not a controlled experiment.” (Abstract, p.1)

where it fails: it gives no assurance about the code (first quote above).

## technique 2: from prose to "natural math", with the general case split from the test setup

what it is: an intermediate specification in prose plus set and function notation, written by a human or produced by the model from plain prose.

when to use: when the requirement exists only as sentences and a statement precise enough to prove something about is wanted.

how it is done (Appendix A.4.1, pp.16-21):
1. have the model restate the mathematical specification in plain language, and read that restatement to confirm intent (pp.16-17)
2. in a fresh chat, ask for a mathematically precise LaTeX description from the plain-language text (p.17)
3. read the result for these defects, which the first attempt had: it was written for the fixed three-user, six-account setup and not in general; relations were still in English; it allowed a transfer amount of zero; it also had LaTeX errors and assumed every account holds a positive amount (p.19)
4. reissue the prompt with one added sentence: “Clearly distinguish between the specific configuration that apply to the simulation and the general specification that has arbitrary but finite number of users and accounts.” (Appendix A.4.1, p.19)
5. the second reply separates a general specification (finite sets U and AC, a total function owner : AC → U, balances bal : AC → N, the transfer as a case split on bal(a_s) ≥ m) from the simulation's instance (pp.20-21)

the author's note on step 4: “In order for it to work I had to ask to distinguish the specific simulation from the general specification.” (Appendix A.4.1, p.21)

Verus form. Inference: the same split is the split between a function's contract and its tests. The general part becomes `spec fn` definitions and `requires`/`ensures` over arbitrary inputs; the three-user setup belongs in a test, never in the contract. Inference: the prompt sentence of step 4 is reusable as is when an agent is asked to draft a Verus contract from a requirement that comes with a worked example, since the failure it prevents (a contract that only describes the example) is not specific to LaTeX.

evidence: two attempts, one success (pp.18-21).

where it fails: the first reply's defects were found by the author reading it, not by any check. Inference: the second reply still lets the amount be zero (m ∈ N, p.20), the defect the author named in the first; the paper does not remark on it.

## technique 3: ask for a proof "or why not", and seed a defect to see whether it is found

what it is: use a request to prove a property as the probe that makes the model examine the specification, and test the probe by removing something from the specification on purpose.

when to use: before trusting a model's review of a specification.

how it is done (Appendix A.4.2, pp.22-24):
1. take the plain-language specification and delete one requirement; the author deleted the check that the source account holds enough money (p.22)
2. have the model produce the mathematical specification from the damaged text (pp.22-23)
3. state the lemma and end the prompt with “Provide a proof that lemma 10 is correct or highlight why it is not.” (Appendix A.4.2, p.23)
4. read the list of issues the model returns before its proof

what came back (p.24): five issues. The sum in the lemma ranged over account identifiers and not balances; "fun transfer" was undefined; the specification did not say whether a balance may go negative; the lemma should hold for arbitrary accounts and states and not only the six-account run; "amount of money" had to mean the sum of the balance function. On the seeded defect the model added: “The proof below works for either case, because it only uses algebraic cancellation −amt + amt = 0.” (Appendix A.4.2, p.24)

Verus form. Inference: Verus answers "or why not" mechanically, and more strictly. With unsigned balances the subtraction in the debit does not verify without the sufficient-funds precondition, so the seeded deletion would surface as a failed arithmetic obligation at that line, and it could not be waved through as harmless to conservation. Inference: the technique that carries over is the seeding: delete or weaken one `requires` or `ensures` conjunct and see whether the agent's review, or the proofs of the callers, notice.

evidence: one seeded defect, found (1 of 1). In the three earlier proof requests, whose prompts end at "is correct" without the "or highlight why it is not" clause (pp.13, 14, 21), the replies contain a proof and no list of issues. Inference: the paper does not test whether the extra clause is what produced the list.

where it fails: the main text reports four of these five issues as arising in Case Study A, whose specification does contain the funds check (§4, pp.4-5); see the section on disagreements.

## technique 4: a conservation invariant proved per operation, then over all reachable states

what it is: pick a quantity every operation should preserve, prove each operation preserves it, conclude it holds in every reachable configuration.

when to use: the paper's own scope statement: “Whether the approach extends as cleanly to properties without a conservation structure (e.g., liveness, security) is open.” (§9, p.10)

how it is done:
1. define the quantity as a function of state: the sum over all accounts of the balance (§4, p.4)
2. state the single-step lemma with the state before, the state after given by cases (source, target, any other account), and the equality of the two sums (Lemma 1, p.5)
3. prove it by isolating the two changed accounts and cancelling −amt + amt (p.5)
4. cover the rejected operation: “The proof does not rely on B (srcA) ⩾ amt: a rejected transfer leaves B ′ = B , so the lemma holds for aborted transfers as well.” (§4, p.5)
5. define I as the configurations obtained from a legal initial one by finitely many applications of the operation schemas, and prove the invariant by induction on that construction: base case, then one case per schema (Theorem 1, §7, p.8; full text pp.32-33)
6. a new operation that is a sequence of old ones needs no new proof: a scheduled transfer, when it runs, is a one-time transfer, and scheduling changes only the pending set (§5, p.6)

Verus form. Inference: define a recursive `spec fn` giving the sum of a `Seq` of balances, with a `decreases` clause on its length. Give every state-changing function the clause that the sum of the new state equals the sum of `old(...)` state. Prove one `proof fn` saying that replacing one element changes the sum by the difference of new and old value, by induction with `decreases`; each operation's body then calls it twice. Inference: step 5 is implicit in Verus when the state is reachable only through those functions: per-function preservation is the induction step, and no object standing for the set I is built. If a stated theorem about all reachable states is wanted, the transition system has to be modelled in `spec fn`s and the induction written as a `proof fn`. Inference: two things do not carry over from the paper's mathematics. First, the paper's balances are unbounded naturals; a `u64` credit can overflow, so the success case needs a second precondition and the failure case a second cause. Second, see the self-transfer case in the next section, which Verus would force into the open.

evidence: none beyond the proofs being read by the author. “Fees or interest would require a modified statement.” (§4, p.5)

## technique 5: the proved invariant as a run-time oracle, with a coverage model for it

what it is: assert the invariant around every operation, and separately define what a run must have exercised before "never failed" means anything.

when to use: when the code is not verified and confidence has to come from runs.

how it is done (§4, p.5; §6, pp.6-7; Appendix A.3, pp.15-16):
1. compute the sum before and after each transfer and assert equality (p.5)
2. ask the model, giving only the invariant, what must be checked for it to be covered at run time (prompt, p.15)
3. the five obligations it returned (§6, p.6): the before/after check on every executed transfer; both the success and the failure case at least once for each transfer type; transfers across different users and distinct accounts; the scheduled-transfer life cycle (insertion without balance change, persistence across time steps, execution when due with the check around it); at least one stage with several transfers, checked after each
4. the completion rule: “The invariant is covered when all five obligations are met during execution.” (§6, p.6)
5. have the model generate code that checks the invariant after each stage, reports which obligation each stage newly covered, and prints the percentage at the end (prompt, p.16)

the reason given: “Asserting the invariant is necessary but not sufficient: an invariant that is never observed to fail may simply never have been exercised on the paths that could break it.” (§6, p.6)

Verus form. Inference: for a property carried by an `ensures` clause the coverage model is redundant, because the verifier considers every path. It keeps a use in two places. One is code Verus does not check: anything behind `#[verifier::external_body]` or `assume_specification` is trusted, and a run-time assertion of the assumed contract with an obligation list of this kind is how such an assumption can be tested. The other is as a review list for the contract itself: obligation 2 (both outcomes reachable) is a vacuity check, namely that the success precondition and the failure precondition are each satisfiable.

evidence: “The AI-generated implementation then instrumented these obligations and reported 100% coverage.” (§6, p.7). Denominator: five obligations, one program, runs of unstated number and length.

where it fails: the obligations were proposed by the model, judged adequate by the author, and measured by code from the same model; no independent tool is involved (§9, p.9). Inference: the list has no obligation for a transfer whose source and target are the same account, the case discussed below.

## technique 6: paired success and failure contracts, and Z as a decomposition device

what it is: each operation is written as two schemas with complementary preconditions, one that changes state and one that states explicitly that nothing changes.

when to use: for any operation that can be refused.

how it is done (§7, pp.7-8; Appendix A.4.3, pp.24-31):
1. state schemas first: `AccountState` with balances : AC → N; `PlannedTransferStore` with the pending set (p.7)
2. success schema `OneTimeTransfer`: declares that `AccountState` changes; inputs; preconditions owner srcAC = srcU, owner dstAC = dstU, balances srcAC ≥ f; postcondition balances′ = balances overridden at the two accounts (p.8)
3. failure schema `OneTimeTransferFail`: declares `AccountState` unchanged (the Ξ convention); same inputs and ownership preconditions; precondition balances srcAC < f (p.8)
4. the reason: “We pair a success schema with a Ξ (no-change) failure schema so that the insufficient-funds case is an explicit, reviewable contract rather than an afterthought.” (§7, p.7)
5. getting there took three rounds of prompting (pp.25-31). Round one translated everything to Z and was judged correct but cumbersome (p.27). Round two asked to use schemas only for the interfaces and leave the rest of the text alone; its defects: “One is that the ExecutePlannedTransfers schema is described for the specific configuration.” (Appendix A.4.3, p.29), and the text that invokes a schema did not name the inputs. Round three fixed both by asking for exactly those two changes (p.29)
6. Z stays internal; the human reads prose with mathematics, and anything found in the schemas is rendered back into that form (§7, p.7)

Verus form. Inference: one Rust function returning a `bool` or a `Result`, with three kinds of `ensures` conjunct: the result is success exactly when the success precondition held in the `old(...)` state; on success the new state is the old one updated at two places; on failure the new state equals the old state. The first conjunct matters: without it an implementation that always refuses satisfies the contract. Inference: Z's convention that an operation schema says nothing about state it does not mention has to be made explicit in Verus as equalities with `old(...)` for every field left alone, and the paper's own schema shows what goes wrong when that is skipped (next section).

evidence: none measured. The paper leaves open whether the decomposition helps: the question of whether internal Z measurably improves ambiguity detection and generation is listed as future work (§10, p.10).

## technique 7: read the generated contract for declared but unconstrained inputs

what it is: a review step on a model-written contract. The paper names the defect it found; the general rule is this study's wording.

how it was found (§7, p.8): “The AI-generated schemas initially declared the users srcU , dstU but never constrained them: nothing tied srcAC to srcU , so the contract permitted debiting an account that its stated user does not own.” The author restored the two ownership preconditions.

why the proof did not catch it: “The omission does not affect conservation—money is conserved regardless of ownership, which is why the proof never exposed it—but it does matter for a faithful interface contract.” (§7, p.8)

Verus form. Inference: a parameter that appears in no `requires` or `ensures` clause and is unused in the body is the same signal, and it can be found by a script. Inference: the second quotation is the lesson with the widest reach here: a proved property says nothing about requirements it does not mention, so an agent-written function can verify against a conservation `ensures` while debiting the wrong person's account. Verifying one invariant is not a review of the contract.

evidence: one instance. When the model was instead asked to choose the interfaces itself from the specification, it did include ownership preconditions, and made other errors: “It also made the mistake of referring to π6 (p) which is a specific simulation detail.” (Appendix A.4.3, p.34); it also dropped the simulation initialization (same page).

## where the paper disagrees with itself, and defects it does not report

- the main text lists the ambiguities the assistant raised as part of Case Study A, whose specification includes the funds check, and one of them is that the specification does not say whether a balance may go negative (§4, pp.4-5). In Appendix A that list is the reply in the seeded-defect experiment, where the author had removed the funds check (pp.22-24). The main text never mentions that a defect was seeded. It also gives four issues where the reply has five.
- Lemma 1 in the main text types balances as naturals and then says the proof does not need the funds condition (p.5); the reply it is taken from types them as integers (Lemma 8, p.24). With naturals a debit beyond the balance has no value.
- Inference: Lemma 1 is false when source and target are the same account. The case definition gives B′(a) = B(a) − amt for a = srcA first, so the sum drops by amt; the proof's step of isolating "the two affected accounts" assumes they differ. Nothing in the specification, the schemas or the coverage obligations excludes it, and the simulation draws source and target at random. In the Z schema the override would then contain two values for one account. A Verus proof of the conservation `ensures` would fail on this case until a `requires` that the two differ, or a branch, is added.
- Inference: the `ExecutePlannedTransfers` schema in Appendix A (p.31), which the main text omits “for brevity” (p.8), does not support the step of Theorem 1 that relies on it. It says: for every pending transfer due now with enough funds, balances′ equals balances overridden for that one transfer. With two due transfers that demands balances′ equal two different functions; with none due, or with a due transfer lacking funds, balances′ is not constrained at all. The proof (p.33) argues about a finite composition of updates, which is the intent and not what the schema states.
- Inference: `SchedulePlannedTransfer` in the main text (p.8) has neither the ownership preconditions restored for the one-time transfer nor the condition that the scheduled time is later than now, which the specification requires (§5, p.5) and which the model's own unprompted version does include (p.34). A transfer scheduled for a past time would stay pending forever, since execution fires only on equality of times (the Appendix prose that invokes the schema does state t′ > t, p.30, but the schema does not).
- the paper credits the model's unprompted interfaces with capturing "the ownership invariant" and prints it as owner(ac1) = owner(ac2) ⇒ ac1 = ac2 (§7, p.9; the schema is on p.33). Inference: that formula says no two accounts share an owner, which contradicts the simulation's own setup where each user owns two accounts. The intended property, that each account has one owner, already follows from owner being a function.
- §8 says the implementation appeared correct on first generation; §9 concedes that this rests on the same author's inspection of the simulation output, not on an independent oracle (§8, p.9; §9, pp.9-10).

Inference: four of these (the self-transfer, the execution schema, the scheduling schema, the owner formula) are specification defects that survived the paper's method (model review, proof, coverage, human reading). Of the four, only the self-transfer would fail mechanically (a proof of the conservation `ensures` breaks on it); the other three are gaps between contract and requirement that a proof checker accepts and only review against the requirement finds. That is the strongest evidence in the paper that its method leaves defects, and it cuts against its title.

## reusable as published

- the prompts, verbatim, for prose to mathematics, for proof-or-objection, for a coverage model of an invariant, and for interface extraction (Appendix A)
- the observation, reported without a count, that a long specification makes the model drop parts: “On the negative side, as specifications grew past a few pages the AI sometimes silently dropped tasks or sections—so abstraction, modularity, and decomposition still matter.” (§8, p.9)

## threat to VL

Inference, all of it. As a rival approach, small: the argument is that with a reviewed specification and a hand-read proof about it one may stop reading the code, and the paper's own appendix shows contract defects passing that process on a problem of two operations. As a description of what buyers may accept, larger: it shows an industrial researcher content with specification-level assurance plus run-time assertions, at a cost of a few prompts, and a product that asks for machine-checked proofs must show what that extra cost buys. The self-transfer case is a ready example of what it buys; the unconstrained schemas show what a proof of one invariant does not.

## techniques for the catalog

- six-step spec-first loop — review, resolve, prove the invariant, assert it at run time, fix contracts, generate code unread; the paper's order, which it did not itself follow
- general-versus-instance split — when a requirement comes with a worked example, tell the model to separate the general specification from the example's configuration
- restate then formalize — have the model put a formal text into plain language for the human to confirm, then formalize from that in a fresh session
- proof-or-objection prompt — ask for a proof "or why not" so that the model lists what is ill-defined before proving
- seeded specification defect — delete one requirement and see whether review or proof notices it
- conservation invariant by operation — choose a preserved quantity, prove each operation preserves it including the refused case, and lift to all reachable states by induction
- compound operation as sequence — prove nothing new for an operation that is a sequence of already-proved ones plus changes to unrelated state
- invariant as run-time oracle — assert the proved equality before and after every operation in the unverified implementation
- invariant coverage obligations — define, per invariant, the outcomes, input diversity, life-cycle phases and multi-operation stages a run must exercise before "never violated" counts
- paired success and failure contract — give every refusable operation an explicit no-change contract with the complementary precondition
- unconstrained-input review — check that every declared input of a generated contract is tied to the state by some predicate
- property-is-not-contract check — after an invariant is proved, list the requirements the invariant does not mention and review those separately
