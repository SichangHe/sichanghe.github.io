# A DbC Inspired Neurosymbolic Layer for Trustworthy Agent Design
(authored by agents unless marked 🧑)
Tag: `leoveanucondrei2025dbc`, [paper](https://arxiv.org/abs/2402.00854) (link from the fetch record; the paper text identifies this arXiv number as the cited SymbolicAI work, not this paper)

## scope and claim
This paper wraps each LLM call in a Design-by-Contract layer. A contract has typed data requirements plus semantic pre- and postconditions; failed checks can trigger bounded, error-guided remediation. The paper explicitly limits the claim: “Contract satisfaction is probabilistic and semantic validation is operationally defined through programmer-specified conditions on well-typed data structures.” (Abstract, PDF p.1) No benchmark table or task denominator is reported. Inference: the work supplies a design and implementation proposal, not evidence of a measured verification rate.

## technique 1: typed semantic contracts around an LLM call

what it is and when to use it
Inference: use a contract when an agent must return structured data with semantic obligations, such as a Rust task request or a constrained plan. These are suggested applications, not demonstrations in the paper. The agent is modeled as `A=<M,P,Theta,T,C>`: models, instructions, hyperparameters, supported types, and contracts (§1, p.1). Types enforce structural well-formedness; predicates check programmer-specified semantic requirements. The paper connects this to Hoare triples and Curry–Howard. Its exact operational sequence is: “(i) initial type validation of inputs against 𝒯, (ii) pre-condition checking with optional remediation, (iii) an optional act method for intermediate transformations, (iv) LLM-driven output generation guided by the class’s prompt property and type specifications, and (v) post-condition validation with remediation attempts.” (§3, PDF p.2)

how to do it
1. Define Pydantic-based `LLMDataModel` subclasses as the concrete type system `T`; include field annotations and semantic descriptions (§3, p.2)
2. Decorate the underlying `Expression.forward` method with the contract layer (§3, p.2)
3. Validate input type, then evaluate precondition methods; methods return True or raise descriptive exceptions (§3, p.2)
4. Optionally run `act` to transform input, then prompt the LLM using the class prompt and type specification (§3, p.2)
5. Validate output type and postconditions; on failure, pass errors to remediation (§3, p.2)

Verus form
Inference: express structural data as Rust structs and semantic obligations as `requires` and `ensures` on a wrapper function. Use `spec fn` for pure specification predicates and `proof fn` for lemmas; keep executable code separate from proof code. A Verus proof of a deterministic contract about a generated value would not by itself establish that an LLM will produce that value. Runtime type parsing and retries stay executable and trusted as ordinary code. The paper’s Pydantic methods and Python exceptions therefore do not carry over as Verus constructs.

## technique 2: probabilistic remediation with bounded retries

what it is and when to use it
Remediation uses an LLM to populate or correct fields, guided by the schema, semantic instructions, and accumulated validation errors (§3, p.2). Inference: use it when a malformed response is repairable and a bounded retry budget is acceptable. The paper says: “Remediation is achieved through a component that iteratively refines outputs by incorporating validation error messages into corrective prompts.” (§3, p.2)

steps
1. Capture the failing predicate’s descriptive error
2. Add the error and prior error history to a corrective prompt (§3, p.2)
3. Ask the model to populate or correct fields according to the schema and semantic instructions
4. Re-run type and predicate checks
5. Bound retries by the configured maximum attempts in `Theta`; configure delays and backoff separately. The paper presents accumulated error history as a way to avoid cyclic errors (§3, p.2), without reporting a measured reduction

Verus form
Inference: generate a candidate Rust value, run executable parsers/checkers, and retry only before submitting the candidate to Verus. Once accepted, verify the final function with `requires`/`ensures`; proof code cannot be used as a runtime repair call. A Verus proof establishes the selected candidate’s contract, not the probability of obtaining it.

## technique 3: graceful fallback and success estimation

The wrapper always executes the original forward method in a `finally` block. If checks fail, it may return raw output or a safe typed default, degrading from verified to best-effort (§3, p.2). Inference: continued execution does not establish that the fallback satisfies the semantic contract. The paper models each invocation’s success as Bernoulli and estimates `P_succ=(1/N) sum_t 1[all contract predicates pass]` over N independent runs (§3, p.2). It also approximates overall probability by multiplying per-family probabilities, for example six postcondition checks grouped into families. Inference: multiplication assumes independence that the paper itself says may not hold (“even though dependencies may exist”, §3, p.2); report the direct joint fraction for a trustworthy product metric.

Verus form
Inference: fallback should be an explicit enum separating verified output from unverified/default output. Do not attach `external_body` to the function under verification merely to bypass a failed proof. Require callers to handle the unverified branch; only the verified branch should be consumed by code whose safety depends on the contract.

## what is proved, trusted, and missing

The layer checks programmer-specified runtime predicates and types; it does not machine-check the contract implementation or the LLM semantics. The paper’s future-work statement is explicit: “Current contracts lack formal guarantees about type system correctness.” (§4, PDF p.3) It proposes Lean formalization of type safety, contract consistency, composition preservation, and probabilistic bounds, but that formalization is prospective and the runtime does not depend on it (§4, p.3). No experimental success rates, evaluated model configurations, or run counts are supplied.

## techniques for the catalog

- typed semantic contract wrapper — validate input types, preconditions, generated output types, and postconditions around each model call
- error-history remediation — feed predicate errors into bounded corrective prompts and retry with backoff
- graceful verified/best-effort fallback — preserve operation after failure while explicitly degrading the guarantee
- empirical probabilistic contract score — estimate joint predicate success over independent invocations and state any independence approximation
