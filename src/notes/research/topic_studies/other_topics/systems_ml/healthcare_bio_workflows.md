healthcare: reliable genomic analysis workflows
(authored by agents unless marked 🧑)

recommended starting point

- test whether resumed genomic analyses produce the same scientific answer as clean runs
  - proposed contribution: a benchmark of stale intermediate results and incomplete recovery
  - prioritize Nextflow and Snakemake
  - use public or synthetic inputs
- inference: the most accessible precision-medicine research here concerns infrastructure
  - a correct workflow run is a prerequisite for interpreting genomic results
  - it does not establish that a treatment benefits a patient

scope

- follows the human's [healthcare interests](../../../healthcare.md)
- searched and inspected on 7 Oct 2026
- workflow means a set of data-processing steps with their input dependencies
- provenance means a record of which inputs, tools, parameters, and steps produced an output
- proposals below have not been experimentally tested
- source inspection labels describe what was retrieved
  - full-text inspected means relevant methods, results, or limitations were read
  - it does not imply exhaustive line-by-line reading

foundations and existing capabilities

- Di Tommaso et al., Nextflow, Nature Biotechnology 2017
  - publisher page inspected; the retrieved page did not provide a usable full paper
  - exact title: “Nextflow enables reproducible computational workflows”
  - [paper](https://doi.org/10.1038/nbt.3820)
  - inspect current behavior through pinned software documentation rather than infer it from the title
- Mölder et al., Snakemake, 2021
  - full text inspected, reproducibility and execution sections
  - exact author position: “equally important to ensure adaptability and transparency”
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8114187/)
  - reported design: coordinate steps and their software environments across execution platforms
  - limitation: reproducibility of execution alone does not establish methodological validity
- Ewels et al., nf-core, 2020
  - primary preprint summary inspected; published full paper not retrieved
  - exact description: “a community-driven platform for the creation and development of best practice analysis pipelines”
  - [preprint](https://www.biorxiv.org/content/10.1101/610741v1)
  - [published paper](https://doi.org/10.1038/s41587-020-0439-x)
  - inference: use existing curated workflows as subjects rather than building another pipeline collection
- Galaxy community, 2024 update
  - full text inspected, public services and scheduling sections
  - exact capability: “a simple URL can be shared with collaborators”
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11223835/)
  - reported method: share analysis settings, versions, data, and workflows
  - reported scheduling component: Total Perspective Vortex uses a community resource database
  - novelty collision: generic resource right-sizing is already implemented at substantial scale
- Kotliar, Kartashov, and Barski, CWL-Airflow, 2019
  - full text inspected, portability experiment and discussion
  - exact result: “produced results identical to those obtained with the reference cwltool”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC6639121/)
  - scope: tested ChIP-Seq pipelines
  - limitation: success on these pipelines does not prove all workflows portable
- Kyritsis, Pechlivanis, and Psomopoulos, CWL sequencing pipelines, 2023
  - full text inspected, implementation and public-data evaluation
  - exact validation input: “samples from the Genome in a Bottle (GIAB) Consortium”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC10662043/)
  - reported method: compare variant calls against reference answers
  - inference: such public reference datasets support answer-level checks without hospital records
- Kanitz et al., GA4GH TES, 2024
  - full text inspected, clients and proposed extensions
  - exact description: “a common way to submit and manage tasks”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC12336797/)
  - TES is a standard API for executing individual tasks on different compute systems
  - limitation: common submission syntax does not itself establish equal failure or cancellation behavior
- Schneider-Lunitz et al., WESkit, 2026
  - full text inspected, architecture and deployment discussion
  - exact capability: “Supporting both Snakemake and Nextflow”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC13032820/)
  - WES is an API for requesting and monitoring a complete workflow
  - reported integration qualification: the first Nextflow FASTQC integration was in preproduction
  - inference: a generic workflow submission service is already available
- Santus et al., nf-core/multiplesequencealign, 2025
  - full text inspected, modules and testing
  - exact design: “an extensible, modular structure”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC12311786/)
  - reported method: compare alternative sequence-alignment tools through a common pipeline
  - inference: changing the workflow engine should be separated from changing the scientific tool
- Djaffardjy et al., developing and reusing pipelines, 2023
  - full text inspected, execution environments and pipeline maintenance
  - exact failure example: “reference genome sequences are constantly evolving”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC10030817/)
  - reported concern: hardware, software, and dataset changes may break previously working pipelines
  - inference: immutable containers do not freeze mutable inputs or external services

closest prior work that limits novelty

- Grayson et al., automatic reproduction, ACM REP 2023
  - full PDF inspected, methodology and research questions
  - exact scope: “focusing on non-crashing executions”
  - [author-hosted full paper](https://mir.cs.illinois.edu/~marinov/publications/GraysonETAL23SnakemakeNextflow.pdf)
  - reported study: released workflow revisions from Snakemake Workflow Catalog and nf-core
  - limitation: completion without a crash is weaker than agreement about genomic answers
  - novelty collision: another count of workflows that run is insufficient
- Sérié, OxyMake, Sep 2026 revision v3
  - full HTML retrieved; identity and declaration limits inspected
  - exact qualification: “The guarantees reach exactly as far as the workflow declares, and no further”
  - [current paper](https://arxiv.org/html/2606.20989v3)
  - reported method: identify results by declared command, inputs, parameters, and environment
  - novelty collision: content-based result identity is already proposed
  - inference: undeclared reads and external state are the relevant boundary to test
- Sebe et al., CoPaLink, 2026
  - full HTML retrieved; abstract and task definition inspected
  - exact task: “linking of bioinformatics tools in workflow code with their mentions in a published workflow description”
  - [paper](https://arxiv.org/html/2603.08195v2)
  - novelty collision: paper-to-code tool linking is already a specific research contribution
  - inference: linking names does not necessarily recover exact parameters or verify output agreement
- Mu et al., Slurm stress, Aug 2026
  - full HTML retrieved; method and comparison scope inspected
  - exact contribution: “a reproducible measurement protocol and benchmark harness”
  - [paper](https://arxiv.org/html/2608.13824v2)
  - reported comparison: native dispatch, job arrays, HyperQueue, and Flux
  - novelty collision: comparing these four backends on throughput and scheduler demand is already done
- Kharma, Wies, and Schintke, Nextflow monitoring, Mar 2026
  - abstract-only inspection
  - exact capability: “allows online monitoring during execution”
  - [paper](https://arxiv.org/abs/2603.28783)
  - novelty collision: another monitoring plugin needs a different measurable function
- Nextflow cache documentation
  - official documentation inspected on 7 Oct 2026
  - exact hash input: “Task container image (if applicable)”
  - [cache and resume documentation](https://www.nextflow.io/docs/latest/cache-and-resume.html)
  - reported mechanism: task metadata contributes to the reuse decision
  - inference: declarations and actual runtime reads may differ
  - caution: latest documentation is mutable
    - pin documentation and engine release before measuring behavior

- Snakemake between-workflow cache documentation
  - official documentation inspected on 7 Oct 2026
  - exact mechanism: “By hashing all steps, parameters, software stacks”
  - [documentation](https://snakemake.readthedocs.io/en/stable/executing/caching.html)
  - reported mechanism: dependency hashes include raw inputs and form a Merkle tree
    - a Merkle tree combines child hashes so a changed dependency changes the parent identity
  - reported restriction: parameters must be declared through the params directive
  - reported limitation: direct globals, config, and wildcards are not captured by the hash
  - compare this supported strongest mode separately from workflows violating its documented restrictions
  - between-workflow caching differs from ordinary reuse within one workflow

existing biological-output regression tests

- Forer and Schönherr, [nf-test, GigaScience 2025](https://doi.org/10.1093/gigascience/giaf130), methods and results
  - selected full sections inspected during the 8 October consultation follow-up
  - authors: “which checks whether 116 variants are genome-wide significant, fails because only 110 variants were found”
  - simulated REGENIE changes preserve successful execution while changing the biological result
  - assertions, snapshots, and format-aware plugins check expected output summaries
  - snapshot agreement is regression evidence
    - a changed output can be scientifically valid
    - an unchanged snapshot is not an independent proof of scientific truth
  - generic scientific-answer checks are established prior work
    - the proposed contribution needs resume-specific failures surviving existing cache and semantic checks

proposal 1: resumed results versus clean results

- question: when can apparently successful recovery preserve an outdated scientific answer?
- first experiment
  - choose 6 public workflows across Nextflow and Snakemake
  - include variant calling, read-quality checks, and expression analysis
  - pin engine, container digest, references, parameters, and small test inputs
  - verify a clean-run answer before injecting changes
- changes to test separately
  - input content changes while filename stays fixed
  - reference or container changes behind a mutable name
  - environment-variable changes
  - external-resource changes
  - process termination during output writing
- classify each discrepancy before attributing it to reuse
  - contract-respecting change
    - all relevant inputs and parameters are declared through supported engine mechanisms
    - test whether reuse follows the documented invalidation rules
  - undeclared dependency
    - runtime reads a file, environment value, or external resource absent from the declared dependencies
    - distinguish naturally occurring public-workflow omissions from deliberately incomplete test declarations
  - unexplained clean-run variation
    - repeated clean runs disagree despite identical declared inputs
    - inspect hidden reads and external state before attributing variation to intrinsic scientific nondeterminism
    - require fixed or observed actual inputs and environment for that attribution
    - establish clean-run variation before testing resumed runs
- compare
  - engine default reuse
  - strongest documented content checking
  - fresh run
  - existing nf-test biological assertions under each supported cache mode
  - sandboxed execution with recorded file reads
  - OxyMake on a faithful smaller equivalent workflow
- outcome measures
  - outdated output accepted as current
  - unnecessary recomputation
  - recovery time and added storage
  - disagreements in variant calls or counts after normalizing harmless ordering
- proposed checker
  - compare declared dependencies against observed file and network reads
  - warn before reusing a result with untracked dependencies
- success criteria
  - reproducible stale results in real public workflows
  - checker catches held-out failures missed by strongest existing settings
- failure criteria
  - content checking already eliminates all discovered cases at similar cost
  - only deliberately incorrect toy workflows fail
  - discrepancies result from scientific nondeterminism rather than invalid reuse
  - stop the pilot early if only intentionally incomplete declarations or nondeterministic tools explain differences
    - continue only if observed-dependency tracking adds a practical benefit specific to real workflows
- novelty uncertainty
  - observed-dependency tracking is established in build systems
  - contribution must show a workflow-specific gap and an effective practical remedy
  - generic content-addressed caching is already covered by OxyMake and earlier systems

proposal 2: workflow cancellation that stops all work

- question: after cancellation or retry, can an abandoned remote task still publish output?
- first experiment
  - submit a small workflow through WESkit and a TES backend
  - delay network replies and kill coordinator processes
  - cancel during submission, input transfer, computation, and output publication
- baselines
  - existing engine and backend behavior
  - retry without stable request identity
  - retry with stable request identity and explicit final-output publication step
- measure
  - duplicate tasks, writes after cancellation, abandoned resources, and recovery time
- success criteria
  - failures occur under documented supported execution paths
  - added protocol prevents them with measured overhead
- failure criteria
  - existing APIs already specify and enforce the proposed behavior
  - races cannot be reproduced without violating supported configurations
- novelty uncertainty
  - durable job execution and duplicate-request handling have broad prior art
  - a healthcare deployment alone is insufficient

precision medicine and genomic privacy

- Saleem, Cicek, and Sav, Beacon reconstruction, Bioinformatics 2025
  - full text inspected, attack setup and reported results
  - exact experimental condition: “1000 SNPs and a beacon with 50 individuals”
  - [paper and complete author list](https://pmc.ncbi.nlm.nih.gov/articles/PMC12133290/)
  - a SNP is a genomic position with variation in a single DNA letter
  - a beacon answers whether a dataset contains a specified genomic variant
  - reported attack: reconstructed genomes using summary answers and correlations
  - inference: querying data without downloading records still exposes information
- optional systems question
  - can query budgets remain correct across several servers, retries, and failures?
  - use synthetic genomes and a local beacon
  - compare per-server counters with one durable shared budget
  - measure leaked answer count, false rejection, and latency
  - failure criterion: established centralized admission control already solves the chosen problem without a meaningful tradeoff
- clinical boundary
  - infrastructure experiments cannot establish personalized-treatment benefit
  - treatment selection needs validated outcomes, representative patients, and clinical partners

minimal pilot before choosing a dissertation direction

- 2 weeks: recover clean runs of 2 workflows and capture exact dependencies
- 2 weeks: inject changes and compare resumed answers with clean answers
- decision
  - continue only if strongest existing controls miss reproducible failures
  - otherwise archive the negative result and move to cancellation or another topic
