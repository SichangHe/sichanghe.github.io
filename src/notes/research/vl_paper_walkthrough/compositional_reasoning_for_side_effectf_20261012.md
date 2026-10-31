# Compositional Reasoning for Side-effectful Iterators and Iterator Adapters
(authored by agents unless marked 🧑)
Tag: `bila2022compositional`, [paper](https://arxiv.org/abs/2210.09857v1)

## scope and result

Bílá et al. present a modular specification method for Rust iterators whose closures and adapters mutate state. The central problem is to expose both yielded values and accumulated effects while keeping each iterator reusable in arbitrary chains. The paper's abstract states: “We present the first methodology for the modular specification and verification of advanced iteration idioms with side-effectful computations.” The method combines four ghost specifications, closure call descriptions, snapshots, and ownership. It is implemented as a Prusti extension and evaluated on iterator and adapter examples.

## technique 1: four-state iterator contract

what it is

Attach four ghost functions to every iterator: `produced`, `completed`, a one-step relation `step`, and a transitive relation `leadsto`. `produced(Ik)` is the sequence returned before state `Ik`; `completed` says that `next` returns `None`; `step(Ik, Ik+1, v)` describes one call; `leadsto(Ik, Il)` summarizes any number of calls. The paper defines `leadsto` as “the reflexive, transitive closure of the two-state postcondition step”.

when to use it

Use `step` for reasoning about one `next`, and `leadsto` as a loop invariant or client contract spanning an unknown number of calls. This is needed whenever correctness depends on state accumulated across iteration, such as a running sum.

how to do it

1. Add a ghost sequence recording values returned so far
2. Define `completed` from the concrete stopping condition
3. Define `step` over pre-state, post-state, and returned `Option`
4. Define `leadsto` so it is reflexive and transitive over valid steps
5. Put five postconditions on `next`: Q1 establishes `step`; Q2 equates `completed` with `None`; Q3 keeps `produced` unchanged after completion; Q4 appends a value before completion; Q5 makes completion monotone
6. Maintain `leadsto(initial, current)` in client loops

The paper's Q4 code shape requires that the new result is the last produced element, the length grows by one, and the old sequence is a prefix. Its proof obligations are explicitly listed as “Q1 ≡ step(Ik,Ik+1,vk)” through “Q5 ≡ completed(Ik) ⇒ completed(Ik+1)”.

Verus form (inference)

In Verus, represent `produced` with a ghost `Seq<T>` field or a view, and write `spec fn completed`, `step`, and `leadsto` over snapshots or cloned ghost state. Express Q1–Q5 with `ensures`, `old(...)`, and `ghost` updates in `next`. Use `invariant` clauses to preserve `leadsto` in loops. Verus's ownership and mutable-borrow rules supply the interference control that this paper obtains from Rust ownership; the exact `FnMut` call-description encoding is a design inference, not a result shown by the paper.

evidence and limits

The counter example proves values over repeated calls and a loop. The method assumes `next` is the only mutating method, or else every mutator must preserve `leadsto`. The paper warns that “If the iterator state may be modified by methods other than next, one can interpret leadsto as a standard two-state invariant on the iterator type.” The authors suspect the expensive outliers need extra effort to control quantifier instantiation (Sec. 8).

## technique 2: closure call descriptions for side effects

what it is

A call description records that a closure was invoked, with its pre-state, argument, post-state, and result. For `Map`, the step relation says that the predecessor yields an argument and `FnMut::call_mut` transforms it while changing captured variables. This makes a generic adapter specification depend on closure behavior without knowing its concrete type.

when to use it

Use it for `map`, `filter`, or custom adapters where a closure mutates captured state and the client needs the final state after the iterator expires. The running-total example maps `[6,2,9]` to `[6,8,17]` and must prove both the sequence and final `sum`.

how to do it

1. State that a predecessor step occurs when it is not completed
2. Bind the closure's old state to the adapter's old field
3. Bind the closure argument to the predecessor's newly produced value
4. Bind the closure's new state to the adapter's new field
5. Bind the adapter result to the closure result
6. Instantiate the abstract call description with the client's closure contract

The paper gives the concrete closure shape `#[ensures(sum == old(sum) + arg && result == arg * 2)] |arg| { sum += arg; arg * 2 }` and reports that “The final assertion ... follows from the call description”.

Verus form (inference)

Model a closure as a struct carrying ghost or concrete captured fields, and expose a spec contract for its call method. In Verus, a `spec fn` relation can describe pre/post snapshots; a wrapper adapter can `ensures` that relation. Since Verus does not automatically provide the paper's Prusti call-description syntax, one must encode the closure invocation relation explicitly or use trait contracts and proof lemmas.

evidence and limits

The client example proves two outputs and `sum == 1` after two calls. Closure contracts may need to be written manually; the authors say inference for simple closures is “orthogonal to our presented technique”.

## technique 3: compositional adapter chains and ghost histories

what it is

Specify an adapter only in terms of its predecessor's contracts. For nested adapters, use nested call descriptions: an outer `Map` records a call to predecessor `next`, then a call to its own closure. A ghost sequence `st` stores intermediate `(closure_state, iterator_state)` tuples, allowing `leadsto` to relate every historical step and propagate transitive side effects.

when to use it

Use this for chains such as `vector.into_iter().map(cl1).map(cl2)` where an outer adapter cannot know the predecessor's concrete type but the client still needs effects from inner closures.

how to do it

1. In `step`, describe the predecessor `Iterator::next` call and bind old/new predecessor states
2. If its result is `Some`, describe the closure call and connect its argument/result
3. If its result is `None`, require the outer result to be `None`
4. In `leadsto`, require the old `st` to be a prefix of the new `st`
5. Require `st.len() == produced.len() + 1` and its last tuple to equal current fields
6. Quantify over each produced index and connect consecutive history tuples to predecessor and closure calls
7. Use the resulting history as the loop invariant

The paper says, “neither the input iterator nor the adapter need to be re-verified when forming an iterator chain.”

Verus form (inference)

Use ghost `Seq` histories of tuples or separate histories for predecessor and closure state, with a prefix relation such as `old_hist.is_prefix_of(hist)` in the `leadsto` spec fn and quantified index lemmas. Keep each adapter generic over a trait contract. Verus's trait bounds and `ensures` can express the compositional interface, but higher-order closure history requires explicit ghost bookkeeping.

evidence and limits

The nested-map example propagates the inner closure's captured `sum`; the summation loop proves `sum == vec_vals.sum()`. The paper assumes fused iterators and uses Rust ownership to prevent concurrent modification and undesirable interference. The implementation needed roughly 340 lines of common specifications, and generic library specs were “roughly one-to-one with code”; client specs were usually lighter. Table 1 reports verification times averaged over seven runs: counter 9.53 s, double 9.95 s, map 42.12 s, zip 84.46 s for implementation tests. Filter examples marked `*` were manually encoded in Viper because Prusti issues prevented Rust support.

## technique 4: snapshots and out-of-band contracts

Snapshots abstract an entire tree-shaped Rust value, ignoring addresses while retaining fields. They let two-state predicates be ordinary ghost functions over old and new snapshots and encode naturally into SMT. For standard-library traits, the authors add an `IteratorSpec` extension trait and an `#[extern_spec]` contract with `type_dependent(Self: IteratorSpec, ...)`, so existing `Iterator` code need not change. Contracts must refine the base contract: weaken preconditions and strengthen postconditions.

Verus form (inference)

Use `view` functions as snapshots, a separate specification trait, and external specifications where library source cannot be edited. Conditional trait contracts can be approximated with trait bounds and wrapper traits; exact type-dependent extern-spec behavior is verifier-specific.

## what is proved, measured, and trusted

The verifier proves each `next` implementation against Q1–Q5 and proves client assertions from those contracts. The prototype is Prusti plus user-facing Rust specifications. The soundness argument relies on a sound verifier for method contracts and call descriptions; client closure contracts are supplied assumptions. The paper does not claim kernel-checked proofs independent of Prusti. Evaluation covers seven implementation tests and seven client tests, with line counts and seven-run wall-clock times; no aggregate success denominator is reported.

## techniques for the catalog

- four-component iterator contracts — define `produced`, `completed`, `step`, and transitive `leadsto`, then enforce Q1–Q5 on `next`

- closure call descriptions — connect generic adapter steps to closure arguments, results, and captured-state transitions

- compositional ghost histories — store intermediate iterator/closure states and use prefix plus quantified call relations for unbounded chains

- snapshot-based two-state specs — compare whole data-structure states as mathematical values suitable for SMT

- out-of-band conditional contracts — attach iterator postconditions through an extension trait and type-dependent external specification

Audited 2026-10-12 against the paper: checked Sec. 3.2-3.3 (four components, Q1-Q5), Sec. 4.3, 5.1-5.3 examples and code, Sec. 6, Sec. 7, Table 1 numbers (9.53, 9.95, 42.12, 84.46 s; seven runs; 340 LoC), the quotations, and the Verus forms. Changed: removed the visited-node set example (not in the paper); reworded the quantifier-tuning sentence as the authors suspicion (Sec. 8); fixed the Verus prefix method name to is_prefix_of and moved it out of a loop invariant. Everything else matched.
