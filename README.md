# Books Page for Hope in a Box

This is a custom Squarespace infrastructure for [Hope in a Box's website](https://hopeinabox.org/).

## About

Hope in a Box is a non-profit dedicated to helping teachers at rural and/or low-income schools include LGBTQ+ books in their classroom.
This infrastructure helps teachers browse Hope in a Box's curated list of 100 inclusive books with an [interactive page for searching and filtering books](https://hopeinabox.org/books)).
We do this by generating a static HTML page using pre-scraped data, without the use of any database or backend.

## Repository Structure

The structure of this repository adheres to Squarespace's template format, [which is specified here](https://developers.squarespace.com/template-overview).
The important files are:

- `pages/browse-books.page`: the HTML and CSS for the book list page.
- `scripts/booklist-data.js`: a pre-generated JSON file masquerading as a JS file that contains data for all books.
- `scripts/inflate-booklist.js`: a script that ingests data from `booklist.js` and inflates the page.

The book list page's search functionality uses [fuzzyset](https://github.com/Glench/fuzzyset.js) by Glen Chiacchieri.

## Instructions for Pushing to Squarespace

1. Clone this repository to a local machine.
2. Push this repository to the remote address as specfied by your own Squarespace site.

## Updating the Book List Data

1. Run `node fetch-booklist-data.mjs` to scrape book data from a database or a spreadsheet into the format as specified in `scripts/booklist-data.js`. This script uses private keys that are not included in the repository. If you would like to use the fetching script with your own spreadsheet, you'll need to create a developer key for the Google Sheets API and [follow the endpoint here](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get). If you would like to use our data, please get in touch.
2. Ensure that `assets/book-covers/` contains the covers of every book, formatted in kebab case.
3. Push the repository to the Squarespace remote.
