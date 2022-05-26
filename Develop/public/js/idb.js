let db;
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function (event) {
    const db = event.target.result;

    db.createObjectStore("new_data", { autoIncrement: true });
};

request.onsuccess = function (event) {
    // when db is successfully created with its object store (from `onupgradedneeded` event above), save reference to db in global variable
    db = event.target.result;
    // check if app is online, if yes run checkDatabase() function to send all local db data to api
    if (navigator.onLine) {
        uploadData();
    }
};

request.onerror = function (event) {
    // log error here
    console.log(event.target.errorCode);
};

// create transaction while offline
function saveRecord(record) {
    const transaction = db.transaction(['new_data'], 'readwrite');
    const dataObjectStore = transaction.objectStore('new_data');

    // add record to your store with this add method
    dataObjectStore.add(record);

    if (deposit) {
        alert("Your Deposit will be submitted when you have an internet connection.");
    } else {
        alert("Your Expense will be submitted when you have an internet connection.")
    }
}

// called when user goes online to send transactions stored in db to server
function uploadData() {
    // open a transaction on your pending db 
    const transaction = db.transaction(['new_data'], 'readwrite');

    // access your pending object store
    const dataObjectStore = transaction.objectStore('new_data');

    // get all records from store and set to a variable 
    const getAll = dataObjectStore.getAll();

    // if there was data in indexedDb's store, let's send it to the api server
    getAll.onsuccess = function () {
        if (getAll.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }

                    const transaction = db.transaction(['new_data'], 'readwrite');
                    const dataObjectStore = transaction.objectStore('new_data');
                    // clear all items in your store
                    dataObjectStore.clear();
                })
                .catch(err => {
                    // set reference to redirect back here
                    console.log(err);
                });
        }
    };
}

// listen for app coming back online
window.addEventListener('online', uploadData);