import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';

declare var Pusher: any;

export interface PusherNotification {
    id: number;
    type: string;
    message: string;
    senderId: number;
    offreEmploiId?: number;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class PusherService {

    private pusher: any;
    private channel: any;
    private notificationSubject = new BehaviorSubject<PusherNotification | null>(null);
    notification$ = this.notificationSubject.asObservable();
    private apiUrl = '/api';

    constructor(private http: HttpClient) {
        this.initPusher();
    }

    /**
     * Initialize Pusher with your credentials
     */
    private initPusher() {
        (Pusher).logToConsole = true;

        this.pusher = new Pusher('07a41117ca80364c7695', {
            cluster: 'eu',
            encrypted: true,
            authorizer: (channel: any) => {
                return {
                    authorize: (socket_id: string, callback: any) => {
                        const token = localStorage.getItem('token');
                        if (!token) {
                            console.error('No token found for channel authorization');
                            callback(true);
                            return;
                        }

                        const params = new URLSearchParams({
                            socket_id: socket_id,
                            channel_name: channel.name
                        });

                        fetch(`${this.apiUrl}/pusher/auth?${params}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Auth failed with status ${response.status}`);
                                }
                                return response.json();
                            })
                            .then((data: any) => {
                                if (data && data.auth) {
                                    callback(null, data);
                                } else {
                                    console.error('Invalid auth response format:', data);
                                    callback(true);
                                }
                            })
                            .catch((error) => {
                                console.error('Channel authorization failed:', error);
                                callback(true);
                            });
                    }
                };
            }
        });
    }

    /**
     * Authorize private channel with backend
     */
    private authorizeChannel(socket_id: string, channel_name: string): Observable<any> {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }

        console.log('🔐 Requesting channel authorization for:', channel_name);
        const params = `socket_id=${socket_id}&channel_name=${channel_name}`;
        return this.http.post(`${this.apiUrl}/pusher/auth?${params}`, {}, { headers, responseType: 'text' }).pipe(
            tap((response: any) => {
                console.log('✅ Channel authorization successful:', response);
            }),
            catchError((error: any) => {
                console.error('❌ Channel authorization failed:', error);
                throw error;
            })
        );
    }

    /**
     * Subscribe to user's private notification channel
     * Call this after user logs in
     */
    public subscribeToNotifications(userId: number) {
        if (!userId) {
            console.error('User ID is required to subscribe to notifications');
            return;
        }

        const channelName = `private-user-${userId}`;

        this.channel = this.pusher.subscribe(channelName);

        this.channel.bind('pusher:subscription_succeeded', () => {
            console.log('Successfully subscribed to notifications channel:', channelName);
        });

        this.channel.bind('pusher:subscription_error', (error: any) => {
            console.error('Subscription error on channel', channelName, ':', error);
        });

        this.channel.bind('new-notification', (data: PusherNotification) => {
            console.log('New notification received:', data);
            this.notificationSubject.next(data);
        });
    }

    /**
     * Unsubscribe from notifications
     */
    public unsubscribeFromNotifications(userId: number) {
        if (!userId) {
            return;
        }

        const channelName = `private-user-${userId}`;
        console.log('🚫 Unsubscribing from channel:', channelName);
        this.pusher.unsubscribe(channelName);
        this.channel = null;
    }

    /**
     * Get notification stream
     */
    public getNotificationStream(): Observable<PusherNotification | null> {
        return this.notification$;
    }

    /**
     * Disconnect Pusher
     */
    public disconnect() {
        if (this.pusher) {
            this.pusher.disconnect();
            console.log('🔌 Pusher disconnected');
        }
    }
}
