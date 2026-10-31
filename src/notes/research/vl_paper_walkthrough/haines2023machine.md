# Machine-checking Multi-Round Proofs of Shuffle: Terelius-Wikstrom and Bayer-Groth
(authored by agents unless marked 🧑)
Tag: `haines2023machine`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/haines)

The paper formalizes interactive cryptographic shuffle protocols in Coq, machine-checking perfect completeness, special soundness with explicit failure events, and honest-verifier zero-knowledge for Terelius-Wikström (TW) and Bayer-Groth (BG). It extracts an OCaml verifier and tests it on Swiss Post JSON test vectors, not reported election results. The formalization also exposes that TW is an argument of knowledge for a different relation than originally claimed (sections 1.2, 3.1–3.8, and 4.1).

## technique: layered Coq definitions for multi-round sigma protocols

The authors encode protocols and security properties as Coq modules, then compose smaller protocols into larger ones. Inference: this approach suits protocols whose informal proofs claim that a whole protocol inherits security from its subarguments.

Steps: (1) define statement and witness spaces, their relation, and the prover and verifier algorithms; (2) encode 3-round protocols in `SigmaPlus`; (3) prove honest-verifier zero-knowledge through a bijection between honest-run and simulator random coins, using `simMap` and `simMapInv`; (4) allow this mapping auxiliary trapdoor information satisfying `simMapHelp`, without giving that information to the simulator; (5) generalize special soundness to l accepting responses with distinct challenges, permitting either witness extraction or a specified failure event; (6) define separate 5-round and 9-round modules because a definition parameterized by round count made Coq types unwieldy; (7) prove structural composition results, including the 3-round and 5-round combination that produces BG’s 9-round protocol (sections 2.1–2.3). The paper says: “Our definitions and structural relations contribute to the literature a precise description of which conditions suffice for the completeness and honest-verifier zero knowledge to follow from the underlying zero-knowledge arguments.” (section 1.2.1, printed p. 6476)

The definitions avoid explicit probability calculations. Their failure events must be infeasible in an instantiation, for example finding two distinct openings to one commitment. Inference: a Verus adaptation would need explicit algebraic specifications and assumptions about cryptographic hardness; translating transcript checks alone would not establish these security properties.

## technique: machine-check the claimed relation and detect specification errors

The authors discovered that TW was incomplete for its claimed relation while checking its full security properties: “We only discovered this weakness after we had encoded our 5-round protocol definition and were trying (unsuccessfully) to machine-check the completeness of the 5-round protocol.” (section 3.1.1, printed p. 6479)

Steps: (1) encode the five-round protocol; (2) examine the claimed relation `R_pk ∨ R_com`, where `R_pk` means knowledge of a shuffle permutation and re-encryption randomness, and `R_com` means knowledge of two distinct openings to one commitment; (3) inspect the completeness obligation; (4) show that a witness for `R_com` need not yield a witness for the underlying ciphertext relation; (5) revise the claim to an argument of knowledge for `R_pk`, with breaking commitment binding as a failure event; (6) machine-check the revised theorem (sections 3.1.1–3.1.2, printed pp. 6479–6480). The result is a perfectly complete 5-round honest-verifier zero-knowledge argument of knowledge. The authors state that this distinction does not affect the soundness of deployed TW shuffles; their hypothetical concern is an application that deliberately uses an `R_com` witness.

Inference: for Verus, state the intended relation separately from the implementation. Check completeness as well as soundness: showing that accepted transcripts support a claim does not show that every intended witness can produce an accepted transcript.

## technique: structural decomposition of Bayer-Groth shuffle

BG’s final shuffle argument has nine rounds and uses five underlying arguments. The authors separate reusable structural reasoning from argument-specific security proofs (sections 2.3 and 3.2–3.8).

Steps from section 3: (1) machine-check the multi-exponentiation argument relating ciphertext products, committed exponents, and re-encryption randomness; (2) machine-check the zero argument for a sum of bilinear products of committed vectors; (3) extend the zero argument to the 5-round Hadamard product argument, proving an elementwise vector product; (4) machine-check the 3-round single value product argument, proving that the product of a committed vector’s entries equals a public value; (5) combine Hadamard and single value product arguments into the 5-round product argument for a committed matrix; (6) combine the product and multi-exponentiation arguments into the final 9-round shuffle argument. Its witness is a permutation and re-encryption randomness. Abstract encryption and commitment schemes supply the required algebraic properties (section 2.4).

The zero argument uses the Schwarz-Zippel lemma: a nonzero polynomial of degree d evaluated at a uniformly random field point is zero with probability at most d/q. Commitments fix the polynomial before the challenge. The formal failure event permits extraction to fail when such a polynomial evaluates to zero (section 3.4, printed p. 6482). Inference: reusable Verus lemmas could follow this decomposition, but their contracts must expose the failure conditions as well as the successful extraction case.

## technique: extracted verifier and compatibility testing

The authors extract executable verification code and test compatibility with Swiss Post’s implementation. This tests whether supplied transcripts fit their verified protocol; it does not verify Swiss Post’s producer code (section 4).

Steps: (1) extract OCaml `lib.ml`; (2) replace the modulus computation with native OCaml arithmetic for performance; (3) parse Swiss Post JSON test vectors in `main.ml`; (4) supply the hash-generated challenges as hard-coded values for compatibility testing; (5) check that the vectors pass and deliberately invalid data is rejected. The paper reports: “After fixing some minor compatibility issues in our parser, the tests were passing successfully.” (section 4.1, printed p. 6485)

For the reported benchmark, 6,400 votes each occupy two ElGamal ciphertexts, giving 25,600 ciphertexts across input and output. The extracted verifier takes 16 minutes 13 seconds on one Intel i5 Macbook Pro core; Swiss Post takes 7 minutes 40 seconds on the same machine, using the same data and a 2048-bit safe-prime group (section 4.1, printed p. 6485). Some supplied commitments duplicate statement values or constants. The extracted verifier ignores these redundant fields and can therefore accept a transcript that Swiss Post rejects because of those fields.

Coq extraction “has not been formally verified by anyone.” (section 1.3, printed p. 6476) The paper machine-checks the interactive protocols, leaving secure Fiat-Shamir use unverified. Section 5.1 proposes checking that the encoding supplied to the hash uniquely determines the statement and commitment; machine-checking this property for Swiss Post remains future work. Inference: a Rust checker verified with Verus would likewise need its input handling and challenge generation covered before claiming verification of the complete deployed checking process.

## techniques for the catalog

- typed sigma-protocol definitions — encode rounds, relations, completeness, soundness, and zero-knowledge as reusable Coq modules
- relation-level error discovery — machine-check the claimed relation and revise it when completeness fails
- compositional shuffle proofs — prove BG subarguments separately and compose their security properties
- extracted verifier testing — extract executable code and validate deployed transcripts, including invalid-vector rejection
