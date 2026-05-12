import { Component, OnDestroy, OnInit } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { interval, Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../api.service';

@Component({
    selector: 'app-rd-header',
    standalone: false,
    templateUrl: './rd-header.component.html',
    styleUrls: ['./rd-header.component.scss']
})
export class RdHeaderComponent implements OnInit, OnDestroy {
    unreadCount = 0;
    unreadCheatAlertCount = 0;
    private currentUserEmail = '';
    private readonly destroy$ = new Subject<void>();

    constructor(private apiService: ApiService) { }

    ngOnInit(): void {
        this.currentUserEmail = this.resolveCurrentUserEmail();
        this.loadNotificationCounters();

        interval(15000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadNotificationCounters());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadNotificationCounters(): void {
        this.apiService.getMessagesForCurrentUser().subscribe({
            next: (messages: any[]) => {
                const list = Array.isArray(messages) ? messages : [];
                const incomingUnread = list.filter((message: any) => {
                    const isUnread = !message?.lu;
                    if (!isUnread) {
                        return false;
                    }

                    const receiverEmail = String(message?.receiverEmail || '').toLowerCase();
                    if (!this.currentUserEmail) {
                        return true;
                    }

                    return receiverEmail === this.currentUserEmail.toLowerCase();
                });

                this.unreadCount = incomingUnread.length;
                this.unreadCheatAlertCount = incomingUnread.filter((message: any) => this.isCheatRefusalAlert(message)).length;
            },
            error: () => {
                this.unreadCount = 0;
                this.unreadCheatAlertCount = 0;
            }
        });
    }

    private isCheatRefusalAlert(message: any): boolean {
        const subject = String(message?.subject || '').toLowerCase();
        const content = String(message?.contenu || message?.content || '').toLowerCase();

        const hasCheatKeyword = subject.includes('triche') || content.includes('triche');
        const hasRefusalKeyword = subject.includes('refuse') || content.includes('refuse');
        return hasCheatKeyword && hasRefusalKeyword;
    }

    private resolveCurrentUserEmail(): string {
        const stored = String(localStorage.getItem('userEmail') || '').trim();
        if (stored) {
            return stored;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            return '';
        }

        try {
            const decoded: any = jwtDecode(token);
            return String(decoded?.email || decoded?.sub || '').trim();
        } catch {
            return '';
        }
    }

}
