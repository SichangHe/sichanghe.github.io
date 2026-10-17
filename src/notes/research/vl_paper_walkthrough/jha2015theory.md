# A Theory of Formal Synthesis via Inductive Learning
(authored by agents unless marked 🧑)
Tag: `jha2015theory`, [paper](http://arxiv.org/abs/1505.03953v4)

## framework
The paper formalizes formal inductive synthesis as learning a program/concept from examples while satisfying a formal specification. Its unifying abstraction is oracle-guided inductive synthesis (OGIS): a learner proposes concepts and queries an oracle, which returns examples, counterexamples, or correctness. The abstract states: “An instance of OGIS that has had much practical impact is counterexample-guided inductive synthesis (CEGIS).” (abstract, p. 1). The framework separates concept class, example domain, specification, learner memory, query types, and oracle behavior. The abstract adds: “In the special case where the universe of candidate programs is finite, we relate the speed of convergence to the notion of teaching dimension studied in machine learning theory” (abstract, p. 1).

A concept is a set of examples; a specification is a set of correct concepts. A structure hypothesis restricts the candidate class (the paper names “templates, sketches, component libraries”, section 3.1, p. 10). The authors emphasize exact correctness and oracle design, unlike approximate machine learning. The paper notes that “many of the trickiest steps in formal verification involve synthesis of artifacts such as inductive invariants, ranking functions, assumptions, etc.” (section 3.1, p. 10), and that its learners and oracles are typically general-purpose decision procedures such as SAT/SMT solvers or model checkers (Example 2.2, p. 8). Inference: OGIS is therefore a way to structure loops around such oracles; the paper does not itself claim this use for verified program fragments.

## technique: design an OGIS/CEGIS loop
Use this when a verifier can produce a concrete failing behavior for a candidate and the candidate space is searchable from finite examples.

Inference: the steps below are my synthesis of Sections 2.1-2.4 and 4, not a procedure the paper states.
1. Define the example domain E and concept/program class C. The class may be finite (bit-vector programs; section 1, p. 2) or infinite (programs for recursive languages; section 2.3, p. 9). A concept is a set of examples and C is a subset of 2^E (section 2, p. 4).
2. Define the formal specification Phi as the set of allowed concepts (section 2, p. 4) and choose an inductive bias that restricts search (section 2.1, p. 6).
3. Choose an oracle interface. Supported query types include membership, positive/negative witness, counterexample, correctness, crafted verification, and distinguishing-input queries (section 2.1, pp. 7-8; the paper says these types “are not meant to be exhaustive”).
4. Implement a learner that maps the dialogue so far to a candidate concept plus the next query (Definition 2.4, p. 6).
5. Ask the correctness or counterexample oracle. If it returns a counterexample, add it to the transcript and synthesize a candidate consistent with the accumulated information; if a correctness query answers YES, terminate (section 2.1, p. 7). The paper's standard CEGIS model uses only positive-witness and counterexample queries, where the oracle "is not required to be a sound verifier that can declare correctness" (Example 2.2, p. 8), and its convergence notion does not require the learner to recognize that it has converged (footnote 4, p. 17).
6. Track three costs separately: learner complexity, oracle complexity, and sample complexity (number of iterations) (section 2.1, p. 6).

For standard CEGIS over recursive languages, the paper defines a counterexample query that returns an element of the candidate language that is not in the target language, or bottom if it cannot find a counterexample (Definition 4.2, p. 14). The learner also receives positive examples as a transcript, an infinite stream covering the target language (Definition 4.3, p. 14).

Verus form (Inference): put the candidate Rust implementation behind a specification contract and use Verus as the correctness oracle. A failed proof obligation or counterexample from a bounded external checker can become the next synthesis constraint; a successful Verus proof is the termination answer. The learner and oracle must not be conflated: Verus checks the final candidate, while an agent or enumerator proposes it. Use `requires`, `ensures`, `assert`, `spec fn`, and `proof fn` only in the forms documented for Verus; no paper claim establishes a direct implementation.

## technique: choose counterexample policy deliberately
The paper compares four oracle policies for infinite concept classes:
- arbitrary counterexamples: the standard CEGIS oracle with no size restriction
- minimal counterexamples: the smallest failing example under a chosen total order
- constant-bounded counterexamples: failures smaller than a fixed bound B (Definition 4.7, p. 15)
- positive-history-bounded counterexamples: failures smaller than a previously seen positive example (Definition 4.8, p. 15)

The four policies are introduced in section 2.3, p. 9.

Steps:
1. Define an ordering or size metric over behaviors (for example, trace length then lexicographic order; section 4.1, p. 13).
2. Implement the oracle so its returned counterexample satisfies the selected policy.
3. Select learner memory: infinite memory stores all examples; finite memory stores only a finite representation (section 2.3, p. 10).
4. Analyze convergence for the target concept class before optimizing runtime.

Theoretical results for finite-memory learners are explicit (proofs assume partial specifications that are trace properties, section 5, p. 18). Theorem 5.1 says “the power of synthesis techniques using arbitrary counterexamples and those using minimal counterexamples are equivalent, that is, mincegis = cegis” (section 5.1.1, p. 18). Theorem 5.2 states that constant-bounded CEGIS is strictly weaker: `cbcegis` is a proper subset of `cegis` (section 5.1.2, p. 19). Theorem 5.3 finds incomparability for positive-history-bounded versus arbitrary counterexamples: neither includes the other (section 5.1.2, p. 20). For unbounded-memory learners the paper's summary is “CBCEGIS ⊂ MINCEGIS = CEGIS, and PBCEGIS ⊂ CEGIS = MINCEGIS”, with CBCEGIS and PBCEGIS not comparable (section 5.2, p. 24).

Inference: a Verus-backed agent should prefer counterexamples that expose the smallest or most local failing state only when this changes practical convergence; the theorem says minimal and arbitrary have equal synthesis power (for both finite and unbounded memory), not equal runtime or proof effort; the paper does not analyze computational complexity for infinite classes (section 2.3, p. 10), and its simulation of minimal counterexamples uses up to c extra calls to the arbitrary-counterexample verifier (proof of Theorem 5.1, p. 18). Restricting counterexamples by a fixed bound can make a loop unable to distinguish programs whose first disagreement lies beyond that bound.

## technique: reason about finite classes with teaching dimension
For finite candidate classes, termination is straightforward when the oracle returns, in every iteration, a new example ruling out at least one candidate (section 6, p. 25), but finding the smallest number of queries is computationally hard. Theorem 6.1 states that solving the problem with the minimum number of queries is NP-hard for finite C and finite E and any oracle interface containing the correctness query, and proves it by reduction from minimum set cover to selecting counterexamples that distinguish the correct language from every other language (section 6.1, pp. 25-26).

Inference: the steps below apply the reduction of Theorem 6.1 in practice; the paper gives no such procedure.
1. Enumerate the finite candidate programs or semantic languages and finite example domain.
2. For each candidate, record which examples distinguish it from the target.
3. Select a smallest distinguishing example set; this is a set-cover instance.
4. Use a heuristic or approximation when exact minimization is infeasible.

Teaching dimension gives a lower bound on OGIS sample complexity. The paper defines TD(C) as the maximum over concepts c of the minimum length of a teaching sequence for c (a labeled example sequence consistent with only c in C; Definition 6.1, p. 26), then states `M_OGIS(C) >= TD(C)`, where M_OGIS(C) is the minimum number of examples needed over target languages, for a complete specification and an OGIS instance using witness, equivalence, subsumption, or distinguishing input queries (Theorem 6.2, section 6.2, p. 26; the paper gives a short proof by contradiction). It also quotes from Goldman and Kearns [20] the bounds `VC(C)/log(|C|) <= TD(C) <= |C|-1` (Theorem 6.3, p. 27), and notes that the upper bound is tight for some concept class.

Verus form (Inference): finite Rust candidate templates can be instrumented with proof obligations and a finite set of discriminating inputs. The teaching-dimension result predicts a lower bound on how many distinct counterexamples an agent must see before one implementation is identified. The paper provides no Verus tactic and no guarantee that semantic equivalence of arbitrary Rust is decidable.

## what is proved and what remains trusted
The paper proves convergence-power relations under idealized recursive-language models, memory assumptions, sound oracles (section 2.1, p. 6), and specified query policies, mostly for partial specifications that are trace properties. It does not give empirical benchmark timings; its main evidence is mathematical proof. The infinite-class results concern learning in the limit and do not guarantee that a practical learner recognizes convergence and halts. The finite-class NP-hardness result concerns minimum query count, not whether synthesis itself is impossible.

The paper assumes the oracle is sound, meaning it "gives a correct response to every query it receives" (section 2.1, p. 6). Inference: the concept class and template must also be trusted to contain a correct solution, and the specification to encode the intended behavior. Inference: for VL, these assumptions are direct product risks: an agent can produce a proof that satisfies a bad contract, or a search loop can fail because the DSL excludes the needed Rust construct. Existing CEGIS theory already explains why verifier-guided iteration and counterexample retention matter; VL should measure its own templates, oracle costs, and memory policy rather than present CEGIS as new.

## techniques for the catalog
- oracle-guided inductive synthesis — separate learner, oracle, concept class, specification, and query protocol
- counterexample-guided synthesis — iterate candidate, correctness query, counterexample accumulation, and constrained resynthesis
- counterexample policy analysis — compare arbitrary, minimal, constant-bounded, and positive-history-bounded failures
- memory-aware convergence — analyze how finite versus unbounded example storage changes synthesis power
- teaching-dimension planning — lower-bound the number of distinguishing examples needed for finite candidate classes
- set-cover query minimization — minimum-query selection is NP-hard, shown by reduction from minimum set cover
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, Tcegis can simulate Tmincegis by finding the minimal counterexample at each step using the verifier CHECK iteratively as described above."): read the whole paper text (arXiv v4) and checked every quotation, theorem statement, definition, section and page reference, and technique step against it; changed the abstract quotation (it was not word for word), several section and page references (query types are in section 2.1, complexity factors in section 2.1 p. 6), the constant bound (strictly smaller than B), the description of the standard CEGIS oracle (counterexample query, not correctness query), the teaching dimension definition and its conditions, the direction of the set-cover reduction, the unsupported claims about DSLs and verified program fragments, and labeled the step lists and Verus parts as Inference; did not check the cited external works, the full correctness of the proofs, or the PDF's figures beyond the text; the arXiv link comes from the paper text (arXiv:1505.03953v4).
