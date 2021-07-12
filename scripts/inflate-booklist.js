class BookTable {
    // DO NOT COMMIT THIS
    static endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/';
    static sheetId = '108N0dMCVQfu0G80Y64mMZJ0PCUVXVwl9b8wQfZ1lTtA';
    static key = 'REDACTED';
    constructor(pageDom) {
        this.pageDom = pageDom;
        this._headers = [];
        this._rows = [];
        this.books = [];
        this.buildBooks();
    }

    async buildBooks() {
        await this.fetchHeaders();
        await this.fetchData();
        this._rows.forEach((row, rowIdx) => {
            let book = {};
            this._headers.forEach((header, headerIdx) => {
                book[header] = row[headerIdx];
            });
            book['RowNumber'] = rowIdx;
            this.books.push(book);
        });
        this.inflatePageDomGrid();
    }

    inflatePageDomGrid(filters) {
        // TODO: accomodate filters
        this.books.forEach((book) => {
            let title = book['Title'];
            let author = this.getShortAuthorForBook(book);
            let readingLevel = this.getReadingLevelForBook(book);
            this.pageDom.addGridItem(title, author, readingLevel);
        });
        this.pageDom.attachGridItemHandlers();
    }

    getShortAuthorForBook(book) {
        let longAuthor = book['Author'];
        return longAuthor.split(',')[0].slice(3);
    }

    getReadingLevelForBook(book) {
        let readingLevelProps = [
            'Early elementary',
            'Late elementary',
            'Middle school',
            'Early high school',
            'Late high school'
        ];
        let level = 'Unknown level';
        readingLevelProps.forEach((prop) => {
            if (book[prop] !== '') {
                level = prop;
            }
        });
        return level;
    }

    getAllBookTitles() {
        return this.books.map(book => book['Title']);
    }

    getBookWithTitle(title) {
        return this.books.find(book => book['Title'] === title);
    }

    getBookWithRowNumber(rowNumber) {
        return this.books.find(book => book['RowNumber'] === rowNumber);
    }

    async fetchHeaders() {
        let headerRange = 'A2:AR2';
        let url = BookTable.endpoint.concat(
            BookTable.sheetId,
            '/values/',
            headerRange,
            '?key=',
            BookTable.key
        );
        let response = await fetch(url);
        if (response.ok) {
            let json = await response.json();
            this._headers = json.values[0];
        }
    }

    async fetchData() {
        let dataRange = 'A3:AR53';
        let url = BookTable.endpoint.concat(
            BookTable.sheetId,
            '/values/',
            dataRange,
            '?key=',
            BookTable.key
        );
        let response = await fetch(url);
        if (response.ok) {
            let json = await response.json();
            this._rows = json.values;
        }
    }
}

class PageDom {
    constructor() {
        this.searchStore = new FuzzySet();
        this.mCloseIcon = document.getElementsByClassName('m-close-icon')[0];
        this.modalContainer = document.getElementById('modal-container');
        this.gridContainer = document.getElementsByClassName('grid-container')[0];
        this.gridItems = document.getElementsByClassName('grid-item');
        this.searchBar = document.getElementById('search-bar');
        this.attachUIHandlers();
        this.table = new BookTable(this);
    }

    inflateModalForBookTitle(bookTitle) {
        // TODO: eventually use IDs for this
        // TODO: retrieve all book data and fill fields with it
        this.modalContainer.classList.remove('hidden');
    }

    addGridItem(title, author, readingLevel) {
        let newGridItem = document.createElement('div');
        let coverImg = document.createElement('img');
        let readingLevelDiv = document.createElement('div');
        let stripeDiv = document.createElement('div');
        let rlTextDiv = document.createElement('div');
        let titleDiv = document.createElement('div');
        let authorDiv = document.createElement('div');
        newGridItem.classList.add('grid-item');
        coverImg.classList.add('book-cover');
        readingLevelDiv.classList.add('item-reading-level');
        stripeDiv.classList.add('stripe');
        rlTextDiv.classList.add('rl-text');
        titleDiv.classList.add('item-title');
        authorDiv.classList.add('item-author');
        // TODO: generate bookcover URL
        coverImg.src = '../assets/book-covers/like-a-love-story.jpg';
        rlTextDiv.innerText = readingLevel;
        titleDiv.innerText = title;
        authorDiv.innerText = author;
        newGridItem.appendChild(coverImg);
        newGridItem.appendChild(readingLevelDiv);
        readingLevelDiv.appendChild(stripeDiv);
        readingLevelDiv.appendChild(rlTextDiv);
        newGridItem.appendChild(titleDiv);
        newGridItem.appendChild(authorDiv);
        this.gridContainer.appendChild(newGridItem);
    }

    filterGridItemsWithSearchQuery(query) {
        // TODO: integrate hiding functionality with filters. For example,
        // if we have already filtered something out, then it doesn't show
        // up in search, then we clear out the search, the filtered-out item
        // should not just suddenly appear again. It would be great if we had
        // a data store of book objects that we process before rendering,
        // rather than modifying an existing rendering.
        if (query === '') {
            this.gridItems.forEach((gridItem) => {
                gridItem.classList.remove('hidden');
            });
        }
        else {
            let results = this.searchStore.get(query, [], 0.2);
            if (results.length === 0) {
                // Rather than display nothing, simply do not update if we
                // don't get any results.
                return;
            }
            let resultTitles = results.map(scoreResultPair => scoreResultPair[1]);
            let bookTitle;
            this.gridItems.forEach((gridItem) => {
                bookTitle = gridItem.dataset.bookTitle;
                if (resultTitles.contains(bookTitle)) {
                    gridItem.classList.remove('hidden');
                }
                else {
                    gridItem.classList.add('hidden');
                }
            });
        }
    }

    attachGridItemHandlers() {
        // Add modal-inflating handlers for all books in grid.
        // Also add book titles to search store.
        this.gridItems.forEach((gridItem) => {
            let bookTitle = gridItem.dataset.bookTitle;
            this.searchStore.add(bookTitle);
            gridItem.addEventListener('click', (event) => {
                this.inflateModalForBookTitle(bookTitle);
            });
        });
    }

    attachUIHandlers() {
        // Hide modal on clicking close icon.
        this.mCloseIcon.addEventListener('click', (event) => {
            this.modalContainer.classList.add('hidden');
        });
        // Attach fuzzy search functionality.
        this.searchBar.value = '';
        this.searchBar.addEventListener('input', (event) => {
            let query = this.searchBar.value;
            this.filterGridItemsWithSearchQuery(query);
        });
    }
}

let main = () => {
    let pageDom = new PageDom();
    console.log('Inflate script loaded.');
};

window.addEventListener('load', main, false);

