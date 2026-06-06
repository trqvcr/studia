# Studia

Studia is a social productivity application designed to help university students track their academic efforts and build better study habits through peer accountability (friends).

## How to run the app locally

### Prerequisites
```md
For iPhone testing on restricted Wi-Fi, you can use ngrok to tunnel the backend. (Instructions below)
```
- Node.js
- npm
- Expo Go (for iOS testing)
- Supabase project credentials
- OPTIONAL: ngrok

### Backend

```bash
cd server
npm install
cp .env.example .env
```

Fill in the values in `.env`, then start the server:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `EXPO_PUBLIC_API_URL`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
```

Find your local IP:

```bash
ipconfig getifaddr en0
```

Start Expo:

```bash
npx expo start --tunnel
```

Open Expo Go on your iPhone and scan the QR code.

### Optional: Run on iPhone with ngrok

If your iPhone cannot reach your Mac directly on the local network, you can tunnel the backend with ngrok.

#### Install ngrok and connect your account

```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

#### Start the backend

```bash
cd server
npm install
npm start
```

#### Open an ngrok tunnel for the backend

In a second terminal:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL that ngrok shows, for example:

```text
https://abc123.ngrok-free.app
```

#### Update the frontend environment file

In `frontend/.env`, set:

```env
EXPO_PUBLIC_API_URL=https://YOUR_NGROK_URL
```

Replace `YOUR_NGROK_URL` with the HTTPS URL from ngrok.

#### Restart Expo

```bash
cd frontend
npx expo start --tunnel
```

Open Expo Go on your iPhone and scan the QR code.

#### Note

Ngrok URLs usually change each time you restart ngrok unless you have a reserved domain, so update `frontend/.env` whenever the URL changes.

## Architecture

Diagram 1 uses a component graph to show the static structure: which modules exist and how data flows between layers.
Diagrams 2 and 3 use sequence diagrams to show dynamic behavior which is the order of operations for key user flows that touch all three layers.

### Diagram 1 - System Component Overview

This diagram shows how the three layers of Studia communicate. 
The React Native frontend makes authenticated HTTP requests to the Express 
backend, which reads and writes to a Supabase (PostgreSQL) database.

```mermaid
graph TD
    subgraph Frontend["React Native (Expo)"]
        LS["LoginScreen"]
        HS["HomeScreen"]
        FS["FriendsScreen"]
        PS["ProfileScreen"]
        APP["App.js<br/>auth state + navigation"]
    end

    subgraph Backend["Express Server"]
        AUTH["/auth<br/>register / login"]
        SESS["/sessions<br/>start / stop / list"]
        FRND["/friends<br/>add / search / list"]
        PROF["/profile<br/>classes"]
        MW["requireAuth<br/>middleware"]
    end

    subgraph DB["Supabase (PostgreSQL)"]
        USERS[("users")]
        SESSIONS[("sessions")]
        FRIENDS[("friendships")]
    end

    APP -->|user + token| HS
    APP -->|user + token| FS
    APP -->|user + token| PS

    LS -->|POST /auth/register<br/>POST /auth/login| AUTH
    HS -->|POST /sessions/start<br/>POST /sessions/stop<br/>GET /sessions/:id| SESS
    FS -->|GET /friends<br/>POST /friends/add<br/>GET /friends/search| FRND
    PS -->|GET /sessions/:id<br/>GET /profile/:id| PROF

    AUTH --> USERS
    SESS --> MW --> SESSIONS
    FRND --> MW --> FRIENDS
    PROF --> MW --> SESSIONS
```

---

### Diagram 2 - Start Study Session (Sequence Diagram)

This sequence diagram traces exactly what happens when a logged-in user 
taps "Start Study Session" in HomeScreen, from button press to the updated 
UI showing the active session.

```mermaid
sequenceDiagram
    actor User
    participant HS as HomeScreen
    participant API as Express /sessions
    participant MW as requireAuth
    participant DB as Supabase

    User->>HS: Taps "Start Study Session", enters subject
    HS->>API: POST /sessions/start {userId, subject} + Bearer token
    API->>MW: Validate JWT token
    MW-->>API: token valid, attach user
    API->>DB: INSERT into sessions (user_id, subject, start_time, active=true)
    DB-->>API: new session row
    API-->>HS: 200 { session: { id, subject, startTime, active: true } }
    HS->>HS: setActiveSession(session)
    HS-->>User: Shows "🟢 Live" banner + "End Session" button
```

### Diagram 3 - Friends: Search, Add, Accept, and Remove (Sequence Diagram)

This diagram shows the full friend workflow: searching for a user, viewing
their profile, and all possible actions (send request, accept request, or
remove friend).

```mermaid
sequenceDiagram
    actor User
    participant FS as FriendsScreen
    participant FP as FriendProfile
    participant Auth as requireAuth
    participant Router as Friends Router
    participant DB as Supabase

    Note over User,DB: Phase 1 - search for a user
    User->>FS: types username in search bar
    FS->>FS: 500ms debounce timer
    FS->>Auth: GET /friends/search?username=alice + Bearer JWT
    Auth->>Router: req.user.id attached
    Router->>DB: SELECT * FROM users WHERE username ILIKE '%alice%'
    DB-->>Router: matching user rows
    Router-->>FS: 200 { users: [...] }
    FS->>FS: filter out self
    FS-->>User: search results dropdown

    Note over User,DB: Phase 2 - view friend profile
    User->>FS: taps a user in results or friends list
    FS->>FP: renders FriendProfile component
    FP->>Auth: GET /friends/profile/:targetId + Bearer JWT
    Auth->>Router: req.user.id attached
    Router->>DB: SELECT user + friendship status + friendCount
    DB-->>Router: user row + status (null/pending/accepted)
    Router-->>FP: 200 { user, status, isRequester, friendCount }
    FP-->>User: shows profile card + smart action button

    Note over User,DB: Phase 3 - action depends on friendship status
    alt status is null
        User->>FP: taps "Request Friend"
        FP->>Auth: POST /friends/add { friendId } + Bearer JWT
        Auth->>Router: req.user.id attached
        Router->>DB: INSERT INTO friendships (status=pending)
        DB-->>Router: new row
        Router-->>FP: 201 { friendship }
        FP->>FP: status=pending, isRequester=true
        FP-->>User: button changes to "Requested"
    else status=pending and user is NOT requester
        User->>FP: taps "Accept Request"
        FP->>Auth: POST /friends/accept { friendId } + Bearer JWT
        Auth->>Router: req.user.id attached
        Router->>DB: UPDATE friendships SET status=accepted
        DB-->>Router: updated row
        Router-->>FP: 200 { friendship }
        FP->>FP: status=accepted
        FP-->>User: button changes to "Friends"
    else status=accepted
        User->>FP: taps "Remove Friend"
        FP->>Auth: POST /friends/remove { friendId } + Bearer JWT
        Auth->>Router: req.user.id attached
        Router->>DB: DELETE FROM friendships
        DB-->>Router: success
        Router-->>FP: 200 { message }
        FP->>FP: status=null
        FP-->>User: button resets to "Request Friend"
    end
```

### Diagram 4 - Adding Optional Study Notes to a Session (Sequence Diagram)

[UML Sequence Diagram.drawio (2).pdf](https://github.com/user-attachments/files/28655902/UML.Sequence.Diagram.drawio.2.pdf)




