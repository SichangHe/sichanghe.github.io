# Usability of AutoProof: a case study of software verification
(authored by agents unless marked 🧑)
Tag: `khazeev2016usability`, [paper](http://arxiv.org/abs/1605.01663v1)

source: Khazeev, Rivera, Mazzara, Tchitchigin (Innopolis University), arXiv:1605.01663v1, 5 May 2016, 6 pages, no appendix. Page numbers are the PDF's.

## what the paper is, in one paragraph

Four authors re-implemented one protocol of the Tokeneer ID Station (enrolment) in Eiffel, wrote contracts for it, and ran the AutoProof verifier on it. AutoProof is an auto-active verifier: the user never steers the prover, and only writes annotations in the source. The paper is a short experience report. It teaches contract-writing devices by example (Figures 2 to 8) and gives one measurement, a three-way count of 38 proof obligations. It has no algorithm, no user study with participants, and no timing. Section III, which the introduction calls the methodology, is a walk through the classes and their annotations, not a protocol for how the verification was carried out. The paper counts “38 generated proof” and the abstract speaks of “verification conditions”; this study says “obligations” for both.

The tool pipeline, as the paper states it: “It translates Eiffel code to Boogie programs [10] and calls the Boogie tool to generate verification conditions: logic formulas whose validity entails correctness of the input programs.” (Section II.C, p.3)

What AutoProof checks, without the user asking for each item: “AutoProof verifies that routines satisfy pre- and post-conditions, maintenance of class invariants, loops and recursive calls termination, integer overflow and non Void (null in other programming languages) references calls.” (Section II.C, p.3)

## technique 1: a class contract in three parts (precondition, postcondition with old, class invariant)

what it is: each routine states what callers owe (`require`) and what it gives back (`ensure`); the class states one predicate over its fields that holds whenever an object is visible from outside.

when to use it (Inference as to scope): any type whose fields must stay in a legal range across calls; the paper's example is a bank account whose balance never goes below zero.

how it is done, from the paper's `ACCOUNT` example (Figure 2 on p.2 and the text after it, Section II.B, pp.2-3). Inference: the paper shows the finished class and states no order of work; the order of the steps below is this study's reading of it:
1. write the invariant first: `invariant non_negative_balance: balance >= 0`
2. give the creation routine a postcondition that makes the invariant true: `make` ensures `balance = 0`
3. for each routine that changes a field, find the argument values that would break the invariant, and exclude them with a precondition. `withdraw (amount)` requires `amount <= balance`; `deposit (amount)` requires `amount >= 0`. The paper's reason for the second: a negative value might invalidate the invariant of the class
4. state the effect as an equation between the new value and the value at entry, using `old`: `balance = old balance + amount`
5. label every clause (`balance_increased:`, `enough_balance:`), so a failed obligation names the clause

The scope of the invariant, in the paper's words: “A class invariant must be satisfied by every instance of the class whenever the instance is externally accessible: after creation, and after any call to an exported routine of the class (public routines).” (Section II.B, p.3)

Verus form (Inference: the paper is about Eiffel; the code below was not run). `require` is `requires`, `ensure` is `ensures`, and `old balance` is `old(self).balance` in a method taking `&mut self`. The invariant is a `spec fn` that every method both requires and ensures:

```rust
struct Account { balance: i64 }

impl Account {
    spec fn inv(&self) -> bool { self.balance >= 0 }

    fn deposit(&mut self, amount: i64)
        requires
            old(self).inv(),
            amount >= 0,
            old(self).balance + amount <= i64::MAX,
        ensures
            self.inv(),
            self.balance == old(self).balance + amount,
    {
        self.balance = self.balance + amount;
    }
}
```

What changes: Eiffel's `INTEGER` overflow check is one of AutoProof's built-in obligations; in Verus the same obligation appears because `i64` addition must be shown not to overflow, and the third `requires` line is what discharges it. Figure 2 has no such line. Whether AutoProof accepted `deposit` as printed is not stated in the paper. What does not carry over: an Eiffel invariant is implicit at every public routine; with a plain `spec fn inv` each signature must repeat it. `#[verifier::type_invariant]` with `use_type_invariant(&self)` is the Verus construct closer to Eiffel's implicit form. Clause labels have no Verus counterpart in the constructs listed in the notes.

evidence: none for this example; Figure 2 is an illustration, and the paper does not say it was run through AutoProof.

## technique 2: mark the constructor so that its obligations are proved once

what it is: an annotation that tells the verifier which procedure initializes new objects.

how it is done (Section III, pp.3-4; Figures 3 and 8): inside the creation routine `make`, add `note status: creator`. The effect as described: “only when an object of this class is being created, AutoProof needs to verify a creation routine only once.” (Section III, p.4). Inference: the point is that a constructor starts from an object whose invariant does not hold yet, so it must be checked under a different assumption from ordinary routines, which may assume the invariant on entry.

The general rule about annotations that this instance illustrates: “AutoProof does not make any assumptions out of box therefore users are expected to feed the Eiffel classes for a succeed verification.” (Section III, p.3)

Verus form (Inference): no annotation is needed. A constructor is an ordinary `fn new() -> (s: Self)` with `ensures s.inv()` and no `requires` on `inv`; the asymmetry is visible in the signature rather than in a status tag.

## technique 3: model queries, and frame conditions written over them

what it is: the class names a subset of its attributes as its abstract state (the model). Contracts speak about the model; a routine lists which model parts it may change.

when to use it (Inference; the paper gives no such guidance): a routine changes one field of an object with several, and callers need to know the others are untouched.

how it is done (Section III, p.4; Figure 7):
1. at the top of the class, add a `note` clause with the keyword `model:` followed by one or more attributes
2. in each procedure's `require` part, add `modify_model(...)` naming the model query it may change and the object, as in Figure 7, where the query is `current_display` and the object is `Current`
3. state the new value in `ensure`: `current_display = v`

The paper's definitions: “Model queries are part of model-based contracts to help users to write abstract and concise specifications [11], they are used to specify the behavior of the class.” and “In Eiffel, frame conditions are listed using the modify clause, which lists the model queries that the feature is allowed to modify, as shown in Figure 7 (i.e.” (Section III, p.4)

Verus form (Inference): the model is a `spec fn view(&self)` (written `self@` through the `View` trait) that returns a `Seq`, `Map`, `Set` or tuple; make it a `closed spec fn` when clients must not depend on the representation. Verus has no frame clause. A method taking `&mut self` may change every field, so each unchanged model part is stated in `ensures`, for example `self@.screen == old(self)@.screen`. A method taking `&self` changes nothing, which is the frame condition for free. What does not carry over: Eiffel objects alias freely, so `modify` must name objects; Rust's ownership rules already say that a call can change only what it holds by `&mut`.

## technique 4: derive contracts line by line from a formal specification

what it is: the Tokeneer system has a published Z specification (the paper cites [7], file “41 2.pdf”). Inference: the paper shows this for one schema, `RequestEnrolment`, and does not state a rule that each schema line becomes one clause; the procedure below is the study's generalisation of that one case.

how it is done, on the `RequestEnrolment` schema (Section III, p.4; Figures 4 and 5):
1. read the schema's lower part, which relates values and variables: `enclaveStatus = notEnrolled`, `floppyPresence = absent`, and two further lines for the screen message and the display (the text extraction of Figure 4 renders their prime as `0`; I take them to be primed, per the paper's remark on apostrophes)
2. separate state that is fixed from state that changes. The paper's reading of the Z marks: “The notation Ξ indicates an operation in which the state does not change, and the apostrophe indicates the state of the variable after the change [12].” (Section III, p.4)
3. write the unprimed conditions as postconditions of the creation routine, so they hold initially. Figure 5 has three: `enclave_status = cons_floppy.not_enrolled`, `floppy_presence = cons_internal.absent`, `token_removal_timeout = 0`
4. collect the specification's enumerated values (the real-world types, such as screen and display messages) in one constants class, `CONST`, and state membership in the invariant: `constants.display_message.has(current_display)` (Figure 6)
5. give each setter the membership test as a precondition, so that the invariant survives the assignment: `set_current_display(v)` requires `constants.display_message.has(v)` (Figure 7)

Not in the paper: any check that the Eiffel contracts say the same as the Z schema. The correspondence is by hand. The two further lines of Figure 4 (`currentScreen'.screenMsg = insertEnrolmentData`, `currentDisplay' = blank`) have no counterpart in the `ensure` of Figure 5; the body of `make` in Figure 8 does assign `current_display := constants.blank`, but no postcondition says so. The third postcondition, `token_removal_timeout = 0`, is not in the schema of Figure 4.

Verus form (Inference): step 4 is a Rust `enum` for the message set, which makes the membership invariant and the setter's precondition unnecessary, because an ill-formed message cannot be constructed. This is a case where the Rust type system removes a proof obligation that the Eiffel version, using `STRING`, has to carry. Steps 1 to 3 are the same: one `ensures` line per schema equation, with `old(self)` for unprimed and `self` for primed variables, and one explicit equality for each component under Ξ.

## technique 5: report verifier usability as a three-way count of proof obligations

what it is (Inference: the paper does not name this as a technique): run the verifier on the finished code and sort every obligation into proved automatically, not proved, or tool error. The paper's words for the buckets are “discharged automatically”, “could not be satisfied” and “failed due to internal errors”.

evidence, the paper's only measurement (Section IV, p.5): “In total there were 38 generated proof. Of these, 22 (58%) were discharged automatically, 8 (21%) could not be satisfied, and the rest (21%) failed due to internal errors, which in our case were basically caused by the attempt to create objects in the contract, and that is not allowed by the tool.” The fractions check: 22/38 = 57.9%, 8/38 = 21.1%, and the rest is 38 - 22 - 8 = 8, again 21.1%. Setup: one Eiffel implementation of the enrolment part only; “This research work encompasses only the enrolment process of the whole Tokeneer System therefore it implements only the entities involved in this process.” (Section III, p.3). The paper gives no code size, no solver time, no count of annotation lines, and no hours of effort.

A lesson that follows from the third bucket: the paper says the internal errors “were basically caused by the attempt to create objects in the contract”, which the tool does not allow, so such a contract ends in an internal error, not in a failed proof. Inference: the Verus analogue is that `requires` and `ensures` are spec expressions and cannot call exec functions; Verus reports this as a mode error at the offending expression, which is the kind of feedback the paper asks for.

The paper's stated criterion for such tools: “Verification tools should require minimal annotational effort and give valuable feedback when verification fails.” (Section IV, p.4)

## 22 of 38 obligations proved; the translation chain and the hand-made contracts trusted

- proved: for 22 of 38 obligations, that the Eiffel routine meets its contract, as judged by Boogie. Which 22 is not listed
- not proved: 16 of 38. The paper does not say which routines these belong to, nor whether the 8 unsatisfied ones are bugs in the code, errors in the contracts, or missing annotations
- trusted (Inference; the paper has no discussion of trust): the AutoProof translation from Eiffel to Boogie, Boogie, the solver behind it, and the hand translation from the Z specification to contracts
- not addressed: the security properties of Tokeneer. The contracts shown are initial-state equalities, one membership invariant, and `constants /= Void`

## statements that do not fit together

- the abstract says “The results show the efficacy of the tool in verifying a real piece of software and automatically discharging nearly two thirds of verification conditions.” (p.1); Section IV gives 22 of 38, which is 58%, nearer to three fifths than to two thirds (two thirds of 38 would be 25)
- Figure 8 is captioned as the verified `ID_STATION` class and the text calls it the final version with annotations “for Autoproof to successfully verify the class” (Section III, p.4), while 16 of 38 obligations of the project were not discharged; the paper does not say whether any of the 16 are in this class
- the conclusion says “AutoProof is capable to verify industrial software and may well be adopted in commercial companies and its use injected into the development process.” (Section VI, p.6). The evidence is one protocol of the system with 42% of its obligations undischarged
- the same section claims a complexity comparable with safety-critical and financial-critical applications, without a size or complexity figure anywhere in the paper
- the text describing Figure 7 calls the `modify_model` line the second pre-condition; it is a frame condition placed in the `require` block

## obstacles to adoption that the paper names

These are opinions of the authors; the paper gives no measurement for any of them (Section VI, pp.5-6). Inference: they come from the authors' experience of the case study, which the paper does not say outright.
- too few worked examples: the paper says the tutorials on the official website are useful but not enough
- code must be changed to be verified: “First, existing implementations need to be modified in order to be verified.”
- the environment: “Second, the Eiffel IDE - necessary for functioning - calls for increased stability and robustness.”
- debugging a proof is still trial and error: “AutoProof does not change the rules of the game: developers will have to try, observe the results and make changes as a consequence.” (Section VI, p.5). The paper then names three places where the fix may lie: the implementation, the contracts, or the proof annotations

Inference for an agent writing Verus: the three places are the three edits an agent can make after a failed run, and the paper's second obstacle is the reason to write code and proof together instead of verifying finished code.

## how much this threatens agent-written verified Rust: not at all

Inference: none. The work is a 2016 partial case study in Eiffel with 22 of 38 obligations proved, no automation of annotation writing, and no agent. Its use is as a small source of contract patterns and as a caution on reporting: a headline of two thirds from a count of 58%, and a caption saying verified beside a 42% failure count, are the kind of claim a reader of a verified-Rust product would check first.

## techniques for the catalog

- contract triple with old: write the invariant first, make the constructor establish it, give each mutator a precondition that excludes the arguments breaking it and a postcondition equating the new state with `old` state.
- constructor status annotation: tell the verifier which routine creates objects (the paper's stated effect: it is verified only once; the reason, that the invariant is not assumed on entry, is this study's inference); in Verus the constructor signature already expresses this.
- model queries with frame clauses: name the abstract state of a class and list per routine which part may change; in Verus a view `spec fn` plus explicit unchanged-field postconditions.
- contracts from a formal specification, clause by clause: turn each schema equation into one postcondition, unchanged-state marks into frame equalities, enumerated real-world types into a constants type with a membership invariant.
- three-way obligation count: report proved, unproved and tool-error obligations separately, with the total, when stating how automatic a verifier was on a code base.
- no object construction inside contracts: keep contracts to pure expressions; the paper says attempts to create objects in a contract were the basic cause of the tool's internal errors (8 of 38).
