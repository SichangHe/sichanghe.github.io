# Scalable Verification of GNN-Based Job Schedulers
(authored by agents unless marked 🧑)
Tag: `wu2022scalable`, [paper](http://arxiv.org/abs/2203.03153v4)

## result

Wu et al. introduce vegas, a verifier for graph-neural-network (GNN) job schedulers. The abstract says it combines “abstractions, refinements, solvers, and proof transfer” for single-step and multi-step properties. It also states: “We develop vegas, the first general framework for verifying both single-step and multi-step properties of these schedulers” (abstract). The GNN outputs a score for each frontier node and the node with the highest score is scheduled; specifications have the form φin → φout, with φin a conjunction of linear constraints over input features, and φout either linear-inequality constraints on the outputs (single-step) or unreachability of “bad” traces of scheduling decisions (multi-step) (Sec. 2.1, PDF pp. 3–4). The evaluation target is the Decima scheduler (Sec. 3.3, PDF p. 10).

## technique 1: forward-backward abstraction refinement

Use this when ordinary forward abstract interpretation is too imprecise on deep networks. Choose a sound abstract domain with concretization `γ`, bottom, abstraction `α`, bounds, conditional transformer, layer transformer, and meet operation (Sec. 4.1, PDF p. 11). Initialize forward and backward elements for every layer to top. Forward-propagate the input using a transformer that meets the ordinary transformer applied to both the forward and backward element. Backward-condition the output on the bad set `¬φout`; then, from the output toward the input, solve two LPs per neuron for lower and upper bounds using linear relaxations of later layers, and meet those bounds into the backward element (Algorithm 1, Secs. 4.1–4.2, PDF pp. 11–13).

Repeat forward and backward passes until a stop condition. If the conditioned output element, or a backward element at a layer above the input, becomes bottom, return HOLD (Algorithm 1, lines 7 and 13). Otherwise fall back to a complete non-linear encoding (a MILP encoding for Leaky ReLU, as used for Decima) combined with the linear constraints from the refined abstract elements. The paper states: “Theorem 4.6. Alg. 1 is sound, i.e., 𝜙in ∧ ¬𝜙out is unsatisfiable when the algorithm returns HOLD” (Sec. 4.3, PDF p. 14). Refinement is monotone, but arbitrary domains need not converge; for Leaky ReLU the implementation stops when a pass fixes no activation phase, usually within six iterations (Sec. 4.3, PDF p. 14).

Inference: Verus can model this as a ghost abstract domain with `spec fn concretization`, soundness lemmas for each transformer, and a loop invariant that each abstract element overapproximates the concrete states satisfying `φin ∧ ¬φout`. LP/MILP solvers and real arithmetic would remain trusted or externally certified; this is not a direct Rust verification algorithm.

## technique 2: node abstraction for disjunctive output properties

Use this when a postcondition is a conjunction over many candidate nodes, so its negation has many disjuncts. Instead of proving each node inequality separately, group embeddings from several nodes into one abstract embedding interval and verify the shared prediction network against that abstraction. If the grouped inequality is proved, all members satisfy it. If a spurious counterexample appears, remove the embedding that most reduces the abstraction volume and retry; continue until success, a real counterexample, or singleton groups (Sec. 2.3, PDF pp. 7–8; Sec. 5, Algorithm 2, PDF pp. 14–16).

The method exploits that node predictions apply the same network to each node embedding. It is sound when the grouped embedding abstraction contains every concrete embedding. Inference: a Verus analogue is a ghost set of candidate states and a lemma that a common contract holds for every member; grouping is useful only if the abstract predicate is proved to contain the concrete set.

## technique 3: trace enumeration with proof-transfer encoding

Use this for multi-step properties such as unreachability of a bad scheduling sequence. Maintain a stack of partial traces, beginning with `nil`. Pop a trace and match it against the bad-trace specification. On MATCH return VIOLATED or UNKNOWN depending on completeness; on NOMATCH (no trace in T has it as a prefix) discard it; if it is only a proper prefix of some bad trace, encode each prior network, action, and feature update, compute possible next actions with the single-step engine, and push each extended trace (Algorithm 3, Sec. 6, PDF pp. 16–18).

A complete encoding tracks all prior steps but can re-encode the whole GNN repeatedly. The proof-transfer network instead reuses unchanged message-passing structure and re-encodes only graph components whose features changed. Theorem 6.1 proves termination for finite bad traces; Theorem 6.2 proves soundness when encodings and `getPossibleActions` are sound (Sec. 6, PDF p. 18). Inference: this corresponds to a Verus state-machine proof that reuses unchanged transition lemmas while proving only the changed component's relation.

## evidence and limits

The experiments use Decima, 32 threads, 128 GB memory, one-hour single-step and two-hour multi-step limits (Sec. 8.2, PDF p. 20). Of 298 single-step queries, 257 were proved, 20 disproved with counterexamples, and 28 unknown (Sec. 8.3, PDF p. 22). The node abstraction was evaluated only on the subset with at least 4 frontier nodes in the adversarial job; both configurations solved all 66 10-job benchmarks there, and the paper reports a runtime reduction of 51.2%. It reports “around 2-4x speed-up in a majority of the cases”, with two cases where time was not improved or became worse (Sec. 8.3, PDF pp. 22–23). The benchmarks are local properties on concrete job profiles, heuristically selected as challenging, with α set to 20 (Sec. 8.3, PDF p. 21). These denominators and settings limit the claim to this Decima benchmark suite.

Inference: the product threat is indirect but relevant for learned components. The work verifies a numerical neural policy, not Rust memory safety or a scheduler implementation. VL should reuse the abstraction-refinement, trace, and proof-transfer decomposition when an agent-written system embeds a learned policy; it should not redo GNN-specific encodings without a product need. Trusted items include the abstract-domain soundness, LP/MILP/SMT solvers, model extraction, and correspondence between the encoded GNN and deployed scheduler.

## techniques for the catalog

- forward-backward refinement — alternate sound forward transformers and LP-guided backward conditioning until the bad set is excluded or a complete solver is needed
- node abstraction refinement — verify many disjunctive node constraints through one embedding abstraction, then split the group on spurious counterexamples
- trace enumeration — enumerate feasible action prefixes and stop on a matching bad trace
- proof-transfer encoding — reuse unchanged graph/network structure across time steps while encoding only local feature updates
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "However, due to the non-interpretable nature of the GNN-based scheduler, strategy-proofness cannot be guaranteed by construction."): read the whole paper text (main text, references, appendices A–D) and checked every quotation, number, section/page reference and algorithm step in the study against it; changed the abstract-quote punctuation, the description of specifications, the fallback encoding (paper says MILP/non-linear, not SMT), the HOLD conditions, the trace-match description, and the node-abstraction results wording ("a majority of the cases", not "usually"; added benchmark scope); not checked: the Verus modelling inferences (marked Inference), the correctness of the paper's proofs, and the PDF figures beyond their captions. Link kept from the fetch record (the paper text also gives DOI 10.1145/3563325).
