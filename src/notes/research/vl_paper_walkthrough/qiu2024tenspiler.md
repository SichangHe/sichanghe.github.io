# Tenspiler: A Verified-Lifting-Based Compiler for Tensor Operations
(authored by agents unless marked 🧑)
Tag: `qiu2024tenspiler`, [paper](https://arxiv.org/abs/2404.18249)

## what is proved and trusted
Tenspiler translates loop-based C/C++ or Python tensor code into six tensor DSLs and hardware backends. Its central intermediate representation (IR), Tensir, expresses tensor operators independent of backend details. The abstract says: “Unlike classical pattern-matching-based compilers, Tenspiler uses program synthesis to translate input code into Tensir, which is then compiled to the target API / ISA.” (Abstract, p. 1) Synthesis is bounded and uses Rosette; CVC5 then verifies equivalence over unbounded integer/real states before code generation (Sec. 2, p. 3; Sec. 4.2, pp. 9–10). The authors state: “Currently, while image processing kernels use integers and deep learning kernels operate over floats, we verify all the benchmarks using the theory of integers and reals, due to poor solver support for reasoning about floats.” (Sec. 4.2, p. 9)

Inference: the guarantee depends on the source model, Tensir operator definitions and axioms, and SMT solver correctness. Backend code generation also remains trusted: the described proof checks the Tensir summary before syntax-directed code generation, rather than verifying the emitted backend program. The integer/real proof does not establish machine floating-point equivalence.

## technique: verified lifting through a semantic IR
Inference: use a small functional IR when one source implementation must target several APIs while preserving modeled behavior.

Tensir's `t_t(x,y,operation)` applies an element-wise operation and `t_s(x,a,operation)` applies a scalar operation (Fig. 1b, p. 4). Translate source S into a candidate program summary PS in Tensir. The candidate is accepted only if it is functionally equivalent for all inputs. Then map Tensir operators to each backend with syntax-directed rules.

The paper's screen-blend example starts from nested loops and lifts it to `t_t(t_t(b,a,+), t_s(t_t(b,a,*),255,/),-)`, then emits NumPy, TensorFlow, PyTorch, MLX, and accelerator code (Fig. 1, pp. 4–5). The workflow is explicitly three phases: “1. synthesis, 2. verification, and 3. backend code generation.” (Sec. 4, p. 8)

Inference: Verus form: model the source and lifted function as Rust `spec fn`s over sequences, prove an `ensures` equivalence theorem for each operator, and make backend serializers executable functions whose input is a verified IR. Use loop invariants for source loops. The paper's Rosette/CVC5 architecture does not transfer directly; Verus can discharge modeled integer properties, while external backend behavior remains trusted unless separately modeled.

## technique: VC-driven SyGuS with synthesized invariants
Inference: use verification conditions (VCs) when source loops require inductive reasoning.

Tenspiler generates VCs with placeholders for PS and loop invariants. The paper presents three clauses: initial condition `pre→inv`, loop preservation `inv∧P→inv'`, and post-condition `inv→post` (Sec. 4.1, p. 8). Construct a context-free grammar G of Tensir expressions and solve `∃ invs,PS∈G. ∀σ. VC(S,invs,PS,σ)` using Rosette over bounded states (Sec. 4.1, pp. 8–9). The paper says: “In Tenspiler, the P S and invariants in the VCs are generated as placeholders as S is analyzed, with their bodies to be synthesized during the synthesis phase.” (Sec. 4.1, p. 8) Candidate invariants and summary are validated by CVC5; a satisfiable negated VC rejects the candidate and sends synthesis back to search. An UNSAT result proves the candidate for all states (Sec. 4.2, p. 9).

Inference: Verus form: write loop invariants directly as `invariant` clauses on Rust loops and state source/lifted equivalence in `ensures`. Candidate synthesis can be an external tool, but the final Verus proof must check every invariant and postcondition. Do not write `invariant(...)` as a function call; the paper's invariant placeholders are a synthesis representation, not Verus syntax.

## technique: make synthesis tractable by staged restrictions
Tenspiler first restricts grammar operators by expected output type, removing reductions that cannot return the source type (Sec. 5.1, p. 12). Second, it restricts early synthesis states: 1D tensors to length 2 and integers to 6 bits or less, then increases bounds when candidates fail and runs unbounded verification afterward (Sec. 5.2, p. 12). Third, it statically analyzes S into an expression tree, abstracts variables/constants into placeholders, and uses that tree to prune operator sequences. For screen blend, the tree `(- (+ var var) (/ (* var var) lit))` yields the exact Tensir shape (Sec. 5.3, pp. 12–13). Fourth, it restricts variables to live source variables and constants to source literals; the example falls to 64 expressions and solves in 76 seconds (Sec. 5.4, p. 13). The stated restrictions are: “Specifically, we constrain the variables to the set of live variables and also constrain constants to the set of constants that have appeared in the program.” (Sec. 5.4, p. 13)

Inference: Verus form: analogous restrictions can bound candidate Rust expressions and then generalize through a final unbounded Verus proof. Expression-tree filtering can select which helper `spec fn`s to instantiate; it cannot replace proof. Bounded tests must never be reported as universal correctness.

The synthesis algorithm loops over bounded rounds: Rosette proposes PS and invariants; CVC5 returning UNSAT accepts them, while SAT causes candidate-blocking constraints and another round. If Rosette finds no candidate, the grammar expands. After the maximum rounds, tensor bounds increase (Sec. 5.5, p. 13; Fig. 7, p. 14). The authors explain: “These constraints state that the generated P S or invs in next round should differ from those in the previous rounds.” (Sec. 5.5, p. 13)

Inference: this candidate-blocking loop is reusable for proof synthesis. The described algorithm excludes previous candidates; it does not specify feeding counterexample states back into synthesis.

## technique: axiomatize recursive tensor operators
SMT solvers cannot infer all recursive list/tensor behavior. Tenspiler adds inductive axioms for operators, such as the tensor-scalar recurrence, and algebraic properties such as associativity, commutativity, and distributivity (Sec. 4.2, p. 10). The authors explain: “Since the verification of loop invariants is undecidable in general, we define additional axioms for the operators in Tensir to aid verification.” (Sec. 4.2, p. 10)

## techniques for the catalog
- semantic-IR verified lifting: synthesize a backend-independent tensor program and prove equivalence before code generation
- VC-driven SyGuS: jointly synthesize summaries and loop invariants from verification conditions
- staged search restriction: prune by types, bounded states, expression trees, and live variables before universal proof
- candidate-blocking synthesis: exclude rejected summaries/invariants with blocking constraints and retry
- operator axiomatization: supply inductive and algebraic facts for recursive tensor semantics
