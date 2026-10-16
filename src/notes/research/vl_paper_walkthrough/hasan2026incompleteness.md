# Incompleteness of AI Safety Verification via Kolmogorov Complexity
(authored by agents unless marked 🧑)
Tag: `hasan2026incompleteness`, [paper](http://arxiv.org/abs/2604.04876v1)

## problem and result

The paper models one AI interaction as a finite binary encoding (x=\langle z,y,\Pi\rangle), where (z) is input, (y) is output, and Π is a policy specification (Section 3.2, p. 7).  It defines compliance by (P(x)=1) exactly when output (y) satisfies policy Π on input (z) (Definition 1, Section 3.2, p. 7).  A verifier is a sound computably enumerable theory (T) with a proof checker (C_T(φ,π)) that accepts exactly when π is a valid proof of φ in (T) (Definition 2, Section 3.3, p. 8).

The central claim is stated verbatim: “for any fixed sound computably enumerable verifier, there exists a threshold beyond which true policy-compliant instances cannot be certified once their complexity exceeds that threshold.” (Abstract, p. 1).  The formal theorem assumes that the compliant set is rich: for infinitely many lengths (m), at least (2^{m-d}) strings of length (m) satisfy (P) (Assumption 1, Section 4.1, p. 8).  Counting then gives a compliant (x) with (K(x)\ge m-d) (Lemma 1, Section 4.1, p. 9).  Theorem 1 says that for every sufficiently expressive sound computably enumerable (T), a constant (c_T) exists such that, for all sufficiently large (n), no statement (P(x)\land K(x)>n) is provable in (T) (Section 4.2, pp. 9–10).

Inference: this is a limitation on completeness of a fixed proof system, not a claim that every individual compliant instance is unverifiable.  Inference: the richness assumption is substantive; a policy with only a small, highly structured compliant set may not satisfy it.  Inference: the theorem's (K(x)) is uncomputable, so a practical verifier will need a modeled proxy or a proof statement supplied by another mechanism.

## technique 1: encode compliance as a proof obligation

What it is: represent each input, result, and policy as one finite object (x=\langle z,y,\Pi\rangle), then ask a formal theory to prove (P(x)).  The paper says, “We adopt a formal perspective in which AI behavior is encoded as finite binary strings and policy compliance is expressed as a predicate over these encodings, so that verification corresponds to proving that a given instance satisfies the policy.” (Introduction, p. 3).

When to use it: use this reduction when a safety requirement can be expressed as a predicate over a concrete interaction, such as collision avoidance, stopping distance, or cross-modal consistency (Introduction, pp. 2–3; Section 3.2, p. 7).

Steps in the paper:

1. Choose encodings for input (z), output (y), and policy Π, and combine them into (x=\langle z,y,\Pi\rangle) (Section 3.2, p. 7).
2. Define (P:{0,1}^*\to{0,1}) by the policy test on (z,y) (Definition 1, p. 7).
3. State the target formula (P(x)) in the formal theory (T) (Section 3.3, p. 8).
4. Accept an instance only when a proof π satisfies (C_T(P(x),π)=1) (Section 3.3, p. 8).

Verus form: Inference: an executable Rust function can carry an `ensures` contract expressing a concrete policy predicate, while a `proof fn` can establish arithmetic or collection facts used by the contract; `spec fn` is appropriate for the mathematical policy.  Inference: the encoding (x) would normally be a Verus ghost/specification value or a typed Rust record, and the executable output would remain ordinary Rust.  Inference: this is a translation of the paper's predicate model to Verus, not a construct supplied by the paper.

Evidence: the paper gives definitions and examples of policy classes but no implementation benchmark.  It explicitly frames the result as theory: “Our result does not assume incompleteness, but derives it from fundamental information-theoretic limits.” (Contributions, p. 4).  Inference: there is therefore no measured success rate, runtime denominator, or empirical coverage number to transfer.

Assumptions and failure: (T) must be sound and computably enumerable and sufficiently expressive to represent (P(x)) and (K(x)>n) (Theorem 1, pp. 9–10).  Inference: an unsound solver, an incorrect policy encoding, or a false external contract invalidates the engineering interpretation even if a checker returns acceptance.

## technique 2: richness and counting to expose high-complexity cases

What it is: show that a large compliant subset must contain strings whose shortest descriptions are long.  The paper defines prefix Kolmogorov complexity as (K(x)=\min\{|q|:U(q)=x\}) for a fixed universal prefix-free machine (U) (Section 3.1, p. 6).  Under Assumption 1, fewer than (2^{m-d}) length-(m) strings can have complexity below (m-d), while at least (2^{m-d}) are compliant; therefore one compliant string has complexity at least (m-d) (Lemma 1 and proof, pp. 8–9).

When to use it: use this argument to test a proposed claim of universal certification when the valid behavior space is broad and variable.  Inference: it is a threat-analysis technique, not an algorithm for computing (K).

Steps in the paper:

1. Postulate the richness bound |{ x∈{0,1}^m:P(x)=1}|≥2^{m-d} for infinitely many (m) (Assumption 1, p. 8).
2. Count programs shorter than (m-d); prefix-freeness bounds their number below (2^{m-d}) (Lemma 1 proof, p. 9; Lemma 2, p. 14).
3. Conclude that at least one compliant string has (K(x)≥m-d) (Lemma 1, p. 9).

Verus form: Inference: Verus can prove finite counting lemmas for a bounded model using `seq`, `set`, quantified specifications, and `proof fn`; it cannot compute unbounded Kolmogorov complexity or prove the paper's universal theorem merely by adding an invariant.  Inference: a practical Verus project could instead define a finite complexity surrogate and prove its bound for a chosen domain.

Evidence: the only evidence is the paper's counting proof; no dataset, model, or denominator is reported.  Inference: applying the result to a product requires demonstrating that the product's admissible interactions meet the richness assumption rather than assuming that they do.

## technique 3: proof-enumeration incompleteness argument

What it is: derive a contradiction by turning any arbitrarily high-complexity theorem into a short description.  The paper's proof sketch says: “One can construct a program that enumerates proofs in T and outputs the corresponding x, yielding a description of x of size cT + O(log n).” (Theorem 1 proof sketch, p. 10).  The appendix makes the construction explicit: enumerate candidate proofs, select one proving (P(x)\land K(x)>n), extract (x), and output it (Appendix A.4, pp. 15–16).

Steps in the paper:

1. Assume that infinitely many (n) have a (T)-proof of (P(x)\land K(x)>n) (Appendix A.4, p. 15).
2. Build (A_{T,n}) that enumerates all candidate proofs, checks the target form, extracts (x), and outputs it (Appendix A.4, p. 15).
3. Encode the fixed enumeration procedure, fixed description of (T), and integer (n); this gives (K(x)\le c_T+O(\log n)) (Appendix A.4, pp. 15–16).
4. Use soundness to obtain (K(x)>n), contradicting (c_T+O(\log n)<n) for sufficiently large (n) (Appendix A.4, p. 16).
5. Conclude that no such statement is provable for all sufficiently large (n) (Theorem 2, Appendix A.4, p. 16).

Verus form: Inference: the analogous engineering lesson is to keep a proof-producing function and a separately checkable verifier; a Verus `proof fn` can establish a bounded certificate relation, and `ensures` can state that a verifier accepts only valid certificates.  Inference: Verus cannot encode the appendix's meta-level enumeration of all proofs as an executable proof of the unbounded theorem; this argument belongs outside a crate, in the metatheory of the chosen verifier.

Evidence: the appendix is self-contained and gives the inequalities and contradiction; there are no experimental numbers, proof-search times, or acceptance denominators.  Inference: the paper supports a design principle (instance certificates) rather than a demonstrated implementation.

## proof-carrying design and limits

The paper proposes augmenting the instance to (x=\langle z,y,\Pi,\pi\rangle), where π is a proof that (P(x)=1), so verification checks the certificate instead of characterizing every valid behavior (Section 5, pp. 10–11).  It states, “This paradigm shift avoids the need for universal characterization and instead ensures correctness on a per-instance basis.” (Section 5, p. 11).  Figure 1 depicts an AI model producing (y), a proof generator producing π, and a verifier accepting or rejecting the certificate (Section 6, Fig. 1, p. 12).

Inference: in VL, a generated Rust result could carry a Verus-checked proof artifact or a proof-producing API whose checker is run independently; the artifact should identify the exact policy predicate and input state.  Inference: this does not remove trusted computing base assumptions: Verus, its solver, proof erasure, the Rust compiler, external libraries, hardware, and the policy specification remain outside the theorem unless separately modeled.  The paper itself says the limitation is “independent of computational resources” (Abstract, p. 1), so faster solver hardware cannot make one fixed sound verifier complete.

What is proved: the theorem proves existence of true, sufficiently complex compliant instances that a fixed sound computably enumerable theory cannot prove in the specified form (Theorem 1, pp. 9–10).  What is measured: nothing empirical; all evidence is mathematical definitions, lemmas, and an appendix proof.  Inference: the threat to agent-written verified Rust is conceptual and high for claims of universal policy coverage, but lower for bounded, explicitly specified instances with independently checked certificates.  Inference: VL should not redo the paper's counting argument; it should use the result to state coverage boundaries and to prefer per-instance proof obligations where feasible.

## techniques for the catalog

- compliance encoding: encode input, output, and policy as (x=\langle z,y,\Pi\rangle), define (P(x)), and check a proof of (P(x))
- richness counting: use a large compliant subset and program-counting to show that high-K compliant instances exist
- proof-enumeration contradiction: enumerate hypothetical proofs to derive a short description and contradict (K(x)>n)
- proof-carrying instances: attach an instance-specific certificate π and verify (\langle z,y,\Pi,\pi\rangle) instead of seeking universal completeness
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
