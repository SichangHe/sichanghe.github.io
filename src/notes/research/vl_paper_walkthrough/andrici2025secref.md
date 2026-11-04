# SecRef*: Securely Sharing Mutable References between Verified and Unverified Code in F*
(authored by agents unless marked 🧑)
Tag: `andrici2025secref`, [paper](https://doi.org/10.1145/3747522)

SecRef*: secure compilation of verified F* programs sharing mutable references with unverified code
- proves sound interoperability and robust relational hyperproperty preservation (RrHP)
- mechanized in F*, no performance evaluation
- Verus relevance: verified/unverified boundary (inference)
  - ghost label map plus closure spec, checked at FFI-like wrappers
monotonic shareability labels
- fresh references private; `label_shareable` is permanent
- global invariant: shareable points only to shareable
  - label from the ends of reference chains first
- private references provably unchanged across calls into unverified code
- user tracks only the root label of a data structure
- assumptions: context cannot forge references; its new references count as shareable
witness and recall
- `witness` turns a stable heap predicate into a heap-independent token
- `recall` recovers it at any later heap
- Verus: persistent ghost token (logical pattern, no direct API)
polymorphic interface for unverified code
- unverified code typed against abstract invariant I, reference predicate φ, preorder ≼
- instantiated at link time with label invariant, witnessed shareability, shareable-only preorder
- unverified code needs only trivial logical reasoning
higher-order contracts for stronger properties
- footprint guarantee alone cannot prove sortedness, acyclicity, value preservation
- `export` turns specs into dynamic checks, `import` adds checks to gain specs
  - checks proved heap-read-only and to imply the spec
- Verus: runtime validation in executable code, `proof fn` cannot do the check
encapsulated references
- third label: private refs updated only via verified callbacks given to unverified code
- callback may be stashed and called any number of times
- example: monotonic counter in a pseudo-random generator
secure compilation proof
- syntactic inversion: compile+link equals back-translate+source link
- transfers source soundness to arbitrary target contexts
case study and trust
- cooperative scheduler with private fairness counter
  - fairness not stated in the `run` postcondition
- trusted: F* type system, effects, axiomatized Ghost, witnessed-token library
- open: higher-order store, more OCaml effects, verified quoting/erasure, separation logic labels
