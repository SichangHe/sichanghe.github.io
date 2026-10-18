# Assisted Specification of Code Using Search
(authored by agents unless marked 🧑)
Tag: `reiss2022assisted`, [paper](https://arxiv.org/abs/2209.09804)

## scope and result

Steven P. Reiss proposes ASCUS, an interactive assistant that mines software repositories to help a developer create a checkable specification for a subsystem. The target is a subsystem of roughly 1,000–10,000 lines, with both a syntactic interface and an initial semantic specification made from test cases. The abstract states: "The resultant specifications include both a syntactic description of what should be written and a semantic specification of what it should do, initially in the form of test cases." [Abstract, PDF p.1]

The system is a specification-elicitation and reuse pipeline, not a verifier. It searches for candidate code, abstracts it, lets the developer edit the abstraction, maps candidate implementations to the edited interface, mines and transforms tests, and returns a checkable specification (§3, PDF pp.4–5). The abstract gives the research goal as "to enable these technologies to be used effectively for creating subsystems without requiring the developer to write detailed specifications from scratch" (Abstract, PDF p.1), where the technologies are machine learning, code search, and program synthesis. The paper is a short description of a proof-of-concept prototype for Java (§1, §8); it reports no formal proof of the generated specifications or implementations.

## technique 1: search and extract a compilable subsystem

Use this when a requested component is described informally and likely exists in repository code. The paper's example is an embedded http server for an IoT application with a small footprint. The search uses three keyword sets and then grows files into a compilable subsystem.

Steps from §4 (PDF pp.5–6).

1. Give an informal description as keyword sets. The first set is optional and identifies projects; the second finds files, once per identified project (or over the whole repository if no first set was given). The paper found that "searching for projects first and then searching within those projects works better when searching a large repository such as GitHub." For the example, the project keywords "could be" `lightweight`, `http` and `server`, and the file keyword could be just the keyword `server` (§4, PDF p.5).
2. Expand each file found into a subsystem: add all files in the current package that are required to compile the original file or any added file, then identify other related packages and add any required file from those (§4, PDF pp.5–6).
3. Stop when too many files have been added (the result is not a subsystem) or when nothing more can be found. Then transform the result so all defined classes are in a single package (§4, PDF p.6).
4. Filter using a third set of keywords, the key terms, which identify potentially relevant fields, methods, and classes; occurrences score each result by relevancy. For the example the key terms "could be url, uri, application, property, port, https, ftp, routing, callback, request and response" (§4, PDF p.6).
5. The filter removes results that are trivial, overly complex, primarily test cases, or below a minimal relevancy. Finally, find references to external packages and identify required external libraries by searching the Maven repository (§4, PDF p.6).

Verus form (inference). This can supply candidate Rust modules and dependency manifests for VL, but search relevance is not a proof. A Verus workflow would need to compile the candidate under the supported Rust subset and then add `requires`/`ensures`, loop `invariant`, and `proof fn` lemmas. Repository provenance and build success remain trusted inputs. This is an inference because ASCUS is Java-specific and does not discuss Verus.

Evidence. For the http-server example, the paper states: "ASCUS found 110 possible subsystems in GitHub and returned 18 abstractions to the developer after filtering" (§5, PDF p.7). These are candidate counts, not verified components.

## technique 2: synthesize a developer-facing abstraction

What it is. ASCUS reduces retrieved code to a Java interface or UML diagram (viewable with UMLet or Umbrello) of the essential parts of a subsystem (§3, §5). It builds abstractions hierarchically: data types are matched for compatibility, fields are in the same field abstraction if their data types are compatible, and methods are in the same method abstraction if their parameters and return types are compatible, disregarding parameter order (§5, PDF p.7).

Procedure.

1. Identify relevant fields and methods from visibility and key-term occurrences in names or bodies; private fields with a public getter and setter count as relevant. The initial class abstraction is the set of visible elements (§5, PDF p.7).
2. Merge similar class abstractions by maximal matching of fields and methods, taking into account their abstractions and names (§5, PDF p.7).
3. Start a subsystem abstraction with all non-trivial, non-private, non-test classes; remove any subclasses (including classes that implement an interface in the set); then add back classes referenced by fields or methods of the abstract class (§5, PDF p.7).
4. Merge subsystem abstractions using maximal matching with a "reasonable threshold" (§5, PDF p.7).
5. Add libraries needed to compile and possible additional keywords from a tf-idf analysis of the matched code, sort by relevance, and present a single Java interface and a UML diagram (§5, PDF p.7).
6. Let the developer edit the abstraction: adapt it to their naming conventions and types, remove unneeded methods and classes, and add others. The edited abstraction is the syntactic basis of the specification and the basis for a second repository search (§6, PDF p.7).

The paper's central human-in-the-loop statement is: "The developer can then edit these abstractions to better meet their needs, adding or removing classes and methods, using local types, changing names, etc." [§3, PDF p.5]

Verus form (inference). Treat the edited abstraction as an API contract draft. Translate method signatures to Rust and use the developer's semantic decisions to write Verus contracts. The abstraction's type and name matching can suggest candidates, but it cannot infer a sound postcondition; the human must state the property and Verus must check it.

Evidence and limits. The abstraction example is a Java interface for an http server with `start`, `stop`, `createContext`, `removeContext`, and an `isRunning` query (Figure 2, PDF p.6). The prototype uses simple heuristics and matching (§8); the paper does not measure abstraction precision or developer agreement.

## technique 3: map retrieved code to the edited abstraction

For each retrieved subsystem, ASCUS first builds an abstraction of it, then matches that to the developer's edited abstraction: "a matching of data types, then computes maximal matchings of fields and methods combined with matching words in methods names, comments, and content" (§6, PDF pp.7–8). It then computes a sequence of code transformations: renaming, type changes, parameter order changes, moving classes into or out of other classes, adding missing elements, optionally removing unused elements, and ensuring the code obeys the developer's naming conventions (§6, PDF p.8).

Apply it as follows.

1. Match retrieved and edited abstraction types.
2. Match fields and methods using maximal matchings combined with words in method names, comments, and content.
3. Compute and apply the transformation sequence to map the retrieved code to the edited specification.
4. Keep the computed mappings; the same mappings are later applied to the tests (§3, PDF p.5; §7, PDF p.8).

For the http-server example "with relatively simple specifications", ASCUS "found and transformed 11 candidate subsystems ranging in size from 800 to 7000 lines" (§6, PDF p.8). Inference: the abstract's intended subsystem range is 1,000–10,000 lines (Abstract, PDF p.1), so the 800-line candidate is below that nominal range; the paper does not comment on this.

Verus form (inference). Apply only semantics-preserving refactorings before verification. Renaming, parameter reordering, and module movement can be reflected in contracts; type changes, added methods, or removed features require new proofs. Re-run Verus after every transformation and retain the source-to-target mapping as review evidence. ASCUS's Java transformations do not establish Rust ownership or unsafe-code correctness.

## technique 4: mine and transform test cases into semantic specifications

ASCUS finds tests for each retrieved subsystem, transforms them with the abstraction mapping, prunes tests that call methods absent from the abstraction, checks compilation, applies naming conventions, combines tests from all matched subsystems, and removes duplicates (§7, PDF p.8).

Steps.

1. Code-search the repository for all files containing JUnit test cases and either an import or package statement from the original retrieved code; convert them into files in the package associated with the abstraction (§7, PDF p.8).
2. Apply the transformations computed by abstraction matching to convert types, names, and parameter order (§7, PDF p.8).
3. Prune: remove unneeded methods, remove test methods that invoke methods not in the abstraction, and ensure the remaining tests compile against the abstraction. Then transform to match the developer's naming conventions (§7, PDF p.8).
4. Combine results from the different retrieved subsystems, discard duplicate tests, and incorporate the tests into the completed abstraction (§7, PDF p.8).
5. The resulting test suite for the abstraction "can be edited by the developer" (§7, PDF p.8) and is combined with the abstracted description to produce a checkable specification (§3, PDF p.5).

The paper characterizes the prototype plainly: "ASCUS currently exists as a proof-of-concept prototype, with no user interface, simple heuristics, simple matching algorithms, and a small set of code transformations." [§8, PDF pp.8–9]

The paper says: "While this step often fails since only about 1/3 of the projects that are retrieved include formal test cases, it can find actual tests." In the http-server example, "about half the subsystems included tests and ASCUS was able to generate 80 test cases (50 from one subsystem)" (§7, PDF p.8). These are the paper's approximate figures; they are not coverage or defect-detection rates.

Verus form (inference). Convert each useful test into a candidate executable example plus a Verus postcondition. Tests can expose expected behavior and regression cases, but passing tests do not prove universal properties. For an agent-written Rust component, use tests to guide contract writing, then prove the contract with Verus and separately test integration and environmental assumptions.

## what is proved, measured, and trusted

The paper reports counts from one example (110 subsystems found, 18 abstractions returned, 11 transformed candidates, 80 test cases) and no formal verification. Its only timing claim is an experience report: "Our experiences to date show that it is possible to interactively create non-trivial specifications from an informal description in under 5 minutes" (§8, PDF p.9). It calls the implementation a proof-of-concept with no user interface, simple heuristics, simple matching, and a small transformation set (§8, PDF pp.8–9). It does not report the number of developers, repeated trials, precision/recall, false matches, test coverage, or successful Verus-style proofs. Future work includes "better ways of creating checkable semantics since test cases are not as common or comprehensive as one would hope" (§8, PDF p.9).

The paper's ultimate goal is "to generate working versions or at least working skeletons of the described subsystems", and it says that the adaptation ASCUS does "is insufficient". The remaining work it lists is simplifying code, merging multiple retrieved subsystems, editing code to pass tests (possibly with automatic program repair), generating missing methods (program synthesis, code search, or machine learning), adapting library versions, and ensuring the code is something the developer would want to use (§8, PDF p.9).

Inference: The trusted base is large: the informal description and edited abstraction, repository code and build metadata, matching heuristics, transformations, mined tests, test framework, and developer judgment. A test-based specification only checks the selected examples; it does not establish a universal contract, security property, or absence of undefined behavior.

Inference: The threat to a product that asks agents to write verified Rust is high at the specification boundary and low at the proof boundary. ASCUS-like search can reduce the cost of finding API shapes and behavioral examples, but it can also import assumptions from unrelated repositories. VL should not redo repository search, abstraction matching, or test mining as a new formal-verification contribution. A useful integration would make mined examples explicit candidate contracts, require human approval of security-relevant meaning, and run Verus proofs after every adaptation. The paper does not establish that any generated specification is suitable for Verus or that any adapted implementation is secure.

## techniques for the catalog

- repository subsystem extraction: search projects/files, expand compile dependencies, filter by relevance, and collect external libraries
- hierarchical abstraction: merge type/field/method matches into an editable Java or UML subsystem interface
- abstraction-to-code mapping: compute maximal correspondences and apply recorded renaming, type, parameter, and structure transformations
- test mining: find JUnit tests, transform and prune them against the edited abstraction, then deduplicate the suite
- interactive checkable specification: combine the edited interface with mined tests, while treating tests as examples rather than universal proofs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Then it prunes the result by removing any unneeded methods, removing any test methods that invoke methods not in the abstraction, and ensuring the remaining tests compile against the abstraction."): read the whole paper text (§1–§8 and references) and checked every quotation, number, section and page reference and technique step in the four techniques; changed the "110 possible subsystems" wording (found before filtering, 18 returned after), moved the human-in-the-loop quote from §6 p.7 to §3 p.5, corrected the JUnit search criterion to import or package statement, corrected the test-count page to p.8, the keyword examples and the stop/merge steps, recast the 5-minute claim as the author's experience report, and marked the 800-line observation and the trusted-base paragraph as inference; did not check the cited related work in the references or the PDF figures beyond Figures 1 and 2 as rendered in the text, and Verus-form paragraphs are inference with no support in the paper.
