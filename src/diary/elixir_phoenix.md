# Elixir Phoenix

I need a back end technology.
First, I thought Ruby on Rails was the most suitable.
Now, I am turning to the Elixir Phoenix Framework.

## Leaving Rails

Rails was said to be the most productive back end framework.

I learned Ruby and walked through the Rails "getting started" document
last summer.
Then, I made [a forum](https://github.com/SichangHe/forum).

Pain started to increase when I was making the forum:

- The template Rails generated became less useful as the project went on.
- For adding functionalities such as history, tags, and search,
    I introduced more and more plugins,
    each of them:
    - needed me digging documentation to find my usecase
    - had part of their documentation out-of-date,
        so I had to dig the GitHub issues as well
    - introduced more "magic" to the codebase

Main reasons why Rails suck:

- Too much "magic."
    - Everything works highly relying on metaprogramming.
    - Global namespace pollution means it is hard to figure out
        what things are, where they are defined,
        and the language server couldn't find those either.
- Backwards incompatibility.
    - Rails 7, as I was using, clearly made a lot of solutions that worked in
        Rails 6 not working any more.
        Devise, the authentication plugin, e.g., wouldn't work properly.
- Hotwire was not fun to play with.

    It's like playing a puzzle game, instead of helping me.

## Learning Elixir

- Went through Elixir official doc.
- Did a few Exercism exercises.
- Went through *Functional Web Development with Elixir, OTP, and Phoenix*
    until they started to use Phoenix channels and the API has changed.
    - Technically, only learned about Elixir, not Phoenix.
    - GenServer is the main way to handle states and side effects.

## Learning Phoenix

I have not actually started using Phoenix yet.

When following the *Functional Web Development* book,
I wanted to separate the Elixir project into several modules,
so I created an umbrella project and initialized a Phoenix project inside it.
The project straight-up could not build.

I then initialized a Phoenix umbrella project.
It builds and runs fine.
But, it creates a weird project structure that intertwines with Phoenix.
So, I guess I will just not use umbrellas when I want true separation.
