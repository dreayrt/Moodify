# KZuy Phase 1: User Role Features - Documentation

## Tổng quan

KZuy Phase 1 triển khai 3 tính năng cốt lõi cho User role trong Moodify:
1. **Browse & Play Tracks** - Xem danh sách nhạc từ backend API thật
2. **User Library** - Like/save tracks vào thư viện cá nhân
3. **Search** - Tìm kiếm tracks và artists

Hệ thống sử dụng **polyglot persistence** với MySQL (user data, library) và MongoDB (music catalog).

---

## 1. Kiến trúc hệ thống

### 1.1 Data Flow Overview

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP + JWT
         ↓
┌─────────────────┐
│  Spring Boot    │
│  Backend API    │
└────┬───────┬────┘
     │       │
     ↓       ↓
┌────────┐ ┌──────────┐
│ MySQL  │ │ MongoDB  │
│ Users  │ │ Tracks   │
│Library │ │ Artists  │
└────────┘ └──────────┘
```

### 1.2 Polyglot Persistence

**MySQL** (Relational - User Data)
- `users` - User accounts, authentication
- `user_library_tracks` - User's saved tracks (many-to-many)

**MongoDB** (Document - Music Catalog)
- `tracks` collection - Song metadata, genres, artists
- `artists` collection - Artist profiles, followers

**Lý do sử dụng 2 database:**
- MySQL: ACID transactions cho user data, referential integrity
- MongoDB: Flexible schema cho music metadata, fast queries với nested data

### 1.3 Authentication Flow

```
User Login → JWT Access Token (15 min) + Refresh Token (7 days)
          ↓
Frontend stores tokens in localStorage
          ↓
API calls → auth-client.ts checks token expiry
          ↓
If expired → auto-refresh using refresh token
          ↓
New access token → Continue API call
```

---

## 2. Backend APIs chi tiết

### 2.1 User Library API

**Base URL:** `/api/users/me/library`

#### Add Track to Library
```bash
POST /api/users/me/library/tracks/{trackSpotifyId}
Authorization: Bearer <JWT_TOKEN>

# Response: 200 OK (empty body)
```

**Backend Flow:**
1. `UserLibraryApi` nhận request với `Authentication` principal
2. `UserLibraryService.addTrack()` được gọi
3. Verify track tồn tại trong MongoDB `tracks` collection
4. Check xem track đã có trong library chưa (idempotent)
5. Insert vào MySQL `user_library_tracks` table
6. Return 200 OK

**Service Layer Code:**
```java
@Transactional
public void addTrack(String principal, String trackSpotifyId) {
    User user = findUserByPrincipal(principal);
    
    // Verify track exists in MongoDB
    Track track = trackRepository.findBySpotifyId(trackSpotifyId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Track not found"
        ));
    
    // Check if already in library (idempotent)
    if (libraryRepository.existsByUserAndTrackSpotifyId(user, trackSpotifyId)) {
        return;
    }
    
    // Add to library
    UserLibraryTracks libraryTrack = new UserLibraryTracks();
    libraryTrack.setUser(user);
    libraryTrack.setTrackSpotifyId(trackSpotifyId);
    libraryTrack.setAddedAt(LocalDateTime.now());
    libraryRepository.save(libraryTrack);
}
```

#### Remove Track from Library
```bash
DELETE /api/users/me/library/tracks/{trackSpotifyId}
Authorization: Bearer <JWT_TOKEN>

# Response: 200 OK
```

#### Get User's Library (Paginated)
```bash
GET /api/users/me/library/tracks?page=0&size=20
Authorization: Bearer <JWT_TOKEN>

# Response:
{
  "tracks": [
    {
      "id": "64a7f...",
      "spotifyId": "3n3Ppam7vgaVa1iaRUc9Lp",
      "name": "Mr. Brightside",
      "artistName": "The Killers",
      "artistSpotifyId": "0C0XlULifJtAgn6ZNCW2eu",
      "albumName": "Hot Fuss",
      "durationMs": 222973,
      "popularity": 85,
      "previewUrl": "https://...",
      "imageUrl": "https://...",
      "genres": ["rock", "indie rock"],
      "addedAt": "2026-09-15T14:30:00"
    }
  ],
  "currentPage": 0,
  "totalPages": 5,
  "totalElements": 92,
  "pageSize": 20
}
```

**Backend Logic:**
1. Query MySQL `user_library_tracks` với pagination, order by `added_at DESC`
2. Extract list of `trackSpotifyId`
3. **Batch query** MongoDB để lấy full track info: `trackRepository.findBySpotifyIdIn(ids)`
4. Map kết quả thành `LibraryTrackResponse` (có thêm field `addedAt`)
5. Return paginated response

#### Check Track Exists in Library
```bash
GET /api/users/me/library/tracks/{trackSpotifyId}/exists
Authorization: Bearer <JWT_TOKEN>

# Response:
{
  "exists": true
}
```

### 2.2 Track API Enhancements

#### Filter Tracks by Genre
```bash
GET /api/tracks?genre=edm&page=0&size=20

# Response: TrackPageResponse (same structure as library)
```

**MongoDB Query:**
```java
Page<Track> tracks = trackRepository.findByGenresContaining(genre, pageable);
```

Genres là array trong MongoDB document, query tìm tracks có `genre` trong array.

#### Get Tracks by Artist
```bash
GET /api/artists/{artistSpotifyId}/tracks?page=0&size=20

# Response: TrackPageResponse
```

**MongoDB Query:**
```java
Page<Track> tracks = trackRepository.findByArtistSpotifyId(artistSpotifyId, pageable);
```

#### Search Tracks
```bash
GET /api/tracks?query=titanium&page=0&size=20

# Response: TrackPageResponse
```

**MongoDB Query (case-insensitive):**
```java
trackRepository.findByNameContainingIgnoreCaseOrArtistNameContainingIgnoreCaseOrAlbumNameContainingIgnoreCase(
    query, query, query, pageable
);
```

### 2.3 Artist API

#### Search Artists
```bash
GET /api/artists?query=killers

# Response:
[
  {
    "id": "64b8c...",
    "spotifyId": "0C0XlULifJtAgn6ZNCW2eu",
    "name": "The Killers",
    "genres": ["rock", "indie rock"],
    "followers": 5420000,
    "popularity": 82,
    "imageUrl": "https://..."
  }
]
```

**MongoDB Query:**
```java
List<Artist> artists = artistRepository.findByNameContainingIgnoreCase(query);
```

---

## 3. Frontend Components

### 3.1 API Client Layer (`lib/api-client.ts`)

Centralized API client với tất cả functions giao tiếp backend.

**Core Functions:**
- `fetchTracks(options?)` - Get tracks với filters (page, size, query, genre)
- `fetchTrackById(id)` - Get single track
- `fetchArtists(query)` - Search artists
- `fetchArtistTracks(artistId)` - Get tracks by artist

**Library Functions (Authenticated):**
- `addToLibrary(trackSpotifyId)` - Add track to library
- `removeFromLibrary(trackSpotifyId)` - Remove track
- `fetchUserLibrary(page?, size?)` - Get user's saved tracks
- `isTrackInLibrary(trackSpotifyId)` - Check if track is liked

**Authentication Integration:**
```typescript
import { getValidAccessToken } from './auth-client';

export async function addToLibrary(trackSpotifyId: string): Promise<void> {
  const token = await getValidAccessToken(); // Auto-refresh if expired
  
  const response = await fetch(
    `${API_BASE}/users/me/library/tracks/${trackSpotifyId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to add track');
  }
}
```

### 3.2 TrackCard Component

Reusable component hiển thị track info với like/play actions.

**Props:**
```typescript
type TrackCardProps = {
  track: Track;              // Track data from API
  isLiked?: boolean;         // Initial liked state
  onLike?: () => void;       // Callback when heart clicked
  onPlay?: () => void;       // Callback when play clicked
  showAddedDate?: boolean;   // Show "Added on" date
  addedAt?: string;          // ISO timestamp
};
```

**Features:**
- Album art với play button overlay on hover
- Track name, artist, album, genres badges
- Heart icon for like/unlike
- Duration display
- Optimistic UI updates

**Usage Example:**
```typescript
<TrackCard
  track={track}
  isLiked={likedTracks.has(track.spotifyId)}
  onLike={() => handleTrackLike(track.spotifyId)}
  onPlay={() => console.log("Play:", track.name)}
/>
```

### 3.3 Library Page (`app/dashboard/library/page.tsx`)

Display user's saved tracks với pagination.

**State Management:**
```typescript
const [tracks, setTracks] = useState<LibraryTrack[]>([]);
const [loading, setLoading] = useState(true);
const [currentPage, setCurrentPage] = useState(0);
const [totalPages, setTotalPages] = useState(0);
```

**Data Fetching:**
```typescript
useEffect(() => {
  loadTracks(currentPage);
}, [currentPage]);

const loadTracks = async (page: number) => {
  setLoading(true);
  const response = await fetchUserLibrary(page, 20);
  setTracks(response.tracks);
  setTotalPages(response.totalPages);
  setLoading(false);
};
```

**Optimistic Unlike:**
```typescript
const handleUnlike = async (trackSpotifyId: string) => {
  // Immediately update UI
  setTracks(prev => prev.filter(t => t.spotifyId !== trackSpotifyId));
  
  try {
    await removeFromLibrary(trackSpotifyId);
  } catch (error) {
    // Reload on error
    loadTracks(currentPage);
  }
};
```

### 3.4 Search Page (`app/dashboard/search/page.tsx`)

Search tracks and artists với tabs và debounced input.

**State:**
```typescript
const [activeTab, setActiveTab] = useState<"tracks" | "artists">("tracks");
const [query, setQuery] = useState("");
const [tracks, setTracks] = useState<Track[]>([]);
const [artists, setArtists] = useState<Artist[]>([]);
```

**Debounced Search (500ms):**
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    performSearch(query);
  }, 500);
  
  return () => clearTimeout(timeout);
}, [query, activeTab]);
```

**Optimistic Like/Unlike:**
```typescript
const handleTrackLike = async (trackSpotifyId: string) => {
  const isLiked = likedTracks.has(trackSpotifyId);
  
  // Update UI immediately
  setLikedTracks(prev => {
    const newSet = new Set(prev);
    isLiked ? newSet.delete(trackSpotifyId) : newSet.add(trackSpotifyId);
    return newSet;
  });
  
  try {
    isLiked ? await removeFromLibrary(trackSpotifyId) : await addToLibrary(trackSpotifyId);
  } catch (error) {
    // Revert on error
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      isLiked ? newSet.add(trackSpotifyId) : newSet.delete(trackSpotifyId);
      return newSet;
    });
  }
};
```

### 3.5 ArtistCard Component

Display artist info với hover effects.

**Props:**
```typescript
type ArtistCardProps = {
  artist: Artist;
  onClick?: () => void;
};
```

**Features:**
- Circular avatar with play overlay on hover
- Artist name, genres (top 2)
- Follower count (formatted: 1.2M, 450K)
- Popularity bar (5-level indicator)

### 3.6 Dashboard Layout

Persistent layout với sidebar navigation.

**Structure:**
```
┌──────────────────────────────────┐
│  Sidebar     │  Main Content     │
│              │                    │
│  - Home      │  [Page Content]   │
│  - Search    │                    │
│  - Library   │                    │
│              │                    │
│  [User Info] │                    │
│  [Logout]    │                    │
└──────────────────────────────────┘
```

**Sidebar Features:**
- Active link highlighting với `usePathname()`
- User profile display (avatar, username, email)
- Logout button (clears tokens, redirects to login)

**Navigation:**
```typescript
const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Search", href: "/dashboard/search", icon: Search },
  { name: "Library", href: "/dashboard/library", icon: Library },
];
```

### 3.7 Lumen Hero Integration

Dashboard home page với API integration.

**Changes:**
- Replace `TRACKS_BY_VIBE` mock data với `fetchTracks()` API
- Filter tracks by genre khi user click vibe buttons
- Loading state khi fetching tracks
- Fallback về mock data nếu API fails

**Implementation:**
```typescript
const [tracks, setTracks] = useState<Track[]>([]);
const [tracksLoading, setTracksLoading] = useState(false);

useEffect(() => {
  (async () => {
    setTracksLoading(true);
    const response = await fetchTracks({ genre: activeVibe, size: 20 });
    const mappedTracks = response.tracks.map(t => ({
      title: t.name,
      artist: t.artistName,
      duration: formatDuration(t.durationMs),
      cover: t.imageUrl || defaultGradient,
    }));
    setTracks(mappedTracks);
    setTracksLoading(false);
  })();
}, [activeVibe]);
```

---

## 4. Authentication Flow

### 4.1 JWT Token Lifecycle

**Token Structure:**
- **Access Token**: Short-lived (15 minutes), used for API calls
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

**Storage:** `localStorage`
```typescript
localStorage.setItem("accessToken", token);
localStorage.setItem("refreshToken", refreshToken);
```

### 4.2 Auto-Refresh Mechanism

**`auth-client.ts` - Core Function:**
```typescript
export async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  
  // Decode JWT và check expiry
  const decoded = parseJwt(token);
  const now = Math.floor(Date.now() / 1000);
  
  // Nếu token còn > 1 phút, dùng luôn
  if (decoded.exp - now > 60) {
    return token;
  }
  
  // Token sắp hết hạn hoặc đã hết, refresh
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  if (!response.ok) {
    // Refresh failed, clear tokens và redirect login
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
    return null;
  }
  
  const { accessToken: newToken } = await response.json();
  localStorage.setItem("accessToken", newToken);
  return newToken;
}
```

**Usage trong API Client:**
```typescript
const token = await getValidAccessToken();
// Token đã được refresh nếu cần, safe to use
```

### 4.3 Protected Routes

Dashboard routes yêu cầu authentication.

**Middleware (Next.js):**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken");
  
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

---

## 5. Database Schema

### 5.1 MySQL Schema

#### `users` table
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `user_library_tracks` table
```sql
CREATE TABLE user_library_tracks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  track_spotify_id VARCHAR(50) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_track (user_id, track_spotify_id),
  INDEX idx_user_added (user_id, added_at DESC)
);
```

**Indexes:**
- `unique_user_track`: Prevent duplicate likes
- `idx_user_added`: Fast pagination queries

### 5.2 MongoDB Collections

#### `tracks` collection
```json
{
  "_id": "64a7f8e2b1c3d4e5f6a7b8c9",
  "spotifyId": "3n3Ppam7vgaVa1iaRUc9Lp",
  "name": "Mr. Brightside",
  "artistName": "The Killers",
  "artistSpotifyId": "0C0XlULifJtAgn6ZNCW2eu",
  "albumName": "Hot Fuss",
  "durationMs": 222973,
  "popularity": 85,
  "previewUrl": "https://...",
  "imageUrl": "https://i.scdn.co/image/...",
  "genres": ["rock", "indie rock", "alternative"],
  "releaseDate": "2004-06-07",
  "isrc": "USIR20400274"
}
```

**Indexes:**
```javascript
db.tracks.createIndex({ "spotifyId": 1 }, { unique: true });
db.tracks.createIndex({ "genres": 1 });
db.tracks.createIndex({ "artistSpotifyId": 1 });
db.tracks.createIndex({ "name": "text", "artistName": "text", "albumName": "text" });
```

#### `artists` collection
```json
{
  "_id": "64b8c9d3e4f5a6b7c8d9e0f1",
  "spotifyId": "0C0XlULifJtAgn6ZNCW2eu",
  "name": "The Killers",
  "genres": ["rock", "indie rock"],
  "followers": 5420000,
  "popularity": 82,
  "imageUrl": "https://i.scdn.co/image/..."
}
```

**Indexes:**
```javascript
db.artists.createIndex({ "spotifyId": 1 }, { unique: true });
db.artists.createIndex({ "name": "text" });
```

### 5.3 Relationships

**MySQL ↔ MongoDB:**
- `user_library_tracks.track_spotify_id` → `tracks.spotifyId` (MongoDB)
- **No foreign key constraint** giữa 2 databases
- Relationship được maintain ở application layer (UserLibraryService)

**Join Logic:**
```java
// 1. Get library entries from MySQL
Page<UserLibraryTracks> libraryPage = libraryRepository.findByUser(user, pageable);

// 2. Extract track IDs
List<String> trackSpotifyIds = libraryPage.stream()
    .map(UserLibraryTracks::getTrackSpotifyId)
    .collect(Collectors.toList());

// 3. Batch fetch from MongoDB
List<Track> tracks = trackRepository.findBySpotifyIdIn(trackSpotifyIds);

// 4. Merge data
Map<String, Track> trackMap = tracks.stream()
    .collect(Collectors.toMap(Track::getSpotifyId, t -> t));
```

---

## 6. Implementation Highlights

### 6.1 Optimistic UI Updates

**Tại sao?**
- Giảm perceived latency
- UI responsive ngay lập tức
- Better UX

**Implementation trong Search Page:**
```typescript
const handleTrackLike = async (trackSpotifyId: string) => {
  const isLiked = likedTracks.has(trackSpotifyId);
  
  // 1. Update UI immediately (optimistic)
  setLikedTracks(prev => {
    const newSet = new Set(prev);
    isLiked ? newSet.delete(trackSpotifyId) : newSet.add(trackSpotifyId);
    return newSet;
  });
  
  try {
    // 2. Send request to backend
    isLiked 
      ? await removeFromLibrary(trackSpotifyId) 
      : await addToLibrary(trackSpotifyId);
  } catch (error) {
    // 3. Revert on error
    console.error("Failed to toggle like:", error);
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      isLiked ? newSet.add(trackSpotifyId) : newSet.delete(trackSpotifyId);
      return newSet;
    });
  }
};
```

### 6.2 Debounced Search

**Tại sao?**
- Giảm số lượng API calls khi user đang typing
- Tiết kiệm bandwidth và backend resources

**Implementation:**
```typescript
const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  const timeout = setTimeout(() => {
    performSearch(query);
  }, 500); // Wait 500ms after user stops typing
  
  setSearchTimeout(timeout);
  
  return () => {
    if (timeout) clearTimeout(timeout);
  };
}, [query]);
```

### 6.3 Batch Queries

**Tại sao?**
- N+1 query problem: Nếu fetch từng track riêng lẻ sẽ slow
- 1 batch query thay vì 20 individual queries

**Implementation:**
```java
// BAD: N+1 queries
for (UserLibraryTracks lib : libraryTracks) {
    Track track = trackRepository.findBySpotifyId(lib.getTrackSpotifyId());
    // Process track...
}

// GOOD: 1 batch query
List<String> ids = libraryTracks.stream()
    .map(UserLibraryTracks::getTrackSpotifyId)
    .collect(Collectors.toList());

List<Track> tracks = trackRepository.findBySpotifyIdIn(ids); // Single query
```

### 6.4 Error Handling

**Backend:**
```java
@Transactional
public void addTrack(String principal, String trackSpotifyId) {
    User user = userRepository.findByEmailOrUsername(principal, principal)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "User not found"
        ));
    
    Track track = trackRepository.findBySpotifyId(trackSpotifyId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Track not found: " + trackSpotifyId
        ));
    
    // ... rest of logic
}
```

**Frontend:**
```typescript
try {
  await addToLibrary(trackSpotifyId);
} catch (error) {
  if (error.message.includes("404")) {
    toast.error("Track not found");
  } else if (error.message.includes("401")) {
    toast.error("Please login again");
    router.push("/login");
  } else {
    toast.error("Failed to add track");
  }
}
```

---

## 7. Testing Guide

### 7.1 Backend API Testing

**Sử dụng cURL hoặc Postman:**

```bash
# 1. Login để lấy token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Response:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": {...}
# }

# 2. Get tracks by genre
curl http://localhost:8080/api/tracks?genre=edm&size=5

# 3. Add track to library
curl -X POST http://localhost:8080/api/users/me/library/tracks/3n3Ppam7vgaVa1iaRUc9Lp \
  -H "Authorization: Bearer eyJhbGc..."

# 4. Get user library
curl http://localhost:8080/api/users/me/library/tracks?page=0&size=10 \
  -H "Authorization: Bearer eyJhbGc..."

# 5. Search artists
curl http://localhost:8080/api/artists?query=killers
```

### 7.2 Frontend Testing

**Manual Testing Checklist:**
- [ ] Dashboard home loads tracks from API
- [ ] Click vibe buttons fetches new tracks by genre
- [ ] Library page shows saved tracks with "Added on" date
- [ ] Click heart icon adds/removes track from library
- [ ] Heart icon updates immediately (optimistic)
- [ ] Search page finds tracks and artists
- [ ] Search debounces (no API call while typing)
- [ ] Pagination works on library page
- [ ] Logout clears tokens and redirects
- [ ] Token auto-refresh works (wait 15 min)

### 7.3 Database Verification

**MySQL:**
```sql
-- Check user library
SELECT u.username, ult.track_spotify_id, ult.added_at
FROM user_library_tracks ult
JOIN users u ON ult.user_id = u.id
WHERE u.username = 'testuser'
ORDER BY ult.added_at DESC;
```

**MongoDB:**
```javascript
// Check tracks collection
db.tracks.find({ genres: "edm" }).limit(5);

// Check if track exists
db.tracks.findOne({ spotifyId: "3n3Ppam7vgaVa1iaRUc9Lp" });

// Search artists
db.artists.find({ $text: { $search: "killers" } });
```

---

## 8. Known Issues & Future Improvements

### 8.1 Known Issues

1. **No real audio playback**
   - Play buttons chỉ log ra console
   - Cần integrate Spotify Web Playback SDK hoặc preview URLs

2. **Artist page not implemented**
   - Click vào artist card redirect về `/dashboard/artists/{id}` nhưng page chưa tồn tại
   - Cần implement artist detail page với tracks, albums, bio

3. **No playlist feature**
   - User chưa thể tạo custom playlists
   - Chỉ có "Liked Songs" library

### 8.2 Future Improvements

**Phase 2 Features:**
- [ ] Create/edit/delete playlists
- [ ] Add tracks to playlists
- [ ] Share playlists with other users
- [ ] Follow/unfollow artists
- [ ] Artist detail page
- [ ] Album detail page

**Performance:**
- [ ] Implement React Query cho caching và background refetch
- [ ] Add service worker cho offline support
- [ ] Lazy load images với blur placeholder

**UX:**
- [ ] Toast notifications cho actions
- [ ] Keyboard shortcuts (Space = play/pause, ↑↓ = volume)
- [ ] Drag-and-drop reorder trong playlists

---

## 9. Tech Stack Summary

**Backend:**
- Spring Boot 3.1.0
- Spring Data JPA (MySQL)
- Spring Data MongoDB
- Spring Security + JWT
- Java 17

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Lucide Icons

**Databases:**
- MySQL 8.0 (User data, library)
- MongoDB 7.0 (Music catalog)

**Authentication:**
- JWT access token (15 min)
- JWT refresh token (7 days)
- Auto-refresh mechanism

---

## 10. Deployment Notes

### 10.1 Environment Variables

**Backend (`.env`):**
```env
SERVER_PORT=8080
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=moodify
MYSQL_USERNAME=root
MYSQL_PASSWORD=yourpassword

MONGODB_URI=mongodb://localhost:27017/moodify

JWT_SECRET=your-secret-key-min-256-bits
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000
```

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### 10.2 Build & Run

**Backend:**
```bash
cd Moodify-Backend
mvn clean install
java -jar target/moodify-0.0.1-SNAPSHOT.jar
```

**Frontend:**
```bash
cd Moodify
npm install
npm run dev    # Development
npm run build  # Production build
npm start      # Production server
```

### 10.3 Database Setup

**MySQL:**
```sql
CREATE DATABASE moodify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- JPA auto-creates tables from entities
-- Or run schema.sql manually
```

**MongoDB:**
```bash
# Create database and collections
mongosh
use moodify
db.createCollection("tracks")
db.createCollection("artists")

# Create indexes
db.tracks.createIndex({ "spotifyId": 1 }, { unique: true })
db.tracks.createIndex({ "genres": 1 })
db.artists.createIndex({ "spotifyId": 1 }, { unique: true })
```

---

## Kết luận

KZuy Phase 1 đã implement thành công 3 tính năng core:
1. ✅ Browse tracks từ API với genre filtering
2. ✅ User Library với like/unlike và pagination
3. ✅ Search tracks và artists với debouncing

Hệ thống sử dụng **polyglot persistence** hiệu quả:
- MySQL cho user data và relationships
- MongoDB cho music catalog và flexible queries

Authentication với JWT và auto-refresh mechanism đảm bảo UX mượt mà không bị interrupt.

Frontend components được thiết kế reusable, optimistic UI updates tạo trải nghiệm responsive.

**Next steps:** Phase 2 sẽ implement playlists, artist pages, và advanced features.

