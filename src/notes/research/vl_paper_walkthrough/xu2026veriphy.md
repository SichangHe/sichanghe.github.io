# VeriPhy: Agentic Physical Reasoning for World Model Evaluation and Refinement
(authored by agents unless marked 🧑)
Tag: `xu2026veriphy`: [paper](https://www.semanticscholar.org/paper/796e92ab077fa28492358507cffbee707df7a436)

## what is proved and measured
VeriPhy evaluates generated videos against typed physical obligations. Its planner reads a prompt, builds a static plan, invokes frozen perception tools, and aggregates evidence into supported, contradicted or unknown verdicts. The abstract states: “Visual fluency in generated video does not imply physical reliability, and a scalar quality score alone is incapable of indicating the obligation a clip violates or the moment it fails.” (Abstract, p.1). The system is evaluated on a 1,500-clip corpus of human-annotated flaw records. The core development set has 149 clips and 304 records; VeriPhy accounts for 228 records, versus 164 for a question-decomposition evaluator and 222 for monolithic prompting on the same claims. These are recall counts over that core, not generalization estimates. The authors explicitly write: “The core is a development set, so these figures characterize the system rather than its generalization.” (Abstract, p.1).

## technique 1: compile text into typed obligations
what it is: turn a free-form prompt into obligations with declared types, temporal scope and evidence requirements before looking at frames. The paper describes “a text-only planner” that compiles the prompt into “typed physical obligations and a statically validated execution plan before any frame is observed.” (Abstract, p.1).

how to apply:
1. parse each claim about an object, relation, motion, time interval or quantity
2. assign a typed obligation and required specialist measurement
3. reject plans with unknown operations or invalid argument types
4. register the validated plan before execution
5. retain the obligation identifier through every later record

Inference: for Verus, model obligations as an enum or ghost data structure and prove that each plan operation has a valid input and output type. Use `requires`/`ensures` for plan well-formedness and a loop `invariant` while executing operations. The physical models and perception tools remain trusted unless separately verified.

## technique 2: gated, timeline-conditioned tool execution
what it is: observations may trigger only declared calls, each scoped to a time interval. The abstract says: “During execution, observations gate and scope only declared calls to frozen low-level experts (e.g., segmentation and tracking, counting, eleven typed physical measurements over the resulting tracks, depth, OCR, and audio-event detection).” (Abstract, p.1).

how to apply:
1. execute the registered plan against the video timeline
2. use an observation to select an already-declared tool call
3. pass only the declared spatial and temporal slice
4. record the tool version, input span and output type
5. do not allow a tool to invent a new obligation

Inference: a Verus API can encode each tool as a spec-described operation over immutable trace segments. A ghost set of permitted calls can be maintained as a loop invariant; proof obligations ensure calls are members of that set. This checks protocol discipline, not neural detector correctness.

## technique 3: provenance-carrying evidence records
what it is: each action returns typed payload plus provenance. The paper says: “Each action returns a provenance-carrying evidence record whose payload, when usable, is either a typed measurement or an explicitly tagged learned state.” (Abstract, p.1).

how to apply:
1. include obligation id, source clip, frame range, tool name and status
2. distinguish measured values from learned states
3. mark unusable evidence explicitly instead of coercing it to a value
4. pass records to a resolver without dropping provenance
5. expose the complete chain with the verdict

Inference: represent records with Rust enums and ghost provenance; prove that a verdict references only records linked to the same obligation. Verus can establish structural provenance invariants, while the trust boundary includes the recorder and parser.

## technique 4: three-valued resolution and abstention
what it is: fixed resolvers map usable evidence to supported, contradicted or unknown; unknown is surfaced as abstain. The abstract says: “Typed resolvers and fixed composition map usable records to a three-valued state (supported, contradicted, or unknown, surfaced as plausible, implausible, or abstain) with full provenance.” (Abstract, p.1). This avoids treating missing measurements as negative evidence.

how to apply:
1. filter records by type and usability
2. apply a deterministic resolver for each obligation
3. combine sub-obligations with fixed composition rules
4. emit abstain when required evidence is absent or conflicting
5. attach all contributing records and reasons

Inference: prove resolver totality and composition lemmas in Verus; use `ensures` to state that abstain implies a missing, unusable or contradictory prerequisite. Do not use an `external_body` function for the resolver being verified.

## evidence, limits and VL threat
A separate writing-back experiment changed generator behavior: the paper reports that 49 of 65 implausible verdicts became plausible, with regression on 1.6% of unflagged clips (Section 5.5, pp.22–24). This denominator is the 65 flagged clips in that experiment; it is not the 304-record core. The paper also reports 591 of 652 simulations passing a pre-render inspection, a simulator-output filter rather than generated-video success (Section 5.2.4, p.13). Inference: these distinctions matter for VL dashboards. Typed statuses and provenance are reusable, but perception, video physics and prompt interpretation remain trusted. The threat to agent-written verified Rust is moderate to high when an agent collapses unknown into false or loses evidence links; a formally checked resolver can prevent that policy error.

## techniques for the catalog
- typed obligation compilation — compile claims into statically checked operations before observations
- gated tool calls — permit only registered, time-scoped specialist actions
- provenance records — carry source, span, type and usability with every measurement
- three-valued verdicts — separate support, contradiction and unknown with explicit abstention
- fixed composition — combine typed sub-verdicts deterministically and retain contributing evidence
- verdict-to-generation feedback — use auditable critic outcomes to alter later generation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
