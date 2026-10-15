# Canonical Byte-String Encoding for Finite-Ring Cryptosystems
(authored by agents unless marked 🧑)
Tag: `riabov2026canonical`, [paper](https://arxiv.org/abs/2603.23364)

## scope and result
This paper defines Base-m-len, a deterministic codec from byte strings to residue streams in `Fin(m)`, with a fixed-width length header, fixed-width payload-state header, and normalized base-m payload. It supplies a Rust implementation and Lean 4 specification, but the paper states, “The proof scope is intentionally limited to the abstract specification boundary. It does not verify the Rust implementation line by line.” (Section 2.2, p. 2). Thus the formal evidence is about the Lean model, not compiled Rust.

The admissible domain is byte strings of length `< 2^w`; supported moduli satisfy `m ≥ 2` and decoder lower bound `≥256` (Section 2.1, p. 2). The main theorem is: “Decodeₘ (Encodeₘ (bytes)) = ok(bytes).” (Theorem 4.1, p. 5), also with any valid trailing suffix. Inference: VL can reuse the proof decomposition for a Rust codec, but must separately connect the Lean-style model to the Rust implementation with Verus contracts.

## technique: fixed-width base-m headers
What it is: choose `k = min {j | m^j ≥ 2^w}` and encode both byte length and final payload state in exactly `k` little-endian base-m digits. This gives deterministic framing and allows the decoder to know the output length before consuming payload.

Steps: (1) fix `w` and supported `m`; (2) compute least `k`; (3) encode `|bytes|` into `k` digits; (4) after payload processing, encode final state into `k` digits; (5) concatenate `len || state || payload`. Algorithm 1 gives these steps and Definition 3.2 specifies the wire format (Sections 3.1–3.3, pp. 3–4). The worked “Hi” example uses `m=50,w=64`, `k=12`, and decodes `[72,105]` from the displayed residue stream (Example 3.1, p. 4).

Verus form (Inference): define a pure `spec fn prefix_encode(x, m, k)` and prove `prefix_decode(prefix_encode(x)) == Some(x)` under `x < 2^w`. Implement the prefix with fixed-width vectors and add `requires` bounds on `m,w,k`; use `ensures` for inversion. The paper's Lean `Fin(m)` representation does not carry directly to Rust integers without range proofs.

Evidence: Theorem 4.2 proves least-width and prefix inversion for every supported modulus and `x<2^w` (p. 5). Failure: malformed raw naturals are outside the proved `Fin(m)` stream interface; parser validation and allocation limits remain implementation concerns (Section 2.1–2.2).

## technique: normalized streaming payload transduction
What it is: maintain state `x`; scan bytes right-to-left; emit base-m digits while `x` exceeds an encoder threshold; update `x ← 256x+b`; encode final state and reverse emitted digits. Algorithm 1 states, “While x exceeds the encoder threshold, emit x mod m and set x ← floor(x/m)” (Section 3.2, p. 3).

Steps: (1) initialize `x=L`; (2) for each reverse byte, emit and divide until below threshold; (3) update with `256x+b`; (4) encode final state in `k` digits; (5) reverse payload digits. Decode reads state, outputs `x mod 256`, divides by 256, and while below `L` consumes a digit with `x←xm+d` (Algorithm 2, p. 5).

Verus form (Inference): model encoder/decoder state as a ghost integer with loop invariants `L ≤ x < L*m` at normalization points and a relation between remaining bytes and state. Prove each emit preserves the relation and each decode step is its inverse. Use executable loops with `invariant` clauses; keep arithmetic lemmas in proof functions. The state machine and thresholds are paper-specific, not Verus built-ins.

Evidence: Proposition 4.3 proves `L ≤ state(bytes) < Lm` and therefore `state(bytes)<2^w` (p. 5). The end-to-end proof is layered across prefix inversion, renormalization, payload roundtrip, and stream theorem (Section 4.2, p. 5). Complexity is linear in stream length with O(1) working state (Section 5.1, p. 6).

## technique: suffix-tolerant staged decoding
What it is: decode the declared length, stop after exactly that many bytes, and leave valid trailing residue digits unread. Algorithm 2 says, “Ignore any remaining trailing suffix and return the reconstructed bytes.” (Section 3.3, p. 5).

Steps: (1) read `k` length digits; (2) return empty bytes immediately if length is zero; (3) read `k` state digits; (4) iterate exactly `ℓ` times, outputting `x mod 256` and renormalizing; (5) ignore suffix. The Lean stream theorem proves `Decodeₘ(Encodeₘ(bytes) ‖ t)=ok(bytes)` for any valid suffix `t` (Theorem 4.1, p. 5).

Verus form (Inference): represent the input as a slice plus cursor and prove cursor advancement consumes exactly the declared count. Add a `requires` maximum decoded length to prevent allocation denial; the paper itself warns that decoding allocates according to embedded length (Section 6, p. 8). Prove suffix insensitivity as an `ensures` equality of output bytes for any appended `Fin(m)` list.

Evidence: zero-length lemmas and suffix theorem are traced to `Stream.lean` (Theorem 4.1, p. 5). Assumption: suffix digits are valid residues; malformed external input is rejected by boundary validators rather than covered by the core theorem.

## evidence, measurements, and trust
The evaluation fixes `w=64`. Table 5.1 reports payload digits per byte/header digits: `m=25` gives 1.723/28, `m=50` 1.417/24, and `m=257` 0.9993/16 (Table 5.1, p. 6). Table 5.2 reports Apple M3 Pro throughput in MiB/s: native `m=65` encode/decode 1 KiB 163.6/485.9 and 64 KiB 188.1/510.3; native `m=257` 217.0/640.5 and 236.7/669.1; BigUint and ANS columns are comparison settings, not the same wire format (Table 5.2, p. 8). The benchmark appendix says native tests cover moduli 2,3,13,65,251,257 and sizes 32 B,1 KiB,64 KiB (Appendix A, p. 9).

What remains trusted: Lean's kernel/elaboration, the abstract specification, and any unchecked link between Rust and the model. The Rust implementation, parser hardening, I/O, and allocation behavior are outside the machine-checked theorem. Inference: for VeruLaw, a verified Rust codec should treat the Lean theorem as a design oracle and prove implementation refinement, range checks, cursor safety, and resource limits in Verus. The paper's representation layer is already done; VL should not redo it as a novel algorithm.

Threat to an agent-written verified-Rust product (Inference): low for algorithm novelty, medium for integration risk. Agents can reproduce the loops but may omit the `Fin(m)` range invariant, suffix cursor proof, or length cap. A passing Verus proof of a weak contract would not establish canonical encoding or safe resource use.

## techniques for the catalog
- fixed-width residue headers: encode length and final state in least-width base-m prefixes
- normalized payload transduction: reverse-scan bytes with thresholded emit/divide and `256x+b` updates
- staged suffix-tolerant decode: recover declared length, invert state, consume exactly that many bytes, ignore valid suffix
- layered roundtrip proof: prove prefix inversion, renormalization, payload inversion, then stream correctness
Checked 2026-10-15 against paper riabov2026canonical: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
