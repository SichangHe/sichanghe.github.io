research proposals for DeGenTWeb
(authored by agents unless marked 🧑)

what is worth doing first

- recommendation: test whether the current website decision survives changes in extraction, copied content, and generators
    - DeGenTWeb already solves the basic filtering and aggregation problem
    - the possible contribution is a measured boundary of that solution
- recommendation: compare one frozen commercial/open detector before designing a new detector
    - strong commercial baselines change what counts as a useful improvement
- keep reader warnings and writing histories as separate possible studies
    - their data and evaluation differ from a crawl
- these are research recommendations, not established novel contributions
    - the experiments below can reject them cheaply

existing project overlap

- substantive notes were found in the original DeGenTWeb checkout
    - source: original `DeGenTWeb_imc2025` project, `docs/` directory
    - a later `dw` project checkout also has a closed detector comparison in `docs/classifying_site.md`
    - the linked notes in this checkout contain titles only
- site aggregation already exists
    - classification notes: “compute 9 Binoculars score deciles among webpage for each website”
    - same section: “train linear SVM classifier on deciles as feature vector”
- filtering and duplicate removal already exist
    - `filter_non_article.md`: “50% text duplicated relative to previous pages of the same subdomain”
    - `preliminary_binoculars_eval.md`: “cookie banner from Trafilatura extraction issue”
- adding related detector scores has already been tested on a small held-out set
    - later classification notes: “This tie shows no observed benefit from the larger method”
    - the same notes close that comparison pending a later paper decision
- proposing filtering, deduplication, aggregation, or a generic score ensemble again would repeat existing work
    - [web-page review](on_web_pages.md) describes the current pipeline and its limits

1: test whether extraction changes the website decision

- question: with authorship held fixed, can extraction alone change a site's classification?
- closest work
    - DeGenTWeb already uses Trafilatura, prose filters, and duplicate filters
    - [Dolezal et al.](https://arxiv.org/abs/2604.26965) already compare generated text with HTML-wrapped versions
    - [Pew](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/) uses Common Crawl text and calibrates an open Pangram model to a commercial model
        - methodology: “closely calibrate the results from Open Pangram to those from Pangram 3.3”
    - generic HTML-versus-text or crawl-prevalence comparisons are weak novelty
- smallest useful experiment
    - use documented human articles and controlled generated counterparts
    - put identical article text in several templates
        - vary navigation, quotes, comments, tables, and related links separately
    - compare article text, rendered text, WET-style text, and Trafilatura output
    - run the existing DeGenTWeb pipeline with frozen filters and classifier
    - compare Binoculars with one accessible Pangram baseline
        - open EditLens and commercial Pangram are different models
        - agreement between them is not known authorship
- measure
    - changes in submitted text, detector score, retained pages, and final website decision
    - false human flags and missed generated sites on separate held-out template families
    - scan failures and time per site
- possible contribution
    - an extraction change improves errors on unseen sites beyond current DeGenTWeb filtering
    - a rule says when too little usable text remains for a decision
- stopping rule
    - if current filtering already removes the effect, document the robustness result within DeGenTWeb
    - do not turn a negligible effect into a separate method paper

2: test stability under dependence and changing writing processes

- question: when does DeGenTWeb's score distribution stop representing distinct writing on a site?
- closest work
    - DeGenTWeb already drops highly duplicated pages and classifies site score distributions
    - [Liang et al.](https://arxiv.org/abs/2403.07183) already estimate AI modification at corpus level
        - abstract: “between 6.5% and 16.9%”
        - scope is text submitted as reviews at selected AI conferences
    - [Wikipedia measurement](https://arxiv.org/abs/2410.08044), Dolezal, and Pew already estimate prevalence
- smallest useful experiment
    - hold distinct article content fixed while varying copies, templates, and sample order
    - separately vary model family and human editing of generated drafts
    - compare the current duplicate filter and nine-decile classifier with simple mean and majority baselines
    - split whole source sites and generator families between calibration and testing
- measure
    - site false positives, missed generated sites, decision changes, and usable unique text
    - uncertainty by source site rather than by paragraph
    - dependence on page order in the duplicate filter
- choose the question before counting
    - a generated-dominant site label is different from a fraction of generated pages or words
    - page flags and average scores are not estimates of generated share without a validated estimator
- possible contribution
    - identify a failure caused by dependence or new writing workflows that survives current duplicate filtering
    - improve the decision while keeping held-out human flags low
- stopping rule
    - if the current pipeline or simple duplicate removal matches the proposed change, retain the simpler method

3: distinguish drafting from editing only where the evidence permits

- question: what authoring histories remain distinguishable from final text across unseen writers?
- closest work
    - [CoAuthor](https://coauthor.stanford.edu/) already records real writing interactions
        - project: “All interactions between the writers and the system were recorded at the keystroke level”
    - [Zeng et al.](https://arxiv.org/abs/2403.03506) already classify collaborative sentences using CoAuthor
    - [RACE](https://aclanthology.org/2026.acl-long.235/) already models “the distinct signatures of creator and editor”
    - [commercial detectors](commercial_detectors.md) already return assistance and mixed-text labels
- smallest useful experiment
    - reuse recorded drafts and accepted edits before collecting another dataset
    - hold out writers and model families
    - compare correction, rewriting, expansion, drafting, and human revision of model drafts
    - test model drafting separately from any model use
- measure
    - mistaken labels for each workflow and text length
    - how often a detector must decline to decide to meet the chosen error target
- basic limit
    - identical final text can come from different histories
    - a final-text detector cannot distinguish identical observations
- possible contribution
    - establish which labels generalize across writers and which need writing history
- stopping rule
    - if existing labels and baselines answer the question, use them
    - another four-class classifier alone is weak novelty

4: evaluate browser warnings by what readers do

- question: do detector warnings improve factual checking under realistic mistakes?
- closest work
    - commercial extensions already scan pages and show highlights
    - [CHI label-design work](https://doi.org/10.1145/3706598.3713171) already studies AI label perceptions
    - [CHI editing-label work](https://doi.org/10.1145/3706599.3720264) already distinguishes generated from modified labels
    - [browser review](browser_extensions.md) separates academic prototypes from vendor products
- smallest useful experiment
    - vary factual correctness independently of human/model origin
    - randomize no warning, binary warning, uncertainty warning, and source-check suggestion
    - separate controlled warning experiments from trials with actual detector outputs
- measure
    - correct error identification, source checking, false accusations, and time
    - include varied language backgrounds and reader experience
- possible contribution
    - a warning improves checking even when origin detection makes mistakes
    - a page badge alone is a delivery mechanism, not a new detector
- stopping rule
    - if origin labels harm checking, test source-evidence prompts instead
    - needs user-study expertise and consent planning

what is still uncertain

- novelty of every proposed extension
    - nearest work is identified, but an exhaustive search cannot prove absence
- deployment cost of current vendor APIs and open-model inference
    - no experiments or purchases were made for this review
- authoring ground truth for contemporary web pages
    - old publication dates are supporting evidence, not proof
- tiny false-positive targets need large independent samples
    - zero errors among N independent samples gives an approximate 95% upper bound of 3/N
    - clustered pages need uncertainty by site
- [Extra High consultation](chatgpt_consultation.md) informed the initial extraction and aggregation framing
    - its advice is opinion
    - these revisions also account for the substantive DeGenTWeb notes found afterward
