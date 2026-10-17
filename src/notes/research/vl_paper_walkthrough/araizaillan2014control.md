# Formal Verification of Control Systems’ Properties with Theorem Proving
(authored by agents unless marked 🧑)
Tag: `araizaillan2014control`, [paper](http://arxiv.org/abs/1405.7615v2)

## scope and contribution

Araiza-Illan, Eder, and Richards describe a Simulink-to-Why3 pipeline for proving high-level control properties. The abstract states: “This paper presents the deductive formal verification of high-level properties of control systems with theorem proving, using the Why3 tool.” (abstract, PDF page 1). The workflow places assertion blocks in a Simulink model, translates the block graph to Why3 theories and goals, and invokes SMT/theorem provers. The case study is a scalar first-order discrete system with a quadratic Lyapunov function.

Inference: The reusable idea for VL is an annotation-to-verifier compiler: let domain users place structured assertions near the model, then generate proof obligations from an intermediate representation rather than hand-writing every obligation.

## technique: express requirements as assertion blocks and Hoare triples

What it is. The authors add a library of Simulink blocks that represent logical assertions over signals. A `Require` block has preconditions and postconditions in Hoare-triple form, and the translator turns connected assertion blocks into Why3 goals. They write: “The ‘Require’ block denotes a requirement in a Hoare triple form [3]”, followed by the formula {preconditions} → [model]{postconditions} (section 2, PDF page 2). The `Require` block is an enabled subsystem with an `Assert` block inside (section 2, PDF page 3).

When to use it. Use this approach when engineers already work in a graphical block language and need requirements visible at design time, simulation time, and proof time.

How to do it.

1. Add `Require` blocks and connect precondition and postcondition assertion signals to their labeled inputs (section 4, PDF page 5).
2. Build properties from basic blocks such as `Compare To Zero`, `Compare To Constant`, and `Assertion` (section 2, PDF page 2).
3. For the Lyapunov example, define `x ≠ 0 → V(x(k)) − V(x(k−1)) < 0`, `x ≠ 0 → V(x)>0`, and `x=0 → V(x)=0` as three separate requirements named `require`, `require1` and `require2` (section 2, PDF page 3).
4. Keep assertions modular: independent block sections can be proved separately and assembled hierarchically (section 2, PDF page 3).
5. Use the same assertions in simulation; an `Assert` block flags a violation when the model runs (section 5.1, PDF page 7).

Verus form. Inference: represent each requirement as a `spec fn` predicate over signal sequences and expose a proof function whose `requires` is the precondition and `ensures` is the postcondition. Keep runtime checks as ordinary Rust assertions or tests; Verus proof predicates do not become runtime checks automatically. A hierarchical proof can be a chain of lemma functions, each proving one subsystem contract.

Evidence and limits. The paper’s blocks are a subset under development; continuous-time signals and richer block libraries are future work (section 4, PDF page 5, and the closing paragraph of section 5, PDF page 8). Inference: a VL annotation compiler must define the supported subset explicitly, or generated proof goals may silently omit model behavior.

## technique: library of modular Why3 theories

What it is. Each Simulink block is mapped to a Why3 theory containing typed signal functions, axioms for input-output behavior, and lemmas/goals. The paper describes theories as “blocks of logic expressions with types, functions, predicates, axioms, lemmas and verification goals that can be used or cloned in a modular manner.” (section 3, PDF page 3).

How to do it.

1. Import basic theories as needed; section 3 lists “real numbers, integers, floating-point and lists” (PDF page 4), and the `Compare To Zero` theory also imports the Boolean theory (Figure 3, PDF page 5).
2. For each block, declare an input/output function indexed by an integer time sample. For `Product`, define `in1:int→real`, `in2:int→real`, and `out1:int→real` (Figure 2, PDF page 4).
3. Add axioms describing behavior and local facts; the product theory includes `out1 k = in1 k *. in2 k` and axioms that the product of two positives, and of two negatives, is positive (Figure 2, PDF page 4).
4. Clone a library theory for each concrete block and rename functions to connected signal names (section 4, PDF pages 5–6).
5. Add parameter axioms, such as gain values, when cloning (Figure 5 and section 4, PDF pages 6–7).
6. Add a goal whose implication connects the precondition and postcondition signals (Figure 5, PDF page 6).

Verus form. Inference: encode each block contract as a `spec fn` or lemma over typed sequences, and instantiate it for concrete signals. Use `ensures` for behavior and separate lemmas for algebraic facts; avoid axioms unless they correspond to trusted external facts, because Verus axioms enlarge the trusted base. A Rust trait can organize block implementations, but proofs should refer to concrete specs.

Evidence and limits. The paper’s theory example uses axioms for multiplication and comparison. Inference: axiomatizing a block can prove an inconsistent or over-strong model if the axioms do not match Simulink semantics, so a VL translator needs validation tests for each block theory.

## technique: automatic AST translation from block diagrams

What it is. MATLAB traverses the Simulink model’s block graph, computes an abstract syntax tree, and emits one Why3 theory per model/subsystem. The paper’s procedure identifies specification blocks, computes the AST, declares signal functions, clones and parameterizes block theories, and appends goals (section 4, PDF pages 5–6).

How to do it.

1. Identify `Require` blocks and their connected preconditions/postconditions (step 1, section 4, PDF page 5).
2. Compute predecessor and successor relationships with MATLAB block-manipulation functions and translate the AST into a Why3 theory (step 2, section 4, PDF page 5).
3. Name every outgoing signal and assign a real or Boolean function indexed by an integer time sample (step 3, section 4, PDF page 5).
4. Clone each block theory with model parameters such as gains and constants; omit structural `Require` theories because they only organize goals (step 4, section 4, PDF page 5).
5. Add Hoare-style verification goals from the assertion signals (step 5, section 4, PDF page 6).
6. Translate nested subsystems into theories and clone them into parent theories (section 4, PDF page 6).

Verus form. Inference: use a Rust-side intermediate representation of blocks and signals, then generate spec functions and proof lemmas. Preserve signal names and time indices in generated identifiers. The AST and cloning pattern carries over; Why3 theory-cloning syntax does not.

## technique: cross-check simulation and theorem proving

What it is. The authors first run Simulink assertions for selected gain values, then prove the same goals with CVC3 through Why3. For the system `x(k+1)=a x(k)` and `V(x)=x²`, stability requires `−1<a<1`; gain values outside that interval make the implication false: the paper expects proof failure “when the gain is >= 1 or <= −1” (section 5, PDF page 7). Inference: the exact interval is stated for the gain a in x(k+1)=a x(k); at a=0 the goal holds vacuously, because the precondition is false after the first step.

Evidence. Simulation tested ten gains: −1.1, −1.0, −0.5, 0.0, 0.8, 0.9, 0.9999, 1.0, 1.1, and 2.0. The table reports Fail for −1.1, −1.0, 1.0, 1.1, 2.0; Pass for −0.5, 0.8, 0.9, 0.9999; and Not checked for 0.0 because the precondition disables the assertion (Table 1, PDF page 8). Why3/CVC3 reports Valid for −0.5, 0.0, 0.8, 0.9, 0.9999 and Unknown for the remaining five gains, with the precondition and postcondition columns shown in Table 2 (PDF page 8). The denominator is ten gain settings in each table. The paper says the ‘Unknown’ results “show that stability could not be proved for those gains” (section 5.2, PDF page 7). Inference: “Unknown” is a non-proof, not evidence of instability. CVC3 completed these goals in less than the 150-second configured limit (section 5.2, PDF page 7).

Verus form. Inference: keep simulation tests as empirical checks and prove the symbolic parameter range with a lemma requiring `-1 < a < 1`. Separate a lemma that proves the implication is false for a counterexample gain. Verus’s solver result is a proof or failure diagnostic; it does not automatically produce Why3-style `Unknown` classifications with counterexamples.

## proved, trusted, and product implications

The paper proves the encoded Why3 goals for a discrete scalar model and measures agreement with simulation for ten gains under one CVC3 timeout. It does not prove all Simulink blocks, continuous-time dynamics, or physical plant behavior. The model’s block theories and their axioms are trusted inputs; the paper notes that “The main disadvantage of Why3 is the lack of feedback about the failure in the proof, compared to the production of counterexamples in model checking tools.” (closing paragraph of section 5, PDF page 8). Inference: the block theories and their axioms are trusted inputs; the paper does not validate them against Simulink semantics.

Inference: what VL should not redo is what the paper already supplies: the annotation-block pattern, modular theory library, AST translation sequence, and simulation/proof cross-check. Inference: VL should concentrate on a Verus-compatible intermediate representation, audited contracts for common Rust components, and diagnostics that explain failed obligations.

Inference: threat to agent-written verified Rust is medium. The pipeline can automate translation and discharge simple arithmetic properties, but unsupported blocks, over-strong axioms, solver `Unknown` results, and the gap between a model and its physical implementation remain substantial risks.

## techniques for the catalog

- assertion blocks as contracts — place preconditions and postconditions in the model and reuse them for simulation and proof
- modular theory library — give each block a typed input-output theory that can be cloned and parameterized
- AST-based model translation — traverse block connections and generate verifier declarations and goals automatically
- simulation/proof cross-check — compare runtime assertion outcomes with theorem-prover results over the same parameter set
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Then, the theories of the integer, real and Boolean numbers are imported. Functions corresponding to the signals that come out of the blocks are added to the theory"): read the whole paper text (8 pages plus references); checked every quotation, the figure and table contents and numbers (ten gains, Tables 1 and 2, 150-second limit), section and PDF page references, and each technique step against sections 2 to 5; changed page citations (Lyapunov requirements and hierarchical proofs are on page 3, not 2; Tables 1 and 2 are on page 8, not 7; theory list on page 4; section 5 starts on page 7), the Hoare-triple quotation (restored the citation marker [3]), the theory import step (Boolean is not in the section 3 list), the "sign-preservation" description, the gain-interval wording, and labeled several unmarked conclusions as Inference; kept the tag and the arXiv link (the paper text shows arXiv:1405.7615v2); did not check the cited works in the references, the Verus-form and product-implication paragraphs beyond their Inference labels, or the PDF figures beyond the extracted text.
