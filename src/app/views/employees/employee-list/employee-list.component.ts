import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { takeUntil } from 'rxjs/operators'
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { EmployeesService, ResponseData } from '../../../services/employees.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  templateUrl: 'employee-list.component.html',
  styleUrls: ['./employee-list.component.scss'],
  providers: [AsyncPipe]
})

export class EmployeeListComponent implements OnInit, OnDestroy {
  @ViewChild('employeeModal') public employeeModal: ModalDirective;
  @ViewChild('confirmationModal') public confirmationModal: ModalDirective;
  selectedEmployeeId: string = null;
  addEmployeeForm: FormGroup;
  loading: boolean = false;
  isEdit: boolean = false;
  destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  employees$ = new BehaviorSubject<any[]>([]);
  role:string = null;
  constructor(
    private EmployeesService: EmployeesService,
    private formBuilder: FormBuilder,
    private toasterService: ToastrService,
    private asyncPipe: AsyncPipe,
    private route: ActivatedRoute
  ) {
    //this.getEmployeesList();      
    // console.log("router data",this.role);
    // this.role = this.route.snapshot.data.title;
    this.addEmployeeForm = this.formBuilder.group({
      'name': ['', [Validators.required]],
      'alias': ['', [Validators.required]]
    });    
  }
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const list = this.route.snapshot.data.list;   
    this.employees$.next(list.data);
    console.log("List values:",list);
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  onSubmit() {
    if(this.addEmployeeForm.invalid){
      return;
    }
    this.isEdit ? this.updateEmployee() :this.addEmployee();
  }

  addEmployee() {
    this.EmployeesService.addEmployee(this.addEmployeeForm.value).pipe(
      takeUntil(this.destroyed$)
    ).subscribe((result: ResponseData) => {
      const { statusCode, message, data } = result;
      if (statusCode === 200) {
        this.employees$.next([...this.employees$.value, data])
        this.closeEmployeeModal()
        this.addEmployeeForm.reset();
        this.toasterService.success(message)
      } else {
        this.toasterService.error(message)
      }
    });
  }

  updateEmployee() {
    this.EmployeesService.updateEmployee(this.addEmployeeForm.value, this.selectedEmployeeId).pipe(
      takeUntil(this.destroyed$)
    ).subscribe((result: ResponseData) => {
      const { statusCode, message, data } = result;
      if (statusCode === 200) {
        let employeesClone = this.asyncPipe.transform(this.employees$);
        const updatedEmployee = employeesClone.find(employee => employee._id === data._id);
        const index = employeesClone.indexOf(updatedEmployee);
        if (index > -1) {
          employeesClone[index] = data;
          this.employees$.next(employeesClone)
        }
        this.closeEmployeeModal();
        this.addEmployeeForm.reset();
        this.toasterService.success(message)
      } else {
        this.toasterService.error(message)
      }
    });
  }

  getEmployeesList() {
    const data = {
      role: this.role
    }; // temporary solution for logged in user's role
    try {
      this.EmployeesService.getEmployees(data).pipe(
        takeUntil(this.destroyed$)
      ).subscribe((result: any) => {
        this.loading = false;
        const { statusCode, data, message } = result;
        if(statusCode === 200) {
          
          this.employees$.next(data);
          console.log(this.employees$.value);
        } else {
          this.toasterService.error(message)
        }
      });
    } catch (err) {
      console.log('err', err);
    }
  }

  openConfirmationModal(id: string) {
    this.confirmationModal.show();
    this.selectedEmployeeId = id;
  }

  openUpdateEmployeeForm(employee: any) {
    this.addEmployeeForm.patchValue({
      name: employee.name,
      alias: employee.alias
    })
    this.employeeModal.show();
    this.selectedEmployeeId = employee._id;
    this.isEdit = true;
  }

  deleteEmployee() {
    try {
      this.EmployeesService.deleteEmployee(this.selectedEmployeeId).pipe(
        takeUntil(this.destroyed$)
      ).subscribe((result: ResponseData) => {
        this.loading = false;
        const { statusCode, message } = result;
        if (statusCode === 200) {
          let employeesClone = this.asyncPipe.transform(this.employees$);
          const deletedEmployee = employeesClone.find(employee => employee._id === this.selectedEmployeeId);
          const index = employeesClone.indexOf(deletedEmployee);
          if(index>-1){
            employeesClone.splice(index, 1);
            this.employees$.next(employeesClone)
          }
          this.closeConfirmationModal();
          this.toasterService.success(message)
        } else {

        }
      });
    } catch (err) {
      console.log('err', err);
    }
  }

  closeEmployeeModal() {
    this.employeeModal.hide();
    if (this.selectedEmployeeId) this.selectedEmployeeId = null;
  }

  closeConfirmationModal() {
    this.confirmationModal.hide();
    this.selectedEmployeeId = null;
  }

}
