import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, SortDirection } from '@angular/material/sort';
import { merge, Observable, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { AbstractControl, AbstractControlOptions, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms';

@Component({
  selector: 'app-mtable',
  templateUrl: './mtable.component.html',
  styleUrls: ['./mtable.component.css'],
})
export class MtableComponent implements AfterViewInit {
  displayedColumns: string[] = ['created', 'state', 'number', 'title'];
  exampleDatabase!: ExampleHttpDatabase | null;
  data!: MatTableDataSource<GithubIssue>;
  dataSource = new MatTableDataSource();

  

  validToDate(control : AbstractControl) : ValidationErrors | null {
    console.log(control.get('from')?.value,control.get('to')?.value)
    if(control.get('from')?.value&&control.get('to')?.value){
        const firstDate = new Date(control.get('from')?.value.toJSON().split('T')[0]);
        const secondDate = new Date(control.get('to')?.value.toJSON().split('T')[0]);
        if(firstDate > secondDate){
          console.log('date',firstDate,secondDate)
        return {err : true}
      }
    }
    return null;

  }

  dateFilterVal1: string = '';
  dateFilterVal2: string = '';


  validD(control : AbstractControl) : ValidationErrors | null{
     let val = new Date(control.value)?.toJSON()?.split('T')[0]

      // console.log(val,this.dateFilterForm?.get('to'))
    // if(this.dateFilterVal1 && val < this.dateFilterVal1){
    //   console.log('ddddddddddddddddddddddddddddddddddddddddddddddddddddddddd')
    //   return {d : true};
    // }
       return null;
   }
  dateFilterForm = this.fb.group({
     from : ['',[Validators.required,],],
     to : new FormControl({value:"", disabled: true}),
     textfilter : ['',[Validators.required]]
  },{ validator: this.validToDate } as AbstractControlOptions)
  
  
  disableEnableInput(bool: boolean) {
    
  }

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  mainData: any;

  constructor(private _httpClient: HttpClient,private fb : FormBuilder) {}
  isDisable = true;
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.data.filter = filterValue.trim().toLowerCase();
  }


  applyDateFilter(event: any) {
    this.isDisable = false;
    this.dateFilterForm.get('to')?.enable()
    this.dateFilterVal1 = event.value.toJSON().split('T')[0];
    this.dateFilterLogic()
  }

  dateFilterLogic(){
    const firstDate = new Date(this.dateFilterVal1);
    const secondDate = new Date(this.dateFilterVal2);
    

    if(this.dateFilterVal1 && this.dateFilterVal2 && firstDate <= secondDate){
      this.data.data = this.mainData.data.filter(
        (e: { created_at: string }) =>
          e.created_at.split('T')[0] >= this.dateFilterVal1 && e.created_at.split('T')[0] <= this.dateFilterVal2
      );
    }else if(this.dateFilterVal1){
      this.data.data = this.mainData.data.filter(
        (e: { created_at: string }) =>
          e.created_at.split('T')[0] == this.dateFilterVal1
      );
  }
}

  applyDateFilter2(event: any) {
    this.dateFilterVal2 = event.value.toJSON().split('T')[0];
   
     this.dateFilterLogic();
    
  }

  reset(control : AbstractControl){
    control.reset();
    this.getData()
  }


  getData(){
    this.exampleDatabase = new ExampleHttpDatabase(this._httpClient);

    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getRepoIssues(
            this.sort.active,
            this.sort.direction,
            this.paginator.pageIndex
          ).pipe(catchError(() => observableOf(null)));
        }),
        map((data) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          // Only refresh the result length if there is new data. In case of rate
          // limit errors, we do not want to reset the paginator to zero, as that
          // would prevent users from re-triggering requests.
          this.resultsLength = data.total_count;
          return data.items;
        })
      )
      .subscribe((data) => {
        console.log(data);
        this.mainData = new MatTableDataSource(data);
        this.data = new MatTableDataSource(data);
      });
  }

  ngAfterViewInit() {
     this.getData()
  }
}

export interface GithubApi {
  items: GithubIssue[];
  total_count: number;
}

export interface GithubIssue {
  created_at: string;
  number: string;
  state: string;
  title: string;
}

/** An example database that the data source uses to retrieve data for the table. */
export class ExampleHttpDatabase {
  constructor(private _httpClient: HttpClient) {}

  getRepoIssues(
    sort: string,
    order: SortDirection,
    page: number
  ): Observable<GithubApi> {
    const href = 'https://api.github.com/search/issues';
    const requestUrl = `${href}?q=repo:angular/components&sort=${sort}&order=${order}&page=${
      page + 1
    }`;

    return this._httpClient.get<GithubApi>(requestUrl);
  }
}
