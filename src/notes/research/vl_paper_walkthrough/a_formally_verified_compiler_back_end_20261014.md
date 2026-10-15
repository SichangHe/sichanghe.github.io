# A formally verified compiler back-end
(authored by agents unless marked 🧑)
Tag: `leroy2009formallyverified`, [paper](https://arxiv.org/abs/0902.2137)

## scope and result

Xavier Leroy verifies a compiler back-end from Cminor, a simple imperative intermediate language, to PowerPC assembly in Coq. The paper's abstract states: "This article describes the development and formal verification (proof of semantic preservation) of a compiler back-end from Cminor (a simple imperative intermediate language) to PowerPC assembly code, using the Coq proof assistant both for programming the compiler and for proving its soundness." (Abstract, PDF p. 1). The back-end has six intermediate languages and passes for instruction selection, control-flow construction, dataflow optimization, register allocation, linearization, calling conventions, stack layout, and PowerPC generation (Figure 1, PDF p. 3).

The central guarantee is semantic preservation: compiled code has only behaviors allowed by the source, under a stated source-safety assumption where needed. The paper emphasizes: "By verified, we mean a compiler that is accompanied by a machine-checked proof that the generated code behaves exactly as prescribed by the semantics of the source program (semantic preservation property)." (Section 1, PDF p. 2).

Inference: This is a precedent for VL's end-to-end trust boundary. Verus-written Rust can be checked at the source level, but any source-to-source transformation, code generator, or optimizer that changes verified code needs a refinement argument or a trusted implementation boundary.

## technique 1: define semantic preservation as behavior refinement

The authors give source and target operational semantics assigning observable behaviors such as termination, divergence, wrong behavior, and I/O traces (Section 2.1, PDF pp. 3–4). They define increasingly usable relations:

1. bisimulation requires exactly the same behaviors in both programs (Definition 1, PDF p. 4)
2. backward simulation requires every target behavior to be a source behavior (Definition 2, PDF p. 4)
3. backward simulation for safe sources restricts the claim to `Safe(S)`, because optimizations can remove a source operation that would go wrong (Definition 3, PDF p. 4)
4. forward simulation requires every non-wrong source behavior to occur in the target (Definitions 4–5, PDF p. 4)

The paper notes: "In general, forward simulations are easier to prove than backward simulations (by structural induction on an execution of S), but less informative." (Section 2.1, PDF p. 4). Deterministic targets make forward simulation stronger because extra target behaviors cannot arise from internal nondeterminism (Section 2.1, PDF pp. 4–5).

Inference: For a Verus transformation, state the relation as a refinement of externally visible results and permitted failures. Use forward simulation when target determinism makes it sufficient; otherwise prove a backward or equivalence property. The source contract and safety assumptions must be explicit `requires` conditions, and the relation must cover memory and I/O effects, not only return values.

## technique 2: prove each pass with a simulation diagram

For two transition systems, the paper defines a state relation `S1 ∼ S2`, proves related initial states and related final states, and then proves a transition simulation. Its lock-step rule says: "if S1 ∼ S2 and G1 ⊢ S1 → S1′, there exists S2′ such that G2 ⊢ S2 → S2′ and S1′ ∼ S2′." (Section 3.7, PDF p. 16). Theorem 3 derives semantic preservation from those three obligations (Section 3.7, PDF p. 16).

Lock-step is too strict for removing no-ops or adding spill/reload instructions. The paper introduces star simulation, which permits several target steps and uses a well-founded source-state measure to prevent infinite stuttering; plus simulation requires at least one target step; option simulation allows a source step to disappear when the measure decreases (Definitions 12–14, PDF pp. 17–18). The proof method is:

1. define source and target transition semantics and a state relation (Section 3.7)
2. prove initial-state and final-state compatibility (Section 3.7)
3. choose lock-step, plus, option, or measured star simulation according to the pass's inserted or deleted steps (Section 3.7)
4. prove the local transition lemma by case analysis or induction (Section 3.7)
5. compose the resulting pass theorem with the next pass (Section 2.3)

Inference: In Verus, represent the relation as a predicate over source and target states and prove transition lemmas with `requires`/`ensures` and loop invariants. A pass that inserts administrative Rust code needs a stuttering measure; a simple return-value lemma is not enough to establish refinement.

## technique 3: build a shared semantic infrastructure

CompCert formalizes values, finite memory, global environments, traces, transition semantics, and program states before proving passes (Section 3, PDF pp. 8–16). The memory model supports block identities, offsets, permissions, loads, stores, allocation, and injection relations used to relate states across transformations (Sections 3.2–3.3, PDF pp. 9–12). Generic simulation diagrams are reused for all passes (Section 3.7, PDF pp. 16–18).

Inference: A Verus project should define a small shared model for ownership, heap regions, integer widths, and observable effects. Each transformation then proves preservation against that model instead of inventing unrelated postconditions. The model itself becomes part of the trusted specification and needs lemmas for arithmetic, aliasing, and memory safety.

## technique 4: verify instruction selection with smart constructors

Instruction selection translates structured Cminor expressions to machine-like expressions using smart constructors. The paper proves constructor lemmas: unary and binary operators preserve evaluation, conditionals preserve Boolean branches, and addressing-mode selection preserves loaded values (Section 5.3, PDF pp. 28–29). It then proves expression preservation by induction, defines a state relation that translates statements, functions, and continuations, and establishes lock-step simulation (Section 5.3, PDF p. 29).

The difficult arithmetic obligations include machine-integer rotate and bitwise identities. The paper reports that proving these required a formalization of N-bit integer arithmetic and its algebraic properties (Section 5.3, PDF p. 29).

Inference: For verified Rust generation, introduce constructors that only build well-typed specification or proof terms, prove each constructor's semantic lemma once, and use those lemmas when translating larger expressions. Bit-width and overflow lemmas must match Rust and Verus arithmetic semantics exactly.

## technique 5: verify dataflow optimizations

Constant propagation and common-subexpression elimination are performed over RTL control-flow graphs. The generic dataflow solver computes fixpoints of inequations, then each optimization uses the analysis result to rewrite code and proves semantic preservation (Sections 7.1–7.3, PDF pp. 39–44). The pass proof separates the static-analysis soundness theorem from the transformation theorem and finally applies a simulation argument.

Inference: A Verus optimizer should expose an abstract analysis invariant, prove that every CFG node satisfies it at the fixpoint, and prove that rewriting under the invariant preserves the function contract. This decomposition makes solver correctness reusable across optimizations.

## technique 6: verify register allocation and calling conventions

Register allocation reconstructs RTL types, computes liveness, constructs an interference graph, colors the graph, and emits LTL code (Sections 8.2.1–8.2.5, PDF pp. 45–48). The semantic proof uses a relation between RTL and allocated states and shows that simultaneously live values receive distinct locations (Section 8.3, PDF pp. 48–49). Later passes prove preservation for branch tunneling, CFG linearization, spilling and reloading, activation-record layout, and calling conventions (Sections 9–12, PDF pp. 50–62).

Inference: The analogous Verus obligation for agent-written Rust is preservation of ownership, borrow validity, and resource invariants across generated wrappers or lower-level code. A type checker alone does not prove that a register/stack or ownership transformation preserves values at every program point.

## technique 7: write executable verified code and extract it

Most compiler algorithms are written directly in Coq's specification language, then executable Caml code is obtained by extraction (Section 1, PDF p. 2; Section 16.1, PDF pp. 66–67). Proof terms and logical invariants are erased as noncomputational content. Handwritten Caml remains for heuristics validated afterward, the PowerPC printer, parser, and compiler driver (Section 16.1, PDF p. 66). The paper warns that extraction can insert unsafe Caml coercions for rich Coq types, although CompCert's source avoids that case (Section 16.1, PDF pp. 66–67).

Inference: Verus does not use Coq extraction in this way. The transferable idea is to keep executable transformation code close to its specification and isolate handwritten or `external_body` components. Every such component should have an explicit trusted status and boundary proof.

## technique 8: modular proof engineering and automation

Coq supports functional definitions, inductive and coinductive predicates, first-order predicates, dependent types, and modules (Section 15.1, PDF p. 64). CompCert uses interactive tactic scripts, decomposes proofs into lemmas for reuse, and relies on `eauto`, `omega`, congruence, functional induction, and functional inversion (Section 15.2, PDF p. 64). The authors also define custom Ltac, including a monadic inversion tactic (Section 15.2, PDF p. 64).

Inference: In Verus, similarly isolate reusable arithmetic, sequence, map, and state-transition lemmas before attempting end-to-end proofs. Automation should discharge routine obligations but not hide the contract or trusted assumptions.

## evidence and resource cost

The Coq development contains approximately 37,000 nonblank, noncomment lines plus 1,000 lines of Caml and took about two person-years (Section 15.3, PDF pp. 65–66). Proof checking takes about 7.5 minutes of CPU time on the paper's 2.4 GHz Intel Core 2 system, or 4.5 minutes with two cores (Section 15.3, PDF p. 66). The extracted compiler is benchmarked on 17 programs; generated code averages 7% slower than GCC `-O1` and 12% slower than GCC `-O2` on the stated PowerMac setup (Section 16.2, PDF p. 68). The authors caution: "The test suite is too small to draw definitive conclusions, but these results strongly suggest that while Compcert is not going to win any prize in high performance computing, the performance of generated programs is adequate for critical embedded code." (Section 16.2, PDF p. 68).

Inference: These denominators and machine settings show that a verified pipeline can be practical, but they do not predict Verus build time or Rust runtime cost. VL should measure proof checking and generated-code performance on its own workloads.

## what is proved and what stays trusted

The proved theorems are pass-level semantic preservation and their composition into an end-to-end back-end theorem. The trusted base includes Coq's kernel, the formal language semantics, axioms of function extensionality and proof irrelevance, excluded middle for minimal traces, extracted-code correctness assumptions, handwritten parser/printer/driver code, and the execution environment (Sections 15.1 and 16.1, PDF pp. 64, 66). The paper states that the soundness proof assumes whole-program compilation and does not account for separate compilation (Section 16.1, PDF p. 66).

Inference: A Verus product should document the analogous verifier kernel, Rust compiler, specifications, external bodies, unsafe code, build tools, and runtime assumptions. A proof of a generated function does not cover an unmodeled library or a code-generation pass.

## threat to a product of agent-written verified Rust

Inference: The paper indicates a serious engineering threat if VL transforms verified Rust without a semantic-preservation theorem: compiler or generator bugs can invalidate source proofs at executable behavior. It also shows a mitigation: make each pass machine-checked, compose pass theorems, and keep a small explicit trusted base. The result is a threat to the transformation pipeline, not evidence that agent-written code is inherently unsound when Verus checks the final artifact.

## techniques for the catalog

- behavior refinement: define observable source and target behaviors and prove backward or forward preservation under safety assumptions
- simulation diagrams: relate states, initial/final states, and transitions with lock-step, star, plus, or option simulation
- shared semantic model: formalize values, memory, environments, traces, and transitions once for all passes
- constructor lemmas: prove smart expression constructors preserve evaluation before proving whole instruction selection
- dataflow optimization proofs: separate fixpoint-analysis soundness from transformation and simulation proofs
- allocation and lowering proofs: use liveness, interference, stack, and calling-convention invariants to preserve state values
- extracted verified implementation: write executable algorithms in the proof system and extract code while isolating handwritten components
- modular proof automation: decompose into reusable lemmas and combine interactive tactics with domain-specific automation
Checked 2026-10-14 against the paper by a Codex agent: audit record leroy2009formallyverified; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
