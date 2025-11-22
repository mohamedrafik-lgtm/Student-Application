// SOLID Principles Applied:
// 1. Interface Segregation: Specific interface for requests service
// 2. Dependency Inversion: Other components depend on this abstraction

import {
  RequestsListResponse,
  CreateRequestResponse,
  CreateRequestDto,
  RequestDetailsResponse,
} from '../types/requests';

/**
 * Interface for Requests Service
 * Defines all methods for handling student requests
 */
export interface IRequestsService {
  /**
   * Get all requests for the current trainee
   */
  getMyRequests(accessToken: string): Promise<RequestsListResponse>;

  /**
   * Create a new request
   */
  createRequest(
    requestData: CreateRequestDto,
    accessToken: string
  ): Promise<CreateRequestResponse>;

  /**
   * Get details of a specific request
   */
  getRequestDetails(
    requestId: number,
    accessToken: string
  ): Promise<RequestDetailsResponse>;
}