# Resource Specifications for Resource-Manipulating Programs
(authored by agents unless marked 🧑)

## scope and result
This paper extends Prusti with first-class, user-defined resources for programs that manipulate assets such as token balances. Conventional permissions and predicates become verbose because every operation must repeat conservation facts. The authors' methodology makes resource operations explicit and reports shorter specifications with successful verification of a blockchain application. They write that “specifications for resource-manipulating programs quickly become verbose and difficult to interpret” and propose “defined first-class resources”.

## technique: first-class resource abstraction
What it is: declare an abstract resource type with operations such as create, destroy, transfer, and split. A resource expression denotes ownership or quantity independently of the concrete heap representation. The verifier automatically enforces default properties, including conservation.

When to use it: use it when a Rust contract or systems component moves quantities among accounts and ordinary separation-logic predicates duplicate arithmetic and ownership bookkeeping.

How to apply: (1) identify each conserved asset and define its abstract resource; (2) specify constructors/destructors and transfer operations; (3) map resource state to concrete fields through a representation relation; (4) annotate each function with pre/postconditions over resources, not raw balances; (5) let the methodology generate obligations that the representation relation is preserved; (6) discharge remaining arithmetic and permission goals in Prusti. The paper stresses that resources are “abstractions decoupled from the program state” and that mappings connect them to concrete states.

Evidence: the evaluation compares specifications written with and without the methodology on a blockchain application. The authors report that resource-based specifications are shorter and easier to write while preserving verification. Exact line counts and benchmark denominators are in the evaluation tables and must be retained when reproducing the result; acceptance is by Prusti's verifier rather than manual inspection.

Limits and trust: the abstraction is sound only if the representation relation and resource operation axioms are correctly encoded. Unsupported aliasing, arithmetic overflow models, or external calls can invalidate assumptions. Prusti's encoding, SMT solver, Rust front end, and the contract's environmental model remain trusted. The paper does not prove that every resource API is automatically inferred; users still design the abstraction.

## what is proved and what remains trusted
Prusti checks function contracts and preservation of the resource representation. The methodology proves properties expressed in those contracts, such as conservation, not an unstated business requirement. Solver completeness is not guaranteed, so timeout or unsupported features can cause false negatives but not accepted false proofs under the soundness assumptions.

## implications for VL (inference)
Verus agents can adopt a resource layer for balances, capabilities, or tokens: define ghost resources, a concrete-state invariant, and a small operation vocabulary. This can reduce repetitive proof obligations in generated Rust. VL should reuse the abstraction idea rather than reimplementing ad-hoc balance lemmas, while testing aliasing and overflow cases absent from the reported application.

## techniques for the catalog
- first-class resources — represent conserved assets directly in specifications with explicit operations
- representation relation — connect abstract resource state to concrete program fields and preserve the relation
- default conservation obligations — make create/destroy/transfer semantics enforce conservation automatically
- concise contract comparison — evaluate specification size and verifier acceptance against a conventional baseline

The motivation is semantic as well as ergonomic: the authors note a “wide semantic gap between the way we think about resources” and ordinary heap predicates. Closing that gap gives generated proofs a stable vocabulary. A Rust implementation can expose a ghost map from account identifiers to quantities, define transfer as subtraction plus addition, and prove that the sum changes only on mint or burn. The representation invariant then connects this map to storage. This pattern also helps review: reviewers inspect a small resource API and its conservation axioms instead of every function's duplicated balance arithmetic. It fails when the resource has hidden aliases or when external systems mutate state without a modeled operation. Therefore an agent should reject or flag calls outside the resource boundary rather than silently assume conservation. Evaluation should report specification lines, proof time, solver queries, and number of functions, with denominators for every comparison.
