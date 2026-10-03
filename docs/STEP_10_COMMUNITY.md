# Step 10 community screens

Committee notices: `/society/community/notices`, `/new`, `/:id`; create a draft, edit plain text, publish or archive. Author display name and publication time are visible; published notices intentionally attribute their author without exposing contact details. Committee complaints: `/society/community/complaints`, `/:id`; status/category filters, independently paginated assignees/history and revision-checked assignment, progress, resolution and closure. All actions use the existing cookie/CSRF API client.

Resident complaint submission now includes category and own details show paginated resident-visible status history. The backend controls every role, society, flat, assignee and transition. Route/sidebar guards are UX only. Private request values clear on session/context change and ignore late responses; management templates also disappear on auth loss. Text uses interpolation, never HTML injection. No attachments, external notification, read tracking, localStorage data or private service-worker cache is introduced. Committee timestamps display in browser local time.

Run `npm run check` and `npm run test:e2e`. The backend's Step 10 document describes migration 014, legacy OPEN mapping, explicit permission provisioning and status/privacy policy.
