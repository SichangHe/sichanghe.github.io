# Summing Up Smart Transitions
(authored by agents unless marked 🧑)
Tag: `elad2021summing`, [paper](http://arxiv.org/abs/2105.07663v1)

## problem and contribution

Elad et al. study verification of transactions whose correctness depends on a global sum of unboundedly many local values. Their running example is ERC-20 minting: one address increases by `n`, every other address is unchanged, and the total balance increases by `n`. The paper says, “The validity of these three requirements (i)-(iii), formulated as the post-conditions of Figure 1, imply its functional correctness.” (Section 1, p. 2) The difficulty is linking a local update to an aggregate over a finite but unbounded address set.

They introduce Sum Logic (SL), a first-order extension of Presburger arithmetic with address sorts, balance functions, and sum constants. The paper states: “In Sum Logic (SL) we only consider the special case of integer sums over uninterpreted functions.” (Section 1, p. 2) They prove a decidable fragment, an undecidable richer fragment, and first-order encodings that existing SMT solvers and theorem provers can consume without modification (Sections 3–6).

## technique 1: model aggregate state with Sum Logic

what it is

An SL vocabulary has an unbounded `Address` sort, unary balance functions `b_j : Address → Nat`, and sum constants `s_j`. An SL model must satisfy the sum property: each `s_j` equals the sum of `b_j(a)` over the entire address domain (Section 3, pp. 4–5). ERC-20 minting is encoded as `b′(a)=b(a)+n`, `∀a′≠a. b′(a′)=b(a′)`, and `s′=s+n` (Section 3, p. 5).

when to use it

Inference: Use SL when a transition updates a bounded set of accounts but the specification quantifies over all addresses and relates the update to a total. It applies to minting, transfers, and arbitrary finite-index sums, not only blockchain code (Sections 1 and 8, pp. 2–3, 21).

how to apply it

Inference: 1. declare address constants, balance functions, sum constants, and natural/integer arithmetic (Definition 1, Section 3, p. 4)
Inference: 2. impose the sum property connecting each sum constant to its balance function (Section 3, p. 5)
Inference: 3. write local postconditions for changed addresses and universal frame conditions for all other addresses (Figure 1, p. 2)
Inference: 4. add the aggregate postcondition relating old and new sums (Example 1, Section 3, p. 5)

Verus form (Inference:)

Inference: Represent balances with a ghost `Map<Address,Nat>` and totals with a ghost `int` or `nat`. State the total as a quantified `forall` sum lemma over a finite domain representation, such as a `Seq<Address>` with uniqueness. Prove the update and unchanged-address cases, then prove the total delta. Verus has no unbounded mathematical sum over an arbitrary sort, so a finite-domain invariant and explicit iteration are required.

evidence and limits

Inference: The model gives a precise aggregate semantics, but the authors note that “Although the encodings of Section 5 do not translate to our decidable SL fragment from Section 4,” experiments still automate them (Section 1, p. 3). Inference: the abstract sum property is trusted; it does not by itself prove that executable storage contains exactly the modeled addresses.

## technique 2: decidable fragments and Presburger reduction

what it is

The paper defines an `(l,1,d)-FRAG` fragment with bounded numbers of address constants, one balance function, and `d` numeric constants. It proves decidability by reducing SL formulas to ordinary Presburger arithmetic. The reduction relies on distinct models and a small address space (Section 4.1, pp. 6–8).

when to use it

Inference: Use the fragment when a specification has one summed balance family and bounded address constants and does not require the richer two-counter-machine encoding. Use the reduction as a decision procedure or as a way to determine whether a proposed VL aggregate specification lies inside a decidable boundary.

how to apply it

Inference: 1. choose the fragment parameters and normalize the SL formula to the permitted universal vocabulary (Section 3 and Section 4.1, pp. 5–7)
Inference: 2. transform an arbitrary model into a distinct model preserving the formula (Section 4.1, pp. 6–7)
Inference: 3. bound the relevant address space and enumerate the finite address cases (Section 4.1, pp. 7–8)
Inference: 4. apply the paper's transformation `τ` to produce a Presburger formula (Section 4.1, pp. 8–9)
Inference: 5. call a Presburger decision procedure; the paper notes that the reduction requires `B_l` Presburger queries, where the bound depends on the fragment parameters (Section 4.1, p. 9)

Verus form (Inference:)

Encode the bounded address cases as a finite `Seq` or finite `Set`, then use Verus arithmetic lemmas for each case. The reduction itself is a metatheoretic procedure, not a Verus library function. Verus proofs can exploit the same bounded-case decomposition when quantifier triggers make direct aggregate reasoning fail.

evidence and limits

Theorem 4 establishes decidability for the fragment (Section 4.1, p. 9). Section 4.2 proves undecidability for a richer extension by encoding a two-counter machine (pp. 9–11). Inference: VL should reject or separately audit specifications that add enough address relations or multiple sums to simulate this encoding.

## technique 3: first-order encodings for automated proving

what it is

Section 5 gives implicit and explicit encodings. The implicit `uf` encoding uses uninterpreted coin predicates and balance functions. Explicit `int` and `nat` encodings add counting functions and sums; `id` uses inductive datatypes and linked lists to order coins. The encodings let black-box SMT solvers or first-order provers reason about aggregate transitions (Sections 5.1–5.3, pp. 11–16).

when to use it

Inference: Use `uf` for one-coin transitions or when the number of coins can be handled by induction. Use `int` for linear integer arithmetic and direct sum comparisons. Use `nat` when natural-number axioms are acceptable. Use `id` when inductive ordering of coins is needed and a prover with induction is available (Section 6, pp. 17–19).

how to apply it

Inference: 1. select the transition (`mint1`, `mintn`, `transferFrom1`, or `transferFromn`) and an encoding family (Section 6, p. 17)
Inference: 2. replace high-level predicates such as `has-coin` and `active` with their equivalent formulas (Section 6, p. 17)
Inference: 3. restrict surjectivity assertions to relevant intervals such as `[1,sum]` and `[1,bal(a)]` (Section 6, p. 17)
Inference: 4. for `id`, declare linked lists for the global count and each address index and use positions as coin numbers (Section 6, pp. 17–18)
Inference: 5. split large `mintn` or `transferFromn` goals into intermediate lemmas; the experiments use one lemma for `mintn` and four for `transferFromn` (Section 6, p. 19)

Verus form (Inference:)

Inference: Use ghost sequences or linked-list predicates for explicit coin order, and prove each transition lemma by induction over the number of coins. For `int`, use Verus integer arithmetic and a finite map-to-sequence sum invariant. The SMT-LIB encodings and solver-specific axioms do not carry over directly.

evidence and limits

The paper evaluates 31 examples: four transitions with four encodings, plus three additional arithmetic benchmarks and variations (Section 6, p. 17). The machine is an Intel Core i5-6200U at 2.30/2.40 GHz with 8 GB RAM and a 300-second limit (Section 6, p. 18). Table 4 shows that `int` solves all four transitions with Z3 in 0.02–0.11 seconds and CVC4 in 0.03–0.35 seconds; Vampire times out on all four `int` rows. For `uf`, all four are solved, with Vampire times 0.18, 0.19, 0.35, and 0.44 seconds (asterisked rows use induction). These are four transition tasks per encoding, not percentages of all possible contracts.

The explicit `nat` encoding solves `mint1` in Vampire at 0.92 seconds and `transferFrom1` at 15.35 seconds, while `mintn` and `transferFromn` take 23.23 and 228.22 seconds under the split-lemma configuration (Table 4, p. 18). The `id` encoding is solved by Vampire for the first three tasks at 7.36, 17.16, and 23.52 seconds, while `transferFromn` times out; SMT solvers fail the displayed `id` tasks because they lack the required induction (Section 6, p. 19). Complete surjectivity is computationally hard: Table 3 shows several timeouts under `nat surj.` and `int surj.` within the same 300-second limit.

## trust and product implications

The paper proves soundness of its encodings relative to transition definitions and proves the stated decidability/undecidability results. In experiments, built-in transition correctness is assumed by adding suitable axioms rather than verified from low-level implementation (Section 3, p. 5). Inference: this assumption is a direct trust boundary for VL. Inference: the technique is a high threat to agent-written verified Rust whenever a product invariant is an unbounded aggregate, because a local proof can miss a global conservation error; however, finite-domain ghost sums and explicit transition lemmas can recover the method. What the paper has already done includes the aggregate specification pattern, solver encodings, and a measured benchmark matrix; VL should not redo those ideas without adapting them to executable Rust and checking the abstraction link.

## techniques for the catalog

- Sum Logic aggregate model: represent balances as functions and totals as sum constants with a semantic sum property
- decidable-fragment reduction: reduce bounded-address SL formulas to Presburger arithmetic through distinct models and small address spaces
- first-order transition encodings: compile local coin updates and aggregate effects into SMT or theorem-prover formulas
- induction and lemma splitting: handle unbounded mint/transfer transitions by explicit coin induction and intermediate lemmas

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
