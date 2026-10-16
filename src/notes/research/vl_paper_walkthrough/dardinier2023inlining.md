# Verification-Preserving Inlining in Automatic Separation Logic Verifiers (extended version)
(authored by agents unless marked 🧑)
Tag: `dardinier2023inlining`, [paper](https://doi.org/10.1145/3586054)

## problem

Bounded verification inlines calls to a finite depth and unrolls loops a finite number of times. It avoids method specifications and loop invariants, so it is useful for finding bugs before annotation work. In traditional program logics, successful modular verification implies successful verification after inlining. Automatic separation-logic (SL) verifiers differ because method executions own permissions and predicates, and their proof-search heuristics depend on those resources. The paper's abstract states, “However, this essential property might not hold for automatic separation logic verifiers such as Caper, GRASShopper, RefinedC, Steel, VeriFast, and verifiers based on Viper” (abstract, PDF p. 1).

The paper calls inlining verification-preserving when every program that verifies modularly with some method annotations also verifies after inlining at the chosen bound. Thus, an error found in a verification-preserving inlined program is a true error in the original program, subject to the bound. This property protects developers from chasing annotations for a correct program that failed only because inlining changed the verifier's resource state.

The motivation is practical: “Detecting errors using inlining before adding method specifications and loop invariants can prevent developers from wasting time attempting to annotate and verify an incorrect program” (section 1, PDF p. 2).

## technique 1: identify resource-sensitive non-preservation

The first step is to inspect how the verifier's automation observes or changes owned resources. Two mechanisms cause failures.

* automatic instantiation chooses existential predicate parameters or resource fragments using the resources currently owned. In the paper's VeriFast example, a modular call owns only `Q(a)`, so a lock invariant is instantiated with `a`; after inlining, the caller also owns `Q(b)`, the heuristic chooses `b`, and a later `acquire(l,a)` fails (sections 2–2.1, PDF pp. 3–5)
* automatic rule selection chooses among separation-logic rules from the owned resources. In the RSL-Viper example, a greedy atomic-read rule consumes `P(l)` on the first read; the second read then cannot obtain the needed assertion, although modular specifications can preserve the invariant (section 2.2, PDF pp. 5–6)

The practical diagnostic is to compare a modular proof state with the larger caller state produced by inlining. Features that inspect permissions (`perm`), consume or produce resources (`inhale`/`exhale`), use imprecise existential assertions, or assert exact resource bounds are candidates for non-preservation. Inference: a Verus workflow should perform this audit around ownership-sensitive proof helpers and mutable borrows; the paper's permission predicates and Viper operations do not exist in Verus.

## technique 2: the semantic condition (framing plus bounded monotonicity)

The paper's main method is a compositional sufficient condition. Entire method bodies that will be inlined must satisfy bounded framing. Call-free statements between calls must satisfy bounded monotonicity, the conjunction of bounded safety monotonicity and bounded output monotonicity. The authors state, “The semantic condition holds iff: (1) entire inlined method bodies satisfy bounded framing, and (2) call-free statements between method calls satisfy bounded monotonicity” (section 3, PDF p. 7).

Framing means that if a statement verifies with resources `P` and produces `Q`, it also verifies with an additional disjoint frame `R` and preserves `R`. The paper requires framing for whole inlined bodies, not every statement, because a body may temporarily open and close a predicate yet preserve it overall (section 3.1, PDF pp. 8–9).

Safety monotonicity means that success in a state implies success in any larger state that agrees on common resources and variables (section 3.2, PDF pp. 9–10). It prevents extra caller resources from making a proof rule choose an invalid resource. Output monotonicity adds that executing in the larger state leaves a final state at least as large as the state from the smaller execution. It prevents a resource-sensitive branch from consuming more resources after inlining and breaking a later statement (section 3.3, PDF pp. 10–11).

The properties are bounded to the states reachable within the inlining bound. This relaxation is required for common imprecise assertions and Python object-field idioms; unbounded properties would reject useful cases (section 3.4, PDF pp. 11–12). Partial annotations are handled by inserting assertions for the supplied pre/postconditions before and after inlined bodies (section 3.5, PDF pp. 12–13).

Inference: the Verus analogue is a proof obligation that a helper preserves unrelated ownership and maintains postconditions when called under the larger alias-free context created by its caller. Verus's ownership discipline removes some SL ambiguity, but it does not automatically establish semantic monotonicity for ghost state, permission predicates, or partial proofs.

## technique 3: prove the condition and its dual result

The authors formalize a language parameterized by a separation algebra and prove in Isabelle/HOL that their semantic condition implies verification-preserving inlining (Theorem 4.5, section 4, PDF pp. 17–18). They also prove a dual completeness result: successful verification of the inlined program implies that suitable method and loop annotations exist for bounded executions of the original (Theorem 4.7, section 4, PDF p. 18). The result is bounded: an error beyond the inlining depth can remain unseen.

To apply the theorem, define the program's verifier semantics, resource-state ordering, bounded executions, and method/loop annotation relation. Prove framing for each inlined body, bounded safety/output monotonicity for call-free segments, and then discharge the compositional semantic-condition predicate. This is a meta-theory proof, not a check a normal application developer can skip; its benefit is that a verifier can safely reject inlined code without creating an inlining-specific false positive.

## technique 4: conservative syntactic and structural checks

The semantic condition is a hyperproperty: it relates multiple executions and includes universal/existential state quantification, which ordinary automatic verifiers cannot check directly. The paper therefore presents two conservative approximations (section 5, PDF p. 18).

The syntactic check is fast. It rejects operations that inspect resources, such as `perm`, and syntactic forms likely to trigger proof-search heuristics, such as existentially quantified parameters in imprecise assertions. Programs with no such features are accepted immediately; the check is intentionally coarse.

The structural check is more precise and can be verified by an SMT-based program verifier. For structural monotonicity, the implementation uses self-composition: execute a statement in a smaller state while guarding assertions and recording the resulting state, execute it in a larger state, then assert safety and that the second final state contains the first. The paper's Viper instrumentation uses a fresh boolean `exist`, a `guardExecs` transformation that turns assertions into assumptions during the first run, and an assertion that `exist` remains true and the final states are ordered (Fig. 8, section 5, PDF pp. 20–21). For nondeterminism, it records choices from the first execution and compares only executions resolving choices consistently through a determinization function (section 5, PDF pp. 21–22).

The authors prove structural monotonicity implies semantic monotonicity (Theorem 5.3, section 5, PDF p. 20), so passing the structural check is sufficient for verification-preserving inlining. Inference: a Verus tool could self-compose a function's proof obligations over two ghost states or two symbolic ownership contexts, but implementing the separation-state order and guarded execution is new work; ordinary Verus verification of one execution is not this check.

## evidence and limits

The evaluation extends Viper's verification-condition generator to inline calls and loops, check the structural condition, and account for partial annotations. It uses test suites of VeriFast (1,002 files), GRASShopper (314), Nagini (232), and RSL-Viper (14), totaling 1,562 files (section 6, PDF pp. 22–23). Automatic syntactic analysis found 1,053/1,562 files (67%) with potentially non-preserving features. In a manually analyzed sample of 72 such files, 22/72 (31%) were not always-preserving; 50/72 were always-preserving. The semantic condition validated 49/50 always-preserving files (98%), and the structural condition validated 47/49 of those it could validate (96%) (Table 1, section 6.3, PDF p. 24). These fractions match the stated percentages after rounding.

The tool detected all seeded true errors for sufficiently large bounds: 1–4 for every listed example except two loops requiring bounds 10 and 11. It reported no spurious error when the structural condition held. Across examples, modular verification without annotations produced at least one spurious error each and three on average; annotations required 256 lines for 1,152 lines of code, which inlining avoided (section 6.4, PDF p. 25). Verification times in Table 2 are averages of five runs on a Lenovo T480 with 32 GB RAM and an i7-8550U at 1.8 GHz; they range from 1.4 to 42 seconds for the listed examples (Table 2, PDF p. 24).

Threats are explicit. The datasets are verifier test suites rather than representative production systems; large or complex files were discarded from manual analysis. The guarantee trusts the verifier's proof-search semantics, the Isabelle/HOL theorem, the Viper instrumentation, and the chosen bound. Bounded verification cannot find errors beyond the bound, and a program-logic or SMT incompleteness can still cause unrelated false positives.

Inference: the threat to agent-written verified Rust is moderate and specific. Inlining can reduce annotation effort and expose bugs early, but a Rust/Verus proof that succeeds under one ownership context does not automatically justify reuse under every caller context. Verus's borrow checker removes many aliasing states, yet ghost-state choices, helper contracts, and bounded unrolling still need explicit monotonicity arguments.

## techniques for the catalog

- resource-sensitive failure analysis — compare modular and inlined verifier states to find permission-dependent instantiation and rule-selection changes
- framing and bounded monotonicity — require whole inlined bodies to preserve frames and call-free segments to preserve safety and output under larger states
- semantic-condition theorem — prove that those properties imply verification-preserving inlining and use the dual bounded completeness result
- syntactic screening — reject resource-inspecting and imprecise-assertion features that can trigger non-preserving automation
- structural self-composition — instrument two executions over ordered states, guard the first, and check safety plus final-state monotonicity

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
