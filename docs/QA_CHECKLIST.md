# ClubX POS Local MVP QA Checklist

## Dashboard
- Create, duplicate, delete, sort, and open business sessions.
- Confirm logout clears mock Counter POS login only.
- Confirm session action menu clicks do not open the session card.

## Login / Logout
- Counter POS accepts mock login input.
- Handy Order requires a valid activation code and staff name.
- Counter logout and Handy logout do not clear each other unexpectedly.

## Counter POS Workspace
- Toolbar, sidebar, canvas, settings, and modals render without overlap.
- Sidebar internal lists scroll without scrolling the whole workspace.
- Local data reset is available only under Settings > Developer Tools and requires confirmation.

## Table Canvas
- Add, move, delete, and number-edit tables.
- Tables cannot overlap.
- Empty, occupied, and cleaning colors are correct.
- Occupied tables show remaining time only.
- Remaining time is normal above 10 minutes, orange at 10 minutes or less, and red when expired.

## Table Merge / Split
- Empty tables can merge when adjacency rules pass.
- One occupied table can merge with empty tables; its active visit/orders remain on the merged group.
- Multiple occupied tables can merge only after all payable orders are prepaid.
- Merged capacity equals the sum of maxCapacity values.
- Empty and cleaning merged tables can split.
- Occupied merged tables can split only if there is no order history.
- Merged tables with order history show the blocked split message.
- Handy Order shows merged groups using the same table positions.

## Party Card Move / Joined State
- Button labels use Move / 이동.
- Party Cards can move to empty or occupied tables.
- Movement is blocked if the source visit has payable amount.
- Capacity validation includes existing guests plus incoming guests.
- Moving to occupied tables can create Joined Table state.
- Joined tables show multiple Party Cards without order segment controls.

## Reservations
- Mock ClubX import creates reservation Party Cards.
- Reservation cards use Check-in / 체크인 and Check in all / 전체 체크인.
- Cards show mapped table labels or Unassigned / 미배정.
- Overdue, checked-in, seated, and completed styles remain readable.
- Assignment respects table or merged group capacity.

## Waiting
- Waiting link generation, copy, open, and QR placeholder work.
- Privacy policy opens separately from agreement.
- Agreement is required.
- Name and Korean mobile phone validation work.
- Phone input auto-formats to 010-0000-0000.
- Waiting cards appear in Reservation Management and can be assigned if capacity allows.

## Orders
- Add, edit, cancel, and service item flows work.
- Order Log Dashboard shows existing orders and Add Order.
- Menu edits after ordering do not change existing OrderItem menuName/unitPrice snapshots.
- Cancelled quantities are excluded from active totals.
- Service quantities appear as discount rows.

## Payments
- Prepay marks payable quantities paid without changing table status.
- Pay changes final table/group status to cleaning.
- Final Checkout with 0 amount is allowed only after prior paid/prepaid payment exists.
- Sales Report excludes cancelled payments from total.
- Restore Payment / 재결제 updates the same payment row back to paid without duplication.

## Sales Report
- Payment rows show date/time, table label, item summary, amount, discount, status, and action.
- Cancelled rows remain visible and excluded from total sales.
- Modal is large enough and scrolls internally.

## Handy Order
- Activation code login works and deleted devices cannot order.
- Empty tables are not orderable.
- Occupied tables accept add-order flow.
- Cleaning tables can be marked cleaned.
- Canvas uses Counter POS x/y positions and is scrollable on mobile.
- Order completion does not force QR scanning.
- Order Log shows each Handy order with items, quantities, table number, time, and backup QR payload.

## QR Fallback
- QR Order Registration button is at the top-right of Order Log Dashboard.
- Camera scan is attempted when supported.
- Manual payload paste works when camera scanning is unavailable.
- sessionId, visitId, and idempotencyKey are validated.
- Duplicate idempotencyKey does not create duplicate orders.
- Malformed payload shows a graceful error.

## Local Sync
- Counter POS, Handy Order, reservations, waiting, orders, visits, tables, payments, and devices update via local/mock sync where possible.
- Manual refresh is not required inside the same browser context.

## Mobile Checks
- Handy canvas scrolls horizontally and vertically.
- Quantity controls and core action buttons are touch-friendly.
- Waiting registration form is usable on a phone.

## LocalStorage Migration
- Opening a session sanitizes broken local references.
- Malformed JSON in local stores is removed instead of crashing the UI.
- Developer reset clears only `clubx-pos:*` mock/local data.
