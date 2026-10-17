# Certified Side Channels
(authored by agents unless marked 🧑)
Tag: `garcia2020certifiedsidechannels`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/garcia)

## result and scope

Certified Side Channels shows that standards-compliant key encodings can select insecure execution paths in cryptographic libraries. The abstract says: “We demonstrate that the format in which private keys are persisted impacts Side Channel Analysis (SCA) security.” (abstract, p. 2021). The authors call the resulting issue “Certified Side Channels, since the novel attack vector is deeply rooted in cryptography standards.” (section 1, p. 2021). They study OpenSSL and mbedTLS, then recover an OpenSSL ECDSA private key through remote timing and electromagnetic (EM) leakage.

The EM attack assumes physical proximity; the timing attacker is a normal network user (section 4, p. 2031). Inference: mathematical equivalence of key objects does not imply equivalent constant-time implementations. A Verus proof of arithmetic correctness or memory safety does not prove constant-time behavior, parser-path equivalence, or resistance to microarchitectural leakage.

## technique 1: Triggerflow path auditing

What it is. Triggerflow runs debug-invocation lines under a debugger, records execution paths leading to annotated points of interest (POIs), and turns known vulnerable paths into regression tests. The paper states: “Triggerflow [40] is a tool for tracking execution paths, previously used to facilitate SCA of OpenSSL.” (section 2.5, p. 2025).

Inference: How to apply it.
1. Annotate source functions already known to be non-constant-time as POIs and add false-positive filters (section 2.5, p. 2025).
2. Compile binaries and shared libraries with debug symbols (section 3, p. 2025).
3. Put preparation commands in a text file; prefix only security-critical trigger commands with `debug`, such as key generation, signing, or validation (section 3, p. 2025).
4. Run each trigger and inspect whether execution reaches a POI. Treat a hit as a potential SCA vulnerability, then root-cause the path (section 3, p. 2025).
5. Keep the trigger tests in continuous integration across supported library branches (section 2.5, p. 2025).

Inference: Verus form. A Rust project can model a constant-time policy as a ghost trace and prove that secret-dependent branches are absent in a specified function. Path auditing remains complementary: a proof covers cache occupancy, instruction timing, or external library calls only to the extent that its model represents them. External cryptographic primitives require a separately justified constant-time contract.

Limits. Triggerflow has no automatic POI discovery; the authors recommend leakage detectors such as CacheAudit, templating, CacheD, or DATA to find and filter candidate POIs before adding annotations (section 2.5, p. 2025).

## technique 2: test equivalent encodings and optional fields

What it is. Generate semantically equivalent keys with different encodings and compare the selected implementation. The paper tests OpenSSL ECDSA P-256 keys encoded as named curves, explicit parameters, and explicit parameters with the optional cofactor removed. Named curves reach the constant-time `ecp_nistz256_points_mul`; explicit parameters reach generic `ec_scalar_mul_ladder`; a missing/zero cofactor reaches vulnerable `ec_wNAF_mul` (section 3.1, pp. 2025–2026).

The authors also examine DSA PVK and MSBLOB parsing, RSA validation, and mbedTLS RSA loading with parameter subsets; the mbedTLS inputs include invalid keys, so these are not all equivalent encodings (sections 3.2–3.4, pp. 2026–2029).

Inference: How to apply it.
1. Enumerate serialization choices permitted by the standard, including omitted optional parameters (sections 2.2 and 3, pp. 2022, 2025).
2. Construct one cryptographically equivalent key per choice; for ECDSA use `ec_param_enc:named_curve`, `ec_param_enc:explicit`, and an ASN.1 edit removing the cofactor (section 3.1, p. 2025).
3. Invoke the same signing, validation, or loading operation for every key and compare Triggerflow paths (section 3, p. 2025).
4. Treat a POI hit as a potential SCA vulnerability, inspect the secret-dependent computation, and retain the trigger for regression testing (sections 2.5 and 3, p. 2025).
5. For mbedTLS, fuzz all 2^8 combinations of the eight PKCS #1 RSA parameters, retaining only reports that reach secret-dependent POIs (section 3.4, pp. 2028–2029).

Inference: Verus form. Define a canonical key predicate and prove that each parser representation maps to the same mathematical key. Separately specify a `constant_time` or path-independence contract for secret inputs; this cannot be inferred from functional equality. Use `requires` for complete parameter sets or explicitly prove safe handling of each omission.

Evidence. The mbedTLS fuzzing generated 256 parameter combinations and four report classes: 216 invalid, 8 public, 16 hitting CRT-related POIs, and 16 hitting CRT and private-exponent POIs (section 3.4, p. 2029). OpenSSL’s RSA validation uses variable-time Miller–Rabin exponentiation, Montgomery-setup inversion, GCD, and CRT-coefficient inversion; the constant-time flag is unset on the affected dispatch paths, while `BN_gcd` ignores it entirely (section 3.3, pp. 2027–2028). mbedTLS computes the CRT coefficient using a binary extended Euclidean algorithm on every RSA private-key load, even when all parameters are present; missing `d` additionally triggers GCD and private-exponent inversion (section 3.4, pp. 2029–2030).

## technique 3: remote timing attack with lattice recovery

What it is. OpenSSL’s vulnerable ECDSA path makes signature time correlate with nonce bit length. The attack collects many network timings, keeps the fastest responses, converts that partial nonce information into a hidden-number problem, and solves a lattice.

Inference: How to apply it.
1. Run unmodified `uts-server` v0.2.0 linked to an unmodified debug build of OpenSSL 1.1.1a, with an explicit-parameter P-256 key whose cofactor is zero (section 4, pp. 2030–2031).
2. Use a custom TCP client: send all but the final request byte, start a timer, send the final byte, read the response headers and one response-body byte, stop the timer, and record timing plus signature (section 4.1, p. 2031).
3. Collect 500,000 traces, sort by latency, and retain the first `t=128` as shorter-than-average nonces (section 4.1, p. 2031).
4. Use an approximate nonce bound `k < n/W`, with `W=2^7` chosen empirically despite some traces violating the bound; form instances using `d=60` signatures, attempt `j=55,000` jobs, and limit each job to 100 lattice reductions (section 4.1, pp. 2031–2032).
5. Recover the long-term secret key from a successful lattice job; on failure, collect more traces or adjust the lattice parameters (section 4.1, p. 2032).

Inference: Verus form. Given ECDSA relations and nonce bounds as preconditions, a Verus model could prove the equations used by a lattice-instance builder. The timing-to-nonce relationship still needs empirical evidence; the paper does not supply a Verus model or proof.

Evidence. Repeating the attack 100 times yielded a 91% success rate over Ethernet; 91 of 100 attacks succeeded, with a median 1,377 jobs over all attack instances, while each of nine failures attempted 55,000 jobs (section 4.1, p. 2032). The denominator and setting are essential: 91/100 is this Pine64-LTS, Ethernet, OpenSSL 1.1.1a setup, not a universal probability.

## technique 4: EM trace alignment and lattice recovery

What it is. The EM attack captures ECDSA traces near a SoC, finds the end of point multiplication, rejects interrupted/noisy traces, identifies the final Add operation, estimates the number of Double operations, and feeds nonce information into a lattice.

Inference: How to apply it.
1. Capture with a near-field probe and oscilloscope synchronized to the timestamp request; the experiment uses 125 MSps sampling on a Pine64-LTS (section 4.2, p. 2033).
2. Filter traces by peak-to-RMS quality, low-pass filter, Hilbert-demodulate, and apply an RMS envelope to isolate a soft end-trigger; average the trigger patterns from 20 random traces to form a template and match it using Euclidean distance (section 4.2, p. 2033).
3. Discard traces with no acceptable trigger match or an interrupt at the end of point multiplication. Separately band-pass the raw trace around 40–50 MHz, apply a Hilbert transform, smooth, detect the peak envelope, and template-match Add peaks to reject false positives (section 4.2, p. 2033).
4. Estimate the Double count from the sample distance between the middle of the last Add and the end of point multiplication; use K-means to retain sequences close to their cluster means (section 4.2, pp. 2033–2034, figure 6).
5. Remove signatures classified as ending in an Add with no trailing Double operations; draw random signature subsets to build lattice instances and run them in parallel (section 4.2, p. 2034).

Inference: Verus form. A verified Rust signal pipeline can prove buffer bounds, filter-index arithmetic, and deterministic trace classification for a fixed-point model. Claims about analog leakage, template separability, and the physical probe need evidence beyond those software properties.

Evidence. Of 500 signatures, 422 remained after signal filtering and 172 remained after removing signatures classified as ending in “A”; 120-signature lattice bases were drawn into 48 instances, and the first successful instance recovered the key in just over three minutes on a 24-core/48-thread Xeon system. Four of 172 signatures were misclassified, an error rate of about 2.3% (section 4.2, p. 2034).

## mitigations and trust boundary

The authors patched OpenSSL by computing cofactors from field cardinality and generator order using the Hasse Bound, setting `BN_FLG_CONSTTIME` on vulnerable paths, replacing variable-time GCD, canonicalizing explicit curves to named curves where possible, and adding Triggerflow tests; no POIs triggered after applying all fixes across non-EOL OpenSSL branches and the development branch (section 5, p. 2034). Inference: these path checks and experiments do not establish that all library paths are constant-time.

Inference: the product threat to agent-written verified Rust is a trusted dependency whose parser selects a weaker implementation despite a mathematically valid input. VL should make serialization canonical where feasible, specify behavior for omitted fields, and include path-equivalence and constant-time checks beside functional Verus proofs. Existing Triggerflow and the published fixes mean VL should not redo generic side-channel test infrastructure; it should verify the Rust-level contracts and audit the external cryptographic library boundary.

## techniques for the catalog

- Triggerflow regression auditing — annotate leakage POIs, execute format-specific triggers, and keep path checks in continuous integration
- encoding differential testing — compare execution paths for mathematically equivalent keys and optional-field variants
- remote timing lattice attack — select short-nonce signatures from network latency and solve a hidden-number lattice
- EM trace attack — align, filter, and template-match side-channel traces before lattice key recovery
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This significant bit length difference between mbedtls_mpi_inv_mod inputs makes this algorithm extremely vulnerable to SCA [8]."): checked all quotations, numbers, section and page references, technique steps, and the publisher link; corrected POI-hit interpretation, RSA leakage details, timing terminology, EM filtering and alignment, and page references; removed unsupported recovered-key validation steps and marked Verus proposals as inference. Did not reproduce experiments, inspect library source or cited works, or validate the proposed Verus models.
