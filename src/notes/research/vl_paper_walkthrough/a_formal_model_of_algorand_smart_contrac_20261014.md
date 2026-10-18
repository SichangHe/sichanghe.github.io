# A Formal Model of Algorand Smart Contracts
(authored by agents unless marked 🧑)
Tag: `bartoletti2021algorand`, [paper](https://arxiv.org/abs/2009.12140)

## scope and result
The paper gives a mathematical state-machine model for Algorand stateless smart contracts (ASC1), proves safety properties, specifies contract patterns, and compiles a declarative expression language to TEAL. Its model abstracts implementation details deliberately: it is high-level enough for reasoning but is not a byte-accurate blockchain model. The abstract says, “We develop a formal model of Algorand stateless smart contracts (stateless ASC1).” (Abstract, p. 1)

The trust boundary is explicit. The model assumes collision-resistant hashes and unforgeable signatures (except negligible probability), and an adversary that schedules enabled actions but is bounded in delaying users. Consensus itself, fees, notes, rekeying, applications, and several manager/configuration features are outside the model. The paper says, “Our objectives imply that we do not aim at covering all the possible TEAL contracts with bytecode-level accuracy.” (Introduction, p. 2)

## technique: executable labelled transition model

what it is and when to use it

Represent accounts, assets, transactions, leases, freezes, rounds, and pending transactions as a labelled transition system. Use this when informal contract reasoning depends on corner cases of balances, time windows, atomic groups, or authorization.

how to apply it

1. Define an account as an address and finite asset balance map; enforce Algo reserve and asset-count validity. (Section 2.1, pp. 3–4)
2. Define transaction records, temporal validity, lease acquisition, and a blockchain state containing accounts, current round, unexpired transaction set, asset managers, leases, and freezes. (Sections 2.1–2.2, pp. 4–5)
3. Give inference rules per transaction kind (the text describes pay-to-new-account, pay, close, gen, optin, burn, revoke, freeze/unfreeze, delegate; Fig. 5 on pp. 31–32 splits pay and close into several rules). Every rule checks no double spend, temporal validity, and valid resulting balances, then updates only its relevant state components. (Section 2.3, pp. 5–7; Fig. 5, pp. 31–32)
4. Define round advancement by incrementing the round and removing transactions whose last-valid round has expired. (Section 2.3, p. 7)
5. Define an atomic group by requiring a sequence of single-transaction transitions and expose only the final state as one labelled transition. (Section 2.4, p. 7)

A representative rule is the new-account payment: the sender balance is decreased, a receiver account containing exactly the transferred Algos is created, the transaction is added to the unexpired set, and the lease map is updated when the lease identifier is nonzero. The paper states, “all transaction types check conditions c1 and c2 above; further, all transactions check that updated account balances are valid.” (Section 2.3, p. 6)

Verus form (Inference)

Model the concrete Rust state with a `struct` and use `spec fn` predicates for valid balances and temporal validity. Use `requires` and `ensures` on `fn` transition functions, and `invariant` declarations in loops when implementing execution. Prove preservation of balance validity and state updates with `proof fn` lemmas. Atomic groups can be a function whose postcondition relates the final state to repeated single-step calls. The paper’s inference rules do not carry over as executable Rust; they become specifications and proof obligations.

what evidence shows it works

The paper proves three global theorems from the transition rules: no transaction occurs twice, asset value is preserved until burn, and both the blockchain and user-interaction transition systems are deterministic. It emphasizes, “Theorem 3 establishes that the transition systems −→ and =⇒ are deterministic.” (Section 2.7, p. 10) The proofs are in Appendix D (pp. 27–30). The paper reports no automated prover or benchmark denominator for them; the Future work paragraph lists mechanization in a proof assistant as a future direction, “this would allow machine-checking the proofs developed by pencil-and-paper in §D.” (Section 5, p. 18)

where it fails or what it assumes

The model omits consensus and several fields/features, uses a single manager for all asset operations, and separates `pay` and `close` although concrete Algorand can combine them. It abstracts TEAL to side-effect-free authorization expressions, so bytecode-level behavior and stateful applications are not covered. These assumptions limit direct soundness claims about deployed programs.

## technique: compositional script semantics and authorization

what it is and when to use it

Define a small expression language for stateless scripts and a strict evaluator (which may fail, written ⊥) parameterized by witness arguments, an atomic transaction group, and the current transaction index. Use it to reason about authorization independently of bytecode encoding.

how to apply it

1. Express constants, arithmetic and Boolean operators, transaction-field/index operators, arguments, hashes, and signature verification in the syntax of Figure 2. (Section 2.5, p. 8)
2. Define evaluation recursively; “All operators in Fig. 3 are strict: they fail if the evaluation of any operand fails,” `tx(n).f` reads the selected group transaction, and `versig` checks a signature over the script and argument. (Sections 2.5 and Figure 3, pp. 8–9)
3. Determine the authorizer from the transaction type: the sender for close, pay, gen, optin; the asset manager for burn, rvk, frz, unfrz (Section 2.6, p. 9), and also delegate (Appendix A, p. 22).
4. Accept a multisignature witness when enough listed users signed the transaction, or accept a script witness when evaluation returns true. Require every transaction in an atomic group to have an authorizing witness. (Section 2.6, p. 9)
5. Model user interaction as broadcasting witness strings, advancing rounds, and executing an authorized atomic group. (Section 2.6, p. 9)

The formal authorization condition is concrete: “if auth(T.i, fasst ) = (A, n), then |set(W) ∩ sig set (A) (T, i)| ≥ n”. For a script authorizer e, the condition is that e evaluates to true under W, T and i. (Section 2.6, p. 9)

Verus form (Inference)

Implement the evaluator as a pure `spec fn` returning an option-like result, with recursive `requires` for valid indices and lemmas for strict failure propagation. Represent authorization as predicates over immutable transaction-group sequences and witness sets; prove `ensures` that accepted groups satisfy each transaction’s authorizer. Cryptographic primitives remain trusted specifications unless linked to a verified implementation.

what evidence shows it works

Theorem 3(3) proves that different witnesses cannot change the resulting state: they only determine whether the transition occurs. The paper says, “witnesses only determine whether a state transition happens or not, but they do not affect the new state.” (Section 2.7, p. 10) This supports deterministic replay after authorization.

where it fails or what it assumes

The evaluator abstracts TEAL and assumes cryptographic security. The paper notes “the sequence of witnesses W is not unique”, and the model does not prove cryptographic algorithms. Any Verus implementation must separately specify or verify hashing and signature behavior.

## technique: contract-pattern proofs under an attacker scheduler

what it is and when to use it

Specify contracts as scripts plus user strategies, then prove liveness/safety properties for all runs generated by a bounded-delay adversary. Use this for timeout, escrow, lottery, periodic-payment, and multi-party authorization designs.

how to apply it

1. Declare PPTIME user strategies that choose enabled labels from finite run history and retain private state; define an adversarial scheduler that selects among proposed labels. (Section 3.1, p. 11)
2. State cryptographic and non-Zeno assumptions, and bound adversarial delay by δAdv; the paper simplifies examples to δAdv = 0. (Section 3.1, p. 11)
3. Write the contract predicate over transaction fields, witnesses, hashes, signatures, and validity windows. (Section 3.2, pp. 12–15)
4. Define transaction sets that represent successful payouts and give each honest party a strategy with explicit waiting, reveal, timeout, and extraction steps. (Section 3.2, pp. 12–14)
5. Prove a theorem over every conformant run, allowing other users and the adversary to collude where the theorem permits it (Theorem 4 remarks that b and Adv “can use any strategy (and possibly collude)”). (Section 3.2, pp. 12–14; proofs in Appendix D, pp. 27–30)

For an HTLC, the script lets the depositor close with a preimage whose hash matches `ha`, or lets the beneficiary close after `rmax`. The paper’s exact contract is, “HTLC (a, b, ha ) , tx.type = close and tx.asst = Algo and (tx.rcv = a and H(arg(0)) = ha ) or (tx.rcv = b and tx.fv ≥ rmax )”. (Section 3.2, p. 13) Theorem 5 proves that an honest revealer gets the funds and, if the secret is absent by the deadline, an honest beneficiary gets them.

Finite-state contracts use one script/account per state; transitions close the current account into the next state. Loops require a signed next-state argument (tx.rcv = arg(0), signed by all users in A) because contract accounts are referenced by script hashes and no script can depend on its own hash. The paper also sketches a quine-based alternative. (Section 3.2, p. 15 and footnote 17)

Verus form (Inference)

Encode each contract predicate as a `spec fn` over a transaction and witness. Encode strategy assumptions as preconditions on a trace and prove payout postconditions by induction over a trace model. Time-window arithmetic and uniqueness can be lemmas. Verus can establish functional safety of the predicate and state machine; cryptographic unforgeability, probabilistic “overwhelming probability,” and scheduler fairness remain assumptions unless modeled externally.

what evidence shows it works

The paper states explicit theorems for Oracle (Theorem 4), HTLC (Theorem 5), the two-player lottery (Theorem 6), and the mutual HTLC (Theorem 7, Appendix B.1, p. 23). For the lottery, Theorem 6 guarantees an honest player a transaction transferring at least 2 Algo to her (her collateral) and says the probability that she receives at least 1 Algo is ≥ 1/2 up to a negligible quantity (Section 3.2, p. 14). The Theorem 6 proof is a brief argument that leans on the Bitcoin lottery proof in refs [11, 12] (Appendix D, p. 30), and Theorem 7 is proved only as “analogous” to Theorem 5. No experimental sample count is given for these theorem results.

where it fails or what it assumes

Results depend on honest strategies, cryptographic assumptions, deadlines, and the adversary-delay model. The δAdv = 0 simplification excludes scheduling delays from the displayed proofs; the authors say extensions are possible but more verbose. The finite-state pattern cannot directly encode circular script references.

## technique: model-to-TEAL compilation and validation

what it is and when to use it

Compile declarative scripts and abstract transactions to concrete TEAL/Algorand encodings so that designs can be tested and deployed. Use this as a refinement boundary, while checking every opcode and transaction-field encoding.

how to apply it

1. Map arithmetic and cryptographic operators to corresponding TEAL opcodes; compile Boolean operators with short-circuit `bnz` and negation with `!`. (Section 4, p. 16)
2. Map group operators (`txid`, `txlen`, `txpos`, `arg`) to `gtxn`, `global GroupSize`, `txn GroupIndex`, and `arg` opcodes. (Section 4, p. 16)
3. Compile fv, lv, lx directly to `gtxn n FirstValid/LastValid/Lease`; for other fields generate TEAL that decodes the concrete transaction fields into the scratch space, as in Table 2. (Section 4, p. 16; Table 2, Appendix C, pp. 25–26)
4. Translate abstract transactions to concrete Algorand transactions using Table 2; for example, a model `close` becomes a `pay` with `amt` 0 and a `close` field (Algo) or an `axfer` with `aamt` 0 and `aclose` (other assets). (Section 4, Figure 4, p. 16)
5. Exercise examples and user contracts through the `secteal` prototype, which compiles expressions into executable bytecode. (Section 4, p. 16)

The paper reports, “The core of the tool is a compiler that translates smart contracts written as expressions, based on the script language (§2.5), into executable TEAL bytecode.” (Section 4, p. 16)

Verus form (Inference)

Treat compilation as a pure function with a semantic-preservation lemma: evaluating the source expression equals evaluating the generated TEAL under the supported opcode subset. Verus can verify the compiler’s structural recursion and encoding invariants, but TEAL’s VM and cryptographic opcodes must be modeled or trusted. A verified Rust implementation should keep unsupported opcodes rejected by a precondition rather than silently compiling them.

what evidence shows it works

The paper provides the `secteal` web prototype and examples but gives no benchmark denominator, test count, or measured compiler coverage. The authors call it “a first building block toward a comprehensive IDE” (Section 4, p. 17). The compilation is described as a sketch (“We first sketch how to compile our scripts into TEAL”, Section 4, p. 16) and no compiler-correctness proof is given. The separate platform-coherence experiments are only cited (ref. [6], github.com/blockchain-unica/asc1-experiments) and not described in the paper text.

where it fails or what it assumes

The paper says the script language “substantially covers TEAL opcodes with LogicSigVersion=1, but for a few exceptions, e.g. bitwise operations, different hash functions, jumps”, and application call transactions are outside its scope (Section 5, p. 17). Some operators used in Table 2, such as ConfigAsset, require LogicSigVer ≥ 2 (Appendix C, p. 25). Inference: the model-to-bytecode gap remains a risk unless independently verified, and later Algorand changes could invalidate the field mappings.

## what is proved, measured, and trusted

Proved: transition-level no-double-spending, value preservation, determinism, and contract theorems under stated strategies. Specified: account/transaction semantics, script evaluation, authorization, attacker scheduling, and design patterns. Measured: the abstract says “We perform experiments to validate the coherence of our formal model w.r.t. the actual implementation” and the Introduction cites them as ref. [6], but the paper text reports no denominator or numerical experiment table; `secteal` examples are provided. Trusted: cryptographic assumptions, the scheduler model, the abstract-to-concrete TEAL mapping, and omitted Algorand features.

Inference: for VeruLaw, the paper’s biggest threat is semantic mismatch between verified Rust contracts and deployed transaction/VM behavior. Its useful reuse is the separation of state-transition invariants, pure authorization predicates, strategy-level liveness assumptions, and compilation correctness. Existing work already covers this stateless-ASC1 modeling and archetypal contract reasoning; VL should not repeat it without adding verified implementation links, stronger automation, or stateful application coverage.

## techniques for the catalog

- labelled blockchain transition model: encode account, transaction, lease, freeze, round, and atomic-group transitions as inference rules and prove invariants
- pure script and witness semantics: evaluate transaction-group expressions and define multisignature/script authorization predicates
- attacker-strategy contract proofs: prove timeout, escrow, lottery, and finite-state payout properties over adversarially scheduled runs
- declarative-to-TEAL compilation sketch: compile supported expression constructs to opcodes and decode transaction fields into scratch space (no correctness proof in the paper)
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "To ensure that any user in A can trigger a state transition (by firing the corresponding transaction), their signatures must be exchanged before the contract starts."): read the whole paper text (main text, Appendices A-D, Fig. 5) and checked every quotation, theorem description, section/page reference, technique step and the HTLC script against it; changed the link to the arXiv page (arXiv:2009.12140 appears in the paper text, the earlier DOI is not in the paper text), the rule-per-transaction claim (Fig. 5 has several pay and close rules), the "total evaluator" claim (evaluation can fail with ⊥), the Table 2 and secteal page references (Table 2 is in Appendix C, pp. 25-26; the "first building block" sentence is on p. 17), the description of Theorem 6 and 7 proofs, the compilation claims (the paper only sketches it, no correctness proof) and the experiment claim (cited as ref. [6], not described); marked own conclusions "Inference:"; did not check the external repository, the secteal site, the Verus-form suggestions (own inference), or reference details.
