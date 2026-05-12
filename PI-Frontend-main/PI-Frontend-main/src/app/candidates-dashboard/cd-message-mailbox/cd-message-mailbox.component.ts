import { Component, OnInit } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from '../../api.service';

interface MessageConversation {
    email: string;
    name: string;
    unreadCount: number;
    lastMessageDate: string;
    lastMessagePreview: string;
}

@Component({
    selector: 'app-cd-message-mailbox',
    standalone: false,
    templateUrl: './cd-message-mailbox.component.html',
    styleUrls: ['./cd-message-mailbox.component.scss']
})
export class CdMessageMailboxComponent implements OnInit {
    messages: any[] = [];
    conversations: MessageConversation[] = [];
    filteredConversations: MessageConversation[] = [];
    selectedContactEmail = '';
    selectedContactName = '';
    currentUserEmail = '';
    loading = false;
    searchTerm = '';

    composeForm = {
        receiverEmail: '',
        receiverName: '',
        subject: '',
        contenu: ''
    };

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.currentUserEmail = this.resolveCurrentUserEmail();
        this.loadMessages();
    }

    loadMessages(): void {
        this.loading = true;
        this.apiService.getMessagesForCurrentUser().subscribe({
            next: (data) => {
                this.messages = Array.isArray(data) ? data : [];
                this.buildConversations();
                this.loading = false;
            },
            error: (error) => {
                console.error('Erreur chargement messages:', error);
                this.messages = [];
                this.conversations = [];
                this.filteredConversations = [];
                this.loading = false;
            }
        });
    }

    buildConversations(): void {
        const map = new Map<string, MessageConversation>();

        this.messages.forEach((message: any) => {
            const counterpart = this.getCounterpart(message);
            if (!counterpart.email) {
                return;
            }

            const messageDate = this.formatDateValue(message.dateEnvoi);
            const preview = String(message.contenu || '').slice(0, 90);
            const unreadCount = String(message.receiverEmail || '').toLowerCase() === this.currentUserEmail.toLowerCase() && !message.lu ? 1 : 0;
            const existing = map.get(counterpart.email);

            if (!existing) {
                map.set(counterpart.email, {
                    email: counterpart.email,
                    name: counterpart.name,
                    unreadCount,
                    lastMessageDate: messageDate,
                    lastMessagePreview: preview
                });
                return;
            }

            existing.unreadCount += unreadCount;
            if (!existing.lastMessageDate || messageDate > existing.lastMessageDate) {
                existing.lastMessageDate = messageDate;
                existing.lastMessagePreview = preview;
                existing.name = counterpart.name || existing.name;
            }
        });

        this.conversations = Array.from(map.values()).sort((a, b) => b.lastMessageDate.localeCompare(a.lastMessageDate));
        this.applySearch();

        if (!this.selectedContactEmail && this.conversations.length > 0) {
            this.selectConversation(this.conversations[0]);
        }
    }

    applySearch(): void {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            this.filteredConversations = [...this.conversations];
            return;
        }

        this.filteredConversations = this.conversations.filter((conversation) =>
            conversation.name.toLowerCase().includes(term) ||
            conversation.email.toLowerCase().includes(term) ||
            conversation.lastMessagePreview.toLowerCase().includes(term)
        );
    }

    selectConversation(conversation: MessageConversation): void {
        this.selectedContactEmail = conversation.email;
        this.selectedContactName = conversation.name;
        this.composeForm.receiverEmail = conversation.email;
        this.composeForm.receiverName = conversation.name;
        this.composeForm.subject = conversation.lastMessagePreview ? `Re: ${conversation.lastMessagePreview}` : 'Re: message';
        this.composeForm.contenu = '';
        this.markConversationMessagesAsRead(conversation.email);
    }

    get selectedConversationMessages(): any[] {
        if (!this.selectedContactEmail) {
            return [];
        }

        return this.messages.filter((message: any) => this.isSameConversation(message, this.selectedContactEmail));
    }

    sendMessage(): void {
        if (!this.composeForm.receiverEmail.trim() || !this.composeForm.contenu.trim()) {
            return;
        }

        this.apiService.sendMessage({
            subject: this.composeForm.subject || 'Nouveau message',
            contenu: this.composeForm.contenu,
            receiverEmail: this.composeForm.receiverEmail,
            receiverName: this.composeForm.receiverName,
            type: 'CHAT'
        }).subscribe({
            next: () => {
                this.composeForm.contenu = '';
                this.composeForm.subject = 'Nouveau message';
                this.loadMessages();
            },
            error: (error) => console.error('Erreur envoi message:', error)
        });
    }

    replyTo(message: any): void {
        const counterpart = this.getCounterpart(message);
        if (!counterpart.email) {
            return;
        }

        this.composeForm.receiverEmail = counterpart.email;
        this.composeForm.receiverName = counterpart.name;
        this.composeForm.subject = message.subject ? `Re: ${message.subject}` : 'Re: message';
        this.composeForm.contenu = '';
        this.selectedContactEmail = counterpart.email;
        this.selectedContactName = counterpart.name;
    }

    get unreadCount(): number {
        return this.messages.filter((message: any) => String(message.receiverEmail || '').toLowerCase() === this.currentUserEmail.toLowerCase() && !message.lu).length;
    }

    private markConversationMessagesAsRead(contactEmail: string): void {
        const unreadMessages = this.messages.filter((message: any) =>
            String(message.receiverEmail || '').toLowerCase() === this.currentUserEmail.toLowerCase() &&
            String(message.senderEmail || '').toLowerCase() === contactEmail.toLowerCase() &&
            !message.lu
        );

        unreadMessages.forEach((message: any) => {
            this.apiService.marquerMessageCommeL(message.id).subscribe({
                next: () => message.lu = true,
                error: (error) => console.error('Erreur marquage lu:', error)
            });
        });
    }

    private isSameConversation(message: any, contactEmail: string): boolean {
        const senderEmail = String(message.senderEmail || '').toLowerCase();
        const receiverEmail = String(message.receiverEmail || '').toLowerCase();
        const normalizedContact = contactEmail.toLowerCase();
        const current = this.currentUserEmail.toLowerCase();

        return (
            (senderEmail === current && receiverEmail === normalizedContact) ||
            (senderEmail === normalizedContact && receiverEmail === current)
        );
    }

    private getCounterpart(message: any): { email: string; name: string } {
        const senderEmail = String(message.senderEmail || '').toLowerCase();
        const current = this.currentUserEmail.toLowerCase();

        if (senderEmail === current) {
            return {
                email: message.receiverEmail || '',
                name: message.receiverName || message.receiverEmail || ''
            };
        }

        return {
            email: message.senderEmail || '',
            name: message.senderName || message.senderEmail || ''
        };
    }

    private resolveCurrentUserEmail(): string {
        const storedEmail = String(localStorage.getItem('userEmail') || '').trim();
        if (storedEmail) {
            return storedEmail;
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

    private formatDateValue(date: any): string {
        if (!date) {
            return '';
        }

        return new Date(date).toISOString();
    }
}
