# A Dependently Typed Library for Static Information-Flow Control in Idris
(authored by agents unless marked 🧑)
Tag: `gregersen2019dependently`, [paper](https://doi.org/10.1007/978-3-)

## result
DepSec is an Idris library that uses dependent types and a security monad to enforce information-flow policies statically. “We present DepSec, a MAC inspired statically enforced dependently typed information-flow control library for Idris.” (Section 1, PDF p. 3) The paper proves progress-insensitive noninterference for its sequential core and demonstrates policy-parameterized declassification.

Inference: the transferable method for VL is to put security or authority state in types and make unsafe transitions require proof objects. Idris's dependent type checker is different from Verus's SMT-backed contracts, so the mapping below is an inference.

## technique 1: indexed labeled values and secure computations
Define `Labeled ℓ a` as an abstract data type indexed by a security label ℓ and parameterized by payload type a. Define `DIO ℓ a` as a secure computation whose sensitivity level is ℓ. The core API uses constructors hidden behind exported operations; the paper notes: “Abstract data type Labeled ℓ a denotes a value of type a with sensitivity level ℓ.” (Section 3, PDF p. 5)

Use `label`, `unlabel`, and monadic bind/map operations so computations carry a current label and cannot release a value unless the lattice relation permits it. Define a label lattice through Idris interfaces, including join and proofs of algebraic laws. Idris's totality checker is part of the trust boundary: “All definitions made by untrusted code are total, that is, defined for all possible inputs and are guaranteed to terminate.” (Section 2, PDF p. 4)

Inference: in Verus, model labels as an enum or mathematical type, represent a labeled payload as a struct, and put allowed flows in `requires` and `ensures`. A Verus proof function can establish lattice facts; Rust's runtime type does not enforce the index, so contracts must carry the guarantee.

## technique 2: policy-parameterized functions
Write library functions polymorphic over a label poset instead of hard-coding one policy. Use implicit arguments and typeclass interfaces to infer lattice operations and proofs at call sites. This lets one implementation retain precise labels while clients choose a policy. The paper's contribution list says: “We show how DepSec enables and aids the construction of policy-parameterized functions that abstract over the security policy.” (Section 1, PDF p. 3)

Steps: define the abstract lattice interface; quantify a function over its label relation; require flow proofs as implicit arguments; construct `Labeled` and `DIO` values only through the API; let elaboration infer labels and proofs; reject calls whose constraints cannot be solved.

Inference: Verus can parameterize specs over a ghost label and require a relation predicate, but it does not infer arbitrary dependent arguments as Idris does. The relation and all preservation lemmas should be explicit proof code.

## technique 3: predicate and token hatch builders
A hatch is a controlled declassification operation. A predicate hatch builder creates a release capability after a predicate over protected state is proved. A token hatch builder requires possession of a token. The paper states: “We have introduced the notion of predicate hatch builders and token hatch builders that rely on the fulfillment of predicates and possession of tokens for declassification.” (Conclusion, PDF p. 40)

To apply it, define the predicate or token type, construct a hatch only when its condition is met, pass the hatch to the declassification operation, and keep the underlying labeled value inside `DIO`. This expresses what, who, and when policies without exposing raw values. The negative case in the file-joining example is represented in the type-level decision and must be handled even when a correct implementation makes it unreachable.

Inference: in Verus, encode a hatch as a ghost capability object with an invariant tying it to the protected state. A verified function can require the capability and ensure only the allowed projection is returned. Do not use `external_body` on the function being verified; any trusted constructor must be isolated and documented.

## evidence and trust
The paper formalizes an operational semantics and proves progress-insensitive noninterference. The theorem is stated: “If c1 ≈ℓA c2 , c1 ⇓ c′1 , and c2 ⇓ c′2 then c′1 ≈ℓA c′2.” (Theorem 1, PDF p. 16) The proof uses a single-step simulation relation and repeated preservation. Case studies compare DepSec's expressiveness with existing MAC-style libraries and a special-purpose dependent system (Sections 4–6).

The core API contains trusted constructors for `Labeled` and `DIO`, and `run` exposes an `IO` computation; the paper marks these operations `TCB` in the code (Appendix C, PDF pp. 39–40). Inference: noninterference depends on those constructors, Idris totality, the semantics model, and the compiler. The theorem is progress-insensitive and sequential; it does not establish termination-sensitive security, arbitrary effects, or correctness of external IO.

## VL implications and threat
Inference: VL should reuse indexed authority patterns and capability-gated declassification when an agent writes security-sensitive Rust. It should not claim that a Rust struct index alone enforces a policy; Verus must prove constructors and transition invariants. Inference: threat to agent-written verified Rust is high for confidentiality policies if the agent treats a runtime Boolean check as equivalent to a type-level proof. The paper's explicit TCB and sequential theorem show where a product must keep trust visible.

## techniques for the catalog
- indexed labeled values: index protected payloads by a security level and expose only checked operations
- secure computation monad: thread sensitivity through an abstract monadic computation
- policy-parameterized APIs: quantify functions over a label lattice and infer or prove flow constraints
- predicate hatch builders: require a proved predicate before declassification
- token hatch builders: require possession of an unforgeable capability before release
- noninterference proof: relate two executions after erasure of secrets and prove low-observable results agree
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
