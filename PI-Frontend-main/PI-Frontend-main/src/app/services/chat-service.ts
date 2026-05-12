// chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {

    private api = '/api/chat';

    constructor(private http: HttpClient) {}

    envoyer(payload: any): Observable<any> {
        return this.http.post(this.api, payload);
    }

    getMessages(evenementId: number, candidatId: number): Observable<any[]> {
        return this.http.get<any[]>(
            `${this.api}/evenement/${evenementId}/candidat/${candidatId}`
        );
    }

    getChatStatut(evenementId: number): Observable<boolean> {
        return this.http.get<boolean>(`${this.api}/statut/${evenementId}`);
    }
}