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

    sortBooksByLevelThenTitle() {
        let bins = {
            'Early elementary': [],
            'Late elementary': [],
            'Middle school': [],
            'Early high school': [],
            'Late high school': []
        };
        let sortedBins = {
            'Early elementary': [],
            'Late elementary': [],
            'Middle school': [],
            'Early high school': [],
            'Late high school': []
        };
        this.books.forEach((book) => {
            if (book['Early elementary']) {
                bins['Early elementary'].push(book);
            }
            if (book['Late elementary']) {
                bins['Late elementary'].push(book);
            }
            if (book['Middle school']) {
                bins['Middle school'].push(book);
            }
            if (book['Early high school']) {
                bins['Early high school'].push(book);
            }
            if (book['Late high school']) {
                bins['Late high school'].push(book);
            }
        });
        Object.keys(bins).forEach((level) => {
            let bin = bins[level];
            sortedBins[level] = bin.sort((a, b) => {
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
        });
        let finalList = sortedBins['Late high school']
            .concat(sortedBins['Early high school'])
            .concat(sortedBins['Middle school'])
            .concat(sortedBins['Late elementary'])
            .concat(sortedBins['Early elementary']);
        this.books = finalList;
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
                'Uncle Bobby\'s Wedding'
        };
        let title = book['Title'];
        return adjustments[title] ? adjustments[title] : title;
    }

    getShortAuthorForBook(book) {
        let longAuthor = book['Author'];
        if (!longAuthor.includes('by')) {
            return longAuthor;
        }
        else if (longAuthor.includes('Edited by')) {
            return longAuthor.slice(10);
        }
        return longAuthor.split(',')[0].slice(3);
    }

    getReadingLevelForBook(book) {
        let level = 'Unknown level';
        this.pageDom.filterCategories['readingLevel'].forEach((prop) => {
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

    constructor() {
        this.minGramSize = 4;
        this.maxGramSize = 7;

        this.loadTimeoutMs = 5000;
        this.filterCategories = [
            'readingLevel', 'format', 'representation', 'themes',
            'includedIn', 'curriculumAvailable'
        ];

        this.filterCategories = {
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

        this.booksDidLoad = false;
        this.startTimeoutErrorHandler();
        this.searchStoreTitles = new FuzzySet([], true, this.minGramSize,
                                                this.maxGramSize);
        this.searchStoreAuthors = new FuzzySet([], true, this.minGramSize,
                                                this.maxGramSize);
        this.mCloseIcon = document.getElementsByClassName('m-close-icon')[0];
        this.modalContainer = document.getElementById('modal-container');
        this.modalContentDom = document.getElementById('modal-content');
        this.gridContainer = document.getElementsByClassName('grid-container')[0];
        this.searchBar = document.getElementById('search-bar');
        this.filterTagList = document.getElementsByClassName('filter-list')[0];
        this.clearFilterText = document.getElementById('clear-filters');
        this.numBooksDisplayedText = document.getElementById('num-books-displayed');
        this.filterCheckboxPanes = {};
        Object.keys(this.filterCategories).forEach((category) => {
            let filterClassName = 'filters-' + this.camelToKebab(category);
            let filterDom = document.getElementsByClassName(filterClassName)[0];
            let cbDom = filterDom.children[1];
            this.filterCheckboxPanes[category] = cbDom;
        });
        this.hackAdjustMainTitleMargin();
        this.table = new BookTable(this);
        // window.bookJsonText should be loaded from a separate script
        this.setBooksFromJsonText(window.bookJsonText);
    }

    get gridItems() {
        return Array.from(document.getElementsByClassName('grid-item'));
    }

    get allTags() {
        return Object.values(this.filterCategories).flat();
    }

    titleToKebab = (title) => {
        let noAmpersand = title.replace('&', 'and');
        let noDiacritic = noAmpersand.normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, "");
        let noPunct = noDiacritic.replace(/[^\w\s]|_/g, "")
                                 .replace(/\s+/g, " ");
        return noPunct.toLowerCase().replaceAll(' ', '-');
    }

    camelToKebab = (str) => {
        return str.split('').map((letter, idx) => {
          return letter.toUpperCase() === letter
           ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
           : letter;
        }).join('');
    };

    startTimeoutErrorHandler() {
        const backupUrl = 'https://hope-box.squarespace.com/s/Hope-in-a-Box-50.pdf';
        setTimeout(() => {
            if (document.getElementsByClassName('grid-item').length === 0) {
                let sorryMessage = 'Unfortunately, we couldn\'t load the interactive list of books.\n';
                sorryMessage += 'In the meantime, please check out the ';
                sorryMessage += `<a id="backup-link" href="${backupUrl}">non-interactive list of books here.</a>`;
                this.gridContainer.innerHTML = sorryMessage;
            }
        }, this.LoadTimeoutMs);
    }

    setBooksFromJsonText(jsonText) {
        this.table.books = JSON.parse(jsonText)['books'];
        this.table.applyTitleShorteningToBooks();
        this.table.sortBooksByLevelThenTitle();
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
        this.doPostFilterAnimation();
        this.updateNumBooksDisplayedText();
        this.attachGridItemHandlers();
    }

    inflateFilters() {
        Object.entries(this.filterCheckboxPanes).forEach((kv) => {
            let category = kv[0];
            let categoryCbPane = kv[1];
            let filters = this.filterCategories[category];
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
                let cbId = `checkbox-${this.titleToKebab(filter)}`;
                cbDom.id = cbId;
                labelDom.classList.add('tag-text');
                labelDom.innerText = filter;
                labelDom.htmlFor = cbId;
                quantityDom.classList.add('tag-text');
                quantityDom.classList.add('light-text');
                quantityDom.innerText = `(${this.countItemsWithFilter(filter)})`;
                rowDom.appendChild(cbDom);
                rowDom.appendChild(labelDom);
                labelDom.appendChild(quantityDom);
                categoryCbPane.appendChild(rowDom);
                rowDom.dataset.filter = filter;
            });
        });
    }

    hackAdjustMainTitleMargin() {
        /* We need to access the main title that is completely outside the
         * scope of any code in the .page file. The hack here assumes that
         * the main header title from Squarespace is the sole h1 tag on
         * the page. We have intentionally set the title's margin to be too
         * big by adding extra whitespace, and then we reduce it here. */
        let mainTitle = document.getElementsByTagName('h1')[0];
        mainTitle.style.setProperty('margin-bottom', '-12px');
    }

    countItemsWithFilter(filterName) {
        let passFilterBooks = this.table.books.filter(book => book[filterName]);
        return passFilterBooks.length;
    }

    getCheckedFilterNamesFlat() {
        let categoryNames = Object.keys(this.filterCategories);
        let cbRowDoms = document.getElementsByClassName('checkbox-row');
        cbRowDoms = Array.from(cbRowDoms);
        let checkedCbRowDoms = cbRowDoms.filter(row => row.children[0].checked);
        return checkedCbRowDoms.map(row => row.dataset.filter);
    }

    getCheckedFilterNamesByCategory() {
        let filterCategoryDoms = Array.from(document
                .getElementsByClassName('filter-category'));
        let checkedFilterNamesPerCategory = filterCategoryDoms.map((fcDom) => {
            let rows = Array.from(fcDom.children[1].children);
            let checkedRows = rows.filter(row => row.children[0].checked);
            let checkedFilterNames = checkedRows.map(row => row.dataset.filter);
            return checkedFilterNames
        });
        let categoryNames = Object.keys(this.filterCategories);
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
            iconDom.src = '../assets/x-icon.svg';
            iconDom.alt = 'Delete tag icon';
            iconDom.classList.add('x-icon');
            iconDom.classList.add('tag-x-icon');
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
            return rowDom.dataset.filter === filterName;
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
        let mContent = document.getElementById('modal-content');
        let mTitle = document.getElementsByClassName('m-title')[0];
        let mCover = document.getElementsByClassName('m-cover')[0];
        let mAuthor = document.getElementsByClassName('m-author')[0];
        let mTagPane = document.getElementsByClassName('m-tags-pane')[0];
        let mSynopsisSource = document.getElementsByClassName('m-synopsis-source')[0];
        let mSynopsis = document.getElementsByClassName('m-synopsis')[0];
        let mCurriculumBtn = document.getElementsByClassName('m-lesson-plan-btn')[0];
        mTitle.innerText = title;
        mCover.src = `../assets/book-covers/${this.titleToKebab(title)}.jpg`;
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
        this.modalContainer.style.setProperty('top', window.pageYOffset);
        mContent.scrollTop = 0;
        document.getElementsByTagName('body')[0].classList.add('overflow-hidden');
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
        coverImg.src = `../assets/book-covers/${this.titleToKebab(title)}.jpg`;
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
            heartImg.src = '../assets/curriculum-icon.png';
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
        let numHiddensPreSearch = document.getElementsByClassName('hidden').length;
        let query = this.searchBar.value;
        if (query.length < this.minGramSize) {
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
        let newNumHiddens = document.getElementsByClassName('hidden').length;
        if (numHiddensPreSearch !== newNumHiddens) {
            this.doPostFilterAnimation();
            this.updateNumBooksDisplayedText();
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

    updateNumBooksDisplayedText() {
        let gridItems = Array.from(document.getElementsByClassName('grid-item'));
        let nonHiddenItems = gridItems.filter((item) => {
            return !item.classList.contains('hidden');
        });
        this.numBooksDisplayedText.innerText = nonHiddenItems.length;
    }

    doPostFilterAnimation() {
        let unscaleTimoutMs = 50;
        let offsetMs = 20;
        let coverContainers = document.getElementsByClassName('cover-container');
        coverContainers = Array.from(coverContainers);
        coverContainers.forEach((coverDom, coverIdx) => {
            coverDom.classList.add('canted');
            setTimeout(() => {
                coverDom.classList.remove('canted');
            }, unscaleTimoutMs + coverIdx * offsetMs);
        });
    }

    attachUIHandlers() {
        const hideModal = () => {
            this.modalContainer.classList.add('hidden');
            document.getElementsByTagName('body')[0].classList.remove('overflow-hidden');
        };
        // Hide modal on clicking close icon.
        this.mCloseIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            hideModal();
        });
        // Hide modal on clicking outside the box
        this.modalContentDom.addEventListener('click', (event) => {
            // Stop clicks on content from bubbling up and triggering the
            // click-outside-to-close handler
            event.stopPropagation();
        });
        this.modalContainer.addEventListener('click', (event) => {
            hideModal();
        });
        // Hide modal on pressing escape. Note that we need 3 listeners with
        // preventDefault because Squarespace attempts to log in on pressing
        // escape. FIXME: this still isn't preventing login for some reason.
        window.addEventListener('keyup', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                hideModal();
            }
        });
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
            }
        });
        window.addEventListener('keypress', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
            }
        });
        // Attach fuzzy search functionality.
        this.searchBar.value = '';
        this.searchBar.addEventListener('input', (event) => {
            this.runSearchOnGridItems();
        });
        // Attach filter collapsing functionality
        let collapseIcons = Array.from(document.getElementsByClassName('collapse-icon'));
        let filterTops = Array.from(document.getElementsByClassName('filter-section-top'));
        filterTops.forEach((filterTop) => {
            filterTop.addEventListener('click', (event) => {
                let icon = filterTop.children[0];
                if (filterTop.dataset.toggled === 'true') {
                    filterTop.dataset.toggled = false;
                    icon.src = '../assets/down-icon.svg';
                    let thisCbPane = icon.parentElement.nextElementSibling;
                    thisCbPane.classList.add('hidden');
                }
                else {
                    collapseIcons.forEach(icon => {
                        filterTop.dataset.toggled = false;
                        icon.src = '../assets/down-icon.svg';
                    });
                    filterTop.dataset.toggled = true;
                    icon.src = '../assets/up-icon.svg';
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

/* Use this function as an initializer, rather than window.addEventListener
 * because Squarespace won't actually load the page as-is but will rather
 * do an AJAX call. So, only Squarespace.initialize will fire correctly. */
window.Squarespace.onInitialize(Y, main);

