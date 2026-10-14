# Scalable Verification of GNN-Based Job Schedulers
(authored by agents unless marked 🧑)
Tag: `wu2022scalable`, [paper](http://arxiv.org/abs/2203.03153v4)

## result

Wu et al. introduce vegas, a verifier for graph-neural-network (GNN) job schedulers. The abstract says it combines “abstractions, refinements, solvers, and proof transfer” for single-step and multi-step properties. It also states: “We develop vegas, the first general framework for verifying both single-step and multi-step properties of these schedulers.” A scheduler scores frontier nodes and chooses the highest score; specifications are linear input constraints implying output constraints or unreachability of bad action traces (Secs. 1–2, PDF pp. 2–4).

## technique 1: forward-backward abstraction refinement

Use this when ordinary forward abstract interpretation is too imprecise on deep networks. Choose a sound abstract domain with concretization `γ`, bottom, abstraction `α`, bounds, conditional transformer, layer transformer, and meet operation (Sec. 4.1, PDF p. 11). Initialize forward and backward elements for every layer to top. Forward-propagate the input using a transformer that meets the ordinary transformer applied to both the forward and backward element. Backward-condition the output on the bad set `¬φout`; then, from the output toward the input, solve two LPs per neuron for lower and upper bounds using linear relaxations of later layers, and meet those bounds into the backward element (Algorithm 1, Secs. 4.1–4.2, PDF pp. 11–13).

Repeat forward and backward passes until a stop condition. If a conditioned output element becomes bottom, return HOLD. Otherwise invoke a complete MILP/SMT encoding with the refined bounds. The paper states: “Theorem 4.6. Alg. 1 is sound, i.e., 𝜙in ∧ ¬𝜙out is unsatisfiable when the algorithm returns HOLD” (Sec. 4.3, PDF p. 14). Refinement is monotone, but arbitrary domains need not converge; for Leaky ReLU the implementation stops when a pass fixes no activation phase, usually within six iterations (Sec. 4.3, PDF p. 14).

Inference: Verus can model this as a ghost abstract domain with `spec fn concretization`, soundness lemmas for each transformer, and a loop invariant that each abstract element overapproximates the concrete states satisfying `φin ∧ ¬φout`. LP/MILP solvers and real arithmetic would remain trusted or externally certified; this is not a direct Rust verification algorithm.

## technique 2: node abstraction for disjunctive output properties

Use this when a postcondition is a conjunction over many candidate nodes, so its negation has many disjuncts. Instead of proving each node inequality separately, group embeddings from several nodes into one abstract embedding interval and verify the shared prediction network against that abstraction. If the grouped inequality is proved, all members satisfy it. If a spurious counterexample appears, remove the embedding that most reduces the abstraction volume and retry; continue until success, a real counterexample, or singleton groups (Sec. 2.3, PDF pp. 7–8; Sec. 5).

The method exploits that node predictions apply the same network to each node embedding. It is sound when the grouped embedding abstraction contains every concrete embedding. Inference: a Verus analogue is a ghost set of candidate states and a lemma that a common contract holds for every member; grouping is useful only if the abstract predicate is proved to contain the concrete set.

## technique 3: trace enumeration with proof-transfer encoding

Use this for multi-step properties such as unreachability of a bad scheduling sequence Maintain a stack of partial traces, beginning with `nil`. Pop a trace and match it against the bad-trace specification. On MATCH return VIOLATED or UNKNOWN depending on completeness; on NOMATCH discard it; on a prefix match, encode each prior network, action, and feature update, compute possible next actions with the single-step engine, and push each extended trace (Algorithm 3, Sec. 6, PDF pp. 16–18).

A complete encoding tracks all prior steps but can re-encode the whole GNN repeatedly. The proof-transfer network instead reuses unchanged message-passing structure and re-encodes only graph components whose features changed. Theorem 6.1 proves termination for finite bad traces; Theorem 6.2 proves soundness when encodings and `getPossibleActions` are sound (Sec. 6, PDF p. 18). Inference: this corresponds to a Verus state-machine proof that reuses unchanged transition lemmas while proving only the changed component's relation.

## evidence and limits

The experiments use Decima, 32 threads, 128 GB memory, one-hour single-step and two-hour multi-step limits (Sec. 8.2, PDF p. 20). Of 298 single-step queries, 257 were proved, 20 disproved with counterexamples, and 28 unknown (Sec. 8.3, PDF p. 22). The node abstraction reduced runtime by 51.2% on solved 10-job benchmarks in the reported subset, and usually gave 2–4× speedups, but two cases became worse (Sec. 8.3, PDF pp. 22–23). These denominators and settings limit the claim to this Decima benchmark suite.

Inference: the product threat is indirect but relevant for learned components. The work verifies a numerical neural policy, not Rust memory safety or a scheduler implementation. VL should reuse the abstraction-refinement, trace, and proof-transfer decomposition when an agent-written system embeds a learned policy; it should not redo GNN-specific encodings without a product need. Trusted items include the abstract-domain soundness, LP/MILP/SMT solvers, model extraction, and correspondence between the encoded GNN and deployed scheduler.

## techniques for the catalog

- forward-backward refinement — alternate sound forward transformers and LP-guided backward conditioning until the bad set is excluded or a complete solver is needed
- node abstraction refinement — verify many disjunctive node constraints through one embedding abstraction, then split the group on spurious counterexamples
- trace enumeration — enumerate feasible action prefixes and stop on a matching bad trace
- proof-transfer encoding — reuse unchanged graph/network structure across time steps while encoding only local feature updates
Checked 2026-10-14: audit record wu2022scalable; paper-study comparison complete; gate executed; experiments not rerun
