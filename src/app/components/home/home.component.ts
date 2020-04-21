import { Component, OnInit } from '@angular/core';

import { ServiceToolService } from '../../services/service-tool/service-tool.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  connectionInProgress: boolean;
  connected: boolean;
  errorMessage: string;

  constructor(private serviceTool: ServiceToolService) { }

  ngOnInit(): void {
    const cpInfo = { cp_id: '1', site: 'site1' };
    this.connectionInProgress = true;
    this.serviceTool.connect(cpInfo)
      .then(() => this.setConnectionStatus(true))
      .catch(err => this.setConnectionStatus(false, err));
  }

  setConnectionStatus = (status: boolean, error: any = undefined) => {
    this.connected = status;
    this.errorMessage = error;
    this.connectionInProgress = false;
  }
}
