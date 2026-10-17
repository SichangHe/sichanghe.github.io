# Automatic Verification and Interactive Theorem Proving
(authored by agents unless marked 🧑)
Tag: `asperti2017automatic`, [paper](http://arxiv.org/abs/1701.03602v1)

This Italian survey separates checking a supplied proof from searching for a proof. Its opening definition is: “Automatic verification deals with the validation by means of computers of correctness certificates.” (Abstract, p.1) A proof assistant provides an interactive environment for creating formal certificates whose correctness can be assessed automatically (Abstract, p.1). The checking tool is “una piccola componente di solito chiamata ‘kernel’”, and the complexity comes instead from the interactive development environment (Sect. 1, pp.2–3). The paper surveys procedural versus declarative proof styles (Sect. 2), foundational frameworks (Sect. 3), and major formalization results (Sect. 4). The survey is written in Italian; the abstract is in English. It is a method-oriented map of how to build and check machine-readable proofs, rather than an experiment with a new verifier.

## technique 1: separate certificate checking from proof search

What it is. Given a term `p` and proposition `P`, checking whether `p : P` is a decidable local-validation task; finding some `p` is a search problem over a proof space. The paper states: “Il problema della dimostrazione automatica è in effetti un problema di ricerca nello spazio delle prove, che presuppone la possibilità di verificare che la prova sia corretta.” (Sect. 1, p.2; English meaning: automatic proving searches the proof space and presupposes proof checking.) It contrasts the questions “p è una dimostrazione di P ?” and “esiste p che dimostra P ?” (Sect. 1, p.2).

When to use it. Inference: make the checker small and trusted, and put expensive heuristics in the proof-producing layer, so that automation can fail or change without silently changing the meaning of accepted certificates. The paper itself says only that checking is a small component and that search presupposes checking (Sect. 1, pp.2–3).

Steps. Inference: the paper gives no numbered procedure; these steps are my arrangement of its statements, with the sections they draw on.

1. Define the formal proposition and a proof-term representation (Sect. 1, p.2).
2. Let the kernel follow each proof step and check local rule applications; the paper says this is “seguire passo passo la dimostrazione e verificare localmente che non siano stati fatti errori nell’applicazione delle regole logiche.” (Sect. 1, p.2).
3. Treat automatic proving as a search procedure that emits a candidate proof (Sect. 1, p.2).
4. Inference: recheck that candidate with the kernel before accepting it; the paper states only that proof search “presuppone la possibilità di verificare che la prova sia corretta” (Sect. 1, p.2).

Verus form.

Evidence and limits. The paper gives no benchmark denominator because this is a conceptual distinction. It reports that proof assistants have certified the Feit–Thompson theorem, compilers, operating-system parts, critical control systems, and hardware (Sect. 1, p.3), but those examples measure neither universal automation nor the cost of writing the certificates. Inference: the trusted kernel and formal statement remain assumptions; the paper does not discuss them here.

## technique 2: formalize an informal argument into a machine-readable certificate

What it is. A formal proof is a proof that a machine can read and process. The paper says: “Una dimostrazione formale è semplicemente una dimostrazione che possa essere letta ed elaborata da una macchina.” (Sect. 2, p.4) The conversion requires rewriting mathematical prose in a formal language which, unlike mathematical prose, has the syntactic rigidity of formal and programming languages (Sect. 2, p.4). The author compares the relationship to an algorithm and its program: “La dimostrazione matematica sta alla sua controparte formale esattamente come l’algoritmo sta ad un programma che lo implementa.” (Sect. 2, p.4)

When to use it. Use formalization when the desired assurance is reproducible machine checking, especially for software or mathematics whose informal argument may hide unstated cases. The paper says the language of formal proofs “non è inteso per la comunicazione inter-umana, ma per la comunicazione tra l’uomo e la macchina” (Sect. 2, p.4).

Steps. Inference: my arrangement of the paper’s statements, with the sections they draw on.

1. Choose a proof assistant and its formal language (Sect. 2, p.4).
2. State definitions, premises, and the target proposition syntactically (Sect. 2, pp.4–5).
3. Replace omitted intermediate reasoning with explicit proof terms, tactics, or declarative steps (Sect. 2, pp.5–7).
4. Inference: submit the resulting certificate to the checker and repair every rejected step (the checker’s role is described in Sect. 1, pp.2–3).

Verus form. Inference: formalization in Verus means writing executable Rust plus specifications and proof functions, then making all data representation and boundary assumptions explicit. Inference: a natural-language requirement must be translated to a precise `requires`/`ensures` contract and loop `invariant`; Verus can check consistency with the implementation but cannot decide whether the translation captured the requirement.

Evidence and limits. The paper’s evidence is historical: complete formalizations of the prime number theorem, four-color theorem, Jordan curve theorem, and odd-order theorem are cited (Sect. 3, p.12; Sect. 4.2, pp.19–20). It reports no common effort or defect denominator. Formalization requires learning a formal language, with effort “comparabile, indicativamente, allo sforzo di apprendere un nuovo linguaggio di programmazione” (Sect. 2, p.4). The paper says the presumed length of formal proofs is no longer an obstacle (Sect. 3, p.12), and that the formal odd-order proof has a size comparable to the paper one (Sect. 4.2, p.20).

## technique 3: procedural backward proof with goals and tactics

What it is. In an LCF-style procedural prover, the current proof state is a set of open proof obligations. A tactic consumes one goal and produces simpler subgoals; the proof ends when the set is empty. The paper states: “La dimostrazione comincia con l’asserto da dimostrare come unica obbligazione e termina quando non resta nessun sottogoal aperto.” (Sect. 2.3, p.8) Procedural proofs are typically built backward, from the conclusion toward the hypotheses (Sect. 2.3, p.9).

When to use it. The paper calls the procedural description “estremamente compatta ma piuttosto illeggibile” (Sect. 2.1, p.7) and says tactics can be user-defined, often for a particular domain (Sect. 3.2, p.14). Inference: use procedural tactics for compact scripts, interactive exploration, and domain-specific automation.

Steps. Inference: my arrangement of the paper’s natural-number example (Sect. 2.2), with pages.

1. Start with goal `G: n ≠ 0 → ∃m, S(m)=n` (Sect. 2.2, p.7).
2. Invoke the procedural command `cases n` (Sect. 2.2, p.7).
3. Infer the induction/case-analysis schema and predicate `P = λn. n ≠ 0 → ∃m, S(m)=n` from the current goal (Sect. 2.2, pp.7–8).
4. Instantiate the schema and reduce `G` to `G1` for zero and `G2` for the successor case (Sect. 2.2, p.8).
5. Discharge the resulting subgoals with further tactics; the original goal is closed when no obligation remains (Sect. 2.3, p.8).

Verus form. Inference: a Verus proof function can perform the same decomposition using `assert`, lemma calls, and recursive reasoning over an inductive datatype. Inference: Verus does not use the paper’s `cases n` command; the equivalent case split is expressed in Rust/Verus proof code and checked by the verifier. Inference: loop invariants and recursive decreases provide the induction facts that tactics would otherwise generate.

Evidence and limits. The paper provides the explicit `cases n` reduction but no tactic-success statistics. Procedural scripts are compact yet hard for humans to read because intermediate states are implicit (Sect. 2.1, pp.6–7). Inference: scripts depend on the current goal shape and may be brittle under representation changes; the paper does not say this.

## technique 4: declarative proof states and readable intermediate facts

What it is. A declarative script lists intermediate goals or propositions and lets the system infer the rule connecting them. The paper’s case-analysis version lists `G1`, `G2`, then concludes `G` with “By case analysis from G1 and G2 we obtain” (Sect. 2.2, p.8). Declarative descriptions are “tipicamente più leggibili” but “molto più prolisse” (Sect. 2.1, p.7).

When to use it. The paper notes that Mizar’s language was designed to be understandable to humans while remaining machine-decipherable (Sect. 2.3, p.9), and that Isabelle’s Isar is “probabilmente, al momento attuale, l’esempio più compiuto di linguaggio dichiarativo” (Sect. 2.3, p.9). Inference: use declarative style when maintainability, review, or explanation matters more than script compactness; the paper itself says the procedural goal is rather better maintenance and updating of proofs (Sect. 2.3, p.9).

Steps. Inference: my arrangement of the paper’s example, with the sections it draws on.

1. Write the subgoals produced by a case split as named intermediate facts (Sect. 2.2, p.8).
2. Prove each intermediate fact independently (Sect. 2.2, p.8).
3. State the rule or relation that combines them into the target (Sect. 2.2, p.8).
4. Let the checker infer or validate the omitted low-level rule applications (Sect. 2.1, pp.5–7).

Verus form. Inference: Verus specifications and proof functions can adopt this style by naming intermediate facts with `assert` and lemma calls, while executable functions remain ordinary Rust. Inference: comments and fact names improve review but are not proof evidence unless the verifier checks them.

Evidence and limits. The paper reports that procedural and declarative styles are complementary and that procedural scripts can often be reconstructed into declarative versions (Sect. 2.3, p.9). It gives no maintenance-cost experiment. Declarative scripts are often “tediose per l’utente” (Sect. 2.1, p.7).

## technique 5: proof reconstruction, relevant-fact selection, and reflection

What it is. Sect. 2.4 describes an approach in which the system infers the logical rule and delegates proof-step synthesis to external provers; the resulting proof must be reconstructed inside the assistant. Inference: Sect. 2.4 labels this “procedural” and the tactic-based approach “dichiarativo”, which looks like a swap of the two labels used in Sect. 2.1–2.3; this study follows the content, not the labels. The paper lists the ingredients as “efficient automatic theorem provers that can cope with hundreds of axioms, suitable translations of richer logics to their formalisms, heuristic and learning methods that select relevant facts from large libraries, and methods that reconstruct the automatically found proofs inside the proof assistants.” (Sect. 2.4, p.10)

A related technique is small-scale reflection. If `eqA : A → A → bool` is proved correct, `eqA(x,y)=true ⇔ x=y`, an equality proof can be reduced to computing `eqA(a,b)` (Sect. 2.4, p.11). Computation replaces many individual logical steps while the correctness theorem for the decision procedure remains explicit.

Steps. Inference: my arrangement of the paper’s list (Sect. 2.4), with pages.

1. Translate the richer goal into the external prover’s supported formalism (Sect. 2.4, p.10).
2. Select relevant library facts with heuristics or learning methods (Sect. 2.4, p.10).
3. Search automatically for a proof (Sect. 2.4, p.10).
4. Reconstruct the found proof inside the proof assistant (Sect. 2.4, p.10); Inference: the assistant’s kernel then checks it.
5. For reflection, prove the decision procedure’s specification, then reduce the target proposition to its computation (Sect. 2.4, p.11).

Verus form. Inference: Verus can use executable decision procedures plus proof lemmas, and solver-backed proof search can be constrained by explicitly revealed facts. Inference: a generated lemma or solver result must still be checked by Verus; an external solver’s opaque answer is not a Verus proof. Inference: reflection-style proofs fit small finite predicates better than arbitrary Rust behavior.

Evidence and limits. The paper calls this area “uno dei più vivaci e promettenti”, citing learning methods to improve provers (Sect. 2.4, p.10), but gives no accuracy denominator. Reflection requires a proved equivalence between computation and the logical predicate (Sect. 2.4, p.11). Inference: an incorrect or overly weak equivalence does not establish the target.

## technique 6: foundational kernels, type theory, and program extraction

What it is. Proof assistants place abstractions above a small logical foundation. In the LCF family, theorems are values of an abstract datatype whose methods are the basic logical rules; goals and tactics support backward reasoning, and soundness is guaranteed as long as only these functions build theorems, which the type system of the metalanguage can verify (Sect. 3.2, pp.13–14). The paper summarizes the type-theoretic route with inductive types and Curry–Howard: “verificare che una dimostrazione è corretta equivale a verificare che un programma è ben tipato” (Sect. 3.4.2, p.16).

Inductive types define constructors, eliminators, and reduction rules, giving both a data logic and computation (Sect. 3.4.1, p.16). Under Curry–Howard, theorem/type, proof/program, and correctness checking/type checking correspond (Table 1, p.17). For a constructive proof, program extraction obtains an algorithm guaranteed correct by construction (Sect. 3.4.2, p.17).

Steps. Inference: my arrangement of the paper’s statements, with the sections they draw on.

1. Choose a logical foundation and define inductive data and propositions (Sect. 3.1, p.13; Sect. 3.4.1, p.16).
2. Build a trusted kernel that checks primitive inference or type rules (Sect. 1, pp.2–3; Sect. 3.2, p.14).
3. Implement higher-level tactics and abstractions on top of the kernel; in LCF a tactic synthesizes a validation function, and the proof is a program, not a syntactic object (Sect. 3.2, p.14). The paper says the foundational layer matters less to the user because intermediate levels can be added above it (Sect. 3, p.11).
4. For constructive developments, extract executable programs from checked proofs (Sect. 3.4.2, p.17).

Verus form. Inference: Verus uses Rust typing and a proof-erasure pipeline rather than the paper’s dependent type theory. Inference: Verus proof functions and specifications can provide checked contracts, but ordinary Verus verification does not automatically extract an executable implementation from a constructive theorem. Inference: the trusted boundary includes the Verus verifier, solver translation, compiler, and assumptions about external code.

Evidence and limits. The survey reports a verified optimizing compiler (CompCert, Sect. 4.3, p.21), CakeML (p.21), operating-system kernels (cited as ref. [50], titled “sel4: formal verification of an operating-system kernel”; the text does not name seL4, Sect. 4.3, p.21), and formalized mathematical theorems (Sect. 4.2, pp.19–20). These are historical case reports, not a controlled comparison. The paper calls the many type-theoretic and other logics “tanto simili uno all’altro e tuttavia praticamente incompatibili tra loro” (Sect. 3.1, p.13). Inference: a result in one assistant therefore does not transfer directly to another.

## techniques for the catalog

- certificate checking versus proof search — keep a small checker for candidate certificates while automation searches for proofs
- formalization — rewrite informal requirements and arguments into machine-readable propositions and proof terms
- procedural backward tactics — reduce an open goal to simpler subgoals until no obligations remain
- declarative proof documents — list intermediate facts and let the assistant validate their logical combination
- proof reconstruction and fact selection — select relevant lemmas, search externally, then rebuild and check the proof internally
- small-scale reflection — replace repeated logical reasoning with a proved-correct decision procedure and computation
- foundational kernel and Curry–Howard extraction — use a trusted kernel/type checker and extract executable programs from constructive proofs
