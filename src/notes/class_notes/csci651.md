# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

## Misc

flow: same source&destination (IP&port) & protocol

- important: most traffic point-to-point
- concrete & fine-grained

NABC for research: (hook), need, approach, benefit, competition

## *Some Reflections on Innovation and Invention*, George H. Heilmeier

- think about where field is going, not where it is
- involve researcher throughout deployment & business
- technology transfer: focus on what people "care about", what help people,
    not mathematical beauty
    - overcome existing benefit haver; marketing
    - everything need to work, or else fail
- catechism for DARPA funding/ startup: goal, existing solution,
    improvement & novelty, expected outcome, cost estimate

## *An Evaluation of The Ninth SOSP Submissions or How (and How Not) to Write A Good Systems Paper*, Roy Levin, David D. Redell

- paper category: implementation, theory, idea, measurement, survey,
    simulation
- know related work: old & new, peer-reviewed
- not readily solved by existing approach (or w/ tweak)

## *The design philosophy of the DARPA Internet protocols*, David D. Clark

- Internet: multiplexed utilization of existing interconnected networks
- Internet was for military
    - anticipate failure
        - fate-sharing: endpoint deal with failure.
            guarantee and easy but inefficient
    - protocol do not tell participant what fail
    - accountability, host attachment, cost efficiency are lowest priority
- to connect existing network, bar is low
    - adopt packet switching; gateway: packet switch
- distributed management was lower goal → the BGP mess
- UDP/TCP/IP was split from network control protocol
    (NCP)—NCP was too specific and bad for latency
    - goal to support different application
    - when designing, did not anticipate actual challenge
- protocol loose → realization determine what goes
- datagram is the basis of Internet flexibility
    - high utilization: statistical multiplexing
    - drawback: no guarantee, header overhead, difficult to
        manage & troubleshoot

## *On the Naming and Binding of Network Destinations*, Jerome H. Saltzer

- type of name
    - name: the thing
    - address: where
    - binding: mapping name to address
    - route/path: how to get there
- movable; mnemonic; identity

## *End-to-end arguments in system design*, J. H. Saltzer, D. P. Reed, D. D. Clark

- handling failure in middle do not void need to do so
    at end—no fundamental effect
    - cost of duplication
- low level check help performance, but need not be perfect
- example: checksum, encryption, dedup, FIFO, transaction, RISC
- what end mean depend on application

## *Tussle in Cyberspace: Defining Tomorrow's Internet*, David D. Clark, John Wroclawski, Karen R. Sollins, Robert Braden

- tussle: conflict of interest among party
- need to allow various outcome for place w/ tussle
- should modularize design to separate tussle
- design for choice

## *Congestion Avoidance and Control*, Van Jacobson, Michael J. Karels, SIGCOMM 1988

- obvious window-based transport protocol implementation cause 100x slowdown
- need to get to connection equilibrium → slow start
- preserve equilibrium → round trip timing consider variance
    - goal: keep bottleneck full
    - self-clocking: packet spacing follow ACK → follow bottleneck
    - avoid retransmission too soon
- resource limit: congestion avoidance w/
    [additive increase (AI)](../cs/networking.html#congestion-window-cwnd)
    - congestion detection: packet loss, ~~delay~~
    - congestion recovery: multiplicative decrease (MD)
- measure RTT: exponential weighted moving average
    (EWMA)—ACK time - sent time
- retransmission timeout (RTO)
    - TCP fast retransmit: retransmit when 3 duplicate ACK (TCP Reno)
    - TCP fast recovery: half `cwnd` instead of slow start
    - selective ACK (SACK): for missing packet

## *A Binary Feedback Scheme for Congestion Avoidance in Computer Networks*, Kadangode K. Ramakrishnan, Raj Jain, SIGCOMM 1988

- explicit congestion notification (ECN) router add congestion bit to packet,
    returned later in ACK
    - DEC bit/congestion indication (CI)
    - router: use average queue length over regeneration cycle
        (turns out not good)
- power: throughput${}^\alpha$ / delay
- efficiency: not retransmit unnecessarily
    - (throughput / knee throughput) / (delay / knee delay)
- fair share per flow
    - Jain fairness $\frac{(∑x_i)^2}{n∑x_i^2}$ where
        $x_i=\frac{A_i}{D}$ is allocation (bit rate) by demand per flow
    - can cheat by opening many flow
- avoid oscillation & congestion collapse
    - performance knee vs cliff, hysteresis
    - change slowly: per RTT
    - feedback filter & averaging: more consistent
    - no choke/ source quench: avoid more work
- math model & simulation for policy
- congestion control challenge: hard to predict, changing, delay in control

## *BBR: Congestion-Based Congestion Control*, Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson

- better for WAN, cellular, large bandwidth+delay link
    - adapt to larger queue routers have now
    - avoid timeout & retransmission
    - CUBIC struggle to keep many packet in flight because of
        long feedback loop
    - BBR try to run at performance knee not cliff
- TCP need to measure ideal window size: bandwidth-delay product (BDP)
    = bottleneck bandwidth (BtlBw) × RTT (RTprop)
- measure bandwidth periodically: window size & packet loss & ACK rate
    - pacing: additional to ACK self-clocking
    - try-faster (ProbeBW state, 98%): send 5/4 pace to
        probe bandwidth (multiplicative increase), then send 3/4 to drain queue
        - CUBIC keep probing at equilibrium → oscillation
        - BBR more aggressive ⇒ dominate bandwidth when sharing
    - try-slower (ProbeRTT state): send few packet to clear queue;
        probe RTprop by taking minimum
- startup state (slow start)
    - exit startup when BtlBw stay same for 3 RTT
    - drain mode to clear queue
- converge to fair share

## *BGP Routing Policies in ISP Networks*, Matthew Caesar, Jennifer Rexford

- BGP not designed to do business policy
    - many hack for business relationship & traffic engineering: Pref, MED,
        community
    - BGP not designed to do real-time load balancing
- manual & unscalable configuration
- trick to enhance security, no systematic solution
- when can avoid BGP: connect to single network, default routing
- BGP multihoming goal: reachability, cost, performance, latency,
    reliability, load balancing
- interior gateway protocol (IGP, e.g., OSPF)
    vs external gateway protocol (EGP)
    - internal BGP (iBGP): share BGP policy among an AS's router
- peering: link between router in 2 AS
    (any relationship)/ exchange traffic w/o money (peer-to-peer)
- no valley rule
- internet exchange point (IXP): physical place where ISP swap traffic
    - e.g., AMS-IX (Amsterdam), One Wilshire (LA), LINX (London),
        DE-IX (Frankfurt)
    - network access point (NAP)
    - point of presence (POP)
- private network interconnect (PNI): 2 AS connect directly
    - may be fast/cheap/secure
- routing information base (RIB): BGP routing table
- BGP UPDATE message: announce/withdraw route
    - route = address prefix + next-hop router IP + AS path + policy
    - BGP attribute: LocalPref, multi-exit discriminator (MED),
        community string
    - selection:
        filter → highest LocalPref → shortest AS path → lowest origin ID →
        lowest MED → lowest IGP ID → lowest ID
    - AS path purpose: avoid loop (originally); assume fewer AS hop faster
        - AS path prepending (duplicate AS) → traffic engineering
    - equal cost multi-path (ECMP): load balancing
        - primitive alternative: manually split prefix

## *How the Great Firewall of China detects and blocks fully encrypted traffic*, Wu, Mingshi, Jackson Sippe, Danesh Sivakumar, Jack Burg, Peter Anderson, Xiaokang Wang, Kevin Bock, Amir Houmansadr, Dave Levin, Eric Wustrow

- censorship circumvention traffic type
    - steganograpic: look like allowed → mimicking: flawed
    - polymorphic: not look like forbidden → tunneling: need to
        align fingerprint w/ popular implementation
- GFW active probing: send carefully-crafted packet to server & see if
    it let me use as proxy → block residually for 180s. solved
- fully encrypted traffic look like random
    - research method: send random packet to detect censorship
- GFW passive detection
    - allow if average #set bit in each byte (popcount) is at least 0.6
        (30% of 8) from 4: random enough
    - allow if enough printable ASCII (`[0x20,0x7e]`): in first 6 byte of
        packet, or > 50%, or > 20
    - allow if match fingerprint of TLS/HTTP
- GFW blocking characteristics
    - limit #residual block: more blocked connection → shorter blocking
    - only block client immediately, ignore server
    - only examine first packet in TCP connection
    - only check packet to specific PI range (popular VPS provider AS, but
        not CDN)
    - only check packet w/ probability \~26%.
        know because #successful successive sending fit geometric distribution.
        → reduce false positive
- 0.6% false positive rate from empirical real traffic
- circumvention:
    - trivial: prepend exempt start byte
    - sophisticated and extensible: pad popcount & shuffle

## *Routing Stability in Congested Networks: Experimentation and Analysis*, Aman Shaikh, Anujan Varma, Lampros Kalampoukas, Rohit Dube

- simulate & Markov model OSPF & BGP up-to-down (U2D) & down-to-up (D2U)
    timing when overload
- OSPF: only overload factor matter, not packet size
- BGP: helped&screwed by TCP reliability (slower U2D & D2U)
- routing can fail because, in IP, they go through same link as data
- queuing theory & Markov chain
- both detect failure by periodically sending hello (OSPF)/ keepalive (BGP)

## *Why Is It Taking So Long to Secure Internet Routing?*, Sharon Goldberg

- BGP is easy to attack
    - prefix hijack: bogus BGP announcement; subprefix hijack:
        announce more specific prefix
    - route leak: announce route to too many
    - blackhole: route to nowhere
    - interception: route through eavesdropper
- defense
    - prefix filtering
        - problem: no incentive P2P or P2C or Tier-1
    - Resource Public Key Infrastructure (RPKI): sign prefix ownership
        - sign route origin authorization (ROA); put in
            regional internet registry (RIR)
        - prevent hijack → incentive, but not leak
        - PKI can be attacked; failing check break routing
    - Border Gateway Protocol Security (BGPsec): sign BGP announcement
        - need online crypto → need new router
        - little useful unless all adopt

## *In Search of the Elusive Ground Truth: The Internet’s AS-level Connectivity Structure*, Ricardo Oliveira, Dan Pei, Walter Willinger, Beichuan Zhang, Lixia Zhang

- AS topology graph: node = AS, edge = BGP session
    - essential for understanding connectivity/routing for, e.g., simulation
    - reveal business dispute, policy/sanction (de-peering)
- business relationship: customer-provider (C2P), peer-to-peer (P2P),
    sibling (same organization)
- invisible link
    - C2P link show up eventually in routing table
    - P2P link may never show up
    - hard to see on lower hierarchy; good measurement on
        Tier-1 after a while
    - hidden link, e.g., backup link only show up when primary fail
- Internet flattening:
    eyeball ISP & hypergiant & content provider peer everywhere
- measure routing ground truth
    - BGP table & BGP update from RouteViews, RIPE RIS
    - topology from R&E network (research & education)
    - private router config & syslog from Tier-1
