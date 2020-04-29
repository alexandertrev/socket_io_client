import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {FormsModule} from '@angular/forms'
import { SocketIoModule } from 'ngx-socket-io';

import { AppRoutingModule } from './app-routing.module';

// components
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';

// services
import { BusinessLogicInterface } from './business_logic'
import { SocketService } from './services/socket/socket.service';
import { ServiceToolService } from './services/service-tool/service-tool.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    SocketIoModule
  ],
  providers: [ServiceToolService, BusinessLogicInterface],
  bootstrap: [AppComponent]
})
export class AppModule { }
