# Agentic AI in the Software Development Lifecycle: Architecture, Empirical Evidence, and the Reshaping of Software Engineering
(authored by agents unless marked 🧑)
Tag: `bhati2026agentic`, [paper](https://arxiv.org/abs/2604.26275)

## what the paper establishes

The abstract says: “We argue that the central object of inquiry has shifted from code generation to delegated execution under human supervision.” (abstract, PDF p. 1). Its reported SWE-bench Verified change is 1.96% in October 2023 to 78.4% in April 2026, and time savings “across controlled studies” are 13.6%–55.8% (abstract, PDF p. 1). These are compiled claims from cited reports, not a single experiment. In section 5.2 (PDF p. 4) only the 55.8% figure is described in the text (a JavaScript HTTP-server task, Peng et al.); the 13.6% appears only in Figure 4 (PDF p. 5), attributed to Brandebusemeyer et al. The paper calls SWE-bench Verified “a 489-task subset filtered for solvability and clarity” (section 2.2, PDF p. 2) and the original SWE-bench “a benchmark of 2,294 GitHub issues drawn from twelve mature Python repositories” (section 2.1, PDF p. 2). Inference: those denominators and repository scope matter when comparing results.

## technique: six-layer reference architecture

What it is. Section 3 organizes an agentic system into six layers: L0 foundation model, L1 reasoning/memory/self-reflection, L2 agent-computer interface (ACI), L3 tools and environment, L4 orchestration, and L5 governance and safety. Figure 3 draws them with dependency running upward and feedback flowing downward. The paper says L5 “is currently the least mature layer” (section 3, PDF p. 3). The paper writes: “Across heterogeneous systems we observe a recurring stratification, summarized in Figure 3.” (section 3, PDF p. 3).

How to use it. (0) Choose the base model (L0). (1) Specify the model's planning, memory and self-critique loop (L1). (2) Define structured commands translating the model's text output into concrete operations on a computer (L2). (3) Provide filesystem and editor operations, shell and process management, web browsing, test runners, compilers, and version control and CI/CD integration (L3). (4) Choose a single-agent loop or role-specialized multi-agent decomposition (L4). (5) Add permission boundaries, sandboxing, audit logs and policies for sensitive operations (L5). These are the paper's architectural categories, not a procedure it states; the ordering is this study's reading, and the paper gives no formal algorithm for implementing them. Inference: step 6 would be to measure the resulting workflow against a task benchmark; the paper does not prescribe it.

Verus form. Inference: represent L5 policy as Rust enums and state-transition predicates; use Verus `requires`/`ensures` to prove that an agent action is authorized for the current state, and `proof fn` lemmas for transitions. Keep tool implementations and model outputs in an explicit trusted boundary. This would verify policy plumbing, not the LLM's reasoning.

## technique: agent-computer interface and iterative repair

SWE-agent supplies structured navigation, editing and testing commands. The paper reports that the same underlying model reached 12.5% issue resolution with its custom ACI (section 2.1, PDF p. 2), while the original report found that no system “could resolve more than ∼2% of issues” (section 2.1, PDF p. 2). The paper explains: “The performance ceiling broke not because models became larger, but because the scaffolding around them changed.” (section 2.1, PDF p. 2). The introduction describes the loop as: “they read a repository, formulate a plan across multiple files, execute shell commands, run tests, observe failures, revise their approach, and deliver a committed change” (section 1, PDF p. 1). Section 2.2 describes Claude Code similarly: it “reads the full codebase, plans changes across files, executes shell commands, runs tests, and iterates” (PDF p. 2).

## technique: evolutionary candidate generation and evaluation

AlphaEvolve uses “an ensemble of Gemini Flash and Pro models” to propose program variants, an automated evaluator scores them, and the best survive into the next generation (section 2.2, PDF p. 2). Reported outcomes include a new 4 × 4 complex matrix multiplication algorithm using 48 scalar multiplications, “advanced 20% of fifty open mathematical problems”, 0.7% of compute recovered across Google's data centers, and a 23% speedup of the FlashAttention kernel (section 2.2, PDF p. 2). The paper gives no baselines, definitions of “advanced”, or confidence intervals for these figures; it cites [28]. Inference: for verified Rust, an evaluator could be `cargo verus` plus regression tests, and selection could require proof success before a candidate survives. This is a workflow design, not a technique taught or validated by the paper.

## technique: governance, audit and evaluation gaps

Section 7 identifies five open problems: evaluation beyond SWE-bench, governance and safety, technical debt, skill redistribution, and attention economics. It says SWE-bench “is dominated by Python, focuses on bug-fixing, and provides ground-truth tests that real-world tasks lack”, and that research is needed on benchmarks that capture long-horizon delegation, collaboration with human reviewers, faithfulness to stated intent, and the absence of “reward hacking” behaviors (section 7.1, PDF p. 6). The ADLC framework proposes a mapping of human and agent responsibility, an explicit allocation of authority levels and approval steps, but the paper calls operationalizing it so that auditors can verify it an open problem (section 7.2, PDF p. 6).

## techniques for the catalog

- six-layer agentic architecture: separate reasoning, interface, tools, orchestration and governance responsibilities
- structured ACI loop: navigate, edit, test, inspect failures and iterate through repository changes
- evolutionary evaluator: generate variants, score them automatically and retain the best candidates
- authority and audit mapping: bind high-impact actions to permissions, approval steps and records
- benchmark-aware evaluation: report task denominators, hidden-test scope and reward-hacking limits
