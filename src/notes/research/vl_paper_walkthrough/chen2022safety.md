# Safety Verification of Declarative Smart Contracts
(authored by agents unless marked 🧑)
Tag: `chen2022safety`, [paper](http://arxiv.org/abs/2211.14585v3)

## scope and result

Chen, Lu, Massey, Wang, and Loo present DCV, an automated verifier for DeCon, a declarative smart-contract language whose relational rules are executable and compilable to Solidity. The verification target is a contract-level safety property over an unbounded transaction sequence. The paper's abstract states that DCV “proves safety properties by mathematical induction and can automatically infer inductive invariants using heuristic patterns, without annotations from the developer.” The conclusion says DCV “performs sound verification via mathematical induction” on DeCon contracts. It does not verify the DeCon-to-Solidity compiler; the conclusion lists verifying “translation correctness for the DeCon-to-Solidity compiler, to ensure the end-to-end soundness of DCV’s verification results” as future work. The prototype is written in Scala and uses Z3 (Section VI, p. 8).

The evaluation has 20 contracts: 12 from open libraries/examples and 8 popular ERC20 contracts (Section VI, pp. 8–9). DCV verifies 19 of 20 in at most two seconds and the auction in 58 seconds (Table II reports 1 or 2 seconds for each of the 19). Runs use a 2.4GHz core (single-threaded), 4GB memory, and a one-hour budget. The authors modified the benchmarks to suit all tools: the delegate-vote function of the voting contract was dropped because it uses recursion, inline assembly was replaced by Solidity code, and minor syntax changes were made. Inference: the numbers therefore measure these prepared benchmarks, not arbitrary deployed Solidity.

## technique: make the contract a relational executable specification

Use this when state is naturally a set of tables and transactions insert, update, or aggregate rows. DeCon has relation declarations, annotations (`init`, `violation`, `public`), and Datalog-like rules. A body is true when there is a valuation making every relational literal true; the head tuple is then inserted. In the voting example, a vote rule checks that there is no winner, the sender is an eligible voter, and that voter has not voted.

Steps from Sections II–III (pp. 2–5; Listing 1 and the declaration, rule and violation-query syntax):
1. declare each table's columns and primary-key columns
2. mark singleton tables with `*`, transaction relations with a `recv` prefix, and constructor-initialized tables with `init`
3. express state updates as `head :- body` rules
4. express aggregates (`count`, `sum`, `min`, `max`) in a rule body
5. declare a relation as `violation` and define the bad state as rows in that relation

Verus form (Inference): represent tables with owned maps or sets and write a `spec fn` for each transition. Use a state-machine proof to relate executable transaction methods to the abstract map update. A DeCon rule can become a `requires` condition plus an `ensures` update; relation joins become map lookup predicates. This is a modeling translation, not a claim of the paper or that Verus executes Datalog.

The paper's stated benefit is one high-level artifact for both implementation and property specification, with Solidity generated from it. The stated limitation is language scope: “DCV can only apply to smart contracts written in DeCon” (Section VII, p. 10). The conclusion adds that contract inheritance, interaction between contracts, and functions outside relational logic need non-trivial extensions.

## technique: translate rules to a transition system

DCV encodes a contract as `⟨S, I, E, Tr⟩`: the state space of all table valuations, the initial states, the transaction types, and a transition relation (Section IV-A, p. 5). `tr` is a disjunction, over transaction rules, of `EncodeRule(r, R, Γ, r.trigger) ∧ e = r.TxName` (Equation 3, Section IV-B, p. 5). Section II-C (p. 3) says: “The state space comprises all possible valuations of the relational tables, and each successful transaction triggers an atomic state transition step (the transaction atomicity is guaranteed by the underlying Ethereum blockchain).”

Steps (Algorithm 1, `EncodeRule(r, R, Γ, τ)`, p. 5; Γ maps each relation to a state variable, τ is the inserted or deleted literal that triggers r, initially the `recv_` literal):
1. encode r's body as a Boolean formula with `EncodeRuleBody` (Section IV-C, inference rules in Figure 6)
2. collect the encodings of the directly dependent rules, each called recursively with its own trigger (insertion, or deletion when a primary-key row is overwritten)
3. get the state variable `H` and next-state variable `H'` of the head relation
4. build the update constraint `H' = GetUpdate(H, r, τ)`: insertion for aggregate rules or insertion triggers, deletion for a join rule with a deletion trigger
5. true branch: body, update, and all dependent-rule encodings
6. false branch: not body, and `H' = H`
7. return the exclusive-or of the true and false branches

Section IV-D (p. 7) then encodes each violation query rule with the reserved trigger `check()`, which fires after every transaction, and takes `Prop ≜ ¬(∃x ∈ X. ϕ(s, x))`.

Verus form (Inference): use a Verus state-machine specification with a state struct, an initial predicate, and transition operations. Each operation gets `requires` for its trigger and `ensures` for the next-state relation. Atomicity must be supplied by the chosen Rust concurrency model; it does not arise from a Verus function automatically.

Assumptions (Section IV-C, pp. 6–7): “DCV assumes that on every new incoming transaction request, there is at most one new tuple derived by each rule, and that there is no recursion in the rules.” This keeps the transition constraint linear in the number of rules and “is true for all of the ten benchmark contracts in our evaluation” (the paper evaluates 20; the count is as printed). Max and min aggregates are encoded only for insertions, on the assumption that they apply to append-only transaction relations. Multi-contract interactions are allowed only without mutual recursion, because that would break transaction atomicity; DCV also assumes message delivery and handling always succeed.

## technique: prove safety by base and induction cases

A violation query is negated to obtain `Prop ≜ ¬(∃x. ϕ(s,x))`, meaning the bad relation is empty. DCV proves `Prop` over an infinite transaction sequence by induction (Section V-A, p. 7, Equation 4; Section II-D, p. 4 gives the intuition). The base obligation is `init(s) ⟹ inv(s) ∧ prop(s)` for all states `s`. The induction obligation is `inv(s) ∧ prop(s) ∧ tr(s, e, s′) ⟹ inv(s′) ∧ prop(s′)` for all `s, s′, e`. For the voting contract the paper says the property of Equation 1 “cannot be proved inductively on its own” and augments it with “∀u ∈ Proposal . wins[u] =⇒ hasWinner”, which “asserts that if any proposal u ∈ Proposal is marked as the winner, the predicate hasWinner must also be true.”

Steps:
1. encode the violation query and negate it to get `prop`
2. find an auxiliary `inv(s)` so that `inv ∧ prop` is inductive (Algorithm 2, below)
3. check the base obligation for all initial states
4. check the induction obligation for every transaction type and next state, with Z3
5. on success return the inductive invariant as the proof; on failure DCV returns “unknown”, meaning the contract may not satisfy the property (Section II, p. 2)

Verus form (Inference): put the safety predicate in a state-machine invariant and prove it in the initialization and transition proof arms. Use `assert` and `lemma` proof functions for the auxiliary relation. Do not treat a runtime function as a proof function.

## technique: extract predicates from transaction rules

The key automation insight is that DeCon rules already expose the predicates needed for useful invariants. Algorithm 3 (Section V-B, p. 8) turns each literal in the body of each transaction rule into a predicate set `P0`, then adds conjunctions `p ∧ q` where `q` is a predicate of the same rule sharing at least one variable with `p`. The paper says predicates containing constants, such as `hasWinner == true`, “convey the matching of a column to a certain concrete value”, whereas predicates with only free variables lack enough information on their own. The authors explain, “The insight of DCV is that, rules in DeCon contracts provide a concise and high-quality source of logical predicates for constructing inductive invariants.”

Steps:
1. for each transaction rule `r`, with trigger `τ = r.trigger`, encode each body literal `l` into a predicate `p` (`Γ, τ ⊢ l ⇝ p`) and collect them in `P0`
2. for each `p ∈ P0`, find `MatchingPredicates(p, r)`, the predicates of `r` sharing at least one variable with `p`
3. add each `p ∧ q` to form `P1`
4. return `P0 ∪ P1`; the union over all transaction rules is `P`

Verus form (Inference): expose state predicates as pure `spec fn`s and write lemmas that derive the candidate facts from each transition's preconditions. Rust types can supply some facts, but relational joins and aggregate constraints still require explicit ghost state or lemmas.

## technique: domain-specific Houdini candidate generation

DCV instantiates two templates, `∀x ∈ X. ¬init(s) ⟹ ¬p(s,x)` for `p ∈ P` and `∀x ∈ X. ¬init(s) ∧ q(s,x) ⟹ ¬p(s,x)` for `p, q ∈ P` (Section V-C, p. 8). The paper's reason for the conclusion `¬p` is that “predicate p is one of the transaction conditions, thus having ¬p in the invariant can prevent relevant transactions from committing”; `¬init(s)` as premise makes the formula trivially true in initial states. DCV then runs a Houdini-style loop (Algorithm 2, adopted from [26], Lahiri and Qadeer). `refuteInv` (Equation 5) refutes a candidate if it is not implied by the initial constraints, or if the conjunction of all candidates and `ts.tr` does not imply it in the next state. When no candidate can be refuted, the conjunction of survivors is returned. The paper states that the algorithm “always returns the strongest inductive invariant that can be constructed in the form of conjunction of the candidates in C.”

Steps:
1. instantiate both templates with every `p ∈ P` and every pair `p, q ∈ P` to form the candidate set `C`
2. for each candidate, test `refuteInv` against initialization and the transition relation
3. if a candidate is refuted, drop it and recurse on the remaining set
4. when no candidate is refuted, return the conjunction of the survivors as the inductive invariant
5. use it with the target property in the induction check above

Verus form (Inference): this is an external synthesis loop that can generate candidate `assert`/lemma obligations before invoking Verus. Verus itself can check the resulting invariant, but this paper's candidate enumeration and deletion algorithm would need a separate tool around Verus. Keep quantifier domains explicit enough for the solver.

Inference: the heuristic is incomplete, since an invariant outside the two templates cannot be found; the paper does not discuss this. Section VI (p. 9) says voting and auction are the two benchmarks whose properties are not inductive and so need invariant generation, and that “Auction takes more time because it contains more rules and has a more complicated inductive invariant.” Table II lists auction with 13 rules, fewer than several faster contracts (for example ERC777 with 31), so Inference: rule count alone does not explain the 58 seconds.

## techniques for the catalog

- relational executable specifications: define contract state, updates, and properties as tables and rules
- transition-system encoding: compile rule dependencies and updates into atomic state transitions
- induction over transactions: prove initial safety and preservation for every transition
- predicate extraction: derive candidate invariant atoms and matching conjunctions from rule bodies
- Houdini elimination: generate template candidates and remove those refuted by base or induction checks
- compiler boundary accounting: separate proof of the abstract contract from trust in generated Solidity
