# PHASE 5 — ENGINEERING SPECIFICATION PACKAGE

## 1. FEATURE IMPLEMENTATION SPECIFICATIONS (TASK 1)

### FEAT-001: Start Session
- **Purpose**: Initiates hardware usage tracking for a confirmed reservation.
- **Business Flow**: Staff selects a confirmed reservation and clicks "Start Session". The system marks the player as physically present and using the station.
- **Technical Flow**:
    1. Check if Reservation status is `CONFIRMED`.
    2. Check if there's already an `ACTIVE` GamingSession for this reservation.
    3. Start a database transaction.
    4. Create a `GamingSession` record with `startTime = now()`, `status = ACTIVE`, and `stationId` from Reservation.
    5. Update `Reservation` status to `IN_PROGRESS`.
    6. Commit transaction.
- **Preconditions**: Reservation exists and status is `CONFIRMED`.
- **Postconditions**: `GamingSession` is created (ACTIVE), Reservation is `IN_PROGRESS`.
- **Error Cases**:
    - Reservation not found (404).
    - Reservation not in `CONFIRMED` state (409).
    - Already an active session for this reservation (409).
- **Dependencies**: EPIC-002 (Reservation Lifecycle).
- **Acceptance Criteria**:
    - Database record in `GamingSession` exists.
    - Reservation status is `IN_PROGRESS`.
    - API returns 201 Created with the session object.

### FEAT-002: Pause Session
- **Purpose**: Tracks breaks during a gaming session to exclude from active billing.
- **Business Flow**: Player takes a break. Staff pauses the session.
- **Technical Flow**:
    1. Find `ACTIVE` GamingSession for reservation.
    2. Update session: `status = PAUSED`, `pausedAt = now()`.
- **Preconditions**: Session must be `ACTIVE`.
- **Postconditions**: Session `status` is `PAUSED`, `pausedAt` is set.
- **Error Cases**:
    - Session not found or not ACTIVE (409).
- **Dependencies**: FEAT-001.
- **Acceptance Criteria**:
    - Session status in DB is `PAUSED`.
    - `pausedAt` is not null.

### FEAT-003: Resume Session
- **Purpose**: Restarts tracking after a break.
- **Business Flow**: Player returns. Staff resumes the session.
- **Technical Flow**:
    1. Find `PAUSED` GamingSession.
    2. Calculate `durationInMinutes = (now() - pausedAt)`.
    3. Update session: `status = ACTIVE`, `pausedMinutes = pausedMinutes + durationInMinutes`, `pausedAt = null`.
- **Preconditions**: Session must be `PAUSED`.
- **Postconditions**: Session `status` is `ACTIVE`, `pausedMinutes` increased, `pausedAt` is null.
- **Error Cases**:
    - Session not PAUSED (409).
- **Dependencies**: FEAT-002.
- **Acceptance Criteria**:
    - `pausedMinutes` accurately reflects total time spent in PAUSED state.

### FEAT-004: Stop Session
- **Purpose**: Finalizes session and calculates actual billing duration.
- **Business Flow**: Player finishes session. Staff stops it.
- **Technical Flow**:
    1. Find `ACTIVE` or `PAUSED` GamingSession.
    2. Start transaction.
    3. If `PAUSED`, perform Resume logic to capture final pause time.
    4. Set `endTime = now()`, `status = COMPLETED`.
    5. `actualHours = (endTime - startTime - pausedMinutes) / 60`.
    6. Update Reservation: If payment is `PAID`, set status to `COMPLETED`.
    7. Commit transaction.
- **Preconditions**: Session must be in a non-terminal state.
- **Postconditions**: `actualHours` calculated. Reservation status updated if paid.
- **Error Cases**: Session already stopped.
- **Dependencies**: FEAT-001.
- **Acceptance Criteria**:
    - `actualHours` correctly excludes paused time.
    - Reservation state transition follows business rules.

### FEAT-005: State Machine Logic
- **Purpose**: Enforces the official Reservation lifecycle.
- **Business Flow**: Ensures transitions like `PENDING -> IN_PROGRESS` are forbidden.
- **Technical Flow**:
    1. Implement a centralized `ReservationStateMachine` utility.
    2. Use `ReservationStateMachine.validateTransition(current, target)` in `ReservationsStation`.
    3. Throw `AppError(INVALID_TRANSITION)` if transition is forbidden.
- **Preconditions**: Action that changes reservation status is triggered.
- **Postconditions**: Status updated only if transition is valid.
- **Error Cases**: Attempted transition is invalid (409).
- **Dependencies**: None.
- **Acceptance Criteria**: All status changes (Confirm, Start, Complete, Cancel, No-Show) are validated.

### FEAT-006: Cancellation Flow
- **Purpose**: Handles user/staff cancellations with refund support.
- **Business Flow**: Customer or staff cancels. System updates status and refunds any pre-payments to wallet.
- **Technical Flow**:
    1. Validate transition to `CANCELED`.
    2. Record `canceledAt`, `canceledByUserId`, and `cancelReason`.
    3. Call `WalletService.refundBookingToWallet(reservationId)`.
- **Preconditions**: Reservation is in `PENDING` or `CONFIRMED`.
- **Postconditions**: Status is `CANCELED`. Customer wallet credited if applicable.
- **Error Cases**: Reservation already started or completed.
- **Dependencies**: FEAT-005.
- **Acceptance Criteria**: Status is updated; Refund logic is invoked.

### FEAT-007: No-Show Handling
- **Purpose**: Marks missed reservations and allows for penalty logic.
- **Business Flow**: Staff waits for grace period, then marks as no-show.
- **Technical Flow**:
    1. Validate transition to `NO_SHOW`.
    2. Set `noShowAt = now()`.
- **Preconditions**: Reservation is `CONFIRMED`.
- **Postconditions**: Status is `NO_SHOW`.
- **Error Cases**: Reservation already started or canceled.
- **Dependencies**: FEAT-005.
- **Acceptance Criteria**: Status updated to `NO_SHOW`.

### FEAT-008: Payment Route Alignment
- **Purpose**: Fix redundant route segments for cleaner API.
- **Business Flow**: Developers use a standardized path for payments.
- **Technical Flow**:
    1. Update `src/routes/index.ts` to mount `paymentsRoutes` on `/gamingCenters/:gamingCenterId/reservations`.
    2. Update `src/modules/payments/payments.routes.ts` to define route as `/:reservationId/payments/init`.
- **Preconditions**: Redundant route exists.
- **Postconditions**: Target route is active.
- **Error Cases**: Route not found if client uses old path.
- **Dependencies**: None.
- **Acceptance Criteria**: `POST /gamingCenters/:gcId/reservations/:id/payments/init` returns 200/201.

### FEAT-009: Terminology Alignment
- **Purpose**: Unify domain language throughout the system.
- **Business Flow**: Domain experts and developers use same terms (Station, Reservation).
- **Technical Flow**:
    1. Bulk rename `Service` -> `Station` (e.g., `StationsStation`, `GamingSessionsStation`).
    2. Bulk rename `Booking` -> `Reservation` in internal variables and DTOs.
- **Preconditions**: Mixed terminology exists.
- **Postconditions**: Codebase is consistent.
- **Error Cases**: Missing a rename causes compilation/runtime error.
- **Dependencies**: None.
- **Acceptance Criteria**: No "Service" or "Booking" terms in the domain/logic layer.

---

## 2. FILE LEVEL CHANGE PLAN (TASK 2)

### New Files
- `src/modules/reservations/reservations.state-machine.ts`: Centralized logic for Reservation state transitions.
- `src/modules/gamingSessions/gamingSessions.validators.ts`: Input validation schemas for new session endpoints.

### Modified Files
| File | Reason | Change Type | Complexity |
| :--- | :--- | :--- | :--- |
| `src/modules/gamingSessions/gamingSessions.station.ts` | Implement Pause/Resume/Stop logic and duration math. | Logic Update | Medium |
| `src/modules/gamingSessions/gamingSessions.controller.ts` | Add pauseSession/resumeSession handlers. | Logic Update | Low |
| `src/modules/gamingSessions/gamingSessions.routes.ts` | Add POST /pause and /resume. | Route Update | Low |
| `src/modules/reservations/reservations.station.ts` | Integrate State Machine, rename to `ReservationsStation`. | Refactor | Medium |
| `src/modules/stations/stations.station.ts` | Rename functions/variables to official terms. | Refactor | Medium |
| `src/routes/index.ts` | Fix Payment Route mounting and terminology imports. | Configuration | Low |
| `prisma/schema.prisma` | Ensure `GamingSessionStatus` includes `PAUSED`. | Schema Change | Low |
| `src/docs/openapi.yaml` | Sync with new endpoints and terminology. | Documentation | Medium |

---

## 3. JIRA EPIC / STORY / TASK BREAKDOWN (TASK 3)

### EPIC-001: GamingSession Aggregate
- **STORY-GS-01: Operational Logic**
    - **TASK-GS-01**: Implement `pauseSession` logic in `GamingSessionsStation`. (P1, 3 pts)
    - **TASK-GS-02**: Implement `resumeSession` logic with time calculation. (P1, 3 pts)
    - **TASK-GS-03**: Update `stopSession` to handle duration math correctly. (P1, 2 pts)
- **STORY-GS-02: Session API**
    - **TASK-GS-04**: Add Pause/Resume endpoints to controller and routes. (P2, 2 pts)

### EPIC-002: Reservation Lifecycle Refactor
- **STORY-RES-01: State Machine**
    - **TASK-RES-01**: Implement `ReservationStateMachine`. (P1, 3 pts, Dep: None)
    - **TASK-RES-02**: Refactor `ReservationsStation` to use State Machine. (P1, 3 pts, Dep: TASK-RES-01)

### EPIC-003: Domain Alignment
- **STORY-TRM-01: Terminology**
    - **TASK-TRM-01**: Rename 'Service' -> 'Station' in code and DTOs. (P3, 5 pts)
- **STORY-PAY-01: Route Fix**
    - **TASK-PAY-01**: Fix Payment route segment duplication. (P1, 1 pt)

---

## 4. API IMPLEMENTATION SPECIFICATION (TASK 4)

### Endpoint: GS-START
- **ID**: API-GS-001
- **Route**: `POST /gamingCenters/:gcId/reservations/:id/sessions/start`
- **Method**: POST
- **Auth**: `MANAGER`, `SUPERVISOR`, `STAFF`
- **Request DTO**: `{ stationId: string }`
- **Response DTO**: `GamingSession`
- **Business Rule**: Reservation status must be `CONFIRMED`.
- **OpenAPI**: Add to `GamingSessions` tags.

### Endpoint: GS-PAUSE
- **ID**: API-GS-002
- **Route**: `POST /gamingCenters/:gcId/reservations/:id/sessions/pause`
- **Method**: POST
- **Auth**: `MANAGER`, `SUPERVISOR`, `STAFF`
- **Business Rule**: Session must be `ACTIVE`.

### Endpoint: GS-RESUME
- **ID**: API-GS-003
- **Route**: `POST /gamingCenters/:gcId/reservations/:id/sessions/resume`
- **Method**: POST
- **Auth**: `MANAGER`, `SUPERVISOR`, `STAFF`
- **Business Rule**: Session must be `PAUSED`.

---

## 5. DATABASE IMPLEMENTATION PLAN (TASK 5)

- **Migration ID**: `20240520_gaming_session_pause_support`
- **Prisma Changes**:
  ```prisma
  enum GamingSessionStatus {
    ACTIVE
    PAUSED
    COMPLETED
    INTERRUPTED
    NO_SHOW
  }
  ```
- **SQL Equivalent**: `ALTER TYPE "GamingSessionStatus" ADD VALUE 'PAUSED';`
- **Index Strategy**: Ensure index on `GamingSession(reservationId, status)`.
- **Rollback Strategy**: Enum values cannot be removed in PG without complex migrations. Plan is to ignore if rolled back.
- **Data Safety**: Safe. No existing data modification required.

---

## 6. STATE MACHINE SPECIFICATION (TASK 6)

### Reservation State Machine
- **States**: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `NO_SHOW`.
- **Transitions**:
    - `PENDING -> CONFIRMED` (Admin Confirm)
    - `CONFIRMED -> IN_PROGRESS` (Start Session)
    - `IN_PROGRESS -> COMPLETED` (Stop Session & Paid)
    - `PENDING -> CANCELED` (User/Admin Cancel)
    - `CONFIRMED -> CANCELED` (User/Admin Cancel)
    - `CONFIRMED -> NO_SHOW` (Admin Action)
- **Forbidden**:
    - `PENDING -> IN_PROGRESS`
    - `IN_PROGRESS -> CANCELED`
    - `COMPLETED -> *` (Terminal state)

### GamingSession State Machine
- **States**: `ACTIVE`, `PAUSED`, `COMPLETED`.
- **Transitions**:
    - `START -> ACTIVE`
    - `ACTIVE -> PAUSED` (Pause)
    - `PAUSED -> ACTIVE` (Resume)
    - `ACTIVE -> COMPLETED` (Stop)
    - `PAUSED -> COMPLETED` (Stop while paused)

---

## 7. TEST SPECIFICATION PACKAGE (TASK 7)

### Unit Tests
- `UT-GS-001`: Verify `pausedMinutes` calculation on multiple pause/resume cycles.
- `UT-RES-001`: Verify `ReservationStateMachine` blocks invalid transitions (e.g. PENDING to COMPLETED).
- `UT-GS-002`: Verify `actualHours` is zero if session duration < pausedMinutes (edge case).

### Integration Tests
- `IT-GS-001`: Start session correctly updates Reservation status in DB (Transactional).
- `IT-RES-002`: Cancel reservation triggers refund logic correctly in DB.

### Contract Tests
- `CT-OAS-001`: Validate `GamingSession` endpoints against OpenAPI spec (Request/Response schemas).

### E2E Tests
- `E2E-RES-001`: Full flow: Create -> Confirm -> Start -> Pause -> Resume -> Stop -> Complete.

---

## 8. DEPLOYMENT IMPACT ANALYSIS (TASK 8)

- **Risks**: Logic changes in status transitions might affect front-end UI state handling (e.g. buttons being disabled).
- **Migration Strategy**:
    1. Apply DB Migrations first.
    2. Deploy Backend.
    3. Update Frontend (if applicable).
- **Rollback Plan**: Revert backend code. DB migration is forward-only (safe).

---

## 9. RELEASE PLAN (TASK 9)

- **Release 1: Foundation (Quick Wins)**
    - Scope: Payment route fix, DB Enum additions.
    - Risk: Low.
- **Release 2: Usage Tracking (Core Session Lifecycle)**
    - Scope: Pause/Resume/Stop implementation.
    - Deliverable: Functional hardware usage tracking.
- **Release 3: Governance (Full State Machine)**
    - Scope: Strict Reservation State Machine enforcement.
    - Deliverable: Reliable reservation lifecycle.
- **Release 4: Polish (Terminology & Final Docs)**
    - Scope: Terminology unification and OpenAPI sync.

---

## 10. DEFINITION OF DONE (TASK 10)

- **Feature Level**:
    - Unit tests passing.
    - OpenAPI updated.
    - Code follows Clean Architecture.
- **Epic Level**:
    - All stories completed.
    - Integration tests green.
- **Release Level**:
    - QA sign-off.
    - E2E tests pass in staging.
- **Project Level**:
    - 100% Alignment with Phase 4 Blueprint.
    - Documentation finalized.
