# Automated Invariant Generation for Solidity Smart Contracts
(authored by agents unless marked 🧑)
Tag: `liu2024automated`, [paper](https://arxiv.org/abs/2401.00650)

## purpose and result
The paper presents INVCON+, which combines mined execution traces with static verification. Its abstract states: “INVCON+ extends the existing invariant detector, InvCon, to automatically produce verified contract invariants based on both dynamic inference and static verification.” (abstract, p. 1) The target is Solidity contracts whose specifications are incomplete. The evaluation uses 361 ERC20 and 10 ERC721 real-world contracts, plus vulnerable ERC20 benchmarks (abstract, p. 1).

## technique 1: typed invariant specification language

what it is
The language represents contract-level invariants and function pre/postconditions. It supports `Requires`, `Ensures`, and `ContractInv`, and expressions for primitive values, `old(v)`, lengths, mapping sums, members, indexed items, and binary operators. The grammar printed in Figure 2 includes “Statement ::= Requires p | Ensures p | ContractInv p” and “e ∈ Expr ::= const | v | old(v) | len(v) | SumMap(v) | e.x | e[x] | e ▷◁ e” (Figure 2, p. 3). A contract invariant means `{I} f {I}` for every public function (Definition II.3, p. 3).

when to use it
Inference: use this language when a specification must express state before and after a function, or aggregate a mapping. The paper's example is `SumMap(balances) = totalSupply`, which captures conservation of token balances (p. 3).

how to do it
1. List contract state and input variables, and assign each candidate to a supported type (Section III, p. 3).
2. Instantiate primitive templates such as equalities, inequalities, and arithmetic relations over variables with compatible domains (Section IV-A, p. 4).
3. Express preconditions with `Requires`, postconditions with `Ensures`, and state-wide facts with `ContractInv` (Figure 2, p. 3).
4. Use `old` for entry-state values and `SumMap` for a mapping aggregate (Section III, p. 3).

Verus form
Inference: write executable Rust fields and a `spec fn` for an abstract predicate, then attach `requires` and `ensures` to a `fn` or `proof fn`; use `old(...)` in an `ensures` clause for entry-state values. Inference: a Solidity mapping aggregate becomes a Verus quantified or sequence/set specification whose relation to the concrete map is proved by lemmas. The paper's `Requires` and `Ensures` names are specification-language syntax, not Verus keywords.

evidence and limits
The language omits event emission: “Some specifications documented in external sources were omitted, e.g., ‘Emitting a Transfer event’ for the transfer function, because the particular language features are not supported by our specification language.” (Section VI-A, p. 8). Inference: template coverage limits what behavior the approach can describe.

## technique 2: dynamic traces plus Houdini-style primitive verification

what it is
Algorithm 1 first mines candidates from historical transactions, then verifies them statically. Dynamic detection returns `C_likely`, which holds over all observed traces, and `C_partial`, which holds only on a subset (Section IV-A, pp. 4–5). In the evaluation, each valid primitive invariant must have support from at least three historical transactions (Section V-C, p. 7).

how to do it
1. Initialize primitive candidate set `C` from invariant templates and the contract's typed variables (Algorithm 1, lines 1–3, p. 4).
2. Parse every transaction into `(δ, f(a), δ')`, recording old and new state and arguments, and add it to trace set `Δ` (Algorithm 1, lines 4–7, p. 4).
3. Run dynamic detection to produce likely and partial candidates (Algorithm 1, line 8, p. 4).
4. Pass the likely candidates to static inference and instrument the Solidity contract with them, labeling them as `ContractInv`, `Requires`, or `Ensures` (Algorithm 1, line 9, p. 4; Algorithm 2, line 1, p. 5).
5. Run modular verification. On a failed candidate, disable that candidate and repeat; on success return enabled candidates. On a failed original assertion, raise an error (Algorithm 2, lines 3–11, p. 5).

The verifier translates instrumented contracts to Boogie programs using VeriSol, then uses Boogie’s Houdini modular verifier. The authors extend the translator: “We have refined the Boogie translator in VeriSol to better accommodate contracts with inheritance and polymorphism features.” (Section V-D, p. 7). The resulting set is a maximal subset whose conjunction is inductive for contracts without failed assertions (Section IV-B, p. 5).

Verus form
Inference: replay the same candidate-then-check loop by generating `requires`/`ensures` clauses and checking a Verus `fn`; remove a candidate when verification fails, preserving the remaining source code. Inference: use `proof fn` lemmas to establish inductiveness and proof assertions for local obligations. These Verus adaptations are proposals, not implementations or results evaluated in this paper.

evidence and limits
On 361 ERC20 contracts, Table IV reports INVCON+ 46.12 generated invariants per contract, precision 1.000, adjusted ERC20 recall 0.80, and average time 250.25 seconds. The comparison uses 361 ERC20 contracts and at most 200 transactions per contract (Section VI-C, p. 8; Table IV, p. 9). Precision is `|X_proved|/|X|`; adjusted recall is `|X_proved ∩ Y| / |Y ⇂ Δ|`, where `Y ⇂ Δ` contains ground-truth invariants for functions invoked in the histories (Section VI-A, Equations 2–3 and following adjustment, p. 8). The ground truth can be incomplete (Section VI methodology, p. 8), so recall is against the authors' collected standard list, not all mathematically valid invariants.

## technique 3: implication generation, dependency pruning, and weakening

what it is
Primitive candidates alone miss conditional ERC20/721 behavior. `FIND IMPLICATIONS` forms `η ⇒ τ` from unverified likely and partial candidates, then uses Slither control/data-flow dependencies to delete irrelevant pairs (Figure 4, p. 4; Section IV-C, p. 5). `WEAKEN IMPLICATIONS` combines failed implications: `(η1 ∧ η2) ⇒ τ` and `η ⇒ (τ1 ∨ τ2)` are weaker than their respective originals (Figure 5, p. 5).

how to do it
1. Build every ordered pair of distinct predicates from the unverified likely and partially supported candidates as a possible implication (Algorithm 1, line 10; Figure 4, p. 4).
2. Compute variables in each side and delete a pair when no control- or data-flow dependency connects them (Figure 4, p. 4; Section IV-C, p. 5).
3. Verify remaining implications with the modular verifier (Algorithm 1, lines 11–13, p. 4).
4. For failed implications, conjoin premises or disjoin consequences, rejecting tautologies (`η1 ∧ η2` false or `τ1 ∨ τ2` true), then verify the weaker candidates (Figure 5, p. 5).
5. Repeat until no implication candidates remain. The paper argues termination in at most `2 × n` iterations for `n` primitive predicates (Section IV-D, p. 5).

The running example illustrates the sequence. For `transferFrom`, the raw candidate `to ≠ 0 ⇒ balances[from] = old(...) − tokens` fails, while the weakened `to ≠ 0 ∧ from ≠ to ⇒ ...` verifies (Table I, p. 7).

Verus form
Inference: represent a conditional postcondition as `ensures η ==> τ`, explicitly choosing entry-state or exit-state values for each variable. Prove it for all executions allowed by the function’s existing preconditions. Inference: a Rust control/data-flow analysis could prune candidates before Verus checks them. The paper evaluates neither this adaptation nor Verus support for such an analysis.

evidence and limits
The implication loop is computationally expensive: static inference consumes nearly 53% of total time (Section VI-C, p. 9). The history-length experiment on the ten ERC20 contracts with at least 10,000 transactions finds recall improves with longer histories and recommends around 2,000 transactions (Section VI-D, pp. 11–12). Inference: this recommendation need not generalize to other contracts.

## technique 4: suppress redundant verified invariants

The suppressor runs after verification. “An invariant is deemed redundant if it can be derived from another invariant.” (Section V-E, p. 7). Only verified predicates are reduced; keeping dynamic candidates gives the implication learner more choices (Section V-E, p. 7).

1. Collect successfully verified predicates (Section V-E, p. 7).
2. Use Z3 to determine whether one predicate follows from another (Section V-E, p. 7).
3. Retain the strongest predicates in the final results (Section V-E, p. 7).

Inference: a Verus candidate generator could apply the same reduction after proving candidates, while keeping the unreduced candidate pool for implication construction.

## technique 5: invariant enforcement against vulnerabilities

The authors describe a benchmark of 25 vulnerability types and say they focus on 18 within specification scope (Section VI-E, p. 12). Their selection rule is: “We selected the top three contracts with the highest occurrence of each vulnerability type and assessed whether the invariants detected by INVCON+ could prevent the corresponding attacks on these contracts.” (Section VI-E, p. 12). Table VII actually lists 24 types, including six marked N/A, one marked No, and 17 marked Yes (p. 13); the paper does not resolve this discrepancy. All nine overflow vulnerability types listed in that table are marked detected. The BEC `batchTransfer` overflow is the example in Figure 12 (p. 12). The paper explains: “Thus, such an attack can be effectively prevented, if the generated invariants are enforced for each function execution.” (Section VI-E, p. 12). It also records a failure: vulnerability v11 (`pauseTransfer-anyone`) is not detected because the permission function is outside ERC20 templates and the histories contain irregular behavior (Section VI-E, pp. 12–13).

## techniques for the catalog
- typed invariant language: express preconditions, postconditions, contract invariants, old values, and mapping sums in a restricted grammar
- trace mining with Houdini elimination: infer candidates from transaction states, instrument code, disable failed candidates, and keep the verified subset
- implication learning: form condition/consequence pairs, prune by data/control dependence, and iteratively weaken failed implications
- redundancy suppression: use Z3 implication checks after verification and retain the strongest predicates
- history-backed security checking: enforce verified invariants during executions and report which benchmark vulnerabilities they prevent or miss
