class BookTable {
    // DO NOT COMMIT THIS
    static endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/';
    static sheetId = '108N0dMCVQfu0G80Y64mMZJ0PCUVXVwl9b8wQfZ1lTtA';
    static key = 'REDACTED';
    constructor(pageDom) {
        this.headers = [];
        this.rows = [];
        await this.fetchHeaders();
        await this.fetchData();
        this.inflatePageDomGrid(pageDom);
    }

    inflatePageDomGrid(pageDom, filters) {
        // TODO: accomodate filters
        // Do inflate here
        this.rows.forEach((row, rowIdx) => {
            let titleIdx = this.headers.indexOf('Title');
            let authorIdx = this.headers.indexOf('Author');
            let title = this.row[titleIdx];
            let author = this.row[authorIdx];
            let level = 'todo';
            pageDom.addGridItem(title, author, level);
        });
    }

    getAllBookTitles() {
    }

    getBookWithTitle() {
    }

    getRow() {
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
            this.headers = json.values;
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
            this.rows = json.values;
        }
    }
}

class PageDom {
    constructor() {
        this.searchStore = new FuzzySet();
        this.mCloseIcon = document.getElementsByClassName('m-close-icon')[0];
        this.modalContainer = document.getElementById('modal-container');
        this.gridItems = document.getElementsByClassName('grid-item');
        this.searchBar = document.getElementById('search-bar');
        this.attachHandlers();
        this.table = new BookTable(this);
    }

    inflateModalForBookTitle(bookTitle) {
        // TODO: eventually use IDs for this
        // TODO: retrieve all book data and fill fields with it
        this.modalContainer.classList.remove('hidden');
    }

    addGridItem(title, author, level) {
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

    attachHandlers() {
        // Hide modal on clicking close icon.
        this.mCloseIcon.addEventListener('click', (event) => {
            this.modalContainer.classList.add('hidden');
        });
        // Add modal-inflating handlers for all books in grid.
        // Also add book titles to search store.
        this.gridItems.forEach((gridItem) => {
            let bookTitle = gridItem.dataset.bookTitle;
            this.searchStore.add(bookTitle);
            gridItem.addEventListener('click', (event) => {
                this.inflateModalForBookTitle(bookTitle);
            });
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

