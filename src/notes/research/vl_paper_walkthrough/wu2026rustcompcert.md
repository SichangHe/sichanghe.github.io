# RustCompCert: A Verified and Verifying Compiler for a Sequential Subset of Rust
(authored by agents unless marked 🧑)
Tag: `wu2026rustcompcert`, [paper](http://arxiv.org/abs/2602.07455v1)

## scope and pipeline

RustCompCert is ongoing work on an end-to-end verified compiler for a sequential Rust subset. The paper's goal is twofold: preserve source behaviors in compiled code and use verifying compilation to guarantee memory safety. It states: “We aim to develop an end-to-end verified Rust compiler.” (Sec. 1, p. 1). The presented system has three components: an unverified parser from surface Rust to Rustlight, a verified Rust-specific frontend from Rustlight to Clight, and the verified CompCert backend from Clight to assembly (Sec. 2, p. 1). The paper's Figure 1 labels the parser unverified and the frontend/backend verified.

Rustlight supports algebraic data types (`struct` and `enum`), Box automatic memory management, RAII and ownership, mutable and immutable references with region/lifetime annotations, and composition of safe and unsafe modules. Unsupported features include concurrency, polymorphism, traits, and higher-order functions such as closures (Sec. 1, p. 1). The frontend first lowers Rustlight to RustIR, then performs Drop Elaboration, Borrow Checking, and Clight Generation. Drop Elaboration determines which destructor/drop operations execute from variable initialization status (Sec. 2, p. 2). Borrow checking has move checking and a Polonius-based borrow-checking pass; Clight Generation translates enums to tagged unions and creates drop glue for types requiring destructors (Sec. 2, p. 2).

Inference: this staged boundary is a useful VL architecture for code whose proof must survive compilation. Inference: keep the verified Rust/Verus source contract at RustIR or an equivalent intermediate representation, then require every lowering pass to carry a refinement relation. Inference: the parser remains a trust boundary unless it is verified or its output is independently checked.

## technique: refinement-based compiler correctness

The compiler correctness theorem is a backward simulation. For Rustlight source `Ms` and assembly target `Mt`, the paper states: “RustCompCert(Ms) = Mt ⇒ ⟦Mt⟧ ⩽ ⟦Ms⟧.” (Sec. 2, p. 2). Here the target behavior is included in source behavior. This relation is the bridge that preserves properties proved at the source level through the backend.

How to apply the technique. (1) Define source and target semantics. (2) Define compilation as a relation/function from source modules to assembly. (3) Define a backward simulation or refinement relation saying every target behavior corresponds to a source behavior. (4) Prove each frontend pass preserves the relation. (5) compose the pass theorems with CompCert's backend theorem. (6) State the end-to-end theorem over the resulting compiler relation. The paper presents these as the compiler-correctness and end-to-end theorems in Sec. 2, pp. 2–3; it does not provide a numerical evaluation.

Verus form. Inference: model source and target states with Rust `struct`s and mathematical `spec fn`s; state a refinement relation as a `spec fn`; prove pass-specific `proof fn`s with `requires` and `ensures`. Keep executable translation code separate from proof code and expose only checked contracts. Inference: Verus proofs can establish a relation between an executable source-level model and a target representation, but this is a new encoding; the paper's Rocq/CompCert semantics and theorem statements cannot be copied as Verus syntax. Do not put `ensures` on a `spec fn` or use proof functions as runtime functions.

## technique: verified Polonius as abstract interpretation

Rather than porting rustc's graph solver directly, the authors implement Polonius in CompCert's Kildall dataflow framework. The paper explains: “We instead implement it within the Kildall framework by defining its abstract domain and transfer functions.” (Sec. 3, p. 3). The result is the Kildall fixpoint solver. This makes the algorithm fit an existing verified dataflow infrastructure.

Abstract domain steps. (1) Represent loans in a map from regions to sets of loans. (2) Add a union-find structure for region equality required by variance rules. (3) Use each region's union-find representative to index the loan map, ensuring equal regions have equal loan sets. (4) Define the abstract state as a pair `(M × U)` of loan map and union-find. (5) Prove this domain forms a semi-lattice so Kildall can iterate it. These steps are Sec. 3, p. 3.

Transfer-function steps. (1) Define `F : N → (M × U) → (M × U)` for each program node. (2) Propagate loans from an assigner region to an assignee region. (3) Add region equalities produced by variance rules. (4) Remove equalities when a region becomes dead. (5) follow NLL subtyping and reborrow rules. (6) Compute the fixpoint with Kildall. The paper describes all six operations in Sec. 3, pp. 3–4.

Verus form. Inference: encode the loan map and union-find as ghost/specification state and state semi-lattice laws as `ensures` on `proof fn`s. A loop implementing fixpoint iteration needs an `invariant` clause that relates each abstract state to the accumulated transfer results and a termination measure. Region-equality preservation can be expressed as a lemma over the union-find representative. Inference: Verus can verify the data-structure invariants and transfer soundness, but the paper's Rocq Kildall library and Polonius semantics require a fresh formalization.

## technique: refinement from borrow checking to memory safety

The authors introduce `RustIRspec`, a structured-memory functional specification abstracting CompCert's low-level memory. For a program accepted by borrow checking, they require refinement between concrete RustIR semantics and this specification plus safety. The paper states: “The soundness of borrow checking is then formalized as a refinement between RustIRspec and RustIR.” (Sec. 2, p. 3). The formal condition is `BorrowCheck(M) ✓ ⇒ ⟦M⟧RustIR ⩽ ⟦M⟧RustIRspec ∧ safe ⟦M⟧RustIRspec`.

The proof's key steps are (1) establish an approximation relation between the analysis's abstract state and concrete semantic memory, and (2) show every structured-memory operation corresponds to a non-stuck CompCert-memory operation. The paper says: “The first step is the more challenging one.” (Sec. 3, p. 4). Polonius regions are related to sets of memory locations that may alias with places in the region. This abstraction also supports precision/performance trade-offs: alias sets can be relaxed, for example by making Polonius field-insensitive, while retaining the same soundness proof (Sec. 3, p. 4).

Verus form. Inference: define a ghost map from regions to locations, a `spec fn` approximation relation, and proof lemmas showing each verified borrow-check operation preserves it. Use `requires` for a borrow-check acceptance predicate and `ensures` for non-stuck target operations and memory safety. Inference: field-insensitive aliasing can be represented by a coarser ghost set, but any precision reduction must preserve the same soundness lemma; Verus does not automatically inherit CompCert's memory model.

## end-to-end property, assumptions, and limits

Combining borrow-check soundness with compiler correctness yields the paper's end-to-end theorem: “RustCompCert(Ms) = Mt ⇒ safe ⟦Ms⟧RustIRspec ⇒ safe ⟦Mt⟧Asm.” (Sec. 2, p. 3). Safety here is partial. The authors explicitly caution: “In fact, we cannot show that the borrow checker rules out all undefined behaviors.” (footnote 2, p. 3). Division by zero remains an example of undefined behavior that borrow checking cannot prevent; total safety requires the prover to rule out such behaviors separately.

The work is a design/formalization report, not a completed product evaluation. It reports no benchmark task counts, proof lines, runtime measurements, or percentage success rates. It also relies on an unverified parser, a sequential subset, CompCert/CompCertO libraries, and the correctness of the chosen Rustlight semantics. The paper says the formalization is ongoing and points to a public repository (Sec. 1, p. 1).

Inference: for agent-written verified Rust, RustCompCert identifies a high-severity supply-chain threat: source-level Verus proofs do not by themselves establish that an unverified parser or compiler preserves the verified behavior. A VL product can reduce this risk by pinning the compiler/toolchain, verifying translation/refinement boundaries, and separately proving functional contracts and non-borrow-related undefined behavior. Inference: VL should not redo this paper's broad compiler architecture as a generic benchmark; it should measure the exact trust boundary between Verus-checked source and generated executable, including parser and unsafe-code assumptions.

## techniques for the catalog

- pass-by-pass refinement: prove each lowering pass preserves a source/target simulation and compose the theorems
- Kildall Polonius verification: express borrow analysis as an abstract domain, transfer function, and fixpoint
- union-find region equality: represent variance-induced equalities by canonical representatives in the loan map
- borrow-check soundness refinement: relate abstract loans to concrete locations and show every operation is non-stuck
- end-to-end safety composition: combine borrow-check refinement with verified backend semantics

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
