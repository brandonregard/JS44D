// ****************************
// Datagrid Directive 
//    based on kendoui-grid: http://demos.telerik.com/kendo-ui/grid/index
// ****************************

import { Component, EventEmitter, ViewChild, AfterViewInit, Input, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';


import { FourDModel } from '../js44D/JSFourDModel';
import { FourDCollection } from '../js44D/JSFourDCollection';
import { FourDInterface, FourDQuery } from '../js44D/JSFourDInterface';

@Component({
    selector: 'datagrid',
    template: `
    <div #theGrid style="height:100%;border-width: 0;">
    </div>`,
    providers: [HttpClient, FourDInterface]
})

export class DataGrid implements AfterViewInit {
    //
    // Declare kendui-grid configuration
    //
    /**
     * Grid columns definition, follows kendo-ui format
     */
    @Input() public columns: any[] = [];

    /**
     * defines how grid selection should work (defaults to single, row)
     */
    @Input() public selectionMode = 'single,row';

    /**
     * flag to indicate if grid is editable, individual columns can have their own setting (defaults to false)
     */
    @Input() public editable = 'false';

    /**
     * flag to indicate if grid is filterable, individual columns can have their own setting (defaults to true)
     */
    @Input() public filterable = true;

    /**
     * flag to indicate if grid is sortable, individual columns can have their own setting (defaults to true)
     */
    @Input() public sortable = { mode: 'multiple', allowUnsort: true, showIndexes: true };

    /**
     * flag to indicate if the column menu should be active for all columns on the grid (defaults to true)
     */
    @Input() public columnMenu = true;

    /**
     * Grid height
     */
    @Input() public height = '100%';

    /**
     * Filename to use when exporting to Excel
     */
    @Input() public excelFilename: string = null;

    /**
     * Various pageable options
     */
    /**
     * enable refresh button on the paging bar (default true)
     */
    @Input() public pageableRefresh = true;

    /**
     * to display page sizes drop down on the paging toolbar (default true)
     */
    @Input() public pageableSizes = true;

    /**
     * defines max number of buttons to display on the paging toolbar (default 5) 
     */
    @Input() public pageableButtonCount = 5;

    /**
     * defines message pattern to display on the paging toolbar
     */
    @Input() public pageableMessage = '{0} - {1} of {2} items';

    /**    
    * the associated data model for the records to be retrieved
    */
    @Input() set model(v: FourDModel) { this._model = v; if (this.dataProvider) { this.dataProvider.model = <any>v; } }
    get model(): FourDModel { return this._model; }

    /**
     * option to use lazyloading, leaving paging to be done on server side (defaults to true)
     */
    @Input() public useLazyLoading = true; // defaults to true


    /**
     * if using a FourDModel, this flag will optimize the loading of data, by bringing only the columns used on the grid
     * thus avoiding bringing data that is not used on the grid
     * only meaningful if using a dataClass
     */
    @Input() public optimizeGridLoading = false;

    /**
     * if using lazyloading, define the max # of records to retrieve from 4D
     */
    @Input() public pageSize = 50;

    //
    // events emitted by the DataGrid
    //
    recordSelected: EventEmitter<any> = new EventEmitter();
    loadDataComplete: EventEmitter<any> = new EventEmitter();

    //
    // private stuff
    //
    private _model: FourDModel = null;

    //
    // this is the datamodel interface to 4D backend
    //
    public dataProvider: FourDCollection; // this is the FourDCollection instalce used to bring in records

    //
    // this is the kendoui grid object
    //
    public gridObject: kendo.ui.Grid;

    //
    // define the dataSource used to populate/handle the grid's interface to 4D
    //
    private dataSource = new kendo.data.DataSource({
        transport: {
            read: (options: kendo.data.DataSourceTransportOptions) => {
                // console.log(options);
                const modelDef = <any>(this.model);
                const newModel: FourDModel = <any>(new modelDef());

                const start = (options.data.pageSize && options.data.pageSize > 0 && this.useLazyLoading) ? options.data.skip : 0;
                const numrecs = (options.data.pageSize && options.data.pageSize > 0 && this.useLazyLoading) ? options.data.pageSize : -1;
                // now build filter if set
                const filter = [];
                if (options.data.filter) {

                    options.data.filter.filters.forEach((item: kendo.data.DataSourceFilterItem) => {
                        let comparator = '=';
                        switch (item.operator) {
                            case 'eq':
                                comparator = '=';
                                break;
                            case 'neq':
                                comparator = '#';
                                break;
                            case 'startswith':
                                comparator = 'begins with';
                                break;
                            case 'endswith':
                                comparator = 'ends with';
                                break;
                            case 'isempty':
                                comparator = '=';
                                item.value = '';
                                break;
                            case 'isnotempty':
                                comparator = '#';
                                item.value = '';
                                break;

                            default:
                                comparator = <any>item.operator;
                                break;
                        }
                        filter.push(newModel.getLongname(item.field) + ';' + comparator + ';' + item.value + ';' + options.data.filter.logic);
                    });
                }

                let orderby = '';
                if (options.data.sort && options.data.sort.length > 0) {
                    options.data.sort.forEach((item: kendo.data.DataSourceSortItem) => {
                        orderby += (item.dir === 'asc') ? '>' : '<';
                        orderby += newModel.getLongname(item.field) + '%';
                    });
                }

                let query: FourDQuery = this.dataProvider.queryString;

                if (filter.length > 0) {
                    if (this.dataProvider.queryString) {
                        query = { intersection: [query, { query: filter }] };
                    } else {
                        query = { query: filter };
                    }
                }
                // let me = this;
                this.dataProvider.getRecords(query, (this.optimizeGridLoading) ? this.columns : null, start, numrecs, this.dataProvider.filterOptions, orderby)
                    .then((reclist) => {
                        let data = [];
                        reclist.forEach(element => {
                            data.push(element.extractModelData())
                        });
                        options.success(data);
                    });

            },
            destroy: (options) => {
                console.log('delete', options);
            },
            update: (options) => {
                console.log('update', options);
            },
            create: (options) => {
                console.log('create', options);
            },
            parameterMap: (options, operation) => {
                console.log('map', options);
                if (operation !== 'read' && options.models) {
                    return { models: kendo.stringify(options.models) };
                } else { return options; }
            }
        },
        schema: {

            total: (response) => {
                // console.log('total');
                return this.dataProvider.totalRecordCount;
            }
        },
        serverPaging: this.useLazyLoading,
        serverSorting: this.useLazyLoading,
        serverFiltering: this.useLazyLoading,
        serverGrouping: this.useLazyLoading,
        pageSize: this.pageSize
    });

    constructor(@Inject(HttpClient) private http:HttpClient, @Inject(FourDInterface) private fourD:FourDInterface ) {}

    @ViewChild('theGrid') public theGrid: any;

    //
    // Declare data provider properties
    //
    set queryString(v: FourDQuery) { if (this.dataProvider) { this.dataProvider.queryString = v; } }
    set orderBy(v: string) { if (this.dataProvider) { this.dataProvider.orderBy = v; } }
    set filterQuery(v: string) { if (this.dataProvider) { this.dataProvider.filterOptions = v; } }

    /**
     * currently selected record on the grid
     */
    get currentRecord(): FourDModel {
        if (this.dataProvider && this.dataProvider.currentRecord) {
            if (this.dataProvider.currentRecord.tableName === '') {
                this.dataProvider.currentRecord.tableName = (<any>this.model).prototype.tableName;
                this.dataProvider.currentRecord.tableNumber = (<any>this.model).prototype.tableNumber;
                this.dataProvider.currentRecord.fields = (<any>this.model).prototype.fields;
            }
            return this.dataProvider.currentRecord;
        } else { return null; }
    }
    set currentRecord(v: FourDModel) { this.dataProvider.currentRecord = v; }

    /**
     * record count on the current selection
     */
    get recordCount(): number { return (this.dataProvider) ? this.dataProvider.totalRecordCount : 0; }


    /**
     * after our view gets initialized, instantiate the grid and its dataProvider
     */
    ngAfterViewInit() {
        this.initializeGrid();

        $(this.theGrid.nativeElement).on('dblclick', 'tr.k-state-selected', ($event) => { this.dblClickRow($event); });
    }

    /**
     * Populates the grid with the result of a 4D query
     * @param query: the query string to send to 4D
     * @param filter: filter options to send to 4D, to be applied to the query result
     * @param orderby: order by statement to send to 4D, defining the record sort order
     */
    loadData(query: FourDQuery = null, filter: string = null, orderby: string = null) {
        if (this.dataProvider) {
            this.queryString = query;
            this.filterQuery = filter;
            this.orderBy = orderby;

            this.dataSource.fetch()
                .then(() => {
                    this.loadDataComplete.emit(this.dataProvider.models.length);
                });
        }
    }

    setDataSource(data: Array<any>) {
        this.gridObject.dataSource.data(data);
    }

    setOptions(options: kendo.ui.GridOptions) {
        if (this.gridObject) { this.gridObject.setOptions(options); }
    }

    rowClicked(event) {
        // console.log('click',event);
        if (this.dataProvider) {
            const item = this.gridObject.dataItem(this.gridObject.select());
            this.dataProvider.currentRecord = this.findRecordForThisItem(item);
        }
    }

    dblClickRow(event) {
        // console.log('dblclick', event);
        if (this.dataProvider && this.dataProvider.currentRecord) {
            this.recordSelected.emit(this.dataProvider.currentRecord);
        }
    }


    refresh() {
        this.gridObject.refresh();
    }

    resize() {
        this.gridObject.resize();
    }

    /**
     * return currently selected grid row
     */
    selectedRow(): Object {
        if (this.gridObject.table) {
            if (this.gridObject.select()) {
                return this.gridObject.dataItem(this.gridObject.select());
            } else { return null; }
        } else { return null; }
    }

    /**
     * return currently selected grid row index
     */
    selectedRowIndex(): number {
        if (this.gridObject.table) {
            if (this.gridObject.select()) {
                let ret = -1;
                const item = this.gridObject.dataItem(this.gridObject.select());
                if (this.dataProvider) {
                    this.dataProvider.models.forEach((element, index) => {
                        if (element['_recnum'] === item['_recnum']) { ret = index; }
                    });
                } else if ((<any>this.gridObject).dataItems().length > 0 && this._model && this._model.primaryKey_ && this._model.primaryKey_ !== '') {
                    (<any>this.gridObject).dataItems().forEach((element, index) => {
                        if (element[this._model.primaryKey_] === item[this._model.primaryKey_]) { ret = index; }
                    });
                }

                return ret;
            } else { return -1; }
        } else { return -1; }
    }

    /**
     * return currently selected rows indices, if multiple selection allowed
     */
    selectedRows(): Array<number> {
        const rows = this.gridObject.select();
        const selectedRecords = [];
        for (let index = 0; index < rows.length; index++) {
            selectedRecords.push(rows[index]['rowIndex']);
        };

        return selectedRecords;
    }

    /**
     * Export grid data to Excel
     */
    exportGridToExcel() {
        if (this.excelFilename) {
            this.gridObject.setOptions({ excel: { fileName: this.excelFilename } });
        }
        this.gridObject.saveAsExcel();
    }

    /**
     * Find grid item in the data provider
     */
    findRecordForThisItem(item: any): FourDModel {
        if (!item) { return null; } // nothing selected...

        let ret = null;
        if (this.dataProvider) {
            this.dataProvider.models.forEach(element => {
                if (element['_recnum'] === item['_recnum']) { ret = element; }
            });
        } else if ((<any>this.gridObject).dataItems().length > 0 && this._model && this._model.primaryKey_ && this._model.primaryKey_ !== '') {
            (<any>this.gridObject).dataItems().forEach(element => {
                if (element[this._model.primaryKey_] === item[this._model.primaryKey_]) { ret = element; }
            });

        }
        return ret;
    }

    /**
     * Remove row from grid
     */
    removeRow(row: number) {
        if (this.dataProvider && this.dataProvider.models.length > row) {
            // if we have a data provider and a valid row index 
            this.dataProvider.models.splice(row, 1);
        } else if ((<any>this.gridObject).dataItems().length > row) {
            (<any>this.gridObject).dataItems().splice(row, 1);
            this.gridObject.refresh();
        }
    }

    setColumnConfig(columns) {
        this.gridObject.destroy();
        $(this.theGrid.nativeElement).empty();
        // $(this.theGrid.nativeElement).remove();

        this.dataProvider.columns = this.columns;
        this.columns = columns;
        this.initializeGrid();
    }

    setExternalDataSource(dataSource, columns) {
        if (this.theGrid) {
            this.gridObject.destroy();
            $(this.theGrid.nativeElement).empty();

            this.dataSource = dataSource;
            this.columns = columns;
            this.initializeGrid();
        }
    }

    getDataProvider() { return this.dataProvider; }


    private initializeGrid() {
        if (this._model) {
            this.dataProvider = new FourDCollection(); // this is the data model used to bring in records
            this.dataProvider.model = this._model;
            this.dataProvider.columns = this.columns;
        }

        $(this.theGrid.nativeElement).kendoGrid(<any>{
            dataSource: (this.dataProvider) ? this.dataSource : null,
            excel: { allPages: true, filterable: true },
            change: ($event) => { this.rowClicked($event); },
            autoBind: false,
            pageable: {
                refresh: this.pageableRefresh,
                pageSize: this.pageSize,
                pageSizes: this.pageableSizes,
                buttonCount: this.pageableButtonCount,
                messages: { display: this.pageableMessage }
            },
            // scrollable: { virtual: this.useLazyLoading },
            resizable: true,
            selectable: this.selectionMode,
            editable: this.editable,
            filterable: this.filterable,
            sortable: this.sortable,
            height: this.height,
            columnMenu: this.columnMenu,
            columns: this.columns
        });

        this.gridObject = $(this.theGrid.nativeElement).data('kendoGrid');

    }
}
