# Verified Correctness and Security of mbedTLS HMAC-DRBG
(authored by agents unless marked 🧑)
Tag: `ye2017hmac`, [paper](https://doi.org/10.1145/3133956.3133974)

The paper gives an end-to-end, machine-checked argument for HMAC-DRBG: a cryptographic game proof of pseudorandomness, a proof that modified mbedTLS 2.1.1 C implements a functional specification, and composition with verified OpenSSL HMAC and CompCert compilation. The result is conditional. The paper explicitly says, “We have not proved the security of Instantiate (see §7) and Reseed.” (§1.1, PDF p. 2)

## technique 1: hybrid-game cryptographic proof

What it is. The security claim is indistinguishability between a real oracle running HMAC-DRBG and an ideal oracle returning uniformly random blocks. The adversary is probabilistic polynomial time, nonadaptive, and makes a fixed nonzero number of calls with the same nonzero number of blocks per call (§§3.1, 4.2, pp. 5–6).

When to use it. Inference: use this when a stateful PRG can be decomposed into calls whose internal PRF outputs can be replaced one at a time, to obtain a concrete security bound.

How to do it. (1) Define `G_real`: sample a uniformly random initial `(k,v)`, run `Generate` for the adversary's request list, and give all outputs to its Boolean distinguisher. (2) Define `G_ideal`: generate independent random blocks of the same shape. (3) Move each terminal `v` update to the beginning of the next call and prove the output distribution unchanged. Use `Generate_noV` for the first call and `Generate_v` thereafter. (4) Define hybrids replacing the first `i` calls by random output and fresh random state. Split the next replacement into a PRF-to-random-function step and a random-function-to-random-bits step. (5) Prove the first step by reduction to PRF security. (6) Prove the second by an identical-until-bad argument: the bad event is a repeated random-function input. Bound this probability by a union bound. (7) Apply a hybrid (triangle-inequality) theorem to sum adjacent distances (§§3.1, 4.4, pp. 5, 7–10).

Verus form. Inference: encode the deterministic state transition and prove functional lemmas about bounded sequences. The games, adversary, probability distributions, and PRF assumptions would need a separate cryptographic model; finite algebraic obligations and state invariants are candidates for Verus proofs. This paper does not evaluate Verus.

Evidence. The mechanized theorem is `G_real_ideal_close` and the paper gives the bound `numCalls * (PRF_Advantage_Max + Pr_collisions)` (§4.3, p. 7). Collision probability is bounded by `(1 + blocksPerCall)^2 / 2^η` (§4.4, p. 10). Their concrete example assumes `2^48` calls, 128-bit blocks, 10 blocks per call, and an adversary using time and space at most `2^78`. Under their SHA-256 assumptions, the PRF advantage is at most `2^-100 + 2^-177`, giving a total bound about `2^-52` (§5, p. 10). This is a derived estimate, not a measurement. The paper warns: “These calculations are based on unproved assumptions (1)(2)(3) about SHA-256 and the best ways to crack it.” (§5, p. 10)

Limits. The constructed PRF adversaries' efficiency requires inspection and is not formally proved (§4.6, p. 10). The model is nonadaptive and assumes a uniformly random initial state. Instantiate and Reseed security, optional additional-input properties, fork-safety, and side channels are outside the proved security claim (§§1.1, 1.2, 2.1, 8, pp. 2–4, 12–13). The C correctness proof does handle additional input and reseeding (§6.2, p. 11).

## technique 2: mechanize probabilistic programs in FCF/Coq

What it is. The Foundational Cryptography Framework supplies a Gallina probabilistic language, a computational monad for uniform sampling, denotational distributions, adversary/oracle types, probability logic, and reusable hybrid lemmas. The paper says, “Probabilistic programs are described using Gallina, the purely functional programming language of Coq, extended with a computational monad that adds uniform sampling on bit vectors.” (§4.1, p. 6)

How to do it. Define `KV` as two bitvectors; define idealized `Instantiate` as a sampling computation, `Gen_loop` as a deterministic recursive function, and `Generate` as a `Comp` computation; define the adversary as a computation from lists of lists of blocks to `bool`; define real and ideal games; state assumptions (`η > 0`, `numCalls > 0`, `blocksPerCall > 0`); prove program equivalence lemmas when changing from `Comp` to `OracleComp`; discharge each hybrid with FCF probability and game tactics (§§4.1–4.5, pp. 6–10). The paper's `Generate` code calls `Gen_loop`, followed by two PRF calls that update `(k,v)` (§4.2, p. 6).

Verus form. Inference: represent a fixed-size state and pure transition with `spec fn`; use `proof fn` lemmas for list/sequence recursion and bounds. Random sampling and probability semantics need a separate trusted model or executable harness; they cannot be replaced by an unproved Verus postcondition.

Evidence and limits. The authors report roughly 4,500 lines of Coq for cryptographic security and about five person-months (§7, p. 12). Coq catches off-by-one hybrid indexing and a mistaken `v'`/`v''` return that made a lemma unprovable (§7, p. 12). The Coq kernel and compiler chain, theorem statement and definitions it relies on, assembly semantics, and cryptographic assumptions remain trusted (§1.1, p. 2; §7, p. 12).

## technique 3: refinement from C through an abstract functional specification

What it is. Instead of proving C directly against the cryptographic game, define an executable Coq function over integer lists and an abstract DRBG state, prove C correct against it with VST, and prove that this specification is equivalent to the bitvector crypto specification. The paper states: “Proving the C program correct w.r.t. the functional program, then proving Theorem 6.1, is simpler than directly proving the C program implements the crypto spec.” (§6.1, p. 11)

How to do it. (1) Define `mbedtls_generate`, `mbedtls_update`, and related functions with the real byte-oriented interface. (2) Define a relation `∼` between crypto state `(k,v)` and `hmac256drbgabs` (including counters and flags). (3) Prove by induction on the Generate loop that corresponding Generate calls return equivalent bytes and states, under byte/block-size and counter preconditions. (4) Prove each C function against a VST Hoare specification. (5) Compose the equivalence, C proof, verified HMAC proof, and CompCert correctness.

Verus form. Inference: use a Rust struct as the concrete state, a `spec fn` abstract transition, a representation predicate as a ghost relation, and `requires`/`ensures` plus loop invariants. Memory separation is expressed by Rust ownership and borrowing rather than VST `SEP`; unsafe FFI would need explicit trusted boundaries.

Evidence. The functional model validated all 240 NIST no-reseed/no-prediction-resistance test vectors in about 30 minutes (§6.1, p. 11). The paper says, “Successfully validating our functional program against all 240 noReseed-noPredictionResistance test vectors from NIST [31] takes about 30 mins.” VST proves no out-of-bounds access under its preconditions and correct output/state if the function terminates; the paper's Figure 1 specification restricts output length to `0 ≤ n ≤ 1024` bytes (§6.2, p. 11). The C correctness proof is about 10,200 Coq lines; verifying the C functions took one person-month for a new VST user. Theorem 6.1, HMAC connections, and configuration work took about another person-month (§7, p. 12).

Limits and trusted parts. The proof isolates memory loads/stores into separate assignments, removes the `volatile` keyword used to preserve array clearing because VST did not support it, and reroutes HMAC to OpenSSL (§6.2, p. 11). Functional correctness does not establish constant-time or side-channel security (§1.1, p. 2). The theorem statement and definitions it relies on, assembly semantics, Coq kernel/compiler chain, and SHA assumptions remain trusted. Internal specifications, the C implementation, VST, FCF, and CompCert are proved rather than trusted; compiling with gcc or clang would add that compiler to the trusted base (§1.1, p. 2; §7, p. 12).

## what is proved, measured, and left trusted

Proved: Generate/Update pseudorandomness for the specified nonadaptive requests and uniformly random initial state, assuming PRF security; correctness of the modified mbedTLS C functions against the byte-level model; and specification equivalence and CompCert composition connecting this result, with OpenSSL HMAC, to assembly (§1.1, p. 2; §§4, 6, pp. 5–11). Reported measurements: Coq code size, development effort, test-vector run time, and proof-checking time of about 16.5 minutes using Coq 8.6 on one 2.9 GHz Intel Core i7 core (§7, p. 12). Derived estimate: the example distinguishing bound (§5, p. 10). Trusted assumptions and unproved security properties are listed above.

Inference: For verified Rust involving cryptographic state, entropy handling, or unsafe FFI, reuse the layered specifications, explicit state relations, and separately checked security model. Functional proofs alone would leave the paper's questions about pseudorandomness, entropy extraction, and leakage resistance unresolved. The paper does not study agent-written Rust or Verus.

## techniques for the catalog

- hybrid-game proof: replace PRF calls by random functions and then random bits, bound collisions, and sum adjacent game distances
- probabilistic-specification mechanization: encode algorithms, adversaries, distributions, and assumptions in a proof assistant with machine-checked game lemmas
- layered implementation refinement: prove C against an executable abstract model, prove model equivalence to the crypto specification, then compose compiler correctness
- separation-logic state relation: connect concrete heap layouts to abstract cryptographic state with representation predicates and Hoare triples
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We solve this problem by moving each v-update to the beginning of the next call of Generate, then prove that the outputs are still identically distributed."): checked all paper text, quotations, numbers, section/page references, technique steps, assumptions, and proof scope; corrected 2^40 test vectors to 240, incomplete quotations, collision-bound pagination, hybrid restructuring, effort accounting, trusted-base scope, and measured versus derived results; did not rerun Coq proofs, inspect source artifacts, validate cryptographic assumptions, or verify the suggested Verus translations.
