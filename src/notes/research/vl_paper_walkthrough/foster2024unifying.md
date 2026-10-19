# Unifying Model Execution and Deductive Verification with Interaction Trees in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `foster2024unifying`, [paper](https://arxiv.org/abs/2408.15817v2)

## what the paper builds

Foster, Hur, and Woodcock mechanise Interaction Trees (ITrees) in Isabelle/HOL so one semantic object can be executed, animated, and proved. The motivation is to avoid semantic gaps between executable models and verified models: “To ensure that these heterogeneous artefacts and analysis results can be applied coherently, there is a need to tie them together using unifying formal semantics to avoid semantic gaps that can introduce weaknesses [37, 58].” (section 1, p. 2). ITrees are coinductive labelled transition systems with termination, internal steps, and visible event choices. The paper applies them to imperative programs, CSP/Circus processes, and Z-style abstract machines.

The contribution is the Isabelle/ITrees library. The authors state: “All our results have been mechanised and can be found in the accompanying repository” (section 1, p. 3; repository: https://github.com/isabelle-utp/interaction-trees). The paper does not present a Verus or Rust implementation.

## technique: executable coinductive interaction trees

What it is. Define an ITree over event type `e` and return/state type `r` with constructors `Ret r`, `Sil P` for an internal event, and `Vis F` for a partial-function choice of visible events. The paper's codatatype is:

`codatatype ('e, 'r) itree = Ret 'r | Sil "('e, 'r) itree" | Vis "'e →↦ ('e, 'r) itree"`

(section 3.1, p. 7). The codatatype permits infinite depth, and a partial function can describe infinitely many visible events symbolically. Enumeration for animation requires further restrictions (section 6, pp. 29–30).

How to use it.

1. Choose events and return/state values.
2. Encode termination with `Ret`, internal computation with `Sil`, and enabled external events with a partial function in `Vis` (section 3.1, p. 7).
3. Represent deadlock as an empty visible choice (`stop`) and divergence as a productive corecursive tree `div = Sil div` (section 3.1–3.2, pp. 7–8).
4. Compose trees with monadic bind. The bind equations pass a returned value to a continuation, preserve internal steps, and bind every visible continuation (Definition 3.5, p. 9).
5. Use homogeneous Kleisli trees `S ⇒ (E,S) itree` for stateful processes and compose them with `#` (section 3.2, p. 9).

The buffer example uses partial-function override to offer input, output when non-empty, and a state-observation event; disjoint event domains make the choices commute (section 3.1, pp. 7–8).

Verus form. Inference: represent a finite executable approximation as an enum or trait object and give a separate `spec fn` transition relation for potentially infinite behaviour. A possible Rust adaptation would use explicit state-machine invariants and seek proofs of bind and invariant lemmas for that encoding. The paper supplies no Verus implementation or evidence that its codatatype and productivity checks transfer.

Evidence and limits. The paper proves bind laws, operational-semantic results, and weak-bisimulation properties in Isabelle (sections 3.2–3.4). The semantics is executable, but arbitrary partial functions are not directly enumerable; animation therefore needs a finite data refinement (section 6, p. 29).

## technique: derive operational and axiomatic semantics

What it is. The paper defines big-step operational semantics using a relation that records a visible trace and a continuation ITree (Definition 3.9, p. 10). The same trees support relational and Hoare-style reasoning. Weak bisimulation abstracts finite silent steps; iteration chains support the terminating-loops theorem (sections 3.3–3.4, pp. 10–12).

Steps for an imperative model.

1. Define a state type and commands as state transformers represented by homogeneous Kleisli trees (section 4.1, pp. 13–14).
2. Encode a state update as `Ret` of the updated state and a conditional by selecting a branch from the initial state. Neither definition inserts a `Sil`; the while-loop definition inserts a silent step before each executed body (Definitions 4.1 and 3.8, pp. 13–14 and 10).
3. Execute by stripping silent steps up to `MAX_SIL_STEPS`. Use SML code generation for concrete execution and normalisation by evaluation or the simplifier for symbolic execution. Execution reports termination, abort, visible choice, or timeout (section 4.2, pp. 15–16).
4. Define a relational/predicative semantics from reachable final states. It abstracts away traces and maps both `Stop` and `Div` to `False`, so the resulting refinement is a preorder rather than an antisymmetric order (section 4.4, pp. 17–18).
5. State Hoare triples and weakest preconditions over the tree semantics. For loops, provide an invariant and a variant for total correctness; the list-reversal example uses `ys = rev (take i xs)` and variant `length xs - i` (sections 4.5–4.6, pp. 19–21).
6. Generate verification conditions and discharge them with Isabelle's simplifier and Sledgehammer (section 4.6, pp. 21–22).

Verus form. Inference: encode the state transformer as executable Rust plus a `spec fn` relational semantics. Use `requires`/`ensures`, loop `invariant` clauses, and a decreasing `decreases` measure for termination. Prove refinement between the executable function and the abstract ITree transition relation; this is the Rust analogue of the paper's semantic correspondence.

Evidence. The paper reports mechanised theorems and examples. Its conclusion states: “Our results indicate that the technique provides both tractable verification, with the help of Isabelle’s proof automation [10], and efficient execution.” (section 9, p. 37). The list-reversal example produces one displayed verification condition, discharged using Sledgehammer; its variant proof is discharged by the simplifier (section 4.6, p. 22).

## technique: animate verified models by code generation

What it is. Isabelle's code generator can extract to SML, Haskell, and Scala; the animator uses Haskell and its lazy evaluation to step through potentially infinite trees. A finite associative-list representation implements partial functions so the animator can enumerate enabled events (section 6, pp. 29–30).

Steps.

1. Refine each partial function `A →↦ B` to an associative list `(A × B) list` (section 6, p. 29).
2. Bound infinite input domains, for example replace `{0..}` with `{0..3}` for animation (section 6, p. 30).
3. Generate code, add animator code, compile with GHC, and run the binary. The `animate` command performs these four steps (section 6, p. 30).
4. Skip internal `Sil` steps until a return or visible choice; show a menu and let the user select an event. Pause after 20 silent steps and let the user continue or abort. An empty visible choice ends the animation due to deadlock (section 6, p. 30). The paper states: “The user can continue or abort the animation after n = 20 𝜏 steps.”

The reported ring-buffer experiment ran on an Apple M3 Pro with 18 GB memory: 100 cells animated efficiently, 850 cells took about 3 seconds per next step, and 5000 cells about 50 seconds (section 6, p. 31). The authors say the highest number of cells they could reasonably animate was around 2000 and that they had not attempted code optimisation. They do not report repeated-trial counts (section 6, p. 31).

Verus form. Inference: a possible adaptation would generate a Rust simulator from an executable state machine and prove that each generated step refines an abstract transition relation. Finite event bounds would need to appear in the specification; checking a bounded animation alone would not establish unbounded behaviour.

## technique: Z-Machines with invariant checking

What it is. A Z-Machine packages a state type, invariants, parameterised operations, and initialization (Definition 7.1, p. 32). The paper states: “Operations are used to update the value of state variables deterministically and can optionally take inputs and produce outputs.” (section 7, p. 32).

Steps.

1. Declare state fields and invariants with `zstore`; the bounded-buffer example links `sz = length buf` and `sz ≤ MAX_SIZE` (section 7, p. 32).
2. Declare each operation's parameter sets, precondition, and simultaneous update with `zoperation` (section 7, pp. 32–33).
3. Translate an operation to an enabled event when its parameter valuation satisfies the precondition; otherwise its behaviour is `Stop` (Definition 7.4, p. 33).
4. Compose initialization with a loop over an external choice of operations: `⟨σ⟩ # loop(Op1 2 ... 2 Opn)` (Definition 7.6, p. 33).
5. Prove that initialization establishes the invariants and each operation preserves them. The `zpog_full` method applies weakest-precondition laws and automation; in the buffer example it solves the first three proofs, and the fourth additionally uses a `metis` proof found by Sledgehammer (section 7, pp. 34–35).
6. Animate after providing concrete definitions for abstract constants and finite parameter sets or enumerable types (section 7, p. 34).

Verus form. Inference: encode the store invariant as a `spec fn`, operation preconditions as `requires`, updates as executable Rust, and preservation as proof lemmas. A state-machine module can expose only transitions that preserve the invariant; animation then executes the same transitions.

## what is proved, measured, and trusted

Mechanised results include bind laws, operational semantics, weak bisimulation and iteration theorems, the correspondence with predicative semantics, imperative Hoare laws, and links with CSP failures-divergences semantics (sections 3–5). Section 7 demonstrates Z-Machine invariant proofs. Section 6 implements animation using Isabelle's existing code generator and reports ring-buffer timings on one platform; it does not present a new proof of the Haskell compiler or runtime.

Inference: confidence in executions depends on the proof assistant, code generation, compilation, and runtime. For the intended application, the chosen model and invariants must also express the intended requirements.

Inference: for agent-written verified Rust, the paper suggests keeping one executable transition model connected to proofs and tests.

The paper demonstrates concurrency through deterministic CSP/Circus operators and the distributed ring buffer (sections 5–6). Its external choice excludes shared enabled events, parallel composition excludes ambiguous independent events, and hiding deadlocks if more than one enabled event is hidden (section 5.1, pp. 23–25). Nondeterministic choices can instead be exposed through special oracle events (section 4.3, p. 16). Real-time operators and generating imperative target code are future work (section 9, pp. 37–38).

## techniques for the catalog

- interaction trees: use executable coinductive trees with return, silent, and visible-event constructors as a shared semantic object
- semantic unification: derive operational, relational, Hoare, and process-algebra views from the same tree
- invariant-based Hoare verification: prove loop invariants and variants, then discharge generated conditions with automation
- verified animation: refine partial functions to finite lists, generate code, and interactively explore enabled events
- Z-Machines: package state invariants and guarded operations into an executable and verifiable abstract machine
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The forward law allows us to push the effect of the assignment into the precondition."): read the entire paper text and study; checked quotations, numbers, references, technique steps, and scope; corrected the operational semantics, assignment and conditional encodings, animation timeout, Z-Machine composition and proof references, and unsupported proof and scope claims; replaced the link with the paper’s arXiv identifier; did not run Isabelle, inspect the linked repository, reproduce timings, or validate proposed Verus adaptations.
