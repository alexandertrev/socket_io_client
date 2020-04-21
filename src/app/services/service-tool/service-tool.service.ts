import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import * as JSZip from 'jszip';

import { SocketService } from '../socket/socket.service';
import { BusinessLogicInterface } from '../../business_logic';

enum ConnectionType {
  test = 'TEST',
  cp = 'CP'
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

interface ConnectionTry {
  ip: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceToolService {
  socketService: SocketService;
  port = 8988;
  serverIp: string;
  cpInfo: CpInfo;
  connected = false;

  constructor(
    private _bl: BusinessLogicInterface,
  ) { }

  connect = async (cpInfo: CpInfo): Promise<void> => {
    try {
      this.setCpInfo(cpInfo);
      const networkIp = await this.getNetworkIp();
      const serverIp = await this.scanNetwork(networkIp);
      this.socketService = new SocketService(serverIp, { query: { identity: ConnectionType.cp } });
      this.setConnectionStatus(true);
      console.log('connection established');
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
    this.registerToEventWithAnswer(Events.cpInfo, () => { console.log('cpInfo'); return this.cpInfo; });
    this.registerToEventWithAnswer(Events.backupDb, this.backupHandler);
    this.registerToEventWithAnswer(Events.uploadDb, this.uploadHandler);
  }

  backupHandler = (dbType: DbType): Promise<{ success: boolean, data?: Uint8Array, error?: string }> => {
    console.log('backupHandler ? dbType', dbType);
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
    console.log('uploadHandler ? data', data);
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
        console.log('data ? ', res);
        const answerData = await handler(res.data);
        console.log('answerData ? ', answerData);
        this.answerEvent(event, answerData);
      } catch (error) {
        this.answerEvent(event, { error });
      }
    });
  }

  answerEvent = (event: Events, data?: any): void => {
    this.socketService.sendEvent(`${event}:answer`, data);
  }

  private scanNetwork = async (networkIp: string): Promise<string> => {
    const networkIdentifier = _.chain(networkIp).split('.').dropRight(1).join('.').value();
    const socketsPromiseArr = _.map(_.range(1, 255), (host) => {
      const serverIp = `${networkIdentifier}.${host}:${this.port}`;
      return this.tryConnection(serverIp);
    });
    const socketConnections: Array<ConnectionTry> = await Promise.all(socketsPromiseArr);
    const network = _.find(socketConnections, { success: true });
    return network
      ? Promise.resolve(network.ip)
      : Promise.reject('Service tool server was not found');
  }

  private tryConnection = (ip: string): Promise<ConnectionTry> => new Promise(resolve => {
    const extraOptions = { reconnection: false, transports: ['websocket'], query: { identity: ConnectionType.test } };
    const socket: SocketService = new SocketService(ip, extraOptions);
    socket.once('connect_error', () => {
      socket.disconnect();
      resolve({ ip, success: false });
    });
    socket.once('connect', () => {
      socket.disconnect();
      resolve({ ip, success: true });
    });
    socket.connect();
  })

  private getNetworkIp = (): Promise<string> => new Promise((resolve, reject) => {
    // insert cordova network interface instead of hard coded response
    resolve('127.0.0.1');
  })

  setServerIp = (ip: string): void => {
    this.serverIp = ip;
  }

  setCpInfo = (cpInfo: CpInfo): void => {
    this.cpInfo = { ...cpInfo };
  }

  setConnectionStatus = (status: boolean): void => {
    this.connected = status;
  }
}
