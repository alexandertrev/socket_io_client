import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

export class SocketService extends Socket {
  constructor(url: string, options: Record<string, any> = {}) {
    super({ url, options: { timeout: 5000, ...options } });
  }

  sendEvent = (eventName: string, data: any): void => {
    this.emit(eventName, data);
  }

  signToEvent = (eventName: string): Observable<any> => {
    return this.fromEvent(eventName);
  }

  signToEventOnce = async (eventName: string): Promise<any> => {
    try {
      const res = await this.fromOneTimeEvent(eventName);
      this.removeListener(eventName);
      return res;
    } catch (err) {
      console.error('Error occurred: ', err);
    }
  }
}
