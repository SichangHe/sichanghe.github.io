# what are the huge security holes
(authored by agents unless marked 🧑)

answer and scope

- 🧑 question from the [research index](../../../index.md): "what are the huge security holes"
- recommendation: study a weakness whose security consequence can be reproduced across a complete deployed component chain
  - count affected configurations separately from confirmed exploitation
  - compare against working defenses and their stated assumptions
- no representative incident dataset was analyzed here
  - this page cannot rank today's most exploited weaknesses
  - the initial 7 October list was explicitly unverified
- updated 8 October 2026
  - use the existing detailed studies below instead of duplicating their literature
  - current prevalence and remaining novelty need measurement

where the detailed reviews live

- [broad security mechanisms and experiments](../more_topics/huge_security_holes.md)
  - software supply chains, delegated authorization, memory safety, and isolation
  - source evidence, threat assumptions, and closest-work checks for each proposal
- [HTTP proxy disagreement and VPN confinement](censorship_security.md)
  - components disagree about message boundaries or traffic-routing exceptions
  - local experiments can test consequences across complete chains
- [LLM agent security](../ai_agents/agent_security.md)
  - untrusted text influencing actions and excessive tool permissions
- [GitHub scams and CI compromise](github_scam.md)
  - shared hosting abuse, dangling references, and workflow authority
- [Rust supply-chain security](../../formal_verification_rust/rust_language/supply_chain_security.md)
- [hardware and timing side channels](../more_topics/hardware_side_channels.md)
- [Internet routing and measurement](../more_topics/internet_routing_and_measurement.md)

why these are mechanisms worth separating

- signed software can still be malicious
  - in-toto authors, threat model: "assumes that there are no rogue developers wishing to subvert the supply chain"
  - [Torres-Arias et al., USENIX Security 2019, full paper](https://www.usenix.org/system/files/sec19-torres-arias.pdf)
  - interpretation: checking an approved build process does not prove that approved code behaves harmlessly
- authorization must follow the user's request through other services
  - Zanzibar authors, abstract: "Its authorization decisions respect causal ordering of user actions"
  - [Pang et al., USENIX ATC 2019](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
  - interpretation: ordering permission changes is established work
    - a queued effect needs an explicit rule about when permission must hold
- isolating a library does not validate its returned answers
  - RLBox authors: "all *boundary crossings are explicit*"
  - emphasis belongs to the source
  - [project overview](https://github.com/PLSysSec/rlbox-book/blob/main/src/chapters/overview.md)
  - interpretation: callers still have to check untrusted values before using them
- two HTTP servers can disagree about one request
  - James Kettle: "the back-end agrees with the front-end about where each message ends"
  - [HTTP Desync Attacks, 2019](https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn)
  - interpretation: message parsing and shared connections can break separation between users
- reading depth for these short pointers
  - quotes and detailed supporting analyses are preserved in the linked local studies
  - this page contributes navigation and scope clarification

earlier candidate list, retained as research scope

- the initial draft listed these possibilities from memory
  - package installation code and GitHub Actions
  - stolen session cookies and tokens
  - pre-login bugs in network appliances
  - prompt injection into privileged LLM agents
  - malicious browser-extension updates
  - public-code secrets
  - memory unsafety
  - dangling DNS records
  - BGP origin validation and RPKI validators
  - insecure applications generated with AI
- this is a list of hypotheses about useful topics
  - it is not evidence that each problem currently dominates incidents
  - the phrase "network edge boxes written in C" was an unverified characterization
    - language, exposure, and authentication boundary need separate checks
- closest existing coverage
  - package, CI, authorization, memory, and agent mechanisms have reviews linked above
  - DNS and BGP measurement belongs with the Internet-routing study
- still thin in this folder
  - stolen-session deployment defenses and browser-extension ownership changes
  - appliance patch adoption and insecure generated-app deployment
  - no focused full-paper review of those four areas is claimed here

smallest defensible follow-up

- pick one concrete component chain and one advertised security rule
- reproduce the nearest published attack and enabled defense locally
- vary only the transformations that the defense claims to cover
- report accepted forbidden behavior, rejected legitimate behavior, and deployment cost
- compare results with the exact threat model
  - a missing assumption is different from a failure under the promised assumptions
- stop if existing tools already expose and explain every reproduced failure
  - a new list of known vulnerabilities is weak research novelty
