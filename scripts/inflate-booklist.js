class BookTable {
    static endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/';
    static sheetId = '108N0dMCVQfu0G80Y64mMZJ0PCUVXVwl9b8wQfZ1lTtA';
    static key = 'REDACTED';

    constructor(pageDom) {
        this.pageDom = pageDom;
        this._headers = [];
        this._rows = [];
        this.books = [];
        this.textFileUrl = null;
    }

    async buildBooksWithApiCall() {
        await this.fetchHeaders()
        await this.fetchData();
        return new Promise((resolve, reject) => {
            this._rows.forEach((row, rowIdx) => {
                let book = {};
                this._headers.forEach((header, headerIdx) => {
                    book[header] = row[headerIdx];
                });
                book['RowNumber'] = rowIdx;
                this.books.push(book);
            });
            resolve(this.books);
        });
    }

    generateTextFile() {
        let jsonObj = {
            books: this.books
        };
        // FIXME: deal with fancy character encoding
        let jsonText = JSON.stringify(JSON.stringify(jsonObj));
        let progText = `window.bookJsonText(${jsonText});`
        let data = new Blob([progText], {type: 'text/plain;charset=UTF-8'});
        if (this.textFileUrl !== null) {
            window.URL.revokeObjectURL(this.textFileUrl);
        }
        this.textFileUrl = window.URL.createObjectURL(data);
        console.log(this.textFileUrl);
    }

    getShortAuthorForBook(book) {
        // FIXME: this is a hack--decide on author format
        let longAuthor = book['Author'];
        if (!longAuthor.includes('by')) {
            return longAuthor;
        }
        return longAuthor.split(',')[0].slice(3);
    }

    getReadingLevelForBook(book) {
        let level = 'Unknown level';
        PageDom.readingLevelProps.forEach((prop) => {
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

    static filterCategories = [
        'readingLevel', 'format', 'representation', 'themes',
        'includedIn', 'curriculumAvailable'
    ];

    static formatProps = [
        'Picture book',
        'Chapter book',
        'Graphic novel',
        'Non-fiction',
        'Anthology',
        'Poetry',
        'Scripts & plays'
    ];
    static representationProps = [
        'Lesbian',
        'Gay',
        'Bisexual & Pansexual',
        'Trans & Nonbinary',
        'Queer+',
        'Small Town, Rural & Heartland',
        'Black, Caribbean, & African Diaspora',
        'Asian & Asian Diaspora',
        'Latino & Hispanic',
        'Native American & Indigenous',
        'Diverse ensemble',
        'Ability'
    ];
    static themesProps = [
        'Coming out',
        'Religion & Spirituality',
        'Diverse family structure',
        'Relationships: Family',
        'Relationships: Love',
        'Relationships: Friends',
        'Relationships: Community',
        'Politics, Society, & Activism',
        'Classics'
    ];
    static readingLevelProps = [
        'Early elementary',
        'Late elementary',
        'Middle school',
        'Early high school',
        'Late high school'
    ];

    static includedInProps = [
        'Elementary', 'Middle', 'High'
    ];

    static curriculumAvailableProps = [
        'Yes', 'No'
    ];

    get allTags() {
        return PageDom.readingLevelProps
                .concat(PageDom.formatProps)
                .concat(PageDom.representationProps)
                .concat(PageDom.themesProps);
    }

    static kebabize = (str) => {
       return str.split('').map((letter, idx) => {
         return letter.toUpperCase() === letter
          ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
          : letter;
       }).join('');
    };

    constructor(willRequestBooksWithApi) {
        this.willRequestBooksWithApi = willRequestBooksWithApi;
        this.searchStore = new FuzzySet();
        this.mCloseIcon = document.getElementsByClassName('m-close-icon')[0];
        this.modalContainer = document.getElementById('modal-container');
        this.gridContainer = document.getElementsByClassName('grid-container')[0];
        this.gridItems = document.getElementsByClassName('grid-item');
        this.searchBar = document.getElementById('search-bar');
        this.filterTagList = document.getElementsByClassName('filter-list')[0];
        this.clearFilterText = document.getElementById('clear-filters');
        this.filterCheckboxPanes = {};
        PageDom.filterCategories.forEach((category) => {
            let filterClassName = 'filters-' + PageDom.kebabize(category);
            let filterDom = document.getElementsByClassName(filterClassName)[0];
            let cbDom = filterDom.children[1];
            this.filterCheckboxPanes[category] = cbDom;
        });
        this.table = new BookTable(this);
        if (willRequestBooksWithApi) {
            this.table.buildBooksWithApiCall()
            .then((_) => {
                this.inflateFilters();
                this.inflateGrid();
                this.attachUIHandlers();
                this.table.generateTextFile();
            });
        }
        else {
            this.setBooksFromJsonText(window.bookJsonText);
        }
    }

    setBooksFromJsonText(jsonText) {
        if (!this.willRequestBooksWithApi) {
            this.table.books = JSON.parse(jsonText)['books'];
            this.inflateFilters();
            this.inflateGrid();
            this.attachUIHandlers();
        }
    }

    inflateGrid() {
        let checkedFilterNames = this.getCheckedFilterNames();
        this.gridContainer.innerHTML = '';
        let filteredBooks = this.table.books.filter((book) => {
            let bookFilterResults = checkedFilterNames.map(filterName =>
                book[filterName]);
            return bookFilterResults.reduce((a, b) => a && b, '1');
        });
        filteredBooks.forEach((book) => {
            let title = book['Title'];
            let author = this.table.getShortAuthorForBook(book);
            let readingLevel = this.table.getReadingLevelForBook(book);
            this.addGridItem(title, author, readingLevel);
        });
        this.attachGridItemHandlers();
    }

    inflateFilters() {
        Object.entries(this.filterCheckboxPanes).forEach((kv) => {
            let category = kv[0];
            let categoryCbPane = kv[1];
            let categoryPropName = category + 'Props'
            let filters = PageDom[categoryPropName];
            filters.forEach((filter) => {
                let rowDom = document.createElement('div');
                let cbDom = document.createElement('input');
                let labelDom = document.createElement('label');
                let quantityDom = document.createElement('div');
                rowDom.classList.add('checkbox-row');
                cbDom.type = 'checkbox';
                cbDom.addEventListener('click', (event) => {
                    this.inflateGrid();
                    this.renderFilterTags();
                    this.runSearchOnGridItems();
                });
                labelDom.classList = 'tag-text';
                labelDom.innerText = filter;
                quantityDom.classList.add('tag-text');
                quantityDom.classList.add('light-text');
                quantityDom.innerText = `(${this.countItemsWithFilter(filter)})`;
                rowDom.appendChild(cbDom);
                rowDom.appendChild(labelDom);
                rowDom.appendChild(quantityDom);
                categoryCbPane.appendChild(rowDom);
            });
        });
    }

    countItemsWithFilter(filterName) {
        let passFilterBooks = this.table.books.filter(book => book[filterName]);
        return passFilterBooks.length;
    }

    getCheckedFilterNames() {
        let cbRowDoms = document.getElementsByClassName('checkbox-row');
        cbRowDoms = Array.from(cbRowDoms);
        let checkedCbRowDoms = cbRowDoms.filter(row => row.children[0].checked);
        return checkedCbRowDoms.map(row => row.children[1].innerText);
    }

    renderFilterTags() {
        this.filterTagList.innerHTML = '';
        let filterNames = this.getCheckedFilterNames();
        let numFiltersTextDom = document.getElementById('num-filters');
        numFiltersTextDom.innerText = `(${filterNames.length})`;
        filterNames.forEach((filterName) => {
            let tagDom = document.createElement('div');
            let iconDom = document.createElement('img');
            let textDom = document.createElement('div');
            tagDom.classList.add('filter-tag');
            iconDom.src = '../assets/x-icon.png';
            iconDom.alt = 'Delete tag icon';
            iconDom.classList.add('x-icon');
            iconDom.addEventListener('click', (event) => {
                this.removeFilter(filterName);
            });
            textDom.classList.add('tag-text');
            textDom.innerText = filterName;
            tagDom.appendChild(iconDom);
            tagDom.appendChild(textDom);
            this.filterTagList.appendChild(tagDom);
        });
    }

    removeFilter(filterName) {
        let cbRowDoms = document.getElementsByClassName('checkbox-row');
        let filterRow = Array.from(cbRowDoms).find(rowDom => {
            let filterTextDom = rowDom.children[1];
            return filterTextDom.innerText === filterName;
        });
        if (filterRow) {
            filterRow.children[0].checked = false;
            // TODO: consolidate rendering functionality
            this.renderFilterTags();
            this.inflateGrid();
        }
    }

    inflateModalForBookTitle(title) {
        let book = this.table.getBookWithTitle(title);
        let mTitle = document.getElementsByClassName('m-title')[0];
        let mAuthor = document.getElementsByClassName('m-author')[0];
        let mTagPane = document.getElementsByClassName('m-tags-pane')[0];
        let mSynopsis = document.getElementsByClassName('m-synopsis')[0];
        mTitle.innerText = title;
        mAuthor.innerText = book['Author']
        mSynopsis.innerText = book['Synopsis'];
        this.inflateTagPaneDomForTitle(mTagPane, title);
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
        coverImg.src = '../assets/book-covers/like-a-love-story.jpg';
        // TODO: generate bookcover URL, but need to have books named
        // in kebab case or something
        // coverImg.src = `../assets/book-covers/${title}.jpg`;
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

    inflateTagPaneDomForTitle(tagPaneDom, title) {
        tagPaneDom.innerHTML = '';
        let book = this.table.getBookWithTitle(title);
        let allTags = this.allTags;
        let tags = allTags.filter(tag => book[tag]);
        tags.forEach((tagText) => {
            let newTag = document.createElement('div');
            newTag.classList.add('m-tag');
            newTag.innerText = tagText;
            tagPaneDom.appendChild(newTag);
        });
    }

    runSearchOnGridItems() {
        // NOTE: searching works by applying display: hidden to non-applicable
        // grid items, whereas filtering renders only those grid items that
        // pass filtering.
        let query = this.searchBar.value;
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
                bookTitle = gridItem.children[2].innerText;
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
            let title = gridItem.getElementsByClassName('item-title')[0]
                        .innerText;
            this.searchStore.add(title);
            gridItem.addEventListener('click', (event) => {
                this.inflateModalForBookTitle(title);
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
            this.runSearchOnGridItems();
        });
        // Clear all filters
        // TODO: rather than clear all checkboxes directly, call
        // removeFilter() without re-rendering every time
        this.clearFilterText.addEventListener('click', (event) => {
            let inputDoms = document.getElementsByTagName('input');
            let cbDoms = Array.from(inputDoms).filter(dom => dom.type === 'checkbox');
            cbDoms.forEach(dom => dom.checked = false);
            this.renderFilterTags();
            this.inflateGrid();
        });
    }
}

let main = () => {
    window.pageDom = new PageDom(true);
};

window.addEventListener('load', main, false);

