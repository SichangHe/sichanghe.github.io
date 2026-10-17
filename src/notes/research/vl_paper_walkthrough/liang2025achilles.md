# Achilles: A Formal Framework of Leaking Secrets from Signature Schemes via Rowhammer
(authored by agents unless marked 🧑)
Tag: `liang2025achilles`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/liang-achilles)

## scope and result

Achilles turns Rowhammer fault attacks on signature implementations into a reusable analysis. It abstracts a signature scheme as `G-sign` with `Gen`, `Sign`, and `Vrfy`, classifies parameters as public (`pp`) or secret (`sp`), models a persistent one-bit fault, then asks whether a valid signature can be recovered after the fault. Public-parameter faults are analyzed with differential fault analysis (DFA); secret-parameter faults are analyzed with signature correction analysis (SCA). The authors add SCARA, a Pollard-Rho-style hash-collision algorithm for recovering SCA's remaining bits, which they claim needs only O(1) memory.

The paper's abstract reports six evaluated schemes (BB short, EdDSA, ML-DSA, RSA, Elgamal, and BLS), five assigned CVEs, “all six schemes are proved to be vulnerable”, two new vulnerable parameters for EdDSA, and a successful Rowhammer attack against 3 of these schemes (Abstract, p. 6757). Section 5 words the six-scheme result as “potentially vulnerable”. The threat model assumes an unprivileged user process on a modern Linux OS, knowledge of the scheme (including secret-key bit length and public key), the ability to query the scheme at runtime, and DRAM vulnerable to Rowhammer (Section 3, p. 6759). The paper says: “Achilles mainly describes a formal procedure where Rowhammer faults are induced to key parameters of a generalized signature scheme, called G-sign, and a post-Rowhammer analysis is then performed for secret recovery on it.” (Abstract, p. 6757)

## G-sign abstraction and game

What it is. `Gen(1^n)` creates `(pk,sk)`. `Sign(pk,sk,m)` chooses or derives randomness `r`, hashes possible inputs into `h`, and computes `σ = P(pk,sk,h,r,m)`. `Vrfy(pk,m,σ)` returns a bit. `G-sign` records three public parameters (`pk`, `h`, `m`) and two secret parameters (`sk`, `r`), while a concrete scheme may map only the parameters relevant to its equations (Sections 4.1–4.2, pp. 6759–6760; Figure 1, p. 6760).

How to apply it.

1. Write the concrete scheme's key generation, signing, and verification equations in `G-sign` form (Section 4.2, p. 6760).
2. List each concrete parameter under `pk`, `sk`, `h`, `m`, or `r`; omit intermediate values that do not contribute to G-sign (Section 5, p. 6763).
3. Define `OSign` to return valid signatures and record queried messages `M`.
4. Define a fault function `f_i(x)`: choose a random bit position, XOR that bit with one, record its position and post-flip value in `f_i^set`, and return the changed parameter (Figure 2, p. 6761).
5. Define `OFSign(i,pk,sk,m)` with only `f_i` active and all other fault functions void; apply the fault through subsequent computations, record fault information `F_f`, and record messages in `M_F` (Figure 2, p. 6761).
6. Run `Exp_F`: generate keys, give the adversary `OSign` and `OFSign(i,·)` access, and let it output `(m*, σ*, f*)`. The challenger verifies `σ*` and returns 1 if it is valid and `m*` is in neither `M` nor `M_F` (a new message; per the paper, the fault was in `pp`), returns 2 if it is valid, `m*` is not in `M` but is in `M_F`, and `f*` is in `F_f` (a corrected faulty signature with known flip position and value; the fault was in `sp`), and otherwise returns 0 (Figure 3 and its text, pp. 6760–6761).

The success tests on `M`, `M_F` and `F_f` mean a message already answered by `OSign` cannot count as a recovery. It also models permanence: a bit flipped in `sk` can affect `h` and then `σ`, rather than disappearing after one operation. The paper states: “Existing fault formulation [42, 43] do not account for this persistent nature of Rowhammer-induced faults.” (Section 4.2, p. 6760)

Inference: in Verus, this abstraction can be represented by a specification-level record for key parameters and a `spec fn` describing `Sign` and `Vrfy`; a proof function can establish that a modeled one-bit transition preserves the fault record and the game predicates. The actual cryptographic equations would need suitable field/group specifications, and Rowhammer hardware behavior remains trusted. Verus code should use supported `requires`, `ensures`, `spec fn`, `proof fn`, and `old`, rather than treating the model as executable cryptography.

## DFA for public faults

DFA applies when a public parameter is faulted. The procedure in Algorithm 1 is: parse the scheme to `G-sign`; for each `p ∈ {m,pk,h}`, request a valid `σ` from `OSign`, identify its parameter index `i`, request a faulty `σ′` from `OFSign(i,·)`, and test whether `(σ−σ′)=sk′·g(pp)`. If the coefficient `g(pp)` is computable from public data, solve `sk′=(σ−σ′)/g(pp)` (Algorithm 1 and its text, pp. 6761–6762).

Use this when the signing equation is linear in the secret and the faulted public parameter changes a public coefficient. In EdDSA, faulting `h` gives `σ−σ′=(h−h′)s`, so `s=(σ−σ′)(h−h′)^{-1}`; faulting `R`, `P`, or `m` can also work because each contributes to `h=H(R||P||m)` (Section 5.2, p. 6764). In ML-DSA, faulting `c` changes `z=y+cs1`; two signatures recover `s1` when `(c′−c)` is invertible (Appendix A.1, p. 6775). For Elgamal, RSA and BLS the paper reports no successful DFA because the signature does not satisfy the linearity property of Algorithm 1 (Appendix A.2–A.4, pp. 6775–6776); BB short also has no DFA because `sk` and `h` are in a denominator (Section 5.1, p. 6763).

Inference: a Verus proof can state a field equation and prove the subtraction/division recovery under nonzero-denominator preconditions. It cannot prove the cryptographic hash or group implementation unless those are modeled and trusted. The attack's “public” status concerns the parameter's equation, not safe exposure of the underlying implementation.

## SCA for secret faults

SCA applies when a secret parameter is faulted and the attacker corrects a faulty signature into a valid one. Algorithm 2 initializes recovered bits `sk′` to zero, loops over secret parameters, obtains `σ′`, enumerates one-bit correction candidates `∆`, and checks `Vrfy(pk·g(pp,∆d),m,σ′)`. A successful correction increments the recovered count and XORs `∆` into `sk′`; Algorithm 2 loops while more than 50 bits remain unrecovered, and the text says SCA is finished when fewer than 50 remain (Algorithm 2 and text, pp. 6761–6762).

Use this when the faulty secret contributes an additive or otherwise publicly correctable term. For EdDSA, a fault `s′=s+∆s` yields `σ′B=R+h(P+∆sB)`; with `g(pp,∆)=∆sB` computable from public data, the attacker can find the flipped bit in `s` (Section 5.2, p. 6764). BB short's secret `s` is likewise SCA-vulnerable via `g(pp,∆s)=g_2^{∆s}` (Section 5.1, p. 6763). The paper reports that schemes with longer secret keys are more resilient to SCA, while DFA is unaffected by key length (Section 8.1, p. 6769).

Inference: in Verus, model the correction relation as a lemma over a ghost bit-vector and prove that a successful verification predicate identifies the candidate bit, with explicit modular-inverse and range assumptions. Do not write a runtime `proof fn` call or claim that proving the equation verifies the cryptographic library; the paper's evidence is symbolic analysis and experiments.

## SCARA remaining-bit recovery

SCA may leave `w` unknown bits. SCARA splits `x=x^(k)+x^(w)`, computes a public-key adjustment using known bits, and defines a custom hash whose collision reveals `x^(w)`. For BB short, `H_P(r1,r2)=g^{r1}Q′^{r2}`; a collision gives `g^{x^(w)}=Q′` and solves `x^(w)=(r1−r1′)(r2′−r1)^{-1}` (Section 4.4.1, p. 6762). Algorithm 3 starts both `s` and `s′` at a random `s0`, advances `s` by one application of `f` and `s′` by two per iteration until `s = s′`, then resets one pointer to `s0` and steps both until `f(s) = f(s′)`, and solves for `x^(w)` from that pair (Algorithm 3, p. 6763). The paper cites Theorem 1 (“if sI = sJ with 1 < I < J ≤ q, then there is an i < J such that si = s2i”) for correctness, and argues time `O(√2^w)` (birthday attack) and space `O(1)` (two temporary variables) (Section 4.4.1, p. 6762). Inference: this is Floyd-style cycle finding.

Evidence: Table 4 compares recovery of 55 remaining bits. For BB short, brute force uses 21.4 MB and times out, Jolt uses 5,810.2 MB and 960.5 s, and SCARA uses 21.6 MB and 770.4 s. For EdDSA, the corresponding values are 21.7 MB/timeout, 7,240.5 MB/1,201.1 s, and 21.8 MB/1,160.2 s (Table 4, p. 6767). The paper says SCARA uses 0.65% of Jolt's memory on average, and that SCARA is unsuitable for ML-DSA because its secret key is a 32,768-bit array (Section 6.4, p. 6767).

Inference: a Verus model can prove the cycle-search loop's termination with a finite-domain `decreases` measure and prove the collision-to-secret algebra under group axioms. The `O(1)` memory claim concerns the implementation's temporary state, not a proof that the hash or group is collision-resistant.

## AutoVuln symbolic identification

AutoVuln automates the manual mapping. The user supplies seven lists: `pk`, `sk`, `h`, `m`, `r`, signing relations, and verification relations. Pre-processing converts symbols and equations into SymPy expressions. Public analysis substitutes a fresh faulty symbol for each `pk`, `h`, and `m` parameter, extracts the faulty-versus-valid signature difference, and flags a parameter if all secret-key coefficients are public. Secret analysis substitutes `s+df`-style faults, checks whether the `df` coefficients are public, and tests whether subtracting them satisfies every verification relation (Section 5.3, pp. 6764–6765).

Table 3 (p. 6765) reports execution under 100 ms per scheme: BB short 64.0 ms, EdDSA 75.2 ms, ML-DSA 85.0 ms, Elgamal 66.9 ms, RSA 54.5 ms, and BLS 52.2 ms. The identified parameters are table entries, not successful hardware attacks. Inference: a verified Rust reimplementation should prove parser-to-equation consistency and symbolic substitution soundness; SymPy and the concrete solver remain trusted unless separately verified.

## end-to-end attack procedure and evidence

After symbolic identification, the attack profiles physical memory, massages pages, faults the parameter, and recovers the key. Profiling (12 GB of physical memory) obtains 2 MB blocks, reverse-engineers the DRAM bank/row mapping with DRAMDig, uses TRRespass to find a hammer pattern, hammers four page pairs 250,000 rounds each, and records bit-flip offsets (Sections 6.1–6.2, pp. 6765–6766). Memory massaging releases pages and coerces Linux's Buddy Allocator to reuse a vulnerable page at the target parameter's 4 KB offset. Signals suspend the victim after parameter initialization, extending the narrow fault window (Section 6.3, p. 6766).

The setup uses Ubuntu 22.04, Linux 6.1.66, an Intel i3-10100, two Apacer DDR4-2666 8 GB DIMMs, and libraries relic-toolkit-0.6.0, wolfssl-5.6.6, and liboqs-0.10.0 (Section 6.1, p. 6765). For the secret key, DFA after faulting public parameters needs only one faulty signature: the authors recovered the EdDSA key after faulting P and m, and the ML-DSA key after faulting c (Section 6.4, p. 6766). For SCA (private parameter faulted), in 15 hours BB short recovered 78 unique bits from 631 faulty signatures out of 1,822; EdDSA recovered 85 from 834 out of 4,120 (Section 6.4, p. 6767). For ML-DSA no exploitable flips were found in the 3 least significant bits of the DDR4 DIMMs, so the authors used a Samsung DDR3-1300 4 GB DIMM in a Lenovo T420; within 6 hours of double-sided hammering on 0.6 GB they observed 1034 flips from 1 to 0 and 1339 from 0 to 1, and recovered 38 unique bits in 12 hours (Section 6.4, p. 6767). Against wolfSSL-5.7.4 with hardening, the authors ran 1000 trials for each scheme and succeeded in faulting the targeted opcode on the 676th attempt for RSA and the 908th for EdDSA; after the bypass, RSA (1024-bit `d`) yielded 65 unique bits from 861 faulty signatures in 8 hours and EdDSA (256-bit `s`) 35 unique bits from 679 faulty signatures in 8 hours (Section 7.3, p. 6769).

These denominators and hardware settings matter: the ML-DSA result uses DDR3, while the primary setup uses DDR4. Inference: the paper's “all six schemes are proved to be vulnerable” rests on the symbolic and algebraic analysis; hardware attacks cover 3 schemes in the main evaluation (Section 6) plus the hardened RSA and EdDSA runs (Section 7.3), and full key recovery was shown only through DFA for EdDSA and ML-DSA. The paper says: “The analysis described in Section 5.1 and Section 5.2 is performed manually.” (Section 5.3, p. 6764)

## techniques for the catalog

- G-sign abstraction — map a concrete signature implementation to `Gen`, `Sign`, `Vrfy` and public/secret parameter classes
- persistent fault oracle — model one-bit Rowhammer faults that propagate through later signing computations
- game-based recovery test — distinguish new-message key recovery from replayed oracle output
- differential fault analysis — recover a secret from valid/faulty signatures when a public coefficient is computable
- signature correction analysis — enumerate one-bit corrections to a faulty secret and accept those that restore verification
- SCARA — recover remaining bits with a Pollard-Rho-style hash collision using `O(√2^w)` time and `O(1)` space
- AutoVuln — use symbolic substitution and coefficient checks to screen mapped parameters for DFA/SCA vulnerability
- signal-extended Rowhammer — suspend the victim after parameter initialization to hit a narrow timing window
- memory profiling and massaging — align vulnerable DRAM bit offsets with target parameters or branch opcodes
- fault-bypass testing — fault verification conditionals before faulting a cryptographic key parameter
