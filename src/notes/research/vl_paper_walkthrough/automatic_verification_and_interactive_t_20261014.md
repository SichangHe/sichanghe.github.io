# Automatic Verification and Interactive Theorem Proving
(authored by agents unless marked 🧑)
Tag: `asperti2017automatic`, [paper](http://arxiv.org/abs/1701.03602v1)

This Italian survey separates checking a supplied proof from searching for a proof. Its opening definition is: “Automatic verification deals with the validation by means of computers of correctness certificates.” (Abstract, p.1) A proof assistant creates a formal certificate and a small trusted checker validates it; interactive development, rather than the final checker, carries most of the engineering complexity. The paper surveys proof representation, tactic construction, foundations, and major formalization results. It is a method-oriented map of how to build and check machine-readable proofs, rather than an experiment with a new verifier.

## technique 1: separate certificate checking from proof search

What it is. Given a term `p` and proposition `P`, checking whether `p : P` is a decidable local-validation task; finding some `p` is a search problem over a proof space. The paper states: “Il problema della dimostrazione automatica è in effetti un problema di ricerca nello spazio delle prove, che presuppone la possibilità di verificare che la prova sia corretta.” (Sect. 1, p.2; English meaning: automatic proving searches the proof space and presupposes proof checking.) It contrasts the questions “p è una dimostrazione di P ?” and “esiste p che dimostra P ?” (Sect. 1, p.2).

When to use it. Make the checker small and trusted, and put expensive heuristics in the proof-producing layer. This allows automation to fail or change without silently changing the meaning of accepted certificates.

Inference: Steps from the paper.

1. Define the formal proposition and a proof-term representation (Sect. 1, p.2).
2. Let the kernel follow each proof step and check local rule applications; the paper says this is “seguire passo passo la dimostrazione e verificare localmente che non siano stati fatti errori nell’applicazione delle regole logiche.” (Sect. 1, p.2).
3. Treat automatic proving as a search procedure that emits a candidate proof (Sect. 1, p.2).
4. Recheck that candidate with the kernel before accepting it (Sect. 1, pp.2–3).

Verus form. Inference: Verus follows this split: generated proof obligations are discharged by solver-backed checking, while user proof functions, lemmas, and solver hints guide search. Inference: a VL system should preserve the distinction by treating generated Verus code as an untrusted proposal and requiring `verus` to recheck every `requires`, `ensures`, and loop `invariant`. Inference: this does not make the specification correct; it checks only that the proposed code satisfies it.

Evidence and limits. The paper gives no benchmark denominator because this is a conceptual distinction. It reports that proof assistants have certified the Feit–Thompson theorem, compilers, operating-system parts, critical control systems, and hardware (Sect. 1, p.3), but those examples measure neither universal automation nor the cost of writing the certificates. The trusted kernel and formal statement remain assumptions.

## technique 2: formalize an informal argument into a machine-readable certificate

What it is. A formal proof is a proof that a machine can read and process. The paper says: “Una dimostrazione formale è semplicemente una dimostrazione che possa essere letta ed elaborata da una macchina.” (Sect. 2, p.4) The conversion requires rewriting mathematical prose in a formal language whose syntax eliminates ambiguity. The author compares the relationship to an algorithm and its program: “La dimostrazione matematica sta alla sua controparte formale esattamente come l’algoritmo sta ad un programma che lo implementa.” (Sect. 2, p.4)

When to use it. Use formalization when the desired assurance is reproducible machine checking, especially for software or mathematics whose informal argument may hide unstated cases. The paper cautions that proof language is optimized for human–machine communication, not ordinary exposition (Sect. 2, pp.4–5).

Inference: Steps from the paper.

1. Choose a proof assistant and its formal language (Sect. 2, p.4).
2. State definitions, premises, and the target proposition syntactically (Sect. 2, pp.4–5).
3. Replace omitted intermediate reasoning with explicit proof terms, tactics, or declarative steps (Sect. 2, pp.5–7).
4. Submit the resulting certificate to the checker and repair every rejected step (Sect. 1, pp.2–3).

Verus form. Inference: formalization in Verus means writing executable Rust plus specifications and proof functions, then making all data representation and boundary assumptions explicit. Inference: a natural-language requirement must be translated to a precise `requires`/`ensures` contract and loop `invariant`; Verus can check consistency with the implementation but cannot decide whether the translation captured the requirement.

Evidence and limits. The paper’s evidence is historical: complete formalizations of the prime number theorem, four-color theorem, Jordan curve theorem, and odd-order theorem are cited (Sect. 3, p.12; Sect. 4.2, pp.19–20). It reports no common effort or defect denominator. Formalization can be much larger than prose and requires learning a new language (Sect. 2, p.4).

## technique 3: procedural backward proof with goals and tactics

What it is. In an LCF-style procedural prover, the current proof state is a set of open proof obligations. A tactic consumes one goal and produces simpler subgoals; the proof ends when the set is empty. The paper states: “La dimostrazione comincia con l’asserto da dimostrare come unica obbligazione e termina quando non resta nessun sottogoal aperto.” (Sect. 2.3, pp.8–9) Proofs are built backward from the conclusion toward hypotheses.

When to use it. Use procedural tactics for compact scripts, interactive exploration, and domain-specific automation. The method hides routine intermediate formulas while preserving a checker-generated justification.

Inference: Steps from the paper’s natural-number example.

1. Start with goal `G: n ≠ 0 → ∃m, S(m)=n` (Sect. 2.2, p.7).
2. Invoke the procedural command `cases n` (Sect. 2.2, p.7).
3. Infer the induction/case-analysis schema and predicate `P = λn. n ≠ 0 → ∃m, S(m)=n` from the current goal (Sect. 2.2, pp.7–8).
4. Instantiate the schema and reduce `G` to `G1` for zero and `G2` for the successor case (Sect. 2.2, p.8).
5. Discharge the resulting subgoals with further tactics; the original goal is closed when no obligation remains (Sect. 2.3, p.8).

Verus form. Inference: a Verus proof function can perform the same decomposition using `assert`, lemma calls, and recursive reasoning over an inductive datatype. Inference: Verus does not use the paper’s `cases n` command; the equivalent case split is expressed in Rust/Verus proof code and checked by the verifier. Inference: loop invariants and recursive decreases provide the induction facts that tactics would otherwise generate.

Evidence and limits. The paper provides the explicit `cases n` reduction but no tactic-success statistics. Procedural scripts are compact yet can be hard for humans to read because intermediate states are implicit (Sect. 2.1, pp.6–7). They depend on the current goal shape and can be brittle under representation changes.

## technique 4: declarative proof states and readable intermediate facts

What it is. A declarative script lists intermediate goals or propositions and lets the system infer the rule connecting them. The paper’s case-analysis version lists `G1`, `G2`, then concludes `G` with “By case analysis from G1 and G2 we obtain” (Sect. 2.2, p.8). Declarative descriptions are more readable but longer (Sect. 2.1, pp.6–7).

When to use it. Use declarative style when maintainability, review, or explanation matters more than script compactness. The paper notes that Mizar was designed to be understandable to humans while remaining machine-decipherable (Sect. 2.3, p.9), and that Isabelle’s Isar is a mature example (Sect. 2.3, p.9).

Inference: Steps from the paper.

1. Write the subgoals produced by a case split as named intermediate facts (Sect. 2.2, p.8).
2. Prove each intermediate fact independently (Sect. 2.2, p.8).
3. State the rule or relation that combines them into the target (Sect. 2.2, p.8).
4. Let the checker infer or validate the omitted low-level rule applications (Sect. 2.1, pp.5–7).

Verus form. Inference: Verus specifications and proof functions can adopt this style by naming intermediate facts with `assert` and lemma calls, while executable functions remain ordinary Rust. Inference: comments and fact names improve review but are not proof evidence unless the verifier checks them.

Evidence and limits. The paper reports that procedural and declarative styles are complementary and that procedural scripts can often be reconstructed into declarative versions (Sect. 2.3, p.9). It gives no maintenance-cost experiment. Declarative scripts can become verbose and tedious (Sect. 2.1, p.7).

## technique 5: proof reconstruction, relevant-fact selection, and reflection

What it is. Procedural automation aims to infer logical rules or delegate synthesis to external provers; the resulting proof must be reconstructed inside the assistant. The paper lists the ingredients as “efficient automatic theorem provers that can cope with hundreds of axioms, suitable translations of richer logics to their formalisms, heuristic and learning methods that select relevant facts from large libraries, and methods that reconstruct the automatically found proofs inside the proof assistants.” (Sect. 2.4, p.10)

A related technique is small-scale reflection. If `eqA : A → A → bool` is proved correct, `eqA(x,y)=true ⇔ x=y`, an equality proof can be reduced to computing `eqA(a,b)` (Sect. 2.4, p.11). Computation replaces many individual logical steps while the correctness theorem for the decision procedure remains explicit.

Steps from the paper.

1. Translate the richer goal into the external prover’s supported formalism (Sect. 2.4, p.10).
2. Select relevant library facts with heuristics or learning methods (Sect. 2.4, p.10).
3. Search automatically for a proof (Sect. 2.4, p.10).
4. Reconstruct the found proof inside the proof assistant and check it with the kernel (Sect. 2.4, p.10).
5. For reflection, prove the decision procedure’s specification, then reduce the target proposition to its computation (Sect. 2.4, p.11).

Verus form. Inference: Verus can use executable decision procedures plus proof lemmas, and solver-backed proof search can be constrained by explicitly revealed facts. Inference: a generated lemma or solver result must still be checked by Verus; an external solver’s opaque answer is not a Verus proof. Inference: reflection-style proofs fit small finite predicates better than arbitrary Rust behavior.

Evidence and limits. The paper identifies learning-assisted theorem proving as active work but gives no accuracy denominator. Reflection requires a proved equivalence between computation and the logical predicate; an incorrect or overly weak equivalence does not establish the target.

## technique 6: foundational kernels, type theory, and program extraction

What it is. Proof assistants place abstractions above a small logical foundation. In the LCF family, theorems are values of an abstract datatype whose constructors are the basic logical rules; goals and tactics support backward reasoning, and the type system prevents construction of invalid theorem values (Sect. 3.2, pp.13–14). The paper summarizes the type-theoretic route with inductive types and Curry–Howard: “verificare che una dimostrazione è corretta equivale a verificare che un programma è ben tipato” (Sect. 3.4.2, p.16).

Inductive types define constructors, eliminators, and reduction rules, giving both a data logic and computation (Sect. 3.4.1, p.16). Under Curry–Howard, theorem/type, proof/program, and correctness checking/type checking correspond (Table 1, p.17). For a constructive proof, program extraction obtains an algorithm guaranteed correct by construction (Sect. 3.4.2, p.17).

Steps from the paper.

1. Choose a logical foundation and define inductive data and propositions (Sect. 3.1, pp.13–14; Sect. 3.4.1, p.16).
2. Build a trusted kernel that checks primitive inference or type rules (Sect. 1, pp.2–3; Sect. 3.2, p.14).
3. Implement higher-level tactics and abstractions that generate proof terms accepted by the kernel (Sect. 3.2, p.14).
4. For constructive developments, extract executable programs from checked proofs (Sect. 3.4.2, p.17).

Verus form. Inference: Verus uses Rust typing and a proof-erasure pipeline rather than the paper’s dependent type theory. Inference: Verus proof functions and specifications can provide checked contracts, but ordinary Verus verification does not automatically extract an executable implementation from a constructive theorem. Inference: the trusted boundary includes the Verus verifier, solver translation, compiler, and assumptions about external code.

Evidence and limits. The survey reports successful foundations and applications, including CompCert, CakeML, seL4, and certified mathematical theorems (Sect. 4.3, pp.20–21). These are historical case reports, not a controlled comparison. The paper itself notes that foundations, supported logics, and proof languages differ substantially; a result in one assistant does not transfer syntactically to another.

## what is proved, trusted, and relevant to VL

The paper’s core claim is architectural: make checking simple and concentrate engineering in a proof-development environment. Its examples show that procedural tactics, declarative proof documents, reflection, relevant-fact selection, and proof reconstruction can scale formal reasoning. What remains trusted includes the logical kernel, the correctness of translations and tactics that emit proof terms, the formal statement, and any external code or axioms. The survey gives no uniform experimental denominator for its historical accomplishments, so percentages, speed claims, and cross-tool comparisons cannot be inferred.

Inference: VL should reuse the certificate/checker split, explicit intermediate facts, domain-specific automation that emits checkable proofs, and decision-procedure lemmas. Inference: generated Verus Rust is most useful when every automation result is replayable by Verus and when requirements are reviewed separately from proof success. Inference: the paper is a high-level design threat rather than a direct product competitor: it does not generate Verus Rust, but it establishes decades-old proof-engineering patterns that VL must avoid rediscovering. Inference: VL should not redo generic surveys of LCF, HOL, Isabelle, Coq, or Curry–Howard; it should measure how these patterns affect Rust/Verus proof completion, repair, and trusted assumptions.

## techniques for the catalog

- certificate checking versus proof search — keep a small checker for candidate certificates while automation searches for proofs
- formalization — rewrite informal requirements and arguments into machine-readable propositions and proof terms
- procedural backward tactics — reduce an open goal to simpler subgoals until no obligations remain
- declarative proof documents — list intermediate facts and let the assistant validate their logical combination
- proof reconstruction and fact selection — select relevant lemmas, search externally, then rebuild and check the proof internally
- small-scale reflection — replace repeated logical reasoning with a proved-correct decision procedure and computation
- foundational kernel and Curry–Howard extraction — use a trusted kernel/type checker and extract executable programs from constructive proofs
Checked 2026-10-14 against the paper by a Codex agent: audit record asperti2017automatic; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
