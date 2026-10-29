# Chat Engine — Technical Reference
**CASFETA CUD Chapter Management System**
Version 1.0 · October 2026

---

## 1. Overview

The chat engine is a **REST API + short-poll** messaging system built entirely on the existing Next.js + PostgreSQL (Neon) stack. It requires no additional servers, no WebSocket infrastructure, and no third-party real-time services. It is designed to be portable — any system that can make HTTP requests and run a polling loop can integrate it.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│                                                             │
│  ┌──────────────┐    HTTP POST     ┌───────────────────┐   │
│  │  Send Message│ ───────────────► │  /api/chat/       │   │
│  │  React/Reply │                  │  messages         │   │
│  │  Upload File │                  │  conversations    │   │
│  └──────────────┘                  │  reactions        │   │
│                                    └────────┬──────────┘   │
│  ┌──────────────┐    HTTP GET              │               │
│  │  Poll every  │ ───────────────►         │               │
│  │  3 seconds   │ ◄───────────────         ▼               │
│  └──────────────┘    New messages  ┌───────────────────┐   │
│                                    │  Neon PostgreSQL   │   │
│                                    │  (serverless)      │   │
│                                    └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Reason |
|----------|--------|
| Polling (not WebSockets) | Vercel serverless functions close after each response — persistent connections are not possible without a separate server |
| 3-second poll interval | Acceptable latency for a fellowship system; feels near-real-time for small groups |
| REST API (not GraphQL subscriptions) | Consistent with the rest of the system's API pattern |
| PostgreSQL (not Redis pub/sub) | All data in one place, simpler operations, no extra infrastructure |
| UploadThing for files | Already integrated in the system for document/image uploads |

---

## 3. Database Schema

### 3.1 Tables

```sql
-- A conversation container (DIRECT or GROUP)
CREATE TABLE "Conversation" (
  "id"          TEXT        PRIMARY KEY,
  "type"        TEXT        NOT NULL DEFAULT 'DIRECT', -- DIRECT | GROUP
  "name"        TEXT,                                   -- null for DIRECT
  "description" TEXT,                                   -- group note/bio
  "avatarUrl"   TEXT,                                   -- group profile photo URL
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Who is in a conversation + their read cursor
CREATE TABLE "ConversationParticipant" (
  "id"             TEXT        PRIMARY KEY,
  "conversationId" TEXT        NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "memberId"       TEXT        NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE,
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE ("conversationId", "memberId")
);

-- Individual messages
CREATE TABLE "Message" (
  "id"             TEXT        PRIMARY KEY,
  "conversationId" TEXT        NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId"       TEXT        NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE,
  "type"           TEXT        NOT NULL DEFAULT 'TEXT', -- TEXT | IMAGE | FILE | EMOJI
  "content"        TEXT        NOT NULL,                -- text or UploadThing URL
  "fileName"       TEXT,                                -- original filename for FILE type
  "fileSize"       INTEGER,                             -- bytes
  "deleted"        BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Emoji reactions on messages
CREATE TABLE "MessageReaction" (
  "id"        TEXT        PRIMARY KEY,
  "messageId" TEXT        NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "memberId"  TEXT        NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE,
  "emoji"     TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE ("messageId", "memberId", "emoji")
);
```

### 3.2 Indexes

```sql
CREATE INDEX "Conversation_type_idx"         ON "Conversation"("type");
CREATE INDEX "Conversation_updatedAt_idx"    ON "Conversation"("updatedAt");
CREATE INDEX "ConvParticipant_memberId_idx"  ON "ConversationParticipant"("memberId");
CREATE INDEX "Message_conv_createdAt_idx"    ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_idx"          ON "Message"("senderId");
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
CREATE INDEX "MessageReaction_memberId_idx"  ON "MessageReaction"("memberId");
```

---

## 4. API Reference

Base URL: `https://your-domain.com`
Authentication: All endpoints require a valid session cookie / JWT.

---

### 4.1 List Conversations

```
GET /api/chat/conversations
```

Returns all conversations the authenticated member participates in, ordered by most recent activity.

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cm...",
        "type": "GROUP",
        "name": "Praise & Worship",
        "description": "Ministry coordination group",
        "avatarUrl": "https://utfs.io/...",
        "participants": [
          { "id": "cm...", "fullName": "James Mwalubandu", "profilePhoto": null }
        ],
        "lastMessage": {
          "id": "cm...",
          "content": "Meeting at 6pm today",
          "type": "TEXT",
          "senderId": "cm...",
          "senderName": "James Mwalubandu",
          "createdAt": "2026-10-29T05:00:00.000Z"
        },
        "unreadCount": 3,
        "updatedAt": "2026-10-29T05:00:00.000Z"
      }
    ]
  }
}
```

---

### 4.2 Create Conversation

```
POST /api/chat/conversations
Content-Type: application/json
```

**Direct message**
```json
{
  "type": "DIRECT",
  "participantIds": ["cm_other_member_id"]
}
```

**Group chat**
```json
{
  "type": "GROUP",
  "name": "Praise & Worship",
  "description": "Ministry coordination",
  "avatarUrl": "https://utfs.io/...",
  "participantIds": ["cm_id1", "cm_id2", "cm_id3"]
}
```

> For DIRECT: if a conversation already exists between the two members, the existing one is returned (no duplicate).

---

### 4.3 Update Group Info

```
PATCH /api/chat/conversations/:id
Content-Type: application/json
```

```json
{
  "name": "New Group Name",
  "description": "Updated description",
  "avatarUrl": "https://utfs.io/..."
}
```

---

### 4.4 Fetch Messages

```
GET /api/chat/messages?conversationId=cm...&limit=40&before=ISO_TIMESTAMP
```

| Param | Required | Description |
|-------|----------|-------------|
| `conversationId` | ✅ | ID of the conversation |
| `limit` | ❌ | Max messages (default 40, max 100) |
| `before` | ❌ | ISO timestamp cursor for older messages |

Also marks all messages as read (`lastReadAt` updated).

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cm...",
        "conversationId": "cm...",
        "senderId": "cm...",
        "type": "TEXT",
        "content": "Hello everyone!",
        "fileName": null,
        "fileSize": null,
        "deleted": false,
        "createdAt": "2026-10-29T05:00:00.000Z",
        "sender": {
          "id": "cm...",
          "fullName": "James Mwalubandu",
          "profilePhoto": null
        },
        "reactions": [
          {
            "id": "cm...",
            "emoji": "❤️",
            "memberId": "cm...",
            "member": { "id": "cm...", "fullName": "Amina Juma" }
          }
        ]
      }
    ],
    "hasMore": false
  }
}
```

---

### 4.5 Send Message

```
POST /api/chat/messages
Content-Type: application/json
```

**Text message**
```json
{
  "conversationId": "cm...",
  "content": "Hello everyone!",
  "type": "TEXT"
}
```

**File / Image message** (upload to UploadThing first, then send the URL)
```json
{
  "conversationId": "cm...",
  "content": "https://utfs.io/f/abc123.pdf",
  "type": "FILE",
  "fileName": "meeting-minutes.pdf",
  "fileSize": 204800
}
```

**Message types**

| Type | `content` field contains |
|------|--------------------------|
| `TEXT` | Plain text string |
| `IMAGE` | UploadThing image URL |
| `FILE` | UploadThing file URL |
| `EMOJI` | Single emoji character |

---

### 4.6 Toggle Reaction

```
POST /api/chat/reactions
Content-Type: application/json
```

```json
{ "messageId": "cm...", "emoji": "❤️" }
```

Toggle: same emoji again removes the reaction.

**Response**
```json
{ "success": true, "data": { "action": "added", "emoji": "❤️" } }
```

---

### 4.7 Unread Count

```
GET /api/chat/unread
```

**Response**
```json
{ "success": true, "data": { "unread": 5 } }
```

---

## 5. Polling Implementation

```typescript
useEffect(() => {
  const poll = setInterval(() => {
    fetchConversations();                     // refresh sidebar + unread counts
    if (activeConversationId) {
      fetchMessages(activeConversationId);    // get new messages in open thread
    }
  }, 3_000);

  return () => clearInterval(poll);
}, [activeConversationId]);
```

### Recommended poll intervals

| Concurrent users | Interval |
|-----------------|----------|
| < 50 | 3 seconds |
| 50 – 500 | 5 seconds |
| 500+ | Upgrade to Pusher |

---

## 6. File Sharing Flow

```
1. User selects a file
2. Client uploads to UploadThing → receives { ufsUrl, name, size }
3. Client sends POST /api/chat/messages with:
   { content: ufsUrl, type: "FILE", fileName: name, fileSize: size }
4. URL stored in Message.content
5. Other members receive the URL via polling and render it
```

Images render inline (`<img>`). Files render as a download link with icon + filename.

---

## 7. Porting to Another System

### Step 1 — Run the DB migration

```bash
node scripts/create-chat-tables.mjs
node scripts/create-chat-reactions.mjs
```

Or apply the SQL from Section 3 directly against your PostgreSQL database.

### Step 2 — Copy the API routes

```
src/app/api/chat/
  conversations/route.ts         ← list + create
  conversations/[id]/route.ts    ← update group info
  messages/route.ts              ← fetch + send
  reactions/route.ts             ← toggle reaction
  unread/route.ts                ← nav badge count
```

**The only things to change in each route are 3 imports:**

| Import | Replace with |
|--------|-------------|
| `@/lib/db` | Your Prisma client |
| `@/lib/auth/session` → `getCurrentUser()` | Your auth helper (must return `{ user: { memberId } }`) |
| `@/lib/utils/api` → `ok`, `unauthorized`, etc. | Your response helpers |

### Step 3 — Copy the frontend component

Copy `src/components/modules/chat-view.tsx`.

**Dependencies:**
- shadcn/ui: Avatar, Button, Input, Textarea, Dialog, Badge, Skeleton, Label
- lucide-react icons
- `useUploadThing` from `@uploadthing/react`
- Auth hook returning `{ member: { id, fullName } }`
- i18n hook returning `{ t }` — or replace `t("chat.*")` calls with plain strings

### Step 4 — Add unread badge to nav

Poll `GET /api/chat/unread` every 30–60 seconds from your layout and show the count on the Messages nav item.

---

## 8. Upgrade Path — Pusher (Real-time)

When polling is no longer sufficient:

**Server side** — after saving the message to DB:
```typescript
import Pusher from "pusher";
const pusher = new Pusher({ appId, key, secret, cluster });
await pusher.trigger(`conversation-${conversationId}`, "new-message", message);
```

**Client side** — replace the `setInterval` with:
```typescript
const channel = pusherClient.subscribe(`conversation-${conversationId}`);
channel.bind("new-message", (msg) => setMessages((prev) => [...prev, msg]));
return () => pusherClient.unsubscribe(`conversation-${conversationId}`);
```

DB schema and all API contracts stay identical. No other changes needed.

---

## 9. Error Codes

| HTTP | Meaning |
|------|---------|
| 400 | Missing required field |
| 401 | Not authenticated |
| 403 | Not a participant of this conversation |
| 404 | Message or conversation not found |
| 500 | Server error |

---

## 10. Feature Summary

| Feature | Implementation |
|---------|---------------|
| Direct messages | `POST /api/chat/conversations` `type: DIRECT` |
| Group chats | `POST /api/chat/conversations` `type: GROUP` |
| Group photo + description | `PATCH /api/chat/conversations/:id` |
| Send text | `POST /api/chat/messages` `type: TEXT` |
| Send image | UploadThing → `POST /api/chat/messages` `type: IMAGE` |
| Send file | UploadThing → `POST /api/chat/messages` `type: FILE` |
| Emoji reactions | `POST /api/chat/reactions` (toggle) |
| Reply to message | Quote prepended to message content |
| Unread count | `GET /api/chat/unread` |
| Real-time | 3-second polling (upgradeable to Pusher) |
| Storage | Neon PostgreSQL (serverless) |
| File storage | UploadThing CDN |

---

*Document generated: October 2026 · CASFETA CUD Chapter Management System*
