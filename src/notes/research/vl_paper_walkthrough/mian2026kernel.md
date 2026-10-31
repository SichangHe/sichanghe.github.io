# A Kernel-Checked Exclusion Certificate for Erdős Problem 647
(authored by agents unless marked 🧑)
Tag: `mian2026kernel`, [paper](http://arxiv.org/abs/2608.17880v1)

## problem and result
The paper formalizes a finite exclusion for Erdős problem 647. The target is to show that no `n` with `24 < n ≤ 10^9` satisfies `max m<n (m + τ(m)) ≤ n + 2`. The abstract states: “We give the first exclusion checked end to end by one: no solution exists with 24 < n ≤ 10^9, proved in Lean 4 with axiom closure exactly {propext, Classical.choice, Quot.sound} — no sorry, no native decide, no problem-specific axiom.” (Abstract, p. 1.) The contribution is deliberately about trust, not the largest search range: “Our range is three to ten orders of magnitude below the computational frontiers we cite; the contribution is the trust base, not the range.” (Abstract, p. 1.)

The proof turns a divisor-count witness into an interval exclusion. A kill witness `m` satisfies `m<n` and `m+τ(m)≥n+3`; it excludes every `n` in `[m+1,m+τ(m)-3]` (Section 3, p. 3). A finite chain of such intervals covers `(24,10^9]`. The Lean theorem is stated against the pinned formal-conjectures predicate and is connected to the paper's inequality by a bridge lemma (Section 4, p. 4).

## technique 1: kernel-checked witness-chain certificates
what it is
A certificate is a list of integers and certified lower bounds on their divisor counts. Each witness interval starts no later than the previous interval ends, so the chain has no gap (Section 3, p. 3). The paper calls this “a witness-chain certificate format for divisor-sum exclusions.” (Introduction, p. 2.)

when to use it
Use this when a bounded universal claim can be refuted by local counterexamples whose covered intervals concatenate. The method is finite: the generator may search, but the theorem checker only needs to validate each witness and the chain endpoints.

how it is done
1. Define a kill witness by `m<n` and `m+τ(m)≥n+3` (Section 3, p. 3).
2. Give each witness a certified lower bound `t≤τ(m)` and interval `[m+1,m+t-3]` (Section 3, p. 3).
3. Start the cover position at 24; repeatedly select a witness with `m≤C` maximizing `m+t(m)`, then advance to `m+t(m)-3` (Section 3, p. 4).
4. Require the final cover position to reach `10^9` (Sections 3–4, pp. 3–4).
5. Prove abstractly that a passing chain implies the formalized inequality is false everywhere in the covered range (Section 4, p. 4).

The reported chain lengths are 495 to `10^4`, 2,829 to `10^5`, 17,941 to `10^6`, 123,323 to `10^7`, 891,554 to `10^8`, and 6,685,922 to `10^9` (Section 3, p. 4). The 10^9 certificate is about 260 MB of Lean source (Sections 1 and 5, pp. 1, 5).

Verus form
Inference: In Verus, executable Rust could compute a witness stream while a `spec fn` describes the covered interval and a `proof fn` proves that each witness satisfies the lower-bound contract and that adjacent intervals overlap. A loop would need an `invariant` preserving the current cover position and chain-prefix correctness, plus `ensures` that the final cover reaches the target. The paper's Lean `decide` evaluation does not carry over as a Verus construct; Verus proofs instead use contracts, invariants, and solver-backed lemmas. The witness generator should remain outside the trusted proof and its output be checked by the proof code.

evidence and limits
The finite theorem is checked by Lean's kernel with exactly three standard axioms. The two lower rungs are rebuilt in continuous integration and from source on two additional machines; the 10^9 rung is kernel-checked once under clang (Section 5, p. 5). The certificate does not prove anything beyond 10^9. Chain growth makes this representation impractical: the paper projects roughly 45 million witnesses and 2 GB at 10^10, and about 2×10^9 witnesses at 10^12 (Section 6, p. 6).

## technique 2: maximal smooth-part divisor bounds with cofactor doubling
what it is
Each witness stores the maximal power of every prime below 1024 dividing `m`. The checker verifies divisibility and maximality, multiplies `(e_i+1)` for the stored powers, and doubles the result when a nontrivial cofactor remains. The paper explains: “Maximality buys one further factor: whatever cofactor of m remains above the smooth part is then coprime to it, so if the cofactor exceeds 1 it contributes at least the two divisors 1 and itself, and the certified bound doubles.” (Section 3, p. 3.) No primality certificate for primes above 1024 is needed; listed primes are checked by eleven trial divisions through 31 (Section 3, p. 3).

when to use it
Use this lower-bound construction when full factorization is expensive but a certified partial factorization and a coprime residual are enough. It is especially useful when a weakened smooth-only bound can stall interval coverage.

how it is done
1. Store pairs `(p,e)` for every listed prime power, with primes in strict decreasing order (Section 4, p. 4).
2. Check each listed prime by trial division and verify that the product of powers divides `m` (Sections 3–4, pp. 3–4).
3. Check maximality: `p^(e+1)` does not divide `m` (Section 3, p. 3).
4. Multiply `(e+1)` over pairwise-coprime powers to obtain a divisor-count lower bound (Section 4, p. 4).
5. If the residual cofactor is greater than one, double the bound; then use monotonicity under divisibility (Sections 3–4, pp. 3–4).

The paper records the failure that motivated step 5. A smooth-only checker stalled at cover position 69,030,671 on `m=69,030,650=2·5^2·13·61·1741`; the true divisor count is 48 but the smooth bound was 24 because 1741 is above the table, so the cover did not advance (Section 3, p. 4).

Verus form
Inference: Represent the factor pairs as a ghost sequence and define a `spec fn` for the product of `(e+1)`. A `proof fn` can establish pairwise coprimality, divisibility, maximality, and the residual cofactor's two-divisor contribution. Rust's executable checker can use integer arithmetic, while proof-only lemmas establish the arithmetic facts. The Verus form must avoid treating `spec fn` or `proof fn` as runtime calls; the executable path and proof path remain separate.

evidence and limits
The 10^7 chain obtained with doubling has exactly the length computed from the true divisor function, and the equality was directly verified for record-setters of the form smooth-part times one large prime (Section 3, p. 4). The bound is conservative: it can certify a chain without proving the exact value of `τ(m)`. It depends on correct maximality checks and on the finite primality test below 1024.

## technique 3: separate soundness layer and untrusted generator
what it is
The development separates a small once-proved soundness layer from bulk certificate data. A Boolean `chainOk` checker validates offsets, prime ordering, primality, divisibility, maximality, cover monotonicity, and target reachability (Section 4, p. 4). The generator is explicitly untrusted: “Because the generator is the one component a kernel cannot vouch for, it is not trusted.” (Section 5, p. 5.)

how it is done and evidence
The generator emits chunked witness lists. Each chunk is accepted by a theorem proved by a single `decide`; generated drivers compose chunks because one chunk's closing position is the next chunk's opening position (Section 4, p. 4). A second, independent Python implementation replays every witness, and a third implementation recomputes divisor counts and checks the solution set against OEIS (Section 5, p. 5). Regeneration reproduces chunk files byte for byte. The standalone `lean4checker` re-typechecks 261 compiled modules; source-built gcc and clang legs rebuild mathlib and the development with no cache and produce identical SHA-256 digests for 262 modules across three builds (Section 5, pp. 5–6).

Verus form

## what is proved, measured, and trusted
The proved claim is the bounded nonexistence theorem through `10^9`; the larger frontiers to `10^12`, `6.16×10^17`, and `9.17×10^18` are cited computations outside the Lean kernel (Section 7, p. 7). Trusted components include Lean's kernel and the three listed standard axioms, the pinned mathlib/toolchain, and the formal statement itself. The generator, scripts, compiler, hardware, and external OEIS data are not part of the theorem's trusted base, although they are cross-checked.

## techniques for the catalog
- kernel-checked witness chains: cover a bounded universal claim with gapless intervals whose witnesses are checked by a small kernel-level predicate
- maximal smooth-part bounds: certify divisor lower bounds from maximal prime powers and double for a coprime residual cofactor
- untrusted generation with independent replay: keep search scripts outside the trusted base and cross-check their output with independent implementations and reproducible builds
