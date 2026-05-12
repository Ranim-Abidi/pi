import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FreelanceMilestone {
  id: number;
  contractId: number;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'FUNDED' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PAID' | 'REVISION';
  createdAt: string;
  submissionNote?: string;
  deliveryUrl?: string;
  clientFeedback?: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface FreelanceContract {
  id: number;
  missionId: number;
  missionTitre: string;
  clientId: number;
  clientNom: string;
  freelancerId: number;
  freelancerNom: string;
  amount: number;
  terms: string;
  status: 'DRAFT' | 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  createdAt: string;
  totalPaid: number;
  inEscrow: number;
  
  smartContractHash?: string;
  termsVersion?: number;
  auditTrail?: string;
  clientAccepted?: boolean;
  freelancerAccepted?: boolean;
  clientSignature?: string;
  freelancerSignature?: string;
  totalEscrow?: number;
  milestones?: FreelanceMilestone[];

  // Ratings (client ↔ freelancer) after contract completion
  clientRating?: number;
  clientRatingComment?: string;
  freelancerRating?: number;
  freelancerRatingComment?: string;
}

export interface FreelanceDispute {
  id: number;
  contractId: number;
  openedById: number;
  openedByName: string;
  reason: string;
  evidenceNotes: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_CLIENT' | 'RESOLVED_FREELANCER' | 'CLOSED';
  createdAt: string;
}

export interface FreelanceChatRoom {
  id: number;
  missionId?: number;
  missionTitre?: string;
  clientId: number;
  clientNom: string;
  freelancerId: number;
  freelancerNom: string;
  updatedAt: string;
}

export interface FreelanceChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  senderNom: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface FreelanceInvoice {
  id: number;
  contractId: number;
  paymentId?: number;
  invoiceNumber: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FreelanceWorkspaceService {
  private BASE = `${environment.apiUrl}/freelance/workspace`;

  constructor(private http: HttpClient) {}

  // ================= Chat API =================
  getMyRooms(): Observable<FreelanceChatRoom[]> {
    return this.http.get<FreelanceChatRoom[]>(`${this.BASE}/rooms`);
  }

  getOrCreateRoom(missionId: number, freelancerId: number): Observable<FreelanceChatRoom> {
    return this.http.post<FreelanceChatRoom>(`${this.BASE}/rooms/get-or-create`, { missionId, freelancerId });
  }

  getRoomMessages(roomId: number): Observable<FreelanceChatMessage[]> {
    return this.http.get<FreelanceChatMessage[]>(`${this.BASE}/rooms/${roomId}/messages`);
  }

  sendMessage(roomId: number, content: string): Observable<FreelanceChatMessage> {
    return this.http.post<FreelanceChatMessage>(`${this.BASE}/rooms/${roomId}/messages`, { content });
  }

  // ================= Contracts API =================
  getMyContracts(): Observable<FreelanceContract[]> {
    return this.http.get<FreelanceContract[]>(`${this.BASE}/contracts`);
  }

  proposeContract(missionId: number, freelancerId: number, amount: number, terms: string): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/propose`, { missionId, freelancerId, amount, terms });
  }

  acceptContract(contractId: number, signature: string): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/accept`, { signature });
  }

  fundEscrow(contractId: number, amount: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/fund`, { amount });
  }

  releasePayment(contractId: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/release`, {});
  }

  pauseContract(contractId: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/pause`, {});
  }

  resumeContract(contractId: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/resume`, {});
  }

  cancelContract(contractId: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/cancel`, {});
  }

  // ── Ratings ─────────────────────────────────────────────────────────
  rateFreelancer(contractId: number, rating: number, comment: string): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/rate/freelancer`, { rating, comment });
  }

  rateClient(contractId: number, rating: number, comment: string): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/rate/client`, { rating, comment });
  }

  generateContract(missionId: number, freelancerId: number, amount: number): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/generate`, { missionId, freelancerId, amount });
  }

  addMilestone(contractId: number, title: string, description: string, amount: number, dueDate?: string): Observable<FreelanceMilestone> {
    return this.http.post<FreelanceMilestone>(`${this.BASE}/contracts/${contractId}/milestones`, { title, description, amount, dueDate });
  }

  simulateStripeFund(contractId: number, amount: number, stripeToken: string): Observable<FreelanceContract> {
    return this.http.post<FreelanceContract>(`${this.BASE}/contracts/${contractId}/stripe-fund`, { amount, stripeToken });
  }

  requestMilestoneRevision(milestoneId: number, feedback?: string): Observable<FreelanceMilestone> {
    return this.http.post<FreelanceMilestone>(`${this.BASE}/milestones/${milestoneId}/revision`, { feedback: feedback || '' });
  }

  submitMilestone(milestoneId: number, submissionNote?: string, deliveryUrl?: string): Observable<FreelanceMilestone> {
    return this.http.post<FreelanceMilestone>(`${this.BASE}/milestones/${milestoneId}/submit`, {
      submissionNote: submissionNote || '',
      deliveryUrl: deliveryUrl || ''
    });
  }

  approveMilestone(milestoneId: number, feedback?: string): Observable<FreelanceMilestone> {
    return this.http.post<FreelanceMilestone>(`${this.BASE}/milestones/${milestoneId}/approve`, { feedback: feedback || '' });
  }

  releaseMilestone(milestoneId: number): Observable<FreelanceMilestone> {
    return this.http.post<FreelanceMilestone>(`${this.BASE}/milestones/${milestoneId}/release`, {});
  }

  openDispute(contractId: number, reason: string, evidenceNotes: string): Observable<FreelanceDispute> {
    return this.http.post<FreelanceDispute>(`${this.BASE}/contracts/${contractId}/disputes`, { reason, evidenceNotes });
  }

  getDisputes(contractId: number): Observable<FreelanceDispute[]> {
    return this.http.get<FreelanceDispute[]>(`${this.BASE}/contracts/${contractId}/disputes`);
  }

  resolveDispute(disputeId: number, resolution: 'CLIENT' | 'FREELANCER' | 'CLOSED'): Observable<FreelanceDispute> {
    return this.http.post<FreelanceDispute>(`${this.BASE}/disputes/${disputeId}/resolve`, { resolution });
  }

  getMyInvoices(): Observable<FreelanceInvoice[]> {
    return this.http.get<FreelanceInvoice[]>(`${environment.apiUrl}/freelance/invoices`);
  }

  getInvoicePdf(invoiceId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/freelance/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
  }
}
