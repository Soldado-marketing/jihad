# Marketing Agency Operating System (MAOS)

## Phase 6 Project Management System Specification

**Version:** 1.0  
**Phase:** Phase 6  
**Status:** Project Management Specification  
**Parent Documents:** `MAOS_MASTER_SPECIFICATION_v1.1.md`, `MAOS_ENTERPRISE_ARCHITECTURE_PHASE_1.md`, `MAOS_ENTERPRISE_DATABASE_PHASE_2.md`, `MAOS_SECURITY_PERMISSIONS_PHASE_3.md`, `MAOS_UI_UX_DESIGN_SYSTEM_PHASE_5.md`  
**Document Role:** Complete project management system specification for MAOS using the approved architecture, database, security model, and UI/UX design system  
**Code Policy:** No application code, SQL, migrations, pseudocode, or implementation snippets are included in this document.

---

## 1. Project Management Objectives

The MAOS Project Management System controls agency delivery from project creation to completion. It must support structured projects, task execution, subtasks, dependencies, workload balancing, skill-based assignment, recurring work, reusable templates, client visibility, time tracking, files, approvals, chat, AI assistance, and reporting.

Primary objectives:

- Create and manage client and internal projects.
- Break projects into tasks and subtasks.
- Track project health, deadlines, workload, and delivery risk.
- Manage task dependencies and blockers.
- Balance work across team members.
- Match tasks to employees by skills, availability, workload, role, and permissions.
- Support recurring tasks and recurring projects.
- Support reusable project and task templates.
- Preserve tenant isolation, role permissions, client visibility, auditability, localization, currency, and timezone rules.

---

## 2. Approved Foundation

Phase 6 uses the approved platform foundation:

| Foundation | Approved Source |
| --- | --- |
| SaaS and tenant architecture | Phase 1 Enterprise Architecture |
| Database foundation | Phase 2 Enterprise Database Specification |
| Security and permissions | Phase 3 Security & Permissions Specification |
| UI and page patterns | Phase 5 UI/UX Design System |

### 2.1 Required Database Alignment

Phase 6 primarily uses:

- `projects`
- `tasks`
- `subtasks`
- `task_dependencies`
- `time_entries`
- `timesheets`
- `employee_profiles`
- `employee_costs`
- `files`
- `approvals`
- `chat_channels`
- `templates`
- `template_versions`
- `automations`
- `automation_steps`
- `automation_runs`
- `activity_logs`
- `audit_logs`
- `notifications`
- `ai_logs`

### 2.2 System Boundaries

In scope:

- Projects.
- Tasks.
- Subtasks.
- Task dependencies.
- Workload balancer.
- Skill matching.
- Recurring tasks.
- Recurring projects.
- Templates.
- Workflows.
- Notifications.
- Activity logging.
- AI support.

Out of scope unless later approved:

- Native resource procurement.
- Full HR performance review system.
- External contractor marketplace.
- Advanced portfolio financial planning beyond approved finance and profitability modules.

---

## 3. Project Model

### 3.1 Project Purpose

A project represents a delivery container for client or internal work. It groups tasks, subtasks, dependencies, files, approvals, chat, time entries, budget, workload, and reporting.

### 3.2 Project Types

| Type | Purpose |
| --- | --- |
| Client Project | Work delivered for a client |
| Internal Project | Internal agency initiative |
| Retainer Project | Ongoing recurring service work |
| Campaign Project | Time-bound marketing campaign |
| Template-Based Project | Project generated from reusable template |
| Recurring Project | Project generated on a schedule |

### 3.3 Project Statuses

| Status | Meaning |
| --- | --- |
| Draft | Project is being prepared |
| Active | Project is live and work can be assigned |
| On Hold | Work is paused internally |
| Waiting For Client | Progress depends on client input |
| At Risk | Deadline, budget, scope, or workload risk exists |
| Completed | Project delivery is complete |
| Cancelled | Project has been stopped |

### 3.4 Project Required Information

Required:

- Project name.
- Client or internal classification.
- Project owner.
- Status.
- Visibility.
- Start date where known.
- Due date where known.
- Budget where applicable.
- Currency where budget exists.
- Description or scope summary.

Recommended:

- Contract.
- Milestones.
- Template source.
- Skill requirements.
- Estimated hours.
- Project health score.
- Client-visible summary.

---

## 4. Task Model

### 4.1 Task Purpose

A task represents a unit of work assigned to a team member, team, automation, or workflow.

### 4.2 Task Statuses

| Status | Meaning |
| --- | --- |
| Backlog | Not yet scheduled |
| To Do | Ready to start |
| In Progress | Work is active |
| In Review | Awaiting internal or client review |
| Waiting For Client | Requires client input |
| Approved | Approved and ready for completion |
| Done | Completed |
| Blocked | Cannot proceed due to dependency or issue |
| Cancelled | No longer required |

### 4.3 Task Required Information

Required:

- Title.
- Project or client context.
- Status.
- Priority.
- Visibility.
- Source.

Recommended:

- Assignee.
- Reporter.
- Due date.
- Time estimate.
- Skill requirements.
- Dependency links.
- Files.
- Approval requirement.
- Client-visible flag.

### 4.4 Task Priority

| Priority | Use |
| --- | --- |
| Low | Non-urgent work |
| Normal | Standard planned work |
| High | Important work affecting delivery |
| Urgent | Time-sensitive or blocking work |

---

## 5. Subtask Model

### 5.1 Purpose

Subtasks break a task into smaller steps that can be tracked independently without becoming full project-level tasks.

### 5.2 Subtask Rules

Rules:

- Every subtask belongs to one task.
- Subtasks inherit tenant and project context from parent task.
- Subtasks may have assignees.
- Subtasks may have due dates.
- Subtasks may be reordered.
- Subtasks may be completed independently.
- Parent task completion should require all required subtasks to be done unless overridden by authorized user.

### 5.3 Subtask Statuses

| Status | Meaning |
| --- | --- |
| To Do | Not started |
| In Progress | Work started |
| Done | Completed |
| Cancelled | No longer needed |

---

## 6. Task Dependencies

### 6.1 Dependency Purpose

Task dependencies define which tasks block, relate to, duplicate, or sequence other tasks.

### 6.2 Dependency Types

| Type | Meaning |
| --- | --- |
| Blocks | This task prevents another task from starting or finishing |
| Blocked By | This task depends on another task |
| Relates To | Tasks are contextually related |
| Duplicates | Task duplicates another task |

### 6.3 Dependency Rules

Rules:

- A task cannot depend on itself.
- Both tasks must belong to the same tenant.
- Cross-project dependencies are allowed only inside the same tenant.
- Client-visible dependency information must hide internal-only task names unless shared.
- Blocking dependency should prevent moving dependent task to Done unless overridden.
- Dependency changes must create activity logs.
- High-impact dependency changes should notify affected assignees.

### 6.4 Blocker Behavior

When a dependency blocks a task:

- Blocked task status may automatically become Blocked.
- Assignee receives notification.
- Project health may change to warning or at risk.
- Workload balancer should not recommend blocked task as next priority.
- AI summary should include blocker context where permitted.

---

## 7. Workload Balancer

### 7.1 Purpose

The workload balancer helps managers assign work across team members based on capacity, active work, due dates, skill fit, availability, role, and task priority.

### 7.2 Workload Inputs

Inputs:

- User availability.
- Employment type.
- Working hours or capacity.
- Active tasks.
- Task estimates.
- Time entries.
- Due dates.
- Project priority.
- Client priority.
- Skill requirements.
- Existing assignments.
- Approved leave or unavailable periods where available.

### 7.3 Workload Metrics

| Metric | Meaning |
| --- | --- |
| Assigned Hours | Sum of estimated hours assigned |
| Logged Hours | Time already recorded |
| Remaining Hours | Estimate minus logged hours |
| Capacity | Available work hours in period |
| Utilization | Assigned hours divided by capacity |
| Overload Risk | Utilization above threshold |
| Deadline Risk | Work due before likely completion |
| Context Load | Number of active projects per person |

### 7.4 Workload States

| State | Meaning |
| --- | --- |
| Available | User has capacity |
| Balanced | User workload is within target |
| Near Capacity | User is approaching capacity |
| Overloaded | User exceeds capacity |
| Unavailable | User should not receive new work |

### 7.5 Workload Balancer Recommendations

Recommendations may include:

- Assign task to best available user.
- Reassign task from overloaded user.
- Split task into subtasks.
- Move due date.
- Flag project as at risk.
- Escalate to Manager.
- Suggest contractor or external collaborator.
- Delay lower-priority work.

### 7.6 Workload Balancer Rules

Rules:

- Recommendations must respect permissions.
- Client users cannot see workload details.
- Payroll and employee cost data must not be exposed in workload UI unless user has permission.
- Workload balancing must consider timezone for due dates and working windows.
- Final assignment decision remains with authorized user unless automation is explicitly enabled.

---

## 8. Skill Matching

### 8.1 Purpose

Skill matching recommends the best assignee for a task or project based on required skills, experience, availability, workload, role, and permission scope.

### 8.2 Skill Inputs

Inputs:

- Task skill requirements.
- Project skill requirements.
- Employee profile.
- Role.
- Department.
- Historical assignments.
- Past completion quality where available.
- Current workload.
- Availability.
- Timezone.
- Client or project familiarity.

### 8.3 Skill Match Score

Skill matching should consider:

| Factor | Weight Purpose |
| --- | --- |
| Required Skill Fit | Can the user perform the task |
| Availability | Can the user take it now |
| Workload | Is the user overloaded |
| Role Permission | Is the user allowed to access the work |
| Project Familiarity | Has the user worked on this client/project |
| Timezone Fit | Is the user aligned with deadline/client timezone |
| Priority Fit | Is the user appropriate for urgent work |

### 8.4 Skill Matching Outcomes

Possible outcomes:

- Recommended assignee.
- Ranked assignee list.
- No qualified assignee.
- Requires Manager review.
- Requires external collaborator.
- Requires task scope clarification.

### 8.5 Skill Matching Safety

Rules:

- Skill matching cannot assign users without resource access.
- Skill matching cannot expose private employee data to unauthorized users.
- Skill matching should explain recommendation factors at a high level.
- Manager or Owner can override recommendation.

---

## 9. Recurring Tasks

### 9.1 Purpose

Recurring tasks automate repeated agency work such as weekly reporting, monthly invoicing support, content publishing, ad checks, SEO reviews, and client follow-ups.

### 9.2 Recurring Task Types

| Type | Example |
| --- | --- |
| Daily | Check campaign performance |
| Weekly | Prepare weekly client report |
| Monthly | Monthly SEO audit |
| Quarterly | Strategy review |
| Custom Schedule | Every 10 business days |

### 9.3 Recurring Task Rules

Rules:

- Recurring task must have owner or assignee rule.
- Recurring task must have schedule.
- Recurring task may inherit project, client, priority, visibility, estimate, files, subtasks, and dependencies.
- Recurring task may create the next occurrence after completion or on schedule.
- Failed recurrence generation must create automation run error and notification.
- Recurrence must respect tenant timezone and configured schedule timezone.

### 9.4 Recurring Task Generation Modes

| Mode | Meaning |
| --- | --- |
| Fixed Schedule | Task generated on calendar schedule |
| Completion-Based | Next task generated after prior task is completed |
| Manual Review | System suggests next task for approval |

### 9.5 Recurring Task Stop Conditions

Stop conditions:

- End date reached.
- Occurrence count reached.
- Project completed.
- Client archived.
- Template archived.
- Recurrence paused or cancelled.

---

## 10. Recurring Projects

### 10.1 Purpose

Recurring projects create repeatable delivery containers for retainers, monthly services, campaign cycles, content calendars, reporting cycles, and operational routines.

### 10.2 Recurring Project Examples

Examples:

- Monthly social media retainer.
- Monthly performance marketing report.
- Quarterly strategy review.
- SEO maintenance cycle.
- Content production sprint.
- Email campaign cycle.

### 10.3 Recurring Project Rules

Rules:

- Recurring project must be based on a project template or existing project.
- Recurring project must have schedule.
- Generated projects inherit client, owner, tasks, subtasks, files where selected, visibility, estimates, and default settings.
- Generated projects must receive new due dates based on schedule offsets.
- Generated task due dates must shift relative to project start date.
- Recurring project generation must be auditable.
- Failed generation must notify owner.

### 10.4 Recurring Project Generation Modes

| Mode | Meaning |
| --- | --- |
| Auto Create | Project is created automatically |
| Draft For Review | Project is created as draft and requires approval |
| Suggest Only | System suggests project creation |

### 10.5 Recurring Project Stop Conditions

Stop conditions:

- End date reached.
- Occurrence count reached.
- Contract ended.
- Client paused or archived.
- Recurrence paused.
- Recurrence cancelled.

---

## 11. Templates

### 11.1 Template Purpose

Templates speed up repeatable project and task setup while preserving consistency across agency delivery.

### 11.2 Template Types

| Template Type | Purpose |
| --- | --- |
| Project Template | Creates full project structure |
| Task Template | Creates reusable task structure |
| Subtask Template | Creates checklist steps |
| Recurring Task Template | Creates scheduled tasks |
| Recurring Project Template | Creates scheduled projects |
| Approval Template | Standard approval workflow |
| Report Template | Standard reporting structure |

### 11.3 Project Template Contents

Project templates may include:

- Project name pattern.
- Description.
- Default status.
- Default visibility.
- Default owner role.
- Task groups.
- Tasks.
- Subtasks.
- Dependencies.
- Skill requirements.
- Time estimates.
- Relative due dates.
- Files or file placeholders.
- Approval steps.
- Chat channel setup.

### 11.4 Task Template Contents

Task templates may include:

- Title.
- Description.
- Priority.
- Visibility.
- Estimated time.
- Assignee rule.
- Skill requirements.
- Subtasks.
- Dependencies.
- File placeholders.
- Approval requirement.
- Recurrence rule.

### 11.5 Template Governance

Rules:

- System templates cannot be deleted by tenant admins.
- Tenant templates are tenant-scoped.
- Template edits should create template versions.
- Active templates should have one active version.
- Template usage should create activity records.
- Sensitive templates may require Manager or Owner approval.

---

## 12. Project Workflows

### 12.1 Project Creation Workflow

| Step | Action | Actor | Output |
| --- | --- | --- | --- |
| 1 | Select create project | Owner, Manager, authorized Employee | Project creation starts |
| 2 | Choose blank, template, or recurring source | Creator | Project structure selected |
| 3 | Enter client, owner, dates, visibility, and budget | Creator | Draft project details |
| 4 | Add or generate tasks and subtasks | Creator or template | Work breakdown |
| 5 | Review dependencies and workload | Manager or Owner | Assignment readiness |
| 6 | Confirm client visibility | Creator | Safe sharing boundary |
| 7 | Activate project | Authorized user | Project becomes active |
| 8 | Notify assigned team | System | Notifications and activity logs |

Workflow: Create project -> Configure scope -> Add tasks -> Balance workload -> Confirm visibility -> Activate -> Notify team.

### 12.2 Project Template Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Select template | Template source selected |
| 2 | Choose client and project start date | Context applied |
| 3 | Generate project draft | Project and tasks created as draft |
| 4 | Shift relative due dates | Schedule aligned |
| 5 | Apply assignee rules | Initial assignments proposed |
| 6 | Run workload check | Conflicts detected |
| 7 | Confirm or adjust | Project ready |
| 8 | Activate | Notifications sent |

### 12.3 Project Status Workflow

| From | To | Required Condition |
| --- | --- | --- |
| Draft | Active | Required fields complete |
| Active | Waiting For Client | Client input blocks progress |
| Active | At Risk | Deadline, workload, dependency, or budget risk |
| Active | On Hold | Authorized pause |
| On Hold | Active | Resume approved |
| Waiting For Client | Active | Client input received |
| At Risk | Active | Risk resolved |
| Active | Completed | Required tasks complete |
| Any non-final | Cancelled | Authorized cancellation |

### 12.4 Project Completion Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Validate required tasks | Completion readiness |
| 2 | Validate approvals | Approval readiness |
| 3 | Validate client-visible deliverables | Client delivery readiness |
| 4 | Review open files and comments | Closure risks identified |
| 5 | Confirm time entries | Reporting accuracy |
| 6 | Mark project completed | Project final state |
| 7 | Generate project summary | Report and activity log |
| 8 | Notify stakeholders | Closure notification |

---

## 13. Task Workflows

### 13.1 Task Creation Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Create task manually, from template, AI, voice note, chat, or automation | Task draft |
| 2 | Set project/client context | Tenant and resource scope |
| 3 | Add title, priority, visibility, and due date | Core task details |
| 4 | Add assignee or request skill match | Assignment proposal |
| 5 | Add subtasks, files, and dependencies | Work structure |
| 6 | Run dependency and workload checks | Risk warnings |
| 7 | Save task | Task becomes active |
| 8 | Notify assignee and watchers | Team awareness |

Workflow: Create task -> Scope task -> Assign or match skill -> Add details -> Validate workload/dependencies -> Save -> Notify.

### 13.2 Task Status Workflow

| From | To | Required Condition |
| --- | --- | --- |
| Backlog | To Do | Task is ready |
| To Do | In Progress | Assignee starts work |
| In Progress | In Review | Work submitted for review |
| In Review | Approved | Review passed |
| In Review | In Progress | Changes requested |
| In Progress | Waiting For Client | Client input required |
| Waiting For Client | In Progress | Client input received |
| Any active | Blocked | Dependency or issue blocks work |
| Blocked | To Do or In Progress | Blocker resolved |
| Approved | Done | Completion confirmed |
| Any non-final | Cancelled | Authorized cancellation |

### 13.3 Task Assignment Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects assignee or requests recommendation | Assignment path selected |
| 2 | System checks permissions | Eligible users filtered |
| 3 | System checks workload | Capacity evaluated |
| 4 | System checks skill fit | Candidate list ranked |
| 5 | User confirms assignee | Assignment saved |
| 6 | System notifies assignee | Notification created |
| 7 | Activity log records assignment | Traceability |

### 13.4 Task Review Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Assignee moves task to In Review | Review requested |
| 2 | Reviewer receives notification | Review started |
| 3 | Reviewer approves or requests changes | Decision captured |
| 4 | Approved task moves to Approved | Ready to complete |
| 5 | Changes requested task returns to In Progress | Assignee notified |
| 6 | Final completion moves task to Done | Completion logged |

---

## 14. Subtask Workflows

### 14.1 Subtask Creation Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Open parent task | Parent context selected |
| 2 | Add subtask title | Subtask draft |
| 3 | Add assignee or due date if needed | Subtask detail |
| 4 | Save subtask | Subtask added |
| 5 | Notify assignee if different from parent | Notification sent |

### 14.2 Subtask Completion Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Assignee marks subtask done | Subtask completed |
| 2 | System updates parent progress | Progress calculated |
| 3 | If all required subtasks are done, suggest parent review | Next action suggested |
| 4 | Activity log records completion | Traceability |

### 14.3 Parent Task Completion Rule

Default rule:

- Parent task cannot be marked Done while required subtasks remain open.

Override:

- Manager or Owner can override with reason.
- Override must create activity log.
- Sensitive override should create audit log.

---

## 15. Dependency Workflows

### 15.1 Add Dependency Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects dependency action | Dependency flow starts |
| 2 | Select blocking or related task | Candidate task chosen |
| 3 | System validates tenant and access | Valid dependency |
| 4 | System checks self-dependency and duplicates | Conflict prevention |
| 5 | Save dependency | Dependency created |
| 6 | Notify affected assignees | Awareness |
| 7 | Update project health if needed | Risk status updated |

### 15.2 Resolve Blocker Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Blocking task moves to Done or dependency is removed | Blocker resolution begins |
| 2 | System identifies dependent tasks | Affected tasks found |
| 3 | System updates blocked state where appropriate | Tasks unblocked |
| 4 | Assignees are notified | Work resumes |
| 5 | Project health recalculates | Risk updated |

### 15.3 Dependency Risk Workflow

Workflow: Dependency added -> Due date conflict detected -> Affected task flagged -> Manager notified -> Workload or schedule adjusted -> Risk resolved or project marked At Risk.

---

## 16. Workload Balancer Workflows

### 16.1 Assignment Recommendation Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User requests workload recommendation | Candidate analysis starts |
| 2 | System loads eligible users | Permission-safe candidate set |
| 3 | System calculates capacity | Availability profile |
| 4 | System calculates assigned work | Workload profile |
| 5 | System applies skill matching | Ranked candidates |
| 6 | System highlights risks | Overload and deadline warnings |
| 7 | User confirms assignment | Assignment saved |

### 16.2 Overload Detection Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Workload threshold exceeded | Overload detected |
| 2 | System identifies affected user and tasks | Risk context |
| 3 | System suggests redistribution | Recommendation |
| 4 | Manager accepts or rejects recommendation | Decision |
| 5 | Assignments update if accepted | Balanced workload |
| 6 | Notifications and activity logs are created | Traceability |

### 16.3 Workload Rebalance Workflow

Workflow: Select overloaded user -> Review active tasks -> Identify movable tasks -> Match alternate assignees -> Confirm reassignment -> Notify affected users -> Update project risk.

---

## 17. Skill Matching Workflows

### 17.1 Skill-Based Assignment Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Task requires skill-based assignment | Skill matching starts |
| 2 | System reads task skill requirements | Required skills |
| 3 | System filters eligible users by permissions | Safe candidate list |
| 4 | System compares skills, workload, timezone, and project familiarity | Match score |
| 5 | System ranks candidates | Recommendation list |
| 6 | Manager selects assignee | Assignment decision |
| 7 | System records assignment reason where available | Activity context |

### 17.2 No Match Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | No qualified user found | No-match state |
| 2 | System suggests alternatives | Options |
| 3 | Manager chooses action | Decision |
| 4 | Task is reassigned, split, rescheduled, or escalated | Resolution |

Alternative actions:

- Split task into subtasks.
- Extend due date.
- Assign Manager.
- Invite external collaborator.
- Add training requirement.
- Change scope.

---

## 18. Recurring Task Workflows

### 18.1 Recurring Task Setup Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User creates recurring task | Recurrence draft |
| 2 | Define schedule and timezone | Recurrence timing |
| 3 | Define task fields and assignee rule | Task pattern |
| 4 | Define stop condition | Recurrence boundary |
| 5 | Choose generation mode | Fixed, completion-based, or review |
| 6 | Activate recurrence | Schedule enabled |
| 7 | System logs recurrence setup | Activity and audit where needed |

### 18.2 Recurring Task Generation Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Schedule reaches next occurrence | Generation starts |
| 2 | System validates project, client, template, and assignee | Eligibility check |
| 3 | System creates task or draft | New occurrence |
| 4 | Due date is calculated | Scheduled task |
| 5 | Assignment and workload checks run | Risk warnings |
| 6 | Notifications are sent | Awareness |
| 7 | Next occurrence is scheduled | Continuity |

### 18.3 Recurring Task Failure Workflow

Workflow: Generation fails -> Automation run records error -> Owner or Manager notified -> User fixes missing project/client/template/assignee -> Recurrence retries or is paused.

---

## 19. Recurring Project Workflows

### 19.1 Recurring Project Setup Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects project template or existing project | Source selected |
| 2 | Define recurrence schedule and timezone | Timing set |
| 3 | Define client, owner, and visibility | Context set |
| 4 | Define date shifting rules | Relative dates configured |
| 5 | Define assignee rules | Assignment pattern |
| 6 | Define generation mode | Auto, draft, or suggest |
| 7 | Activate recurrence | Recurring project enabled |

### 19.2 Recurring Project Generation Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | Recurrence schedule triggers | Generation starts |
| 2 | System validates source template/project | Source valid |
| 3 | System creates new project draft or active project | Project occurrence |
| 4 | System generates tasks and subtasks | Work structure |
| 5 | System shifts due dates | Schedule aligned |
| 6 | System applies dependencies | Dependency structure |
| 7 | System runs workload and skill matching | Assignment recommendations |
| 8 | System notifies owner | Review or activation |

### 19.3 Recurring Project Review Workflow

Workflow: Project draft generated -> Owner reviews scope -> Manager adjusts assignments -> Workload check passes -> Project activated -> Team notified.

---

## 20. Template Workflows

### 20.1 Create Template Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects create template | Template draft |
| 2 | Choose template type | Project, task, recurring, approval, or report |
| 3 | Add structure and default fields | Template content |
| 4 | Add relative dates and dependencies | Schedule logic |
| 5 | Add skill and assignee rules | Assignment logic |
| 6 | Save draft | Draft version |
| 7 | Activate template | Available for use |

### 20.2 Use Template Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User selects template | Template source |
| 2 | User provides context | Client, project, dates, owner |
| 3 | System generates draft resource | Project or task draft |
| 4 | System applies relative dates | Schedule |
| 5 | System applies dependencies | Work order |
| 6 | User reviews generated resource | Quality check |
| 7 | User activates resource | Live work |

### 20.3 Update Template Workflow

Workflow: Open template -> Edit draft version -> Review impact -> Activate new version -> Existing generated projects remain unchanged unless explicitly updated.

---

## 21. Client Visibility Workflow

### 21.1 Client-Visible Project Workflow

| Step | Action | Output |
| --- | --- | --- |
| 1 | User marks project client-visible | Visibility review |
| 2 | System checks client context | Client boundary valid |
| 3 | User selects visible tasks/files/approvals | Shared scope |
| 4 | System hides internal-only records | Safe view |
| 5 | Client portal updates | Client access |
| 6 | Activity log records visibility change | Traceability |

### 21.2 Client-Visible Task Workflow

Workflow: Mark task client-visible -> Validate client context -> Hide internal comments and files -> Notify client if enabled -> Track client activity.

---

## 22. Notifications And Automations

### 22.1 Project Notifications

Required notifications:

- Project assigned.
- Project activated.
- Project due date changed.
- Project marked at risk.
- Project completed.
- Client input required.
- Project recurrence failed.

### 22.2 Task Notifications

Required notifications:

- Task assigned.
- Task due soon.
- Task overdue.
- Task status changed.
- Task blocked.
- Dependency resolved.
- Review requested.
- Changes requested.
- Task completed.
- Recurring task generated.

### 22.3 Automation Triggers

Recommended triggers:

- Project created.
- Project status changed.
- Task created.
- Task assigned.
- Task blocked.
- Task overdue.
- Dependency resolved.
- Recurring schedule reached.
- Template used.
- Workload threshold exceeded.

---

## 23. AI In Project Management

### 23.1 AI Capabilities

AI may assist with:

- Project summary.
- Task breakdown.
- Subtask generation.
- Dependency suggestion.
- Workload risk explanation.
- Skill match explanation.
- Recurring task suggestions.
- Project template suggestions.
- Status update drafting.
- Client-safe project summary.

### 23.2 AI Safety Rules

Rules:

- AI must respect tenant and role permissions.
- AI cannot expose internal tasks to client users.
- AI cannot assign users without confirmation.
- AI cannot change due dates, statuses, dependencies, or recurrence rules without confirmation.
- AI-generated tasks must be marked with source where applicable.
- AI actions must be logged in `ai_logs`.
- Sensitive AI-assisted actions must create audit logs.

---

## 24. Reporting And Dashboards

### 24.1 Project Metrics

Required metrics:

- Active projects.
- At-risk projects.
- Completed projects.
- Project completion rate.
- Average project delay.
- Open tasks per project.
- Overdue tasks per project.
- Pending approvals.
- Client-visible deliverables.
- Budget usage where available.

### 24.2 Task Metrics

Required metrics:

- Tasks by status.
- Tasks by assignee.
- Tasks by priority.
- Overdue tasks.
- Blocked tasks.
- Recurring tasks generated.
- Task completion rate.
- Average cycle time.
- Subtask completion rate.

### 24.3 Workload Metrics

Required metrics:

- Assigned hours by user.
- Remaining hours by user.
- Utilization by user.
- Overloaded users.
- Available users.
- Skill coverage gaps.
- Workload by project.
- Workload by client.

---

## 25. Permissions

### 25.1 Role Access

| Capability | Owner | Manager | Employee | Client |
| --- | --- | --- | --- | --- |
| Create project | Yes | Yes | If granted | No |
| Manage project | Yes | Assigned/team | Assigned limited | No |
| View project | Full | Assigned/team | Assigned | Client-visible only |
| Create task | Yes | Yes | If granted | No |
| Assign task | Yes | Yes | If granted | No |
| Manage dependencies | Yes | Yes | Assigned limited | No |
| Manage templates | Yes | If granted | Use only | No |
| Configure recurring tasks | Yes | Yes | If granted | No |
| Configure recurring projects | Yes | Yes | No by default | No |
| View workload | Full | Team | Own only | No |
| Use skill matching | Yes | Yes | Suggest only if granted | No |
| Change client visibility | Yes | Yes | If granted | No |

### 25.2 Recommended Permissions

Recommended permission keys:

- `projects.read`
- `projects.create`
- `projects.update`
- `projects.manage`
- `projects.delete`
- `tasks.read`
- `tasks.create`
- `tasks.update`
- `tasks.assign`
- `tasks.manage`
- `subtasks.manage`
- `dependencies.manage`
- `workload.read`
- `workload.manage`
- `skills.match`
- `recurring_tasks.manage`
- `recurring_projects.manage`
- `templates.read`
- `templates.create`
- `templates.update`
- `templates.manage`
- `client_visibility.manage`

---

## 26. Audit And Activity Logging

### 26.1 Activity Logs

Activity logs should be created for:

- Project created.
- Project activated.
- Project status changed.
- Project owner changed.
- Task created.
- Task assigned.
- Task status changed.
- Subtask completed.
- Dependency added or removed.
- Recurring task generated.
- Recurring project generated.
- Template used.
- Workload reassignment.
- Skill match accepted.
- Client visibility changed.

### 26.2 Audit Logs

Audit logs are required for:

- Project deletion or cancellation.
- Bulk task reassignment.
- Client visibility changes.
- Template deletion or system template change.
- Recurring project configuration changes.
- Sensitive dependency override.
- Workload automation activation.
- AI-assisted assignment accepted where sensitive.

---

## 27. Acceptance Criteria

Phase 6 is accepted when:

- Projects are fully specified.
- Tasks are fully specified.
- Subtasks are fully specified.
- Task dependencies are fully specified.
- Workload balancer is specified.
- Skill matching is specified.
- Recurring tasks are specified.
- Recurring projects are specified.
- Templates are specified.
- All major project, task, subtask, dependency, workload, skill, recurring, and template workflows are defined.
- Permissions, notifications, automations, AI support, reporting, activity logs, and audit logs are defined.
- No implementation code is included.

---

## 28. Final Phase 6 Statement

This Phase 6 Project Management System Specification defines the complete delivery operating model for MAOS. It governs projects, tasks, subtasks, dependencies, workload balancing, skill matching, recurring tasks, recurring projects, templates, workflows, notifications, AI support, permissions, reporting, activity logs, and audit logs.

All implementation must preserve tenant isolation, invite-only access, role-based permissions, client visibility boundaries, auditability, timezone handling, workload privacy, and the approved Phase 1 to Phase 5 foundations.

