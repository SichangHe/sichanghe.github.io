# Trust the Spec, Not the Code - A Specification-First, AI-Assisted Case Study in Online Banking
(authored by agents unless marked 🧑)
Tag: `farchi2026trust`, [paper](https://arxiv.org/abs/2609.07365)

claim: verify the spec, treat code as regenerable output
- Farchi (IBM), one author, ChatGPT (version unknown), one problem: bank transfers + scheduled transfers
- no tool checks any proof, all proofs are assistant-written prose
- generated code never read, no spec-to-code refinement ("delegated to the AI")
- teaches nothing about proving code, value is in spec tightening and its failures
- no Verus/Rust mention, Verus forms are inference
loop: model reviews spec, human resolves ambiguities, prove invariant, assert at run time, Z contracts, generate code
- actually done code-first, Z added afterward
- Verus: steps 3, 4, 6 collapse into `ensures` + verifier
spec-first prompting tricks
- ask for plain-language restatement, then formalize in a fresh chat
- first formalization described only the 3-user/6-account setup
  - fix: "Clearly distinguish between the specific configuration ... and the general specification"
  - Verus: setup belongs in tests, not in the contract
- ask "prove it or highlight why it is not": model lists ill-defined items before proving
  - seeded defect (deleted funds check) was found, 1 of 1
  - prior prompts without the clause got no issue list, not tested whether clause caused it
  - transferable: delete one `requires`/`ensures` conjunct and see whether review notices
conservation invariant
- sum of balances preserved per operation, incl. refused case, then induction over reachable states
- scheduled transfer = one-time transfer + pending-set change, no new proof
- Verus: recursive `spec fn` sum over `Seq` + lemma for single-element update
  - unbounded naturals in paper, `u64` credit can overflow
- scope: properties without conservation structure (liveness, security) open
run-time oracle + coverage model
- assert sum before/after each transfer
- 5 obligations proposed by model: both outcomes per transfer type, cross-user, scheduled life cycle, multi-transfer stage
  - reported 100%, measured by the model's own code
  - no obligation for self-transfer
- Verus: redundant for `ensures`, useful for `external_body` / `assume_specification`, and as vacuity check (both preconditions satisfiable)
paired success/failure contracts
- success schema + Ξ no-change failure schema with complementary precondition
- Verus: `ensures` result == success precondition on `old` state, else state unchanged
  - without the first conjunct, always-refuse satisfies the contract
- Z's implicit "unmentioned state unchanged" must be explicit equalities in Verus
unconstrained inputs
- generated schema declared `srcU`, `dstU` but never tied to accounts, allowing debit of non-owned account
- conservation proof cannot expose it: a proved property says nothing about unmentioned requirements
- check: every input appears in some `requires`/`ensures`, scriptable
defects the method missed (inference)
- self-transfer: Lemma 1 false when source = target, a Verus proof would fail here
- `ExecutePlannedTransfers` schema constrains nothing with 0 due, over-constrains with 2 due
- `SchedulePlannedTransfer` lacks `t' > t` and ownership
- "ownership invariant" owner(ac1) = owner(ac2) ⇒ ac1 = ac2 contradicts the setup of 2 accounts per user
- only the first fails mechanically, the rest need review against the requirement
inconsistencies
- main text puts seeded-defect replies under Case Study A (which has the funds check), 4 issues vs 5
- Lemma 1 naturals in text, integers in the source reply
- long specs: model silently drops sections
