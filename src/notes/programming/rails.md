<!-- toc -->
# Rails

## new rails project

```shell
rails new <project_name>
```

## start rails server

```shell
rails s
```

## routing

in `config/routes.rb`

```ruby
Rails.application.routes.draw do
    # root route is special
    root 'articles#index'

    # non-root route like this
    # trigger `index` action in `articles` when GET request on `articles`
    get 'articles', to: 'articles#index'
    
    # route with variable use `:`
    # the variable is passed to controller in the hash `params`
    # in this case `params[:id]`
    get 'articles/:id', to: 'articles#show'

end
```

[more](https://guides.rubyonrails.org/routing.html)

### resourceful routing

```ruby
Rails.application.routes.draw do
    resources :articles
end
```

this map route

URI pattern|controller#action
-|-
articles|articles#index
articles/new|articles#new
articles/:id|articles#show
(POST) articles|articles#create
articles/:id/edit|articles#edit
(PATCH) article/:id|articles#update
(DELETE) article/:id|articles#destroy

and set up URL and path helper method

method|return
-|-
article_path|"articles/#{article.id}"

## model

in `app/models`

- singular name

### generate model

generate model `Article` with two field

```ruby
rails g model Article title:string body:text
```

- also generate database migration

### generate and save new model object

```ruby
# generate new article object
article = Article.new(title: 'Example', body: 'Example text.')

# save to database
article.save # => true
```

### update model object

```ruby
article.update # => true
```

#### validation of model object when save or update

```ruby
# declare a `article_params` method to validate
def article_params
    params.require(:article).permit(:title, :author, :body, :status)
end

# use the method when try saving or updating
if @article.update(article_params)
    redirect_to @article
else
    render :edit, status: :unprocessable_entity
end
```

### query model object from database

```ruby
# query article by id
Article.find(1) # => 1 Article object or Nil

# query all articles
Article.all # => 1 ActiveRecord::Relation object
```

## view

in `app/views`

### `html.erb` file

embedded Ruby in HTML

- run ruby code

    ```erb
    <% … %>
    ```

- run ruby code and render the return value

    ```erb
    <%= … %>
    ```

- write comment that does not render in result

    ```erb
    <%# comment %>
    ```

### access instance variable in view

```erb
<ul>
    <% @articles.each do |article| %>
        <li>
            <%= article.title %>
        </li>
    <% end %>
</ul>
```

### link to other page in view

- product a link with some_text to `article_path`

    ```erb
    <%= link_to some_text, article %>
    ```

- redirect to show a model object

    ```ruby
    redirect_to @article
    ```

    - the browser make a new request
    - use `redirect_to` to mutate database

- render image

    ```erb
    <%= image_tag image_path %>
    ```

- link to the same page with different params

    ```erb
    <%= link_to some_text,
      url_for(params.permit!.merge(field_to_change: field_value)) %>
    ```

### partial template

partial has name starting with `_`

e.g.

`_form.html.erb`

#### access partial template from another view

```erb
<%= render 'comments/form' %>
```

- relative path without `_`
- add argument

    ```ruby
    render 'form', article: @article

    # or the longer format
    render partial: 'form', locals: { article: @article }
    
    # or even longer format
    render partial: 'form', object: @article, as: 'article'
    ```

- render a collection

    ```ruby
    render @products

    # or longer format
    render partial: 'product', collection: @products    
    ```

    or even longer format

    ```erb
    <% @products.each do |product| %>
        <%= render partial: "product", locals: { product: product } %>
    <% end %>
    ```

## controller

in `app/controllers`

controller for `articles` is `articles_controller.rb`

- plural name

### generate controller

generate `ArticlesController` and its `index` action

```shell
rails g controller Articles index
```

by default,
`index` action of `Articles` render `app/views/articles/index.html.erb`

### instance variable in controller

instance variable in controller can be accessed in view

```ruby
# this will be accessed in `articles/index.html.erb`
    def index
        @article = Article.all
    end
```

### controller method for resourceful routing

#### `index` method in controller

#### `show` method in controller

need to query model object by `params[:id]`

### `new` method in controller

only initialize new model object

#### `create` method in controller

assign value to new model object and attempt to save it

```ruby
def create
    @article = Article.new(title: '…', body: '…')
    if @article.save
        redirect_to @article
    else
        render :new, status: :unprocessable_entity
end
```

- strong parameter

## database

SQLite3 by default

### migration

in `db/migrate`

```shell
rails db:migrate
```

## console

open a rails irb console

```shell
rails console
```

# Hotwire

## Turbo

[Turbo events](https://turbo.hotwired.dev/reference/events)
