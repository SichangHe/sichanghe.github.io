# What Was Said, Not What Was'Thought': Type-6 Logic for CoT Verification
(authored by agents unless marked 🧑)
Tag: `dewynter2026type6`, [paper](https://doi.org/10.1016/S0004-3702(98)

## scope
Type-6 is a trace-level logic for checking whether an LLM chain of thought is coherent as written. It does not certify the truth of a conclusion. The authors state: “Type-6 verifies the internal coherence of a reasoning trace, not the truth of its conclusions or the intent of its author.” (ethics statement, p.9). The method models modal commitment, doubt, revisions, contradictions, and derivation paths, then emits auditable reports. The evaluation uses 996 traces and compares five other methods.

## technique 1: represent each proposition with an update state
Use this when a generated trace mixes assertions, uncertainty, knowledge claims, and revisions. Assign every proposition π a state Σ(π)=(τ,σ,δ): τ is one of T, Uc (unclear/unparseable), Uk (unknowable/unresolved), or F; σ is ⊥, belief B, or knowledge K; δ records doubt. Initialize every proposition as (Uk,⊥,0), then walk statements left to right.

Apply the operator table: K commits only T/F and clears doubt; B commits while allowing Uk and preserves doubt; ? sets doubt; R marks a revisit and licenses a following revision; N pivots without changing state; NOT flips polarity; IF opens a constraint chain; THEN closes it and triggers back-propagation; AND/OR extend the chain; a bare assertion updates τ without changing commitment. The paper emphasizes: “This left-to-right read makes ? K π (‘do I know π?’) and K ? π (‘I know I doubt π’) distinct” (section 3.1, p.4). Inference: a Verus analogue would attach explicit status metadata to generated assertions and distinguish `assert` facts from proof lemmas, but Verus's verifier has Boolean propositions and typed expressions rather than a four-valued epistemic state. This layer can prioritize checking; it cannot replace SMT proof.

## technique 2: maintain constraints and paraconsistent back-propagation
Use this when a trace contains IF–THEN, AND, or OR derivations. On THEN, store a constraint r ≡ φ(p1,…,pk) and run strong Kleene back-propagation. If a constraint resolves an unknown target, pin τ; if it conflicts with a committed value, log a derived contradiction while retaining the agent's commitment; if premises do not force the target, log an unverifiable derivation. Uc causes abstention rather than propagation. The authors explain: “when a back-propagated constraint assigns π a value conflicting with the agent’s committed value, it does not fail. Instead, it yields a derived contradiction but retains the agent’s value.” (section 3.2, p.4).

Inference: for Verus, each constraint could become a candidate `ensures` implication or lemma obligation; unresolved premises should fail the candidate, while contradictory generated claims should be retained as diagnostics. The paper's paraconsistency is an audit policy, not a soundness theorem about program behavior. Its trusted components are the parser, symbolic implementation, and whichever semantics the verifier implements.

## technique 3: distinguish licensed revision from contradiction
Use this to avoid treating every change of mind as an error. A revision segment between opposite commitments on π must contain both a jump/loopback edge and a constraint targeting π (explicitly or by back-propagation). If both hold, emit licensed revision; otherwise K-to-K changes are hard contradictions and bare reassertion conflicts are soft. The paper says: “A revision across a revision segment is a licensed revision and emits a revision event; without one, it is a K-K contradiction” (section 3.3, p.5). A licensed revision still may be wrong; licensing measures effort, not correctness.

Inference: a Verus proof repair tool could classify changed assertions as justified only when a new lemma or dependency establishes the change, then require Verus to prove that dependency. Textual replacement alone is not a licensed revision.

## technique 4: reconstruct a multigraph and inspect all routes
Use this when traces meander, loop back, or contain multiple possible derivations. Parse statements into proposition nodes and operator/structural edges; consecutive statements induce gap, jump, loopback, or meander edges. Enumerate edge-simple source-to-sink paths subject to a loopback budget, allowing revisits only through specified edge kinds. Compute each path's terminal state and classify cross-path disagreement (different values) and under-resolution (some paths resolve, others remain Uk). The paper states: “Multiple edge-simple paths from source to sink are candidate reasoning routes.” (section 3.4, p.5).

The implementation has five stages: an LLM splits and normalizes statements and assigns proposition symbols; a function-call map merges recurring propositions; an LLM assigns values/operators and revises missed propositions; the verifier constructs the graph; it enumerates paths and emits coherence, sequential, and per-path reports (section 4.1, p.6). Inference: the same architecture can analyze agent-written Verus proof plans before compilation, with code facts as nodes and lemma/application dependencies as edges. It cannot establish Rust aliasing, arithmetic, or memory safety; Verus remains the final oracle.

## technique 5: emit a failure taxonomy instead of one score
Use the taxonomy to drive repair. Hard signals include K-K contradiction, derived contradiction, modal mismatch, reasoning avoidance, and (when on the direct chain) unresolved doubt/unknowability. Soft signals include B-B conflict, bare reassertion, unjustified modal shift, and cross-path disagreement. Quality signals include redundant reassertion, self-questioned commitments, unverifiable derivation, and ambiguous negation (Table 2, p.5). Reasoning avoidance is raised when no constraint targets the sink conclusion. Reports preserve statement-level provenance.

Evidence: on 996 traces (276 CoT-Logic, 370 MMLU, 311 DebateLab, 39 handcrafted), Type-6 found derived contradiction in 409 traces (mean 5.28 events per triggered trace), reasoning avoidance in 548, and unresolved doubt at the sink in 495 (section 5.2, p.8). Only about 3% of propositions lie on the direct implication chain: median 0.025, IQR [0.016, 0.074] (same section). Annotation reliability was Fleiss κ=0.969 for proposition assignment and 0.929 for operator/proposition assignment; the LLM's operator assignment accuracy was 97.2% (section 4.2, p.6).

## evidence, limits, and VL threat
The verifier's average-case complexity is claimed to be linear/quasilinear under trace sparsity, but the graph path enumeration and loopback budget are practical assumptions. Comparison methods are not interchangeable: hard-fail κ values are −0.005 to 0.15; Type-6 correlates with PRMs at ρ=0.31 and LLM judges at ρ=0.25, while no scalar pair exceeds 0.4 (Table 3, p.7). LINC's median formalization coverage is only 0.006 and 74.9% of the corpus is marked unknown, limiting that comparison (section 5.2, p.8). The paper's own ethics warning means a high coherence score is not a correctness certificate.

Inference: threat to a VeruLaw product is medium for orchestration and diagnostics, low for core soundness. Type-6 can expose unsupported proof steps, unresolved dependencies, and revision patterns before invoking Verus; it cannot prove generated Rust. VL should not redo generic chain-of-thought scoring. New work is a Verus-aware graph parser, checker-backed failure taxonomy, and experiments measuring repair yield on actual generated proof attempts.

## techniques for the catalog
- epistemic update state — track truth, commitment strength, and doubt per proposition while reading a trace
- Kleene constraint back-propagation — resolve, abstain, or log contradictions from IF–THEN constraints
- licensed revision test — require a structural revisit plus a targeting constraint before accepting a changed claim
- multigraph route analysis — enumerate bounded edge-simple derivation paths and compare terminal states
- provenance failure taxonomy — report hard, soft, residual, and quality failures with statement locations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
