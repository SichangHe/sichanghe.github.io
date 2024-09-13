# start

*2022-03-17*

I have this feeling that I am about to be unable to write.

Been having all sorts of math, stats, and CS courses,
there is really not much writing to do.
DKU provides little paper to write, specifically, little literature-ish things.

All said, I decided to start writing diaries.
Not for people to read, but more for me to stay sane on the writing side.

## choice for the diary

### my take on blogs

Some people have blogs.

It's a good idea to have your things on the web,
so it lasts longer than your local file,
or worse, a piece of paper made in the 2020s.
But, I dislike the idea that you write something solely about yourself
for others to read.

That does not affect my adoption of the shell of blogs.
I will put this diary on the web.

### generate HTML

To post something on the web, you need HTML,
and there are different ways to make HTML.

#### WordPress

The most popular way is [WordPress](https://wordpress.com).

> 43% of the web is built on WordPress.
> More bloggers, small businesses,
> and Fortune 500 companies use WordPress than all other options combined.
> Join the millions of people that call WordPress.com home.

What a great ad from WordPress themselves!
I would have fallen for it if I did not know how bloated WordPress is.

The [DKU website](https://dukekunshan.edu.cn) itself runs WordPress.
And, the performance is "insane".
You can open a small webpage in 5 seconds!
Imagine?
And also some webpage in 30 seconds!
Amazing!

The [Intersection](intersections@dukekunshan.edu.cn) uses WordPress for its website
(not published yet).
I saw the source code it generates for a simple article:
*7 layers of nested divs!*
And, it also has "insane" performance.

If I look back from the future and see WordPress's dominance,
what would I think?
People were crazy?

No, people are lazy and will not change if things work.

#### hand write

It is possible,
but the HTML part probably would take much more time than the text part.

Plus, the CSS part would be the most annoying.

#### Markdown

Markdown is a lightweight markup language that looks nice as source code.
It is rendered by converting to HTML.

I feel fast and delightful writing Markdown for my notes.
Also, I used Markdown to write presentation slides and it is just minimum effort.

Without more trash talk,
it is sure that I would choose Markdown if possible.

But, what flavor?

### Markdown flavor

Markdown has a shit ton of different flavors.

Some does not eat your `\n`,
some support \\(\TeX\\),
and some support PHP.

What I need is:

1. Math support
1. Code block support/ highlighting
1. Nice look
1. Simplicity
1. Git friendliness (short lines)
1. Live Preview

I ended up considering [Hugo](https://gohugo.io)
and [mdBook](https://rust-lang.github.io/mdBook/index.html)
only for fast and simple Markdown-HTML conversion.

#### Hugo

I found Hugo by searching Markdown website
(or something like that) for DKU iGEM Wiki
(a future thing).
It is marketed as an easy-to-use and *fastest* static site generator.

It has many themes that the community made.
Most of them look like PowerPoint templates (no offense).

I spent way too much time looking around to find a nice looking theme,
and found [hugo-book](https://github.com/alex-shpak/hugo-book)
and [Doks](https://github.com/h-enk/doks).

`hugo-book` just looks like a crappy version of GitBook,
might as well use GitBook.
But, GitBook is "converted" from open source to "proprietary services"
(what a shame).
Might as well use mdBook which is still open source.

`Doks` look nice,
but it shocked me by taking 500MB on my disk
(how does some HTML and CSS text take so much space?).
It is absolutely not anything lightweight,
and it reminds me of WordPress…

Without a good theme,
I have no `Nice look` nor `Simplicity`
and I need to implement Math support and Code highlighting myself
(which, is just adding some `<link>` on top of the file,
but still, annoying).
Also, some themes I tried are buggy
and do not even work if I added the math support.

#### mdBook

mdBook basically supports everything I mentioned out of the box.

The "downside" is that it has only 5 themes
(which you can try by clicking the brush top-left),
and they all have the same structure.
However, I don't need a thousand custom themes that are crappy,
instead, one good theme is good.

It saves me the burden to fight with CSS (great!).

That is why you are seeing this diary in mdBook form.

## web server

I need a server to host the diary.

I can host it on my machine,
but a domain name is just a waste of money in my opinion.
And, getting a paid server provider is the same.

Then, I saw GitHub as a free service provider:
GitHub pages.
And, it actually does the thing:
host your website.
It also is fast.

The downside is that GitHub is blocked from PRC using DNS pollution
(or something).
GitLab is not and it works in PRC.
However, I do not like the GitLab interface,
and GitLab is much slower and laggier.

Eventually, I decided to choose GitHub.

## coda

That will do.
I just "wasted" a whole morning on this thing.

Now, I will go to lunch and then put this on GitHub.
