import { LightningElement, wire, track } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAccounts from '@salesforce/apex/financialServicesController.getAccounts';

//The list should include the following information for each account record: Account Name, Account Owner, Phone, Website, and Annual Revenue
//Ability to sort the data either by Account Name or Account Owner.
const columns = [
    { label: 'Account Name', fieldName: 'URL', type: 'url', typeAttributes: { label: { fieldName: 'Name' }, tooltip: 'Open Account', target: '_blank' }, sortable: true },
    { label: 'Account Owner', fieldName: 'Owner', type: 'string', sortable: true },
    { label: 'Phone', fieldName: 'Phone', type: 'phone', editable: true },
    { label: 'Website', fieldName: 'Website', type: 'url', editable: true },
    { label: 'Annual Revenue', fieldName: 'AnnualRevenue', type: 'currency', editable: true },
];

export default class FinancialServicesAccountListing extends LightningElement {
    @track data;
    @track columns = columns;
    @track initialRecords;

    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    //Ability to navigate to the Account detail record page when user clicks the Account Name. The record should be opened in a new tab.
    @wire(getAccounts)
    setAccounts({ error, data }) {
        if (data) {
            this.data = data.map((acc) => {
                const accList = {...acc};
                accList.URL = `/${acc.Id}`;
                accList.Name = acc.Name;
                accList.Owner = acc.Owner.Name;
                accList.Phone = acc.Phone;
                accList.Website = acc.Website;
                accList.Revenue = acc.AnnualRevenue;
                return accList;
            });
            this.initialRecords = this.data;
        } else if (error) {
            this.ShowToast('Error', error, 'error', 'dismissable');
            this.data = undefined;
        }
    }

    ShowToast(title, message, variant, mode){
        const event = new ShowToastEvent({
            title: title,
            message:message,
            variant: variant,
            mode: mode
        });
        this.dispatchEvent(event);
    }

    sortBy(field, reverse, primer) {
        const key = primer
        ? function (x) {
            return primer(x[field]);
        } : function (x) {
            return x[field];
        };

        return function (a, b) {
            return reverse * ((key(a) > key(b)) - (key(b) > key(a)));
        };
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.data];

        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.data = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

    //Ability to filter the data based on Account Name using user input.
    filterData(event) {
        const filterString = event.target.value.toLowerCase();

        if (filterString) {
            this.data = this.initialRecords;

            if (this.data) {
                let filteredRecords = [];

                for (let record of this.data) {
                    if (record.Name.toLowerCase().includes(filterString)) {
                        filteredRecords.push(record);
                    }
                }

                this.data = filteredRecords;
            }
        } else {
            this.data = this.initialRecords;
        }
    }

    //Ability to edit a record directly in the component if user has permission to edit that record.
    handleSave(event) {
        this.saveDraftValues = event.detail.draftValues;
        const inputsItems = this.saveDraftValues.slice().map(draft => {
            const fields = Object.assign({}, draft);
            return { fields };
        });

        const promises = inputsItems.map(recordInput => updateRecord(recordInput));

        Promise.all(promises).then(res => {
            this.ShowToast('Success', 'Records updated successfully!', 'success', 'dismissable');
            this.saveDraftValues = [];
            return this.refresh();
        }).catch(error => {
            this.ShowToast('Error', error, 'error', 'dismissable');
        }).finally(() => {
            this.saveDraftValues = [];
        });
    }

    async refresh() {
        await refreshApex(this.data);
    }
}