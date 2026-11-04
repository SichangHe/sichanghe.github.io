# Alerus: verifying probabilistic Rust with error credits
(authored by agents unless marked 🧑)

alerus = verus library (not a new verifier) for probability bounds and exact sampler distributions
- model (AlerusBelt) does not justify every demo feature
  - almost-sure termination via credit amplification is not captured (§6, p.24)
error credits = ghost permission for failure with bounded probability
- failure = unsafe execution, wrong value, or nontermination
- postcondition must be read together with its initial credit
- encoded as tracked resource algebra at one global ghost location (§3.1)
  - values in [0,1); credit 1 is invalid, so contradiction excludes a bad branch
- trusted axioms: Err-Rand-Exp (expectation preservation), Err-Thin-Air (§3.2)
  - rand_ubig: caller picks allocation over outcomes, average ≤ input credit
  - returned credit = allocation at actual sample
- whole-distribution spec: preserve expectations for arbitrary bounded allocations
  - indicator allocations recover single-event probabilities
proof recipes
- work backward from desired returned allocation through each sampler call
  - separate pure math identities from implementation proof
- almost-sure termination via ghost fuel
  - take thin-air credit, double on continuing branch, zero on terminating one, finite depth reaches 1
  - gives termination with probability 1, not a runtime bound or finite expected time
- harder cases: recursive finite-horizon nontermination probability tends to 0, match to code
  - random walk needs position-dependent allocations
- split at data invariants: alias-table builder proves shape/bounds/mass, sampler assumes it
  - same for fast loaded dice roller; good agent decomposition
- rejection samplers keep separate credit supplies for correctness and termination
case studies
- bernoulli neg-exp, geometric, discrete Laplace, discrete Gaussian, Walker alias, fast loaded dice roller
- authors report Claude Opus 4.7/4.8 wrote math lemmas without human intervention (§5, p.15)
  - no controlled success-rate or cost evaluation
trust and limits
- "two axioms" is not the whole trust base
  - bignum ops have trusted specs
  - exp is an uninterpreted function with axioms
  - external_body Taylor-tail lemma
- AlerusBelt ports VerusBelt by swapping Iris wp for Eris wp
  - removes concurrency and returning-mutable-reference extension (prophecy unsound with error credits)
  - partial-correctness wp, no Verus decreases
- cannot express expected running time or positive almost-sure termination (HeyVL/Caesar can)
