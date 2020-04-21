import { TestBed } from '@angular/core/testing';

import { ServiceToolService } from './service-tool.service';

describe('ServiceToolService', () => {
  let service: ServiceToolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceToolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
