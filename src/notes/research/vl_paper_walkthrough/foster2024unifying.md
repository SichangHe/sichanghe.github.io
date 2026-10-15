# Unifying Model Execution and Deductive Verification with Interaction Trees in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `foster2024unifying`, [paper](https://doi.org/10.1145/3702981)

## what the paper builds

Foster, Hur, and Woodcock mechanise Interaction Trees (ITrees) in Isabelle/HOL so one semantic object can be executed, animated, and proved. The motivation is to avoid semantic gaps between executable models and verified models: “To ensure that these heterogeneous artefacts and analysis results can be applied coherently, there is a need to tie them together using unifying formal semantics to avoid semantic gaps that can introduce weaknesses” (section 1, p. 2). ITrees are coinductive labelled transition systems with termination, internal steps, and visible event choices. The paper applies them to imperative programs, CSP/Circus processes, and Z-style abstract machines.

The contribution is an Isabelle library, not a Verus or Rust implementation. All reported results are mechanised in Isabelle/HOL and use Isabelle's proof automation and code generator (section 1, p. 3).

## technique: executable coinductive interaction trees

What it is. Define an ITree over event type `e` and return/state type `r` with constructors `Ret r`, `Sil P` for an internal event, and `Vis F` for a partial-function choice of visible events. The paper's codatatype is:

`codatatype ('e, 'r) itree = Ret 'r | Sil "('e, 'r) itree" | Vis "'e →↦ ('e, 'r) itree"`

(section 3.1, p. 7). Codatatypes permit infinite depth and breadth while remaining executable.

How to use it.

1. Choose events and return/state values.
2. Encode termination with `Ret`, internal computation with `Sil`, and enabled external events with a partial function in `Vis` (section 3.1, p. 7).
3. Represent deadlock as an empty visible choice (`stop`) and divergence as a productive corecursive tree `div = Sil div` (section 3.1–3.2, pp. 7–8).
4. Compose trees with monadic bind. The bind equations pass a returned value to a continuation, preserve internal steps, and bind every visible continuation (Definition 3.5, p. 9).
5. Use homogeneous Kleisli trees `S ⇒ (E,S) itree` for stateful processes and compose them with `#` (section 3.2, p. 9).

The buffer example uses partial-function override to offer input, output when non-empty, and a state-observation event; disjoint event domains make the choices commute (section 3.1, pp. 7–8).

Verus form. Inference: represent a finite executable approximation as an enum or trait object and give a separate `spec fn` transition relation for potentially infinite behaviour. Verus can prove bind and invariant lemmas over a finite encoding, but the paper's Isabelle codatatype and productivity checks do not automatically transfer. Use explicit state-machine invariants for the Rust implementation and state the coinductive relation as a specification.

Evidence and limits. The paper proves bind laws, operational-semantic results, and weak-bisimulation properties in Isabelle (sections 3.2–3.4). The semantics is executable, but arbitrary partial functions are not directly enumerable; animation therefore needs a finite data refinement (section 6, p. 29).

## technique: derive operational and axiomatic semantics

What it is. ITrees provide a small-step operational view while the same trees support relational and Hoare-style reasoning. Silent steps can be abstracted with weak bisimulation; iteration is handled with chains and fixed-point laws (sections 3.3–3.4).

Steps for an imperative model.

1. Define a state type and commands as state transformers represented by homogeneous Kleisli trees (section 4.1, pp. 13–14).
2. Encode assignments and conditionals as internal tree steps and event-producing commands as visible choices.
3. Define concrete execution by running the tree and symbolic execution by interpreting the same command tree over symbolic state (section 4.2, pp. 15–16).
4. Define a relational/predicative semantics and prove that it corresponds to the ITree semantics (section 4.4, pp. 17–18).
5. State Hoare triples and weakest preconditions over the tree semantics. For loops, provide an invariant and a variant for total correctness; the list-reversal example uses `ys = rev (take i xs)` and variant `length xs - i` (section 4.5, pp. 19–21).
6. Generate verification conditions and discharge them with Isabelle's simplifier and Sledgehammer (section 4.6, pp. 21–22).

Verus form. Inference: encode the state transformer as executable Rust plus a `spec fn` relational semantics. Use `requires`/`ensures`, loop `invariant` clauses, and a decreasing `decreases` measure for termination. Prove refinement between the executable function and the abstract ITree transition relation; this is the Rust analogue of the paper's semantic correspondence.

Evidence. The paper reports mechanised theorems and examples rather than a benchmark table. Its conclusion says the approach provides “tractable verification, with the help of Isabelle’s proof automation” and execution (section 9, p. 37). The denominator is the set of presented semantic theorems and examples, not a claim about all programs.

## technique: animate verified models by code generation

What it is. Isabelle's code generator extracts ITree codatatypes and functions to lazy functional languages. A finite associative-list representation implements partial functions so an animator can enumerate enabled events (section 6, pp. 29–30).

Steps.

1. Refine each partial function `A →↦ B` to an associative list `(A × B) list` (section 6, p. 29).
2. Bound infinite input domains, for example replace `{0..}` with `{0..3}` for animation (section 6, p. 30).
3. Generate code, add animator code, compile with GHC, and run the binary. The `animate` command performs these four steps (section 6, p. 30).
4. Skip internal `Sil` steps until a return or visible choice; show a menu and let the user select an event. Abort after 20 silent steps to expose divergence (section 6, p. 30).

The reported ring-buffer experiment ran on an Apple M3 Pro with 18 GB memory: 100 cells animated efficiently, 850 cells took about 3 seconds per next step, and 5000 cells about 50 seconds (section 6, p. 31). These are single-platform timings with no repeated-trial denominator.

Verus form. Inference: generate a Rust simulator from the executable state machine and retain a Verus proof that each generated step refines the abstract transition relation. Finite event bounding must be explicit in the spec; it does not prove unbounded input behaviour.

## technique: Z-Machines with invariant checking

What it is. A Z-Machine packages a state type, invariants, parameterised operations, and initialization. The paper defines it as “(1) a state space type S; (2) a set of state invariants Pi : S ⇒ B; (3) a set of operations Opj ...; and (4) an initialisation I : S” (section 7, p. 32).

Steps.

1. Declare state fields and invariants with `zstore`; the bounded-buffer example links `sz = length buf` and `sz ≤ MAX_SIZE` (section 7, p. 32).
2. Declare each operation's parameter sets, precondition, and simultaneous update with `zoperation` (section 7, pp. 32–33).
3. Translate an operation to an enabled event when its parameter valuation satisfies the precondition; otherwise its behaviour is `Stop` (Definition 7.4, p. 33).
4. Compose initialization and an interleaving choice of operations into the machine ITree (Definition 7.6, p. 34).
5. Prove invariant preservation and animate the bounded model after assigning finite definitions to abstract constants (section 7, pp. 32–34).

Verus form. Inference: encode the store invariant as a `spec fn`, operation preconditions as `requires`, updates as executable Rust, and preservation as proof lemmas. A state-machine module can expose only transitions that preserve the invariant; animation then executes the same transitions.

## what is proved, measured, and trusted

Proved: mechanised ITree constructors and combinators, operational semantics, weak bisimulation and iteration results, imperative Hoare reasoning, CSP/Circus links, code-generation correspondence, and Z-Machine invariant tooling (sections 3–7). Measured: ring-buffer animation timings for selected sizes and one hardware platform. Trusted: Isabelle/HOL's kernel, the code generator and generated-language runtime, the finite data refinement used for animation, and the correctness of model invariants and operation specifications.

Inference: for agent-written verified Rust, the paper suggests a useful product architecture: keep one executable transition model connected to proofs and tests. The threat is that a finite animator can hide unbounded-domain or divergence bugs, and that a proof of an incorrect invariant remains valid. Concurrency, real-time operators, and full backend refinement remain outside the paper's demonstrated scope.

## techniques for the catalog

- interaction trees: use executable coinductive trees with return, silent, and visible-event constructors as a shared semantic object
- semantic unification: derive operational, relational, Hoare, and process-algebra views from the same tree
- invariant-based Hoare verification: prove loop invariants and variants, then discharge generated conditions with automation
- verified animation: refine partial functions to finite lists, generate code, and interactively explore enabled events
- Z-Machines: package state invariants and guarded operations into an executable and verifiable abstract machine
Checked 2026-10-15 against paper foster2024unifying: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
