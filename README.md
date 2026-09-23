##  How seat overselling is prevented

Seat reservation is handled using PostgreSQL transactions.

Booking flow:

1. Start transaction.
2. Lock package tier row.
3. Check available quota.
4. Create booking.
5. Reserve seats.
6. Commit transaction.


The row lock prevents two users from consuming the same final seat.

---


## How duplicate payment webhooks are handled

Payment events are stored separately.

The system uses:

```
UNIQUE(provider, gateway_transaction_id)
```

and:

```
UNIQUE(provider, event_id)
```

If the same webhook arrives multiple times, it is processed only once.


## How out-of-order payment events are handled

Payment states follow valid transitions.

Example:

Invalid:

```
SUCCESS -> PENDING
```

The backend rejects invalid state changes.

Payment history is preserved through gateway events.

---

##  How reporting remains fast for large scale

system is not too large. we can solve it easily using aws (auto scale support).
Though aws consting is high, in that case we che use 
- multiple server when necessary
 - multiple db when necessary

some special mention which  can support scale reporting using:

- Database indexes
- Pagination
- Cached summaries
- Background aggregation jobs
- Reporting tables
- Read replicas when required

Transactional data remains optimized for correctness.
