# ObSynth: An Interactive Synthesis System for Generating Object Models from Natural Language Specifications
(authored by agents unless marked 🧑)
Tag: `gu2022obsynth`, [paper](https://doi.org/10.48550/arxiv.2210.11468)

## what the paper does

ObSynth treats specification reification as turning a vague natural-language application description into a concrete object model. Its model contains objects, fields, field types, multiplicities, and method names. The paper's running prompt is “I want a restaurant management app tracking customers, their reservations, their orders, and menu items.” (Fig. 3, §3.1, p. 4). The system uses GPT-3 few-shot prompts, parses text answers into structured components, and keeps a human in the editing loop. The authors describe the goal as “designing an object model that will make up an application from a natural language specification alone.” (§1, p. 2).

The contribution is a workflow and prototype, not a formal verifier. Its study has 11 participants: six used ObSynth and five used a control interface (§5.1, p. 9; Appendix B.1, p. 18). The abstract reports that models with ObSynth were more detailed, that a majority of generated components were retained, and that users checked generated components rather than generating everything from scratch; it also reports no reduction in elapsed time (abstract, p. 1).

## technique 1: staged interactive reification

What it is. ObSynth separates initial object discovery from full model synthesis and later revision. The frontend first asks for a prompt, then synthesizes object names, lets the user edit them, synthesizes fields/types/multiplicities/methods, and finally supports incremental additions and deletions. The paper states, “Because of the vague nature of this task, it is important that systems addressing these tasks involve humans in the loop.” (§1, p. 2).

How to apply it.

1. Ask the user for a high-level application prompt (step 1, §3.1, p. 4).
2. Generate an initial list of object names and display it without fields or methods (step 2, §3.1, p. 4).
3. Let the user add, edit, or delete object names before generating details (step 3, §3.1, p. 4); the paper says deleted objects, fields, and methods can also be restored (§3.2, p. 5).
4. Generate fields, types, multiplicities, and method names for the accepted object list (step 4, §3.1, p. 4; Fig. 3, p. 6).
5. Let the user revise all components, with the one-way/two-way relationship toggle and one/many multiplicity control (step 5, §3.2, p. 5).
6. Offer targeted Auto Add Object, Auto Add Field, and Auto Add Method operations when the user wants more candidates (§3.1, p. 4 for the initial-phase Auto Add Object; §3.2, p. 5 for the others).

The UI maintains consistency when an object is renamed: “ObSynth ensures that when the user changes the name of an object, all other fields having that object type are renamed.” (§3.2, p. 5). Deleted components can be restored (same section). Inference: these are concrete editing invariants; the paper's design has users edit and delete generated content at all stages, which I read as review rather than silent commitment.

Inference: A Verus-oriented implementation can represent the model as maps from object identifiers to field and method records. A rename operation can have `requires` for a valid identifier and `ensures` that every type reference formerly naming the old identifier now names the new one. A proof `fn` can establish preservation of a relation invariant; executable UI code should still reject malformed names and duplicate identifiers. The paper does not discuss Rust, Verus, or executable contract generation, so these are inferences.

Evidence and limits. The user study tracked button presses and model evolution over time (§5.1, p. 9). The workflow changed: control users grew models steadily, while ObSynth users showed an initial spike followed by a checking and correction phase (Fig. 8, §5.5, pp. 13–14). In the system's object model each method has only a name (§1, p. 2); the authors list method arguments and descriptions of objects, fields, and methods as future extensions (§6, p. 14). Inference: this omission is material for verified Rust because method contracts, ownership, error behavior, and representation invariants are where proof obligations arise.

## technique 2: few-shot prompt engineering with structured parsing

What it is. Each synthesis operation is a text-to-text GPT-3 call. ObSynth provides a complete worked example (a classroom management app), asks the same question for the user's application, and parses the answer into structured data. The backend used text-davinci-001 with temperature 0, frequency penalty 0, and presence penalty 0 (§4.1, p. 7; the paper calls these the defaults of the OpenAI web API). The authors explain: “The premise of prompt engineering is that by specifying examples of a task we wish GPT-3 to perform, it can learn to perform the task in a few-shot manner.” (§4.1, p. 7).

For initial objects (ST1), the paper's end-to-end procedure is:

1. Put a full classroom-management example (the primer) in the prompt (§4.3, pp. 7–8; Fig. 4, p. 9).
2. Append the user's application prompt and ask for relevant tables/objects (§4.3, p. 8).
3. Parse the response such as “A: It has the following tables: customer, reservation, order, menu item.” into object names and add them to the UI (§4.3, p. 8).
4. Query again with the prior prompt and answer plus “Q: What other tables does this application have?” (§4.3, p. 8).
5. Parse the second answer and show all candidates, deliberately tolerating overgeneration because users can delete tables (§4.3, p. 8).

## technique 3: decompose the model into eight narrowly prompted subtasks

What it is. ObSynth breaks four automation tasks (T1–T4, which map to its UI buttons) into eight subtasks, each solved with a single GPT-3 prompt (Table 1, §4.2, pp. 7–8). ST1 synthesizes initial object names from the prompt. ST2 synthesizes additional object names from the prompt and existing names. ST3 synthesizes field names from the prompt and object name. ST4 predicts a field type from the prompt, field name, and all object names. ST5 predicts one-versus-many multiplicity from the prompt, object, and field. ST6 synthesizes methods from the prompt, object, and field names. ST7 proposes additional fields, and ST8 proposes additional methods. Table 2 composes these subtasks: Generate Fields and Methods calls ST3–ST6; Auto Add Field calls ST7, ST4, and ST5; Auto Add Method calls ST8 (Table 2, p. 8).

The supplementary prompts provide reusable shapes. For fields, the primer asks “What does a student have?” and answers with a sentence containing singular and list-valued attributes (Fig. 10, Appendix A, p. 18). For types, it supplies an allowed type set and examples mapping `id` to `int`, `name` to `string`, and `cost` to `float` (Fig. 11, Appendix A, p. 19). For multiplicity, the paper says a plural or “list of” phrase maps to a list type, otherwise to a base type (Appendix A, p. 17). For methods, it asks what an object can do, asks what else it can do, then asks for method names (Fig. 12, Appendix A, p. 20). Two field-name primers were needed because a single classroom example sometimes caused application-specific overfitting (Appendix A, p. 17).

How to apply it. Keep the type vocabulary explicit, pass current object names as candidates, and call only the subtasks needed by the user's button. Parse each answer into a typed intermediate representation, validate that referenced objects and types exist, and expose the candidate for editing. Inference: a Verus generator can specify well-formedness predicates for this intermediate representation and use `requires`/`ensures` around conversion into Rust declarations. It can prove structural consistency such as valid references and multiplicity encoding; semantic correctness of a GPT suggestion remains a review or domain-proof obligation.

Evidence and limits. The paper reports that 92% of final objects, 79% of final fields, and 65% of final methods in the ObSynth group had been generated in initial synthesis (six participants, §5.3, p. 12). Of the automatically synthesized step-4 components, 92% of objects, 73% of fields, and 59% of methods remained in final models (six participants, §5.3, p. 12). These are retention fractions over the six ObSynth participants, not accuracy estimates against an external gold standard. Participants still reported confusing field names and weaker method suggestions (qualitative feedback, §5.3, pp. 12–13; Appendix B.2, p. 24). Inference: retention measures usefulness after human selection, not proof that a component is required or correct.

## technique 4: overgenerate candidates and measure human selection

What it is. ObSynth intentionally errs toward suggestions that users can remove. The initial object list and Auto Add Object query produce extra candidates; later editing records which components survive. This converts an open-ended completeness problem into candidate generation plus human filtering. The paper reports, for example, waiter in 67% of ObSynth models versus 20% of control models, and table in 83% versus 20%; menu appeared in 17% versus 40% (Table 3, §5.2, p. 11). Inference: the denominators are six ObSynth and five control models, since the percentages are multiples of 1/6 and 1/5 and Appendix B.1 (p. 18) gives those group sizes.

How to apply it. Generate a superset of plausible objects or fields, let the user remove or edit candidates, and record initial and final sets. Compare component frequencies across assisted and unaided groups, looking for components common in the control but absent in the assisted group as a complacency signal (§5.2, pp. 9–11).

Evidence and limits. The paper reports no objects or fields in the upper-left quadrant of Fig. 7 (common in the control group but rare in ObSynth), while many fields were consistently kept by ObSynth users and never added by controls (Fig. 7, p. 12; §5.2, p. 10). One tension: the text calls menu “the only object common among control group models but rare in ObSynth models” (40% control, 17% ObSynth; Table 3, p. 11). The study is small (11 participants) and uses one restaurant prompt. Inference: the paper describes no independent gold model and no correctness adjudication, so none was used. Inference: the frequency comparison supports a hypothesis about idea generation, not a general completeness guarantee.

## technique 5: evaluate automation with a controlled user study

The paper asks four questions: whether assisted models are more detailed, whether initial components are better, whether users finish faster, and how workflow changes (§5, p. 8). It splits 11 participants (6 academia, 5 industry, all familiar with web development and object model design) into six ObSynth and five control users (Appendix B.1, p. 18), gives both groups the same prompt and instructions, removes synthesis features in the control UI, logs interactions, and collects final models and interviews (§5.1, p. 9). Time is measured from Begin to I’m Finished (§5.4, p. 13).

Results must retain denominators and setting. ObSynth users took 14.4 minutes on average (standard deviation 1.6) versus 12.0 minutes (standard deviation 3.1) for five control users; the authors report no evidence of speedup (§5.4, p. 13). The six assisted users' final models retained the generated components at the percentages above. The workflow plot is a heuristic: it counts total objects, methods, and fields over time, not semantic correctness (§5.5, p. 13).

## techniques for the catalog

- staged specification reification — turn a vague prompt into objects, then fields/types/multiplicity/methods, with user edits between stages
- few-shot prompt engineering — provide domain primers, query GPT-3 at temperature zero, and parse text answers into structured candidates
- eight-subtask decomposition — separate object, field, type, multiplicity, and method generation so each call has explicit inputs and outputs
- overgenerate then filter — show extra candidates, let users delete or edit them, and record initial-to-final retention
- interaction-aware evaluation — compare assisted and control groups with denominators, elapsed time, component frequencies, and workflow traces
- verus acceptance boundary — inference: validate intermediate-model invariants and require explicit review before translating candidates into proved Rust contracts
