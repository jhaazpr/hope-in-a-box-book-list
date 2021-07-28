class BookTable {
    constructor(pageDom) {
        this.pageDom = pageDom;
        this._headers = [];
        this._rows = [];
        this.books = [];
    }

    sortBooksByTitle() {
        this.books = this.books.sort((a, b) => {
            if (a['Title'] < b['Title']) {
                return -1;
            }
            else if (a['Title'] > b['Title']) {
                return 1;
            }
            else {
                return 0;
            }
        });
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

    static titleToKebab = (title) => {
        let noAmpersand = title.replace('&', 'and');
        let noDiacritic = noAmpersand.normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, "");
        let noPunct = noDiacritic.replace(/[^\w\s]|_/g, "")
                                 .replace(/\s+/g, " ");
        return noPunct.toLowerCase().replaceAll(' ', '-');
    }

    static camelToKebab = (str) => {
        return str.split('').map((letter, idx) => {
          return letter.toUpperCase() === letter
           ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
           : letter;
        }).join('');
    };

    constructor() {
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
            let filterClassName = 'filters-' + PageDom.camelToKebab(category);
            let filterDom = document.getElementsByClassName(filterClassName)[0];
            let cbDom = filterDom.children[1];
            this.filterCheckboxPanes[category] = cbDom;
        });
        this.table = new BookTable(this);
        // window.bookJsonText should be loaded from a separate script
        this.setBooksFromJsonText(window.bookJsonText);
    }

    setBooksFromJsonText(jsonText) {
        if (!this.willRequestBooksWithApi) {
            this.table.books = JSON.parse(jsonText)['books'];
            this.table.sortBooksByTitle();
            this.inflateFilters();
            this.inflateGrid();
            this.attachUIHandlers();
        }
    }

    getFilteredBooks() {
        // TODO: apply AND/OR logic as discussed
        let filteredBooks = this.table.books.filter((book) => {
            let bookFilterResults = checkedFilterNames.map(filterName =>
                book[filterName]);
            return bookFilterResults.reduce((a, b) => a && b, '1');
        });
        return filteredBooks;
    }

    inflateGrid() {
        let checkedFilterNames = this.getCheckedFilterNames();
        this.gridContainer.innerHTML = '';
        let filteredBooks = this.getFilteredBooks();
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
                labelDom.classList.add('tag-text');
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
        let mCover = document.getElementsByClassName('m-cover')[0];
        let mAuthor = document.getElementsByClassName('m-author')[0];
        let mTagPane = document.getElementsByClassName('m-tags-pane')[0];
        let mSynopsisSource = document.getElementsByClassName('m-synopsis-source')[0];
        let mSynopsis = document.getElementsByClassName('m-synopsis')[0];
        mTitle.innerText = title;
        mCover.src = `../assets/book-covers/${PageDom.titleToKebab(title)}.jpg`;
        mAuthor.innerText = book['Author']
        mSynopsisSource.href = book['Synopsis link'];
        mSynopsis.innerText = book['Synopsis'];
        this.inflateTagPaneDomForTitle(mTagPane, title);
        this.modalContainer.classList.remove('hidden');
    }

    addGridItem(title, author, readingLevel) {
        let newGridItem = document.createElement('div');
        let coverContainer = document.createElement('div');
        let coverImg = document.createElement('img');
        let readingLevelDiv = document.createElement('div');
        let stripeDiv = document.createElement('div');
        let rlTextDiv = document.createElement('div');
        let titleDiv = document.createElement('div');
        let authorDiv = document.createElement('div');
        newGridItem.classList.add('grid-item');
        coverContainer.classList.add('cover-container');
        coverImg.classList.add('book-cover');
        readingLevelDiv.classList.add('item-reading-level');
        stripeDiv.classList.add('stripe');
        rlTextDiv.classList.add('rl-text');
        titleDiv.classList.add('item-title');
        authorDiv.classList.add('item-author');
        // coverImg.src = '../assets/book-covers/like-a-love-story.jpg';
        coverImg.src = `../assets/book-covers/${PageDom.titleToKebab(title)}.jpg`;
        // TODO: generate bookcover URL, but need to have books named
        // in kebab case or something
        // coverImg.src = `../assets/book-covers/${title}.jpg`;
        rlTextDiv.innerText = readingLevel;
        titleDiv.innerText = title;
        authorDiv.innerText = author;
        coverContainer.appendChild(coverImg);
        newGridItem.appendChild(coverContainer);
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
            let resultScorePairs = this.searchStore.get(query, [], 0.33);
            if (resultScorePairs.length === 0) {
                // Rather than display nothing, simply do not update if we
                // don't get any results.
                return;
            }
            let results = resultScorePairs.map(pair => pair[1]);
            let title, author;
            this.gridItems.forEach((gridItem) => {
                title = gridItem.children[2].innerText;
                author = gridItem.children[3].innerText;
                if (results.contains(title) || results.contains(author)) {
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
            let author = gridItem.getElementsByClassName('item-author')[0]
                        .innerText;
            this.searchStore.add(title);
            this.searchStore.add(author);
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
    window.pageDom = new PageDom();
};

window.addEventListener('load', main, false);

