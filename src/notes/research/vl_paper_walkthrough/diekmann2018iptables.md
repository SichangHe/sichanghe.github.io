# Verified iptables Firewall Analysis and Verification
(authored by agents unless marked 🧑)
Tag: `diekmann2018iptables`, [paper](https://doi.org/10.1007/s10817-017-9445-1)

## scope and result

The paper builds a machine-checked static analysis pipeline for Linux iptables. Its central claim is that a firewall must first be given a precise semantics, then simplified through semantics-preserving transformations, and only then translated to a small model on which analysis is practical. The abstract states: “This article summarizes our efforts around the formally verified static analysis of iptables rulesets using Isabelle/HOL.” (Abstract, p. 191). The work covers filter-table access control; packet modification such as NAT is outside the model (Sect. 4, p. 197).

## technique: inductive firewall semantics

What it is. A primitive matcher γ relates abstract primitives to packets. Match expressions are built from primitives, negation, conjunction, and `Any`; actions are `Accept`, `Reject`, `Drop`, `Log`, `Empty`, `Call c`, and `Return`. A chain is a list of rules and a ruleset maps names to chains. The big-step judgement executes a chain for one packet and carries one of three filtering states: allow, deny, or undecided.

When to use it. Use this as the trusted specification before implementing a checker or rewrite. It keeps packet and match-condition domains abstract, so the same proofs apply when new match primitives are added, provided the matcher satisfies the stated relation.

How to do it. Define `match γ m p` recursively over the expression algebra. Define one inference rule for each action and list composition: a matching `Accept` changes undecided to allow; `Drop` and `Reject` deny; a nonmatching rule leaves undecided; once a decision exists, later rules are skipped; `Call` evaluates the called chain; a matching `Return` returns control without a decision. Assume the ruleset is well formed (every called chain is defined). Prove determinism and totality, then prove the equivalent alternative semantics without a call stack.

Verus form. Inference: represent packets, primitive expressions, actions, and rules as Rust enums; use a recursive `spec fn` for `matches` and a `spec fn` relation or result-valued interpreter. Use `requires` for well-formed rulesets and `ensures` for determinism (equal inputs give equal states). Prove list concatenation lemmas with `proof fn`; use `old(...)` only in postconditions that compare pre-state values. Isabelle inference rules do not carry directly to executable Verus syntax.

Evidence and limits. The authors state, “All our proofs are machine-verified with Isabelle.” (Sect. 4.3, p. 201). The trusted base is the Isabelle kernel plus the semantics: “Therefore, the correctness of all obtained results only depends on the correctness of this kernel and the iptables semantics.” (Sect. 2, p. 194). The model excludes packet modification and some stateful actions, including `CONNMARK`; those are assumptions, not verified Linux behavior.

## technique: chain unfolding

What it is. Custom-chain calls are converted to a flat list model. The procedure `pc` unfolds one call level, preserving filtering behavior even with arbitrary match conditions. Repeatedly apply it until the ruleset no longer changes; Linux rejects looping chains, so termination is obtained for accepted rulesets.

How to do it. For each matching `Call c`, replace the call by the called chain. If the called chain reaches a matching `Return` while still undecided, remove the return path and continue with the caller’s suffix. Preserve nonmatching and already-decided paths. Iterate to a fixed point. The paper’s theorem is explicit: “The procedure pc can be applied arbitrarily many times and preserves the semantics.” (Sect. 5, p. 204).

Verus form. Inference: define a measure such as remaining call nesting and a recursive transformation with a decreasing argument; specify equivalence by interpreting both original and unfolded rulesets and proving equal decisions. Use `while` with a loop invariant only when a bounded implementation is required; `invariant` is a statement in a loop, not a function call.

Evidence and limits. The proof is theorem `unfolding_n_sound_complete` (footnote 9, p. 204). The method assumes well-formed, nonrecursive chains accepted by the kernel. It intentionally loses provenance: later analysis cannot identify the original rule responsible for an edge (Sect. 3.2, p. 196).

## technique: ternary unknown-match abstraction and closures

What it is. Unknown match conditions evaluate to `Any` in a ternary semantics. Two tactics resolve “in-doubt” matches: deny produces a lower closure (packets definitely allowed), and allow produces an upper closure (packets possibly allowed). The exact semantics is sandwiched between them.

How to do it. Lift Boolean matching to values `True`, `False`, and `Unknown`; define conjunction and negation. Mark unsupported primitives as `Unknown`. Choose the deny or allow tactic, rewrite each unknown rule, then simplify. Use the lower closure to make sound “definitely allowed” claims and the upper closure to make sound “possibly allowed” claims. The paper defines the guarantee: “the deny tactic is a subset of the packets allowed by the exact semantics, which in turn is a subset of the packets allowed by the allow tactic.” (Sect. 6.2, p. 207).

Verus form. Inference: encode a three-valued enum and prove ordering lemmas `lower <= exact <= upper`; specify each rewrite with `ensures` relating interpreters. Keep unknown primitives abstract in a `spec fn`; do not mark the function being verified `external_body`.

Evidence and limits. Theorem 5 is the closure result (Sect. 6.2, p. 207), and Theorems 6–7 prove unknown-removal soundness and completeness (Sect. 6.3, pp. 209–210). Approximation can be conservative and may leave useful precision behind; it cannot prove exact behavior for unknown primitives.

## technique: normalization and translation to a simple model

What it is. The authors normalize Boolean match expressions (including negations) to disjunctive normal form, translate supported primitives, and then map complex chains to a simple list model. The simple model has one rule list and limited matching, making partitioning and service-matrix algorithms easy to verify.

How to do it. First unfold chains and remove or abstract unknowns. Normalize expressions to the supported syntax; rewrite primitives such as IP ranges into combinations of simple IP matches; translate interface conditions using known routing/spoofing information; translate stateful rules to the chosen packet class (for example, new packets). Prove each translation preserves behavior or is an explicit overapproximation. Then run partition and matrix analysis on the simple model.

Verus form. Inference: define each translation as a pure `fn` plus a `spec fn` model and prove refinement with `ensures`; represent DNF as vectors of conjunctions and supply lemmas for distributivity. The paper’s Isabelle algebra and executable extraction require new Rust implementations.

Evidence and limits. The paper reports “a fully-verified iptables analysis and verification tool” (Sect. 1, p. 194). The intermediate evaluation used five real-world firewalls and found the algorithms correctly unfolded, preprocessed, and simplified rulesets (Sect. 8, pp. 214–215); the final evaluation is a larger real-world set (Sect. 14). Exact denominators and per-ruleset results belong to the evaluation tables, so no aggregate percentage should be inferred from the prose. Translation loses rule provenance and cannot diagnose the individual flawed rule.

## what is proved, trusted, and useful for VL

Proved: semantic determinism/totality, equivalence of chain semantics, soundness/completeness of unfolding and unknown-removal, normalization and primitive translations, and correctness of IP partitioning and service matrices. Trusted: Isabelle’s kernel, the formal semantics, assumptions about Linux-accepted well-formed rulesets, and any external primitive interpretation. Inference: this architecture is a strong pattern for Verus: define a small executable-independent spec, prove each compiler-like rewrite as refinement, then verify analyses over the normalized representation. It threatens agent-written verified Rust mainly where generated code performs unchecked normalization or abstraction; a proof-carrying rewrite layer would contain that risk. VL should reuse the staged-specification idea rather than redo generic firewall algorithms.

## techniques for the catalog

- inductive packet-filter semantics — define rule execution as a small-step-free relation over chains, packets, and filtering states
- verified chain unfolding — flatten custom calls by a semantics-preserving fixed-point rewrite
- ternary unknown abstraction — bracket exact behavior with lower and upper closure semantics
- normalized translation — compile rich rules into a small model before proving analyses
- verified partition and service matrix — derive IP equivalence classes and minimal connectivity summaries from the simple model

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
