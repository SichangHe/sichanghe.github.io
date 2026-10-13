# Alerus: verifying probabilistic Rust with error credits
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

Alexander Y. Bai and Joseph Tassarotti, *Verifying Probabilistic Programs in Rust*, [arXiv 2607.12282v1](https://arxiv.org/abs/2607.12282v1), July 14, 2026. [Saved PDF](/ssd1/sichangheagent/vlpw/probabilistic_rust.pdf), [extracted text](/ssd1/sichangheagent/vlpw/probabilistic_rust.txt).

Alerus extends Verus through a library, rather than a new verifier, to prove probability bounds and exact sampler distributions. The important qualification is that its mechanized semantic model does not justify every demonstrated feature. §6, p.24: “the soundness of this aspect of our encoding is not captured in AlerusBelt.” Here “this aspect” is almost-sure termination through credit amplification.

## Method and reusable techniques

An error credit is ghost state representing permission for a bounded probability of failure. §2.2, p.6: “a logical permission to execute actions that might cause an error with probability at most” the credit amount. The total-correctness interpretation counts unsafe execution, a wrong returned value and nontermination as failure. A probabilistic postcondition must be read together with its initial credit, not as an ordinary assertion about every random outcome.

1. Encode credits using Verus tracked resource algebra. §3.1, p.8: “All error credits live at a single global ghost location.” The carrier has a real-valued credit, an empty identity and an invalid element. Composition adds nonnegative values; validity requires a value in [0,1). Splitting and joining follow the existing resource interfaces. Reaching credit 1 produces a contradiction because that resource is invalid. This permits excluding a bad branch while accounting for its probability.
2. Connect randomness to ghost accounting with a trusted sampling contract. §3.2, p.9: “expectation preservation (Err-Rand-Exp) and thin air (Err-Thin-Air), are the only constructs Alerus adds as trusted axioms.” `rand_ubig` draws uniformly below an arbitrary-precision bound. A caller chooses an allocation function over outcomes; its average must not exceed the input credit. The returned credit equals that function at the actual sampled outcome. This is the bridge from deterministic SMT arithmetic to probabilistic meaning.
3. Characterize a whole distribution by preserving expectations for arbitrary bounded outcome-credit functions. §2.2, p.7: “appropriately bounding error probabilities suffices to completely characterize the distribution of values that a program can return.” The expectation-preserving transformation specification quantifies over allocations, rather than proving only one bad-event bound. Indicator allocations recover individual event probabilities.
4. Work backward from the desired returned allocation through each sampler call. §5.1, p.16: “We prove this specification by reasoning backwards from the credit allocation”. Each intermediate allocation must cover its conditional expected downstream credit. Separate pure mathematical identities from the implementation proof.
5. Prove almost-sure termination using a ghost fuel measure. §4, p.12: “find a way to bound the number of steps or repetitions that it will take to reach” credit 1. Obtain an arbitrary positive thin-air credit. For a geometric loop, double it on the continuing branch and give zero to the terminating branch; choose a finite ghost depth at which it reaches 1. The depth decreases, while executable behavior remains unbounded. This proves termination with probability 1, not a deterministic runtime bound.
6. For harder termination arguments, define finite-horizon nontermination probability recursively, prove it tends to zero, and match that recurrence to code. §4, p.13: “Isolating the pure mathematical reasoning in steps 1 and 2 from the code reasoning in step 3 helps to structure the proofs.” The one-dimensional random walk needs position-dependent allocations, not a constant amplification factor. Appendix A gives its tail reasoning; escaping spline and higher-order rejection sampling are additional examples.
7. Separate deterministic preprocessing from probabilistic sampling through a well-formed table contract. §5.2, p.20: “the probabilistic sampling step just updates credits, relying on the table being correctly structured”. The alias-table constructor proves shape, bounds and conservation of weighted mass; its sampler assumes that predicate. §5.3 repeats the pattern for the fast loaded dice roller, representing probability mass by decision-tree leaves. This is especially reusable for agents: the proof splits at a meaningful data invariant rather than arbitrary function boundaries.

## Case studies and foundations

The full paper develops discrete negative-exponential Bernoulli, geometric Bernoulli, discrete Laplace and discrete Gaussian samplers, plus Walker's alias method and the fast loaded dice roller (§5). Rejection samplers maintain one credit supply for distribution correctness and another for termination. §5, p.15: “This separates out the termination reasoning from reasoning about” sampler correctness. Appendix B proves invariant preservation for the negative-exponential Bernoulli sampler; Appendix C states the exponential Taylor bound; Appendix D proves the fast geometric sampler; Appendix E gives the Laplace credit split; Appendix F develops the Gaussian sampler; Appendix G supplies dice-roller allocation bounds.

These are proof demonstrations, not a benchmark of autonomous agent success. §1, p.3: “we employ Claude Opus 4.7 and 4.8”. The paper does not provide a controlled comparison establishing the model's success rate or the cost of a VL-style pipeline.

AlerusBelt ports VerusBelt/RustBelt by swapping the Iris weakest-precondition interface for Eris's probabilistic one. §6, p.23: “we replace the Iris weakest precondition with the Eris weakest precondition in the lower layers.” Preserving the interface allows reuse of much of the existing Rocq development. Later credits required changed logical modalities and a revised soundness argument. This is evidence that adding a small axiom surface can still require substantial foundational work.

## Trust and limits

§3.2, p.9: “We give the bignum operations trusted specifications, since verifying the bignum library itself is beyond the scope of this paper.” The primitive random generator must meet its uniform contract. §5.1, p.16 represents the exponential “as an uninterpreted function in Verus and axiomatize the properties we need.” Appendix C includes an `external_body` Taylor-tail lemma. Therefore, “two axioms” describes the new probabilistic rules, not the entire examples' trusted mathematical and library surface.

§6, p.24: “Iris's prophecy variables are known to be unsound when combined with Eris's error credits”. The model removes the returning-mutable-reference extension that depends on those variables. It also removes concurrency: “we have additionally removed concurrency”. Its weakest precondition covers partial correctness and does not model Verus decreases clauses. The mechanized theorem applies to the modeled core, not arbitrary Rust or every Verus feature.

§7, p.24 also limits expressiveness: “bounds on expected values of running times and properties like positive almost-sure termination” are examples of properties not directly captured by Alerus specifications but supported by HeyVL/Caesar. Almost-sure termination does not establish finite expected running time.

Inference: an ordinary Verus pass after adding these axioms cannot by itself establish probabilistic soundness. A VL run must identify the logic extension, enforce its compatible feature subset, and account for mathematical axioms, generator contracts and numeric libraries.

## What VL can learn and product threat

Recommendations: reuse tracked probability resources, outcome-allocation templates, backward expectation reasoning, and constructor/sampler decomposition for probabilistic targets. Keep foundation coverage distinct from accepted example proofs. Record a feature-compatibility check before permitting prophecy-based borrows or concurrency with error credits. These are proposed practices, not implemented VL changes.

The threat is specialized: Alerus already supplies probability proof infrastructure and realistic Rust sampler examples, so VL should not sell their invention as its novelty. The paper does not demonstrate autonomous specification discovery or repository-wide project generation. It is a potential enabling dependency and a specialized proof target, rather than evidence that the full VL product already exists. Inference, not from this paper: its relationship to Forte is complementary: sensitivity accounting does not prove that a noise sampler has the promised distribution.

## Evidence and VL context

Page numbers below are PDF pages unless printed pages are explicitly named. Quotations and reported results come from the linked primary paper, not an independent reproduction. Recommendations and competitive assessments are our inferences. VL's current [vision](/ssd1/sichangheagent/VeruLaw/docs/vision.md) says: “The product direction is autonomous Verus project generation.” Its intended inputs are ordinary intent, code, tests and project documents. This study does not establish that VL currently achieves that goal.

## Validation

Material quotations were checked against the PDF text. No code or published experimental results were independently reproduced.

ChatGPT cross-check completed on 2026-10-12; the checked additions are recorded above. The primary-text synthesis and independent review remain the evidence.


## ChatGPT cross-check (2026-10-12)

The complete ChatGPT answer was checked against `probabilistic_rust.txt`. These additions hold:

- Alerus adds two probabilistic rules as trusted axioms: “expectation preservation (Err-Rand-Exp) and thin air (Err-Thin-Air)” (§3.2, p. 9), while bignum operations have trusted specifications because “verifying the bignum library itself is beyond the scope of this paper” (§3.2, p. 9)
- the paper states that `external_body` specifications extend the trusted computing base (§2.1, p. 5), so “only two axioms” does not describe the whole trust surface
- the authors report that Claude Opus 4.7 and 4.8 produced the mathematical lemmas “without human intervention” (§5, p. 15), but the paper gives no controlled success-rate or cost evaluation for complete end-to-end tasks
- the model removes concurrency: “we have additionally removed concurrency” (§6, p. 24), and Caesar/HeyVL support properties “not directly captured by specifications with Alerus,” including expected running-time bounds (§7, p. 24)

The answer's termination caveats, threat rating, and interpretation of missing experimental denominators are analysis. No artifact execution was performed.

Audited 2026-10-12 against the paper: read the study and the full paper text; checked every quotation location, the credit algebra, the rand_ubig contract, the geometric-sampler and random-walk termination steps, the AlerusBelt limits, the appendix list and the trust claims. Changed: the external_body trust-base reference (paper puts it in section 2.1, p.5-6, not 3.1, p.8); one page pointer for the backward-reasoning quote (p.16 only); the Appendix B description; removed a Vosti and five-studies sentence that does not belong to this paper; marked the Forte comparison as the study's inference. Could not check: Forte (not in this paper), the unreproduced experiments, the Rocq mechanization.
