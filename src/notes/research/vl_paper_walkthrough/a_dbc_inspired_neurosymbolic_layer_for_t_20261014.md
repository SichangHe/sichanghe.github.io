# A DbC Inspired Neurosymbolic Layer for Trustworthy Agent Design
(authored by agents unless marked 🧑)
Tag: `leoveanucondrei2025dbc`, [paper](https://arxiv.org/abs/2402.00854)

## scope and claim
This paper wraps each LLM call in a Design-by-Contract layer. A contract has typed data requirements plus semantic pre- and postconditions; failed checks can trigger bounded, error-guided remediation. The paper explicitly limits the claim: “Contract satisfaction is probabilistic and semantic validation is operationally defined through programmer-specified conditions on well-typed data structures.” (Abstract, PDF p.1) No benchmark table or task denominator is reported, so the work is a design and implementation proposal, not evidence of a measured verification rate.

## technique 1: typed semantic contracts around an LLM call

what it is and when to use it
Use a contract when an agent must return structured data with semantic obligations, such as a verified Rust task request, an extracted entity, or a plan satisfying safety conditions. The agent is modeled as `A=<M,P,Theta,T,C>`: models, instructions, hyperparameters, supported types, and contracts (§1, p.1). A type establishes structural well-formedness; predicates establish meaning. The paper connects this to Hoare triples and Curry–Howard. Its exact operational sequence is: “(i) initial type validation of inputs against T, (ii) pre-condition checking with optional remediation, (iii) an optional act method for intermediate transformations, (iv) LLM-driven output generation guided by the class’s prompt property and type specifications, and (v) post-condition validation with remediation attempts.” (Implementation, PDF p.3)

how to do it
1. Define Pydantic-based `LLMDataModel` subclasses as the concrete type system `T`; include field annotations and semantic descriptions (Implementation, p.3)
2. Decorate the underlying `Expression.forward` method with the contract layer (Implementation, p.3)
3. Validate input type, then evaluate precondition methods; methods return True or raise descriptive exceptions (Implementation, p.3)
4. Optionally run `act` to transform input, then prompt the LLM using the class prompt and type specification (Implementation, p.3)
5. Validate output type and postconditions; on failure, pass errors to remediation (Implementation, p.3)

Verus form
Inference: express structural data as Rust structs and semantic obligations as `requires` and `ensures` on a wrapper function. Use `spec fn` for pure specification predicates and `proof fn` for lemmas; keep executable code separate from proof code. Verus can statically prove a deterministic contract about a generated value, but it cannot prove that a stochastic LLM will produce the value. Runtime type parsing and retries stay executable and trusted as ordinary code. The paper’s Pydantic methods and Python exceptions therefore do not carry over as Verus constructs.

## technique 2: probabilistic remediation with bounded retries

what it is and when to use it
Remediation asks the same LLM to repair a failed input or output using accumulated validation errors. Use it when a malformed response is repairable and a bounded retry budget is acceptable. The paper says: “Remediation is achieved through a component that iteratively refines outputs by incorporating validation error messages into corrective prompts.” (Implementation, p.3)

steps
1. Capture the failing predicate’s descriptive error
2. Add the error and prior error history to a corrective prompt (Implementation, p.3)
3. Ask the model to populate or correct fields according to the schema and semantic instructions
4. Re-run type and predicate checks
5. Stop after the configured maximum attempts, delay, and backoff in `Theta`; history is retained to avoid cyclic errors (Implementation, p.3)

Verus form
Inference: generate a candidate Rust value, run executable parsers/checkers, and retry only before submitting the candidate to Verus. Once accepted, verify the final function with `requires`/`ensures`; proof code cannot be used as a runtime repair call. A Verus proof establishes the selected candidate’s contract, not the probability of obtaining it.

## technique 3: graceful fallback and success estimation

The wrapper always executes the original forward method in a `finally` block. If checks fail, it may return raw output or a safe typed default, degrading from verified to best-effort (§3, p.3). This preserves availability but weakens guarantees. The paper models each invocation’s success as Bernoulli and estimates `P_succ=(1/N) sum_t 1[all contract predicates pass]` over N independent runs (Implementation, p.3). It also approximates overall probability by multiplying per-family probabilities, for example six postcondition checks grouped into families. Inference: multiplication assumes independence that the paper itself says may not hold (“even though dependencies may exist”, Implementation p.3); report the direct joint fraction for a trustworthy product metric.

Verus form
Inference: fallback should be an explicit enum separating verified output from unverified/default output. Do not attach `external_body` to the function under verification merely to bypass a failed proof. Require callers to handle the unverified branch; only the verified branch should be consumed by code whose safety depends on the contract.

## what is proved, trusted, and missing

The layer checks programmer-specified runtime predicates and types; it does not machine-check the contract implementation or the LLM semantics. The paper’s future-work statement is explicit: “Current contracts lack formal guarantees about type system correctness.” (Limitations, PDF p.4) It proposes Lean formalization of type safety, contract consistency, composition preservation, and probabilistic bounds, but that formalization is prospective and the runtime does not depend on it (Limitations, p.4). No experimental success numbers, model names, or denominators are supplied. Inference: for VL, the design is a threat to product reliability only if runtime best-effort fallbacks are mistaken for Verus proofs. It is useful as an orchestration pattern around Verus, while specification quality, parser correctness, retries, external libraries, and the Verus toolchain remain trusted boundaries. Existing VL should not redo the paper’s generic DbC wrapper without measuring false acceptance, retry cost, and the fraction of outputs that reach a statically verified branch.

## techniques for the catalog

- typed semantic contract wrapper — validate input types, preconditions, generated output types, and postconditions around each model call
- error-history remediation — feed predicate errors into bounded corrective prompts and retry with backoff
- graceful verified/best-effort fallback — preserve operation after failure while explicitly degrading the guarantee
- empirical probabilistic contract score — estimate joint predicate success over independent invocations and state any independence approximation
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
