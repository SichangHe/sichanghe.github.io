# What Does an mdBook Preprocessor Do—Code Walk-through of mdBook-KaTeX

What does [mdBook-KaTeX](https://github.com/lzanini/mdbook-katex) do?
It is an mdBook preprocessor that pre-renders math expressions.
For example, if you have this following snippet in your book:

```markdown
Define $f(x)$:

$$
f(x)=x^2\\
x\in\R
$$
```

mdBook-KaTeX would pre-rendered it as:

```markdown
Define <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord mathnormal" style="margin-right:0.10764em;">f</span><span class="mopen">(</span><span class="mord mathnormal">x</span><span class="mclose">)</span></span></span></span>:

<span class="katex-display"><span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord mathnormal" style="margin-right:0.10764em;">f</span><span class="mopen">(</span><span class="mord mathnormal">x</span><span class="mclose">)</span><span class="mspace" style="margin-right:0.2778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right:0.2778em;"></span></span><span class="base"><span class="strut" style="height:0.8641em;"></span><span class="mord"><span class="mord mathnormal">x</span><span class="msupsub"><span class="vlist-t"><span class="vlist-r"><span class="vlist" style="height:0.8641em;"><span style="top:-3.113em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight">2</span></span></span></span></span></span></span></span></span><span class="mspace newline"></span><span class="base"><span class="strut" style="height:0.5782em;vertical-align:-0.0391em;"></span><span class="mord mathnormal">x</span><span class="mspace" style="margin-right:0.2778em;"></span><span class="mrel">∈</span><span class="mspace" style="margin-right:0.2778em;"></span></span><span class="base"><span class="strut" style="height:0.6889em;"></span><span class="mord mathbb">R</span></span></span></span></span>
```

and then feed it back to mdBook.

All the HTML tags might look a bit scary,
but this is what all HTML-based math renderers do—generate a load of
nested tags. It enables the expressions to look nice in a browser.

Most renderers just do this in the browser after the users load the webpage.
mdBook-KaTeX lets you pre-render upfront,
so the browser would not need to run any JavaScript.

In this article, however,
I want to focus on the other side of
mdBook-KaTeX instead—mdBook-KaTeX as an mdBook preprocessor.

## Topic: what an mdBook preprocessor does

What does an mdBook preprocessor do?
Well, in a nutshell,
[mdBook preprocessors](https://rust-lang.github.io/mdBook/format/configuration/preprocessors.html)
are used to customize
[mdBook](https://github.com/rust-lang/mdBook/tree/master), the static site
generator used to render
[*The Rust Programming Language*](https://doc.rust-lang.org/book/).
Preprocessors read the loaded book data from mdBook, manipulate them,
and pass them back to mdBook.

This sounds abstract, though, so let's dive into what mdBook-KaTeX does,
with simplified code, as a concrete example.

## mdBook-KaTeX as a CLI App

mdBook-KaTeX is, firstly,
a Command Line Interface
(CLI) App written in Rust. It uses
[Clap](https://github.com/clap-rs/clap) to parse the arguments passed in:

```sh
$ mdbook-katex --help
A preprocessor that renders KaTex equations to HTML.

Usage: mdbook-katex [COMMAND]

Commands:
  supports  Check whether a renderer is supported by this preprocessor
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

As we can see, mdBook-KaTeX only takes one command—`supports`.
But, if no command is specified, it reads from StdIn:

```sh
$ mdbook-katex --help
# (Nothing happens).
# (Press control + D).
Error: Unable to parse the input

Caused by:
    EOF while parsing a value at line 1 column 0
```

We don't use the `mdbook-katex` command directly.
Instead, mdBook would invoke it when it builds the book.

## The `supports` command

All preprocessors need to
have this command so mdBook can check whether it supports a renderer.

Usually, we use mdBook to render Markdown into HTML with the `html` renderer.
So, after loading the book from disk, mdBook invokes mdBook-KaTeX like this:

```sh
mdbook-katex supports html
```

In this case,
mdBook-KaTeX would just output nothing with status code 0 to indicate that
it supports the `html` renderer.

## Reading and processing the book data from StdIn

If no command is specified,
mdBook-KaTeX should read the book data as JSON from StdIn.

```rust
let pre = KatexProcessor;
let (ctx, book) = CmdPreprocessor::parse_input(io::stdin())?;
let processed_book = pre.run(&ctx, book)?;
serde_json::to_writer(io::stdout(), &processed_book)?;
```

Here, we read the context `ctx: PreprocessorContext` and the book data `book:
Book` from StdIn using `mdbook::preprocess::CmdPreprocessor`.
We then run it through our preprocessor `pre` and get the `processed_book:
Book`.
Finally, we print the book data back to StdOut,
where mdBook would catch it and use it for the next steps.

So far, the process above is basically universal for any mdBook preprocessors.
Yes,
you can copy the code from the `main.rs` of mdBook-KaTeX and
start your own preprocessor;
the only change would be replacing `KatexProcessor` with another `struct` that
implements `mdbook::preprocess::Preprocessor`:

```rust
pub trait Preprocessor {
    fn name(&self) -> &str;
    fn run(&self, ctx: &PreprocessorContext, book: Book) -> Result<Book>;
    fn supports_renderer(&self, renderer: &str) -> bool;
}
```

`name` and `supports_renderer` are trivial, but `run` is where the fun lives.
For `KatexProcessor`,
it finds the math expressions in each chapter of `book` and render them.

## Processing `book`

Simply stated,
we just loop over the all the chapters in the argument `book` above.
For each chapter, we loop over its bytes, find the math expressions,
and replace them with rendered HTML.
Then, we stick these chapters back into `book`.

```rust
fn run(&self, ctx: &PreprocessorContext, mut book: Book) -> Result<Book> {
    // …
    book.for_each_mut(|item| {
        if let BookItem::Chapter(chapter) = item {
            chapter.content = process_chapter(&chapter.content, /* … */)
        }
    });
    Ok(book)
}

```

Above,
we use
[the `for_each_mut` method on `book`](https://docs.rs/mdbook/0.4.29/mdbook/book/struct.Book.html#method.for_each_mut)
to iterate over its items and mutate them.
We filter out the `item: &mut BookItem`s that are `BookItem::Chapter`.
We then call `process_chapter` on their `content:
String` and assign the results back.

Below, we have a simplified version of `process_chapter`.
`scan:
Scan` is a custom scanner that scans through each byte in `raw_content` and
produces `Event`s that indicate the beginnings and ends of blocks.

```rust
fn process_chapter(raw_content: String, /* other args */) -> String {
    let scan = Scan::new(&raw_content, /* … */);
    let mut rendered = Vec::new();

    let mut checkpoint = 0;
    for event in scan {
        match event {
            Event::TextEnd(end) => rendered.push((&raw_content[checkpoint..end]).into()),
            Event::InlineEnd(end) => {
                rendered.push(render(&raw_content[checkpoint..end], /* … */));
                checkpoint = end;
            }
            // …
        }
    }
    // …

    rendered.join("")
}
```

Based on the types of the `Event`, we identify text blocks and math blocks,
and apply the `render` function to the math blocks.
The `render` function then uses
[the `katex` crate](https://crates.io/crates/katex) to render HTML.
Finally, we `join` all the strings in `rendered:
Vec<String>` into the new content of the chapter.

## What next

If you have been following along,
I hope you got a gist about how an mdBook preprocessor works and probably how to
write one yourself! (If not, leave a question below).

In reality, though, the code for mdBook-KaTeX is way more complicated due to:

### Configuration options

[mdBook-KaTeX offers a wide range of
options](https://github.com/lzanini/mdbook-katex#katex-options).
We read these options from the `ctx:
&PreprocessorContext` argument passed into the `run` method.
Then, we further parse the configurations and pass them around.

### Parallelism

Parallelism is more interesting.

Since the `katex` crate uses
[QuickJs](https://crates.io/crates/quick-js) to render KaTeX,
which is ironically slow, KaTeX rendering has been the performance bottleneck.
Initially,
by
manually scheduling rendering tasks using
[Tokio](https://crates.io/crates/tokio), I was able to get **5x speed** on
an M1 Mac,
from 10sec to 2sec rendering
[my 30-thousand-word notes](https://github.com/SichangHe/notes).

In v0.5.0,
we switched to [Rayon](https://crates.io/crates/rayon) for simplicity,
but the basic ideas are the same.
To spawn threads and get parallelism, each thread ideally needs to own its data.
So, we need to scan for tasks first, save them in vectors,
and then execute the tasks in the vector in parallel.
For example, this is how we actually parallelize processing each chapter:

```rust
let mut chapters = Vec::with_capacity(book.sections.len());
book.for_each_mut(|item| {
    if let BookItem::Chapter(chapter) = item {
        chapters.push(chapter.content.clone());
    }
});
let mut contents: Vec<_> = chapters
    .into_par_iter()
    .rev()
    .map(|raw_content| process_chapter(raw_content, /* … */))
    .collect();
book.for_each_mut(|item| {
    if let BookItem::Chapter(chapter) = item {
        chapter.content = contents.pop().expect("Chapter number mismatch.");
    }
});
```

- We have to clone each chapter's content and
save them into a vector `chapters` for each thread to
own the chapter they process.
- We use the `into_par_iter` method for `Vec` and the `map` method,
which Rayon provides, to process the chapters in parallel.
- We have to use `for_each_mut` even when
gathering the chapters because
[`iter`](https://docs.rs/mdbook/0.4.29/mdbook/book/struct.Book.html#method.iter)
unfortunately iterates them in a different order.
- We call `rev` to iterate the chapters in reverse order,
so when we put the rendered chapters back into the book,
we can simply call `pop` on the contents to get them in the correct order.

## Conclusion and preview

In summary,
we have walked through mdBook-KaTeX as an mdBook preprocessor example to
show what a preprocessor does:

- Handle `supports` command.
- Read the book from StdIn and parse it.
- Process the book by looping through its content and changing them.
- Print the book back to StdOut.
- Other enhancement such as option handling and parallelism.

The reality, however, is that, like any other projects,
mdBook preprocessors get messy easily.
We will talk about the mess mdBook-KaTeX was in next time.

---

*2023-05-27*, edited: *2023-06-11*
