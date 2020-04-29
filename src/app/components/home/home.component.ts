import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ServiceToolService } from '../../services/service-tool/service-tool.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  connectionStatus$: BehaviorSubject<boolean>;
  errorMessage: string;
  ipAddress: string;

  constructor(private serviceTool: ServiceToolService) { 
    this.connectionStatus$ = serviceTool.connectionStatusSubject;
  }

  connect = () => {
    this.serviceTool.connect(this.ipAddress)
      .catch(err => this.setConnectionError(err));
  }

  setConnectionError = (error: any) => {
    this.errorMessage = error;
  }
}
