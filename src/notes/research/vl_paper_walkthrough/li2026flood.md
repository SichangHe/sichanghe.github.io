# Flood and Harvest: The Provable Necessity of Trivia for Generating Valuable Mathematics via the Lens of Language Generation in the Limit
(authored by agents unless marked 🧑)
Tag: `li2026flood`, [paper](https://doi.org/10.48550/arxiv.2606.14688)

This paper studies a verifier coupled to a generator when formal validity and mathematical value are different languages. Its central model is a pair H ⊆ F: F is the machine-checkable language and H is the unknown valuable language. The paper states: “The verifier eliminates one failure mode (no output need ever be a hallucination), and the question becomes how the remaining two, triviality and missed value, trade against each other.” (Abstract, PDF p.1.) A hallucination is outside F, a triviality is in F\H, and a valuable output is a new member of H. The paper does not define value semantically; it treats H as an unknown target language.

## technique: separate validity from value with a nested-language model

Use this when a checker can decide whether an output is formally admissible, but cannot decide whether it is useful. The paper’s construction is:

1. Fix a countable universe U and canonical order; choose infinite F and H with H ⊆ F (Section 2.3, PDF p.9).
2. Give the generator membership access to F, but reveal H only through an enumeration (Definition 2.4, p.9).
3. Classify every output a as hallucination (a ∉ F), triviality (a ∈ F\H), or valuable (a ∈ H\S_t), where S_t is the seen set (Definition 2.5, p.9).
4. Measure coverage as lower density c = d(O ∩ H,H), where O is the limit set of outputs (Definition 2.6, p.10).

The paper’s exact warning is: “The verifier certifies the world; it does not reveal the worth of a statement within it.” (Section 3.1, p.11.)

Verus form (Inference:): model F as the set of Rust/Verus terms accepted by the verifier and H as a separately specified predicate over terms. Use `requires`/`ensures` to prove membership in F; represent value with a ghost predicate or specification-layer set. A successful Verus proof establishes validity only; it does not establish the value predicate unless that predicate is also specified and proved. Verus does not provide a built-in value oracle.

Evidence: the paper’s Theorem 3.1 says that, within one fixed ambient F, verifier answers are identical for all candidate H and therefore do not improve breadth. The paper gives the full statement: “For H_i, H_j in the same fiber the oracle is the identical function 1_F; the realized query path and output at any prefix S_n are identical across the two instances.” (Theorem 3.1(d), p.11.) This is a mathematical theorem, not an implementation benchmark. The assumption is a perfect membership oracle and an adversarial, non-effective enumeration (Definitions 2.3–2.4, p.9). The result does not address computational cost or noisy checkers.

## technique: exhaustive sound coverage using the verifier

Use this when the safety requirement is “cover every unseen valuable statement while asserting only formally valid statements.” The step-by-step generator is G_n(S_n) = F \ S_n (Section 3.2, p.11):

1. Query the verifier for every candidate’s membership in F.
2. Remove already seen statements S_n.
3. Output all remaining members of F.
4. Since H ⊆ F, every unseen valuable statement is included; since output is a subset of F, no hallucination is emitted.

The paper states: “With the verifier 1_F, the generator G_n = F \ S_n achieves sound coverage in the limit on every countable pair model: at every round, it has zero hallucination, and (when F \ H is infinite) infinitely many trivia.” (Theorem 3.2(a), p.12.) Without the verifier, the paper constructs a Gold-style chain for which no oracle-free set-valued generator can sound-cover (Theorem 3.2(b), pp.12–13). The price is relocation of errors: false outputs become valid but worthless outputs.

Verus form (Inference:): implement the safe envelope as a verified filter that emits only candidates carrying a proof of the formal predicate F. A ghost set of seen statements can model S_n; a loop invariant can maintain that every emitted item satisfies F. This does not make enumerating all F computationally feasible, and it does not prove H membership. Verus syntax must use ordinary `requires`, `ensures`, loop invariants, and proof functions; no `invariant(...)` call or run-time proof invocation is implied.

Evidence and limits: the theorem guarantees soundness for arbitrary countable pair models under the paper’s ideal oracle. It does not give a finite-time algorithm, a complexity bound, or a criterion for mathematical value. Inference: a VL product that treats proof acceptance as its only quality gate inherits the triviality flood.

## technique: race enumeration to establish unavoidable coverage caps

Use this when an adversarial or worst-case input order matters and you need a tight density bound. On an infinite K, define the racing adversary A_K (Definition 3.4, p.14): at ordinary rounds enumerate the least unused K element not already seen or output; at powers of two, re-enumerate the least generator-claimed K element not yet seen, falling back to a fresh element if necessary. The paper’s race lemma has two reusable parts:

1. A greedy generator outputs the least unresolved K element on a density-one set of rounds; it obtains at least one half of K up to an o(M) correction.
2. Against A_K, every generator gets at most M/2 + log_2 M + 3 elements in K[1..M] (Lemma 3.5, p.14).
3. Therefore the lower and upper limits are both 1/2.

The paper explains the mechanism: “Each round the adversary enumerates one element and the generator outputs one, so every prefix splits roughly in half.” (Figure 4 caption, p.14.)

Verus form (Inference:): encode the canonical order and a ghost set of claimed/seen indices. Prove that each round preserves disjointness and that the count of outputs in a prefix is bounded by the stated arithmetic invariant. The adversary is a proof-model object, not production code; Verus can verify the counting lemmas if finite prefixes and recursive ghost sequences are used. The asymptotic density argument remains an external mathematical proof unless formalized separately.

Evidence: Theorem 3.6(a) applies one transcript to two readings, truth K and truth K′, yielding coverage at most 1/2 on K and at most 1−α/2 on K′ when d(K,K′)=α. Assumptions include deterministic element-based generators and limit-set coverage (Theorem 3.6, p.15).

## technique: sparse sweep plus race to harvest unrecorded value

Use this when the revealed core C is only a positive-density subset of H and the generator must cover H\C. Define the universal sweep G_sw (Equation 3.3, p.16): on square rounds R={k²}, emit the least element of the union U_t of candidates consistent with S_t that is not seen or already output; on other rounds emit the least element of the identified intersection I_t not seen or output.

Steps from the paper are:

1. Maintain U_t = ⋃{H′ : S_t ⊆ H′} and the identified intersection I_t (Section 3.3, p.16).
2. Reserve square-number rounds for sweeping U_t.
3. Use all other rounds to race within I_t.
4. Because sweep rounds have density zero but are infinite, every never-enumerated valuable element is eventually selected.
5. The universal guarantee is O ⊇ H\C and c ≥ 1−d(C,H); the trivia rate tends to zero while the count can be infinite (Theorem 3.7(i), p.16).

The paper states: “A pointer lemma drives (i): any x ∈ H \ C stays in U_t (as H is consistent) and is never enumerated, so if it were never output the sweep rounds (of which there are infinitely many) would always emit a new element strictly below x, which is impossible.” (Proof sketch of Theorem 3.7, p.17.)

On the tight family H_α={K,K′}, the combined G* races on I_t and sweeps U_t. If C ⊆ K and d(K,K′)=α, it reaches 1−α/2 at truth K′ with zero trivia; at truth K, the sweep outputs infinitely many K′\K trivia at rate O(N^−1/2) (Theorem 3.7(ii), pp.16–17). Corollary 3.10 therefore gives α/2 under any finite-trivia allowance and 1−α/2 under any infinite-trivia allowance, with jump 1−α (p.17).

Verus form (Inference:): represent U_t and I_t as ghost finite sets or predicates over a bounded prefix; use a loop invariant that every candidate in I_t is a subset of the target specification and that sweep pointers advance monotonically. Prove the finite-prefix pointer lemma with `decreases` and arithmetic lemmas. The limit-density conclusion is outside ordinary executable verification and would need a separately formalized asymptotic library.

## technique: instantiate adversarial families in a compression model

The paper uses a macro dictionary model as a worked formal-language substrate. In an abelian monoid, geometric dictionaries form a descending chain whose singleton tell-tales satisfy Angluin’s condition; Theorem 4.1 concludes exact breadth without trivia (Section 4, PDF p.18). In a free monoid, name-cut pairs K ⊊ K′ realize every rational α under a bounded cut, while an unbounded cut gives d(K̂,K̂′)=0 and a finite-trivia-versus-sweep gap of 0 versus 1 (Proposition 4.2, pp.18, 42–43). These are constructions, not claims about all compressible languages.

Verus form (Inference:): model dictionary expansion and wrapped length as pure/spec functions, prove monotonicity and parsing uniqueness as lemmas, and keep generated proofs separate from executable compression code. The paper’s combinatorial counting is not a Verus implementation.

## evidence, trusted parts, and product threat

The main evidence is theorem-level: Theorems 3.1, 3.2, 3.6, 3.7, and Corollary 3.10; the only empirical check is a simulation appendix. For α=1/3, Table 3 reports fixed-prefix, grown-horizon coverage 0.8317 for G* at truth K′ versus predicted 5/6≈0.8333, 0.1702 for a pure conjunction race versus α/2≈0.1667, and 0.6667 for a naive sweep versus 1−α=0.6667 (Table 3, p.46). The table’s denominator is the fixed prefix size N and the reported horizon T; these are limit-set estimates, not theorem proofs. Table 4 reports α=0.7 measured 0.644 versus 0.65, α=0.99 measured 0.503 versus 0.505, and α=0.01 measured 0.994 versus 0.995 at N=10^3 (p.46). The paper warns that fixed N must be held while T grows and that exact rational arithmetic avoids a floating-point boundary error (Section F, p.46).

What is proved: the information-theoretic role of an ambient verifier, sound-coverage separation, tight trivia-count dichotomy on H_α, and compression-model examples. What remains trusted: the membership oracle, canonical enumeration protocol, non-effective adversary convention, density definitions, and the external definition of “valuable.” Contradictions or caveats: the paper explicitly limits 1−α/2 tightness to the candidate-intersection core C⊆K; general cores can be capped at 1/2 (Remark 3.8, p.17). Proposition 4.3 brackets precision between different polynomial exponents and says the exact exponent is open (Appendix D.6.3, p.43).

Inference: the threat to VL is high for systems that equate successful Verus checking with useful theorem selection. A verifier can guarantee absence of false Rust specifications while leaving a potentially unbounded stream of valid, irrelevant lemmas. The paper’s sweep/race design suggests a product architecture with (1) a formally checked validity layer, (2) explicit value examples or a learned selector, and (3) a controlled exploration budget that records the number of valid-but-unselected outputs. The results do not show that real Verus corpora have adversarial densities or that the asymptotic generators are computationally practical.

## techniques for the catalog

- nested validity/value model — represent formally valid outputs F and valuable outputs H separately, classifying hallucination, triviality, and value
- exhaustive sound coverage — emit F minus the seen set to cover every unseen H item without hallucinations
- racing adversary — alternate enumeration and recycling to force a one-half prefix-density cap
- sparse sweep — reserve infinitely many density-zero rounds to eventually claim every unenumerated valuable item
- race-plus-sweep generator — combine intersection racing with union sweeping to attain 1−α/2 on the tight family
- compression-model instantiation — realize density interfaces with macro dictionaries and count precision of exhaustive generation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
