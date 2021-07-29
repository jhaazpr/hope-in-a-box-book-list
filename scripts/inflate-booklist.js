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

    applyTitleShorteningToBooks() {
        this.books.forEach((book) => {
            book['Title'] = this.getShortTitleForBook(book);
        });
    }

    getShortTitleForBook(book) {
        const adjustments = {
            'No Voice Too Small: Fourteen Young Americans Making History':
                'No Voice Too Small',
            'Rural Voices: 15 Authors Challenge Assumptions about Small-Town America':
                'Rural Voices',
            'Dear Ijeawele, or A Feminist Manifesto in Fifteen Suggestions':
                'Dear Ijeawele',
            'This Is Our Rainbow: 16 Stories of Her, Him, Them, and Us':
                'This Is Our Rainbow',
            'Uncle Bobby\'s Wedding (2020)':
                'Uncle Booby\'s Wedding'
        };
        let title = book['Title'];
        return adjustments[title] ? adjustments[title] : title;
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
        PageDom.filterCategories['readingLevel'].forEach((prop) => {
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

    static filterCategories = {
        format: [
            'Picture book',
            'Chapter book',
            'Graphic novel',
            'Non-fiction',
            'Anthology',
            'Poetry',
            'Scripts & plays'
        ],
        representation: [
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
        ],
        themes: [
            'Coming out',
            'Religion & Spirituality',
            'Diverse family structure',
            'Relationships: Family',
            'Relationships: Love',
            'Relationships: Friends',
            'Relationships: Community',
            'Politics, Society, & Activism',
            'Classics'
        ],
        readingLevel: [
            'Early elementary',
            'Late elementary',
            'Middle school',
            'Early high school',
            'Late high school'
        ],
        includedIn: [
            'Elementary', 'Middle', 'High'
        ],
        curriculumAvailable: [
            'Yes', 'No'
        ]
    };

    get allTags() {
        return Object.values(PageDom.filterCategories).flat();
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

    static minGramSize = 4;
    static maxGramSize = 7;

    constructor() {
        this.searchStoreTitles = new FuzzySet([], true, PageDom.minGramSize,
                                                PageDom.maxGramSize);
        this.searchStoreAuthors = new FuzzySet([], true, PageDom.minGramSize,
                                                PageDom.maxGramSize);
        this.mCloseIcon = document.getElementsByClassName('m-close-icon')[0];
        this.modalContainer = document.getElementById('modal-container');
        this.gridContainer = document.getElementsByClassName('grid-container')[0];
        this.gridItems = document.getElementsByClassName('grid-item');
        this.searchBar = document.getElementById('search-bar');
        this.filterTagList = document.getElementsByClassName('filter-list')[0];
        this.clearFilterText = document.getElementById('clear-filters');
        this.filterCheckboxPanes = {};
        Object.keys(PageDom.filterCategories).forEach((category) => {
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
        this.table.books = JSON.parse(jsonText)['books'];
        // FIXME: we can never shorten book titles if we use html text
        // as identifiers
        // this.table.applyTitleShorteningToBooks();
        this.table.sortBooksByTitle();
        this.inflateFilters();
        this.inflateGrid();
        this.attachUIHandlers();
    }

    getFilteredBooks() {
        let filtersByCategory = this.getCheckedFilterNamesByCategory();
        let books = this.table.books.filter((book) => {
            let bookPassesChecks = true;
            // AND over different categories
            Object.keys(filtersByCategory).some((filterName) => {
                let categoryFilters = filtersByCategory[filterName];
                if (categoryFilters.length > 0) {
                    // OR over a category's filters if non-empty
                    let bookMatchesAtLeastOneCategoryFilter = false;
                    categoryFilters.forEach((checkedFilter) => {
                        if (book[checkedFilter]) {
                            bookMatchesAtLeastOneCategoryFilter = true;
                        }
                    });
                    if (!bookMatchesAtLeastOneCategoryFilter) {
                        bookPassesChecks = false;
                        // return true to exit inner Array.some() early
                        return true;
                    }
                }
            });
            return bookPassesChecks;
        });
        return books;
    }

    inflateGrid() {
        this.gridContainer.innerHTML = '';
        let filteredBooks = this.getFilteredBooks();
        filteredBooks.forEach((book) => {
            let title = book['Title'];
            let author = this.table.getShortAuthorForBook(book);
            let readingLevel = this.table.getReadingLevelForBook(book);
            let curriculumAvailable = !!book['Yes'];
            this.addGridItem(title, author, readingLevel, curriculumAvailable);
        });
        this.attachGridItemHandlers();
    }

    inflateFilters() {
        Object.entries(this.filterCheckboxPanes).forEach((kv) => {
            let category = kv[0];
            let categoryCbPane = kv[1];
            let filters = PageDom.filterCategories[category];
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
                let cbId = `checkbox-${PageDom.titleToKebab(filter)}`;
                cbDom.id = cbId;
                labelDom.classList.add('tag-text');
                labelDom.innerText = filter;
                labelDom.htmlFor = cbId;
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

    getCheckedFilterNamesFlat() {
        let categoryNames = Object.keys(PageDom.filterCategories);
        let cbRowDoms = document.getElementsByClassName('checkbox-row');
        cbRowDoms = Array.from(cbRowDoms);
        let checkedCbRowDoms = cbRowDoms.filter(row => row.children[0].checked);
        return checkedCbRowDoms.map(row => row.children[1].innerText);
    }

    getCheckedFilterNamesByCategory() {
        let filterCategoryDoms = Array.from(document
                .getElementsByClassName('filter-category'));
        let checkedFilterNamesPerCategory = filterCategoryDoms.map((fcDom) => {
            let rows = Array.from(fcDom.children[1].children);
            let checkedRows = rows.filter(row => row.children[0].checked);
            let checkedFilterNames = checkedRows.map(row => row.children[1].innerText);
            return checkedFilterNames
        });
        let categoryNames = Object.keys(PageDom.filterCategories);
        let categoryNamesToCheckedFilters = {};
        categoryNames.forEach((name, idx) => {
            categoryNamesToCheckedFilters[name] = checkedFilterNamesPerCategory[idx];
        });
        return categoryNamesToCheckedFilters;
    }

    renderFilterTags() {
        this.filterTagList.innerHTML = '';
        let filterNames = this.getCheckedFilterNamesFlat();
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
        let mCurriculumBtn = document.getElementsByClassName('m-lesson-plan-btn')[0];
        mTitle.innerText = title;
        mCover.src = `../assets/book-covers/${PageDom.titleToKebab(title)}.jpg`;
        mAuthor.innerText = book['Author']
        mSynopsisSource.href = book['Synopsis link'];
        mSynopsis.innerText = book['Synopsis'];
        if (book['Yes']) {
            mCurriculumBtn.classList.remove('hidden');
        }
        else {
            mCurriculumBtn.classList.add('hidden');
        }
        this.inflateTagPaneDomForTitle(mTagPane, title);
        this.modalContainer.classList.remove('hidden');
        document.getElementsByTagName('body')[0].classList.add('no-scroll');
    }

    addGridItem(title, author, readingLevel, curriculumAvailable) {
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
        coverImg.src = `../assets/book-covers/${PageDom.titleToKebab(title)}.jpg`;
        coverImg.alt = `Cover for ${title}`;
        rlTextDiv.innerText = readingLevel.toLowerCase();
        titleDiv.innerText = title;
        authorDiv.innerText = author;
        coverContainer.appendChild(coverImg);
        newGridItem.appendChild(coverContainer);
        newGridItem.appendChild(readingLevelDiv);
        readingLevelDiv.appendChild(stripeDiv);
        readingLevelDiv.appendChild(rlTextDiv);
        newGridItem.appendChild(titleDiv);
        newGridItem.appendChild(authorDiv);
        if (curriculumAvailable) {
            let heartContainer = document.createElement('div');
            let heartImg = document.createElement('img');
            heartImg.classList.add('curriculum-icon-img');
            heartContainer.classList.add('curriculum-icon-container');
            heartImg.src = '../assets/heart-icon.png';
            heartContainer.appendChild(heartImg);
            coverContainer.appendChild(heartContainer);
        }
        this.gridContainer.appendChild(newGridItem);
    }

    inflateTagPaneDomForTitle(tagPaneDom, title) {
        let adjustments = {
            Yes: 'Curriculum is available',
            No: 'Curriculum not available yet'
        };
        tagPaneDom.innerHTML = '';
        let book = this.table.getBookWithTitle(title);
        let allTags = this.allTags;
        let tags = allTags.filter(tag => book[tag]);
        tags = tags.map(tag => adjustments[tag] ? adjustments[tag] : tag);
        tags.forEach((tagText) => {
            let newTagDom = document.createElement('div');
            let stripe = document.createElement('div');
            let tagTextDom = document.createElement('div');
            newTagDom.classList.add('m-tag');
            stripe.classList.add('stripe');
            tagTextDom.classList.add('m-tag-text');
            tagTextDom.innerText = tagText;
            newTagDom.appendChild(stripe);
            newTagDom.appendChild(tagTextDom);
            tagPaneDom.appendChild(newTagDom);
        });
    }

    runSearchOnGridItems() {
        // NOTE: searching works by applying display: hidden to non-applicable
        // grid items, whereas filtering renders only those grid items that
        // pass filtering.
        let query = this.searchBar.value;
        if (query.length < PageDom.minGramSize) {
            this.gridItems.forEach((gridItem) => {
                gridItem.classList.remove('hidden');
            });
        }
        else {
            const minScore = 0.1;
            let titleScorePairs = this.searchStoreTitles.get(query, [], minScore);
            let authorScorePairs = this.searchStoreAuthors.get(query, [], minScore);
            let titleResults = titleScorePairs.map(pair => pair[1]);
            let authorResults = authorScorePairs.map(pair => pair[1]);
            let title, author;
            this.gridItems.forEach((gridItem) => {
                title = gridItem.children[2].innerText;
                author = gridItem.children[3].innerText;
                if (titleResults.contains(title)
                    || authorResults.contains(author)) {
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
            this.searchStoreTitles.add(title);
            this.searchStoreAuthors.add(author);
            gridItem.addEventListener('click', (event) => {
                this.inflateModalForBookTitle(title);
            });
        });
    }

    attachUIHandlers() {
        // Hide modal on clicking close icon.
        this.mCloseIcon.addEventListener('click', (event) => {
            this.modalContainer.classList.add('hidden');
            document.getElementsByTagName('body')[0].classList.remove('no-scroll');
        });
        // Attach fuzzy search functionality.
        this.searchBar.value = '';
        this.searchBar.addEventListener('input', (event) => {
            this.runSearchOnGridItems();
        });
        // Attach filter collapsing functionality
        let collapseIcons = Array.from(document.getElementsByClassName('collapse-icon'));
        collapseIcons.forEach((icon) => {
            icon.addEventListener('click', (event) => {
                if (icon.dataset.toggled === 'true') {
                    icon.src = '../assets/down-icon.png';
                    icon.dataset.toggled = false;
                    let thisCbPane = icon.parentElement.nextElementSibling;
                    thisCbPane.classList.add('hidden');
                }
                else {
                    collapseIcons.forEach(icon => {
                        icon.src = '../assets/down-icon.png';
                        icon.dataset.toggled = false;
                    });
                    icon.src = '../assets/up-icon.png';
                    icon.dataset.toggled = true;
                    let allCbPanes = document.getElementsByClassName('checkbox-pane');
                    allCbPanes = Array.from(allCbPanes);
                    allCbPanes.forEach(pane => pane.classList.add('hidden'));
                    let thisCbPane = icon.parentElement.nextElementSibling;
                    thisCbPane.classList.remove('hidden');
                }
            });
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
            this.runSearchOnGridItems();
        });
    }
}

let main = () => {
    window.pageDom = new PageDom();
};

window.addEventListener('load', main, false);

