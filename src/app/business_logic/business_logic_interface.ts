import { Injectable } from '@angular/core';

@Injectable()
export class BusinessLogicInterface {
  private file: File;
  logger = {
    exportLogsDBToSQLFile: () => this.file.arrayBuffer(),
  };
  dbService = {
    exportDBToSQLFile: () => this.file.arrayBuffer(),
    importDBSQLFile: (data: ArrayBuffer) => {
      console.log('importDBSQLFile data ? ', data);
      return Promise.resolve();
    }
  };

  constructor() {
    this.file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });
  }
}
