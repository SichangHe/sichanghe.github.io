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
        - 2-stage give $k^3/4$ port, $l$-stage give $2^{-l}k^{l+1}$
- Firehose: 32up, 32down aggregation block each made of Clos of 8-port switch
    - each ToR connect to 2 aggregation block
    - deployed side-by-side w/ legacy network; big red button (fallback)
- Watchtower: 128-port line card from 3 layer of 8x 16-port switch chip
    - standardized design for economic of scale
    - optical fiber
- Saturn: similar to Firehose but w/ 288-port line card from 12x 24-port chip
    - ToR: 4up 20down (5:1 oversubscription) or 8up 16down
        (2:1 oversubscription)
- Juniper: w/ 16x40G or 64x10G switch chip
    - 128-port centauri chassis from 4 switch chip (not interconnected)
    - 64up 256down blocking middle block from 4 centauri
    - aggregation block from 8 middle block
    - spine block from 6 centauri; 128down to 64x aggregation block
        (2x redundancy)
    - incremental: build aggregation block first, spine later
- external connection: cluster block router (CBS), work like normal racks
    - much larger internal traffic than external
    - choose this bc any racks can have all external bandwidth
    - freedome block (FDB): freedome border router (FBR)
        \+ freedome edge router (FER)
        - ??
    - datacenter freedome (DFD): 4x FDB to campus layer
    - campus freedome (CFD): 4x FDB to WAN
- routing for full bisection bandwidth
    - equal-cost multi-path (ECMP)
        - same path per flow, e.g., hash flow 5-tuple
    - centralized routing
        - work bc topology very regular
        - switch (client) tell Firepath master state w/ BGP update
        - master provide 1 default route for outgoing traffic,
            aggregate incoming traffic into a single IP prefix
        - ??

### [Jupiter evolving: transforming google's datacenter network via optical circuit switches and software-defined networking](https://dl.acm.org/doi/10.1145/3544216.3544265)

Leon Poutievski, Omid Mashayekhi, Joon Ong, Arjun Singh, Mukarram Tariq,
Rui Wang, Jianan Zhang, Virginia Beauregard, Patrick Conner, Steve Gribble,
Rishi Kapoor, Stephen Kratzer, Nanfang Li, Hong Liu, Karthik Nagaraj,
Jason Ornstein, Samir Sawhney, Ryohei Urata, Lorenzo Vicisano, Kevin Yasumura,
Shidong Zhang, Junlan Zhou, Amin Vahdat, SIGCOMM, 2022

### [Alibaba HPN- A Data Center Network for Large Language Model Training](https://dl.acm.org/doi/10.1145/3651890.3672265)

Kun Qian, Yongqing Xi, Jiamin Cao, Jiaqi Gao, Yichi Xu, Yu Guan, Binzhang Fu,
Xuemei Shi, Fangbo Zhu, Rui Miao, Chao Wang, Peng Wang, Pengcheng Zhang,
Xianlong Zeng, Eddie Ruan, Zhiping Yao, Ennan Zhai, Dennis Cai, SIGCOMM, 2024

### [NegotiaToR: Towards A Simple Yet Effective On-demand Reconfigurable Datacenter Network](https://arxiv.org/abs/2407.20045)

Cong Liang, Xiangli Song, Jing Cheng, Mowei Wang, Yashe Liu, Zhenhua Liu,
Shizhen Zhao, Yong Cui, SIGCOMM, 2024

### [Running BGP in Data Centers at Scale](https://www.usenix.org/conference/nsdi21/presentation/abhashkumar)

Anubhavnidhi Abhashkumar, Kausik Subramanian, Alexey,reyev, Hyojeong Kim,
Nanda Kishore Salem, Jingyi Yang, Petr Lapukhov, Aditya Akella, Hongyi Zeng,
NSDI, 2021

### [Orion: Google's Software-Defined Networking Control Plane](https://www.usenix.org/conference/nsdi21/presentation/ferguson)

Andrew D. Ferguson, Steve Gribble, Chi-Yao Hong, Charles Killian, Waqar Mohsin,
Henrik Muehe, Joon Ong, Leon Poutievski, Arjun Singh, Lorenzo Vicisano,
Richard Alimi, Shawn Shuoshuo Chen, Mike Conley, Subhasree Mandal,
Karthik Nagaraj, Kondapa Naidu Bollineni, Amr Sabaa, Shidong Zhang, Min Zhu,
Amin Vahdat, NSDI, 2021

### [Teal: Learning-Accelerated Optimization of WAN Traffic Engineering](https://dl.acm.org/doi/pdf/10.1145/3603269.3604857)

Zhiying Xu, Francis Y. Yan, Rachee Singh, Justin T. Chiu, Alexander M. Rush,
Minlan Yu, SIGCOMM, 2023

### [RedTE: Mitigating Subsecond Traffic Bursts with Real-time and Distributed Traffic Engineering](https://dl.acm.org/doi/pdf/10.1145/3651890.3672231)

Fei Gui, Songtao Wang, Dan Li, Li Chen, Kaihui Gao, Congcong Min, Yi Wang,
SIGCOMM, 2024

### [B4 and after: managing hierarchy, partitioning, and asymmetry for availability and scale in google's software-defined WAN](https://dl.acm.org/doi/10.1145/3230543.3230545)

Chi-Yao Hong, Subhasree Mandal, Mohammad Al-Fares, Min Zhu, Richard Alimi,
Kondapa Naidu B., Chandan Bhagat, Sourabh Jain, Jay Kaimal, Shiyu Liang,
Kirill Mendelev, Steve Padgett, Faro Rabe, Saikat Ray, Malveeka Tewari,
Matt Tierney, Monika Zahn, Jonathan Zolla, Joon Ong, Amin Vahdat, SIGCOMM, 2018

### [Achieving high utilization with software-driven WAN](https://dl.acm.org/doi/10.1145/2486001.2486012)

Chi-Yao Hong, Srikanth Kandula, Ratul Mahajan, Ming Zhang, Vijay Gill,
Mohan Nanduri, Roger Wattenhofer, SIGCOMM, 2013

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

### [Swift: Delay is Simple and Effective for Congestion Control in the Datacenter](https://dl.acm.org/doi/10.1145/3387514.3406591)

Gautam Kumar, Nandita Dukkipati, Keon Jang, Hassan M. G. Wassel, Xian Wu,
Behnam Montazeri, Yaogong Wang, Kevin Springborn, Christopher Alfeld,
Michael Ryan, David Wetherall, Amin Vahdat

### [Crux: GPU-Efficient Communication Scheduling for Deep Learning Training](https://dl.acm.org/doi/10.1145/3651890.3672239)

Jiamin Cao, Yu Guan, Kun Qian, Jiaqi Gao, Wencong Xiao, Jianbo Dong,
Binzhang Fu, Dennis Cai, Ennan Zhai, SIGCOMM, 2024

### [Demystifying NCCL: An In-depth Analysis of GPU Communication Protocols and Algorithms](https://arxiv.org/abs/2507.04786)

Zhiyi Hu, Siyuan Shen, Tommaso Bonato, Sylvain Jeaugey, Cedell Alexander,
Eric Spada, James Dinan, Jeff Hammond, Torsten Hoefler, arXiv, 2025

### [Andromeda: Performance, Isolation, and Velocity at Scale in Cloud Network Virtualization](https://www.usenix.org/conference/nsdi18/presentation/dalton)

Michael Dalton, David Schultz, Jacob Adriaens, Ahsan Arefin, Anshuman Gupta,
Brian Fahs, Dima Rubinstein, Enrique Cauich Zermeno, Erik Rubow,
James Alexander Docauer, Jesse Alpert, Jing Ai, Jon Olson, Kevin DeCabooter,
Marc de Kruijf, Nan Hua, Nathan Lewis, Nikhil Kasinadhuni, Riccardo Crepaldi,
Srinivas Krishnan, Subbaiah Venkata, Yossi Richter, Uday Naik, Amin Vahdat,
NSDI, 2018

### [Network Virtualization in Multi-tenant Datacenters](https://www.usenix.org/conference/nsdi14/technical-sessions/presentation/koponen)

Teemu Koponen, Keith Amidon, Peter Balland, Martin Casado, Anupam Chanda,
Bryan Fulton, Igor Ganichev, Jesse Gross, Paul Ingram, Ethan Jackson,
Andrew Lambeth, Romain Lenglet, Shih-Hao Li, Amar Padmanabhan, Justin Pettit,
Ben Pfaff, Rajiv Ramanathan, Scott Shenker, Alan Shieh, Jeremy Stribling,
Pankaj Thakkar, Dan Wendlandt, Alexander Yip, Ronghua Zhang, NSDI, 2014

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
