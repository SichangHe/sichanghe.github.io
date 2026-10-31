# SolType: refinement types for arithmetic overflow in Solidity
(authored by agents unless marked 🧑)
Tag: `tan2022soltype`, [paper](https://doi.org/10.1145/3498665)

## purpose and result

SolType is a refinement type system for proving arithmetic safety in Solidity. Solid, its implementation, translates Solidity into MiniSol, checks refinement types, and infers annotations using constrained Horn clauses (CHCs). The paper states: “Arithmetic operations that are proven type-safe by SolType are guaranteed to not overflow; thus, SolType can be used to eliminate unnecessary runtime checks.” (Section 1, PDF p. 2).

Its distinguishing feature is relating integers to sums over complex data structures. In the running ERC20 example, the sum of balances is at most the total supply: Sum(bals) ≤ tot. The authors write: “This invariant, together with the require clauses in mint and transfer, ensures that there are no overflows.” (Section 2.1, PDF p. 3).

## technique 1: lower Solidity to MiniSol

When to use it: before refinement checking imperative code with mutable storage and data structures.

Steps from Section 2.2 (PDF pp. 3–4) and Section 6 (PDF p. 20):

1. Translate to SSA form, assigning each variable exactly once.
2. Represent arithmetic with unbounded mathematical integers. Use MaxInt = 2^256 − 1 as the maximum representable uint value when checking bounds (Section 2.3).
3. Convert mappings, structs, and arrays to immutable data structures.
4. Insert fetch and commit statements to load and store state variables simultaneously. Fetch introduces fresh local variables; commit checks the state-variable refinements on the values being stored.
5. Allow temporary invariant violations between fetch and commit. Require the invariant at call boundaries and function exits. The implementation inserts these statements around calls, including external calls and monetary transfers; pure calls do not require the unlocked state.
6. Partially evaluate constant arithmetic expressions and inline internal function calls.

The paper’s MiniSol example fetches owner1, bals1, and tot1, computes new immutable values, then commits owner1, bals2, and tot2 (Figure 2, PDF p. 4). The type system tracks whether state is locked between fetch and commit; function calls require an unlocked state in the main typing rule (Section 4.2.2, PDF pp. 13–14).

Inference: a possible Verus adaptation would model storage with ghost values, express boundary invariants in requires/ensures, and prove lemmas about state updates. The paper does not evaluate this adaptation.

## technique 2: prove arithmetic bounds using refinements and guards

When to use it: to establish safety of individual arithmetic operations from path conditions and state invariants.

Steps from Section 2.3 (PDF p. 5) and Figure 8 (PDF p. 12):

1. Heuristically rewrite common machine-integer overflow checks into mathematical bounds. For example, tot1 + amt >= tot1 becomes tot1 + amt ≤ MaxInt.
2. Retain that bound as a guard predicate. The paper explains: “Since Solid keeps track of this predicate as a guard predicate, it is able to prove the safety of the addition on line 17.” (Section 2.3).
3. Given Sum(bals1) ≤ tot1, refine the unsigned map read bals1[msg.sender] with bals1[msg.sender] ≤ Sum(bals1).
4. Use transitivity to derive bals1[msg.sender] ≤ tot1. Combine it with the guard to prove bals1[msg.sender] + amt ≤ MaxInt.
5. Check addition and multiplication results against MaxInt, subtraction results against zero, and divisors for strict positivity. TE-Div constrains the quotient by e2 × ν ≤ e1 < (ν + 1) × e2.

Subtyping reduces to logical implication checked by an SMT solver (Section 4.1, Figure 7, PDF p. 11). Logical qualifiers use the quantifier-free combined theory of rationals, arrays, and equality with uninterpreted functions. Rationals keep checking decidable in the presence of nonlinear multiplication (Section 3.2, PDF pp. 8–9).

Inference: a possible Verus adaptation would explicitly prove the target integer bounds before each executable operation and retain a checked operation when the bound cannot be proved.

## technique 3: preserve sum invariants through map updates

When to use it: when a state-variable refinement relates a map aggregate to another state variable.

Steps from Section 2.4 (PDF p. 5):

1. Start with the fetched-state invariant Sum(bals1) ≤ tot1.
2. Derive Sum(bals2) = Sum(bals1) + amt for the mint update.
3. Derive tot2 = tot1 + amt for the updated total.
4. Combine these facts to prove Sum(bals2) ≤ tot2.
5. Check the invariant when committing the new state. Do the corresponding preservation check for every function.

For a general unsigned-integer map update m[k ⊳ v], the sum equation is Sum(m[k ⊳ v]) = Sum(m) − m[k] + v (TE-MapUpd, Section 4.2.1, PDF pp. 11–12). Map reads are at most the map’s sum. These properties are generated as refinements rather than requiring the SMT solver to derive the meaning of a sum from scratch.

Inference: an adaptation to Verus could prove a single-key sum-update lemma and use it to establish the invariant over the new abstract state.

## technique 4: infer refinements while retaining checks for unproved operations

When to use it: when annotations are absent and some arithmetic operations cannot be proved safe.

Steps from Section 5 and Figure 12 (PDF pp. 18–19):

1. Assign a fresh uninterpreted predicate to every unannotated variable. Initialize each predicate’s interpretation to true.
2. Mark overflow-safety constraints as soft and the remaining typing constraints as hard.
3. Partially order soft constraints by mandatory evaluation order: c ≺ c′ when c’s expression must be evaluated before c′’s.
4. For each soft constraint c, solve (conjunction of earlier soft constraints ⇒ c) ∧ conjunction of hard constraints. Earlier overflow checks are assumptions for proving c, not additional obligations in this query.
5. Skip c if the query is unsatisfiable.
6. For a satisfiable query, conjoin the solver’s predicate assignment with the annotations already inferred.

The authors explain: “This assumption is safe since Solid inserts run-time overflow checks for any operation that cannot be statically verified.” (Section 5, PDF p. 19). The running example yields Sum(bals) ≤ tot. The procedure addresses a MaxCHC-like objective, but Section 9 calls it “efficient (but potentially suboptimal)” (PDF p. 26); it does not guarantee a maximum solution.

On Etherscan benchmarks, the reported false-positive rate is 24.7% for Solid, 48.7% without contract-invariant inference, and 69.4% when all overflow constraints are hard (Table 5, PDF p. 23; discussion, PDF p. 24).

Inference: an external synthesizer could propose invariants for validation with Verus, retaining runtime checks for unproved operations. This is a proposed workflow, not an evaluated result.

## technique 5: synthesize refinements for nested aggregates

When to use it: when a scalar is bounded by an aggregate over nested mappings or mappings containing structs.

Steps from Sections 2.6 and 4.3 (PDF pp. 6, 14–17):

1. Use Flatten to flatten nested mappings and Fld to project struct fields. Sum aggregates the resulting unsigned values.
2. Express the example invariant as Sum(Fld_bal(Flatten(usrs))) ≤ tot.
3. Synthesize paired refinement-term templates H1 for Map(T) and H2 for T. Both produce unsigned-integer terms and must follow the same sequence of struct field names. The access path records fields, not mapping keys.
4. For a read m[k], generate H2(m[k]) ≤ H1(m).
5. For an update, generate H1(m[k ⊳ v]) = H1(m) − H2(m[k]) + H2(v). Generate a conjunction covering the relevant field paths.
6. Represent Sum, Fld, and Flatten as uninterpreted functions in logical qualifiers, using the typing rules to supply the aggregate relationships.

The paper says: “A unique aspect of our type system is its ability to express more complex relationships between integer values and data structures like nested mappings over structs.” (Section 2.6, PDF p. 6). On the Etherscan subset containing complex data structures, removing the generalized rules increases the reported false-positive rate from 23.5% to 39.0% (Section 7.6, Table 6, PDF p. 24).

Inference: a Verus adaptation would need defined aggregate functions and proofs of their read/update laws over a map model with well-defined sums.

## evaluation, limitations, and proof scope

Solid uses about 3,000 lines of Haskell frontend and 4,000 backend lines, Z3/Spacer, and Slither (Section 6, PDF p. 19). The evaluation uses Z3 4.8.9 and a ten-second limit per Z3 query (Section 7, PDF p. 21).

The 120 benchmarks comprise 60 contracts from the Verismart evaluation with reported CVEs and 60 randomly sampled from Etherscan in March 2021. The authors state: “we preprocessed the benchmarks by replacing all SafeMath method calls with their equivalent unchecked operations.” (Section 7.1, PDF p. 21). Their subsequent check counts refer to arithmetic operations. Manual inspection classified 853 of 1,309 operations as redundant checks: 390 in Verismart and 463 in Etherscan. Auto-Solid proves 736 safe, or 86.3% of the redundant checks; Verismart proves 566, or 66.4%; Semi-Solid proves 768, reported as 90.0% (Table 2, PDF p. 22).

The reported false-positive rates are 20.4% for Auto-Solid, 16.0% for Semi-Solid, and 39.3% for Verismart (Table 3, PDF p. 22). Here the reported percentages divide false alarms by all reported alarms. Mean analysis times are respectively 41, 10, and 451 seconds (Table 4, PDF p. 23). Semi-Solid uses manually supplied state refinements and infers local types; the authors did not strengthen initial annotations using type-checker feedback (Sections 7 and 7.3).

Section 6 (PDF p. 20) describes difficulties with complex loop invariants and does not support break or continue inside loops. Inline assembly, external-contract state, bitwise operations, and exponentiation are unsupported and modeled with havoc expressions. Possible aliases are modeled with extra mappings. Section 8 (PDF p. 24) excludes quantified refinements and notes that CHC inference can return unknown or fail to terminate promptly.

Section 4.4 states progress and preservation propositions for MiniSol expressions and statements. The appendix supplies proofs with an explicit restriction: “For the purposes of the proofs, we consider the subset of the expression language without 1) multiplication or division; and 2) without logical operators such as ∧, ∨ (logical operators are still included as refinements terms, however).” (PDF p. 30). Appendices A–D define evaluation and typing rules, relate symbolic aggregate templates to concrete sums, and prove expression and statement progress and preservation.

Inference: these MiniSol results do not independently validate the Solidity translator or solver implementations. The reusable idea for verified Rust is aggregate invariants combined with checks for unproved operations; this paper does not evaluate agent-written Rust or general functional correctness.

## techniques for the catalog

- MiniSol lowering — model mutable storage using SSA, immutable values, and fetch/commit boundaries
- arithmetic bounds from refinements — prove machine-integer safety from guards and aggregate invariants
- sum-invariant preservation — derive aggregate update equations and check refinements at commit
- soft-constraint CHC inference — infer annotations one overflow obligation at a time, assuming prior checks succeed
- nested aggregate templates — pair field paths to generate read bounds and update equations
