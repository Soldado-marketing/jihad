# Marketing Agency Operating System (MAOS)

## Phase 7 Collaboration System Specification

**Version:** 1.0  
**Phase:** Phase 7  
**Status:** Collaboration Specification  
**Parent Documents:** `MAOS_MASTER_SPECIFICATION_v1.1.md`, `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`, `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`, `MAOS_SECURITY_PERMISSIONS_PHASE_3.md`, `MAOS_UI_UX_DESIGN_SYSTEM_PHASE_5.md`, `MAOS_PROJECT_MANAGEMENT_PHASE_6.md`  
**Document Role:** Complete collaboration system specification for MAOS using the approved architecture, database, security, UI/UX, and project management foundations  
**Code Policy:** No application code, SQL, migrations, pseudocode, or implementation snippets are included in this document.

---

## 1. Collaboration Objectives

The MAOS Collaboration System centralizes agency and client communication, voice notes, voice uploads, file storage, file versions, file locking, approvals, and revision tracking.

Primary objectives:

- Support internal team communication.
- Support client-safe communication.
- Capture voice notes and uploaded voice files.
- Store and secure files by tenant, client, project, task, approval, and chat context.
- Track file versions and revisions.
- Prevent editing conflicts through file locking rules.
- Manage structured approvals through an Approval Center.
- Track revision requests, revision rounds, and approval outcomes.
- Preserve tenant isolation, permissions, client visibility, auditability, localization, timezone handling, and file security.

---

## 2. Approved Foundation

Phase 7 uses the approved platform foundation:

| Foundation | Approved Source |
| --- | --- |
| SaaS and tenant architecture | Phase 1 Enterprise Architecture |
| Collaboration database foundation | Phase 2 Enterprise Database Specification |
| Security and permissions | Phase 3 Security & Permissions Specification |
| UI and interaction patterns | Phase 5 UI/UX Design System |
| Project/task context | Phase 6 Project Management System |

### 2.1 Required Database Alignment

Phase 7 primarily uses:

- `files`
- `file_versions`
- `file_shares`
- `voice_notes`
- `chat_channels`
- `chat_channel_members`
- `chat_messages`
- `approvals`
- `approval_approvers`
- `projects`
- `tasks`
- `clients`
- `client_contacts`
- `notifications`
- `activity_logs`
- `audit_logs`
- `ai_logs`

### 2.2 Collaboration Boundaries

In scope:

- Internal Chat.
- Client Chat.
- Voice Notes.
- Voice Uploads.
- File Storage.
- File Versioning.
- File Locking.
- Approval Center.
- Revision Tracking.
- Notifications.
- Activity logs.
- Audit logs.
- AI summaries where permitted.

Out of scope unless later approved:

- Native real-time document editor.
- Full video conferencing platform.
- Public file-sharing portal outside authenticated access.
- Public community or social feed.

---

## 3. Collaboration Model

### 3.1 Collaboration Contexts

Collaboration records may be linked to:

| Context | Examples |
| --- | --- |
| Tenant | Internal company-wide collaboration |
| Client | Client communication, shared files, approvals |
| Project | Project chat, files, deliverables, approvals |
| Task | Task comments, files, voice notes, review steps |
| Approval | Approval decisions, revision requests, approval files |
| Meeting | Meeting voice notes, transcripts, follow-ups |

### 3.2 Visibility Levels

| Visibility | Meaning |
| --- | --- |
| Internal | Agency-only collaboration |
| Client Visible | Visible to authorized client users |
| Restricted | Explicit users only |
| Approval Scoped | Visible only to approval requesters and approvers |

### 3.3 Collaboration Actors

| Actor | Capabilities |
| --- | --- |
| Owner | Full collaboration access within tenant permissions |
| Manager | Manage assigned/team collaboration |
| Employee | Participate in assigned or permitted collaboration |
| Client | Participate only in client-visible spaces |
| Automation | Create system messages and reminders |
| AI | Summarize or suggest actions only within permission scope |

---

## 4. Internal Chat

### 4.1 Purpose

Internal Chat supports private agency communication across teams, projects, tasks, approvals, files, and operational decisions.

### 4.2 Internal Channel Types

| Type | Purpose |
| --- | --- |
| General Internal Channel | Agency-wide internal communication |
| Team Channel | Department or team-specific communication |
| Project Channel | Internal project communication |
| Task Channel | Task-specific communication |
| Direct Message | One-to-one or small group internal conversation |
| Approval Channel | Internal discussion around approval request |

### 4.3 Internal Chat Features

Required:

- Channel creation.
- Channel membership.
- Message posting.
- Threaded replies where supported.
- Mentions.
- Attachments.
- File previews.
- Message edit and delete where permitted.
- Task creation from message.
- Approval request from message.
- AI thread summary where permitted.
- Search within accessible channels.
- Read state tracking.

### 4.4 Internal Chat Rules

Rules:

- Internal channels are hidden from client users.
- Channel members must be active tenant members.
- Project/task channels inherit project/task access boundaries.
- File attachments inherit file security and visibility.
- Sensitive channel membership changes must create activity logs.
- Deleted messages should be soft-deleted where auditability is required.

---

## 5. Client Chat

### 5.1 Purpose

Client Chat supports controlled communication between agency users and client users inside the white-label client portal.

### 5.2 Client Channel Types

| Type | Purpose |
| --- | --- |
| Client General Channel | Broad client communication |
| Project Client Channel | Communication for one client-visible project |
| Approval Discussion | Discussion around a deliverable approval |
| Invoice Discussion | Client finance discussion where enabled |
| Support Request Channel | Client issue or request handling |

### 5.3 Client Chat Features

Required:

- Client-safe channel creation.
- Client membership controls.
- Agency participant controls.
- Client-visible messages.
- File sharing.
- Approval links.
- Report links.
- Invoice links where enabled.
- Message notifications.
- AI summary only over client-visible messages.

### 5.4 Client Chat Rules

Rules:

- Client chat must always have client context.
- Client users can only access channels for their client.
- Internal notes must not appear in client chat.
- Internal-only files cannot be attached to client-visible messages.
- Client messages must not expose other clients, payroll, internal profitability, employee costs, or audit logs.
- Agency users must see clear client-visible indicators before posting.

---

## 6. Voice Notes

### 6.1 Purpose

Voice Notes allow users to record spoken ideas, meeting outcomes, task updates, and client context for transcription, summaries, and task creation.

### 6.2 Voice Note Types

| Type | Purpose |
| --- | --- |
| Quick Note | Short personal or project note |
| Meeting Note | Recording linked to a meeting |
| Task Note | Recording linked to a task |
| Client Note | Recording linked to a client |
| Approval Note | Recording linked to an approval |

### 6.3 Voice Note Required Metadata

Required:

- Tenant.
- Creator.
- Audio file.
- Created time.
- Transcription status.
- Visibility.

Recommended:

- Client.
- Project.
- Task.
- Meeting.
- Language.
- Transcript.
- Summary.
- Extracted tasks.
- Duration.

### 6.4 Voice Note Rules

Rules:

- Voice notes are private by default.
- Client-visible voice notes require explicit visibility selection.
- Transcription must respect user permissions.
- AI summaries must use only accessible audio/transcript data.
- Voice-created tasks require user confirmation.
- Deleting a voice note must follow file retention policy.

---

## 7. Voice Uploads

### 7.1 Purpose

Voice Uploads allow users to upload audio files for transcription, summarization, and conversion into tasks or meeting notes.

### 7.2 Supported Upload Contexts

Voice uploads may be linked to:

- Client.
- Project.
- Task.
- Meeting.
- Chat message.
- Approval.

### 7.3 Voice Upload Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User uploads audio file | File stored as processing |
| 2 | System validates file type and size | Safe upload |
| 3 | System creates voice note record | Voice note pending transcription |
| 4 | Transcription process starts | Transcript pending |
| 5 | Transcript completes or fails | Transcript state updated |
| 6 | User reviews transcript and summary | Confirmation |
| 7 | User creates tasks or notes if desired | Confirmed output |

### 7.4 Voice Upload Security

Rules:

- Uploaded audio follows file storage rules.
- Suspicious audio files may be quarantined.
- Transcripts inherit voice note visibility.
- Audio downloads require file access permission.
- Client users cannot upload voice files to internal-only spaces.

---

## 8. File Storage

### 8.1 Purpose

File Storage manages agency and client documents, creative assets, reports, contracts, invoices, deliverables, voice audio, attachments, and approval files.

### 8.2 File Contexts

Files may be attached to:

- Client.
- Project.
- Task.
- Chat message.
- Approval.
- Contract.
- Invoice.
- Meeting.
- Voice note.

### 8.3 File Categories

| Category | Examples |
| --- | --- |
| Creative Asset | Images, designs, videos |
| Document | Strategy, brief, proposal, contract |
| Report | Client report, finance report, project report |
| Invoice | Invoice PDF or attachment |
| Audio | Voice notes, meeting recordings |
| Approval Deliverable | File awaiting approval |
| Internal Reference | Agency-only document |

### 8.4 File Storage Rules

Rules:

- Files are tenant-scoped.
- Files are private by default.
- Storage object keys must be tenant-scoped.
- Client-visible files must have client context.
- Restricted files require explicit shares.
- Quarantined files cannot be downloaded.
- Deleted files follow retention policy.
- Sensitive file downloads must be audited.

### 8.5 File Upload Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects upload target | Context selected |
| 2 | User uploads file | File received |
| 3 | System validates file type and size | Safe candidate |
| 4 | System scans or marks for scanning where available | Security status |
| 5 | File metadata is created | File record |
| 6 | File becomes active or quarantined | Availability state |
| 7 | Activity log is created | Traceability |
| 8 | Notifications are sent where relevant | Awareness |

---

## 9. File Versioning

### 9.1 Purpose

File Versioning preserves historical versions of files, deliverables, reports, contracts, creative assets, and approval materials.

### 9.2 Versioning Rules

Rules:

- Uploading a replacement creates a new version, not a destructive overwrite.
- Version numbers must be sequential per file.
- Current version must be identifiable.
- Prior versions remain accessible to authorized users.
- Client visibility may differ by file or version policy.
- Approval decisions should reference the version reviewed.
- Version changes create activity logs.
- Sensitive version replacement may create audit logs.

### 9.3 Version Metadata

Each version should preserve:

- Version number.
- Storage object key.
- Uploader.
- Upload time.
- File size.
- Checksum where available.
- Change note where provided.
- Approval status where applicable.

### 9.4 File Versioning Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User uploads replacement | New version candidate |
| 2 | System validates and stores file | Safe file version |
| 3 | Version number increments | Version history updated |
| 4 | Current version pointer updates | Latest version active |
| 5 | Linked approval may reset or require new review | Review integrity |
| 6 | Stakeholders are notified | Awareness |
| 7 | Activity log records version change | Traceability |

---

## 10. File Locking

### 10.1 Purpose

File Locking prevents accidental edit conflicts and protects files under review, approval, or final delivery.

### 10.2 Lock Types

| Lock Type | Purpose |
| --- | --- |
| Manual Lock | User locks file while editing |
| Approval Lock | File locked during approval review |
| Final Lock | File locked after final approval |
| System Lock | File locked during processing, scanning, or version replacement |
| Legal/Contract Lock | Contract or legal file protected from change |

### 10.3 Lock States

| State | Meaning |
| --- | --- |
| Unlocked | File can be updated by permitted users |
| Locked | File cannot be replaced or edited except by lock owner or authorized override |
| Expired Lock | Lock passed expiry and may be released |
| Forced Unlock | Authorized override released lock |

### 10.4 File Lock Required Metadata

File lock metadata should include:

- File.
- Tenant.
- Lock type.
- Locked by.
- Locked at.
- Lock reason.
- Expiry time where applicable.
- Unlocked by.
- Unlocked at.
- Unlock reason.

If strict locking requires independent history beyond file metadata, a future database extension may add a dedicated file lock history table. Phase 7 still defines the required behavior and audit rules.

### 10.5 File Locking Rules

Rules:

- Locked files cannot receive new versions unless the user owns the lock or has override permission.
- Approval-locked files cannot be replaced during review.
- Final-locked files require Manager or Owner override.
- System locks cannot be bypassed by normal users.
- Forced unlock requires reason.
- Lock and unlock events must create activity logs.
- Forced unlock and final lock changes must create audit logs.

### 10.6 File Locking Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User locks file | Lock created |
| 2 | System prevents conflicting replacement | Edit conflict avoided |
| 3 | Other users see lock owner and reason | Collaboration clarity |
| 4 | User uploads new version or unlocks file | Lock resolution |
| 5 | System records activity | Traceability |
| 6 | Override, if used, creates audit log | Governance |

---

## 11. Approval Center

### 11.1 Purpose

The Approval Center centralizes review workflows for files, deliverables, tasks, projects, contracts, invoices, proposals, quotations, and client-facing outputs.

### 11.2 Approval Types

| Type | Purpose |
| --- | --- |
| Internal Approval | Agency review before client sharing |
| Client Approval | Client review of deliverable |
| Finance Approval | Invoice, payment, budget, or pricing review |
| Contract Approval | Legal or commercial review |
| Creative Approval | Asset or campaign creative review |
| Final Delivery Approval | Final sign-off before completion |

### 11.3 Approval Statuses

| Status | Meaning |
| --- | --- |
| Draft | Approval request not yet sent |
| Pending | Waiting for decision |
| Approved | Accepted by approver |
| Rejected | Declined |
| Changes Requested | Revision required |
| Cancelled | Request withdrawn |
| Expired | Decision window passed |

### 11.4 Approval Center Views

Required views:

- My approvals.
- Requested by me.
- Pending client approvals.
- Internal approvals.
- Overdue approvals.
- Approved.
- Rejected.
- Changes requested.
- By project.
- By client.
- By file.

### 11.5 Approval Rules

Rules:

- Approval must have requester.
- Approval must have at least one approver.
- Approval must have resource context.
- Client-visible approval must have client context.
- Approval decision must record user, decision, timestamp, and optional comment.
- Approval request may lock reviewed file version.
- Changes requested should create revision tracking entry.
- Approval completion should notify requester and relevant stakeholders.

---

## 12. Revision Tracking

### 12.1 Purpose

Revision Tracking captures requested changes, revision rounds, version updates, reviewer feedback, and final approval history.

### 12.2 Revision Concepts

| Concept | Meaning |
| --- | --- |
| Revision Request | A reviewer asks for changes |
| Revision Round | One cycle of changes and review |
| Revision Note | Specific feedback or requested change |
| Revised Version | New file version submitted after changes |
| Resolution | How requested change was addressed |

### 12.3 Revision Tracking Sources

Revision tracking uses:

- Approval decisions.
- Approval comments.
- File versions.
- Activity logs.
- Audit logs for sensitive revisions.
- Chat messages where linked to approval or file.

### 12.4 Revision Required Metadata

Revision tracking should preserve:

- Approval.
- File or resource.
- Requested by.
- Requested at.
- Revision round.
- Comment or requested change.
- Target file version.
- Submitted revised file version.
- Resolved by.
- Resolved at.
- Final decision.

If structured revision analytics become required, a future database extension may add dedicated revision records. Phase 7 defines the required behavior and traceability rules.

### 12.5 Revision Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Approver requests changes | Revision request created |
| 2 | Requester receives notification | Work begins |
| 3 | File may unlock for revision | Edit allowed |
| 4 | User uploads revised version | New file version |
| 5 | Approval returns to pending | New review round |
| 6 | Approver reviews revised version | Decision |
| 7 | Approval is accepted or another revision is requested | Completion or next round |

---

## 13. Collaboration Workflows

### 13.1 Internal Chat Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User opens internal channel | Channel context loaded |
| 2 | User posts message or attachment | Message created |
| 3 | Mentions are resolved | Notifications sent |
| 4 | File permissions are checked | Safe attachment |
| 5 | Activity may be linked to project/task | Traceability |
| 6 | AI summary may be generated if permitted | Optional summary |

### 13.2 Client Chat Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Agency or client opens client channel | Client context loaded |
| 2 | User writes message | Client-visible warning shown to agency users |
| 3 | System validates client scope | Safe posting |
| 4 | Attachments are checked for client visibility | Safe file sharing |
| 5 | Message is posted | Client communication |
| 6 | Notifications are sent | Stakeholders informed |

### 13.3 Approval Request Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects resource for approval | Approval draft |
| 2 | User chooses approvers | Approval route |
| 3 | User sets due date and visibility | Review rules |
| 4 | System locks file version if required | Review integrity |
| 5 | Approval is sent | Approvers notified |
| 6 | Approvers decide | Approved, rejected, or changes requested |
| 7 | System updates resource and logs activity | Traceability |

### 13.4 Revision Cycle Workflow

Workflow: Approval sent -> Reviewer requests changes -> Requester revises file/task/deliverable -> New version is submitted -> Approval reopens -> Reviewer approves or requests another revision -> Final decision recorded.

### 13.5 Voice To Collaboration Workflow

Workflow: Record or upload voice -> Transcribe -> Summarize -> Link to client/project/task/meeting -> Extract tasks or notes -> User confirms -> Activity log records result.

---

## 14. Notifications

### 14.1 Collaboration Notifications

Required notifications:

- New channel invitation.
- New mention.
- New direct message.
- New client message.
- File shared.
- File version uploaded.
- File locked.
- File unlocked.
- Approval requested.
- Approval decision submitted.
- Changes requested.
- Revision submitted.
- Voice transcription completed.
- Voice transcription failed.

### 14.2 Notification Rules

Rules:

- Notifications must respect channel membership and file access.
- Client notifications must include only client-safe content.
- Approval notifications must include due date where available.
- Sensitive notifications should avoid confidential detail in subject lines.
- Overdue approvals may escalate to Manager or Owner.

---

## 15. AI In Collaboration

### 15.1 AI Capabilities

AI may assist with:

- Chat thread summaries.
- Client-safe message drafting.
- Voice transcription summary.
- Voice-to-task extraction.
- File summary where permitted.
- Approval response drafting.
- Revision request summary.
- Approval status summary.
- Meeting note extraction.

### 15.2 AI Safety Rules

Rules:

- AI can only access records visible to the requesting user.
- AI cannot summarize internal chat for client users.
- AI cannot expose internal files in client-visible contexts.
- AI-generated client messages require user review.
- AI-generated approval decisions are suggestions only.
- AI-created tasks from voice notes require confirmation.
- AI interactions must be logged in `ai_logs`.
- Sensitive AI-assisted sharing or approval actions must be audited.

---

## 16. Permissions

### 16.1 Role Access

| Capability | Owner | Manager | Employee | Client |
| --- | --- | --- | --- | --- |
| Internal chat | Full | Team/assigned | Member channels | None |
| Client chat | Full | Assigned clients | Assigned clients if granted | Own client channels |
| Create channel | Yes | Yes if granted | Limited if granted | No |
| Upload files | Yes | Yes | Yes if granted | Client-visible only |
| Share files | Yes | Yes if granted | Limited if granted | Own client only if enabled |
| View file versions | Yes | Assigned/shared | Assigned/shared | Client-visible only |
| Lock files | Yes | Yes if granted | Own/editable files if granted | No |
| Force unlock files | Yes | Yes if granted | No | No |
| Request approvals | Yes | Yes | If granted | Client request only if enabled |
| Approve internal | Yes | If assigned/granted | If assigned | No |
| Approve client deliverable | Yes | If assigned | No by default | If assigned |
| Request revisions | Yes | If assigned/granted | If assigned | If assigned |
| View revision history | Full | Assigned/shared | Assigned/shared | Client-visible only |

### 16.2 Recommended Permissions

Recommended permission keys:

- `chat.read`
- `chat.create`
- `chat.manage`
- `chat.message`
- `client_chat.read`
- `client_chat.message`
- `voice_notes.create`
- `voice_notes.upload`
- `voice_notes.transcribe`
- `files.read`
- `files.upload`
- `files.share`
- `files.version`
- `files.lock`
- `files.unlock`
- `files.force_unlock`
- `approvals.read`
- `approvals.create`
- `approvals.decide`
- `approvals.manage`
- `revisions.read`
- `revisions.request`
- `revisions.resolve`

---

## 17. Activity And Audit Logging

### 17.1 Activity Logs

Activity logs should be created for:

- Channel created.
- Member added or removed.
- Message posted where resource-linked.
- File uploaded.
- File shared.
- File version uploaded.
- File locked or unlocked.
- Approval requested.
- Approval decision submitted.
- Changes requested.
- Revision submitted.
- Voice note created.
- Voice transcription completed.

### 17.2 Audit Logs

Audit logs are required for:

- Client-visible file sharing.
- Restricted file access changes.
- Forced file unlock.
- Final-locked file replacement.
- Approval override.
- Approval cancellation after client notification.
- Deleting collaboration records where retention applies.
- Exporting chat, file, approval, or revision history.
- AI-assisted client-facing message sent externally.

---

## 18. Reporting And Dashboards

### 18.1 Collaboration Metrics

Required metrics:

- Active internal channels.
- Active client channels.
- Unread messages.
- Mentions by user.
- Files uploaded.
- File versions created.
- Locked files.
- Pending approvals.
- Overdue approvals.
- Revision rounds by project.
- Average approval time.
- Voice notes recorded.
- Voice transcriptions completed.

### 18.2 Approval Metrics

Required metrics:

- Approval requests by status.
- Approval requests by client.
- Approval requests by project.
- Average time to approval.
- Changes requested rate.
- Rejected deliverables.
- Approvals overdue.
- Revision count per approval.

### 18.3 File Metrics

Required metrics:

- Storage usage by tenant.
- Storage usage by client.
- Storage usage by project.
- Largest files.
- File type distribution.
- Version count by file.
- Client-shared files.
- Quarantined files.

---

## 19. Acceptance Criteria

Phase 7 is accepted when:

- Internal Chat is fully specified.
- Client Chat is fully specified.
- Voice Notes are fully specified.
- Voice Uploads are fully specified.
- File Storage is fully specified.
- File Versioning is fully specified.
- File Locking is fully specified.
- Approval Center is fully specified.
- Revision Tracking is fully specified.
- Collaboration workflows are defined.
- Notifications, permissions, AI support, activity logs, audit logs, and reporting are defined.
- Client visibility boundaries are preserved.
- No implementation code is included.

---

## 20. Final Phase 7 Statement

This Phase 7 Collaboration System Specification defines the complete collaboration operating model for MAOS. It governs internal chat, client chat, voice notes, voice uploads, file storage, file versioning, file locking, approval center workflows, revision tracking, notifications, permissions, AI support, activity logging, audit logging, and reporting.

All implementation must preserve tenant isolation, invite-only access, role-based permissions, client visibility boundaries, file security, approval traceability, revision history, auditability, and the approved Phase 1 to Phase 6 foundations.

