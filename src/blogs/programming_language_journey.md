# My Programming Language Journey: How I Ended Up Using Rust and Python Most After Trying A Dozen Languages

> And really, what's with the love for all those programming languages?
> Trying to set a record for indecisiveness?
>
> —[GitHub
> Roaster](https://github-roast.pages.dev/share/sichanghe/?lang=english)

According to GitHub, I used over 30 computer languages,
making a primary target for GitHub Roaster.
Unfortunately, my lasting addiction in
exploring different programming languages has not found me a perfect match.
I have been tolerating Python and Rust for most of my projects, with Python for
scripting and Rust for when the Python code becomes too complex or slow.

![Most owned code in SichangHe's GitHub
repositories](https://raw.githubusercontent.com/SichangHe/gh_metrics/main/github-metrics.svg)

Sometimes,
I wonder how my language learning journey influenced my current choices and
liking. Would I have ended up choosing Go if I did not start with Java?
Maybe I would have been a Kotlin boy if I did not learn Rust?
In this memo, I would like to recall my journey,
including the dark history I do not bring up, and
look at how I ended up stuck with the snake and the crab languages and
said no to the rat and the girl languages.

## Before the beginning

I said I started with Java, but that is technically not true.

When I was in my 6th grade, I was left at a friend's house for a few days.
During the day, I was alone, and looked around their house for books to
read—one of them being a C introductory book.
I remember reading a few chapters about control flows, thinking that
was nothing nerdy and high-profile.
In retrospect, those few hours probably had a significant impact later.

In the IT course in my middle school, we were taught a CAPITALIZED LANGUAGE for
programming graphical interfaces. This was probably Visual BASIC.
I remember the absolute chaos in the computer labs with everyone trying to
get online and play video games and the teacher hardly having patient to teach.
Despite how bad I was at typing tests, I aced the programming exam,
probably because of the C book I read a year ago.

I would move on to write automation scripts to play video games in high school.
Those programs are much more sophisticated than the BASIC ones because some of
them were to automate finishing game levels.
That was probably when I learned to debug by running the program again and
again, but
I apparently did not gain a deep understanding—sometimes things just did not
work without apparent reasons.

Going into university, I swore I would not become a programmer because
computers are so unreliable and annoying. Boy, was I wrong.
I now blame that feeling on Microsoft Windows.

## My first programming languages

The experience learning my first programming language fundamentally set my
expectations for any programming languages and influenced my taste to this day.

Entering university, my perception of programming was completely changed.
I was shocked in Physics and
Chemistry classes seeing people programming Python in the labs to
run experiments.
There were master's students persuading me to learn computer science,
saying that a computer science major can move to most other fields easily, but
not the other way around.
Suddenly, I wanted to try programming again and
started watching Python video tutorials online.

Unfortunately, I did not learn Python by watching videos, and
computer science at my university sucked.
My peers told me that the entry level computer science course on
Python was a waste of time, and advised me to
straight-up take the higher-level course on Java. I took their advice and
started learning Java instead of Python.
I should thank these people for changing my life if I remember who they were.

Java, despite being the meme boilerplate-driven instant-legacy language,
was a good first language, in retrospect.
Unlike Python, which
gives its learners false confidence about their abilities to program
(despite often not being able to type out correct syntax), Java causes pain in
all areas of its learners' brains, greatly helping them remember the syntax.
Although instructors like to teach programming like a philosophy, it is not.
Getting started at programming is more like learning to
play a musical instrument or sport—you need to build muscle memory so
you can play at all! Then, you can learn to appreciate the philosophy.
This is why I programmed more smoothly with languages with more syntax and
later felt at home with Rust.

Another huge influence Java had on me was the development environment.
I followed video instructions to learn IntelliJ IDEA.
To this day, I still see JetBrains IDEs as absolute models in terms of
auto-completion, refactoring, and code suggestions, despite how bloated and
non-customizable they are.
This is why I find VSCode lacking for Java and Kotlin, and
why I did not like Python, Julia, or Ruby when
I tried them—I got no method autocompletion or type hints in the editor.
Python has since caught up with various language servers, but
the lacking editor experience is still holding me back from
Julia the girl language.

Liked it or not, I was forced to learn Python again and use it for
my first collaborative project.
Another student was scraping our university websites and
making a custom search engine.
I did not grasp Python concurrency and
had speed problems crawling the websites. I blamed this on Python being slow.

## I fell into the crab hole 🦀🕳️

Since Python was so slow, my logical choice was to speed it up, but
I ended up in a completely different rabbit—or rather "crab" hole.
The seemingly lazy methods like Cython and
PyPy all showed major pitfalls quickly, so I started watching videos on how to
write Python packages in C and C++ and
disliked how they awfully incremented and
decremented the reference pointers manually.
By pure chance, I heard one of the videos mention "you might as well use Rust".
"There is another language that is not C or C++ that
you can write Python packages in??" I was in surprise.

As I dug deeper into what Rust was, it sounded too good.
It was fast as C++; but unlike C++,
it had Python-like syntax I could understand,
straightforward high-level abstractions like Java, error messages that
says what is wrong, and a package manager; and it did not
`Segmentation Fault. Core dumped`.
It was 2022, the peak of the Rust hype; there were lots of
conference talks introducing Rust. From these talks,
I started getting a feel of the basic syntax and concepts.
Ownership, the `Result` enumeration type,
lifetime somehow all made perfect sense to me, perhaps because
I was already used to analytical thinking from learning too much math.
So, I read the first half of the book *The Rust Programming Language* and
translated some Python programs to Rust. Everything made sense and
the programs got 40x faster with basically the same structures. I was sold.

That was when I deviated from trying to write Python packages in Rust to
directly writing Rust programs.
I found Rust libraries for HTTP requests, and how to
do basically the same things I did with the Python crawler in
async Rust. Oh boy, was async Rust a bait!
I shot myself in the foot so many times: mutex guards across `.await`
causing errors, async timeouts not timing out, and deadlocks.
Rust is definitely not a language you can hack around; you need to
understand the concepts behind what you are doing.

The instructor advising the search engine project, however,
liked hacking around and disliked Rust. "I think it is beyond you,"
he even suggested. I was pissed.
That drove me to finish the [Tokio book](https://tokio.rs/tokio/tutorial) and
later learn more advanced topics in Rust. One thing he said was true, though:
having to wait for the code to compile sucks.
However, these problems are tiny compared to the lack of
an established ecosystem, which I gradually realized when trying to
replace all the Python packages we used.

All in all, Rust was and has been a great experience for me.
It requires thinking thoroughly about the task at hand and
being explicit about all the types and sometimes the lifetimes; in exchange,
it offers a rich development environment, robust compile-time checks, and
top-tier speed.
Rust also introduced me to pattern matching, algebraic data types, and
the iterator pattern, which are the main reasons I say no to
other imperative languages.

## What about…

As I mentioned, I have never been fully satisfied with Python and Rust and
peeked at a dozen other languages.
I have wanted something that helps out with
extensive compile-time checks like Rust but without the type gymnastics, and
taps into a vast ecosystem like Python but
without the atrocious performance and multicore solutions.

The languages that stand out are the ones I tried for the ecosystem argument:
they have packages or frameworks for specific tasks like Ruby on
Rails. I still place these languages as my go-to for specific tasks.

- Python for scripting, as a better Bash, and anything related to
    data science.
- Elixir for web backend (and perhaps frontend) and
    any complicated distributed systems.
- JavaScript for web frontend.
- Dart for mobile development.

Unfortunately, since I was spoiled by some of Rust's outstanding benefits,
other languages I tried did not stick:

- Julia and Ruby had too much implicit magic and poor editing environments.
- Go lacked basic abstractions like string methods, and
    its error checking is long-winded.
- Kotlin is nice but its abstractions like `Array.map` cost performance and
    it only really works well in heavy JetBrains IDEs.
- Scheme hurts the eyes when doing simple math.
- Swift, Nim, Gleam had almost no ecosystems.
- Ocaml and F#, I had no idea what their package managers were doing that
    took tens of minutes when I first tried them. I still want to try F# again.
- Zig and Mojo sounded nice, but neither of them had pattern matching and
    neither are stabilized (1.0) yet.

---

*Started 2024-12-27*
