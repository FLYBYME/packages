# `sys.auth` - The Mesh Key Distribution Center (mKDC)

The `sys.auth` service is responsible for authorizing actions within the grid. It acts as a simple, centralized authority that issues and verifies short-lived tickets, ensuring that only permitted personas or services can execute sensitive operations.

## Core Responsibilities

1.  **Ticket Issuance**: Generate short-lived, single-purpose tokens (Service Tickets) that grant a specific persona temporary access to a target domain.
2.  **Ticket Verification**: Provide a mechanism for other services to check if a provided ticket is valid and has not expired.
3.  **Access Control**: Act as a primitive guard for sensitive actions, ensuring a basic level of security and preventing unauthorized cross-domain calls.

## How It Works

This service maintains an in-memory map of active tickets. It does not currently use cryptographic signatures; it is a stateful service where tickets are validated by checking their presence in the internal map and their expiration timestamp.

## Key Actions

*   `sys.auth.issue_ticket`: Called by a trusted service (like a directive step) to get a ticket for a persona to use a specific tool or action.
*   `sys.auth.verify_ticket`: Called by the target service to confirm the validity of the ticket before executing a protected action.
