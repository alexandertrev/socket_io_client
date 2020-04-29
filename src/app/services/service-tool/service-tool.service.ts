import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';
import * as JSZip from 'jszip';

import { SocketService } from '../socket/socket.service';
import { BusinessLogicInterface } from '../../business_logic';

enum ConnectionType {
  Test = 'TEST',
  Cp = 'CP'
}

enum Events {
  isOnline = 'is_online',
  cpInfo = 'cp_info',
  backupDb = 'backup_db',
  uploadDb = 'upload_db',
  disconnect = 'disconnect',
  reconnect = 'reconnect',
  eventTest = 'test_event'
}

enum DbType {
  data,
  logs
}

interface EventResponse {
  event: Events;
  success: boolean;
  data?: any;
  error?: any;
}

interface CpInfo {
  cp_id: string;
  site: string;
}

@Injectable()
export class ServiceToolService {
  socketService: SocketService;
  port = 8988;
  serverIp: string;
  connectionStatusSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private _bl: BusinessLogicInterface,
  ) { }

  connect = async (serverIpAddress: string): Promise<void> => {
    try {
      const socketServerAddress = `http://${serverIpAddress}:${this.port}`;
      this.socketService = new SocketService(socketServerAddress, { query: { identity: ConnectionType.Cp } });
      this.setConnectionStatus(true);
      this.signToEvents();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  reconnect = () => {
    if (this.socketService) {
      this.socketService.connect();
    }
  }

  disconnect = () => {
    if (this.socketService) {
      this.socketService.disconnect();
    }
  }

  signToEvents = (): void => {
    console.log('signing to events');
    this.socketService.on(Events.disconnect, () => this.setConnectionStatus(false));
    this.socketService.on(Events.reconnect, () => this.setConnectionStatus(true));

    this.registerToEventWithAnswer(Events.eventTest, () => { console.log('eventTest'); return 'ok'; });
    this.registerToEventWithAnswer(Events.cpInfo, this.handleGetCpInfo);
    this.registerToEventWithAnswer(Events.backupDb, this.backupHandler);
    this.registerToEventWithAnswer(Events.uploadDb, this.uploadHandler);
  }

  handleGetCpInfo = (): Promise<{ success: boolean, data?: CpInfo, error?: string }> => {
    console.error('handleGetCpInfo');
    const cpInfo = ['1', 'site1'];
    return Promise.resolve(cpInfo)
      .then(([cp_id, site]: Array<string>) => ({ success: true, data: { cp_id, site } }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  backupHandler = (dbType: DbType): Promise<{ success: boolean, data?: Uint8Array, error?: string }> => {
    console.error('backupHandler ? dbType', dbType);
    const promiseMap = {
      [DbType.data]: this._bl.dbService.exportDBToSQLFile,
      [DbType.logs]: this._bl.logger.exportLogsDBToSQLFile
    };
    const exportDBPromise = promiseMap[dbType];
    return exportDBPromise()
      .then((backup: ArrayBuffer) => new JSZip().file('backup', backup))
      .then((dbZip: JSZip) => dbZip.generateAsync({ type: 'uint8array' }))
      .then((zippedBackup: Uint8Array) => ({ success: true, data: zippedBackup }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  uploadHandler = (data: any): Promise<{ success: boolean, error?: string }> => {
    console.error('uploadHandler ? data', data);
    const parsedData = !_.isEmpty(data) && _.toArray(data);
    return JSZip.loadAsync(parsedData)
      .then(zip => zip.file('zip').async('text'))
      .then((db: string) => this.stringToUnit8Array(db).buffer)
      .then((buffer: ArrayBuffer) => this._bl.dbService.importDBSQLFile(buffer))
      .then(() => ({ success: true }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  stringToUnit8Array = (stringToParse: string): Uint8Array => {
    const array: number[] = _.map(stringToParse, (char, index) => stringToParse.charCodeAt(index));
    return new Uint8Array(array);
  }

  registerToEventWithAnswer = (event: Events, handler: (data?: any) => any) => {
    this.socketService.on(event, async (res: EventResponse) => {
      try {
        const answerData = await handler(res.data);
        this.answerEvent(event, answerData);
      } catch (error) {
        this.answerEvent(event, { error });
      }
    });
  }

  answerEvent = (event: Events, data?: any): void => {
    this.socketService.sendEvent(`${event}:answer`, data);
  }

  setConnectionStatus = (status: boolean): void => {
    this.connectionStatusSubject.next(status);
  }
}
