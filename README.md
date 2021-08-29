# Books Page for Hope in a Box

This is a custom Squarespace infrastructure for [Hope in a Box's website](https://hopeinabox.org/).

## About

Hope in a Box is a non-profit dedicated to helping teachers at rural and/or low-income schools include LGBTQ+ books in their classroom.
This infrastructure helps teachers browse Hope in a Box's curated list of 100 inclusive books with an [interactive page for searching and filtering books](https://hopeinabox.org/books)).
The structure of this repository adhere's to Squarespace's template format, [which is specified here](https://developers.squarespace.com/template-overview).

## Instructions for Pushing to Squarespace

1. Clone this repository to a local machine.
2. Push this repository to the remote address as specfied by your own Squarespace site.

## Updating the Book List Data

1. Run a script to scrape book data from a database or a spreadsheet into the format as specified in `scripts/booklist-data.js`. For security reasons, we have not released that script here. Please get in touch if you'd like more information.
2. Ensure that `assets/book-covers/` contains the covers of every book, formatted in kebab case.
3. Push the repository to the Squarespace remote.
