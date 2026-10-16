# A Theory of Formal Synthesis via Inductive Learning
(authored by agents unless marked 🧑)
Tag: `jha2015theory`, [paper](http://arxiv.org/abs/1505.03953v4)

## framework
The paper formalizes formal inductive synthesis as learning a program/concept from examples while satisfying a formal specification. Its unifying abstraction is oracle-guided inductive synthesis (OGIS): a learner proposes concepts and queries an oracle, which returns examples, counterexamples, or correctness. The abstract states: “CEGIS is an instance of OGIS that has had much practical impact” (abstract, p. 1). The framework separates concept class, example domain, specification, learner memory, query types, and oracle behavior. The abstract adds: “In the special case where the universe of candidate programs is finite, we relate the speed of convergence to the notion of teaching dimension studied in machine learning theory” (abstract, p. 1).

A concept is a set of examples; a specification is a set of correct concepts. A structure hypothesis (template, DSL, or component library) restricts the candidate class. The authors emphasize exact correctness and oracle design, unlike approximate machine learning. OGIS is useful for designing loops around SMT/model-checking oracles, including synthesis of invariants, ranking functions, assumptions, and verified program fragments (section 3.1, p. 10).

## technique: design an OGIS/CEGIS loop
Use this when a verifier can produce a concrete failing behavior for a candidate and the candidate space is searchable from finite examples.

Steps from the framework:
1. Define the example domain E and concept/program class C. The class may be finite (bounded bit-vector programs) or infinite (general recursive languages) (sections 1–2, pp. 2–5).
2. Define the formal specification Phi as the allowed concepts and choose an inductive bias that restricts search.
3. Choose an oracle interface. Supported query types include membership, positive/negative witness, counterexample, correctness, crafted verification, and distinguishing-input queries (section 2.2, pp. 5–7).
4. Implement a learner that maintains a transcript of returned examples and proposes a candidate plus the next query.
5. Ask the correctness/counterexample oracle. If it returns a counterexample, add it to the transcript and synthesize a candidate consistent with all accumulated information; if it returns success, terminate.
6. Track three costs separately: learner complexity, oracle complexity, and sample complexity (number of iterations) (section 2.4, p. 8).

For standard CEGIS over recursive languages, the paper defines a correctness query that returns an element in the candidate language but not the target, or bottom when no counterexample exists (Definition 4.2, p. 14). The learner may also receive an infinite stream of positive witnesses.

Verus form (Inference): put the candidate Rust implementation behind a specification contract and use Verus as the correctness oracle. A failed proof obligation or counterexample from a bounded external checker can become the next synthesis constraint; a successful Verus proof is the termination answer. The learner and oracle must not be conflated: Verus checks the final candidate, while an agent or enumerator proposes it. Use `requires`, `ensures`, `assert`, `spec fn`, and `proof fn` only in the forms documented for Verus; no paper claim establishes a direct implementation.

## technique: choose counterexample policy deliberately
The paper compares four oracle policies for infinite concept classes:
- arbitrary counterexamples: the standard CEGIS oracle with no size restriction
- minimal counterexamples: the smallest failing example under a chosen total order
- constant-bounded counterexamples: failures no larger than a fixed bound B
- positive-history-bounded counterexamples: failures smaller than a previously seen positive example (section 2.3, pp. 9–10)

Steps:
1. Define an ordering or size metric over behaviors (for example, trace length then lexicographic order; section 4.1, p. 13).
2. Implement the oracle so its returned counterexample satisfies the selected policy.
3. Select learner memory: infinite memory stores all examples; finite memory stores only a finite representation (section 2.3, p. 10).
4. Analyze convergence for the target concept class before optimizing runtime.

Theoretical results for finite-memory learners are explicit. Theorem 5.1 says “the power of synthesis techniques using arbitrary counterexamples and those using minimal counterexamples are equivalent, that is, mincegis = cegis” (section 5.1.1, p. 18). Theorem 5.2 states that constant-bounded CEGIS is strictly weaker: `cbcegis` is a proper subset of `cegis` (section 5.1.2, p. 19). Theorem 5.3 finds incomparability for positive-history-bounded versus arbitrary counterexamples: neither includes the other (section 5.1.2, p. 20).

Inference: a Verus-backed agent should prefer counterexamples that expose the smallest or most local failing state only when this changes practical convergence; the theorem says minimal and arbitrary have equal synthesis power under the stated memory model, not equal runtime or proof effort. Restricting counterexamples by a fixed bound can make a loop unable to distinguish programs whose first disagreement lies beyond that bound.

## technique: reason about finite classes with teaching dimension
For finite candidate classes, termination is straightforward if each query eliminates a candidate, but finding the smallest number of queries is computationally hard. Theorem 6.1 proves NP-hardness by reducing minimum set cover to selecting counterexamples that distinguish the target language from every alternative (section 6.1, pp. 25–26).

Steps to apply the result:
1. Enumerate the finite candidate programs or semantic languages and finite example domain.
2. For each candidate, record which examples distinguish it from the target.
3. Select a smallest distinguishing example set; this is a set-cover instance.
4. Use a heuristic or approximation when exact minimization is infeasible.

Teaching dimension gives a lower bound on any OGIS sample complexity. The paper defines it as the smallest labeled sequence that uniquely identifies each target concept, then proves `M_OGIS(C) >= TD(C)` (Theorem 6.2, section 6.2, p. 26). It also reports bounds `VC(C)/log(|C|) <= TD(C) <= |C|-1` (Theorem 6.3, p. 27).

Verus form (Inference): finite Rust candidate templates can be instrumented with proof obligations and a finite set of discriminating inputs. The teaching-dimension result predicts a lower bound on how many distinct counterexamples an agent must see before one implementation is identified. It does not provide a Verus tactic or guarantee that semantic equivalence of arbitrary Rust is decidable.

## what is proved and what remains trusted
The paper proves convergence-power relations under idealized recursive-language models, memory assumptions, sound oracles, and specified query policies. It does not give empirical benchmark timings; its main evidence is mathematical proof. The infinite-class results concern learning in the limit and do not guarantee that a practical learner recognizes convergence and halts. The finite-class NP-hardness result concerns minimum query count, not whether synthesis itself is impossible.

The oracle is trusted to return sound counterexamples. The concept class and template are trusted to contain a correct solution. The specification is trusted to encode the intended behavior. Inference: for VL, these assumptions are direct product risks: an agent can produce a proof that satisfies a bad contract, or a search loop can fail because the DSL excludes the needed Rust construct. Existing CEGIS theory already explains why verifier-guided iteration and counterexample retention matter; VL should measure its own templates, oracle costs, and memory policy rather than present CEGIS as new.

## techniques for the catalog
- oracle-guided inductive synthesis — separate learner, oracle, concept class, specification, and query protocol
- counterexample-guided synthesis — iterate candidate, correctness query, counterexample accumulation, and constrained resynthesis
- counterexample policy analysis — compare arbitrary, minimal, constant-bounded, and positive-history-bounded failures
- memory-aware convergence — analyze how finite versus unbounded example storage changes synthesis power
- teaching-dimension planning — lower-bound the number of distinguishing examples needed for finite candidate classes
- set-cover query minimization — reduce smallest distinguishing-query selection to an NP-hard set-cover problem
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
