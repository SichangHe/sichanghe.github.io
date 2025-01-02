# My Programming Language Journey: How I Ended Up Using Rust and Python Most After Trying A Dozen Languages

According to GitHub, I used over 30 computer languages, which
[GitHub Roaster][gh-roaster] calls "[t]rying to set a record for
indecisiveness".
Unfortunately, my lasting addiction in
exploring different programming languages has not found me a perfect match.
I have been tolerating Python and Rust for most of my projects, with Python for
scripting and Rust for when the Python code becomes too complex or slow.

[![Fake languages stats (most owned code in
repositories)][most-used-lang]][most-used-lang]

Sometimes,
I wonder how my language learning journey influenced my current choices and
liking. Would I have ended up choosing Go if I did not start with Java?
Maybe I would have been a Kotlin boy if I did not learn Rust?
In this memo, I would like to recall my journey,
including the dark history I do not bring up, and
look at how I ended up stuck with the snake and the crab languages and
saying no to the rat and the girl languages.

## Before the beginning

I said I started with Java, but that is technically not true.

When I was in my 6th grade, I was left at a friend's house for a few days.
During the day, I was alone, and looked around their house for books to
read—one of them being a C introductory book.
I remember reading a few chapters about control flows, thinking that
was nothing nerdy and high-profile.
In retrospect, those few hours probably had a significant impact on my future.

In my middle school, we were taught in the IT course a CAPITALIZED LANGUAGE for
programming graphical interfaces. This was probably Visual BASIC.
I remember the absolute chaos in the computer rooms with everyone trying to
get online and play video games and the teach hardly patient to teach.
Despite how bad I was at typing tests, I aced the programming exam,
probably because of the C book I read a year ago.

I would move on to write automation scripts to play video games in high school.
Those programs are much more sophisticated than the IT course ones because
some of them effectively finished game levels automatically.
That was probably when I learned to debug by running the program again and
again, but I apparently did not grasp it—sometimes things just did not work and
I had no idea why.

Going into university, I swore I would not program again because
computers just do not work reliably. Boy, was I wrong.
I now blame that feeling on Microsoft Windows, though.

## First programming languages

My experience learning my first programming language fundamentally set my
expectations for a programming language and influence my taste to this day.

Entering university, my perception of programming was completely changed.
I was shocked in Physics and
Chemistry classes seeing people programming Python in the labs to
run experiments.
There were master's students talking to me,
telling me an undergrad majoring computer science can move to
most other fields in a master's, but not the other way around.
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
was a good first language in retrospect.
Unlike Python, which
gives its learners false confidence about their abilities to program
(despite often not being able to type out correct syntax), Java causes pain in
all areas of its learners' brains, a process that
greatly helps them remember the syntax.
Although instructors like to teach programming as if it is some like of
philosophy, it is not.
Getting started at programming is more like learning to
play a musical instrument—you need to build muscle memory so
you can play at all, then you can learn to appreciate the philosophy.
This is why I programmed more smoothly with languages with more syntax and
later felt at home with Rust.

Another huge influence Java had on me was the development environment.
I followed video instructions to learn IntelliJ IDEA.
To this day, I still see JetBrains IDEs as absolute models in terms of
auto-completion, refactoring, and code suggestions.
This is why, when I first moved to VSCode, I found it lacking.
It is also why I did not like Python, Julia, or Ruby when
I tried them—I got no method choices or type hints when typing in the editor.
Python has since caught up with various language servers, but
the lacking editor experience is still holding me back from the Julia girl.

Liked it or not, I was forced to learn Python again and use it for
my first project.
Another student came up with this project of
scraping our university's websites and making a custom search engine.
I unfortunately did not grasp Python concurrency and
had speed problems crawling the websites. I blamed this on Python being slow.

## The crab hole 🦀🕳️

Since Python was so slow, I searched about how to speed it up, but ended up in
a completely different rabbit—or crab hole.
The effortless methods like Cython did not work for me, so
I started watching videos on how to write Python packages in C and C++ and
saw how they awfully incremented and
decremented the reference pointers manually.
By pure chance, I heard one of the videos mention "you might as well use Rust".
"What is Rust?
Is it a language?" I thought in surprise, "is there ever another language that
is not C or C++ that you can write Python packages in?"

As I dug deeper into what Rust was, it sounded too good.
It was fast as C++, but unlike C++,
it had Python-like syntax I could understand,
straightforward high-level abstractions like Java, error messages that
says what is wrong, and a package manager, and it did not have
`Segmentation Fault. Core dumped`.
It was 2022, the peak of the Rust hype; and there were lots of
conference talks introducing Rust. From these talks,
I started getting a feel of the basic syntax and concepts.
Ownership, the `Result` enumeration, lifetime somehow all made sense to me,
perhaps because I was already used to analytical thinking from learning math.
So, I read the first half of the book *The Rust Programming Language* and
translated some Python programs to Rust. Everything made sense and
the programs got 40x faster with basically the same structures.

That was when I deviated from trying to write Python packages in Rust to
directly writing Rust programs.
I found Rust libraries for HTTP requests, and how to
do basically the same things I did with the Python crawler in Rust.

## Requirements for the perfect language

From time to time, I wonder if I am missing out on a better language:
something that helps out with extensive compile-time checks like Rust but
without the type gymnastics, and taps into a vast ecosystem like Python but
without the atrocious performance and multicore stories. I have not.

## Case for specialization

To be fair, I do recognize the value of specific languages for specific tasks,
such as Elixir for web backend and JavaScript for web frontend.

---

*Started 2024-12-27*

[gh-roaster]: https://github-roast.pages.dev/share/sichanghe/?lang=english
[most-used-lang]: https://raw.githubusercontent.com/SichangHe/gh_metrics/main/github-metrics.svg
