# Summing Up Smart Transitions
(authored by agents unless marked 🧑)
Tag: `elad2021summing`, [paper](http://arxiv.org/abs/2105.07663v1)

## problem and contribution

Elad et al. study verification of transactions whose correctness depends on a global sum of unboundedly many local values. Their running example is ERC-20 minting: one address increases by `n`, every other address is unchanged, and the total balance increases by `n`. The paper says, “The validity of these three requirements (i)-(iii), formulated as the post-conditions of Figure 1, imply its functional correctness.” (Section 1, p. 2) The difficulty is linking a local update to an aggregate over a finite but unbounded address set.

They introduce Sum Logic (SL), a generalization of Presburger arithmetic with an address sort, balance functions, and sum constants; the paper restricts itself to universal sentences with quantification only over the Address sort (Section 3, p. 5). The paper states: “In Sum Logic (SL) we only consider the special case of integer sums over uninterpreted functions”, which lets them write sums “without higher-order operations” (Section 1, p. 2). They prove a decidable fragment, an undecidable richer fragment, and first-order encodings that existing SMT solvers and theorem provers can consume; the paper says the encodings “allow one to use existing reasoners without any modification” (Section 1, p. 3; Sections 3-6).

## technique 1: model aggregate state with Sum Logic

what it is

An SL vocabulary has an unbounded `Address` sort, unary balance functions `b_j : Address -> Nat`, and sum constants `s_j`. An SL model must satisfy the sum property: each `s_j` equals the sum of `b_j(a)` over the entire address domain (Section 3, pp. 4-5). ERC-20 minting is encoded as `b'(a) = b(a) + n`, `forall a' != a. b'(a') = b(a')`, and `s' = s + n` (Example 1, formula (1), Section 3, p. 5).

when to use it

Inference: Use SL when a transition updates a bounded set of accounts but the specification quantifies over all addresses and relates the update to a total. The paper says its results “can be used for arbitrary software transactions implementing sum/aggregate properties” (Section 1, p. 3) and Table 5 shows sums of non-negative integer values over a shared finite set (Section 6, p. 19), so the method is not specific to blockchain code.

how to apply it

Inference: 1. declare address constants, balance functions, sum constants, and natural-number arithmetic (Definition 1, Section 3, p. 4)
Inference: 2. impose the sum property connecting each sum constant to its balance function (Section 3, p. 5)
Inference: 3. write local postconditions for changed addresses and universal frame conditions for all other addresses (Figure 1, p. 2)
Inference: 4. add the aggregate postcondition relating old and new sums (Example 1, Section 3, p. 5)

Verus form (Inference:)

Inference: Represent balances with a ghost `Map<Address,Nat>` and totals with a ghost `int` or `nat`. State the total as a quantified `forall` sum lemma over a finite domain representation, such as a `Seq<Address>` with uniqueness. Prove the update and unchanged-address cases, then prove the total delta. I did not check Verus's libraries; this sketch assumes a finite-domain invariant and explicit iteration are needed. This part is not from the paper.

evidence and limits

The paper notes: “Although the encodings of Section 5 do not translate to our decidable SL fragment from Section 4,” its experiments show that automated reasoners handle them (Section 1, p. 3). It also says that neither decidability nor undecidability of the `Sigma^{l,2,d}` fragment, in which smart transitions are encoded, “is implied by Theorem 4, nor Theorem 5” (Section 5, p. 11), and lists the (un)decidability of the two-balance-function fragment as further work (Section 8, p. 21). Inference: the abstract sum property is trusted; it does not by itself prove that executable storage contains exactly the modeled addresses.

## technique 2: decidable fragments and Presburger reduction

what it is

The paper defines the `(l,1,d)-FRAG` fragment: `l` address constants, a single balance function with its sum constant, `d` numeric constants, and the symbols `0` and `1`, with the binary function `+` and the relation `<=` removed (Section 4.1, p. 7). It proves decidability by reducing SL formulas to ordinary Presburger arithmetic, via distinct models (Theorem 1) and a small address space with bound `kappa(x) = l + x + 1` (Theorem 2) (Section 4.1, pp. 6-7). The Presburger reduction itself is Theorem 3 (p. 7); the transformations `tau` and `eta` are defined in Appendix A (pp. 36-37).

when to use it

Inference: Because the fragment has no `+` and no `<=`, the ERC-20 mint formula (1), which uses `+`, is not in it. The fragment fits only specifications with one summed balance family, no addition or ordering, and a fixed number of address constants. Use the reduction to decide whether a proposed aggregate specification lies inside that decidable boundary.

how to apply it

The paper's decision procedure for a `FRAG` formula `phi` (Theorem 4 proof, pp. 7-8):
1. for each partition `P` of the address constants `{a_1, ..., a_l}`, let `phi_P = T_P(phi)`
2. check with a Presburger decision procedure whether `tau(phi_P) and eta(phi_P)` has a model, for each `P`
3. if some partition gives a model, `phi` has an SL model
4. otherwise `phi` has no SL model

Remark 1 states that this procedure “requires Bl Presburger queries, where Bl is Bell’s number for all possible partitions of a set of size l” (Section 4.1, p. 8). The text extraction renders the symbol B_l as “Bl”.

Verus form (Inference:)

Inference: Encode bounded address cases as a finite `Seq` or finite `Set`, then use Verus arithmetic lemmas for each case. The reduction itself is a metatheoretic procedure, not a Verus library function. I did not check Verus's quantifier-trigger behavior; this is not from the paper.

evidence and limits

Theorem 4 establishes decidability for any fragment with a small address space, and Corollary 1 gives decidability of `(l,1,d)-FRAG` (Section 4.1, pp. 7-8). Section 4.2 proves undecidability by encoding the halting problem of a two-counter machine using three balance functions with their sums (Section 4.2, pp. 8-10); Theorem 5 states undecidability for any `l >= 2`, `m >= 3`, over the vocabulary that includes `+` and `<=` (p. 10). Remark 2 notes that the only use of the sums there is to express the number of addresses (p. 10). Inference: VL should reject or separately audit specifications that combine three or more balance functions with sums, addition and ordering, since the paper's encoding then applies. The paper does not say where the two-function case lies.

## technique 3: first-order encodings for automated proving

what it is

Section 5 gives implicit and explicit encodings. The implicit encoding (`uf` in the experiments) is pure first-order logic with equality over the sorts `Coin` and `Address`; balances and sums exist only implicitly, through the predicates `has-coin` and `active` and three “smart invariants” (Section 5.1, pp. 12-13). The explicit encodings add a sum constant, a balance function, and counting functions `count` and `idx` with two axioms (Ax1), (Ax2) (Section 5.3, p. 15). Section 6 derives three explicit encodings: `int` (linear integer arithmetic), `nat` (natural numbers with Presburger axioms asserted directly), and `id` (inductive datatypes with linked lists that order the coins) (Section 6, p. 17). Theorems 6, 7, 9 and 10 give soundness and Theorem 8 gives completeness relative to a translation function (pp. 13-15, Appendix B). The encodings let black-box SMT solvers or first-order provers reason about aggregate transitions.

when to use it

Inference: Use `uf` for one-coin transitions, or for `n` coins when the prover supports induction; the paper says arbitrary `n` in `uf` “can only be done by iterating over the mint1 (or transferFrom1) transition”, which needs induction that “currently only Vampire could do” (Section 6, p. 19). Use `int` when linear integer arithmetic and direct comparison of sums are enough. Use `nat` when natural-number axioms are acceptable. Use `id` when a prover with induction is available (Section 6, pp. 17-19).

how to apply it

Inference: 1. select the transition (`mint1`, `mintn`, `transferFrom1`, or `transferFromn`) and an encoding family (Section 6, p. 17)
Inference: 2. replace the predicates `has-coin` and `active` by their equivalent expressions (Ax1)-(Ax2) (Section 6, p. 16)
Inference: 3. restrict the surjectivity assertions to the relevant intervals `[1, sum]` and `[1, bal(a)]` (Section 6, p. 16)
Inference: 4. for `id`, declare one linked list of all coins for `count` and one for each `idx(a, .)`, and use positions as coin numbers (Section 6, p. 17)
Inference: 5. split large `mintn` or `transferFromn` goals into intermediate lemmas; the experiments use one lemma for `mintn` and four for `transferFromn` (Section 6, p. 19)

Verus form (Inference:)

Inference: Use ghost sequences or linked-list predicates for explicit coin order, and prove each transition lemma by induction over the number of coins. For `int`, use Verus integer arithmetic and a finite map-to-sequence sum invariant. The SMT-LIB encodings and solver-specific options do not carry over directly. This is not from the paper.

evidence and limits

The paper reports a benchmark set of 31 examples in SMT-LIB syntax: four transitions in four encodings, three additional arithmetic benchmarks using `int`, and variants of `int` and `nat` (Section 6, p. 17). The machine is an Intel Core i5-6200U CPU (2.30GHz, 2.40GHz) with 8 GB RAM, with a 300 s time limit; solvers are Z3, CVC4 and Vampire (Section 6, p. 18). Table 4 (p. 18) shows that `int` is solved by Z3 on all four transitions in 0.02-0.11 seconds and by CVC4 in 0.03-0.35 seconds; Vampire times out on all four `int` rows. For `uf`, Z3 solves `mint1` and `transferFrom1` in 0.01 and 0.02 seconds and CVC4 in 0.02 and 0.03 seconds, but both time out on `mintn` and `transferFromn`; Vampire solves all four in 0.18, 0.19, 0.35, and 0.44 seconds (the last two with the induction options marked by an asterisk). These are four transition tasks per encoding, not percentages of all possible contracts.

For `nat`, Vampire solves `mint1` in 0.92 seconds and `transferFrom1` in 15.35 seconds, and `mintn` and `transferFromn` in 23.23 and 228.22 seconds with the split-queue options and lemma splitting (marked †); Z3 solves only `mint1` (0.02 s) and CVC4 solves none (Table 4, p. 18). The `id` encoding is solved by Vampire for the first three tasks at 7.36, 17.16, and 23.52 seconds, while `transferFromn` times out; the SMT solvers time out on all four, which the paper explains by their lack of induction (Table 4, p. 18; Section 6, p. 19). Complete surjectivity is computationally hard: Table 3 (p. 18) shows several timeouts under `nat surj.` and `int surj.` within the same 300-second limit, and the paper says the added total constants make results unstable: “Some tasks seem to be easier even though their reasoning difficulty increased strictly by adding additional constants.” (Section 6, p. 18). The paper concludes that “each solver can certify every smart transition in at least one encoding” (Section 6, p. 19).

## trust and product implications

The paper proves soundness of the implicit and explicit encodings and completeness relative to a translation function, and proves the decidability and undecidability results above. The soundness proofs for the transition itself are given for minting (Theorems 7 and 10); for transfers the paper only says they “can be handled in a similar manner” (Section 5.1, p. 13). In the applied examples, correctness of built-in transitions is assumed: “rather than verifying the low-level implementation of built-in functions such as mintn, we assume their correctness by including suitable axioms” (Section 3, p. 5). Inference: this assumption is a direct trust boundary for VL. Inference: the technique matters for agent-written verified Rust whenever a product invariant is an unbounded aggregate, because a local proof can miss a global conservation error; finite-domain ghost sums and explicit transition lemmas could recover the method. What the paper has already done includes the aggregate specification pattern, solver encodings, and a measured benchmark matrix; VL should not redo those ideas without adapting them to executable Rust and checking the abstraction link.

## techniques for the catalog

- Sum Logic aggregate model: represent balances as functions and totals as sum constants with a semantic sum property
- decidable-fragment reduction: reduce bounded-address SL formulas without `+` and `<=` to Presburger arithmetic through distinct models and small address spaces
- first-order transition encodings: compile local coin updates and aggregate effects into SMT or theorem-prover formulas
- induction and lemma splitting: handle unbounded mint/transfer transitions by explicit coin induction and intermediate lemmas

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since we’re looking for distinct models, it is obvious that we need at least l distinct elements."): I read the whole paper text including the appendices and checked every quotation, section and page reference, the Table 3 and Table 4 numbers, the machine and time limit, the benchmark count, the decision-procedure steps and the technique steps against it. I changed: SL is a generalization of Presburger arithmetic, not a first-order extension; the fragment lacks `+` and `<=`, so the mint formula is outside it; B_l is Bell's number over the address constants, not a parameter-dependent bound; Theorem 4, Remark 1 and Section 4.2 page numbers; the implicit encoding has no balance functions; `uf` is solved by Z3 and CVC4 only for the one-coin tasks; undecidability needs three balance functions, and the two-function case is open; added the transfer-soundness caveat; marked the Verus remarks as outside the paper and unchecked. I did not check the proofs' correctness, the GitHub encodings, the reference list, or any claim about Verus.
