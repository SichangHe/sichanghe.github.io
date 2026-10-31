# An Integrated Development Environment for the Prototype Verification System
(authored by agents unless marked 🧑)
Tag: `masci2019integrated`, [paper](https://doi.org/10.4204/EPTCS.310.5)

## scope and result

Inference: This paper describes VSCode-PVS, an integrated development environment that puts PVS editing, proof management, and evaluation into Visual Studio Code. Its target is adoption: the authors identify a conceptual gap (how Emacs buffers work) and a knowledge gap (many commands and a very large library) as barriers. The paper's abstract says, “This new environment integrates the editing and proof management functionalities of PVS in Visual Studio Code, a popular code editor widely used by software developers.” (abstract, p. 35)

Inference: The contribution is an engineering workflow around an existing prover, not a new proof calculus. The paper reports an implementation effort of "7K LoC (3K LoC for the editor front-end, and 4K LoC for the language server)" (section 3.4, p. 41); the paper says VSCode-PVS is implemented in TypeScript and that the server also needed a Lisp interface to PVS, so the 7K figure is not stated to be TypeScript only. It compares nine environments using seven feature metrics: autocompletion, hover information, jump-to-definition, refactoring, live diagnostics, animation, and proof visualisation (section 5.1, p. 43).

## technique 1: language-server separation

Inference: Use a two-process architecture so an editor remains responsive while verification work runs in a back end. The paper's exact description is: “The editor front-end is responsible for rendering visual feedback to the user, and transforms user interactions with the editor into corresponding LSP events to be dispatched to the language server.” (section 3.1, p. 38) The companion sentence states, “The language server defines the functions necessary to support the syntax and semantics of the language (e.g., in the case of PVS, parsing, typechecking, etc.) and continuously listens to LSP events.” (section 3.1, p. 38)

Steps from the paper:
1. Build the front end on an LSP-capable editor and convert cursor, document, and command actions into LSP events (section 3.1, p. 38)
2. Implement language-server providers for hover, definition lookup, commands, and diagnostics; providers translate PVS APIs to LSP messages (section 3.3, pp. 39-40)
3. route events through an LSP connection manager to the appropriate provider (section 3.3, p. 40)
4. run PVS process workers in self-contained environments; use a worker pool for background parsing and type checking and to run proofs concurrently (section 3.3, p. 40)

Inference: The paper says LSP “promotes reuse of modules and facilitates sustainability of the overall development effort” because any LSP editor can connect to the same server (section 3.1, p. 38). The paper does not report latency, throughput, or a user study; therefore no quantitative usability improvement is established.

Verus form (Inference): A Verus editor could use the same split: an editor client sends file, cursor, and verification requests to a Rust language server; workers invoke Verus and return diagnostics. Verus specifications and proofs remain in the source file, while the server orchestrates parsing and verification. LSP and process isolation are engineering choices outside Verus's proof logic. Verus can prove worker-side Rust code only when contracts model the server behavior; the paper provides no such proof.

## technique 2: live diagnostics and completion

Inference: Make syntax and type-checking feedback continuous and local. Section 3.3 (p. 40) says the Diagnostics Provider reports syntax and type-checking errors, while the section 5.2 assessment (p. 45) mentions only syntax errors, "automatically provided after a period of inactivity in the editor". The feature list states: “Parsing is automatically performed in the background, and errors are reported in-line in the editor.” (section 3, p. 37) It also states that tooltips show error details when the cursor is placed over underlined text (section 3, p. 37). The language server's Diagnostics Provider “continuously sends diagnostics information to the editor front-end to report syntax / type-checking errors.” (section 3.3, p. 40)

Steps from the paper:
1. (Inference from the paper's general description that the front end turns user interactions into LSP events; the paper does not name a document-change event) dispatch edits from the front end to the language server through LSP (section 3.1, p. 38)
2. have a background worker parse or type-check the current document (section 3.3, p. 40)
3. return diagnostics with source locations; render red wavy underlines and explanatory tooltips (section 3, p. 37)
4. expose completion providers that suggest PVS keywords, library functions, and record accessors (section 5.2, p. 45)

Inference: VSCode-PVS also supplies hover previews and Ctrl-click jump-to declaration. For an unfinished or un-type-checked theory, it presents candidate declarations when names are overloaded; this is explicitly described in the Task 1 workflow (section 4.1, pp. 41–42). The paper does not measure completion precision or diagnostic latency.

Verus form (Inference): A Verus language server can map verifier errors to spans, rerun checks after edits, and provide completion from Rust and Verus libraries. It should distinguish executable Rust, `spec fn`, `proof fn`, contracts, and invariants in its syntax tree. The server can suggest verified APIs, but suggestions do not prove that a generated contract is adequate.

## technique 3: proof and theory navigation

Inference: Present formal artifacts as navigable trees and attach actions to declarations. The paper lists “An interactive tree-based view shows the proof associated with a theorem” and says point-and-click actions execute proof commands step by step (section 3, p. 37). Its theory explorer shows theories and each theorem's status, with actions to jump to definitions and type-check theories (section 3, p. 37).

Steps from the paper's theorem task:
1. click the inline `prove` action above a theorem; VSCode-PVS type-checks the file and starts a prover session (section 4.2, p. 42)
2. enter proof commands in the integrated PVS command-line panel (section 4.2, p. 42)
3. inspect the proof tree in the Proof Explorer, collapsing or expanding nodes for large proofs (section 4.2, p. 42)
4. use hover or Ctrl-click on symbols to inspect declarations while developing a proof (section 4.1, pp. 41–42)

Inference: The authors compare this with Emacs, where users run `M-x tc`, then `M-x prove`, and proof trees cannot be collapsed or edited (section 4.2, p. 42). Proof-tree editing in VSCode-PVS was still under development, so the feature is partly an interaction aid rather than a complete proof authoring method.

Verus form (Inference): A Verus IDE can show each `proof fn`, `lemma`, `requires`, `ensures`, and loop invariant as navigable nodes, then invoke Verus on a selected item. It can display solver diagnostics and proof dependencies, but only Verus's checker establishes correctness. The paper's PVS command scripts and sequent trees do not carry over directly because Verus uses Rust syntax and SMT-backed proof obligations.

## evidence, trust, and limits

Inference: The evidence is feature comparison and an implementation description, not a controlled experiment. Table 1 compares VSCode-PVS 1.0.12 with PVS-Emacs 6.0, CoqIDE 8.9.0, SublimeHOL 2018, Proof General 4.5, Isabelle/jEdit 2019, Lean 0.14.1, IntelliJ-Arend 1.0.0, and KeYmaeraX 4.6.3 (section 5.3, pp. 46–47). The denominator is nine environments, and the features are categorical symbols in the table; no percentages or task-time measurements are given.

Inference: The trusted base remains PVS, its prover strategies, the TypeScript/Node.js server, Visual Studio Code, LSP transport, and the user's specification. The paper explicitly says, “The verification technology used by VSCode-PVS is not automatic, as in the case of Dafny and Imandra.” (section 6, p. 47) The quoted sentence is about proof automation and says nothing about the trusted base; the trusted-base list above and the conclusion that the IDE does not reduce assumptions are my own inference, since the paper has no trust analysis.

## techniques for the catalog

- language-server separation: route editor events through LSP to isolated verifier workers and return diagnostics asynchronously
- live verification feedback: parse or type-check in the background and render source-located errors, completion, and hover information
- proof navigation: expose theories, declarations, theorem actions, and proof trees as clickable IDE views
