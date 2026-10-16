# Assisted Specification of Code Using Search
(authored by agents unless marked 🧑)
Tag: `reiss2022assisted`, [paper](https://arxiv.org/abs/2209.09804)

## scope and result

Steven P. Reiss proposes ASCUS, an interactive assistant that mines software repositories to help a developer create a checkable specification for a subsystem. The target is a subsystem of roughly 1,000–10,000 lines, with both a syntactic interface and an initial semantic specification made from test cases. The abstract states: "The resultant specifications include both a syntactic description of what should be written and a semantic specification of what it should do, initially in the form of test cases." [Abstract, PDF p.1]

The system is a specification-elicitation and reuse pipeline, not a verifier. It searches for candidate code, abstracts it, lets the developer edit the abstraction, maps candidate implementations to the edited interface, mines and transforms tests, and returns a checkable specification. The author says the approach is intended to let code search, machine learning, and synthesis work without requiring developers to write detailed specifications from scratch (§Abstract, PDF p.1). The paper's evidence is a Java proof-of-concept prototype with heuristic matching; it does not report a formal proof of the generated specifications or implementations.

## technique 1: search and extract a compilable subsystem

Use this when a requested component is described informally and likely exists in repository code. The paper's example is a lightweight HTTP server for an IoT application. The search uses three keyword sets and then grows files into a compilable subsystem.

Steps from §4 (PDF pp.5–6).

1. Give an informal description and optional project keywords. ASCUS first searches projects, then searches files inside selected projects; for the example, project terms are `lightweight`, `http`, and `server`, and a file term is `server` (§4, PDF p.5).
2. Expand each matching file with same-package files needed to compile the original and recursively add related-package files needed by those files (§4, PDF p.5).
3. Stop expansion when the result is too large to count as a subsystem or no additional required files are found (§4, PDF p.5).
4. Move all extracted classes into one package and score relevance using key terms such as `url`, `request`, `response`, and `routing` (§4, PDF p.6).
5. Remove trivial, overly complex, test-dominated, or low-relevance results (§4, PDF p.6), then identify required external libraries through Maven search (§4, PDF p.6).

Verus form (inference). This can supply candidate Rust modules and dependency manifests for VL, but search relevance is not a proof. A Verus workflow would need to compile the candidate under the supported Rust subset and then add `requires`/`ensures`, loop `invariant`, and `proof fn` lemmas. Repository provenance and build success remain trusted inputs. This is an inference because ASCUS is Java-specific and does not discuss Verus.

Evidence. For the HTTP-server example, the paper reports no denominator for the initial raw search, but after abstraction filtering it found 110 possible subsystems and returned 18 abstractions (§5, PDF p.7). These are candidate counts, not verified components.

## technique 2: synthesize a developer-facing abstraction

What it is. ASCUS reduces retrieved code to a Java interface or UML class diagram containing essential classes, fields, methods, libraries, and suggested search terms. It constructs abstractions hierarchically by matching types, then compatible fields, then methods with compatible parameter and return types while disregarding parameter order (§5, PDF p.7).

Procedure.

1. Identify relevant fields and methods from visibility and key-term occurrences; private fields with public getters/setters count as relevant (§5, PDF p.7).
2. Merge similar class abstractions by maximal matching of fields and methods, considering names and their existing abstractions (§5, PDF p.7).
3. Start a subsystem abstraction with nontrivial, nonprivate, nontest classes; remove subclasses and then add back classes referenced by fields or methods (§5, PDF p.7).
4. Merge subsystem abstractions with maximal matching and a threshold (§5, PDF p.7).
5. Add required libraries and tf-idf-derived keywords, sort by relevance, and present both a Java interface and UML diagram (§5, PDF p.7).
6. Let the developer edit the abstraction: add/remove classes or methods, replace types, and rename elements. The edited abstraction is the syntactic specification and the basis for a second search (§6, PDF p.7).

The paper's central human-in-the-loop statement is: "The developer can then edit these abstractions to better meet their needs, adding or removing classes and methods, using local types, changing names, etc." [§6, PDF p.7]

Verus form (inference). Treat the edited abstraction as an API contract draft. Translate method signatures to Rust and use the developer's semantic decisions to write Verus contracts. The abstraction's type and name matching can suggest candidates, but it cannot infer a sound postcondition; the human must state the property and Verus must check it.

Evidence and limits. The abstraction example is an interface for an HTTP server with `start`, `stop`, context management, and an `isRunning` query (Figure 2, PDF p.6). The prototype uses simple heuristics and matching; the paper does not measure abstraction precision or developer agreement.

## technique 3: map retrieved code to the edited abstraction

For each candidate subsystem, ASCUS builds a fresh abstraction, matches data types, and computes maximal field/method matchings using names, comments, and method content (§6, PDF p.8). It then generates a sequence of transformations: renaming, changing types and parameter order, moving classes across nesting boundaries, adding missing elements, optionally removing unused elements, and enforcing naming conventions (§6, PDF p.8).

Apply it as follows.

1. Match retrieved and edited abstraction types.
2. Match fields and methods using type compatibility, names, comments, and content.
3. Generate and apply the transformation sequence to make the retrieved code conform to the edited API.
4. Preserve a mapping from each transformed element to its source so tests can be transformed by the same mapping (§6–§7, PDF pp.8–9).

The HTTP-server experiment produced 11 transformed candidate subsystems, ranging from 800 to 7,000 lines (§6, PDF p.8). The abstract's intended subsystem range is 1,000–10,000 lines (§Abstract, PDF p.1); the reported 800-line candidate is therefore outside that nominal range, a measurement detail the paper does not explain.

Verus form (inference). Apply only semantics-preserving refactorings before verification. Renaming, parameter reordering, and module movement can be reflected in contracts; type changes, added methods, or removed features require new proofs. Re-run Verus after every transformation and retain the source-to-target mapping as review evidence. ASCUS's Java transformations do not establish Rust ownership or unsafe-code correctness.

## technique 4: mine and transform test cases into semantic specifications

ASCUS searches each retrieved project's repository for JUnit files that import or reference the retrieved package. It transforms each test with the abstraction mapping, prunes calls to methods absent from the edited abstraction, checks compilation, applies naming conventions, combines tests from candidates, and removes duplicates (§7, PDF p.8).

Steps.

1. Search for all JUnit files with an import or package statement from the retrieved code (§7, PDF p.8).
2. Apply the same type, name, and parameter mappings used for the implementation (§7, PDF p.8).
3. Remove methods and test methods that call APIs outside the abstraction; retain only tests that compile against it (§7, PDF p.8).
4. Combine tests from all retrieved subsystems, discard duplicates, and attach the result to the edited abstraction (§7, PDF p.8).
5. Present the tests as an initial semantic, checkable specification that the developer can edit (§3, PDF p.4; §7, PDF p.8).

The paper characterizes the prototype plainly: "ASCUS currently exists as a proof-of-concept prototype, with no user interface, simple heuristics, simple matching algorithms, and a small set of code transformations." [§8, PDF p.9]

The paper reports that this step often fails because only about one third of retrieved projects include formal test cases. In the HTTP-server example, about half of the candidate subsystems included tests, and ASCUS generated 80 test cases, 50 from one subsystem (§7, PDF p.9). These denominators are the paper's approximate fractions; they are not coverage or defect-detection rates.

Verus form (inference). Convert each useful test into a candidate executable example plus a Verus postcondition. Tests can expose expected behavior and regression cases, but passing tests do not prove universal properties. For an agent-written Rust component, use tests to guide contract writing, then prove the contract with Verus and separately test integration and environmental assumptions.

## what is proved, measured, and trusted

The paper measures prototype counts and interaction time, not formal verification. It reports that ASCUS can create nontrivial specifications from an informal description in under five minutes, while calling the implementation a proof-of-concept with no user interface, simple heuristics, simple matching, and a small transformation set (§8, PDF p.9). It does not report the number of developers, repeated trials, precision/recall, false matches, test coverage, or successful Verus-style proofs. Future work explicitly seeks better checkable semantics because tests are not as common or comprehensive as desired (§8, PDF p.9).

The trusted base is large: the informal description and edited abstraction, repository code and build metadata, matching heuristics, transformations, mined tests, test framework, and developer judgment. A test-based specification only checks the selected examples; it does not establish a universal contract, security property, or absence of undefined behavior. The paper's eventual goal is working generated code, but its final section says adaptation alone is insufficient and lists simplification, merging, program repair, synthesis, library adaptation, and usability as remaining work (§8, PDF p.9).

Inference: The threat to a product that asks agents to write verified Rust is high at the specification boundary and low at the proof boundary. ASCUS-like search can reduce the cost of finding API shapes and behavioral examples, but it can also import assumptions from unrelated repositories. VL should not redo repository search, abstraction matching, or test mining as a new formal-verification contribution. A useful integration would make mined examples explicit candidate contracts, require human approval of security-relevant meaning, and run Verus proofs after every adaptation. The paper does not establish that any generated specification is suitable for Verus or that any adapted implementation is secure.

## techniques for the catalog

- repository subsystem extraction: search projects/files, expand compile dependencies, filter by relevance, and collect external libraries
- hierarchical abstraction: merge type/field/method matches into an editable Java or UML subsystem interface
- abstraction-to-code mapping: compute maximal correspondences and apply recorded renaming, type, parameter, and structure transformations
- test mining: find JUnit tests, transform and prune them against the edited abstraction, then deduplicate the suite
- interactive checkable specification: combine the edited interface with mined tests, while treating tests as examples rather than universal proofs
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
