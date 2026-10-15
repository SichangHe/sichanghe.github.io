# Verification of Programs via Intermediate Interpretation
(authored by agents unless marked 🧑)
Tag: `lisitsa2017intermediate`, [paper](http://arxiv.org/abs/1708.09002v1)

## idea and verification target

The paper verifies a program indirectly by specializing an interpreter with respect to a program model. It applies Turchin’s supercompilation to a self-interpreter for a functional language and studies parameterized cache-coherence protocols. The abstract says: “We explore an approach to verification of programs via program transformation applied to an interpreter of a programming language.” (Abstract, p. 1). The safety property is moved from interpreter execution into a syntactic property of the residual program.

The first Futamura projection supplies the architecture: given interpreter `IntM(p,d)`, specialize it for known program `p` while data `d` remains unknown. The resulting residual program behaves like `p` on every data input. The paper’s introduction states: “We show that a well-known program specialization technique called the first Futamura projection can be used for indirect verification of some safety properties.” (Sect. 1, p. 1).

## technique: encode a protocol and its safety predicate

Choose a functional program model of the parameterized protocol. The Synapse N+1 example uses counting abstraction and a `Main` predicate that consumes an input stream describing transitions. Define the safety property as absence of forbidden states. The direct model must terminate for every input; then a residual predicate that always returns `True` demonstrates safety. Encode the protocol program as data in the interpreter’s implementation language, because the interpreter is specialized with respect to its program argument.

Verus form. Inference: represent protocol states and transition streams as Rust enums and pure `spec fn`s. State safety as an invariant over reachable states and prove termination or a bounded transition relation. Verus does not perform supercompilation, so the residual-program argument would need a separately proved compiler-correctness theorem.

## technique: self-interpreter and first specialization

Implement an interpreter for the object-language fragment (the paper calls it a self-interpreter because it is written in the language supported by the supercompiler). Its state includes an expression, environment, continuation/function-application stack, and time labels. Run supercompiler SCP4 on `Int` with the protocol model as the known second argument while the data stream remains symbolic.

The process is an unfold-fold loop. Unfold known function applications and rewrite steps; build a configuration tree; when a repeated or larger configuration appears, generalize it according to well-quasi-ordering relations and fold the branch. Turchin’s relation compares timed configurations; Higman–Kruskal ordering controls expression growth. The strategy avoids infinite unfolding while retaining enough structure to expose the safety predicate.

Verus form. Inference: this is a verified partial evaluator only if each unfold/fold rule has a semantic-preservation lemma. A Rust implementation could use an AST, `spec fn eval`, and `ensures eval(residual,d) == eval(interpreter,p,d)`; termination needs a decreasing well-founded measure for generalization.

Evidence and limits. The paper notes that “The models used in the experiments require one additional supercompilation step” (Sect. 1, p. 2). It also says protocol examples were specialized by SCP4 and that the self-interpreter source was available as supplementary code (Sect. 1, pp. 2–3). The method depends on the specializer’s termination and its correctness on the chosen interpreter fragment.

## technique: recognize safety in residual syntax

After specializing `Int` with the protocol program, inspect the residual predicate. The target syntactic property is absence of `return False`; because the original direct model terminates, a residual predicate that always returns `True` establishes that no reachable input produces a bad state. The paper gives the criterion directly: “This property means that the residual predicate never returns False and always True.” (Sect. 5, p. 65).

If the first residual program is too complex, supercompile it again. The authors report that all tested cache-coherence models required at most two specializations (Sect. 5, p. 65). To find counterexamples rather than prove safety, run the specializer interactively and unfold toward `False`; the paper says the method can construct witnesses for buggy protocols (Sect. 5.1, p. 66).

Verus form. Inference: check residual syntax with a verified AST predicate, but connect that predicate to safety with a theorem about the evaluator. A mere Rust pattern match on generated code is not evidence unless residual equivalence and the `False`-absence implication are proved.

## technique: meta-reasoning about interpreter big-steps

The authors analyze complete interpreter big-steps rather than every low-level reduction. They prove that configurations generated while interpreting protocol rules have regular shapes, and that Turchin/Higman–Kruskal generalization preserves enough information to continue specialization. This explains why an indirect model, which is larger than the direct protocol, can still be specialized.

They explicitly characterize the result as partial interpreter verification: “the experiments can also be considered as a partial verification of the intermediate interpreter used.” (Sect. 1, p. 2). The proof applies to a series of protocol programs satisfying the stated syntactic and termination assumptions, not to arbitrary interpreters.

Verus form. Inference: formalize one interpreter big-step as a recursive `spec fn` and prove lemmas for each protocol instruction. Use ghost traces to state that generalized configurations over-approximate concrete steps. A complete theorem for arbitrary Turing-complete interpreters is unlikely without strong restrictions.

## evidence, trust, and implications for VL

The paper reports successful verification of Synapse N+1 and other parameterized cache-coherence protocols, with at most two specialization passes, but does not give a denominator-based success percentage in the abstract. It compares indirect verification against earlier direct supercompilation and notes that the direct protocol series had already been verified by other methods. Thus VL should treat this as a reusable architecture, not redo the same protocol benchmarks.

Proved or argued: semantics-preserving specialization for the considered interpreter patterns, residual-syntax safety criterion, and uniform properties of configuration generalization. Trusted: SCP4’s implementation and kernel, the interpreter semantics, protocol encoding, termination assumptions, and manual interpretation of residual syntax. Inference: for agent-written verified Rust, the threat is unsound generated transformations that appear to eliminate bad branches. A Verus proof of evaluator equivalence and a machine-checked residual safety predicate would contain it; without those, supercompilation output is only a heuristic. The key lesson is to verify the transformation boundary, not merely inspect transformed code.

## techniques for the catalog

- intermediate interpretation — specialize an interpreter with a program model to obtain an indirect residual model
- first Futamura projection — keep runtime data symbolic while compiling known program structure
- Turchin supercompilation — unfold, generalize, and fold functional programs under well-founded control
- residual safety checking — prove safety by showing the residual predicate cannot return `False`
- interpreter meta-reasoning — prove regular big-step configuration properties to justify specialization

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
