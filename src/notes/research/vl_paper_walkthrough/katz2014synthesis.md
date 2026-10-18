# Synthesis of Parametric Programs using Genetic Programming and Model Checking
(authored by agents unless marked 🧑)
Tag: `katz2014synthesis`, [paper](https://doi.org/10.4204/EPTCS.140.5)

## what the paper establishes
The paper presents a generate-and-check synthesis framework in which genetic programming (GP) proposes legal programs and an enhanced verifier scores them. Its abstract states: “The use of genetic programming, in combination of model checking and testing, provides a powerful heuristic to synthesize programs.” (Abstract, p. 70.) The authors explicitly bound the claim: “The method is not completely automatic, as it is fine tuned by a user that sets up the specification and parameters.” (Abstract, p. 70.) They also state: “It also does not guarantee to always succeed and converge towards a solution that satisfies all the required properties.” (Abstract, p. 70.)

Inference: for VL, the transferable idea is a search loop in which generated Verus code is repeatedly checked, while specifications, candidate grammar, and stopping criteria remain human-controlled. A successful run is evidence only for the checked domain unless the verifier proves a universal contract.

## technique: genetic-programming synthesis guided by enhanced model checking

what it is and when to use it
The method searches a constrained syntax space rather than synthesizing arbitrary source; the paper calls it “a heuristic search in the space of syntactically fitting programs.” (Section 1, p. 70.) The user supplies: “The formal specification of the problem, as well as the required architecture and constraints on the structure of the desired solutions is provided by the user.” (Section 2, p. 71.) The verifier can be “a model checker, often enhanced to provide more information than yes/no (and counterexample), or a SAT solver.” (Section 2, p. 71.) Inference: use this when the target can be expressed with a finite grammar and the verifier can cheaply evaluate many candidates.

how to do it
1. Define a candidate grammar and resource bounds. The paper requires function literals and instructions, process count and communication methods, program-size and iteration limits, and optionally initial code (Section 2, pp. 71–72).
2. Give a formal specification consisting of linear-temporal-logic properties and quantitative requirements (Section 2, p. 72).
3. Generate an initial population randomly from the grammar and constraints (Section 2, p. 72).
4. Verify every candidate and calculate fitness from how much of the specification it satisfies (Section 2, p. 72).
5. Randomly select μ candidates, create λ new candidates with mutation (and optionally crossover), score the new candidates by enhanced model checking, and choose new μ candidates from the μ+λ set with higher-fitness candidates selected with higher probability (Section 2, p. 72). The paper’s exact loop is: “Steps 4 and 5 are repeated until either a perfect program is found (fully satisfying the specification), or until the maximal number of iterations is reached.” (Section 2, p. 72.)
6. Return a fully satisfying program when one exists, or the best partially correct programs with verification results (Section 2, p. 72).

Mutation operates on a program tree. The paper lists four operations: “(a) Replace the subtree with root s with a new randomly generated subtree. (b) Add an immediate parent to s. Randomly create other offspring to the new parent, if needed. (c) Replace the node s by one of its offspring. Delete the remaining offspring of that node. (d) Delete the subtree with root s.” (Section 2, p. 73.) Crossover chooses same-typed nodes in two trees and exchanges their subtrees (Section 2, pp. 73–74), but “Crossover is not used in our work.” (Section 2, p. 74.) The conclusion says the same: “crossover is also extensively used, but we did not implement it” (Section 8, p. 83), where “also extensively used” refers to genetic programming in general.

Fitness is multi-level rather than binary. For each LTL property the four example levels range from no executions satisfying it, through partial satisfaction, to all executions satisfying it (Section 2, p. 74). The authors generate levels with Streett automata and strongly connected component analysis, enhanced model-checking logic, or probabilistic model checking (Section 2, p. 74). They prioritize safety over liveness and subtract a value related to program length to discourage useless growth (Section 2, p. 75).

Verus form
Inference: represent each candidate as a fixed Rust/Verus function skeleton with holes selected from a finite set of expressions or statements. Keep executable code in `fn`, state properties in `requires`/`ensures`, and prove helper facts in `proof fn` or `lemma` bodies using only constructs documented for Verus. A candidate cannot be accepted merely because a test harness passes: invoke Verus for each candidate and retain the verifier result. Verus does not provide the paper’s GP engine, mutation tree, or graded Streett-automaton fitness, so these must be an external generator and driver. A Verus contract can express safety and functional postconditions; liveness and probabilistic fitness need a separate model and are not carried over automatically.

what evidence shows it works
The mutual-exclusion experiment uses two processes and three configurations. “Each run included the creation of 150 initial programs by the GP engine, and the iterative creation of new programs until a perfect solution was found, or until a maximum of 2000 iterations.” (Section 3, p. 76.) “At each iteration, 5 programs were randomly selected, bred, and replaced using mutation. The values µ = 5, λ = 150 where chosen.” (Section 3, p. 76.) The reported variants include two-bit deadlock freedom, three-bit Dekker-style starvation freedom, and three-bit Peterson-style starvation freedom (Table 2, p. 76). The paper prints evolved code and fitness values, including 94.34 for an intermediate algorithm and 96.70 for a later one (Section 3, p. 76).

The experiment is evidence that this particular configuration can discover known and new mutual-exclusion protocols. It is not a success probability: the paper gives no denominator for the number of independent runs that succeeded or failed. Inference: VL should record attempts, timeouts, verifier calls, and candidate denominators rather than report only a discovered example.

## technique: parametric co-evolution with accumulated counterexamples

what it is and when to use it
The paper treats model checking of a parameterized family as exhaustive only for each fixed instance. It says: “For this reason, we use model checking in our approach for synthesizing parametric systems not as a comprehensive method for finding correctness, but as a generalized testing tool, which can make exhaustive checks for fixed parameters.” (Section 1, p. 71.) For parameterized synthesis it assumes that many checked instances provide useful evidence, then evolves counterexamples along with programs.

how to do it
1. Choose a parameterized program family and generate concrete parameter instances (Section 4, p. 78).
2. Check each instance with model checking; retain instances on which a candidate fails as counterexamples (Section 4, p. 78).
3. Evaluate a program by closeness to satisfying the accumulated properties and evaluate a counterexample by how strongly it falsifies the candidate (Section 4, p. 78).
4. Check every new candidate against the retained failed instances before spending effort on fresh instances (Section 4, p. 78).
5. Stop only when the accumulated evidence is judged strong enough; the conclusion repeats that parametric verification is undecidable in general and says: “we finish if we obtain a strong enough evidence that the solution is correct on the accumulated cases.” (Section 8, p. 83.) Section 4 (p. 78) states the assumption: “we assume that a solution that is checked for a large number of instances/parameters is acceptable. This is not a guarantee of correctness”.

Verus form
Inference: instantiate a Verus function over bounded sizes or concrete model states, run `assert`/contract proofs for each instance, and store failing inputs as regression cases. Universal quantification over an unbounded collection requires a separately proved inductive invariant or a finite abstraction; accumulating examples alone cannot establish it. Counterexamples can guide candidate generation, but they do not become Verus specifications unless encoded as explicit assertions or lemmas.

what evidence shows it works and limits
The paper gives leader election and concurrent sorting as examples where each fixed size/value set is exhaustively checked but all sizes and values are not. It reports that “A solution for the leader election, albeit not the most optimal one, was obtained using our genetic programming methods [10].” (Section 4, p. 78.) No number of candidate instances, runs, or failures is supplied for that result. Inference: a VL evaluation must state the exact parameter set and denominator, because this technique measures coverage rather than universal correctness.

## technique: co-evolving architectures to find and repair protocol bugs

what it is and when to use it
The correction method evolves both code and the architecture that exercises it. The paper lists two ideas: “Use the genetic engine not only to generate programs, but also to evolve different architectures on which programs can run.” and “Apply a co-evolution process, where candidate programs, and test cases (architectures) that may fail these programs, are evolved in parallel.” (Section 5, p. 79.) Inference: use this when a protocol’s failure depends on process topology, interaction choices, or message routing that is itself variable.

how to do it
1. Encode the architecture, including processes and interactions, as a mutable syntax tree (Section 5, p. 79).
2. Evolve an architecture whose execution falsifies the current protocol specification, using a fitness function for bad architectures (Section 5, p. 79).
3. Reverse the search direction: evolve program mutations that pass model checking on the discovered bad architecture (Section 5, p. 79).
4. Add every architecture that defeats a candidate to the retained set; repairing one architecture is insufficient (Section 5, p. 79).
5. Maintain separate fitness functions for architecture falsification and program correction (Section 5, p. 79).

The paper’s concrete repair changes `if n>0 then n:=n-1` to `if sender∈shared then n:=n-1` (Section 5, p. 79), after a generated architecture and message sequence exposed an assertion violation (Figures 4–5, p. 80). The paper attributes this case study to its earlier work [11] (Section 5, p. 79).

Verus form
Inference: model each architecture as a test harness or a Verus state-machine instance, and express the repaired protocol’s safety as `invariant` declarations inside the state-machine proof. A generated architecture can produce a concrete counterexample trace; the repair must then be proved against an abstract transition relation and all allowed participants. Verus does not infer arbitrary network topologies, so architecture mutation and trace generation remain external.

what evidence shows it works and limits
The α-core protocol is described as a practical multiparty synchronization protocol with a known error (Section 5, p. 79). The paper reports one found violating architecture and one line-level correction. It does not report how many random architectures were explored, the success rate, or proof of the corrected protocol for all architectures. Inference: the result demonstrates bug finding and repair under the retained architecture set, not complete protocol verification.

## technique: replacing model checking with SAT/SMT for loop-free programs

what it is and when to use it
The SAT/SMT variant restricts generation to straight-line programs over decidable theories. The paper states: “Only loop-free programs are generated.” (Section 7, p. 81.) The user supplies first-order preconditions and postconditions; a prover translates each candidate into a logical relation and asks Z3 for satisfiability (Section 7, pp. 81–82). Inference: use this when the program grammar is loop-free and its operators fit a decidable theory such as bounded bit-vectors, arrays, equalities, or uninterpreted functions.

how to do it
1. Select theory-compatible variables, functions, and operators as building blocks; generate only loop-free programs (Section 7, p. 81).
2. State a common precondition φ and postconditions ψᵢ, and translate the program into ηP, the input/output relation (Section 7, p. 82).
3. For each postcondition form `Fi := φ ∧ ηP ∧ ¬ψi` and `Fi′ := φ ∧ ηP ∧ ψi` (Section 7, p. 82).
4. Classify fitness: unsatisfiable `Fi′` means the candidate is incorrect for all inputs; satisfiable `Fi` and `Fi′` means some inputs pass; unsatisfiable `Fi` means correctness for all inputs (Section 7, p. 82).
5. Feed solver counterexamples from satisfiable `Fi` into a faster runner as regression tests; the paper says these tests “can help in building a smoother fitness function” (Section 7, p. 82).

Verus form
Inference: write the loop-free candidate as an executable `fn` with `requires φ` and `ensures ψ`; let Verus generate the verification condition and use `assert` or proof lemmas for arithmetic facts. Bounded bit-vector semantics may need explicit Rust integer widths and overflow reasoning. The paper’s `ηP`, satisfiability fitness levels, and solver-generated counterexample pool belong to an external synthesis driver; they are not Verus syntax. Unlike the paper’s finite-width SMT proof, a Verus proof is only as general as the Rust types and contract it verifies.

what evidence shows it works
The first synthesized example computes a bit-vector predicate with `T = X + 1; R = T and X`; the paper says: “Solutions found by the method described above are guaranteed to be correct for every possible input (in the domain of the variables, such as bit-vectors with a specific width).” (Section 7, p. 82.) For average computation, candidate (a) overflows and is refuted by a large-input counterexample, candidate (b) fails when both inputs are odd, and candidate (c) is verified correct (Section 7, pp. 82–83; Figure 7). No counts of solver calls or independent synthesis runs are given. Inference: this is the strongest evidence in the paper because the final claim is universal over the explicitly bounded variable domain, but it does not establish correctness outside that domain.

## trusted boundary, contradictions, and VL threat

The paper trusts the user’s specification, grammar, parameter limits, verifier implementation, and the interpretation of “strong enough evidence.” It explicitly warns that model checking is limited and that “Our method is not guaranteed to terminate with a correct solution”. (Section 1, p. 70.) The abstract simultaneously calls the method powerful and says it may not converge; these are compatible claims about heuristic usefulness rather than guarantees.

The paper’s mutual-exclusion table lists three variants, while the experiment paragraph says “Three different configurations where used” and gives μ=5, λ=150 (Section 3, p. 76); it does not state whether each configuration was run once or repeatedly. The reported fitness values 94.34 and 96.70 (Section 3, p. 76) have no stated denominator or normalization definition in the text. Inference: they should not be read as percentages or compared with success rates.

Inference: the direct threat to a product that emits agent-written verified Rust is moderate. The search loop could discover candidate code or repair examples, but Verus still needs a complete contract and proof for the actual product. The paper’s model-checking evidence for fixed instances and its architecture search do not replace inductive proofs, ownership reasoning, or coverage of unbounded inputs. Its SMT pattern is useful for loop-free components: generated candidates can be rejected by Verus before integration, and solver counterexamples can seed regression tests. The paper does not study Rust, Verus, LLMs, ownership, or proof maintenance, so it leaves those product risks unmeasured.

## what VL should not redo

Inference: VL should not claim novelty for the basic generate–verify–mutate loop, graded verifier fitness, retained counterexamples, architecture co-evolution, or SMT checking of loop-free bit-vector code; these are all described in this paper, which presents them as a summary of its authors’ earlier work (“We present in [8, 9, 10, 11, 12] a framework combining genetic programming and model checking”, Section 2, p. 71). A new VL study would need to measure a Verus-specific property such as proof repair cost, contract quality, or sound coverage over changing Rust dependencies.

## techniques for the catalog

- enhanced-model-checking GP: evolve grammar-constrained program trees using graded model-checking fitness, mutation, and selection
- parametric counterexample co-evolution: retain failed parameter instances and score both candidate programs and falsifying instances
- architecture-guided repair: mutate process architectures to expose protocol failures, then evolve repairs against accumulated bad architectures
- loop-free SMT synthesis: translate straight-line candidates and Hoare-style contracts into solver formulas, using satisfiability and counterexamples as fitness

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Those algorithms have executions in which one of the processes starve, hence only partially satisfying properties 7 or 8."): I read the whole paper text (pp. 70–84, all sections) and the whole study and checked every quotation, number, section and page reference, and the steps of the four techniques (GP loop and mutation, parametric co-evolution, architecture co-evolution and the α-core repair, SMT fitness levels) against it. Changed: link now the DOI from the paper text (doi:10.4204/EPTCS.140.5); replaced a misquoted sentence in Section 1 (“Our method is not guaranteed to terminate with a correct solution”); replaced an altered quotation from Section 8 with the exact words; completed the Section 2 quotation of the specification input; corrected the selection step (new candidates are scored, then μ chosen from μ+λ); corrected page references for the fitness levels (p. 74) and Figures 4–5 (p. 80); noted the crossover statement in Section 8; marked three “use this when” sentences as Inference; reworded the claim about the fitness values 94.34 and 96.70 and the claim that the contributions are new here (the paper cites its earlier work [8–12]). Not checked: the Verus-form paragraphs and the threat assessment, which are the study’s own inferences about Verus, not paper content; the cited earlier papers; the PDF figures beyond their text.
