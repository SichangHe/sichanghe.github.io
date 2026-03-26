# Networked Systems for Cloud Computing

- sovereignty: legislation cause data to stay within regions

motivation: cloud app

- merchant silicon switch: Broadcom; only provide chip (cheaper)
    - as oppose to Cisco, which provide entire rack + software (expensive)
- previous network could not run new huge app
    - four-post design: 4 router each connected to each of 512 racks via
        1G port
        - each ToR only 4G uplink despite 40x server w/ 1G link
        - ⇒ NIC oversubscription
- uniform bandwidth: pairwise same among server
    - power domain: outlet w/ same power source
        - source fail ⇒ all fail
    - uniform bandwidth resilient to power domain fail

## Papers

### [Jupiter rising: a decade of clos topologies and centralized control in Google's datacenter network](https://dl.acm.org/doi/10.1145/2975159)

Arjun Singh, Joon Ong, Amit Agarwal, Glen Anderson, Ashby Armistead,
Roy Bannon, Seb Boving, Gaurav Desai, Bob Felderman, Paulie Germano,
Anand Kanagala, Hong Liu, Jeff Provost, Jason Simmons, Eiichi Tanda,
Jim Wanderer, Urs Hölzle, Stephen Stuart, Amin Vahdat, CACM, 2016

- Clos topology: switch have same radix; core & aggregation layer
    - assume switch has $k$ port ⇒ $k/2$ core + $k$ aggregation switch
    - ⇒ get switch w/ $k^2/2$ port
    - rearrangeable
    - non-blocking: 1:1 subscription ratio (telecom terminology)
        - mathematically proved: ALA $m≥2r$ where
            $r$ is downlink per middle layer, $m$ is uplink
        - bisection bandwidth: as if cut network in half
    - multi-stage Clos: more layer ⇒ exponential scaling
        - 3-stage give $k^3/4$ port, $l$-stage give $2^{-l+1}k^l$
- Firehose: 32up, 32down aggregation block each made of Clos of 8-port switch
    - each ToR connect to 2 aggregation block
    - deployed side-by-side w/ legacy network; big red button (fallback)
- Watchtower: 128-port line card from 3 layer of 8x 16-port switch chip
    - standardized design for economic of scale
    - optical fiber
- Saturn: similar to Firehose but w/ 288-port line card from 12x 24-port chip
    - ToR: 4up 20down (5:1 oversubscription) or 8up 16down
        (2:1 oversubscription)
- Jupiter: w/ 16x40G or 64x10G switch chip
    - 128-port centauri chassis from 4 switch chip (not interconnected)
    - 64up 256down blocking middle block from 4 centauri
    - aggregation block from 8 middle block
    - spine block from 6 centauri; 128down to 64x aggregation block
        (2x redundancy)
    - incremental: build aggregation block first, spine later
        - ⇒ ToR more burst bandwidth
- external connection: cluster block router (CBR), work like normal racks
    - much larger internal traffic than external
    - choose this bc any racks can have all external bandwidth
    - Freedome block (FDB): Freedome border router (FBR)
        \+ Freedome edge router (FER)
        - 2-stage fabric running BGP
    - datacenter Freedome (DFD): 4x FDB to campus layer
    - campus Freedome (CFD): 4x FDB to WAN
- in-place upgrade: reserve 25% capacity so
    can bring down 1 FDB w/o hitting app
- routing for full bisection bandwidth
    - equal-cost multi-path (ECMP)
        - same path per flow, e.g., hash flow 5-tuple
    - centralized routing
        - work bc topology very regular
        - switch (client) tell Firepath master state w/ BGP update
        - master provide 1 default route for outgoing traffic,
            aggregate incoming traffic into a single IP prefix
            - ⇒ scalability

### [Jupiter evolving: transforming google's datacenter network via optical circuit switches and software-defined networking](https://dl.acm.org/doi/10.1145/3544216.3544265)

Leon Poutievski, Omid Mashayekhi, Joon Ong, Arjun Singh, Mukarram Tariq,
Rui Wang, Jianan Zhang, Virginia Beauregard, Patrick Conner, Steve Gribble,
Rishi Kapoor, Stephen Kratzer, Nanfang Li, Hong Liu, Karthik Nagaraj,
Jason Ornstein, Samir Sawhney, Ryohei Urata, Lorenzo Vicisano, Kevin Yasumura,
Shidong Zhang, Junlan Zhou, Amin Vahdat, SIGCOMM, 2022

- wavelength division multiplexing (WDM): multiple stream on 1 optic fiber
    - data rate can vary per stream
- optical circuit switch (OCS): programmable mirror
    - make topology reconfigurable w/o manual operation
    - support any speed bc based on WDM
    - each block w/ 4 separate power domain (failure domain)
        - ⇒ 1 power failure only reduce 25% capacity
- direct connect architecture: rid spine,
    OCS directly connect high-speed aggregation block
    - bc spine & full bisection cost too much
    - blocking ⇒ traffic engineering (TE) & topology engineering
        - doable bc traffic mostly stable, topology more stable
    - weighted cost multi-path (WCMP) for TE
        - weights on aggregation blocks
- traffic matrix: directed demand between aggregation block
- Orion: software-defined networking (SDN) control plane for OCS
    - aggregation block run Orion domain controller
    - OCS group run Orion DCNI
        - DCNI: optical switched datacenter network interconnection layer
    - topology engineering controller change Orion DCNI
    - use separate control plane network; but collocate w/ data plane
    - fail static: continue w/ final config when fail
- traffic engineering
    - indirect path: may hop over another aggregation block to satisfy demand
        - hedging: reduce burst; use spare capacity
    - minimize maximum link utilization (MLU)
    - frequent: 15min at paper's time; 2-5min now
- topology engineering
    - only change topology when no feasible solution thru routing
    - traffic-aware topology; help w/ heterogeneous link capacity
    - manual rewiring + OCS reconfiguration
        - gradual rewiring a few links
        - capacity drop ≤25%
    - may reduce "stretch" for some traffic: path length per shortest path
    - infrequent: weeks at paper's time

### [Alibaba HPN- A Data Center Network for Large Language Model Training](https://dl.acm.org/doi/10.1145/3651890.3672265)

Kun Qian, Yongqing Xi, Jiamin Cao, Jiaqi Gao, Yichi Xu, Yu Guan, Binzhang Fu,
Xuemei Shi, Fangbo Zhu, Rui Miao, Chao Wang, Peng Wang, Pengcheng Zhang,
Xianlong Zeng, Eddie Ruan, Zhiping Yao, Ennan Zhai, Dennis Cai, SIGCOMM, 2024

- dense (not MoE) LLM training cause huge synchronized spike
- very few connection per network interface (\~10)
- 2 network: frontend standard Clos, backend for LLM training only
    - frontend has storage; handle inference
- backend:
- NIC per GPU + CPU; 8 CPU per host (server)
- intra-host network for each GPU e.g. NVLink (alongside NIC)
    - only CPU's NIC connect to frontend; GPU NIC connect to backend
- 136-host segment; +1/16 spare GPU in case of failure
- rail-optimized ToR: each GPU connected to alternating ToR other machines'
    GPU connect to
    - can go thru different ToR + NVLink for communication
    - mitigate biggest impact: ToR failure
- every other backend ToR connect another plane's aggregation block
    - 2-plane pod
    - avoid routing load imbalance from hash polarization
- multi-pod core layer: highly subscribed bc training fitted in 1 pod

### [NegotiaToR: Towards A Simple Yet Effective On-demand Reconfigurable Datacenter Network](https://arxiv.org/abs/2407.20045)

Cong Liang, Xiangli Song, Jing Cheng, Mowei Wang, Yashe Liu, Zhenhua Liu,
Shizhen Zhao, Yong Cui, SIGCOMM, 2024

- futuristic configurable ToR
- AWGR: dumb optical switch; smart ToR reconfigure path by
    sending different wavelength
    - nanosecond reconfiguration time
- each epoch: 1-bit message to indicate whether want to send to reconfigure
    - no centralized control
    - REQUEST, GRANT, ACCEPT message to establish connection

### [Running BGP in Data Centers at Scale](https://www.usenix.org/conference/nsdi21/presentation/abhashkumar)

Anubhavnidhi Abhashkumar, Kausik Subramanian, Alexey,reyev, Hyojeong Kim,
Nanda Kishore Salem, Jingyi Yang, Petr Lapukhov, Aditya Akella, Hongyi Zeng,
NSDI, 2021

- Facebook used BGP for DC network routing
    - tussle in software development: BGP already exist & has software
    - BGP rich policy; familiar operator
    - ⇒ fast startup
- no IGP bc OSPF does not scale
- emulate external BGP: each switch is 1 AS
- peer group: switch w/ same role, connected to same group
    - use very similar BGP policy
- use AS confederation for ASN assignment
    - group all ASN within each pod into 1 when advertise externally
    - uniform ASN assignment across DC, reuse if possible
    - avoid devastating buggy config via simulation & staged rollout
- each spine plane has unique ASN
- spine/fabric/rack switch: SSW/FSW/RSW
- infrastructure IP for switch, vs production IP for server
- aggregate route per rack/pod to minimize routing table
- reliability: pre-define backup paths using communities
    - backup path never leaves pod bc route aggregation
- maintainability: take switch offline w/ soft drain: LIVE → WARM → DRAINED
    - WARM: lower BGP pref.
- service availability: virtual IP (VIP), VIP advertise to rack switch,
    BGP anycast
    - move instance w/o changing routing config
- avoid BGP $O(n!)$ convergence time
    - minimize exploration scope to pod unless entire pod fail
- fast custom BGP impl: only needed feature
    - multi-threaded coroutine peer-thread
    - batch same-attribute import policy
    - policy cache for export
- multi-stage testing: unit, simulation, canary, phased deployment
    - BGP graceful restart: keep forwarding table
    - 2-3 weeks to change fleet

### [Orion: Google's Software-Defined Networking Control Plane](https://www.usenix.org/conference/nsdi21/presentation/ferguson)

Andrew D. Ferguson, Steve Gribble, Chi-Yao Hong, Charles Killian, Waqar Mohsin,
Henrik Muehe, Joon Ong, Leon Poutievski, Arjun Singh, Lorenzo Vicisano,
Richard Alimi, Shawn Shuoshuo Chen, Mike Conley, Subhasree Mandal,
Karthik Nagaraj, Kondapa Naidu Bollineni, Amr Sabaa, Shidong Zhang, Min Zhu,
Amin Vahdat, NSDI, 2021

- SDN: app write to state, controller read state & adjust
- generalized forwarding: forwarding table++; match any header field,
    do any action
- Orion: break up routing, network management,
    config management into microservices
- blast radius: \#device when controller failure
- inter-block controller (IBC) control controller in spine/aggregation block
- no fate sharing in SDN: dunno what failed when
    controller cannot reach switch
    - Orion identify switch state: (un)health/unknown
    - for unknown, initially fail-closed; if below capacity, fail-static
- out-of-band control plane except for ToR (in-band)
    - out-of-band break circular dependency, but expensive
- intent reconciliation from apps w/ state from switches
    - believe top-level authority on conflict
- packet-in: switch "punt" packet to core to ask for app intent
    - punt: redirect packet to slower path
- packet-out: controller instruction for switch
- architecture: core → network information base (NIB)
    → managers → OpenFlow front-end (OFE)
    - NIB: in-memory database & pub-sub broker of network state; non-durable
        - state, entity, relationship
    - topology manager & flow manager & config manager: microservice
    - weird bc microservice usually don't share memory
- eventual consistency; periodic reconciliation of state
    - hand shake not scale & need memory
- routing engine (RE): compute path from route & install path
    - topology abstraction: reduce part of topology to single node
        - handle within supernode
    - routing engine write flow → NIB pub → flow manager → OFE
    - route sequencing to avoid dropping current packets
        - reverse path order
        - only doable bc SDN has global view
- common library for app dev: NIB access, health monitoring,
    replication & leader election
- NIB failure: core start new instance, reconcile state from switch,
    get intent from config manager, reconcile intent w/ state
    - capability readiness: abstraction of various NIB states to barrier apps
- ToR in-band control (→50%) bc cost, else out-of-band for reliability
- integrate BGP for 2 WAN: B4 (data center) & B2 (public)
- routing app abstract BGP into 1 node; switch dumb only run OpenFlow
- (control) domain decomposition
    - physical domain vs virtual domain
- IBR-C virtual controller abstract spine/aggregation block as single node
    - inter-block routing central (IBR-C)
    - subscribe to NIB in spine&aggregation block
- switch/link failure: rm from forwarding table (fast),
    RE recompute path (slow)
- failure between blocks: IBR-C recompute WCMP path

### [Teal: Learning-Accelerated Optimization of WAN Traffic Engineering](https://dl.acm.org/doi/pdf/10.1145/3603269.3604857)

Zhiying Xu, Francis Y. Yan, Rachee Singh, Justin T. Chiu, Alexander M. Rush,
Minlan Yu, SIGCOMM, 2023

- want to distribute demand traffic among WAN optimally
- start w/ 4-8 path between each pair
- use GNN + RL to approximate bc inference fast
- FlowGNN: topology + demand
    - GNN node per edge pair & full path
    - GNN layer for capacity & demand constraint
    - train embedding for demand regardless of network size
- multi-agent RL learn traffic split
    - each demand as RL agent
- ADMM adjust infeasible solution from model
- fixed topology, learn using known traffic matrices

### [RedTE: Mitigating Subsecond Traffic Bursts with Real-time and Distributed Traffic Engineering](https://dl.acm.org/doi/pdf/10.1145/3651890.3672231)

Fei Gui, Songtao Wang, Dan Li, Li Chen, Kaihui Gao, Congcong Min, Yi Wang,
SIGCOMM, 2024

- centralized TE not handle burst within 5min
- put ML model on each router to respond to burst immediately
- model distinct for each router, trained in RL in same topology
- w/ real historical data

### [B4 and after: managing hierarchy, partitioning, and asymmetry for availability and scale in google's software-defined WAN](https://dl.acm.org/doi/10.1145/3230543.3230545)

Chi-Yao Hong, Subhasree Mandal, Mohammad Al-Fares, Min Zhu, Richard Alimi,
Kondapa Naidu B., Chandan Bhagat, Sourabh Jain, Jay Kaimal, Shiyu Liang,
Kirill Mendelev, Steve Padgett, Faro Rabe, Saikat Ray, Malveeka Tewari,
Matt Tierney, Monika Zahn, Jonathan Zolla, Joon Ong, Amin Vahdat, SIGCOMM, 2018

- ISP performance & availability insufficient for cloud for WAN
- ISP WAN low utilization for failure headroom: 30-40%
- scale back high-volume but elastic traffic Google control
- WAN router: 2-stage Clos from 128x10G merchant silicon
- hierarchical SDN
- site: 4 OpenFlow Agent (OFA) switch, at campus edge, connect to
    cluster & other site
- OFCs run Paxos failover
- started WAN w/ BGP/IS-IS (Quagga/RAP); as fallback
    - iBGP/IS-IS w/ other sites; eBGP w/ cluster
    - SDN control BGP by taking BGP update into RIB & sending update to
        switch
- flow group for same-priority app between 2 site
- allocate much demand for each flow group as possible
- tunnel group to group flow group w/ predetermined path
- bandwidth enforcer (BwE) collect demand & enforce rate limit by flow group
- SDN gateway collect failure & build topology & send to TE
- bandwidth proportional to apps' assigned `weight` (fair share)
    - ⇒ bandwidth function (complex fairness)
- changes bc 100x growth & larger network
- added availability requirement: service-level objective (SLO)
- service class vary from search (highest) to bulk transfer (lowest)
- increase WAN bandwidth by adding B4 site make TE expensive
- slow TE cause lower availability bc longer time to address link failure
- change to Stargate Site design w/ up to 4 supernode
    - by replacing switch w/ more links
    - 2-stage Clos, 32x40G chip
    - rid campus layer, direct site to clusters
- TE treat multiple links between site as
    single ⇒ cannot handle asymmetric link capacity
- use side link to allow links w/ different capacity
    - still have incoming traffic evenly distributed to supernodes
    - assume supernodes within site balance outgoing traffic
- incoming capacity need to be even split for TE
- hierarchical TE: site-level supernode-level
    - non-hierarchical TE doesn't scale, \~200x slower
    - hash-based load balancing harder
- tunnel split group (TSG) at supernode to split traffic per TG
- generate TSG & prove is DAG; sequence to avoid drop
- switch split group (SSG) program switches within supernode
- ACL table use TCAM to match flow; expensive&small
- longest prefix match (LPM) table use SRAM; large
- exploit ECMP table for WCMP cause space explosion
- TG from QoS label + prefix
- save memory: first match QoS to VRF (LPM), then use different VRF for
    prefix

### [Achieving high utilization with software-driven WAN](https://dl.acm.org/doi/10.1145/2486001.2486012)

Chi-Yao Hong, Srikanth Kandula, Ratul Mahajan, Ming Zhang, Vijay Gill,
Mohan Nanduri, Roger Wattenhofer, SIGCOMM, 2013

- WAN utilization⤴ thru reducing peak demand by exploiting latency-tolerance
- label-switching: forward based on MPLS header between layer 2&3
    - label-switching router (LSR); may rewrite label
- ISP did MPLS-TE, greedy label-switched path (LSP)
    assignment + capacity discovery ⇒ suboptimal&unfair
- SWAN want prioritization + fairness within class
- congestion-free ordering for route change
    - need scratch capacity for gradually shifting traffic over
- host track demand between service & DC, do rate limiting
- broker receive&aggregate demand, tell controller → host rate limiting
- network agents: topology state → controller
- controller compute allocation to service & change forwarding table
    - given pairwise demand, tunnel, link capacity, output fractions of
        flow over each tunnel
    - max-min fairness priority by priority
- multi-commodity flow (MCF): maximize allocation subject to
    demand&capacity constraint
    - leave scratch capacity for update
- approx. max-min fair for each bucket $[\alpha^{k-1}U,\alpha^kU)$
    - allocate rate within $\alpha$ of fair; larger $\alpha$ ⇒ less fair,
        faster
    - try allocating in exponential sizes iteratively
- save table space: greedily select max-traffic tunnel till table full
    - rerun optimization w/ fixed selected tunnel
- in-place traffic update: need congestion-free intermediate config
    - use spare capacity $s$, can do in $≤\lceil1/s\rceil-1$ step
    - use scratch capacity $\lambda$ to update tunnel set in
        $≤\lceil1/\lambda≥1$ step; tell service to send slow before start

### [EBB: Reliable and Evolvable Express Backbone Network in Meta](https://dl.acm.org/doi/10.1145/3603269.3604860)

Marek Denis, Yuanjun Yao, Ashley Hatch, Qin Zhang, Chiun Lin Lim,
Shuqiang Zhang, Kyle Sugrue, Henry Kwok, Mikel Jimenez Fernandez,
Petr Lapukhov, Sandeep Hebbani, Gaya Nagarajan, Omar Baldonado, Lixin Gao,
Ying Hang, SIGCOMM, 2023

### [OneWAN is better than two: Unifying a split WAN architecture](https://www.usenix.org/conference/nsdi23/presentation/krishnaswamy)

Umesh Krishnaswamy, Rachee Singh, Paul Mattes, Paul-Andre C Bissonnette,
Nikolaj Bjørner, Zahira Nasrin, Sonal Kothari, Prabhakar Reddy, John Abeln,
Srikanth Kandula, Himanshu Raj, Luis Irun-Briz, Jamie Gaudette, Erica Lan,
NSDI, 2023

### [Data center TCP (DCTCP)](https://dl.acm.org/doi/10.1145/1851182.1851192)

Mohammad Alizadeh, Albert Greenberg, David A. Maltz, Jitendra Padhye,
Parveen Patel, Balaji Prabhakar, Sudipta Sengupta, Murari Sridharan, SIGCOMM,
2010

- reduce congestion window (cwnd) per extent of congestion:
    #packets w/ ECN bit
- hard to estimate queue size by $\Delta RTT$ bc RTT small
- mark CE bit when queue size > some K
    - much simpler than RED
- override delayed ACK w/ immediate ACK when CE go from 0 to 1 or
    CE switch to 1
- delay is usually $m=2$
- "immediate"
    transmission have old ECN bit state bc receiver use ACK sequence to
    infer state transition
- reduce cwnd by $\frac{\alpha}$ where $\alpa=(1-g)\alpha+gF$ where
    F is fraction of marked packet in window and g is "gain"
- DCTCP keep queue small so no lost response
- model to estimate g and K w/ N synchronized sender w/ same cwnd
- DCTCP can maintain throughput compared to TCP w/ much smaller queue
- DCTCP prevent query delay increase & timeout on incast

### [Swift: Delay is Simple and Effective for Congestion Control in the Datacenter](https://dl.acm.org/doi/10.1145/3387514.3406591)

Gautam Kumar, Nandita Dukkipati, Keon Jang, Hassan M. G. Wassel, Xian Wu,
Behnam Montazeri, Yaogong Wang, Kevin Springborn, Christopher Alfeld,
Michael Ryan, David Wetherall, Amin Vahdat

- aim: low tail latency
- disaggregation of disk etc. mandate network capability
- also handle endpoint congestion
- need low CPU usage
- Swift: different transport protocol than TCP
    - async op stream e.g. read/write
    - user level, not kernel
    - kernel bypass: bake network stack into app,
        let it directly interface NIC
- delay-based congestion control: RTT increase signal more queuing; need to
    know accurate min RTT
- break RTT down to host + network
- AIMD to maintain E2E delay
- host congestion may be from receiver packet buffer
- delays: local NIC Tx, forward fabric, remote NIC Rx, reverse fabric,
    local NIC Rx…
- NIC timestamp packet w/ header at send/receive
- MD proportional to difference between delay and target delay
- congestion windows: ecwnd for endpoint, fcwnd for fabric; take min
- endpoint delay is average, others are instantaneous
- router w/ little buffer can cause cwnd < 1
- handle cwnd < 1, send packet after RTT/cwnd delay
    - almost every other protocol don't handle cwnd < 1
- no pacing when cwnd > 1 to reduce CPU cost from timer
- target delay: propagation, transmission; depend on distance &
    #concurrent flow
- estimate fabric target delay by linear scaling per hope
- queue grow per sqrt of concurrent flows; scale target queue by
    inverse sqrt cwnd

### [Demystifying NCCL: An In-depth Analysis of GPU Communication Protocols and Algorithms](https://arxiv.org/abs/2507.04786)

Zhiyi Hu, Siyuan Shen, Tommaso Bonato, Sylvain Jeaugey, Cedell Alexander,
Eric Spada, James Dinan, Jeff Hammond, Torsten Hoefler, arXiv, 2025

- collective communication, e.g. reliable broadcast
- scatter: shard data 1 to all other
- gather: collect shard from all to 1
- all reduce: reduce then broadcast; reduce scatter
- Nvidia Collective Communication Library (NCCL)
- NCl abstract communication into high-level API;
    auto choose transport protocol
- simple vs low latency vs low latency and high bandwidth transport protocol
- logical topology for transport e.g. ring/tree

### [Crux: GPU-Efficient Communication Scheduling for Deep Learning Training](https://dl.acm.org/doi/10.1145/3651890.3672239)

Jiamin Cao, Yu Guan, Kun Qian, Jiaqi Gao, Wencong Xiao, Jianbo Dong,
Binzhang Fu, Dennis Cai, Ennan Zhai, SIGCOMM, 2024

- consider either first party or third party GPU training job
- contention on either network or intra-host link
- GPU intensity, computation by max transmission time on any 1 link per job
- greedily assign high priority job first
- adjust priority based on communication-computation pattern of jobs

### [Network Virtualization in Multi-tenant Datacenters](https://www.usenix.org/conference/nsdi14/technical-sessions/presentation/koponen)

Teemu Koponen, Keith Amidon, Peter Balland, Martin Casado, Anupam Chanda,
Bryan Fulton, Igor Ganichev, Jesse Gross, Paul Ingram, Ethan Jackson,
Andrew Lambeth, Romain Lenglet, Shih-Hao Li, Amar Padmanabhan, Justin Pettit,
Ben Pfaff, Rajiv Ramanathan, Scott Shenker, Alan Shieh, Jeremy Stribling,
Pankaj Thakkar, Dan Wendlandt, Alexander Yip, Ronghua Zhang, NSDI, 2014

- overlay virtual network can have link not physically existing
- end-host virtualization: use host to do it; physical network do not know
    - overlay; more packet header
- in-network virtualization:
    switch know virtual network thru flow tables w/ tag in header
- usually do end-host virtualization

### [Andromeda: Performance, Isolation, and Velocity at Scale in Cloud Network Virtualization](https://www.usenix.org/conference/nsdi18/presentation/dalton)

Michael Dalton, David Schultz, Jacob Adriaens, Ahsan Arefin, Anshuman Gupta,
Brian Fahs, Dima Rubinstein, Enrique Cauich Zermeno, Erik Rubow,
James Alexander Docauer, Jesse Alpert, Jing Ai, Jon Olson, Kevin DeCabooter,
Marc de Kruijf, Nan Hua, Nathan Lewis, Nikhil Kasinadhuni, Riccardo Crepaldi,
Srinivas Krishnan, Subbaiah Venkata, Yossi Richter, Uday Naik, Amin Vahdat,
NSDI, 2018

### [Achelous: Enabling Programmability, Elasticity, and Reliability in Hyperscale Cloud Networks](https://dl.acm.org/doi/10.1145/3603269.3604859)

Chengkun Wei, Xing Li, Ye Yang, Xiaochong Jiang, Tianyu Xu, Bowen Yang,
Taotao Wu, Chao Xu, Yilong Lv, Haifeng Gao, Zhentao Zhang, Zikang Chen,
Zeke Wang, Zihui Zhang, Shunmin Zhu, Wenzhi Chen, SIGCOMM, 2023

### [Triton: A Flexible Hardware Offloading Architecture for Accelerating Apsara vSwitch in Alibaba Cloud](https://dl.acm.org/doi/abs/10.1145/3651890.3672224)

Xing Li, Xiaochong Jiang, Ye Yang, Lilong Chen, Yi Wang, Chao Wang, Chao Xu,
Yilong Lv, Bowen Yang, Taotao Wu, Haifeng Gao, Zikang Chen, Yisong Qiao,
Hongwei Ding, Yijian Dong, Hang Yang, Jianming Song, Jianyuan Lu, Pengyu Zhang,
Chengkun Wei, Zihui Zhang, Wenzhi Chen, Qinming He, Shunmin Zhu, SIGCOMM, 2024

### [Azure Accelerated Networking: SmartNICs in the Public Cloud](https://www.usenix.org/conference/nsdi18/presentation/firestone)

Daniel Firestone, Andrew Putnam, Sambhrama Mundkur, Derek Chiou,
Alireza Dabagh, Mike Andrewartha, Hari Angepat, Vivek Bhanu, Adrian Caulfield,
Eric Chung, Harish Kumar Chandrappa, Somesh Chaturmohta, Matt Humphrey,
Jack Lavier, Norman Lam, Fengfen Liu, Kalin Ovtcharov, Jitu Padhye,
Gautham Popuri, Shachar Raindel, Tejas Sapre, Mark Shaw, Gabriel Silva,
Madhan Sivakumar, Nisheeth Srivastava, Anshuman Verma, Qasim Zuhair,
Deepak Bansal, Doug Burger, Kushagra Vaid, David A. Maltz, Albert Greenberg,
NSDI, 2018

### [1RMA: Re-envisioning Remote Memory Access for Multi-tenant Datacenters](https://dl.acm.org/doi/10.1145/3387514.3405897)

Arjun Singhvi, Aditya Akella, Dan Gibson, Thomas F. Wenisch, Monica Wong-Chan,
Sean Clark, Milo M. K. Martin, Moray McLaren, Prashant Chandra, Rob Cauble,
Hassan M. G. Wassel, Behnam Montazeri, Simon L. Sabato, Joel Scherpelz,
Amin Vahdat, SIGCOMM, 2020

### [Empowering Azure Storage with RDMA](https://www.usenix.org/conference/nsdi23/presentation/bai)

Wei Bai, Shanim Sainul Abdeen, Ankit Agrawal, Krishan Kumar Attre,
Paramvir Bahl, Ameya Bhagat, Gowri Bhaskara, Tanya Brokhman, Lei Cao,
Ahmad Cheema, Rebecca Chow, Jeff Cohen, Mahmoud Elhaddad, Vivek Ette,
Igal Figlin, Daniel Firestone, Mathew George, Ilya German, Lakhmeet Ghai,
Eric Green, Albert Greenberg, Manish Gupta, Randy Haagens, Matthew Hendel,
Ridwan Howlader, Neetha John, Julia Johnstone, Tom Jolly, Greg Kramer,
David Kruse, Ankit Kumar, Erica Lan, Ivan Lee, Avi Levy, Marina Lipshteyn,
Xin Liu, Chen Liu, Guohan Lu, Yuemin Lu, Xiakun Lu, Vadim Makhervaks,
Ulad Malashanka, David A. Maltz, Ilias Marinos, Rohan Mehta, Sharda Murthi,
Anup Namdhari, Aaron Ogus, Jitendra Padhye, Madhav Pandya, Douglas Phillips,
Adrian Power, Suraj Puri, Shachar Raindel, Jordan Rhee, Anthony Russo,
Maneesh Sah, Ali Sheriff, Chris Sparacino, Ashutosh Srivastava, Weixiang Sun,
Nick Swanson, Fuhou Tian, Lukasz Tomczyk, Vamsi Vadlamuri, Alec Wolman,
Ying Xie, Joyce Yom, Lihua Yuan, Yanzhao Zhang, Brian Zill, NSDI, 2023

### [Harmonic: Hardware-assisted RDMA Performance Isolation for Public Clouds](https://www.usenix.org/conference/nsdi24/presentation/lou)

Jiaqi Lou, Xinhao Kong, Jinghan Huang, Wei Bai, Nam Sung Kim, Danyang Zhuo,
NSDI, 2024

### [Maglev: A Fast and Reliable Software Network Load Balancer](https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud)

Danielle E. Eisenbud, Cheng Yi, Carlo Contavalli, Cody Smith, Roman Kononov,
Eric Mann-Hielscher, Ardas Cilingiroglu, Bin Cheyney, Wentao Shang,
Jinnah Dylan Hosein, NSDI, 2016

### [Ananta: cloud scale load balancing](https://dl.acm.org/doi/10.1145/2486001.2486026)

Parveen Patel, Deepak Bansal, Lihua Yuan, Ashwin Murthy, Albert Greenberg,
David A. Maltz, Randy Kern, Hemant Kumar, Marios Zikos, Hongyu Wu,
Changhoon Kim, Naveen Karri, SIGCOMM, 2013

### [Network Load Balancing with In-network Reordering Support for RDMA](https://dl.acm.org/doi/10.1145/3603269.3604849)

Cha Hwan Song, Xin Zhe Khooi, Raj Joshi, Inho Choi, Jialin Li, Mun Choon Chan,
SIGCOMM, 2023

### [End-User Mapping: Next Generation Request Routing for Content Delivery](https://dl.acm.org/doi/10.1145/2785956.2787500)

Fangfei Chen, Ramesh K. Sitaraman, Marcelo Torres, SIGCOMM, 2015

### [Analyzing the Performance of an Anycast CDN](https://dl.acm.org/doi/10.1145/2815675.2815717)

Matt Calder, Ashley Flavel, Ethan Katz-Bassett, Ratul Mahajan, Jitendra Padhye,
IMC, 2015

### [Taking the Edge off with Espresso: Scale, Reliability and Programmability for Global Internet Peering](https://dl.acm.org/doi/10.1145/3098822.3098854)

Kok-Kiong Yap, Murtaza Motiwala, Jeremy Rahe, Steve Padgett, Matthew Holliman,
Gary Baldus, Marcus Hines, Taeeun Kim, Ashok Narayanan, Ankur Jain, Victor Lin,
Colin Rice, Brian Rogan, Arjun Singh, Bert Tanaka, Manish Verma, Puneet Sood,
Mukarram Tariq, Matt Tierney, Dzevad Trumic, Vytautas Valancius, Calvin Ying,
Mahesh Kallahalla, Bikash Koley, Amin Vahdat, SIGCOMM, 2017

[EdgeFabric](https://sichanghe.github.io/notes/class_notes/csci651.html#engineering-egress-with-edge-fabric-steering-oceans-of-content-to-the-world-brandon-schlinker-hyojeong-kim-timothy-cui-ethan-katz-bassett-harsha-v-madhyastha-italo-cunha-james-quinn-saif-hasan-petr-lapukhov-hongyi-zeng)
