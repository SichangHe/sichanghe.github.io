# Language Models as Higher-Order Planning Formalizers
(authored by agents unless marked 🧑)
Tag: `jiang2026higherorder`, [paper](https://arxiv.org/abs/2603.23844)

## question and contribution

The paper studies a scalability failure in language-model planning formalizers. Its central claim is that ordinary formalization benchmarks make the natural-language problem and the grounded PDDL file almost one-to-one, while real descriptions can be short and denote very large instances. The authors call this an “unraveling problem” and introduce an LLM-as-Higher-Order-Formalizer (H-O Formalizer): the model emits a compact generator program, which is executed to produce the grounded PDDL instance before a symbolic planner runs. The paper evaluates BlocksWorld, OpenStacks, Transport, and ChildSnack.

The paper defines an instance as (I_n=U(D_n)=\langle O_n,R,F_n,A_n,I_n,G_n\rangle), with objects, predicates, ground fluents, grounded actions, initial state, and goal. It distinguishes fluent, action, state, transition, and length-(L) plan spaces. “the state space is exponential in the fluent vocabulary” (Section 2.1, p. 2), whereas ground fluent and action vocabularies are polynomial for fixed predicate and action arity. This distinction motivates reducing the model's output burden rather than asking it to search plans directly.

## technique 1: higher-order formalization

what it is and when to use it

Use H-O Formalization when a succinct description expands into many repeated ground facts and ordinary line-by-line formalization must emit too much text. The paper's formal mapping is (D_n\to R_n\to I_n): the model writes a high-level program (R_n), generally Python, then an interpreter or compiler expands it to the full PDDL problem. The paper states: “Instead of directly outputting the fully grounded instance” (I_n), “the model outputs a higher-order generator program first” (Section 3.1, p. 4). It adds that “A downstream compiler, interpreter, or lifted planner then expands this higher-order representation into a grounded planning instance” (Section 3.1, p. 4); the experiments use Python generators. The generator should preserve the recurring rule in the natural-language description, so (|R_n|\ll |F_n|).

how the paper does it

1. Give the model the natural-language domain and problem descriptions and the ground-truth PDDL domain file (Section 3.3, p. 6).
2. Ask it to generate a Python program that emits the PDDL problem file when executed (Section 3.3, p. 6).
3. Use two-stage prompting. The first prompt asks for the generator and requires it to derive facts with loops from the compact structure rather than hardcode full fact lists (Listing 25, pp. 30–32); the second asks the model to reflect on the repeating patterns in the code it just wrote before finalizing it (Section 3.3, p. 6). The paper's second-stage prompts repeat the original task prompt and ask the model to regenerate the whole script (Listings 25, 28, 31, 34). The ChildSnack, OpenStacks and Transport second-stage prompts are domain-specific: they list the loops and facts to re-check, and the ChildSnack one warns the model against “inventing compact formulas” for the gluten classes or the child-to-table waiting assignments (Listing 28, pp. 35–36). Inference: these checklists look written after seeing failures, so the reported H-O gains include hand-tuned per-domain prompt content, not only the generic idea; the paper itself calls these “handcrafted prompting strategies” (Section 8, p. 9).
4. Execute the returned program to produce the grounded problem file (Sections 3.1 and 3.3, pp. 4, 6).
5. Parse the generated file and compare its objects, initial facts, and goals to the ground-truth file. The authors say, “Knowing our domains’ problems are always solvable, we regard a perfect match for all of the objects, initial, and goal states between the two problem files implies a valid plan, and any mismatch means invalid plan” (Appendix E, p. 11).
6. For the generated problem, run the ordinary programmatic planner where it completes; the standard planner is `dual-bfws-ffparser` and validation uses VAL (Section 2.2, p. 3). For large cases, the parser comparison is used because “due to the large problem sizes in our dataset, the solver often crashes before completion” (Appendix E, p. 11). Section 3.3 says the H-O pipeline also uses the authors' own parsers for differences checking (p. 6).

The paper's ChildSnack example compresses a list of children, trays, bread and content portions into arithmetic rules: every third child beginning at child 1 is gluten-allergic, matching bread and content portions are gluten-free, and children are assigned to trays by groups. Its Appendix Listing 12 (p. 19) is the concrete natural-language input (“Every 3rd child starting from child 1 must receive a gluten-free sandwich”); Listing 9 (p. 16) is the PDDL domain file and Listing 10 (p. 17) is an example PDDL problem file, not a model output. BlocksWorld-Unravel similarly says that odd blocks form one stack and even blocks form another, then enumerates a randomized goal (Listing 8, pp. 15–16). The unraveling datasets keep the initial-state text compact but still enumerate randomized goals “to maintain solution complexity” (Section 3.2, pp. 4–5).

Verus form (Inference:)

Inference: represent the generator as executable Rust plus specifications that state the emitted facts are exactly the mathematical expansion of the compact description. A `spec fn` can define a sequence or set of expected facts from `n`; an executable function can construct a `Vec` of facts and use `ensures` to state that its result equals the specification. Use `requires` for valid parameters such as positive object counts, `assert` for arithmetic cases, and a loop `invariant` to state that the prefix emitted so far equals the specification's prefix. A `proof fn` can establish arithmetic properties such as the modular assignment rule and is erased before execution. The PDDL planner remains an external executable; its behavior and parser are trusted unless separately modeled. The Python program in the paper does not carry over directly as a Verus proof artifact, but its loops and conditionals do.

what the evidence shows

On the BlocksWorld-XXL benchmark, all models used as planners fall to 20% accuracy or worse at 30 blocks. The paper reports that Gemini 3 Flash remains at 100% as an ordinary Formalizer through 100 blocks, while Qwen2.5-Coder-32B-Instruct (Q25) remains above 70% until 80 blocks and then degrades sharply (Section 2.2, p. 4; the Figure 5 legend writes Qwen2.5-32B). Both reasoning models show only a “spark” of planning ability at 5 blocks as Planners (p. 4). On the four Unravel domains, the paper says H-O Formalizer “matches or outperforms Formalizer in nearly all cases” (Section 4, p. 6; Figure 5, p. 7). Planner accuracy is almost zero except for Gemini 3 Flash and DeepSeek-V4-Flash on OpenStacks, which the authors attribute to a brute-force plan (open all stacks, start all orders, ship all orders) (Section 4, p. 6). In the extension study the paper reports, for OpenStacks at 300 orders, 90% for Gemini 3 Flash and 100% for DeepSeek-V4-Flash; for ChildSnack at 300 children, 80% and 90%; at 1000 orders only DeepSeek-V4-Flash completes OpenStacks, with 70% (Section 4, p. 6). Inference: the passage is framed as a check of why ordinary Formalizers stay robust with frontier models and does not say which pipeline produced each number. Appendix H says “Each experiment is run once, as each result only takes extreme values of either 0% or 100%” (Appendix H, p. 12). Inference: this means each problem is a pass or a fail, so the reported accuracies are percentages over a batch of 10 problems per size for the Unravel sets (Section 3.2, p. 5) and are single-run values.

where it fails and what it assumes

The approach assumes fixed classical planning domains and a usable generated program. The authors limit evaluation to “classical symbolic planning settings with fixed domain specifications” and list partially observable, stochastic, temporal, and multi-agent domains as future work (Section 8, p. 9). It relies on Python generators and handcrafted prompts, and does not establish that the generated representation is minimal, optimal, or transferable (Section 8, p. 9). The parser criterion assumes every instance is solvable; that assumption would be invalid for a benchmark containing unsolvable instances. A generator can also hallucinate or mis-index repeated patterns; the paper explicitly lists hallucination as a risk (Appendix F, p. 12).

## technique 2: divide-and-conquer formalization

what it is and when to use it

Use divide-and-conquer (D&C) when the ordinary formalizer is correct in principle but loses facts because a long description exceeds its effective context. D&C decomposes independent fact generation into calls, keeping each call short.

how the paper does it

1. Make one call to generate the PDDL problem header: “problem name, domain name, and objects” (Section 2.2, p. 4).
2. Split the natural-language problem description into sentences (Section 2.2, p. 4).
3. For each sentence, provide that sentence together with the domain specification and ask for only the corresponding one line of PDDL (Section 2.2, p. 4).
4. Consolidate all generated lines with the header into one problem file (Section 2.2, p. 4).
5. Inference: compare the resulting file against the ground truth with the same parser and exact object/initial/goal test; Appendix E (p. 11) describes this test for the Formalizer evaluations in general, and the paper does not describe a separate D&C test.

The paper's Qwen2.5-32B result on BlocksWorld-XXL improves from 30% to 100% at 100 blocks under D&C, while the stronger Gemini 3 Flash and DeepSeek-V4-Flash are omitted from this ablation because ordinary formalization was already high accuracy (caption to Figure 5, p. 7). The D&C experiment is on BlocksWorld-XXL only (Figure 5a); it was not run on the Unravel domains.

Verus form (Inference:)

Inference: make each sentence-to-fact conversion a separately specified Rust function, then concatenate the results. A `spec fn` maps a sentence representation to its required facts; each conversion function has `ensures` relating its output to that specification. A loop over sentences has an `invariant` saying every already-processed sentence has a correct output. This supports independent checking, but the sentence parser, tokenizer, and the external language model remain trusted unless modeled. The decomposition does not prove that the natural-language segmentation preserves all cross-sentence dependencies.

limits and evidence

The paper says each generated line “is grounded in the domain file and thus independent of each other” (Section 2.2, p. 4). Inference: D&C addresses context overload, not the combinatorial search space, and facts whose meaning depends on several sentences could be lost; the paper does not test this. Its reported 30%-to-100% improvement is for Q25 at the 100-block point, not an average across all sizes (Section 2.2, p. 4). BlocksWorld-XXL has 200 problems from 5 to 100 blocks (Section 2.2, pp. 3–4); the paper does not state how many problems sit behind the 100-block point.

## technique 3: pattern review and error diagnosis

what it is and when to use it

Use pattern review when the model can write a generator but makes systematic indexing or offset mistakes in repeated loops. The second prompt asks the model to inspect its own generated code for recurring patterns before finalizing it (Section 3.3, p. 6).

how the paper diagnoses and applies it

1. Run an ablation in which Q25 is not asked to reflect on repeating patterns, on OpenStacks, Transport and ChildSnack (Section 5, pp. 6, 8).
2. For each domain, randomly pick two batches of problems and manually analyze “at most 10 errors in those batches” (Section 5, p. 8).
3. Classify errors by loop or construction site. In OpenStacks, 90% of errors occur in a loop and 80% concern the “(includes order product)” loop; in Transport, 50% concern object-type appending and 50% concern package/location or truck-capacity loops; in ChildSnack, 100% concern the waiting loop (Section 5, p. 8).
4. Add the pattern-reflection stage and compare accuracy. Figure 6 (legend Q25 versus Q25 Pattern Review) reports increases from 45% to 55% on OpenStacks, 66% to 87% on Transport, and 23% to 41% on ChildSnack (Figure 6, p. 8). Appendix H says each experiment is run once; the paper does not state how many problems stand behind each bar.

The paper provides an OpenStacks offset example: correct code uses `product = ((i + j + 4 - 1) % num_products) + 1`, whereas Qwen writes `(i + j + 5) % num_products + 1` (Listing 1, p. 8). Inference: the correct offset is i+j+3 and Qwen's is i+j+5, so the two differ by 2, not by 1. The ChildSnack example shows Qwen deriving a tray index from `(i - 1) // children_per_tray`, whereas the correct code assigns tables by explicit child-number ranges (Listing 2, pp. 10–11).

Verus form (Inference:)

Inference: encode loop-index rules as `spec fn`s and prove the generated index range with `assert` and `proof fn`s. For each emitted fact, use an `ensures` clause that the index and object names satisfy the specification. A loop `invariant` can bound `i` and establish that every prefix has the correct modular mapping. Pattern review itself is an LLM heuristic, so it is not a proof; Verus can turn the discovered arithmetic properties into checked contracts after the code is written.

limits and assumptions

The with-versus-without ablation is run only on Q25 (Section 5, p. 6), and the paper's own Limitations call the prompting “handcrafted” (Section 8, p. 9). The error percentages come from at most 10 manually analyzed errors in two randomly picked batches per domain, not all generated examples, so they describe sampled error causes rather than a population estimate (Section 5, p. 8). The accuracy percentages in Figure 6 are single-run results (Appendix H, p. 12). Inference: reflection can fail to detect a semantically wrong but syntactically regular loop, and the approach does not remove the need for an independent parser check.

## what is proved, measured, and trusted

The paper measures exact generated-file agreement and plan accuracy; it does not prove the LLM's natural-language interpretation. The symbolic planner and VAL validator provide programmatic checking when they finish, while the authors' parser handles large cases. The trusted base includes the PDDL domain, ground-truth instances, parser, planner, validator, Python interpreter, model, prompts, and the assumption that benchmark problems are solvable. Inference: the parser test checks objects, initial states, and goals against the reference, but it does not independently show that the PDDL domain's action semantics implement the prose domain; the paper gives the ground-truth domain file to the model and uses it as given (Section 2.2, p. 3).

Inference: for VL, the H-O pattern is a serious threat and opportunity. A model can emit a compact Rust generator that expands to many proof obligations, but a compact generator only helps if each expansion is specification-checked; otherwise one wrong loop can create many wrong obligations. The paper's evidence concerns synthetic classical planning, so it does not quantify the threat to agent-written Verus Rust. Inference: the most direct VL experiment is to compare flat generated proof obligations with a verified generator and measure verification time, failure localization, and the fraction of expanded obligations whose contracts are discharged.

The authors conclude: “Our experiments across four planning domains show that standard Formalizers also degrade under this setting” and “This paradigm improves scalability, particularly on large and highly compressed planning problems” (Section 7, p. 8). Inference: work VL should not redo is the basic compact-generator idea, the D&C decomposition, and the pattern-review ablation; a new VL contribution would need to connect those ideas to checked Rust specifications, not merely rename Python generation.

## techniques for the catalog

- higher-order formalizer — generate a compact program from a succinct description, execute it into a large grounded representation, and validate the expansion against a reference
- divide-and-conquer formalizer — generate a header once and one independently checked fact per description sentence, then consolidate the lines
- pattern review — ask the model to inspect repeated loops for arithmetic and indexing mistakes before finalizing the generator
- parser-based validation — compare generated objects, initial facts, and goals to a reference when planning or validation cannot finish
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "I can only make a gluten-free sandwich if the bread portion and content portion are both gluten-free and available in the kitchen."): read the paper text from first line to last, including the ChildSnack, OpenStacks and Transport H-O prompts and second-stage prompts, and viewed page 8 as an image for Figure 6; checked every quotation, number, section and page reference, the D&C and H-O steps, the Figure 6 values and the Listing 1 and 2 examples; changed the lowercase in the state-space quote, split the Section 3.1 quotation to match the paper, moved the Section 2.2, Section 4 and Section 7 page references to pages 4, 6 and 8, corrected the Appendix listing pages (9 and 10 are domain and example problem files, not generated output; Listing 12 is on p. 19), corrected the OpenStacks example from off-by-one to an offset of 2, replaced an unsupported per-batch error count and “selected test sets” wording, added the ChildSnack and extension numbers, the Planner OpenStacks outlier, and the domain-specific second-stage prompts, and labelled several unlabelled conclusions as Inference; did not check the cited prior work, the Qwen error-analysis percentages in Section 2.2 beyond reading them, the contents of Listings 5–8 and 13–20 beyond skimming the domain files, or the plot data in Figure 5 (read as text only).
