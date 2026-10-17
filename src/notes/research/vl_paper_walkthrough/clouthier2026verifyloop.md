# Verify-in-the-Loop: Proof-Carrying AI Mathematics — a case study certifying, expanding, and stress-testing the Jacobian counterexample with Claude Code (Opus 4.8) and a signing verifier
(authored by agents unless marked 🧑)
Tag: `clouthier2026verifyloop`, [paper](https://doi.org/10.5281/zenodo.21567374)

## workflow and trust split

The paper separates proposal from adjudication. A human sets direction and stopping decisions; Claude Code running Opus 4.8 writes candidate mathematics and checks; Attestral compiles candidates, runs a checker ladder, and signs only passing results. “The proposer (an AI) and the adjudicator (a signing verifier) are different agents; a result becomes a certificate only when the checker, not the model, accepts it” (Figure 1, p. 3). A failed check returns a counterexample to the proposer.

Attestral binds exact code, verdict, and a content hash in an ed25519 certificate. The paper distinguishes 23 exact-symbolic certificates (22 exploratory identities plus a companion result) from 20 Lean-kernel proofs. It states: “A certificate is always both signed and tiered; neither substitutes for the other” (Section 2, p. 4). Signature authenticity does not make an exploratory computation a theorem. The standalone verifier checks the hash and signature offline and can optionally rerun the public checker ladder.

## technique 1: use a checker ladder with explicit assurance tiers

Use the strongest checker a candidate supports, but label weaker results honestly. The reported ladder includes exact SymPy/Hypothesis/CrossHair checks, finite-field and Gröbner computations, and Lean 4 plus Mathlib kernel proofs. The paper’s load-bearing structural results were re-proved in Lean: “20 axiom-audited kernel proofs” (Section 1, p. 2). Exact symbolic checks are decisive only for the decidable identity they execute; they are not proof-assistant proofs.

Inference: this ordered list is my synthesis of the paper's ladder (Section 2, Table 3), not a procedure the paper numbers. Step by step: (1) define the candidate and a small executable checker; (2) run static checks and tests; (3) run exact symbolic identities or bounded searches; (4) for a claim that matters, formalize it in Lean and require a kernel proof with no `sorry`; (5) record the tier in the receipt; (6) publish the code, certificate, key, and offline verifier. The artifact ledger contains 43 receipts, and `python verify_all.py` checks them grouped by rung (Section 11, pp. 8–10).

Inference: a Verus ladder can put ordinary Rust tests and linting below Verus proof checking, with stronger independent models or kernel-level checks above it where available. Do not label a test, bounded search, or `external_body` assumption as a Verus proof. This adaptation is not in the paper.

## technique 2: verify the verifier and its tooling

Before trusting a novel checker, test it against known positive and negative examples. For the nilpotent normal-form episode, the authors first certified the checker itself: it accepted a triangular nilpotent cubic, flagged it as injective, rejected a non-nilpotent decoy, and detected the known collision (Section 9, p. 7). Inference: this catches checker bugs before they influence a claim.

The workflow also re-runs calculations with independent settings. The paper reports that a command-line argument aliased the working prime onto the compensator-degree flag, silently running the Gröbner closure over GF(3) instead of GF(32003), and it still returned a clean-looking “obstructed” verdict. A “verify-the-verifier” check found that the nullspace rank differed from the two-prime re-run; the result was discarded and recomputed (Section 8, p. 7). The paper’s exact description is: “The verdict was discarded and recomputed at proper primes before any claim.”

## technique 3: let refutations drive repair and report walls

The proposer writes candidates with checks; the adjudicator returns counterexamples; the proposer revises. In the Jacobian study this caught two false constructions and the finite-field error. The paper emphasizes that “A refutation is not a failure but the steering signal for the next proposal” (Figure 1, p. 3).

The same process must report an unresolved limit. For the nilpotent normal form, low-dimensional families were refuted, a literature reduction was checked, and then execution exceeded 200 auxiliary variables. The authors conclude that existence is guaranteed and each construction step is verified, but a small explicit map was not obtained (Section 9, pp. 7–8). Inference: this prevents a search failure from being narrated as a proof.

Inference: in Verus, preserve failing counterexamples and classify a loop as proved, refuted, or unresolved. A failed proof attempt must not be “fixed” by weakening `requires` or `ensures` without recording that semantic change. This is an inference; the paper’s examples are mathematics, not Rust.

## what the evidence establishes

The 20 Lean proofs establish the listed structural theorems under Lean and Mathlib. The 23 exact-symbolic certificates establish only their executed identities or bounded computations. The workflow caught three self-errors and discarded them, and it checked Long's counterexample to the Gaussian Moments Conjecture through m ≤ 4 while explicitly saying the all-m claim came from the cited paper, not its certificate (Section 10, p. 8). Inference: these denominators and ceilings matter: “our check is exact through m = 4; the all-m statement is proved in [12], not by our certificate.”

Inference: the trusted components include the Lean kernel and Mathlib axioms, exact algebra implementations, checker code, compiler/toolchain, published key, and the human’s interpretation and stopping decisions. The paper says the signature proves authenticity (“this exact code, this verdict, issued under the published key, untampered since”); that it does not establish the truth of an inadequately specified claim is my reading. The paper says the workflow is strong at “independent verification at the speed of generation” and weak at “inventing genuinely novel theorems” (Section 12, p. 11).

Inference: this is a direct threat to an agent-generated verified-Rust product only if product trust treats a successful local proof as authorship-independent evidence. The defense is independent verification, signed immutable artifacts, explicit trust tiers, and visible unresolved cases. The paper does not measure software defects or Verus, so the threat estimate is an inference.

## techniques for the catalog

- proposer–adjudicator separation — an independent checker signs only code that passes
- assurance ladder — label exact computation, bounded checking, and kernel proof as different tiers
- verifier self-tests — validate the checker and tooling on known positives, negatives, and independent reruns
- refutation-driven loop — feed counterexamples back for repair and publish unresolved walls
