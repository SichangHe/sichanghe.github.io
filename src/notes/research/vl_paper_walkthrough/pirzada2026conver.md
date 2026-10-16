# ConVer: Using Contracts and Loop Invariant Synthesis for Scalable Formal Software Verification
(authored by agents unless marked 🧑)
Tag: `pirzada2026conver`, [paper](https://doi.org/10.48550/arxiv.2605.27051)
## problem and method
ConVer is a top-down compositional verifier for C programs. It starts from a top-level assertion, asks an LLM to synthesize function contracts, and checks both an abstract system and concrete functions with ESBMC. The abstract states: “a top-down compositional verification tool.” (Abstract, p. 1). The LLM proposes annotations; ESBMC makes verification decisions, so the paper says: “delegates verification decisions to ESBMC” (Section II, p. 3).

The method addresses state explosion by replacing calls with contracts at system level and checking implementations against contracts in isolation at function level.

## technique: top-down contract derivation

What it is and when to use it

Derive only the precondition, postcondition, and frame needed to prove the system assertion, instead of specifying every semantic detail of every function. Use it for multi-function programs where monolithic bounded model checking times out.

How to do it

1. Extract the top-level property φ from `main` and all non-main functions F (Algorithm 1, p. 4)
2. Partition functions by a complexity score σ(f) against threshold τ into low and high sets
3. Ask the LLM to synthesize contracts for low-complexity functions and conservative over-approximations for high-complexity functions (Algorithm 1, p. 4)
4. Replace each call at system level with an abstract stub that assumes the precondition, havocs only assigned locations, and assumes the postcondition (Equation 1, Section IV-A, p. 5)
5. Check the system property with ESBMC, then check every implementation against its own contract (Algorithm 1, Steps 3–4)
6. Accept only when both system and all function checks pass; this is assume-guarantee composition (Section IV-A, p. 5)

A contract is a triple `(P,Q,S)`: precondition P, postcondition Q relating pre/post states, and assigns set S (Section IV-A, p. 5). The paper’s C shape is `__ESBMC_requires`, `__ESBMC_ensures`, and `__ESBMC_assigns`; its `increment` example requires `x > 0`, assigns x, and ensures the return value is greater than x (p. 5).

Verus form

Inference: encode P with `requires`, Q with `ensures`, and S with Verus’s field/frame discipline in a Rust function contract. Use a ghost abstraction lemma for the system-level call and separately prove the implementation satisfies its contract. Verus does not have ESBMC stubs or `__ESBMC_assigns`; the frame must use valid Verus constructs and explicit ownership/unchanged-state facts.

Evidence and limits

On Frama-C’s 45 programs, the abstract reports 82–96% verification success across three LLM backends, with 93–95% of converged programs requiring one CEGAR iteration (Abstract, p. 1). The denominator is 45 and the percentages vary by backend: GPT-OSS 120b 43/45 (96%), Qwen-Plus 40/45 (89%), and Claude Haiku 4.5 37/45 (82%) (Table II, p. 6). These are convergence results under the paper’s ESBMC settings, not universal correctness of arbitrary C programs.

## technique: CEGAR refinement with SMART ICE

What it is and when to use it

Refine candidate contracts from formal counterexamples. CEGAR alternates system and function checks; SMART ICE classifies counterexamples into positive, negative, and implication examples and feeds structured diagnostics to the LLM.

How to do it

1. Start with LLM contracts and run system-level and function-level ESBMC checks (Algorithm 2, p. 6)
2. Parse each failure into the violated property, execution trace, and key variables (Algorithm 4, p. 7)
3. Separate tool failures such as timeout, internal error, or parse rejection; do not add them as semantic examples (Algorithm 4)
4. Add unconstrained-initialization and semantic violations to negative examples E−; retain positive examples E+ and implication relationships (Section IV-C, pp. 6–7)
5. Map system failures to responsible functions, compute a gap score, and flag the weakest link (Algorithm 4)
6. Render the trace and accumulated examples in a structured LLM prompt, then regenerate contracts
7. Repeat for at most five CEGAR iterations; if progress is stagnant, run delta debugging and escalate to CEGIS (Algorithms 1–2, pp. 4–6)

The direction of refinement matters: function-level failures make contracts weaker so implementations can satisfy them, while system-level failures make contracts stronger so the top property follows (Section IV, p. 5). The authors state: “If both pass, verification is sound” (Section IV-B, p. 6).

Verus form

Inference: use Verus verification failures as structured counterexamples, classify them by violated precondition, postcondition, or frame fact, and regenerate the weakest contract that still proves the system property. Keep model-generated examples outside trusted code. A CEGAR controller can invoke `verus` repeatedly, but the final contract and implementation must each verify.

Evidence and limits

Figure 5’s Frama-C ablation compares SmartICE and No-ICE over 45 programs. GPT-OSS rises from 41/45 (91%) without ICE to 43/45 (96%) with ICE; Qwen rises from 39/45 (87%) to 40/45 (89%); Claude falls from 39/45 (87%) to 37/45 (82%) (Figure 5, p. 7). Thus SMART ICE is capability-conditioned, not universally improving. The paper ran each configuration once, so stochastic variation is a stated threat (Section VII, p. 9).

## technique: CEGIS fallback with example databases

When CEGAR exhausts five iterations, CEGIS synthesizes contracts against all accumulated examples. Migrate function counterexamples into a constraint database, ask the LLM for a contract consistent with E+, E−, and implication examples, re-run both ESBMC checks, and repeat for up to five CEGIS iterations (Algorithm 3, p. 6). The combined budget is at most ten iterations; failure is inconclusive (Section IV-B, p. 6).

Inference: in Verus, store proof-obligation traces and successful/failed contract instances as a synthesis database, then constrain future candidate `requires`/`ensures` formulas. This is an orchestration technique; it does not make LLM output trusted.

## technique: inductive loop invariant synthesis

What it is and when to use it

Use an inductive invariant for loops that bounded unrolling cannot handle. ESBMC checks base case, preservation, and exit implication with `__ESBMC_loop_invariant` (Section IV-A, pp. 5–6).

How to do it

1. Identify a loop and propose an invariant predicate
2. Prove it initially before the first iteration
3. Assume it at iteration i and prove it after the body at i+1
4. Conjoin the loop-exit condition and prove the desired postcondition
5. Use the invariant instead of unrolling all iterations

The paper’s example initializes `sum=0`, loops while `i<n`, and uses `sum == i*(i-1)/2`; the three checks establish the arithmetic series result at exit (Section IV-A, p. 6). The authors describe this as “fixed inductive argument” (Section IV-A, p. 6).

Verus form

Inference: put the predicate in a Verus `while` invariant clause, add a `decreases` measure when termination is required, and prove preservation with arithmetic lemmas. Verus’s loop invariant syntax differs from ESBMC’s annotation macro. The paper’s ConVer comparison notes that ESBMC contracts cannot express first-order quantified array invariants; programs requiring such invariants are outside its Frama-C subset (Section VII, p. 9).

Evidence and limits

VerifyThis contains 11 recursive and loop-intensive programs. Pre-Abstraction results are Qwen 6/11 (55%), Claude 7/11 (64%), and GPT 6/11 (55%) (Table IV, p. 9). Four programs fail across all backends because of complex inter-procedural invariants beyond the iteration budget (Section VI, p. 9).

## technique: complexity-scored pre-abstraction

Assign each function a weighted complexity score from loops, nesting, recursion, unbounded loops, allocation, branching, and pointer operations. Scores below 5 are minimal, 5–10 low, 10–20 medium, and at least 20 high (Section IV-D, p. 7). For medium/high functions, ask the LLM for sound but loose contracts; synthesize precise contracts concurrently for low-complexity functions. Run an initial abstract system check, verify each function atomically, replace verified abstractions with precise contracts, and then escalate to CEGAR/CEGIS if the system property still fails (Section IV-D, p. 7).

On LF-Hard’s 24 translated-C programs with a 600-second budget, direct ESBMC converges on 10/24 (42%), Qwen on 11/24 (46%), Claude on 12/24 (50%), and GPT-OSS on 15/24 (62%) (Table III, p. 8). The paper says the translated programs are 1,998–4,328 LOC and contain the complete LF runtime (Section VII, p. 9), so these numbers are not directly comparable to source-level LF tools.

Inference: use a static complexity score to route simple Verus functions to ordinary contract synthesis and complex functions to conservative abstraction plus later refinement. Over-approximation can prove system safety only if each abstraction is itself soundly related to the implementation.

## ESBMC-LF preprocessing

ConVer includes ESBMC-LF, which converts Lingua Franca files to C while preserving properties: compile LF, normalize platform paths, flatten to one translation unit with an operational runtime model, extract MTL properties, instrument assertions/assumptions/tracking variables, and generate a bounded direct execution model (Algorithm 5, p. 8). This enables standard C verification but expands source benchmarks to monolithic translated files.

## evidence, trust, and product implications

ConVer’s soundness depends on ESBMC’s system and function checks and the contract substitution argument. The paper reports a known soundness caveat: pointer-dereference targets in ESBMC `assigns` clauses are stripped, so frame conditions for pointer-modified state are not mechanically verified (Section VII, p. 9). Results also use one run per configuration, and Frama-C consists of simple single-assertion programs (Section VII). Inference: for agent-written verified Rust, this method threatens products mainly through overly strong or weak contracts, incomplete frame reasoning, and stochastic synthesis; final Verus checking can reject invalid proofs but cannot repair a wrong top-level property.

## techniques for the catalog
- top-down contract derivation — synthesize only function contracts needed by a system assertion and check them compositionally
- SMART ICE CEGAR — classify system/function counterexamples and refine contracts with structured examples
- CEGIS fallback — synthesize contracts against accumulated positive, negative, and implication constraints
- inductive loop invariants — prove base, preservation, and exit obligations instead of unrolling loops
- complexity-scored pre-abstraction — route high-risk functions through conservative summaries before refinement
- property-preserving preprocessing — translate a richer model to a verifier language while retaining assertions
