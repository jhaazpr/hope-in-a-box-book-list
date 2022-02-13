import * as fs from 'fs';
import fetch from 'node-fetch';
import { SECRET_sheetId, SECRET_key } from './SECRET.mjs';

class BookTableDataFetch {
    static endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/';
    static sheetId = SECRET_sheetId;
    static key = SECRET_key;

    constructor() {
        this._headers = [];
        this._rows = [];
        this.books = [];
        this.buildBooksWithApiCall()
        .then((_) => {
            this.generateTextFile();
        });
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
        let jsonText = JSON.stringify(JSON.stringify(jsonObj));
        let progText = `window.bookJsonText = ${jsonText};`
        try {
            fs.writeFileSync('booklist-data.js', progText);
            console.log('Book list data fetched successfully.');
        }
        catch (err) {
            console.error(err);
        }
    }

    async fetchHeaders() {
        let headerRange = 'A2:AR2';
        let url = BookTableDataFetch.endpoint.concat(
            BookTableDataFetch.sheetId,
            '/values/',
            headerRange,
            '?key=',
            BookTableDataFetch.key
        );
        let response = await fetch(url);
        if (response.ok) {
            let json = await response.json();
            this._headers = json.values[0];
        }
    }

    async fetchData() {
        let dataRange = 'A3:AR102';
        let url = BookTableDataFetch.endpoint.concat(
            BookTableDataFetch.sheetId,
            '/values/',
            dataRange,
            '?key=',
            BookTableDataFetch.key
        );
        let response = await fetch(url);
        if (response.ok) {
            let json = await response.json();
            this._rows = json.values;
        }
    }
}

let main = () => {
    new BookTableDataFetch();
};

main();

