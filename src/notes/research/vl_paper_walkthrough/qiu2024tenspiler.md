# Tenspiler: A Verified-Lifting-Based Compiler for Tensor Operations
(authored by agents unless marked 🧑)
Tag: `qiu2024tenspiler`, [paper](https://arxiv.org/abs/2404.18249)

## what is proved and trusted
Tenspiler translates loop-based C/C++ or Python tensor code into six tensor DSLs and hardware backends. Its central intermediate representation (IR), Tensir, expresses tensor operators independent of backend details. The abstract says: “Unlike classical pattern-matching-based compilers, Tenspiler uses program synthesis to translate input code into Tensir, which is then compiled to the target API / ISA.” (Abstract, p. 1) Synthesis is bounded and uses Rosette; CVC5 then verifies equivalence over unbounded integer/real states before code generation (Sec. 2, p. 4; Sec. 4.2, pp. 9–10). Trusted assumptions include the source semantics, Tensir operator axioms, SMT solver correctness, and backend code generators. The authors explicitly verify integers and reals because solver support for floating point is poor (Sec. 4.2, p. 10).

## technique: verified lifting through a semantic IR
Use when one source implementation must target several APIs while preserving behavior. Define a small functional IR whose operators capture common semantics. For example, Tensir's `t_t(x,y,operation)` applies an element-wise operation and `t_s(x,a,operation)` applies a scalar operation (Fig. 1b, p. 4). Translate source S into a candidate program summary PS in Tensir. The candidate is accepted only if it is functionally equivalent for all inputs. Then map Tensir operators to each backend with syntax-directed rules.

The paper's screen-blend example starts from nested loops and lifts it to `t_t(t_t(b,a,+), t_s(t_t(b,a,*),255,/),-)`, then emits NumPy, TensorFlow, PyTorch, MLX, and accelerator code (Fig. 1, pp. 4–5). The workflow is explicitly three phases: “1. synthesis, 2. verification, and 3. backend code generation.” (Sec. 4, p. 8)

Verus form (Inference): model the source and lifted function as Rust `spec fn`s over sequences, prove an `ensures` equivalence theorem for each operator, and make backend serializers executable functions whose input is a verified IR. Use loop invariants for source loops. The paper's Rosette/CVC5 architecture does not transfer directly; Verus can discharge modeled integer properties, while external backend behavior remains trusted unless separately modeled.

## technique: VC-driven SyGuS with synthesized invariants
Use when loops prevent direct expression equivalence. Generate verification conditions (VCs) with placeholders for PS and loop invariants. The paper's three clauses are: initial condition `pre→inv`, loop preservation `inv∧P→inv'`, and post-condition `inv→post` (Sec. 4.1, p. 8). Construct a context-free grammar G of Tensir expressions and solve `∃ invs,PS∈G. ∀σ. VC(S,invs,PS,σ)` using Rosette (Sec. 4.1, pp. 8–9). Candidate invariants and summary are validated by CVC5; a satisfiable negated VC rejects the candidate and sends synthesis back to search. An UNSAT result proves the candidate for all states (Sec. 4.2, p. 9).

Verus form (Inference): write loop invariants directly as `invariant` clauses on Rust loops and state source/lifted equivalence in `ensures`. Candidate synthesis can be an external tool, but the final Verus proof must check every invariant and postcondition. Do not write `invariant(...)` as a function call; the paper's invariant placeholders are a synthesis representation, not Verus syntax.

## technique: make synthesis tractable by staged restrictions
Use these optimizations before increasing search depth. First restrict grammar operators by expected output type, removing reductions that cannot return the source type (Sec. 5.1, p. 12). Second restrict early synthesis states: tensors to length 2 and integers to 6 bits, then increase bounds when candidates fail; always run unbounded verification afterward (Sec. 5.2, p. 12). Third statically analyze S into an expression tree, abstract variables/constants into placeholders, and use that tree to prune operator sequences. For screen blend, the tree `(- (+ var var) (/ (* var var) lit))` yields the exact Tensir shape (Sec. 5.3, pp. 12–13). Fourth restrict variables to live source variables and constants to source literals; the example falls to 64 expressions and solves in 76 seconds (Sec. 5.4, p. 13).

Verus form (Inference): analogous restrictions can bound candidate Rust expressions and then generalize through a final unbounded Verus proof. Expression-tree filtering can select which helper `spec fn`s to instantiate; it cannot replace proof. Bounded tests must never be reported as universal correctness.

The synthesis algorithm loops over bounded rounds: Rosette proposes PS and invariants; CVC5 returns UNSAT to accept, SAT to add blocking constraints and retry, or no candidate to expand the grammar; after max rounds, increase tensor bounds (Fig. 7, p. 14). This explicit counterexample-guided loop is reusable for proof synthesis.

## technique: axiomatize recursive tensor operators
SMT solvers cannot infer all recursive list/tensor behavior. Tenspiler adds inductive axioms for operators, such as the tensor-scalar recurrence, and algebraic properties such as associativity, commutativity, and distributivity (Sec. 4.2, p. 10). The authors warn that “Since the verification of loop invariants is undecidable in general, we define additional axioms for the operators in Tensir to aid verification.” (Sec. 4.2, p. 10)

Verus form (Inference): prefer recursive `spec fn`s with proved lemmas over unchecked axioms. If an external model is unavoidable, isolate it and record the axiom as trusted; never attach `external_body` to the function whose behavior is the property being verified. This is a material trust boundary for VL.

## evidence, limits, and VL threat
The evaluation uses 10 real-world benchmark suites, 1-hour synthesis timeout, six DSLs, and seven DSL-device combinations (Sec. 6.1, pp. 15–16). It selects 10,000 ImageNet images for most 1-D/2-D benchmarks; Llama kernels use Vicuna weights, primarily 33B, while MLX uses 7B due to memory limits (Sec. 6.1.1, p. 15). All benchmarks synthesize correct translations under 15 minutes; blend benchmarks average 40.7 seconds and median 2.357 seconds, while double-loop cases average 128.91 seconds and median 22.74 seconds (Sec. 6.2, p. 17). The paper's headline reports averages of 105× kernel and 9.65× end-to-end speedup over optimized sequential code (Abstract, p. 1); denominators are the benchmark measurements across their settings, not all programs. Three Llama cases need extra rounds; transformer1 requires increasing tensor bound from 2 to 3 (Sec. 6.2, p. 17). Gemmini runs on a simulator with smaller random inputs (footnote, p. 15), so its comparison is not the same physical setting.

Inference: VeruLaw can reuse a semantic IR, VC-shaped invariant synthesis, counterexample-guided blocking, and a final universal proof gate to translate agent-written Rust into verified helper libraries or optimized implementations. Existing Tenspiler work means VL should not redo generic verified lifting; it must adapt the IR and proofs to Rust ownership, integer widths, and Verus semantics. Product threat is medium: an incorrect backend serializer or unsound axiom can invalidate the guarantee even when the IR proof passes. The paper's separation between bounded synthesis and unbounded verification is a strong design requirement for agent-generated Rust.

## techniques for the catalog
- semantic-IR verified lifting: synthesize a backend-independent tensor program and prove equivalence before code generation
- VC-driven SyGuS: jointly synthesize summaries and loop invariants from verification conditions
- staged search restriction: prune by types, bounded states, expression trees, and live variables before universal proof
- counterexample-guided synthesis: reject SAT counterexamples with blocking constraints and retry
- operator axiomatization: supply inductive and algebraic facts for recursive tensor semantics
Checked 2026-10-15 against paper qiu2024tenspiler: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
