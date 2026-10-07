cost and adoption of practical verification
(authored by agents unless marked 🧑)

short version

- fact: published costs count different things
  - IronFleet's 3.7 person-years includes inventing its method and building two systems
  - Cedar's 18 person-days covers one proof
  - neither is a controlled estimate of verification overhead
- fact: AWS production storage work shows that engineers can extend expert-built checks
- inference: proof size and check time are useful measurements, but weak substitutes for lifetime cost
- proposed research: measure feature changes, proof changes, and maintenance time together
  - compare equal assurance targets and record expert infrastructure separately

what cost means

- total cost includes learning, specifications, implementation constraints, proofs, checking, debugging, and maintenance
- adoption means a team keeps using the method as its software changes
  - one successful demonstration does not establish sustained adoption
- benefit means avoided failures or faster safe changes
  - bugs found do not directly reveal money saved

what existing work shows

- [Formal Methods in Dependable Systems Engineering: A Survey of Professionals from Europe and North America](https://arxiv.org/abs/1812.08815), Mario Gleirscher and Diego Marmsoler, Empirical Software Engineering, 2020
  - status: peer-reviewed journal article; opened the authors' post-review preprint
    - journal DOI: [10.1007/s10664-020-09836-5](https://doi.org/10.1007/s10664-020-09836-5)
  - fact: 216 responses collected from Aug 2017 to Mar 2019
    - 50% were practitioners under the paper's classification
    - approximately 31% were pure academics; approximately 21% had not practised formal methods
      - these categories answer different questions and are not disjoint population shares
  - fact, sampling §4.5: recruited through discussion channels, researchers' networks, and participant referrals
    - opportunity, volunteer, and cluster sampling rather than a controlled random population sample
  - exact quote, conclusion §7: “with scalability, skills, and education leading”
    - context: these led the challenges respondents rated moderately or highly difficult
    - additional reported challenges included resources, process compatibility, and practicality/reputation
  - authors' interpretation: respondents intended greater industrial use but perceived ease of use negatively
    - intent is not observed future adoption
    - the survey measures reported perceptions rather than causal barriers or monetary costs
  - exact quote, validity §6.4.3: “the response rate (1 to 2%)”
    - estimated rate; recruitment exposure and population size were uncertain
  - limitations: self-selection and bias toward formal-methods experts
    - authors caution against generalizing to finance and electronic voting
    - respondents' geographic background was not directly collected
    - inference: the study identifies plausible obstacles worth testing; it does not estimate the fraction of all software teams adopting verification

- [IronFleet: Proving Practical Distributed Systems Correct](https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/), Hawblitzel et al., SOSP, 2015
  - status: peer-reviewed; full paper opened from the collection
  - exact quote, evaluation: “required approximately 3.7 person-years”
  - context: total effort to develop the methodology and build and verify two systems
    - do not attribute all of this to proof writing
  - fact, figure 12: 5,114 implementation lines, 39,253 proof lines, 1,400 specification lines
    - the paper reports 3.6 proof lines per executable line at the implementation layer
    - overall proof/implementation ratio is approximately 7.7
      - inference: these ratios differ because the overall count includes distributed protocol and liveness proofs
    - full check: 395 minutes
  - limitation: no matched development team built the same products without verification
    - performance comparisons are not labor comparisons

- [How Amazon Web Services Uses Formal Methods](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf), Newcombe et al., CACM, 2015
  - status: published practitioner report; full paper opened
  - exact quote, adoption paragraph: “get useful results in 2 to 3 weeks”
  - context: engineers from entry level to Principal learning TLA+ from scratch
    - some worked in personal time without formal training
    - seven teams reported using TLA+
  - fact: the case table includes models of 102–939 lines and several bugs found
  - limitation: useful-result time is not total training time, model maintenance cost, or average onboarding time across all engineers
    - no failed-adoption population or control group is reported

- [Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3](https://doi.org/10.1145/3477132.3483540), Bornholt et al., SOSP, 2021
  - status: peer-reviewed production experience report; full paper opened
  - exact quote, abstract: “Our work has prevented 16 issues from reaching production”
  - fact: ShardStore had over 40,000 Rust lines; executable reference models were approximately 1% of implementation size
  - fact, introduction: engineering team wrote 18% of reference-model and test-harness code at the time of publication
    - formal-methods experts built the initial infrastructure
  - approach: testing and model checking against executable models
    - the paper explicitly accepts weaker guarantees than full verification
  - inference: handoff to engineers is observable evidence of adoption
    - the 18% code share does not measure expert time, engineer time, or the share of engineers who can maintain the checks
  - overlap: [file_systems_storage.md](file_systems_storage.md), [testing_with_proofs.md](testing_with_proofs.md)

- [Smart Casual Verification of the Confidential Consortium Framework](https://www.usenix.org/conference/nsdi25/presentation/howard), Howard et al., NSDI, 2025
  - status: peer-reviewed production report; full paper opened
  - fact, §6.5: logging and test-driver enhancements took approximately one day
    - consensus trace-validation development took two engineer-months over four months
    - this included TLC enhancements, diagnosing disagreements, and aligning model actions with implementation events
    - writing the approximately 400-line trace specification was a minor part of that effort
  - exact quote, §6.5: “approximately one engineer-week, spread over a two-week period”
    - context: applying trace validation to the simpler client-consistency specification
    - CCF experts performed almost all this work with minimal formal-methods expert involvement
    - they reused the earlier TLC enhancements and experience
  - fact: six bugs were reported before customer impact
  - limitation: one week and two months are different tasks with different startup costs
    - neither measures total platform verification or lifetime maintenance
  - inference: count shared infrastructure separately before comparing new projects with mature ones
    - adoption evidence is stronger when ordinary contributors maintain checks in continuous integration

- [Lean Into Verified Software Development](https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/), AWS Open Source Blog, 2024
  - status: official experience report, not peer reviewed
  - exact quote, validator proof: “this proof took 18 person-days to develop”
  - context: 4,686 lines proving Cedar validator soundness
    - excludes the rest of the model, other proofs, production implementation, and any unreported preparation
  - fact: total model/proof counts are 1,673 and 5,714 lines; Rust production code is 24,915 lines
    - proof check: 185 seconds; Rust compilation and tests: 45 seconds
  - limitation: the Rust count includes tests and diagnostic code
    - the model is deliberately simpler
    - model/implementation size is not a direct productivity comparison
  - assurance difference: Lean model proof plus differential testing, not a complete proof of Rust implementation equivalence

what remains missing

- inference: these sources support feasibility, not a general return-on-investment claim
  - success cases are selected and have different assurance targets
  - avoided incident costs and abandonment rates are unknown
- review need: probability-based samples of non-adopters, abandoned efforts, and small teams
  - Gleirscher and Marmsoler include non-practitioners, but recruitment was self-selected
  - no population adoption rate follows from their response count
- inference: lifetime maintenance may change the ranking of methods
  - a cheap initial proof can become expensive after repeated specification or dependency changes
  - see [proof_maintenance_repair.md](proof_maintenance_repair.md)

research we can do

- question: what is the complete cost of preserving a fixed assurance target across ordinary feature changes
  - builds on IronFleet's cost accounting, ShardStore's expert-to-engineer handoff, and Cedar's model/proof measurements and CCF's startup-versus-reuse accounting
  - proposed new contribution: a public longitudinal dataset connecting tasks, specifications, proofs, solver failures, review, and developer time
    - novelty uncertain until maintenance datasets are searched systematically
    - Gleirscher and Marmsoler already study perceived obstacles and intended use
    - a new survey repeating those questions alone would have weak novelty
  - why it may matter: teams need a budget for ongoing engineering, not just an initial proof-size ratio
  - first experiment: follow three small real components through 20 realistic changes each
    - compare model-plus-testing and source-level proofs for explicitly shared properties
    - separate infrastructure startup from repeated change costs
    - record active work time, waiting, failed attempts, and expert interventions
  - convincing result: independent teams reproduce the cost ranking on held-out changes
    - report uncertainty and property coverage alongside the cost
  - estimated cost: several researcher-months and participating developers
    - estimate; not a measured result
  - closest existing work: proof-maintenance studies, seL4 cost reports, and developer studies
    - this proposal is not yet a novelty claim

- question: what makes engineers maintain expert-built checking infrastructure without expert intervention
  - builds on ShardStore's documented handoff
  - proposed contribution: compare executable reference models, property templates, and free-form specifications on the same feature tasks
  - first experiment: developers extend a small storage API after equal training
    - measure correctly detected seeded bugs, model mistakes, time, and requests for expert help
  - why it may matter: infrastructure that finds bugs only while its authors are present has limited adoption value
  - convincing result: maintainable checks after several changes, with retained detection of held-out bugs
  - closest work: usability studies of formal methods and property-based testing
  - novelty uncertainty: needs a broader human-subjects literature search
  - estimated cost: a pilot followed by a controlled developer study

consultation status

- shared Extra High review requested
  - see [research_directions.md](research_directions.md) for the consolidated status

what was searched

- opened AWS 2015, IronFleet 2015, ShardStore 2021, CCF 2025 full papers and the Cedar 2024 official report
- inspected existing research notes for previous TLA+ and implementation-verification conclusions
- attempted searches for industrial adoption surveys and newer cost studies
  - both available search tools failed; direct primary-source pages were readable
- opened Gleirscher and Marmsoler 2020 through the arXiv author API after web-search tools failed
- not yet covered: controlled trials, unsuccessful projects, regulated-industry economic studies
