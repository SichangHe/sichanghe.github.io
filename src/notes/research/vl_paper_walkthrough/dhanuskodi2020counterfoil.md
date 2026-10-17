# COUNTERFOIL: Verifying Provenance of Integrated Circuits using Intrinsic Package Fingerprints and Inexpensive Cameras
(authored by agents unless marked 🧑)
Tag: `dhanuskodi2020counterfoil`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/dhanuskodi)

## result and assumptions

COUNTERFOIL authenticates an integrated circuit by binding a signed enrollment record to microscopic, intrinsic features of its molded package. Enrollment associates a computer-readable identifier with an image fingerprint; verification checks the signature and whether a new image matches the enrolled fingerprint. The abstract states: “Our method is able to authenticate chips within 150ms, which makes it suitable for real-time use in pick-and-place machines.” (abstract, p. 1255). Section 5.2 reports this runtime on an Intel Xeon CPU E5-2690 (p. 1264); integration into a pick-and-place machine is proposed, rather than demonstrated (section 3.2, p. 1258).

The security assumptions are explicit: the enroller’s private key remains secret, signatures cannot be forged without it, the enroller packages and enrolls only legitimate chips, fingerprints are unique at imaging resolution, and matching packages are difficult to forge. The attacker is profit-motivated; nation-state targeted forgeries are excluded (section 3.3, pp. 1258–1259). The approach also assumes an adversary cannot easily swap the enclosed microchip out of its package (section 2.2, p. 1256). Inference: package authentication does not establish die functionality or firmware correctness.

The paper states: “The verification procedure checks authenticity of chips at the end of distribution.” (section 3.2, p. 1258). It also states: “The four corners of the marker allow for detection of image orientation (pose estimation) which we leverage to determine the ROI for further processing.” (section 4.1, p. 1260).

## technique 1: marker-relative enrollment and signed fingerprint

What it is. During trusted packaging, attach an ArUco fiducial marker, capture the marker plus nearby package surface, extract ORB keypoints/descriptors from a marker-relative enrollment region, hash the feature record with SHA3-256, and sign it with DSA. Store `(eid, fingerprint, signature)` in a public database.

Procedure described in the paper.

1. Seal a trusted die in molded plastic and let the package cure (section 3.1, p. 1258).
2. Affix a computer-readable marker carrying the insecure enrollment identifier `eid`; use its pose to define a repeatable region of interest (ROI). The enrollment square has width 2 mm; its center is 5 mm from the marker’s top-left corner at angle π/8 (sections 3.1 and 4.1, pp. 1258, 1260).
3. Preprocess the ROI with Contrast Limited Adaptive Histogram Equalization (CLAHE); extract ORB keypoints and 256-dimensional rotated BRIEF descriptors, limiting density to 1,000 keypoints/mm² (section 4.2, p. 1260).
4. Hash the enrollment record with SHA3-256 and sign it using DSA with a 3072-bit private key (section 4.2, p. 1260).
5. Publish the identifier and signed record in the database. The implementation assumes pre-existing enroller and verifier public keys; establishing trust through a certificate authority is suggested for deployment (sections 3 and 3.1, pp. 1257–1258).

Inference: a possible Verus implementation could specify ROI bounds and descriptor-record serialization with `spec fn`s, prove that hashing/signing uses the exact serialized bytes, and require a verified signature primitive. Establishing ORB feature stability under camera noise would require a formal image model. The paper does not implement or verify Rust or Verus code.

## technique 2: geometric feature matching and RANSAC scoring

What it is. Verification extracts features from a new ROI, uses a nearest-neighbor ratio to retain the 50 strongest candidate pairs, estimates a homography with RANSAC, and counts geometrically consistent inliers. A homography maps positions between views of the same planar surface. For an enrollment keypoint to count as an inlier, its nearest candidate must have ratio score `r_i <= 0.75` and lie within two pixels of its homography-predicted position (sections 4.3.1–4.3.2, p. 1261).

Procedure described in the paper.

1. Detect the marker and retrieve its signed enrollment record. Check the signature with the enroller’s public key. Derive the verification ROI at the enrollment ROI’s marker-relative center, with width `2/√2` mm, and extract features. The smaller square remains inside the enrollment square under rotation (sections 3.2 and 4.1–4.3, pp. 1258, 1260).
2. For every enrollment keypoint, find its two closest verification descriptors and compute the distance ratio; retain the 50 lowest-ratio pairs (section 4.3.1, p. 1261).
3. Run RANSAC: sample four pairs, compute a 3x3 homography, count pairs fitting it, iterate, and keep the model with the most inliers (section 4.3.1, p. 1261).
4. Score the enrolled keypoints, rather than only the 50 pairs used to fit the homography. Count an enrolled keypoint only if its nearest verification neighbor has ratio at most 0.75 and is within two pixels of the projected enrollment point (section 4.3.2, p. 1261).
5. Accept only when the digital signature verifies and the inlier count exceeds the chosen threshold (section 3.2, p. 1258).

Inference: a possible Verus implementation could model descriptors and homography coordinates as integer or fixed-point values, with explicit rounding rules. It could prove bounds for ratio and pixel-distance predicates and that the count includes exactly the enrolled keypoints satisfying both predicates. This would leave RANSAC’s success and the OpenCV implementation unproved unless separately modeled and verified.

Evidence. The same chip matched successfully under changed rotation and scale (Figure 6, p. 1262). The main evaluation reports 52 AS6C6264 and 40 23LC1024 instances, using separate enrollment and verification cameras of the same model (section 5, p. 1262). For different-mold comparisons, receiver operating characteristic (ROC) curves achieved 100% true positives at 0% false positives for both chip models and both camera models in the evaluated dataset. For same-mold comparisons, the worst case (AS6C6264 with ViTiny) accepted 90% of legitimate chips while accepting 10% of other chips from the same mold. Same-mold areas under the ROC curve are 0.997 (23LC1024/ViTiny), 0.981 (AS6C6264/ViTiny), and 0.999 for both MustCam cases (Figure 9 and section 5.1, p. 1263). These comparisons simulate counterfeit label reuse; possession of the trusted packaging house’s mold is outside the stated trust assumption.

The paper explains the acceptance threshold: “A higher threshold is a more selective determination of authenticity.” (section 5.1, p. 1262).

## technique 3: collision and wear analysis

What it is. The paper estimates fingerprint collision probability using the measured keypoint-inlier rate and tests whether package fingerprints survive handling, heat, and different package types.

Procedure described in the paper.

1. Estimate mean enrolled keypoints and the probability that a keypoint becomes an inlier against a different mold (section 5.1, p. 1263).
2. Model false matches with a binomial distribution; the paper uses 3,936 keypoints, inlier probability 1.0E-3, and acceptance threshold 48 to estimate 5.6E-36 collision probability, equated to 117-bit entropy. These are model estimates, not observed failure rates or a cryptographic security proof (section 5.1, p. 1263).
3. Tumble enrolled chips with 45 mL water and 5 g 60-grit silicon carbide, rinse, dry, and verify after controlled durations. The adhesive labels do not survive; these experiments locate the ROI by carefully aligning the chip under the camera (section 6.1, pp. 1265–1266).
4. Compare same-chip, same-mold, and different-mold inliers under controlled alignment; for AS6C6264, same-mold maximum is 277, same-chip minimum 603, with means 113 and 825 respectively (section 6.2.1, p. 1266).

Inference: a Rust verifier could prove deterministic threshold and binomial-tail calculations for supplied inputs, subject to arithmetic precision. The binomial model requires independent trials with equal probability; the paper explicitly states the equal-probability simplification but does not establish independence. A proof of the calculation would not establish the model’s empirical validity or the imaging distributions.

Evidence and limits. The tumbler experiment retained a few hundred inliers after an hour; the authors report that most legitimate-chip authentication trials exceeded a threshold chosen to reject different chips from the same mold with 95% probability. Heating to 170°C for one hour did not change inlier counts (section 6.1, p. 1266). Ten additional package types were tested with five instances per type and five enrollment plus five verification images per instance. The preliminary results suggest identifying features in most tested plastic packages and the ceramic 14-CDIP package; the authors require further experiments for confidence. Reflective TO-39 metal and 20-WLCSP packages were unsuitable (section 6.3, pp. 1267–1269). Pixel-by-pixel comparison, analogous to a physical unclonable function (PUF) evaluation, took 10 seconds per comparison and could not handle rotation or scale changes (section 6.2.2, pp. 1266–1267).

## what is proved, measured, and trusted

Inference: the paper supplies an implemented computer-vision protocol and empirical evidence, rather than a formal proof of uniqueness or cryptographic security. A verified wrapper would still depend on the enroller, public-key trust, cryptographic and vision implementations, image acquisition, and the physical assumptions. The paper treats label removal, movement, or damage as a reliability concern because it can make chips unverifiable without falsely authenticating counterfeits. Public enrollment records can reveal production quantity and schedule, and cleartext queries can reveal consumer business information; the authors suggest private records, oblivious transfer, or anonymous credentials (section 3.3, p. 1259).

Inference: for agent-written verified Rust, the useful reusable core is the signed-record format, threshold logic, and explicit assumptions. VL should not redo generic feature extraction; it should verify serialization, signature binding, threshold decisions, and failure handling around an external vision library. The product threat is a false belief that a verified comparison proves the chip’s internal logic or supply-chain history beyond the enrolled package event.

## techniques for the catalog

- marker-relative fingerprint enrollment — anchor a package ROI to an ArUco marker, extract ORB features, hash and sign the record
- RANSAC geometric verification — retain nearest-neighbor matches, fit a homography, and count inliers under ratio and pixel thresholds
- collision-tail estimation — estimate false-match probability from keypoint count, inlier rate, and acceptance threshold
- wear and package stress testing — evaluate acceptance after tumbling, heating, camera changes, and diverse package materials
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The runtime can be further reduced to meet even tighter latency requirements by enrolling a smaller number keypoints for each chip."): read the full paper text from beginning to end and the full study; checked quotations, numbers, section and printed-page references, procedures, assumptions, and evidence limits; corrected page references, clarified ROI geometry and scoring, removed the unreconciled image total, qualified collision estimates and additional-package results, marked Verus suggestions as inferences, and replaced the link with the publisher page printed in the paper; did not rerun experiments, inspect the released implementation, or independently validate the proposed Verus proofs.
