# Agri Updates — API Hand-off for Chatbot Team

## Purpose
This service ingests official agriculture scheme updates and exposes a small API your chatbot can call to fetch canonical scheme information and the latest approved updates.

## Base URL (local dev)
`http://localhost:4000/v1`

> If deployed, replace `localhost:4000` with the deployed backend URL.

## Key endpoints (stable contract)

### GET /v1/chatbot?q=<query>
Returns matching scheme(s) plus latest **approved** updates.
- Query param: `q` (required)
- Response JSON example:
