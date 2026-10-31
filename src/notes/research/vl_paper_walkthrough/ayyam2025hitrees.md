# HITrees: Higher-Order Interaction Trees
(authored by agents unless marked 🧑)
Tag: `ayyam2025hitrees`, [paper](https://arxiv.org/abs/2510.14558)

## contribution
HITrees are an inductive Lean representation of interaction trees that supports effects receiving or returning computations. The paper identifies the gap directly: “While the notion of effects supported by ITrees and most variants of the free monad is quite general, there is one important class of effects that is not supported: Higher-order effects” (pp. 1–2). Its key claim is: “we propose higher-order interaction trees (HITrees), the first version of interaction trees supporting higher-order effects in a non-guarded type theory” (p. 2). The implementation includes Lean metaprogramming commands, executable and state-machine interpretations, and effects for state, failure, nondeterminism, concurrency, recursion, and call/cc.

Inference: HITrees are a semantics and proof-library technique rather than a Verus verifier. They are relevant when a Verus project needs a compositional model of effects around verified Rust components.

## technique 1: inductive HITree and effect algebra
Define an `Effect` as input and output types `I` and `O`. Define `HITree E ρ` with `pure r`, `impure i k`, and `unreachable`; the paper's preliminary definition (Figure 2, p. 3) has exactly these three constructors, and the full definition (Figure 4, p. 6) uses an intermediate type `HITree.Raw` with the same three constructors. To use it: (1) declare an effect with operations and generated input/output sum types; (2) construct `pure` for values; (3) construct `impure` with an operation and continuation; (4) use `unreachable` only for branches impossible to rule out statically. Effects compose with sum `E1 ⊕e E2`; a `Subeffect` class maps inputs into a larger effect and partially maps outputs back, and `trigger` injects an operation into any super-effect (pp. 3–4). The ExampleLang semantics (Sec. 2.1) uses `FailE` to reject non-integer addition, then adds `StateE`, demonic choice, concurrency, and recursion.

Inference: Verus can encode the tree as an inductive Rust enum in specifications, with ghost state and recursive predicates; a verified interpreter would need a termination measure or bounded execution. `unreachable` should map to an explicitly impossible branch proved by a lemma, rather than panic in verified code.

## technique 2: higher-order inputs and outputs
Higher-order inputs are handled by ensuring effect output types do not depend on operation inputs, allowing effect fixpoints to be inductive. Dependent effects are recovered by a dynamic check: the generated operation functions pattern match on the output after `trigger` and return `unreachable` on a mismatch (p. 4), and the paper's `choose` returns a subtype `(x : α // p x)` and maps failed predicates to `unreachable` (p. 5). The paper notes the limit: the cast must be decidable, and `DemonicE`'s first attempt (`choose : (α : Type) → α`) cannot be encoded (Sec. 7). Higher-order outputs use defunctionalization: replace a returned HITree with an abstract identifier and provide a separate effect that runs the identifier's computation (p. 2; details on pp. 5–6). The paper says that these two techniques “enable HITrees to support a large variety of higher-order effects including the par effect from above, a call/cc effect that allows capturing the current continuation, and a fixpoint combinator rec” (p. 2).

Inference: in Verus, defunctionalized identifiers can be ghost IDs into a verified table of closures represented by enums; the table invariant must prove each ID's specification. Rust trait objects and arbitrary higher-order closures do not carry over directly to Verus proofs.

## technique 3: generated effects and recursive fixpoints
The `effect` command generates inductive operation types and lifted operation functions. The `fix_effect` command defines recursive effects while preserving strict positivity: it creates a pre-effect, reduces output types, and defines an inductive input type whose recursive occurrences appear only as arguments to type constructors of inductive types (Sec. 3.3, pp. 7–8). Because the generated input type takes `ConcE`'s recursive arguments as separate `ExE.I` and `ExE.O`, Lean accepts it (p. 8). `UnfoldEffect` establishes an isomorphism between a recursive effect and its unfolding, allowing subeffect instances and handlers to be reused. This is the method behind `fix_effect ExE := ConcE Val ExE ⊕e FailE ⊕e ...` (p. 5); the plain `def ExE := ConcE Val ExE ⊕e FailE ⊕e ...` is rejected by Lean with a termination error.

Inference: a Verus encoding would use an explicit finite effect enum or an inductive specification with a structural decreases proof. I did not check whether Verus offers anything equivalent to `fix_effect`; any code generation would sit outside the verified proof.

## technique 4: executable monad interpretation
Define `MHandler E E' ρ m` with a `handle` function that interprets one impure operation and continuation into an executable monad. Define `eval` by recursion: return pure values, invoke the handler for impure nodes, and panic on `unreachable` (Figure 7, p. 8). Sum handlers dispatch to the corresponding component handler, and unfolding handlers lift handlers from a recursive pre-effect. The StateE example forwards `get` and `set` to a monad state (p. 8). This supports concrete execution, including the round-robin scheduler in the concurrency handler.

Inference: verified Rust can use a ghost execution relation and a concrete interpreter, proving a refinement theorem from interpreter steps to the relation. The paper's `panic!` behavior for `unreachable` must be replaced by a proved impossibility or an explicit error result when safety is required.

## technique 5: state-machine interpretation for reasoning
Define an `EHandler` relation over an operation, current state, continuation, and postcondition. Require monotonicity in the postcondition (`handle_mono`). Define `execPre` with halt and step constructors, then define `exec` as a coinductive fixpoint (`coinductive_fixpoint`, whose monotonicity follows from `handle_mono`) (Figure 8, p. 9). This yields a big-step relation `(t,s) ⇓T` covering all possible executions, including infinite ones. The paper states that “The use of co-induction means that exec can represent infinite executions” (p. 9). Demonic choice uses an existential successor satisfying its predicate; the paper says that, following Vistrup et al. [2025], one obtains reasoning rules for co-induction, bind, and lifting `EHandler` through effect composition (p. 9).

Inference: I did not check whether Verus can express Lean's coinductive fixpoint; if not, a bounded approximation or an externally trusted coinductive model would be needed for claims about infinite executions.

## technique 6: recursion, call/cc, and concurrency handlers
`RecE` stores fixpoint functions in a list indexed by `FId`; `fix` appends a function and calls it, while `call` looks up an ID and invokes it (Figure 9a, p. 10; text on pp. 9–10). `CallccE` stores continuations in a list indexed by `KId`; `callcc` captures the current continuation, passing its `KId` to a function, and `throw` invokes a stored one (Figure 9b, p. 10). `ConcE` represents `par`, `yield`, and `kill` using a thread pool; the state-machine handler chooses any runnable thread, while the executable handler uses round-robin scheduling (Figure 10, p. 10; text on p. 11). The case study combines state, call/cc, recursion, concurrency, failure, and demonic allocation in one recursive effect and checks the “very awkward example”; evaluating the call/cc context `C_callcc` with `eval` fails the assertion, while `eval` of the concurrent context `C_conc` succeeds because the round-robin scheduler does not pick the violating interleaving; the paper then proves with `exec` that both contexts have an execution violating the assertion (Figure 12 and Sec. 6, pp. 11–12).

What the paper presents as proved: the `exec` theorems `callcc` and `conc` for the two contexts (Figure 12, p. 11), the monotonicity of the handlers (`handle_mono`), and a `LawfulMonad` instance for HITrees (Figure 4, p. 6). I found no theorem in the paper relating `eval` to `exec`. Inference: the trusted base is Lean's kernel and the metaprogramming commands, plus whatever the handler definitions assume, such as the scheduler; the paper does not discuss this. Inference: the product threat is moderate: an agent could produce a plausible effect model whose handler does not refine Rust behavior; the state-machine relation and explicit handler proofs provide a useful audit boundary.

## techniques for the catalog

- interaction trees: represent pure and effectful computations compositionally with `pure`, `impure`, and `unreachable`
- subeffects: inject operations into sums of effects and recover operation-specific outputs
- higher-order effects: use nondependent outputs plus defunctionalized computation identifiers
- recursive effects: generate strictly positive inductive fixpoints and reuse handlers through unfolding isomorphisms
- executable interpretation: interpret trees through modular monadic handlers
- state-machine reasoning: define monotone handlers and a coinductive execution relation
- control and concurrency: model recursion IDs, continuation IDs, and thread pools as explicit effects
- limits stated by the paper: outputs cannot depend on inputs statically, and HITrees are inductive, so they cannot natively represent infinite computations and `rec f = f (rec f)` does not hold (Sec. 7, p. 12)
