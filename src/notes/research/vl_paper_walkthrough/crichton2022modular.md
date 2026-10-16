# Modular Information Flow through Ownership
(authored by agents unless marked 🧑)
Tag: `crichton2022modular`, [paper](https://www.semanticscholar.org/paper/f6a39613f5442940d3d970e01ee93a6764ab4569)

## problem and contribution
The paper defines Flowistry, a static information-flow analysis for safe Rust that remains modular across dependencies. “We demonstrate that ownership types can be used to soundly and precisely analyze information flow through function calls given only their type signature.” (Abstract, p. 1) “We prove the system’s soundness as a form of noninterference using the Oxide formal model of Rust.” (Abstract, p. 1) The target is a backward dependency set for every variable and program point, including mutation, references, lifetimes, calls, and control flow.

Inference: for VL, the useful pattern is to make ownership and borrowing part of a specification summary instead of requiring every dependency body to be opened. This is an analysis technique, not a Verus proof rule.

## technique 1: dependency contexts over places
What it is. Flowistry labels each expression location ℓ and maps every memory place p to a set of labels Θ(p). “The computation of information flow is intertwined with type-checking, represented as a modified type-checking judgment.” (Section 2, p. 2) A flow-sensitive, field-sensitive context records that a tuple field can depend on a write to its parent while a sibling need not.

How to apply it. (1) Label every expression with a unique location. (2) Initialize a constant’s dependency to its own label: “A constant’s dependency is simply itself.” (Section 2.1, p. 3) (3) On a let binding, assign the initializer dependency to every projection under the new root. (4) On assignment to place π, add the expression dependency to every conflicting place. (5) Read a place by looking up Θ(π). The paper’s tuple example states: “After checking ‘𝑡 .1 := 3’, then ℓ3 is added to Θ(𝑡) and Θ(𝑡 .1), but not Θ(𝑡 .0).” (Section 2.1, p. 3)

Inference: a Verus analogue is a ghost dependency map represented as a `spec fn` over abstract labels and values, with proof lemmas for the conflict relation; executable Rust remains unchanged. Verus can express the map and `ensures` facts, but this paper’s inference engine is not a Verus feature.

Evidence and limits. The paper proves noninterference: “Theorem 3.1 (Noninterference). Let e such that: …” and concludes that equal initial dependencies imply equal outputs and unchanged locations (Section 3, p. 4). The model assumes well-typed Oxide programs and analyzes observable values, not timing or termination. Unsafe raw pointers are outside soundness: “Our pointer and mutation analysis fundamentally relies on ownership-safety for soundness.” (Section 4.3, p. 6)

## technique 2: ownership-derived reference and loan analysis
What it is. Rust references carry provenance (lifetime) and ownership qualifiers (`uniq` or `shrd`). Flowistry reuses the borrow checker’s loan information as a points-to analysis. “The key idea is that Oxide already does a pointer analysis! Performing one is an essential task in ensuring ownership-safety.” (Section 2.2, p. 4)

How to apply it. (1) For each borrow `&rω p`, initialize Γ(r) with the loan ωp. (2) Propagate outlives constraints Γ(r)=Γ(r′) along r′:>r until a fixpoint. (3) For a dereference assignment, compute the loan set Δ;Γ ⊢ω p ⇒ {ℓ}. (4) Add the assigned expression’s dependencies to conflicts of every loan. The worked chain borrows x, reborrows y, then z, yielding `{uniq x.1, uniq (*y).1, uniq (*z)}` (Section 2.2, pp. 4–5).

Inference: in Verus, model ownership facts with references and ghost predicates; use `old(...)` in postconditions when relating pre-state values, and prove alias-disjointness as lemmas. Verus does not expose Oxide’s Γ loan-set judgment, so a direct implementation would be a ghost abstraction and a trusted correspondence lemma.

Evidence and limits. Rust’s ownership rule makes `&self` immutable and `&mut self` potentially mutating; lifetimes expose which returned references may point into the receiver (Section 1, p. 2). Raw pointers and `unsafe` blocks violate the assumptions and are excluded (Section 4.3, p. 6).

## technique 3: modular summaries for calls
What it is. A call uses only the callee signature. “The collective dependencies of the input π are collected into κarg, and then every unique reference is updated with κarg.” (Section 2.3, p. 5) Shared references are read inputs; transitively reachable unique references are possible mutation targets; the return is conservatively dependent on all readable inputs.

How to apply it. (1) Compute `shrd-refs` and `uniq-refs` recursively through the argument type. (2) Union Θ for every transitively readable place into κarg. (3) Add κarg to every unique-loan conflict. (4) Assign κarg to the call result. (5) Do not inspect the body, which permits higher-order calls. The paper’s example says a function with `(&mut u32, &u32)` may mutate only the first and assumes both readable inputs can influence that mutation (Section 2.3, p. 5).

Inference: a Verus library can expose proof-carrying summaries as `spec fn` predicates over argument references, then callers invoke lemmas establishing the summary; `requires` and `ensures` carry the boundary. A summary cannot justify effects absent from the callee contract.

## technique 4: MIR forward dataflow and control dependence
Implementation steps are explicit. “The Rust compiler lowers programs into a ‘mid-level representation’, or MIR, that represents programs as a control-flow graph.” (Section 4.1, p. 6) (1) Maintain Θ at each MIR instruction. (2) Transfer assignments by updating conflicts. (3) Join predecessor contexts by key-wise set union. (4) Iterate to a fixpoint in the join-semilattice. (5) Compute post-dominators and control-dependence so branch conditions flow into mutated places. Panics are excluded from control dependence because they are unrecoverable (Section 4.1, p. 6).

Inference: Verus proofs can mirror this as ghost state threaded through a verified interpreter, but ordinary Verus verification reasons about the Rust program directly; MIR extraction and fixpoint iteration would be an external analysis.

## evidence, measurements, and failures
The evaluation uses ten crates totaling 286,682 LOC, 435,979 variables, and 14,696 functions (Table 1, p. 8), producing 3,487,832 variable-condition data points (Section 5.1, p. 8). “In 94% of all cases, the Whole-program and Modular conditions produce the same result.” (Section 5.2.1, p. 9) Among the remaining 6%, the median dependency-set increase is 7%, with the denominator explicitly being non-zero-difference cases (Section 5.2.1, p. 9). Removing mutability information gives non-zero differences in 39% of cases, median 50%; removing lifetimes gives 17%, median 56% (Section 5.2.2, p. 9). Baseline median execution time is 370.24 μs per function; one rg3d function takes 0.13 s modularly versus 23.18 s recursively, a 178× slowdown (Section 5.2, p. 8).

The IFC checker uses `Secure` and `Insecure` traits and flags flows into insecure operations; the slicer is a VSCode extension (Section 6, pp. 11–12). The paper states that 96% of cases crossed a crate boundary, and only 6.6% of those had a non-zero modular/whole-program difference; 4% did not cross a boundary and 0.6% of those differed (Section 5.4.2, p. 10). These denominators are conditional subsets, so percentages must not be compared as if they shared one denominator.

What is proved is noninterference for the Oxide model and empirical precision for the selected crates. Trusted inputs include Rust’s type/lifetime information, the MIR implementation, and unsafe-code assumptions. Inference: the threat to agent-written verified Rust is moderate: modular summaries can hide real flows if contracts are weak, while ownership gives a useful mechanically checkable boundary. VL should reuse ownership-aware summaries and control-flow dependency tracking, but should not redo a whole-program analyzer when a checked contract suffices.

## techniques for the catalog
- ownership dependency context — map each place to expression labels and update conflicts on mutation
- loan-set pointer analysis — derive points-to loans from ownership qualifiers and lifetime outlives constraints
- signature-only call summary — propagate readable inputs to returns and unique loans without callee bodies
- MIR fixpoint analysis — join place dependencies across CFG edges and add control dependencies
- ownership precision ablation — quantify precision loss by disabling mutability and lifetime information

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
