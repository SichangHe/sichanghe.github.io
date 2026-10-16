# Safety Verification of Declarative Smart Contracts
(authored by agents unless marked 🧑)
Tag: `chen2022safety`, [paper](http://arxiv.org/abs/2211.14585v3)

## scope and result

Chen, Lu, Massey, Wang, and Loo present DCV, an automated verifier for DeCon, a declarative smart-contract language whose relational rules are executable and compilable to Solidity. The verification target is a contract-level safety property over an unbounded transaction sequence. The paper's abstract states that DCV “proves safety properties by mathematical induction and can automatically infer inductive invariants using heuristic patterns, without annotations from the developer.” The approach is sound for the modeled DeCon transition system, but it does not establish the correctness of the DeCon-to-Solidity compiler; the conclusion names compiler correctness as future work.

The evaluation has 20 contracts: 12 from open libraries/examples and 8 popular ERC20 contracts (Section VI, pp. 8–9). DCV verifies 19 of 20 in at most two seconds and the auction in 58 seconds; the table reports 2 seconds for most DCV cases and 58 for auction. These are one-core, 4 GB-memory runs with a one-hour budget. The comparison changes source syntax and drops unsupported features, so the numbers measure the prepared benchmark, not arbitrary deployed Solidity.

## technique: make the contract a relational executable specification

Use this when state is naturally a set of tables and transactions insert, update, or aggregate rows. DeCon has relation declarations, annotations (`init`, `violation`, `public`), and Datalog-like rules. A body is true when there is a valuation making every relational literal true; the head tuple is then inserted. In the voting example, a vote rule checks that there is no winner, the sender is an eligible voter, and that voter has not voted.

Steps from Sections II–III (pp. 2–5):
1. declare each table's columns and primary-key columns
2. mark singleton tables with `*`, transaction relations with a `recv` prefix, and constructor-initialized tables with `init`
3. express state updates as `head :- body` rules
4. express aggregates (`count`, `sum`, `min`, `max`) in a rule body
5. declare a relation as `violation` and define the bad state as rows in that relation

Verus form (Inference): represent tables with owned maps or sets and write a `spec fn` for each transition. Use a state-machine proof to relate executable transaction methods to the abstract map update. A DeCon rule can become a `requires` condition plus an `ensures` update; relation joins become map lookup predicates. This is a modeling translation, not a claim that Verus executes Datalog.

The benefit is one high-level artifact for execution and proof. The limitation is language scope: DCV only handles contracts expressible in DeCon's relational logic.

## technique: translate rules to a transition system

DCV encodes a contract as `⟨S, I, E, Tr⟩`: all table valuations, initial states, transaction types, and a transition relation (Section IV-A, p. 5). Algorithm 1 recursively encodes a rule's body, dependent rules, head state variables, and either a true branch that updates the head or a false branch that leaves it unchanged. The paper says, “The state space comprises all possible valuations of the relational tables, and each successful transaction triggers an atomic state transition step.”

Steps:
1. map each relation to a state variable
2. identify the transaction trigger (`recv_*`)
3. encode the rule body as a Boolean constraint
4. recursively encode directly dependent rules and their insertion/deletion triggers
5. generate next-state updates for join and aggregate rules
6. combine the true-update and false-no-update branches with exclusive-or
7. encode each violation query as a formula over the post-transaction state

Verus form (Inference): use a Verus state-machine specification with a state struct, an initial predicate, and transition operations. Each operation gets `requires` for its trigger and `ensures` for the next-state relation. Atomicity must be supplied by the chosen Rust concurrency model; it does not arise from a Verus function automatically.

DCV assumes at most one new tuple per rule per incoming transaction and no recursive rule dependencies. It also assumes multi-contract calls do not mutually recurse, preserving transaction atomicity (Section IV-C, pp. 6–7).

## technique: prove safety by base and induction cases

A violation query is negated to obtain `Prop ≜ ¬(∃x. ϕ(s,x))`, meaning the bad relation is empty. DCV proves `Prop` over an infinite transaction sequence with two obligations: every initial state satisfies it, and every transition from a state satisfying it reaches another state satisfying it (Section IV-D, p. 7). The paper gives the concrete voting invariant “∀u ∈ Proposal . wins[u] =⇒ hasWinner,” because the direct property “at most one winning proposal” is true but not inductive on its own.

Steps:
1. encode the violation query and negate it
2. state the base obligation for all initial states
3. find an auxiliary `inv(s)` so `inv ∧ prop` is inductive
4. prove preservation for every transaction type and next state
5. return the conjunction as the proof certificate

Verus form (Inference): put the safety predicate in a state-machine invariant and prove it in the initialization and transition proof arms. Use `assert` and `lemma` proof functions for the auxiliary relation. Do not treat a runtime function as a proof function.

## technique: extract predicates from transaction rules

The key automation insight is that DeCon rules already expose the predicates needed for useful invariants. Algorithm 3 turns each rule literal into a predicate set `P0`, then adds pairwise conjunctions `p ∧ q` for predicates sharing a variable. Constants such as `hasWinner == true` carry more information than predicates with only free variables. The authors explain, “The insight of DCV is that, rules in DeCon contracts provide a concise and high-quality source of logical predicates for constructing inductive invariants.”

Steps:
1. encode each rule literal under the current relation map and trigger
2. collect the resulting predicates in `P0`
3. identify predicates sharing variables
4. add each matching conjunction to form `P1`
5. use `P0 ∪ P1` as the candidate source

Verus form (Inference): expose state predicates as pure `spec fn`s and write lemmas that derive the candidate facts from each transition's preconditions. Rust types can supply some facts, but relational joins and aggregate constraints still require explicit ghost state or lemmas.

## technique: domain-specific Houdini candidate generation

DCV instantiates two templates from the extracted predicates: `∀x. ¬init(s) ⇒ ¬p(s,x)` and `∀x. ¬init(s) ∧ q(s,x) ⇒ ¬p(s,x)` (Section V-C, p. 8). It then applies a Houdini-style elimination loop. `refuteInv` removes a candidate if it fails the base condition or fails induction under the conjunction of candidates. When no candidate can be refuted, the conjunction of survivors is returned. Given its candidate set, the paper states that Houdini returns “the strongest inductive invariant that can be constructed in the form of conjunction of the candidates in C.”

Steps:
1. instantiate both templates with every predicate or matching predicate pair
2. test each candidate against initialization and the transition relation
3. recursively remove a refuted candidate
4. repeat until no candidate is refuted
5. conjoin the survivors with the target property

Verus form (Inference): this is an external synthesis loop that can generate candidate `assert`/lemma obligations before invoking Verus. Verus itself can check the resulting invariant, but this paper's candidate enumeration and deletion algorithm would need a separate tool around Verus. Keep quantifier domains explicit enough for the solver.

The heuristic is incomplete: an invariant outside the two templates is missed. Auction takes 58 seconds because it has more rules and a more complicated invariant (Section VI, p. 9).

## evidence, trust, and product threat

DCV's evidence is 20 prepared contracts, not all Solidity. Table II reports DCV success on 19/20 within two seconds and auction in 58 seconds; baselines verify 12 reference contracts with solc and 10 with solc-verify, with timeouts and errors. The paper also reports that generated Solidity versions let solc verify 6 and solc-verify 15, showing that the high-level model's speed does not transfer automatically to compiled code.

Trusted components include the DeCon semantics, the state-transition encoder, Z3, and the compiler from DeCon to Solidity. The paper explicitly leaves translation correctness for future work. Assumptions exclude recursive rule dependencies, some cryptographic or unsupported features, and mutual recursive contract calls. The proof covers safety invariants over the abstract state; it does not prove liveness, compiler preservation, or blockchain implementation behavior.

Inference: the threat to VL is moderate for agent-written verified Rust that has a clean abstract state machine, but high when generated code depends on a translation layer, external libraries, or unmodeled inter-contract behavior. The useful idea to reuse is predicate-guided candidate generation around Verus state-machine invariants. VL should not redo this paper's DeCon benchmark; it should test whether extracted Rust transition predicates produce stable Verus invariants and whether the generated Rust preserves the verified abstract state.

## techniques for the catalog

- relational executable specifications: define contract state, updates, and properties as tables and rules
- transition-system encoding: compile rule dependencies and updates into atomic state transitions
- induction over transactions: prove initial safety and preservation for every transition
- predicate extraction: derive candidate invariant atoms and matching conjunctions from rule bodies
- Houdini elimination: generate template candidates and remove those refuted by base or induction checks
- compiler boundary accounting: separate proof of the abstract contract from trust in generated Solidity
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
