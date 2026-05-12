-- Migration to make sender_id nullable in notifications table
-- This allows system-generated notifications (like profile incomplete) to not require a sender

ALTER TABLE notifications MODIFY COLUMN sender_id BIGINT NULL;
