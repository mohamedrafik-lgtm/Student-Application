// SOLID Principles Applied:
// 1. Interface Segregation: Specific interface for grades service
// 2. Dependency Inversion: Defines abstraction for grades service

import { MyGradesResponse } from '../types/grades';

export interface IGradesService {
  getMyGrades(accessToken: string): Promise<MyGradesResponse>;
}
